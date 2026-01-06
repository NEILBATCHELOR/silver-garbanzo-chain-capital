-- Migration: Add comprehensive deployment transaction tracking
-- Purpose: Track ALL transactions in deployment sequence (not just initial deployment)
-- Date: 2025-01-06

-- ============================================================
-- PART 1: Enhance token_modules table
-- ============================================================

-- Add transaction tracking columns
ALTER TABLE token_modules
ADD COLUMN IF NOT EXISTS linkage_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS linkage_block_number BIGINT,
ADD COLUMN IF NOT EXISTS linked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS configuration_tx_hashes TEXT[],
ADD COLUMN IF NOT EXISTS configuration_block_numbers BIGINT[],
ADD COLUMN IF NOT EXISTS configured_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deployment_sequence JSONB;

-- Add column comments for documentation
COMMENT ON COLUMN token_modules.linkage_tx_hash IS 'Transaction hash for linking module to token (e.g., setFeesModule, setVotesModule)';
COMMENT ON COLUMN token_modules.linkage_block_number IS 'Block number where module was linked to token';
COMMENT ON COLUMN token_modules.linked_at IS 'Timestamp when module was linked to token';
COMMENT ON COLUMN token_modules.configuration_tx_hashes IS 'Array of transaction hashes for configuration calls (e.g., setTransferFee, setFeeRecipient)';
COMMENT ON COLUMN token_modules.configuration_block_numbers IS 'Array of block numbers for configuration transactions';
COMMENT ON COLUMN token_modules.configured_at IS 'Timestamp when configuration was completed';
COMMENT ON COLUMN token_modules.deployment_sequence IS 'Complete deployment sequence: [{step, action, txHash, blockNumber, gasUsed, timestamp}]';

-- Create indexes for transaction lookups
CREATE INDEX IF NOT EXISTS idx_token_modules_linkage_tx 
ON token_modules(linkage_tx_hash) 
WHERE linkage_tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_token_modules_config_txs 
ON token_modules USING GIN(configuration_tx_hashes) 
WHERE configuration_tx_hashes IS NOT NULL;

-- ============================================================
-- PART 2: Enhance token_deployments table
-- ============================================================

-- Add transaction tracking columns
ALTER TABLE token_deployments
ADD COLUMN IF NOT EXISTS initialization_tx_hashes TEXT[],
ADD COLUMN IF NOT EXISTS initialization_block_numbers BIGINT[],
ADD COLUMN IF NOT EXISTS total_deployment_transactions INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS deployment_sequence JSONB;

-- Add column comments
COMMENT ON COLUMN token_deployments.initialization_tx_hashes IS 'Post-deployment initialization transactions (if any)';
COMMENT ON COLUMN token_deployments.initialization_block_numbers IS 'Block numbers for initialization transactions';
COMMENT ON COLUMN token_deployments.total_deployment_transactions IS 'Total number of transactions in complete deployment (token + modules + config)';
COMMENT ON COLUMN token_deployments.deployment_sequence IS 'Complete token deployment sequence including all initialization steps';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_token_deployments_init_txs 
ON token_deployments USING GIN(initialization_tx_hashes) 
WHERE initialization_tx_hashes IS NOT NULL;

-- ============================================================
-- PART 3: Create helper view for complete deployment info
-- ============================================================

-- View that combines token and module deployment info
CREATE OR REPLACE VIEW v_complete_deployments AS
SELECT 
  td.token_id,
  td.contract_address AS token_address,
  td.transaction_hash AS token_deployment_tx,
  td.total_deployment_transactions,
  td.network,
  td.status,
  td.deployed_by,
  td.deployed_at,
  
  -- Module aggregations
  COUNT(tm.id) AS total_modules,
  COUNT(tm.linkage_tx_hash) AS modules_linked,
  COUNT(tm.configured_at) AS modules_configured,
  
  -- Collect all transaction hashes (flattened)
  (
    SELECT ARRAY_AGG(DISTINCT tx_hash)
    FROM (
      -- Token deployment transaction
      SELECT td.transaction_hash AS tx_hash
      WHERE td.transaction_hash IS NOT NULL
      
      UNION
      
      -- Token initialization transactions
      SELECT unnest(td.initialization_tx_hashes) AS tx_hash
      WHERE td.initialization_tx_hashes IS NOT NULL
      
      UNION
      
      -- Module deployment transactions
      SELECT tm2.deployment_tx_hash AS tx_hash
      FROM token_modules tm2
      WHERE tm2.token_id = td.token_id 
        AND tm2.deployment_tx_hash IS NOT NULL
      
      UNION
      
      -- Module linkage transactions
      SELECT tm2.linkage_tx_hash AS tx_hash
      FROM token_modules tm2
      WHERE tm2.token_id = td.token_id 
        AND tm2.linkage_tx_hash IS NOT NULL
      
      UNION
      
      -- Module configuration transactions
      SELECT unnest(tm2.configuration_tx_hashes) AS tx_hash
      FROM token_modules tm2
      WHERE tm2.token_id = td.token_id 
        AND tm2.configuration_tx_hashes IS NOT NULL
    ) all_txs
  ) AS all_transaction_hashes
    
FROM token_deployments td
LEFT JOIN token_modules tm ON td.token_id = tm.token_id
GROUP BY 
  td.token_id,
  td.contract_address,
  td.transaction_hash,
  td.total_deployment_transactions,
  td.network,
  td.status,
  td.deployed_by,
  td.deployed_at,
  td.initialization_tx_hashes;

COMMENT ON VIEW v_complete_deployments IS 'Complete deployment information including all transactions from token and modules';

-- ============================================================
-- PART 4: Update existing records with placeholder data
-- ============================================================

-- Set total_deployment_transactions based on existing module count
UPDATE token_deployments td
SET total_deployment_transactions = 1 + (
  SELECT COUNT(*) FROM token_modules tm WHERE tm.token_id = td.token_id
)
WHERE total_deployment_transactions = 1;

-- Initialize deployment_sequence for existing token deployments
UPDATE token_deployments td
SET deployment_sequence = jsonb_build_array(
  jsonb_build_object(
    'step', 1,
    'action', 'deployToken',
    'txHash', td.transaction_hash,
    'blockNumber', (td.details->>'blockNumber')::bigint,
    'gasUsed', td.gas_used,
    'timestamp', EXTRACT(EPOCH FROM td.deployed_at)::bigint * 1000
  )
)
WHERE deployment_sequence IS NULL AND transaction_hash IS NOT NULL;

-- ============================================================
-- PART 5: Add validation constraints
-- ============================================================

-- Ensure linkage_block_number matches linkage_tx_hash presence
ALTER TABLE token_modules
ADD CONSTRAINT chk_linkage_consistency 
CHECK (
  (linkage_tx_hash IS NULL AND linkage_block_number IS NULL) OR
  (linkage_tx_hash IS NOT NULL AND linkage_block_number IS NOT NULL)
);

-- Ensure configuration arrays have matching lengths
ALTER TABLE token_modules
ADD CONSTRAINT chk_config_arrays_length
CHECK (
  COALESCE(array_length(configuration_tx_hashes, 1), 0) = 
  COALESCE(array_length(configuration_block_numbers, 1), 0)
);

-- Ensure initialization arrays have matching lengths
ALTER TABLE token_deployments
ADD CONSTRAINT chk_init_arrays_length
CHECK (
  COALESCE(array_length(initialization_tx_hashes, 1), 0) = 
  COALESCE(array_length(initialization_block_numbers, 1), 0)
);

-- ============================================================
-- PART 6: Grant permissions (adjust role names as needed)
-- ============================================================

-- Grant permissions on new columns
GRANT SELECT, INSERT, UPDATE ON token_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON token_deployments TO authenticated;
GRANT SELECT ON v_complete_deployments TO authenticated;

-- ============================================================
-- SUCCESS!
-- ============================================================

-- Verify the migration
DO $$
DECLARE
  token_modules_columns INTEGER;
  token_deployments_columns INTEGER;
BEGIN
  -- Count new columns in token_modules
  SELECT COUNT(*) INTO token_modules_columns
  FROM information_schema.columns
  WHERE table_name = 'token_modules'
  AND column_name IN (
    'linkage_tx_hash',
    'linkage_block_number',
    'linked_at',
    'configuration_tx_hashes',
    'configuration_block_numbers',
    'configured_at',
    'deployment_sequence'
  );
  
  -- Count new columns in token_deployments
  SELECT COUNT(*) INTO token_deployments_columns
  FROM information_schema.columns
  WHERE table_name = 'token_deployments'
  AND column_name IN (
    'initialization_tx_hashes',
    'initialization_block_numbers',
    'total_deployment_transactions',
    'deployment_sequence'
  );
  
  -- Report results
  RAISE NOTICE '✅ Migration complete!';
  RAISE NOTICE '   token_modules: Added % columns', token_modules_columns;
  RAISE NOTICE '   token_deployments: Added % columns', token_deployments_columns;
  RAISE NOTICE '   View created: v_complete_deployments';
  
  IF token_modules_columns = 7 AND token_deployments_columns = 4 THEN
    RAISE NOTICE '✅ All columns added successfully!';
  ELSE
    RAISE WARNING '⚠️  Expected 7 columns in token_modules and 4 in token_deployments';
  END IF;
END $$;
