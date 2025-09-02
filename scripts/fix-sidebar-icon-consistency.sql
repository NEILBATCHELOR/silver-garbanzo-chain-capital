-- =====================================================
-- FIX SIDEBAR ICON CONSISTENCY
-- Synchronizes icon and iconName fields in sidebar_configurations
-- Created: August 29, 2025
-- Issue: Icon picker updates iconName but display/template uses icon field
-- =====================================================

-- Update all sidebar configuration items to ensure icon field consistency
UPDATE sidebar_configurations
SET configuration_data = (
  SELECT jsonb_set(
    configuration_data,
    '{sections}',
    (
      SELECT jsonb_agg(
        jsonb_set(
          section,
          '{items}',
          (
            SELECT jsonb_agg(
              CASE 
                WHEN item ->> 'iconName' IS NOT NULL AND item ->> 'iconName' != '' THEN
                  -- If iconName exists and is not empty, sync icon to iconName
                  jsonb_set(item, '{icon}', to_jsonb(item ->> 'iconName'))
                WHEN item ->> 'icon' IS NOT NULL AND item ->> 'icon' != '' AND item ->> 'icon' != 'Layout' THEN
                  -- If icon exists and is not empty/Layout, sync iconName to icon
                  jsonb_set(item, '{iconName}', to_jsonb(item ->> 'icon'))
                ELSE
                  -- Ensure both fields exist with Layout as fallback
                  item 
                  || jsonb_build_object('icon', 'Layout') 
                  || jsonb_build_object('iconName', 'Layout')
              END
            )
            FROM jsonb_array_elements(section -> 'items') AS item
          )
        )
      )
      FROM jsonb_array_elements(configuration_data -> 'sections') AS section
    )
  )
  FROM sidebar_configurations sc2 
  WHERE sc2.id = sidebar_configurations.id
)
WHERE configuration_data IS NOT NULL 
  AND jsonb_array_length(configuration_data -> 'sections') > 0;

-- Log the changes made
DO $$
DECLARE
    update_count INTEGER;
BEGIN
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE 'Updated % sidebar configurations to fix icon consistency', update_count;
END $$;

-- Verify the fix by showing some examples
SELECT 
    name,
    jsonb_pretty(
        jsonb_path_query_array(
            configuration_data, 
            '$.sections[*].items[*] ? (@.icon != null || @.iconName != null)'
        )
    ) as items_with_icons
FROM sidebar_configurations 
WHERE jsonb_array_length(configuration_data -> 'sections') > 0
LIMIT 2;
