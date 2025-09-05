-- =====================================================
-- DEFAULT SIDEBAR CONFIGURATION POPULATION
-- Creates default sidebar configuration with all sections including NAV ENGINE
-- Date: September 05, 2025
-- =====================================================

-- First, create a default sidebar configuration
INSERT INTO public.sidebar_configurations (
  name, 
  description, 
  min_role_priority, 
  configuration_data, 
  is_active, 
  is_default,
  target_role_ids,
  target_profile_type_enums
) VALUES (
  'Default Chain Capital Navigation',
  'Complete navigation structure for Chain Capital platform',
  0,
  '{"sections": []}'::jsonb,
  true,
  true,
  '{}',
  '{}'
);

-- Get the configuration ID for reference
-- This will be used to link sections to the configuration

-- Create all the sections from the static sidebar
-- ONBOARDING Section
INSERT INTO public.sidebar_sections (
  section_id,
  title,
  description,
  display_order,
  required_permissions,
  required_roles,
  is_active
) VALUES (
  'onboarding',
  'ONBOARDING',
  'Investor and Issuer onboarding processes',
  10,
  '{}',
  '{}',
  true
);

-- Get the onboarding section ID
DO $$
DECLARE
  onboarding_section_id uuid;
BEGIN
  SELECT id INTO onboarding_section_id FROM sidebar_sections WHERE section_id = 'onboarding';
  
  -- Add onboarding items
  INSERT INTO public.sidebar_items (
    item_id, section_id, label, href, icon, description, display_order, is_active
  ) VALUES
  ('investor-onboarding', onboarding_section_id, 'Investor Onboarding', '/compliance/investor-onboarding/registration', 'UserRoundPlus', 'Complete investor onboarding process', 0, true),
  ('issuer-onboarding', onboarding_section_id, 'Issuer Onboarding', '/compliance/issuer/onboarding/registration', 'Landmark', 'Complete issuer onboarding process', 1, true);
END $$;

-- OVERVIEW Section
INSERT INTO public.sidebar_sections (
  section_id,
  title,
  description,
  display_order,
  required_permissions,
  required_roles,
  is_active
) VALUES (
  'overview',
  'OVERVIEW',
  'Main dashboard and project overview',
  20,
  '{}',
  '{}',
  true
);

DO $$
DECLARE
  overview_section_id uuid;
BEGIN
  SELECT id INTO overview_section_id FROM sidebar_sections WHERE section_id = 'overview';
  
  INSERT INTO public.sidebar_items (
    item_id, section_id, label, href, icon, description, display_order, is_active
  ) VALUES
  ('dashboard', overview_section_id, 'Dashboard', '/dashboard', 'Home', 'Main platform dashboard', 0, true),
  ('projects', overview_section_id, 'Projects', '/projects', 'Layers', 'Manage and view projects', 1, true);
END $$;

-- ISSUANCE Section
INSERT INTO public.sidebar_sections (
  section_id,
  title,
  description,
  display_order,
  required_permissions,
  required_roles,
  is_active
) VALUES (
  'issuance',
  'ISSUANCE',
  'Token management and cap table operations',
  30,
  '{}',
  '{}',
  true
);

DO $$
DECLARE
  issuance_section_id uuid;
BEGIN
  SELECT id INTO issuance_section_id FROM sidebar_sections WHERE section_id = 'issuance';
  
  INSERT INTO public.sidebar_items (
    item_id, section_id, label, href, icon, description, display_order, is_active, requires_project
  ) VALUES
  ('token-management', issuance_section_id, 'Token Management', '/projects/{projectId}/tokens', 'Blocks', 'Manage project tokens', 0, true, true),
  ('cap-table', issuance_section_id, 'Cap Table', '/projects/{projectId}/captable/investors', 'Grid2x2Check', 'View investor cap table', 1, true, true),
  ('redemptions', issuance_section_id, 'Redemptions', '/redemption', 'WalletCards', 'Handle token redemptions', 2, true, false);
END $$;

-- FACTORING Section
INSERT INTO public.sidebar_sections (
  section_id,
  title,
  description,
  display_order,
  required_permissions,
  required_roles,
  is_active
) VALUES (
  'factoring',
  'FACTORING',
  'Invoice factoring and pool management',
  40,
  '{}',
  '{}',
  true
);

DO $$
DECLARE
  factoring_section_id uuid;
BEGIN
  SELECT id INTO factoring_section_id FROM sidebar_sections WHERE section_id = 'factoring';
  
  INSERT INTO public.sidebar_items (
    item_id, section_id, label, href, icon, description, display_order, is_active, requires_project
  ) VALUES
  ('factoring-dashboard', factoring_section_id, 'Factoring Dashboard', '/projects/{projectId}/factoring/dashboard', 'LayoutDashboard', 'Factoring operations overview', 0, true, true),
  ('invoices', factoring_section_id, 'Invoices', '/projects/{projectId}/factoring/invoices', 'FileText', 'Manage invoices', 1, true, true),
  ('pools-tranches', factoring_section_id, 'Pools & Tranches', '/projects/{projectId}/factoring/pools', 'Package', 'Manage pools and tranches', 2, true, true),
  ('tokenize-pools', factoring_section_id, 'Tokenize Pools', '/projects/{projectId}/factoring/tokenization', 'Combine', 'Convert pools to tokens', 3, true, true),
  ('factoring-distribution', factoring_section_id, 'Distribution', '/projects/{projectId}/factoring/distribution', 'Users', 'Manage distribution', 4, true, true);
END $$;

-- CLIMATE RECEIVABLES Section
INSERT INTO public.sidebar_sections (
  section_id,
  title,
  description,
  display_order,
  required_permissions,
  required_roles,
  is_active
) VALUES (
  'climate-receivables',
  'CLIMATE RECEIVABLES',
  'Climate and renewable energy receivables management',
  50,
  '{}',
  '{}',
  true
);

DO $$
DECLARE
  climate_section_id uuid;
BEGIN
  SELECT id INTO climate_section_id FROM sidebar_sections WHERE section_id = 'climate-receivables';
  
  INSERT INTO public.sidebar_items (
    item_id, section_id, label, href, icon, description, display_order, is_active, requires_project
  ) VALUES
  ('climate-dashboard', climate_section_id, 'Climate Dashboard', '/projects/{projectId}/climate-receivables/dashboard', 'LayoutDashboard', 'Climate receivables overview', 0, true, true),
  ('energy-assets', climate_section_id, 'Energy Assets', '/projects/{projectId}/climate-receivables/assets', 'Factory', 'Manage energy assets', 1, true, true),
  ('production-data', climate_section_id, 'Production Data', '/projects/{projectId}/climate-receivables/production', 'Zap', 'Track production metrics', 2, true, true),
  ('receivables', climate_section_id, 'Receivables', '/projects/{projectId}/climate-receivables/receivables', 'FileText', 'Manage receivables', 3, true, true),
  ('tokenization-pools', climate_section_id, 'Tokenization Pools', '/projects/{projectId}/climate-receivables/pools', 'Package', 'Manage tokenization pools', 4, true, true),
  ('incentives', climate_section_id, 'Incentives', '/projects/{projectId}/climate-receivables/incentives', 'Trophy', 'Track incentive programs', 5, true, true),
  ('carbon-offsets', climate_section_id, 'Carbon Offsets', '/projects/{projectId}/climate-receivables/carbon-offsets', 'Leaf', 'Manage carbon offsets', 6, true, true),
  ('recs', climate_section_id, 'RECs', '/projects/{projectId}/climate-receivables/recs', 'Gauge', 'Renewable Energy Certificates', 7, true, true),
  ('climate-tokenization', climate_section_id, 'Tokenization', '/projects/{projectId}/climate-receivables/tokenization', 'Combine', 'Climate asset tokenization', 8, true, true),
  ('climate-distribution', climate_section_id, 'Distribution', '/projects/{projectId}/climate-receivables/distribution', 'Users', 'Manage climate distributions', 9, true, true),
  ('analytics', climate_section_id, 'Analytics', '/projects/{projectId}/climate-receivables/visualizations', 'TrendingUp', 'View analytics and charts', 10, true, true);
END $$;

-- WALLET MANAGEMENT Section
INSERT INTO public.sidebar_sections (
  section_id,
  title,
  description,
  display_order,
  required_permissions,
  required_roles,
  is_active
) VALUES (
  'wallet-management',
  'WALLET MANAGEMENT',
  'Digital wallet operations and custody',
  60,
  '{}',
  '{}',
  true
);

DO $$
DECLARE
  wallet_section_id uuid;
BEGIN
  SELECT id INTO wallet_section_id FROM sidebar_sections WHERE section_id = 'wallet-management';
  
  INSERT INTO public.sidebar_items (
    item_id, section_id, label, href, icon, description, display_order, is_active
  ) VALUES
  ('wallet-dashboard', wallet_section_id, 'Wallet Dashboard', '/wallet/dashboard', 'LayoutDashboard', 'Wallet operations overview', 0, true),
  ('new-wallet', wallet_section_id, 'New Wallet', '/wallet/new', 'Plus', 'Create new wallet', 1, true),
  ('dfns-custody', wallet_section_id, 'DFNS Custody', '/wallet/dfns', 'Shield', 'DFNS custody management', 2, true);
END $$;

-- COMPLIANCE Section
INSERT INTO public.sidebar_sections (
  section_id,
  title,
  description,
  display_order,
  required_permissions,
  required_roles,
  is_active
) VALUES (
  'compliance',
  'COMPLIANCE',
  'Regulatory compliance and management',
  70,
  '{}',
  '{}',
  true
);

DO $$
DECLARE
  compliance_section_id uuid;
BEGIN
  SELECT id INTO compliance_section_id FROM sidebar_sections WHERE section_id = 'compliance';
  
  INSERT INTO public.sidebar_items (
    item_id, section_id, label, href, icon, description, display_order, is_active
  ) VALUES
  ('organization-management', compliance_section_id, 'Organization Management', '/compliance/management', 'Building', 'Manage organizations', 0, true),
  ('investor-management', compliance_section_id, 'Investor Management', '/compliance/management/investors', 'Users', 'Manage investor data', 1, true),
  ('upload-organizations', compliance_section_id, 'Upload Organizations', '/compliance/upload/issuer', 'FileCog', 'Bulk upload organizations', 2, true),
  ('upload-investors', compliance_section_id, 'Upload Investors', '/compliance/upload/investor', 'User', 'Bulk upload investors', 3, true),
  ('wallet-operations', compliance_section_id, 'Wallet Operations', '/compliance/operations/investor/wallets', 'Wallet', 'Manage wallet operations', 4, true),
  ('compliance-rules', compliance_section_id, 'Compliance Rules', '/compliance/rules', 'Scale', 'Configure compliance rules', 5, true),
  ('restrictions', compliance_section_id, 'Restrictions', '/compliance/restrictions', 'Shield', 'Manage trading restrictions', 6, true);
END $$;

-- INVESTOR PORTAL Section
INSERT INTO public.sidebar_sections (
  section_id,
  title,
  description,
  display_order,
  required_permissions,
  required_roles,
  is_active
) VALUES (
  'investor-portal',
  'INVESTOR PORTAL',
  'Investor-facing portal features',
  80,
  '{}',
  '{}',
  true
);

DO $$
DECLARE
  portal_section_id uuid;
BEGIN
  SELECT id INTO portal_section_id FROM sidebar_sections WHERE section_id = 'investor-portal';
  
  INSERT INTO public.sidebar_items (
    item_id, section_id, label, href, icon, description, display_order, is_active
  ) VALUES
  ('offerings', portal_section_id, 'Offerings', '/offerings', 'ChartCandlestick', 'Browse investment offerings', 0, true),
  ('profile', portal_section_id, 'Profile', '/compliance/portal/profile', 'UserCircle', 'Manage investor profile', 1, true),
  ('documents', portal_section_id, 'Documents', '/compliance/portal/documents', 'FileText', 'View and manage documents', 2, true);
END $$;

-- NAV ENGINE Section (THE MAIN SECTION WE'RE ADDING)
INSERT INTO public.sidebar_sections (
  section_id,
  title,
  description,
  display_order,
  required_permissions,
  required_roles,
  is_active
) VALUES (
  'nav-engine',
  'NAV ENGINE',
  'Net Asset Value calculation and management tools',
  90,
  ARRAY['nav:view_dashboard'],
  '{}',
  true
);

DO $$
DECLARE
  nav_section_id uuid;
BEGIN
  SELECT id INTO nav_section_id FROM sidebar_sections WHERE section_id = 'nav-engine';
  
  INSERT INTO public.sidebar_items (
    item_id, section_id, label, href, icon, description, display_order, is_active, required_permissions
  ) VALUES
  ('nav-dashboard', nav_section_id, 'Nav Dashboard', '/nav', 'Sheet', 'NAV calculation dashboard', 0, true, ARRAY['nav:view_dashboard']),
  ('calculators', nav_section_id, 'Calculators', '/nav/calculators', 'Calculator', 'Browse NAV calculators', 1, true, ARRAY['nav:view_calculators']),
  ('marks', nav_section_id, 'Marks', '/nav/calculators/:slug', 'CircleEqual', 'Calculator detail pages', 2, true, ARRAY['nav:run_calculation']),
  ('valuations', nav_section_id, 'Valuations', '/nav/valuations', 'SquareSigma', 'Manage NAV valuations', 3, true, ARRAY['nav:manage_valuations']),
  ('history', nav_section_id, 'History', '/nav/audit', 'FileSpreadsheet', 'View calculation history', 4, true, ARRAY['nav:view_history']);
END $$;

-- ADMINISTRATION Section
INSERT INTO public.sidebar_sections (
  section_id,
  title,
  description,
  display_order,
  required_permissions,
  required_roles,
  is_active
) VALUES (
  'administration',
  'ADMINISTRATION',
  'System administration and configuration',
  100,
  '{}',
  '{}',
  true
);

DO $$
DECLARE
  admin_section_id uuid;
BEGIN
  SELECT id INTO admin_section_id FROM sidebar_sections WHERE section_id = 'administration';
  
  INSERT INTO public.sidebar_items (
    item_id, section_id, label, href, icon, description, display_order, is_active
  ) VALUES
  ('roles', admin_section_id, 'Roles', '/role-management', 'UserRoundCog', 'Manage user roles', 0, true),
  ('activity-monitor', admin_section_id, 'Activity Monitor', '/activity', 'Activity', 'Monitor system activity', 1, true),
  ('sidebar-configuration', admin_section_id, 'Sidebar Configuration', '/admin/sidebar-configuration', 'PanelLeftDashed', 'Configure navigation sidebar', 2, true);
END $$;

-- Update the configuration to reference all sections
DO $$
DECLARE
  config_id uuid;
  sections_json jsonb;
BEGIN
  SELECT id INTO config_id FROM sidebar_configurations WHERE name = 'Default Chain Capital Navigation';
  
  -- Build sections array with all section IDs
  SELECT jsonb_build_object('sections', jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'sectionId', s.section_id,
      'title', s.title,
      'description', s.description,
      'displayOrder', s.display_order,
      'requiredPermissions', s.required_permissions,
      'requiredRoles', s.required_roles,
      'isActive', s.is_active,
      'items', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'itemId', i.item_id,
            'label', i.label,
            'href', i.href,
            'icon', i.icon,
            'description', i.description,
            'displayOrder', i.display_order,
            'requiredPermissions', i.required_permissions,
            'requiredRoles', i.required_roles,
            'isVisible', i.is_visible,
            'isActive', i.is_active,
            'requiresProject', i.requires_project
          ) ORDER BY i.display_order
        ), '[]'::jsonb)
        FROM sidebar_items i 
        WHERE i.section_id = s.id
      )
    ) ORDER BY s.display_order
  )) INTO sections_json
  FROM sidebar_sections s;
  
  -- Update the configuration
  UPDATE sidebar_configurations 
  SET configuration_data = sections_json,
      updated_at = now()
  WHERE id = config_id;
END $$;

-- Verify the configuration
SELECT 
  sc.name,
  sc.description,
  sc.is_active,
  sc.is_default,
  jsonb_array_length(sc.configuration_data->'sections') as section_count
FROM sidebar_configurations sc
WHERE sc.name = 'Default Chain Capital Navigation';

-- Show NAV section verification
SELECT 
  s.section_id,
  s.title,
  COUNT(i.id) as item_count
FROM sidebar_sections s
LEFT JOIN sidebar_items i ON s.id = i.section_id
WHERE s.section_id = 'nav-engine'
GROUP BY s.id, s.section_id, s.title;
