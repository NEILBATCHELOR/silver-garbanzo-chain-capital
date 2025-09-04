-- Migration: NAV refactor foundations - composite funds, stablecoin, history, fx/price validation
-- Note: User applies SQL manually to Supabase (read-only types generated later)

-- 1) Calculation runs table (if not exists)
CREATE TABLE IF NOT EXISTS nav_calculation_runs (
  id text PRIMARY KEY,
  asset_id text NOT NULL,
  product_type text NOT NULL,
  valuation_date timestamptz NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  status text NOT NULL,
  result_nav_value numeric,
  nav_per_share numeric,
  fx_rate_used numeric,
  pricing_sources jsonb,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nav_runs_asset ON nav_calculation_runs(asset_id);
CREATE INDEX IF NOT EXISTS idx_nav_runs_product_type ON nav_calculation_runs(product_type);
CREATE INDEX IF NOT EXISTS idx_nav_runs_valuation_date ON nav_calculation_runs(valuation_date);

-- 2) Detailed calculation history table (audit trail)
CREATE TABLE IF NOT EXISTS nav_calculation_history (
  id bigserial PRIMARY KEY,
  run_id text NOT NULL,
  asset_id text NOT NULL,
  product_type text NOT NULL,
  calculation_step text NOT NULL,
  step_order int NOT NULL,
  input_data jsonb NOT NULL,
  output_data jsonb NOT NULL,
  processing_time_ms int NOT NULL,
  data_sources jsonb,
  validation_results jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nav_history_run ON nav_calculation_history(run_id);
CREATE INDEX IF NOT EXISTS idx_nav_history_asset ON nav_calculation_history(asset_id);

-- 3) FX rates cache (for conversion)
CREATE TABLE IF NOT EXISTS nav_fx_rates (
  base_ccy text NOT NULL,
  quote_ccy text NOT NULL,
  rate numeric NOT NULL,
  as_of timestamptz NOT NULL,
  source text NOT NULL,
  PRIMARY KEY (base_ccy, quote_ccy, as_of)
);

CREATE INDEX IF NOT EXISTS idx_nav_fx_pair_asof ON nav_fx_rates(base_ccy, quote_ccy, as_of DESC);

-- 4) Price cache (generic instrument prices)
CREATE TABLE IF NOT EXISTS nav_price_cache (
  instrument_key text NOT NULL,
  price numeric NOT NULL,
  currency text NOT NULL,
  as_of timestamptz NOT NULL,
  source text NOT NULL,
  PRIMARY KEY (instrument_key, as_of)
);

CREATE INDEX IF NOT EXISTS idx_nav_price_instrument_asof ON nav_price_cache(instrument_key, as_of DESC);

-- 5) Stablecoin collateral (generic; supports fiat and crypto-backed)
CREATE TABLE IF NOT EXISTS stablecoin_collateral (
  id bigserial PRIMARY KEY,
  stablecoin_id text NOT NULL,
  collateral_address text,
  collateral_symbol text,
  collateral_amount numeric,
  collateral_value_usd numeric,
  liquidation_ratio numeric,
  stability_fee numeric,
  debt_ceiling numeric,
  risk_parameters jsonb,
  oracle_price numeric,
  last_oracle_update timestamptz,
  total_reserves numeric,
  backing_ratio numeric,
  audit_date timestamptz,
  auditor_firm text,
  attestation_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stablecoin_collateral_coin ON stablecoin_collateral(stablecoin_id);
CREATE INDEX IF NOT EXISTS idx_stablecoin_collateral_value ON stablecoin_collateral(stablecoin_id, collateral_value_usd DESC);

-- 6) Optional JSON columns on fund_products for composite fund configs
-- If these columns do not exist, add them. If they do, this will fail; apply manually as needed.
ALTER TABLE fund_products ADD COLUMN IF NOT EXISTS asset_allocation jsonb;
ALTER TABLE fund_products ADD COLUMN IF NOT EXISTS concentration_limits jsonb;

-- 7) Helpful view (optional): latest fx rates by pair
CREATE OR REPLACE VIEW nav_fx_rates_latest AS
SELECT DISTINCT ON (base_ccy, quote_ccy)
  base_ccy, quote_ccy, rate, as_of, source
FROM nav_fx_rates
ORDER BY base_ccy, quote_ccy, as_of DESC;

