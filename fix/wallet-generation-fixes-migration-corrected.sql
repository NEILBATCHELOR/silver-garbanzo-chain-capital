-- Migration Script: Wallet Generation Fixes and Vault Storage (Corrected)
-- Description: Fix duplicate constraint issues and add secure vault storage for private keys
-- Date: August 18, 2025

-- Part 1: Create credential vault storage table for enhanced private key security
CREATE TABLE IF NOT EXISTS credential_vault_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID NOT NULL REFERENCES project_credentials(id) ON DELETE CASCADE,
    vault_id VARCHAR NOT NULL UNIQUE,
    encrypted_private_key TEXT NOT NULL,
    encryption_method VARCHAR DEFAULT 'AES-256-GCM',
    access_level VARCHAR DEFAULT 'project_admin',
    backup_created BOOLEAN DEFAULT true,
    revoked_at TIMESTAMPTZ NULL,
    revoked_by UUID NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_access_level CHECK (access_level IN ('project_admin', 'project_member', 'revoked')),
    CONSTRAINT valid_encryption_method CHECK (encryption_method IN ('AES-256-GCM', 'ChaCha20-Poly1305', 'AES-256-CBC'))
);

-- Part 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credential_vault_storage_credential_id ON credential_vault_storage(credential_id);
CREATE INDEX IF NOT EXISTS idx_credential_vault_storage_vault_id ON credential_vault_storage(vault_id);
CREATE INDEX IF NOT EXISTS idx_credential_vault_storage_access_level ON credential_vault_storage(access_level);

-- Part 3: Add RLS policies for security (corrected to use organization-based access)
ALTER TABLE credential_vault_storage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access vault storage for projects in their organization
CREATE POLICY "Users can access vault storage for their organization projects" ON credential_vault_storage
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM project_credentials pc
            JOIN projects p ON p.id = pc.project_id
            JOIN user_organization_roles uor ON uor.organization_id = p.organization_id
            WHERE pc.id = credential_vault_storage.credential_id
            AND uor.user_id = auth.uid()
        )
    );

-- Part 4: Create function to handle vault storage updates
CREATE OR REPLACE FUNCTION update_credential_vault_storage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Part 5: Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_update_credential_vault_storage_timestamp ON credential_vault_storage;
CREATE TRIGGER trigger_update_credential_vault_storage_timestamp
    BEFORE UPDATE ON credential_vault_storage
    FOR EACH ROW
    EXECUTE FUNCTION update_credential_vault_storage_timestamp();

-- Part 6: Add vault storage tracking to existing project_credentials
ALTER TABLE project_credentials 
ADD COLUMN IF NOT EXISTS vault_stored BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vault_backup_date TIMESTAMPTZ NULL;

-- Part 7: Create function to safely generate wallets with duplicate prevention
CREATE OR REPLACE FUNCTION check_duplicate_wallet(
    p_project_id UUID,
    p_network VARCHAR,
    p_credential_type VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_credentials 
        WHERE project_id = p_project_id 
        AND network = p_network 
        AND credential_type = p_credential_type 
        AND is_active = true 
        AND revoked_at IS NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Part 8: Clean up any existing duplicate credentials (CAREFUL!)
-- This will keep the most recent credential for each project+network combination
-- and deactivate older ones

DO $$
DECLARE
    dup_record RECORD;
BEGIN
    -- Find and deactivate duplicate credentials
    FOR dup_record IN
        SELECT 
            project_id,
            network,
            credential_type,
            array_agg(id ORDER BY created_at DESC) as credential_ids
        FROM project_credentials 
        WHERE is_active = true 
        AND revoked_at IS NULL
        GROUP BY project_id, network, credential_type
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first (most recent) credential, deactivate the rest
        UPDATE project_credentials 
        SET 
            is_active = false,
            status = 'inactive',
            revoked_at = now(),
            updated_at = now()
        WHERE id = ANY(dup_record.credential_ids[2:])
        AND project_id = dup_record.project_id
        AND network = dup_record.network;
        
        RAISE NOTICE 'Deactivated % duplicate credentials for project % network %', 
            array_length(dup_record.credential_ids, 1) - 1,
            dup_record.project_id, 
            dup_record.network;
    END LOOP;
END $$;

-- Part 9: Add comments for documentation
COMMENT ON TABLE credential_vault_storage IS 'Secure storage for wallet private keys with encryption and access controls';
COMMENT ON COLUMN credential_vault_storage.encrypted_private_key IS 'Private key encrypted using specified encryption method';
COMMENT ON COLUMN credential_vault_storage.vault_id IS 'Unique identifier for vault storage entry';
COMMENT ON COLUMN credential_vault_storage.access_level IS 'Access level: project_admin, project_member, or revoked';
COMMENT ON FUNCTION check_duplicate_wallet(UUID, VARCHAR, VARCHAR) IS 'Check if wallet already exists for project+network combination';

-- Part 10: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON credential_vault_storage TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Part 11: Create monitoring view for vault storage status
CREATE OR REPLACE VIEW vault_storage_status AS
SELECT 
    pc.project_id,
    pc.network,
    pc.credential_type,
    pc.wallet_address,
    pc.is_active,
    pc.created_at as credential_created,
    cvs.vault_id,
    cvs.access_level,
    cvs.backup_created,
    cvs.created_at as vault_created,
    CASE 
        WHEN cvs.id IS NOT NULL THEN 'vault_stored'
        WHEN pc.metadata->>'vault_storage' IS NOT NULL THEN 'metadata_fallback'
        ELSE 'no_backup'
    END as storage_status
FROM project_credentials pc
LEFT JOIN credential_vault_storage cvs ON pc.id = cvs.credential_id
WHERE pc.is_active = true
ORDER BY pc.created_at DESC;

COMMENT ON VIEW vault_storage_status IS 'Monitor vault storage status for all active project credentials';

-- Part 12: Create alternative policy for credential creators (additional access)
CREATE POLICY "Credential creators can access their vault storage" ON credential_vault_storage
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM project_credentials pc
            WHERE pc.id = credential_vault_storage.credential_id
            AND pc.created_by = auth.uid()
        )
    );

-- Part 13: Success message
DO $$
BEGIN
    RAISE NOTICE 'Wallet generation fixes and vault storage migration completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update frontend to use ProjectWalletGeneratorFixed component';
    RAISE NOTICE '2. Test wallet generation with duplicate prevention';
    RAISE NOTICE '3. Verify vault storage functionality';
    RAISE NOTICE '4. Download vault backup files to test private key storage';
END $$;
