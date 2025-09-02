-- SQL Migration Script: Fix Wallet Dashboard Tables
-- Created: 2025-07-17
-- Purpose: Create network_status table and update wallet_transactions for dashboard compatibility

-- Create network_status table for real-time blockchain network information
CREATE TABLE IF NOT EXISTS network_status (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'operational',
    gas_price TEXT DEFAULT '0 gwei',
    block_height BIGINT DEFAULT 0,
    average_block_time TEXT DEFAULT '0s',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to wallet_transactions table for dashboard compatibility
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS amount TEXT DEFAULT '0',
ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'ethereum',
ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'receive';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_network ON wallet_transactions(network);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_status_name ON network_status(name);

-- Insert sample network status data for development
INSERT INTO network_status (id, name, status, gas_price, block_height, average_block_time) VALUES
('ethereum', 'Ethereum', 'operational', '25 gwei', 18500000, '12s'),
('polygon', 'Polygon', 'operational', '30 gwei', 48500000, '2s'),
('arbitrum', 'Arbitrum', 'operational', '0.1 gwei', 150000000, '1s'),
('optimism', 'Optimism', 'operational', '0.5 gwei', 110000000, '2s'),
('avalanche', 'Avalanche', 'operational', '25 nAVAX', 35000000, '3s')
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    gas_price = EXCLUDED.gas_price,
    block_height = EXCLUDED.block_height,
    average_block_time = EXCLUDED.average_block_time,
    updated_at = now();

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to network_status table
DROP TRIGGER IF EXISTS update_network_status_updated_at ON network_status;
CREATE TRIGGER update_network_status_updated_at
    BEFORE UPDATE ON network_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to wallet_transactions table if it doesn't exist
DROP TRIGGER IF EXISTS update_wallet_transactions_updated_at ON wallet_transactions;
CREATE TRIGGER update_wallet_transactions_updated_at
    BEFORE UPDATE ON wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE network_status IS 'Real-time blockchain network status information for wallet dashboard';
COMMENT ON COLUMN network_status.status IS 'Network status: operational, degraded, or outage';
COMMENT ON COLUMN network_status.gas_price IS 'Current gas price with unit (e.g., "25 gwei")';
COMMENT ON COLUMN network_status.block_height IS 'Current block height/number';
COMMENT ON COLUMN network_status.average_block_time IS 'Average block time with unit (e.g., "12s")';

COMMENT ON COLUMN wallet_transactions.amount IS 'Transaction amount as string for UI display';
COMMENT ON COLUMN wallet_transactions.network IS 'Blockchain network name (ethereum, polygon, etc.)';
COMMENT ON COLUMN wallet_transactions.transaction_type IS 'Transaction type from user perspective: send or receive';
