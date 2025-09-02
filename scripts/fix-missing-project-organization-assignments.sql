-- Fix Missing Project Organization Assignments
-- Created: August 20, 2025
-- Purpose: Create missing project_organization_assignments records for projects that have organization_id but no assignments

-- This script identifies projects with organization_id but missing project_organization_assignments
-- and creates the missing assignments with 'issuer' relationship type

-- Step 1: Identify projects missing assignments
WITH missing_assignments AS (
  SELECT 
    p.id as project_id,
    p.name as project_name,
    p.organization_id,
    COUNT(poa.id) as assignment_count
  FROM projects p 
  LEFT JOIN project_organization_assignments poa ON p.id = poa.project_id AND poa.is_active = true
  WHERE p.organization_id IS NOT NULL
  GROUP BY p.id, p.name, p.organization_id
  HAVING COUNT(poa.id) = 0
)
SELECT 
  project_id,
  project_name,
  organization_id,
  'Missing assignment detected' as status
FROM missing_assignments
ORDER BY project_name;

-- Step 2: Create missing project organization assignments
INSERT INTO project_organization_assignments (
  id,
  project_id,
  organization_id,
  relationship_type,
  notes,
  is_active,
  assigned_by,
  assigned_at,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  p.id as project_id,
  p.organization_id,
  'issuer' as relationship_type,
  'Auto-created to fix missing assignment - created via migration script' as notes,
  true as is_active,
  NULL as assigned_by, -- System generated
  NOW() as assigned_at,
  NOW() as created_at,
  NOW() as updated_at
FROM projects p 
LEFT JOIN project_organization_assignments poa ON p.id = poa.project_id AND poa.is_active = true
WHERE p.organization_id IS NOT NULL
GROUP BY p.id, p.organization_id
HAVING COUNT(poa.id) = 0;

-- Step 3: Verify the fix
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.organization_id,
  poa.id as assignment_id,
  poa.relationship_type,
  poa.notes,
  poa.is_active,
  'Assignment now exists' as status
FROM projects p 
INNER JOIN project_organization_assignments poa ON p.id = poa.project_id 
WHERE p.organization_id IS NOT NULL 
  AND poa.is_active = true
  AND poa.notes LIKE '%Auto-created to fix missing assignment%'
ORDER BY p.created_at DESC;

-- Summary Report
SELECT 
  'Total projects with organization_id' as metric,
  COUNT(*) as count
FROM projects 
WHERE organization_id IS NOT NULL

UNION ALL

SELECT 
  'Projects with active assignments' as metric,
  COUNT(DISTINCT p.id) as count
FROM projects p 
INNER JOIN project_organization_assignments poa ON p.id = poa.project_id 
WHERE p.organization_id IS NOT NULL 
  AND poa.is_active = true

UNION ALL

SELECT 
  'Projects still missing assignments' as metric,
  COUNT(*) as count
FROM (
  SELECT p.id
  FROM projects p 
  LEFT JOIN project_organization_assignments poa ON p.id = poa.project_id AND poa.is_active = true
  WHERE p.organization_id IS NOT NULL
  GROUP BY p.id
  HAVING COUNT(poa.id) = 0
) missing;
