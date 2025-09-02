# Profile Type Authentication Implementation

## Overview

This document outlines the implementation of profile type selection integration with the authentication process in Chain Capital. The feature connects the WelcomeScreen profile type selection with the actual login and registration flows.

## Problem Statement

**Before**: Users selected their profile type on the WelcomeScreen but this selection was not applied during authentication, leading to:
- Users having incorrect permissions after login
- Profile type selection being ignored during registration
- Disconnected user experience between profile selection and account setup

## Solution Implemented

### 1. Enhanced Authentication Types

**File**: `/frontend/src/components/auth/types/authTypes.ts`

Added `profileType` parameter to authentication credential interfaces:

```typescript
export interface SignUpCredentials {
  email: string;
  password: string;
  profileType?: string; // Added profile_type support
  options?: {
    data?: Record<string, any>;
    emailRedirectTo?: string;
  };
}

export interface SignInCredentials {
  email: string;
  password: string;
  profileType?: string; // Added profile_type support
}
```

### 2. Profile Type to Role Mapping

**File**: `/frontend/src/components/auth/services/authService.ts`

Implemented automatic role assignment based on profile type:

```typescript
private getDefaultRoleForProfileType(profileType: string): string {
  const profileTypeRoleMap: Record<string, string> = {
    'issuer': 'Issuer',
    'investor': 'Investor', 
    'service provider': 'Service Provider',
    'super admin': 'Super Admin'
  };
  
  return profileTypeRoleMap[profileType] || 'Viewer';
}
```

### 3. Enhanced AuthService Methods

#### Sign Up Process
- Stores profile type in user metadata during registration
- Automatically assigns appropriate role based on profile type
- Uses role utility functions for database operations

#### Sign In Process  
- Optionally validates profile type against stored user metadata
- Logs mismatches but doesn't fail authentication

### 4. Updated Authentication Components

#### LoginForm Component
**File**: `/frontend/src/components/auth/components/LoginForm.tsx`

- Retrieves selected profile type from sessionStorage
- Passes profile type to signIn method
- Clears sessionStorage after successful login

#### SignupForm Component
**File**: `/frontend/src/components/auth/components/SignupForm.tsx`

- Retrieves selected profile type from sessionStorage
- Includes profile type in user metadata during registration
- Clears sessionStorage after successful signup

### 5. AuthProvider Integration

**File**: `/frontend/src/infrastructure/auth/AuthProvider.tsx`

- Updated signIn method signature to accept optional profileType
- Passes profile type through to AuthService

## Database Integration

### Profile Type Storage
Profile types are stored in two locations:
1. **User Metadata**: `raw_user_meta_data.profileType` in auth.users table
2. **Role Assignment**: Automatically assigned to user_roles table

### Role Mapping
| Profile Type | Default Role | Priority | Permissions |
|--------------|--------------|----------|-------------|
| issuer | Issuer | 100 | Issuer default permissions |
| investor | Investor | 90 | Investor default permissions |
| service provider | Service Provider | 80 | Service Provider default permissions |
| super admin | Super Admin | 100 | Full system access |

## Implementation Flow

### Registration Flow
1. User selects profile type on WelcomeScreen → `sessionStorage.setItem('selectedProfileType', profileType)`
2. User fills registration form → Profile type retrieved from sessionStorage
3. SignupForm calls signUp with profile type → Profile type stored in user metadata
4. AuthService assigns default role → User gets appropriate permissions
5. SessionStorage cleared → Clean state for next session

### Login Flow
1. User selects profile type on WelcomeScreen → `sessionStorage.setItem('selectedProfileType', profileType)`
2. User enters credentials → Profile type retrieved from sessionStorage
3. LoginForm calls signIn with profile type → Optional validation against stored metadata
4. SessionStorage cleared → Clean state for next session

## Files Modified

### Core Authentication
- `/frontend/src/components/auth/types/authTypes.ts` - Added profile type to credential interfaces
- `/frontend/src/components/auth/services/authService.ts` - Enhanced with role mapping and assignment
- `/frontend/src/infrastructure/auth/AuthProvider.tsx` - Updated to pass profile type
- `/frontend/src/components/auth/hooks/useAuth.ts` - Updated signIn hook to handle profile type

### UI Components
- `/frontend/src/components/auth/components/LoginForm.tsx` - Retrieve and use profile type
- `/frontend/src/components/auth/components/SignupForm.tsx` - Retrieve and use profile type

### Existing (Unchanged)
- `/frontend/src/components/auth/pages/WelcomeScreen.tsx` - Already stores profile type in sessionStorage

## Benefits

### ✅ User Experience
- Seamless profile type selection to authentication flow
- Automatic role assignment reduces manual admin work
- Clear separation of concerns between profile types

### ✅ Security
- Profile type validation during login
- Automatic role-based access control
- Proper database-backed permission system

### ✅ Maintainability
- Clear mapping between profile types and roles
- Centralized role assignment logic
- Type-safe implementation with TypeScript

## Testing Recommendations

1. **Profile Type Flow Testing**
   - Test each profile type selection → registration → role assignment
   - Verify sessionStorage is properly cleared after authentication
   - Test profile type validation during login

2. **Role Assignment Testing**
   - Verify correct roles are assigned for each profile type
   - Test database constraints and foreign key relationships
   - Validate permissions are correctly inherited

3. **Edge Case Testing**
   - Test authentication without profile type selection
   - Test profile type mismatch scenarios
   - Test role assignment failures and fallback behavior

## Future Enhancements

1. **Dynamic Role Mapping**: Allow administrators to configure profile type → role mapping
2. **Multi-Role Support**: Support assigning multiple roles based on profile type
3. **Profile Type Migration**: Allow users to change their profile type post-registration
4. **Enhanced Validation**: Add stricter profile type validation during authentication

## Impact

This implementation successfully bridges the gap between profile type selection and authentication, ensuring that user permissions are correctly set from the moment of account creation based on their selected profile type.
