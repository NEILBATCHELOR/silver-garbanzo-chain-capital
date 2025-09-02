# Investor User Creation Fix

## Issue
When creating user accounts for investors, the application would encounter a "Database error creating new user" error, specifically when an investor's email address already existed in the auth.users table. The error occurred due to a unique constraint on the email field in the users table.

## Root Cause
1. The `InvestorUserService.createUserAccountForInvestor` method was attempting to create a new auth user without first checking if a user with that email already existed
2. The Supabase auth system has a unique constraint on email addresses, which prevents creating duplicate users
3. The error handling was not specific enough to provide meaningful feedback to the user

## Solution
The fix implements the following changes:

1. **InvestorUserService.ts** - Added a check for existing users before attempting to create a new one:
   - Queries the users table for existing accounts with the same email
   - If a user exists, uses that user instead of creating a new one
   - Creates a profile for the existing user if one doesn't exist
   - Links the existing user to the investor record

2. **AddInvestorUserModal.tsx** - Improved error handling:
   - Added specific handling for duplicate email errors
   - Provides clear user feedback in the UI
   - Updates success message to indicate account was created or linked

3. **service-role-client.ts** - Enhanced error messages:
   - Added specific error handling for duplicate email addresses
   - Provides more descriptive error messages

4. **enhanced-user-service.ts** - Added pre-check for existing users:
   - Checks for existing users before attempting to create auth users
   - Provides clearer error messages for duplicate emails

## Testing
To test this fix:
1. Try to create a user account for an investor using an email that already exists in the system
2. Verify that the investor record is properly linked to the existing user
3. Try to create a user account with a new email address
4. Verify that a new user is created and linked to the investor

## Related Files
- `/frontend/src/components/UserManagement/investors/services/InvestorUserService.ts`
- `/frontend/src/components/UserManagement/investors/AddInvestorUserModal.tsx`
- `/frontend/src/infrastructure/database/service-role/service-role-client.ts`
- `/frontend/src/services/auth/enhanced-user-service.ts`
