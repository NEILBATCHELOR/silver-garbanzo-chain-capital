# Climate Receivables Naming Conventions Fix

## Summary

Fixed TypeScript property naming convention errors in the climate receivables components. The issue was a mismatch between camelCase property names used in the components and snake_case property names defined in the database schema and TypeScript interfaces.

## Problem Details

The climate receivables components were using camelCase property naming conventions for database fields (e.g., `riskScore`, `dueDate`, `discountRate`), while the database schema and TypeScript interfaces correctly used snake_case naming (e.g., `risk_score`, `due_date`, `discount_rate`). This caused 70+ TypeScript errors.

## Files Fixed

1. **climate-receivable-detail.tsx**
   - Changed all property accesses to use snake_case format
   - Fixed properties like `riskScore` → `risk_score`, `dueDate` → `due_date`, etc.

2. **climate-receivable-form.tsx**
   - Added missing import for `EnergyAssetType`
   - Fixed form schema property definitions
   - Updated all property accesses to use snake_case
   - Fixed property references in useEffect and event handlers

3. **climate-receivables-list.tsx**
   - Updated all property accesses to use snake_case
   - Fixed property comparisons in array filtering operations

## Coding Standards Applied

Maintained consistency with the project's coding standards:

- **Database & SQL**: Used snake_case for all database fields and column names (e.g., `risk_score`, `due_date`)
- **TypeScript/JavaScript**: Updated component property access to match the snake_case database naming convention when accessing database entity properties

## Key Changes

1. Replaced camelCase property names with snake_case equivalents:
   - `riskScore` → `risk_score`
   - `dueDate` → `due_date` 
   - `discountRate` → `discount_rate`
   - `riskFactors` → `risk_factors`
   - `creditRating` → `credit_rating`
   - `financialHealthScore` → `financial_health_score`
   - `incentiveId` → `incentive_id`
   - `expectedReceiptDate` → `expected_receipt_date`
   - `policyImpacts` → `policy_impacts`
   - `assetId` → `asset_id`
   - `payerId` → `payer_id`
   - `receivableId` → `receivable_id`

2. Fixed form schema and default values to use snake_case naming

## Results

All TypeScript errors related to property naming have been resolved. The components now correctly access properties using the snake_case naming convention that matches the database schema and TypeScript interface definitions.
