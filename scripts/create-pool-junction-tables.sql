-- Migration: Create junction tables for tokenization pools to manage Energy Assets, RECs, and Incentives
-- Date: August 26, 2025
-- Purpose: Enable pools to contain Energy Assets, RECs, and Incentives similar to PoolManager pattern

-- Pool Energy Assets junction table
CREATE TABLE IF NOT EXISTS climate_pool_energy_assets (
    pool_id UUID NOT NULL,
    asset_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (pool_id, asset_id),
    FOREIGN KEY (pool_id) REFERENCES climate_tokenization_pools(pool_id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES energy_assets(asset_id) ON DELETE CASCADE
);

-- Pool Incentives junction table
CREATE TABLE IF NOT EXISTS climate_pool_incentives (
    pool_id UUID NOT NULL,
    incentive_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (pool_id, incentive_id),
    FOREIGN KEY (pool_id) REFERENCES climate_tokenization_pools(pool_id) ON DELETE CASCADE,
    FOREIGN KEY (incentive_id) REFERENCES climate_incentives(incentive_id) ON DELETE CASCADE
);

-- Create RECs table if it doesn't exist (based on the types file structure)
CREATE TABLE IF NOT EXISTS renewable_energy_credits (
    rec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    vintage_year INTEGER NOT NULL,
    market_type VARCHAR(20) NOT NULL CHECK (market_type IN ('compliance', 'voluntary')),
    price_per_rec DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(12,2) NOT NULL,
    certification VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'retired', 'pending')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (asset_id) REFERENCES energy_assets(asset_id) ON DELETE CASCADE
);

-- Pool RECs junction table
CREATE TABLE IF NOT EXISTS climate_pool_recs (
    pool_id UUID NOT NULL,
    rec_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (pool_id, rec_id),
    FOREIGN KEY (pool_id) REFERENCES climate_tokenization_pools(pool_id) ON DELETE CASCADE,
    FOREIGN KEY (rec_id) REFERENCES renewable_energy_credits(rec_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_climate_pool_energy_assets_pool_id ON climate_pool_energy_assets(pool_id);
CREATE INDEX IF NOT EXISTS idx_climate_pool_energy_assets_asset_id ON climate_pool_energy_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_climate_pool_incentives_pool_id ON climate_pool_incentives(pool_id);
CREATE INDEX IF NOT EXISTS idx_climate_pool_incentives_incentive_id ON climate_pool_incentives(incentive_id);
CREATE INDEX IF NOT EXISTS idx_climate_pool_recs_pool_id ON climate_pool_recs(pool_id);
CREATE INDEX IF NOT EXISTS idx_climate_pool_recs_rec_id ON climate_pool_recs(rec_id);
CREATE INDEX IF NOT EXISTS idx_renewable_energy_credits_asset_id ON renewable_energy_credits(asset_id);
CREATE INDEX IF NOT EXISTS idx_renewable_energy_credits_status ON renewable_energy_credits(status);

-- Create updated_at triggers for the new tables
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to junction tables
CREATE TRIGGER set_climate_pool_energy_assets_updated_at
    BEFORE UPDATE ON climate_pool_energy_assets
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_climate_pool_incentives_updated_at
    BEFORE UPDATE ON climate_pool_incentives
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_climate_pool_recs_updated_at
    BEFORE UPDATE ON climate_pool_recs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_renewable_energy_credits_updated_at
    BEFORE UPDATE ON renewable_energy_credits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- Verify the new tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'climate_pool_%' 
OR table_name = 'renewable_energy_credits'
ORDER BY table_name;
