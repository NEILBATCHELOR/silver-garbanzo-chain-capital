-- Enhanced PayerRiskAssessmentService Database Schema
-- Supports user uploaded data sources, market data caching, and enhanced risk assessment

-- User uploaded data sources management
CREATE TABLE IF NOT EXISTS climate_user_data_sources (
  source_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID,
  source_name VARCHAR(255) NOT NULL,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('credit_report', 'financial_statement', 'market_data', 'custom')),
  data_format VARCHAR(20) NOT NULL CHECK (data_format IN ('csv', 'xlsx', 'json', 'xml', 'pdf')),
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  data_schema JSONB DEFAULT '{}',
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_processed TIMESTAMP WITH TIME ZONE,
  processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'error')),
  validation_errors JSONB DEFAULT '[]',
  refresh_frequency VARCHAR(20) DEFAULT 'manual' CHECK (refresh_frequency IN ('manual', 'daily', 'weekly', 'monthly')),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processed data cache from user uploads
CREATE TABLE IF NOT EXISTS climate_user_data_cache (
  cache_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES climate_user_data_sources(source_id) ON DELETE CASCADE,
  entity_id VARCHAR(255) NOT NULL, -- Payer ID or entity reference
  data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('credit_score', 'financial_metrics', 'payment_history')),
  processed_data JSONB NOT NULL,
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  data_quality_score NUMERIC(3,2) DEFAULT 0.5 CHECK (data_quality_score >= 0 AND data_quality_score <= 1.0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data source field mappings for standardization
CREATE TABLE IF NOT EXISTS data_source_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES climate_user_data_sources(source_id) ON DELETE CASCADE,
  source_field VARCHAR(255) NOT NULL,
  target_field VARCHAR(255) NOT NULL,
  data_transform TEXT DEFAULT '',
  validation_rules JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced external API cache (extends existing if exists, creates if not)
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

-- Weather data cache (for free weather service)
CREATE TABLE IF NOT EXISTS weather_cache (
  cache_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  weather_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  provider VARCHAR(50) DEFAULT 'open-meteo',
  location_lat NUMERIC(10,7),
  location_lon NUMERIC(10,7),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weather historical averages (fallback data)
CREATE TABLE IF NOT EXISTS weather_historical_averages (
  location_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location VARCHAR(255) NOT NULL UNIQUE,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  avg_temperature NUMERIC(5,2),
  avg_humidity NUMERIC(5,2),
  avg_sunlight_hours NUMERIC(4,2),
  avg_wind_speed NUMERIC(5,2),
  avg_precipitation NUMERIC(6,2),
  avg_cloud_cover NUMERIC(5,2),
  data_source VARCHAR(100) DEFAULT 'historical_analysis',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced climate risk calculations table
CREATE TABLE IF NOT EXISTS climate_risk_calculations (
  calculation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receivable_id UUID REFERENCES climate_receivables(receivable_id) ON DELETE CASCADE,
  payer_id UUID REFERENCES climate_payers(payer_id),
  credit_risk_score INTEGER NOT NULL CHECK (credit_risk_score >= 0 AND credit_risk_score <= 100),
  credit_risk_confidence NUMERIC(5,2) DEFAULT 85.0 CHECK (credit_risk_confidence >= 0 AND credit_risk_confidence <= 100),
  discount_rate_calculated NUMERIC(6,3) NOT NULL CHECK (discount_rate_calculated >= 0),
  market_adjustments JSONB DEFAULT '{}',
  user_data_sources JSONB DEFAULT '[]',
  data_completeness VARCHAR(20) DEFAULT 'basic' CHECK (data_completeness IN ('basic', 'enhanced', 'comprehensive')),
  methodology_used TEXT,
  factors_considered JSONB DEFAULT '[]',
  policy_impact_assessment JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  calculation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced climate policy impacts table
CREATE TABLE IF NOT EXISTS climate_policy_impacts (
  impact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id VARCHAR(255) NOT NULL,
  policy_title TEXT NOT NULL,
  policy_source VARCHAR(50) DEFAULT 'federal_register' CHECK (policy_source IN ('federal_register', 'congress_gov', 'manual')),
  impact_level VARCHAR(20) DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  sectors_affected JSONB DEFAULT '[]',
  effective_date DATE,
  publication_date DATE,
  impact_on_receivables NUMERIC(3,2) DEFAULT 0 CHECK (impact_on_receivables >= -1 AND impact_on_receivables <= 1),
  policy_url TEXT,
  policy_summary TEXT,
  assessment_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market data snapshots for tracking
CREATE TABLE IF NOT EXISTS market_data_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  treasury_rates JSONB,
  credit_spreads JSONB,
  energy_prices JSONB,
  policy_changes_count INTEGER DEFAULT 0,
  api_call_count INTEGER DEFAULT 0,
  cache_hit_rate NUMERIC(5,4) DEFAULT 0,
  data_sources_used JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_climate_user_data_sources_user_id ON climate_user_data_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_climate_user_data_sources_type_status ON climate_user_data_sources(source_type, processing_status);
CREATE INDEX IF NOT EXISTS idx_climate_user_data_sources_active ON climate_user_data_sources(is_active);

CREATE INDEX IF NOT EXISTS idx_climate_user_data_cache_entity ON climate_user_data_cache(entity_id);
CREATE INDEX IF NOT EXISTS idx_climate_user_data_cache_type ON climate_user_data_cache(data_type);
CREATE INDEX IF NOT EXISTS idx_climate_user_data_cache_expires ON climate_user_data_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_data_source_mappings_source ON data_source_mappings(source_id);

CREATE INDEX IF NOT EXISTS idx_external_api_cache_key ON external_api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_external_api_cache_expires ON external_api_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_weather_cache_key ON weather_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_weather_cache_expires ON weather_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_weather_cache_location ON weather_cache(location_lat, location_lon);

CREATE INDEX IF NOT EXISTS idx_climate_risk_calculations_receivable ON climate_risk_calculations(receivable_id);
CREATE INDEX IF NOT EXISTS idx_climate_risk_calculations_payer ON climate_risk_calculations(payer_id);
CREATE INDEX IF NOT EXISTS idx_climate_risk_calculations_date ON climate_risk_calculations(calculation_date);

CREATE INDEX IF NOT EXISTS idx_climate_policy_impacts_date ON climate_policy_impacts(effective_date);
CREATE INDEX IF NOT EXISTS idx_climate_policy_impacts_level ON climate_policy_impacts(impact_level);
CREATE INDEX IF NOT EXISTS idx_climate_policy_impacts_source ON climate_policy_impacts(policy_source);

CREATE INDEX IF NOT EXISTS idx_market_data_snapshots_date ON market_data_snapshots(snapshot_date);

-- RPC Functions for enhanced risk assessment operations

-- Function to get enhanced risk assessment for a specific receivable
CREATE OR REPLACE FUNCTION get_enhanced_risk_assessment(
  p_receivable_id UUID
) RETURNS JSONB AS $$
DECLARE
  receivable_data RECORD;
  payer_data RECORD;
  latest_calculation RECORD;
  result JSONB;
BEGIN
  -- Get receivable and payer data
  SELECT r.*, p.name as payer_name, p.credit_rating, p.financial_health_score, p.payment_history, p.esg_score
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
          'risk_score', latest_calculation.credit_risk_score,
          'discount_rate', latest_calculation.discount_rate_calculated,
          'confidence_level', latest_calculation.credit_risk_confidence,
          'data_completeness', latest_calculation.data_completeness,
          'calculation_date', latest_calculation.calculation_date,
          'market_adjustments', latest_calculation.market_adjustments,
          'user_data_sources', latest_calculation.user_data_sources,
          'recommendations', latest_calculation.recommendations
        )
      ELSE NULL
    END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save enhanced risk calculation
CREATE OR REPLACE FUNCTION save_enhanced_risk_calculation(
  p_receivable_id UUID,
  p_risk_score INTEGER,
  p_discount_rate NUMERIC,
  p_confidence_level NUMERIC,
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
    recommendations
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
    p_recommendations
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

-- Function to get payer risk assessment with user data
CREATE OR REPLACE FUNCTION get_payer_risk_assessment_with_user_data(
  p_payer_id UUID
) RETURNS JSONB AS $$
DECLARE
  payer_data RECORD;
  user_data_sources JSONB;
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

  -- Get user data sources for this payer
  SELECT jsonb_agg(
    jsonb_build_object(
      'source_id', uds.source_id,
      'source_name', uds.source_name,
      'source_type', uds.source_type,
      'processing_status', uds.processing_status,
      'data_quality_score', COALESCE(udc.data_quality_score, 0),
      'last_processed', uds.last_processed
    )
  )
  INTO user_data_sources
  FROM climate_user_data_sources uds
  LEFT JOIN climate_user_data_cache udc ON uds.source_id = udc.source_id AND udc.entity_id = p_payer_id::text
  WHERE uds.is_active = true 
    AND uds.processing_status = 'completed'
    AND uds.source_type IN ('credit_report', 'financial_statement');

  -- Get recent risk calculations for this payer
  SELECT jsonb_agg(
    jsonb_build_object(
      'calculation_id', calculation_id,
      'receivable_id', receivable_id,
      'risk_score', credit_risk_score,
      'discount_rate', discount_rate_calculated,
      'confidence_level', credit_risk_confidence,
      'data_completeness', data_completeness,
      'calculation_date', calculation_date
    )
  )
  INTO recent_calculations
  FROM (
    SELECT *
    FROM climate_risk_calculations
    WHERE payer_id = p_payer_id
    ORDER BY calculation_date DESC
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
    'user_data_sources', COALESCE(user_data_sources, '[]'::jsonb),
    'recent_calculations', COALESCE(recent_calculations, '[]'::jsonb),
    'last_updated', payer_data.updated_at
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired cache data
CREATE OR REPLACE FUNCTION cleanup_expired_cache_data() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Clean up external API cache
  DELETE FROM external_api_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Clean up weather cache
  DELETE FROM weather_cache WHERE expires_at < NOW();

  -- Clean up user data cache
  DELETE FROM climate_user_data_cache WHERE expires_at < NOW();

  -- Log cleanup
  INSERT INTO market_data_snapshots (
    snapshot_date,
    api_call_count,
    data_sources_used
  ) VALUES (
    NOW(),
    0,
    jsonb_build_array('cache_cleanup')
  );

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_climate_user_data_sources_updated_at 
  BEFORE UPDATE ON climate_user_data_sources 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_climate_policy_impacts_updated_at 
  BEFORE UPDATE ON climate_policy_impacts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weather_historical_averages_updated_at 
  BEFORE UPDATE ON weather_historical_averages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE climate_user_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE climate_user_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_source_mappings ENABLE ROW LEVEL SECURITY;

-- Policy for user data sources - users can only access their own data
CREATE POLICY climate_user_data_sources_user_policy ON climate_user_data_sources
  FOR ALL USING (auth.uid() = user_id);

-- Policy for user data cache - users can only access data from their sources
CREATE POLICY climate_user_data_cache_user_policy ON climate_user_data_cache
  FOR ALL USING (
    source_id IN (
      SELECT source_id FROM climate_user_data_sources WHERE user_id = auth.uid()
    )
  );

-- Policy for data source mappings - users can only access mappings for their sources
CREATE POLICY data_source_mappings_user_policy ON data_source_mappings
  FOR ALL USING (
    source_id IN (
      SELECT source_id FROM climate_user_data_sources WHERE user_id = auth.uid()
    )
  );

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON climate_user_data_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON climate_user_data_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_source_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON external_api_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE ON weather_cache TO authenticated;
GRANT SELECT ON weather_historical_averages TO authenticated;
GRANT SELECT, INSERT ON climate_risk_calculations TO authenticated;
GRANT SELECT ON climate_policy_impacts TO authenticated;
GRANT SELECT ON market_data_snapshots TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_enhanced_risk_assessment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION save_enhanced_risk_calculation(UUID, INTEGER, NUMERIC, NUMERIC, JSONB, JSONB, VARCHAR, TEXT, JSONB, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payer_risk_assessment_with_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_cache_data() TO authenticated;

-- Comments for documentation
COMMENT ON TABLE climate_user_data_sources IS 'User-uploaded data sources for enhanced risk assessment';
COMMENT ON TABLE climate_user_data_cache IS 'Processed and cached data extracted from user uploads';
COMMENT ON TABLE data_source_mappings IS 'Field mappings for standardizing user uploaded data';
COMMENT ON TABLE climate_risk_calculations IS 'Enhanced risk calculations with market data and user data integration';
COMMENT ON TABLE climate_policy_impacts IS 'Policy changes that impact renewable energy receivables';
COMMENT ON TABLE market_data_snapshots IS 'Historical market data snapshots for tracking and analysis';

COMMENT ON FUNCTION get_enhanced_risk_assessment(UUID) IS 'Get comprehensive risk assessment for a receivable including user data';
COMMENT ON FUNCTION save_enhanced_risk_calculation(UUID, INTEGER, NUMERIC, NUMERIC, JSONB, JSONB, VARCHAR, TEXT, JSONB, JSONB, JSONB) IS 'Save enhanced risk calculation with market and user data';
COMMENT ON FUNCTION get_payer_risk_assessment_with_user_data(UUID) IS 'Get payer risk profile enhanced with user uploaded data';
COMMENT ON FUNCTION cleanup_expired_cache_data() IS 'Clean up expired cache entries to maintain performance';
