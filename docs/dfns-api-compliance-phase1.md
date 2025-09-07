# DFNS API Compliance - Phase 1: Cross-Device Implementation

## Missing Cross-Device API Methods

Add these methods to `DfnsCredentialManager` class:

### 1. Create Credential Code (POST /auth/credentials/code)

```typescript
/**
 * Create one-time code for cross-device credential creation
 * POST /auth/credentials/code
 */
async createCredentialCode(expiration: string): Promise<CreateCredentialCodeResponse> {
  if (!this.authenticator.isAuthenticated()) {
    throw new Error('Authentication required to create credential code');
  }

  const userActionSignature = await this.authenticator.signUserAction(
    'POST',
    '/auth/credentials/code'
  );

  const response = await fetch(`${this.config.baseUrl}/auth/credentials/code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authenticator.getAccessToken()}`,
      'X-DFNS-APPID': this.config.appId,
      'X-DFNS-USERACTION': this.base64UrlEncode(JSON.stringify(userActionSignature))
    },
    body: JSON.stringify({ expiration })
  });

  if (!response.ok) {
    throw new Error(`Failed to create credential code: ${response.statusText}`);
  }

  return await response.json();
}
```

### 2. Create Credential Challenge With Code (POST /auth/credentials/code/init)

```typescript
/**
 * Create credential challenge using one-time code
 * POST /auth/credentials/code/init
 */
async createCredentialChallengeWithCode(
  code: string,
  credentialKind: DfnsCredentialKind
): Promise<SigningChallenge> {
  const response = await fetch(`${this.config.baseUrl}/auth/credentials/code/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DFNS-APPID': this.config.appId
    },
    body: JSON.stringify({
      code: code,
      credentialKind: credentialKind
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create credential challenge with code: ${response.statusText}`);
  }

  return await response.json();
}
```

### 3. Create Credential With Code (POST /auth/credentials/code/verify)

```typescript
/**
 * Create credential using one-time code (no authentication required)
 * POST /auth/credentials/code/verify
 */
async createCredentialWithCode(
  challengeIdentifier: string,
  credentialName: string,
  credentialKind: DfnsCredentialKind,
  credentialInfo: any,
  encryptedPrivateKey?: string
): Promise<DfnsCredentialInfo> {
  const requestBody: any = {
    challengeIdentifier,
    credentialName,
    credentialKind,
    credentialInfo
  };

  if (encryptedPrivateKey) {
    requestBody.encryptedPrivateKey = encryptedPrivateKey;
  }

  const response = await fetch(`${this.config.baseUrl}/auth/credentials/code/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DFNS-APPID': this.config.appId
      // Note: No Authorization or User Action headers required
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Failed to create credential with code: ${response.statusText}`);
  }

  return await response.json();
}
```

## Required Interface Updates

```typescript
interface CreateCredentialCodeRequest {
  expiration: string; // ISO-8601 Date or Unix epoch, max 1 minute in future
}

interface CreateCredentialCodeResponse {
  code: string;       // e.g., "A7U-KY6-9PT"
  expiration: string;
}

interface CreateCredentialChallengeWithCodeRequest {
  code: string;           // From previous endpoint
  credentialKind: "Fido2" | "Key" | "PasswordProtectedKey" | "RecoveryKey";
}
```

## Implementation Files to Update

- `/frontend/src/infrastructure/dfns/credential-manager.ts` - Add ~150 lines of new methods
- `/frontend/src/types/dfns/core.ts` - Update credential interfaces  
- `/frontend/src/components/dfns/DfnsDelegatedAuthentication.tsx` - Add cross-device UI flow

## Testing Priority

1. **Unit tests** for each new API method
2. **Integration tests** with DFNS sandbox environment  
3. **Cross-device flow testing** between desktop/mobile

## Security Notes

- One-time codes expire in **maximum 1 minute**
- Codes are **single-use only**
- Code flow requires **no authentication** on target device (by design)
- Include proper UX warnings about security implications
