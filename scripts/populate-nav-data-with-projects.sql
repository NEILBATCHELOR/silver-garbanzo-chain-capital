-- NAV System Data Population Script - Project-Product Linking
-- This script populates products linked to existing projects for NAV calculations
-- Links products to real projects instead of creating orphaned products

-- =============================================================================
-- MONEY MARKET FUNDS - Create new projects and products
-- =============================================================================

-- Insert new projects for Money Market Funds
INSERT INTO projects (
  id, name, description, project_type, organization_id, 
  status, investment_status, currency, target_raise, minimum_investment,
  estimated_yield_percentage, created_at, updated_at
) VALUES 
-- Institutional Money Market Fund Project
(
  gen_random_uuid(),
  'Chain Capital Institutional Money Market Fund',
  'SEC-compliant institutional money market fund focused on government and high-grade corporate securities',
  'money_market_fund',
  (SELECT id FROM organizations LIMIT 1), -- Use first available org
  'active',
  'Open',
  'USD',
  1000000000.00, -- $1B target
  1000000.00,    -- $1M minimum
  5.25,          -- 5.25% estimated yield
  NOW(),
  NOW()
),
-- Government Money Market Fund Project
(
  gen_random_uuid(),
  'Chain Capital Government Money Market Fund',
  'Treasury and government agency securities focused money market fund',
  'money_market_fund',
  (SELECT id FROM organizations LIMIT 1),
  'active',
  'Open', 
  'USD',
  500000000.00, -- $500M target
  100000.00,    -- $100K minimum
  5.15,         -- 5.15% estimated yield
  NOW(),
  NOW()
),
-- Prime Money Market Fund Project
(
  gen_random_uuid(),
  'Chain Capital Prime Money Market Fund',
  'Prime money market fund investing in high-quality corporate securities',
  'money_market_fund',
  (SELECT id FROM organizations LIMIT 1),
  'active',
  'Open',
  'USD',
  2000000000.00, -- $2B target
  50000.00,      -- $50K minimum
  5.35,          -- 5.35% estimated yield
  NOW(),
  NOW()
);

-- Now create fund products linked to these new projects
DO $$
DECLARE
  institutional_project_id UUID;
  government_project_id UUID;
  prime_project_id UUID;
BEGIN
  -- Get the project IDs we just created
  SELECT id INTO institutional_project_id FROM projects WHERE name = 'Chain Capital Institutional Money Market Fund';
  SELECT id INTO government_project_id FROM projects WHERE name = 'Chain Capital Government Money Market Fund';
  SELECT id INTO prime_project_id FROM projects WHERE name = 'Chain Capital Prime Money Market Fund';

  -- Create fund products linked to projects
  INSERT INTO fund_products (
    id, project_id, fund_name, fund_type, fund_ticker,
    net_asset_value, assets_under_management, expense_ratio, 
    currency, status, inception_date, created_at, updated_at
  ) VALUES 
  -- Institutional MMF
  (
    gen_random_uuid(),
    institutional_project_id,
    'Chain Capital Institutional Money Market Fund',
    'money_market',
    'CCIMM',
    1000000000.00,
    1000000000.00,
    0.0025, -- 25 bps
    'USD',
    'active',
    NOW(),
    NOW(),
    NOW()
  ),
  -- Government MMF
  (
    gen_random_uuid(),
    government_project_id,
    'Chain Capital Government Money Market Fund',
    'money_market',
    'CCGMM',
    500000000.00,
    500000000.00,
    0.0020, -- 20 bps
    'USD',
    'active',
    NOW(),
    NOW(),
    NOW()
  ),
  -- Prime MMF
  (
    gen_random_uuid(),
    prime_project_id,
    'Chain Capital Prime Money Market Fund',
    'money_market',
    'CCPMM',
    2000000000.00,
    2000000000.00,
    0.0030, -- 30 bps
    'USD',
    'active',
    NOW(),
    NOW(),
    NOW()
  );
END $$;

-- =============================================================================
-- LINK EXISTING PROJECTS TO MISSING PRODUCTS
-- =============================================================================

-- Link structured products to existing project
INSERT INTO structured_products (
  id, project_id, product_name, product_type,
  underlying_assets, notional_amount, currency,
  maturity_date, barrier_level, participation_rate,
  protection_level, status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111', -- Test Capital Protected Note project
  'Chain Capital Protected Note Series A',
  'capital_protected_note',
  '{"S&P_500": 0.6, "NASDAQ_100": 0.4}',
  50000000.00, -- $50M notional
  'USD',
  '2026-09-01'::date,
  0.75, -- 75% barrier
  1.00, -- 100% participation
  1.00, -- 100% protection
  'active',
  NOW(),
  NOW()
);

-- Link private equity to existing project
INSERT INTO private_equity_products (
  id, project_id, fund_name, fund_type,
  fund_vintage_year, target_raise, committed_capital,
  investment_stage, sector_focus, geographic_focus,
  management_fee, carried_interest, currency,
  status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '44444444-4444-4444-4444-444444444444', -- Test Growth Equity Fund project
  'Chain Capital Growth Equity Fund III',
  'growth_equity',
  2024,
  500000000.00, -- $500M target
  350000000.00, -- $350M committed
  'growth',
  '{"Technology", "Healthcare", "FinTech"}',
  '{"North America", "Western Europe"}',
  0.020, -- 2% management fee
  0.20,  -- 20% carried interest
  'USD',
  'active',
  NOW(),
  NOW()
);

-- Link real estate to existing project
INSERT INTO real_estate_products (
  id, project_id, property_name, property_type,
  total_square_footage, acquisition_price, current_valuation,
  net_operating_income, capitalization_rate, occupancy_rate,
  location, currency, status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '55555555-5555-5555-5555-555555555555', -- Test Commercial Property Fund project
  'Chain Capital Commercial Property Portfolio',
  'commercial_office',
  1500000, -- 1.5M sq ft
  250000000.00, -- $250M acquisition
  275000000.00, -- $275M current value
  18500000.00,  -- $18.5M NOI
  0.0675,       -- 6.75% cap rate
  0.92,         -- 92% occupancy
  'London, UK',
  'EUR',
  'active',
  NOW(),
  NOW()
);

-- Link energy products to existing project  
INSERT INTO energy_products (
  id, project_id, project_name, energy_type,
  capacity_mw, capacity_factor, annual_generation_mwh,
  installation_cost, operation_maintenance_cost, carbon_offset_tons,
  location, currency, status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '99999999-9999-9999-9999-999999999999', -- Test Solar Energy Project
  'Chain Capital Solar Farm Bavaria',
  'solar',
  50.0,      -- 50 MW capacity
  0.22,      -- 22% capacity factor
  96360,     -- Annual generation MWh
  45000000.00, -- €45M installation cost
  450000.00,   -- €450K annual O&M
  48000,       -- 48,000 tons CO2 offset
  'Bavaria, Germany',
  'EUR',
  'active',
  NOW(),
  NOW()
);

-- Link commodities to existing project
INSERT INTO commodities_products (
  id, project_id, commodity_name, commodity_type,
  contract_size, pricing_unit, storage_cost_per_unit,
  quality_grade, primary_exchange, currency,
  status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '88888888-8888-8888-8888-888888888888', -- Test Gold Futures Fund project
  'Chain Capital Gold Futures Strategy',
  'precious_metal',
  100,         -- 100 oz contracts
  'USD_per_oz',
  0.50,        -- $0.50/oz/month storage
  'Good Delivery',
  'COMEX',
  'USD',
  'active',
  NOW(),
  NOW()
);

-- Link digital tokenized fund to existing project
INSERT INTO digital_tokenized_fund_products (
  id, project_id, fund_name, fund_symbol,
  total_supply, circulating_supply, net_asset_value,
  underlying_assets, blockchain_network, contract_address,
  currency, status, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '77777777-7777-7777-7777-777777777777', -- Test Tokenized ETF project
  'Chain Capital Digital S&P 500 Fund',
  'CCS500',
  10000000.00,   -- 10M tokens
  8500000.00,    -- 8.5M circulating
  425000000.00,  -- $425M NAV
  '{"SPY": 0.6, "VOO": 0.25, "IVV": 0.15}',
  'ethereum',
  '0x1234567890abcdef1234567890abcdef12345678',
  'USD',
  'active',
  NOW(),
  NOW()
);

-- Link additional bond product to existing project
INSERT INTO bond_products (
  id, project_id, bond_name, bond_isin_cusip,
  issuer, bond_type, coupon_rate, face_value,
  maturity_date, issue_date, credit_rating,
  coupon_frequency, currency, status,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '0350bd24-1f6d-4cc7-840a-da8916610063', -- Corporate Bond 2025 project
  'Chain Capital Corporate Bond 2025',
  'XS2789456123',
  'Chain Capital Finance Ltd',
  'corporate',
  0.0550, -- 5.5% coupon
  1000.00,
  '2025-12-15'::date,
  '2024-01-15'::date,
  'BBB+',
  2, -- Semi-annual
  'USD',
  'active',
  NOW(),
  NOW()
);

-- =============================================================================
-- ENHANCED EQUITY PRODUCTS - Link to projects with full data
-- =============================================================================

-- Update existing equity products with project links and complete data
DO $$
DECLARE
  tech_equity_project_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Update existing TECH equity to link to project
  UPDATE equity_products 
  SET 
    project_id = tech_equity_project_id,
    company_name = 'Chain Capital Technology Holdings',
    exchange = 'NASDAQ',
    shares_outstanding = 100000000,
    market_capitalization = 5000000000,
    sector = 'Technology',
    industry = 'Software & Services',
    dividend_yield = 0.015, -- 1.5%
    price_earnings_ratio = 25.5,
    updated_at = NOW()
  WHERE ticker_symbol = 'TECH';

  -- Add more equity products for the tech fund
  INSERT INTO equity_products (
    id, project_id, ticker_symbol, company_name,
    exchange, shares_outstanding, market_capitalization,
    sector, industry, dividend_yield, price_earnings_ratio,
    status, created_at, updated_at
  ) VALUES
  -- Additional tech holdings for the fund
  (
    gen_random_uuid(),
    tech_equity_project_id,
    'NVDA',
    'NVIDIA Corporation', 
    'NASDAQ',
    24700000000, -- 24.7B shares
    1800000000000, -- $1.8T market cap
    'Technology',
    'Semiconductors',
    0.0032, -- 0.32% dividend yield
    65.2,
    'active',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    tech_equity_project_id,
    'TSLA',
    'Tesla Inc.',
    'NASDAQ', 
    3170000000, -- 3.17B shares
    800000000000, -- $800B market cap
    'Technology',
    'Electric Vehicles',
    0.0000, -- No dividend
    45.8,
    'active',
    NOW(),
    NOW()
  );
END $$;

-- =============================================================================
-- ASSET HOLDINGS - Link funds to their constituent securities
-- =============================================================================

DO $$
DECLARE
  institutional_mmf_id UUID;
  government_mmf_id UUID;  
  prime_mmf_id UUID;
  tech_fund_id UUID;
  protected_note_id UUID;
BEGIN
  -- Get fund product IDs
  SELECT id INTO institutional_mmf_id FROM fund_products WHERE fund_ticker = 'CCIMM';
  SELECT id INTO government_mmf_id FROM fund_products WHERE fund_ticker = 'CCGMM';
  SELECT id INTO prime_mmf_id FROM fund_products WHERE fund_ticker = 'CCPMM';
  SELECT id INTO tech_fund_id FROM equity_products WHERE ticker_symbol = 'TECH' LIMIT 1;
  SELECT id INTO protected_note_id FROM structured_products WHERE product_name = 'Chain Capital Protected Note Series A';

  -- Institutional Money Market Fund Holdings
  INSERT INTO asset_holdings (
    id, asset_id, holding_type, quantity, value, currency, 
    effective_date, instrument_key, oracle_price, last_oracle_update,
    created_at, updated_at
  ) VALUES
  -- Treasury Bills (50% allocation - $500M)
  (gen_random_uuid(), institutional_mmf_id, 'treasury_bill', 500000000, 499500000, 'USD', CURRENT_DATE, 'US_TREASURY_3M_2024_12', 0.9990, NOW(), NOW(), NOW()),
  -- Commercial Paper (30% allocation - $300M)
  (gen_random_uuid(), institutional_mmf_id, 'commercial_paper', 300000000, 299700000, 'USD', CURRENT_DATE, 'APPLE_CP_2024_11_30', 0.9990, NOW(), NOW(), NOW()),
  -- Bank CDs (20% allocation - $200M)
  (gen_random_uuid(), institutional_mmf_id, 'certificate_deposit', 200000000, 199800000, 'USD', CURRENT_DATE, 'JPM_CD_2024_10_15', 0.9990, NOW(), NOW(), NOW());

  -- Government Money Market Fund Holdings  
  INSERT INTO asset_holdings (
    id, asset_id, holding_type, quantity, value, currency,
    effective_date, instrument_key, oracle_price, last_oracle_update,
    created_at, updated_at
  ) VALUES
  -- Treasury Bills (80% allocation - $400M)
  (gen_random_uuid(), government_mmf_id, 'treasury_bill', 400000000, 399600000, 'USD', CURRENT_DATE, 'US_TREASURY_1M_2024_10', 0.9990, NOW(), NOW(), NOW()),
  -- Agency Securities (20% allocation - $100M)
  (gen_random_uuid(), government_mmf_id, 'agency_security', 100000000, 99900000, 'USD', CURRENT_DATE, 'FNMA_2024_11_30', 0.9990, NOW(), NOW(), NOW());

  -- Prime Money Market Fund Holdings
  INSERT INTO asset_holdings (
    id, asset_id, holding_type, quantity, value, currency,
    effective_date, instrument_key, oracle_price, last_oracle_update,
    created_at, updated_at
  ) VALUES
  -- Commercial Paper (40% allocation - $800M)
  (gen_random_uuid(), prime_mmf_id, 'commercial_paper', 800000000, 799200000, 'USD', CURRENT_DATE, 'MSFT_CP_2024_12_15', 0.9990, NOW(), NOW(), NOW()),
  -- Bank CDs (35% allocation - $700M)
  (gen_random_uuid(), prime_mmf_id, 'certificate_deposit', 700000000, 699300000, 'USD', CURRENT_DATE, 'BAC_CD_2025_01_30', 0.9990, NOW(), NOW(), NOW()),
  -- Treasury Bills (25% allocation - $500M)
  (gen_random_uuid(), prime_mmf_id, 'treasury_bill', 500000000, 499500000, 'USD', CURRENT_DATE, 'US_TREASURY_2M_2024_11', 0.9990, NOW(), NOW(), NOW());

END $$;

-- =============================================================================
-- NAV PRICE CACHE - Enhanced with more instruments
-- =============================================================================

INSERT INTO nav_price_cache (
  instrument_key, price, currency, as_of, source, created_at
) VALUES
-- Money Market Instruments (near par for short-term)
('US_TREASURY_3M_2024_12', 0.9990, 'USD', NOW() - INTERVAL '15 minutes', 'treasury_direct', NOW()),
('US_TREASURY_1M_2024_10', 0.9995, 'USD', NOW() - INTERVAL '15 minutes', 'treasury_direct', NOW()),
('US_TREASURY_2M_2024_11', 0.9992, 'USD', NOW() - INTERVAL '15 minutes', 'treasury_direct', NOW()),
('APPLE_CP_2024_11_30', 0.9990, 'USD', NOW() - INTERVAL '30 minutes', 'bloomberg', NOW()),
('MSFT_CP_2024_12_15', 0.9988, 'USD', NOW() - INTERVAL '30 minutes', 'bloomberg', NOW()),
('JPM_CD_2024_10_15', 0.9996, 'USD', NOW() - INTERVAL '45 minutes', 'internal', NOW()),
('BAC_CD_2025_01_30', 0.9985, 'USD', NOW() - INTERVAL '45 minutes', 'internal', NOW()),
('FNMA_2024_11_30', 0.9990, 'USD', NOW() - INTERVAL '20 minutes', 'bloomberg', NOW()),

-- Updated equity prices
('TECH', 50.00, 'USD', NOW() - INTERVAL '5 minutes', 'nasdaq', NOW()),
('NVDA', 725.50, 'USD', NOW() - INTERVAL '5 minutes', 'nasdaq', NOW()),
('TSLA', 252.75, 'USD', NOW() - INTERVAL '5 minutes', 'nasdaq', NOW()),
('AAPL', 193.50, 'USD', NOW() - INTERVAL '5 minutes', 'nasdaq', NOW()),
('MSFT', 378.85, 'USD', NOW() - INTERVAL '5 minutes', 'nasdaq', NOW()),
('GOOGL', 165.42, 'USD', NOW() - INTERVAL '5 minutes', 'nasdaq', NOW()),

-- Bond prices (as percentage of par)
('XS2789456123', 101.25, 'USD', NOW() - INTERVAL '1 hour', 'bloomberg', NOW()),

-- Commodity prices
('GOLD_SPOT', 2015.50, 'USD', NOW() - INTERVAL '10 minutes', 'comex', NOW()),
('SILVER_SPOT', 23.85, 'USD', NOW() - INTERVAL '10 minutes', 'comex', NOW()),
('WTI_CRUDE', 87.25, 'USD', NOW() - INTERVAL '20 minutes', 'nymex', NOW()),

-- Stablecoin prices (should be near $1.00)
('CCUSD', 1.0002, 'USD', NOW() - INTERVAL '5 minutes', 'chainlink', NOW()),
('CCDAI', 0.9998, 'USD', NOW() - INTERVAL '5 minutes', 'chainlink', NOW()),
('CCGOLD', 2015.50, 'USD', NOW() - INTERVAL '10 minutes', 'chainlink', NOW()),
('CCALGO', 0.9995, 'USD', NOW() - INTERVAL '15 minutes', 'chainlink', NOW());

-- =============================================================================
-- NAV FX RATES - Enhanced currency support
-- =============================================================================

INSERT INTO nav_fx_rates (base_ccy, quote_ccy, rate, as_of, source) VALUES
-- Major pairs
('USD', 'EUR', 0.9245, NOW() - INTERVAL '5 minutes', 'ecb'),
('USD', 'GBP', 0.8156, NOW() - INTERVAL '5 minutes', 'boe'), 
('USD', 'JPY', 147.85, NOW() - INTERVAL '5 minutes', 'boj'),
('USD', 'CHF', 0.8945, NOW() - INTERVAL '5 minutes', 'snb'),
('USD', 'CAD', 1.3425, NOW() - INTERVAL '5 minutes', 'boc'),

-- Reverse pairs
('EUR', 'USD', 1.0816, NOW() - INTERVAL '5 minutes', 'ecb'),
('GBP', 'USD', 1.2261, NOW() - INTERVAL '5 minutes', 'boe'),
('JPY', 'USD', 0.0068, NOW() - INTERVAL '5 minutes', 'boj'),
('CHF', 'USD', 1.1179, NOW() - INTERVAL '5 minutes', 'snb'),
('CAD', 'USD', 0.7449, NOW() - INTERVAL '5 minutes', 'boc'),

-- Cross pairs
('EUR', 'GBP', 1.1335, NOW() - INTERVAL '5 minutes', 'ecb'),
('GBP', 'EUR', 0.8823, NOW() - INTERVAL '5 minutes', 'boe'),
('EUR', 'JPY', 159.98, NOW() - INTERVAL '5 minutes', 'ecb'),
('JPY', 'EUR', 0.0063, NOW() - INTERVAL '5 minutes', 'boj');

-- =============================================================================
-- NAV CALCULATION RUNS - Sample historical runs
-- =============================================================================

-- Create sample calculation runs for our new funds
DO $$
DECLARE 
  institutional_mmf_id UUID;
  government_mmf_id UUID;
  prime_mmf_id UUID;
BEGIN
  SELECT id INTO institutional_mmf_id FROM fund_products WHERE fund_ticker = 'CCIMM';
  SELECT id INTO government_mmf_id FROM fund_products WHERE fund_ticker = 'CCGMM'; 
  SELECT id INTO prime_mmf_id FROM fund_products WHERE fund_ticker = 'CCPMM';

  INSERT INTO nav_calculation_runs (
    id, asset_id, product_type, valuation_date,
    started_at, completed_at, status,
    result_nav_value, nav_per_share, created_at
  ) VALUES
  -- Historical runs for institutional MMF
  (gen_random_uuid(), institutional_mmf_id, 'money_market', CURRENT_DATE - 1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '2 minutes', 'completed', 1000500000.00, 1.0005, NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), institutional_mmf_id, 'money_market', CURRENT_DATE, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '58 minutes', 'completed', 1000600000.00, 1.0006, NOW() - INTERVAL '1 hour'),
  
  -- Historical runs for government MMF  
  (gen_random_uuid(), government_mmf_id, 'money_market', CURRENT_DATE - 1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '90 seconds', 'completed', 500250000.00, 1.0005, NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), government_mmf_id, 'money_market', CURRENT_DATE, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '58 minutes', 'completed', 500300000.00, 1.0006, NOW() - INTERVAL '1 hour'),
  
  -- Historical runs for prime MMF
  (gen_random_uuid(), prime_mmf_id, 'money_market', CURRENT_DATE - 1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '3 minutes', 'completed', 2001000000.00, 1.0005, NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), prime_mmf_id, 'money_market', CURRENT_DATE, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '57 minutes', 'completed', 2001200000.00, 1.0006, NOW() - INTERVAL '1 hour');
END $$;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES - Run these to verify data population
-- =============================================================================

-- Verify project-product relationships
-- SELECT p.name as project_name, p.project_type, 
--        fp.fund_name, ep.company_name, bp.bond_name, sp.token_name,
--        st.product_name, pe.fund_name as pe_fund, re.property_name,
--        en.project_name as energy_name, cp.commodity_name, dt.fund_name as digital_fund
-- FROM projects p
-- LEFT JOIN fund_products fp ON p.id = fp.project_id
-- LEFT JOIN equity_products ep ON p.id = ep.project_id  
-- LEFT JOIN bond_products bp ON p.id = bp.project_id
-- LEFT JOIN stablecoin_products sp ON p.id = sp.project_id
-- LEFT JOIN structured_products st ON p.id = st.project_id
-- LEFT JOIN private_equity_products pe ON p.id = pe.project_id
-- LEFT JOIN real_estate_products re ON p.id = re.project_id
-- LEFT JOIN energy_products en ON p.id = en.project_id
-- LEFT JOIN commodities_products cp ON p.id = cp.project_id
-- LEFT JOIN digital_tokenized_fund_products dt ON p.id = dt.project_id
-- WHERE p.status = 'active'
-- ORDER BY p.created_at DESC;

-- Verify asset holdings
-- SELECT ah.asset_id, fp.fund_name, ah.holding_type, ah.quantity, ah.value, ah.instrument_key
-- FROM asset_holdings ah
-- JOIN fund_products fp ON ah.asset_id = fp.id
-- ORDER BY fp.fund_name, ah.value DESC;

-- Verify price cache
-- SELECT instrument_key, price, currency, as_of, source 
-- FROM nav_price_cache 
-- WHERE as_of > NOW() - INTERVAL '2 hours'
-- ORDER BY as_of DESC;
