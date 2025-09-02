-- Fix for Orphaned Lifecycle Events Issue
-- Problem: Lifecycle events exist for product ID efb5ece2-7f1c-41f4-bb51-71499b6d77a5 
-- but no corresponding project record exists in the projects table

-- Step 1: Create the missing project record based on existing lifecycle events
INSERT INTO projects (
  id, 
  name, 
  project_type, 
  status, 
  description,
  created_at, 
  updated_at
) VALUES (
  'efb5ece2-7f1c-41f4-bb51-71499b6d77a5',
  'Capital Protected Note - Structured Product',
  'structured_products',
  'active',
  'Capital protected notes with annual coupon payments of 4.5%. Initial issuance of 10M units with lifecycle events for Issuance and Coupon Payment.',
  '2025-08-15T00:00:00.000Z',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  project_type = EXCLUDED.project_type,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Step 2: Verify the fix by checking the project exists
SELECT 
  p.id,
  p.name,
  p.project_type,
  p.status,
  COUNT(ple.id) as lifecycle_events_count
FROM projects p
LEFT JOIN product_lifecycle_events ple ON p.id = ple.product_id
WHERE p.id = 'efb5ece2-7f1c-41f4-bb51-71499b6d77a5'
GROUP BY p.id, p.name, p.project_type, p.status;

-- Step 3: Show the existing lifecycle events for verification
SELECT 
  id,
  event_type,
  event_date,
  quantity,
  details,
  status,
  created_at
FROM product_lifecycle_events 
WHERE product_id = 'efb5ece2-7f1c-41f4-bb51-71499b6d77a5'
ORDER BY event_date;

-- Step 4: Check for any other orphaned lifecycle events
SELECT DISTINCT
  ple.product_id,
  ple.product_type,
  COUNT(ple.id) as event_count,
  CASE WHEN p.id IS NULL THEN 'ORPHANED' ELSE 'HAS_PROJECT' END as status
FROM product_lifecycle_events ple
LEFT JOIN projects p ON ple.product_id = p.id
GROUP BY ple.product_id, ple.product_type, p.id
HAVING p.id IS NULL
ORDER BY event_count DESC;