# DFNS User Action Signing Implementation Guide

## 🎯 **Your Current Status**

✅ **Authentication**: Service Account and PAT tokens working  
❌ **User Action Signing**: Missing cryptographic credentials for signing challenges  

## 🔐 **What You Need for User Action Signing**

DFNS requires **2-factor authentication** for all sensitive operations:

1. **✅ Bearer Token** - You have this (Service Account/PAT)
2. **❌ Cryptographic Credentials** - You need this for signing

## 🚀 **Quick Start: WebAuthn/Passkeys (Recommended)**

### Step 1: Initialize WebAuthn Service

```typescript
import { DfnsWebAuthnService } from './services/dfns/dfnsWebAuthnService';

// Get your existing services
const dfnsService = await initializeDfnsService();
const credentialService = dfnsService.getCredentialService();
const userActionService = dfnsService.getUserActionSigningService();

// Create WebAuthn service
const webauthnService = new DfnsWebAuthnService(credentialService, userActionService);
```

### Step 2: Check WebAuthn Support

```typescript
// Check if your device/browser supports passkeys
const status = await webauthnService.getWebAuthnStatus();

console.log('WebAuthn supported:', status.supported);
console.log('Platform authenticator:', status.platformAuthenticator);
console.log('Existing credentials:', status.credentials.length);
console.log('Can sign:', status.canSign);
```

### Step 3: Create Your First Passkey

```typescript
if (!status.canSign) {
  try {
    // This will prompt for Touch ID/Face ID/Windows Hello
    const credential = await webauthnService.createPasskeyCredential('My DFNS Device');
    
    console.log('✅ Passkey created!', credential.id);
    console.log('🎉 You can now perform User Action Signing!');
    
  } catch (error) {
    console.error('❌ Failed to create passkey:', error.message);
  }
}
```

### Step 4: Use User Action Signing

```typescript
// Now you can perform sensitive operations that require User Action Signing
const walletData = {
  name: 'My New Wallet',
  network: 'Ethereum'
};

try {
  // This will prompt for biometric verification
  const userActionToken = await webauthnService.signUserActionWithPasskey(
    JSON.stringify(walletData),
    'POST',
    '/wallets'
  );
  
  // Use the signed token for the actual API call
  const workingClient = dfnsService.getWorkingClient();
  const wallet = await workingClient.createWallet(walletData, userActionToken);
  
  console.log('✅ Wallet created successfully!', wallet.id);
  
} catch (error) {
  console.error('❌ Failed to create wallet:', error.message);
}
```

## 🔧 **Alternative: Key Credentials (For Automation)**

### Step 1: Initialize Key Credential Service

```typescript
import { DfnsKeyCredentialService } from './services/dfns/dfnsKeyCredentialService';

const keyCredentialService = new DfnsKeyCredentialService(credentialService, userActionService);
```

### Step 2: Generate and Register Key Credential

```typescript
// Generate a new keypair and register with DFNS
const { credential, privateKey, publicKey } = await keyCredentialService.createKeyCredential(
  'My Service Account Key',
  'Ed25519' // or 'ECDSA'
);

console.log('✅ Key credential created:', credential.id);

// IMPORTANT: Store private key securely!
const storage = keyCredentialService.storePrivateKeySecurely(credential.id, privateKey);
console.log('🔒 Private key storage:', storage.storageMethod);
console.log('⚠️ WARNING:', storage.warning);
```

### Step 3: Use Key Credential for Signing

```typescript
// Retrieve stored private key
const storedPrivateKey = keyCredentialService.retrievePrivateKey(credential.id);

if (storedPrivateKey) {
  // Sign User Action with private key
  const userActionToken = await keyCredentialService.signUserActionWithKey(
    JSON.stringify(walletData),
    'POST',
    '/wallets',
    storedPrivateKey,
    credential.id,
    'EDDSA' // or 'ECDSA'
  );
  
  // Use signed token for API call
  const wallet = await workingClient.createWallet(walletData, userActionToken);
  console.log('✅ Wallet created with key credential!', wallet.id);
}
```

## 🎯 **Which Option Should You Choose?**

### **WebAuthn/Passkeys** (Recommended for most use cases)
- ✅ **More Secure**: Private keys never leave your device
- ✅ **Better UX**: Biometric authentication (Touch ID, Face ID)
- ✅ **No Key Management**: No private keys to store/manage
- ✅ **Multi-Device**: Can create passkeys on multiple devices
- ❌ **User Present**: Requires user interaction for each signing

### **Key Credentials** (For automation/service accounts)
- ✅ **Automation**: Can sign without user interaction
- ✅ **Server-Side**: Works in headless environments
- ✅ **Programmatic**: Full control over signing process
- ❌ **Key Management**: Must securely store private keys
- ❌ **Security Risk**: Private keys could be compromised

## 🔍 **Testing Your Implementation**

### Test WebAuthn Setup

```typescript
// Test end-to-end WebAuthn signing
const webauthnTest = await webauthnService.testWebAuthnSigning();

if (webauthnTest.success) {
  console.log('✅ WebAuthn signing works!');
  console.log('🔑 Used credential:', webauthnTest.credentialId);
} else {
  console.log('❌ WebAuthn test failed:', webauthnTest.error);
}
```

### Test Key Credential Setup

```typescript
// Test end-to-end key credential signing
const keyTest = await keyCredentialService.testKeyCredentialSigning(
  privateKey,
  credentialId,
  'EDDSA'
);

if (keyTest.success) {
  console.log('✅ Key credential signing works!');
} else {
  console.log('❌ Key credential test failed:', keyTest.error);
}
```

## 🛠️ **Integration with Your Existing Code**

### Update Your dfnsService.ts

```typescript
import { DfnsWebAuthnService } from './dfnsWebAuthnService';
import { DfnsKeyCredentialService } from './dfnsKeyCredentialService';

export class DfnsService {
  // ... existing code ...
  
  private webauthnService?: DfnsWebAuthnService;
  private keyCredentialService?: DfnsKeyCredentialService;

  constructor() {
    // ... existing initialization ...
    
    // Initialize new services
    this.webauthnService = new DfnsWebAuthnService(
      this.credentialService,
      this.userActionSigningService
    );
    
    this.keyCredentialService = new DfnsKeyCredentialService(
      this.credentialService,
      this.userActionSigningService
    );
  }

  public getWebAuthnService(): DfnsWebAuthnService {
    if (!this.webauthnService) {
      throw new Error('WebAuthn service not initialized');
    }
    return this.webauthnService;
  }

  public getKeyCredentialService(): DfnsKeyCredentialService {
    if (!this.keyCredentialService) {
      throw new Error('Key credential service not initialized');
    }
    return this.keyCredentialService;
  }

  // Convenience method for User Action Signing
  public async signUserAction(
    payload: any,
    method: string,
    path: string,
    useWebAuthn: boolean = true
  ): Promise<string> {
    if (useWebAuthn) {
      return this.webauthnService!.signUserActionWithPasskey(
        JSON.stringify(payload),
        method,
        path
      );
    } else {
      // Implement key-based signing with stored credentials
      throw new Error('Key-based signing requires credential setup');
    }
  }
}
```

## 🚨 **Important Security Considerations**

### For WebAuthn/Passkeys:
- ✅ **HTTPS Required**: WebAuthn only works over HTTPS
- ✅ **Domain Binding**: Passkeys are tied to your domain
- ✅ **User Verification**: Always requires biometric/PIN
- ✅ **Device Storage**: Private keys never leave the device

### For Key Credentials:
- 🔒 **Secure Storage**: Use HSM, Key Vault, or encrypted storage
- 🔒 **Key Rotation**: Regularly rotate private keys
- 🔒 **Access Control**: Limit who can access private keys
- 🔒 **Audit Logging**: Log all private key usage

## 📋 **What Operations Require User Action Signing**

### ✅ **Available Without Signing** (Read-Only):
```typescript
// These work with just your Service Account/PAT tokens:
const wallets = await workingClient.listWallets();
const wallet = await workingClient.getWallet('wallet-id');
const assets = await workingClient.getWalletAssets('wallet-id');
const history = await workingClient.getWalletHistory('wallet-id');
const credentials = await credentialService.listCredentials();
```

### 🔐 **Require User Action Signing** (Sensitive Operations):
```typescript
// These need cryptographic signing:
const wallet = await workingClient.createWallet(data, userActionToken);
const transfer = await workingClient.transferAsset(data, userActionToken);
const transaction = await workingClient.broadcastTransaction(data, userActionToken);
const credential = await credentialService.createCredential(data, userActionToken);
const policy = await policyService.createPolicy(data, userActionToken);
```

## 🎉 **Next Steps**

1. **Choose your approach**: WebAuthn (recommended) or Key Credentials
2. **Test on a simple operation**: Try creating a passkey first
3. **Implement in your UI**: Add User Action Signing to wallet creation
4. **Add error handling**: Handle user cancellation and errors gracefully
5. **Scale to all operations**: Apply to transfers, policy management, etc.

## 🔧 **Troubleshooting**

### Common Issues:

1. **"WebAuthn not supported"**
   - Ensure you're using HTTPS
   - Check browser compatibility
   - Try on a different device

2. **"No signing credentials"**
   - Create a passkey first using `createPasskeyCredential()`
   - Or generate key credentials using `createKeyCredential()`

3. **"User Action Signing failed"**
   - Check if credential is active
   - Ensure challenge format is correct
   - Verify private key matches registered public key

4. **"Authentication failed"**
   - Verify Service Account/PAT token is valid
   - Check token has proper permissions
   - Ensure correct DFNS organization ID

---

**Status**: ✅ Ready to implement User Action Signing  
**Recommendation**: Start with WebAuthn/Passkeys for maximum security  
**Next Action**: Run the WebAuthn setup code in your application
