# ERC-4626 Database Schema Fixes

## Overview
Fixed critical database schema mismatches in ERC-4626 token creation that were causing console errors and failed inserts.

## Issues Fixed

### 1. Strategy Parameters - NULL Value Constraint Violation
**Error**: `null value in column "value" of relation "token_erc4626_strategy_params" violates not-null constraint`

**Root Cause**: The `value` column is NOT NULL in the database but the service was allowing null values.

**Fix**: Updated `handleERC4626Strategy` function to ensure value field is never null by providing fallback values.

```typescript
value: param.value || param.paramValue || '', // Ensure value is never null
```

### 2. Asset Allocations - Missing Column 'asset_address'
**Error**: `Could not find the 'asset_address' column of 'token_erc4626_asset_allocations' in the schema cache`

**Root Cause**: Service was mapping to non-existent columns like `asset_address`, `target_allocation`, etc.

**Actual Database Schema**:
- `asset` (not `asset_address`)
- `percentage` (not `target_allocation`)
- `description`
- `protocol`
- `expected_apy`

**Fix**: Updated field mapping in both `handleERC4626AssetAllocations` and `createStandardArraysFromDirect` functions.

### 3. Vault Strategies - Missing Column 'allocationPercent'
**Error**: `Could not find the 'allocationPercent' column of 'token_erc4626_vault_strategies' in the schema cache`

**Root Cause**: Service was using camelCase `allocationPercent` instead of database snake_case `allocation_percentage`.

**Fix**: Added proper mapping for ERC-4626 vault strategies in `createStandardArraysFromDirect`.

### 4. Fee Tiers - Missing Column 'description'
**Error**: `Could not find the 'description' column of 'token_erc4626_fee_tiers' in the schema cache`

**Root Cause**: The database table doesn't have a `description` column.

**Actual Database Schema**:
- `tier_name`
- `min_balance` 
- `max_balance`
- `management_fee_rate`
- `performance_fee_rate`
- `deposit_fee_rate`
- `withdrawal_fee_rate`
- `tier_benefits` (JSONB)
- `is_active`

**Fix**: Added proper mapping for ERC-4626 fee tiers without the non-existent description column.

### 5. Performance Metrics - Duplicate Key Constraint Violation
**Error**: `duplicate key value violates unique constraint "token_erc4626_performance_metrics_token_id_metric_date_key"`

**Root Cause**: Multiple metrics with the same `metric_date` causing unique constraint violations.

**Fix**: Updated to generate unique dates for each metric by offsetting the base date.

## Database Schema Reference

### token_erc4626_strategy_params
- `id` (uuid, PK)
- `token_id` (uuid, NOT NULL)
- `name` (text, NOT NULL)
- `value` (text, NOT NULL) ⚠️ Critical: Cannot be null
- `description` (text)
- `param_type` (text)
- `is_required` (boolean)
- `default_value` (text)

### token_erc4626_asset_allocations
- `id` (uuid, PK)
- `token_id` (uuid, NOT NULL)
- `asset` (text, NOT NULL) ⚠️ Not `asset_address`
- `percentage` (text, NOT NULL) ⚠️ Not `target_allocation`
- `description` (text)
- `protocol` (text)
- `expected_apy` (text)

### token_erc4626_vault_strategies
- `id` (uuid, PK)
- `token_id` (uuid, NOT NULL)
- `strategy_name` (text, NOT NULL)
- `strategy_type` (text, NOT NULL)
- `protocol_address` (text)
- `protocol_name` (text)
- `allocation_percentage` (text, NOT NULL) ⚠️ Not `allocationPercent`
- `min_allocation_percentage` (text)
- `max_allocation_percentage` (text)
- `risk_score` (integer)
- `expected_apy` (text)
- `actual_apy` (text)
- `is_active` (boolean)
- `last_rebalance` (timestamp)

### token_erc4626_fee_tiers
- `id` (uuid, PK)
- `token_id` (uuid, NOT NULL)
- `tier_name` (text, NOT NULL)
- `min_balance` (text, NOT NULL)
- `max_balance` (text)
- `management_fee_rate` (text, NOT NULL)
- `performance_fee_rate` (text, NOT NULL)
- `deposit_fee_rate` (text)
- `withdrawal_fee_rate` (text)
- `tier_benefits` (jsonb)
- `is_active` (boolean)
⚠️ No `description` column exists

### token_erc4626_performance_metrics
- `id` (uuid, PK)
- `token_id` (uuid, NOT NULL)
- `metric_date` (date, NOT NULL) ⚠️ Unique constraint with token_id
- `total_assets` (text, NOT NULL)
- `share_price` (text, NOT NULL)
- `apy` (text)
- `daily_yield` (text)
- `benchmark_performance` (text)
- `total_fees_collected` (text)
- `new_deposits` (text)
- `withdrawals` (text)
- `net_flow` (text)
- `sharpe_ratio` (text)
- `volatility` (text)
- `max_drawdown` (text)

## Files Modified

### 1. `/src/components/tokens/services/tokenService.ts`

#### Added Comprehensive ERC-4626 Mappings to `createStandardArraysFromDirect`
- `token_erc4626_strategy_params`: Proper field mapping with null protection
- `token_erc4626_asset_allocations`: Correct column names (`asset`, `percentage`)
- `token_erc4626_vault_strategies`: Proper snake_case mapping (`allocation_percentage`)
- `token_erc4626_fee_tiers`: Correct schema without description column
- `token_erc4626_performance_metrics`: Unique date generation

#### Updated `handleERC4626AssetAllocations`
- Fixed field mapping from `asset_address` to `asset`
- Fixed field mapping from `target_allocation` to `percentage`
- Added proper fallback values

#### Updated `handleERC4626Strategy`
- Added null protection for `value` field
- Enhanced field mapping with fallbacks
- Improved parameter indexing

## Testing

The TokenTestUtility now properly handles ERC-4626 tokens with:
- ✅ Valid field names that match database schema
- ✅ Proper null value protection
- ✅ Unique constraint compliance
- ✅ Comprehensive additional table support

## Status

**COMPLETED**: All ERC-4626 database schema issues resolved
- Strategy params: ✅ Fixed null value constraint
- Asset allocations: ✅ Fixed column name mismatches
- Vault strategies: ✅ Fixed camelCase/snake_case issues
- Fee tiers: ✅ Fixed missing column references
- Performance metrics: ✅ Fixed unique constraint violations

The ERC-4626 token creation now works successfully with comprehensive additional table support.
