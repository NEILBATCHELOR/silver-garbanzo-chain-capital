-- Add Compliance Check Tracking Columns to Investors Table
-- Created: August 12, 2025
-- Purpose: Track who performed compliance checks with user information and timestamps

-- Add columns to track compliance check details
ALTER TABLE investors 
ADD COLUMN IF NOT EXISTS compliance_checked_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS compliance_checked_email TEXT,
ADD COLUMN IF NOT EXISTS compliance_checked_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance on compliance check queries
CREATE INDEX IF NOT EXISTS idx_investors_compliance_checked_by ON investors(compliance_checked_by);
CREATE INDEX IF NOT EXISTS idx_investors_compliance_checked_at ON investors(compliance_checked_at);
CREATE INDEX IF NOT EXISTS idx_investors_last_compliance_check ON investors(last_compliance_check);

-- Add comments to document the new columns
COMMENT ON COLUMN investors.compliance_checked_by IS 'UUID of the user who performed the compliance check';
COMMENT ON COLUMN investors.compliance_checked_email IS 'Email of the user who performed the compliance check for audit trail';
COMMENT ON COLUMN investors.compliance_checked_at IS 'Timestamp when the compliance check was confirmed';

-- Verify the new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'investors' 
AND column_name IN ('compliance_checked_by', 'compliance_checked_email', 'compliance_checked_at')
ORDER BY column_name;
