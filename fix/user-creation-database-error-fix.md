# User Creation Database Error Fix

## Problem Summary
Users cannot be created in the application due to an "AuthApiError: Database error creating new user" which occurs during the auth user creation process.

## Root Cause Analysis

**Database Trigger Constraint Violation:**
1. When creating an auth user, the `on_auth_user_created` trigger fires
2. This trigger calls `handle_new_auth_user()` function
3. The function tries to insert into `public.profiles` table with `user_id = NEW.id`
4. The `profiles.user_id` has a foreign key constraint to `public.users.id`
5. The `public.users` record hasn't been created yet when the trigger fires
6. This causes the foreign key constraint to fail, rolling back the entire auth user creation

## Error Location Stack Trace
- `AddInvestorUserModal.tsx:49` → calls `investorUserService.createUserAccountForInvestor()`
- `InvestorUserService.ts:343` → calls `authService.createUser()`
- `authService.ts:181` → calls `enhancedUserService.createUser()`
- `enhanced-user-service.ts:142` → calls `serviceRoleClient.createAuthUser()` **← ERROR OCCURS HERE**

## Database Schema Issue

**Problematic Trigger Function:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.id  -- ← This FK constraint fails because public.users doesn't exist yet
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Foreign Key Constraint:**
```sql
-- profiles.user_id → public.users.id
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id);
```

## Solutions Implemented

### 1. Application-Level Fix (TEMPORARY)
**Location:** `enhanced-user-service.ts`
- Catch the database constraint violation error
- Provide clear error message explaining the issue
- Direct administrator to apply the database fix

### 2. Database-Level Fix (PERMANENT)
**Location:** `/fix/user-creation-trigger-fix.sql`

**Recommended Solution:** Modify the trigger function to check if `public.users` exists before creating profile:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the public.users record exists before creating profile
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    -- Insert into profiles table only if public.users exists
    INSERT INTO public.profiles (id, user_id, created_at, updated_at)
    VALUES (
      gen_random_uuid(), -- Generate unique profile ID
      NEW.id,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
```

## How to Apply the Fix

### Step 1: Apply Database Fix (REQUIRED)
1. Connect to your Supabase database as an admin
2. Execute the SQL from `/fix/user-creation-trigger-fix.sql`
3. The recommended approach is to modify the trigger function (Solution 1 in the file)

### Step 2: Test User Creation
1. Try creating a new investor user through the application
2. The error should no longer occur
3. Verify that profiles are still created properly

### Step 3: Monitor and Verify
1. Check that existing functionality still works
2. Verify that profiles are created when users are created
3. Test both automatic and manual user creation flows

## Alternative Solutions (if needed)

### Option B: Deferrable Constraint
Make the FK constraint deferrable to delay validation:
```sql
ALTER TABLE public.profiles 
DROP CONSTRAINT profiles_user_id_fkey;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) 
DEFERRABLE INITIALLY DEFERRED;
```

### Option C: Disable Trigger
Disable the trigger entirely and handle profile creation in application code:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

## Files Modified
- `enhanced-user-service.ts` - Added error handling and clear error message
- `/fix/user-creation-trigger-fix.sql` - Database fix solutions
- `/fix/user-creation-database-error-fix.md` - This documentation

## Status
- **Issue Identified:** ✅ Complete
- **Root Cause Found:** ✅ Complete  
- **Application Fix Applied:** ✅ Complete (temporary)
- **Database Fix Created:** ✅ Complete
- **Database Fix Applied:** ❌ **REQUIRED** - Administrator must apply SQL fix
- **Testing:** ❌ Pending database fix application

## Next Steps
1. **IMMEDIATE:** Administrator must apply the SQL fix to resolve the user creation error
2. **VERIFY:** Test user creation after applying the database fix
3. **DOCUMENT:** Update any deployment/migration scripts to include this fix
