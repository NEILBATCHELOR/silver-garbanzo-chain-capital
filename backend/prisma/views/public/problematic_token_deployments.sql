SELECT
  t.id,
  t.name,
  t.symbol,
  t.address AS contract_address,
  t.blockchain,
  t.deployment_status,
  t.deployment_error,
  td.status AS deployment_table_status,
  (
    td.deployment_data ->> 'initialization_error' :: text
  ) AS initialization_error,
  CASE
    WHEN (
      (t.deployment_status) :: text = 'FAILED_INITIALIZATION' :: text
    ) THEN 'Needs initialize() call' :: text
    WHEN (td.status = 'FAILED_INITIALIZATION' :: text) THEN 'Needs initialize() call' :: text
    ELSE 'Unknown issue' :: text
  END AS recommended_action
FROM
  (
    tokens t
    LEFT JOIN token_deployments td ON ((td.token_id = t.id))
  )
WHERE
  (
    (
      (t.deployment_status) :: text = ANY (
        (
          ARRAY ['FAILED_INITIALIZATION'::character varying, 'failed'::character varying]
        ) :: text []
      )
    )
    OR (td.status = 'FAILED_INITIALIZATION' :: text)
  );