-- Fix Tokenization Pools Missing Junction Tables
-- Addresses console errors: relation "climate_pool_*" does not exist
-- Created: August 26, 2025

-- ============================================================================
-- MISSING JUNCTION TABLES FOR TOKENIZATION POOLS
-- ============================================================================

-- 1. Create climate_pool_energy_assets junction table
-- Links tokenization pools to energy assets
CREATE TABLE IF NOT EXISTS public.climate_pool_energy_assets (
    pool_id uuid NOT NULL REFERENCES public.climate_tokenization_pools(pool_id) ON DELETE CASCADE,
    asset_id uuid NOT NULL REFERENCES public.energy_assets(asset_id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT NOW() NOT NULL,
    updated_at timestamptz DEFAULT NOW() NOT NULL,
    project_id uuid REFERENCES public.projects(id),
    PRIMARY KEY (pool_id, asset_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_climate_pool_energy_assets_pool_id 
ON public.climate_pool_energy_assets(pool_id);

CREATE INDEX IF NOT EXISTS idx_climate_pool_energy_assets_asset_id 
ON public.climate_pool_energy_assets(asset_id);

CREATE INDEX IF NOT EXISTS idx_climate_pool_energy_assets_project_id 
ON public.climate_pool_energy_assets(project_id);

-- 2. Create climate_pool_recs junction table
-- Links tokenization pools to renewable energy credits
CREATE TABLE IF NOT EXISTS public.climate_pool_recs (
    pool_id uuid NOT NULL REFERENCES public.climate_tokenization_pools(pool_id) ON DELETE CASCADE,
    rec_id uuid NOT NULL REFERENCES public.renewable_energy_credits(rec_id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT NOW() NOT NULL,
    updated_at timestamptz DEFAULT NOW() NOT NULL,
    project_id uuid REFERENCES public.projects(id),
    PRIMARY KEY (pool_id, rec_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_climate_pool_recs_pool_id 
ON public.climate_pool_recs(pool_id);

CREATE INDEX IF NOT EXISTS idx_climate_pool_recs_rec_id 
ON public.climate_pool_recs(rec_id);

CREATE INDEX IF NOT EXISTS idx_climate_pool_recs_project_id 
ON public.climate_pool_recs(project_id);

-- 3. Create climate_pool_incentives junction table
-- Links tokenization pools to climate incentives
CREATE TABLE IF NOT EXISTS public.climate_pool_incentives (
    pool_id uuid NOT NULL REFERENCES public.climate_tokenization_pools(pool_id) ON DELETE CASCADE,
    incentive_id uuid NOT NULL REFERENCES public.climate_incentives(incentive_id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT NOW() NOT NULL,
    updated_at timestamptz DEFAULT NOW() NOT NULL,
    project_id uuid REFERENCES public.projects(id),
    PRIMARY KEY (pool_id, incentive_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_climate_pool_incentives_pool_id 
ON public.climate_pool_incentives(pool_id);

CREATE INDEX IF NOT EXISTS idx_climate_pool_incentives_incentive_id 
ON public.climate_pool_incentives(incentive_id);

CREATE INDEX IF NOT EXISTS idx_climate_pool_incentives_project_id 
ON public.climate_pool_incentives(project_id);

-- ============================================================================
-- UPDATE TRIGGERS FOR TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers for all junction tables
CREATE TRIGGER update_climate_pool_energy_assets_updated_at 
    BEFORE UPDATE ON public.climate_pool_energy_assets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_climate_pool_recs_updated_at 
    BEFORE UPDATE ON public.climate_pool_recs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_climate_pool_incentives_updated_at 
    BEFORE UPDATE ON public.climate_pool_incentives 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on junction tables
ALTER TABLE public.climate_pool_energy_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_pool_recs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_pool_incentives ENABLE ROW LEVEL SECURITY;

-- RLS policies for climate_pool_energy_assets
CREATE POLICY "Users can view pool energy assets they have access to" 
ON public.climate_pool_energy_assets FOR SELECT
USING (
    auth.uid() IS NOT NULL AND (
        project_id IS NULL OR 
        project_id IN (
            SELECT project_id FROM public.project_access WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can manage pool energy assets for their projects" 
ON public.climate_pool_energy_assets FOR ALL
USING (
    auth.uid() IS NOT NULL AND (
        project_id IS NULL OR 
        project_id IN (
            SELECT project_id FROM public.project_access 
            WHERE user_id = auth.uid() 
            AND access_level IN ('admin', 'editor')
        )
    )
);

-- RLS policies for climate_pool_recs
CREATE POLICY "Users can view pool RECs they have access to" 
ON public.climate_pool_recs FOR SELECT
USING (
    auth.uid() IS NOT NULL AND (
        project_id IS NULL OR 
        project_id IN (
            SELECT project_id FROM public.project_access WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can manage pool RECs for their projects" 
ON public.climate_pool_recs FOR ALL
USING (
    auth.uid() IS NOT NULL AND (
        project_id IS NULL OR 
        project_id IN (
            SELECT project_id FROM public.project_access 
            WHERE user_id = auth.uid() 
            AND access_level IN ('admin', 'editor')
        )
    )
);

-- RLS policies for climate_pool_incentives
CREATE POLICY "Users can view pool incentives they have access to" 
ON public.climate_pool_incentives FOR SELECT
USING (
    auth.uid() IS NOT NULL AND (
        project_id IS NULL OR 
        project_id IN (
            SELECT project_id FROM public.project_access WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can manage pool incentives for their projects" 
ON public.climate_pool_incentives FOR ALL
USING (
    auth.uid() IS NOT NULL AND (
        project_id IS NULL OR 
        project_id IN (
            SELECT project_id FROM public.project_access 
            WHERE user_id = auth.uid() 
            AND access_level IN ('admin', 'editor')
        )
    )
);

-- ============================================================================
-- VALIDATION AND TESTING QUERIES
-- ============================================================================

-- Verify tables were created successfully
DO $$
BEGIN
    -- Check if all tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'climate_pool_energy_assets') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'climate_pool_recs') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'climate_pool_incentives') THEN
        RAISE NOTICE '✅ All tokenization pool junction tables created successfully';
    ELSE
        RAISE WARNING '❌ Some tables may not have been created properly';
    END IF;
END $$;

-- Sample queries to verify table structure
-- Uncomment to test after running migration:

-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name IN ('climate_pool_energy_assets', 'climate_pool_recs', 'climate_pool_incentives')
-- ORDER BY table_name, ordinal_position;

-- ============================================================================
-- CLEANUP (OPTIONAL)
-- ============================================================================

-- Uncomment to add sample test data after migration:
-- INSERT INTO public.climate_pool_energy_assets (pool_id, asset_id) VALUES 
-- ((SELECT pool_id FROM public.climate_tokenization_pools LIMIT 1), 
--  (SELECT asset_id FROM public.energy_assets LIMIT 1))
-- ON CONFLICT (pool_id, asset_id) DO NOTHING;

COMMIT;
