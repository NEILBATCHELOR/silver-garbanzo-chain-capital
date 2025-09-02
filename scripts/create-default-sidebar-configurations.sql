-- =====================================================
-- CREATE DEFAULT SIDEBAR CONFIGURATIONS
-- Run this script to populate initial sidebar configurations for testing
-- =====================================================

-- Super Admin Default Configuration
INSERT INTO sidebar_configurations (
  name,
  description,
  target_roles,
  target_profile_types,
  min_role_priority,
  configuration_data,
  is_active,
  is_default
) VALUES (
  'Super Admin Default',
  'Complete sidebar configuration for Super Admins with full system access',
  ARRAY['Super Admin'],
  ARRAY['admin'],
  100,
  '{"sections": [{"id": "overview", "title": "OVERVIEW", "items": [{"id": "dashboard", "label": "Dashboard", "href": "/dashboard", "icon": "Home"}, {"id": "projects", "label": "Projects", "href": "/projects", "icon": "Layers"}]}, {"id": "administration", "title": "ADMINISTRATION", "items": [{"id": "roles", "label": "Roles", "href": "/role-management", "icon": "UserRoundCog"}, {"id": "sidebar-configuration", "label": "Sidebar Configuration", "href": "/admin/sidebar-configuration", "icon": "Settings"}, {"id": "activity-monitor", "label": "Activity Monitor", "href": "/activity", "icon": "Activity"}]}]}',
  true,
  true
) ON CONFLICT DO NOTHING;

-- Owner/Operations Configuration
INSERT INTO sidebar_configurations (
  name,
  description,
  target_roles,
  target_profile_types,
  min_role_priority,
  configuration_data,
  is_active,
  is_default
) VALUES (
  'Owner Default',
  'Standard configuration for Owner role with administrative access',
  ARRAY['Owner', 'Issuer'],
  ARRAY['admin', 'issuer'],
  90,
  '{"sections": [{"id": "overview", "title": "OVERVIEW", "items": [{"id": "dashboard", "label": "Dashboard", "href": "/dashboard", "icon": "Home"}, {"id": "projects", "label": "Projects", "href": "/projects", "icon": "Layers"}]}, {"id": "administration", "title": "ADMINISTRATION", "items": [{"id": "roles", "label": "Roles", "href": "/role-management", "icon": "UserRoundCog"}, {"id": "activity-monitor", "label": "Activity Monitor", "href": "/activity", "icon": "Activity"}]}]}',
  true,
  true
) ON CONFLICT DO NOTHING;

-- Operations Configuration
INSERT INTO sidebar_configurations (
  name,
  description,
  target_roles,
  target_profile_types,
  min_role_priority,
  configuration_data,
  is_active,
  is_default
) VALUES (
  'Operations Default',
  'Configuration for Operations personnel with compliance and management access',
  ARRAY['Operations'],
  ARRAY['admin'],
  70,
  '{"sections": [{"id": "overview", "title": "OVERVIEW", "items": [{"id": "dashboard", "label": "Dashboard", "href": "/dashboard", "icon": "Home"}, {"id": "projects", "label": "Projects", "href": "/projects", "icon": "Layers"}]}, {"id": "compliance", "title": "COMPLIANCE", "items": [{"id": "organization-management", "label": "Organization Management", "href": "/compliance/management", "icon": "Building"}, {"id": "investor-management", "label": "Investor Management", "href": "/compliance/management/investors", "icon": "Users"}]}]}',
  true,
  true
) ON CONFLICT DO NOTHING;

-- Agent Configuration
INSERT INTO sidebar_configurations (
  name,
  description,
  target_roles,
  target_profile_types,
  min_role_priority,
  configuration_data,
  is_active,
  is_default
) VALUES (
  'Agent Default',
  'Basic configuration for Agent role with limited access',
  ARRAY['Agent'],
  ARRAY['admin', 'service_provider'],
  60,
  '{"sections": [{"id": "overview", "title": "OVERVIEW", "items": [{"id": "dashboard", "label": "Dashboard", "href": "/dashboard", "icon": "Home"}, {"id": "projects", "label": "Projects", "href": "/projects", "icon": "Layers"}]}]}',
  true,
  true
) ON CONFLICT DO NOTHING;

-- Viewer Configuration
INSERT INTO sidebar_configurations (
  name,
  description,
  target_roles,
  target_profile_types,
  min_role_priority,
  configuration_data,
  is_active,
  is_default
) VALUES (
  'Viewer Default',
  'Minimal configuration for Viewer role with read-only access',
  ARRAY['Viewer'],
  ARRAY['admin', 'service_provider'],
  55,
  '{"sections": [{"id": "overview", "title": "OVERVIEW", "items": [{"id": "dashboard", "label": "Dashboard", "href": "/dashboard", "icon": "Home"}]}]}',
  true,
  true
) ON CONFLICT DO NOTHING;

-- Investor Portal Configuration
INSERT INTO sidebar_configurations (
  name,
  description,
  target_roles,
  target_profile_types,
  min_role_priority,
  configuration_data,
  is_active,
  is_default
) VALUES (
  'Investor Portal Default',
  'Configuration for Investor portal users',
  ARRAY['Investor', 'Service Provider'],
  ARRAY['investor', 'service_provider'],
  50,
  '{"sections": [{"id": "overview", "title": "OVERVIEW", "items": [{"id": "dashboard", "label": "Dashboard", "href": "/dashboard", "icon": "Home"}]}, {"id": "investor-portal", "title": "INVESTOR PORTAL", "items": [{"id": "offerings", "label": "Offerings", "href": "/offerings", "icon": "ChartCandlestick"}, {"id": "investor-profile", "label": "Profile", "href": "/compliance/portal/profile", "icon": "UserCircle"}, {"id": "investor-documents", "label": "Documents", "href": "/compliance/portal/documents", "icon": "FileText"}]}]}',
  true,
  true
) ON CONFLICT DO NOTHING;
