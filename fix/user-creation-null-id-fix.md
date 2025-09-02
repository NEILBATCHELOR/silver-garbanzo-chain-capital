# User Creation Null ID Error Fix

## Problem Description

**Error:** `null value in column "id" of relation "users" violates not-null constraint`

**Occurrence:** When creating user accounts through the AddInvestorUserModal interface.

**Call Chain:**
1. AddInvestorUserModal.tsx
2. InvestorUserService.createUserAccountForInvestor()
3. authService.createUser()
4. enhancedUserService.createUser()

## Root Cause

Variable shadowing bug in `enhanced-user-service.ts`:

```typescript
// Outer scope
let authUserId: string | null = null;

// ... later in code ...

// Inner scope - shadows outer variable!
let authUserId: string;

try {
  // ... auth user creation ...
  authUserId = authResponse.user.id; // Sets INNER variable only
} catch (error) {
  // ...
}

// Later when creating public.users record:
// The OUTER authUserId is still null!
const { error: userError } = await serviceRoleClient.database
  .from("users")
  .insert({
    id: authUserId!, // This is null!
    // ...
  });
```

## Database Schema Context

The `users` table schema shows:
- `id` column: UUID type, NOT NULL, no default value
- Application must provide UUID when inserting
- Supabase auth system generates UUIDs automatically for auth users

## Solution

Fixed variable shadowing by removing the redundant inner declaration:

```typescript
// Before (BROKEN):
let authUserId: string | null = null;
// ...
let authUserId: string; // Shadows outer variable
authUserId = authResponse.user.id; // Sets inner variable only

// After (FIXED):
let authUserId: string | null = null;
// ...
// Removed redundant declaration
authUserId = authResponse.user.id; // Now correctly sets outer variable
```

## Files Modified

- `/frontend/src/services/auth/enhanced-user-service.ts`
  - Removed redundant `let authUserId: string;` declaration on line 139
  - Added comment clarifying assignment to outer scope variable

## Testing

After fix:
1. User creation through AddInvestorUserModal should work without null constraint violations
2. The auth user ID should properly propagate to the public.users table insert
3. No TypeScript compilation errors should remain

## Prevention

To prevent similar issues:
1. Use ESLint rule `no-shadow` to catch variable shadowing
2. Use `const` instead of `let` when possible to prevent reassignment bugs
3. Keep variable scopes minimal and clearly named

## Related

This fix resolves the database constraint error allowing proper user account creation for investors through the UI.
