-- Alternative simpler version of issuer_documents fix (if the main script still has issues)
-- This version avoids complex string manipulation

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

-- Simple update for existing records - just set to 'Document' if empty
UPDATE issuer_documents 
SET document_name = 'Document'
WHERE document_name = '' OR document_name IS NULL;
