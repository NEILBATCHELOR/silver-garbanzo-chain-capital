-- Climate Receivables Module Migration Script
-- This script creates the necessary tables for the Climate Receivables module

-- Energy Assets Table
CREATE TABLE IF NOT EXISTS energy_assets (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- e.g., 'solar', 'wind', 'hydro'
    location VARCHAR(255) NOT NULL,
    capacity DECIMAL(10,2) NOT NULL,  -- Capacity in MW
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Weather Data Table
CREATE TABLE IF NOT EXISTS weather_data (
    weather_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    sunlight_hours DECIMAL(5,2),  -- Relevant for solar
    wind_speed DECIMAL(5,2),  -- Relevant for wind
    temperature DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(location, date)
);

-- Production Data Table
CREATE TABLE IF NOT EXISTS production_data (
    production_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES energy_assets(asset_id),
    production_date DATE NOT NULL,
    output_mwh DECIMAL(10,2) NOT NULL CHECK (output_mwh >= 0),  -- Energy output in MWh
    weather_condition_id UUID REFERENCES weather_data(weather_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payers Table
CREATE TABLE IF NOT EXISTS climate_payers (
    payer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    credit_rating VARCHAR(10),  -- e.g., 'A+', 'B-'
    financial_health_score INT CHECK (financial_health_score >= 0 AND financial_health_score <= 100),
    payment_history JSONB,  -- JSON data for payment reliability
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Policies Table
CREATE TABLE IF NOT EXISTS climate_policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    impact_level VARCHAR(50),  -- e.g., 'high', 'medium', 'low'
    effective_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Receivables Table
CREATE TABLE IF NOT EXISTS climate_receivables (
    receivable_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES energy_assets(asset_id),
    payer_id UUID REFERENCES climate_payers(payer_id),
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE NOT NULL,
    risk_score INT CHECK (risk_score >= 0 AND risk_score <= 100),
    discount_rate DECIMAL(5,2),  -- e.g., 3.5%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Incentives Table
CREATE TABLE IF NOT EXISTS climate_incentives (
    incentive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,  -- e.g., 'tax_credit', 'REC', 'grant'
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL,  -- e.g., 'applied', 'approved', 'received'
    asset_id UUID REFERENCES energy_assets(asset_id),
    receivable_id UUID REFERENCES climate_receivables(receivable_id),
    expected_receipt_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tokenization Pools Table
CREATE TABLE IF NOT EXISTS climate_tokenization_pools (
    pool_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    risk_profile VARCHAR(50),  -- e.g., 'low', 'medium', 'high'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pool Receivables Mapping Table
CREATE TABLE IF NOT EXISTS climate_pool_receivables (
    pool_id UUID REFERENCES climate_tokenization_pools(pool_id),
    receivable_id UUID REFERENCES climate_receivables(receivable_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (pool_id, receivable_id)
);

-- Climate Investor Pools Table
CREATE TABLE IF NOT EXISTS climate_investor_pools (
    investor_id UUID REFERENCES investors(investor_id),
    pool_id UUID REFERENCES climate_tokenization_pools(pool_id),
    investment_amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (investor_id, pool_id)
);

-- Risk Factors Table
CREATE TABLE IF NOT EXISTS climate_risk_factors (
    factor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID REFERENCES climate_receivables(receivable_id),
    production_risk DECIMAL(5,2),  -- e.g., 20.0 (20%)
    credit_risk DECIMAL(5,2),  -- e.g., 10.0
    policy_risk DECIMAL(5,2),  -- e.g., 15.0
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Policy Impacts Table
CREATE TABLE IF NOT EXISTS climate_policy_impacts (
    impact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES climate_policies(policy_id),
    receivable_id UUID REFERENCES climate_receivables(receivable_id),
    asset_id UUID REFERENCES energy_assets(asset_id),
    impact_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Carbon Offset Table
CREATE TABLE IF NOT EXISTS carbon_offsets (
    offset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'reforestation', 'renewable_energy', 'methane_capture'
    amount DECIMAL(15,2) NOT NULL, -- in tons of CO2
    price_per_ton DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    verification_standard VARCHAR(100), -- e.g., 'Verra', 'Gold Standard'
    verification_date DATE,
    expiration_date DATE,
    status VARCHAR(50) NOT NULL, -- e.g., 'pending', 'verified', 'retired'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Renewable Energy Credits (RECs) Table
CREATE TABLE IF NOT EXISTS renewable_energy_credits (
    rec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES energy_assets(asset_id),
    quantity INT NOT NULL, -- Number of RECs (1 REC = 1 MWh)
    vintage_year INT NOT NULL,
    market_type VARCHAR(50) NOT NULL, -- e.g., 'compliance', 'voluntary'
    price_per_rec DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    certification VARCHAR(100), -- e.g., 'Green-e', 'WREGIS'
    status VARCHAR(50) NOT NULL, -- e.g., 'available', 'sold', 'retired'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cash Flow Projections Table
CREATE TABLE IF NOT EXISTS climate_cash_flow_projections (
    projection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projection_date DATE NOT NULL,
    projected_amount DECIMAL(15,2) NOT NULL,
    source_type VARCHAR(50) NOT NULL,  -- e.g., 'receivable', 'incentive'
    entity_id UUID, -- Reference to the source entity (receivable, incentive, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Token Climate Properties Table
-- This extends the main tokens table with climate-specific properties
-- following the existing architectural pattern for token properties
CREATE TABLE IF NOT EXISTS token_climate_properties (
    token_id UUID PRIMARY KEY REFERENCES tokens(id),
    pool_id UUID REFERENCES climate_tokenization_pools(pool_id),
    average_risk_score DECIMAL(5,2),
    discounted_value DECIMAL(15,2),
    discount_amount DECIMAL(15,2),
    average_discount_rate DECIMAL(5,2),
    security_interest_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create views for reporting and analytics

-- Investor Pool Summary View
CREATE OR REPLACE VIEW climate_investor_pool_summary AS
SELECT 
    ipa.investor_id, 
    ipa.pool_id, 
    ctp.name AS pool_name, 
    ipa.investment_amount,
    SUM(cr.amount) AS total_receivables, 
    AVG(cr.risk_score) AS avg_risk_score
FROM 
    climate_investor_pools ipa
JOIN 
    climate_tokenization_pools ctp ON ipa.pool_id = ctp.pool_id
JOIN 
    climate_pool_receivables cpr ON ctp.pool_id = cpr.pool_id
JOIN 
    climate_receivables cr ON cpr.receivable_id = cr.receivable_id
GROUP BY 
    ipa.investor_id, ipa.pool_id, ctp.name, ipa.investment_amount;

-- Cash Flow Forecast View
CREATE OR REPLACE VIEW climate_cash_flow_forecast AS
SELECT 
    projection_date, 
    SUM(projected_amount) AS total_projected,
    source_type
FROM 
    climate_cash_flow_projections
GROUP BY 
    projection_date, source_type
ORDER BY 
    projection_date;

-- Climate Token Summary View
CREATE OR REPLACE VIEW climate_token_summary AS
SELECT 
    t.id AS token_id,
    t.name,
    t.symbol,
    t.project_id,
    t.status,
    tcp.pool_id,
    ctp.name AS pool_name,
    t.total_supply,
    tcp.average_risk_score,
    tcp.discounted_value,
    tcp.discount_amount,
    tcp.average_discount_rate,
    ctp.risk_profile
FROM 
    tokens t
JOIN 
    token_climate_properties tcp ON t.id = tcp.token_id
JOIN 
    climate_tokenization_pools ctp ON tcp.pool_id = ctp.pool_id;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_production_asset_date ON production_data(asset_id, production_date);
CREATE INDEX IF NOT EXISTS idx_climate_receivables_payer_due ON climate_receivables(payer_id, due_date);
CREATE INDEX IF NOT EXISTS idx_climate_policies_effective_date ON climate_policies(effective_date);
CREATE INDEX IF NOT EXISTS idx_climate_incentives_asset ON climate_incentives(asset_id);
CREATE INDEX IF NOT EXISTS idx_climate_incentives_receivable ON climate_incentives(receivable_id);
CREATE INDEX IF NOT EXISTS idx_token_climate_properties_pool ON token_climate_properties(pool_id);

Key Architectural Changes

Removed Duplicate Table: Replaced the climate_receivable_tokens table with a token_climate_properties table that extends your existing tokens table.
Maintained Token Architecture: Followed your existing pattern where you have a core tokens table and separate property tables for different token types (like your token_erc*, ERC-20, ERC-721 tables).
Added Climate Token View: Created a new view climate_token_summary that joins the tokens table with climate properties for easy querying.
Proper Indexing: Added appropriate indexes for all tables to ensure good query performance.

This approach properly integrates with your existing token architecture rather than creating a parallel system, making it more maintainable and consistent with your current database design.