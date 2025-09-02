-- ==================================================
-- COMPREHENSIVE TOKENIZATION DUPLICATE PREVENTION
-- Chain Capital Production - August 21, 2025
-- ==================================================

-- STEP 1: Remove existing duplicates
-- Find and remove duplicate tokens keeping the first occurrence

WITH duplicate_tokens AS (
  SELECT 
    id,
    name,
    symbol,
    project_id,
    (metadata->>'factoring'->>'pool_id')::text as pool_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY 
        name, 
        symbol, 
        project_id, 
        (metadata->>'factoring'->>'pool_id')::text 
      ORDER BY created_at ASC
    ) as row_num
  FROM tokens 
  WHERE metadata->'factoring'->>'source' = 'factoring_tokenization'
),
tokens_to_delete AS (
  SELECT id 
  FROM duplicate_tokens 
  WHERE row_num > 1
)
DELETE FROM tokens 
WHERE id IN (SELECT id FROM tokens_to_delete);

-- Log the cleanup
INSERT INTO audit_logs (
  id,
  timestamp,
  action,
  entity_type,
  entity_id,
  user_id,
  username,
  details,
  category,
  severity,
  status,
  metadata
) VALUES (
  gen_random_uuid(),
  NOW(),
  'cleanup_duplicates',
  'tokens',
  'multiple',
  'system',
  'database_cleanup',
  'Removed duplicate factoring tokens from tokenization manager',
  'system_maintenance',
  'medium',
  'success',
  jsonb_build_object(
    'cleanup_type', 'duplicate_removal',
    'table', 'tokens',
    'criteria', 'factoring_tokenization_duplicates'
  )
);

-- STEP 2: Add unique constraints to prevent future duplicates

-- Create unique index on tokens for factoring tokenization
-- This prevents duplicate tokens for same pool/project combination
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_tokens_factoring_unique
ON tokens (
  name, 
  symbol, 
  project_id, 
  ((metadata->'factoring'->>'pool_id')::integer)
) 
WHERE metadata->'factoring'->>'source' = 'factoring_tokenization';

-- Add partial unique index for token symbols within projects
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_tokens_symbol_project_unique
ON tokens (symbol, project_id);

-- Add unique constraint on pool allocation (one token per pool per project)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_tokens_pool_allocation_unique
ON tokens (
  project_id,
  ((metadata->'factoring'->>'pool_id')::integer)
)
WHERE metadata->'factoring'->>'source' = 'factoring_tokenization';

-- STEP 3: Create database function for duplicate prevention

CREATE OR REPLACE FUNCTION prevent_duplicate_token_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for existing token with same pool and project
  IF NEW.metadata->'factoring'->>'source' = 'factoring_tokenization' THEN
    IF EXISTS (
      SELECT 1 FROM tokens 
      WHERE project_id = NEW.project_id 
        AND (metadata->'factoring'->>'pool_id')::integer = (NEW.metadata->'factoring'->>'pool_id')::integer
        AND metadata->'factoring'->>'source' = 'factoring_tokenization'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Duplicate factoring token for pool % in project %', 
        NEW.metadata->'factoring'->>'pool_id', NEW.project_id
        USING ERRCODE = '23505', 
        HINT = 'Only one token per pool per project is allowed';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce duplicate prevention
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_tokens ON tokens;
CREATE TRIGGER trigger_prevent_duplicate_tokens
  BEFORE INSERT OR UPDATE ON tokens
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_token_creation();

-- STEP 4: Add performance indexes for factoring queries

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tokens_factoring_source
ON tokens ((metadata->'factoring'->>'source'))
WHERE metadata ? 'factoring';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tokens_factoring_status
ON tokens ((metadata->'factoring'->>'status'))
WHERE metadata->'factoring'->>'source' = 'factoring_tokenization';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tokens_factoring_pool_id
ON tokens (((metadata->'factoring'->>'pool_id')::integer))
WHERE metadata->'factoring'->>'source' = 'factoring_tokenization';

-- STEP 5: Create monitoring view for duplicate detection

CREATE OR REPLACE VIEW v_token_duplicate_monitor AS
SELECT 
  name,
  symbol,
  project_id,
  (metadata->'factoring'->>'pool_id')::text as pool_id,
  COUNT(*) as duplicate_count,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created,
  ARRAY_AGG(id ORDER BY created_at) as token_ids
FROM tokens 
WHERE metadata->'factoring'->>'source' = 'factoring_tokenization'
GROUP BY name, symbol, project_id, (metadata->'factoring'->>'pool_id')::text
HAVING COUNT(*) > 1;

-- Add comment for monitoring
COMMENT ON VIEW v_token_duplicate_monitor IS 
'Monitoring view to detect duplicate factoring tokens. Should return 0 rows after cleanup.';

-- STEP 6: Create cleanup function for future use

CREATE OR REPLACE FUNCTION cleanup_duplicate_tokens(
  p_dry_run BOOLEAN DEFAULT TRUE
) 
RETURNS TABLE (
  action TEXT,
  token_id UUID,
  token_name TEXT,
  token_symbol TEXT,
  pool_id TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  duplicate_record RECORD;
  tokens_to_delete UUID[];
BEGIN
  -- Find duplicates
  FOR duplicate_record IN 
    SELECT * FROM v_token_duplicate_monitor
  LOOP
    -- Get all but the first token (keep earliest)
    SELECT ARRAY_AGG(token_id) INTO tokens_to_delete
    FROM (
      SELECT unnest(duplicate_record.token_ids[2:]) as token_id
    ) subq;
    
    -- Return what would be deleted
    FOR i IN 1..array_length(tokens_to_delete, 1) LOOP
      SELECT 
        CASE WHEN p_dry_run THEN 'WOULD_DELETE' ELSE 'DELETED' END,
        tokens_to_delete[i],
        t.name,
        t.symbol,
        (t.metadata->'factoring'->>'pool_id')::text,
        t.created_at
      INTO action, token_id, token_name, token_symbol, pool_id, created_at
      FROM tokens t WHERE t.id = tokens_to_delete[i];
      
      RETURN NEXT;
      
      -- Actually delete if not dry run
      IF NOT p_dry_run THEN
        DELETE FROM tokens WHERE id = tokens_to_delete[i];
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON FUNCTION cleanup_duplicate_tokens IS 
'Function to cleanup duplicate tokens. Use cleanup_duplicate_tokens(false) to actually delete.';

-- VERIFICATION QUERIES
-- Check if cleanup worked
SELECT 'Remaining duplicates:' as status, COUNT(*) as count 
FROM v_token_duplicate_monitor;

-- Check unique constraints
SELECT 'Unique constraints created:' as status, COUNT(*) as count
FROM pg_indexes 
WHERE tablename = 'tokens' 
  AND indexname LIKE 'idx_tokens_%_unique';

-- Final status
INSERT INTO audit_logs (
  id,
  timestamp,
  action,
  entity_type,
  entity_id,
  user_id,
  username,
  details,
  category,
  severity,
  status,
  metadata
) VALUES (
  gen_random_uuid(),
  NOW(),
  'duplicate_prevention_setup',
  'tokens',
  'system',
  'system',
  'database_admin',
  'Comprehensive duplicate prevention system implemented for tokenization manager',
  'system_enhancement',
  'high',
  'success',
  jsonb_build_object(
    'constraints_added', 3,
    'triggers_created', 1,
    'monitoring_views_created', 1,
    'cleanup_functions_created', 1,
    'implementation_date', NOW()
  )
);

-- Show summary
SELECT 
  'DUPLICATE PREVENTION SETUP COMPLETE' as status,
  'Database constraints, triggers, and monitoring in place' as description;
