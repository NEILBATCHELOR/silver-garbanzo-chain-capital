# Risk Level Enum Database Constraint Fix

## Issue Summary
The climate risk calculation system was failing with database constraint violation error (code 23514) on the `climate_risk_calculations` table. All risk calculation saves were being rejected due to a mismatch between TypeScript enum values and database constraint expectations.

## Root Cause
- **Database Constraint:** Expected values `'LOW'`, `'MEDIUM'`, `'HIGH'` (uppercase)
- **TypeScript Enum:** Was using `'low'`, `'medium'`, `'high'`, `'critical'` (lowercase + extra value)

## Files Modified

### 1. `enhanced-types.ts`
- Updated `RiskLevel` enum to use uppercase values matching database constraint
- Removed `CRITICAL` level (not supported by database constraint)
- Updated `RiskCalculationStatistics` interface

```typescript
// Before
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

// After
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM', 
  HIGH = 'HIGH'
}
```

### 2. `enhanced-automated-risk-calculation-engine.ts`
- Updated `calculateCompositeRisk()` method to handle 3 levels instead of 4
- Updated `calculateDiscountRate()` method to remove CRITICAL reference
- Updated `generateRecommendations()` to consolidate HIGH risk actions
- Updated `generateAlerts()` to trigger critical alerts for HIGH risk scores ≥85
- Updated `calculateNextReviewDate()` to set HIGH risk review to 1 day
- Updated `getRiskCalculationStatistics()` method signatures

## Logic Changes

### Risk Level Determination
- **LOW:** Score < 30
- **MEDIUM:** Score 30-69 
- **HIGH:** Score ≥70 (includes what was previously CRITICAL)

### Alert Thresholds
- HIGH risk scores ≥85 now trigger critical-level alerts
- Maintains urgent treatment for very high risk scenarios

### Review Frequency
- **HIGH:** 1 day (was CRITICAL frequency)
- **MEDIUM:** 7 days 
- **LOW:** 30 days

## Expected Results
- ✅ Risk calculations should save successfully to database
- ✅ No more constraint violation errors
- ✅ Risk assessment logic remains robust with 3-tier system
- ✅ Critical scenarios still properly flagged (HIGH with score ≥85)

## Testing Notes
- Verify risk calculations complete without database errors
- Confirm HIGH risk receivables trigger appropriate alerts
- Check that review dates are calculated correctly
- Ensure risk statistics methods work properly

## Database Schema Reference
```sql
-- Constraint in climate_risk_calculations table:
CHECK ((composite_risk_level = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text])))
```
