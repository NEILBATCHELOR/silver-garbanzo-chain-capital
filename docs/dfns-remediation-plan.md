# DFNS Implementation Remediation Plan

## Phase 1: Core SDK Migration (Priority: Critical - Week 1)

### 1.1 Install Official DFNS SDK
```bash
pnpm install @dfns/sdk @dfns/sdk-keystore @dfns/sdk-browser
```

### 1.2 Replace Custom Infrastructure
- Replace `DfnsManager.ts` with official SDK client
- Update authentication layer to use SDK's auth methods
- Migrate request signing to SDK implementation

### 1.3 Update Configuration
- Align environment variables with SDK requirements
- Update client initialization to use SDK patterns
- Implement proper credential management

```typescript
// New SDK-based configuration
import { DfnsApiClient, AsymmetricKeySigner } from '@dfns/sdk'
import { WebAuthnSigner } from '@dfns/sdk-browser'

const client = new DfnsApiClient({
  appId: 'ap-xxxxx-xxxxx-xxxxx',
  baseUrl: 'https://api.dfns.ninja',
  signer: new AsymmetricKeySigner({
    privateKey: process.env.DFNS_PRIVATE_KEY,
    credId: process.env.DFNS_CREDENTIAL_ID,
  })
})
```

## Phase 2: Authentication Enhancement (Priority: High - Week 2)

### 2.1 Implement User Action Signing
- Add proper challenge-response flow
- Implement X-DFNS-USERACTION header handling
- Update all state-changing operations

### 2.2 WebAuthn Integration
- Use SDK's WebAuthn utilities
- Implement proper passkey registration
- Add recovery mechanisms

### 2.3 Service Account Management
- Align with SDK service account patterns
- Update permission management
- Implement proper token refresh

## Phase 3: Advanced Features (Priority: Medium - Week 3)

### 3.1 Delegated Signing Implementation
- Implement end-user credential registration
- Add non-custodial wallet flows
- Integrate KYC recovery mechanisms

### 3.2 Policy Engine Enhancement
- Align policy creation with SDK patterns
- Implement proper approval workflows
- Add policy validation

### 3.3 Enhanced Error Handling
- Use SDK error types and handling
- Implement proper retry logic
- Add comprehensive error recovery

## Phase 4: Integration Testing (Priority: Medium - Week 4)

### 4.1 SDK Compliance Testing
- Test all authentication methods
- Verify request signing compliance
- Validate network operations

### 4.2 Feature Parity Verification
- Ensure all current features work with SDK
- Test wallet creation flows
- Validate transfer operations

### 4.3 Performance Optimization
- Benchmark SDK vs custom implementation
- Optimize API calls
- Implement caching strategies

## Success Criteria

1. ✅ All operations use official DFNS SDK
2. ✅ Proper User Action Signing implemented
3. ✅ WebAuthn/Passkey authentication working
4. ✅ Delegated signing for non-custodial wallets
5. ✅ All current features maintained
6. ✅ Improved error handling and recovery
7. ✅ Better TypeScript support and IntelliSense
8. ✅ Reduced maintenance overhead

## Risk Mitigation

- Keep current implementation during migration
- Implement feature flags for gradual rollout
- Comprehensive testing at each phase
- Rollback plan in case of issues
