-- Compliance Backend Service Database Migration
-- Date: August 12, 2025
-- Purpose: Add missing tables and enum values for compliance backend service API

-- First, add missing enum values to existing enums
ALTER TYPE compliance_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE compliance_status ADD VALUE IF NOT EXISTS 'finalized';
ALTER TYPE compliance_status ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE compliance_status ADD VALUE IF NOT EXISTS 'approved';

-- Create document_compliance_checks table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_compliance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('investor', 'issuer')),
    validation_level VARCHAR(20) NOT NULL DEFAULT 'enhanced' CHECK (validation_level IN ('basic', 'enhanced', 'comprehensive')),
    check_type VARCHAR(50) NOT NULL DEFAULT 'document_validation',
    status compliance_status NOT NULL DEFAULT 'pending_review',
    validation_results JSONB,
    auto_approved BOOLEAN NOT NULL DEFAULT false,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Add indexes for document_compliance_checks
CREATE INDEX IF NOT EXISTS idx_document_compliance_checks_document_id ON document_compliance_checks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_compliance_checks_entity_id ON document_compliance_checks(entity_id);
CREATE INDEX IF NOT EXISTS idx_document_compliance_checks_status ON document_compliance_checks(status);
CREATE INDEX IF NOT EXISTS idx_document_compliance_checks_entity_type ON document_compliance_checks(entity_type);

-- Add foreign key constraints for document_compliance_checks
ALTER TABLE document_compliance_checks 
ADD CONSTRAINT fk_document_compliance_checks_issuer_documents 
FOREIGN KEY (document_id) REFERENCES issuer_documents(id) ON DELETE CASCADE;

-- Note: investor_documents constraint will be added when that table is properly integrated

-- Add RLS policies for document_compliance_checks
ALTER TABLE document_compliance_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_compliance_checks_select_policy ON document_compliance_checks
    FOR SELECT USING (
        auth.uid() IS NOT NULL 
        AND (
            auth.uid() = created_by 
            OR auth.uid() = updated_by
            OR auth.uid() = reviewed_by
        )
    );

CREATE POLICY document_compliance_checks_insert_policy ON document_compliance_checks
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = created_by
    );

CREATE POLICY document_compliance_checks_update_policy ON document_compliance_checks
    FOR UPDATE USING (
        auth.uid() IS NOT NULL 
        AND (
            auth.uid() = created_by 
            OR auth.uid() = updated_by
        )
    ) WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = updated_by
    );

-- Add updated_at trigger for document_compliance_checks
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_document_compliance_checks_updated_at ON document_compliance_checks;
CREATE TRIGGER update_document_compliance_checks_updated_at
    BEFORE UPDATE ON document_compliance_checks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update compliance_reports table to match service expectations
-- Add missing fields to compliance_reports table
ALTER TABLE compliance_reports 
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS report_type VARCHAR(50) DEFAULT 'compliance_metrics' CHECK (report_type IN ('kyc_summary', 'aml_review', 'document_status', 'compliance_metrics', 'regulatory_filing')),
ADD COLUMN IF NOT EXISTS generated_by UUID,
ADD COLUMN IF NOT EXISTS period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data JSONB;

-- Create indexes for new compliance_reports fields
CREATE INDEX IF NOT EXISTS idx_compliance_reports_report_type ON compliance_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_generated_by ON compliance_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_period_start ON compliance_reports(period_start);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_period_end ON compliance_reports(period_end);

-- Ensure investor_documents table has proper structure
-- (This table exists but may need additional fields for compliance service)
ALTER TABLE investor_documents 
ADD COLUMN IF NOT EXISTS compliance_status compliance_status DEFAULT 'pending_review',
ADD COLUMN IF NOT EXISTS validation_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS compliance_notes TEXT;

-- Add indexes for investor_documents compliance fields
CREATE INDEX IF NOT EXISTS idx_investor_documents_compliance_status ON investor_documents(compliance_status);
CREATE INDEX IF NOT EXISTS idx_investor_documents_validation_score ON investor_documents(validation_score);

-- Add similar compliance fields to issuer_documents if not exists
ALTER TABLE issuer_documents 
ADD COLUMN IF NOT EXISTS compliance_status compliance_status DEFAULT 'pending_review',
ADD COLUMN IF NOT EXISTS validation_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS compliance_notes TEXT;

-- Add indexes for issuer_documents compliance fields
CREATE INDEX IF NOT EXISTS idx_issuer_documents_compliance_status ON issuer_documents(compliance_status);
CREATE INDEX IF NOT EXISTS idx_issuer_documents_validation_score ON issuer_documents(validation_score);

-- Create compliance_document_templates table for document validation templates
CREATE TABLE IF NOT EXISTS compliance_document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type document_type NOT NULL,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('investor', 'issuer')),
    jurisdiction VARCHAR(10) DEFAULT 'US',
    template_name VARCHAR(255) NOT NULL,
    validation_rules JSONB NOT NULL,
    required_fields JSONB,
    optional_fields JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Add indexes for compliance_document_templates
CREATE INDEX IF NOT EXISTS idx_compliance_document_templates_document_type ON compliance_document_templates(document_type);
CREATE INDEX IF NOT EXISTS idx_compliance_document_templates_entity_type ON compliance_document_templates(entity_type);
CREATE INDEX IF NOT EXISTS idx_compliance_document_templates_jurisdiction ON compliance_document_templates(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_compliance_document_templates_is_active ON compliance_document_templates(is_active);

-- Add RLS policies for compliance_document_templates
ALTER TABLE compliance_document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_document_templates_select_policy ON compliance_document_templates
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY compliance_document_templates_insert_policy ON compliance_document_templates
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = created_by
    );

CREATE POLICY compliance_document_templates_update_policy ON compliance_document_templates
    FOR UPDATE USING (
        auth.uid() IS NOT NULL 
        AND (
            auth.uid() = created_by 
            OR auth.uid() = updated_by
        )
    ) WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = updated_by
    );

-- Add updated_at trigger for compliance_document_templates
DROP TRIGGER IF EXISTS update_compliance_document_templates_updated_at ON compliance_document_templates;
CREATE TRIGGER update_compliance_document_templates_updated_at
    BEFORE UPDATE ON compliance_document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some default compliance document templates
INSERT INTO compliance_document_templates (document_type, entity_type, jurisdiction, template_name, validation_rules, required_fields, is_active, created_by, updated_by)
VALUES 
    ('passport', 'investor', 'US', 'US Passport Validation', 
     '{"identity_verification": true, "document_authenticity": true, "expiry_check": true}',
     '["document_number", "full_name", "date_of_birth", "expiry_date"]',
     true, 'system', 'system'),
    ('drivers_license', 'investor', 'US', 'US Drivers License Validation', 
     '{"identity_verification": true, "address_verification": true}',
     '["license_number", "full_name", "address", "date_of_birth"]',
     true, 'system', 'system'),
    ('certificate_incorporation', 'issuer', 'US', 'Certificate of Incorporation Validation', 
     '{"corporate_existence": true, "authorized_shares": true, "business_purpose": true}',
     '["company_name", "incorporation_date", "jurisdiction", "authorized_shares"]',
     true, 'system', 'system'),
    ('articles_association', 'issuer', 'US', 'Articles of Association Validation', 
     '{"governance_structure": true, "share_classes": true, "director_powers": true}',
     '["company_name", "share_classes", "director_details", "registered_office"]',
     true, 'system', 'system')
ON CONFLICT DO NOTHING;

-- Create compliance_settings table for system-wide compliance configuration
CREATE TABLE IF NOT EXISTS compliance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Add indexes for compliance_settings
CREATE INDEX IF NOT EXISTS idx_compliance_settings_key ON compliance_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_compliance_settings_category ON compliance_settings(category);
CREATE INDEX IF NOT EXISTS idx_compliance_settings_is_active ON compliance_settings(is_active);

-- Add RLS policies for compliance_settings
ALTER TABLE compliance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_settings_select_policy ON compliance_settings
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY compliance_settings_insert_policy ON compliance_settings
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = created_by
    );

CREATE POLICY compliance_settings_update_policy ON compliance_settings
    FOR UPDATE USING (
        auth.uid() IS NOT NULL 
        AND (
            auth.uid() = created_by 
            OR auth.uid() = updated_by
        )
    ) WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = updated_by
    );

-- Add updated_at trigger for compliance_settings
DROP TRIGGER IF EXISTS update_compliance_settings_updated_at ON compliance_settings;
CREATE TRIGGER update_compliance_settings_updated_at
    BEFORE UPDATE ON compliance_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default compliance settings
INSERT INTO compliance_settings (setting_key, setting_value, description, category, is_active, created_by, updated_by)
VALUES 
    ('kyc_verification_providers', '["onfido", "jumio", "sumsub"]', 'List of supported KYC verification providers', 'kyc', true, 'system', 'system'),
    ('aml_screening_enabled', 'true', 'Enable AML screening for all investors', 'aml', true, 'system', 'system'),
    ('document_auto_approval_threshold', '85', 'Auto-approve documents with validation score above this threshold', 'documents', true, 'system', 'system'),
    ('compliance_check_retention_days', '2555', 'Number of days to retain compliance check records (7 years)', 'retention', true, 'system', 'system'),
    ('multi_sig_governance_enabled', 'true', 'Enable multi-signature governance for compliance approvals', 'governance', true, 'system', 'system')
ON CONFLICT (setting_key) DO NOTHING;

-- Grant necessary permissions for the compliance system
GRANT SELECT, INSERT, UPDATE ON compliance_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON compliance_document_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON document_compliance_checks TO authenticated;
GRANT SELECT, UPDATE ON compliance_reports TO authenticated;
GRANT SELECT, UPDATE ON investor_documents TO authenticated;
GRANT SELECT, UPDATE ON issuer_documents TO authenticated;

-- Add realtime subscriptions for compliance tables
ALTER PUBLICATION supabase_realtime ADD TABLE compliance_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE compliance_document_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE document_compliance_checks;

COMMIT;

-- Migration Summary
-- ================
-- 1. Added missing enum values to compliance_status: 'draft', 'finalized', 'submitted', 'approved'
-- 2. Created document_compliance_checks table with proper indexes, constraints, and RLS policies
-- 3. Enhanced compliance_reports table with missing fields: title, report_type, generated_by, period_start, period_end, data
-- 4. Added compliance fields to investor_documents and issuer_documents tables
-- 5. Created compliance_document_templates table for validation templates with sample data
-- 6. Created compliance_settings table for system configuration with default settings
-- 7. Added proper indexes, RLS policies, and triggers for all new tables
-- 8. Granted necessary permissions and added realtime subscriptions
--
-- This migration provides the complete database foundation for the compliance backend service API
-- All TypeScript compilation errors related to missing database tables should now be resolved
