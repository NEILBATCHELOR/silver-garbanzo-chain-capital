-- Energy Assets Duplication Comprehensive Fix
-- This script provides database-level duplicate prevention for energy assets

-- Step 1: Clean up existing duplicates (BACKUP YOUR DATA FIRST!)
WITH duplicate_assets AS (
  SELECT name, type, location, capacity, 
         ROW_NUMBER() OVER (PARTITION BY name, type, location, capacity ORDER BY created_at) as rn,
         asset_id
  FROM energy_assets
)
DELETE FROM energy_assets 
WHERE asset_id IN (
  SELECT asset_id FROM duplicate_assets WHERE rn > 1
);

-- Step 2: Add unique constraint to prevent future duplicates
-- This ensures no two assets can have the same name, type, location, and capacity
ALTER TABLE energy_assets 
ADD CONSTRAINT unique_energy_asset_combination 
UNIQUE (name, type, location, capacity);

-- Step 3: Add performance index for duplicate checking
CREATE INDEX IF NOT EXISTS idx_energy_assets_duplicate_check 
ON energy_assets (name, type, location, capacity);

-- Step 4: Add updated_at trigger to maintain data freshness
CREATE OR REPLACE FUNCTION update_energy_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_energy_assets_updated_at_trigger ON energy_assets;
CREATE TRIGGER update_energy_assets_updated_at_trigger
    BEFORE UPDATE ON energy_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_energy_assets_updated_at();

-- Step 5: Create helper function for safe asset insertion
CREATE OR REPLACE FUNCTION insert_energy_asset_safe(
    p_name VARCHAR(255),
    p_type VARCHAR(50),
    p_location VARCHAR(255),
    p_capacity DECIMAL(10,2),
    p_owner_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_asset_id UUID;
    v_existing_count INTEGER;
BEGIN
    -- Check if asset already exists
    SELECT COUNT(*) INTO v_existing_count
    FROM energy_assets
    WHERE name = p_name 
      AND type = p_type 
      AND location = p_location 
      AND capacity = p_capacity;
    
    -- If asset exists, return existing asset_id
    IF v_existing_count > 0 THEN
        SELECT asset_id INTO v_asset_id
        FROM energy_assets
        WHERE name = p_name 
          AND type = p_type 
          AND location = p_location 
          AND capacity = p_capacity
        LIMIT 1;
        
        RETURN v_asset_id;
    END IF;
    
    -- Insert new asset
    INSERT INTO energy_assets (name, type, location, capacity, owner_id)
    VALUES (p_name, p_type, p_location, p_capacity, p_owner_id)
    RETURNING asset_id INTO v_asset_id;
    
    RETURN v_asset_id;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Verify the fix
SELECT 
    'Duplicate Check Results' as check_type,
    COUNT(*) as total_assets,
    COUNT(DISTINCT CONCAT(name, type, location, capacity)) as unique_combinations,
    (COUNT(*) - COUNT(DISTINCT CONCAT(name, type, location, capacity))) as duplicates_remaining
FROM energy_assets;
