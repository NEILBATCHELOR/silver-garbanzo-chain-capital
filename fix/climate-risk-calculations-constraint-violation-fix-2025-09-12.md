# Climate Risk Calculations Database Constraint Violation Fix

## Problem Summary
PostgreSQL constraint violation error (code '23514') occurring when trying to insert risk calculation data into the `climate_risk_calculations` table. The error message indicates violation of the `climate_risk_calculations_composite_risk_score_check` constraint.

## Root Cause Analysis

### Database Constraints
All risk scores and confidence values in the `climate_risk_calculations` table are constrained to values between 0 and 1:

- `composite_risk_score` must be between 0 and 1
- `composite_risk_confidence` must be between 0 and 1  
- `production_risk_score` must be between 0 and 1
- `production_risk_confidence` must be between 0 and 1
- `credit_risk_score` must be between 0 and 1
- `credit_risk_confidence` must be between 0 and 1
- `policy_risk_score` must be between 0 and 1
- `policy_risk_confidence` must be between 0 and 1

### Code Issues Identified

1. **Scale Mismatch**: Business logic was calculating risk scores in 0-100 range, but database expects 0-1 range
2. **Incorrect Clamping**: The `clampNumericValue()` method was designed for general numeric values (-9.9999 to 9.9999) but was being used for risk scores that need 0-1 range
3. **Individual Risk Methods**: All three risk calculation methods (`calculateProductionRisk`, `calculateCreditRisk`, `calculatePolicyRisk`) were returning scores in 0-100 range
4. **Composite Risk Calculation**: The composite risk was calculated from individual risks, then using `Math.round()` which could produce values much larger than 1

## Changes Made

### 1. Added Specialized Risk Value Clamping Function
```typescript
/**
 * Clamp risk score and confidence values to database constraint range (0-1)
 * All risk scores and confidence values must be between 0 and 1
 */
private static clampRiskValue(value: number | null): number | null {
  if (value === null || value === undefined || isNaN(value)) return null;
  return Math.max(0, Math.min(1, Number(value)));
}
```

### 2. Updated Database Insert to Use Appropriate Clamping
Updated `saveRiskCalculation()` method to use `clampRiskValue()` for all risk scores and confidence values, while keeping `clampNumericValue()` for discount rates and other non-risk values.

### 3. Normalized Individual Risk Calculation Methods
Modified all three risk calculation methods to return normalized scores:

- **calculateProductionRisk()**: `score: Math.min(riskScore, 100) / 100`
- **calculateCreditRisk()**: `score: Math.min(riskScore, 100) / 100`  
- **calculatePolicyRisk()**: `score: Math.min(riskScore, 100) / 100`

### 4. Fixed Composite Risk Calculation
Updated `calculateCompositeRisk()` to:
- Normalize composite score to 0-1 range: `score: normalizedScore = compositeScore / 100`
- Normalize composite confidence: `confidence: compositeConfidence / 100`
- Use normalized score for database storage while preserving original score for threshold comparisons

## Files Modified

- `/Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/src/components/climateReceivables/services/business-logic/enhanced-automated-risk-calculation-engine.ts`

## Testing Recommendations

1. **Unit Tests**: Test each risk calculation method to ensure scores are in 0-1 range
2. **Integration Tests**: Test full risk calculation workflow with database insertion
3. **Boundary Tests**: Test edge cases with extreme values to ensure proper clamping
4. **Regression Tests**: Verify that risk level thresholds (LOW/MEDIUM/HIGH) still work correctly

## Migration Notes

**No database schema changes required** - this fix ensures the application data conforms to existing constraints.

The business logic thresholds (30, 70, 90) continue to work as expected since the threshold comparison happens before normalization in the `calculateCompositeRisk()` method.

## Expected Outcome

After these changes:
- Risk calculations should complete successfully without database constraint violations
- All risk scores and confidence values will be properly normalized to 0-1 range
- Risk level categorization (LOW/MEDIUM/HIGH) continues to function correctly
- Database constraints are satisfied while preserving business logic integrity
