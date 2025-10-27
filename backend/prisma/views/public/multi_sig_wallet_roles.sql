SELECT
  msw.id AS wallet_id,
  msw.name AS wallet_name,
  msw.address AS wallet_address,
  msw.blockchain,
  msw.threshold,
  msw.ownership_type,
  r.id AS role_id,
  r.name AS role_name,
  r.description AS role_description,
  r.priority AS role_priority,
  ra.address AS role_address,
  ra.signing_method,
  mwo.added_at,
  mwo.added_by
FROM
  (
    (
      (
        multi_sig_wallets msw
        JOIN multi_sig_wallet_owners mwo ON ((mwo.wallet_id = msw.id))
      )
      JOIN roles r ON ((r.id = mwo.role_id))
    )
    LEFT JOIN role_addresses ra ON (
      (
        (ra.role_id = r.id)
        AND (ra.blockchain = msw.blockchain)
      )
    )
  )
WHERE
  (msw.ownership_type = 'role_based' :: text)
ORDER BY
  msw.name,
  r.priority DESC;