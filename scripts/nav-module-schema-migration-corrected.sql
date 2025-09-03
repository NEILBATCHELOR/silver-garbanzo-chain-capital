-- NAV Module Database Schema Migration
-- This script creates the necessary tables and indexes for the NAV engine
-- Execute this script to set up the database schema before implementing the NAV module
-- Author: Chain Capital Development Team
-- Date: 2025-01-09

-- Ensure we're working in the public schema
SET search_path TO public;

-- Create nav_calculation_runs table
-- Purpose: Track NAV calculation processes and runs
CREATE TABLE IF NOT EXISTS nav_calculation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    product_type TEXT NOT NULL,
    project_id UUID NULL REFERENCES projects(id) ON DELETE CASCADE,
    valuation_date DATE NOT NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ NULL,
    status TEXT NOT NULL CHECK (status IN ('queued','running','failed','completed')) DEFAULT 'queued',
    inputs_json JSONB,
    result_nav_value NUMERIC(18,6) NULL,
    nav_per_share NUMERIC(18,6) NULL,
    fx_rate_used NUMERIC(18,6) NULL,
    pricing_sources JSONB NULL,
    error_message TEXT NULL,
    created_by UUID NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for nav_calculation_runs
CREATE INDEX IF NOT EXISTS idx_nav_calc_runs_asset_date ON nav_calculation_runs (asset_id, valuation_date);
CREATE INDEX IF NOT EXISTS idx_nav_calc_runs_status ON nav_calculation_runs (status);
CREATE INDEX IF NOT EXISTS idx_nav_calc_runs_project_date ON nav_calculation_runs (project_id, valuation_date);
CREATE INDEX IF NOT EXISTS idx_nav_calc_runs_created_at ON nav_calculation_runs (created_at);

-- Add table comment
COMMENT ON TABLE nav_calculation_runs IS 'Tracks NAV calculation processes including inputs, outputs, and execution status for all asset types';

-- Create nav_validation_results table
-- Purpose: Store validation rule results for each NAV calculation run
CREATE TABLE IF NOT EXISTS nav_validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES nav_calculation_runs(id) ON DELETE CASCADE,
    rule_code TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info','warn','error')),
    passed BOOLEAN NOT NULL,
    details_json JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for nav_validation_results
CREATE INDEX IF NOT EXISTS idx_nav_validation_run ON nav_validation_results (run_id);
CREATE INDEX IF NOT EXISTS idx_nav_validation_rule_severity ON nav_validation_results (rule_code, severity);

-- Add table comment
COMMENT ON TABLE nav_validation_results IS 'Stores validation rule results for NAV calculations including pass/fail status and details';

-- Create nav_approvals table
-- Purpose: Approval workflow for NAV data with state transitions
CREATE TABLE IF NOT EXISTS nav_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES nav_calculation_runs(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('draft','validated','approved','rejected','published')) DEFAULT 'draft',
    requested_by UUID NOT NULL,
    validated_by UUID NULL,
    approved_by UUID NULL,
    approved_at TIMESTAMPTZ NULL,
    comments TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for nav_approvals
CREATE INDEX IF NOT EXISTS idx_nav_approvals_run_status ON nav_approvals (run_id, status);
CREATE INDEX IF NOT EXISTS idx_nav_approvals_status ON nav_approvals (status);
CREATE INDEX IF NOT EXISTS idx_nav_approvals_requested_by ON nav_approvals (requested_by);

-- Add table comment
COMMENT ON TABLE nav_approvals IS 'Manages approval workflow for NAV calculations with state transitions and audit trail';

-- Create nav_redemptions table
-- Purpose: Track redemption rates and activity for assets
CREATE TABLE IF NOT EXISTS nav_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    product_type TEXT NOT NULL,
    as_of_date DATE NOT NULL,
    shares_redeemed NUMERIC(78,18) NOT NULL DEFAULT 0,
    value_redeemed NUMERIC(78,18) NOT NULL DEFAULT 0,
    redemption_rate NUMERIC(18,6) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(asset_id, as_of_date)
);

-- Create indexes for nav_redemptions
CREATE INDEX IF NOT EXISTS idx_nav_redemptions_asset_date ON nav_redemptions (asset_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_nav_redemptions_product_type ON nav_redemptions (product_type);

-- Add table comment
COMMENT ON TABLE nav_redemptions IS 'Tracks daily redemption rates and activity for assets and products';

-- Create nav_fx_rates table
-- Purpose: Store foreign exchange rates for multi-currency NAV calculations
CREATE TABLE IF NOT EXISTS nav_fx_rates (
    base_ccy TEXT NOT NULL,
    quote_ccy TEXT NOT NULL,
    rate NUMERIC(18,8) NOT NULL,
    as_of TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'chainlink',
    
    PRIMARY KEY (base_ccy, quote_ccy, as_of)
);

-- Create indexes for nav_fx_rates
CREATE INDEX IF NOT EXISTS idx_nav_fx_rates_currencies ON nav_fx_rates (base_ccy, quote_ccy);
CREATE INDEX IF NOT EXISTS idx_nav_fx_rates_as_of ON nav_fx_rates (as_of);

-- Add table comment
COMMENT ON TABLE nav_fx_rates IS 'Stores foreign exchange rates for multi-currency NAV calculations with historical data';

-- Create nav_price_cache table (Optional)
-- Purpose: Cache market prices for performance optimization
CREATE TABLE IF NOT EXISTS nav_price_cache (
    instrument_key TEXT NOT NULL,
    price NUMERIC(18,6) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    as_of TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL,
    
    PRIMARY KEY (instrument_key, source, as_of)
);

-- Create indexes for nav_price_cache
CREATE INDEX IF NOT EXISTS idx_nav_price_cache_instrument ON nav_price_cache (instrument_key);
CREATE INDEX IF NOT EXISTS idx_nav_price_cache_as_of ON nav_price_cache (as_of);

-- Add table comment
COMMENT ON TABLE nav_price_cache IS 'Caches market prices for instruments to optimize NAV calculation performance';

-- Add missing indexes for existing asset_nav_data table
-- Note: These might already exist, using IF NOT EXISTS to be safe
CREATE INDEX IF NOT EXISTS idx_asset_nav_data_asset_date ON asset_nav_data (asset_id, date);
CREATE INDEX IF NOT EXISTS idx_asset_nav_data_project_date ON asset_nav_data (project_id, date);
CREATE INDEX IF NOT EXISTS idx_asset_nav_data_source_status ON asset_nav_data (source, validated);
CREATE INDEX IF NOT EXISTS idx_asset_nav_data_created_at ON asset_nav_data (created_at);

-- Add missing indexes for existing asset_holdings table
CREATE INDEX IF NOT EXISTS idx_asset_holdings_asset_id ON asset_holdings (asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_holdings_updated_at ON asset_holdings (updated_at);
CREATE INDEX IF NOT EXISTS idx_asset_holdings_maturity_date ON asset_holdings (maturity_date);

-- CRITICAL FIX: Drop the existing function first because we're changing the parameter name
-- from p_project_type to p_product_type
DROP FUNCTION IF EXISTS public.get_product_table_name(TEXT);

-- Create a function to get product table name based on product type
-- Use explicit schema qualification and use parameter name p_product_type (changed from p_project_type)
CREATE OR REPLACE FUNCTION public.get_product_table_name(p_product_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE p_product_type
        WHEN 'fund' THEN 'fund_products'
        WHEN 'bond' THEN 'bond_products'
        WHEN 'equity' THEN 'equity_products'
        WHEN 'commodity' THEN 'commodities_products'
        WHEN 'structured' THEN 'structured_products'
        WHEN 'quantitative' THEN 'quantitative_investment_strategies_products'
        WHEN 'private_equity' THEN 'private_equity_products'
        WHEN 'private_debt' THEN 'private_debt_products'
        WHEN 'real_estate' THEN 'real_estate_products'
        WHEN 'energy' THEN 'energy_products'
        WHEN 'infrastructure' THEN 'infrastructure_products'
        WHEN 'collectible' THEN 'collectibles_products'
        WHEN 'asset_backed' THEN 'asset_backed_products'
        WHEN 'digital_fund' THEN 'digital_tokenized_fund_products'
        WHEN 'stablecoin' THEN 'stablecoin_products'
        ELSE NULL
    END;
END;
$$;

-- Create a view to get all NAV data with validation and approval status
CREATE OR REPLACE VIEW nav_data_with_status AS
SELECT 
    nav.id,
    nav.asset_id,
    nav.project_id,
    nav.date,
    nav.nav,
    nav.total_assets,
    nav.asset_name,
    nav.total_liabilities,
    nav.outstanding_shares,
    nav.previous_nav,
    nav.change_amount,
    nav.change_percent,
    nav.source,
    nav.validated,
    nav.validated_by,
    nav.validated_at,
    nav.notes,
    nav.calculation_method,
    nav.market_conditions,
    nav.created_at,
    nav.updated_at,
    nav.created_by,
    nav.calculated_nav,
    -- Add calculation run information
    runs.id AS run_id,
    runs.status AS run_status,
    runs.started_at AS run_started_at,
    runs.completed_at AS run_completed_at,
    runs.product_type,
    -- Add approval information
    approvals.status AS approval_status,
    approvals.approved_by,
    approvals.approved_at,
    approvals.comments AS approval_comments,
    -- Add validation summary
    CASE 
        WHEN validation_summary.total_validations = 0 THEN 'no_validations'
        WHEN validation_summary.failed_validations = 0 THEN 'all_passed'
        WHEN validation_summary.error_validations > 0 THEN 'errors_present'
        ELSE 'warnings_present'
    END AS validation_status,
    validation_summary.total_validations,
    validation_summary.failed_validations,
    validation_summary.error_validations
FROM asset_nav_data nav
LEFT JOIN nav_calculation_runs runs ON runs.asset_id = nav.asset_id AND runs.valuation_date = nav.date
LEFT JOIN nav_approvals approvals ON approvals.run_id = runs.id
LEFT JOIN (
    SELECT 
        run_id,
        COUNT(*) AS total_validations,
        COUNT(*) FILTER (WHERE NOT passed) AS failed_validations,
        COUNT(*) FILTER (WHERE NOT passed AND severity = 'error') AS error_validations
    FROM nav_validation_results
    GROUP BY run_id
) validation_summary ON validation_summary.run_id = runs.id;

-- Add comment to the view
COMMENT ON VIEW nav_data_with_status IS 'Comprehensive view of NAV data including calculation run status, validation results, and approval workflow status';

-- Create a function to calculate weighted average NAV for a project
CREATE OR REPLACE FUNCTION calculate_project_weighted_nav(p_project_id UUID, p_date DATE)
RETURNS NUMERIC(18,6)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    weighted_nav NUMERIC(18,6);
BEGIN
    SELECT 
        CASE 
            WHEN SUM(total_assets) = 0 THEN 0
            ELSE SUM(nav * total_assets) / SUM(total_assets)
        END
    INTO weighted_nav
    FROM asset_nav_data
    WHERE project_id = p_project_id
    AND date = p_date
    AND validated = true;
    
    RETURN COALESCE(weighted_nav, 0);
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION calculate_project_weighted_nav IS 'Calculates the asset-weighted average NAV for all validated assets in a project on a specific date';

-- Grant necessary permissions (adjust as needed for your user roles)
-- These are examples - modify based on your actual role structure
-- GRANT SELECT, INSERT, UPDATE ON nav_calculation_runs TO nav_user;
-- GRANT SELECT, INSERT, UPDATE ON nav_validation_results TO nav_user;
-- GRANT SELECT, INSERT, UPDATE ON nav_approvals TO nav_user;
-- GRANT SELECT, INSERT, UPDATE ON nav_redemptions TO nav_user;
-- GRANT SELECT, INSERT, UPDATE ON nav_fx_rates TO nav_user;
-- GRANT SELECT, INSERT, UPDATE ON nav_price_cache TO nav_user;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply the trigger to tables that need it (if they don't have updated_at already)
-- Note: asset_nav_data already has this functionality, so we skip it

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'NAV Module database schema migration completed successfully!';
    RAISE NOTICE 'Created tables: nav_calculation_runs, nav_validation_results, nav_approvals, nav_redemptions, nav_fx_rates, nav_price_cache';
    RAISE NOTICE 'Created indexes for performance optimization';
    RAISE NOTICE 'Created view: nav_data_with_status';
    RAISE NOTICE 'Created functions: get_product_table_name, calculate_project_weighted_nav';
    RAISE NOTICE 'FIXED: Properly dropped and recreated get_product_table_name function with correct parameter name';
    RAISE NOTICE 'Ready to implement NAV module backend services';
END;
$$;
