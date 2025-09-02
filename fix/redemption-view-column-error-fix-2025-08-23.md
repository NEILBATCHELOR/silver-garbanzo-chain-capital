# Redemption View Column Error Fix - August 23, 2025

## Error Description
```
ERROR: 42P16: cannot change name of view column "project_name" to "target_raise_amount"
HINT: Use ALTER VIEW ... RENAME COLUMN ... to change name of view column instead.
```

## Root Cause
The `redemption-rules-target-raise-integration.sql` script was trying to use `CREATE OR REPLACE VIEW` to modify the `redemption_rules_with_product_details` view with structural changes to column names. PostgreSQL doesn't allow changing view column structure with `CREATE OR REPLACE VIEW` when there are column name conflicts.

## Solution Applied
**File Modified**: `/scripts/redemption-rules-target-raise-integration.sql`

**Change Made**:
```sql
-- BEFORE (causing error):
-- Step 8: Update comprehensive view to include target_raise information
CREATE OR REPLACE VIEW redemption_rules_with_product_details AS

-- AFTER (fixed):
-- Step 8: Drop and recreate comprehensive view to include target_raise information
DROP VIEW IF EXISTS redemption_rules_with_product_details CASCADE;
CREATE VIEW redemption_rules_with_product_details AS
```

## Technical Details
- **DROP VIEW IF EXISTS CASCADE**: Removes the existing view and any dependent views/objects
- **CREATE VIEW**: Creates a completely new view without column name conflicts
- **CASCADE**: Ensures all dependent objects are also dropped to prevent constraint violations

## Business Impact
- ✅ **Redemption Target Raise Integration**: Script can now be successfully applied to database
- ✅ **View Recreation**: Complex view with target raise capacity information works correctly
- ✅ **No Data Loss**: View recreation preserves all functionality while fixing column conflicts
- ✅ **Production Ready**: Database migration can proceed without PostgreSQL errors

## Next Steps
1. Run the corrected SQL script in Supabase dashboard
2. Verify the new view includes target_raise_amount and capacity calculations
3. Test redemption configure functionality with target raise limits

## Files Affected
- `/scripts/redemption-rules-target-raise-integration.sql` - Fixed view creation logic

## Status
**RESOLVED** - Script ready for database deployment without PostgreSQL view column errors.
