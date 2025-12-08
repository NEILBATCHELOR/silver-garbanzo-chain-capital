SELECT
  fp.id AS fund_product_id,
  fp.fund_ticker,
  fp.fund_name,
  fp.fund_type,
  nav.valuation_date,
  nav.nav_per_share,
  nav.closing_price,
  nav.premium_discount_amount,
  nav.premium_discount_pct,
  nav.premium_discount_status,
  nav.bid_ask_spread_bps,
  nav.volume,
  CASE
    WHEN (nav.premium_discount_pct > 1.0) THEN 'significant_premium' :: text
    WHEN (nav.premium_discount_pct > 0.25) THEN 'moderate_premium' :: text
    WHEN (nav.premium_discount_pct < '-1.0' :: numeric) THEN 'significant_discount' :: text
    WHEN (nav.premium_discount_pct < '-0.25' :: numeric) THEN 'moderate_discount' :: text
    ELSE 'fair_value' :: text
  END AS premium_discount_category
FROM
  (
    fund_products fp
    JOIN LATERAL (
      SELECT
        etf_nav_history.id,
        etf_nav_history.fund_product_id,
        etf_nav_history.valuation_date,
        etf_nav_history.nav_per_share,
        etf_nav_history.total_net_assets,
        etf_nav_history.shares_outstanding,
        etf_nav_history.opening_price,
        etf_nav_history.closing_price,
        etf_nav_history.high_price,
        etf_nav_history.low_price,
        etf_nav_history.market_price,
        etf_nav_history.premium_discount_amount,
        etf_nav_history.premium_discount_pct,
        etf_nav_history.premium_discount_status,
        etf_nav_history.volume,
        etf_nav_history.trade_count,
        etf_nav_history.bid_price,
        etf_nav_history.ask_price,
        etf_nav_history.bid_ask_spread_bps,
        etf_nav_history.daily_return_pct,
        etf_nav_history.nav_return_pct,
        etf_nav_history.price_return_pct,
        etf_nav_history.benchmark_return_pct,
        etf_nav_history.excess_return_pct,
        etf_nav_history.tracking_difference_bps,
        etf_nav_history.total_assets,
        etf_nav_history.total_liabilities,
        etf_nav_history.cash_position,
        etf_nav_history.securities_value,
        etf_nav_history.derivatives_value,
        etf_nav_history.crypto_value,
        etf_nav_history.accrued_income,
        etf_nav_history.accrued_expenses,
        etf_nav_history.staking_rewards_earned,
        etf_nav_history.staking_yield_annualized,
        etf_nav_history.on_chain_verification_hash,
        etf_nav_history.dividend_per_share,
        etf_nav_history.dividend_yield_pct,
        etf_nav_history.currency,
        etf_nav_history.calculation_method,
        etf_nav_history.data_quality,
        etf_nav_history.data_sources,
        etf_nav_history.config_overrides_used,
        etf_nav_history.created_at
      FROM
        etf_nav_history
      WHERE
        (etf_nav_history.fund_product_id = fp.id)
      ORDER BY
        etf_nav_history.valuation_date DESC
      LIMIT
        1
    ) nav ON (TRUE)
  )
WHERE
  (
    ((fp.fund_type) :: text ~~ 'etf_%' :: text)
    AND (nav.market_price IS NOT NULL)
  );