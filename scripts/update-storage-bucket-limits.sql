-- Update storage bucket file size limits for document uploads
-- Current limits are too restrictive for compliance documents

-- Increase issuer-documents bucket to 10MB (10485760 bytes)
UPDATE storage.buckets 
SET file_size_limit = 10485760 
WHERE name = 'issuer-documents';

-- Increase investor-documents bucket to 10MB if it has a limit
UPDATE storage.buckets 
SET file_size_limit = 10485760 
WHERE name = 'investor-documents' AND file_size_limit IS NOT NULL;

-- Increase project-documents bucket to 10MB  
UPDATE storage.buckets 
SET file_size_limit = 10485760 
WHERE name = 'project-documents';

-- Verify the updates
SELECT 
    name,
    public,
    file_size_limit,
    file_size_limit / (1024 * 1024) as size_limit_mb,
    allowed_mime_types
FROM storage.buckets
ORDER BY name;
