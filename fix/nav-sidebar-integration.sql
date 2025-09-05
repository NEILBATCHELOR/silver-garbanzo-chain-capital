-- ===================================================
-- NAV Sidebar Integration SQL Script
-- Phase 8: Add NAV section and items to dynamic sidebar
-- ===================================================

-- Create NAV section
INSERT INTO sidebar_sections (
  section_id,
  title,
  description,
  display_order,
  required_permissions,
  min_role_priority,
  is_active
) VALUES (
  'nav',
  'NAV Operations',
  'Net Asset Value calculations and management',
  40, -- Position after main operational sections
  ARRAY['nav:view_dashboard'],
  60, -- Agent level and above
  true
) ON CONFLICT (section_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  required_permissions = EXCLUDED.required_permissions,
  min_role_priority = EXCLUDED.min_role_priority,
  updated_at = NOW();

-- Get the section UUID for inserting items
-- (Using a variable approach that works with most PostgreSQL clients)

-- Insert NAV menu items
DO $$
DECLARE
  nav_section_uuid UUID;
BEGIN
  -- Get the NAV section UUID
  SELECT id INTO nav_section_uuid 
  FROM sidebar_sections 
  WHERE section_id = 'nav';

  -- Insert NAV Dashboard
  INSERT INTO sidebar_items (
    item_id,
    section_id,
    label,
    href,
    icon,
    description,
    display_order,
    required_permissions,
    min_role_priority,
    is_visible,
    is_active
  ) VALUES (
    'nav-dashboard',
    nav_section_uuid,
    'NAV Dashboard',
    '/nav',
    'Activity', -- Lucide icon name
    'Overview of NAV calculations and KPIs',
    1,
    ARRAY['nav:view_dashboard'],
    60,
    true,
    true
  ) ON CONFLICT (item_id) DO UPDATE SET
    label = EXCLUDED.label,
    href = EXCLUDED.href,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    required_permissions = EXCLUDED.required_permissions,
    updated_at = NOW();

  -- Insert NAV Calculators
  INSERT INTO sidebar_items (
    item_id,
    section_id,
    label,
    href,
    icon,
    description,
    display_order,
    required_permissions,
    min_role_priority,
    is_visible,
    is_active
  ) VALUES (
    'nav-calculators',
    nav_section_uuid,
    'Calculators',
    '/nav/calculators',
    'Calculator',
    'Run NAV calculations for different asset types',
    2,
    ARRAY['nav:view_calculators'],
    60,
    true,
    true
  ) ON CONFLICT (item_id) DO UPDATE SET
    label = EXCLUDED.label,
    href = EXCLUDED.href,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    required_permissions = EXCLUDED.required_permissions,
    updated_at = NOW();

  -- Insert NAV Valuations
  INSERT INTO sidebar_items (
    item_id,
    section_id,
    label,
    href,
    icon,
    description,
    display_order,
    required_permissions,
    min_role_priority,
    is_visible,
    is_active
  ) VALUES (
    'nav-valuations',
    nav_section_uuid,
    'Valuations',
    '/nav/valuations',
    'FileText',
    'Manage saved NAV valuations and reports',
    3,
    ARRAY['nav:manage_valuations'],
    70, -- Operations level for managing valuations
    true,
    true
  ) ON CONFLICT (item_id) DO UPDATE SET
    label = EXCLUDED.label,
    href = EXCLUDED.href,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    required_permissions = EXCLUDED.required_permissions,
    min_role_priority = EXCLUDED.min_role_priority,
    updated_at = NOW();

  -- Insert NAV Audit
  INSERT INTO sidebar_items (
    item_id,
    section_id,
    label,
    href,
    icon,
    description,
    display_order,
    required_permissions,
    min_role_priority,
    is_visible,
    is_active
  ) VALUES (
    'nav-audit',
    nav_section_uuid,
    'Audit Trail',
    '/nav/audit',
    'Shield',
    'View NAV calculation audit logs and history',
    4,
    ARRAY['nav:view_audit'],
    80, -- Compliance Officer level for audit access
    true,
    true
  ) ON CONFLICT (item_id) DO UPDATE SET
    label = EXCLUDED.label,
    href = EXCLUDED.href,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    required_permissions = EXCLUDED.required_permissions,
    min_role_priority = EXCLUDED.min_role_priority,
    updated_at = NOW();

END $$;

-- ===================================================
-- Verification queries (run these to check results)
-- ===================================================

-- Check NAV section was created
SELECT 
  section_id,
  title,
  display_order,
  required_permissions,
  min_role_priority,
  is_active
FROM sidebar_sections 
WHERE section_id = 'nav';

-- Check NAV items were created
SELECT 
  si.item_id,
  si.label,
  si.href,
  si.icon,
  si.display_order,
  si.required_permissions,
  si.min_role_priority,
  si.is_active,
  ss.title as section_title
FROM sidebar_items si
JOIN sidebar_sections ss ON si.section_id = ss.id
WHERE ss.section_id = 'nav'
ORDER BY si.display_order;

-- ===================================================
-- Notes for implementation:
-- ===================================================
-- 1. Run this SQL script in your Supabase database
-- 2. The dynamic sidebar will automatically pick up the new NAV section
-- 3. Permission-based filtering will work automatically with existing NAV permissions
-- 4. Role priority filtering ensures appropriate access levels
-- 5. No frontend code changes needed - sidebar loads from database
