-- =====================================================
-- DYNAMIC SIDEBAR CONFIGURATION DATABASE SCHEMA
-- For Super Admin management of role-based sidebar layouts
-- =====================================================

-- Table: sidebar_configurations
-- Stores custom sidebar configurations for different roles/profile types
CREATE TABLE IF NOT EXISTS sidebar_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Configuration targeting
  target_roles TEXT[], -- Array of role names this config applies to
  target_profile_types TEXT[], -- Array of profile types (investor, issuer, admin)
  min_role_priority INTEGER, -- Minimum role priority required
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Configuration details
  configuration_data JSONB NOT NULL, -- Full sidebar configuration as JSON
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Default config for role/profile type
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_default_per_target UNIQUE (target_roles, target_profile_types, is_default, organization_id) DEFERRABLE
);

-- Table: sidebar_sections
-- Stores individual sidebar sections for reusable configuration
CREATE TABLE IF NOT EXISTS sidebar_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id VARCHAR(100) NOT NULL, -- Unique identifier (e.g., 'onboarding', 'overview')
  title VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  
  -- Access control
  required_permissions TEXT[], -- Array of permission names
  required_roles TEXT[], -- Array of role names
  min_role_priority INTEGER,
  profile_types TEXT[], -- Array of profile types this section applies to
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_section_per_org UNIQUE (section_id, organization_id)
);

-- Table: sidebar_items
-- Stores individual sidebar navigation items
CREATE TABLE IF NOT EXISTS sidebar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR(100) NOT NULL, -- Unique identifier (e.g., 'dashboard', 'projects')
  section_id UUID REFERENCES sidebar_sections(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  href VARCHAR(500) NOT NULL,
  icon VARCHAR(100), -- Icon name for UI
  description TEXT,
  display_order INTEGER DEFAULT 0,
  
  -- Access control
  required_permissions TEXT[], -- Array of permission names  
  required_roles TEXT[], -- Array of role names
  min_role_priority INTEGER,
  profile_types TEXT[], -- Array of profile types
  requires_project BOOLEAN DEFAULT false,
  
  -- Visibility control
  is_visible BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_item_per_section UNIQUE (item_id, section_id)
);

-- Table: user_sidebar_preferences
-- Stores individual user sidebar customization preferences
CREATE TABLE IF NOT EXISTS user_sidebar_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Preferences
  collapsed_sections TEXT[], -- Array of section IDs that are collapsed
  hidden_items TEXT[], -- Array of item IDs that user has hidden
  custom_order JSONB, -- Custom ordering preferences
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_user_prefs UNIQUE (user_id, organization_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Sidebar configurations indexes
CREATE INDEX IF NOT EXISTS idx_sidebar_configs_roles ON sidebar_configurations USING GIN (target_roles);
CREATE INDEX IF NOT EXISTS idx_sidebar_configs_profile_types ON sidebar_configurations USING GIN (target_profile_types);
CREATE INDEX IF NOT EXISTS idx_sidebar_configs_org ON sidebar_configurations (organization_id);
CREATE INDEX IF NOT EXISTS idx_sidebar_configs_active ON sidebar_configurations (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sidebar_configs_default ON sidebar_configurations (is_default) WHERE is_default = true;

-- Sidebar sections indexes
CREATE INDEX IF NOT EXISTS idx_sidebar_sections_org ON sidebar_sections (organization_id);
CREATE INDEX IF NOT EXISTS idx_sidebar_sections_active ON sidebar_sections (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sidebar_sections_order ON sidebar_sections (display_order);

-- Sidebar items indexes  
CREATE INDEX IF NOT EXISTS idx_sidebar_items_section ON sidebar_items (section_id);
CREATE INDEX IF NOT EXISTS idx_sidebar_items_org ON sidebar_items (organization_id);
CREATE INDEX IF NOT EXISTS idx_sidebar_items_active ON sidebar_items (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sidebar_items_order ON sidebar_items (display_order);
CREATE INDEX IF NOT EXISTS idx_sidebar_items_permissions ON sidebar_items USING GIN (required_permissions);
CREATE INDEX IF NOT EXISTS idx_sidebar_items_roles ON sidebar_items USING GIN (required_roles);

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_sidebar_prefs_user ON user_sidebar_preferences (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sidebar_prefs_org ON user_sidebar_preferences (organization_id);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

-- Update sidebar_configurations.updated_at
CREATE OR REPLACE FUNCTION update_sidebar_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sidebar_configurations_updated_at
  BEFORE UPDATE ON sidebar_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_sidebar_configurations_updated_at();

-- Update sidebar_sections.updated_at
CREATE OR REPLACE FUNCTION update_sidebar_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sidebar_sections_updated_at
  BEFORE UPDATE ON sidebar_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_sidebar_sections_updated_at();

-- Update sidebar_items.updated_at
CREATE OR REPLACE FUNCTION update_sidebar_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sidebar_items_updated_at
  BEFORE UPDATE ON sidebar_items
  FOR EACH ROW
  EXECUTE FUNCTION update_sidebar_items_updated_at();

-- Update user_sidebar_preferences.updated_at  
CREATE OR REPLACE FUNCTION update_user_sidebar_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_sidebar_preferences_updated_at
  BEFORE UPDATE ON user_sidebar_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_sidebar_preferences_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE sidebar_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sidebar_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sidebar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sidebar_preferences ENABLE ROW LEVEL SECURITY;

-- Sidebar configurations policies
CREATE POLICY "Super Admins can manage all sidebar configurations" ON sidebar_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id  
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Super Admin'
      AND r.priority >= 100
    )
  );

CREATE POLICY "Users can view their organization's sidebar configurations" ON sidebar_configurations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organization_roles
      WHERE user_id = auth.uid()
    )
  );

-- Sidebar sections policies
CREATE POLICY "Super Admins can manage all sidebar sections" ON sidebar_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Super Admin'
      AND r.priority >= 100
    )
  );

CREATE POLICY "Users can view their organization's sidebar sections" ON sidebar_sections
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organization_roles
      WHERE user_id = auth.uid()
    )
  );

-- Sidebar items policies
CREATE POLICY "Super Admins can manage all sidebar items" ON sidebar_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Super Admin'
      AND r.priority >= 100
    )
  );

CREATE POLICY "Users can view their organization's sidebar items" ON sidebar_items
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organization_roles
      WHERE user_id = auth.uid()
    )
  );

-- User preferences policies
CREATE POLICY "Users can manage their own sidebar preferences" ON user_sidebar_preferences
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Create default sidebar configuration based on existing mappings
-- This will be populated by a separate seeding script
