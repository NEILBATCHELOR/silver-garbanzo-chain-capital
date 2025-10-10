SELECT
  d.id AS distribution_id,
  d.investor_id,
  d.project_id,
  d.token_amount AS total_distributed,
  d.remaining_amount,
  d.redemption_percentage_used,
  d.fully_redeemed,
  rr.id AS rule_id,
  rr.is_redemption_open,
  rr.open_after_date,
  rr.allow_continuous_redemption,
  rr.max_redemption_percentage,
  rr.lock_up_period,
  rr.product_type,
  rr.product_id,
  NULL :: uuid AS active_window_id,
  NULL :: timestamp without time zone AS window_start,
  NULL :: timestamp without time zone AS window_end,
  NULL :: timestamp without time zone AS submission_start_date,
  NULL :: timestamp without time zone AS submission_end_date,
  NULL :: text AS window_status,
  CASE
    WHEN d.fully_redeemed THEN false
    WHEN (rr.is_redemption_open = false) THEN false
    WHEN (
      (rr.open_after_date IS NOT NULL)
      AND (rr.open_after_date > NOW())
    ) THEN false
    WHEN (rr.allow_continuous_redemption = TRUE) THEN TRUE
    ELSE false
  END AS is_eligible_now,
  CASE
    WHEN (rr.max_redemption_percentage IS NOT NULL) THEN LEAST(
      d.remaining_amount,
      (
        (d.token_amount * rr.max_redemption_percentage) / (100) :: numeric
      )
    )
    ELSE d.remaining_amount
  END AS max_redeemable_amount,
  CASE
    WHEN d.fully_redeemed THEN 'Distribution fully redeemed' :: text
    WHEN (rr.is_redemption_open = false) THEN 'Redemptions are closed' :: text
    WHEN (
      (rr.open_after_date IS NOT NULL)
      AND (rr.open_after_date > NOW())
    ) THEN (
      'Redemption period not yet open until ' :: text || (rr.open_after_date) :: text
    )
    WHEN (rr.allow_continuous_redemption = false) THEN 'Window-based redemption configured but no active window management' :: text
    ELSE 'Eligible' :: text
  END AS eligibility_reason
FROM
  (
    distributions d
    LEFT JOIN redemption_rules rr ON ((rr.project_id = d.project_id))
  )
WHERE
  (d.remaining_amount > (0) :: numeric);