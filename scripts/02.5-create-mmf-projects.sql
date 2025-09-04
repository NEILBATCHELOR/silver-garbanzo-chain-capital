-- Phase 2.5: Create Missing Money Market Projects (PREREQUISITE)
-- This script creates the required PROJECTS for the new Money Market Funds.
-- RUN THIS SCRIPT BEFORE 03-populate-asset-holdings-FINAL.sql

-- FIXES THE FOREIGN KEY VIOLATION in script 03

INSERT INTO projects (
    id,
    name,
    description,
    project_type,
    organization_id,
    status,
    investment_status,
    currency,
    created_at,
    updated_at
) VALUES 
(   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Chain Capital Government Money Market Fund Project',
    'A project for the Chain Capital Government Money Market Fund.',
    'funds_etfs_etps', -- This is a valid project_type
    '689a0933-a0f4-4665-8de7-9a701dd67580', -- Default organization
    'active',
    'Open',
    'USD',
    NOW(),
    NOW()
),
(   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'Chain Capital Prime Money Market Fund Project',
    'A project for the Chain Capital Prime Money Market Fund.',
    'funds_etfs_etps', -- This is a valid project_type
    '689a0933-a0f4-4665-8de7-9a701dd67580', -- Default organization
    'active',
    'Open',
    'USD',
    NOW(),
    NOW()
),
(   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    'Chain Capital Institutional MMF Alt Project',
    'An alternative project for the Chain Capital Institutional Money Market Fund.',
    'funds_etfs_etps', -- This is a valid project_type
    '689a0933-a0f4-4665-8de7-9a701dd67580', -- Default organization
    'active',
    'Open',
    'USD',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verify insertion
SELECT id, name, project_type FROM projects WHERE id IN (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'
);

