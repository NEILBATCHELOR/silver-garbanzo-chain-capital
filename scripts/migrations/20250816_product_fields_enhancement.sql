-- Migration: 20250816_product_fields_enhancement.sql
-- Description: Enhances the product tables with additional fields and ensures consistency
-- based on the detailed requirements documentation.

-- ==============================================
-- ENUM TYPES
-- ==============================================

-- Create new enum types for standardization
DO $$
BEGIN
  -- Product Status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
    CREATE TYPE product_status AS ENUM (
      'Active', 'Inactive', 'Pending', 'Matured', 'Called', 'Redeemed', 'Expired',
      'Listed', 'Suspended', 'Delisted', 'Open', 'Closed', 'Liquidated',
      'Development', 'Construction', 'Operational', 'Decommissioned',
      'Backtesting', 'Live', 'Paused', 'Terminated'
    );
  END IF;
  
  -- Payoff Structure enum for structured products
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payoff_structure') THEN
    CREATE TYPE payoff_structure AS ENUM (
      'capital_protected', 'autocallable', 'reverse_convertible', 'barrier_option', 
      'participation_note', 'principal_protected', 'range_accrual', 'twin_win'
    );
  END IF;
  
  -- Collateral Type enum for stablecoins
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'collateral_type') THEN
    CREATE TYPE collateral_type AS ENUM (
      'Fiat', 'Crypto', 'Commodity', 'None'
    );
  END IF;
  
  -- Stablecoin Type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stablecoin_type') THEN
    CREATE TYPE stablecoin_type AS ENUM (
      'Fiat-Backed Stablecoin', 'Crypto-Backed Stablecoin', 'Commodity-Backed Stablecoin', 
      'Algorithmic Stablecoin', 'Rebasing Stablecoin'
    );
  END IF;
  
  -- Fund Type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fund_type') THEN
    CREATE TYPE fund_type AS ENUM (
      'Mutual Fund', 'ETF', 'ETN', 'Closed-End Fund', 'Open-End Fund', 
      'Index Fund', 'Hedge Fund', 'Venture Capital', 'Private Equity'
    );
  END IF;
  
  -- Lifecycle Event Type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lifecycle_event_type') THEN
    CREATE TYPE lifecycle_event_type AS ENUM (
      'Mint', 'Burn', 'Transfer', 'Audit', 'Redemption', 'Rebase', 'Liquidation',
      'Depeg', 'Corporate_Action', 'Dividend', 'Split', 'Merger', 'Acquisition',
      'Coupon_Payment', 'Maturity', 'Call', 'Default', 'Restructuring'
    );
  END IF;
  
  -- Event Status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
    CREATE TYPE event_status AS ENUM (
      'Success', 'Failed', 'Pending', 'Processing', 'Cancelled'
    );
  END IF;
END$$;

-- ==============================================
-- TABLE ENHANCEMENTS
-- ==============================================

-- Structured Products table enhancements
ALTER TABLE structured_products
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS distribution_strategy TEXT,
  ADD COLUMN IF NOT EXISTS complex_features JSONB,
  ADD COLUMN IF NOT EXISTS early_redemption_terms TEXT,
  ADD COLUMN IF NOT EXISTS underlying_asset_performance JSONB,
  ADD COLUMN IF NOT EXISTS risk_rating INTEGER,
  ADD COLUMN IF NOT EXISTS tax_implications TEXT,
  ADD COLUMN IF NOT EXISTS regulatory_disclosures TEXT;

-- Equity Products table enhancements
ALTER TABLE equity_products
  ADD COLUMN IF NOT EXISTS book_value_per_share NUMERIC,
  ADD COLUMN IF NOT EXISTS voting_rights TEXT,
  ADD COLUMN IF NOT EXISTS dividend_policy TEXT,
  ADD COLUMN IF NOT EXISTS dilution_protection TEXT[],
  ADD COLUMN IF NOT EXISTS exit_strategy TEXT,
  ADD COLUMN IF NOT EXISTS stock_split_history JSONB,
  ADD COLUMN IF NOT EXISTS shareholder_agreements TEXT,
  ADD COLUMN IF NOT EXISTS governance_structure TEXT;

-- Commodities Products table enhancements
ALTER TABLE commodities_products
  ADD COLUMN IF NOT EXISTS price_volatility NUMERIC,
  ADD COLUMN IF NOT EXISTS storage_costs NUMERIC,
  ADD COLUMN IF NOT EXISTS transportation_logistics TEXT,
  ADD COLUMN IF NOT EXISTS supply_chain_details TEXT,
  ADD COLUMN IF NOT EXISTS seasonality_factors TEXT[],
  ADD COLUMN IF NOT EXISTS environmental_impact TEXT,
  ADD COLUMN IF NOT EXISTS regulatory_compliance TEXT,
  ADD COLUMN IF NOT EXISTS derivative_contracts JSONB;

-- Fund Products table enhancements
ALTER TABLE fund_products
  ADD COLUMN IF NOT EXISTS tax_efficiency_metrics JSONB,
  ADD COLUMN IF NOT EXISTS investor_concentration NUMERIC,
  ADD COLUMN IF NOT EXISTS rebalancing_frequency TEXT,
  ADD COLUMN IF NOT EXISTS minimum_investment NUMERIC,
  ADD COLUMN IF NOT EXISTS lock_up_period INTEGER,
  ADD COLUMN IF NOT EXISTS high_water_mark BOOLEAN,
  ADD COLUMN IF NOT EXISTS subscription_redemption_terms TEXT,
  ADD COLUMN IF NOT EXISTS domicile TEXT;

-- Bond Products table enhancements
ALTER TABLE bond_products
  ADD COLUMN IF NOT EXISTS yield_curve_position TEXT,
  ADD COLUMN IF NOT EXISTS interest_rate_sensitivity NUMERIC,
  ADD COLUMN IF NOT EXISTS covenant_details TEXT,
  ADD COLUMN IF NOT EXISTS subordination_status TEXT,
  ADD COLUMN IF NOT EXISTS default_risk_metrics JSONB,
  ADD COLUMN IF NOT EXISTS tax_status TEXT,
  ADD COLUMN IF NOT EXISTS amendment_provisions TEXT,
  ADD COLUMN IF NOT EXISTS benchmark_spread NUMERIC;

-- Quantitative Strategies enhancements
ALTER TABLE quantitative_strategies
  ADD COLUMN IF NOT EXISTS backtesting_methodology TEXT,
  ADD COLUMN IF NOT EXISTS alpha_sources TEXT[],
  ADD COLUMN IF NOT EXISTS factor_exposures JSONB,
  ADD COLUMN IF NOT EXISTS model_validation TEXT,
  ADD COLUMN IF NOT EXISTS execution_costs NUMERIC,
  ADD COLUMN IF NOT EXISTS optimization_constraints TEXT,
  ADD COLUMN IF NOT EXISTS risk_management_rules TEXT,
  ADD COLUMN IF NOT EXISTS performance_persistence TEXT;

-- Private Equity Products table enhancements
ALTER TABLE private_equity_products
  ADD COLUMN IF NOT EXISTS investment_criteria TEXT,
  ADD COLUMN IF NOT EXISTS board_rights TEXT,
  ADD COLUMN IF NOT EXISTS key_person_provisions TEXT,
  ADD COLUMN IF NOT EXISTS co_investment_rights TEXT,
  ADD COLUMN IF NOT EXISTS liquidation_preferences TEXT,
  ADD COLUMN IF NOT EXISTS anti_dilution_provisions TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_diversification_metrics JSONB,
  ADD COLUMN IF NOT EXISTS value_creation_strategy TEXT;

-- Private Debt Products table enhancements
ALTER TABLE private_debt_products
  ADD COLUMN IF NOT EXISTS credit_monitoring_process TEXT,
  ADD COLUMN IF NOT EXISTS covenant_compliance JSONB,
  ADD COLUMN IF NOT EXISTS repayment_waterfall TEXT,
  ADD COLUMN IF NOT EXISTS collateral_coverage_ratio NUMERIC,
  ADD COLUMN IF NOT EXISTS interest_coverage_ratio NUMERIC,
  ADD COLUMN IF NOT EXISTS loan_to_value_ratio NUMERIC,
  ADD COLUMN IF NOT EXISTS workout_scenarios TEXT[],
  ADD COLUMN IF NOT EXISTS debt_service_metrics JSONB;

-- Real Estate Products table enhancements
ALTER TABLE real_estate_products
  ADD COLUMN IF NOT EXISTS property_valuation_method TEXT,
  ADD COLUMN IF NOT EXISTS occupancy_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS tenant_diversity_metrics JSONB,
  ADD COLUMN IF NOT EXISTS capital_expenditure_plans TEXT,
  ADD COLUMN IF NOT EXISTS property_management_details TEXT,
  ADD COLUMN IF NOT EXISTS development_timeline TEXT,
  ADD COLUMN IF NOT EXISTS market_analysis TEXT,
  ADD COLUMN IF NOT EXISTS sustainability_features TEXT[];

-- Energy Products table enhancements
ALTER TABLE energy_products
  ADD COLUMN IF NOT EXISTS resource_assessment TEXT,
  ADD COLUMN IF NOT EXISTS production_capacity_factors NUMERIC,
  ADD COLUMN IF NOT EXISTS grid_connection_details TEXT,
  ADD COLUMN IF NOT EXISTS licensing_permits TEXT[],
  ADD COLUMN IF NOT EXISTS environmental_impact_assessment TEXT,
  ADD COLUMN IF NOT EXISTS maintenance_schedule TEXT,
  ADD COLUMN IF NOT EXISTS energy_storage_capabilities TEXT,
  ADD COLUMN IF NOT EXISTS power_purchase_agreements TEXT;

-- Infrastructure Products table enhancements
ALTER TABLE infrastructure_products
  ADD COLUMN IF NOT EXISTS project_timeline JSONB,
  ADD COLUMN IF NOT EXISTS concession_agreement_terms TEXT,
  ADD COLUMN IF NOT EXISTS demand_projections JSONB,
  ADD COLUMN IF NOT EXISTS revenue_model TEXT,
  ADD COLUMN IF NOT EXISTS financing_structure TEXT,
  ADD COLUMN IF NOT EXISTS regulatory_framework TEXT,
  ADD COLUMN IF NOT EXISTS stakeholder_management TEXT,
  ADD COLUMN IF NOT EXISTS sustainability_goals TEXT[];

-- Collectibles Products table enhancements
ALTER TABLE collectibles_products
  ADD COLUMN IF NOT EXISTS provenance_history TEXT,
  ADD COLUMN IF NOT EXISTS authenticity_verification TEXT,
  ADD COLUMN IF NOT EXISTS storage_requirements TEXT,
  ADD COLUMN IF NOT EXISTS market_comparables JSONB,
  ADD COLUMN IF NOT EXISTS historical_price_trends JSONB,
  ADD COLUMN IF NOT EXISTS cultural_significance TEXT,
  ADD COLUMN IF NOT EXISTS exhibition_history TEXT[],
  ADD COLUMN IF NOT EXISTS restoration_details TEXT;

-- Asset Backed Products table enhancements
ALTER TABLE asset_backed_products
  ADD COLUMN IF NOT EXISTS underlying_asset_quality TEXT,
  ADD COLUMN IF NOT EXISTS tranching_structure JSONB,
  ADD COLUMN IF NOT EXISTS credit_enhancement_mechanisms TEXT[],
  ADD COLUMN IF NOT EXISTS servicing_arrangements TEXT,
  ADD COLUMN IF NOT EXISTS performance_triggers TEXT,
  ADD COLUMN IF NOT EXISTS cash_flow_waterfall TEXT,
  ADD COLUMN IF NOT EXISTS prepayment_assumptions TEXT,
  ADD COLUMN IF NOT EXISTS investor_reporting_requirements TEXT;

-- Digital Tokenised Funds table enhancements
ALTER TABLE digital_tokenised_funds
  ADD COLUMN IF NOT EXISTS token_economics TEXT,
  ADD COLUMN IF NOT EXISTS governance_mechanism TEXT,
  ADD COLUMN IF NOT EXISTS custody_solution TEXT,
  ADD COLUMN IF NOT EXISTS secondary_market_details TEXT,
  ADD COLUMN IF NOT EXISTS oracle_integration TEXT,
  ADD COLUMN IF NOT EXISTS interoperability_features TEXT[],
  ADD COLUMN IF NOT EXISTS validator_requirements TEXT,
  ADD COLUMN IF NOT EXISTS upgrade_mechanism TEXT;

-- Stablecoin Products table enhancements
ALTER TABLE stablecoin_products
  ADD COLUMN IF NOT EXISTS market_capitalization NUMERIC,
  ADD COLUMN IF NOT EXISTS historical_peg_stability JSONB,
  ADD COLUMN IF NOT EXISTS trading_volume_metrics JSONB,
  ADD COLUMN IF NOT EXISTS regulatory_jurisdiction TEXT[],
  ADD COLUMN IF NOT EXISTS governance_token TEXT,
  ADD COLUMN IF NOT EXISTS monetary_policy_parameters TEXT,
  ADD COLUMN IF NOT EXISTS interoperability_bridges TEXT[],
  ADD COLUMN IF NOT EXISTS transparency_metrics TEXT;

-- ==============================================
-- LIFECYCLE EVENTS ENHANCEMENTS
-- ==============================================

-- Product Lifecycle Events table enhancements
ALTER TABLE product_lifecycle_events
  ADD COLUMN IF NOT EXISTS related_event_id UUID,
  ADD COLUMN IF NOT EXISTS transaction_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS approval_status TEXT,
  ADD COLUMN IF NOT EXISTS blockchain_confirmation_status TEXT,
  ADD COLUMN IF NOT EXISTS reversal_flag BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add a relationship constraint
ALTER TABLE product_lifecycle_events
  ADD CONSTRAINT IF NOT EXISTS fk_related_event
  FOREIGN KEY (related_event_id)
  REFERENCES product_lifecycle_events(id)
  ON DELETE SET NULL;

-- ==============================================
-- STABLECOIN COLLATERAL ENHANCEMENTS
-- ==============================================

ALTER TABLE stablecoin_collateral
  ADD COLUMN IF NOT EXISTS market_value NUMERIC,
  ADD COLUMN IF NOT EXISTS liquidation_threshold NUMERIC,
  ADD COLUMN IF NOT EXISTS liquidation_penalty NUMERIC,
  ADD COLUMN IF NOT EXISTS risk_parameters JSONB,
  ADD COLUMN IF NOT EXISTS oracle_source TEXT,
  ADD COLUMN IF NOT EXISTS collateral_status TEXT;

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_structured_products_issuer ON structured_products(issuer);
CREATE INDEX IF NOT EXISTS idx_structured_products_status ON structured_products(status);
CREATE INDEX IF NOT EXISTS idx_equity_products_ticker ON equity_products(ticker_symbol);
CREATE INDEX IF NOT EXISTS idx_bond_products_issuer ON bond_products(issuer_name);
CREATE INDEX IF NOT EXISTS idx_fund_products_nav ON fund_products(net_asset_value);
CREATE INDEX IF NOT EXISTS idx_real_estate_products_type ON real_estate_products(property_type);
CREATE INDEX IF NOT EXISTS idx_stablecoin_products_type ON stablecoin_products(asset_type);
CREATE INDEX IF NOT EXISTS idx_product_lifecycle_events_type ON product_lifecycle_events(event_type);
CREATE INDEX IF NOT EXISTS idx_product_lifecycle_events_date ON product_lifecycle_events(event_date);

-- ==============================================
-- COMMENT DOCUMENTATION
-- ==============================================

-- Add comments to tables for documentation
COMMENT ON TABLE product_lifecycle_events IS 'Tracks lifecycle events for all product types';
COMMENT ON TABLE structured_products IS 'Complex financial instruments combining derivatives with underlying assets';
COMMENT ON TABLE equity_products IS 'Represents ownership in companies';
COMMENT ON TABLE commodities_products IS 'Physical or futures-based commodity assets';
COMMENT ON TABLE fund_products IS 'Pooled investment vehicles including ETFs and ETPs';
COMMENT ON TABLE bond_products IS 'Debt instruments with interest payments and redemptions';
COMMENT ON TABLE quantitative_strategies IS 'Rules-based investment approaches using models and data analytics';
COMMENT ON TABLE private_equity_products IS 'Investments in private companies with specific stages and terms';
COMMENT ON TABLE private_debt_products IS 'Lending to companies with terms like interest rates and covenants';
COMMENT ON TABLE real_estate_products IS 'Property assets with leases and valuations';
COMMENT ON TABLE energy_products IS 'Energy assets including solar, wind, and climate receivables';
COMMENT ON TABLE infrastructure_products IS 'Infrastructure assets like bridges and tunnels';
COMMENT ON TABLE collectibles_products IS 'Collectible assets like art and wine';
COMMENT ON TABLE asset_backed_products IS 'Securities backed by pools of assets or invoice receivables';
COMMENT ON TABLE digital_tokenised_funds IS 'Investment funds represented as digital tokens';
COMMENT ON TABLE stablecoin_products IS 'Digital currencies designed to maintain stable value';
COMMENT ON TABLE stablecoin_collateral IS 'Collateral backing for stablecoin products';
