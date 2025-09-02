# Auth System Manual Testing Checklist

## Pre-Testing Setup
- [ ] Development server running (`npm run dev`)
- [ ] Can access http://localhost:5173/
- [ ] Browser console open for monitoring
- [ ] Network tab open to observe API calls

## Phase 1: Basic Authentication

### Email/Password Login Tests
**Test 1.1: Successful Login (Confirmed User)**
- [ ] Navigate to http://localhost:5173/auth/login
- [ ] Enter email: `neil.batchelor@btinternet.com` 
- [ ] Enter any password (will test if user exists)
- [ ] Click "Sign In"
- [ ] **Expected**: Successful login OR password error (both indicate auth flow working)
- [ ] **Expected**: Redirect to `/dashboard` on success
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

**Test 1.2: Login with Unconfirmed Email**
- [ ] Navigate to http://localhost:5173/auth/login
- [ ] Enter email: `test@fmi.com`
- [ ] Enter password: `password123`
- [ ] Click "Sign In"
- [ ] **Expected**: Error about email confirmation needed
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

**Test 1.3: Invalid Credentials**
- [ ] Navigate to http://localhost:5173/auth/login
- [ ] Enter email: `invalid@example.com`
- [ ] Enter password: `wrongpassword`
- [ ] Click "Sign In"
- [ ] **Expected**: "Invalid email or password" error
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

### User Registration Tests
**Test 1.4: New User Registration**
- [ ] Navigate to http://localhost:5173/auth/signup
- [ ] Enter email: `test-$(date +%s)@chaincapital.test`
- [ ] Enter password: `TestPassword123!`
- [ ] Confirm password: `TestPassword123!`
- [ ] Click "Sign Up"
- [ ] **Expected**: Success message, email verification prompt
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

**Test 1.5: Duplicate Email Registration**
- [ ] Navigate to http://localhost:5173/auth/signup
- [ ] Enter email: `neil.batchelor@btinternet.com`
- [ ] Enter password: `TestPassword123!`
- [ ] Click "Sign Up"
- [ ] **Expected**: Error about existing user
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

### Password Reset Tests
**Test 1.6: Password Reset Request**
- [ ] Navigate to http://localhost:5173/auth/reset-password
- [ ] Enter email: `neil.batchelor@btinternet.com`
- [ ] Click "Send Reset Link"
- [ ] **Expected**: Success message about email sent
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

### Logout Tests
**Test 1.7: Logout Functionality**
- [ ] If logged in, click logout button
- [ ] **Expected**: Redirect to login page, session cleared
- [ ] **Expected**: Can't access protected routes
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

## Phase 2: Multi-Factor Authentication

### TOTP Setup Tests
**Test 2.1: TOTP Enrollment**
- [ ] Login to app first
- [ ] Navigate to http://localhost:5173/auth/setup-totp
- [ ] Click "Set up TOTP"
- [ ] **Expected**: QR code displayed
- [ ] **Expected**: Manual entry secret shown
- [ ] Scan QR code with authenticator app
- [ ] Enter 6-digit code from app
- [ ] Click "Verify"
- [ ] **Expected**: TOTP successfully enrolled
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

### MFA Login Tests
**Test 2.2: MFA Challenge Flow**
- [ ] Logout completely
- [ ] Login with email/password for MFA-enabled user
- [ ] **Expected**: TOTP code prompt appears
- [ ] Enter 6-digit code from authenticator app
- [ ] Click "Verify"
- [ ] **Expected**: Successful login to dashboard
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

**Test 2.3: Invalid MFA Code**
- [ ] During MFA challenge, enter invalid code: `123456`
- [ ] Click "Verify"
- [ ] **Expected**: Error message about invalid code
- [ ] **Expected**: Ability to retry
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

### MFA Management Tests
**Test 2.4: View MFA Factors**
- [ ] Navigate to http://localhost:5173/settings/security
- [ ] **Expected**: List of enrolled TOTP factors
- [ ] **Expected**: Options to add/remove factors
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

## Phase 3: Alternative Authentication

### Magic Link Tests
**Test 3.1: Magic Link Authentication**
- [ ] Navigate to http://localhost:5173/auth/magic-link
- [ ] Enter email: `neil.batchelor@btinternet.com`
- [ ] Click "Send Magic Link"
- [ ] **Expected**: Success message
- [ ] Check email for magic link
- [ ] Click magic link
- [ ] **Expected**: Automatic login
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

### Phone/SMS Tests
**Test 3.2: Phone OTP Authentication**
- [ ] Navigate to http://localhost:5173/auth/phone
- [ ] Enter phone number: `+1234567890`
- [ ] Click "Send Code"
- [ ] **Expected**: Success message OR SMS provider error
- [ ] **Note**: SMS may not be configured
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

### OAuth Tests
**Test 3.3: OAuth Google Login**
- [ ] Navigate to http://localhost:5173/auth/oauth
- [ ] Click "Continue with Google"
- [ ] **Expected**: Redirect to Google OAuth OR configuration error
- [ ] **Note**: OAuth providers may need configuration
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

### Anonymous Access Tests
**Test 3.4: Guest/Anonymous Login**
- [ ] Navigate to http://localhost:5173/auth/anonymous
- [ ] Click "Continue as Guest"
- [ ] **Expected**: Limited access to app features
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

## Phase 4: Session Management

### Session Persistence Tests
**Test 4.1: Session Persistence**
- [ ] Login to application
- [ ] Refresh browser page
- [ ] **Expected**: Remain logged in
- [ ] Close browser tab, reopen
- [ ] **Expected**: Remain logged in (if remember me checked)
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

### Session Auto-Refresh Tests
**Test 4.2: Auto-Refresh Monitoring**
- [ ] Login and stay active for 10+ minutes
- [ ] Monitor network tab for refresh calls
- [ ] **Expected**: Automatic token refresh before expiry
- [ ] **Note**: May need longer testing period
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

## Phase 5: Protected Routes

### Access Control Tests
**Test 5.1: Protected Route Access**
- [ ] While logged out, navigate to http://localhost:5173/dashboard
- [ ] **Expected**: Redirect to login page
- [ ] Login and navigate to http://localhost:5173/dashboard
- [ ] **Expected**: Access granted
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

**Test 5.2: Admin Route Access**
- [ ] Navigate to http://localhost:5173/admin/auth
- [ ] **Expected**: Access based on user role
- [ ] **Note**: May require admin role assignment
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

## Error Handling Tests

### Network Error Simulation
**Test 6.1: Offline Behavior**
- [ ] Disconnect internet during login
- [ ] Attempt to login
- [ ] **Expected**: Graceful error handling
- [ ] Reconnect internet
- [ ] **Expected**: Retry works
- [ ] **Actual Result**: _______________
- [ ] **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial

## Testing Summary

### Overall Results
- **Total Tests**: 20
- **Passed**: ___/20
- **Failed**: ___/20 
- **Partial**: ___/20

### Critical Issues Found
1. ________________________________
2. ________________________________
3. ________________________________

### Minor Issues Found
1. ________________________________
2. ________________________________
3. ________________________________

### Recommendations
1. ________________________________
2. ________________________________
3. ________________________________

---

**Test Date**: _______________
**Tester**: _______________
**Environment**: Development (http://localhost:5173/)
**Browser**: _______________
**Notes**: _______________
