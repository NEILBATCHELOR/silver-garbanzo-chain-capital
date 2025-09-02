# Comprehensive Fix for Duplicate Issuer Document Uploads

## Problem Diagnosis

After thorough investigation, we've identified that the document upload duplication issue has two main causes:

1. **Incorrect Transaction Order** in `EnhancedIssuerDocumentUploadService.ts` - checking for duplicates AFTER uploading files
2. **Multiple Document Services** being used concurrently in the application:
   - `EnhancedIssuerDocumentUploadService.ts` in `/services/document/`
   - Various `documentStorage.ts` files in different component directories

## Solution Strategy

Our solution is three-pronged:

1. **Fix Transaction Order**: Check for duplicates before uploading files to storage
2. **Service Consolidation**: Ensure all components use the same document upload service
3. **Add Event Deduplication**: Implement more robust duplicate detection mechanisms

## Files Modified

1. `/frontend/src/services/document/enhancedIssuerDocumentUploadService.ts`
   - Reordered transaction steps to check for duplicates before upload
   - Added better race condition handling
   - Improved error messages for duplicate detection

2. `/frontend/src/components/compliance/operations/documents/components/index.ts`
   - Standardized document upload imports to use the enhanced service

## Implementation Steps

### 1. Transaction Reordering

The most critical fix is reordering the transaction flow in `enhancedIssuerDocumentUploadService.ts` to:
1. Check for existing documents first
2. Only upload files for new documents or updates
3. Clean up old files when updating documents

### 2. Service Consolidation Plan

For complete resolution, we need to:
1. Identify all places using alternative document upload services
2. Gradually migrate them to use the enhanced service
3. Add deprecation warnings to the old services

### 3. Event Deduplication

To prevent future duplications:
1. Add a global event registry for document uploads
2. Implement more robust client-side duplicate prevention
3. Add server-side unique constraints on the database

## Testing Verification

The fix has been tested by:
1. Uploading the same document multiple times in quick succession
2. Uploading from both the main upload interface and organization detail page
3. Verifying that only one database entry is created

## Next Steps

1. Complete migration of all document upload components to use the enhanced service
2. Add database unique constraints for document name + type + issuer_id
3. Add better logging and error tracking for document uploads
