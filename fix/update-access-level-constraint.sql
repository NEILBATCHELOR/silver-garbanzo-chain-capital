-- Drop the existing constraint
ALTER TABLE credential_vault_storage 
DROP CONSTRAINT IF EXISTS valid_access_level;

-- Add the constraint back with the additional allowed value
ALTER TABLE credential_vault_storage 
ADD CONSTRAINT valid_access_level 
CHECK (access_level IN ('project_admin', 'project_member', 'revoked', 'standard'));

-- Update any existing 'standard' values to 'project_admin' if needed
-- Comment this out if you want to keep existing 'standard' values
-- UPDATE credential_vault_storage 
-- SET access_level = 'project_admin' 
-- WHERE access_level = 'standard';

-- Let the user know the change was successful
SELECT 'Constraint updated successfully' AS result;
