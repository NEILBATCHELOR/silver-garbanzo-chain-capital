-- Test Query for Regulatory Exemptions Field Integration
-- This script tests the regulatory exemptions functionality

-- 1. Verify regulatory_exemptions table has data
SELECT 
  region,
  country,
  exemption_type,
  LEFT(explanation, 50) || '...' as explanation_preview
FROM regulatory_exemptions 
ORDER BY region, country, exemption_type
LIMIT 10;

-- 2. Verify projects table has regulatory_exemptions field
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND column_name = 'regulatory_exemptions';

-- 3. Test inserting a project with regulatory exemptions
-- (This would be done via the frontend, but showing the expected structure)
/*
INSERT INTO projects (
  id, name, description, status, project_type, 
  currency, regulatory_exemptions, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'Test Project with Exemptions',
  'Test project to verify regulatory exemptions field',
  'draft',
  'equity',
  'USD',
  ARRAY['dd3f0a98-2148-40b5-b481-9aa7bb999c05', 'aa8ebe68-bdc7-49e6-90c5-dcb05a5b0d61'],
  NOW(),
  NOW()
);
*/

-- 4. Query to verify project exemptions work correctly
SELECT 
  p.id,
  p.name,
  p.regulatory_exemptions,
  array_length(p.regulatory_exemptions, 1) as exemption_count
FROM projects p
WHERE p.regulatory_exemptions IS NOT NULL 
  AND array_length(p.regulatory_exemptions, 1) > 0
LIMIT 5;

-- 5. Join query to show project exemptions with details
SELECT 
  p.name as project_name,
  re.region,
  re.country,
  re.exemption_type,
  re.explanation
FROM projects p
CROSS JOIN LATERAL unnest(p.regulatory_exemptions) as exemption_id
JOIN regulatory_exemptions re ON re.id::text = exemption_id
WHERE p.regulatory_exemptions IS NOT NULL
ORDER BY p.name, re.region, re.country
LIMIT 10;
