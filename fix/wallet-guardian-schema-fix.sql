-- Guardian Recovery Schema Fixes
-- Add missing tables and columns for smart contract wallet guardian system

-- Add missing column to wallet_guardians
ALTER TABLE wallet_guardians 
ADD COLUMN IF NOT EXISTS is_emergency_contact BOOLEAN DEFAULT false;

-- Create recovery_proposals table
CREATE TABLE IF NOT EXISTS recovery_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    proposed_by UUID NOT NULL REFERENCES wallet_guardians(id) ON DELETE CASCADE,
    recovery_address TEXT NOT NULL,
    proposal_type TEXT NOT NULL CHECK (proposal_type IN ('owner_recovery', 'guardian_change', 'emergency_recovery')) DEFAULT 'owner_recovery',
    justification TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'expired')) DEFAULT 'pending',
    required_approvals INTEGER NOT NULL DEFAULT 2,
    current_approvals INTEGER NOT NULL DEFAULT 0,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    execution_tx_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP WITH TIME ZONE
);

-- Create guardian_approvals table
CREATE TABLE IF NOT EXISTS guardian_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recovery_proposal_id UUID NOT NULL REFERENCES recovery_proposals(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES wallet_guardians(id) ON DELETE CASCADE,
    approval_status TEXT NOT NULL CHECK (approval_status IN ('approved', 'rejected')) DEFAULT 'approved',
    signature_data TEXT,
    justification TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(recovery_proposal_id, guardian_id)
);

-- Create WebAuthn credentials table if not exists
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key_x TEXT NOT NULL, -- P-256 x coordinate
    public_key_y TEXT NOT NULL, -- P-256 y coordinate
    authenticator_data TEXT,
    counter INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    device_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recovery_proposals_wallet_id ON recovery_proposals(wallet_id);
CREATE INDEX IF NOT EXISTS idx_recovery_proposals_status ON recovery_proposals(status);
CREATE INDEX IF NOT EXISTS idx_guardian_approvals_proposal_id ON guardian_approvals(recovery_proposal_id);
CREATE INDEX IF NOT EXISTS idx_guardian_approvals_guardian_id ON guardian_approvals(guardian_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_wallet_id ON webauthn_credentials(wallet_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON webauthn_credentials(credential_id);

-- Add RLS policies if needed
ALTER TABLE recovery_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY IF NOT EXISTS "Users can view their wallet recovery proposals" ON recovery_proposals
    FOR SELECT USING (auth.uid()::text = (SELECT investor_id::text FROM wallets WHERE id = wallet_id));

CREATE POLICY IF NOT EXISTS "Users can create recovery proposals for their wallets" ON recovery_proposals
    FOR INSERT WITH CHECK (auth.uid()::text = (SELECT investor_id::text FROM wallets WHERE id = wallet_id));

CREATE POLICY IF NOT EXISTS "Guardians can view recovery proposals for their wallets" ON recovery_proposals
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM wallet_guardians wg 
        WHERE wg.wallet_id = recovery_proposals.wallet_id 
        AND wg.guardian_address = auth.uid()::text
        AND wg.status = 'active'
    ));

CREATE POLICY IF NOT EXISTS "Guardians can approve recovery proposals" ON guardian_approvals
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM wallet_guardians wg 
        JOIN recovery_proposals rp ON rp.id = recovery_proposal_id
        WHERE wg.id = guardian_id 
        AND wg.guardian_address = auth.uid()::text
        AND wg.status = 'active'
    ));

CREATE POLICY IF NOT EXISTS "Users can manage their WebAuthn credentials" ON webauthn_credentials
    FOR ALL USING (auth.uid()::text = (SELECT investor_id::text FROM wallets WHERE id = wallet_id));
