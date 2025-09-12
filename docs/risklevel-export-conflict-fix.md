# RiskLevel Export Conflict Resolution

## Issue
TypeScript error: Module './compliance' has already exported a member named 'RiskLevel'. Consider explicitly re-exporting to resolve the ambiguity.

## Root Cause
Two domain modules were exporting conflicting `RiskLevel` types:

1. **Compliance Module**: `export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';`
2. **Climate Module**: `export type RiskLevel = AlertSeverity;` (alias for `'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'`)

Both were being re-exported through `/types/domain/index.ts`, causing a naming conflict.

## Solution Applied

### 1. Renamed Climate RiskLevel Type
**File**: `/types/domain/climate/receivables.ts`
```typescript
// Before
export type RiskLevel = AlertSeverity;

// After  
export type ClimateRiskLevel = AlertSeverity;
```

### 2. Updated Import References
**Files Updated**:
- `/components/climateReceivables/components/tokenization/ClimateTokenizationManager.tsx`
- `/components/climateReceivables/components/visualizations/risk-assessment-dashboard.tsx`

**Changes**:
- Updated imports from `RiskLevel` to `ClimateRiskLevel`
- Updated type annotations to use `ClimateRiskLevel`
- Fixed enum-like usage patterns to use string literals

### 3. Fixed Enum-like Usage Patterns
The components were incorrectly treating the union types as enums (e.g., `RiskLevel.LOW`). Fixed to use string literals:

```typescript
// Before - Incorrect enum usage
const RISK_COLORS = {
  [RiskLevel.LOW]: "#4CAF50",
  [RiskLevel.MEDIUM]: "#FFC107", 
  [RiskLevel.HIGH]: "#F44336"
};

// After - Correct string literals
const RISK_COLORS = {
  "LOW": "#4CAF50",
  "MEDIUM": "#FFC107",
  "HIGH": "#F44336"
};
```

## Files Modified

1. **Types**:
   - `/types/domain/climate/receivables.ts` - Renamed `RiskLevel` to `ClimateRiskLevel`

2. **Components**:
   - `/components/climateReceivables/components/tokenization/ClimateTokenizationManager.tsx` - Updated import and type casting
   - `/components/climateReceivables/components/visualizations/risk-assessment-dashboard.tsx` - Extensive fixes for imports, types, and enum-like usage

## Result
✅ **TypeScript compilation error resolved**
✅ **Both compliance and climate domains can now export their respective risk level types without conflict**
✅ **Maintained backward compatibility for compliance module RiskLevel type**
✅ **Fixed incorrect enum-like usage patterns throughout climate components**

## Type Compatibility
The renamed `ClimateRiskLevel` (mapped to `AlertSeverity`) includes values: `'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'`

The compliance `RiskLevel` includes values: `'LOW' | 'MEDIUM' | 'HIGH'`

Both share common values (LOW, MEDIUM, HIGH) ensuring compatibility where needed.
