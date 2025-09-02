-- Fix for notification_settings foreign key constraint violation
-- This script addresses the issue where notification_settings table contains
-- project_id values that don't exist in the projects table

-- Issue: Error creating notification settings: {code: '23503', details: 'Key (project_id)=(5ca9e144-815c-4442-9c98-b175e453076a) is not present in table "projects".'}

-- Step 1: Identify orphaned notification_settings records
SELECT 
    ns.id,
    ns.user_id,
    ns.project_id,
    ns.created_at
FROM notification_settings ns
LEFT JOIN projects p ON ns.project_id = p.id
WHERE ns.project_id IS NOT NULL 
AND p.id IS NULL;

-- Step 2: Clean up orphaned notification_settings records by setting project_id to NULL
-- This preserves the notification settings but removes the invalid foreign key reference
UPDATE notification_settings 
SET 
    project_id = NULL,
    updated_at = NOW()
WHERE project_id IS NOT NULL 
AND project_id NOT IN (SELECT id FROM projects);

-- Step 3: Verify the cleanup
SELECT 
    COUNT(*) as total_notification_settings,
    COUNT(project_id) as settings_with_project_id,
    COUNT(CASE WHEN project_id IS NOT NULL THEN 1 END) as valid_project_references
FROM notification_settings ns
LEFT JOIN projects p ON ns.project_id = p.id;

-- Step 4: Show remaining notification_settings records
SELECT 
    ns.id,
    ns.user_id,
    ns.project_id,
    CASE 
        WHEN ns.project_id IS NULL THEN 'Global Settings'
        WHEN p.id IS NOT NULL THEN p.name
        ELSE 'ORPHANED (should not exist)'
    END as project_status,
    ns.created_at,
    ns.updated_at
FROM notification_settings ns
LEFT JOIN projects p ON ns.project_id = p.id
ORDER BY ns.created_at DESC;

-- Step 5: Prevent future issues by adding a check constraint (optional)
-- This would prevent inserting invalid project_ids in the future
-- Uncomment the next lines if you want to add this constraint:

-- ALTER TABLE notification_settings 
-- ADD CONSTRAINT check_valid_project_id 
-- CHECK (
--     project_id IS NULL OR 
--     project_id IN (SELECT id FROM projects)
-- );

-- Note: The above check constraint may cause performance issues on large tables
-- Alternative approach: Use application-level validation (which we've implemented in the service)

-- Step 6: Create an index to improve performance of project_id lookups
CREATE INDEX IF NOT EXISTS idx_notification_settings_project_id 
ON notification_settings(project_id) 
WHERE project_id IS NOT NULL;

-- Summary of changes:
-- 1. Cleaned up orphaned notification_settings records by setting project_id to NULL
-- 2. Added performance index for project_id lookups  
-- 3. Application-level validation added in notificationSettingsService.ts to prevent future issues
-- 4. ProductLifecycleManager.tsx enhanced with project validation and graceful error handling
