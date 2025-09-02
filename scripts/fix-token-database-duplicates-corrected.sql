-- CORRECTED TOKEN DATABASE DUPLICATE FIX
-- August 22, 2025
-- Fixes duplicate issues across all token_erc* tables with correct column names

-- =====================================================
-- STEP 1: CLEAN UP EXISTING DUPLICATES
-- =====================================================

-- Clean up token_erc1400_controllers duplicates
-- Keep the first record for each (token_id, address) combination
WITH controller_duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY token_id, address ORDER BY created_at ASC) as rn
  FROM token_erc1400_controllers
)
DELETE FROM token_erc1400_controllers 
WHERE id IN (
  SELECT id FROM controller_duplicates WHERE rn > 1
);

-- Clean up token_erc1400_partitions duplicates  
-- Keep the first record for each (token_id, partition_id) combination
WITH partition_duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY token_id, partition_id ORDER BY created_at ASC) as rn
  FROM token_erc1400_partitions
)
DELETE FROM token_erc1400_partitions 
WHERE id IN (
  SELECT id FROM partition_duplicates WHERE rn > 1
);

-- Clean up token_erc3525_slots duplicates
-- Keep the first record for each (token_id, slot_id) combination
WITH slot_duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY token_id, slot_id ORDER BY created_at ASC) as rn
  FROM token_erc3525_slots
)
DELETE FROM token_erc3525_slots 
WHERE id IN (
  SELECT id FROM slot_duplicates WHERE rn > 1
);

-- Clean up token_erc1155_types duplicates
-- Keep the first record for each (token_id, token_type_id) combination
WITH type_duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY token_id, token_type_id ORDER BY created_at ASC) as rn
  FROM token_erc1155_types
)
DELETE FROM token_erc1155_types 
WHERE id IN (
  SELECT id FROM type_duplicates WHERE rn > 1
);

-- Clean up token_erc721_attributes duplicates
-- Keep the first record for each (token_id, trait_type) combination
WITH attribute_duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY token_id, trait_type ORDER BY created_at ASC) as rn
  FROM token_erc721_attributes
)
DELETE FROM token_erc721_attributes 
WHERE id IN (
  SELECT id FROM attribute_duplicates WHERE rn > 1
);

-- =====================================================
-- STEP 2: ADD UNIQUE CONSTRAINTS TO PREVENT FUTURE DUPLICATES
-- =====================================================

-- ERC-1400 Controllers: Unique (token_id, address)
ALTER TABLE token_erc1400_controllers 
DROP CONSTRAINT IF EXISTS unique_token_controller;

ALTER TABLE token_erc1400_controllers 
ADD CONSTRAINT unique_token_controller 
UNIQUE (token_id, address);

-- ERC-1400 Partitions: Unique (token_id, partition_id)
ALTER TABLE token_erc1400_partitions 
DROP CONSTRAINT IF EXISTS unique_token_partition;

ALTER TABLE token_erc1400_partitions 
ADD CONSTRAINT unique_token_partition 
UNIQUE (token_id, partition_id);

-- ERC-3525 Slots: Unique (token_id, slot_id)
ALTER TABLE token_erc3525_slots 
DROP CONSTRAINT IF EXISTS unique_token_slot;

ALTER TABLE token_erc3525_slots 
ADD CONSTRAINT unique_token_slot 
UNIQUE (token_id, slot_id);

-- ERC-1155 Types: Unique (token_id, token_type_id)
ALTER TABLE token_erc1155_types 
DROP CONSTRAINT IF EXISTS unique_token_type;

ALTER TABLE token_erc1155_types 
ADD CONSTRAINT unique_token_type 
UNIQUE (token_id, token_type_id);

-- ERC-721 Attributes: Unique (token_id, trait_type)
ALTER TABLE token_erc721_attributes 
DROP CONSTRAINT IF EXISTS unique_token_trait;

ALTER TABLE token_erc721_attributes 
ADD CONSTRAINT unique_token_trait 
UNIQUE (token_id, trait_type);

-- ERC-3525 Allocations: Unique (token_id, slot_id, token_id_within_slot)
ALTER TABLE token_erc3525_allocations 
DROP CONSTRAINT IF EXISTS unique_token_allocation;

ALTER TABLE token_erc3525_allocations 
ADD CONSTRAINT unique_token_allocation 
UNIQUE (token_id, slot_id, token_id_within_slot);

-- ERC-4626 Strategy Params: Unique (token_id, name) - CORRECTED COLUMN NAME
ALTER TABLE token_erc4626_strategy_params 
DROP CONSTRAINT IF EXISTS unique_token_strategy_param;

ALTER TABLE token_erc4626_strategy_params 
ADD CONSTRAINT unique_token_strategy_param 
UNIQUE (token_id, name);

-- =====================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Create performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_token_erc1400_controllers_token_id 
ON token_erc1400_controllers(token_id);

CREATE INDEX IF NOT EXISTS idx_token_erc1400_partitions_token_id 
ON token_erc1400_partitions(token_id);

CREATE INDEX IF NOT EXISTS idx_token_erc3525_slots_token_id 
ON token_erc3525_slots(token_id);

CREATE INDEX IF NOT EXISTS idx_token_erc1155_types_token_id 
ON token_erc1155_types(token_id);

CREATE INDEX IF NOT EXISTS idx_token_erc721_attributes_token_id 
ON token_erc721_attributes(token_id);

-- =====================================================
-- STEP 4: VERIFICATION QUERIES (FOR TESTING)
-- =====================================================

-- Verify no duplicates remain
-- Run these after the migration to confirm success

-- Controllers duplicates check
-- SELECT token_id, address, COUNT(*) as count 
-- FROM token_erc1400_controllers 
-- GROUP BY token_id, address 
-- HAVING COUNT(*) > 1;

-- Partitions duplicates check  
-- SELECT token_id, partition_id, COUNT(*) as count 
-- FROM token_erc1400_partitions 
-- GROUP BY token_id, partition_id 
-- HAVING COUNT(*) > 1;

-- Slots duplicates check
-- SELECT token_id, slot_id, COUNT(*) as count 
-- FROM token_erc3525_slots 
-- GROUP BY token_id, slot_id 
-- HAVING COUNT(*) > 1;

-- =====================================================
-- STEP 5: AUDIT LOG
-- =====================================================

-- Log the fix in audit_logs for tracking
INSERT INTO audit_logs (
  action,
  category,
  severity,
  details,
  metadata
) VALUES (
  'database_maintenance',
  'SYSTEM',
  'MEDIUM',
  'Applied corrected fix for token database duplicates across all ERC standards',
  jsonb_build_object(
    'script_name', 'fix-token-database-duplicates-corrected.sql',
    'execution_date', NOW(),
    'affected_tables', ARRAY[
      'token_erc1400_controllers',
      'token_erc1400_partitions', 
      'token_erc3525_slots',
      'token_erc1155_types',
      'token_erc721_attributes',
      'token_erc3525_allocations',
      'token_erc4626_strategy_params'
    ],
    'constraints_added', 7,
    'indexes_created', 5,
    'fix_applied', 'corrected_column_names'
  )
);

-- End of script
