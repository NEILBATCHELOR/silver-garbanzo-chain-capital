-- RECOMMENDED APPROACH: Make config_id optional
-- This gives you flexibility without forced template dependency

-- Step 1: Make config_id nullable in redemption_windows
ALTER TABLE redemption_windows 
ALTER COLUMN config_id DROP NOT NULL;

-- Step 2: Add validation to ensure windows have required data
ALTER TABLE redemption_windows 
ADD CONSTRAINT redemption_windows_complete_config 
CHECK (
  -- Either use a template (config_id)
  (config_id IS NOT NULL) OR 
  -- Or have direct configuration 
  (
    submission_date_mode IS NOT NULL AND 
    processing_date_mode IS NOT NULL AND 
    (lockup_days IS NOT NULL OR lockup_days = 0) AND
    processing_offset_days IS NOT NULL
  )
);

-- Step 3: Update service to use direct config (config_id = NULL)
-- No more dummy "Default Redemption Config" creation needed!
