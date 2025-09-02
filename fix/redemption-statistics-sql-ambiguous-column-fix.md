# Redemption Statistics SQL Script Fix

**Date**: August 26, 2025
**Issue**: PostgreSQL error 42702 - column reference ambiguous
**Status**: ✅ FIXED

## Problem

The original SQL script `link-redemption-windows-statistics.sql` failed with this error:
```
ERROR: 42702: column reference "approved_value" is ambiguous
DETAIL: It could refer to either a PL/pgSQL variable or a table column.
```

## Root Cause

In the `update_redemption_window_statistics` function, these PL/pgSQL variables had the same names as columns in the `redemption_windows` table:

- `approved_value` (variable) vs `approved_value` (column)
- `rejected_value` (variable) vs `rejected_value` (column) 
- `queued_value` (variable) vs `queued_value` (column)

PostgreSQL couldn't determine which to use in the UPDATE statement.

## Solution

**Fixed Variables:**
```sql
-- Before (ambiguous)
approved_value NUMERIC := 0;
rejected_value NUMERIC := 0;
queued_value NUMERIC := 0;

-- After (unambiguous)
calculated_approved_value NUMERIC := 0;
calculated_rejected_value NUMERIC := 0;
calculated_pending_value NUMERIC := 0;
```

**Additional Improvements:**
- Used `GET DIAGNOSTICS linked_requests_count = ROW_COUNT;` for accurate row counting
- Added better error handling for migration section
- Improved logging and information messages

## Files

- **Fixed Script**: `/fix/link-redemption-windows-statistics-fixed.sql`
- **Original Script**: `link-redemption-windows-statistics.sql` (provided in documents)

## Usage

Run the fixed SQL script in Supabase SQL Editor:
```sql
-- The script will:
-- 1. Create statistics update functions
-- 2. Create automatic triggers
-- 3. Link existing requests to windows
-- 4. Refresh all statistics
-- 5. Create verification and maintenance functions
```

## Verification

After running the script, use these verification queries included in the script:
- View statistics vs actual data comparison
- Show request-to-window assignments
- Run reconciliation function for maintenance

This fix ensures the redemption statistics system can automatically track and update window statistics based on actual redemption request data.
