# DFNS Environment Configuration Guide

## Required Environment Variables

Add these to your `.env` file in the frontend directory:

```bash
# DFNS Core Configuration
VITE_DFNS_BASE_URL=https://api.dfns.ninja
VITE_DFNS_APP_ID=your_dfns_app_id_here

# Service Account Authentication (Required for server-side operations)
VITE_DFNS_SERVICE_ACCOUNT_ID=your_service_account_id_here
VITE_DFNS_SERVICE_ACCOUNT_PRIVATE_KEY=your_service_account_private_key_here

# Environment
VITE_DFNS_ENVIRONMENT=sandbox  # or "production"

# WebAuthn Configuration
VITE_DFNS_RP_ID=localhost  # or your domain in production
VITE_DFNS_ORIGIN=http://localhost:3000  # or your frontend URL

# Optional Configuration
VITE_DFNS_TIMEOUT=30000
VITE_DFNS_MAX_RETRIES=3
VITE_DFNS_ENABLE_DEBUG_LOGGING=true
VITE_DFNS_ENABLE_REQUEST_LOGGING=true

# Feature Flags
VITE_DFNS_ENABLE_WEBHOOKS=true
VITE_DFNS_ENABLE_POLICY_ENGINE=true
VITE_DFNS_ENABLE_STAKING=true
VITE_DFNS_ENABLE_EXCHANGE_INTEGRATION=false

# SDK Configuration
VITE_DFNS_USE_SDK=true
VITE_DFNS_ENABLE_FALLBACK=false
VITE_DFNS_LOG_TRANSITIONS=true
```

## Getting DFNS Credentials

### 1. Create DFNS Application
1. Go to [DFNS Console](https://console.dfns.ninja)
2. Create a new Application
3. Note the App ID

### 2. Create Service Account
1. In DFNS Console, go to Service Accounts
2. Create a new Service Account
3. Download the private key
4. Note the Service Account ID

### 3. Set Permissions
Ensure your service account has the following permissions:
- `Wallets:Create`
- `Wallets:Read`
- `Wallets:TransferAsset`
- `Keys:Create`
- `Keys:Read`
- `Keys:GenerateSignature`
- `Policies:Read`
- `Users:Read`

## Environment Setup Steps

1. **Copy environment template**:
   ```bash
   cp .env.example .env.local
   ```

2. **Update with your DFNS credentials**:
   ```bash
   # Edit .env.local with your actual DFNS credentials
   nano .env.local
   ```

3. **Verify configuration**:
   ```bash
   npm run dev
   # Check browser console for DFNS configuration validation
   ```

## Testing Configuration

Create a simple test file to verify your setup:

```typescript
// test-dfns-config.ts
import { DFNS_CONFIG } from './src/infrastructure/dfns/config';

console.log('DFNS Configuration Test:');
console.log('App ID:', DFNS_CONFIG.appId ? '✅ Set' : '❌ Missing');
console.log('Base URL:', DFNS_CONFIG.baseUrl);
console.log('Service Account ID:', DFNS_CONFIG.serviceAccountId ? '✅ Set' : '❌ Missing');
console.log('Private Key:', DFNS_CONFIG.serviceAccountPrivateKey ? '✅ Set' : '❌ Missing');
```

## Security Notes

1. **Never commit private keys** to version control
2. **Use different credentials** for development and production
3. **Rotate service account keys** regularly
4. **Use environment-specific configurations**

## Production Setup

For production, update:
```bash
VITE_DFNS_ENVIRONMENT=production
VITE_DFNS_BASE_URL=https://api.dfns.co
VITE_DFNS_RP_ID=yourdomain.com
VITE_DFNS_ORIGIN=https://yourdomain.com
VITE_DFNS_ENABLE_DEBUG_LOGGING=false
VITE_DFNS_ENABLE_REQUEST_LOGGING=false
```
