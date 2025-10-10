SELECT
  nav.id,
  nav.asset_id,
  nav.project_id,
  nav.date,
  nav.nav,
  nav.total_assets,
  nav.asset_name,
  nav.total_liabilities,
  nav.outstanding_shares,
  nav.previous_nav,
  nav.change_amount,
  nav.change_percent,
  nav.source,
  nav.validated,
  nav.validated_by,
  nav.validated_at,
  nav.notes,
  nav.calculation_method,
  nav.market_conditions,
  nav.created_at,
  nav.updated_at,
  nav.created_by,
  nav.calculated_nav,
  runs.id AS run_id,
  runs.status AS run_status,
  runs.started_at AS run_started_at,
  runs.completed_at AS run_completed_at,
  runs.product_type,
  approvals.status AS approval_status,
  approvals.approved_by,
  approvals.approved_at,
  approvals.comments AS approval_comments,
  CASE
    WHEN (validation_summary.total_validations = 0) THEN 'no_validations' :: text
    WHEN (validation_summary.failed_validations = 0) THEN 'all_passed' :: text
    WHEN (validation_summary.error_validations > 0) THEN 'errors_present' :: text
    ELSE 'warnings_present' :: text
  END AS validation_status,
  validation_summary.total_validations,
  validation_summary.failed_validations,
  validation_summary.error_validations
FROM
  (
    (
      (
        asset_nav_data nav
        LEFT JOIN nav_calculation_runs runs ON (
          (
            (runs.asset_id = nav.asset_id)
            AND (runs.valuation_date = nav.date)
          )
        )
      )
      LEFT JOIN nav_approvals approvals ON ((approvals.run_id = runs.id))
    )
    LEFT JOIN (
      SELECT
        nav_validation_results.run_id,
        count(*) AS total_validations,
        count(*) FILTER (
          WHERE
            (NOT nav_validation_results.passed)
        ) AS failed_validations,
        count(*) FILTER (
          WHERE
            (
              (NOT nav_validation_results.passed)
              AND (nav_validation_results.severity = 'error' :: text)
            )
        ) AS error_validations
      FROM
        nav_validation_results
      GROUP BY
        nav_validation_results.run_id
    ) validation_summary ON ((validation_summary.run_id = runs.id))
  );