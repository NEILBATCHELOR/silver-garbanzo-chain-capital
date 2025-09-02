-- Phase 3D Smart Contract Integration Database Migration
-- Chain Capital Wallet System - Complete Integration Tables
-- Date: August 4, 2025

BEGIN;

-- ============================================================================
-- SIGNATURE MIGRATION TABLES
-- ============================================================================

-- Table for signature migration requests and status
CREATE TABLE IF NOT EXISTS signature_migrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    from_scheme TEXT NOT NULL CHECK (from_scheme IN ('secp256k1', 'secp256r1')),
    to_scheme TEXT NOT NULL CHECK (to_scheme IN ('secp256k1', 'secp256r1')),
    new_public_key TEXT NOT NULL,
    new_credential_id TEXT, -- For WebAuthn migrations
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'finalized', 'cancelled')),
    migration_hash TEXT NOT NULL,
    required_approvals INTEGER NOT NULL DEFAULT 1,
    current_approvals INTEGER NOT NULL DEFAULT 0,
    finalize_after TIMESTAMP WITH TIME ZONE,
    transaction_hash TEXT, -- When finalized
    migration_data JSONB DEFAULT '{}',
    finalized_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for tracking migration approvals
CREATE TABLE IF NOT EXISTS signature_migration_approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    migration_id UUID NOT NULL REFERENCES signature_migrations(id) ON DELETE CASCADE,
    approver_address TEXT NOT NULL,
    signature TEXT NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(migration_id, approver_address)
);

-- ============================================================================
-- WALLET RESTRICTIONS TABLES
-- ============================================================================

-- Table for wallet restriction rules
CREATE TABLE IF NOT EXISTS wallet_restriction_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('whitelist', 'blacklist', 'daily_limit', 'time_restriction', 'amount_limit', 'custom')),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 100,
    rule_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for restriction validation logs (for compliance and debugging)
CREATE TABLE IF NOT EXISTS restriction_validation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    transaction_hash TEXT,
    validation_result BOOLEAN NOT NULL,
    failed_rules JSONB DEFAULT '[]',
    warnings JSONB DEFAULT '[]',
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- WALLET LOCK TABLES
-- ============================================================================

-- Table for wallet locks
CREATE TABLE IF NOT EXISTS wallet_locks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    lock_type TEXT NOT NULL CHECK (lock_type IN ('emergency', 'security', 'maintenance', 'guardian_triggered')),
    is_locked BOOLEAN NOT NULL DEFAULT true,
    locked_by TEXT NOT NULL, -- Address who initiated the lock
    locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unlock_time TIMESTAMP WITH TIME ZONE,
    lock_reason TEXT,
    lock_nonce INTEGER NOT NULL DEFAULT 1,
    unlock_hash TEXT,
    can_unlock_early BOOLEAN NOT NULL DEFAULT true,
    unlocked_by TEXT, -- Address who unlocked
    unlocked_at TIMESTAMP WITH TIME ZONE,
    unlock_reason TEXT,
    lock_data JSONB DEFAULT '{}', -- Additional lock metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- WALLET TRANSACTION DRAFTS TABLE (Enhancement)
-- ============================================================================

-- Table for temporary transaction storage (already exists from Phase 3C)
CREATE TABLE IF NOT EXISTS wallet_transaction_drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id TEXT NOT NULL UNIQUE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    blockchain TEXT NOT NULL,
    transaction_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Signature migration indexes
CREATE INDEX IF NOT EXISTS idx_signature_migrations_wallet_id ON signature_migrations(wallet_id);
CREATE INDEX IF NOT EXISTS idx_signature_migrations_status ON signature_migrations(status);
CREATE INDEX IF NOT EXISTS idx_signature_migrations_created_at ON signature_migrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signature_migration_approvals_migration_id ON signature_migration_approvals(migration_id);

-- Restriction indexes
CREATE INDEX IF NOT EXISTS idx_wallet_restriction_rules_wallet_id ON wallet_restriction_rules(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_restriction_rules_active ON wallet_restriction_rules(wallet_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_wallet_restriction_rules_priority ON wallet_restriction_rules(wallet_id, priority);
CREATE INDEX IF NOT EXISTS idx_restriction_validation_logs_wallet_id ON restriction_validation_logs(wallet_id);
CREATE INDEX IF NOT EXISTS idx_restriction_validation_logs_validated_at ON restriction_validation_logs(validated_at DESC);

-- Lock indexes
CREATE INDEX IF NOT EXISTS idx_wallet_locks_wallet_id ON wallet_locks(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_locks_active ON wallet_locks(wallet_id, is_locked) WHERE is_locked = true;
CREATE INDEX IF NOT EXISTS idx_wallet_locks_created_at ON wallet_locks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_locks_unlock_time ON wallet_locks(unlock_time) WHERE unlock_time IS NOT NULL AND is_locked = true;

-- Transaction draft indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transaction_drafts_wallet_id ON wallet_transaction_drafts(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transaction_drafts_expires_at ON wallet_transaction_drafts(expires_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transaction_drafts_transaction_id ON wallet_transaction_drafts(transaction_id);

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Update timestamp triggers for signature migrations
CREATE OR REPLACE FUNCTION update_signature_migrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_signature_migrations_updated_at
    BEFORE UPDATE ON signature_migrations
    FOR EACH ROW
    EXECUTE FUNCTION update_signature_migrations_updated_at();

-- Update timestamp triggers for restriction rules
CREATE OR REPLACE FUNCTION update_restriction_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restriction_rules_updated_at
    BEFORE UPDATE ON wallet_restriction_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_restriction_rules_updated_at();

-- Update timestamp triggers for locks
CREATE OR REPLACE FUNCTION update_wallet_locks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wallet_locks_updated_at
    BEFORE UPDATE ON wallet_locks
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_locks_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE signature_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_migration_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_restriction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE restriction_validation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transaction_drafts ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be enhanced based on specific security requirements)
CREATE POLICY "signature_migrations_policy" ON signature_migrations
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "signature_migration_approvals_policy" ON signature_migration_approvals
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "wallet_restriction_rules_policy" ON wallet_restriction_rules
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "restriction_validation_logs_policy" ON restriction_validation_logs
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "wallet_locks_policy" ON wallet_locks
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "wallet_transaction_drafts_policy" ON wallet_transaction_drafts
    FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for signature migrations (for live status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE signature_migrations;
ALTER PUBLICATION supabase_realtime ADD TABLE signature_migration_approvals;

-- Enable realtime for wallet locks (for live lock status)
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_locks;

-- Enable realtime for restriction validation logs (for compliance monitoring)
ALTER PUBLICATION supabase_realtime ADD TABLE restriction_validation_logs;

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Function to cleanup expired transaction drafts
CREATE OR REPLACE FUNCTION cleanup_expired_transaction_drafts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM wallet_transaction_drafts 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old validation logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_validation_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM restriction_validation_logs 
    WHERE validated_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

-- Table comments
COMMENT ON TABLE signature_migrations IS 'Tracks signature scheme migrations between secp256k1 (ECDSA) and secp256r1 (WebAuthn) with guardian approval workflow';
COMMENT ON TABLE signature_migration_approvals IS 'Records guardian and owner approvals for signature migrations';
COMMENT ON TABLE wallet_restriction_rules IS 'Defines transaction restriction rules for smart contract wallets (compliance, limits, etc.)';
COMMENT ON TABLE restriction_validation_logs IS 'Logs all restriction validation attempts for compliance and auditing';
COMMENT ON TABLE wallet_locks IS 'Manages emergency lock/unlock functionality with guardian recovery';
COMMENT ON TABLE wallet_transaction_drafts IS 'Temporary storage for unsigned transactions during the signing process';

-- Key column comments
COMMENT ON COLUMN signature_migrations.migration_hash IS 'Cryptographic hash for signature verification and replay protection';
COMMENT ON COLUMN signature_migrations.finalize_after IS 'Timestamp after which migration can be finalized (security delay)';
COMMENT ON COLUMN wallet_restriction_rules.rule_data IS 'JSON configuration for the specific restriction type';
COMMENT ON COLUMN wallet_locks.lock_nonce IS 'Incremental nonce for replay protection in unlock signatures';
COMMENT ON COLUMN wallet_locks.unlock_hash IS 'Hash for signature verification during early unlock';

COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================

-- After running this migration:
-- 1. Update your Supabase TypeScript types: npm run generate-types
-- 2. Test the new services with: npm run test:wallet-integration
-- 3. Verify RLS policies match your security requirements
-- 4. Set up scheduled cleanup jobs for expired drafts and old logs
-- 5. Configure realtime subscriptions in your frontend for live updates

-- Example cleanup job (run via pg_cron or external scheduler):
-- SELECT cron.schedule('cleanup-wallet-drafts', '0 * * * *', 'SELECT cleanup_expired_transaction_drafts();');
-- SELECT cron.schedule('cleanup-validation-logs', '0 2 * * *', 'SELECT cleanup_old_validation_logs();');
