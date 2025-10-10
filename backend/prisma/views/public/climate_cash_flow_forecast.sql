SELECT
  climate_cash_flow_projections.projection_date,
  sum(climate_cash_flow_projections.projected_amount) AS total_projected,
  climate_cash_flow_projections.source_type
FROM
  climate_cash_flow_projections
GROUP BY
  climate_cash_flow_projections.projection_date,
  climate_cash_flow_projections.source_type
ORDER BY
  climate_cash_flow_projections.projection_date;