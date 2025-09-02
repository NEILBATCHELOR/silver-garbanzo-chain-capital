-- Add Missing Organization Fields Migration
-- Adds fields from onboarding process that are missing from organizations table
-- Created: August 11, 2025

-- Add missing columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS entity_structure TEXT,
ADD COLUMN IF NOT EXISTS issuer_type TEXT,
ADD COLUMN IF NOT EXISTS governance_model TEXT;

-- Add comments for documentation
COMMENT ON COLUMN organizations.entity_structure IS 'Legal entity structure type (single_entity, holding_company, subsidiary, spv, joint_venture)';
COMMENT ON COLUMN organizations.issuer_type IS 'Type of issuer (corporate, government, fund, spv, reit)';
COMMENT ON COLUMN organizations.governance_model IS 'Governance model (board, manager_managed, member_managed, trustee)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_entity_structure ON organizations(entity_structure);
CREATE INDEX IF NOT EXISTS idx_organizations_issuer_type ON organizations(issuer_type);
CREATE INDEX IF NOT EXISTS idx_organizations_governance_model ON organizations(governance_model);

-- Update the updated_at timestamp trigger if it exists
-- (This ensures any updates to these new fields update the timestamp)
UPDATE pg_trigger SET tgenabled = 'O' WHERE tgname = 'set_updated_at' AND tgrelid = 'organizations'::regclass;

-- Add check constraints for valid values
ALTER TABLE organizations 
ADD CONSTRAINT chk_entity_structure 
CHECK (entity_structure IS NULL OR entity_structure IN (
    'single_entity', 
    'holding_company', 
    'subsidiary', 
    'spv', 
    'joint_venture'
));

ALTER TABLE organizations 
ADD CONSTRAINT chk_issuer_type 
CHECK (issuer_type IS NULL OR issuer_type IN (
    'corporate', 
    'government', 
    'fund', 
    'spv', 
    'reit'
));

ALTER TABLE organizations 
ADD CONSTRAINT chk_governance_model 
CHECK (governance_model IS NULL OR governance_model IN (
    'board', 
    'manager_managed', 
    'member_managed', 
    'trustee'
));

-- Update RLS policies to include new fields (if RLS is enabled)
-- Note: This assumes standard RLS policies exist. Adjust as needed.

-- Success message
SELECT 'Missing organization fields added successfully' AS result;
