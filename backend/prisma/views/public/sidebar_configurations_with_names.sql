SELECT
  sc.id,
  sc.name,
  sc.description,
  sc.target_role_ids,
  sc.target_profile_type_enums,
  ARRAY(
    SELECT
      r.name
    FROM
      roles r
    WHERE
      (r.id = ANY (sc.target_role_ids))
    ORDER BY
      r.priority DESC
  ) AS computed_role_names,
  sc.target_profile_type_enums AS computed_profile_types,
  sc.min_role_priority,
  sc.organization_id,
  sc.configuration_data,
  sc.is_active,
  sc.is_default,
  sc.created_by,
  sc.updated_by,
  sc.created_at,
  sc.updated_at
FROM
  sidebar_configurations sc;