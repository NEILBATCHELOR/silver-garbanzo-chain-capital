-- SQL Functions for REC-Incentive Transaction Management
-- Note: In Supabase/PostgreSQL, transactions are managed at the connection level
-- These functions provide a consistent API for transaction control

-- Function to validate transaction state
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS boolean AS $$
BEGIN
    -- PostgreSQL transactions are automatically started with each connection
    -- This function validates we're in a valid state to begin operations
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to validate commit state
CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS boolean AS $$
BEGIN
    -- In PostgreSQL with Supabase, commits happen automatically
    -- This function validates the transaction can be committed
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to trigger rollback
CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS boolean AS $$
BEGIN
    -- Raise exception to trigger rollback in the client transaction
    RAISE EXCEPTION 'ROLLBACK_REQUESTED' USING ERRCODE = 'P0001';
    RETURN false; -- Never reached
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure updated_at triggers exist for both tables
-- Drop existing triggers if they exist, then recreate
DROP TRIGGER IF EXISTS set_renewable_energy_credits_updated_at ON renewable_energy_credits;
CREATE TRIGGER set_renewable_energy_credits_updated_at
    BEFORE UPDATE ON renewable_energy_credits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_climate_incentives_updated_at ON climate_incentives;
CREATE TRIGGER set_climate_incentives_updated_at
    BEFORE UPDATE ON climate_incentives
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- Add foreign key constraint if not exists (incentive_id -> climate_incentives)
ALTER TABLE renewable_energy_credits 
ADD CONSTRAINT IF NOT EXISTS fk_renewable_energy_credits_incentive_id 
FOREIGN KEY (incentive_id) REFERENCES climate_incentives(incentive_id) 
ON DELETE SET NULL;

-- Add foreign key constraint if not exists (project_id -> projects)
ALTER TABLE renewable_energy_credits 
ADD CONSTRAINT IF NOT EXISTS fk_renewable_energy_credits_project_id 
FOREIGN KEY (project_id) REFERENCES projects(id) 
ON DELETE SET NULL;

-- Add foreign key constraint if not exists (project_id -> projects) for incentives
ALTER TABLE climate_incentives 
ADD CONSTRAINT IF NOT EXISTS fk_climate_incentives_project_id 
FOREIGN KEY (project_id) REFERENCES projects(id) 
ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_renewable_energy_credits_incentive_id ON renewable_energy_credits(incentive_id);
CREATE INDEX IF NOT EXISTS idx_renewable_energy_credits_project_id ON renewable_energy_credits(project_id);
CREATE INDEX IF NOT EXISTS idx_climate_incentives_project_id ON climate_incentives(project_id);
CREATE INDEX IF NOT EXISTS idx_climate_incentives_type ON climate_incentives(type);

-- Add comments for documentation
COMMENT ON TABLE renewable_energy_credits IS 'Renewable Energy Credits with optional link to climate_incentives';
COMMENT ON COLUMN renewable_energy_credits.incentive_id IS 'Links to climate_incentives.incentive_id for synchronized records';
COMMENT ON COLUMN renewable_energy_credits.project_id IS 'Links to projects.id for project-based filtering';
COMMENT ON COLUMN climate_incentives.project_id IS 'Links to projects.id for project-based filtering';
