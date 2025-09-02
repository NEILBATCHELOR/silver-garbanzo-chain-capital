# Fix: Issuer Documents Upload Error - Missing document_name Column

## Problem
Upload error when trying to upload "Certificate of Incorporation" document:
```
Could not find the 'document_name' column of 'issuer_documents' in the schema cache
```

## Root Cause
The frontend code in `IssuerDocumentUpload.tsx` tries to insert `document_name` into the `issuer_documents` table, but this column doesn't exist in that table. The `document_name` column exists in `issuer_detail_documents` instead.

**Affected File**: `/frontend/src/components/compliance/operations/documents/components/IssuerDocumentUpload.tsx` (line 163)

## Database Schema Issue
- ✅ `issuer_detail_documents` table HAS `document_name` column
- ❌ `issuer_documents` table MISSING `document_name` column

## Tables Comparison

### issuer_documents (missing document_name)
- id, issuer_id, document_type (enum), file_url, status, uploaded_at, expires_at, etc.

### issuer_detail_documents (has document_name)
- id, project_id, document_type (text), document_url, document_name, uploaded_at, etc.

## PostgreSQL Error Encountered
When running the initial script, encountered:
```
ERROR: 42883: function pg_catalog.substring(document_type, integer, integer) does not exist
HINT: No function matches the given name and argument types. You might need to add explicit type casts.
```

**Cause**: `document_type` is an enum type, not text, so string functions need explicit casting.

**Fix Applied**: Cast enum to text using `document_type::text` before string operations.

## Solution Applied
1. **Added `document_name` column to `issuer_documents` table**
2. **Updated existing records with default names based on document type**
3. **Added performance index on the new column**

## Files Created
- `/scripts/fix-issuer-documents-schema.sql` - SQL migration to fix the schema (with enum casting fix)
- `/scripts/fix-issuer-documents-schema-simple.sql` - Backup simple version (avoids complex string manipulation)

## How to Apply Fix
**Option 1** (Recommended) - Run the main fixed script:
   ```sql
   -- Copy content from /scripts/fix-issuer-documents-schema.sql
   ```

**Option 2** (If Option 1 fails) - Run the simple version:
   ```sql
   -- Copy content from /scripts/fix-issuer-documents-schema-simple.sql
   ```

2. Refresh your Supabase types:
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/core/supabase.ts
   ```

## Next Steps
After applying the fix:
1. Test the upload functionality with "Certificate of Incorporation"
2. Verify other document types also work
3. Check that existing uploaded documents display correctly

## Status
- [x] Identified root cause
- [x] Created SQL migration script
- [x] Fixed PostgreSQL enum casting error
- [x] Created backup simple script
- [ ] Applied to database
- [ ] Verified fix works
- [ ] Updated type definitions

## Affected Components
- `IssuerDocumentUpload.tsx` - Main upload component
- `CertificateIncorporationUpload` - Pre-configured button component
- All other issuer document upload variants
