# Targeted Fix for Issuer Document Upload Duplication

## Problem Description

When uploading documents for issuers, duplicate database entries were being created even though only one file was uploaded to storage. This occurred because the document upload process was checking for duplicates *after* uploading the file to storage, which led to race conditions and multiple database entries.

## Root Cause

The issue was in the `executeUploadWithTransaction` method in the `EnhancedIssuerDocumentUploadService` class. The method was:

1. Uploading the file to storage first
2. Then checking if a document with the same name/type/issuer existed in the database
3. This allowed multiple processes to pass the duplicate check but create separate database entries

## Solution Implemented

We've implemented a focused fix that reorders the transaction steps to:

1. Check for existing documents BEFORE uploading to storage
2. If a document already exists, update it instead of creating a new entry
3. If the document doesn't exist, create a new entry
4. Add better race condition handling to detect documents created between our check and insert

This approach fixes the immediate issue without requiring changes to the service interface or impacting existing components.

## Code Changes

The main changes were made to the `executeUploadWithTransaction` method in `EnhancedIssuerDocumentUploadService.ts`:

1. Reordered the transaction steps to check for duplicates before uploading files
2. Added better error handling for race conditions
3. Improved logging to help identify and debug issues
4. Enhanced cleanup to prevent orphaned files in storage

## Testing

The fix has been tested with the following scenarios:

1. Uploading a new document (verified creates single database entry)
2. Uploading a document with the same name (verified updates existing entry)
3. Uploading the same document from different components (verified no duplicates)
4. Uploading documents with race conditions (verified proper handling)

## Benefits of this Approach

This targeted approach:

1. Fixes the immediate issue without breaking existing functionality
2. Doesn't require changes to any other components or services
3. Improves overall reliability by preventing orphaned files
4. Adds better error handling and logging

## Future Recommendations

While this fix addresses the immediate issue, we recommend the following long-term improvements:

1. Add database constraints to prevent duplicate entries
2. Consolidate document services to use a single approach
3. Add more robust error handling and recovery mechanisms

## Related Files

- `/frontend/src/services/document/enhancedIssuerDocumentUploadService.ts`
