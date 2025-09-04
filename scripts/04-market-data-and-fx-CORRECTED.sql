-- Phase 4: Populate Market Data and FX (FULLY CORRECTED)
-- This script populates nav_price_cache and nav_fx_rates with realistic market data.

-- =============================================================================
-- 1. NAV PRICE CACHE - Market Data for All Instruments
-- =============================================================================

-- Delete existing data to ensure idempotency
DELETE FROM nav_price_cache WHERE instrument_key IN (
    'US_TREASURY_3M_2024_12', 'US_TREASURY_1M_2024_10', 'US_TREASURY_2M_2024_11', 'APPLE_CP_2024_11_30', 'MSFT_CP_2024_12_15',
    'JPM_CD_2024_10_15', 'BAC_CD_2025_01_30', 'FNMA_2024_11_30', 'TECH', 'NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'JPM', 'JNJ',
    'XS2789456123', 'US912810TW96', 'US91282CJH73', 'GOLD_SPOT', 'SILVER_SPOT', 'WTI_CRUDE', 'WHEAT_SPOT',
    'CCUSD', 'CCDAI', 'CCGOLD', 'CCALGO', 'CCS500', 'SPY', 'VOO', 'IVV'
);

-- Insert fresh market prices (No ON CONFLICT needed)
INSERT INTO nav_price_cache (instrument_key, price, currency, as_of, source) VALUES
('US_TREASURY_3M_2024_12', 0.9990, 'USD', NOW(), 'treasury_direct'),
('APPLE_CP_2024_11_30', 0.9990, 'USD', NOW(), 'bloomberg'),
('TECH', 50.00, 'USD', NOW(), 'nasdaq'),
('XS2789456123', 101.25, 'USD', NOW(), 'bloomberg'),
('GOLD_SPOT', 2015.50, 'USD', NOW(), 'comex'),
('CCUSD', 1.0002, 'USD', NOW(), 'chainlink'),
('CCS500', 50.00, 'USD', NOW(), 'uniswap');

-- =============================================================================
-- 2. NAV FX RATES - Foreign Exchange Rates
-- =============================================================================

-- Remove existing pairs to avoid duplicates (no ON CONFLICT available)
DELETE FROM nav_fx_rates WHERE (base_ccy, quote_ccy) IN (('USD','EUR'),('USD','GBP'),('EUR','USD'));

INSERT INTO nav_fx_rates (base_ccy, quote_ccy, rate, as_of, source) VALUES
('USD', 'EUR', 0.9245, NOW(), 'ecb'),
('USD', 'GBP', 0.8156, NOW(), 'boe'),
('EUR', 'USD', 1.0816, NOW(), 'ecb');

-- =============================================================================
-- 3. NAV CALCULATION RUNS - Sample Historical Data
-- =============================================================================
DO $$
DECLARE 
  institutional_mmf_id UUID;
BEGIN
  SELECT id INTO institutional_mmf_id FROM fund_products WHERE fund_ticker = 'CCIMM' LIMIT 1;

  IF institutional_mmf_id IS NOT NULL THEN
    INSERT INTO nav_calculation_runs (id, asset_id, product_type, valuation_date, started_at, completed_at, status, result_nav_value, nav_per_share) VALUES
    (gen_random_uuid(), institutional_mmf_id, 'money_market_fund', CURRENT_DATE - 1, NOW() - INTERVAL '1 day', NOW(), 'completed', 1000500000.00, 1.0005)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Verify data
SELECT 'Market Data & FX Verification' as info, (SELECT COUNT(*) FROM nav_price_cache) as price_count, (SELECT COUNT(*) FROM nav_fx_rates) as fx_count, (SELECT COUNT(*) FROM nav_calculation_runs) as nav_run_count;

