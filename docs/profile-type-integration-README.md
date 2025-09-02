# Profile Type Integration for User Management

## Overview
Added comprehensive profile type functionality to the UserManagement system. Users can now be assigned profile types: 'service provider', 'issuer', 'investor', 'super admin' when creating or editing users.

## Changes Made

### 1. Type Definitions Updated
- **File**: `/frontend/src/types/core/database.ts`
  - Added `ProfileType` enum export from Supabase types
- **File**: `/frontend/src/types/domain/user/user.ts`
  - Added `ProfileType` import
  - Updated `UserProfile` interface to include `profile_type?: ProfileType | null`

### 2. Profile Utils Created
- **File**: `/frontend/src/utils/profiles/profileUtils.ts`
  - Created `PROFILE_TYPE_OPTIONS` constant with display labels and descriptions
  - Added `formatProfileTypeForDisplay()` utility function
  - Added `getProfileTypeDescription()` utility function
- **File**: `/frontend/src/utils/profiles/index.ts`
  - Created barrel export for profile utilities

### 3. UI Components Enhanced
- **File**: `/frontend/src/components/UserManagement/users/AddUserModal.tsx`
  - Added profile type selection to form schema
  - Added profile type Select dropdown with options
  - Updated form submission to include `profileType`
  - Updated user object creation to include `profile_type`

- **File**: `/frontend/src/components/UserManagement/users/EditUserModal.tsx`
  - Added profile type to form schema and validation
  - Added profile type Select dropdown for editing
  - Updated form submission and user object updates

- **File**: `/frontend/src/components/UserManagement/users/UserTable.tsx`
  - Added Profile Type column header
  - Added profile type display cell using `formatProfileTypeForDisplay()`
  - Updated column spans for empty states (6 → 7)

### 4. Service Layer Updates
- **File**: `/frontend/src/services/auth/authService.ts`
  - Updated `CreateUserData` interface to include `profileType?: string`
  - Updated `UpdateUserData` interface to support nested `data` object with `profileType`
  - Enhanced `createUser()` to create profile with profile_type
  - Enhanced `updateUser()` to handle profile_type updates (create/update profiles table)
  - Modified `getUserById()` to fetch and include profile data with profile_type
  - Updated `getAllUsers()` to fetch profile data and include profile_type

## Database Interaction
- Creates profile entries in `public.profiles` table with correct profile_type
- Handles profile updates through upsert operations
- Maintains relationship between `users` and `profiles` tables via foreign keys

## Key Features
- **Optional Field**: Profile type is optional during user creation/editing
- **Display Integration**: Profile type shown in user table with proper formatting
- **Data Integrity**: Proper handling of null/undefined profile types
- **Validation**: Form validation ensures proper data structure
- **Error Handling**: Graceful handling of profile creation/update errors

## Files Modified Summary
1. `types/core/database.ts` - Added ProfileType enum export
2. `types/domain/user/user.ts` - Updated UserProfile interface
3. `utils/profiles/profileUtils.ts` - New profile utilities
4. `utils/profiles/index.ts` - New barrel export
5. `components/UserManagement/users/AddUserModal.tsx` - Added profile type selection
6. `components/UserManagement/users/EditUserModal.tsx` - Added profile type editing
7. `components/UserManagement/users/UserTable.tsx` - Added profile type display
8. `services/auth/authService.ts` - Enhanced with profile type handling

## Next Steps
- Test user creation and editing workflows
- Verify profile type display in user table
- Test profile type updates for existing users
- Consider adding profile type filtering/search capabilities
