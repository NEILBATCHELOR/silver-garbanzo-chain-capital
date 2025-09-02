-- Fix Document Upload Duplication and Download Issues
-- August 11, 2025 - Final Comprehensive Solution
-- 
-- This script addresses:
-- 1. Database duplicate prevention with unique constraints
-- 2. Storage bucket policy setup for downloads
-- 3. Data cleanup of existing duplicates

-- =====================================================
-- PART 1: Clean up existing duplicates
-- =====================================================

-- First, identify and remove duplicates, keeping the earliest record
WITH duplicate_groups AS (
  SELECT 
    issuer_id,
    document_type,
    document_name,
    MIN(created_at) as earliest_created_at,
    COUNT(*) as duplicate_count
  FROM issuer_documents
  GROUP BY issuer_id, document_type, document_name
  HAVING COUNT(*) > 1
),
records_to_delete AS (
  SELECT id.*
  FROM issuer_documents id
  INNER JOIN duplicate_groups dg ON 
    id.issuer_id = dg.issuer_id AND
    id.document_type = dg.document_type AND
    id.document_name = dg.document_name AND
    id.created_at > dg.earliest_created_at
)
DELETE FROM issuer_documents 
WHERE id IN (SELECT id FROM records_to_delete);

-- Log the cleanup
INSERT INTO audit_logs (
  id,
  action,
  category,
  severity,
  source,
  timestamp,
  metadata
) VALUES (
  gen_random_uuid(),
  'cleanup_duplicate_documents',
  'MAINTENANCE',
  'INFO',
  'system_maintenance',
  NOW(),
  jsonb_build_object(
    'description', 'Cleaned up duplicate documents in issuer_documents table',
    'cleanup_date', NOW()::text
  )
);

-- =====================================================
-- PART 2: Add database-level duplicate prevention
-- =====================================================

-- Create unique constraint to prevent future duplicates
-- This ensures no two documents can have the same issuer_id + document_type + document_name
-- while allowing different versions (document_name can be different)
CREATE UNIQUE INDEX IF NOT EXISTS idx_issuer_documents_unique_combo 
ON issuer_documents (issuer_id, document_type, document_name)
WHERE status = 'active';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_issuer_documents_lookup 
ON issuer_documents (issuer_id, document_type, status, created_at DESC);

-- Add index for document downloads
CREATE INDEX IF NOT EXISTS idx_issuer_documents_downloads 
ON issuer_documents (id, status) 
WHERE status = 'active';

-- =====================================================
-- PART 3: Storage bucket policy setup (manual steps required)
-- =====================================================

-- NOTE: The following storage bucket policies need to be set up manually in Supabase Dashboard
-- 
-- Go to Storage → issuer-documents bucket → Edit Bucket → Policies
-- 
-- 1. SELECT Policy (for downloads):
--    Policy name: "Allow authenticated users to download issuer documents"
--    Allowed operation: SELECT
--    Policy definition:
--    (auth.uid() IS NOT NULL)
--
-- 2. INSERT Policy (for uploads):
--    Policy name: "Allow authenticated users to upload issuer documents"
--    Allowed operation: INSERT
--    Policy definition:
--    (auth.uid() IS NOT NULL)
--
-- 3. UPDATE Policy (for file updates):
--    Policy name: "Allow authenticated users to update their uploads"
--    Allowed operation: UPDATE
--    Policy definition:
--    (auth.uid() IS NOT NULL)
--
-- 4. DELETE Policy (for file deletion):
--    Policy name: "Allow authenticated users to delete their uploads"
--    Allowed operation: DELETE
--    Policy definition:
--    (auth.uid() IS NOT NULL)

-- =====================================================
-- PART 4: Add trigger for automatic duplicate detection
-- =====================================================

-- Function to check for duplicates before insert
CREATE OR REPLACE FUNCTION check_issuer_document_duplicates()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a document with same issuer_id, document_type, and document_name already exists
  IF EXISTS (
    SELECT 1 FROM issuer_documents 
    WHERE issuer_id = NEW.issuer_id 
    AND document_type = NEW.document_type 
    AND document_name = NEW.document_name 
    AND status = 'active'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Document with name "%" and type "%" already exists for this issuer', NEW.document_name, NEW.document_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS prevent_issuer_document_duplicates ON issuer_documents;
CREATE TRIGGER prevent_issuer_document_duplicates
  BEFORE INSERT OR UPDATE ON issuer_documents
  FOR EACH ROW EXECUTE FUNCTION check_issuer_document_duplicates();

-- =====================================================
-- PART 5: Fix download URLs for existing documents
-- =====================================================

-- Update any malformed file URLs to use consistent format
UPDATE issuer_documents 
SET file_url = CASE 
  WHEN file_url LIKE '%/storage/v1/object/public/issuer-documents/%' 
    AND file_url NOT LIKE 'https://%' 
  THEN 'https://jrwfkxfzsnnjppogthaw.supabase.co' || file_url
  ELSE file_url
END
WHERE file_url LIKE '%/storage/v1/object/public/issuer-documents/%' 
  AND file_url NOT LIKE 'https://%';

-- =====================================================
-- PART 6: Verification queries
-- =====================================================

-- Check if duplicates exist (should return 0 rows)
SELECT 
  issuer_id,
  document_type,
  document_name,
  COUNT(*) as count
FROM issuer_documents 
WHERE status = 'active'
GROUP BY issuer_id, document_type, document_name
HAVING COUNT(*) > 1;

-- Check document counts by issuer
SELECT 
  issuer_id,
  COUNT(*) as total_documents,
  COUNT(DISTINCT document_type) as unique_types
FROM issuer_documents 
WHERE status = 'active'
GROUP BY issuer_id
ORDER BY total_documents DESC;

-- Show sample documents with proper URLs
SELECT 
  id,
  document_name,
  document_type,
  LEFT(file_url, 80) || '...' as file_url_preview,
  created_at
FROM issuer_documents 
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;

-- Final verification
SELECT 'Setup complete! Document duplication prevention and download fixes applied.' as status;
