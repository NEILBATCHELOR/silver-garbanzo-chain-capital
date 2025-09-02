# TypeScript Error Fix: Invalid Document Type

## Issue
TypeScript error TS2322 in EnhancedInvestorUploadPage.tsx:
```
Type '"employment_verification"' is not assignable to type 'ExtendedDocumentType'.
```

## Root Cause
The document type `'employment_verification'` was used in allowedTypes arrays but is not defined in the `ExtendedDocumentType` union type. The correct document type for employment documentation is `'employment_letter'`.

## Files Fixed

### 1. EnhancedInvestorUploadPage.tsx
**Location:** Line 412 in documentConfig.allowedTypes array
**Change:** Replaced `'employment_verification'` with `'employment_letter'`

### 2. documentVerificationService.ts  
**Location:** Line 92 in accreditation_proof.allowedDocumentTypes array
**Change:** Replaced `'employment_verification'` with `'employment_letter'`

## Validation
- All document types now match the `ExtendedDocumentType` definition
- TypeScript compilation should pass without errors
- Both investor upload page and document verification service use consistent document types

## Valid Investor Document Types
According to `/types/core/documentTypes.ts`, the valid document types for investors are:
- `passport`
- `drivers_license` 
- `national_id`
- `proof_of_address`
- `bank_statement`
- `investment_agreement`
- `accreditation_letter`
- `tax_document`
- `employment_letter` ✅ (correct type)
- `financial_statement`
- `utility_bill`
- `other`

## Status
✅ **FIXED** - All invalid document type references have been corrected
