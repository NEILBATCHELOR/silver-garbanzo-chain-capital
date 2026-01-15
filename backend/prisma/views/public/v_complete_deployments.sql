SELECT
  td.token_id,
  td.contract_address AS token_address,
  td.transaction_hash AS token_deployment_tx,
  td.total_deployment_transactions,
  td.network,
  td.status,
  td.deployed_by,
  td.deployed_at,
  count(tm.id) AS total_modules,
  count(tm.linkage_tx_hash) AS modules_linked,
  count(tm.configured_at) AS modules_configured,
  (
    SELECT
      array_agg(DISTINCT all_txs.tx_hash) AS array_agg
    FROM
      (
        SELECT
          td.transaction_hash AS tx_hash
        WHERE
          (td.transaction_hash IS NOT NULL)
        UNION
        SELECT
          unnest(td.initialization_tx_hashes) AS tx_hash
        WHERE
          (td.initialization_tx_hashes IS NOT NULL)
        UNION
        SELECT
          tm2.deployment_tx_hash AS tx_hash
        FROM
          token_modules tm2
        WHERE
          (
            (tm2.token_id = td.token_id)
            AND (tm2.deployment_tx_hash IS NOT NULL)
          )
        UNION
        SELECT
          tm2.linkage_tx_hash AS tx_hash
        FROM
          token_modules tm2
        WHERE
          (
            (tm2.token_id = td.token_id)
            AND (tm2.linkage_tx_hash IS NOT NULL)
          )
        UNION
        SELECT
          unnest(tm2.configuration_tx_hashes) AS tx_hash
        FROM
          token_modules tm2
        WHERE
          (
            (tm2.token_id = td.token_id)
            AND (tm2.configuration_tx_hashes IS NOT NULL)
          )
      ) all_txs
  ) AS all_transaction_hashes
FROM
  (
    token_deployments td
    LEFT JOIN token_modules tm ON ((td.token_id = tm.token_id))
  )
GROUP BY
  td.token_id,
  td.contract_address,
  td.transaction_hash,
  td.total_deployment_transactions,
  td.network,
  td.status,
  td.deployed_by,
  td.deployed_at,
  td.initialization_tx_hashes;