WITH product_details AS (
  SELECT
    rr_1.id AS redemption_rule_id,
    'asset_backed_products' :: text AS product_table,
    to_jsonb(abp.*) AS product_details,
    abp.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN asset_backed_products abp ON ((rr_1.product_id = abp.id))
    )
  WHERE
    (rr_1.product_type = 'receivables' :: text)
  UNION
  ALL
  SELECT
    rr_1.id AS redemption_rule_id,
    'bond_products' :: text AS product_table,
    to_jsonb(bp.*) AS product_details,
    bp.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN bond_products bp ON ((rr_1.product_id = bp.id))
    )
  WHERE
    (rr_1.product_type = 'bonds' :: text)
  UNION
  ALL
  SELECT
    rr_1.id AS redemption_rule_id,
    'collectibles_products' :: text AS product_table,
    to_jsonb(cp.*) AS product_details,
    cp.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN collectibles_products cp ON ((rr_1.product_id = cp.id))
    )
  WHERE
    (rr_1.product_type = 'collectibles' :: text)
  UNION
  ALL
  SELECT
    rr_1.id AS redemption_rule_id,
    'commodities_products' :: text AS product_table,
    to_jsonb(cop.*) AS product_details,
    cop.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN commodities_products cop ON ((rr_1.product_id = cop.id))
    )
  WHERE
    (rr_1.product_type = 'commodities' :: text)
  UNION
  ALL
  SELECT
    rr_1.id AS redemption_rule_id,
    'digital_tokenized_fund_products' :: text AS product_table,
    to_jsonb(dtfp.*) AS product_details,
    dtfp.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN digital_tokenized_fund_products dtfp ON ((rr_1.product_id = dtfp.id))
    )
  WHERE
    (
      rr_1.product_type = 'digital_tokenised_fund' :: text
    )
  UNION
  ALL
  SELECT
    rr_1.id AS redemption_rule_id,
    'energy_products' :: text AS product_table,
    to_jsonb(ep.*) AS product_details,
    ep.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN energy_products ep ON ((rr_1.product_id = ep.id))
    )
  WHERE
    (
      rr_1.product_type = ANY (
        ARRAY ['energy'::text, 'solar_wind_climate'::text]
      )
    )
  UNION
  ALL
  SELECT
    rr_1.id AS redemption_rule_id,
    'equity_products' :: text AS product_table,
    to_jsonb(eqp.*) AS product_details,
    eqp.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN equity_products eqp ON ((rr_1.product_id = eqp.id))
    )
  WHERE
    (rr_1.product_type = 'equity' :: text)
  UNION
  ALL
  SELECT
    rr_1.id AS redemption_rule_id,
    'fund_products' :: text AS product_table,
    to_jsonb(fp.*) AS product_details,
    fp.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN fund_products fp ON ((rr_1.product_id = fp.id))
    )
  WHERE
    (rr_1.product_type = 'funds_etfs_etps' :: text)
  UNION
  ALL
  SELECT
    rr_1.id AS redemption_rule_id,
    'infrastructure_products' :: text AS product_table,
    to_jsonb(ip.*) AS product_details,
    ip.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN infrastructure_products ip ON ((rr_1.product_id = ip.id))
    )
  WHERE
    (rr_1.product_type = 'infrastructure' :: text)
  UNION
  ALL
  SELECT
    rr_1.id AS redemption_rule_id,
    'private_debt_products' :: text AS product_table,
    to_jsonb(pdp.*) AS product_details,
    pdp.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN private_debt_products pdp ON ((rr_1.product_id = pdp.id))
    )
  WHERE
    (rr_1.product_type = 'private_debt' :: text)
  UNION
  ALL
  SELECT
    rr_1.id AS redemption_rule_id,
    'private_equity_products' :: text AS product_table,
    to_jsonb(pep.*) AS product_details,
    pep.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN private_equity_products pep ON ((rr_1.product_id = pep.id))
    )
  WHERE
    (rr_1.product_type = 'private_equity' :: text)
  UNION
  ALL
  SELECT
    rr_1.id AS redemption_rule_id,
    'quantitative_investment_strategies_products' :: text AS product_table,
    to_jsonb(qisp.*) AS product_details,
    qisp.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN quantitative_investment_strategies_products qisp ON ((rr_1.product_id = qisp.id))
    )
  WHERE
    (
      rr_1.product_type = 'quantitative_investment_strategies' :: text
    )
  UNION
  ALL
  SELECT
    rr_1.id AS redemption_rule_id,
    'real_estate_products' :: text AS product_table,
    to_jsonb(rep.*) AS product_details,
    rep.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN real_estate_products rep ON ((rr_1.product_id = rep.id))
    )
  WHERE
    (rr_1.product_type = 'real_estate' :: text)
  UNION
  ALL
  SELECT
    rr_1.id AS redemption_rule_id,
    'stablecoin_products' :: text AS product_table,
    to_jsonb(sp.*) AS product_details,
    sp.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN stablecoin_products sp ON ((rr_1.product_id = sp.id))
    )
  WHERE
    (
      rr_1.product_type = ANY (
        ARRAY ['fiat_backed_stablecoin'::text, 'crypto_backed_stablecoin'::text, 'commodity_backed_stablecoin'::text, 'algorithmic_stablecoin'::text, 'rebasing_stablecoin'::text]
      )
    )
  UNION
  ALL
  SELECT
    rr_1.id AS redemption_rule_id,
    'structured_products' :: text AS product_table,
    to_jsonb(stp.*) AS product_details,
    stp.target_raise AS product_target_raise
  FROM
    (
      redemption_rules rr_1
      JOIN structured_products stp ON ((rr_1.product_id = stp.id))
    )
  WHERE
    (rr_1.product_type = 'structured_products' :: text)
),
capacity_info AS (
  SELECT
    rr_1.id AS redemption_rule_id,
    rc.target_raise_amount,
    rc.total_redeemed_amount,
    rc.available_capacity,
    rc.capacity_percentage
  FROM
    (
      redemption_rules rr_1
      CROSS JOIN LATERAL get_redemption_capacity(rr_1.id) rc(
        target_raise_amount,
        total_redeemed_amount,
        available_capacity,
        capacity_percentage
      )
    )
)
SELECT
  rr.id,
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
    WHEN (pd.product_table = 'bond_products' :: text) THEN (pd.product_details ->> 'issuer_name' :: text)
    WHEN (pd.product_table = 'equity_products' :: text) THEN (pd.product_details ->> 'company_name' :: text)
    WHEN (pd.product_table = 'fund_products' :: text) THEN (pd.product_details ->> 'fund_name' :: text)
    WHEN (pd.product_table = 'stablecoin_products' :: text) THEN (pd.product_details ->> 'asset_name' :: text)
    WHEN (pd.product_table = 'real_estate_products' :: text) THEN (pd.product_details ->> 'property_name' :: text)
    WHEN (pd.product_table = 'energy_products' :: text) THEN (pd.product_details ->> 'project_name' :: text)
    WHEN (pd.product_table = 'commodities_products' :: text) THEN (pd.product_details ->> 'commodity_name' :: text)
    WHEN (
      pd.product_table = 'private_equity_products' :: text
    ) THEN (pd.product_details ->> 'fund_name' :: text)
    ELSE (pd.product_details ->> 'name' :: text)
  END AS product_name,
  COALESCE(
    (pd.product_details ->> 'status' :: text),
    (pd.product_details ->> 'product_status' :: text)
  ) AS product_status,
  COALESCE(
    (pd.product_details ->> 'currency' :: text),
    (pd.product_details ->> 'base_currency' :: text)
  ) AS product_currency,
  COALESCE(pd.product_target_raise, rr.target_raise_amount) AS effective_target_raise,
  ci.total_redeemed_amount,
  ci.available_capacity,
  ci.capacity_percentage,
  CASE
    WHEN (rr.target_raise_amount IS NULL) THEN 'NO_LIMIT' :: text
    WHEN (ci.capacity_percentage >= (100) :: numeric) THEN 'FULLY_REDEEMED' :: text
    WHEN (ci.capacity_percentage >= (90) :: numeric) THEN 'NEAR_CAPACITY' :: text
    WHEN (ci.capacity_percentage >= (50) :: numeric) THEN 'MODERATE_USAGE' :: text
    ELSE 'LOW_USAGE' :: text
  END AS capacity_status
FROM
  (
    (
      (
        redemption_rules rr
        JOIN projects p ON ((rr.project_id = p.id))
      )
      LEFT JOIN product_details pd ON ((rr.id = pd.redemption_rule_id))
    )
    LEFT JOIN capacity_info ci ON ((rr.id = ci.redemption_rule_id))
  )
ORDER BY
  rr.created_at DESC;