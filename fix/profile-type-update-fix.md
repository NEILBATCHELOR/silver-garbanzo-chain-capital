# Profile Type Update Fix

## Issue
Users in Role Management were not updating the `profile_type` field when editing user information. The profile_type changes were being ignored and not saved to the database.

## Root Cause
**Wrong AuthService Import**: The `EditUserModal` component was importing from the incorrect authService:

### ❌ Wrong Import (Used Before Fix)
```typescript
import { authService, UserStatus } from "@/components/auth/services/authService";
```

**Problem**: This service only updates Supabase Auth user metadata (`auth.users`) and **never touches the database tables**:
- ❌ Does not update `profiles` table 
- ❌ Does not update `profile_type` column
- ❌ Does not update `user_roles` table
- ❌ Does not update `users` table status

### ✅ Correct Import (Fixed)
```typescript
import { authService, UserStatus } from "@/services/auth/authService";
```

**Solution**: This service properly updates all database tables:
- ✅ Updates `users` table (name, email, status)
- ✅ Updates `user_roles` table (role assignments)  
- ✅ Updates `profiles` table (profile_type field)
- ✅ Handles profile creation if not exists

## Technical Details

### Wrong AuthService Method (components/auth/services)
```typescript
async updateUser(userId: string, attributes: {
  email?: string;
  password?: string;
  data?: Record<string, any>;
  status?: string;
}): Promise<AuthResponse<AuthUser>> {
  // Only calls supabase.auth.updateUser(attributes)
  // Ignores userId parameter entirely
  // Never touches database tables
  const { data, error } = await supabase.auth.updateUser(attributes);
  // ...
}
```

### Correct AuthService Method (services/auth)
```typescript
async updateUser(userId: string, userData: UpdateUserData): Promise<User | null> {
  // 1. Update user profile in public.users
  // 2. Update user role if provided  
  // 3. Update profile_type if provided
  
  if (userData.data?.profileType !== undefined) {
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (existingProfile) {
      // Update existing profile
      await supabase
        .from("profiles")
        .update({
          profile_type: userData.data.profileType || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);
    } else if (userData.data.profileType) {
      // Create new profile if needed
      await supabase
        .from("profiles")
        .insert({
          id: userId,
          user_id: userId,
          profile_type: userData.data.profileType,
        });
    }
  }
  // ...
}
```

## Database Verification
Confirmed database structure is correct and profile_type values exist:

```sql
SELECT u.email, u.name, p.profile_type, r.name as role_name
FROM users u
LEFT JOIN profiles p ON u.id = p.user_id  
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id;
```

Results show existing profile_type values like "super admin", "issuer", etc.

## Files Modified
- `/frontend/src/components/UserManagement/users/EditUserModal.tsx`
  - ❌ **Before**: `import { authService } from "@/components/auth/services/authService"`
  - ✅ **After**: `import { authService } from "@/services/auth/authService"`

## Impact
- ✅ **Profile Type Updates**: Now properly saves profile_type to database
- ✅ **Role Updates**: Properly updates user role assignments  
- ✅ **Status Updates**: Correctly updates user status in database
- ✅ **Name/Email Updates**: Properly updates user profile information
- ✅ **Data Consistency**: All changes now persist correctly

## Testing
To verify the fix:
1. Open Role Management → Users
2. Edit a user and change their Profile Type
3. Save changes
4. Refresh the page
5. ✅ Profile Type should persist correctly

## Prevention
- Add ESLint rule to prevent importing from wrong auth services
- Consider consolidating auth services to avoid confusion
- Add integration tests for user update functionality

## Status
✅ **COMPLETED** - Profile type updates now work correctly in Role Management
