-- =====================================================
-- Add Missing Sidebar Permissions - Proper Implementation
-- Date: August 28, 2025
-- Status: NOT NEEDED - All permissions already exist in database
-- Purpose: Add missing permissions to permissions table, then assign to roles
-- =====================================================
-- 
-- UPDATE: After database investigation, all 24 permissions already exist
-- and are properly assigned to roles. The issue was in frontend permission
-- validation logic, not missing database permissions.
--
-- This script is preserved for reference but should NOT be executed.

-- First, add all missing permissions to the permissions table
INSERT INTO permissions (name, description) VALUES
-- Factoring Module Permissions
('invoice.view', 'View invoice information and factoring data'),
('invoice.create', 'Create and manage invoices for factoring'),
('pool.view', 'View pool information and allocations'),
('tranche.view', 'View tranche details and structures'),

-- Tokenization Module Permissions  
('tokenization.create', 'Create and manage tokenization processes'),
('tokenization.view', 'View tokenization information and status'),
('distribution.view', 'View token distribution and allocation data'),

-- Climate & Energy Permissions
('energy_assets.view', 'View climate and energy asset information'),
('energy_assets.create', 'Create and manage energy assets and receivables'),
('production_data.view', 'View production data and metrics'),
('receivables.view', 'View receivables and payment information'),
('receivables.create', 'Create and manage receivables'),
('incentives.view', 'View climate incentives and renewable energy credits'),
('carbon_offsets.view', 'View carbon offset tracking and management'),
('recs.view', 'View Renewable Energy Certificates'),

-- Dashboard & Analytics Permissions
('dashboard.view', 'View dashboard information and summaries'),
('analytics.view', 'View analytics and performance metrics'),
('reports.view', 'View and generate reports'),

-- Wallet & Custody Permissions
('custody.view', 'View wallet custody information and controls'),

-- User Management Permissions  
('user.bulk', 'Perform bulk user operations and management'),

-- Investment & Portal Permissions
('offerings.view', 'View investment offerings and opportunities'),
('investor_portal.view', 'Access investor portal functionality'),

-- Profile & Document Permissions
('profile.view', 'View user profiles and personal information'),
('documents.view', 'View documents and document management')

-- Handle conflicts if permissions already exist
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description,
    updated_at = now();

-- =====================================================
-- Assign permissions to roles based on priority levels
-- =====================================================

-- Super Admin & Issuer (Priority 100+) - Full access to all new permissions
INSERT INTO role_permissions (role_id, permission_name)
SELECT r.id, p.name
FROM roles r, permissions p
WHERE r.priority >= 100
  AND p.name IN (
    'invoice.view', 'invoice.create', 'pool.view', 'tranche.view',
    'tokenization.create', 'tokenization.view', 'distribution.view',
    'energy_assets.view', 'energy_assets.create', 'production_data.view',
    'receivables.view', 'receivables.create', 'incentives.view',
    'carbon_offsets.view', 'recs.view', 'dashboard.view',
    'analytics.view', 'reports.view', 'custody.view',
    'user.bulk', 'offerings.view', 'investor_portal.view',
    'profile.view', 'documents.view'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_name = p.name
  );

-- Owner & Investor (Priority 90+) - Most permissions except system-level
INSERT INTO role_permissions (role_id, permission_name)
SELECT r.id, p.name
FROM roles r, permissions p
WHERE r.priority >= 90 AND r.priority < 100
  AND p.name IN (
    'invoice.view', 'pool.view', 'tranche.view',
    'tokenization.view', 'distribution.view',
    'energy_assets.view', 'production_data.view',
    'receivables.view', 'incentives.view',
    'carbon_offsets.view', 'recs.view', 'dashboard.view',
    'analytics.view', 'reports.view', 'custody.view',
    'offerings.view', 'investor_portal.view',
    'profile.view', 'documents.view'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_name = p.name
  );

-- Service Provider & Compliance Officer (Priority 80+) - Operational permissions
INSERT INTO role_permissions (role_id, permission_name)
SELECT r.id, p.name
FROM roles r, permissions p
WHERE r.priority >= 80 AND r.priority < 90
  AND p.name IN (
    'invoice.view', 'pool.view', 'tranche.view',
    'tokenization.view', 'distribution.view',
    'energy_assets.view', 'production_data.view',
    'receivables.view', 'incentives.view',
    'dashboard.view', 'analytics.view', 'reports.view',
    'offerings.view', 'profile.view', 'documents.view'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_name = p.name
  );

-- Operations & Compliance Manager (Priority 70+) - Core operational access
INSERT INTO role_permissions (role_id, permission_name)
SELECT r.id, p.name
FROM roles r, permissions p
WHERE r.priority >= 70 AND r.priority < 80
  AND p.name IN (
    'invoice.view', 'invoice.create', 'pool.view', 'tranche.view',
    'tokenization.view', 'distribution.view',
    'energy_assets.view', 'energy_assets.create', 'production_data.view',
    'receivables.view', 'receivables.create', 'incentives.view',
    'dashboard.view', 'analytics.view', 'reports.view',
    'offerings.view', 'profile.view', 'documents.view'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_name = p.name
  );

-- Agent (Priority 60+) - Limited operational access
INSERT INTO role_permissions (role_id, permission_name)
SELECT r.id, p.name
FROM roles r, permissions p
WHERE r.priority >= 60 AND r.priority < 70
  AND p.name IN (
    'dashboard.view', 'offerings.view', 'profile.view', 'documents.view',
    'receivables.view', 'incentives.view'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_name = p.name
  );

-- Viewer (Priority 55+) - Read-only access to basic information
INSERT INTO role_permissions (role_id, permission_name)
SELECT r.id, p.name
FROM roles r, permissions p
WHERE r.priority >= 55 AND r.priority < 60
  AND p.name IN (
    'dashboard.view', 'offerings.view', 'profile.view'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_name = p.name
  );

-- =====================================================
-- Verification Query - Check what permissions were added
-- =====================================================
SELECT 
    r.name AS role_name,
    r.priority,
    COUNT(rp.permission_name) AS new_permissions_count,
    ARRAY_AGG(rp.permission_name ORDER BY rp.permission_name) AS permissions_added
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_name = p.name
WHERE p.name IN (
    'invoice.view', 'invoice.create', 'pool.view', 'tranche.view',
    'tokenization.create', 'tokenization.view', 'distribution.view',
    'energy_assets.view', 'energy_assets.create', 'production_data.view',
    'receivables.view', 'receivables.create', 'incentives.view',
    'carbon_offsets.view', 'recs.view', 'dashboard.view',
    'analytics.view', 'reports.view', 'custody.view',
    'user.bulk', 'offerings.view', 'investor_portal.view',
    'profile.view', 'documents.view'
)
GROUP BY r.name, r.priority
ORDER BY r.priority DESC;

-- Summary of permissions added
SELECT 
    'Total new permissions added' AS summary,
    COUNT(*) AS count
FROM permissions 
WHERE name IN (
    'invoice.view', 'invoice.create', 'pool.view', 'tranche.view',
    'tokenization.create', 'tokenization.view', 'distribution.view',
    'energy_assets.view', 'energy_assets.create', 'production_data.view',
    'receivables.view', 'receivables.create', 'incentives.view',
    'carbon_offsets.view', 'recs.view', 'dashboard.view',
    'analytics.view', 'reports.view', 'custody.view',
    'user.bulk', 'offerings.view', 'investor_portal.view',
    'profile.view', 'documents.view'
);
