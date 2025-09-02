-- Fix Redemption Windows Projects Relationship
-- Date: August 26, 2025
-- Purpose: Add missing foreign key constraint between redemption_windows and projects tables

-- First, verify data integrity - check for any orphaned redemption_windows
SELECT 
    rw.id,
    rw.name,
    rw.project_id,
    p.name as project_name
FROM redemption_windows rw
LEFT JOIN projects p ON rw.project_id = p.id
WHERE rw.project_id IS NOT NULL;

-- Add foreign key constraint for redemption_windows.project_id -> projects.id
ALTER TABLE redemption_windows 
ADD CONSTRAINT fk_redemption_windows_project 
FOREIGN KEY (project_id) REFERENCES projects(id) 
ON DELETE CASCADE;

-- Add index for performance on foreign key column
CREATE INDEX IF NOT EXISTS idx_redemption_windows_project_id 
ON redemption_windows(project_id);

-- Verify the constraint was created successfully
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'redemption_windows'
AND tc.constraint_name = 'fk_redemption_windows_project';

-- Test that Supabase can now use the relationship
-- This query should work after applying the foreign key constraint
-- SELECT 
--     rw.*,
--     p.name as project_name,
--     p.transaction_start_date
-- FROM redemption_windows rw
-- JOIN projects p ON rw.project_id = p.id
-- LIMIT 5;
