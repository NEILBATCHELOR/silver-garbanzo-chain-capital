-- Enhanced PayerRiskAssessmentService - Additional Features Migration
-- Creates tables for user data sources, weather data, and policy tracking
-- This extends the basic functionality with enhanced features

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_climate_user_data_sources_user_id ON climate_user_data_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_climate_user_data_sources_type_status ON climate_user_data_sources(source_type, processing_status);
CREATE INDEX IF NOT EXISTS idx_climate_user_data_sources_active ON climate_user_data_sources(is_active);

CREATE INDEX IF NOT EXISTS idx_climate_user_data_cache_entity ON climate_user_data_cache(entity_id);
CREATE INDEX IF NOT EXISTS idx_climate_user_data_cache_type ON climate_user_data_cache(data_type);
CREATE INDEX IF NOT EXISTS idx_climate_user_data_cache_expires ON climate_user_data_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_data_source_mappings_source ON data_source_mappings(source_id);

CREATE INDEX IF NOT EXISTS idx_weather_cache_key ON weather_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_weather_cache_expires ON weather_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_weather_cache_location ON weather_cache(location_lat, location_lon);

CREATE INDEX IF NOT EXISTS idx_market_data_snapshots_date ON market_data_snapshots(snapshot_date);

-- Function to get payer risk assessment with enhanced user data
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

  -- Get user data sources for this payer (if table exists)
  BEGIN
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
  EXCEPTION WHEN others THEN
    user_data_sources := '[]'::jsonb;
  END;

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
  temp_count INTEGER;
BEGIN
  -- Clean up external API cache
  DELETE FROM external_api_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;

  -- Clean up weather cache (if exists)
  BEGIN
    DELETE FROM weather_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
  EXCEPTION WHEN others THEN
    -- Table doesn't exist yet, skip
    NULL;
  END;

  -- Clean up user data cache (if exists)
  BEGIN
    DELETE FROM climate_user_data_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
  EXCEPTION WHEN others THEN
    -- Table doesn't exist yet, skip
    NULL;
  END;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_climate_user_data_sources_updated_at 
  BEFORE UPDATE ON climate_user_data_sources 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies for user data
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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON climate_user_data_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON climate_user_data_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_source_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON weather_cache TO authenticated;
GRANT SELECT, INSERT ON market_data_snapshots TO authenticated;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_payer_risk_assessment_with_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_cache_data() TO authenticated;

-- Comments for documentation
COMMENT ON TABLE climate_user_data_sources IS 'User-uploaded data sources for enhanced risk assessment';
COMMENT ON TABLE climate_user_data_cache IS 'Processed and cached data extracted from user uploads';
COMMENT ON TABLE data_source_mappings IS 'Field mappings for standardizing user uploaded data';
COMMENT ON TABLE weather_cache IS 'Cache for free weather API data';
COMMENT ON TABLE market_data_snapshots IS 'Historical market data snapshots for tracking and analysis';

COMMENT ON FUNCTION get_payer_risk_assessment_with_user_data(UUID) IS 'Get payer risk profile enhanced with user uploaded data';
COMMENT ON FUNCTION cleanup_expired_cache_data() IS 'Clean up expired cache entries to maintain performance';
