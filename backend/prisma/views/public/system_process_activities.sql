SELECT
  sp.id AS process_id,
  sp.process_name,
  sp.start_time,
  sp.end_time,
  sp.status,
  sp.progress,
  sp.priority,
  al.id AS activity_id,
  al.action,
  al.entity_type,
  al.entity_id,
  al.status AS activity_status,
  al."timestamp" AS activity_time,
  al.metadata AS activity_metadata
FROM
  (
    system_processes sp
    LEFT JOIN audit_logs al ON ((sp.id = al.system_process_id))
  )
ORDER BY
  sp.start_time DESC,
  al."timestamp";