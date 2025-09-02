# Supabase Email Templates Configuration Guide

## Overview

This guide provides step-by-step instructions for configuring Supabase email templates to fix the Chain Capital authentication email flows.

## Problem Summary

Currently, users are receiving the wrong email types:
- Adding users with "Send Invitation" sends reset password emails instead of invitations
- Reset password links show `otp_expired` errors
- Need proper email templates for all auth flows

## Email Templates to Configure

### 1. Confirm Signup
**Purpose**: Email verification for new user registrations
**Template Type**: `Confirm signup`
**Redirect URL**: `{{ .SiteURL }}/auth/verify-email?token={{ .TokenHash }}&type=signup`

**Subject**: `Confirm your Chain Capital account`

**Body**:
```html
<h2>Welcome to Chain Capital!</h2>
<p>Hi {{ .Email }},</p>
<p>Thank you for signing up. Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your account</a></p>
<p>If you didn't create an account with us, please ignore this email.</p>
<p>Best regards,<br>The Chain Capital Team</p>
```

### 2. Invite User
**Purpose**: User invitations sent by administrators
**Template Type**: `Invite user`
**Redirect URL**: `{{ .SiteURL }}/auth/callback?token={{ .TokenHash }}&type=invite`

**Subject**: `You've been invited to Chain Capital`

**Body**:
```html
<h2>Welcome to Chain Capital!</h2>
<p>Hi there,</p>
<p>You've been invited to join Chain Capital. Click the link below to set up your account:</p>
<p><a href="{{ .ConfirmationURL }}">Accept invitation and set up account</a></p>
<p>This invitation will expire in 7 days.</p>
<p>Best regards,<br>The Chain Capital Team</p>
```

### 3. Magic Link
**Purpose**: Passwordless login emails
**Template Type**: `Magic Link`
**Redirect URL**: `{{ .SiteURL }}/auth/callback?token={{ .TokenHash }}&type=magiclink`

**Subject**: `Your Chain Capital login link`

**Body**:
```html
<h2>Your login link</h2>
<p>Hi {{ .Email }},</p>
<p>Click the link below to sign in to your Chain Capital account:</p>
<p><a href="{{ .ConfirmationURL }}">Sign in to Chain Capital</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this, please ignore this email.</p>
<p>Best regards,<br>The Chain Capital Team</p>
```

### 4. Reset Password
**Purpose**: Password recovery emails
**Template Type**: `Reset Password`
**Redirect URL**: `{{ .SiteURL }}/auth/reset-password?token={{ .TokenHash }}&type=recovery`

**Subject**: `Reset your Chain Capital password`

**Body**:
```html
<h2>Reset your password</h2>
<p>Hi {{ .Email }},</p>
<p>You requested to reset your password. Click the link below to create a new password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset your password</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this, please ignore this email.</p>
<p>Best regards,<br>The Chain Capital Team</p>
```

### 5. Change Email Address
**Purpose**: Email address change confirmation
**Template Type**: `Change Email Address`  
**Redirect URL**: `{{ .SiteURL }}/auth/callback?token={{ .TokenHash }}&type=email_change`

**Subject**: `Confirm your new email address`

**Body**:
```html
<h2>Confirm your new email address</h2>
<p>Hi there,</p>
<p>You requested to change your email address to {{ .NewEmail }}. Click the link below to confirm:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm email change</a></p>
<p>If you didn't request this change, please contact support.</p>
<p>Best regards,<br>The Chain Capital Team</p>
```

### 6. Reauthentication
**Purpose**: Re-verification for sensitive operations
**Template Type**: `Reauthentication`
**Redirect URL**: `{{ .SiteURL }}/auth/callback?token={{ .TokenHash }}&type=reauthentication`

**Subject**: `Verify your identity for Chain Capital`

**Body**:
```html
<h2>Verify your identity</h2>
<p>Hi {{ .Email }},</p>
<p>A sensitive operation requires identity verification. Click the link below to confirm:</p>
<p><a href="{{ .ConfirmationURL }}">Verify your identity</a></p>
<p>This verification will expire in 10 minutes.</p>
<p>If you didn't initiate this action, please contact support immediately.</p>
<p>Best regards,<br>The Chain Capital Team</p>
```

## Configuration Steps

### Step 1: Access Supabase Dashboard
1. Log into [Supabase Dashboard](https://app.supabase.com)
2. Select your Chain Capital project
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Configure Each Template
For each template type:

1. **Select template type** from the dropdown
2. **Update Subject line** with the recommended subject
3. **Replace Body content** with the recommended HTML
4. **Verify Redirect URL** matches the pattern
5. **Save changes**

### Step 3: Test Email Templates
After configuration:

1. **Test Invite User**:
   - Add a new user with "Send Invitation Email" checked
   - Verify invitation email is received (not reset password)
   - Check that invitation link works properly

2. **Test Reset Password**:
   - Use "Forgot Password" on login page
   - Verify reset email is received
   - Check that reset link works without otp_expired error

3. **Test Other Flows**:
   - Sign up new user (confirm signup email)
   - Use magic link login
   - Change email address
   - Test reauthentication flow

## Important Notes

### Template Variables Available
- `{{ .SiteURL }}` - Your site URL (https://yourapp.com)
- `{{ .Email }}` - User's email address
- `{{ .NewEmail }}` - New email (for email change)
- `{{ .TokenHash }}` - Authentication token
- `{{ .ConfirmationURL }}` - Full URL with token

### URL Configuration
Ensure your Supabase project has the correct:
- **Site URL**: Set to your production domain
- **Redirect URLs**: Include all auth callback URLs
- **Rate limiting**: Configured appropriately for email sending

### Testing Strategy
1. Use different email addresses for testing
2. Check both success and error scenarios  
3. Verify email delivery and link functionality
4. Test on different devices/email clients
5. Monitor Supabase Auth logs for issues

## Troubleshooting

### Common Issues
1. **Emails not received**: Check spam folder, verify SMTP settings
2. **Links not working**: Verify redirect URLs match frontend routes
3. **Token expired errors**: Check token expiration settings
4. **Wrong email type**: Ensure using correct Supabase auth methods

### Debug Steps
1. Check Supabase Auth logs
2. Verify email template configuration
3. Test with different browsers/devices
4. Monitor network requests in browser dev tools

## Status Checklist

- [ ] Configure Confirm Signup template
- [ ] Configure Invite User template  
- [ ] Configure Magic Link template
- [ ] Configure Reset Password template
- [ ] Configure Change Email template
- [ ] Configure Reauthentication template
- [ ] Test invitation email flow
- [ ] Test password reset flow
- [ ] Test email verification flow
- [ ] Test magic link flow
- [ ] Test email change flow
- [ ] Verify no otp_expired errors
- [ ] Confirm correct email types sent
