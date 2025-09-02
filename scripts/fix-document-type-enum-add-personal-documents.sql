-- Fix Document Type Enum - Add Personal Identity Document Types
-- Created: August 12, 2025
-- Issue: Frontend trying to upload personal documents (passport, drivers_license, etc.) 
-- but enum only contains business documents

-- Add missing personal identity document types to document_type enum
ALTER TYPE document_type ADD VALUE 'passport';
ALTER TYPE document_type ADD VALUE 'drivers_license';
ALTER TYPE document_type ADD VALUE 'national_id';
ALTER TYPE document_type ADD VALUE 'utility_bill';
ALTER TYPE document_type ADD VALUE 'bank_statement';
ALTER TYPE document_type ADD VALUE 'proof_of_income';
ALTER TYPE document_type ADD VALUE 'proof_of_address';
ALTER TYPE document_type ADD VALUE 'employment_letter';
ALTER TYPE document_type ADD VALUE 'tax_return';
ALTER TYPE document_type ADD VALUE 'social_security';

-- Add indexes for performance on document lookups by type
CREATE INDEX IF NOT EXISTS idx_investor_documents_document_type ON investor_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_issuer_documents_document_type ON issuer_documents(document_type);

-- Verify the enum now contains both business and personal document types
SELECT enumlabel as document_types 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_type') 
ORDER BY enumsortorder;

COMMENT ON TYPE document_type IS 'Document types supporting both business/organizational documents and personal identity verification documents';
