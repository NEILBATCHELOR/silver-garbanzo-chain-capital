# Permission Checking Fix

## Issue Description
Users were encountering "Permission Denied" errors when trying to generate wallet credentials, even when they had the necessary permissions (including Super Admin status). The console logs showed multiple errors:

```
Error checking permission: {code: 'PGRST116', details: 'The result contains 2 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned'}
```

## Root Cause
The `hasPermission` function in the main `authService.ts` file (in `frontend/src/components/auth/services/authService.ts`) was using a database view query with `.single()` which fails when multiple permission rows are returned for a user.

## Solution
We've completely rewritten the `hasPermission` function with a two-step approach:

1. **First check for Super Admin role**: Query the user's roles and check if any of them is 'Super Admin'. If so, immediately return `true` because Super Admins have all permissions.

2. **Then check specific permissions**: For non-Super Admin users, check if any of their roles have the requested permission by using a subquery instead of a single-row query.

This approach handles multiple roles correctly and eliminates the PGRST116 error that was occurring when a user had multiple permissions for the same permission name.

## Implementation Details
- Replaced the single-row query with array-based queries
- Added special handling for Super Admin roles
- Implemented proper error handling for each query step
- Used subqueries to efficiently check permissions across all user roles

## Verification
The fix should now allow Super Admin users to access all features and properly check permissions for users with multiple roles.

## Why It Works
The root issue was that the database view was returning multiple rows for the same permission when a user had multiple roles. Our fix:

1. Never uses `.single()` which expects exactly one row
2. Properly handles arrays of results
3. Implements role-based Super Admin checking
4. Uses a more efficient permission lookup method with subqueries

This implementation matches the approach used in our backend services.
