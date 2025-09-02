-- =====================================================
-- REMOVE DEPRECATED SIDEBAR CONFIGURATION FIELDS (V2)
-- Migration Script: Handle view dependencies and remove deprecated fields
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

BEGIN;

-- Step 2: Drop dependent view first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' AND viewname = 'sidebar_configurations_with_names'
  ) THEN
    DROP VIEW sidebar_configurations_with_names;
    RAISE NOTICE 'Dropped sidebar_configurations_with_names view';
  END IF;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop view: %', SQLERRM;
END $$;

-- Step 3: Drop constraints and indexes that reference old fields
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

-- Step 4: Drop the deprecated columns
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

-- Step 5: Create new unique constraint with new field names
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

-- Step 6: Recreate the view with only the new fields
CREATE OR REPLACE VIEW sidebar_configurations_with_names AS
SELECT 
    sc.id,
    sc.name,
    sc.description,
    sc.target_role_ids,
    sc.target_profile_type_enums,
    -- Compute role names from the new target_role_ids field
    ARRAY(
        SELECT r.name
        FROM roles r
        WHERE r.id = ANY(sc.target_role_ids)
        ORDER BY r.priority DESC
    ) AS computed_role_names,
    -- Compute profile type names from the new target_profile_type_enums field
    sc.target_profile_type_enums AS computed_profile_types,
    sc.min_role_priority,
    sc.organization_id,
    sc.configuration_data,
    sc.is_active,
    sc.is_default,
    sc.created_by,
    sc.updated_by,
    sc.created_at,
    sc.updated_at
FROM sidebar_configurations sc;

-- Add comment to the recreated view
COMMENT ON VIEW sidebar_configurations_with_names IS 'Sidebar configurations with computed role names and profile types (updated to use new fields 2025-08-28)';

COMMIT;

-- Step 7: Add helpful comment and verify
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

-- Verify view structure
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'sidebar_configurations_with_names' 
AND table_schema = 'public'
ORDER BY ordinal_position;
