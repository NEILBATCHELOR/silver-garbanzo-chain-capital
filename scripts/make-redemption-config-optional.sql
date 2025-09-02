-- Make redemption window config optional
-- This allows windows to exist without forced template dependency

-- Step 1: Make config_id nullable
ALTER TABLE redemption_windows 
ALTER COLUMN config_id DROP NOT NULL;

-- Step 2: Add check constraint to ensure either config_id exists OR required fields are populated
ALTER TABLE redemption_windows 
ADD CONSTRAINT redemption_windows_config_or_direct 
CHECK (
  (config_id IS NOT NULL) OR 
  (
    submission_date_mode IS NOT NULL AND 
    processing_date_mode IS NOT NULL AND 
    lockup_days IS NOT NULL AND 
    processing_offset_days IS NOT NULL
  )
);

-- Step 3: Update any existing windows with dummy config to use direct configuration
UPDATE redemption_windows 
SET config_id = NULL 
WHERE config_id IN (
  SELECT id FROM redemption_window_configs 
  WHERE name = 'Default Redemption Config'
);

-- Step 4: Remove orphaned default configs
DELETE FROM redemption_window_configs 
WHERE name = 'Default Redemption Config' 
AND id NOT IN (SELECT DISTINCT config_id FROM redemption_windows WHERE config_id IS NOT NULL);
