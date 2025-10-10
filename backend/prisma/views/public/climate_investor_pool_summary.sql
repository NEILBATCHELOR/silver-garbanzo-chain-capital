SELECT
  ipa.investor_id,
  ipa.pool_id,
  ctp.name AS pool_name,
  ipa.investment_amount,
  sum(cr.amount) AS total_receivables,
  avg(cr.risk_score) AS avg_risk_score
FROM
  (
    (
      (
        climate_investor_pools ipa
        JOIN climate_tokenization_pools ctp ON ((ipa.pool_id = ctp.pool_id))
      )
      JOIN climate_pool_receivables cpr ON ((ctp.pool_id = cpr.pool_id))
    )
    JOIN climate_receivables cr ON ((cpr.receivable_id = cr.receivable_id))
  )
GROUP BY
  ipa.investor_id,
  ipa.pool_id,
  ctp.name,
  ipa.investment_amount;