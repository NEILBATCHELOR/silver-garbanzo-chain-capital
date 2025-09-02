-- Fix redemption capacity function to use correct column names
-- Date: August 23, 2025
-- Issue: Function references non-existent 'amount' and 'redemption_rule_id' columns

-- Drop the existing function
DROP FUNCTION IF EXISTS get_redemption_capacity(uuid);

-- Create the corrected function
CREATE OR REPLACE FUNCTION get_redemption_capacity(p_redemption_rule_id uuid)
RETURNS TABLE(
    target_raise_amount NUMERIC,
    total_redeemed_amount NUMERIC,
    available_capacity NUMERIC,
    capacity_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_target_raise NUMERIC;
    v_total_redeemed NUMERIC;
    v_project_id UUID;
BEGIN
    -- Get target_raise_amount and project_id for this redemption rule
    SELECT rr.target_raise_amount, rr.project_id
    INTO v_target_raise, v_project_id
    FROM redemption_rules rr 
    WHERE rr.id = p_redemption_rule_id;
    
    -- Calculate total redeemed amount from redemption_requests using project_id relationship
    -- Fixed: Use 'token_amount' instead of 'amount' and project_id instead of redemption_rule_id
    BEGIN
        SELECT COALESCE(SUM(
            CASE 
                WHEN status IN ('completed', 'processed', 'settled', 'approved') THEN token_amount
                ELSE 0
            END
        ), 0)
        INTO v_total_redeemed
        FROM redemption_requests rreq
        WHERE rreq.project_id = v_project_id;
    EXCEPTION
        WHEN undefined_table THEN
            v_total_redeemed := 0;
        WHEN OTHERS THEN
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
$$;