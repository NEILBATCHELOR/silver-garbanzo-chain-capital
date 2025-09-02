# Investor User Account Management

This feature provides comprehensive user account management for onboarded investors within the Chain Capital platform.

## Overview

The Investor User Account Management system allows administrators to create and manage user accounts for investors who have completed the onboarding process. This bridges the gap between investor onboarding and platform access.

## Features

### 1. Investor Account Overview
- **View all investors** with their current account status
- **Account status indicators**: No Account, Pending, Active, Inactive, etc.
- **KYC status integration** showing compliance status
- **Company information** and contact details

### 2. User Account Creation
- **Create user accounts** for investors without existing accounts
- **Automatic profile creation** with `investor` profile type
- **Role assignment** with appropriate investor permissions
- **Secure password generation** or manual password setting
- **Optional immediate invite** sending

### 3. Invitation Management
- **Individual invites** for pending user accounts
- **Resend functionality** for failed or expired invitations
- **Bulk invite system** with configurable delays (default: 5 seconds)
- **Progress tracking** for bulk operations
- **Error handling** and retry capabilities

### 4. Compliance Integration
- **Profile type enforcement** - investors can only have `investor` profile type
- **Database relationship integrity** - proper linking between users, profiles, and investors
- **Audit trail support** through existing universal database service

## Implementation

### Components

#### InvestorUserTable
- Main table displaying investors and account status
- Actions dropdown with context-aware options
- Bulk invite trigger for pending accounts
- Real-time status updates

#### AddInvestorUserModal
- Form for creating new user accounts
- Email and name validation
- Password generation options
- Invite sending preferences

#### InviteInvestorModal
- Individual invitation management
- Support for new invites and resends
- User account status validation
- Clear feedback messaging

#### BulkInviteModal
- Batch invitation processing
- Configurable delay settings (1-60 seconds)
- Real-time progress tracking
- Error reporting and retry options
- Estimated completion time display

### Service Layer

#### InvestorUserService
- **Database operations** for investor-user relationships
- **User account creation** with proper role assignment
- **Profile management** with investor type enforcement
- **Invitation handling** through Supabase Auth
- **Bulk processing** with progress callbacks

### Data Flow

1. **Account Creation**:
   ```
   Investor (no user_id) -> Create User -> Create Profile -> Link to Investor -> Optional Invite
   ```

2. **Invitation Process**:
   ```
   Pending User -> Generate Invite Link -> Send Email -> User Activation -> Account Active
   ```

3. **Database Relationships**:
   ```
   investors.user_id -> users.id
   investors.profile_id -> profiles.id
   profiles.user_id -> users.id
   profiles.profile_type = 'investor'
   ```

## Integration

### RoleManagementDashboard
Added as new tab "Investor Accounts" with:
- Full investor user account management
- Permission-based access control
- Organization context awareness
- Consistent UI/UX with existing tabs

### Database Schema
Utilizes existing tables:
- `investors` - Core investor information
- `users` - User account data
- `profiles` - Profile type management
- `user_roles` - Role assignments
- `roles` - Permission definitions

## Security Considerations

- **Profile type restrictions** - Only `investor` profile type allowed
- **Role-based permissions** - Automatic assignment of investor role
- **Secure password generation** - Strong default passwords
- **Email verification** - Required activation process
- **Rate limiting** - Controlled bulk invitation sending

## Configuration

### Bulk Invite Settings
- Default delay: 5 seconds between emails
- Configurable range: 1-60 seconds
- Progress tracking with real-time updates
- Error handling with detailed reporting

### Email Templates
Uses Supabase Auth invitation system with:
- Custom redirect URLs
- User metadata inclusion
- Professional email formatting
- Platform branding integration

## Usage Examples

### Creating User Accounts
1. Navigate to User Management > Investor Accounts
2. Find investor without user account
3. Use "Create User Account" action
4. Configure settings and submit
5. Optional: Send invite immediately

### Bulk Invitations
1. Filter to pending accounts (shows count)
2. Click "Bulk Invite" button
3. Configure delay settings
4. Monitor progress in real-time
5. Review completion report

### Individual Management
1. Use dropdown actions per investor
2. Send/resend invites as needed
3. Monitor status changes
4. Handle errors individually

## Future Enhancements

- **Email template customization**
- **Advanced filtering and search**
- **Export functionality for reports**
- **Integration with KYC workflow triggers**
- **Automated re-invitation scheduling**
- **Analytics and usage reporting**

## Files Created

### Components
- `InvestorUserTable.tsx` - Main table component
- `AddInvestorUserModal.tsx` - Account creation modal
- `InviteInvestorModal.tsx` - Individual invite management
- `BulkInviteModal.tsx` - Bulk invitation processing

### Services
- `InvestorUserService.ts` - Core business logic and database operations

### Types
- `types.ts` - TypeScript type definitions

### Integration
- Updated `RoleManagementDashboard.tsx` with new tab
- Added `index.ts` for clean exports

This implementation follows Chain Capital's coding standards and integrates seamlessly with the existing user management infrastructure.
