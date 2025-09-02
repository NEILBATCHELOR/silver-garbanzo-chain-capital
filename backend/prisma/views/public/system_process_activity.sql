SELECT
  sp.id AS process_id,
  sp.process_name,
  sp.status AS process_status,
  sp.start_time,
  sp.end_time,
  EXTRACT(
    epoch
    FROM
      (sp.end_time - sp.start_time)
  ) AS duration_seconds,
  count(al.id) AS activity_count,
  count(
    CASE
      WHEN (
        (al.status = 'failure' :: text)
        OR (al.status = 'failed' :: text)
      ) THEN 1
      ELSE NULL :: integer
    END
  ) AS failed_activities
FROM
  (
    system_processes sp
    LEFT JOIN audit_logs al ON ((sp.id = al.system_process_id))
  )
GROUP BY
  sp.id,
  sp.process_name,
  sp.status,
  sp.start_time,
  sp.end_time;