SELECT
  u.id AS user_id,
  u.name AS user_name,
  u.email,
  r.name AS role_name,
  p.name AS permission_name,
  p.description AS permission_description,
  NULL :: uuid AS organization_id,
  'global' :: text AS scope
FROM
  (
    (
      (
        (
          users u
          JOIN user_roles ur ON ((u.id = ur.user_id))
        )
        JOIN roles r ON ((ur.role_id = r.id))
      )
      JOIN role_permissions rp ON ((r.id = rp.role_id))
    )
    JOIN permissions p ON ((rp.permission_name = p.name))
  )
UNION
ALL
SELECT
  u.id AS user_id,
  u.name AS user_name,
  u.email,
  r.name AS role_name,
  p.name AS permission_name,
  p.description AS permission_description,
  uor.organization_id,
  CASE
    WHEN (uor.organization_id IS NULL) THEN 'all_organizations' :: text
    ELSE 'organization_specific' :: text
  END AS scope
FROM
  (
    (
      (
        (
          users u
          JOIN user_organization_roles uor ON ((u.id = uor.user_id))
        )
        JOIN roles r ON ((uor.role_id = r.id))
      )
      JOIN role_permissions rp ON ((r.id = rp.role_id))
    )
    JOIN permissions p ON ((rp.permission_name = p.name))
  );