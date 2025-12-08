SELECT
  fp.id,
  fp.project_id,
  fp.fund_ticker,
  fp.fund_name,
  fp.fund_type,
  fp.parent_fund_id,
  fp.share_class_name,
  fp.net_asset_value,
  fp.assets_under_management,
  fp.shares_outstanding,
  fp.expense_ratio,
  fp.total_expense_ratio,
  fp.benchmark_index,
  fp.tracking_error,
  fp.market_price,
  fp.premium_discount_pct,
  fp.currency,
  fp.inception_date,
  fp.status,
  fp.registration_status,
  fp.replication_method,
  fp.structure_type,
  fp.exchange,
  fp.isin,
  em.is_crypto_etf,
  em.supported_blockchains,
  em.staking_enabled,
  em.investment_objective,
  nav.valuation_date AS latest_nav_date,
  nav.nav_per_share AS latest_nav_per_share,
  nav.closing_price AS latest_closing_price,
  nav.premium_discount_pct AS latest_premium_discount,
  nav.daily_return_pct,
  nav.tracking_difference_bps,
  nav.staking_rewards_earned,
  parent.fund_ticker AS parent_ticker,
  parent.fund_name AS parent_name
FROM
  (
    (
      (
        fund_products fp
        LEFT JOIN etf_metadata em ON ((fp.id = em.fund_product_id))
      )
      LEFT JOIN LATERAL (
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
    LEFT JOIN fund_products parent ON ((fp.parent_fund_id = parent.id))
  )
WHERE
  ((fp.fund_type) :: text ~~ 'etf_%' :: text);