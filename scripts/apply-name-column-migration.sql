-- STEP 1: Apply this SQL in your Supabase SQL Editor
-- Add name column to redemption_windows table
-- Date: August 23, 2025

-- 1. Add the name column
ALTER TABLE redemption_windows 
ADD COLUMN IF NOT EXISTS name TEXT;

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

-- Verification: Check if migration worked
SELECT 
  COUNT(*) as total_windows,
  COUNT(name) as windows_with_names,
  COUNT(CASE WHEN name IS NULL THEN 1 END) as windows_without_names
FROM redemption_windows;
