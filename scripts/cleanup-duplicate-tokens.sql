-- CRITICAL FIX: Cleanup Duplicate Tokens Script
-- Date: August 21, 2025
-- Issue: Multiple Supabase clients causing duplicate token records
-- 
-- This script removes duplicate tokens while preserving the latest version

-- 1. Find and display duplicate tokens before cleanup
SELECT 
    name,
    symbol,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id ORDER BY created_at) as token_ids,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM tokens 
GROUP BY name, symbol, project_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 2. Create backup table before cleanup
CREATE TABLE IF NOT EXISTS tokens_backup_20250821 AS 
SELECT * FROM tokens WHERE 1=0;

-- Insert all current tokens into backup
INSERT INTO tokens_backup_20250821 
SELECT * FROM tokens;

-- 3. Remove duplicate tokens (keep the latest version)
WITH duplicate_tokens AS (
    SELECT 
        id,
        name,
        symbol,
        project_id,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY name, symbol, project_id 
            ORDER BY created_at DESC
        ) as rn
    FROM tokens
),
tokens_to_delete AS (
    SELECT id 
    FROM duplicate_tokens 
    WHERE rn > 1
)
DELETE FROM tokens 
WHERE id IN (SELECT id FROM tokens_to_delete);

-- 4. Verify cleanup - this should return 0 duplicates
SELECT 
    name,
    symbol,
    COUNT(*) as count
FROM tokens 
GROUP BY name, symbol, project_id
HAVING COUNT(*) > 1;

-- 5. Display remaining tokens count
SELECT 
    'Cleanup completed' as status,
    COUNT(*) as remaining_tokens,
    (SELECT COUNT(*) FROM tokens_backup_20250821) as original_tokens
FROM tokens;

-- 6. Clean up duplicate audit entries related to deleted tokens
-- (Only if audit entries are causing issues)
-- DELETE FROM audit_logs 
-- WHERE entity_type = 'tokens' 
--   AND entity_id NOT IN (SELECT id FROM tokens);

COMMIT;
