SELECT
  u.id AS user_id,
  u.name AS user_name,
  u.email,
  r.name AS role_name,
  p.name AS permission_name,
  p.description AS permission_description
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
  );