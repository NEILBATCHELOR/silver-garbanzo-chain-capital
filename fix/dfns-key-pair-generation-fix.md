# DFNS Key Pair Generation & Authentication Fix

## 🎯 **Problem Solved**

Your DFNS Personal Access Token (PAT) is not working properly. To regenerate it or create proper service account authentication, you need cryptographic key pairs that DFNS can verify.

This implementation provides **complete key pair generation** following DFNS specifications for API authentication.

## 🔑 **What This Implements**

Based on DFNS documentation: https://docs.dfns.co/d/advanced-topics/authentication/credentials/generate-a-key-pair

### Key Algorithms (DFNS Recommended)
- **ECDSA**: `secp256r1` (prime256v1) curve
- **EDDSA**: `Ed25519` curve ⭐ **DFNS Recommended**  
- **RSA**: 3072 bits

### Features Implemented
- ✅ **Web Crypto API** key generation (browser-compatible)
- ✅ **PEM Format** export (DFNS required format)
- ✅ **ASN.1/DER Signatures** (DFNS requirement for ECDSA)
- ✅ **Base64Url Encoding** (DFNS authentication format)
- ✅ **Authentication Headers** generation for DFNS API
- ✅ **Both PAT and Key-based** authentication support

## 📁 **Files Created**

1. **`/frontend/src/infrastructure/dfns/key-pair-generator.ts`**
   - Core key pair generation classes
   - DFNS authentication utilities
   - Signature creation and formatting

2. **`/frontend/src/infrastructure/dfns/working-client.ts`** (Enhanced)
   - Updated to support both PAT and key-based authentication
   - Methods for credential creation and management

3. **`/frontend/dfns-key-generator.html`**
   - Browser-based key generation tool
   - Simple UI for creating DFNS credentials

4. **`/frontend/test-key-pair-generation.ts`**
   - Test script for key pair generation functionality

## 🚀 **How to Fix Your DFNS Authentication**

### Step 1: Generate Key Pair

**Option A: Use Browser Tool**
```bash
# Open in your browser
open /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/dfns-key-generator.html
```

**Option B: Use TypeScript (in browser console)**
```typescript
// Load the test script and run:
testKeyPairGeneration();
// or generate specifically for credentials:
generateDfnsCredentialKeys();
```

### Step 2: Create DFNS Credential

1. Copy the **Public Key** from the generated output
2. Go to [DFNS Dashboard](https://dashboard.dfns.co) → Credentials
3. Create new credential with:
   - **Name**: "My API Credential" (or similar)
   - **Type**: Key-based credential
   - **Public Key**: Paste the generated public key
   - **Algorithm**: EDDSA (Ed25519) - recommended

### Step 3: Generate New PAT

1. In DFNS Dashboard → Personal Access Tokens
2. Create new PAT using your new credential
3. Copy the new PAT token

### Step 4: Update Environment Variables

Update your `/frontend/.env`:

```bash
# Your new credentials
VITE_DFNS_PERSONAL_ACCESS_TOKEN=your_new_pat_token_here
VITE_DFNS_CREDENTIAL_ID=your_new_credential_id
VITE_DFNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
VITE_DFNS_ALGORITHM=EDDSA
```

### Step 5: Test Authentication

```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend
npm run dev
```

Navigate to: `http://localhost:5173/wallet/dfns/dashboard`

Check console for: "✅ DFNS API Success (PAT): GET /auth/credentials"

## 🔧 **Using Key-Based Authentication**

If you prefer key-based authentication instead of PAT:

```typescript
import { createKeyBasedDfnsClient } from '@/infrastructure/dfns/working-client';

// Create client with generated keys
const client = createKeyBasedDfnsClient(
  'your-credential-id',
  'your-private-key-pem',
  'EDDSA'
);

// Test connection
const status = await client.getConnectionStatus();
console.log('Auth method:', status.authMethod); // 'KEY'
```

## 📋 **Key Generation Details**

### EDDSA (Ed25519) - Recommended
```typescript
const keys = await DfnsKeyPairGenerator.generateEDDSAKeyPair();
// Returns: { publicKey, privateKey, algorithm: 'EDDSA', curve: 'Ed25519' }
```

### ECDSA (secp256r1)
```typescript
const keys = await DfnsKeyPairGenerator.generateECDSAKeyPair();
// Returns: { publicKey, privateKey, algorithm: 'ECDSA', curve: 'secp256r1' }
```

### RSA (3072 bits)
```typescript
const keys = await DfnsKeyPairGenerator.generateRSAKeyPair();
// Returns: { publicKey, privateKey, algorithm: 'RSA' }
```

## 🔐 **Authentication Flow**

### PAT Authentication (Current)
```
Request Headers:
Authorization: Bearer <PAT_TOKEN>
```

### Key-Based Authentication (New Option)
```
Request Headers:
X-DFNS-APPID: <APP_ID>
X-DFNS-USERID: <USER_ID>  
X-DFNS-CREDID: <CREDENTIAL_ID>
X-DFNS-TIMESTAMP: <UNIX_TIMESTAMP>
X-DFNS-SIGNATURE: <BASE64URL_SIGNATURE>
```

## ⚠️ **Security Notes**

1. **Private Keys**: Never share or commit private keys to version control
2. **Key Storage**: Store private keys securely (environment variables, key management systems)
3. **PAT Expiry**: Monitor PAT expiration dates and renew before expiry
4. **Algorithm Choice**: EDDSA (Ed25519) is DFNS recommended for performance and security

## 🧪 **Testing**

### Browser Console Testing
```javascript
// Test key generation
testKeyPairGeneration();

// Generate keys for DFNS
generateDfnsCredentialKeys();

// Test crypto support
DfnsKeyPairGenerator.checkCryptoSupport();
```

### API Testing
```typescript
// Test with generated keys
const client = new WorkingDfnsClient({
  credentialId: 'your-credential-id',
  privateKeyPem: 'your-private-key',
  algorithm: 'EDDSA'
});

const wallets = await client.listWallets();
console.log('Wallets:', wallets.length);
```

## 🔍 **Troubleshooting**

### "Web Crypto API not available"
- Ensure running in HTTPS or localhost
- Use modern browser (Chrome, Firefox, Safari, Edge)

### "Failed to generate key pair"  
- Check browser compatibility
- Try different algorithm (ECDSA vs EDDSA vs RSA)

### "Authentication failed"
- Verify credential ID matches DFNS dashboard
- Check private key format (PEM with headers/footers)
- Ensure correct algorithm specified

### "Invalid signature"
- Verify timestamp is current (within 30 seconds)
- Check request payload matches signature input
- Ensure ASN.1/DER format for ECDSA signatures

## 📈 **Success Indicators**

- ✅ Key pair generation completes without errors
- ✅ DFNS credential created successfully in dashboard
- ✅ New PAT generated using the credential
- ✅ API requests return `200 OK` instead of `401/403`
- ✅ Dashboard shows real wallet data instead of connection errors
- ✅ Console logs show "✅ DFNS API Success (PAT)" or "✅ DFNS API Success (KEY)"

---

**Status**: ✅ **Ready for Implementation**  
**Next Action**: Open `dfns-key-generator.html` and generate your DFNS credentials  
**Result**: Working DFNS authentication with proper key pairs
