# Import Path Fix for EnergyAssetManager.tsx

## Issue
TypeScript error TS2307: Cannot find module '../../services/energy-assets' or its corresponding type declarations.

## Root Cause
Incorrect relative import paths in the deeply nested EnergyAssetManager component.

**File Location**: `/components/climateReceivables/components/entities/energy-assets/EnergyAssetManager.tsx`
**Target Services**: `/components/climateReceivables/services/`
**Target Types**: `/components/climateReceivables/types/`

## Solution Applied

### Before (Incorrect Paths)
```typescript
import { energyAssetsService } from "../../services/energy-assets";
import { EnergyAsset, EnergyAssetType, EnergyAssetCsvRow, EnergyAssetValidationError, InsertEnergyAsset } from "../../types";
```

### After (Correct Paths)
```typescript
import { energyAssetsService } from "../../../services";
import { EnergyAsset, EnergyAssetType, EnergyAssetCsvRow, EnergyAssetValidationError, InsertEnergyAsset } from "../../../types";
```

## Path Calculation
From: `/components/climateReceivables/components/entities/energy-assets/EnergyAssetManager.tsx`
To: `/components/climateReceivables/services/` 

Navigation: `../../../` (go up 3 levels) → `services`

## Files Modified
- `EnergyAssetManager.tsx` - Fixed both service and type imports

## Status
✅ **RESOLVED** - TypeScript compilation error eliminated

## Verification
The component now correctly imports:
- `energyAssetsService` from the services index
- All required types from the types index
- Proper relative path navigation maintained
- No build-blocking TypeScript errors

This fix ensures the Energy Assets CRUD functionality works correctly without module resolution issues.
