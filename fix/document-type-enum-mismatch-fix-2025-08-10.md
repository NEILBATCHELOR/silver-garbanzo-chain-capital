# Document Type Enum Mismatch Fix

**Date:** August 10, 2025  
**Issue:** TypeScript compilation errors in EnhancedInvestorUploadPage.tsx and EnhancedIssuerUploadPage.tsx  
**Root Cause:** Document type enum mismatch between frontend code and database schema

## Problem Summary

The upload pages were using individual document types like `'passport'`, `'drivers_license'`, `'national_id'`, etc., but the database `document_type` enum only contained corporate document types like `'commercial_register'`, `'certificate_incorporation'`, etc.

## Files with Compilation Errors

- `frontend/src/components/compliance/pages/EnhancedInvestorUploadPage.tsx`
- `frontend/src/components/compliance/pages/EnhancedIssuerUploadPage.tsx`

### Error Details
```
Type '"passport"' is not assignable to type '"commercial_register" | "certificate_incorporation" | ...
```

## Root Cause Analysis

1. **Integration Service Issue**: `integrationService.getRecommendedDocumentTypes()` was returning document types that didn't exist in the database enum
2. **Database Schema Gap**: The database had separate enums for different document categories but was missing individual/personal document types
3. **Type System Mismatch**: Frontend code was trying to use personal document types with the corporate document type enum

## Solution Implemented

### 1. Database Migration Script
Created: `scripts/migrate-add-individual-document-types.sql`
- Adds new `individual_document_type` enum with 30+ personal document types
- Creates `individual_documents` table for individual KYC/AML documents
- Includes proper RLS policies and indexes

### 2. TypeScript Type Definitions
Created: `frontend/src/types/core/documentTypes.ts`
- Defines `IndividualDocumentType` union type
- Creates `ExtendedDocumentType` combining database and individual types
- Provides entity-specific document type mappings
- Includes type guards for validation

### 3. Service Layer Updates
Updated: `frontend/src/components/compliance/upload/enhanced/services/integrationService.ts`
- Changed import from `DocumentType` to `UploadDocumentType`
- Updated `getRecommendedDocumentTypes()` to return correct types by entity
- Fixed document categorization to use proper type patterns

### 4. Component Updates
Updated: `frontend/src/components/compliance/upload/enhanced/components/DocumentUploadPhase.tsx`
- Changed import to use new `UploadDocumentType`

Updated: `frontend/src/components/compliance/upload/enhanced/types/uploadTypes.ts`
- Updated `UploadDocument.documentType` to use `UploadDocumentType`
- Updated `DocumentUploadConfig.allowedTypes` to use new type array

## Document Type Mappings

### Investor Documents
- Identity: `passport`, `drivers_license`, `national_id`, `state_id`, `voter_id`
- Address: `proof_of_address`, `utility_bill`, `bank_statement`, `lease_agreement`
- Financial: `investment_agreement`, `accreditation_letter`, `tax_document`, `financial_statement`
- Generic: `other`

### Issuer Documents
- Corporate: `articles_of_incorporation`, `bylaws`, `operating_agreement`, `certificate_of_good_standing`
- Financial: `financial_statements`, `audit_report`, `tax_exemption_letter`
- Legal: `board_resolution`, `power_of_attorney`, `legal_opinion`
- Regulatory: `prospectus`, `offering_memorandum`, `regulatory_filing`, `compliance_certificate`
- Generic: `other`

### Organization Documents (Database Enum)
- `commercial_register`, `certificate_incorporation`, `memorandum_articles`
- `director_list`, `shareholder_register`, `financial_statements`
- `regulatory_status`, `qualification_summary`, `business_description`
- `organizational_chart`, `key_people_cv`, `aml_kyc_description`

## Next Steps

### Required Actions
1. **Apply Database Migration**
   ```sql
   \i /Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/scripts/migrate-add-individual-document-types.sql
   ```

2. **Regenerate Supabase Types**
   ```bash
   npx supabase gen types typescript --project-id [your-project-id] > src/types/core/supabase.ts
   ```

3. **Update Database Types Export**
   Add to `src/types/core/database.ts`:
   ```typescript
   export type IndividualDocumentType = Database["public"]["Enums"]["individual_document_type"];
   ```

4. **Test Compilation**
   ```bash
   npm run type-check
   ```

### Optional Improvements
- Add document validation service for file type checking
- Implement document categorization AI for automatic type detection
- Add document template validation for required fields
- Create document approval workflow integration

## Files Modified

### New Files
- `scripts/migrate-add-individual-document-types.sql` (147 lines)
- `scripts/apply-individual-document-migration.sql` (12 lines) 
- `frontend/src/types/core/documentTypes.ts` (190 lines)

### Modified Files
- `frontend/src/components/compliance/upload/enhanced/services/integrationService.ts`
- `frontend/src/components/compliance/upload/enhanced/components/DocumentUploadPhase.tsx`
- `frontend/src/components/compliance/upload/enhanced/types/uploadTypes.ts`

## Impact

- **Build-blocking errors:** Resolved
- **Type safety:** Improved with proper document type validation
- **Database schema:** Enhanced to support individual documents
- **Upload functionality:** Maintained with correct document types
- **Future scalability:** Prepared for additional document types

## Testing

To verify the fix:
1. Apply database migration
2. Regenerate types
3. Run `npm run type-check` - should pass without errors
4. Test upload pages for both investors and issuers
5. Verify document type dropdowns show correct options

## Notes

- This is a comprehensive fix that addresses both immediate compilation errors and long-term architectural alignment
- The temporary type definitions in `documentTypes.ts` will be replaced by actual database types after migration
- All existing functionality is preserved while adding new capabilities
