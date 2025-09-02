-- =====================================================
-- Smart Contract Wallet Infrastructure - CORRECTED
-- =====================================================
-- This migration creates tables for EIP-2535 Diamond wallets,
-- WebAuthn/Passkey authentication, and guardian recovery systems
-- =====================================================

-- =====================================================
-- WebAuthn Credentials Table (for P-256 passkey support)
-- =====================================================
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL,
    public_key_x TEXT NOT NULL, -- P-256 x coordinate (hex)
    public_key_y TEXT NOT NULL, -- P-256 y coordinate (hex)
    authenticator_data TEXT,
    is_primary BOOLEAN DEFAULT false,
    device_name TEXT,
    platform TEXT, -- 'ios', 'android', 'windows', 'macos', 'chrome', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_wallet_id ON webauthn_credentials(wallet_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON webauthn_credentials(credential_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webauthn_credentials_unique ON webauthn_credentials(wallet_id, credential_id);

-- =====================================================
-- WebAuthn Challenges Table (for ceremony tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    challenge TEXT NOT NULL,
    challenge_type TEXT CHECK (challenge_type IN ('registration', 'authentication')) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_wallet_id ON webauthn_challenges(wallet_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_challenge ON webauthn_challenges(challenge);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);

-- =====================================================
-- Guardian System Tables
-- =====================================================
CREATE TABLE IF NOT EXISTS wallet_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    guardian_address TEXT NOT NULL,
    guardian_name TEXT,
    status TEXT CHECK (status IN ('pending_add', 'active', 'pending_remove')) DEFAULT 'pending_add',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    security_period_ends TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_wallet_guardians_wallet_id ON wallet_guardians(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_guardians_address ON wallet_guardians(guardian_address);
CREATE INDEX IF NOT EXISTS idx_wallet_guardians_status ON wallet_guardians(status);

-- =====================================================
-- User Operations Table (EIP-4337 Account Abstraction)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    user_op_hash TEXT NOT NULL UNIQUE,
    sender_address TEXT NOT NULL,
    nonce BIGINT NOT NULL,
    init_code TEXT,
    call_data TEXT NOT NULL,
    call_gas_limit BIGINT NOT NULL,
    verification_gas_limit BIGINT NOT NULL,
    pre_verification_gas BIGINT NOT NULL,
    max_fee_per_gas BIGINT NOT NULL,
    max_priority_fee_per_gas BIGINT NOT NULL,
    paymaster_and_data TEXT,
    signature_data TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'included', 'failed')) DEFAULT 'pending',
    transaction_hash TEXT,
    block_number BIGINT,
    gas_used BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_operations_wallet_id ON user_operations(wallet_id);
CREATE INDEX IF NOT EXISTS idx_user_operations_hash ON user_operations(user_op_hash);
CREATE INDEX IF NOT EXISTS idx_user_operations_sender ON user_operations(sender_address);
CREATE INDEX IF NOT EXISTS idx_user_operations_status ON user_operations(status);

-- =====================================================
-- Triggers for updated_at columns
-- =====================================================
CREATE OR REPLACE FUNCTION update_smart_contract_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to existing tables only if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facet_registry') THEN
        DROP TRIGGER IF EXISTS trigger_facet_registry_updated_at ON facet_registry;
        CREATE TRIGGER trigger_facet_registry_updated_at
            BEFORE UPDATE ON facet_registry
            FOR EACH ROW EXECUTE FUNCTION update_smart_contract_wallet_updated_at();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'smart_contract_wallets') THEN
        DROP TRIGGER IF EXISTS trigger_smart_contract_wallets_updated_at ON smart_contract_wallets;
        CREATE TRIGGER trigger_smart_contract_wallets_updated_at
            BEFORE UPDATE ON smart_contract_wallets
            FOR EACH ROW EXECUTE FUNCTION update_smart_contract_wallet_updated_at();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_facets') THEN
        DROP TRIGGER IF EXISTS trigger_wallet_facets_updated_at ON wallet_facets;
        CREATE TRIGGER trigger_wallet_facets_updated_at
            BEFORE UPDATE ON wallet_facets
            FOR EACH ROW EXECUTE FUNCTION update_smart_contract_wallet_updated_at();
    END IF;
END $$;

-- Apply triggers to new tables
DROP TRIGGER IF EXISTS trigger_webauthn_credentials_updated_at ON webauthn_credentials;
CREATE TRIGGER trigger_webauthn_credentials_updated_at
    BEFORE UPDATE ON webauthn_credentials
    FOR EACH ROW EXECUTE FUNCTION update_smart_contract_wallet_updated_at();

DROP TRIGGER IF EXISTS trigger_wallet_guardians_updated_at ON wallet_guardians;
CREATE TRIGGER trigger_wallet_guardians_updated_at
    BEFORE UPDATE ON wallet_guardians
    FOR EACH ROW EXECUTE FUNCTION update_smart_contract_wallet_updated_at();

DROP TRIGGER IF EXISTS trigger_user_operations_updated_at ON user_operations;
CREATE TRIGGER trigger_user_operations_updated_at
    BEFORE UPDATE ON user_operations
    FOR EACH ROW EXECUTE FUNCTION update_smart_contract_wallet_updated_at();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_operations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on existing tables if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facet_registry') THEN
        ALTER TABLE facet_registry ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'smart_contract_wallets') THEN
        ALTER TABLE smart_contract_wallets ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_facets') THEN
        ALTER TABLE wallet_facets ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Facet registry is public for reading, admin for writing
DROP POLICY IF EXISTS "facet_registry_read_policy" ON facet_registry;
CREATE POLICY "facet_registry_read_policy" ON facet_registry
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "facet_registry_write_policy" ON facet_registry;
CREATE POLICY "facet_registry_write_policy" ON facet_registry
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'super_admin' OR 
        auth.jwt() ->> 'role' = 'admin' OR
        auth.uid() IS NOT NULL  -- Allow authenticated users for development
    );

-- Wallet-related tables accessible by wallet owner (simplified for now)
-- Note: Since investors table uses investor_id as PK and no direct user relationship,
-- we'll use a simplified approach for development

DROP POLICY IF EXISTS "smart_contract_wallets_policy" ON smart_contract_wallets;
CREATE POLICY "smart_contract_wallets_policy" ON smart_contract_wallets
    FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "wallet_facets_policy" ON wallet_facets;
CREATE POLICY "wallet_facets_policy" ON wallet_facets
    FOR ALL USING (auth.uid() IS NOT NULL);

-- WebAuthn credentials accessible by authenticated users
DROP POLICY IF EXISTS "webauthn_credentials_policy" ON webauthn_credentials;
CREATE POLICY "webauthn_credentials_policy" ON webauthn_credentials
    FOR ALL USING (auth.uid() IS NOT NULL);

-- WebAuthn challenges accessible by authenticated users
DROP POLICY IF EXISTS "webauthn_challenges_policy" ON webauthn_challenges;
CREATE POLICY "webauthn_challenges_policy" ON webauthn_challenges
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Wallet guardians accessible by authenticated users
DROP POLICY IF EXISTS "wallet_guardians_policy" ON wallet_guardians;
CREATE POLICY "wallet_guardians_policy" ON wallet_guardians
    FOR ALL USING (auth.uid() IS NOT NULL);

-- User operations accessible by authenticated users
DROP POLICY IF EXISTS "user_operations_policy" ON user_operations;
CREATE POLICY "user_operations_policy" ON user_operations
    FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- Add tables to realtime publication for live updates
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE webauthn_credentials;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_guardians;
ALTER PUBLICATION supabase_realtime ADD TABLE user_operations;

-- Add existing tables to realtime if not already added
DO $$ 
BEGIN
    -- Only add tables that exist and aren't already in the publication
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facet_registry') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE facet_registry;
        EXCEPTION
            WHEN duplicate_object THEN NULL;  -- Table already in publication
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'smart_contract_wallets') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE smart_contract_wallets;
        EXCEPTION
            WHEN duplicate_object THEN NULL;  -- Table already in publication
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_facets') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE wallet_facets;
        EXCEPTION
            WHEN duplicate_object THEN NULL;  -- Table already in publication
        END;
    END IF;
END $$;

-- =====================================================
-- Insert/Update initial facet registry entries
-- =====================================================
-- Only insert if facet_registry table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facet_registry') THEN
        INSERT INTO facet_registry (name, address, version, description, function_selectors, source_code_hash, audit_status, is_active) VALUES
        -- Core Diamond Standard Facets
        ('DiamondCutFacet', '0x1234567890123456789012345678901234567890', '1.0.0', 'EIP-2535 Diamond Cut functionality for adding/removing/replacing facets', ARRAY['0x1f931c1c'], 'placeholder_hash_1', 'passed', true),
        ('DiamondLoupeFacet', '0x2345678901234567890123456789012345678901', '1.0.0', 'EIP-2535 Diamond Loupe functionality for introspection', ARRAY['0x7a0ed627', '0xadfca15e', '0x2f2ff15d', '0x01ffc9a7'], 'placeholder_hash_2', 'passed', true),

        -- Account Management Facets
        ('AccountFacet', '0x3456789012345678901234567890123456789012', '1.0.0', 'Core account functionality and state management', ARRAY['0x6352211e', '0x095ea7b3'], 'placeholder_hash_3', 'passed', true),

        -- Signature Verification Facets
        ('Secp256k1VerificationFacet', '0x4567890123456789012345678901234567890123', '1.0.0', 'Traditional ECDSA (secp256k1) signature verification', ARRAY['0xa9059cbb', '0x23b872dd'], 'placeholder_hash_4', 'passed', true),
        ('Secp256r1VerificationFacet', '0x5678901234567890123456789012345678901234', '1.0.0', 'WebAuthn P-256 (secp256r1) signature verification for passkeys', ARRAY['0xd505accf', '0x8fcbaf0c'], 'placeholder_hash_5', 'passed', true),

        -- Multi-signature and Guardian Facets
        ('MultiSigFacet', '0x6789012345678901234567890123456789012345', '1.0.0', 'Multi-signature wallet functionality with threshold management', ARRAY['0x20c13b0b', '0x8b9e4f93'], 'placeholder_hash_6', 'passed', true),
        ('GuardianFacet', '0x7890123456789012345678901234567890123456', '1.0.0', 'Guardian-based recovery system with time delays', ARRAY['0x5c975abb', '0xa22cb465'], 'placeholder_hash_7', 'passed', true),

        -- Security and Access Control Facets
        ('RestrictionsFacet', '0x8901234567890123456789012345678901234567', '1.0.0', 'Access restrictions and compliance controls', ARRAY['0x42842e0e', '0xb88d4fde'], 'placeholder_hash_8', 'passed', true),
        ('LockFacet', '0x9012345678901234567890123456789012345678', '1.0.0', 'Emergency lock functionality for security incidents', ARRAY['0xe985e9c5', '0x2eb2c2d6'], 'placeholder_hash_9', 'passed', true),

        -- Token and Asset Management Facets
        ('TokenReceiverFacet', '0xa123456789012345678901234567890123456789', '1.0.0', 'ERC token receiving and management functionality', ARRAY['0x150b7a02', '0xf23a6e61'], 'placeholder_hash_10', 'passed', true),

        -- Migration and Upgrade Facets
        ('SignatureMigrationFacet', '0xb234567890123456789012345678901234567890', '1.0.0', 'Signature scheme migration and backwards compatibility', ARRAY['0x4f1ef286', '0x8da5cb5b'], 'placeholder_hash_11', 'passed', true)

        ON CONFLICT (address) DO UPDATE SET
            name = EXCLUDED.name,
            version = EXCLUDED.version,
            description = EXCLUDED.description,
            function_selectors = EXCLUDED.function_selectors,
            source_code_hash = EXCLUDED.source_code_hash,
            audit_status = EXCLUDED.audit_status,
            is_active = EXCLUDED.is_active,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
END $$;

-- =====================================================
-- Table Comments
-- =====================================================
COMMENT ON TABLE webauthn_credentials IS 'WebAuthn/Passkey credentials for P-256 signature verification';
COMMENT ON TABLE webauthn_challenges IS 'WebAuthn ceremony challenges for registration and authentication';
COMMENT ON TABLE wallet_guardians IS 'Guardian addresses for social recovery with time-delayed security';
COMMENT ON TABLE user_operations IS 'EIP-4337 UserOperations for account abstraction and gasless transactions';

-- =====================================================
-- Migration Summary
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Smart Contract Wallet Migration Completed Successfully!';
    RAISE NOTICE 'Created tables: webauthn_credentials, webauthn_challenges, wallet_guardians, user_operations';
    RAISE NOTICE 'Added RLS policies, triggers, and indexes';
    RAISE NOTICE 'Added tables to realtime publication';
    RAISE NOTICE 'Updated facet registry with initial entries';
END $$;
