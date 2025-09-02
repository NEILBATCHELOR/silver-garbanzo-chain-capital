-- =====================================================
-- FIX SIDEBAR SECTION ORDERING
-- Updates displayOrder for sidebar sections to follow logical sequence
-- Created: August 28, 2025
-- =====================================================

-- Function to update section display orders in configuration_data JSONB
CREATE OR REPLACE FUNCTION fix_sidebar_section_ordering()
RETURNS void AS $$
DECLARE
    config_record RECORD;
    updated_sections JSONB;
    section_data JSONB;
    section_counter INTEGER;
BEGIN
    -- Loop through all active sidebar configurations
    FOR config_record IN 
        SELECT id, name, configuration_data 
        FROM sidebar_configurations 
        WHERE is_active = true
    LOOP
        RAISE NOTICE 'Processing configuration: %', config_record.name;
        
        -- Initialize counter and array for updated sections
        section_counter := 0;
        updated_sections := '[]'::JSONB;
        
        -- Process each section and assign proper displayOrder
        FOR section_data IN 
            SELECT jsonb_array_elements(config_record.configuration_data->'sections')
        LOOP
            -- Update the section with new displayOrder
            section_data := jsonb_set(
                section_data, 
                '{displayOrder}', 
                section_counter::text::jsonb
            );
            
            -- Add to updated sections array
            updated_sections := updated_sections || jsonb_build_array(section_data);
            
            -- Increment counter for next section
            section_counter := section_counter + 1;
        END LOOP;
        
        -- Update the configuration_data with new section ordering
        UPDATE sidebar_configurations 
        SET 
            configuration_data = jsonb_set(
                configuration_data, 
                '{sections}', 
                updated_sections
            ),
            updated_at = NOW()
        WHERE id = config_record.id;
        
        RAISE NOTICE 'Updated % sections for configuration: %', section_counter, config_record.name;
    END LOOP;
    
    RAISE NOTICE 'Sidebar section ordering fix completed';
END;
$$ LANGUAGE plpgsql;

-- Execute the fix
SELECT fix_sidebar_section_ordering();

-- Clean up the function
DROP FUNCTION fix_sidebar_section_ordering();

-- Verify the changes
SELECT 
    name,
    section_data->>'title' as title,
    (section_data->>'displayOrder')::int as display_order
FROM sidebar_configurations,
    jsonb_array_elements(configuration_data->'sections') AS section_data
WHERE is_active = true
ORDER BY name, display_order;

-- Optional: Set specific section order for common configurations
-- You can customize this section to set specific orders for different section types

UPDATE sidebar_configurations 
SET configuration_data = jsonb_set(
    configuration_data,
    '{sections}',
    (
        SELECT jsonb_agg(
            CASE 
                WHEN section_data->>'title' = 'OVERVIEW' THEN jsonb_set(section_data, '{displayOrder}', '0')
                WHEN section_data->>'title' = 'ONBOARDING' THEN jsonb_set(section_data, '{displayOrder}', '10')
                WHEN section_data->>'title' = 'ISSUANCE' THEN jsonb_set(section_data, '{displayOrder}', '20')
                WHEN section_data->>'title' = 'FACTORING' THEN jsonb_set(section_data, '{displayOrder}', '30')
                WHEN section_data->>'title' = 'CLIMATE RECEIVABLES' THEN jsonb_set(section_data, '{displayOrder}', '40')
                WHEN section_data->>'title' = 'COMPLIANCE' THEN jsonb_set(section_data, '{displayOrder}', '50')
                WHEN section_data->>'title' = 'WALLET MANAGEMENT' THEN jsonb_set(section_data, '{displayOrder}', '60')
                WHEN section_data->>'title' = 'ADMINISTRATION' THEN jsonb_set(section_data, '{displayOrder}', '100')
                ELSE jsonb_set(section_data, '{displayOrder}', '99')
            END
            ORDER BY 
                CASE section_data->>'title'
                    WHEN 'OVERVIEW' THEN 0
                    WHEN 'ONBOARDING' THEN 10
                    WHEN 'ISSUANCE' THEN 20
                    WHEN 'FACTORING' THEN 30
                    WHEN 'CLIMATE RECEIVABLES' THEN 40
                    WHEN 'COMPLIANCE' THEN 50
                    WHEN 'WALLET MANAGEMENT' THEN 60
                    WHEN 'ADMINISTRATION' THEN 100
                    ELSE 99
                END
        )
        FROM jsonb_array_elements(configuration_data->'sections') AS section_data
    )
),
updated_at = NOW()
WHERE is_active = true;

-- Final verification
SELECT 
    name,
    section_data->>'title' as section_title,
    (section_data->>'displayOrder')::int as display_order
FROM sidebar_configurations,
    jsonb_array_elements(configuration_data->'sections') AS section_data
WHERE is_active = true
ORDER BY name, display_order;
