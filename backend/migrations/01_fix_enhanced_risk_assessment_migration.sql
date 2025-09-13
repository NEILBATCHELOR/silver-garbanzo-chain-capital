-- Fix Enhanced PayerRiskAssessmentService Database Migration
-- Addresses missing function error: get_enhanced_risk_assessment(uuid) does not exist
-- This migration creates all the required tables, columns, and functions

-- Step 1: Add missing column to climate_payers table
ALTER TABLE climate_payers ADD COLUMN IF NOT EXISTS esg_score INTEGER CHECK (esg_score >= 0 AND esg_score <= 100);

-- Step 2: Create external API cache table (required by PayerRiskAssessmentService)
CREATE TABLE IF NOT EXISTS external_api_cache (
  cache_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  api_source VARCHAR(100),
  request_count INTEGER DEFAULT 1,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for external_api_cache
CREATE INDEX IF NOT EXISTS idx_external_api_cache_key ON external_api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_external_api_cache_expires ON external_api_cache(expires_at);

-- Step 4: Update climate_risk_calculations table to match service expectations
-- First check if it exists and has the right structure
DO $$
BEGIN
    -- Add missing columns to climate_risk_calculations if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'climate_risk_calculations' AND column_name = 'credit_risk_confidence') THEN
        ALTER TABLE climate_risk_calculations ADD COLUMN credit_risk_confidence NUMERIC(5,2) DEFAULT 85.0 CHECK (credit_risk_confidence >= 0 AND credit_risk_confidence <= 100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'climate_risk_calculations' AND column_name = 'discount_rate_calculated') THEN
        ALTER TABLE climate_risk_calculations ADD COLUMN discount_rate_calculated NUMERIC(6,3) CHECK (discount_rate_calculated >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'climate_risk_calculations' AND column_name = 'market_adjustments') THEN
        ALTER TABLE climate_risk_calculations ADD COLUMN market_adjustments JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'climate_risk_calculations' AND column_name = 'user_data_sources') THEN
        ALTER TABLE climate_risk_calculations ADD COLUMN user_data_sources JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'climate_risk_calculations' AND column_name = 'data_completeness') THEN
        ALTER TABLE climate_risk_calculations ADD COLUMN data_completeness VARCHAR(20) DEFAULT 'basic' CHECK (data_completeness IN ('basic', 'enhanced', 'comprehensive'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'climate_risk_calculations' AND column_name = 'methodology_used') THEN
        ALTER TABLE climate_risk_calculations ADD COLUMN methodology_used TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'climate_risk_calculations' AND column_name = 'factors_considered') THEN
        ALTER TABLE climate_risk_calculations ADD COLUMN factors_considered JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'climate_risk_calculations' AND column_name = 'policy_impact_assessment') THEN
        ALTER TABLE climate_risk_calculations ADD COLUMN policy_impact_assessment JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'climate_risk_calculations' AND column_name = 'recommendations') THEN
        ALTER TABLE climate_risk_calculations ADD COLUMN recommendations JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'climate_risk_calculations' AND column_name = 'calculation_date') THEN
        ALTER TABLE climate_risk_calculations ADD COLUMN calculation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Step 5: Create the missing function that's causing the error
CREATE OR REPLACE FUNCTION get_enhanced_risk_assessment(
  p_receivable_id UUID
) RETURNS JSONB AS $$
DECLARE
  receivable_data RECORD;
  latest_calculation RECORD;
  result JSONB;
BEGIN
  -- Get receivable and payer data
  SELECT 
    r.*,
    p.name as payer_name, 
    p.credit_rating, 
    p.financial_health_score, 
    p.payment_history, 
    p.esg_score
  INTO receivable_data
  FROM climate_receivables r
  LEFT JOIN climate_payers p ON r.payer_id = p.payer_id
  WHERE r.receivable_id = p_receivable_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Receivable not found');
  END IF;

  -- Get latest risk calculation
  SELECT *
  INTO latest_calculation
  FROM climate_risk_calculations
  WHERE receivable_id = p_receivable_id
  ORDER BY calculation_date DESC
  LIMIT 1;

  -- Build result
  result := jsonb_build_object(
    'receivable_id', receivable_data.receivable_id,
    'payer_id', receivable_data.payer_id,
    'payer_name', receivable_data.payer_name,
    'credit_profile', jsonb_build_object(
      'credit_rating', receivable_data.credit_rating,
      'financial_health_score', receivable_data.financial_health_score,
      'payment_history', receivable_data.payment_history,
      'esg_score', receivable_data.esg_score
    ),
    'latest_calculation', CASE 
      WHEN latest_calculation IS NOT NULL THEN
        jsonb_build_object(
          'risk_score', COALESCE(latest_calculation.credit_risk_score, latest_calculation.risk_score),
          'discount_rate', COALESCE(latest_calculation.discount_rate_calculated, latest_calculation.discount_rate),
          'confidence_level', COALESCE(latest_calculation.credit_risk_confidence, 85.0),
          'data_completeness', COALESCE(latest_calculation.data_completeness, 'basic'),
          'calculation_date', latest_calculation.calculation_date,
          'market_adjustments', COALESCE(latest_calculation.market_adjustments, '{}'),
          'user_data_sources', COALESCE(latest_calculation.user_data_sources, '[]'),
          'recommendations', COALESCE(latest_calculation.recommendations, '[]')
        )
      ELSE NULL
    END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to save enhanced risk calculations
CREATE OR REPLACE FUNCTION save_enhanced_risk_calculation(
  p_receivable_id UUID,
  p_risk_score INTEGER,
  p_discount_rate NUMERIC,
  p_confidence_level NUMERIC DEFAULT 85.0,
  p_market_adjustments JSONB DEFAULT '{}',
  p_user_data_sources JSONB DEFAULT '[]',
  p_data_completeness VARCHAR DEFAULT 'basic',
  p_methodology TEXT DEFAULT '',
  p_factors_considered JSONB DEFAULT '[]',
  p_policy_impacts JSONB DEFAULT '[]',
  p_recommendations JSONB DEFAULT '[]'
) RETURNS UUID AS $$
DECLARE
  calculation_id UUID;
  payer_id_val UUID;
BEGIN
  -- Get payer_id from receivable
  SELECT payer_id INTO payer_id_val
  FROM climate_receivables
  WHERE receivable_id = p_receivable_id;

  -- Insert risk calculation
  INSERT INTO climate_risk_calculations (
    receivable_id,
    payer_id,
    credit_risk_score,
    credit_risk_confidence,
    discount_rate_calculated,
    market_adjustments,
    user_data_sources,
    data_completeness,
    methodology_used,
    factors_considered,
    policy_impact_assessment,
    recommendations,
    calculation_date
  ) VALUES (
    p_receivable_id,
    payer_id_val,
    p_risk_score,
    p_confidence_level,
    p_discount_rate,
    p_market_adjustments,
    p_user_data_sources,
    p_data_completeness,
    p_methodology,
    p_factors_considered,
    p_policy_impacts,
    p_recommendations,
    NOW()
  ) RETURNING calculation_id INTO calculation_id;

  -- Update receivable with latest risk data
  UPDATE climate_receivables
  SET 
    risk_score = p_risk_score,
    discount_rate = p_discount_rate,
    updated_at = NOW()
  WHERE receivable_id = p_receivable_id;

  RETURN calculation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create a simple function to get payer risk assessment
CREATE OR REPLACE FUNCTION get_payer_risk_assessment(
  p_payer_id UUID
) RETURNS JSONB AS $$
DECLARE
  payer_data RECORD;
  recent_calculations JSONB;
  result JSONB;
BEGIN
  -- Get payer data
  SELECT *
  INTO payer_data
  FROM climate_payers
  WHERE payer_id = p_payer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Payer not found');
  END IF;

  -- Get recent risk calculations for this payer
  SELECT jsonb_agg(
    jsonb_build_object(
      'calculation_id', calculation_id,
      'receivable_id', receivable_id,
      'risk_score', COALESCE(credit_risk_score, risk_score),
      'discount_rate', COALESCE(discount_rate_calculated, discount_rate),
      'confidence_level', COALESCE(credit_risk_confidence, 85.0),
      'data_completeness', COALESCE(data_completeness, 'basic'),
      'calculation_date', COALESCE(calculation_date, created_at)
    )
  )
  INTO recent_calculations
  FROM (
    SELECT *
    FROM climate_risk_calculations
    WHERE payer_id = p_payer_id
    ORDER BY COALESCE(calculation_date, created_at) DESC
    LIMIT 5
  ) recent;

  -- Build result
  result := jsonb_build_object(
    'payer_id', payer_data.payer_id,
    'payer_name', payer_data.name,
    'credit_rating', payer_data.credit_rating,
    'financial_health_score', payer_data.financial_health_score,
    'payment_history', payer_data.payment_history,
    'esg_score', payer_data.esg_score,
    'recent_calculations', COALESCE(recent_calculations, '[]'::jsonb),
    'last_updated', payer_data.updated_at
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Grant permissions
GRANT SELECT, INSERT, UPDATE ON external_api_cache TO authenticated;
GRANT EXECUTE ON FUNCTION get_enhanced_risk_assessment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION save_enhanced_risk_calculation(UUID, INTEGER, NUMERIC, NUMERIC, JSONB, JSONB, VARCHAR, TEXT, JSONB, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payer_risk_assessment(UUID) TO authenticated;

-- Step 9: Add helpful comments
COMMENT ON FUNCTION get_enhanced_risk_assessment(UUID) IS 'Get comprehensive risk assessment for a receivable - fixes missing function error';
COMMENT ON FUNCTION save_enhanced_risk_calculation(UUID, INTEGER, NUMERIC, NUMERIC, JSONB, JSONB, VARCHAR, TEXT, JSONB, JSONB, JSONB) IS 'Save enhanced risk calculation with market data';
COMMENT ON FUNCTION get_payer_risk_assessment(UUID) IS 'Get payer risk profile with calculation history';
COMMENT ON TABLE external_api_cache IS 'Cache for external API calls used by PayerRiskAssessmentService';
