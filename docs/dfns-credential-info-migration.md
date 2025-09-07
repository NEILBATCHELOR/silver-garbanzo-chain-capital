# DFNS CredentialInfo Deprecation Migration

## Overview
This document describes the migration from legacy `CredentialInfo` interface to the new DFNS-compliant `DfnsCredentialInfo` interface.

## Summary of Changes

### 1. Infrastructure Index Export Updates
- **File**: `/frontend/src/infrastructure/dfns/index.ts`
- **Changes**: 
  - Added `DfnsCredentialInfo` to exports
  - Added deprecation comment for `CredentialInfo`
  - Maintained backward compatibility

### 2. Credential Manager Updates  
- **File**: `/frontend/src/infrastructure/dfns/credential-manager.ts`
- **Changes**:
  - Enhanced deprecation warning for `CredentialInfo` interface
  - Updated `getCredential()` method to return `DfnsCredentialInfo`
  - Updated `updateCredential()` method to return `DfnsCredentialInfo`
  - Updated legacy methods to use mapping functions for backward compatibility:
    - `activateCredentialLegacy()`
    - `deactivateCredentialLegacy()`
    - `revokeCredential()`
  - Added new legacy wrapper methods:
    - `getCredentialLegacy()`
    - `updateCredentialLegacy()`

### 3. Component Updates
- **File**: `/frontend/src/components/dfns/DfnsAuthentication.tsx`
- **Changes**:
  - Removed import of deprecated `CredentialInfo`
  - Updated `CredentialManagementSectionProps` interface to use `DfnsCredentialInfo[]`
  - State already correctly used `DfnsCredentialInfo[]`

## Interface Comparison

### DfnsCredentialInfo (New - DFNS Compliant)
```typescript
interface DfnsCredentialInfo {
  credentialId: string;        // DFNS credential ID
  credentialUuid: string;      // DFNS credential UUID
  name?: string;               // Credential name
  kind: DfnsCredentialKind;    // Credential type
  isActive: boolean;           // Activation status (replaces status enum)
  publicKey: string;           // Public key
  algorithm?: string;          // Algorithm used
  dateCreated: string;         // ISO date string
  lastUsedAt?: string;         // Last usage timestamp
  enrolledAt?: string;         // Enrollment timestamp
  relyingPartyId?: string;     // For Fido2 credentials
  origin?: string;             // For Fido2 credentials
  attestationType?: string;    // Attestation type
  authenticatorInfo?: AuthenticatorInfo; // WebAuthn info
  externalId?: string;         // External identifier
}
```

### CredentialInfo (Legacy - Deprecated)
```typescript
interface CredentialInfo {
  id: string;                  // Legacy ID field
  name: string;                // Required name
  kind: DfnsCredentialKind;    // Credential type
  status: CredentialStatus;    // Legacy enum status
  publicKey: string;           // Public key
  algorithm: string;           // Required algorithm
  attestationType?: string;    // Attestation type
  authenticatorInfo?: AuthenticatorInfo; // WebAuthn info
  enrolledAt: string;          // Required enrollment time
  lastUsedAt?: string;         // Last usage timestamp
  externalId?: string;         // External identifier
}
```

## Migration Mapping

The migration provides automatic mapping between the interfaces:

### Legacy to DFNS Mapping (`mapLegacyCredential()`)
- `id` → `credentialId` and `credentialUuid`
- `status === Active` → `isActive = true`
- `enrolledAt` → `dateCreated` and `enrolledAt`
- All other fields mapped directly

### DFNS to Legacy Mapping (`mapToLegacyCredential()`)
- `credentialUuid || credentialId` → `id`
- `isActive` → `status` (Active/Inactive)
- `dateCreated || enrolledAt` → `enrolledAt`
- All other fields mapped directly

## Backward Compatibility

### Legacy Methods Available
All original methods remain available with `Legacy` suffix:
- `listCredentialsLegacy()` - Returns `CredentialInfo[]`
- `getCredentialLegacy()` - Returns `CredentialInfo`
- `updateCredentialLegacy()` - Returns `CredentialInfo`
- `activateCredentialLegacy()` - Returns `CredentialInfo`
- `deactivateCredentialLegacy()` - Returns `CredentialInfo`

### New Default Methods
Main methods now return DFNS-compliant types:
- `listCredentials()` - Returns `DfnsCredentialInfo[]`
- `getCredential()` - Returns `DfnsCredentialInfo`
- `updateCredential()` - Returns `DfnsCredentialInfo`

## Migration Path for Consumers

### Immediate (Recommended)
Update imports and type annotations:
```typescript
// Before
import { CredentialInfo } from '@/infrastructure/dfns';
const credentials: CredentialInfo[] = await manager.listCredentials();

// After  
import { DfnsCredentialInfo } from '@/infrastructure/dfns';
const credentials: DfnsCredentialInfo[] = await manager.listCredentials();
```

### Gradual (Temporary)
Use legacy methods while planning migration:
```typescript
// Temporary approach
import { CredentialInfo } from '@/infrastructure/dfns';
const credentials: CredentialInfo[] = await manager.listCredentialsLegacy();
```

## Benefits of Migration

1. **DFNS Compliance**: Aligns with official DFNS API specification
2. **Enhanced Fields**: Additional metadata like `credentialUuid`, `relyingPartyId`
3. **Better Status Handling**: Boolean `isActive` vs enum-based status
4. **Future-Proof**: Prepared for DFNS API updates
5. **Consistent Naming**: Follows DFNS naming conventions

## Timeline

- **Phase 1 (Complete)**: Infrastructure updates with backward compatibility
- **Phase 2 (Next)**: Update remaining components to use new interface
- **Phase 3 (Future)**: Remove legacy interface and methods

## Testing

Type checking confirms no breaking changes in the current codebase. All legacy usage continues to work through mapping functions.

## Next Steps

1. Update any remaining components using the legacy interface
2. Update tests to use the new interface
3. Plan removal of legacy interface in future major version
4. Monitor for any performance impact from mapping functions

## Files Modified

1. `/frontend/src/infrastructure/dfns/index.ts`
2. `/frontend/src/infrastructure/dfns/credential-manager.ts`
3. `/frontend/src/components/dfns/DfnsAuthentication.tsx`
4. `/docs/dfns-credential-info-migration.md` (this file)
