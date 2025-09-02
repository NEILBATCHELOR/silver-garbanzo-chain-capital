# Chain Capital Auth System Testing Plan

## Overview
This document outlines the comprehensive testing plan for the Chain Capital authentication system. The auth system is 95% implemented with full Supabase integration and needs systematic testing to verify all features work correctly.

## Development Environment Status
- **Server Status**: ✅ Running on http://localhost:5173/
- **Compilation**: ✅ No TypeScript errors
- **Database**: ✅ Connected to Supabase with 8 existing users
- **Environment**: ✅ All variables configured

## Testing Priority Order

### Phase 1: Basic Authentication Flow (HIGH PRIORITY)
Test the fundamental login/logout functionality that most users will use.

**Tests to Complete:**
1. **Email/Password Login**
   - Navigate to http://localhost:5173/auth/login
   - Test with confirmed user: `neil.batchelor@btinternet.com`
   - Test with unconfirmed user
   - Test with invalid credentials
   - Verify redirect to dashboard after successful login

2. **User Registration**
   - Navigate to http://localhost:5173/auth/signup
   - Create new user account
   - Verify email confirmation process
   - Test validation errors

3. **Password Reset**
   - Navigate to http://localhost:5173/auth/reset-password
   - Request password reset
   - Verify email received
   - Complete password update

4. **Session Management**
   - Verify auto-refresh functionality
   - Test session expiry handling
   - Test logout functionality

### Phase 2: Multi-Factor Authentication (HIGH PRIORITY)
Test TOTP authenticator app integration.

**Tests to Complete:**
1. **TOTP Setup/Enrollment**
   - Navigate to http://localhost:5173/auth/setup-totp
   - Generate QR code
   - Scan with authenticator app (Google Authenticator, Authy)
   - Verify TOTP code
   - Complete enrollment

2. **MFA Login Flow**
   - Login with email/password for MFA-enabled user
   - Enter TOTP code when prompted
   - Verify successful authentication

3. **MFA Management**
   - Navigate to http://localhost:5173/settings/security
   - View existing TOTP factors
   - Remove TOTP factor
   - Add additional TOTP factor

### Phase 3: Alternative Authentication Methods (MEDIUM PRIORITY)
Test passwordless and social authentication.

**Tests to Complete:**
1. **Magic Link Authentication**
   - Navigate to http://localhost:5173/auth/magic-link
   - Enter email address
   - Check email for magic link
   - Click link and verify authentication

2. **Phone/SMS Authentication**
   - Navigate to http://localhost:5173/auth/phone
   - Enter phone number
   - Receive SMS code
   - Enter code and verify authentication

3. **OAuth Social Login**
   - Navigate to http://localhost:5173/auth/oauth
   - Test Google OAuth
   - Test GitHub OAuth
   - Verify account linking

4. **Anonymous/Guest Access**
   - Navigate to http://localhost:5173/auth/anonymous
   - Test guest login functionality
   - Verify limited access

### Phase 4: Identity Management (MEDIUM PRIORITY)
Test account linking and identity management.

**Tests to Complete:**
1. **Identity Linking**
   - Navigate to http://localhost:5173/settings/identity
   - Link Google account to existing user
   - Link GitHub account to existing user
   - Test login with linked accounts

2. **Identity Unlinking**
   - Unlink OAuth accounts
   - Verify account still accessible via email/password

### Phase 5: Admin Functionality (LOW PRIORITY)
Test user management capabilities.

**Tests to Complete:**
1. **Admin Dashboard**
   - Navigate to http://localhost:5173/admin/auth
   - View user list
   - Search and filter users
   - View user details

2. **User Management**
   - Create new user (admin)
   - Update user information
   - Ban/unban users
   - Delete users

## Testing Procedures

### Pre-Testing Setup
1. **Environment Check**
   ```bash
   cd "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress"
   npm run dev
   # Verify server starts on http://localhost:5173/
   ```

2. **Database Verification**
   ```sql
   -- Check existing users
   SELECT id, email, email_confirmed_at, last_sign_in_at FROM auth.users;
   
   -- Check user roles
   SELECT u.email, r.name as role FROM users u 
   JOIN user_roles ur ON u.id = ur.user_id 
   JOIN roles r ON ur.role_id = r.id;
   ```

### Testing Documentation Template

For each test, document:
- **Test Date**: 
- **Tester**: 
- **Test Case**: 
- **Expected Result**: 
- **Actual Result**: 
- **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial
- **Notes**: 
- **Screenshots**: (if applicable)

### Test Data

**Confirmed Test User:**
- Email: `neil.batchelor@btinternet.com`
- Status: Email confirmed, has recent sign-in

**Unconfirmed Test Users:**
- `neil@chaincapital.xyz`
- `neil@guardianlabs.org`
- `test@fmi.com`

### Expected Behaviors

**Successful Login:**
- Redirects to `/dashboard`
- User session established
- Navigation shows authenticated state

**Failed Login:**
- Error message displayed
- User remains on login page
- Error state cleared on retry

**MFA Flow:**
- After email/password, prompted for TOTP
- Invalid codes show error
- Valid codes complete authentication

**Session Expiry:**
- Auto-refresh before expiry
- Graceful logout on expired session
- Redirect to login page

## Error Scenarios to Test

### Authentication Errors
1. **Invalid Credentials**
   - Wrong password
   - Non-existent email
   - Blocked/banned user

2. **Email Verification**
   - Unconfirmed email login attempt
   - Expired verification link
   - Already verified email

3. **MFA Errors**
   - Invalid TOTP code
   - Expired challenge
   - No MFA setup

4. **Rate Limiting**
   - Too many failed attempts
   - Too many verification requests

## Test Results Tracking

### Basic Auth Tests
- [ ] Email/Password Login - Confirmed User
- [ ] Email/Password Login - Unconfirmed User  
- [ ] Email/Password Login - Invalid Credentials
- [ ] User Registration - New Account
- [ ] User Registration - Duplicate Email
- [ ] Password Reset - Valid Email
- [ ] Password Reset - Invalid Email
- [ ] Logout Functionality
- [ ] Session Auto-Refresh

### MFA Tests
- [ ] TOTP Enrollment - QR Code Generation
- [ ] TOTP Enrollment - Code Verification
- [ ] MFA Login - TOTP Challenge
- [ ] MFA Login - Invalid Code
- [ ] TOTP Factor Management
- [ ] Multiple TOTP Factors

### Alternative Auth Tests
- [ ] Magic Link - Send Email
- [ ] Magic Link - Click Link
- [ ] Phone OTP - Send SMS
- [ ] Phone OTP - Verify Code
- [ ] OAuth Google - Authorization
- [ ] OAuth GitHub - Authorization
- [ ] Anonymous Login

### Identity Management Tests
- [ ] Link Google Account
- [ ] Link GitHub Account
- [ ] Unlink Account
- [ ] Multiple Identity Login

### Admin Tests
- [ ] User List View
- [ ] User Search/Filter
- [ ] Create User (Admin)
- [ ] Update User Details
- [ ] Ban/Unban User

## Known Issues to Investigate

1. **Email Confirmation**: Many test users have `email_confirmed_at: null`
2. **Last Sign-in**: Most users have `last_sign_in_at: null`
3. **OAuth Configuration**: Need to verify OAuth providers are configured in Supabase
4. **SMS Provider**: Need to verify SMS/phone authentication is configured

## Next Steps

1. **Start with Phase 1**: Test basic email/password authentication
2. **Document Results**: Record all test outcomes
3. **Fix Issues**: Address any failing tests
4. **Move to Phase 2**: Test MFA functionality
5. **Complete Testing**: Work through all phases systematically

## Success Criteria

The auth system will be considered fully functional when:
- ✅ Basic login/logout works for confirmed users
- ✅ User registration and email verification works
- ✅ Password reset functionality works
- ✅ TOTP enrollment and verification works
- ✅ Session management (auto-refresh, expiry) works
- ✅ At least one OAuth provider works
- ✅ Protected routes properly restrict access
- ✅ Admin user management works

---

**Created**: July 20, 2025
**Status**: Ready for Testing
**Priority**: HIGH - Required for production readiness
