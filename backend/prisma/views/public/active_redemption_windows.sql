SELECT
  rw.id,
  rw.config_id,
  rw.start_date,
  rw.end_date,
  rw.submission_start_date,
  rw.submission_end_date,
  rw.nav,
  rw.nav_date,
  rw.nav_source,
  rw.status,
  rw.max_redemption_amount,
  rw.current_requests,
  rw.total_request_value,
  rw.approved_requests,
  rw.approved_value,
  rw.rejected_requests,
  rw.rejected_value,
  rw.queued_requests,
  rw.queued_value,
  rw.processed_by,
  rw.processed_at,
  rw.notes,
  rw.created_at,
  rw.updated_at,
  rw.created_by,
  rwc.name AS config_name,
  rwc.frequency,
  rwc.enable_pro_rata_distribution
FROM
  (
    redemption_windows rw
    JOIN redemption_window_configs rwc ON ((rw.config_id = rwc.id))
  )
WHERE
  (
    rw.status = ANY (
      ARRAY ['upcoming'::text, 'submission_open'::text, 'submission_closed'::text, 'processing'::text]
    )
  )
ORDER BY
  rw.start_date;