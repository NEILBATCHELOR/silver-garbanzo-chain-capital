WITH project_stats AS (
  SELECT
    p.project_type,
    CASE
      WHEN (
        p.project_type = ANY (
          ARRAY ['structured_product'::text, 'equity'::text, 'bond'::text, 'fund'::text, 'etf'::text, 'etp'::text, 'commodities'::text, 'quantitative_investment_strategies'::text]
        )
      ) THEN 'Traditional Assets' :: text
      WHEN (
        p.project_type = ANY (
          ARRAY ['private_equity'::text, 'private_debt'::text, 'real_estate'::text, 'energy'::text, 'solar'::text, 'wind'::text, 'infrastructure'::text, 'collectibles'::text, 'receivables'::text]
        )
      ) THEN 'Alternative Assets' :: text
      WHEN (
        p.project_type = ANY (
          ARRAY ['digital_tokenised_fund'::text, 'fiat_backed_stablecoin'::text, 'crypto_backed_stablecoin'::text, 'commodity_backed_stablecoin'::text, 'algorithmic_stablecoin'::text, 'rebasing_stablecoin'::text, 'stablecoin'::text]
        )
      ) THEN 'Digital Assets' :: text
      ELSE 'Other' :: text
    END AS category,
    p.status,
    p.target_raise
  FROM
    projects p
  WHERE
    (p.project_type IS NOT NULL)
)
SELECT
  project_stats.category,
  project_stats.project_type,
  count(*) AS project_count,
  count(*) FILTER (
    WHERE
      ((project_stats.status) :: text = 'active' :: text)
  ) AS active_count,
  avg(project_stats.target_raise) AS avg_target_raise,
  sum(project_stats.target_raise) AS total_target_raise
FROM
  project_stats
GROUP BY
  project_stats.category,
  project_stats.project_type
ORDER BY
  project_stats.category,
  (count(*)) DESC;