-- COMPREHENSIVE DOCUMENT DUPLICATE CLEANUP SCRIPT
-- This script removes ALL duplicates across ALL document tables
-- Created: August 11, 2025
-- Issue: Systematic duplicate document uploads across all document types

-- =============================================================================
-- STEP 1: CLEAN UP ISSUER DOCUMENTS DUPLICATES
-- =============================================================================

-- Remove the known memorandum_articles duplicate
DELETE FROM issuer_documents 
WHERE id = '087fa543-087d-4125-b2e1-cdfc6cf86887';

-- Find and remove any other issuer document duplicates
WITH issuer_duplicates AS (
  SELECT 
    id,
    issuer_id,
    document_type,
    document_name,
    metadata->>'original_filename' as original_filename,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY issuer_id, document_type, document_name, metadata->>'original_filename'
      ORDER BY created_at ASC
    ) as row_num
  FROM issuer_documents
)
DELETE FROM issuer_documents 
WHERE id IN (
  SELECT id 
  FROM issuer_duplicates 
  WHERE row_num > 1
);

-- =============================================================================
-- STEP 2: CLEAN UP INVESTOR DOCUMENTS DUPLICATES (if any)
-- =============================================================================

WITH investor_duplicates AS (
  SELECT 
    id,
    investor_id,
    document_type,
    document_name,
    metadata->>'original_filename' as original_filename,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY investor_id, document_type, document_name, metadata->>'original_filename'
      ORDER BY created_at ASC
    ) as row_num
  FROM investor_documents
)
DELETE FROM investor_documents 
WHERE id IN (
  SELECT id 
  FROM investor_duplicates 
  WHERE row_num > 1
);

-- =============================================================================
-- STEP 3: CLEAN UP ISSUER DETAIL DOCUMENTS DUPLICATES (if any)
-- =============================================================================

WITH issuer_detail_duplicates AS (
  SELECT 
    id,
    project_id,
    document_type,
    document_name,
    metadata->>'original_filename' as original_filename,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, document_type, document_name, metadata->>'original_filename'
      ORDER BY created_at ASC
    ) as row_num
  FROM issuer_detail_documents
)
DELETE FROM issuer_detail_documents 
WHERE id IN (
  SELECT id 
  FROM issuer_detail_duplicates 
  WHERE row_num > 1
);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check issuer_documents for remaining duplicates
SELECT 
  'issuer_documents' as table_name,
  document_type,
  COUNT(*) as total_docs,
  COUNT(DISTINCT CONCAT(issuer_id, document_type, document_name)) as unique_docs,
  COUNT(*) - COUNT(DISTINCT CONCAT(issuer_id, document_type, document_name)) as remaining_duplicates
FROM issuer_documents
GROUP BY document_type
HAVING COUNT(*) - COUNT(DISTINCT CONCAT(issuer_id, document_type, document_name)) > 0

UNION ALL

-- Check investor_documents for remaining duplicates
SELECT 
  'investor_documents' as table_name,
  document_type,
  COUNT(*) as total_docs,
  COUNT(DISTINCT CONCAT(investor_id, document_type, document_name)) as unique_docs,
  COUNT(*) - COUNT(DISTINCT CONCAT(investor_id, document_type, document_name)) as remaining_duplicates
FROM investor_documents
GROUP BY document_type
HAVING COUNT(*) - COUNT(DISTINCT CONCAT(investor_id, document_type, document_name)) > 0

UNION ALL

-- Check issuer_detail_documents for remaining duplicates
SELECT 
  'issuer_detail_documents' as table_name,
  document_type,
  COUNT(*) as total_docs,
  COUNT(DISTINCT CONCAT(project_id, document_type, document_name)) as unique_docs,
  COUNT(*) - COUNT(DISTINCT CONCAT(project_id, document_type, document_name)) as remaining_duplicates
FROM issuer_detail_documents
GROUP BY document_type
HAVING COUNT(*) - COUNT(DISTINCT CONCAT(project_id, document_type, document_name)) > 0;

-- =============================================================================
-- SUMMARY REPORT
-- =============================================================================

-- Final verification - show all document counts
SELECT 
  'SUMMARY' as info,
  'issuer_documents' as table_name,
  COUNT(*) as total_documents
FROM issuer_documents

UNION ALL

SELECT 
  'SUMMARY' as info,
  'investor_documents' as table_name,
  COUNT(*) as total_documents
FROM investor_documents

UNION ALL

SELECT 
  'SUMMARY' as info,
  'issuer_detail_documents' as table_name,
  COUNT(*) as total_documents
FROM issuer_detail_documents

ORDER BY table_name;
