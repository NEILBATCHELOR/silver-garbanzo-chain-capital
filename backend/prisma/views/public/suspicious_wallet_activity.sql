SELECT
  wal.wallet_id,
  pw.wallet_address,
  wal.accessed_by,
  u.email AS user_email,
  count(*) AS failed_attempts,
  min(wal.created_at) AS first_failure,
  max(wal.created_at) AS last_failure,
  array_agg(DISTINCT wal.ip_address) AS ip_addresses
FROM
  (
    (
      wallet_access_logs wal
      JOIN project_wallets pw ON ((wal.wallet_id = pw.id))
    )
    LEFT JOIN users u ON ((wal.accessed_by = u.id))
  )
WHERE
  (
    (wal.success = false)
    AND (wal.created_at >= (NOW() - '01:00:00' :: INTERVAL))
  )
GROUP BY
  wal.wallet_id,
  pw.wallet_address,
  wal.accessed_by,
  u.email
HAVING
  (count(*) >= 3);