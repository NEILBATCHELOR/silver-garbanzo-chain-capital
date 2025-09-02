-- Fix Document Upload Duplicates Script
-- This script removes duplicate issuer documents and prevents future duplicates
-- Created: August 11, 2025
-- Issue: Duplicate document uploads showing in UI

-- Step 1: Remove the specific duplicate entry identified
DELETE FROM issuer_documents 
WHERE id = '1f8ed078-4d20-4ac8-846e-026f710434de';

-- Step 2: Check for any other duplicates (for reference)
-- This query identifies all potential duplicates
WITH duplicates AS (
  SELECT 
    id,
    issuer_id,
    document_type,
    document_name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY issuer_id, document_type, document_name, created_at
      ORDER BY id ASC
    ) as row_num
  FROM issuer_documents
)
SELECT 
  id,
  issuer_id,
  document_type,
  document_name,
  created_at,
  'DUPLICATE - CAN BE DELETED' as status
FROM duplicates 
WHERE row_num > 1
ORDER BY issuer_id, document_type, document_name;

-- Step 3: Add unique constraint to prevent future duplicates (optional)
-- Note: This will prevent uploads with exact same issuer_id, document_type, and document_name
-- Only run this if you want strict unique enforcement
/*
ALTER TABLE issuer_documents 
ADD CONSTRAINT unique_issuer_document_name 
UNIQUE (issuer_id, document_type, document_name);
*/

-- Verification: Check that the duplicate is removed
SELECT 
  id,
  issuer_id,
  document_name,
  document_type,
  created_at
FROM issuer_documents 
WHERE document_type = 'certificate_incorporation'
  AND issuer_id = 'bb1cc924-77ce-4d86-b5b1-e206cb7f97b5'
  AND document_name = '1'
ORDER BY created_at ASC;
