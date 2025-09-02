-- Redemption Window Relative Dates Enhancement - FIXED VERSION
-- Date: August 23, 2025
-- Adds alternative date configuration options for redemption windows
-- FIXES: Column default casting error for enum types

-- Add new columns to support relative date configurations (without defaults initially)
ALTER TABLE redemption_windows 
ADD COLUMN IF NOT EXISTS submission_date_mode VARCHAR(20),
ADD COLUMN IF NOT EXISTS processing_date_mode VARCHAR(20),
ADD COLUMN IF NOT EXISTS lockup_days INTEGER,
ADD COLUMN IF NOT EXISTS processing_offset_days INTEGER;

-- Set initial values for existing rows
UPDATE redemption_windows 
SET submission_date_mode = 'fixed',
    processing_date_mode = 'fixed',
    processing_offset_days = 1
WHERE submission_date_mode IS NULL OR processing_date_mode IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN redemption_windows.submission_date_mode IS 'Mode for submission dates: "fixed" (use specific dates) or "relative" (days after issuance)';
COMMENT ON COLUMN redemption_windows.processing_date_mode IS 'Mode for processing dates: "fixed" (use specific dates), "same_day" (same as submission), or "offset" (submission + offset days)';
COMMENT ON COLUMN redemption_windows.lockup_days IS 'Number of days after issuance when redemption submissions can begin (0 = same day)';
COMMENT ON COLUMN redemption_windows.processing_offset_days IS 'Number of days after submission period for processing (default 1 = next day)';

-- Create enum types for better data integrity
CREATE TYPE submission_date_mode_enum AS ENUM ('fixed', 'relative');
CREATE TYPE processing_date_mode_enum AS ENUM ('fixed', 'same_day', 'offset');

-- Update columns to use enum types (casting existing values)
ALTER TABLE redemption_windows 
ALTER COLUMN submission_date_mode TYPE submission_date_mode_enum USING submission_date_mode::submission_date_mode_enum;

ALTER TABLE redemption_windows 
ALTER COLUMN processing_date_mode TYPE processing_date_mode_enum USING processing_date_mode::processing_date_mode_enum;

-- Now set the default values for the enum columns
ALTER TABLE redemption_windows 
ALTER COLUMN submission_date_mode SET DEFAULT 'fixed',
ALTER COLUMN processing_date_mode SET DEFAULT 'fixed',
ALTER COLUMN processing_offset_days SET DEFAULT 1;

-- Add NOT NULL constraints after setting defaults and updating existing data
ALTER TABLE redemption_windows 
ALTER COLUMN submission_date_mode SET NOT NULL,
ALTER COLUMN processing_date_mode SET NOT NULL,
ALTER COLUMN processing_offset_days SET NOT NULL;

-- Add constraints for data validation
ALTER TABLE redemption_windows 
ADD CONSTRAINT IF NOT EXISTS chk_lockup_days_non_negative CHECK (lockup_days >= 0),
ADD CONSTRAINT IF NOT EXISTS chk_processing_offset_days_non_negative CHECK (processing_offset_days >= 0);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_redemption_windows_submission_mode ON redemption_windows(submission_date_mode);
CREATE INDEX IF NOT EXISTS idx_redemption_windows_processing_mode ON redemption_windows(processing_date_mode);
CREATE INDEX IF NOT EXISTS idx_redemption_windows_lockup_days ON redemption_windows(lockup_days) WHERE submission_date_mode = 'relative';

-- Add example data showing new functionality (only if we have existing data)
DO $$
DECLARE
    existing_project_id UUID;
BEGIN
    -- Check if we have any existing projects to use
    SELECT project_id INTO existing_project_id FROM redemption_windows LIMIT 1;
    
    IF existing_project_id IS NOT NULL THEN
        -- Example 1: 90-day lockup with next-day processing
        INSERT INTO redemption_windows (
            id, project_id, config_id, 
            submission_date_mode, processing_date_mode,
            lockup_days, processing_offset_days,
            start_date, end_date, submission_start_date, submission_end_date,
            status, max_redemption_amount
        ) VALUES (
            gen_random_uuid(), 
            existing_project_id,
            gen_random_uuid(),
            'relative', 'offset',
            90, 1, -- 90-day lockup, process 1 day after submission
            NOW() + INTERVAL '1 day', NOW() + INTERVAL '2 days', -- Placeholder dates (will be calculated)
            NOW(), NOW() + INTERVAL '1 day', -- Placeholder dates (will be calculated)  
            'upcoming', 1000000
        );

        -- Example 2: Same-day redemption with same-day processing
        INSERT INTO redemption_windows (
            id, project_id, config_id,
            submission_date_mode, processing_date_mode,
            lockup_days, processing_offset_days,
            start_date, end_date, submission_start_date, submission_end_date,
            status, max_redemption_amount
        ) VALUES (
            gen_random_uuid(),
            existing_project_id,
            gen_random_uuid(),
            'relative', 'same_day',
            0, 0, -- Same-day redemption, same-day processing
            NOW(), NOW() + INTERVAL '1 day', -- Placeholder dates (will be calculated)
            NOW(), NOW(), -- Placeholder dates (will be calculated)
            'upcoming', 500000
        );
        
        RAISE NOTICE 'Added example redemption windows with relative date functionality';
    ELSE
        RAISE NOTICE 'No existing redemption windows found, skipping example data insertion';
    END IF;
END $$;