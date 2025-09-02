# Redemption Configure Column Fix - August 23, 2025

## Issue Summary
**Error**: `column "amount" does not exist` in http://localhost:5173/redemption/configure

## Root Cause Analysis
1. **Database Function Error**: The PostgreSQL function `get_redemption_capacity()` was referencing a non-existent column `amount`
2. **Table Schema Mismatch**: The `redemption_requests` table uses `token_amount` as the column name, not `amount`
3. **View Dependency**: The view `redemption_rules_with_product_details` calls this function, causing errors in the frontend

## Technical Details
- **Error Location**: EnhancedRedemptionConfigurationDashboard.tsx line 323
- **Function**: `loadEnhancedRedemptionRules()` 
- **Database View**: `redemption_rules_with_product_details`
- **Problematic Function**: `get_redemption_capacity(p_redemption_rule_id UUID)`

## Database Schema Verification
✅ **redemption_rules table**: Contains `target_raise_amount` column  
✅ **redemption_requests table**: Contains `token_amount` column (NOT `amount`)  
❌ **Function reference**: Was using `amount` instead of `token_amount`

## Solution Applied
### 1. SQL Migration Created
**File**: `fix/redemption-configure-column-amount-fix-2025-08-23.sql`

**Changes**:
- Updated `get_redemption_capacity()` function to use `token_amount` instead of `amount`
- Added proper error handling for undefined table scenarios
- Improved JOIN logic to connect redemption_requests with redemption_rules via project_id
- Added function documentation

### 2. Key Function Updates
```sql
-- BEFORE (Incorrect):
WHEN status IN ('completed', 'processed', 'settled') THEN amount

-- AFTER (Fixed):
WHEN status IN ('completed', 'processed', 'settled') THEN token_amount
```

## Implementation Steps
1. ✅ Identified root cause in database function
2. ✅ Created SQL migration script
3. ⏳ Apply migration to Supabase database
4. ⏳ Test redemption configure page functionality
5. ⏳ Verify interval redemption type integration

## Testing Checklist
After applying the migration:
- [ ] http://localhost:5173/redemption/configure loads without console errors
- [ ] Enhanced redemption rules display correctly with capacity information
- [ ] Rule creation and editing work properly
- [ ] Interval fund redemption type integrates with windows from /redemption/windows
- [ ] Project overview shows accurate capacity metrics

## Next Steps
1. **Apply Migration**: Run the SQL script against the Supabase database
2. **Test Configuration**: Verify the redemption configure page works correctly
3. **Interval Type Integration**: Implement user request for interval redemption to use windows
4. **Monitor Performance**: Ensure the updated function performs efficiently

## Files Modified
- `fix/redemption-configure-column-amount-fix-2025-08-23.sql` - Database migration script
- `fix/redemption-configure-column-fix-README-2025-08-23.md` - This documentation

## Related Components
- EnhancedRedemptionConfigurationDashboard.tsx
- redemption_rules_with_product_details view
- get_redemption_capacity() function
- redemption_requests table
- redemption_rules table

## User Impact
**Before Fix**: 
- Console errors preventing redemption configuration
- Unable to view rule capacity metrics
- Configuration dashboard non-functional

**After Fix**: 
- Full redemption configuration functionality
- Accurate capacity calculations
- Real-time rule management with database persistence
