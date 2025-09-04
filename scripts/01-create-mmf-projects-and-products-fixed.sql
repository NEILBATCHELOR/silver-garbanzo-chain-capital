-- Money Market Fund Projects & Products
-- Fixed to comply with projects_project_type_check constraint and organizations schema

-- First, ensure we have a default organization to reference
INSERT INTO organizations (id, name, created_at, updated_at, legal_name, status)
VALUES (
    '689a0933-a0f4-4665-8de7-9a701dd67580',
    'Chain Capital',
    NOW(),
    NOW(),
    'Chain Capital LLC',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- Create Money Market Fund project with correct project_type
INSERT INTO projects (
    id,
    name,
    description,
    created_at,
    updated_at,
    project_type, -- Changed from 'money_market_fund' to 'funds_etfs_etps'
    organization_id,
    is_primary,
    investment_status,
    status,
    target_raise,
    minimum_investment,
    estimated_yield_percentage,
    currency
) VALUES (
    'f2aa2753-2a55-4fe9-bb72-5d9155f156be',
    'Chain Capital Institutional Money Market Fund',
    'SEC-compliant institutional money market fund focused on government securities and high-grade commercial paper',
    NOW(),
    NOW(),
    'funds_etfs_etps', -- Correct value that passes the constraint
    '689a0933-a0f4-4665-8de7-9a701dd67580',
    false,
    'Open',
    'active',
    1000000000.00, -- $1B target raise
    1000000.00,    -- $1M minimum investment
    5.25,          -- 5.25% estimated yield
    'USD'
) ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

-- Create corresponding fund product with money_market_fund as fund_type
INSERT INTO fund_products (
    id,
    project_id,
    fund_ticker,
    fund_name,
    fund_type, -- Here we can specify 'money_market_fund' as it's not constrained
    net_asset_value,
    assets_under_management,
    expense_ratio,
    benchmark_index,
    distribution_frequency,
    currency,
    inception_date,
    status,
    target_raise,
    created_at,
    updated_at
) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'f2aa2753-2a55-4fe9-bb72-5d9155f156be',
    'CCIMMF',
    'Chain Capital Institutional Money Market Fund',
    'money_market_fund', -- Fund-specific type
    1.00,              -- $1.00 NAV (typical for MMF)
    0.00,              -- Starting AUM
    0.0045,            -- 0.45% expense ratio
    'FTSE 3-Month Treasury Bill Index',
    'Daily',
    'USD',
    NOW(),
    'active',
    1000000000.00,     -- $1B target raise
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

-- Verify the inserted data
SELECT 'Projects:' as type, id, name, project_type, investment_status, status 
FROM projects 
WHERE id = 'f2aa2753-2a55-4fe9-bb72-5d9155f156be'

UNION ALL

SELECT 'Fund Products:' as type, id, fund_name, fund_type::text, distribution_frequency, status::text 
FROM fund_products 
WHERE project_id = 'f2aa2753-2a55-4fe9-bb72-5d9155f156be';
