-- Migration: Add project_id to climate tokenization pools and related tables
-- Date: August 26, 2025
-- Purpose: Enable project-scoped tokenization pools for climate receivables

-- Add project_id column to climate_tokenization_pools table
ALTER TABLE climate_tokenization_pools 
ADD COLUMN IF NOT EXISTS project_id UUID;

-- Add foreign key constraint to projects table
-- Note: Uncomment if projects table exists with proper structure
-- ALTER TABLE climate_tokenization_pools 
-- ADD CONSTRAINT fk_climate_tokenization_pools_project 
-- FOREIGN KEY (project_id) REFERENCES projects(project_id);

-- Create index for performance on project_id lookups
CREATE INDEX IF NOT EXISTS idx_climate_tokenization_pools_project_id 
ON climate_tokenization_pools(project_id);

-- Update existing pool to assign to a default project (optional)
-- Note: Replace with actual project UUID if needed
-- UPDATE climate_tokenization_pools 
-- SET project_id = 'cdc4f92c-8da1-4d80-a917-a94eb8ccafa0'
-- WHERE project_id IS NULL;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'climate_tokenization_pools' 
ORDER BY ordinal_position;
