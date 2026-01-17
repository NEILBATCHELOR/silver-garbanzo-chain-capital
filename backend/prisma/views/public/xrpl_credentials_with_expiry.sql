SELECT
  xrpl_credentials.id,
  xrpl_credentials.credential_id,
  xrpl_credentials.project_id,
  xrpl_credentials.issuer_address,
  xrpl_credentials.subject_address,
  xrpl_credentials.credential_type,
  xrpl_credentials.data_json,
  xrpl_credentials.data_hash,
  xrpl_credentials.status,
  xrpl_credentials.is_accepted,
  xrpl_credentials.expiration,
  xrpl_credentials.issue_transaction_hash,
  xrpl_credentials.accept_transaction_hash,
  xrpl_credentials.delete_transaction_hash,
  xrpl_credentials.issued_at,
  xrpl_credentials.accepted_at,
  xrpl_credentials.deleted_at,
  xrpl_credentials.created_at,
  xrpl_credentials.updated_at,
  xrpl_credentials.metadata,
  CASE
    WHEN (
      (xrpl_credentials.expiration IS NOT NULL)
      AND (xrpl_credentials.expiration < NOW())
    ) THEN TRUE
    ELSE false
  END AS is_expired
FROM
  xrpl_credentials;