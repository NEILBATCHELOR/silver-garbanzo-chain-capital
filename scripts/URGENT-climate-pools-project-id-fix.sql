-- URGENT FIX: Add missing project_id column to climate_tokenization_pools
-- Date: August 26, 2025
-- Issue: Console error "column climate_tokenization_pools.project_id does not exist"
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire script
-- 2. Go to your Supabase Dashboard > SQL Editor
-- 3. Paste and run this script
-- 4. Refresh your frontend application

-- Step 1: Add project_id column to climate_tokenization_pools table
ALTER TABLE climate_tokenization_pools 
ADD COLUMN IF NOT EXISTS project_id UUID;

-- Step 2: Create performance index for project_id lookups
CREATE INDEX IF NOT EXISTS idx_climate_tokenization_pools_project_id 
ON climate_tokenization_pools(project_id);

-- Step 3: Optional - Assign existing pools to a default project
-- Uncomment and update with your actual project UUID if needed:
-- UPDATE climate_tokenization_pools 
-- SET project_id = 'your-project-uuid-here'
-- WHERE project_id IS NULL;

-- Step 4: Verify the column was added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'climate_tokenization_pools' 
ORDER BY ordinal_position;

-- Expected result should show 7 columns including the new project_id UUID column
