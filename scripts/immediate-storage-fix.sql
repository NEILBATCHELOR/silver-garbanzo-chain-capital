-- IMMEDIATE FIX: Storage RLS Policies for Document Upload
-- Execute this in Supabase SQL Editor to fix upload errors immediately
-- August 11, 2025

-- =====================================================
-- CRITICAL: CREATE MISSING STORAGE RLS POLICIES
-- =====================================================

-- Policy 1: Allow authenticated users to upload files (INSERT)
CREATE POLICY "Authenticated users can upload files" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id IN ('issuer-documents', 'investor-documents', 'project-documents')
);

-- Policy 2: Allow authenticated users to read files (SELECT)
CREATE POLICY "Authenticated users can read files" ON storage.objects
FOR SELECT 
TO authenticated
USING (
  bucket_id IN ('issuer-documents', 'investor-documents', 'project-documents')
);

-- Policy 3: Allow public read access (for file sharing)
CREATE POLICY "Public can read files" ON storage.objects
FOR SELECT 
TO public
USING (
  bucket_id IN ('issuer-documents', 'investor-documents', 'project-documents')
);

-- Policy 4: Allow users to update their own files
CREATE POLICY "Users can update their own files" ON storage.objects
FOR UPDATE 
TO authenticated
USING (owner = auth.uid())
WITH CHECK (owner = auth.uid());

-- Policy 5: Allow users to delete their own files  
CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE 
TO authenticated
USING (owner = auth.uid());

-- =====================================================
-- VERIFY POLICIES WERE CREATED
-- =====================================================
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
