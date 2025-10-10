SELECT
  DISTINCT ON (nav_fx_rates.base_ccy, nav_fx_rates.quote_ccy) nav_fx_rates.base_ccy,
  nav_fx_rates.quote_ccy,
  nav_fx_rates.rate,
  nav_fx_rates.as_of,
  nav_fx_rates.source
FROM
  nav_fx_rates
ORDER BY
  nav_fx_rates.base_ccy,
  nav_fx_rates.quote_ccy,
  nav_fx_rates.as_of DESC;