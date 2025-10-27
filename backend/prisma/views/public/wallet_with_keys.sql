SELECT
  w.id,
  w.investor_id,
  w.wallet_address,
  w.wallet_type,
  w.blockchain,
  w.status,
  w.project_id,
  w.private_key_vault_id,
  w.mnemonic_vault_id,
  w.public_key_vault_id,
  pk.encrypted_key AS private_key_from_vault,
  mn.encrypted_key AS mnemonic_from_vault,
  pub.encrypted_key AS public_key_from_vault,
  w.private_key AS private_key_legacy,
  w.mnemonic AS mnemonic_legacy,
  w.public_key AS public_key_legacy,
  w.created_at,
  w.updated_at
FROM
  (
    (
      (
        wallets w
        LEFT JOIN key_vault_keys pk ON ((w.private_key_vault_id = pk.id))
      )
      LEFT JOIN key_vault_keys mn ON ((w.mnemonic_vault_id = mn.id))
    )
    LEFT JOIN key_vault_keys pub ON ((w.public_key_vault_id = pub.id))
  );