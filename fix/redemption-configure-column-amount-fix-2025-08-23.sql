-- Fix: Column "amount" does not exist in get_redemption_capacity function
-- Date: August 23, 2025
-- Issue: Function get_redemption_capacity() references non-existent 'amount' column
-- Solution: Update function to use correct 'token_amount' column from redemption_requests table

-- Drop and recreate the function with correct column reference
CREATE OR REPLACE FUNCTION get_redemption_capacity(p_redemption_rule_id UUID)
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
BEGIN
    -- Get target_raise_amount for this redemption rule
    SELECT rr.target_raise_amount 
    INTO v_target_raise
    FROM redemption_rules rr 
    WHERE rr.id = p_redemption_rule_id;
    
    -- Calculate total redeemed amount from redemption_requests
    -- FIXED: Changed 'amount' to 'token_amount' to match actual column name
    BEGIN
        SELECT COALESCE(SUM(
            CASE 
                WHEN status IN ('completed', 'processed', 'settled') THEN token_amount
                ELSE 0
            END
        ), 0)
        INTO v_total_redeemed
        FROM redemption_requests rreq
        WHERE rreq.project_id = (
            SELECT project_id 
            FROM redemption_rules 
            WHERE id = p_redemption_rule_id
        );
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
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION get_redemption_capacity(UUID) IS 
'Calculates redemption capacity for a redemption rule by comparing target raise amount with total redeemed amounts from completed redemption requests. Fixed to use token_amount column.';
