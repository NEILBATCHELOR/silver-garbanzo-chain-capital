-- TOKENIZATION MANAGER DUPLICATE PREVENTION DATABASE MIGRATION
-- 
-- This script fixes the duplicate token creation issue by adding database-level constraints
-- and cleaning up any existing duplicates in the tokens table
--
-- EXECUTION INSTRUCTIONS:
-- 1. Run this script in your Supabase SQL Editor
-- 2. Regenerate Prisma types (if using Prisma)
-- 3. Apply the frontend fixes from TokenizationManager-enhanced-duplicate-prevention.tsx
-- 4. Test token creation to verify duplicates are prevented

-- =============================================================================
-- STEP 1: ANALYZE CURRENT DUPLICATE SITUATION
-- =============================================================================

-- Check for existing duplicates in tokens table
SELECT 
    'Duplicate Analysis' AS step,
    COUNT(*) as total_tokens,
    COUNT(DISTINCT name) as unique_names,
    COUNT(DISTINCT symbol) as unique_symbols,
    COUNT(*) - COUNT(DISTINCT (project_id, name, symbol)) as duplicate_combinations
FROM tokens;

-- Show actual duplicates
SELECT 
    project_id,
    name,
    symbol,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id ORDER BY created_at) as duplicate_ids,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM tokens 
GROUP BY project_id, name, symbol
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- =============================================================================
-- STEP 2: BACKUP EXISTING DATA
-- =============================================================================

-- Create backup table (optional but recommended)
CREATE TABLE IF NOT EXISTS tokens_backup_pre_duplicate_fix AS 
SELECT * FROM tokens;

-- =============================================================================
-- STEP 3: CLEAN UP EXISTING DUPLICATES
-- =============================================================================

-- Remove duplicate tokens, keeping only the earliest created one
WITH duplicate_tokens AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY project_id, name, symbol 
            ORDER BY created_at ASC
        ) as row_num
    FROM tokens
),
tokens_to_delete AS (
    SELECT id 
    FROM duplicate_tokens 
    WHERE row_num > 1
)
DELETE FROM tokens 
WHERE id IN (SELECT id FROM tokens_to_delete);

-- Verify cleanup
SELECT 
    'After Cleanup' AS step,
    COUNT(*) as total_tokens,
    COUNT(DISTINCT (project_id, name, symbol)) as unique_combinations,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT (project_id, name, symbol)) 
        THEN 'SUCCESS: No duplicates remain'
        ELSE 'WARNING: Duplicates still exist'
    END as cleanup_status
FROM tokens;

-- =============================================================================
-- STEP 4: ADD UNIQUE CONSTRAINTS
-- =============================================================================

-- Add unique constraint on project_id + name combination
ALTER TABLE tokens 
ADD CONSTRAINT tokens_project_name_unique 
UNIQUE (project_id, name);

-- Add unique constraint on project_id + symbol combination  
ALTER TABLE tokens 
ADD CONSTRAINT tokens_project_symbol_unique 
UNIQUE (project_id, symbol);

-- Add composite unique constraint for extra safety
ALTER TABLE tokens 
ADD CONSTRAINT tokens_project_name_symbol_unique 
UNIQUE (project_id, name, symbol);

-- =============================================================================
-- STEP 5: ADD PERFORMANCE INDEXES
-- =============================================================================

-- Index for fast duplicate checking during token creation
CREATE INDEX IF NOT EXISTS idx_tokens_duplicate_check 
ON tokens (project_id, name, symbol);

-- Index for factoring metadata queries (used by TokenizationManager)
CREATE INDEX IF NOT EXISTS idx_tokens_factoring_metadata 
ON tokens USING GIN ((metadata->'factoring')) 
WHERE metadata->'factoring' IS NOT NULL;

-- Index for factoring source filtering
CREATE INDEX IF NOT EXISTS idx_tokens_factoring_source 
ON tokens ((metadata->'factoring'->>'source'))
WHERE metadata->'factoring'->>'source' = 'factoring_tokenization';

-- =============================================================================
-- STEP 6: VERIFICATION AND TESTING
-- =============================================================================

-- Test that duplicates are now prevented
-- This should FAIL with constraint violation:
-- INSERT INTO tokens (name, symbol, project_id, standard, blocks, decimals, total_supply, metadata, status)
-- VALUES 
--     ('Test Token', 'TEST', 'test-project-id', 'ERC-1155', '{}', 18, '1000', '{}', 'DRAFT'),
--     ('Test Token', 'TEST', 'test-project-id', 'ERC-1155', '{}', 18, '1000', '{}', 'DRAFT');

-- Show current constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    confupdtype,
    confdeltype,
    confmatchtype,
    consrc
FROM pg_constraint 
WHERE conrelid = 'tokens'::regclass
AND contype = 'u'  -- unique constraints
ORDER BY conname;

-- Show current indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'tokens'
AND indexname LIKE '%tokens%'
ORDER BY indexname;

-- =============================================================================
-- STEP 7: FINAL VERIFICATION QUERIES
-- =============================================================================

-- Verify no duplicates exist
SELECT 
    'Final Verification' AS check_type,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT (project_id, name)) THEN '✅ PASS'
        ELSE '❌ FAIL - Name duplicates exist'
    END as name_uniqueness,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT (project_id, symbol)) THEN '✅ PASS'
        ELSE '❌ FAIL - Symbol duplicates exist'
    END as symbol_uniqueness,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT (project_id, name, symbol)) THEN '✅ PASS'
        ELSE '❌ FAIL - Combination duplicates exist'
    END as combination_uniqueness
FROM tokens;

-- Show final token statistics
SELECT 
    COUNT(*) as total_tokens,
    COUNT(DISTINCT project_id) as unique_projects,
    COUNT(DISTINCT name) as unique_names,
    COUNT(DISTINCT symbol) as unique_symbols,
    COUNT(*) FILTER (WHERE metadata->'factoring'->>'source' = 'factoring_tokenization') as factoring_tokens
FROM tokens;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

SELECT 
    'Migration Status' AS status,
    'COMPLETE - Database constraints added to prevent token duplicates' AS message,
    NOW() AS completed_at;

-- Next steps:
-- 1. Apply TokenizationManager frontend fixes
-- 2. Test token creation in UI
-- 3. Verify constraint violations are handled gracefully
-- 4. Monitor audit logs for successful duplicate prevention
