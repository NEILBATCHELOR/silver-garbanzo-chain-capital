SELECT
  count(*) AS total_rules,
  count(*) FILTER (
    WHERE
      (onboarding_restrictions.active = TRUE)
  ) AS active_rules,
  count(*) FILTER (
    WHERE
      (
        (onboarding_restrictions.type = 'COUNTRY' :: text)
        AND (onboarding_restrictions.active = TRUE)
      )
  ) AS blocked_countries,
  count(*) FILTER (
    WHERE
      (
        (
          onboarding_restrictions.type = 'INVESTOR_TYPE' :: text
        )
        AND (onboarding_restrictions.active = TRUE)
      )
  ) AS blocked_investor_types
FROM
  onboarding_restrictions;