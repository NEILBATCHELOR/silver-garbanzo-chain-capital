-- Fix issuer_documents table by adding missing document_name column
-- This resolves the upload error: "Could not find the 'document_name' column of 'issuer_documents'"

-- Add the missing document_name column to issuer_documents table
ALTER TABLE issuer_documents 
ADD COLUMN IF NOT EXISTS document_name TEXT NOT NULL DEFAULT '';

-- Update the column to not have a default after adding it
ALTER TABLE issuer_documents 
ALTER COLUMN document_name DROP DEFAULT;

-- Add comment for clarity
COMMENT ON COLUMN issuer_documents.document_name IS 'Human-readable name for the document';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_issuer_documents_document_name ON issuer_documents(document_name);

-- Update any existing records to have a default document name based on type
UPDATE issuer_documents 
SET document_name = CASE 
  WHEN document_name = '' OR document_name IS NULL THEN 
    CASE document_type
      WHEN 'certificate_incorporation' THEN 'Certificate of Incorporation'
      WHEN 'memorandum_articles' THEN 'Memorandum & Articles of Association'
      WHEN 'commercial_register' THEN 'Commercial Register Extract'
      WHEN 'director_list' THEN 'List of Directors'
      WHEN 'shareholder_register' THEN 'Shareholder Register'
      WHEN 'financial_statements' THEN 'Financial Statements'
      WHEN 'regulatory_status' THEN 'Regulatory Status Certificate'
      WHEN 'qualification_summary' THEN 'Qualification Summary'
      WHEN 'business_description' THEN 'Business Description'
      WHEN 'organizational_chart' THEN 'Organizational Chart'
      WHEN 'key_people_cv' THEN 'Key People CVs'
      WHEN 'aml_kyc_description' THEN 'AML/KYC Description'
      ELSE CONCAT(
        UPPER(SUBSTRING(document_type::text, 1, 1)), 
        SUBSTRING(REPLACE(document_type::text, '_', ' '), 2)
      )
    END
  ELSE document_name
END
WHERE document_name = '' OR document_name IS NULL;
