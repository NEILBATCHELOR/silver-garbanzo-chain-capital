-- =====================================================
-- NAV PERMISSIONS - DATABASE INTEGRATION
-- Add NAV-specific permissions to Chain Capital database
-- Date: September 05, 2025
-- =====================================================

-- Insert NAV permissions into the permissions table
INSERT INTO public.permissions (name, description) VALUES
('nav:view_dashboard', 'View NAV dashboard and overview'),
('nav:view_calculators', 'Browse available NAV calculators'),
('nav:run_calculation', 'Execute NAV calculations'),
('nav:view_history', 'View calculation history'),
('nav:manage_valuations', 'Create, edit, and manage valuations'),
('nav:view_audit', 'View audit trail and compliance logs'),
('nav:create_valuation', 'Save calculations as valuations'),
('nav:delete_valuation', 'Delete existing valuations'),
('nav:approve_valuation', 'Approve valuations for official use'),
('nav:export_data', 'Export NAV data and reports'),
('nav:manage_calculator_config', 'Configure calculator settings')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now();

-- Note: Role-permission assignments should be done through the Role Management UI
-- or can be added here if specific role assignments are needed:

/*
-- Example: Assign NAV permissions to specific roles (uncomment and modify as needed)

-- Super Admin gets all NAV permissions
INSERT INTO public.role_permissions (role_id, permission_name)
SELECT r.id, p.name
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Super Admin' 
  AND p.name LIKE 'nav:%'
ON CONFLICT (role_id, permission_name) DO NOTHING;

-- Compliance Manager gets view permissions
INSERT INTO public.role_permissions (role_id, permission_name)
SELECT r.id, p.name
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Compliance Manager' 
  AND p.name IN ('nav:view_dashboard', 'nav:view_calculators', 'nav:view_history', 'nav:view_audit')
ON CONFLICT (role_id, permission_name) DO NOTHING;
*/

-- Verify the permissions were added
SELECT name, description, created_at 
FROM public.permissions 
WHERE name LIKE 'nav:%' 
ORDER BY name;
