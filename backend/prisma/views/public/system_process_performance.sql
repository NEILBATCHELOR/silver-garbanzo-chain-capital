SELECT
  sp.process_name,
  count(*) AS total_executions,
  avg(
    EXTRACT(
      epoch
      FROM
        (sp.end_time - sp.start_time)
    )
  ) AS avg_duration_seconds,
  min(
    EXTRACT(
      epoch
      FROM
        (sp.end_time - sp.start_time)
    )
  ) AS min_duration_seconds,
  max(
    EXTRACT(
      epoch
      FROM
        (sp.end_time - sp.start_time)
    )
  ) AS max_duration_seconds,
  count(
    CASE
      WHEN (sp.status = 'completed' :: text) THEN 1
      ELSE NULL :: integer
    END
  ) AS successful_executions,
  count(
    CASE
      WHEN (sp.status = 'failed' :: text) THEN 1
      ELSE NULL :: integer
    END
  ) AS failed_executions,
  round(
    (
      (
        (
          count(
            CASE
              WHEN (sp.status = 'completed' :: text) THEN 1
              ELSE NULL :: integer
            END
          )
        ) :: numeric / (count(*)) :: numeric
      ) * (100) :: numeric
    ),
    2
  ) AS success_rate
FROM
  system_processes sp
WHERE
  (sp.end_time IS NOT NULL)
GROUP BY
  sp.process_name
ORDER BY
  (count(*)) DESC;