SELECT
  CASE
    WHEN (
      projects.project_type = ANY (
        ARRAY ['structured_products'::text, 'equity'::text, 'commodities'::text, 'funds_etfs_etps'::text, 'bonds'::text, 'quantitative_investment_strategies'::text]
      )
    ) THEN 'Traditional Assets' :: text
    WHEN (
      projects.project_type = ANY (
        ARRAY ['private_equity'::text, 'private_debt'::text, 'real_estate'::text, 'energy'::text, 'infrastructure'::text, 'collectibles'::text, 'receivables'::text, 'solar_wind_climate'::text]
      )
    ) THEN 'Alternative Assets' :: text
    WHEN (
      projects.project_type = ANY (
        ARRAY ['digital_tokenised_fund'::text, 'fiat_backed_stablecoin'::text, 'crypto_backed_stablecoin'::text, 'commodity_backed_stablecoin'::text, 'algorithmic_stablecoin'::text, 'rebasing_stablecoin'::text]
      )
    ) THEN 'Digital Assets' :: text
    ELSE 'Other' :: text
  END AS category,
  projects.project_type,
  count(*) AS project_count,
  count(*) FILTER (
    WHERE
      (projects.status = 'active' :: text)
  ) AS active_count,
  avg(projects.target_raise) AS avg_target_raise,
  sum(projects.target_raise) AS total_target_raise
FROM
  projects
GROUP BY
  CASE
    WHEN (
      projects.project_type = ANY (
        ARRAY ['structured_products'::text, 'equity'::text, 'commodities'::text, 'funds_etfs_etps'::text, 'bonds'::text, 'quantitative_investment_strategies'::text]
      )
    ) THEN 'Traditional Assets' :: text
    WHEN (
      projects.project_type = ANY (
        ARRAY ['private_equity'::text, 'private_debt'::text, 'real_estate'::text, 'energy'::text, 'infrastructure'::text, 'collectibles'::text, 'receivables'::text, 'solar_wind_climate'::text]
      )
    ) THEN 'Alternative Assets' :: text
    WHEN (
      projects.project_type = ANY (
        ARRAY ['digital_tokenised_fund'::text, 'fiat_backed_stablecoin'::text, 'crypto_backed_stablecoin'::text, 'commodity_backed_stablecoin'::text, 'algorithmic_stablecoin'::text, 'rebasing_stablecoin'::text]
      )
    ) THEN 'Digital Assets' :: text
    ELSE 'Other' :: text
  END,
  projects.project_type
ORDER BY
  CASE
    WHEN (
      projects.project_type = ANY (
        ARRAY ['structured_products'::text, 'equity'::text, 'commodities'::text, 'funds_etfs_etps'::text, 'bonds'::text, 'quantitative_investment_strategies'::text]
      )
    ) THEN 'Traditional Assets' :: text
    WHEN (
      projects.project_type = ANY (
        ARRAY ['private_equity'::text, 'private_debt'::text, 'real_estate'::text, 'energy'::text, 'infrastructure'::text, 'collectibles'::text, 'receivables'::text, 'solar_wind_climate'::text]
      )
    ) THEN 'Alternative Assets' :: text
    WHEN (
      projects.project_type = ANY (
        ARRAY ['digital_tokenised_fund'::text, 'fiat_backed_stablecoin'::text, 'crypto_backed_stablecoin'::text, 'commodity_backed_stablecoin'::text, 'algorithmic_stablecoin'::text, 'rebasing_stablecoin'::text]
      )
    ) THEN 'Digital Assets' :: text
    ELSE 'Other' :: text
  END,
  (count(*)) DESC;