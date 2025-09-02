SELECT
  raa.redemption_request_id,
  raa.approval_config_id,
  ac.config_name,
  ac.required_approvals,
  ac.consensus_type,
  count(raa.id) AS total_assigned_approvers,
  count(
    CASE
      WHEN (raa.status = 'approved' :: text) THEN 1
      ELSE NULL :: integer
    END
  ) AS approved_count,
  count(
    CASE
      WHEN (raa.status = 'rejected' :: text) THEN 1
      ELSE NULL :: integer
    END
  ) AS rejected_count,
  count(
    CASE
      WHEN (raa.status = 'pending' :: text) THEN 1
      ELSE NULL :: integer
    END
  ) AS pending_count,
  CASE
    WHEN (
      count(
        CASE
          WHEN (raa.status = 'rejected' :: text) THEN 1
          ELSE NULL :: integer
        END
      ) > 0
    ) THEN 'rejected' :: text
    WHEN (
      (ac.consensus_type = 'all' :: text)
      AND (
        count(
          CASE
            WHEN (raa.status = 'approved' :: text) THEN 1
            ELSE NULL :: integer
          END
        ) = count(raa.id)
      )
    ) THEN 'approved' :: text
    WHEN (
      (ac.consensus_type = 'majority' :: text)
      AND (
        count(
          CASE
            WHEN (raa.status = 'approved' :: text) THEN 1
            ELSE NULL :: integer
          END
        ) > (count(raa.id) / 2)
      )
    ) THEN 'approved' :: text
    WHEN (
      (ac.consensus_type = 'any' :: text)
      AND (
        count(
          CASE
            WHEN (raa.status = 'approved' :: text) THEN 1
            ELSE NULL :: integer
          END
        ) > 0
      )
    ) THEN 'approved' :: text
    WHEN (
      count(
        CASE
          WHEN (raa.status = 'approved' :: text) THEN 1
          ELSE NULL :: integer
        END
      ) >= ac.required_approvals
    ) THEN 'approved' :: text
    ELSE 'pending' :: text
  END AS overall_status,
  json_agg(
    json_build_object(
      'user_id',
      raa.approver_user_id,
      'user_name',
      u.name,
      'user_email',
      u.email,
      'status',
      raa.status,
      'approval_timestamp',
      raa.approval_timestamp,
      'comments',
      raa.comments,
      'assigned_at',
      raa.assigned_at
    )
    ORDER BY
      raa.assigned_at
  ) AS approver_details
FROM
  (
    (
      redemption_approver_assignments raa
      JOIN approval_configs ac ON ((raa.approval_config_id = ac.id))
    )
    JOIN users u ON ((raa.approver_user_id = u.id))
  )
GROUP BY
  raa.redemption_request_id,
  raa.approval_config_id,
  ac.config_name,
  ac.required_approvals,
  ac.consensus_type;