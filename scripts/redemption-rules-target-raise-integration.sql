-- Redemption Rules Target Raise Integration
-- Date: August 23, 2025  
-- Purpose: Link product table target_raise amounts to establish maximum redemption limits (100% of target distribution)

BEGIN;

-- Step 1: Create function to get target_raise for any project
-- This function checks product table first, falls back to projects table
CREATE OR REPLACE FUNCTION get_project_target_raise(p_project_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_project_type TEXT;
    v_table_name TEXT;
    v_product_target_raise NUMERIC;
    v_project_target_raise NUMERIC;
    v_sql TEXT;
BEGIN
    -- Get project type and fallback target_raise
    SELECT project_type, target_raise 
    INTO v_project_type, v_project_target_raise
    FROM projects 
    WHERE id = p_project_id;
    
    IF v_project_type IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get the appropriate product table name
    v_table_name := get_product_table_name(v_project_type);
    
    IF v_table_name IS NULL THEN
        -- No product table mapping, return project target_raise
        RETURN v_project_target_raise;
    END IF;
    
    -- Build dynamic SQL to get target_raise from product table
    v_sql := format('SELECT target_raise FROM %I WHERE project_id = $1', v_table_name);
    
    -- Execute the dynamic query
    BEGIN
        EXECUTE v_sql USING p_project_id INTO v_product_target_raise;
    EXCEPTION
        WHEN OTHERS THEN
            v_product_target_raise := NULL;
    END;
    
    -- Return product target_raise if available, otherwise project target_raise
    RETURN COALESCE(v_product_target_raise, v_project_target_raise);
END;
$$ LANGUAGE plpgsql;

-- Step 2: Add target_raise_amount column to redemption_rules
-- This will cache the target_raise amount for performance and easy access
ALTER TABLE redemption_rules 
ADD COLUMN IF NOT EXISTS target_raise_amount NUMERIC;

-- Add comment for documentation
COMMENT ON COLUMN redemption_rules.target_raise_amount IS 'Maximum redeemable amount (100% of product/project target_raise). Auto-synced from product tables.';

-- Step 3: Populate target_raise_amount for existing redemption rules
UPDATE redemption_rules 
SET target_raise_amount = get_project_target_raise(project_id),
    updated_at = NOW()
WHERE target_raise_amount IS NULL 
    AND project_id IS NOT NULL;

-- Step 4: Create function to calculate redemption capacity
-- This considers current outstanding redemptions and available capacity
CREATE OR REPLACE FUNCTION get_redemption_capacity(p_redemption_rule_id UUID)
RETURNS TABLE (
    target_raise_amount NUMERIC,
    total_redeemed_amount NUMERIC,
    available_capacity NUMERIC,
    capacity_percentage NUMERIC
) AS $$
DECLARE
    v_target_raise NUMERIC;
    v_total_redeemed NUMERIC;
BEGIN
    -- Get target_raise_amount for this redemption rule
    SELECT rr.target_raise_amount 
    INTO v_target_raise
    FROM redemption_rules rr 
    WHERE rr.id = p_redemption_rule_id;
    
    -- Calculate total redeemed amount from redemption_requests (if table exists)
    -- Note: This assumes redemption_requests table exists with redemption_rule_id and amount fields
    BEGIN
        SELECT COALESCE(SUM(
            CASE 
                WHEN status IN ('completed', 'processed', 'settled') THEN amount
                ELSE 0
            END
        ), 0)
        INTO v_total_redeemed
        FROM redemption_requests rreq
        WHERE rreq.redemption_rule_id = p_redemption_rule_id;
    EXCEPTION
        WHEN undefined_table THEN
            v_total_redeemed := 0;
    END;
    
    -- Return capacity calculation
    RETURN QUERY SELECT 
        v_target_raise as target_raise_amount,
        v_total_redeemed as total_redeemed_amount,
        GREATEST(0, COALESCE(v_target_raise, 0) - COALESCE(v_total_redeemed, 0)) as available_capacity,
        CASE 
            WHEN v_target_raise IS NULL OR v_target_raise = 0 THEN NULL
            ELSE ROUND((COALESCE(v_total_redeemed, 0) / v_target_raise) * 100, 2)
        END as capacity_percentage;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create validation function for redemption amounts
-- This ensures redemption requests don't exceed available capacity
CREATE OR REPLACE FUNCTION validate_redemption_amount(
    p_redemption_rule_id UUID,
    p_requested_amount NUMERIC
)
RETURNS TABLE (
    is_valid BOOLEAN,
    error_message TEXT,
    available_capacity NUMERIC,
    target_raise_amount NUMERIC
) AS $$
DECLARE
    v_capacity_info RECORD;
BEGIN
    -- Get current capacity information
    SELECT * INTO v_capacity_info
    FROM get_redemption_capacity(p_redemption_rule_id);
    
    -- Check if target_raise is set
    IF v_capacity_info.target_raise_amount IS NULL THEN
        RETURN QUERY SELECT 
            TRUE as is_valid,
            NULL as error_message,
            NULL as available_capacity,
            NULL as target_raise_amount;
        RETURN;
    END IF;
    
    -- Check if requested amount exceeds available capacity
    IF p_requested_amount > v_capacity_info.available_capacity THEN
        RETURN QUERY SELECT 
            FALSE as is_valid,
            format('Requested amount %s exceeds available capacity %s (%.2f%% of target raise already redeemed)', 
                   p_requested_amount::TEXT, 
                   v_capacity_info.available_capacity::TEXT,
                   v_capacity_info.capacity_percentage) as error_message,
            v_capacity_info.available_capacity,
            v_capacity_info.target_raise_amount;
        RETURN;
    END IF;
    
    -- Validation passed
    RETURN QUERY SELECT 
        TRUE as is_valid,
        format('Valid redemption: %s of %s available (%.2f%% capacity remaining)', 
               p_requested_amount::TEXT, 
               v_capacity_info.available_capacity::TEXT,
               100 - COALESCE(v_capacity_info.capacity_percentage, 0)) as error_message,
        v_capacity_info.available_capacity,
        v_capacity_info.target_raise_amount;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Update existing trigger functions to handle target_raise_amount
-- Enhanced sync function for project updates
CREATE OR REPLACE FUNCTION sync_redemption_product_type()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all redemption rules associated with this project
    UPDATE redemption_rules 
    SET product_type = NEW.project_type,
        organization_id = NEW.organization_id,
        product_id = get_product_id_for_project(NEW.id),
        target_raise_amount = get_project_target_raise(NEW.id),
        updated_at = NOW()
    WHERE project_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enhanced insert function for new redemption rules
CREATE OR REPLACE FUNCTION set_redemption_product_type_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-populate all fields from associated project
    IF NEW.project_id IS NOT NULL THEN
        SELECT 
            p.project_type, 
            p.organization_id,
            get_product_id_for_project(p.id),
            get_project_target_raise(p.id)
        INTO 
            NEW.product_type, 
            NEW.organization_id,
            NEW.product_id,
            NEW.target_raise_amount
        FROM projects p
        WHERE p.id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create triggers for product table target_raise updates
-- Function to sync target_raise_amount when product target_raise changes
CREATE OR REPLACE FUNCTION sync_redemption_target_raise_on_product_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND (OLD.target_raise IS DISTINCT FROM NEW.target_raise) THEN
        -- Update redemption rules when product target_raise changes
        UPDATE redemption_rules 
        SET target_raise_amount = NEW.target_raise,
            updated_at = NOW()
        WHERE product_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create target_raise sync triggers for all product tables
DO $$
DECLARE
    table_name TEXT;
    table_names TEXT[] := ARRAY[
        'asset_backed_products',
        'bond_products', 
        'collectibles_products',
        'commodities_products',
        'digital_tokenized_fund_products',
        'energy_products',
        'equity_products',
        'fund_products',
        'infrastructure_products',
        'private_debt_products',
        'private_equity_products',
        'quantitative_investment_strategies_products',
        'real_estate_products',
        'stablecoin_products',
        'structured_products'
    ];
BEGIN
    FOREACH table_name IN ARRAY table_names LOOP
        -- Drop existing trigger if it exists
        EXECUTE format('DROP TRIGGER IF EXISTS trigger_sync_target_raise_on_%s_change ON %I', 
                      table_name, table_name);
        
        -- Create new trigger for target_raise updates
        EXECUTE format('CREATE TRIGGER trigger_sync_target_raise_on_%s_change
                       AFTER UPDATE ON %I
                       FOR EACH ROW
                       EXECUTE FUNCTION sync_redemption_target_raise_on_product_change()', 
                      table_name, table_name);
    END LOOP;
END $$;

-- Step 8: Drop and recreate comprehensive view to include target_raise information
DROP VIEW IF EXISTS redemption_rules_with_product_details CASCADE;
CREATE VIEW redemption_rules_with_product_details AS
WITH product_details AS (
    -- Asset Backed Products
    SELECT 
        rr.id as redemption_rule_id,
        'asset_backed_products' as product_table,
        to_jsonb(abp.*) as product_details,
        abp.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN asset_backed_products abp ON rr.product_id = abp.id
    WHERE rr.product_type IN ('receivables')
    
    UNION ALL
    
    -- Bond Products  
    SELECT 
        rr.id as redemption_rule_id,
        'bond_products' as product_table,
        to_jsonb(bp.*) as product_details,
        bp.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN bond_products bp ON rr.product_id = bp.id
    WHERE rr.product_type = 'bonds'
    
    UNION ALL
    
    -- Collectibles Products
    SELECT 
        rr.id as redemption_rule_id,
        'collectibles_products' as product_table,
        to_jsonb(cp.*) as product_details,
        cp.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN collectibles_products cp ON rr.product_id = cp.id
    WHERE rr.product_type = 'collectibles'
    
    UNION ALL
    
    -- Commodities Products
    SELECT 
        rr.id as redemption_rule_id,
        'commodities_products' as product_table,
        to_jsonb(cop.*) as product_details,
        cop.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN commodities_products cop ON rr.product_id = cop.id
    WHERE rr.product_type = 'commodities'
    
    UNION ALL
    
    -- Digital Tokenized Fund Products
    SELECT 
        rr.id as redemption_rule_id,
        'digital_tokenized_fund_products' as product_table,
        to_jsonb(dtfp.*) as product_details,
        dtfp.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN digital_tokenized_fund_products dtfp ON rr.product_id = dtfp.id
    WHERE rr.product_type = 'digital_tokenised_fund'
    
    UNION ALL
    
    -- Energy Products
    SELECT 
        rr.id as redemption_rule_id,
        'energy_products' as product_table,
        to_jsonb(ep.*) as product_details,
        ep.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN energy_products ep ON rr.product_id = ep.id
    WHERE rr.product_type IN ('energy', 'solar_wind_climate')
    
    UNION ALL
    
    -- Equity Products
    SELECT 
        rr.id as redemption_rule_id,
        'equity_products' as product_table,
        to_jsonb(eqp.*) as product_details,
        eqp.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN equity_products eqp ON rr.product_id = eqp.id
    WHERE rr.product_type = 'equity'
    
    UNION ALL
    
    -- Fund Products
    SELECT 
        rr.id as redemption_rule_id,
        'fund_products' as product_table,
        to_jsonb(fp.*) as product_details,
        fp.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN fund_products fp ON rr.product_id = fp.id
    WHERE rr.product_type = 'funds_etfs_etps'
    
    UNION ALL
    
    -- Infrastructure Products
    SELECT 
        rr.id as redemption_rule_id,
        'infrastructure_products' as product_table,
        to_jsonb(ip.*) as product_details,
        ip.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN infrastructure_products ip ON rr.product_id = ip.id
    WHERE rr.product_type = 'infrastructure'
    
    UNION ALL
    
    -- Private Debt Products
    SELECT 
        rr.id as redemption_rule_id,
        'private_debt_products' as product_table,
        to_jsonb(pdp.*) as product_details,
        pdp.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN private_debt_products pdp ON rr.product_id = pdp.id
    WHERE rr.product_type = 'private_debt'
    
    UNION ALL
    
    -- Private Equity Products
    SELECT 
        rr.id as redemption_rule_id,
        'private_equity_products' as product_table,
        to_jsonb(pep.*) as product_details,
        pep.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN private_equity_products pep ON rr.product_id = pep.id
    WHERE rr.product_type = 'private_equity'
    
    UNION ALL
    
    -- Quantitative Investment Strategies Products
    SELECT 
        rr.id as redemption_rule_id,
        'quantitative_investment_strategies_products' as product_table,
        to_jsonb(qisp.*) as product_details,
        qisp.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN quantitative_investment_strategies_products qisp ON rr.product_id = qisp.id
    WHERE rr.product_type = 'quantitative_investment_strategies'
    
    UNION ALL
    
    -- Real Estate Products
    SELECT 
        rr.id as redemption_rule_id,
        'real_estate_products' as product_table,
        to_jsonb(rep.*) as product_details,
        rep.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN real_estate_products rep ON rr.product_id = rep.id
    WHERE rr.product_type = 'real_estate'
    
    UNION ALL
    
    -- Stablecoin Products
    SELECT 
        rr.id as redemption_rule_id,
        'stablecoin_products' as product_table,
        to_jsonb(sp.*) as product_details,
        sp.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN stablecoin_products sp ON rr.product_id = sp.id
    WHERE rr.product_type IN ('fiat_backed_stablecoin', 'crypto_backed_stablecoin', 
                              'commodity_backed_stablecoin', 'algorithmic_stablecoin', 
                              'rebasing_stablecoin')
    
    UNION ALL
    
    -- Structured Products
    SELECT 
        rr.id as redemption_rule_id,
        'structured_products' as product_table,
        to_jsonb(stp.*) as product_details,
        stp.target_raise as product_target_raise
    FROM redemption_rules rr
    JOIN structured_products stp ON rr.product_id = stp.id
    WHERE rr.product_type = 'structured_products'
),
capacity_info AS (
    SELECT 
        rr.id as redemption_rule_id,
        rc.target_raise_amount,
        rc.total_redeemed_amount,
        rc.available_capacity,
        rc.capacity_percentage
    FROM redemption_rules rr
    CROSS JOIN LATERAL get_redemption_capacity(rr.id) rc
)
SELECT 
    rr.*,
    p.name as project_name,
    p.project_type,
    pd.product_table,
    pd.product_details,
    
    -- Extract commonly used product fields for easy access
    CASE 
        WHEN pd.product_table = 'bond_products' THEN (pd.product_details->>'issuer_name')
        WHEN pd.product_table = 'equity_products' THEN (pd.product_details->>'company_name')
        WHEN pd.product_table = 'fund_products' THEN (pd.product_details->>'fund_name')
        WHEN pd.product_table = 'stablecoin_products' THEN (pd.product_details->>'asset_name')
        WHEN pd.product_table = 'real_estate_products' THEN (pd.product_details->>'property_name')
        WHEN pd.product_table = 'energy_products' THEN (pd.product_details->>'project_name')
        WHEN pd.product_table = 'commodities_products' THEN (pd.product_details->>'commodity_name')
        WHEN pd.product_table = 'private_equity_products' THEN (pd.product_details->>'fund_name')
        ELSE (pd.product_details->>'name')
    END as product_name,
    
    -- Extract product status
    COALESCE(
        pd.product_details->>'status',
        pd.product_details->>'product_status'
    ) as product_status,
    
    -- Extract currency information
    COALESCE(
        pd.product_details->>'currency',
        pd.product_details->>'base_currency'
    ) as product_currency,
    
    -- ✨ NEW: Target raise and capacity information
    COALESCE(pd.product_target_raise, rr.target_raise_amount) as effective_target_raise,
    ci.total_redeemed_amount,
    ci.available_capacity,
    ci.capacity_percentage,
    
    -- Capacity status indicators
    CASE 
        WHEN rr.target_raise_amount IS NULL THEN 'NO_LIMIT'
        WHEN ci.capacity_percentage >= 100 THEN 'FULLY_REDEEMED'
        WHEN ci.capacity_percentage >= 90 THEN 'NEAR_CAPACITY'
        WHEN ci.capacity_percentage >= 50 THEN 'MODERATE_USAGE'
        ELSE 'LOW_USAGE'
    END as capacity_status
    
FROM redemption_rules rr
JOIN projects p ON rr.project_id = p.id
LEFT JOIN product_details pd ON rr.id = pd.redemption_rule_id
LEFT JOIN capacity_info ci ON rr.id = ci.redemption_rule_id
ORDER BY rr.created_at DESC;

-- Step 9: Create helper functions for capacity management

-- Function to get all redemption rules near capacity
CREATE OR REPLACE FUNCTION get_redemption_rules_near_capacity(
    p_threshold_percentage NUMERIC DEFAULT 80
)
RETURNS TABLE (
    redemption_rule_id UUID,
    project_name TEXT,
    product_name TEXT,
    target_raise_amount NUMERIC,
    capacity_percentage NUMERIC,
    available_capacity NUMERIC,
    capacity_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rr.id as redemption_rule_id,
        rr.project_name,
        rr.product_name,
        rr.target_raise_amount,
        rr.capacity_percentage,
        rr.available_capacity,
        rr.capacity_status
    FROM redemption_rules_with_product_details rr
    WHERE rr.target_raise_amount IS NOT NULL
        AND rr.capacity_percentage >= p_threshold_percentage
    ORDER BY rr.capacity_percentage DESC, rr.target_raise_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get total capacity across all redemption rules
CREATE OR REPLACE FUNCTION get_total_redemption_capacity()
RETURNS TABLE (
    total_target_raise NUMERIC,
    total_redeemed NUMERIC,
    total_available_capacity NUMERIC,
    overall_usage_percentage NUMERIC,
    active_rules_count BIGINT,
    rules_with_limits_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(rr.target_raise_amount) as total_target_raise,
        SUM(rr.total_redeemed_amount) as total_redeemed,
        SUM(rr.available_capacity) as total_available_capacity,
        CASE 
            WHEN SUM(rr.target_raise_amount) > 0 THEN 
                ROUND((SUM(rr.total_redeemed_amount) / SUM(rr.target_raise_amount)) * 100, 2)
            ELSE NULL
        END as overall_usage_percentage,
        COUNT(*) as active_rules_count,
        COUNT(CASE WHEN rr.target_raise_amount IS NOT NULL THEN 1 END) as rules_with_limits_count
    FROM redemption_rules_with_product_details rr
    WHERE rr.is_redemption_open = true;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_redemption_rules_target_raise_amount 
ON redemption_rules(target_raise_amount) WHERE target_raise_amount IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_redemption_rules_capacity_analysis 
ON redemption_rules(project_id, target_raise_amount, is_redemption_open);

-- Step 11: Add constraints and validation
-- Add check constraint to ensure max_redemption_percentage doesn't exceed 100% when target_raise is set
ALTER TABLE redemption_rules 
ADD CONSTRAINT redemption_rules_max_percentage_check 
CHECK (
    max_redemption_percentage IS NULL 
    OR max_redemption_percentage <= 100
    OR target_raise_amount IS NULL
);

COMMIT;

-- Verification queries
/*
-- Check that target_raise_amount is populated
SELECT 
    rr.id,
    rr.project_id,
    rr.target_raise_amount,
    p.name as project_name,
    p.project_type,
    CASE WHEN rr.target_raise_amount IS NOT NULL THEN '✅ HAS TARGET_RAISE' ELSE '❌ NO TARGET_RAISE' END as status
FROM redemption_rules rr
JOIN projects p ON rr.project_id = p.id
ORDER BY rr.created_at DESC;

-- Test capacity calculation
SELECT * FROM get_redemption_capacity('ead1e577-4dec-4158-905a-db418f837791');

-- Test validation function
SELECT * FROM validate_redemption_amount('ead1e577-4dec-4158-905a-db418f837791', 50000);

-- View comprehensive redemption rules with capacity info
SELECT 
    project_name,
    product_name,
    target_raise_amount,
    available_capacity,
    capacity_percentage,
    capacity_status
FROM redemption_rules_with_product_details 
WHERE target_raise_amount IS NOT NULL
ORDER BY capacity_percentage DESC;

-- Get overall capacity summary
SELECT * FROM get_total_redemption_capacity();
*/
