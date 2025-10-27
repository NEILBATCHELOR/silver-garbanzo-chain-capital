SELECT
  ra.id AS address_id,
  ra.role_id,
  r.name AS role_name,
  ra.blockchain,
  ra.address,
  ra.signing_method,
  ra.contract_roles AS explicit_roles,
  CASE
    WHEN (jsonb_array_length(ra.contract_roles) > 0) THEN ra.contract_roles
    ELSE COALESCE(rc.contract_roles, '[]' :: jsonb)
  END AS effective_roles,
  CASE
    WHEN (jsonb_array_length(ra.contract_roles) > 0) THEN 'explicit' :: text
    ELSE 'inherited' :: text
  END AS role_assignment_type,
  ra.created_at,
  ra.updated_at
FROM
  (
    (
      role_addresses ra
      JOIN roles r ON ((r.id = ra.role_id))
    )
    LEFT JOIN role_contracts rc ON ((rc.role_id = ra.role_id))
  );