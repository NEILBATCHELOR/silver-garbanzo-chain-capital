# TypeScript Errors Fix - Chain Capital Frontend

## Summary
Fixed 4 TypeScript errors in the Chain Capital project related to missing RiskLevel.CRITICAL enum values and non-existent wallet component exports.

## Errors Fixed

### 1. RiskLevel.CRITICAL Missing (2 errors)

**Files affected:**
- `/frontend/src/components/climateReceivables/hooks/useEnhancedRiskCalculation.ts` (lines 316, 366)

**Root cause:**
- Code was trying to use `RiskLevel.CRITICAL` 
- The imported enum from `../services/business-logic/enhanced-types` only had LOW, MEDIUM, HIGH
- Database constraint for `climate_risk_calculations.composite_risk_level` didn't allow CRITICAL

**Solution:**
- Updated RiskLevel enum in `/frontend/src/components/climateReceivables/services/business-logic/enhanced-types.ts`
- Added CRITICAL = 'CRITICAL' to the enum
- Created database migration script to update constraint: `fix/update-climate-risk-level-constraint.sql`

### 2. Missing Wallet Component Exports (2 errors)

**Files affected:**
- `/frontend/src/components/wallet/index.ts` (lines 10-11)

**Root cause:**
- Index.ts was trying to import `SafeWalletAccount` and `SafeNetworkSelector`
- These components don't exist in `SafeConnectWalletButton.tsx`
- Only `SafeConnectWalletButton` component exists

**Solution:**
- Commented out the non-existent imports
- Added TODO comments for future implementation
- Only exported the existing `ConnectWalletButton` component

## Database Changes Required

Run this SQL migration to allow CRITICAL values in climate risk calculations:

```sql
-- See: fix/update-climate-risk-level-constraint.sql
ALTER TABLE climate_risk_calculations DROP CONSTRAINT IF EXISTS climate_risk_calculations_composite_risk_level_check;
ALTER TABLE climate_risk_calculations ADD CONSTRAINT climate_risk_calculations_composite_risk_level_check 
  CHECK (composite_risk_level = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text]));
```

## Files Modified

1. **Enhanced Types:**
   - `/frontend/src/components/climateReceivables/services/business-logic/enhanced-types.ts`
   - Added CRITICAL to RiskLevel enum

2. **Wallet Index:**
   - `/frontend/src/components/wallet/index.ts`  
   - Removed non-existent imports, added TODOs

3. **Database Migration:**
   - `/fix/update-climate-risk-level-constraint.sql`
   - New SQL script to update database constraint

## Validation

After applying these changes:
- All TypeScript compilation errors should be resolved
- RiskLevel.CRITICAL can be used throughout the enhanced risk calculation system
- Wallet index only exports existing components
- Database supports CRITICAL risk levels for climate calculations

## Next Steps

1. Apply the SQL migration to update database constraints
2. Implement SafeWalletAccount and SafeNetworkSelector components if needed
3. Update imports in consuming components to only use existing exports
