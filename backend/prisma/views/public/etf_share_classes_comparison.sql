SELECT
  parent.id AS parent_fund_id,
  parent.fund_ticker AS parent_ticker,
  parent.fund_name AS parent_name,
  fp.id AS share_class_id,
  fp.share_class_name,
  fp.fund_ticker AS share_class_ticker,
  fp.expense_ratio,
  fp.total_expense_ratio,
  fp.net_asset_value,
  fp.shares_outstanding,
  fp.assets_under_management,
  nav.nav_per_share AS latest_nav,
  nav.valuation_date AS latest_nav_date,
  fp.inception_date,
  fp.status
FROM
  (
    (
      fund_products parent
      JOIN fund_products fp ON ((parent.id = fp.parent_fund_id))
    )
    LEFT JOIN LATERAL (
      SELECT
        etf_nav_history.nav_per_share,
        etf_nav_history.valuation_date
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
    ((parent.fund_type) :: text ~~ 'etf_%' :: text)
    AND (fp.share_class_name IS NOT NULL)
  )
ORDER BY
  parent.fund_ticker,
  fp.share_class_name;