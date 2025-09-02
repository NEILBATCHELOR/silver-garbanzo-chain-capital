-- Redemption Rules Product Awareness Enhancement
-- Date: August 23, 2025
-- Purpose: Make redemption rules cognizant of specific product details from all product tables

BEGIN;

-- Step 1: Create product table mapping function
-- This function returns the appropriate product table name based on project_type
CREATE OR REPLACE FUNCTION get_product_table_name(p_project_type TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE p_project_type
        WHEN 'structured_products' THEN 'structured_products'
        WHEN 'equity' THEN 'equity_products'
        WHEN 'commodities' THEN 'commodities_products'
        WHEN 'funds_etfs_etps' THEN 'fund_products'
        WHEN 'bonds' THEN 'bond_products'
        WHEN 'quantitative_investment_strategies' THEN 'quantitative_investment_strategies_products'
        WHEN 'private_equity' THEN 'private_equity_products'
        WHEN 'private_debt' THEN 'private_debt_products'
        WHEN 'real_estate' THEN 'real_estate_products'
        WHEN 'energy' THEN 'energy_products'
        WHEN 'infrastructure' THEN 'infrastructure_products'
        WHEN 'collectibles' THEN 'collectibles_products'
        WHEN 'receivables' THEN 'asset_backed_products' -- Receivables are asset-backed products
        WHEN 'solar_wind_climate' THEN 'energy_products' -- Sub-category of energy
        WHEN 'digital_tokenised_fund' THEN 'digital_tokenized_fund_products'
        WHEN 'fiat_backed_stablecoin' THEN 'stablecoin_products'
        WHEN 'crypto_backed_stablecoin' THEN 'stablecoin_products'
        WHEN 'commodity_backed_stablecoin' THEN 'stablecoin_products'
        WHEN 'algorithmic_stablecoin' THEN 'stablecoin_products'
        WHEN 'rebasing_stablecoin' THEN 'stablecoin_products'
        ELSE NULL
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Create function to get product_id for a project
-- This function queries the appropriate product table to get the product ID
CREATE OR REPLACE FUNCTION get_product_id_for_project(p_project_id UUID)
RETURNS UUID AS $$
DECLARE
    v_project_type TEXT;
    v_table_name TEXT;
    v_product_id UUID;
    v_sql TEXT;
BEGIN
    -- Get the project type
    SELECT project_type INTO v_project_type 
    FROM projects 
    WHERE id = p_project_id;
    
    IF v_project_type IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get the appropriate product table name
    v_table_name := get_product_table_name(v_project_type);
    
    IF v_table_name IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Build dynamic SQL to query the product table
    v_sql := format('SELECT id FROM %I WHERE project_id = $1', v_table_name);
    
    -- Execute the dynamic query
    EXECUTE v_sql USING p_project_id INTO v_product_id;
    
    RETURN v_product_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL; -- Return NULL if table doesn't exist or query fails
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update existing redemption rules with product_id
-- This populates the product_id field for existing redemption rules
UPDATE redemption_rules 
SET product_id = get_product_id_for_project(project_id),
    updated_at = NOW()
WHERE product_id IS NULL 
    AND project_id IS NOT NULL;

-- Step 4: Create enhanced sync function for project updates
-- This replaces the existing sync function to also handle product_id updates
CREATE OR REPLACE FUNCTION sync_redemption_product_type()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all redemption rules associated with this project
    UPDATE redemption_rules 
    SET product_type = NEW.project_type,
        organization_id = NEW.organization_id,
        product_id = get_product_id_for_project(NEW.id),
        updated_at = NOW()
    WHERE project_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create enhanced insert function for new redemption rules
-- This replaces the existing insert function to also handle product_id
CREATE OR REPLACE FUNCTION set_redemption_product_type_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-populate product_type, organization_id, and product_id from associated project
    IF NEW.project_id IS NOT NULL THEN
        SELECT 
            p.project_type, 
            p.organization_id,
            get_product_id_for_project(p.id)
        INTO 
            NEW.product_type, 
            NEW.organization_id,
            NEW.product_id
        FROM projects p
        WHERE p.id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create triggers for product table updates
-- These triggers ensure product_id stays synchronized when products are created/updated

-- Function to sync redemption rules when product records change
CREATE OR REPLACE FUNCTION sync_redemption_rules_on_product_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update redemption rules when product records change
    IF TG_OP = 'INSERT' THEN
        UPDATE redemption_rules 
        SET product_id = NEW.id,
            updated_at = NOW()
        WHERE project_id = NEW.project_id 
            AND product_id IS NULL;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE redemption_rules 
        SET product_id = NULL,
            updated_at = NOW()
        WHERE product_id = OLD.id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all product tables
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
        EXECUTE format('DROP TRIGGER IF EXISTS trigger_sync_redemption_on_%s_change ON %I', 
                      table_name, table_name);
        
        -- Create new trigger
        EXECUTE format('CREATE TRIGGER trigger_sync_redemption_on_%s_change
                       AFTER INSERT OR DELETE ON %I
                       FOR EACH ROW
                       EXECUTE FUNCTION sync_redemption_rules_on_product_change()', 
                      table_name, table_name);
    END LOOP;
END $$;

-- Step 7: Create comprehensive view for redemption rules with product details
-- This view dynamically joins to the appropriate product table based on product_type
CREATE OR REPLACE VIEW redemption_rules_with_product_details AS
WITH product_details AS (
    -- Asset Backed Products
    SELECT 
        rr.id as redemption_rule_id,
        'asset_backed_products' as product_table,
        to_jsonb(abp.*) as product_details
    FROM redemption_rules rr
    JOIN asset_backed_products abp ON rr.product_id = abp.id
    WHERE rr.product_type IN ('receivables')
    
    UNION ALL
    
    -- Bond Products  
    SELECT 
        rr.id as redemption_rule_id,
        'bond_products' as product_table,
        to_jsonb(bp.*) as product_details
    FROM redemption_rules rr
    JOIN bond_products bp ON rr.product_id = bp.id
    WHERE rr.product_type = 'bonds'
    
    UNION ALL
    
    -- Collectibles Products
    SELECT 
        rr.id as redemption_rule_id,
        'collectibles_products' as product_table,
        to_jsonb(cp.*) as product_details
    FROM redemption_rules rr
    JOIN collectibles_products cp ON rr.product_id = cp.id
    WHERE rr.product_type = 'collectibles'
    
    UNION ALL
    
    -- Commodities Products
    SELECT 
        rr.id as redemption_rule_id,
        'commodities_products' as product_table,
        to_jsonb(cop.*) as product_details
    FROM redemption_rules rr
    JOIN commodities_products cop ON rr.product_id = cop.id
    WHERE rr.product_type = 'commodities'
    
    UNION ALL
    
    -- Digital Tokenized Fund Products
    SELECT 
        rr.id as redemption_rule_id,
        'digital_tokenized_fund_products' as product_table,
        to_jsonb(dtfp.*) as product_details
    FROM redemption_rules rr
    JOIN digital_tokenized_fund_products dtfp ON rr.product_id = dtfp.id
    WHERE rr.product_type = 'digital_tokenised_fund'
    
    UNION ALL
    
    -- Energy Products
    SELECT 
        rr.id as redemption_rule_id,
        'energy_products' as product_table,
        to_jsonb(ep.*) as product_details
    FROM redemption_rules rr
    JOIN energy_products ep ON rr.product_id = ep.id
    WHERE rr.product_type IN ('energy', 'solar_wind_climate')
    
    UNION ALL
    
    -- Equity Products
    SELECT 
        rr.id as redemption_rule_id,
        'equity_products' as product_table,
        to_jsonb(eqp.*) as product_details
    FROM redemption_rules rr
    JOIN equity_products eqp ON rr.product_id = eqp.id
    WHERE rr.product_type = 'equity'
    
    UNION ALL
    
    -- Fund Products
    SELECT 
        rr.id as redemption_rule_id,
        'fund_products' as product_table,
        to_jsonb(fp.*) as product_details
    FROM redemption_rules rr
    JOIN fund_products fp ON rr.product_id = fp.id
    WHERE rr.product_type = 'funds_etfs_etps'
    
    UNION ALL
    
    -- Infrastructure Products
    SELECT 
        rr.id as redemption_rule_id,
        'infrastructure_products' as product_table,
        to_jsonb(ip.*) as product_details
    FROM redemption_rules rr
    JOIN infrastructure_products ip ON rr.product_id = ip.id
    WHERE rr.product_type = 'infrastructure'
    
    UNION ALL
    
    -- Private Debt Products
    SELECT 
        rr.id as redemption_rule_id,
        'private_debt_products' as product_table,
        to_jsonb(pdp.*) as product_details
    FROM redemption_rules rr
    JOIN private_debt_products pdp ON rr.product_id = pdp.id
    WHERE rr.product_type = 'private_debt'
    
    UNION ALL
    
    -- Private Equity Products
    SELECT 
        rr.id as redemption_rule_id,
        'private_equity_products' as product_table,
        to_jsonb(pep.*) as product_details
    FROM redemption_rules rr
    JOIN private_equity_products pep ON rr.product_id = pep.id
    WHERE rr.product_type = 'private_equity'
    
    UNION ALL
    
    -- Quantitative Investment Strategies Products
    SELECT 
        rr.id as redemption_rule_id,
        'quantitative_investment_strategies_products' as product_table,
        to_jsonb(qisp.*) as product_details
    FROM redemption_rules rr
    JOIN quantitative_investment_strategies_products qisp ON rr.product_id = qisp.id
    WHERE rr.product_type = 'quantitative_investment_strategies'
    
    UNION ALL
    
    -- Real Estate Products
    SELECT 
        rr.id as redemption_rule_id,
        'real_estate_products' as product_table,
        to_jsonb(rep.*) as product_details
    FROM redemption_rules rr
    JOIN real_estate_products rep ON rr.product_id = rep.id
    WHERE rr.product_type = 'real_estate'
    
    UNION ALL
    
    -- Stablecoin Products
    SELECT 
        rr.id as redemption_rule_id,
        'stablecoin_products' as product_table,
        to_jsonb(sp.*) as product_details
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
        to_jsonb(stp.*) as product_details
    FROM redemption_rules rr
    JOIN structured_products stp ON rr.product_id = stp.id
    WHERE rr.product_type = 'structured_products'
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
    ) as product_currency
    
FROM redemption_rules rr
JOIN projects p ON rr.project_id = p.id
LEFT JOIN product_details pd ON rr.id = pd.redemption_rule_id
ORDER BY rr.created_at DESC;

-- Step 8: Create helper functions for common redemption rule queries

-- Function to get product details for a specific redemption rule
CREATE OR REPLACE FUNCTION get_redemption_rule_product_details(p_redemption_rule_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT product_details 
    INTO v_result
    FROM redemption_rules_with_product_details 
    WHERE id = p_redemption_rule_id;
    
    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to get all redemption rules for a specific product type with details
CREATE OR REPLACE FUNCTION get_redemption_rules_by_product_type(p_product_type TEXT)
RETURNS TABLE (
    redemption_rule_id UUID,
    project_name TEXT,
    product_name TEXT,
    product_status TEXT,
    redemption_type TEXT,
    is_redemption_open BOOLEAN,
    product_details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rr.id as redemption_rule_id,
        rr.project_name,
        rr.product_name,
        rr.product_status,
        rr.redemption_type,
        rr.is_redemption_open,
        rr.product_details
    FROM redemption_rules_with_product_details rr
    WHERE rr.product_type = p_product_type
    ORDER BY rr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_redemption_rules_product_id 
ON redemption_rules(product_id) WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_redemption_rules_project_product_id 
ON redemption_rules(project_id, product_id);

-- Step 10: Add comments for documentation
COMMENT ON COLUMN redemption_rules.product_id IS 'Foreign key to the specific product record in the appropriate product table based on project_type. Automatically managed via triggers.';

COMMENT ON FUNCTION get_product_table_name(TEXT) IS 'Maps project_type to the corresponding product table name for dynamic queries.';

COMMENT ON FUNCTION get_product_id_for_project(UUID) IS 'Retrieves the product_id for a given project by querying the appropriate product table.';

COMMENT ON VIEW redemption_rules_with_product_details IS 'Comprehensive view that joins redemption rules with their specific product details from the appropriate product table.';

COMMIT;

-- Verification queries
/*
-- Check that product_id is populated for existing redemption rules
SELECT 
    rr.id,
    rr.project_id,
    rr.product_type,
    rr.product_id,
    p.name as project_name,
    CASE WHEN rr.product_id IS NOT NULL THEN '✅ HAS PRODUCT_ID' ELSE '❌ MISSING PRODUCT_ID' END as status
FROM redemption_rules rr
JOIN projects p ON rr.project_id = p.id
ORDER BY rr.created_at DESC;

-- Test the comprehensive view
SELECT * FROM redemption_rules_with_product_details LIMIT 5;

-- Test product type query function
SELECT * FROM get_redemption_rules_by_product_type('bonds');
*/
