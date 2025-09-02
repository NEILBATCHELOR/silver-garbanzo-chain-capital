-- =====================================================
-- SIDEBAR CONFIGURATION SCHEMA FIX
-- Fix target_roles and target_profile_types to use proper references
-- Date: August 28, 2025
-- =====================================================

-- Step 1: Add new columns with proper data types
ALTER TABLE sidebar_configurations 
ADD COLUMN target_role_ids UUID[] DEFAULT NULL,
ADD COLUMN target_profile_type_enums public.profile_type[] DEFAULT NULL;

-- Step 2: Create migration function to convert existing data
CREATE OR REPLACE FUNCTION migrate_sidebar_configuration_references()
RETURNS void AS $$
DECLARE
    config_record RECORD;
    role_name TEXT;
    role_id UUID;
    profile_type TEXT;
    role_ids UUID[] := ARRAY[]::UUID[];
    profile_enums public.profile_type[] := ARRAY[]::public.profile_type[];
BEGIN
    -- Process each configuration
    FOR config_record IN SELECT id, target_roles, target_profile_types FROM sidebar_configurations LOOP
        -- Reset arrays for each configuration
        role_ids := ARRAY[]::UUID[];
        profile_enums := ARRAY[]::public.profile_type[];
        
        -- Convert role names to role IDs
        IF config_record.target_roles IS NOT NULL THEN
            FOREACH role_name IN ARRAY config_record.target_roles LOOP
                SELECT id INTO role_id FROM roles WHERE name = role_name;
                IF role_id IS NOT NULL THEN
                    role_ids := array_append(role_ids, role_id);
                ELSE
                    RAISE WARNING 'Role not found: %', role_name;
                END IF;
            END LOOP;
        END IF;
        
        -- Convert profile type strings to enum values
        IF config_record.target_profile_types IS NOT NULL THEN
            FOREACH profile_type IN ARRAY config_record.target_profile_types LOOP
                -- Handle the 'admin' to 'super admin' mapping
                IF profile_type = 'admin' THEN
                    profile_type := 'super admin';
                END IF;
                
                -- Validate enum value exists
                BEGIN
                    profile_enums := array_append(profile_enums, profile_type::public.profile_type);
                EXCEPTION WHEN invalid_text_representation THEN
                    RAISE WARNING 'Invalid profile type: %', profile_type;
                END;
            END LOOP;
        END IF;
        
        -- Update the configuration with new values
        UPDATE sidebar_configurations 
        SET 
            target_role_ids = role_ids,
            target_profile_type_enums = profile_enums
        WHERE id = config_record.id;
    END LOOP;
    
    RAISE NOTICE 'Migration completed successfully';
END;
$$ LANGUAGE plpgsql;

-- Step 3: Run the migration
SELECT migrate_sidebar_configuration_references();

-- Step 4: Clean up duplicate configurations (keep the most recent)
WITH ranked_configs AS (
  SELECT 
    id,
    name,
    target_roles,
    target_profile_types,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY name, target_roles, target_profile_types 
      ORDER BY created_at DESC
    ) as rn
  FROM sidebar_configurations
)
DELETE FROM sidebar_configurations 
WHERE id IN (
  SELECT id FROM ranked_configs WHERE rn > 1
);

-- Step 5: Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_sidebar_configs_role_ids 
ON sidebar_configurations USING GIN (target_role_ids);

CREATE INDEX IF NOT EXISTS idx_sidebar_configs_profile_enums 
ON sidebar_configurations USING GIN (target_profile_type_enums);

-- Step 6: Add helper functions for querying
CREATE OR REPLACE FUNCTION sidebar_config_matches_user(
    config_role_ids UUID[],
    config_profile_enums public.profile_type[],
    user_role_ids UUID[],
    user_profile_type public.profile_type
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has any of the required roles
    IF config_role_ids IS NOT NULL AND array_length(config_role_ids, 1) > 0 THEN
        IF NOT (config_role_ids && user_role_ids) THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Check if user has required profile type
    IF config_profile_enums IS NOT NULL AND array_length(config_profile_enums, 1) > 0 THEN
        IF user_profile_type IS NULL OR NOT (user_profile_type = ANY(config_profile_enums)) THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create view for easier querying
CREATE OR REPLACE VIEW sidebar_configurations_with_names AS
SELECT 
    sc.id,
    sc.name,
    sc.description,
    -- Keep old columns for backward compatibility
    sc.target_roles,
    sc.target_profile_types,
    -- New properly typed columns
    sc.target_role_ids,
    sc.target_profile_type_enums,
    -- Computed role names for display
    ARRAY(
        SELECT r.name 
        FROM roles r 
        WHERE r.id = ANY(sc.target_role_ids)
        ORDER BY r.priority DESC
    ) AS computed_role_names,
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

-- Step 8: Update RLS policies to work with new columns
CREATE POLICY "Super Admins can manage all sidebar configurations v2"
ON sidebar_configurations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id  
    WHERE ur.user_id = auth.uid()
    AND r.name = 'Super Admin'
    AND r.priority >= 100
  )
);

-- Step 9: Add comments for documentation
COMMENT ON COLUMN sidebar_configurations.target_role_ids IS 'Proper UUID references to roles table (preferred)';
COMMENT ON COLUMN sidebar_configurations.target_profile_type_enums IS 'Proper enum references to profile_type (preferred)';
COMMENT ON COLUMN sidebar_configurations.target_roles IS 'Legacy text array - use target_role_ids instead';
COMMENT ON COLUMN sidebar_configurations.target_profile_types IS 'Legacy text array - use target_profile_type_enums instead';

-- Step 10: Verification queries
DO $$
BEGIN
    RAISE NOTICE 'Schema fix completed. Verification:';
    RAISE NOTICE '- Total configurations: %', (SELECT COUNT(*) FROM sidebar_configurations);
    RAISE NOTICE '- Configurations with role IDs: %', (SELECT COUNT(*) FROM sidebar_configurations WHERE target_role_ids IS NOT NULL);
    RAISE NOTICE '- Configurations with profile enums: %', (SELECT COUNT(*) FROM sidebar_configurations WHERE target_profile_type_enums IS NOT NULL);
END $$;

-- Clean up migration function
DROP FUNCTION IF EXISTS migrate_sidebar_configuration_references();
