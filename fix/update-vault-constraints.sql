-- Fix for both constraints in the credential_vault_storage table

-- 1. First, fix the access_level constraint
ALTER TABLE credential_vault_storage 
DROP CONSTRAINT IF EXISTS valid_access_level;

ALTER TABLE credential_vault_storage 
ADD CONSTRAINT valid_access_level 
CHECK (access_level IN ('project_admin', 'project_member', 'revoked', 'standard'));

-- 2. Now, let's check and fix the encryption_method constraint
-- First, let's add the AES256 value which seems to be what the system is using
ALTER TABLE credential_vault_storage 
DROP CONSTRAINT IF EXISTS valid_encryption_method;

ALTER TABLE credential_vault_storage 
ADD CONSTRAINT valid_encryption_method 
CHECK (encryption_method IN ('AES-256-GCM', 'ChaCha20-Poly1305', 'AES-256-CBC', 'AES256'));

-- 3. Print a message to confirm the changes
SELECT 'Both constraints updated successfully' AS result;

-- 4. Optional: Show the current values in the table for verification
-- SELECT encryption_method, access_level, COUNT(*) 
-- FROM credential_vault_storage 
-- GROUP BY encryption_method, access_level;
