# Storage Bucket Fix Required

## Issue
The "Bucket not found" error was caused by:

1. **Wrong bucket name:** Code was using `documents` but should use `issuer-documents`
2. **File size limit too restrictive:** Current 2MB limit is too small for compliance documents

## Fix Applied ✅
1. **Corrected bucket name** to `issuer-documents` in `CorrectedIssuerDocumentUpload.tsx`
2. **Updated code** to support 10MB file uploads
3. **Created SQL script** to increase bucket limits

## Required Action ⚠️
**You must run this SQL script** in your Supabase SQL editor to increase bucket size limits:

```sql
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
```

## Steps to Fix

1. **Run the SQL script:**
   - Go to your Supabase Dashboard
   - Navigate to SQL Editor
   - Run the script in `/scripts/update-storage-bucket-limits.sql`

2. **Test document upload:**
   - Try uploading a document in the issuer upload process
   - Should now work without "Bucket not found" error
   - Can upload files up to 10MB

## Files Fixed
- `CorrectedIssuerDocumentUpload.tsx` - Fixed bucket name and file size
- `EnhancedIssuerUploadPage.tsx` - Updated configuration
- `update-storage-bucket-limits.sql` - SQL script to run

## Expected Result
After running the SQL script:
- ✅ No more "Bucket not found" errors
- ✅ Can upload files up to 10MB
- ✅ All document types work correctly

---

**Status:** 🔄 Awaiting SQL script execution  
**Priority:** High - Required for document uploads to work
