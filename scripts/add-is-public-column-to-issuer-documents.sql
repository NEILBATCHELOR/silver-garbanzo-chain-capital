-- Migration: Add is_public column to issuer_documents table
-- Date: August 11, 2025
-- Issue: Upload error - Could not find the 'is_public' column of 'issuer_documents' in the schema cache

-- Add is_public column to issuer_documents table
ALTER TABLE public.issuer_documents 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.issuer_documents.is_public IS 'Indicates whether the document is publicly visible or restricted';

-- Create index for performance on is_public queries
CREATE INDEX idx_issuer_documents_is_public ON public.issuer_documents(is_public);

-- Update any existing documents to have is_public = false by default (already handled by DEFAULT)
-- This ensures data consistency for existing records

-- Verify the column was added successfully
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'issuer_documents' 
  AND column_name = 'is_public';
