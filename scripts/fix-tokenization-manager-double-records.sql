-- Fix TokenizationManager Double Records Issue
-- Date: August 21, 2025
-- Issue: TokenizationManager.tsx creating duplicate tokens in tokens table

-- Step 1: Clean up existing duplicate records
-- First, identify and remove the duplicate token (keeping the first one)
DELETE FROM tokens 
WHERE id = '88c8e979-447c-4acc-ba11-fc5b35adc0da'
AND name = 'Hypo Fund Pool A Token' 
AND symbol = 'RCV3';

-- Step 2: Add database-level duplicate prevention
-- Create unique constraint to prevent duplicate tokens per project
ALTER TABLE tokens 
ADD CONSTRAINT unique_token_per_project 
UNIQUE (project_id, name, symbol);

-- Step 3: Add index for better performance on duplicate checking
CREATE INDEX IF NOT EXISTS idx_tokens_project_name_symbol 
ON tokens (project_id, name, symbol);

-- Step 4: Add index for factoring tokens specifically
CREATE INDEX IF NOT EXISTS idx_tokens_factoring_metadata 
ON tokens USING GIN ((metadata->'factoring')) 
WHERE (metadata->>'factoring') IS NOT NULL;

-- Verification queries
-- Check for remaining duplicates
SELECT 
  project_id, name, symbol, COUNT(*) as duplicate_count
FROM tokens 
GROUP BY project_id, name, symbol 
HAVING COUNT(*) > 1;

-- Verify constraint was added
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'tokens' 
AND constraint_type = 'UNIQUE';
