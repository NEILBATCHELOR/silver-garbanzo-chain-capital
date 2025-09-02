SELECT
  t.id AS token_id,
  t.name AS token_name,
  t.symbol AS token_symbol,
  t.standard AS token_standard,
  CASE
    WHEN (t.standard = 'ERC-20' :: token_standard_enum) THEN COALESCE(
      ((erc20.whitelist_config ->> 'enabled' :: text)) :: boolean,
      false
    )
    ELSE NULL :: boolean
  END AS erc20_whitelist_enabled,
  CASE
    WHEN (t.standard = 'ERC-721' :: token_standard_enum) THEN COALESCE(
      ((erc721.whitelist_config ->> 'enabled' :: text)) :: boolean,
      false
    )
    ELSE NULL :: boolean
  END AS erc721_whitelist_enabled,
  CASE
    WHEN (t.standard = 'ERC-1155' :: token_standard_enum) THEN COALESCE(
      ((erc1155.whitelist_config ->> 'enabled' :: text)) :: boolean,
      false
    )
    ELSE NULL :: boolean
  END AS erc1155_whitelist_enabled,
  CASE
    WHEN (t.standard = 'ERC-1400' :: token_standard_enum) THEN COALESCE(erc1400.investor_whitelist_enabled, false)
    ELSE NULL :: boolean
  END AS erc1400_whitelist_enabled,
  CASE
    WHEN (t.standard = 'ERC-3525' :: token_standard_enum) THEN COALESCE(
      ((erc3525.whitelist_config ->> 'enabled' :: text)) :: boolean,
      false
    )
    ELSE NULL :: boolean
  END AS erc3525_whitelist_enabled,
  CASE
    WHEN (t.standard = 'ERC-4626' :: token_standard_enum) THEN COALESCE(
      ((erc4626.whitelist_config ->> 'enabled' :: text)) :: boolean,
      false
    )
    ELSE NULL :: boolean
  END AS erc4626_whitelist_enabled,
  COALESCE(tw.address_count, (0) :: bigint) AS whitelisted_address_count,
  t.created_at,
  t.updated_at
FROM
  (
    (
      (
        (
          (
            (
              (
                tokens t
                LEFT JOIN token_erc20_properties erc20 ON ((t.id = erc20.token_id))
              )
              LEFT JOIN token_erc721_properties erc721 ON ((t.id = erc721.token_id))
            )
            LEFT JOIN token_erc1155_properties erc1155 ON ((t.id = erc1155.token_id))
          )
          LEFT JOIN token_erc1400_properties erc1400 ON ((t.id = erc1400.token_id))
        )
        LEFT JOIN token_erc3525_properties erc3525 ON ((t.id = erc3525.token_id))
      )
      LEFT JOIN token_erc4626_properties erc4626 ON ((t.id = erc4626.token_id))
    )
    LEFT JOIN (
      SELECT
        token_whitelists.token_id,
        count(*) AS address_count
      FROM
        token_whitelists
      WHERE
        (token_whitelists.is_active = TRUE)
      GROUP BY
        token_whitelists.token_id
    ) tw ON ((t.id = tw.token_id))
  );