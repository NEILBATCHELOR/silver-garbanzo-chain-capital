-- Migration to add missing fields to projects table

-- First, ensure we're working with the right schema
SET search_path TO public;

-- Add date fields
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS subscription_start_date DATE,
ADD COLUMN IF NOT EXISTS subscription_end_date DATE,
ADD COLUMN IF NOT EXISTS transaction_start_date DATE,
ADD COLUMN IF NOT EXISTS maturity_date DATE;

-- Add financial fields (using numeric for monetary values)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS total_notional NUMERIC,
ADD COLUMN IF NOT EXISTS authorized_shares NUMERIC,
ADD COLUMN IF NOT EXISTS share_price NUMERIC,
ADD COLUMN IF NOT EXISTS company_valuation NUMERIC,
ADD COLUMN IF NOT EXISTS minimum_investment NUMERIC,
ADD COLUMN IF NOT EXISTS estimated_yield_percentage NUMERIC;

-- Add string fields
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS token_symbol TEXT,
ADD COLUMN IF NOT EXISTS legal_entity TEXT,
ADD COLUMN IF NOT EXISTS jurisdiction TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS duration TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add comments to document fields
COMMENT ON COLUMN projects.subscription_start_date IS 'Date when investors can start subscribing';
COMMENT ON COLUMN projects.subscription_end_date IS 'Date when the subscription period closes';
COMMENT ON COLUMN projects.transaction_start_date IS 'Date when the investment period begins';
COMMENT ON COLUMN projects.maturity_date IS 'Date when the investment reaches maturity';
COMMENT ON COLUMN projects.total_notional IS 'Total notional amount of the project';
COMMENT ON COLUMN projects.authorized_shares IS 'Number of authorized shares';
COMMENT ON COLUMN projects.share_price IS 'Price per share';
COMMENT ON COLUMN projects.company_valuation IS 'Valuation of the company';
COMMENT ON COLUMN projects.minimum_investment IS 'Minimum investment amount';
COMMENT ON COLUMN projects.estimated_yield_percentage IS 'Estimated yield percentage';
COMMENT ON COLUMN projects.token_symbol IS 'Symbol for the token (if applicable)';
COMMENT ON COLUMN projects.legal_entity IS 'Legal entity name';
COMMENT ON COLUMN projects.jurisdiction IS 'Legal jurisdiction';
COMMENT ON COLUMN projects.tax_id IS 'Tax identification number';
COMMENT ON COLUMN projects.duration IS 'Project duration (e.g., "12_months")';
COMMENT ON COLUMN projects.currency IS 'Currency for all financial values';
