-- Migration: 20250816_product_fields_enhancement.sql
-- Description: Enhances product tables with additional fields and adds missing product tables

-- Create enum types for standardized values
CREATE TYPE product_status AS ENUM (
  'Active', 'Called', 'Matured', 'Redeemed', 'Expired', 'Suspended', 'Delisted', 'Open', 'Closed'
);

CREATE TYPE stablecoin_collateral_type AS ENUM (
  'Fiat', 'Crypto', 'Commodity', 'Algorithmic', 'Hybrid', 'None'
);

-- Structured Products table enhancement
ALTER TABLE structured_products
  ADD COLUMN IF NOT EXISTS product_id VARCHAR,
  ADD COLUMN IF NOT EXISTS product_name VARCHAR,
  ADD COLUMN IF NOT EXISTS issuer VARCHAR,
  ADD COLUMN IF NOT EXISTS underlying_assets TEXT[],
  ADD COLUMN IF NOT EXISTS payoff_structure VARCHAR,
  ADD COLUMN IF NOT EXISTS barrier_level NUMERIC,
  ADD COLUMN IF NOT EXISTS coupon_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS strike_price NUMERIC,
  ADD COLUMN IF NOT EXISTS protection_level NUMERIC,
  ADD COLUMN IF NOT EXISTS currency VARCHAR,
  ADD COLUMN IF NOT EXISTS nominal_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS risk_indicators NUMERIC,
  ADD COLUMN IF NOT EXISTS issue_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS maturity_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status VARCHAR, -- Will use product_status enum in future
  ADD COLUMN IF NOT EXISTS event_history JSONB,
  ADD COLUMN IF NOT EXISTS redemption_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valuation_history JSONB,
  ADD COLUMN IF NOT EXISTS monitoring_triggers JSONB,
  -- Enhanced fields
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR,
  ADD COLUMN IF NOT EXISTS distribution_strategy VARCHAR,
  ADD COLUMN IF NOT EXISTS risk_rating INTEGER,
  ADD COLUMN IF NOT EXISTS complex_features JSONB;

-- Equity Products table enhancement
ALTER TABLE equity_products
  ADD COLUMN IF NOT EXISTS ticker_symbol VARCHAR,
  ADD COLUMN IF NOT EXISTS company_name VARCHAR,
  ADD COLUMN IF NOT EXISTS exchange VARCHAR,
  ADD COLUMN IF NOT EXISTS sector_industry VARCHAR,
  ADD COLUMN IF NOT EXISTS market_capitalization NUMERIC,
  ADD COLUMN IF NOT EXISTS shares_outstanding NUMERIC,
  ADD COLUMN IF NOT EXISTS dividend_yield NUMERIC,
  ADD COLUMN IF NOT EXISTS earnings_per_share NUMERIC,
  ADD COLUMN IF NOT EXISTS price_earnings_ratio NUMERIC,
  ADD COLUMN IF NOT EXISTS currency VARCHAR,
  ADD COLUMN IF NOT EXISTS ipo_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delisting_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status VARCHAR, -- Will use product_status enum in future
  ADD COLUMN IF NOT EXISTS corporate_actions_history JSONB,
  ADD COLUMN IF NOT EXISTS dividend_payment_dates TIMESTAMPTZ[],
  ADD COLUMN IF NOT EXISTS acquisition_disposal_date TIMESTAMPTZ,
  -- Enhanced fields
  ADD COLUMN IF NOT EXISTS voting_rights VARCHAR,
  ADD COLUMN IF NOT EXISTS dividend_policy VARCHAR,
  ADD COLUMN IF NOT EXISTS dilution_protection TEXT[],
  ADD COLUMN IF NOT EXISTS exit_strategy VARCHAR;

-- Commodities Products table enhancement
ALTER TABLE commodities_products
  ADD COLUMN IF NOT EXISTS commodity_id VARCHAR,
  ADD COLUMN IF NOT EXISTS commodity_name VARCHAR,
  ADD COLUMN IF NOT EXISTS commodity_type VARCHAR,
  ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR,
  ADD COLUMN IF NOT EXISTS contract_size NUMERIC,
  ADD COLUMN IF NOT EXISTS grade_quality VARCHAR,
  ADD COLUMN IF NOT EXISTS exchange VARCHAR,
  ADD COLUMN IF NOT EXISTS delivery_months TEXT[],
  ADD COLUMN IF NOT EXISTS liquidity_metric NUMERIC,
  ADD COLUMN IF NOT EXISTS currency VARCHAR,
  ADD COLUMN IF NOT EXISTS contract_issue_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status VARCHAR, -- Will use product_status enum in future
  ADD COLUMN IF NOT EXISTS roll_history JSONB,
  ADD COLUMN IF NOT EXISTS storage_delivery_costs NUMERIC,
  ADD COLUMN IF NOT EXISTS production_inventory_levels NUMERIC[];

-- Fund Products table enhancement
ALTER TABLE fund_products
  ADD COLUMN IF NOT EXISTS fund_ticker VARCHAR,
  ADD COLUMN IF NOT EXISTS fund_name VARCHAR,
  ADD COLUMN IF NOT EXISTS fund_type VARCHAR,
  ADD COLUMN IF NOT EXISTS net_asset_value NUMERIC,
  ADD COLUMN IF NOT EXISTS assets_under_management NUMERIC,
  ADD COLUMN IF NOT EXISTS expense_ratio NUMERIC,
  ADD COLUMN IF NOT EXISTS benchmark_index VARCHAR,
  ADD COLUMN IF NOT EXISTS holdings JSONB,
  ADD COLUMN IF NOT EXISTS distribution_frequency VARCHAR,
  ADD COLUMN IF NOT EXISTS tracking_error NUMERIC,
  ADD COLUMN IF NOT EXISTS currency VARCHAR,
  ADD COLUMN IF NOT EXISTS inception_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closure_liquidation_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status VARCHAR, -- Will use product_status enum in future
  ADD COLUMN IF NOT EXISTS creation_redemption_history JSONB,
  ADD COLUMN IF NOT EXISTS performance_history JSONB,
  ADD COLUMN IF NOT EXISTS flow_data JSONB;

-- Bond Products table enhancement
ALTER TABLE bond_products
  ADD COLUMN IF NOT EXISTS bond_identifier VARCHAR,
  ADD COLUMN IF NOT EXISTS issuer_name VARCHAR,
  ADD COLUMN IF NOT EXISTS coupon_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS face_value NUMERIC,
  ADD COLUMN IF NOT EXISTS credit_rating VARCHAR,
  ADD COLUMN IF NOT EXISTS bond_type VARCHAR,
  ADD COLUMN IF NOT EXISTS callable_flag BOOLEAN,
  ADD COLUMN IF NOT EXISTS call_put_dates TIMESTAMPTZ[],
  ADD COLUMN IF NOT EXISTS yield_to_maturity NUMERIC,
  ADD COLUMN IF NOT EXISTS duration NUMERIC,
  ADD COLUMN IF NOT EXISTS currency VARCHAR,
  ADD COLUMN IF NOT EXISTS issue_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS maturity_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status VARCHAR, -- Will use product_status enum in future
  ADD COLUMN IF NOT EXISTS coupon_payment_history JSONB,
  ADD COLUMN IF NOT EXISTS redemption_call_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accrued_interest NUMERIC,
  -- Enhanced fields
  ADD COLUMN IF NOT EXISTS coupon_frequency VARCHAR,
  ADD COLUMN IF NOT EXISTS security_collateral VARCHAR,
  ADD COLUMN IF NOT EXISTS callable_features VARCHAR,
  ADD COLUMN IF NOT EXISTS call_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_price NUMERIC;

-- Create Quantitative Investment Strategies table if not exists
CREATE TABLE IF NOT EXISTS quantitative_investment_strategies_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  strategy_id VARCHAR,
  strategy_name VARCHAR,
  strategy_type VARCHAR,
  parameters JSONB,
  underlying_assets TEXT[],
  risk_metrics NUMERIC,
  benchmark VARCHAR,
  data_sources TEXT[],
  machine_learning_flags BOOLEAN,
  currency VARCHAR,
  inception_date TIMESTAMPTZ,
  termination_date TIMESTAMPTZ,
  status VARCHAR, -- Will use product_status enum in future
  backtest_history JSONB,
  adjustment_history JSONB,
  performance_attribution JSONB,
  target_raise NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Private Equity Products table enhancement
ALTER TABLE private_equity_products
  ADD COLUMN IF NOT EXISTS fund_id VARCHAR,
  ADD COLUMN IF NOT EXISTS fund_name VARCHAR,
  ADD COLUMN IF NOT EXISTS fund_type VARCHAR,
  ADD COLUMN IF NOT EXISTS fund_size NUMERIC,
  ADD COLUMN IF NOT EXISTS formation_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commitment_period INTEGER,
  ADD COLUMN IF NOT EXISTS capital_commitment NUMERIC,
  ADD COLUMN IF NOT EXISTS capital_call NUMERIC,
  ADD COLUMN IF NOT EXISTS invested_capital NUMERIC,
  ADD COLUMN IF NOT EXISTS management_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS carried_interest NUMERIC,
  ADD COLUMN IF NOT EXISTS hurdle_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS internal_rate_of_return NUMERIC,
  ADD COLUMN IF NOT EXISTS net_asset_value NUMERIC,
  ADD COLUMN IF NOT EXISTS distributed_to_paid_in NUMERIC,
  ADD COLUMN IF NOT EXISTS residual_value_to_paid_in NUMERIC,
  ADD COLUMN IF NOT EXISTS investment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exit_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exit_mechanism VARCHAR,
  ADD COLUMN IF NOT EXISTS portfolio_company_id VARCHAR,
  ADD COLUMN IF NOT EXISTS stage_of_development VARCHAR,
  ADD COLUMN IF NOT EXISTS financing_round VARCHAR,
  ADD COLUMN IF NOT EXISTS investment_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS valuation_pre_money NUMERIC,
  ADD COLUMN IF NOT EXISTS valuation_post_money NUMERIC,
  ADD COLUMN IF NOT EXISTS ownership_percentage NUMERIC,
  ADD COLUMN IF NOT EXISTS investor_type VARCHAR,
  ADD COLUMN IF NOT EXISTS status VARCHAR, -- Will use product_status enum in future
  -- Enhanced fields
  ADD COLUMN IF NOT EXISTS fund_vintage_year VARCHAR,
  ADD COLUMN IF NOT EXISTS investment_stage VARCHAR,
  ADD COLUMN IF NOT EXISTS sector_focus VARCHAR,
  ADD COLUMN IF NOT EXISTS geographic_focus VARCHAR;

-- Private Debt Products table enhancement
ALTER TABLE private_debt_products
  ADD COLUMN IF NOT EXISTS deal_id VARCHAR,
  ADD COLUMN IF NOT EXISTS opportunity_source VARCHAR,
  ADD COLUMN IF NOT EXISTS industry_sector VARCHAR,
  ADD COLUMN IF NOT EXISTS company_name VARCHAR,
  ADD COLUMN IF NOT EXISTS deal_size NUMERIC,
  ADD COLUMN IF NOT EXISTS screening_status VARCHAR,
  ADD COLUMN IF NOT EXISTS due_diligence_status VARCHAR,
  ADD COLUMN IF NOT EXISTS financial_metrics JSONB,
  ADD COLUMN IF NOT EXISTS risk_profile VARCHAR,
  ADD COLUMN IF NOT EXISTS valuation_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS deal_structure_details VARCHAR,
  ADD COLUMN IF NOT EXISTS transaction_status VARCHAR,
  ADD COLUMN IF NOT EXISTS execution_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portfolio_performance_metrics JSONB,
  ADD COLUMN IF NOT EXISTS compliance_status VARCHAR,
  ADD COLUMN IF NOT EXISTS monitoring_frequency INTEGER,
  ADD COLUMN IF NOT EXISTS advisory_service_type VARCHAR,
  ADD COLUMN IF NOT EXISTS exit_strategy_status VARCHAR,
  ADD COLUMN IF NOT EXISTS outcome VARCHAR,
  ADD COLUMN IF NOT EXISTS status VARCHAR; -- Will use product_status enum in future

-- Real Estate Products table enhancement
ALTER TABLE real_estate_products
  ADD COLUMN IF NOT EXISTS property_id VARCHAR,
  ADD COLUMN IF NOT EXISTS property_name VARCHAR,
  ADD COLUMN IF NOT EXISTS property_address VARCHAR,
  ADD COLUMN IF NOT EXISTS property_type VARCHAR,
  ADD COLUMN IF NOT EXISTS acquisition_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS building VARCHAR,
  ADD COLUMN IF NOT EXISTS unit VARCHAR,
  ADD COLUMN IF NOT EXISTS area_type VARCHAR,
  ADD COLUMN IF NOT EXISTS units NUMERIC,
  ADD COLUMN IF NOT EXISTS lease_number VARCHAR,
  ADD COLUMN IF NOT EXISTS tenant VARCHAR,
  ADD COLUMN IF NOT EXISTS lease_begin_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lease_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lease_manager VARCHAR,
  ADD COLUMN IF NOT EXISTS lease_classification VARCHAR,
  ADD COLUMN IF NOT EXISTS borrowing_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS asset_number VARCHAR,
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS billing_frequency VARCHAR,
  ADD COLUMN IF NOT EXISTS starting_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ending_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status VARCHAR, -- Will use product_status enum in future
  ADD COLUMN IF NOT EXISTS disposition_date TIMESTAMPTZ,
  -- Enhanced fields
  ADD COLUMN IF NOT EXISTS geographic_location VARCHAR,
  ADD COLUMN IF NOT EXISTS development_stage VARCHAR,
  ADD COLUMN IF NOT EXISTS environmental_certifications VARCHAR;

-- Energy Products table enhancement
ALTER TABLE energy_products
  ADD COLUMN IF NOT EXISTS project_id VARCHAR,
  ADD COLUMN IF NOT EXISTS project_name VARCHAR,
  ADD COLUMN IF NOT EXISTS project_type VARCHAR,
  ADD COLUMN IF NOT EXISTS capacity NUMERIC,
  ADD COLUMN IF NOT EXISTS project_status VARCHAR,
  ADD COLUMN IF NOT EXISTS site_id VARCHAR,
  ADD COLUMN IF NOT EXISTS site_location VARCHAR,
  ADD COLUMN IF NOT EXISTS owner VARCHAR,
  ADD COLUMN IF NOT EXISTS electricity_purchaser VARCHAR,
  ADD COLUMN IF NOT EXISTS land_type VARCHAR,
  ADD COLUMN IF NOT EXISTS expected_online_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS financial_data JSONB,
  ADD COLUMN IF NOT EXISTS regulatory_compliance VARCHAR,
  ADD COLUMN IF NOT EXISTS timeline_data JSONB,
  ADD COLUMN IF NOT EXISTS field_service_logs TEXT,
  ADD COLUMN IF NOT EXISTS performance_metrics JSONB,
  ADD COLUMN IF NOT EXISTS receivable_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS decommission_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status VARCHAR, -- Will use product_status enum in future
  -- Enhanced fields
  ADD COLUMN IF NOT EXISTS project_capacity_mw NUMERIC,
  ADD COLUMN IF NOT EXISTS power_purchase_agreements VARCHAR,
  ADD COLUMN IF NOT EXISTS regulatory_approvals VARCHAR,
  ADD COLUMN IF NOT EXISTS carbon_offset_potential VARCHAR;

-- Infrastructure Products table enhancement
ALTER TABLE infrastructure_products
  ADD COLUMN IF NOT EXISTS asset_id VARCHAR,
  ADD COLUMN IF NOT EXISTS asset_type VARCHAR,
  ADD COLUMN IF NOT EXISTS design_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS procurement_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS condition_score INTEGER,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS maintenance_backlog INTEGER,
  ADD COLUMN IF NOT EXISTS performance_metrics JSONB,
  ADD COLUMN IF NOT EXISTS mean_time_between_failure NUMERIC,
  ADD COLUMN IF NOT EXISTS rehabilitation_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replacement_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cost_of_replacement NUMERIC,
  ADD COLUMN IF NOT EXISTS inspection_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS safety_incidents INTEGER,
  ADD COLUMN IF NOT EXISTS status VARCHAR; -- Will use product_status enum in future

-- Collectibles Products table enhancement
ALTER TABLE collectibles_products
  ADD COLUMN IF NOT EXISTS asset_id VARCHAR,
  ADD COLUMN IF NOT EXISTS asset_type VARCHAR,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC,
  ADD COLUMN IF NOT EXISTS current_value NUMERIC,
  ADD COLUMN IF NOT EXISTS condition VARCHAR,
  ADD COLUMN IF NOT EXISTS location VARCHAR,
  ADD COLUMN IF NOT EXISTS owner VARCHAR,
  ADD COLUMN IF NOT EXISTS insurance_details NUMERIC,
  ADD COLUMN IF NOT EXISTS appraisal_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sale_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC,
  ADD COLUMN IF NOT EXISTS status VARCHAR; -- Will use product_status enum in future

-- Asset Backed Products table enhancement
ALTER TABLE asset_backed_products
  ADD COLUMN IF NOT EXISTS asset_number VARCHAR,
  ADD COLUMN IF NOT EXISTS asset_type VARCHAR,
  ADD COLUMN IF NOT EXISTS origination_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS maturity_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interest_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS accrual_type VARCHAR,
  ADD COLUMN IF NOT EXISTS lien_position VARCHAR,
  ADD COLUMN IF NOT EXISTS payment_frequency VARCHAR,
  ADD COLUMN IF NOT EXISTS current_balance NUMERIC,
  ADD COLUMN IF NOT EXISTS modification_indicator BOOLEAN,
  ADD COLUMN IF NOT EXISTS prepayment_penalty NUMERIC,
  ADD COLUMN IF NOT EXISTS delinquency_status INTEGER,
  ADD COLUMN IF NOT EXISTS repurchase_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS demand_resolution_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS repurchaser VARCHAR,
  ADD COLUMN IF NOT EXISTS status VARCHAR, -- Will use product_status enum in future
  -- Enhanced fields
  ADD COLUMN IF NOT EXISTS debtor_credit_quality VARCHAR,
  ADD COLUMN IF NOT EXISTS collection_period_days INTEGER,
  ADD COLUMN IF NOT EXISTS recovery_rate_percentage NUMERIC,
  ADD COLUMN IF NOT EXISTS diversification_metrics VARCHAR;

-- Create Digital Tokenized Fund table if not exists
CREATE TABLE IF NOT EXISTS digital_tokenized_fund_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  asset_name VARCHAR,
  asset_symbol VARCHAR,
  asset_type VARCHAR,
  issuer VARCHAR,
  blockchain_network VARCHAR,
  smart_contract_address VARCHAR,
  issuance_date TIMESTAMPTZ,
  total_supply NUMERIC,
  circulating_supply NUMERIC,
  nav NUMERIC,
  fractionalization_enabled BOOLEAN,
  compliance_rules TEXT,
  permission_controls TEXT,
  embedded_rights TEXT,
  provenance_history_enabled BOOLEAN,
  status VARCHAR, -- Will use product_status enum in future
  target_raise NUMERIC,
  -- Enhanced fields
  token_economics VARCHAR,
  custody_arrangements VARCHAR,
  upgrade_governance VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stablecoin Products table enhancement
ALTER TABLE stablecoin_products
  ADD COLUMN IF NOT EXISTS asset_name VARCHAR,
  ADD COLUMN IF NOT EXISTS asset_symbol VARCHAR,
  ADD COLUMN IF NOT EXISTS asset_type VARCHAR,
  ADD COLUMN IF NOT EXISTS issuer VARCHAR,
  ADD COLUMN IF NOT EXISTS blockchain_network VARCHAR,
  ADD COLUMN IF NOT EXISTS smart_contract_address VARCHAR,
  ADD COLUMN IF NOT EXISTS issuance_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_supply NUMERIC,
  ADD COLUMN IF NOT EXISTS circulating_supply NUMERIC,
  ADD COLUMN IF NOT EXISTS peg_value NUMERIC,
  ADD COLUMN IF NOT EXISTS fractionalization_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS compliance_rules TEXT,
  ADD COLUMN IF NOT EXISTS collateral_type VARCHAR,
  ADD COLUMN IF NOT EXISTS collateral_ratio NUMERIC,
  ADD COLUMN IF NOT EXISTS overcollateralization_threshold NUMERIC,
  ADD COLUMN IF NOT EXISTS liquidation_terms TEXT,
  ADD COLUMN IF NOT EXISTS stability_mechanism TEXT,
  ADD COLUMN IF NOT EXISTS rebase_frequency VARCHAR,
  ADD COLUMN IF NOT EXISTS algorithm_description TEXT,
  ADD COLUMN IF NOT EXISTS embedded_rights TEXT,
  ADD COLUMN IF NOT EXISTS provenance_history_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS status VARCHAR, -- Will use product_status enum in future
  -- Enhanced fields
  ADD COLUMN IF NOT EXISTS collateral_type_enum VARCHAR, -- Will use stablecoin_collateral_type enum in future
  ADD COLUMN IF NOT EXISTS reserve_management_policy VARCHAR,
  ADD COLUMN IF NOT EXISTS audit_frequency VARCHAR,
  ADD COLUMN IF NOT EXISTS redemption_mechanism VARCHAR,
  ADD COLUMN IF NOT EXISTS depeg_risk_mitigation TEXT[],
  -- Fiat-backed specific
  ADD COLUMN IF NOT EXISTS reserve_assets TEXT[],
  ADD COLUMN IF NOT EXISTS reserve_audit_frequency VARCHAR,
  ADD COLUMN IF NOT EXISTS reserve_custodian VARCHAR,
  ADD COLUMN IF NOT EXISTS reserve_insurance BOOLEAN,
  -- Crypto-backed specific
  ADD COLUMN IF NOT EXISTS collateral_assets TEXT[],
  ADD COLUMN IF NOT EXISTS minimum_collateralization_ratio NUMERIC,
  ADD COLUMN IF NOT EXISTS liquidation_penalty NUMERIC,
  ADD COLUMN IF NOT EXISTS oracle_provider VARCHAR,
  ADD COLUMN IF NOT EXISTS interest_rate NUMERIC,
  -- Commodity-backed specific
  ADD COLUMN IF NOT EXISTS commodity_type VARCHAR,
  ADD COLUMN IF NOT EXISTS storage_provider VARCHAR,
  ADD COLUMN IF NOT EXISTS physical_redemption BOOLEAN,
  ADD COLUMN IF NOT EXISTS redemption_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS audit_provider VARCHAR,
  -- Algorithmic specific
  ADD COLUMN IF NOT EXISTS algorithm_type VARCHAR,
  ADD COLUMN IF NOT EXISTS secondary_token_symbol VARCHAR,
  ADD COLUMN IF NOT EXISTS expansion_mechanism VARCHAR,
  ADD COLUMN IF NOT EXISTS contraction_mechanism VARCHAR,
  ADD COLUMN IF NOT EXISTS governance_token VARCHAR,
  -- Rebasing specific
  ADD COLUMN IF NOT EXISTS rebase_oracle VARCHAR,
  ADD COLUMN IF NOT EXISTS positive_rebase_limit NUMERIC,
  ADD COLUMN IF NOT EXISTS negative_rebase_limit NUMERIC,
  ADD COLUMN IF NOT EXISTS rebase_governance VARCHAR;

-- Create Stablecoin Collateral table for tracking multiple collateral assets
CREATE TABLE IF NOT EXISTS stablecoin_collateral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stablecoin_id UUID NOT NULL REFERENCES stablecoin_products(id),
  collateral_asset VARCHAR NOT NULL,
  backing_amount NUMERIC NOT NULL,
  custodian VARCHAR,
  auditor VARCHAR,
  last_audit_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enhance lifecycle events table with additional fields and documentation
COMMENT ON TABLE product_lifecycle_events IS 'Tracks lifecycle events for all product types';
COMMENT ON COLUMN product_lifecycle_events.event_type IS 'Type of event (e.g., issuance, maturity, redemption, call, rebase)';
COMMENT ON COLUMN product_lifecycle_events.status IS 'Status of the event (e.g., Pending, Success, Failed)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_structured_products_project_id ON structured_products(project_id);
CREATE INDEX IF NOT EXISTS idx_equity_products_project_id ON equity_products(project_id);
CREATE INDEX IF NOT EXISTS idx_commodities_products_project_id ON commodities_products(project_id);
CREATE INDEX IF NOT EXISTS idx_fund_products_project_id ON fund_products(project_id);
CREATE INDEX IF NOT EXISTS idx_bond_products_project_id ON bond_products(project_id);
CREATE INDEX IF NOT EXISTS idx_private_equity_products_project_id ON private_equity_products(project_id);
CREATE INDEX IF NOT EXISTS idx_private_debt_products_project_id ON private_debt_products(project_id);
CREATE INDEX IF NOT EXISTS idx_real_estate_products_project_id ON real_estate_products(project_id);
CREATE INDEX IF NOT EXISTS idx_energy_products_project_id ON energy_products(project_id);
CREATE INDEX IF NOT EXISTS idx_infrastructure_products_project_id ON infrastructure_products(project_id);
CREATE INDEX IF NOT EXISTS idx_collectibles_products_project_id ON collectibles_products(project_id);
CREATE INDEX IF NOT EXISTS idx_asset_backed_products_project_id ON asset_backed_products(project_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_product_id ON product_lifecycle_events(product_id);
