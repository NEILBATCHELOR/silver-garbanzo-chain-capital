# Profiles Table Fix Documentation

## Overview
This script fixes the SQL setup for the Chain Capital profiles system, creating proper synchronization between Supabase's `auth.users`, the application's `public.users`, and a new `profiles` table.

## Key Fixes Applied

### 1. Database Structure Issues
- **Added `auth_id` column** to `public.users` to establish connection with `auth.users`
- **Created unique index** on `auth_id` to prevent duplicate connections
- **Fixed foreign key relationships** between all three tables

### 2. Profiles Table Creation
- **Used existing `profile_type` ENUM** (service provider, issuer, investor, super admin)
- **Proper primary key** referencing `auth.users(id)`
- **Foreign key to `public.users`** for application-specific data
- **Timestamp tracking** with auto-updating `updated_at`

### 3. Row Level Security (RLS)
- **Fixed RLS policies** - removed invalid `OLD.profile_type` reference
- **Separate policies** for SELECT, UPDATE, and INSERT operations
- **Proper authentication checks** using `auth.uid()`

### 4. Trigger Functions
- **Simplified trigger logic** - removed complex nested operations
- **Auto-create profiles** for new auth users
- **Sync public.users** with profiles when `auth_id` is set
- **Auto-update timestamps** on profile changes

### 5. Administrative Functions
- **`admin_set_profile_type()`** - secure function for setting user profile types
- **`get_user_profile()`** - unified function to fetch complete user data
- **Proper security** - restricted to service role only

### 6. Migration Handling
- **Backfill existing users** - creates profiles for all existing auth users
- **Smart email matching** - connects existing users by email address
- **Sync existing connections** - updates profile.user_id where possible

## Usage Examples

### Set a user's profile type (service role only):
```sql
SELECT public.admin_set_profile_type(
  '00000000-0000-0000-0000-000000000000'::UUID, 
  'investor'::public.profile_type
);
```

### Get complete user profile:
```sql
SELECT * FROM public.get_user_profile(auth.uid());
```

### Update profile information (user can update their own):
```sql
UPDATE public.profiles 
SET first_name = 'John', last_name = 'Doe'
WHERE id = auth.uid();
```

## Table Relationships

```
auth.users (Supabase auth)
    ↓ (id)
public.profiles (profile management)
    ↓ (user_id)
public.users (application data)
```

## Security Model
- **Users can only view/edit their own profiles**
- **Profile type changes require admin privileges**
- **All functions use SECURITY DEFINER for controlled access**
- **RLS policies enforce user isolation**

## Performance Optimizations
- **Indexed auth_id** for fast lookups
- **Indexed profile_type** for role-based queries
- **Unique constraints** prevent duplicate relationships

## Files Created
- `/scripts/fix-profiles-table.sql` - Complete migration script

## Next Steps
1. **Run the migration script** in your Supabase database
2. **Update frontend code** to use the new profiles table
3. **Test RLS policies** with different user types
4. **Implement profile type management** in admin interface

## Troubleshooting
- If migration fails, check existing data conflicts
- Verify auth.users has expected data before running
- Test trigger functions with sample data first
- Check RLS policies with different authenticated users
