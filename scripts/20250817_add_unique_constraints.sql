-- Migration: 20250817_add_unique_constraints.sql
-- Description: Adds explicit unique constraints to all product tables to ensure one product per project

-- Make sure we have the right schema
SET search_path TO public;

-- Helper comment function
CREATE OR REPLACE FUNCTION add_unique_constraint_comment(table_name text) RETURNS void AS $$
BEGIN
  EXECUTE 'COMMENT ON CONSTRAINT ' || table_name || '_project_id_key ON ' || table_name || ' IS ''Ensures only one product per project in this table''';
END;
$$ LANGUAGE plpgsql;

-- Add explicit unique constraints to all product tables
-- Structured Products
ALTER TABLE structured_products 
  DROP CONSTRAINT IF EXISTS structured_products_project_id_key,
  ADD CONSTRAINT structured_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('structured_products');

-- Equity Products
ALTER TABLE equity_products 
  DROP CONSTRAINT IF EXISTS equity_products_project_id_key,
  ADD CONSTRAINT equity_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('equity_products');

-- Commodities Products
ALTER TABLE commodities_products 
  DROP CONSTRAINT IF EXISTS commodities_products_project_id_key,
  ADD CONSTRAINT commodities_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('commodities_products');

-- Fund Products
ALTER TABLE fund_products 
  DROP CONSTRAINT IF EXISTS fund_products_project_id_key,
  ADD CONSTRAINT fund_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('fund_products');

-- Bond Products
ALTER TABLE bond_products 
  DROP CONSTRAINT IF EXISTS bond_products_project_id_key,
  ADD CONSTRAINT bond_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('bond_products');

-- Quantitative Investment Strategies Products
ALTER TABLE quantitative_investment_strategies_products 
  DROP CONSTRAINT IF EXISTS quantitative_investment_strategies_products_project_id_key,
  ADD CONSTRAINT quantitative_investment_strategies_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('quantitative_investment_strategies_products');

-- Private Equity Products
ALTER TABLE private_equity_products 
  DROP CONSTRAINT IF EXISTS private_equity_products_project_id_key,
  ADD CONSTRAINT private_equity_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('private_equity_products');

-- Private Debt Products
ALTER TABLE private_debt_products 
  DROP CONSTRAINT IF EXISTS private_debt_products_project_id_key,
  ADD CONSTRAINT private_debt_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('private_debt_products');

-- Real Estate Products
ALTER TABLE real_estate_products 
  DROP CONSTRAINT IF EXISTS real_estate_products_project_id_key,
  ADD CONSTRAINT real_estate_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('real_estate_products');

-- Energy Products
ALTER TABLE energy_products 
  DROP CONSTRAINT IF EXISTS energy_products_project_id_key,
  ADD CONSTRAINT energy_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('energy_products');

-- Infrastructure Products
ALTER TABLE infrastructure_products 
  DROP CONSTRAINT IF EXISTS infrastructure_products_project_id_key,
  ADD CONSTRAINT infrastructure_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('infrastructure_products');

-- Collectibles Products
ALTER TABLE collectibles_products 
  DROP CONSTRAINT IF EXISTS collectibles_products_project_id_key,
  ADD CONSTRAINT collectibles_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('collectibles_products');

-- Asset Backed Products
ALTER TABLE asset_backed_products 
  DROP CONSTRAINT IF EXISTS asset_backed_products_project_id_key,
  ADD CONSTRAINT asset_backed_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('asset_backed_products');

-- Digital Tokenized Fund Products
ALTER TABLE digital_tokenized_fund_products 
  DROP CONSTRAINT IF EXISTS digital_tokenized_fund_products_project_id_key,
  ADD CONSTRAINT digital_tokenized_fund_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('digital_tokenized_fund_products');

-- Stablecoin Products
ALTER TABLE stablecoin_products 
  DROP CONSTRAINT IF EXISTS stablecoin_products_project_id_key,
  ADD CONSTRAINT stablecoin_products_project_id_key UNIQUE (project_id);
SELECT add_unique_constraint_comment('stablecoin_products');

-- Clean up the helper function
DROP FUNCTION IF EXISTS add_unique_constraint_comment(text);

-- Add comment to explain the uniqueness constraint business rule
COMMENT ON TABLE asset_backed_products IS 'Asset-backed securities and receivables products with unique constraint on project_id to ensure one product per project';
