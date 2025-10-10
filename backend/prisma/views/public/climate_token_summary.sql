SELECT
  t.id AS token_id,
  t.name,
  t.symbol,
  t.project_id,
  t.status,
  tcp.pool_id,
  ctp.name AS pool_name,
  t.total_supply,
  tcp.average_risk_score,
  tcp.discounted_value,
  tcp.discount_amount,
  tcp.average_discount_rate,
  ctp.risk_profile
FROM
  (
    (
      tokens t
      JOIN token_climate_properties tcp ON ((t.id = tcp.token_id))
    )
    JOIN climate_tokenization_pools ctp ON ((tcp.pool_id = ctp.pool_id))
  );