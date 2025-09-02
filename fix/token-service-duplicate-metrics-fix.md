# Token Service Duplicate Performance Metrics Fix

## Problem
The `tokenService.ts` was experiencing duplicate key constraint violations when creating ERC-4626 tokens with performance metrics. The error occurred at line 3067 in the `createStandardArraysFromDirect` function:

```
Error Code: 23505
Constraint: token_erc4626_performance_metrics_token_id_metric_date_key
Message: duplicate key value violates unique constraint
```

## Root Causes

1. **Improper Upsert Syntax**: The original upsert strategy used incorrect syntax `onConflict: 'token_id,metric_date'` instead of proper column specification.

2. **Date Generation Logic**: When performance metrics didn't have explicit dates, the system generated dates using `baseDate.setDate(baseDate.getDate() - index)`, which could create duplicates when multiple operations occurred on the same day.

3. **Limited Error Handling**: The error handling only covered ERC-4626 performance metrics and didn't provide fallback strategies.

## Solutions Implemented

### 1. Enhanced Date Generation Logic
```typescript
// Before: Simple date generation that could create duplicates
const baseDate = new Date();
baseDate.setDate(baseDate.getDate() - index);
const metricDate = baseDate.toISOString().split('T')[0];

// After: Comprehensive unique date generation
const usedDates = new Set<string>();
// ... logic to ensure no duplicate dates within batch
```

### 2. Comprehensive Duplicate Constraint Handler
Created `handleDuplicateConstraintError()` function that:
- Supports multiple table types with different constraint configurations
- Implements fallback strategies: upsert → delete-and-insert
- Provides detailed logging and error reporting

### 3. Universal Error Handling
```typescript
// Before: Only handled ERC-4626 performance metrics
if (tableName === 'token_erc4626_performance_metrics' && error.code === '23505')

// After: Handles all duplicate constraints
if (error.code === '23505')
```

## Supported Tables
The fix now handles duplicate constraints for:
- `token_erc4626_performance_metrics` (token_id, metric_date)
- `token_erc1155_type_configs` (token_id, token_type_id)
- `token_erc1400_partition_balances` (partition_id, holder_address)
- `token_erc1400_partition_operators` (partition_id, holder_address, operator_address)
- `token_erc3525_slot_configs` (token_id, slot_id)
- `token_erc721_mint_phases` (token_id, phase_order)
- `token_erc721_trait_definitions` (token_id, trait_name)
- `token_geographic_restrictions` (token_id, country_code)
- `token_whitelists` (token_id, wallet_address)

## Resolution Strategies

### Strategy 1: Upsert
- Uses proper Supabase upsert syntax with correct conflict column specification
- Updates existing records instead of creating duplicates

### Strategy 2: Delete and Insert
- Deletes conflicting records for the specific token/constraint
- Performs fresh insert of new records
- Provides complete data consistency

## Testing

### Manual Test in TokenTestUtility
1. Create an ERC-4626 token with performance metrics
2. Immediately create another ERC-4626 token with the same performance metrics structure
3. Verify that no duplicate constraint errors occur
4. Check console logs for resolution strategy used

### Expected Behavior
- No more `Error Code: 23505` constraint violations
- Successful token creation with performance metrics
- Console logs showing resolution strategy (`upsert` or `delete_and_insert`)

## Files Modified
- `/src/components/tokens/services/tokenService.ts`
  - Added `handleDuplicateConstraintError()` function
  - Enhanced performance metrics date generation
  - Updated error handling in `createStandardArraysFromDirect()`

## Monitoring
The fix includes comprehensive logging to help monitor:
- Which tables experience duplicate constraints
- Which resolution strategy is used
- Success/failure rates of different strategies
- Performance impact of duplicate resolution

## Next Steps
1. Test the fix with TokenTestUtility
2. Monitor logs for any remaining constraint issues
3. Consider adding performance metrics table cleanup for development environments
4. Add constraint handling for any new tables with unique constraints
