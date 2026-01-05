# Verification Service

Comprehensive on-chain verification of token deployments including modules and extensions.

## Quick Start

```typescript
import { verificationService } from '@/services/verification';

// Verify a deployment
const result = await verificationService.verifyDeployment(tokenId, {
  verifyToken: true,
  verifyModules: true,
  verifyExtensions: true
});

console.log(`Status: ${result.overallStatus}`);
console.log(`Passed: ${result.passedChecks}/${result.totalChecks}`);
```

## Key Features

✅ Works with **any token standard** (ERC20, ERC721, ERC1155, etc.)  
✅ Verifies **any module type** (fees, vesting, governance, etc.)  
✅ Validates **on-chain state** vs database configuration  
✅ Checks **module linkages** (bidirectional)  
✅ Verifies **transaction sequences**  
✅ Beautiful **UI modal** for results  

## Files

- `types.ts` - All types and interfaces
- `verificationService.ts` - Main orchestration service
- `verifiers/` - Standard-specific and module-specific verifiers
- `index.ts` - Exports

## UI Integration

```typescript
import { DeploymentVerificationModal } from '@/components/tokens/components/deployment/DeploymentVerificationModal';

<DeploymentVerificationModal
  tokenId={tokenId}
  network="ethereum-sepolia"
  isOpen={showModal}
  onClose={() => setShowModal(false)}
/>
```

## Adding Verifiers

### New Token Standard

1. Create `verifiers/ercXXXVerifier.ts`
2. Implement `ITokenStandardVerifier`
3. Register in `verificationService.ts`

### New Module Type

1. Create module verifier class implementing `IModuleVerifier`
2. Register in standard verifier (e.g., in `ERC20Verifier`)

## Documentation

See [DEPLOYMENT_VERIFICATION_SYSTEM.md](../../../docs/DEPLOYMENT_VERIFICATION_SYSTEM.md) for comprehensive documentation.
