SELECT
  count(DISTINCT rr.project_id) AS projects_with_rules,
  count(*) AS total_rules,
  count(*) FILTER (
    WHERE
      (rr.is_redemption_open = TRUE)
  ) AS open_redemption_projects,
  count(*) FILTER (
    WHERE
      (rr.allow_continuous_redemption = TRUE)
  ) AS continuous_redemption_projects,
  0 AS active_windows,
  COALESCE(count(DISTINCT re.investor_id), (0) :: bigint) AS eligible_investors,
  COALESCE(sum(re.total_max_redeemable), (0) :: numeric) AS total_redeemable_amount
FROM
  (
    redemption_rules rr
    LEFT JOIN active_redemption_opportunities re ON ((re.project_id = rr.project_id))
  );