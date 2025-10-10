SELECT
  wal.wallet_id,
  pw.wallet_address,
  pw.wallet_type AS network,
  p.name AS project_name,
  count(*) AS access_count,
  count(*) FILTER (
    WHERE
      (wal.success = false)
  ) AS failed_count,
  max(wal.created_at) AS last_access,
  json_agg(
    json_build_object(
      'action',
      wal.action,
      'success',
      wal.success,
      'timestamp',
      wal.created_at,
      'user_id',
      wal.accessed_by
    )
    ORDER BY
      wal.created_at DESC
  ) FILTER (
    WHERE
      (wal.created_at >= (NOW() - '24:00:00' :: INTERVAL))
  ) AS recent_activity
FROM
  (
    (
      wallet_access_logs wal
      JOIN project_wallets pw ON ((wal.wallet_id = pw.id))
    )
    JOIN projects p ON ((pw.project_id = p.id))
  )
GROUP BY
  wal.wallet_id,
  pw.wallet_address,
  pw.wallet_type,
  p.name;