-- Add name column to redemption_windows table
-- This fixes the PGRST204 error: "Could not find the 'name' column"
-- Date: August 23, 2025

-- 1. Add the name column
ALTER TABLE redemption_windows 
ADD COLUMN name TEXT;

-- 2. Set default names for existing records based on status and dates
UPDATE redemption_windows 
SET name = CASE 
  WHEN status = 'upcoming' THEN 'Upcoming Window ' || TO_CHAR(start_date, 'YYYY-MM-DD')
  WHEN status = 'submission_open' THEN 'Open Window ' || TO_CHAR(start_date, 'YYYY-MM-DD')
  WHEN status = 'submission_closed' THEN 'Closed Window ' || TO_CHAR(start_date, 'YYYY-MM-DD')
  WHEN status = 'processing' THEN 'Processing Window ' || TO_CHAR(start_date, 'YYYY-MM-DD')
  WHEN status = 'completed' THEN 'Completed Window ' || TO_CHAR(start_date, 'YYYY-MM-DD')
  WHEN status = 'cancelled' THEN 'Cancelled Window ' || TO_CHAR(start_date, 'YYYY-MM-DD')
  ELSE 'Redemption Window ' || TO_CHAR(start_date, 'YYYY-MM-DD')
END
WHERE name IS NULL;

-- 3. Extract names from notes JSON for recently created windows
UPDATE redemption_windows 
SET name = (notes::json->>'name')
WHERE notes IS NOT NULL 
  AND notes != '' 
  AND (notes::json->>'name') IS NOT NULL
  AND name IS NULL;

-- 4. Set NOT NULL constraint after populating existing records
ALTER TABLE redemption_windows 
ALTER COLUMN name SET NOT NULL;

-- 5. Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_redemption_windows_name 
ON redemption_windows(name);

-- 6. Add check constraint to ensure names are meaningful
ALTER TABLE redemption_windows 
ADD CONSTRAINT chk_redemption_windows_name_length 
CHECK (LENGTH(TRIM(name)) >= 3);

-- 7. Add comment for documentation
COMMENT ON COLUMN redemption_windows.name IS 'Human-readable name for the redemption window, used for display and identification purposes';

-- Verification queries
-- Check if column was added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'redemption_windows' AND column_name = 'name';

-- Check sample data
SELECT id, name, status, start_date, created_at 
FROM redemption_windows 
ORDER BY created_at DESC 
LIMIT 5;
