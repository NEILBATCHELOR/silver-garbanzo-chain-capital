-- Phase 3: Create MMF Projects, Products, and Holdings (FULLY CORRECTED)
-- This single, idempotent script creates all necessary records in the correct order.

-- =============================================================================
-- 1. CREATE PREREQUISITE PROJECTS
-- =============================================================================
INSERT INTO projects (
    id, name, description, project_type, organization_id, status, investment_status, currency
) VALUES 
(   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Chain Capital Government MMF Project', 'Project for the Government MMF', 'funds_etfs_etps', '689a0933-a0f4-4665-8de7-9a701dd67580', 'active', 'Open', 'USD'),
(   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Chain Capital Prime MMF Project', 'Project for the Prime MMF', 'funds_etfs_etps', '689a0933-a0f4-4665-8de7-9a701dd67580', 'active', 'Open', 'USD'),
(   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Chain Capital Institutional MMF Alt Project', 'Alt Project for the Institutional MMF', 'funds_etfs_etps', '689a0933-a0f4-4665-8de7-9a701dd67580', 'active', 'Open', 'USD'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. CREATE FUND PRODUCTS (Linked to above projects)
-- =============================================================================
INSERT INTO fund_products (
    id, project_id, fund_ticker, fund_name, fund_type, net_asset_value, assets_under_management, expense_ratio, benchmark_index, distribution_frequency, currency, inception_date, status, target_raise
) VALUES 
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'CCGMM', 'Chain Capital Government Money Market Fund', 'money_market_fund', 1.00, 0.00, 0.0035, 'FTSE 3-Month T-Bill', 'Daily', 'USD', NOW(), 'active', 500000000.00),
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'CCPMM', 'Chain Capital Prime Money Market Fund', 'money_market_fund', 1.00, 0.00, 0.0055, 'FTSE 3-Month T-Bill', 'Daily', 'USD', NOW(), 'active', 2000000000.00),
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'CCIMM', 'Chain Capital Institutional Money Market Fund', 'money_market_fund', 1.00, 0.00, 0.0045, 'FTSE 3-Month T-Bill', 'Daily', 'USD', NOW(), 'active', 1000000000.00)
ON CONFLICT (project_id) DO NOTHING;

-- =============================================================================
-- 3. POPULATE ASSET HOLDINGS (For the funds created above)
-- =============================================================================
DO $$
DECLARE
  institutional_mmf_id UUID;
  government_mmf_id UUID;  
  prime_mmf_id UUID;
BEGIN
  SELECT id INTO institutional_mmf_id FROM fund_products WHERE fund_ticker = 'CCIMM' LIMIT 1;
  SELECT id INTO government_mmf_id FROM fund_products WHERE fund_ticker = 'CCGMM' LIMIT 1;
  SELECT id INTO prime_mmf_id FROM fund_products WHERE fund_ticker = 'CCPMM' LIMIT 1;

  IF institutional_mmf_id IS NOT NULL THEN
    INSERT INTO asset_holdings (id, asset_id, holding_type, quantity, value, currency, effective_date, instrument_key, oracle_price, last_oracle_update) VALUES
    (gen_random_uuid(), institutional_mmf_id, 'treasury_bill', 500000000, 499500000, 'USD', CURRENT_DATE, 'US_TREASURY_3M_2024_12', 0.9990, NOW()),
    (gen_random_uuid(), institutional_mmf_id, 'commercial_paper', 300000000, 299700000, 'USD', CURRENT_DATE, 'APPLE_CP_2024_11_30', 0.9990, NOW()),
    (gen_random_uuid(), institutional_mmf_id, 'certificate_deposit', 200000000, 199800000, 'USD', CURRENT_DATE, 'JPM_CD_2024_10_15', 0.9990, NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF government_mmf_id IS NOT NULL THEN
    INSERT INTO asset_holdings (id, asset_id, holding_type, quantity, value, currency, effective_date, instrument_key, oracle_price, last_oracle_update) VALUES
    (gen_random_uuid(), government_mmf_id, 'treasury_bill', 400000000, 399600000, 'USD', CURRENT_DATE, 'US_TREASURY_1M_2024_10', 0.9990, NOW()),
    (gen_random_uuid(), government_mmf_id, 'agency_security', 100000000, 99900000, 'USD', CURRENT_DATE, 'FNMA_2024_11_30', 0.9990, NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF prime_mmf_id IS NOT NULL THEN
    INSERT INTO asset_holdings (id, asset_id, holding_type, quantity, value, currency, effective_date, instrument_key, oracle_price, last_oracle_update) VALUES
    (gen_random_uuid(), prime_mmf_id, 'commercial_paper', 800000000, 799200000, 'USD', CURRENT_DATE, 'MSFT_CP_2024_12_15', 0.9990, NOW()),
    (gen_random_uuid(), prime_mmf_id, 'certificate_deposit', 700000000, 699300000, 'USD', CURRENT_DATE, 'BAC_CD_2025_01_30', 0.9990, NOW()),
    (gen_random_uuid(), prime_mmf_id, 'treasury_bill', 500000000, 499500000, 'USD', CURRENT_DATE, 'US_TREASURY_2M_2024_11', 0.9990, NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Verify the data was inserted correctly
SELECT 'Fund Holdings Summary:' as info, f.fund_ticker, f.fund_name, COUNT(ah.id) as holdings_count
FROM fund_products f 
LEFT JOIN asset_holdings ah ON f.id = ah.asset_id
WHERE f.fund_ticker IN ('CCIMM', 'CCGMM', 'CCPMM')
GROUP BY f.fund_ticker, f.fund_name;
