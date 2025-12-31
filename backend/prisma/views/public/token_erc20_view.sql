SELECT
  t.id AS token_id,
  t.name,
  t.symbol,
  t.decimals,
  t.standard,
  t.total_supply,
  t.metadata,
  t.status,
  t.description,
  t.created_at AS token_created_at,
  t.updated_at AS token_updated_at,
  p.id AS erc20_property_id,
  p.cap,
  p.initial_supply,
  p.is_mintable,
  p.is_burnable,
  p.is_pausable,
  p.initial_owner,
  p.created_at AS property_created_at,
  p.updated_at AS property_updated_at
FROM
  (
    tokens t
    LEFT JOIN token_erc20_properties p ON ((t.id = p.token_id))
  )
WHERE
  (t.standard = 'ERC-20' :: token_standard_enum);