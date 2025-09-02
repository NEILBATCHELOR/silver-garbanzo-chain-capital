SELECT
  ac.id,
  ac.permission_id,
  ac.config_name,
  ac.config_description,
  ac.approval_mode,
  ac.required_approvals,
  ac.requires_all_approvers,
  ac.consensus_type,
  ac.eligible_roles,
  ac.auto_approval_conditions,
  ac.auto_approve_threshold,
  ac.escalation_config,
  ac.notification_config,
  ac.active,
  ac.created_at,
  ac.updated_at,
  ac.created_by,
  ac.last_modified_by,
  COALESCE(
    json_agg(
      CASE
        WHEN (aca.approver_type = 'user' :: text) THEN json_build_object(
          'type',
          'user',
          'id',
          aca.approver_user_id,
          'name',
          u.name,
          'email',
          u.email,
          'is_required',
          aca.is_required,
          'order_priority',
          aca.order_priority
        )
        WHEN (aca.approver_type = 'role' :: text) THEN json_build_object(
          'type',
          'role',
          'id',
          aca.approver_role_id,
          'name',
          r.name,
          'description',
          r.description,
          'is_required',
          aca.is_required,
          'order_priority',
          aca.order_priority
        )
        ELSE NULL :: json
      END
      ORDER BY
        aca.order_priority,
        aca.created_at
    ) FILTER (
      WHERE
        (aca.id IS NOT NULL)
    ),
    '[]' :: json
  ) AS configured_approvers,
  count(aca.id) AS approver_count
FROM
  (
    (
      (
        approval_configs ac
        LEFT JOIN approval_config_approvers aca ON ((ac.id = aca.approval_config_id))
      )
      LEFT JOIN users u ON ((aca.approver_user_id = u.id))
    )
    LEFT JOIN roles r ON ((aca.approver_role_id = r.id))
  )
GROUP BY
  ac.id,
  ac.permission_id,
  ac.config_name,
  ac.config_description,
  ac.approval_mode,
  ac.required_approvals,
  ac.requires_all_approvers,
  ac.consensus_type,
  ac.eligible_roles,
  ac.auto_approval_conditions,
  ac.auto_approve_threshold,
  ac.escalation_config,
  ac.notification_config,
  ac.active,
  ac.created_at,
  ac.updated_at,
  ac.created_by,
  ac.last_modified_by;