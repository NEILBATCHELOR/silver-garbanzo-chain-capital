SELECT
  s.project_id,
  s.product_id AS fund_product_id,
  fp.fund_name,
  fp.fund_type,
  s.investor_id,
  i.name AS investor_name,
  COALESCE(sum(s.shares_calculated), (0) :: numeric) AS total_shares,
  COALESCE(sum(s.fiat_amount), (0) :: numeric) AS total_invested,
  CASE
    WHEN (
      COALESCE(sum(s.shares_calculated), (0) :: numeric) > (0) :: numeric
    ) THEN (
      COALESCE(sum(s.fiat_amount), (0) :: numeric) / COALESCE(sum(s.shares_calculated), (1) :: numeric)
    )
    ELSE (0) :: numeric
  END AS average_nav,
  count(*) AS transaction_count,
  min(s.subscription_date) AS first_investment_date,
  max(s.subscription_date) AS last_transaction_date
FROM
  (
    (
      subscriptions s
      JOIN investors i ON ((i.investor_id = s.investor_id))
    )
    JOIN fund_products fp ON ((fp.id = s.product_id))
  )
WHERE
  (
    (s.product_id IS NOT NULL)
    AND (s.confirmed = TRUE)
  )
GROUP BY
  s.project_id,
  s.product_id,
  fp.fund_name,
  fp.fund_type,
  s.investor_id,
  i.name;