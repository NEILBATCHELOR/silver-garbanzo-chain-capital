-- SIMPLE APPROACH: Remove template dependency entirely
-- Use this if you'll never need standardized redemption policies

-- Step 1: Remove the foreign key constraint
ALTER TABLE redemption_windows 
DROP CONSTRAINT redemption_windows_config_id_fkey;

-- Step 2: Remove the config_id column entirely  
ALTER TABLE redemption_windows 
DROP COLUMN config_id;

-- Step 3: Optionally drop the configs table if unused
-- DROP TABLE redemption_window_configs; -- Only if you're sure you won't need templates

-- Result: redemption_windows become completely independent
-- No template system, no forced relationships, pure window configuration
