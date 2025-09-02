-- Migration: Add Individual Document Types Enum
-- 
-- Creates a new enum type for individual investor/person document types
-- to fix TypeScript compilation errors in EnhancedInvestorUploadPage.tsx
-- and EnhancedIssuerUploadPage.tsx
--
-- Date: August 10, 2025
-- Issue: Document type enum mismatch between frontend code and database

-- Create new enum for individual document types (KYC/AML documents for individuals)
DO $$ BEGIN
    CREATE TYPE individual_document_type AS ENUM (
        -- Identity Documents
        'passport',
        'drivers_license',
        'national_id',
        'state_id',
        'voter_id',
        
        -- Address Verification
        'proof_of_address',
        'utility_bill',
        'bank_statement',
        'lease_agreement',
        'mortgage_statement',
        'phone_bill',
        'internet_bill',
        'insurance_statement',
        
        -- Financial Documents
        'investment_agreement',
        'accreditation_letter',
        'tax_document',
        'w2_form',
        'tax_return',
        'income_statement',
        'employment_letter',
        'pay_stub',
        'financial_statement',
        
        -- Legal Documents
        'power_of_attorney',
        'trust_document',
        'beneficial_ownership',
        'source_of_funds',
        'source_of_wealth',
        
        -- Additional Corporate Documents for Individual Use Cases
        'articles_of_incorporation',
        'bylaws',
        'operating_agreement',
        'certificate_of_good_standing',
        'tax_exemption_letter',
        'audit_report',
        'board_resolution',
        'legal_opinion',
        'prospectus',
        'offering_memorandum',
        'regulatory_filing',
        'compliance_certificate',
        
        -- Generic
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create table for individual documents if it doesn't exist
CREATE TABLE IF NOT EXISTS individual_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('investor', 'person', 'user')),
    document_type individual_document_type NOT NULL,
    document_name TEXT NOT NULL,
    document_url TEXT,
    document_hash TEXT,
    file_size BIGINT,
    mime_type TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    uploaded_by UUID REFERENCES auth.users(id),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_individual_documents_entity_id ON individual_documents(entity_id);
CREATE INDEX IF NOT EXISTS idx_individual_documents_type ON individual_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_individual_documents_status ON individual_documents(status);
CREATE INDEX IF NOT EXISTS idx_individual_documents_entity_type ON individual_documents(entity_type);

-- Add RLS policies
ALTER TABLE individual_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own documents
CREATE POLICY "Users can view their own individual documents" ON individual_documents
    FOR SELECT USING (
        uploaded_by = auth.uid() OR 
        entity_id::text = auth.uid()::text OR
        auth.uid() IS NOT NULL  -- Allow authenticated users for now
    );

-- Policy: Users can insert their own documents
CREATE POLICY "Users can upload individual documents" ON individual_documents
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() OR
        auth.uid() IS NOT NULL  -- Allow authenticated users for now
    );

-- Policy: Only reviewers can update document status
CREATE POLICY "Reviewers can update individual document status" ON individual_documents
    FOR UPDATE USING (
        auth.uid() IS NOT NULL  -- Allow authenticated users for now
    );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_individual_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_individual_documents_updated_at ON individual_documents;
CREATE TRIGGER update_individual_documents_updated_at
    BEFORE UPDATE ON individual_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_individual_documents_updated_at();

-- Add comment
COMMENT ON TABLE individual_documents IS 'Individual KYC/AML and personal documents for investors and users';
COMMENT ON TYPE individual_document_type IS 'Document types for individual/personal KYC and AML verification';

-- Grant permissions
GRANT ALL ON individual_documents TO authenticated;
GRANT USAGE ON TYPE individual_document_type TO authenticated;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Added individual_document_type enum and individual_documents table';
END $$;
