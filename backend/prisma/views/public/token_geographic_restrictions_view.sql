SELECT
  tgr.token_id,
  t.name AS token_name,
  t.symbol AS token_symbol,
  t.standard,
  tgr.restriction_type,
  gj.country_code,
  gj.country_name,
  gj.region,
  gj.regulatory_regime,
  tgr.max_ownership_percentage,
  tgr.requires_local_custodian,
  tgr.requires_regulatory_approval,
  gj.sanctions_risk_level,
  gj.is_ofac_sanctioned,
  gj.is_eu_sanctioned,
  gj.is_un_sanctioned,
  tgr.effective_date,
  tgr.expiry_date,
  tgr.notes
FROM
  (
    (
      token_geographic_restrictions tgr
      JOIN tokens t ON ((tgr.token_id = t.id))
    )
    JOIN geographic_jurisdictions gj ON ((tgr.country_code = gj.country_code))
  )
WHERE
  (
    (
      (tgr.effective_date IS NULL)
      OR (tgr.effective_date <= CURRENT_DATE)
    )
    AND (
      (tgr.expiry_date IS NULL)
      OR (tgr.expiry_date > CURRENT_DATE)
    )
  );