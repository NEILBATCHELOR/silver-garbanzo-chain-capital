-- Phase 3C Week 2: Transaction Building Database Migration
-- Creates wallet_transaction_drafts table for temporary transaction storage

-- Transaction drafts table for storing transactions before broadcasting
CREATE TABLE IF NOT EXISTS wallet_transaction_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT NOT NULL UNIQUE,
    wallet_id UUID NOT NULL,
    blockchain TEXT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    raw_transaction TEXT NOT NULL,
    nonce INTEGER,
    data JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_transaction_drafts_transaction_id 
ON wallet_transaction_drafts(transaction_id);

CREATE INDEX IF NOT EXISTS idx_wallet_transaction_drafts_wallet_id 
ON wallet_transaction_drafts(wallet_id);

CREATE INDEX IF NOT EXISTS idx_wallet_transaction_drafts_expires_at 
ON wallet_transaction_drafts(expires_at);

-- Add foreign key constraint to wallets table
ALTER TABLE wallet_transaction_drafts 
ADD CONSTRAINT fk_wallet_transaction_drafts_wallet_id 
FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_wallet_transaction_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_wallet_transaction_drafts_updated_at ON wallet_transaction_drafts;
CREATE TRIGGER trigger_wallet_transaction_drafts_updated_at
    BEFORE UPDATE ON wallet_transaction_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_transaction_drafts_updated_at();

-- Add cleanup function for expired drafts
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

-- Add comments
COMMENT ON TABLE wallet_transaction_drafts IS 'Temporary storage for transaction drafts before broadcasting';
COMMENT ON COLUMN wallet_transaction_drafts.transaction_id IS 'Unique transaction identifier for client reference';
COMMENT ON COLUMN wallet_transaction_drafts.raw_transaction IS 'Unsigned transaction ready for signing';
COMMENT ON COLUMN wallet_transaction_drafts.expires_at IS 'When this draft expires and should be cleaned up';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON wallet_transaction_drafts TO PUBLIC;
GRANT USAGE ON SCHEMA public TO PUBLIC;
