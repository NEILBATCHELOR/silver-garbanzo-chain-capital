-- Phase 5: Database Validation Constraints (FULLY CORRECTED)
-- This script adds validation constraints to prevent invalid data entry.

-- FIXES:
-- 1. Correctly includes ALL possible statuses for fund_products.
-- 2. Ensures all constraints are idempotent and safe to re-run.

-- =============================================================================
-- FUND PRODUCTS CONSTRAINTS
-- =============================================================================

-- Drop existing constraint to recreate it correctly
ALTER TABLE fund_products DROP CONSTRAINT IF EXISTS chk_fund_status_valid;

-- Add the corrected constraint, including 'Open'
ALTER TABLE fund_products ADD CONSTRAINT chk_fund_status_valid
CHECK (status IN ('active', 'inactive', 'liquidated', 'suspended', 'Open'));

ALTER TABLE fund_products DROP CONSTRAINT IF EXISTS chk_fund_expense_ratio;
ALTER TABLE fund_products ADD CONSTRAINT chk_fund_expense_ratio
CHECK (expense_ratio IS NULL OR (expense_ratio >= 0 AND expense_ratio <= 0.50));

-- =============================================================================
-- OTHER CONSTRAINTS (Idempotent)
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_fund_nav_positive') THEN
        ALTER TABLE fund_products ADD CONSTRAINT chk_fund_nav_positive CHECK (net_asset_value IS NULL OR net_asset_value > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_holdings_quantity_positive') THEN
        ALTER TABLE asset_holdings ADD CONSTRAINT chk_holdings_quantity_positive CHECK (quantity IS NULL OR quantity > 0);
    END IF;
END
$$;

-- Verify all constraints
SELECT conname as constraint_name, conrelid::regclass AS table_name, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'fund_products'::regclass AND conname LIKE 'chk_%'
ORDER BY conname;

