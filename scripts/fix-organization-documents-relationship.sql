-- Fix Organization to Issuer Documents Relationship
-- This migration adds the missing organization_id column to establish proper foreign key relationship

-- Step 1: Add organization_id column to issuer_documents table
ALTER TABLE issuer_documents 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Step 2: Create index for performance
CREATE INDEX idx_issuer_documents_organization_id ON issuer_documents(organization_id);

-- Step 3: Create index for combined queries
CREATE INDEX idx_issuer_documents_org_status ON issuer_documents(organization_id, status);

-- Step 4: Update existing records (if any) to link to organizations
-- Note: This assumes issuer_id might be linked to organizations somehow
-- If there's no direct relationship, manual data migration may be needed
-- UPDATE issuer_documents SET organization_id = [appropriate_organization_id] WHERE issuer_id = [some_issuer_id];

-- Step 5: Add RLS policy for organization documents
CREATE POLICY "Users can view organization documents they have access to" ON issuer_documents
    FOR SELECT USING (
        auth.uid() IS NOT NULL 
        AND (
            organization_id IN (
                SELECT id FROM organizations 
                WHERE created_by = auth.uid() 
                OR id IN (
                    SELECT organization_id FROM user_permissions 
                    WHERE user_id = auth.uid() 
                    AND permission LIKE '%document%'
                )
            )
        )
    );

-- Step 6: Add policy for inserting organization documents
CREATE POLICY "Users can insert organization documents with proper permissions" ON issuer_documents
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND organization_id IN (
            SELECT id FROM organizations 
            WHERE created_by = auth.uid()
            OR id IN (
                SELECT organization_id FROM user_permissions 
                WHERE user_id = auth.uid() 
                AND permission LIKE '%document.create%'
            )
        )
    );

-- Step 7: Add policy for updating organization documents
CREATE POLICY "Users can update organization documents with proper permissions" ON issuer_documents
    FOR UPDATE USING (
        auth.uid() IS NOT NULL 
        AND organization_id IN (
            SELECT id FROM organizations 
            WHERE created_by = auth.uid()
            OR id IN (
                SELECT organization_id FROM user_permissions 
                WHERE user_id = auth.uid() 
                AND permission LIKE '%document.edit%'
            )
        )
    );

-- Step 8: Add policy for deleting organization documents
CREATE POLICY "Users can delete organization documents with proper permissions" ON issuer_documents
    FOR DELETE USING (
        auth.uid() IS NOT NULL 
        AND organization_id IN (
            SELECT id FROM organizations 
            WHERE created_by = auth.uid()
            OR id IN (
                SELECT organization_id FROM user_permissions 
                WHERE user_id = auth.uid() 
                AND permission LIKE '%document.delete%'
            )
        )
    );

-- Step 9: Add helpful view for organization documents
CREATE OR REPLACE VIEW organization_documents_view AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.legal_name,
    o.status as organization_status,
    o.compliance_status,
    d.id as document_id,
    d.document_name,
    d.document_type,
    d.status as document_status,
    d.file_url,
    d.file_size,
    d.uploaded_at,
    d.is_public,
    d.version,
    d.metadata,
    d.created_at as document_created_at,
    d.updated_at as document_updated_at
FROM organizations o
LEFT JOIN issuer_documents d ON o.id = d.organization_id
ORDER BY o.name, d.uploaded_at DESC;

-- Step 10: Add function to get document count for organizations
CREATE OR REPLACE FUNCTION get_organization_document_count(org_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM issuer_documents 
        WHERE organization_id = org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Add trigger to update organization updated_at when documents change
CREATE OR REPLACE FUNCTION update_organization_on_document_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE organizations 
        SET updated_at = NOW() 
        WHERE id = NEW.organization_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE organizations 
        SET updated_at = NOW() 
        WHERE id = OLD.organization_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_organization_on_document_change ON issuer_documents;
CREATE TRIGGER trigger_update_organization_on_document_change
    AFTER INSERT OR UPDATE OR DELETE ON issuer_documents
    FOR EACH ROW EXECUTE FUNCTION update_organization_on_document_change();

-- Step 12: Grant necessary permissions
GRANT SELECT ON organization_documents_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_document_count(UUID) TO authenticated;

-- Migration complete
-- Organizations can now properly access their related documents
-- Use: SELECT *, get_organization_document_count(id) as document_count FROM organizations;
-- Use: SELECT * FROM organization_documents_view WHERE organization_id = 'your-org-id';
