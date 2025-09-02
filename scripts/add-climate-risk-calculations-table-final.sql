-- Fix for climate receivables form submission and automated risk calculation
-- This creates the missing climate_risk_calculations table required by the automated risk calculation engine
-- FIXED VERSION: Corrected RLS policies for climate_receivables table structure

-- Create climate_risk_calculations table
CREATE TABLE IF NOT EXISTS public.climate_risk_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL REFERENCES public.climate_receivables(receivable_id) ON DELETE CASCADE,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Production Risk Components
    production_risk_score DECIMAL(5,4) NOT NULL CHECK (production_risk_score >= 0 AND production_risk_score <= 1),
    production_risk_factors TEXT[] NOT NULL DEFAULT '{}',
    production_risk_confidence DECIMAL(5,4) NOT NULL CHECK (production_risk_confidence >= 0 AND production_risk_confidence <= 1),
    last_weather_update TIMESTAMPTZ,
    
    -- Credit Risk Components  
    credit_risk_score DECIMAL(5,4) NOT NULL CHECK (credit_risk_score >= 0 AND credit_risk_score <= 1),
    credit_risk_factors TEXT[] NOT NULL DEFAULT '{}',
    credit_risk_confidence DECIMAL(5,4) NOT NULL CHECK (credit_risk_confidence >= 0 AND credit_risk_confidence <= 1),
    last_credit_update TIMESTAMPTZ,
    
    -- Policy Risk Components
    policy_risk_score DECIMAL(5,4) NOT NULL CHECK (policy_risk_score >= 0 AND policy_risk_score <= 1),
    policy_risk_factors TEXT[] NOT NULL DEFAULT '{}',
    policy_risk_confidence DECIMAL(5,4) NOT NULL CHECK (policy_risk_confidence >= 0 AND policy_risk_confidence <= 1),
    last_policy_update TIMESTAMPTZ,
    
    -- Composite Risk Assessment
    composite_risk_score DECIMAL(5,4) NOT NULL CHECK (composite_risk_score >= 0 AND composite_risk_score <= 1),
    composite_risk_level TEXT NOT NULL CHECK (composite_risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    composite_risk_confidence DECIMAL(5,4) NOT NULL CHECK (composite_risk_confidence >= 0 AND composite_risk_confidence <= 1),
    
    -- Discount Rate Calculation
    discount_rate_calculated DECIMAL(8,4) NOT NULL,
    discount_rate_previous DECIMAL(8,4),
    discount_rate_change DECIMAL(8,4),
    discount_rate_reason TEXT,
    
    -- Risk Management
    recommendations TEXT[] NOT NULL DEFAULT '{}',
    alerts JSONB NOT NULL DEFAULT '[]',
    next_review_date TIMESTAMPTZ NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_climate_risk_calculations_receivable_id ON public.climate_risk_calculations(receivable_id);
CREATE INDEX IF NOT EXISTS idx_climate_risk_calculations_calculated_at ON public.climate_risk_calculations(calculated_at);
CREATE INDEX IF NOT EXISTS idx_climate_risk_calculations_next_review ON public.climate_risk_calculations(next_review_date);
CREATE INDEX IF NOT EXISTS idx_climate_risk_calculations_risk_level ON public.climate_risk_calculations(composite_risk_level);

-- Create index for active calculations (standard index)
CREATE INDEX IF NOT EXISTS idx_climate_risk_calculations_active ON public.climate_risk_calculations(receivable_id, next_review_date);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_climate_risk_calculations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_climate_risk_calculations_updated_at
    BEFORE UPDATE ON public.climate_risk_calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_climate_risk_calculations_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.climate_risk_calculations ENABLE ROW LEVEL SECURITY;

-- FIXED RLS POLICIES: Simplified for climate_receivables table structure
-- Allow all authenticated users to view risk calculations
CREATE POLICY "Authenticated users can view risk calculations" ON public.climate_risk_calculations
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Allow all authenticated users to create risk calculations
CREATE POLICY "Authenticated users can create risk calculations" ON public.climate_risk_calculations
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow all authenticated users to update risk calculations
CREATE POLICY "Authenticated users can update risk calculations" ON public.climate_risk_calculations
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- Allow all authenticated users to delete risk calculations (if needed)
CREATE POLICY "Authenticated users can delete risk calculations" ON public.climate_risk_calculations
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- Add comment
COMMENT ON TABLE public.climate_risk_calculations IS 'Automated risk calculation results for climate receivables including production, credit, and policy risk components. Access controlled by authentication status.';

-- Verify table creation
SELECT 
    'climate_risk_calculations table created successfully' as status,
    count(*) as initial_row_count
FROM public.climate_risk_calculations;