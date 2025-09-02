SELECT
  t.id,
  t.transaction_hash AS hash,
  t.from_address,
  t.to_address,
  t.value AS amount,
  t.token_symbol AS asset,
  t.blockchain,
  t.status,
  t.type AS transfer_type,
  t.network_fee,
  t.gas_used,
  t.block_number,
  t.confirmations,
  t.memo,
  t.created_at,
  t.updated_at
FROM
  transactions t
WHERE
  (
    t.type = ANY (
      ARRAY ['transfer'::text, 'token_transfer'::text, 'nft_transfer'::text]
    )
  )
ORDER BY
  t.created_at DESC;