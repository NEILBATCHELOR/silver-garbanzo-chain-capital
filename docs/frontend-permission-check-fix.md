# Frontend Permission Check Fix

## Issue Description
Users were encountering "Permission Denied" errors when trying to generate wallet credentials, even when they had the necessary permissions (including Super Admin status). The console logs showed multiple errors:

```
Error checking permission: {code: 'PGRST116', details: 'The result contains 2 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned'}
```

## Root Cause
The `hasPermission` function in `authService.ts` was using a PostgreSQL RPC function call (`check_user_permission`) that was failing when users had multiple roles assigned. The function was:

1. Not handling multiple role assignments correctly
2. Using a Supabase RPC call that expected a single result row but received multiple rows

## Solution: Frontend Implementation
Instead of relying on a potentially problematic database function, we've implemented the permission check directly in the frontend code with a more robust approach:

1. First, we explicitly check if the user has a Super Admin role by querying the `user_roles` table joined with `roles`
2. If the user is a Super Admin, we immediately return `true` (all permissions granted)
3. Otherwise, we query the `role_permissions` table to check if any of the user's roles have the requested permission
4. We use a subquery to get all role IDs for the user, making the implementation more efficient

This approach:
- Eliminates the dependency on the PostgreSQL function that was failing
- Properly handles users with multiple roles
- Provides better error handling with specific error messages
- Is more maintainable as the logic is in the TypeScript code rather than hidden in a database function

## Implementation Details
The updated code in `authService.ts` uses two separate Supabase queries:

1. First query checks if the user has a Super Admin role
2. Second query uses a subquery to check if any of the user's roles have the specific permission

Both queries use the `executeWithRetry` helper function to improve reliability and handle temporary connection issues.

## Advantages Over Database Function
1. Better error handling - specific error messages for each step
2. Improved debugging capabilities
3. More resilient to changes in the database schema
4. No need to modify the database when permission logic changes
5. Easier to maintain as part of the frontend codebase

## Verification Steps
1. Verify that Super Admin users can access all features
2. Verify that users with specific permissions can access appropriate features
3. Verify that users with multiple roles have the combined permissions of all their roles
