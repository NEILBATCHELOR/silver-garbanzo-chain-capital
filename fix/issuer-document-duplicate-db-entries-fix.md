# Duplicate Database Entries in Issuer Document Uploads

## Issue Description

The system was creating duplicate database entries when uploading documents in the Issuer Management interface. Files were being uploaded to storage correctly (only once) but would create multiple database records, leading to:

1. Duplicate entries in the database
2. Confusion in the UI with multiple identical documents showing
3. Potential orphaned files in storage if a document was deleted

## Root Cause Analysis

The issue occurred because:

1. The document upload process checked for duplicates AFTER uploading the file to storage
2. Race conditions between the upload in the `EnhancedIssuerUploadPage` and `OrganizationDetailPage` components
3. Lack of proper transaction handling in the document upload service

## Fix Implementation

The solution implemented involves:

1. **Reordering Transaction Steps**: Now we check for duplicates BEFORE uploading files to storage
2. **Enhanced Duplicate Detection**: Added multi-layer checks to prevent race conditions
3. **Better Race Condition Handling**: Added code to detect and handle documents created during upload
4. **Improved Error Messages**: More descriptive messages when duplicates are detected

## Technical Details

The fix modifies the `executeUploadWithTransaction` method in `EnhancedIssuerDocumentUploadService.ts` to:

1. First check if a document with the same issuer ID, document type, and name exists
2. If it exists, update it with the new file (cleaning up the old file)
3. If it doesn't exist, create a new entry
4. Added handling for database constraint violations that occur due to race conditions

## Testing Verification

The fix has been tested by:

1. Uploading the same document multiple times in quick succession
2. Uploading documents from both the main upload interface and the organization detail page
3. Verifying that only a single database entry is created
4. Confirming that old file versions are properly cleaned up from storage

## Related Files

- `/frontend/src/services/document/enhancedIssuerDocumentUploadService.ts`
- `/frontend/src/components/compliance/pages/EnhancedIssuerUploadPage.tsx`
- `/frontend/src/components/compliance/management/OrganizationDetailPage.tsx`
