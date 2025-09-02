-- Fix redemption capacity function with proper dependency handling
-- Date: August 23, 2025
-- Issue: Function references non-existent columns and has dependent view

-- Step 1: Drop the dependent view first
DROP VIEW IF EXISTS redemption_rules_with_product_details CASCADE;

-- Step 2: Drop and recreate the function with correct column references
DROP FUNCTION IF EXISTS get_redemption_capacity(uuid);

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

-- Step 3: Recreate the dependent view with corrected structure
CREATE VIEW redemption_rules_with_product_details AS
WITH product_details AS (
    SELECT rr.id AS redemption_rule_id,
        'asset_backed_products'::text AS product_table,
        to_jsonb(abp.*) AS product_details,
        abp.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN asset_backed_products abp ON rr.product_id = abp.id
    WHERE rr.product_type = 'receivables'

    UNION ALL
    SELECT rr.id AS redemption_rule_id,
        'bond_products'::text AS product_table,
        to_jsonb(bp.*) AS product_details,
        bp.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN bond_products bp ON rr.product_id = bp.id
    WHERE rr.product_type = 'bonds'

    UNION ALL
    SELECT rr.id AS redemption_rule_id,
        'collectibles_products'::text AS product_table,
        to_jsonb(cp.*) AS product_details,
        cp.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN collectibles_products cp ON rr.product_id = cp.id
    WHERE rr.product_type = 'collectibles'

    UNION ALL
    SELECT rr.id AS redemption_rule_id,
        'commodities_products'::text AS product_table,
        to_jsonb(cop.*) AS product_details,
        cop.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN commodities_products cop ON rr.product_id = cop.id
    WHERE rr.product_type = 'commodities'

    UNION ALL
    SELECT rr.id AS redemption_rule_id,
        'digital_tokenized_fund_products'::text AS product_table,
        to_jsonb(dtfp.*) AS product_details,
        dtfp.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN digital_tokenized_fund_products dtfp ON rr.product_id = dtfp.id
    WHERE rr.product_type = 'digital_tokenised_fund'

    UNION ALL
    SELECT rr.id AS redemption_rule_id,
        'energy_products'::text AS product_table,
        to_jsonb(ep.*) AS product_details,
        ep.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN energy_products ep ON rr.product_id = ep.id
    WHERE rr.product_type IN ('energy', 'solar_wind_climate')

    UNION ALL
    SELECT rr.id AS redemption_rule_id,
        'equity_products'::text AS product_table,
        to_jsonb(eqp.*) AS product_details,
        eqp.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN equity_products eqp ON rr.product_id = eqp.id
    WHERE rr.product_type = 'equity'

    UNION ALL
    SELECT rr.id AS redemption_rule_id,
        'fund_products'::text AS product_table,
        to_jsonb(fp.*) AS product_details,
        fp.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN fund_products fp ON rr.product_id = fp.id
    WHERE rr.product_type = 'funds_etfs_etps'

    UNION ALL
    SELECT rr.id AS redemption_rule_id,
        'infrastructure_products'::text AS product_table,
        to_jsonb(ip.*) AS product_details,
        ip.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN infrastructure_products ip ON rr.product_id = ip.id
    WHERE rr.product_type = 'infrastructure'

    UNION ALL
    SELECT rr.id AS redemption_rule_id,
        'private_debt_products'::text AS product_table,
        to_jsonb(pdp.*) AS product_details,
        pdp.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN private_debt_products pdp ON rr.product_id = pdp.id
    WHERE rr.product_type = 'private_debt'

    UNION ALL
    SELECT rr.id AS redemption_rule_id,
        'private_equity_products'::text AS product_table,
        to_jsonb(pep.*) AS product_details,
        pep.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN private_equity_products pep ON rr.product_id = pep.id
    WHERE rr.product_type = 'private_equity'

    UNION ALL
    SELECT rr.id AS redemption_rule_id,
        'quantitative_investment_strategies_products'::text AS product_table,
        to_jsonb(qisp.*) AS product_details,
        qisp.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN quantitative_investment_strategies_products qisp ON rr.product_id = qisp.id
    WHERE rr.product_type = 'quantitative_investment_strategies'

    UNION ALL
    SELECT rr.id AS redemption_rule_id,
        'real_estate_products'::text AS product_table,
        to_jsonb(rep.*) AS product_details,
        rep.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN real_estate_products rep ON rr.product_id = rep.id
    WHERE rr.product_type = 'real_estate'

    UNION ALL
    SELECT rr.id AS redemption_rule_id,
        'stablecoin_products'::text AS product_table,
        to_jsonb(sp.*) AS product_details,
        sp.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN stablecoin_products sp ON rr.product_id = sp.id
    WHERE rr.product_type IN ('fiat_backed_stablecoin', 'crypto_backed_stablecoin', 'commodity_backed_stablecoin', 'algorithmic_stablecoin', 'rebasing_stablecoin')

    UNION ALL
    SELECT rr.id AS redemption_rule_id,
        'structured_products'::text AS product_table,
        to_jsonb(stp.*) AS product_details,
        stp.target_raise AS product_target_raise
    FROM redemption_rules rr
    JOIN structured_products stp ON rr.product_id = stp.id
    WHERE rr.product_type = 'structured_products'
),
capacity_info AS (
    SELECT rr.id AS redemption_rule_id,
        rc.target_raise_amount,
        rc.total_redeemed_amount,
        rc.available_capacity,
        rc.capacity_percentage
    FROM redemption_rules rr
    CROSS JOIN LATERAL get_redemption_capacity(rr.id) rc(target_raise_amount, total_redeemed_amount, available_capacity, capacity_percentage)
)
SELECT rr.id,
    rr.rule_id,
    rr.redemption_type,
    rr.require_multi_sig_approval,
    rr.required_approvers,
    rr.total_approvers,
    rr.notify_investors,
    rr.settlement_method,
    rr.immediate_execution,
    rr.use_latest_nav,
    rr.allow_any_time_redemption,
    rr.repurchase_frequency,
    rr.lock_up_period,
    rr.submission_window_days,
    rr.lock_tokens_on_request,
    rr.use_window_nav,
    rr.enable_pro_rata_distribution,
    rr.queue_unprocessed_requests,
    rr.enable_admin_override,
    rr.created_at,
    rr.updated_at,
    rr.project_id,
    rr.organization_id,
    rr.product_type,
    rr.product_id,
    rr.is_redemption_open,
    rr.open_after_date,
    rr.allow_continuous_redemption,
    rr.max_redemption_percentage,
    rr.redemption_eligibility_rules,
    rr.target_raise_amount,
    p.name AS project_name,
    p.project_type,
    pd.product_table,
    pd.product_details,
    CASE
        WHEN pd.product_table = 'bond_products' THEN pd.product_details ->> 'issuer_name'
        WHEN pd.product_table = 'equity_products' THEN pd.product_details ->> 'company_name'
        WHEN pd.product_table = 'fund_products' THEN pd.product_details ->> 'fund_name'
        WHEN pd.product_table = 'stablecoin_products' THEN pd.product_details ->> 'asset_name'
        WHEN pd.product_table = 'real_estate_products' THEN pd.product_details ->> 'property_name'
        WHEN pd.product_table = 'energy_products' THEN pd.product_details ->> 'project_name'
        WHEN pd.product_table = 'commodities_products' THEN pd.product_details ->> 'commodity_name'
        WHEN pd.product_table = 'private_equity_products' THEN pd.product_details ->> 'fund_name'
        ELSE pd.product_details ->> 'name'
    END AS product_name,
    COALESCE(pd.product_details ->> 'status', pd.product_details ->> 'product_status') AS product_status,
    COALESCE(pd.product_details ->> 'currency', pd.product_details ->> 'base_currency') AS product_currency,
    COALESCE(pd.product_target_raise, rr.target_raise_amount) AS effective_target_raise,
    ci.total_redeemed_amount,
    ci.available_capacity,
    ci.capacity_percentage,
    CASE
        WHEN rr.target_raise_amount IS NULL THEN 'NO_LIMIT'
        WHEN ci.capacity_percentage >= 100 THEN 'FULLY_REDEEMED'
        WHEN ci.capacity_percentage >= 90 THEN 'NEAR_CAPACITY'
        WHEN ci.capacity_percentage >= 50 THEN 'MODERATE_USAGE'
        ELSE 'LOW_USAGE'
    END AS capacity_status
FROM redemption_rules rr
JOIN projects p ON rr.project_id = p.id
LEFT JOIN product_details pd ON rr.id = pd.redemption_rule_id
LEFT JOIN capacity_info ci ON rr.id = ci.redemption_rule_id
ORDER BY rr.created_at DESC;