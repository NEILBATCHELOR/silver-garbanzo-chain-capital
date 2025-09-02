-- Organization Assignment Audit Trail
-- Tracks all changes to user organization assignments and project organization assignments

-- Create organization_assignment_audit table
CREATE TABLE IF NOT EXISTS organization_assignment_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was changed
  table_name TEXT NOT NULL CHECK (table_name IN ('user_organization_roles', 'project_organization_assignments')),
  record_id uuid NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
  
  -- Who made the change
  changed_by uuid REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- What changed
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  
  -- Context
  change_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  
  -- Additional metadata
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_assignment_audit_table_record 
  ON organization_assignment_audit(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_organization_assignment_audit_changed_by 
  ON organization_assignment_audit(changed_by);

CREATE INDEX IF NOT EXISTS idx_organization_assignment_audit_changed_at 
  ON organization_assignment_audit(changed_at);

CREATE INDEX IF NOT EXISTS idx_organization_assignment_audit_operation 
  ON organization_assignment_audit(operation_type);

-- Audit trigger function for user_organization_roles
CREATE OR REPLACE FUNCTION audit_user_organization_roles()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[] := '{}';
  old_values JSONB := '{}';
  new_values JSONB := '{}';
BEGIN
  -- Determine operation type and build change data
  IF TG_OP = 'INSERT' THEN
    new_values := to_jsonb(NEW);
    changed_fields := ARRAY['user_id', 'role_id', 'organization_id'];
    
    INSERT INTO organization_assignment_audit (
      table_name, record_id, operation_type, changed_by, 
      new_values, changed_fields, change_reason
    ) VALUES (
      'user_organization_roles', NEW.id, 'INSERT', auth.uid(),
      new_values, changed_fields, 'User organization role created'
    );
    
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    old_values := to_jsonb(OLD);
    new_values := to_jsonb(NEW);
    
    -- Detect changed fields
    IF OLD.user_id != NEW.user_id THEN changed_fields := array_append(changed_fields, 'user_id'); END IF;
    IF OLD.role_id != NEW.role_id THEN changed_fields := array_append(changed_fields, 'role_id'); END IF;
    IF OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN changed_fields := array_append(changed_fields, 'organization_id'); END IF;
    
    IF array_length(changed_fields, 1) > 0 THEN
      INSERT INTO organization_assignment_audit (
        table_name, record_id, operation_type, changed_by,
        old_values, new_values, changed_fields, change_reason
      ) VALUES (
        'user_organization_roles', NEW.id, 'UPDATE', auth.uid(),
        old_values, new_values, changed_fields, 'User organization role updated'
      );
    END IF;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    old_values := to_jsonb(OLD);
    changed_fields := ARRAY['user_id', 'role_id', 'organization_id'];
    
    INSERT INTO organization_assignment_audit (
      table_name, record_id, operation_type, changed_by,
      old_values, changed_fields, change_reason
    ) VALUES (
      'user_organization_roles', OLD.id, 'DELETE', auth.uid(),
      old_values, changed_fields, 'User organization role deleted'
    );
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger function for project_organization_assignments
CREATE OR REPLACE FUNCTION audit_project_organization_assignments()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[] := '{}';
  old_values JSONB := '{}';
  new_values JSONB := '{}';
BEGIN
  -- Determine operation type and build change data
  IF TG_OP = 'INSERT' THEN
    new_values := to_jsonb(NEW);
    changed_fields := ARRAY['project_id', 'organization_id', 'relationship_type'];
    
    INSERT INTO organization_assignment_audit (
      table_name, record_id, operation_type, changed_by,
      new_values, changed_fields, change_reason
    ) VALUES (
      'project_organization_assignments', NEW.id, 'INSERT', auth.uid(),
      new_values, changed_fields, 'Project organization assignment created'
    );
    
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    old_values := to_jsonb(OLD);
    new_values := to_jsonb(NEW);
    
    -- Detect changed fields
    IF OLD.project_id != NEW.project_id THEN changed_fields := array_append(changed_fields, 'project_id'); END IF;
    IF OLD.organization_id != NEW.organization_id THEN changed_fields := array_append(changed_fields, 'organization_id'); END IF;
    IF OLD.relationship_type != NEW.relationship_type THEN changed_fields := array_append(changed_fields, 'relationship_type'); END IF;
    IF OLD.notes IS DISTINCT FROM NEW.notes THEN changed_fields := array_append(changed_fields, 'notes'); END IF;
    IF OLD.is_active != NEW.is_active THEN changed_fields := array_append(changed_fields, 'is_active'); END IF;
    
    IF array_length(changed_fields, 1) > 0 THEN
      INSERT INTO organization_assignment_audit (
        table_name, record_id, operation_type, changed_by,
        old_values, new_values, changed_fields, change_reason
      ) VALUES (
        'project_organization_assignments', NEW.id, 'UPDATE', auth.uid(),
        old_values, new_values, changed_fields, 'Project organization assignment updated'
      );
    END IF;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    old_values := to_jsonb(OLD);
    changed_fields := ARRAY['project_id', 'organization_id', 'relationship_type'];
    
    INSERT INTO organization_assignment_audit (
      table_name, record_id, operation_type, changed_by,
      old_values, changed_fields, change_reason
    ) VALUES (
      'project_organization_assignments', OLD.id, 'DELETE', auth.uid(),
      old_values, changed_fields, 'Project organization assignment deleted'
    );
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS audit_user_organization_roles_trigger ON user_organization_roles;
CREATE TRIGGER audit_user_organization_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_organization_roles
  FOR EACH ROW EXECUTE FUNCTION audit_user_organization_roles();

DROP TRIGGER IF EXISTS audit_project_organization_assignments_trigger ON project_organization_assignments;
CREATE TRIGGER audit_project_organization_assignments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON project_organization_assignments
  FOR EACH ROW EXECUTE FUNCTION audit_project_organization_assignments();

-- Row Level Security for audit table
ALTER TABLE organization_assignment_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view audit records for assignments they have access to
CREATE POLICY "Users can view organization assignment audit records" 
  ON organization_assignment_audit 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND (
      -- User can see their own changes
      changed_by = auth.uid() OR
      -- User has admin/audit permissions (implement based on your permission system)
      EXISTS (
        SELECT 1 FROM user_organization_roles uor
        JOIN roles r ON r.id = uor.role_id
        WHERE uor.user_id = auth.uid()
        AND r.name IN ('admin', 'compliance_officer', 'auditor')
      )
    )
  );

-- Create view for easy audit querying
CREATE OR REPLACE VIEW organization_assignment_audit_view AS
SELECT 
  oaa.id,
  oaa.table_name,
  oaa.record_id,
  oaa.operation_type,
  oaa.changed_by,
  u.name as changed_by_name,
  u.email as changed_by_email,
  oaa.changed_at,
  oaa.old_values,
  oaa.new_values,
  oaa.changed_fields,
  oaa.change_reason,
  oaa.ip_address,
  oaa.user_agent,
  oaa.session_id,
  oaa.metadata,
  oaa.created_at
FROM organization_assignment_audit oaa
LEFT JOIN users u ON u.id = oaa.changed_by
ORDER BY oaa.changed_at DESC;

COMMENT ON TABLE organization_assignment_audit IS 'Audit trail for all organization assignment changes';
COMMENT ON COLUMN organization_assignment_audit.table_name IS 'Which table was modified (user_organization_roles or project_organization_assignments)';
COMMENT ON COLUMN organization_assignment_audit.operation_type IS 'Type of change: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN organization_assignment_audit.changed_fields IS 'Array of field names that were modified';
COMMENT ON COLUMN organization_assignment_audit.old_values IS 'JSONB snapshot of values before change';
COMMENT ON COLUMN organization_assignment_audit.new_values IS 'JSONB snapshot of values after change';
