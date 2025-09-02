-- Project Organization Assignments Table Creation
-- Creates dedicated table for persistent project-organization relationships
-- Supports many-to-many relationships with typed relationships

-- Create project_organization_assignments table
CREATE TABLE IF NOT EXISTS project_organization_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('issuer', 'investor', 'service_provider', 'regulator')),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure unique project-organization-relationship combinations
  CONSTRAINT unique_project_organization_relationship 
    UNIQUE (project_id, organization_id, relationship_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_organization_assignments_project_id 
  ON project_organization_assignments(project_id);

CREATE INDEX IF NOT EXISTS idx_project_organization_assignments_organization_id 
  ON project_organization_assignments(organization_id);

CREATE INDEX IF NOT EXISTS idx_project_organization_assignments_relationship_type 
  ON project_organization_assignments(relationship_type);

CREATE INDEX IF NOT EXISTS idx_project_organization_assignments_active 
  ON project_organization_assignments(is_active) WHERE is_active = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_project_organization_assignments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_organization_assignments_timestamp
  BEFORE UPDATE ON project_organization_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_project_organization_assignments_timestamp();

-- Row Level Security (RLS) policies
ALTER TABLE project_organization_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view assignments for projects/organizations they have access to
CREATE POLICY "Users can view project organization assignments" 
  ON project_organization_assignments 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND (
      -- User has access to the project
      EXISTS (
        SELECT 1 FROM user_organization_roles uor
        JOIN projects p ON p.organization_id = uor.organization_id
        WHERE p.id = project_organization_assignments.project_id
        AND uor.user_id = auth.uid()
      )
      OR
      -- User has access to the organization
      EXISTS (
        SELECT 1 FROM user_organization_roles uor
        WHERE uor.organization_id = project_organization_assignments.organization_id
        AND uor.user_id = auth.uid()
      )
    )
  );

-- Policy: Users can create assignments if they have management rights
CREATE POLICY "Users can create project organization assignments" 
  ON project_organization_assignments 
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    -- User has management rights for either the project's organization or the target organization
    (
      EXISTS (
        SELECT 1 FROM user_organization_roles uor
        JOIN projects p ON p.organization_id = uor.organization_id  
        WHERE p.id = project_organization_assignments.project_id
        AND uor.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM user_organization_roles uor
        WHERE uor.organization_id = project_organization_assignments.organization_id
        AND uor.user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update assignments they created or have management rights for
CREATE POLICY "Users can update project organization assignments" 
  ON project_organization_assignments 
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL AND (
      assigned_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_organization_roles uor
        JOIN projects p ON p.organization_id = uor.organization_id
        WHERE p.id = project_organization_assignments.project_id
        AND uor.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM user_organization_roles uor
        WHERE uor.organization_id = project_organization_assignments.organization_id
        AND uor.user_id = auth.uid()
      )
    )
  );

-- Policy: Users can delete assignments they created or have management rights for
CREATE POLICY "Users can delete project organization assignments" 
  ON project_organization_assignments 
  FOR DELETE 
  USING (
    auth.uid() IS NOT NULL AND (
      assigned_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_organization_roles uor
        JOIN projects p ON p.organization_id = uor.organization_id
        WHERE p.id = project_organization_assignments.project_id
        AND uor.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM user_organization_roles uor
        WHERE uor.organization_id = project_organization_assignments.organization_id
        AND uor.user_id = auth.uid()
      )
    )
  );

-- Add sample data for testing (optional)
-- INSERT INTO project_organization_assignments (project_id, organization_id, relationship_type, notes, assigned_by)
-- SELECT 
--   p.id as project_id,
--   o.id as organization_id,
--   'issuer' as relationship_type,
--   'Initial project-organization relationship' as notes,
--   '00000000-0000-0000-0000-000000000000' as assigned_by -- Replace with actual user ID
-- FROM projects p 
-- CROSS JOIN organizations o 
-- LIMIT 3; -- Creates 3 sample assignments

COMMENT ON TABLE project_organization_assignments IS 'Stores many-to-many relationships between projects and organizations with typed relationship roles';
COMMENT ON COLUMN project_organization_assignments.relationship_type IS 'Type of relationship: issuer, investor, service_provider, or regulator';
COMMENT ON COLUMN project_organization_assignments.is_active IS 'Whether this assignment is currently active';
COMMENT ON COLUMN project_organization_assignments.assigned_by IS 'User who created this assignment';
COMMENT ON COLUMN project_organization_assignments.notes IS 'Optional notes about the relationship';
