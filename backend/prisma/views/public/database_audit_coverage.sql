WITH all_tables AS (
  SELECT
    TABLES.table_name
  FROM
    information_schema.tables
  WHERE
    (
      ((TABLES.table_schema) :: name = 'public' :: name)
      AND ((TABLES.table_type) :: text = 'BASE TABLE' :: text)
    )
),
audited_tables AS (
  SELECT
    DISTINCT audit_logs.entity_type AS table_name
  FROM
    audit_logs
  WHERE
    (
      (
        audit_logs."timestamp" >= (NOW() - '7 days' :: INTERVAL)
      )
      AND (audit_logs.entity_type IS NOT NULL)
    )
)
SELECT
  at.table_name,
  CASE
    WHEN (aud.table_name IS NOT NULL) THEN TRUE
    ELSE false
  END AS has_recent_audit,
  COALESCE(al.event_count, (0) :: bigint) AS recent_event_count,
  COALESCE(al.last_event, NULL :: timestamp WITH time zone) AS last_audit_event
FROM
  (
    (
      all_tables at
      LEFT JOIN audited_tables aud ON (((at.table_name) :: name = aud.table_name))
    )
    LEFT JOIN (
      SELECT
        audit_logs.entity_type,
        count(*) AS event_count,
        max(audit_logs."timestamp") AS last_event
      FROM
        audit_logs
      WHERE
        (
          audit_logs."timestamp" >= (NOW() - '7 days' :: INTERVAL)
        )
      GROUP BY
        audit_logs.entity_type
    ) al ON (((at.table_name) :: name = al.entity_type))
  )
ORDER BY
  COALESCE(al.event_count, (0) :: bigint) DESC,
  at.table_name;