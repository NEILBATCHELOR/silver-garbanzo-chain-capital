-- =====================================================
-- NAV SIDEBAR CONFIGURATION - DATABASE INTEGRATION
-- Add NAV routes to the sidebar configuration
-- Date: September 05, 2025
-- =====================================================

-- Insert a sample NAV sidebar configuration
-- This should be customized through the admin UI, but provides a working example

INSERT INTO public.sidebar_configurations (
  id,
  name,
  description,
  target_role_ids,
  target_profile_type_enums,
  min_role_priority,
  configuration_data,
  is_active,
  is_default,
  organization_id,
  created_by,
  updated_by
) VALUES (
  'nav-enabled-sidebar-config',
  'NAV-Enabled Sidebar Configuration', 
  'Default sidebar configuration including NAV (Net Asset Value) module access',
  '{}', -- Empty array means applies to all roles (will be filtered by permissions)
  '{"ADMIN", "MANAGER", "ANALYST"}', -- Profile types that can see NAV
  1, -- Minimum role priority
  '{
    "sections": [
      {
        "id": "overview-section",
        "title": "OVERVIEW",
        "displayOrder": 1,
        "isActive": true,
        "requiredPermissions": [],
        "minRolePriority": 1,
        "items": [
          {
            "id": "dashboard-item",
            "label": "Dashboard",
            "href": "/dashboard",
            "icon": "LayoutDashboard",
            "displayOrder": 1,
            "isActive": true,
            "isVisible": true,
            "requiredPermissions": []
          },
          {
            "id": "projects-item", 
            "label": "Projects",
            "href": "/projects",
            "icon": "FolderOpen",
            "displayOrder": 2,
            "isActive": true,
            "isVisible": true,
            "requiredPermissions": []
          }
        ]
      },
      {
        "id": "nav-section",
        "title": "NAV ANALYTICS",
        "displayOrder": 2,
        "isActive": true,
        "requiredPermissions": ["nav:view_dashboard"],
        "minRolePriority": 1,
        "items": [
          {
            "id": "nav-dashboard-item",
            "label": "NAV Dashboard", 
            "href": "/nav",
            "icon": "Calculator",
            "displayOrder": 1,
            "isActive": true,
            "isVisible": true,
            "requiredPermissions": ["nav:view_dashboard"]
          },
          {
            "id": "nav-calculators-item",
            "label": "Calculators",
            "href": "/nav/calculators", 
            "icon": "Activity",
            "displayOrder": 2,
            "isActive": true,
            "isVisible": true,
            "requiredPermissions": ["nav:view_calculators"]
          },
          {
            "id": "nav-valuations-item",
            "label": "Valuations",
            "href": "/nav/valuations",
            "icon": "TrendingUp", 
            "displayOrder": 3,
            "isActive": true,
            "isVisible": true,
            "requiredPermissions": ["nav:manage_valuations"]
          },
          {
            "id": "nav-audit-item",
            "label": "NAV Audit",
            "href": "/nav/audit",
            "icon": "Shield",
            "displayOrder": 4,
            "isActive": true,
            "isVisible": true,
            "requiredPermissions": ["nav:view_audit"]
          }
        ]
      },
      {
        "id": "issuance-section",
        "title": "ISSUANCE",
        "displayOrder": 3,
        "isActive": true,
        "requiredPermissions": [],
        "minRolePriority": 1,
        "items": [
          {
            "id": "tokens-item",
            "label": "Tokens",
            "href": "/tokens",
            "icon": "Coins",
            "displayOrder": 1,
            "isActive": true,
            "isVisible": true,
            "requiredPermissions": ["tokens:view_dashboard"]
          },
          {
            "id": "captable-item",
            "label": "Cap Table",
            "href": "/captable", 
            "icon": "Users",
            "displayOrder": 2,
            "isActive": true,
            "isVisible": true,
            "requiredPermissions": ["captable:view_dashboard"]
          }
        ]
      },
      {
        "id": "compliance-section",
        "title": "COMPLIANCE",
        "displayOrder": 4,
        "isActive": true,
        "requiredPermissions": ["compliance:view_dashboard"],
        "minRolePriority": 1,
        "items": [
          {
            "id": "compliance-dashboard-item",
            "label": "Compliance Dashboard",
            "href": "/compliance/operations/dashboard",
            "icon": "Shield",
            "displayOrder": 1,
            "isActive": true,
            "isVisible": true,
            "requiredPermissions": ["compliance:view_dashboard"]
          },
          {
            "id": "investor-onboarding-item",
            "label": "Investor Onboarding",
            "href": "/compliance/investor-onboarding",
            "icon": "UserPlus",
            "displayOrder": 2, 
            "isActive": true,
            "isVisible": true,
            "requiredPermissions": ["compliance:manage_onboarding"]
          }
        ]
      },
      {
        "id": "wallet-section",
        "title": "WALLET MANAGEMENT",
        "displayOrder": 5,
        "isActive": true,
        "requiredPermissions": ["wallet:view_dashboard"],
        "minRolePriority": 1,
        "items": [
          {
            "id": "wallet-dashboard-item",
            "label": "Wallet Dashboard",
            "href": "/wallet/dashboard",
            "icon": "Wallet",
            "displayOrder": 1,
            "isActive": true,
            "isVisible": true,
            "requiredPermissions": ["wallet:view_dashboard"]
          }
        ]
      },
      {
        "id": "administration-section",
        "title": "ADMINISTRATION",
        "displayOrder": 6,
        "isActive": true,
        "requiredPermissions": ["admin:manage_users"],
        "minRolePriority": 5,
        "items": [
          {
            "id": "role-management-item",
            "label": "Role Management",
            "href": "/role-management",
            "icon": "Settings",
            "displayOrder": 1,
            "isActive": true,
            "isVisible": true,
            "requiredPermissions": ["admin:manage_roles"]
          },
          {
            "id": "sidebar-admin-item",
            "label": "Sidebar Configuration",
            "href": "/admin/sidebar-configuration", 
            "icon": "Layout",
            "displayOrder": 2,
            "isActive": true,
            "isVisible": true,
            "requiredPermissions": ["admin:manage_sidebar_config"]
          }
        ]
      }
    ]
  }'::jsonb,
  true, -- is_active
  true, -- is_default (make this the default configuration)
  null, -- organization_id (null = applies to all organizations)
  (SELECT id FROM auth.users LIMIT 1), -- created_by (use first admin user)
  (SELECT id FROM auth.users LIMIT 1)  -- updated_by
) ON CONFLICT (id) DO UPDATE SET
  configuration_data = EXCLUDED.configuration_data,
  updated_at = now(),
  updated_by = EXCLUDED.updated_by;

-- Verify the configuration was added
SELECT 
  id, 
  name, 
  description, 
  is_active, 
  is_default,
  jsonb_array_length(configuration_data->'sections') as sections_count
FROM public.sidebar_configurations 
WHERE id = 'nav-enabled-sidebar-config';

-- Show NAV section specifically
SELECT 
  jsonb_pretty(
    configuration_data->'sections'->1
  ) as nav_section_config
FROM public.sidebar_configurations 
WHERE id = 'nav-enabled-sidebar-config';
