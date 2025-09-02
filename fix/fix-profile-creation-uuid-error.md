# Fix: Profile Creation UUID Error

## Problem
Database error when creating new users:
```
null value in column "id" of relation "profiles" violates not-null constraint
```

## Root Cause
- The `handle_new_auth_user()` trigger function runs when users are created in `auth.users`
- It tries to insert `NEW.id` into `public.profiles.id` but receives null value
- The `profiles` table requires a UUID for `id` field with no default value

## Solution Applied
Updated the trigger function to:
1. Use `COALESCE(NEW.id, gen_random_uuid())` to ensure a valid UUID
2. Set both `id` and `user_id` fields properly
3. Maintain `ON CONFLICT (id) DO NOTHING` for safety

## Files Changed
- `/scripts/fix_profile_creation_uuid.sql` - SQL migration script

## Verification Steps
1. Apply the SQL migration to Supabase
2. Test user creation from AddUserModal.tsx
3. Verify profile records are created with proper UUIDs
4. Check that `user_id` field is populated correctly

## Related Files
- `frontend/src/components/auth/services/authService.ts` (line 237)
- Database trigger: `handle_new_auth_user()` on `auth.users`
- Table: `public.profiles`
