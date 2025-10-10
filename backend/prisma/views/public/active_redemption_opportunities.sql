SELECT
  re.project_id,
  re.investor_id,
  re.product_type,
  re.product_id,
  count(re.distribution_id) AS eligible_distributions,
  sum(re.total_distributed) AS total_distributed_amount,
  sum(re.remaining_amount) AS total_remaining_amount,
  sum(re.max_redeemable_amount) AS total_max_redeemable,
  array_agg(re.distribution_id) AS distribution_ids,
  min(re.window_start) AS earliest_window_start,
  max(re.window_end) AS latest_window_end,
  bool_and(re.is_eligible_now) AS all_eligible,
  string_agg(DISTINCT re.eligibility_reason, '; ' :: text) AS combined_reasons
FROM
  redemption_eligibility re
WHERE
  (re.is_eligible_now = TRUE)
GROUP BY
  re.project_id,
  re.investor_id,
  re.product_type,
  re.product_id;