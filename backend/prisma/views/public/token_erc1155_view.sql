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
  p.id AS erc1155_property_id,
  p.base_uri,
  p.metadata_storage,
  p.has_royalty,
  p.royalty_percentage,
  p.royalty_receiver,
  p.is_burnable,
  p.is_pausable,
  p.updatable_uris,
  p.supply_tracking,
  p.created_at AS property_created_at,
  p.updated_at AS property_updated_at
FROM
  (
    tokens t
    LEFT JOIN token_erc1155_properties p ON ((t.id = p.token_id))
  )
WHERE
  (t.standard = 'ERC-1155' :: token_standard_enum);