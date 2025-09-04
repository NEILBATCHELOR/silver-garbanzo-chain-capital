-- Phase 2: Link Existing Projects to Missing Product Types (FINAL FIXED VERSION)
-- This script updates existing products and creates the missing bond product
-- Apply this manually in your Supabase SQL editor after Phase 1

-- FIXES APPLIED:
-- 1. Changed from INSERT to UPDATE for existing products
-- 2. Fixed ALL column names to match actual database schema  
-- 3. Properly checked bond_products schema - NO bond_name column!
-- 4. Added proper data type handling for arrays and timestamps

-- =============================================================================
-- STRUCTURED PRODUCTS - Update existing product
-- =============================================================================

-- Update existing structured product for "Test Capital Protected Note" project
UPDATE structured_products 
SET 
  product_name = 'Chain Capital Protected Note Series A',
  issuer = 'Chain Capital Finance Ltd',
  underlying_assets = ARRAY['S&P_500', 'NASDAQ_100'],
  nominal_amount = 50000000.00, -- $50M notional
  currency = 'USD',
  maturity_date = '2026-09-01'::timestamp with time zone,
  barrier_level = 0.75, -- 75% barrier
  protection_level = 1.00, -- 100% protection
  payoff_structure = 'capital_protected',
  status = 'active',
  updated_at = NOW()
WHERE project_id = '11111111-1111-1111-1111-111111111111';

-- =============================================================================
-- PRIVATE EQUITY - Update existing product
-- =============================================================================

-- Update existing private equity product for "Test Growth Equity Fund" project
UPDATE private_equity_products 
SET 
  fund_name = 'Chain Capital Growth Equity Fund III',
  fund_type = 'growth_equity',
  fund_vintage_year = '2024',
  fund_size = 500000000.00, -- $500M fund size
  capital_commitment = 350000000.00, -- $350M committed
  investment_stage = 'growth',
  sector_focus = 'Technology',
  geographic_focus = 'North America',
  management_fee = 0.020, -- 2% management fee
  carried_interest = 0.20,  -- 20% carried interest
  status = 'active',
  updated_at = NOW()
WHERE project_id = '44444444-4444-4444-4444-444444444444';

-- =============================================================================
-- REAL ESTATE - Update existing product
-- =============================================================================

-- Update existing real estate product for "Test Commercial Property Fund" project
UPDATE real_estate_products 
SET 
  property_name = 'Chain Capital Commercial Property Portfolio',
  property_type = 'commercial_office',
  units = 15000, -- 15,000 units
  acquisition_date = '2024-01-01'::timestamp with time zone,
  gross_amount = 250000000.00, -- $250M gross amount
  taxable_amount = 275000000.00, -- $275M taxable amount  
  geographic_location = 'London, UK',
  status = 'active',
  updated_at = NOW()
WHERE project_id = '55555555-5555-5555-5555-555555555555';

-- =============================================================================
-- ENERGY PRODUCTS - Update existing product
-- =============================================================================

-- Update existing energy product for "Test Solar Energy Project"
UPDATE energy_products 
SET 
  project_name = 'Chain Capital Solar Farm Bavaria',
  project_type = 'solar',
  capacity = 50.0,      -- 50 MW capacity
  project_status = 'operational',
  site_location = 'Bavaria, Germany',
  expected_online_date = '2024-12-01'::timestamp with time zone,
  project_capacity_mw = 50.0,      -- 50 MW capacity
  carbon_offset_potential = 48000,     -- 48,000 tons CO2 offset
  status = 'active',
  updated_at = NOW()
WHERE project_id = '99999999-9999-9999-9999-999999999999';

-- =============================================================================
-- COMMODITIES - Update existing product
-- =============================================================================

-- Update existing commodities product for "Test Gold Futures Fund" project
UPDATE commodities_products 
SET 
  commodity_name = 'Chain Capital Gold Futures Strategy',
  commodity_type = 'precious_metal',
  contract_size = 100,         -- 100 oz contracts
  unit_of_measure = 'oz',
  grade_quality = 'Good Delivery',
  exchange = 'COMEX',
  currency = 'USD',
  status = 'active',
  updated_at = NOW()
WHERE project_id = '88888888-8888-8888-8888-888888888888';

-- =============================================================================
-- DIGITAL TOKENIZED FUND - Update existing product
-- =============================================================================

-- Update existing digital tokenized fund for "Test Tokenized ETF" project
UPDATE digital_tokenized_fund_products 
SET 
  asset_name = 'Chain Capital Digital S&P 500 Fund',
  asset_symbol = 'CCS500',
  total_supply = 10000000.00,   -- 10M tokens
  circulating_supply = 8500000.00,    -- 8.5M circulating
  nav = 42.50,         -- $42.50 NAV per token
  blockchain_network = 'ethereum',
  smart_contract_address = '0x1234567890abcdef1234567890abcdef12345678',
  status = 'active',
  updated_at = NOW()
WHERE project_id = '77777777-7777-7777-7777-777777777777';

-- =============================================================================
-- BONDS - Create new bond product (FIXED SCHEMA)
-- =============================================================================

-- Insert bond product for existing "Corporate Bond 2025" project
INSERT INTO bond_products (
  id, project_id, bond_isin_cusip, issuer_name, -- FIXED: issuer_name not issuer
  bond_type, coupon_rate, face_value,
  maturity_date, issue_date, credit_rating,
  coupon_frequency, currency, status, -- FIXED: removed non-existent columns
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '0350bd24-1f6d-4cc7-840a-da8916610063', -- Corporate Bond 2025 project
  'XS2789456123',
  'Chain Capital Finance Ltd', -- FIXED: issuer_name
  'corporate',
  0.0550, -- 5.5% coupon
  1000.00,
  '2025-12-15'::timestamp with time zone, -- FIXED: timestamp type
  '2024-01-15'::timestamp with time zone, -- FIXED: timestamp type  
  'BBB+',
  'semi_annual', -- FIXED: varchar field
  'USD',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify all products were updated/created successfully
SELECT 
  'Updated Products Summary' as info,
  'structured_products' as product_type,
  product_name as name,
  updated_at
FROM structured_products 
WHERE project_id = '11111111-1111-1111-1111-111111111111'

UNION ALL

SELECT 
  'Updated Products Summary' as info,
  'private_equity_products' as product_type,
  fund_name as name,
  updated_at
FROM private_equity_products 
WHERE project_id = '44444444-4444-4444-4444-444444444444'

UNION ALL

SELECT 
  'Updated Products Summary' as info,
  'real_estate_products' as product_type,
  property_name as name,
  updated_at
FROM real_estate_products 
WHERE project_id = '55555555-5555-5555-5555-555555555555'

UNION ALL

SELECT 
  'Updated Products Summary' as info,
  'energy_products' as product_type,
  project_name as name,
  updated_at
FROM energy_products 
WHERE project_id = '99999999-9999-9999-9999-999999999999'

UNION ALL

SELECT 
  'Updated Products Summary' as info,
  'commodities_products' as product_type,
  commodity_name as name,
  updated_at
FROM commodities_products 
WHERE project_id = '88888888-8888-8888-8888-888888888888'

UNION ALL

SELECT 
  'Updated Products Summary' as info,
  'digital_tokenized_fund_products' as product_type,
  asset_name as name,
  updated_at
FROM digital_tokenized_fund_products 
WHERE project_id = '77777777-7777-7777-7777-777777777777'

UNION ALL

SELECT 
  'Created Products Summary' as info,
  'bond_products' as product_type,
  issuer_name as name,
  created_at as updated_at
FROM bond_products 
WHERE project_id = '0350bd24-1f6d-4cc7-840a-da8916610063'

ORDER BY product_type;
