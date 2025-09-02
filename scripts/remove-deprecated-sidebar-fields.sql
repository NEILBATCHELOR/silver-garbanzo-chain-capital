-- =====================================================
-- REMOVE DEPRECATED SIDEBAR CONFIGURATION FIELDS
-- Migration Script: Remove target_roles and target_profile_types
-- Date: August 28, 2025
-- =====================================================

-- Step 1: Verify existing data has been migrated to new fields
DO $$
BEGIN
  -- Check if any records have new fields populated
  IF NOT EXISTS (
    SELECT 1 FROM sidebar_configurations 
    WHERE target_role_ids IS NOT NULL 
    AND target_profile_type_enums IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Migration stopped: New fields (target_role_ids, target_profile_type_enums) are not populated. Please run data migration first.';
  END IF;
  
  -- Log migration start
  RAISE NOTICE 'Starting removal of deprecated sidebar configuration fields...';
END $$;

-- Step 2: Drop constraints and indexes that reference old fields
-- Note: This may fail if constraints don't exist, which is fine
BEGIN;

-- Drop unique constraint that references old fields
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'sidebar_configurations' AND c.conname = 'unique_default_per_target'
  ) THEN
    ALTER TABLE sidebar_configurations DROP CONSTRAINT unique_default_per_target;
    RAISE NOTICE 'Dropped unique_default_per_target constraint';
  END IF;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop unique_default_per_target constraint: %', SQLERRM;
END $$;

-- Drop indexes on old fields
DO $$
BEGIN
  -- Drop roles index
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sidebar_configs_roles') THEN
    DROP INDEX idx_sidebar_configs_roles;
    RAISE NOTICE 'Dropped idx_sidebar_configs_roles index';
  END IF;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop roles index: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Drop profile types index
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sidebar_configs_profile_types') THEN
    DROP INDEX idx_sidebar_configs_profile_types;
    RAISE NOTICE 'Dropped idx_sidebar_configs_profile_types index';
  END IF;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop profile types index: %', SQLERRM;
END $$;

-- Step 3: Drop the deprecated columns
DO $$
BEGIN
  -- Drop target_roles column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sidebar_configurations' 
    AND column_name = 'target_roles'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE sidebar_configurations DROP COLUMN target_roles;
    RAISE NOTICE 'Dropped target_roles column';
  END IF;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop target_roles column: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Drop target_profile_types column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sidebar_configurations' 
    AND column_name = 'target_profile_types'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE sidebar_configurations DROP COLUMN target_profile_types;
    RAISE NOTICE 'Dropped target_profile_types column';
  END IF;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop target_profile_types column: %', SQLERRM;
END $$;

-- Step 4: Create new unique constraint with new field names
DO $$
BEGIN
  -- Create unique constraint for default configurations per target combination
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'sidebar_configurations' 
    AND c.conname = 'unique_default_per_new_target'
  ) THEN
    ALTER TABLE sidebar_configurations 
    ADD CONSTRAINT unique_default_per_new_target 
    UNIQUE (target_role_ids, target_profile_type_enums, is_default, organization_id) DEFERRABLE;
    RAISE NOTICE 'Created unique_default_per_new_target constraint';
  END IF;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create new unique constraint: %', SQLERRM;
END $$;

COMMIT;

-- Step 5: Add helpful comment and verify
COMMENT ON TABLE sidebar_configurations IS 'Dynamic sidebar configurations using role IDs and profile type enums (updated 2025-08-28)';

-- Show updated table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'sidebar_configurations' 
AND table_schema = 'public'
ORDER BY ordinal_position;
