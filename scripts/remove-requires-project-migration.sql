-- =====================================================
-- SIDEBAR CONFIGURATION CLEANUP MIGRATION
-- Remove requiresProject (P flag) from all configurations
-- Date: August 28, 2025
-- =====================================================

BEGIN;

-- Function to remove requiresProject field from configuration_data JSONB
CREATE OR REPLACE FUNCTION remove_requires_project_from_config()
RETURNS void AS $$
DECLARE
    config_record RECORD;
    section_data JSONB;
    item_data JSONB;
    updated_sections JSONB := '[]'::jsonb;
    updated_items JSONB;
BEGIN
    -- Loop through all sidebar configurations
    FOR config_record IN SELECT id, configuration_data FROM sidebar_configurations LOOP
        updated_sections := '[]'::jsonb;
        
        -- Loop through sections in configuration_data
        IF config_record.configuration_data ? 'sections' THEN
            FOR section_data IN SELECT * FROM jsonb_array_elements(config_record.configuration_data->'sections') LOOP
                updated_items := '[]'::jsonb;
                
                -- Loop through items in each section
                IF section_data ? 'items' THEN
                    FOR item_data IN SELECT * FROM jsonb_array_elements(section_data->'items') LOOP
                        -- Remove requiresProject field from item
                        item_data := item_data - 'requiresProject';
                        updated_items := updated_items || item_data;
                    END LOOP;
                END IF;
                
                -- Update section with cleaned items
                section_data := jsonb_set(section_data, '{items}', updated_items);
                updated_sections := updated_sections || section_data;
            END LOOP;
            
            -- Update the configuration with cleaned sections
            UPDATE sidebar_configurations 
            SET 
                configuration_data = jsonb_set(
                    configuration_data, 
                    '{sections}', 
                    updated_sections
                ),
                updated_at = now()
            WHERE id = config_record.id;
            
            RAISE NOTICE 'Cleaned configuration: %', config_record.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the cleanup function
SELECT remove_requires_project_from_config();

-- Drop the temporary function
DROP FUNCTION remove_requires_project_from_config();

-- Verify the cleanup by showing a sample of updated data
DO $$
DECLARE
    sample_config JSONB;
BEGIN
    SELECT configuration_data INTO sample_config 
    FROM sidebar_configurations 
    LIMIT 1;
    
    RAISE NOTICE 'Sample cleaned configuration: %', 
        jsonb_pretty(sample_config->'sections'->0->'items'->0);
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count configurations before and after
SELECT 
    'Total configurations' as description,
    count(*) as count
FROM sidebar_configurations;

-- Check if any requiresProject fields remain (should return 0)
SELECT 
    'Configurations with requiresProject fields' as description,
    count(*) as count
FROM sidebar_configurations
WHERE configuration_data::text LIKE '%requiresProject%';

-- Show sample of cleaned item structure
SELECT 
    name,
    jsonb_pretty(configuration_data->'sections'->0->'items'->0) as sample_item
FROM sidebar_configurations
LIMIT 1;

-- =====================================================
-- PERFORMANCE OPTIMIZATION
-- =====================================================

-- Reindex JSONB columns after cleanup
REINDEX INDEX IF EXISTS idx_sidebar_configurations_data;

-- Update table statistics
ANALYZE sidebar_configurations;

-- =====================================================
-- LOG COMPLETION
-- =====================================================

INSERT INTO migration_log (
    migration_name, 
    description, 
    executed_at, 
    status
) VALUES (
    'remove_requires_project_fields',
    'Removed requiresProject (P flag) fields from all sidebar configurations',
    now(),
    'completed'
) ON CONFLICT (migration_name) DO UPDATE SET
    executed_at = now(),
    status = 'completed';

RAISE NOTICE 'Migration completed: requiresProject fields removed from all sidebar configurations';
