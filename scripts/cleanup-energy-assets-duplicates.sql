-- Quick Duplicate Cleanup Script for Energy Assets
-- Run this first to remove current duplicates, then apply the main fix

-- Step 1: Backup current data (optional but recommended)
-- CREATE TABLE energy_assets_backup AS SELECT * FROM energy_assets;

-- Step 2: Identify and remove duplicates, keeping the oldest record
WITH ranked_assets AS (
  SELECT 
    asset_id,
    name,
    type,
    location,
    capacity,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY name, type, location, capacity 
      ORDER BY created_at ASC
    ) as rn
  FROM energy_assets
)
DELETE FROM energy_assets 
WHERE asset_id IN (
  SELECT asset_id 
  FROM ranked_assets 
  WHERE rn > 1
);

-- Step 3: Verify cleanup
SELECT 
  'Cleanup Results' as status,
  COUNT(*) as total_assets_remaining,
  COUNT(DISTINCT CONCAT(name, type, location, capacity)) as unique_combinations,
  (COUNT(*) - COUNT(DISTINCT CONCAT(name, type, location, capacity))) as duplicates_remaining
FROM energy_assets;

-- Step 4: Show what was cleaned up
SELECT 
  name,
  type, 
  location,
  capacity,
  'Duplicate removed' as action
FROM energy_assets_backup 
WHERE CONCAT(name, type, location, capacity) IN (
  SELECT CONCAT(name, type, location, capacity)
  FROM energy_assets_backup
  GROUP BY name, type, location, capacity
  HAVING COUNT(*) > 1
)
AND asset_id NOT IN (SELECT asset_id FROM energy_assets);
