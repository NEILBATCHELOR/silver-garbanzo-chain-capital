SELECT
  rs.id,
  rs.redemption_request_id,
  rs.settlement_type,
  rs.status,
  rs.token_amount,
  rs.transfer_amount,
  rs.nav_used,
  rs.created_at,
  rs.actual_completion,
  COALESCE(rs.actual_completion, rs.estimated_completion) AS completion_time,
  CASE
    WHEN (rs.actual_completion IS NOT NULL) THEN EXTRACT(
      epoch
      FROM
        (rs.actual_completion - rs.created_at)
    )
    ELSE NULL :: numeric
  END AS processing_time_seconds
FROM
  redemption_settlements rs;