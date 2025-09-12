# DFNS Service Account Permission Setup

## Current Issue
Your service account token is **valid** but lacks the `Auth:Creds:Read` permission needed for `/auth/credentials` endpoint access.

## Required DFNS Dashboard Actions

### 1. Login to DFNS Dashboard
- Navigate to: https://app.dfns.co
- Go to: Organizations → Your Organization → Service Accounts
- Find service account: **CC2** (`us-112m9-gjevc-9lmokcjv8rgg8tt4`)

### 2. Create Permission Set
Create a new permission called "Service Account API Access" with these operations:

**Essential Operations:**
```
Auth:Creds:Read          # Access credential information  
Auth:Creds:Create        # Create new credentials
Auth:Creds:Update        # Update credentials
Wallets:Read             # Read wallet data
Wallets:Create           # Create wallets
Wallets:Update           # Update wallets
Balances:Read            # Read wallet balances
Auth:Action:Sign         # Sign user actions
Auth:Users:Read          # Read user information
```

**Full Admin Access (if needed):**
```
All operations available   # For comprehensive access
```

### 3. Assign Permission to Service Account
- Select your service account **CC2**
- Assign the newly created permission set
- Save changes

## Alternative: Use Personal Access Token
If service account permissions can't be modified, use your PAT as fallback:

**Current PAT token is configured in .env:**
```
VITE_DFNS_PERSONAL_ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSJ9...
```

## Verification Steps
After permission assignment:
1. Restart your application
2. Check console - should see clean DFNS initialization
3. Verify access to credential endpoints works

## Code Already Handles This
The working-client.ts fallback logic will automatically use PAT if service account fails:

1. **Try Service Account Token** (preferred)
2. **Fallback to Service Account Key** (if configured)  
3. **Fallback to Personal Access Token** (backup)
4. **Fallback to Legacy Key** (last resort)

## Expected Behavior After Fix
```
✅ DFNS service initialized successfully using SERVICE_ACCOUNT_TOKEN
📊 Connected with X wallets
🔐 Authentication Status: authenticated
```

## Root Cause
DFNS service accounts get **NO permissions by default** - they must be explicitly assigned via the dashboard or API. This is security by design.
