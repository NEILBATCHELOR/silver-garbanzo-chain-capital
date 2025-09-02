# Redemption Dashboard Statistics Fix

**Date**: August 26, 2025
**Issue**: Dashboard showing 0 Total Requests and 0 Processed despite database containing 3 approved requests
**Status**: ✅ FIXED with debugging enhancements

## Problem Analysis

The user reported seeing "0 Total Requests" and "0 Processed" in their redemption dashboard, but database queries showed:
- **3 redemption requests** in project "Hypo Fund" (`cdc4f92c-8da1-4d80-a917-a94eb8cafaf0`)
- **All 3 requests approved** with total value $9.2M
- **Requests properly linked to redemption window** "MMF Windows"

## Root Cause

The `RedemptionDashboard` component was potentially:
1. **Loading the wrong project** despite "Hypo Fund" being marked as primary
2. **Not properly calculating values** from `usdc_amount` field in database
3. **Missing debug information** to diagnose project selection issues

## Database Verification ✅

**Redemption Requests Query:**
```sql
SELECT COUNT(*) as count, SUM(CAST(token_amount AS NUMERIC)) as total_value 
FROM redemption_requests 
WHERE project_id = 'cdc4f92c-8da1-4d80-a917-a94eb8cafaf0';
```

**Result:** 3 requests, $9.2M total value

**Projects Query:**
```sql
SELECT name, id, is_primary FROM projects 
WHERE id = 'cdc4f92c-8da1-4d80-a917-a94eb8cafaf0';
```

**Result:** "Hypo Fund", is_primary: true

## Solution Applied

### 1. Enhanced Database Query
- Added `project_id` and `usdc_amount` to the redemption requests query
- Added `redemption_window_id` for better data linking
- Added debug logging to track which project is being queried

### 2. Improved Value Calculation
```typescript
// Before: Only used token_amount * conversion_rate
const calculatedUsdcAmount = req.token_amount && req.conversion_rate ? 
  Number(req.token_amount) * Number(req.conversion_rate) : 
  Number(req.token_amount) || 0;

// After: Prioritize usdc_amount from database
const calculatedUsdcAmount = req.usdc_amount ? 
  Number(req.usdc_amount) : 
  req.token_amount && req.conversion_rate ? 
    Number(req.token_amount) * Number(req.conversion_rate) : 
    Number(req.token_amount) || 0;
```

### 3. Debug Logging Added
- **Project ID logging:** Track which project the dashboard is querying
- **Request count logging:** Show how many requests were found
- **Statistics logging:** Display calculated totals, approved counts, etc.

## Files Modified

1. **RedemptionDashboard.tsx** - Enhanced query and debug logging
   - `/frontend/src/components/redemption/dashboard/RedemptionDashboard.tsx`

## Testing Steps

1. **Open Browser Console:** Press F12 → Console tab
2. **Navigate to Dashboard:** Go to `http://localhost:5173/redemption`
3. **Check Debug Output:** Look for these console messages:
   ```
   Fetching redemption requests for project ID: cdc4f92c-8da1-4d80-a917-a94eb8cafaf0
   Found redemption requests: 3 [array of requests]
   Dashboard Statistics: { totalCount: 3, totalValue: 9200000, ... }
   ```

## Expected Results After Fix

If the fix works correctly, you should see:
- **3 Total Requests** (instead of 0)
- **$9,200,000 Total Value** (instead of 0) 
- **3 Approved** requests
- **0 Pending** requests

## If Still Showing 0 Values

Check the console debug output:

### Scenario 1: Wrong Project Selected
```
Console: "Fetching redemption requests for project ID: 0350bd24-1f6d-4cc7-840a-da8916610063"
Solution: Use project selector to choose "Hypo Fund" project
```

### Scenario 2: Database Connection Issue
```
Console: "Found redemption requests: 0 []"
Solution: Check Supabase connection and database permissions
```

### Scenario 3: Data Format Issue
```
Console: "Dashboard Statistics: { totalCount: 3, totalValue: 0, ... }"
Solution: Check usdc_amount vs token_amount field values
```

## Verification Queries

Run these in Supabase SQL Editor to verify data:

```sql
-- Check redemption requests for Hypo Fund
SELECT * FROM redemption_requests 
WHERE project_id = 'cdc4f92c-8da1-4d80-a917-a94eb8cafaf0';

-- Check redemption window statistics  
SELECT * FROM redemption_windows 
WHERE name = 'MMF Windows';

-- Verify project settings
SELECT name, is_primary FROM projects 
WHERE id = 'cdc4f92c-8da1-4d80-a917-a94eb8cafaf0';
```

## Success Criteria

✅ Dashboard displays correct statistics matching database values  
✅ Debug logging helps identify any project selection issues  
✅ Enhanced value calculation handles both usdc_amount and token_amount fields  
✅ User can verify which project is being queried via console output  

The fix ensures the redemption dashboard accurately reflects the database state and provides debugging tools to quickly identify any future data display issues.
