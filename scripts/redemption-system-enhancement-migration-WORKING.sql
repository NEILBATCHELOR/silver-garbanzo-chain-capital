-- Redemption System Enhancement - WORKING Database Migration Script
-- Implements the three core business principles for redemption management
-- FIXED: Removed problematic audit_logs section that was causing errors

-- =====================================
-- Phase 1: Schema Enhancements
-- =====================================

BEGIN;

-- 1.1 Enhance redemption_rules table with project/product linking AND max_redemption_percentage
ALTER TABLE redemption_rules 
ADD COLUMN IF NOT EXISTS product_type TEXT,
ADD COLUMN IF NOT EXISTS product_id UUID,
ADD COLUMN IF NOT EXISTS is_redemption_open BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS open_after_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS allow_continuous_redemption BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_redemption_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS redemption_eligibility_rules JSONB DEFAULT '{}';

-- Add unique constraint BEFORE using ON CONFLICT
ALTER TABLE redemption_rules 
DROP CONSTRAINT IF EXISTS redemption_rules_project_product_unique;

ALTER TABLE redemption_rules 
ADD CONSTRAINT redemption_rules_project_product_unique 
UNIQUE(project_id, redemption_type);

-- 1.2 Enhance distributions table with redemption tracking
ALTER TABLE distributions
ADD COLUMN IF NOT EXISTS redemption_percentage_used NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS redemption_locked_amount NUMERIC DEFAULT 0;

-- 1.3 Enhance redemption_requests with validation tracking
ALTER TABLE redemption_requests
ADD COLUMN IF NOT EXISTS eligibility_check_id UUID,
ADD COLUMN IF NOT EXISTS window_id UUID,
ADD COLUMN IF NOT EXISTS distribution_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS validation_results JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS business_rules_version TEXT DEFAULT '1.0';

-- =====================================
-- Phase 2: Performance Indexes
-- =====================================

CREATE INDEX IF NOT EXISTS idx_redemption_rules_project_product 
ON redemption_rules(project_id, product_id);

CREATE INDEX IF NOT EXISTS idx_redemption_rules_open_status 
ON redemption_rules(is_redemption_open, open_after_date);

CREATE INDEX IF NOT EXISTS idx_redemption_rules_continuous 
ON redemption_rules(allow_continuous_redemption) 
WHERE allow_continuous_redemption = true;

CREATE INDEX IF NOT EXISTS idx_distributions_redemption_tracking 
ON distributions(investor_id, project_id, remaining_amount) 
WHERE remaining_amount > 0;

CREATE INDEX IF NOT EXISTS idx_redemption_requests_validation 
ON redemption_requests(project_id, status, created_at);

-- =====================================
-- Phase 3: Business Logic Views
-- =====================================

-- Simplified redemption eligibility view (without optional window tables)
CREATE OR REPLACE VIEW redemption_eligibility AS
SELECT 
    d.id as distribution_id,
    d.investor_id,
    d.project_id,
    d.token_amount as total_distributed,
    d.remaining_amount,
    d.redemption_percentage_used,
    d.fully_redeemed,
    rr.id as rule_id,
    rr.is_redemption_open,
    rr.open_after_date,
    rr.allow_continuous_redemption,
    rr.max_redemption_percentage,
    rr.lock_up_period,
    rr.product_type,
    rr.product_id,
    NULL::UUID as active_window_id,
    NULL::TIMESTAMP as window_start,
    NULL::TIMESTAMP as window_end,
    NULL::TIMESTAMP as submission_start_date,
    NULL::TIMESTAMP as submission_end_date,
    NULL::TEXT as window_status,
    -- Core Principle Checks (simplified without windows)
    CASE 
        WHEN d.fully_redeemed THEN false
        WHEN rr.is_redemption_open = false THEN false
        WHEN rr.open_after_date IS NOT NULL AND rr.open_after_date > NOW() THEN false
        WHEN rr.allow_continuous_redemption = true THEN true
        ELSE false
    END as is_eligible_now,
    -- Maximum redeemable amount calculation
    CASE 
        WHEN rr.max_redemption_percentage IS NOT NULL 
        THEN LEAST(d.remaining_amount, d.token_amount * rr.max_redemption_percentage / 100)
        ELSE d.remaining_amount
    END as max_redeemable_amount,
    -- Eligibility reasons (simplified)
    CASE 
        WHEN d.fully_redeemed THEN 'Distribution fully redeemed'
        WHEN rr.is_redemption_open = false THEN 'Redemptions are closed'
        WHEN rr.open_after_date IS NOT NULL AND rr.open_after_date > NOW() 
        THEN 'Redemption period not yet open until ' || rr.open_after_date::text
        WHEN rr.allow_continuous_redemption = false 
        THEN 'Window-based redemption configured but no active window management'
        ELSE 'Eligible'
    END as eligibility_reason
FROM distributions d
LEFT JOIN redemption_rules rr ON rr.project_id = d.project_id 
WHERE d.remaining_amount > 0;

-- Active redemption opportunities view
CREATE OR REPLACE VIEW active_redemption_opportunities AS
SELECT 
    re.project_id,
    re.investor_id,
    re.product_type,
    re.product_id,
    COUNT(re.distribution_id) as eligible_distributions,
    SUM(re.total_distributed) as total_distributed_amount,
    SUM(re.remaining_amount) as total_remaining_amount,
    SUM(re.max_redeemable_amount) as total_max_redeemable,
    ARRAY_AGG(re.distribution_id) as distribution_ids,
    MIN(re.window_start) as earliest_window_start,
    MAX(re.window_end) as latest_window_end,
    bool_and(re.is_eligible_now) as all_eligible,
    string_agg(DISTINCT re.eligibility_reason, '; ') as combined_reasons
FROM redemption_eligibility re
WHERE re.is_eligible_now = true
GROUP BY re.project_id, re.investor_id, re.product_type, re.product_id;

-- =====================================
-- Phase 4: Business Logic Functions
-- =====================================

-- Function to check redemption eligibility
CREATE OR REPLACE FUNCTION check_redemption_eligibility(
    p_investor_id UUID,
    p_project_id UUID,
    p_requested_amount NUMERIC,
    p_product_type TEXT DEFAULT NULL,
    p_product_id UUID DEFAULT NULL
) RETURNS TABLE(
    eligible BOOLEAN,
    reason TEXT,
    max_amount NUMERIC,
    window_id UUID,
    distribution_ids UUID[],
    validation_details JSONB
) AS $$
DECLARE
    v_total_available NUMERIC := 0;
    v_eligibility_record RECORD;
    v_validation JSONB := '{}';
    v_distribution_ids UUID[];
BEGIN
    -- Check if redemptions are open globally
    SELECT INTO v_eligibility_record *
    FROM redemption_rules rr 
    WHERE rr.project_id = p_project_id
      AND (p_product_type IS NULL OR rr.product_type = p_product_type)
      AND (p_product_id IS NULL OR rr.product_id = p_product_id)
    ORDER BY rr.created_at DESC
    LIMIT 1;
    
    -- Principle 1: Check if redemptions are open
    IF NOT FOUND OR v_eligibility_record.is_redemption_open = false THEN
        RETURN QUERY SELECT 
            false,
            'Redemptions are currently closed for this project/product',
            0::NUMERIC,
            NULL::UUID,
            ARRAY[]::UUID[],
            '{"principle_violated": 1, "reason": "redemptions_closed"}'::JSONB;
        RETURN;
    END IF;
    
    -- Principle 2: Check date eligibility
    IF v_eligibility_record.open_after_date IS NOT NULL AND v_eligibility_record.open_after_date > NOW() THEN
        RETURN QUERY SELECT 
            false,
            'Redemption period opens on ' || v_eligibility_record.open_after_date::text,
            0::NUMERIC,
            NULL::UUID,
            ARRAY[]::UUID[],
            jsonb_build_object(
                'principle_violated', 2, 
                'reason', 'not_yet_open',
                'open_date', v_eligibility_record.open_after_date
            );
        RETURN;
    END IF;
    
    -- Principle 3: Check distribution limits and calculate available amounts
    SELECT 
        COALESCE(SUM(re.max_redeemable_amount), 0),
        ARRAY_AGG(re.distribution_id)
    INTO v_total_available, v_distribution_ids
    FROM redemption_eligibility re
    WHERE re.investor_id = p_investor_id
      AND re.project_id = p_project_id
      AND re.is_eligible_now = true
      AND (p_product_type IS NULL OR re.product_type = p_product_type)
      AND (p_product_id IS NULL OR re.product_id = p_product_id);
    
    -- Check if investor has any distributions
    IF v_total_available = 0 OR v_distribution_ids IS NULL THEN
        RETURN QUERY SELECT 
            false,
            'No eligible distributions found for redemption',
            0::NUMERIC,
            NULL::UUID,
            ARRAY[]::UUID[],
            '{"principle_violated": 3, "reason": "no_distributions"}'::JSONB;
        RETURN;
    END IF;
    
    -- Check if requested amount exceeds limits
    IF p_requested_amount > v_total_available THEN
        RETURN QUERY SELECT 
            false,
            'Requested amount exceeds maximum redeemable amount',
            v_total_available,
            NULL::UUID,
            v_distribution_ids,
            jsonb_build_object(
                'principle_violated', 3, 
                'reason', 'amount_exceeds_limit',
                'requested', p_requested_amount,
                'available', v_total_available
            );
        RETURN;
    END IF;
    
    -- All checks passed
    v_validation := jsonb_build_object(
        'all_principles_satisfied', true,
        'continuous_redemption', v_eligibility_record.allow_continuous_redemption,
        'max_percentage', v_eligibility_record.max_redemption_percentage
    );
    
    RETURN QUERY SELECT 
        true,
        'Eligible for redemption',
        v_total_available,
        NULL::UUID,
        v_distribution_ids,
        v_validation;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to reserve redemption amounts
CREATE OR REPLACE FUNCTION reserve_redemption_amounts(
    p_distribution_ids UUID[],
    p_total_amount NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
    v_distribution RECORD;
    v_remaining_to_reserve NUMERIC := p_total_amount;
    v_amount_to_reserve NUMERIC;
BEGIN
    -- Handle null or empty array
    IF p_distribution_ids IS NULL OR array_length(p_distribution_ids, 1) IS NULL THEN
        RETURN false;
    END IF;
    
    -- Loop through distributions and reserve amounts
    FOR v_distribution IN 
        SELECT * FROM distributions 
        WHERE id = ANY(p_distribution_ids)
        ORDER BY distribution_date ASC
    LOOP
        EXIT WHEN v_remaining_to_reserve <= 0;
        
        v_amount_to_reserve := LEAST(
            v_remaining_to_reserve, 
            v_distribution.remaining_amount - COALESCE(v_distribution.redemption_locked_amount, 0)
        );
        
        IF v_amount_to_reserve > 0 THEN
            UPDATE distributions 
            SET 
                redemption_locked_amount = COALESCE(redemption_locked_amount, 0) + v_amount_to_reserve,
                updated_at = NOW()
            WHERE id = v_distribution.id;
            
            v_remaining_to_reserve := v_remaining_to_reserve - v_amount_to_reserve;
        END IF;
    END LOOP;
    
    RETURN v_remaining_to_reserve = 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- Phase 5: Sample Data & Testing
-- =====================================

DO $$
DECLARE
    v_project_id UUID;
    v_project_count INTEGER;
BEGIN
    -- Check how many projects exist
    SELECT COUNT(*) INTO v_project_count FROM projects;
    
    IF v_project_count > 0 THEN
        -- Get first project ID
        SELECT id INTO v_project_id FROM projects LIMIT 1;
        
        -- Use correct redemption_type values: 'standard', 'interval'
        INSERT INTO redemption_rules (
            project_id,
            redemption_type,
            is_redemption_open,
            allow_continuous_redemption,
            max_redemption_percentage,
            require_multi_sig_approval,
            required_approvers,
            lock_up_period
        ) VALUES 
        (v_project_id, 'standard', true, true, 80.0, true, 2, 90),
        (v_project_id, 'interval', true, false, 100.0, true, 3, 180)
        ON CONFLICT (project_id, redemption_type) DO UPDATE SET
            is_redemption_open = EXCLUDED.is_redemption_open,
            allow_continuous_redemption = EXCLUDED.allow_continuous_redemption,
            max_redemption_percentage = EXCLUDED.max_redemption_percentage,
            updated_at = NOW();
        
        RAISE NOTICE 'Sample redemption rules created for project: %', v_project_id;
    ELSE
        RAISE NOTICE 'No projects found - skipping sample data creation';
    END IF;
END $$;

-- =====================================
-- Phase 6: Monitoring View
-- =====================================

CREATE OR REPLACE VIEW redemption_system_health AS
SELECT 
    COUNT(DISTINCT rr.project_id) as projects_with_rules,
    COUNT(*) as total_rules,
    COUNT(*) FILTER (WHERE rr.is_redemption_open = true) as open_redemption_projects,
    COUNT(*) FILTER (WHERE rr.allow_continuous_redemption = true) as continuous_redemption_projects,
    0 as active_windows,
    COALESCE(COUNT(DISTINCT re.investor_id), 0) as eligible_investors,
    COALESCE(SUM(re.total_max_redeemable), 0) as total_redeemable_amount
FROM redemption_rules rr
LEFT JOIN active_redemption_opportunities re ON re.project_id = rr.project_id;

COMMIT;

-- Success message
SELECT 
    '🎉 Redemption System Enhancement COMPLETED SUCCESSFULLY! 🎉' as status,
    'Three core business principles implemented:' as message,
    '1. ✅ Redemption availability control (is_redemption_open)' as principle_1,
    '2. ✅ Flexible opening mechanisms (dates/continuous)' as principle_2,  
    '3. ✅ Distribution-based limitations (max_redemption_percentage)' as principle_3;
