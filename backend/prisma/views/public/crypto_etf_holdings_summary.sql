SELECT
  fp.id AS fund_product_id,
  fp.fund_ticker,
  fp.fund_name,
  h.blockchain,
  count(DISTINCT h.id) AS num_holdings,
  sum(h.market_value) AS total_value,
  (
    (
      sum(h.market_value) / NULLIF(fp.assets_under_management, (0) :: numeric)
    ) * (100) :: numeric
  ) AS percentage_of_aum,
  count(*) FILTER (
    WHERE
      h.is_staked
  ) AS num_staked_holdings,
  sum(h.staking_rewards_accrued) AS total_staking_rewards,
  avg(h.staking_apr) FILTER (
    WHERE
      h.is_staked
  ) AS avg_staking_apr,
  h.as_of_date
FROM
  (
    (
      fund_products fp
      JOIN etf_metadata em ON ((fp.id = em.fund_product_id))
    )
    JOIN etf_holdings h ON ((fp.id = h.fund_product_id))
  )
WHERE
  (
    (em.is_crypto_etf = TRUE)
    AND ((h.security_type) :: text = 'crypto' :: text)
    AND ((h.status) :: text = 'active' :: text)
  )
GROUP BY
  fp.id,
  fp.fund_ticker,
  fp.fund_name,
  h.blockchain,
  h.as_of_date
ORDER BY
  fp.fund_ticker,
  h.blockchain;