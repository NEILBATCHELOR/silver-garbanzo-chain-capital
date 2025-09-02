# Investor User Creation Fix

## Issue Summary

When creating user accounts for investors, foreign key constraint violations occurred between the `users` and `profiles` tables:

```
Error: insert or update on table "profiles" violates foreign key constraint "profiles_id_fkey"
Key (id)=(uuid) is not present in table "users"
```

The root cause was a sequence issue where:
1. The system was attempting to create a profile record
2. But the associated user record was not yet created in the `users` table
3. The operation failed due to a foreign key constraint requiring that `profiles.id` must exist in `users.id`

## Solution Implemented

The fix addresses the sequencing problem by:

1. Ensuring the auth/public user record is created first and fully committed
2. Setting the profile ID explicitly to match the user ID (eliminating foreign key issues)
3. Verifying each creation step and adding fallback creation if any step fails
4. Adding proper user_roles records with the investor role ID
5. Adding better error handling and more detailed logging

## Implementation Details

The fix was implemented in the `InvestorUserService.ts` file, specifically in the `createUserAccountForInvestor` method:

1. For existing users:
   - Now uses the user.id as the profile.id to avoid constraint issues
   - Explicitly creates user_roles records if missing
   - Better handling of partially existing records

2. For new users:
   - Creates the user first and verifies success
   - Creates profile with matching ID if not automatically created
   - Verifies user_roles records exist with correct role ID
   - Updates the investor record only after all other records are confirmed

3. Added robust verification at each step:
   - Checks if profile exists after user creation
   - Creates it explicitly if missing
   - Verifies user_roles record exists
   - Creates it if missing

## Testing Notes

This fix resolves the foreign key constraint errors seen in the console when creating investor users. The solution:

1. Ensures that the user_id, profile_id, and profile_type are correctly added to investor records
2. Guarantees that profile records are created with valid references to user records
3. Ensures user_roles records are created with the investor role ID (dd584338-805e-4bd9-aaa6-43fd2a4fca80)

## Future Improvements

For future consideration:
1. Add transaction support to ensure all operations succeed or fail together
2. Implement a more robust retry mechanism for intermittent failures
3. Consider refactoring the database schema to use UUID references that don't require exact sequence of creation
