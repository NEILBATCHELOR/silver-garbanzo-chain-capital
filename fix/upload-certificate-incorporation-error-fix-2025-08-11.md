# Upload Certificate of Incorporation Error Fix

**Date:** August 11, 2025  
**Issue:** Could not find the 'is_public' column of 'issuer_documents' in the schema cache  
**Status:** CRITICAL - Blocking document uploads

## Problem Summary

The Certificate of Incorporation upload is failing because the frontend code is trying to insert an `is_public` field into the `issuer_documents` table, but this column doesn't exist in the database schema.

## Root Cause Analysis

1. **Database Schema Missing Column**: The `issuer_documents` table in PostgreSQL has 16 columns but is missing the `is_public` column
2. **Frontend Expects Column**: Multiple components reference `is_public`:
   - `/frontend/src/components/documents/IssuerDocumentUpload.tsx`
   - `/frontend/src/components/compliance/operations/documents/components/IssuerDocumentUpload.tsx`
3. **Form Structure**: The upload form includes `isPublic` field with default value `false`

## Affected Components

- **IssuerDocumentUpload.tsx** (2 versions) - Both try to insert `is_public: formData.isPublic`
- **IssuerDocumentList.tsx** (2 versions) - Display logic expects `is_public` field
- **Document upload forms** - Include public/private toggle functionality

## Solution

### 1. Apply Database Migration

**IMMEDIATE ACTION REQUIRED**: Run this SQL in your Supabase dashboard:

```sql
-- Add is_public column to issuer_documents table
ALTER TABLE public.issuer_documents 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.issuer_documents.is_public IS 'Indicates whether the document is publicly visible or restricted';

-- Create index for performance on is_public queries
CREATE INDEX idx_issuer_documents_is_public ON public.issuer_documents(is_public);
```

### 2. Verify Migration Success

After applying the migration, verify with:

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'issuer_documents' 
  AND column_name = 'is_public';
```

Expected result:
```
column_name | data_type | is_nullable | column_default
is_public   | boolean   | NO          | false
```

## Business Impact

- **Current Status**: Certificate of Incorporation uploads are completely blocked
- **User Experience**: Users see "Upload Error" when trying to upload required documents
- **Compliance Risk**: Cannot complete issuer onboarding without required documents
- **Severity**: HIGH - Blocks critical business functionality

## Technical Details

### Database Analysis
```sql
-- Current issuer_documents schema (16 columns):
id, issuer_id, document_type, file_url, status, uploaded_at, 
expires_at, last_reviewed_at, reviewed_by, version, metadata, 
created_at, updated_at, created_by, updated_by, document_name
```

### Form Data Structure
```typescript
interface DocumentUploadFormValues {
  documentName: string;
  documentType: string;
  isPublic: boolean;  // This field causes the error
  file: File;
}
```

### Error Location
The error occurs in the database insert operation:
```typescript
const { data, error: dbError } = await supabase
  .from('issuer_documents')
  .insert({
    issuer_id: projectId,
    document_type: formData.documentType,
    document_name: formData.documentName,
    document_url: urlData.publicUrl,
    status: 'active',
    is_public: formData.isPublic,  // ❌ Column doesn't exist
    metadata: { original_filename: file.name }
  });
```

## Files Created/Modified

1. **Migration Script**: `/scripts/add-is-public-column-to-issuer-documents.sql`
2. **Documentation**: `/fix/upload-certificate-incorporation-error-fix-2025-08-11.md`

## Next Steps

1. ✅ **IMMEDIATE**: Apply the database migration in Supabase dashboard
2. ✅ **VERIFY**: Test Certificate of Incorporation upload functionality
3. ✅ **VALIDATE**: Confirm other document uploads work correctly
4. ✅ **UPDATE**: Refresh Supabase types after migration

## Prevention

- **Schema Validation**: Regular checks between Prisma schema and actual database
- **Type Safety**: Ensure TypeScript types match database schema
- **Migration Testing**: Test migrations in development before production

---

**Priority**: CRITICAL  
**Estimated Fix Time**: 5 minutes (database migration)  
**Testing Required**: Document upload functionality verification
