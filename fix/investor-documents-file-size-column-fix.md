# Fix: Investor Documents file_size Column Error

**Date:** August 12, 2025  
**Type:** Database Schema Mismatch  
**Status:** ✅ Fixed

## Error Description

```
Error fetching investor documents: {code: '42703', details: null, hint: null, message: 'column investor_documents.file_size does not exist'}
```

## Root Cause

The frontend code was attempting to select a `file_size` column directly from the `investor_documents` table, but this column doesn't exist in the current database schema.

## Database Schema Analysis

The `investor_documents` table contains these columns:
- `id`, `investor_id`, `document_type`, `document_name`
- `file_url`, `status`, `is_public`
- `uploaded_at`, `expires_at`, `last_reviewed_at`, `reviewed_by`
- `version`, `metadata` (JSONB), `created_at`, `updated_at`, `created_by`, `updated_by`

**Note:** File size information is stored in the `metadata` JSONB field, not as a separate column.

## Files Fixed

### 1. investorManagementService.ts
- **File:** `/frontend/src/components/compliance/management/investorManagementService.ts`
- **Changes:**
  - Removed `file_size` from direct column selection in `getInvestorById()` method
  - Updated `InvestorWithDocuments` interface to remove `file_size` field

### 2. investorService.ts
- **File:** `/frontend/src/components/compliance/investor/services/investorService.ts`
- **Changes:**
  - Updated `InvestorWithDocuments` interface to remove `file_size` field

### 3. organizationService.ts
- **File:** `/frontend/src/components/compliance/management/organizationService.ts`
- **Changes:**
  - Updated `OrganizationWithDocuments` interface to remove `file_size` field

## Key Implementation Notes

### ✅ Correct Usage
```typescript
// File size from metadata JSONB field (still valid)
document.metadata.file_size
```

### ❌ Incorrect Usage (Fixed)
```typescript
// Direct column selection (doesn't exist)
.select(`
  id,
  document_name,
  document_type,
  status,
  file_size,  // ← This column doesn't exist
  uploaded_at,
  is_public
`)
```

### ✅ Fixed Query
```typescript
// Corrected query without file_size column
.select(`
  id,
  document_name,
  document_type,
  status,
  uploaded_at,
  is_public
`)
```

## Testing

The fix resolves the PostgreSQL error (code 42703) that was occurring when:
1. Navigating to investor detail pages
2. Loading investor documents
3. Any operation that called `getInvestorById()` method

## Related Components

These components continue to work correctly as they access file_size from metadata:
- `InvestorDocumentList.tsx` - uses `document.metadata.file_size`
- `IssuerDocumentList.tsx` - uses `document.metadata.file_size`
- Document upload utilities - store file_size in metadata field

## Impact

- ✅ Investor detail pages now load without errors
- ✅ Document lists display correctly
- ✅ No breaking changes to document upload functionality
- ✅ File size information still available via metadata field
