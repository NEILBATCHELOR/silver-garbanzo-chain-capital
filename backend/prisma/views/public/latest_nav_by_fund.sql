SELECT
  DISTINCT ON (fund_nav_data.fund_id) fund_nav_data.fund_id,
  fund_nav_data.date,
  fund_nav_data.nav,
  fund_nav_data.change_amount,
  fund_nav_data.change_percent,
  fund_nav_data.source,
  fund_nav_data.validated,
  fund_nav_data.created_at
FROM
  fund_nav_data
ORDER BY
  fund_nav_data.fund_id,
  fund_nav_data.date DESC;