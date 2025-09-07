# DFNS API Compliance - Phase 2: Activation/Deactivation & Interface Updates

## Missing Activation/Deactivation API Methods

Add these methods to `DfnsCredentialManager` class:

### 1. Activate Credential (PUT /auth/credentials/activate)

```typescript
/**
 * Activate credential using standard DFNS API
 * PUT /auth/credentials/activate
 */
async activateCredential(credentialUuid: string): Promise<{ message: string }> {
  if (!this.authenticator.isAuthenticated()) {
    throw new Error('Authentication required to activate credential');
  }

  const response = await fetch(`${this.config.baseUrl}/auth/credentials/activate`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authenticator.getAccessToken()}`,
      'X-DFNS-APPID': this.config.appId
    },
    body: JSON.stringify({ credentialUuid })
  });

  if (!response.ok) {
    throw new Error(`Failed to activate credential: ${response.statusText}`);
  }

  return await response.json();
}
```

### 2. Deactivate Credential (PUT /auth/credentials/deactivate)

```typescript
/**
 * Deactivate credential using standard DFNS API
 * PUT /auth/credentials/deactivate
 */
async deactivateCredential(credentialUuid: string): Promise<{ message: string }> {
  if (!this.authenticator.isAuthenticated()) {
    throw new Error('Authentication required to deactivate credential');
  }

  const response = await fetch(`${this.config.baseUrl}/auth/credentials/deactivate`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authenticator.getAccessToken()}`,
      'X-DFNS-APPID': this.config.appId
    },
    body: JSON.stringify({ credentialUuid })
  });

  if (!response.ok) {
    throw new Error(`Failed to deactivate credential: ${response.statusText}`);
  }

  return await response.json();
}
```

## Interface Updates Required

### Update CredentialInfo Interface

```typescript
// REPLACE current CredentialInfo with DFNS-compliant version:
interface DfnsCredentialInfo {
  credentialId: string;        // Add DFNS credentialId
  credentialUuid: string;      // Add DFNS credentialUuid  
  name?: string;               // Keep existing
  kind: DfnsCredentialKind;    // Keep existing
  isActive: boolean;           // REPLACE status enum with boolean
  publicKey: string;           // Keep existing
  algorithm?: string;          // Keep existing
  dateCreated: string;         // Add ISO date string
  lastUsedAt?: string;         // Keep existing
  enrolledAt?: string;         // Keep existing
  relyingPartyId?: string;     // Add for Fido2 credentials
  origin?: string;             // Add for Fido2 credentials
  attestationType?: string;    // Keep existing
  authenticatorInfo?: AuthenticatorInfo; // Keep existing
  externalId?: string;         // Keep existing
}
```

### Update Activation/Deactivation Request/Response Types

```typescript
interface ActivateCredentialRequest {
  credentialUuid: string; // e.g., "cr-4uc9u-12ij1-9s08327e73jqqcnr"
}

interface DeactivateCredentialRequest {
  credentialUuid: string;
}

interface CredentialActionResponse {
  message: "success";
}
```

## Update listCredentials() Method

Replace current implementation with DFNS-compliant version:

```typescript
/**
 * List all credentials with proper DFNS response handling
 * GET /auth/credentials
 */
async listCredentials(): Promise<DfnsCredentialInfo[]> {
  try {
    if (!this.authenticator.isAuthenticated()) {
      throw new Error('Authentication required to list credentials');
    }

    const response = await fetch(`${this.config.baseUrl}/auth/credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authenticator.getAccessToken()}`,
        'X-DFNS-APPID': this.config.appId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list credentials: ${response.statusText}`);
    }

    const data = await response.json();
    // Handle DFNS standard response format: { items: DfnsCredentialInfo[] }
    return data.items || data.credentials || [];
  } catch (error) {
    throw new Error(`Failed to list credentials: ${(error as Error).message}`);
  }
}
```

## UI Component Updates Required

### Update DfnsAuthentication.tsx

Add activation/deactivation controls:

```typescript
const handleCredentialToggle = async (credential: DfnsCredentialInfo) => {
  try {
    setIsLoading(true);
    
    if (credential.isActive) {
      await credentialManager.deactivateCredential(credential.credentialUuid);
      setMessage(`Credential "${credential.name}" deactivated successfully`);
    } else {
      await credentialManager.activateCredential(credential.credentialUuid);
      setMessage(`Credential "${credential.name}" activated successfully`);
    }
    
    // Refresh credential list
    await loadCredentials();
  } catch (error) {
    setError(`Failed to toggle credential: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

// Add to credential list UI:
<Button
  size="sm"
  variant={credential.isActive ? "destructive" : "default"}
  onClick={() => handleCredentialToggle(credential)}
  disabled={isLoading}
>
  {credential.isActive ? "Deactivate" : "Activate"}
</Button>
```

## Files to Update

1. **`/frontend/src/infrastructure/dfns/credential-manager.ts`**
   - Add activateCredential() method (~20 lines)
   - Add deactivateCredential() method (~20 lines)  
   - Update listCredentials() method (~10 lines)
   - Update CredentialInfo interface (~5 lines)

2. **`/frontend/src/types/dfns/core.ts`**
   - Replace CredentialInfo with DfnsCredentialInfo (~15 lines)
   - Add new request/response interfaces (~10 lines)

3. **`/frontend/src/components/dfns/DfnsAuthentication.tsx`**
   - Add activation/deactivation handler (~25 lines)
   - Update credential list UI (~15 lines)

4. **`/frontend/src/components/dfns/DfnsDelegatedAuthentication.tsx`**
   - Update to use new credential interface (~10 lines)

## Backward Compatibility Strategy

Create adapter functions to support both old and new formats during transition:

```typescript
// Add to credential-manager.ts
private mapLegacyCredential(legacy: CredentialInfo): DfnsCredentialInfo {
  return {
    credentialId: legacy.id, // Map old id to credentialId
    credentialUuid: legacy.id, // Use same value for UUID initially
    name: legacy.name,
    kind: legacy.kind,
    isActive: legacy.status === CredentialStatus.Active,
    publicKey: legacy.publicKey,
    algorithm: legacy.algorithm,
    dateCreated: legacy.enrolledAt,
    lastUsedAt: legacy.lastUsedAt,
    enrolledAt: legacy.enrolledAt,
    attestationType: legacy.attestationType,
    authenticatorInfo: legacy.authenticatorInfo,
    externalId: legacy.externalId
  };
}
```

## Testing Requirements

1. **Unit Tests:**
   - Test activateCredential() with valid/invalid UUIDs
   - Test deactivateCredential() with proper error handling
   - Test listCredentials() response format handling

2. **Integration Tests:**
   - Test full activation/deactivation flow
   - Test UI component state management
   - Test error scenarios and user feedback

3. **Migration Tests:**
   - Test backward compatibility with existing credentials
   - Test data mapping from old to new format

## Estimated Implementation Time

- **Core API Methods:** 2-3 hours
- **Interface Updates:** 1-2 hours  
- **UI Component Updates:** 2-3 hours
- **Testing & Integration:** 2-3 hours

**Total: 7-11 hours**
