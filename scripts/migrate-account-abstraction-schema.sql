-- Account Abstraction Schema Migration
-- Phase 3B: Add missing tables for Account Abstraction support
-- Date: August 4, 2025

-- Add missing fields to existing user_operations table
ALTER TABLE user_operations 
ADD COLUMN IF NOT EXISTS actual_gas_cost BIGINT,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Update status check constraint to include 'cancelled'
ALTER TABLE user_operations 
DROP CONSTRAINT IF EXISTS user_operations_status_check;

ALTER TABLE user_operations 
ADD CONSTRAINT user_operations_status_check 
CHECK (status IN ('pending', 'included', 'failed', 'cancelled'));

-- Create paymaster_operations table
CREATE TABLE IF NOT EXISTS paymaster_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_operation_id UUID NOT NULL REFERENCES user_operations(id) ON DELETE CASCADE,
    paymaster_address TEXT NOT NULL,
    paymaster_data TEXT NOT NULL,
    verification_gas_limit BIGINT NOT NULL,
    post_op_gas_limit BIGINT NOT NULL,
    gas_sponsored BIGINT NOT NULL,
    sponsor_address TEXT,
    policy_applied JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create batch_operations table
CREATE TABLE IF NOT EXISTS batch_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_operation_id UUID NOT NULL REFERENCES user_operations(id) ON DELETE CASCADE,
    operation_index INTEGER NOT NULL,
    target_address TEXT NOT NULL,
    value TEXT NOT NULL,
    call_data TEXT NOT NULL,
    success BOOLEAN DEFAULT false,
    return_data TEXT,
    gas_used BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance optimization

-- Existing user_operations indexes (if not already present)
CREATE INDEX IF NOT EXISTS idx_user_operations_wallet_id ON user_operations(wallet_id);
CREATE INDEX IF NOT EXISTS idx_user_operations_status ON user_operations(status);
CREATE INDEX IF NOT EXISTS idx_user_operations_created_at ON user_operations(created_at);
CREATE INDEX IF NOT EXISTS idx_user_operations_sender ON user_operations(sender_address);
CREATE INDEX IF NOT EXISTS idx_user_operations_transaction_hash ON user_operations(transaction_hash);

-- New paymaster_operations indexes
CREATE INDEX IF NOT EXISTS idx_paymaster_operations_user_op ON paymaster_operations(user_operation_id);
CREATE INDEX IF NOT EXISTS idx_paymaster_operations_paymaster ON paymaster_operations(paymaster_address);
CREATE INDEX IF NOT EXISTS idx_paymaster_operations_sponsor ON paymaster_operations(sponsor_address);
CREATE INDEX IF NOT EXISTS idx_paymaster_operations_created_at ON paymaster_operations(created_at);

-- New batch_operations indexes  
CREATE INDEX IF NOT EXISTS idx_batch_operations_user_op ON batch_operations(user_operation_id);
CREATE INDEX IF NOT EXISTS idx_batch_operations_target ON batch_operations(target_address);
CREATE INDEX IF NOT EXISTS idx_batch_operations_index ON batch_operations(operation_index);
CREATE INDEX IF NOT EXISTS idx_batch_operations_success ON batch_operations(success);

-- Add unique constraint on batch operations to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_batch_operations_unique 
ON batch_operations(user_operation_id, operation_index);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_operations_wallet_status 
ON user_operations(wallet_id, status);

CREATE INDEX IF NOT EXISTS idx_user_operations_status_created 
ON user_operations(status, created_at);

CREATE INDEX IF NOT EXISTS idx_paymaster_operations_paymaster_created 
ON paymaster_operations(paymaster_address, created_at);

-- Add comments for documentation
COMMENT ON TABLE paymaster_operations IS 'Tracks paymaster sponsorship for user operations';
COMMENT ON TABLE batch_operations IS 'Individual operations within batched user operations';

COMMENT ON COLUMN paymaster_operations.policy_applied IS 'JSONB storing the sponsorship policy that was applied';
COMMENT ON COLUMN batch_operations.operation_index IS 'Index of operation within the batch (0-based)';
COMMENT ON COLUMN batch_operations.success IS 'Whether this individual operation succeeded';

-- Update table comments
COMMENT ON TABLE user_operations IS 'EIP-4337 UserOperations with complete lifecycle tracking';
