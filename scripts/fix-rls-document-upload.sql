-- RLS Document Upload Fix - Storage Policies Migration
-- Fixes the "new row violates row-level security policy" error for document uploads
-- August 11, 2025

-- =====================================================
-- STORAGE RLS POLICIES FOR DOCUMENT UPLOADS
-- =====================================================

-- First, check if RLS is enabled on storage.objects (it should be by default)
-- If not enabled, enable it:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICY 1: Allow authenticated users to INSERT into storage.objects
-- =====================================================
CREATE POLICY "Authenticated users can upload to document buckets" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id IN ('issuer-documents', 'investor-documents', 'project-documents') 
  AND auth.uid() IS NOT NULL
);

-- =====================================================
-- POLICY 2: Allow authenticated users to SELECT their own uploads
-- =====================================================
CREATE POLICY "Users can view their own uploads" ON storage.objects
FOR SELECT 
TO authenticated
USING (
  bucket_id IN ('issuer-documents', 'investor-documents', 'project-documents')
  AND owner = auth.uid()
);

-- =====================================================
-- POLICY 3: Allow authenticated users to UPDATE their own uploads
-- =====================================================
CREATE POLICY "Users can update their own uploads" ON storage.objects
FOR UPDATE 
TO authenticated
USING (
  bucket_id IN ('issuer-documents', 'investor-documents', 'project-documents')
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id IN ('issuer-documents', 'investor-documents', 'project-documents')
  AND owner = auth.uid()
);

-- =====================================================
-- POLICY 4: Allow authenticated users to DELETE their own uploads
-- =====================================================
CREATE POLICY "Users can delete their own uploads" ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id IN ('issuer-documents', 'investor-documents', 'project-documents')
  AND owner = auth.uid()
);

-- =====================================================
-- POLICY 5: Allow public read access for public documents
-- =====================================================
CREATE POLICY "Public read access for document buckets" ON storage.objects
FOR SELECT 
TO public
USING (
  bucket_id IN ('issuer-documents', 'investor-documents', 'project-documents')
);

-- =====================================================
-- STORAGE BUCKET UPDATES - Ensure proper configuration
-- =====================================================

-- Update issuer-documents bucket to ensure proper settings
UPDATE storage.buckets
SET 
  public = true,
  file_size_limit = 2097152,  -- 2MB limit
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'text/plain'
  ]
WHERE id = 'issuer-documents';

-- Update investor-documents bucket
UPDATE storage.buckets
SET 
  public = true,
  file_size_limit = 2097152,  -- 2MB limit
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'text/plain'
  ]
WHERE id = 'investor-documents';

-- Update project-documents bucket
UPDATE storage.buckets
SET 
  public = true,
  file_size_limit = 2097152,  -- 2MB limit
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'text/plain'
  ]
WHERE id = 'project-documents';

-- =====================================================
-- CREATE BUCKETS IF THEY DON'T EXIST
-- =====================================================

-- Create issuer-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, owner, public, file_size_limit, allowed_mime_types)
SELECT 
  'issuer-documents',
  'issuer-documents',
  NULL,
  true,
  2097152,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'text/plain'
  ]
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'issuer-documents');

-- Create investor-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, owner, public, file_size_limit, allowed_mime_types)
SELECT 
  'investor-documents',
  'investor-documents',
  NULL,
  true,
  2097152,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'text/plain'
  ]
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'investor-documents');

-- Create project-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, owner, public, file_size_limit, allowed_mime_types)
SELECT 
  'project-documents',
  'project-documents',
  NULL,
  true,
  2097152,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'text/plain'
  ]
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'project-documents');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that RLS is enabled on storage.objects
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check our new policies are created
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- Check bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id IN ('issuer-documents', 'investor-documents', 'project-documents')
ORDER BY id;

-- =====================================================
-- NOTES
-- =====================================================

/*
This migration fixes the RLS document upload error by:

1. Creating proper RLS policies for storage.objects table that allow:
   - Authenticated users to upload documents (INSERT)
   - Users to view their own uploads (SELECT)
   - Users to update their own uploads (UPDATE) 
   - Users to delete their own uploads (DELETE)
   - Public read access for sharing documents

2. Configuring storage buckets with:
   - Public read access enabled
   - 2MB file size limit
   - Allowed MIME types for common document formats

3. Creating missing buckets if they don't exist

4. Verification queries to confirm setup

The key insight is that even "public" storage buckets in Supabase 
require RLS policies for authenticated operations like uploads.
*/
