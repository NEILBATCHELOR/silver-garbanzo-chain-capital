# NAV Calculator Domain-Specific Forms Fix

**Date:** January 4, 2025  
**Status:** ✅ COMPLETED  
**Priority:** CRITICAL  

## Problem Statement

There was a fundamental disconnect between the rich, domain-specific backend NAV calculator types and the generic frontend forms. The frontend was using generic schema-driven forms that treated all calculators the same way, completely ignoring the sophisticated business logic and validation rules encoded in the backend calculator interfaces.

### Critical Issues Identified:

1. **Backend has rich domain types**: `BondCalculationInput` with specific fields like `faceValue`, `couponRate`, `maturityDate`, `creditRating`, `cusip`, `yieldToMaturity`, `issuerType`, etc.

2. **Frontend used generic schemas**: Generic `CalculatorInputField` types with basic `string`, `number`, `date`, `boolean` field types that ignored domain knowledge.

3. **Mock schema dependency**: Forms were trying to fetch "calculator schemas" from the backend but using generic validation instead of leveraging the specific domain logic.

4. **Loss of business context**: Bond calculators and Asset-Backed Securities were treated identically despite vastly different financial modeling requirements.

## Solution Implementation

### Step 1: Created Domain-Specific Types (`frontend/src/types/nav/calculator-inputs.ts`)

Created calculator-specific input types that mirror the backend calculator interfaces:

```typescript
// Bond Calculator - mirrors backend BondCalculationInput
export interface BondCalculationInput extends BaseCalculationInput {
  faceValue?: number
  couponRate?: number
  maturityDate?: Date
  issueDate?: Date
  paymentFrequency?: number // 2 = semi-annual, 4 = quarterly
  creditRating?: string
  cusip?: string
  isin?: string
  yieldToMaturity?: number
  marketPrice?: number // as percentage of face value
  accruedInterest?: number
  sector?: string
  issuerType?: 'government' | 'corporate' | 'municipal' | 'supranational'
}

// Asset-Backed Securities - mirrors backend AssetBackedCalculationInput
export interface AssetBackedCalculationInput extends BaseCalculationInput {
  assetNumber?: string
  assetType?: string
  originalAmount?: number
  currentBalance?: number
  delinquencyStatus?: number
  recoveryRate?: number
  creditQuality?: string
  subordinationLevel?: number
  creditEnhancement?: number
  // ... and many more domain-specific fields
}
```

### Step 2: Replaced Generic Forms with Domain-Specific Forms

#### Bond Calculator Form (`bonds-calculator-form.tsx`)
- **Before**: Generic schema form with basic field types
- **After**: Sophisticated bond-specific form with:
  - Bond identification (CUSIP, ISIN, issuer)
  - Bond characteristics (face value, coupon rate, payment frequency)
  - Credit analysis (rating, issuer type)
  - Market data (price, yield to maturity)
  - Proper validation rules for bond-specific business logic

#### Asset-Backed Securities Calculator (`asset-backed-calculator-form.tsx`)
- **Before**: Generic schema form identical to bonds
- **After**: Complex ABS-specific form with:
  - Security identification and underlying asset types
  - Pool characteristics (original amount, current balance, pool value)
  - Credit metrics (delinquency status, credit quality, recovery rates)
  - Tranching structure (subordination levels, credit enhancement)
  - Servicing details
  - Proper validation for ABS-specific requirements

### Step 3: Eliminated Mock Schema Dependencies

- **Removed**: `useCalculatorSchema` hook that tried to fetch generic schemas
- **Removed**: Generic `SchemaForm` component dependency
- **Added**: Direct domain-specific validation using Zod schemas that match backend validation logic

### Step 4: Connected Frontend Types to Backend Logic

Each calculator form now:
1. Uses domain-specific TypeScript interfaces
2. Validates input using business-rule-aware Zod schemas
3. Converts form data to the exact `CalculationInput` interface expected by backend calculators
4. Maintains type safety throughout the data flow

## Key Architecture Changes

### Before (Problematic):
```
Frontend Generic Schema ❌ Backend Rich Domain Types
     ↓                           ↓
Generic CalculatorInputField → BondCalculationInput (mismatch!)
     ↓                           ↓  
SchemaForm (generic)       → BondCalculator (domain-specific)
```

### After (Fixed):
```
Frontend Domain Types ✅ Backend Domain Types
     ↓                    ↓
BondFormData          → BondCalculationInput (perfect match!)
     ↓                    ↓
BondCalculatorForm    → BondCalculator (domain-aligned)
```

## Benefits Achieved

1. **Domain Expertise Preserved**: Forms now understand bond vs ABS vs equity differences
2. **Better Validation**: Business-rule-aware validation (e.g., maturity > issue date, credit ratings)
3. **Type Safety**: End-to-end TypeScript types from form to backend calculator
4. **No More Mocks**: Direct connection to real backend domain logic
5. **Enhanced UX**: Field-specific labels, descriptions, and validation messages
6. **Maintainability**: Changes to backend calculator interfaces can be reflected in frontend types

## Files Modified

### New Files:
- `frontend/src/types/nav/calculator-inputs.ts` - Domain-specific calculator input types

### Modified Files:
- `frontend/src/types/nav/index.ts` - Added exports for new calculator types
- `frontend/src/components/nav/calculators/bonds-calculator-form.tsx` - Complete domain-specific rewrite
- `frontend/src/components/nav/calculators/asset-backed-calculator-form.tsx` - Complete domain-specific rewrite
- `frontend/src/hooks/nav/useCalculateNav.ts` - Enhanced with domain-specific input support
- `frontend/src/hooks/nav/index.ts` - Updated exports, removed schema hook

### Deleted Files:
- `frontend/src/hooks/nav/useCalculatorSchema.ts` - Removed 370+ lines of mock schema generation

### Files to be Updated (Future):
- Other calculator forms (equity, commodities, real estate, etc.) should follow the same pattern
- `calculator-shell.tsx` if it references the old generic schema approach
- Navigation and routing components that reference calculators

## Hooks Enhancement

### Hooks Removed:
- ✅ **`useCalculatorSchema.ts`** - DELETED (370+ lines of mock schema generation)
  - Eliminated generic schema fetching
  - Removed mock data generation
  - No more dependency on backend schemas that don't exist

### Hooks Enhanced:
- ✅ **`useCalculateNav.ts`** - ENHANCED with domain-specific support
  - Now accepts `CalculatorInput` union type instead of generic `NavCalculationRequest`
  - Added `convertToApiRequest()` function for type-safe API conversion
  - Supports all calculator-specific input types (Bond, ABS, Equity, etc.)
  - Added domain-specific hooks: `useBondCalculateNav`, `useAssetBackedCalculateNav`, `useEquityCalculateNav`

### Hooks Kept:
- ✅ **`useCalculators.ts`** - Calculator registry management (good as-is)
- ✅ **`useNavHistory.ts`** - NAV history operations (good as-is)
- ✅ **`useNavOverview.ts`** - Dashboard overview (good as-is)
- ✅ **`useNavAudit.ts`** - Audit functionality (good as-is)
- ✅ **`useNavValuations.ts`** - Saved valuations (good as-is)

## Next Steps

1. **Apply same pattern to remaining calculators**: Equity, MMF, Commodities, Real Estate, etc.
2. **Remove generic schema components**: Delete `schema-form.tsx` component
3. **Update calculator registry**: Remove schema-based configuration if any remains
4. **Add integration tests**: Test form data conversion to backend input types
5. **Backend API validation**: Ensure backend properly validates the domain-specific input types

## Validation

To verify this fix:

1. **Type Safety**: Forms should have full TypeScript intellisense for domain-specific fields
2. **No Schema Errors**: No more "Failed to load calculator schema" errors
3. **Rich Validation**: Forms should show business-appropriate validation messages
4. **Backend Compatibility**: Form submissions should create proper domain-specific calculation inputs

## Impact

This fix resolves the fundamental architectural disconnect between frontend and backend, ensuring that the sophisticated financial domain knowledge encoded in the backend calculators is properly leveraged by the frontend forms. No more treating bonds like generic assets!
