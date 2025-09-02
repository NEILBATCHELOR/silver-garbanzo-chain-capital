-- Clean up duplicate issuer documents
-- This script removes duplicate document records that were created due to
-- the race condition bug in the document upload components

-- Step 1: Identify duplicates (for verification)
SELECT 
  issuer_id,
  document_type, 
  document_name,
  status,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at ASC) as ids,
  array_agg(created_at ORDER BY created_at ASC) as created_timestamps
FROM issuer_documents 
WHERE document_name IS NOT NULL AND status = 'active'
GROUP BY issuer_id, document_type, document_name, status
HAVING COUNT(*) > 1;

-- Step 2: Delete duplicate records (keep the earliest created record)
WITH duplicate_documents AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY issuer_id, document_type, document_name, status 
      ORDER BY created_at ASC
    ) as row_num
  FROM issuer_documents 
  WHERE document_name IS NOT NULL AND status = 'active'
)
DELETE FROM issuer_documents 
WHERE id IN (
  SELECT id 
  FROM duplicate_documents 
  WHERE row_num > 1
);

-- Step 3: Verify cleanup was successful
SELECT 
  issuer_id,
  document_type, 
  document_name,
  status,
  COUNT(*) as count_after_cleanup
FROM issuer_documents 
WHERE document_name IS NOT NULL AND status = 'active'
GROUP BY issuer_id, document_type, document_name, status
HAVING COUNT(*) > 1;