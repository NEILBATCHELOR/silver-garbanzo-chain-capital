-- Climate Receivables Database Schema

-- Energy Assets Table
CREATE TABLE energy_assets (
    asset_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- e.g., 'solar', 'wind', 'hydro'
    location VARCHAR(255) NOT NULL,
    capacity DECIMAL(10,2) NOT NULL,  -- Capacity in MW
    owner_id INT REFERENCES providers(provider_id),  -- FK to an assumed providers table
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Production Data Table
CREATE TABLE production_data (
    production_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES energy_assets(asset_id),
    production_date DATE NOT NULL,
    output_mwh DECIMAL(10,2) NOT NULL CHECK (output_mwh >= 0),  -- Energy output in MWh
    weather_condition_id INT REFERENCES weather_data(weather_id),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weather Data Table
CREATE TABLE weather_data (
    weather_id SERIAL PRIMARY KEY,
    location VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    sunlight_hours DECIMAL(5,2),  -- Relevant for solar
    wind_speed DECIMAL(5,2),  -- Relevant for wind
    temperature DECIMAL(5,2),
    UNIQUE(location, date)
);

-- Payers Table
CREATE TABLE payers (
    payer_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    credit_rating VARCHAR(10),  -- e.g., 'A+', 'B-'
    financial_health_score INT CHECK (financial_health_score >= 0 AND financial_health_score <= 100),
    payment_history TEXT,  -- JSON or text summary of payment reliability
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policies Table
CREATE TABLE policies (
    policy_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    impact_level VARCHAR(50),  -- e.g., 'high', 'medium', 'low'
    effective_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incentives Table
CREATE TABLE incentives (
    incentive_id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,  -- e.g., 'tax_credit', 'REC', 'grant'
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL,  -- e.g., 'applied', 'approved', 'received'
    asset_id INT REFERENCES energy_assets(asset_id),
    receivable_id INT REFERENCES receivables(receivable_id),
    expected_receipt_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Receivables Table
CREATE TABLE receivables (
    receivable_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES energy_assets(asset_id),
    payer_id INT REFERENCES payers(payer_id),
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE NOT NULL,
    risk_score INT CHECK (risk_score >= 0 AND risk_score <= 100),
    discount_rate DECIMAL(5,2),  -- e.g., 3.5%
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tokenization Pools Table
CREATE TABLE tokenization_pools (
    pool_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    risk_profile VARCHAR(50),  -- e.g., 'low', 'medium', 'high'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pool Receivables Mapping Table
CREATE TABLE pool_receivables (
    pool_id INT REFERENCES tokenization_pools(pool_id),
    receivable_id INT REFERENCES receivables(receivable_id),
    PRIMARY KEY (pool_id, receivable_id)
);

-- Investors Table
CREATE TABLE investors (
    investor_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investor Pools Mapping Table
CREATE TABLE investor_pools (
    investor_id INT REFERENCES investors(investor_id),
    pool_id INT REFERENCES tokenization_pools(pool_id),
    investment_amount DECIMAL(15,2) NOT NULL,
    PRIMARY KEY (investor_id, pool_id)
);

-- Cash Flow Projections Table
CREATE TABLE cash_flow_projections (
    projection_id SERIAL PRIMARY KEY,
    projection_date DATE NOT NULL,
    projected_amount DECIMAL(15,2) NOT NULL,
    source_type VARCHAR(50) NOT NULL,  -- e.g., 'receivable', 'incentive'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Risk Factors Table
CREATE TABLE risk_factors (
    factor_id SERIAL PRIMARY KEY,
    receivable_id INT REFERENCES receivables(receivable_id),
    production_risk DECIMAL(5,2),  -- e.g., 20.0 (20%)
    credit_risk DECIMAL(5,2),  -- e.g., 10.0
    policy_risk DECIMAL(5,2),  -- e.g., 15.0
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policy Impacts Table
CREATE TABLE policy_impacts (
    impact_id SERIAL PRIMARY KEY,
    policy_id INT REFERENCES policies(policy_id),
    receivable_id INT REFERENCES receivables(receivable_id),
    asset_id INT REFERENCES energy_assets(asset_id),
    impact_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Configurations Table
CREATE TABLE api_configs (
    config_id SERIAL PRIMARY KEY,
    api_name VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    credentials TEXT,  -- Should be encrypted or securely stored
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cached Weather Data Table
CREATE TABLE cached_weather_data (
    cache_id SERIAL PRIMARY KEY,
    location VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    data_json JSONB NOT NULL,  -- Stores weather details in JSON format
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location, date)
);

-- Carbon Offset Table
CREATE TABLE carbon_offsets (
    offset_id SERIAL PRIMARY KEY,
    project_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'reforestation', 'renewable_energy', 'methane_capture'
    amount DECIMAL(15,2) NOT NULL, -- in tons of CO2
    price_per_ton DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    verification_standard VARCHAR(100), -- e.g., 'Verra', 'Gold Standard'
    verification_date DATE,
    expiration_date DATE,
    status VARCHAR(50) NOT NULL, -- e.g., 'pending', 'verified', 'retired'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Renewable Energy Credits (RECs) Table
CREATE TABLE renewable_energy_credits (
    rec_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES energy_assets(asset_id),
    quantity INT NOT NULL, -- Number of RECs (1 REC = 1 MWh)
    vintage_year INT NOT NULL,
    market_type VARCHAR(50) NOT NULL, -- e.g., 'compliance', 'voluntary'
    price_per_rec DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    certification VARCHAR(100), -- e.g., 'Green-e', 'WREGIS'
    status VARCHAR(50) NOT NULL, -- e.g., 'available', 'sold', 'retired'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create views for reporting and analytics

-- Investor Pool Summary View
CREATE VIEW investor_pool_summary AS
SELECT ip.investor_id, ip.pool_id, tp.name AS pool_name, ip.investment_amount,
       SUM(r.amount) AS total_receivables, AVG(r.risk_score) AS avg_risk_score
FROM investor_pools ip
JOIN tokenization_pools tp ON ip.pool_id = tp.pool_id
JOIN pool_receivables pr ON tp.pool_id = pr.pool_id
JOIN receivables r ON pr.receivable_id = r.receivable_id
GROUP BY ip.investor_id, ip.pool_id, tp.name, ip.investment_amount;

-- Cash Flow Forecast View
CREATE VIEW cash_flow_forecast AS
SELECT projection_date, SUM(projected_amount) AS total_projected,
       source_type
FROM cash_flow_projections
GROUP BY projection_date, source_type
ORDER BY projection_date;
