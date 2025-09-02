-- Comprehensive Document Upload Duplication Fix
-- Run this script in your Supabase dashboard to clean up duplicates
-- and prevent future duplicates

-- ====================================
-- STEP 1: IDENTIFY EXISTING DUPLICATES
-- ====================================

-- Check for duplicate issuer documents
SELECT 
  issuer_id,
  document_type, 
  document_name,
  status,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at ASC) as ids,
  array_agg(created_at ORDER BY created_at ASC) as created_timestamps,
  array_agg(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY issuer_id, document_type, document_name ORDER BY created_at))) * 1000) as time_diffs_ms
FROM issuer_documents 
WHERE document_name IS NOT NULL AND status = 'active'
GROUP BY issuer_id, document_type, document_name, status
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ====================================
-- STEP 2: CLEAN UP DUPLICATES
-- ====================================

-- Delete duplicate issuer documents (keep the earliest record)
WITH duplicate_documents AS (
  SELECT 
    id,
    issuer_id,
    document_type,
    document_name,
    created_at,
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

-- ====================================
-- STEP 3: VERIFY CLEANUP
-- ====================================

-- Verify no duplicates remain
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

-- Should return no rows if cleanup was successful

-- ====================================
-- STEP 4: ADD PREVENTION CONSTRAINTS
-- ====================================

-- Add unique constraint to prevent future duplicates at database level
-- Note: This will fail if duplicates still exist, so run cleanup first
DO $$
BEGIN
    -- Try to add unique constraint for issuer documents
    BEGIN
        ALTER TABLE issuer_documents 
        ADD CONSTRAINT unique_issuer_document_per_type 
        UNIQUE (issuer_id, document_type, document_name, status);
        
        RAISE NOTICE 'Successfully added unique constraint for issuer documents';
    EXCEPTION WHEN duplicate_key THEN
        RAISE NOTICE 'Unique constraint already exists for issuer documents or duplicates still present';
    WHEN others THEN
        RAISE NOTICE 'Could not add unique constraint for issuer documents: %', SQLERRM;
    END;

    -- Try to add unique constraint for investor documents (if table exists)
    BEGIN
        ALTER TABLE investor_documents 
        ADD CONSTRAINT unique_investor_document_per_type 
        UNIQUE (investor_id, document_type, document_name, status);
        
        RAISE NOTICE 'Successfully added unique constraint for investor documents';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'investor_documents table does not exist yet';
    WHEN duplicate_key THEN
        RAISE NOTICE 'Unique constraint already exists for investor documents or duplicates still present';
    WHEN others THEN
        RAISE NOTICE 'Could not add unique constraint for investor documents: %', SQLERRM;
    END;
END $$;

-- ====================================
-- STEP 5: CREATE DUPLICATE PREVENTION FUNCTION
-- ====================================

-- Create function to handle duplicate prevention with upsert logic
CREATE OR REPLACE FUNCTION upsert_issuer_document(
    p_issuer_id UUID,
    p_document_type TEXT,
    p_document_name TEXT,
    p_file_url TEXT,
    p_is_public BOOLEAN DEFAULT false,
    p_created_by UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    existing_doc_id UUID;
    result_id UUID;
BEGIN
    -- Check if document already exists
    SELECT id INTO existing_doc_id
    FROM issuer_documents
    WHERE issuer_id = p_issuer_id
      AND document_type = p_document_type
      AND document_name = p_document_name
      AND status = 'active';

    IF existing_doc_id IS NOT NULL THEN
        -- Update existing document
        UPDATE issuer_documents
        SET 
            file_url = p_file_url,
            is_public = p_is_public,
            updated_by = p_created_by,
            updated_at = NOW(),
            metadata = p_metadata
        WHERE id = existing_doc_id;
        
        result_id := existing_doc_id;
        RAISE NOTICE 'Updated existing document with ID: %', result_id;
    ELSE
        -- Insert new document
        INSERT INTO issuer_documents (
            issuer_id,
            document_type,
            document_name,
            file_url,
            status,
            is_public,
            created_by,
            updated_by,
            metadata
        ) VALUES (
            p_issuer_id,
            p_document_type,
            p_document_name,
            p_file_url,
            'active',
            p_is_public,
            p_created_by,
            p_created_by,
            p_metadata
        ) RETURNING id INTO result_id;
        
        RAISE NOTICE 'Created new document with ID: %', result_id;
    END IF;

    RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- STEP 6: FINAL VERIFICATION
-- ====================================

-- Show final document counts by type
SELECT 
    document_type,
    COUNT(*) as total_documents,
    COUNT(DISTINCT issuer_id) as unique_issuers
FROM issuer_documents 
WHERE status = 'active'
GROUP BY document_type
ORDER BY total_documents DESC;

-- Show any remaining edge cases
SELECT 
    issuer_id,
    document_type,
    COUNT(*) as doc_count,
    array_agg(document_name ORDER BY created_at) as document_names
FROM issuer_documents 
WHERE status = 'active'
GROUP BY issuer_id, document_type
HAVING COUNT(*) > 1
ORDER BY doc_count DESC;

RAISE NOTICE 'Document upload duplication cleanup and prevention script completed successfully!';
