# DFNS Integration Implementation

## Overview

This directory contains the complete DFNS (Distributed Financial Network Services) integration for the Chain Capital platform. The implementation follows the official DFNS API documentation and supports delegated authentication, wallet management, and transaction processing.

## Architecture

The DFNS integration is structured in three main layers:

### 1. Types Layer (`/types/dfns/`)
- **Core Types**: Base DFNS entities and enums
- **Authentication Types**: Login, registration, and credential management
- **Wallet Types**: Wallet creation, balances, and transfers
- **Transaction Types**: Signatures and transaction handling
- **Fiat Types**: On/off-ramp functionality
- **API Types**: Client configuration and request/response handling
- **Error Types**: Comprehensive error handling with custom error classes

### 2. Infrastructure Layer (`/infrastructure/dfns/`)
- **Core Client**: Main DFNS SDK wrapper with error handling
- **Configuration**: Environment-based configuration management
- **Authentication Infrastructure**:
  - Auth Client: Handles delegated authentication flows
  - Credential Manager: WebAuthn credential management
  - Session Manager: Token and session lifecycle management

### 3. Services Layer (`/services/dfns/`)
- **Main Service**: Orchestrates all DFNS operations
- **Auth Service**: High-level authentication operations
- **Wallet Service**: Wallet and balance management (to be implemented)
- **Transaction Service**: Transaction processing (to be implemented)
- **Fiat Service**: Fiat conversion operations (to be implemented)

## Key Features Implemented

### ✅ Completed Features

1. **Comprehensive Type System**
   - Full TypeScript coverage for DFNS API
   - Aligned with database schema
   - Custom error classes with proper inheritance

2. **Core Infrastructure**
   - DFNS SDK integration with proper error handling
   - Environment-based configuration
   - Singleton pattern for global client management

3. **Authentication System (COMPLETE)**
   - **All Registration APIs** (5/5 endpoints implemented):
     - Delegated registration support
     - Standard user registration with registration codes
     - End user registration with automatic wallet creation
     - Social registration (OAuth/OIDC) support
     - Registration code resend functionality
   - **All Login APIs** (6/6 endpoints implemented):
     - Standard login flow (init + complete)
     - Social login with OAuth providers (Google, etc.)
     - Delegated login for service accounts
     - Send login code for PasswordProtectedKey users
     - Proper logout with session invalidation
   - **Authentication Infrastructure**:
     - WebAuthn credential management
     - Session management with automatic token refresh
     - **User action signing for sensitive operations**
       - Full 3-step DFNS flow: init → sign → complete
       - WebAuthn integration for challenge signing
       - X-DFNS-USERACTION header support
       - Database persistence and validation

4. **User Action Signing Service (NEW)**
   - Complete implementation of DFNS User Action Signing API
   - Endpoints: POST /auth/action/init and POST /auth/action
   - Database integration with dfns_user_action_challenges table
   - Error handling and retry logic
   - Clean challenge expiration and validation

5. **Database Integration**
   - 37 DFNS tables already exist in Supabase
   - Complete schema coverage for all DFNS entities
   - Proper foreign key relationships

### 🔄 In Progress / To Be Implemented

1. **Wallet Services**
   - Wallet creation and management
   - Balance tracking and updates
   - Multi-network support

2. **Transaction Services**
   - Transaction signing and broadcasting
   - Fee estimation
   - Transaction history tracking

3. **Fiat Services**
   - On-ramp integration (Ramp Network, Mt Pelerin)
   - Off-ramp functionality
   - Quote management

4. **React Components**
   - Authentication UI components
   - Wallet management components
   - Transaction components

## Configuration

The DFNS integration requires the following environment variables:

```env
# Required
VITE_DFNS_APP_ID=your_dfns_application_id
VITE_DFNS_APP_ORIGIN=your_app_origin
VITE_DFNS_RP_ID=your_relying_party_id

# Optional
VITE_DFNS_BASE_URL=https://api.dfns.ninja
VITE_DFNS_ENVIRONMENT=sandbox
VITE_DFNS_TIMEOUT=30000
VITE_DFNS_MAX_RETRIES=3
VITE_DFNS_ENABLE_LOGGING=true
```

## Login API Types

The implementation now supports all DFNS login flows:

### 1. Standard Login Flow
```typescript
// Standard WebAuthn login for registered users
const { loginChallenge, completeLogin } = await authService.login('user@example.com');

// Complete login with WebAuthn credential
const authResponse = await completeLogin(credentialAssertion);
```

### 2. Social Login (OAuth)
```typescript
// Login with Google or other OIDC providers
const authResponse = await authService.loginWithSocial(
  googleIdToken, // From Google OAuth
  'Oidc',
  'organization-id' // Optional
);
```

### 3. Delegated Login (Service Accounts)
```typescript
// Backend service account login
const authResponse = await authService.delegatedLogin(
  'service-account@example.com',
  'organization-id'
);
```

### 4. Send Login Code
```typescript
// Send login code for PasswordProtectedKey users
await authService.sendLoginCode(
  'user@example.com',
  'organization-id'
);
```

### 5. Logout
```typescript
// Proper logout with session invalidation
await authService.logout();
```

## Registration API Types

The implementation now supports all DFNS registration flows:

### 1. Delegated Registration (Service Account)
```typescript
// For service accounts registering users on their behalf
const { registrationChallenge, completeRegistration } = await authService.registerUser(
  'user@example.com',
  'EndUser'
);
```

### 2. Standard Registration (Registration Code)
```typescript
// For direct user registration with email registration code
const { registrationChallenge, completeRegistration } = await authService.registerUserWithCode(
  'user@example.com',
  '1234-5678-9012-3456', // Registration code from email
  'or-34513-nip9c-8bppvgqgj28dbodrc' // Organization ID
);
```

### 3. End User Registration with Wallets
```typescript
// Register user and automatically create wallets
const credential = await authService.createWebAuthnCredentialForRegistration(challenge);
const walletSpecs = [
  { network: 'Ethereum', name: 'Main Wallet' },
  { network: 'Bitcoin', name: 'BTC Wallet' }
];

const response = await authService.registerEndUserWithWallets(
  credential,
  walletSpecs
);
// User is registered AND wallets are created automatically
```

### 4. Social Registration (OAuth)
```typescript
// Register using Google or other OIDC providers
const { registrationChallenge, completeRegistration } = await authService.registerUserWithSocial(
  googleIdToken, // From Google OAuth
  'Oidc'
);
```

### 5. Registration Code Management
```typescript
// Resend registration code if user lost the original
const result = await authService.resendRegistrationCode(
  'user@example.com',
  'or-34513-nip9c-8bppvgqgj28dbodrc'
);
```

## Usage Example

```typescript
import { initializeDfnsService, getDfnsService } from './services/dfns';

// Initialize the service
const dfnsService = await initializeDfnsService();
const authService = dfnsService.getAuthService();

// Option A: Delegated Registration (most common for apps)
const { registrationChallenge, completeRegistration } = await authService.registerUser(
  'user@example.com',
  'EndUser'
);

// Option B: Standard Registration with Code
const { registrationChallenge, completeRegistration } = await authService.registerUserWithCode(
  'user@example.com',
  'registration-code-from-email',
  'organization-id'
);

// Complete registration with WebAuthn
const authResponse = await completeRegistration(credentialAssertion);

// Check authentication status
if (dfnsService.isAuthenticated()) {
  // Use User Action Signing for sensitive operations
  const userActionService = dfnsService.getUserActionService();
  
  // Example: Sign a wallet creation action
  const userActionToken = await userActionService.signUserAction(
    'CreateWallet',
    {
      network: 'Ethereum',
      name: 'My Wallet'
    }
  );
  
  // Use the userAction token in sensitive API calls
  const walletResponse = await dfnsService.client.makeRequestWithUserAction(
    'POST',
    '/wallets',
    { network: 'Ethereum', name: 'My Wallet' },
    userActionToken
  );
}
```

## User Action Signing Flow

```typescript
// Complete 3-step DFNS User Action Signing flow
const userActionService = dfnsService.getUserActionService();

// 1. Initiate challenge + 2. Sign with WebAuthn + 3. Complete signing
const userActionToken = await userActionService.signUserAction(
  'CreateWallet',      // Action type
  { 
    network: 'Ethereum',
    name: 'My Wallet' 
  },                   // Action payload
  {
    persistToDb: true, // Save to database (optional)
    credentialId: 'preferred-credential-id' // Use specific credential (optional)
  }
);

// Use token for sensitive operations
await client.makeRequestWithUserAction('POST', '/wallets', data, userActionToken);
```

## User Management APIs

The implementation now supports complete DFNS User Management operations for administrative control over organization users:

### 1. List All Users
```typescript
// Get all users in the organization with pagination
const userService = dfnsService.getUserService();

// Basic listing with default pagination
const usersList = await userService.listUsers();

// Advanced listing with options
const usersWithOptions = await userService.listUsers({
  limit: 100,
  paginationToken: 'next-page-token'
});

// Get all users (handles pagination automatically)
const allUsers = await userService.getAllUsers();
```

### 2. Create New User
```typescript
// Create a new CustomerEmployee user
const newUser = await userService.createUser({
  email: 'employee@company.com',
  kind: 'CustomerEmployee',
  externalId: 'emp-12345' // Optional
});

// Create with options
const userWithOptions = await userService.createUser(
  {
    email: 'admin@company.com',
    kind: 'CustomerEmployee'
  },
  {
    syncToDatabase: true,
    autoActivate: true
  }
);
```

### 3. Get Individual User
```typescript
// Get user by DFNS user ID
const user = await userService.getUser('us-xxxx-xxxx-xxxxxxxx');

// Get user by username/email
const userByEmail = await userService.getUserByUsername('user@company.com');
```

### 4. User Lifecycle Management
```typescript
// Activate a deactivated user
const activatedUser = await userService.activateUser('us-xxxx-xxxx-xxxxxxxx');

// Deactivate an active user (suspend access)
const deactivatedUser = await userService.deactivateUser('us-xxxx-xxxx-xxxxxxxx');

// Archive a user (soft delete)
const archivedUser = await userService.archiveUser('us-xxxx-xxxx-xxxxxxxx');
```

### 5. Batch Operations
```typescript
// Activate multiple users
const userIds = ['us-1111-1111-11111111', 'us-2222-2222-22222222'];
const activatedUsers = await userService.activateUsers(userIds);

// Deactivate multiple users
const deactivatedUsers = await userService.deactivateUsers(userIds);
```

### User Service Features
- **Comprehensive validation**: Email format, user ID patterns, status checks
- **Enhanced error handling**: Detailed error context and validation
- **Database synchronization**: Optional sync to local Supabase dfns_users table
- **Audit logging**: Complete operation logging for compliance
- **Batch operations**: Efficient bulk user management
- **Pagination handling**: Automatic pagination for large user lists

## Service Account Management APIs

The implementation now supports complete DFNS Service Account Management operations for administrative control over organization service accounts (machine users):

### 1. List All Service Accounts
```typescript
// Get all service accounts in the organization with pagination
const serviceAccountService = dfnsService.getServiceAccountService();

// Basic listing with default pagination
const serviceAccountsList = await serviceAccountService.listServiceAccounts();

// Advanced listing with options
const serviceAccountsWithOptions = await serviceAccountService.listServiceAccounts({
  limit: 100,
  paginationToken: 'next-page-token'
});

// Get all service accounts (handles pagination automatically)
const allServiceAccounts = await serviceAccountService.getAllServiceAccounts();
```

### 2. Create New Service Account
```typescript
// Create a new service account with required parameters
const newServiceAccount = await serviceAccountService.createServiceAccount({
  name: 'API Service Account',
  publicKey: '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...\n-----END PUBLIC KEY-----',
  daysValid: 365, // Optional, max 730 days
  permissionId: 'pm-xxxx-xxxx-xxxxxxxx', // Optional, inherits caller permissions if not provided
  externalId: 'api-service-001' // Optional, correlation ID
});

// Create with options
const serviceAccountWithOptions = await serviceAccountService.createServiceAccount(
  {
    name: 'Production API Service',
    publicKey: publicKeyPem,
    daysValid: 730
  },
  {
    syncToDatabase: true,
    autoActivate: true
  }
);
```

### 3. Get Individual Service Account
```typescript
// Get service account by DFNS service account ID
const serviceAccount = await serviceAccountService.getServiceAccount('us-xxxx-xxxx-xxxxxxxx');

// Get service account by name
const serviceAccountByName = await serviceAccountService.getServiceAccountByName('API Service Account');
```

### 4. Update Service Account
```typescript
// Update service account name and external ID
const updatedServiceAccount = await serviceAccountService.updateServiceAccount(
  'us-xxxx-xxxx-xxxxxxxx',
  {
    name: 'Updated API Service Account',
    externalId: 'api-service-updated-001'
  }
);
```

### 5. Service Account Lifecycle Management
```typescript
// Activate a deactivated service account
const activatedServiceAccount = await serviceAccountService.activateServiceAccount('us-xxxx-xxxx-xxxxxxxx');

// Deactivate an active service account (suspend access)
const deactivatedServiceAccount = await serviceAccountService.deactivateServiceAccount('us-xxxx-xxxx-xxxxxxxx');

// Archive a service account (soft delete)
const archivedServiceAccount = await serviceAccountService.archiveServiceAccount('us-xxxx-xxxx-xxxxxxxx');
```

### 6. Batch Operations
```typescript
// Activate multiple service accounts
const serviceAccountIds = ['us-1111-1111-11111111', 'us-2222-2222-22222222'];
const activatedServiceAccounts = await serviceAccountService.activateServiceAccounts(serviceAccountIds);

// Deactivate multiple service accounts
const deactivatedServiceAccounts = await serviceAccountService.deactivateServiceAccounts(serviceAccountIds);

// Archive multiple service accounts
const archivedServiceAccounts = await serviceAccountService.archiveServiceAccounts(serviceAccountIds);
```

### 7. Enhanced Features
```typescript
// Get service accounts summary for dashboards
const summary = await serviceAccountService.getServiceAccountsSummary();
// Returns: Array of { userId, name, status, orgId, isActive, activeTokensCount, permissionCount, createdAt, lastActiveAt }
```

### Service Account Service Features
- **Comprehensive validation**: Name format, public key validation, days valid constraints
- **Enhanced error handling**: Detailed error context and validation
- **Database synchronization**: Optional sync to local Supabase dfns_service_accounts table
- **Audit logging**: Complete operation logging for compliance
- **Batch operations**: Efficient bulk service account management
- **Pagination handling**: Automatic pagination for large service account lists
- **Access token management**: Track active and inactive access tokens
- **Permission tracking**: Monitor permission assignments and operations

## Personal Access Token Management APIs

The implementation now supports complete DFNS Personal Access Token Management operations for user-specific automation and limited permission tokens:

### 1. List All Personal Access Tokens
```typescript
// Get all personal access tokens for the current user
const personalAccessTokenService = dfnsService.getPersonalAccessTokenService();

// Basic listing
const tokensList = await personalAccessTokenService.listPersonalAccessTokens();

// With options
const tokensWithSync = await personalAccessTokenService.listPersonalAccessTokens({
  syncToDatabase: true
});
```

### 2. Create New Personal Access Token
```typescript
// Create a new personal access token with User Action Signing
const newToken = await personalAccessTokenService.createPersonalAccessToken({
  name: 'API Automation Token',
  publicKey: '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...\n-----END PUBLIC KEY-----',
  daysValid: 365, // Optional, max 730 days
  permissionId: 'pm-xxxx-xxxx-xxxxxxxx', // Optional, inherits user permissions if not provided
  externalId: 'automation-001' // Optional, correlation ID
});

// Note: accessToken is only returned during creation and never stored by DFNS
console.log('Access Token:', newToken.accessToken);

// Create with options
const tokenWithOptions = await personalAccessTokenService.createPersonalAccessToken(
  {
    name: 'Read-Only Monitoring Token',
    publicKey: publicKeyPem,
    daysValid: 90,
    permissionId: 'pm-readonly-permission-id'
  },
  {
    syncToDatabase: true,
    autoActivate: true,
    validatePermissions: true
  }
);
```

### 3. Get Individual Personal Access Token
```typescript
// Get personal access token by DFNS token ID
const token = await personalAccessTokenService.getPersonalAccessToken('to-xxxx-xxxx-xxxxxxxx');

// Get personal access token by name
const tokenByName = await personalAccessTokenService.getPersonalAccessTokenByName('API Automation Token');
```

### 4. Update Personal Access Token
```typescript
// Update personal access token name and external ID
const updatedToken = await personalAccessTokenService.updatePersonalAccessToken(
  'to-xxxx-xxxx-xxxxxxxx',
  {
    name: 'Updated API Automation Token',
    externalId: 'automation-updated-001'
  }
);
```

### 5. Personal Access Token Lifecycle Management
```typescript
// Activate a deactivated personal access token
const activatedToken = await personalAccessTokenService.activatePersonalAccessToken('to-xxxx-xxxx-xxxxxxxx');

// Deactivate an active personal access token (suspend access)
const deactivatedToken = await personalAccessTokenService.deactivatePersonalAccessToken('to-xxxx-xxxx-xxxxxxxx');

// Archive a personal access token (soft delete)
const archivedToken = await personalAccessTokenService.archivePersonalAccessToken('to-xxxx-xxxx-xxxxxxxx');
```

### 6. Batch Operations
```typescript
// Activate multiple personal access tokens
const tokenIds = ['to-1111-1111-11111111', 'to-2222-2222-22222222'];
const activatedTokens = await personalAccessTokenService.activatePersonalAccessTokens(tokenIds);

// Deactivate multiple personal access tokens
const deactivatedTokens = await personalAccessTokenService.deactivatePersonalAccessTokens(tokenIds);
```

### 7. Enhanced Features
```typescript
// Get personal access tokens summary for dashboards
const summary = await personalAccessTokenService.getPersonalAccessTokensSummary();
// Returns: Array of { tokenId, name, isActive, createdAt, permissionCount, daysSinceCreated, daysUntilExpiry }
```

### Personal Access Token Service Features
- **Comprehensive validation**: Token name format, public key validation, days valid constraints
- **Enhanced error handling**: Detailed error context and validation
- **Database synchronization**: Optional sync to local Supabase dfns_personal_access_tokens table
- **Audit logging**: Complete operation logging for compliance
- **Batch operations**: Efficient bulk token management
- **User Action Signing**: Required for token creation (sensitive operation)
- **Permission scoping**: Tokens can have limited permissions (subset of user permissions)
- **Security**: Tokens are user-linked and deactivate when user is deactivated

## Credential Management APIs

The implementation now supports complete DFNS Credential Management operations for managing user credentials (WebAuthn, Keys, and recovery credentials):

### 1. Create WebAuthn Credential
```typescript
// Create a new WebAuthn credential with full DFNS flow
const credentialService = dfnsService.getCredentialService();

// Basic WebAuthn credential creation
const credential = await credentialService.createWebAuthnCredential(
  'My Security Key',
  {
    autoActivate: true,
    syncToDatabase: true
  }
);
```

### 2. Create Custom Credential
```typescript
// Create credential with custom credential info (for advanced use cases)
const credential = await credentialService.createCredentialWithInfo({
  name: 'Recovery Key',
  kind: 'RecoveryKey',
  credentialInfo: {
    credId: 'custom-credential-id',
    clientData: 'base64-client-data',
    attestationData: 'base64-attestation-data'
  },
  encryptedPrivateKey: 'encrypted-private-key-data',
  options: {
    autoActivate: true,
    syncToDatabase: true
  }
});
```

### 3. List All Credentials
```typescript
// Get all credentials for the current user
const credentials = await credentialService.listCredentials({
  syncToDatabase: true
});

// Get credentials summary for dashboards
const summary = await credentialService.getCredentialsSummary();
// Returns: Array of { credentialUuid, name, kind, isActive, dateCreated, etc. }
```

### 4. Find Credential by Name
```typescript
// Find a specific credential by name
const credential = await credentialService.getCredentialByName('My Security Key');
```

### 5. Credential Lifecycle Management
```typescript
// Activate a deactivated credential (requires User Action Signing)
const activatedCredential = await credentialService.activateCredential(
  'cr-xxxx-xxxx-xxxxxxxx',
  { syncToDatabase: true }
);

// Deactivate an active credential (requires User Action Signing)
const deactivatedCredential = await credentialService.deactivateCredential(
  'cr-xxxx-xxxx-xxxxxxxx',
  { syncToDatabase: true }
);
```

### 6. Batch Operations
```typescript
// Activate multiple credentials
const credentialUuids = ['cr-1111-1111-11111111', 'cr-2222-2222-22222222'];
const result = await credentialService.activateCredentials(credentialUuids);
// Returns: { successful: string[], failed: Array<{ credentialUuid, error }> }

// Deactivate multiple credentials
const deactivateResult = await credentialService.deactivateCredentials(credentialUuids);
```

### 7. WebAuthn Browser Support
```typescript
// Check if WebAuthn is supported in the current browser
if (DfnsCredentialService.isWebAuthnSupported()) {
  // Proceed with WebAuthn credential creation
  const credential = await credentialService.createWebAuthnCredential('New Credential');
} else {
  // Fall back to other credential types or show error
  console.error('WebAuthn is not supported in this browser');
}
```

### 8. Code-Based Credential Flow (NEW)
```typescript
// Create WebAuthn credential using verification code (no authentication required)
const credential = await credentialService.createWebAuthnCredentialWithCode(
  'My Initial Security Key',
  'ABC-DEF-GHI', // Verification code
  {
    autoActivate: true,
    syncToDatabase: true
  }
);

// Create custom credential with verification code
const customCredential = await credentialService.createCredentialWithCodeAndInfo({
  name: 'Recovery Key',
  kind: 'RecoveryKey',
  verificationCode: 'ABC-DEF-GHI',
  credentialInfo: {
    credId: 'recovery-key-id',
    clientData: 'base64-client-data',
    attestationData: 'base64-attestation-data'
  },
  encryptedPrivateKey: 'encrypted-private-key-data',
  options: {
    autoActivate: true,
    syncToDatabase: true
  }
});

// Get challenge for manual WebAuthn handling
const challenge = await credentialService.getCredentialChallengeWithCode(
  'ABC-DEF-GHI',
  'Fido2'
);
```

### Code-Based Flow Benefits
- **No Authentication Required**: Users don't need to be logged in
- **No User Action Signing**: Simplified credential creation process
- **Verification Code Security**: Uses one-time codes for security
- **Onboarding Friendly**: Perfect for initial user registration scenarios
- **Reduced Friction**: Eliminates complex authentication steps during setup

### Credential Service Features
- **Complete WebAuthn Integration**: Full browser WebAuthn API support with DFNS challenges
- **Multiple Credential Types**: Support for Fido2, Key, PasswordProtectedKey, and RecoveryKey
- **Dual Flow Support**: Both regular (with User Action Signing) and code-based (simplified) flows
- **User Action Signing**: Required for regular credential creation, activation, and deactivation
- **Code-Based Flow**: Alternative simplified flow for onboarding without authentication
- **Comprehensive validation**: Credential name format, UUID validation, credential kind validation, verification code validation
- **Enhanced error handling**: Detailed error context and validation with custom error types
- **Database synchronization**: Optional sync to local Supabase dfns_credentials table
- **Audit logging**: Complete operation logging for compliance
- **Batch operations**: Efficient bulk credential lifecycle management
- **Browser compatibility**: Automatic WebAuthn support detection
- **Security**: Proper challenge handling and credential verification

## User Recovery APIs

The implementation now supports complete DFNS User Recovery operations for enabling users to regain access when they lose their credentials:

### 1. Standard Recovery Flow
```typescript
// Complete standard user recovery flow
const userRecoveryService = dfnsService.getUserRecoveryService();

// Step 1: Send recovery code to user's email
await userRecoveryService.sendRecoveryCode(
  'user@example.com',
  'org-12345'
);

// Step 2: User receives verification code and provides it along with recovery credential
const { recoveryResponse, summary } = await userRecoveryService.recoverUserAccount(
  'user@example.com',
  'org-12345',
  '1234-5678-9012-3456', // Verification code from email
  'recovery-credential-id',
  newCredentials, // New credentials to replace invalidated ones
  recoveryCredentialAssertion // Signed with recovery credential
);
```

### 2. Delegated Recovery Flow
```typescript
// Service account initiated recovery for custom branded UX
const { recoveryResponse, summary } = await userRecoveryService.recoverUserAccountDelegated(
  'user@example.com',
  'recovery-credential-id',
  newCredentials, // New credentials to replace invalidated ones
  recoveryCredentialAssertion // Signed with recovery credential
);
```

### 3. Manual Recovery Steps
```typescript
// Individual recovery steps for custom flows

// Send recovery code (standard flow only)
const codeResponse = await userRecoveryService.sendRecoveryCode(
  'user@example.com',
  'org-12345'
);

// Create recovery challenge (standard flow)
const challengeResponse = await userRecoveryService.createRecoveryChallenge({
  username: 'user@example.com',
  verificationCode: '1234-5678-9012-3456',
  orgId: 'org-12345',
  credentialId: 'recovery-credential-id'
});

// Create delegated recovery challenge (delegated flow)
const delegatedChallenge = await userRecoveryService.createDelegatedRecoveryChallenge({
  username: 'user@example.com',
  credentialId: 'recovery-credential-id'
});

// Complete recovery with new credentials
const recoveryResponse = await userRecoveryService.recoverUser({
  recovery: {
    kind: 'RecoveryKey',
    credentialAssertion: recoveryCredentialAssertion
  },
  newCredentials: {
    firstFactorCredential: newWebAuthnCredential,
    recoveryCredential: newRecoveryCredential // Optional new recovery credential
  }
});
```

### 4. WebAuthn Helper Methods
```typescript
// Create WebAuthn credential during recovery
const newCredential = await userRecoveryService.createWebAuthnCredentialForRecovery(
  challenge,
  'New Recovery Credential'
);

// Sign recovery challenge with existing recovery credential
const assertion = await userRecoveryService.signRecoveryChallenge(
  challenge,
  'recovery-credential-id',
  allowedRecoveryCredentials
);

// Check WebAuthn browser support
if (DfnsUserRecoveryService.isWebAuthnSupported()) {
  // Proceed with WebAuthn operations
}
```

### User Recovery Service Features
- **Complete Recovery Workflows**: Both standard (email verification) and delegated (service account) flows
- **Security Compliance**: All existing credentials are invalidated after successful recovery
- **WebAuthn Integration**: Full browser WebAuthn API support for recovery credential signing
- **Comprehensive Validation**: Email format, organization ID, verification code, and credential validation
- **Enhanced Error Handling**: Detailed error context and recovery flow status tracking
- **Recovery Flow Management**: Step-by-step progress tracking and status monitoring
- **Browser Compatibility**: Automatic WebAuthn support detection and fallback handling
- **Audit Compliance**: Complete recovery attempt logging and summary generation
- **Flexible Implementation**: Support for both complete automated flows and manual step-by-step recovery

## Wallet Management APIs

The implementation now supports complete DFNS Wallet Management operations for creating, managing, and operating cryptocurrency wallets across 30+ blockchain networks:

### 1. Core Wallet Management

#### Create Wallet
```typescript
// Create a new wallet with User Action Signing
const walletService = dfnsService.getWalletService();

// Basic wallet creation
const newWallet = await walletService.createWallet({
  network: 'Ethereum',
  name: 'My Main Wallet',
  externalId: 'user-main-wallet'
});

// Advanced wallet creation with options
const walletWithOptions = await walletService.createWallet(
  {
    network: 'Bitcoin',
    name: 'BTC Treasury Wallet',
    tags: ['treasury', 'bitcoin'],
    keyScheme: 'ECDSA',
    keyCurve: 'secp256k1'
  },
  {
    syncToDatabase: true,
    autoActivate: true,
    createWithTags: ['production', 'high-value']
  }
);
```

#### Update Wallet
```typescript
// Update wallet name
const updatedWallet = await walletService.updateWallet(
  'wa-xxxx-xxxx-xxxxxxxxxxxxxxxx',
  { name: 'Updated Wallet Name' }
);
```

#### Delete Wallet
```typescript
// Archive wallet (requires User Action Signing)
const deletedWallet = await walletService.deleteWallet(
  'wa-xxxx-xxxx-xxxxxxxxxxxxxxxx'
);
```

#### Get and List Wallets
```typescript
// Get specific wallet
const wallet = await walletService.getWallet('wa-xxxx-xxxx-xxxxxxxxxxxxxxxx');

// List all wallets with filtering
const wallets = await walletService.listWallets({
  filterByNetwork: 'Ethereum',
  includeArchived: false,
  limit: 50
});

// Get all wallets (handles pagination automatically)
const allWallets = await walletService.getAllWallets();

// Find wallet by name
const walletByName = await walletService.getWalletByName('My Main Wallet');
```

### 2. Wallet Asset Management

#### Get Wallet Assets (Balances)
```typescript
// Get wallet assets with USD valuation
const assets = await walletService.getWalletAssets(
  'wa-xxxx-xxxx-xxxxxxxxxxxxxxxx',
  true // Include USD values
);

console.log('Total Portfolio Value:', assets.totalValueUsd);
console.log('Asset Count:', assets.assets.length);

// Access individual assets
assets.assets.forEach(asset => {
  console.log(`${asset.symbol}: ${asset.balance} (${asset.valueInUsd} USD)`);
});
```

#### Get Wallet NFTs
```typescript
// Get all NFTs in wallet
const nfts = await walletService.getWalletNfts(
  'wa-xxxx-xxxx-xxxxxxxxxxxxxxxx'
);

console.log('NFT Count:', nfts.nfts.length);

// Access individual NFTs
nfts.nfts.forEach(nft => {
  if (nft.kind === 'Erc721') {
    console.log(`NFT: ${nft.contract}#${nft.tokenId}`);
  }
});
```

#### Get Wallet Transaction History
```typescript
// Get complete transaction history
const history = await walletService.getWalletHistory(
  'wa-xxxx-xxxx-xxxxxxxxxxxxxxxx'
);

console.log('Transaction Count:', history.history.length);

// Filter by direction
const incomingTxs = history.history.filter(tx => tx.direction === 'Incoming');
const outgoingTxs = history.history.filter(tx => tx.direction === 'Outgoing');
```

### 3. Wallet Tag Management

#### Add and Remove Tags
```typescript
// Add tags to wallet
const walletWithTags = await walletService.addWalletTags(
  'wa-xxxx-xxxx-xxxxxxxxxxxxxxxx',
  { tags: ['production', 'high-security', 'multi-sig'] }
);

// Remove tags from wallet
const walletWithoutTags = await walletService.deleteWalletTags(
  'wa-xxxx-xxxx-xxxxxxxxxxxxxxxx',
  { tags: ['test', 'deprecated'] }
);
```

### 4. Transfer Operations

#### Transfer Native Assets
```typescript
// Transfer ETH from wallet (requires User Action Signing)
const ethTransfer = await walletService.transferAsset(
  'wa-xxxx-xxxx-xxxxxxxxxxxxxxxx',
  {
    kind: 'Native',
    to: '0x742d35Cc000000000000000000000000000000004',
    amount: '1000000000000000000', // 1 ETH in wei
    externalId: 'payment-12345'
  },
  {
    syncToDatabase: true,
    validateBalance: true
  }
);

console.log('Transfer ID:', ethTransfer.id);
console.log('Status:', ethTransfer.status);
```

#### Transfer ERC-20 Tokens
```typescript
// Transfer USDC tokens
const usdcTransfer = await walletService.transferAsset(
  'wa-xxxx-xxxx-xxxxxxxxxxxxxxxx',
  {
    kind: 'Erc20',
    contract: '0xA0b86a33E6329C3F6b9d9b0D4b08B6C28A3A1e5c', // USDC contract
    to: '0x123456789abcdef123456789abcdef123456789a',
    amount: '1000000', // 1 USDC (6 decimals)
    externalId: 'usdc-payment-67890'
  }
);
```

#### Transfer NFTs
```typescript
// Transfer ERC-721 NFT
const nftTransfer = await walletService.transferAsset(
  'wa-xxxx-xxxx-xxxxxxxxxxxxxxxx',
  {
    kind: 'Erc721',
    contract: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6', // CryptoPunks contract
    to: '0x987654321fedcba987654321fedcba9876543210',
    tokenId: '1234',
    externalId: 'nft-transfer-99999'
  }
);
```

#### Track Transfer Status
```typescript
// Get specific transfer request
const transfer = await walletService.getTransferRequest(
  'wa-xxxx-xxxx-xxxxxxxxxxxxxxxx',
  'tr-yyyy-yyyy-yyyyyyyyyyyyyyyy'
);

console.log('Transfer Status:', transfer.status);
console.log('Transaction Hash:', transfer.txHash);

// List all transfer requests for wallet
const transfers = await walletService.listTransferRequests(
  'wa-xxxx-xxxx-xxxxxxxxxxxxxxxx',
  20 // limit
);

// Check pending transfers
const pendingTransfers = transfers.items.filter(
  transfer => transfer.status === 'Pending'
);
```

### 5. Dashboard and Analytics

#### Get Wallet Summaries
```typescript
// Get summary for all wallets (perfect for dashboards)
const summaries = await walletService.getWalletsSummary();

summaries.forEach(summary => {
  console.log(`Wallet: ${summary.name || summary.walletId}`);
  console.log(`Network: ${summary.network}`);
  console.log(`Assets: ${summary.assetCount}`);
  console.log(`NFTs: ${summary.nftCount}`);
  console.log(`Total Value: ${summary.totalValueUsd || 'N/A'}`);
  console.log(`Active: ${summary.isActive}`);
  console.log('---');
});
```

### 6. Multi-Network Support

#### Supported Networks
DFNS supports 30+ blockchain networks including:
```typescript
// Major networks supported
const supportedNetworks = [
  'Ethereum', 'Bitcoin', 'Polygon', 'Avalanche', 'Binance',
  'Arbitrum', 'Optimism', 'Solana', 'Near', 'Algorand',
  'Stellar', 'Cardano', 'Polkadot', 'Kusama', 'Cosmos',
  'Osmosis', 'Juno', 'Stargaze', 'Aptos', 'Sui'
];

// Create wallets across multiple networks
for (const network of ['Ethereum', 'Bitcoin', 'Solana']) {
  const wallet = await walletService.createWallet({
    network,
    name: `${network} Wallet`,
    tags: ['multi-chain', network.toLowerCase()]
  });
}
```

### Wallet Service Features
- **Complete CRUD Operations**: Create, read, update, delete wallets across 30+ blockchains
- **User Action Signing**: Required for wallet creation, deletion, and transfers (sensitive operations)
- **Multi-Network Support**: Full support for Ethereum, Bitcoin, Solana, and 27+ other networks
- **Asset Management**: Real-time balance tracking with USD valuation for fungible and non-fungible tokens
- **Transfer Operations**: Native assets, ERC-20 tokens, and NFT transfers with status tracking
- **Enhanced Validation**: Comprehensive input validation for addresses, amounts, and network parameters
- **Database Synchronization**: Optional sync to local Supabase dfns_wallets table
- **Audit Logging**: Complete operation logging for compliance and debugging
- **Tag Management**: Organize wallets with custom tags for better organization
- **Dashboard Ready**: Summary methods perfect for portfolio dashboards and analytics
- **Error Handling**: Detailed error context with custom wallet-specific error types
- **Performance Optimized**: Efficient pagination and batch operations for large wallet portfolios

## Transaction Broadcasting APIs

The implementation now supports complete DFNS Transaction Broadcasting operations for low-level blockchain transaction construction and broadcasting across 9+ blockchain networks:

### 1. Generic Transaction Broadcasting

#### Raw Hex Transaction Broadcasting
```typescript
// Broadcast any pre-signed transaction hex to blockchain
const transactionService = dfnsService.getTransactionService();

// Generic transaction broadcasting (most flexible)
const txResponse = await transactionService.broadcastGenericTransaction(
  'wa-xxxx-xxxx-xxxxxxxxxxxxxxxx',
  '0x02f86e83aa36a7850d...', // Raw signed transaction hex
  {
    syncToDatabase: true,
    validateBalance: true
  }
);

console.log('Transaction ID:', txResponse.id);
console.log('Status:', txResponse.status);
console.log('TX Hash:', txResponse.txHash);
```

### 2. EVM Transaction Broadcasting

#### High-Level EVM Transactions
```typescript
// DFNS constructs transaction, estimates gas, and broadcasts
const evmTx = await transactionService.broadcastEvmTransaction(
  walletId,
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router
  '1000000000000000000', // 1 ETH value
  '0x7ff36ab500000000...', // Smart contract call data
  {
    estimateGas: true,
    syncToDatabase: true
  }
);
```

#### Smart Contract Deployment
```typescript
// Deploy smart contract with EVM transaction
const contractDeployment = await transactionService.broadcastEvmTransaction(
  walletId,
  '0x0000000000000000000000000000000000000000', // Contract creation address
  '0', // No ETH value
  '0x608060405234801561001057600080fd5b50...', // Contract bytecode
  {
    syncToDatabase: true,
    validateBalance: true
  }
);

console.log('Contract Deployment TX:', contractDeployment.txHash);
```

### 3. EIP-1559 Transactions (Advanced Gas Control)

#### Custom Gas Parameters
```typescript
// Precise gas control for DeFi operations
const eip1559Tx = await transactionService.broadcastEip1559Transaction(
  walletId,
  '0x1f98431c8ad98523631ae4a59f267346ea31f984', // Uniswap V3 Factory
  '0', // No ETH value
  '0xa167f02200000000...', // createPool function call
  '500000', // Gas limit
  '30000000000', // Max fee per gas (30 gwei)
  '2000000000', // Max priority fee (2 gwei)
  undefined, // Let DFNS handle nonce
  {
    estimateGas: false, // Use custom gas settings
    syncToDatabase: true
  }
);
```

### 4. Bitcoin PSBT Broadcasting

#### Bitcoin and Litecoin Transactions
```typescript
// Broadcast Bitcoin PSBT transaction
const bitcoinTx = await transactionService.broadcastBitcoinTransaction(
  bitcoinWalletId,
  '0x70736274ff0100...', // PSBT hex data
  {
    waitForConfirmation: true,
    syncToDatabase: true
  }
);

console.log('Bitcoin TX Hash:', bitcoinTx.txHash);
console.log('Confirmations needed:', DfnsTransactionService.getConfirmationBlocks('Bitcoin'));
```

### 5. Solana Transaction Broadcasting

#### Solana Network Operations
```typescript
// Broadcast Solana transaction
const solanaTx = await transactionService.broadcastSolanaTransaction(
  solanaWalletId,
  '0x01000103c8d842a2...', // Solana transaction hex
  {
    syncToDatabase: true,
    autoRetry: true,
    retryAttempts: 3
  }
);
```

### 6. Transaction Management

#### Get Transaction Status
```typescript
// Get individual transaction request
const transaction = await transactionService.getTransactionRequest(
  walletId,
  'tx-yyyy-yyyy-yyyyyyyyyyyyyyyy'
);

console.log('Transaction Status:', transaction.status);
console.log('Network:', transaction.network);
console.log('Fee:', transaction.fee);
```

#### List Transaction History
```typescript
// List all transaction requests for wallet
const allTransactions = await transactionService.getAllTransactionRequests(walletId);

// Filter transactions by status
const pendingTxs = await transactionService.getPendingTransactions(walletId);
const failedTxs = await transactionService.getFailedTransactions(walletId);

console.log(`Total transactions: ${allTransactions.length}`);
console.log(`Pending: ${pendingTxs.length}`);
console.log(`Failed: ${failedTxs.length}`);
```

### 7. Dashboard and Analytics

#### Transaction Summaries
```typescript
// Get transaction summaries for dashboard
const summaries = await transactionService.getTransactionsSummary(walletId);

summaries.forEach(tx => {
  console.log(`${tx.kind} transaction on ${tx.network}`);
  console.log(`Status: ${tx.status}`);
  console.log(`Fee: ${tx.fee} ${DfnsTransactionService.getFeeTokenSymbol(tx.network)}`);
  console.log(`Completed: ${tx.isCompleted}`);
  console.log(`Pending: ${tx.isPending}`);
  console.log('---');
});
```

### 8. Network Utilities

#### Network Capabilities Detection
```typescript
// Check network support for specific features
const supportsEip1559 = DfnsTransactionService.supportsEip1559('Ethereum'); // true
const supportsUserOps = DfnsTransactionService.supportsUserOperations('Polygon'); // true

// Get network information
const supportedKinds = transactionService.getSupportedTransactionKinds('Ethereum');
// Returns: ['Transaction', 'Evm', 'Eip1559', 'UserOperation']

const requiresUserAction = transactionService.requiresUserActionSigning('Bitcoin');
// Returns: true (all transactions require User Action Signing)

const feeToken = DfnsTransactionService.getFeeTokenSymbol('Arbitrum');
// Returns: 'ETH'
```

### Transaction Service Features
- **Complete Network Support**: 9 major blockchain networks (Ethereum, Bitcoin, Solana, Polygon, Arbitrum, Optimism, Base, Avalanche, Binance)
- **User Action Signing**: Required for all transaction broadcasting (enterprise security compliance)
- **Multiple Transaction Types**: Generic hex, EVM templates, EIP-1559, Bitcoin PSBT, Solana instructions
- **Smart Contract Support**: Deploy contracts, call functions, complex DeFi interactions
- **Advanced Gas Control**: EIP-1559 support with custom gas parameters for optimal fee management
- **Transaction Monitoring**: Real-time status tracking, pending/failed transaction detection
- **Dashboard Integration**: Transaction summaries and analytics for portfolio management
- **Network Validation**: Comprehensive input validation for each blockchain's requirements
- **Error Handling**: Detailed error context with custom transaction-specific error types
- **Database Synchronization**: Optional sync to local Supabase dfns_transaction_requests table
- **Performance Optimized**: Efficient pagination and batch operations for transaction history

## WebAuthn Support

The integration includes full WebAuthn support for:
- Credential registration during user onboarding
- Authentication for login
- User action signing for sensitive operations

WebAuthn configuration includes:
- Platform and cross-platform authenticators
- Required user verification
- Resident key support
- Direct attestation

## Error Handling

Comprehensive error handling with custom error classes:
- `DfnsAuthenticationError`: Authentication-related errors
- `DfnsAuthorizationError`: Permission and policy errors
- `DfnsValidationError`: Input validation errors
- `DfnsWalletError`: Wallet operation errors
- `DfnsTransactionError`: Transaction processing errors
- `DfnsNetworkError`: Network connectivity errors
- `DfnsRateLimitError`: API rate limiting errors

## Security Considerations

- All sensitive operations require user action signatures
- Credentials are stored securely in browser localStorage
- Automatic token refresh with proper session management
- WebAuthn for secure authentication without passwords
- Service account delegation for backend operations

## Integration Status

- ✅ **Types**: Complete with all authentication and user management API types
- ✅ **Infrastructure**: Core implementation complete
- ✅ **Authentication**: 100% COMPLETE - All auth flows implemented
  - ✅ **Registration APIs**: All 5 DFNS registration endpoints (100% complete)
    - Delegated registration
    - Standard registration with codes
    - End user registration with wallets
    - Social registration (OAuth/OIDC)
    - Registration code management
  - ✅ **Login APIs**: All 6 DFNS login endpoints (100% complete)
    - Standard login flow (init + complete)
    - Social login with OAuth providers
    - Delegated login for service accounts
    - Send login code for PasswordProtectedKey users
    - Proper logout with session invalidation
- ✅ **User Action Signing**: Complete implementation with API integration
- ✅ **User Management**: 100% COMPLETE - All user management APIs implemented
  - ✅ **List Users**: GET /auth/users with pagination support
  - ✅ **Create User**: POST /auth/users for CustomerEmployee creation
  - ✅ **Get User**: GET /auth/users/{userId} for individual user retrieval
  - ✅ **Activate User**: PUT /auth/users/{userId}/activate for user reactivation
  - ✅ **Deactivate User**: PUT /auth/users/{userId}/deactivate for user suspension
  - ✅ **Archive User**: DELETE /auth/users/{userId} for soft user deletion
- ✅ **Service Account Management**: 100% COMPLETE - All service account APIs implemented
  - ✅ **List Service Accounts**: GET /auth/service-accounts with pagination support
  - ✅ **Create Service Account**: POST /auth/service-accounts for machine user creation
  - ✅ **Get Service Account**: GET /auth/service-accounts/{serviceAccountId} for individual service account retrieval
  - ✅ **Update Service Account**: PUT /auth/service-accounts/{serviceAccountId} for service account updates
  - ✅ **Activate Service Account**: PUT /auth/service-accounts/{serviceAccountId}/activate for service account activation
  - ✅ **Deactivate Service Account**: PUT /auth/service-accounts/{serviceAccountId}/deactivate for service account suspension
  - ✅ **Archive Service Account**: DELETE /auth/service-accounts/{serviceAccountId} for soft service account deletion
- ✅ **Personal Access Token Management**: 100% COMPLETE - All personal access token APIs implemented
  - ✅ **List Personal Access Tokens**: GET /auth/pats with user-scoped tokens
  - ✅ **Create Personal Access Token**: POST /auth/pats with User Action Signing support
  - ✅ **Get Personal Access Token**: GET /auth/pats/{tokenId} for individual token retrieval
  - ✅ **Update Personal Access Token**: PUT /auth/pats/{tokenId} for token name/external ID updates
  - ✅ **Activate Personal Access Token**: PUT /auth/pats/{tokenId}/activate for token activation
  - ✅ **Deactivate Personal Access Token**: PUT /auth/pats/{tokenId}/deactivate for token suspension
  - ✅ **Archive Personal Access Token**: DELETE /auth/pats/{tokenId} for soft token deletion
- ✅ **Credential Management**: 100% COMPLETE - All credential management APIs implemented (7/7 endpoints)
  - ✅ **Regular Flow**:
    - ✅ **Initiate Credential Challenge**: POST /auth/credentials/init for credential creation challenges
    - ✅ **Create Credential**: POST /auth/credentials with User Action Signing support
  - ✅ **Code-Based Flow** (NEW):
    - ✅ **Initiate Credential Challenge With Code**: POST /auth/credentials/code/init for code-based challenges
    - ✅ **Create Credential With Code**: POST /auth/credentials/code/verify (no User Action Signing required)
  - ✅ **Management Operations**:
    - ✅ **List User Credentials**: GET /auth/credentials for user's credentials
    - ✅ **Activate Credential**: PUT /auth/credentials/activate for credential activation
    - ✅ **Deactivate Credential**: PUT /auth/credentials/deactivate for credential suspension
- ✅ **User Recovery**: 100% COMPLETE - All user recovery APIs implemented (4/4 endpoints)
  - ✅ **Send Recovery Code Email**: PUT /auth/recover/user/code for sending verification codes
  - ✅ **Create Recovery Challenge**: POST /auth/recover/user/init for standard recovery flow
  - ✅ **Create Delegated Recovery Challenge**: POST /auth/recover/user/delegated for service account recovery
  - ✅ **Recover User**: POST /auth/recover/user for completing recovery with new credentials
- ✅ **Wallet Management**: 100% COMPLETE - All wallet management APIs implemented (13/14 endpoints)
  - ✅ **Core Wallet Management** (5/5 endpoints):
    - ✅ **Create Wallet**: POST /wallets with User Action Signing support
    - ✅ **Update Wallet**: PUT /wallets/{walletId} for wallet name updates
    - ✅ **Delete Wallet**: DELETE /wallets/{walletId} with User Action Signing support
    - ✅ **Get Wallet**: GET /wallets/{walletId} for individual wallet retrieval
    - ✅ **List Wallets**: GET /wallets with enhanced filtering and pagination
  - ✅ **Wallet Asset Management** (3/3 endpoints):
    - ✅ **Get Wallet Assets**: GET /wallets/{walletId}/assets with USD valuation support
    - ✅ **Get Wallet NFTs**: GET /wallets/{walletId}/nfts for NFT collection display
    - ✅ **Get Wallet History**: GET /wallets/{walletId}/history for transaction tracking
  - ✅ **Wallet Tagging** (2/2 endpoints):
    - ✅ **Add Wallet Tags**: POST /wallets/{walletId}/tags for wallet organization
    - ✅ **Delete Wallet Tags**: DELETE /wallets/{walletId}/tags for tag management
  - ✅ **Transfer Operations** (3/3 endpoints):
    - ✅ **Transfer Asset**: POST /wallets/{walletId}/transfers with User Action Signing support
    - ✅ **Get Transfer Request**: GET /wallets/{walletId}/transfers/{transferId} for transfer tracking
    - ✅ **List Transfer Requests**: GET /wallets/{walletId}/transfers for transfer history
  - ⚠️ **Legacy Operations** (1/1 endpoint - DEPRECATED):
    - ✅ **Delegate Wallet**: POST /wallets/{walletId}/delegate (DEPRECATED - use Delegate Key instead)
- ✅ **Transaction Broadcasting**: 100% COMPLETE - All transaction broadcasting APIs implemented (7/7 endpoints)
  - ✅ **Core Transaction Broadcasting** (3/3 endpoints):
    - ✅ **Broadcast Transaction**: POST /wallets/{walletId}/transactions with User Action Signing support
    - ✅ **Get Transaction Request**: GET /wallets/{walletId}/transactions/{transactionId} for transaction tracking
    - ✅ **List Transaction Requests**: GET /wallets/{walletId}/transactions for transaction history
  - ✅ **Network-Specific Broadcasting** (4/4 specialized implementations):
    - ✅ **Generic Transaction**: Raw hex transaction broadcasting for all networks
    - ✅ **EVM Transactions**: Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, Binance support
    - ✅ **EIP-1559 Transactions**: Custom gas parameter control for supported networks
    - ✅ **Bitcoin PSBT**: Bitcoin and Litecoin PSBT transaction broadcasting
    - ✅ **Solana Transactions**: Solana network transaction broadcasting
- 🔄 **Fiat**: Planned (on/off-ramp integration)
- 🔄 **Components**: Planned (React UI components)

## Next Steps

1. Complete wallet service implementation
2. Implement transaction service
3. Add fiat service integration
4. Create React components for UI
5. Add comprehensive testing
6. Performance optimization
7. Production deployment configuration
