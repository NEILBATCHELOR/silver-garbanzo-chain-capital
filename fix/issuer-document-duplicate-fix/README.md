# Fix for Duplicate Issuer Document Uploads

## Problem

When uploading documents for issuers, the files are being added once to storage but twice to the database. This happens because of how the document upload process is structured:

1. **EnhancedIssuerUploadPage.tsx** - Handles bulk uploading via the `EnhancedComplianceUpload` component
2. **OrganizationDetailPage.tsx** - Uses `SimplifiedDocumentManagement` for document uploads 

The duplication occurs because the `EnhancedIssuerDocumentUploadService.uploadDocument` method was checking for duplicates *after* uploading the file to storage, which could lead to race conditions where multiple database entries get created for the same document.

## Root Cause

The issue is in the `executeUploadWithTransaction` method in `EnhancedIssuerDocumentUploadService.ts`:

1. It first uploads the file to storage
2. Then it checks if a document record with the same name and type exists in the database
3. This order of operations allows for race conditions where two uploads can both pass the duplicate check, but then create two database records

## Solution

We've implemented several fixes:

1. **Reordered Transaction Steps**: Now we check for duplicates *before* uploading the file to storage
2. **Enhanced Duplicate Detection**: Added multiple layers of checks before proceeding with file upload
3. **Race Condition Handling**: Added code to detect and handle cases where a document is created between our check and insert

## Implementation Details

1. **Fixed `EnhancedIssuerDocumentUploadService.ts`**:
   - Restructured the `executeUploadWithTransaction` method to check for duplicates before file upload
   - Added better error handling for race conditions
   - Improved logging for better debugging

2. **Updated Error Messages**:
   - More descriptive messages when duplicates are detected
   - Better handling of database constraint violations

## Testing Steps

1. Navigate to the Issuer Management page
2. Select an existing issuer
3. Try to upload the same document twice in quick succession
4. Verify that only one database entry is created

## Additional Notes

- The fix ensures that storage is not polluted with unused files
- Enhanced logging will help track any future issues
- This approach is more efficient as it avoids unnecessary storage operations

## Related Components

- EnhancedIssuerUploadPage.tsx
- OrganizationDetailPage.tsx
- EnhancedIssuerDocumentUploadService.ts
