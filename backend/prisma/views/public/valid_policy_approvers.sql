SELECT
  a.id,
  a.policy_rule_id,
  a.user_id,
  a.created_by,
  a.created_at,
  a.status,
  a.comment,
  a."timestamp"
FROM
  (
    policy_rule_approvers a
    JOIN rules r ON ((a.policy_rule_id = r.rule_id))
  );