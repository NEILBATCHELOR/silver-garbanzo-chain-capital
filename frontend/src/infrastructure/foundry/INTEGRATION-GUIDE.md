# Foundry-Frontend Policy Integration Guide

## 🎯 Overview

This guide explains how PolicyAware frontend components connect to on-chain Foundry smart contracts for dual-layer policy enforcement.

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Layer                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PolicyAware Components (React)                        │ │
│  │  - PolicyAwareMintOperation.tsx                        │ │
│  │  - PolicyAwareBurnOperation.tsx                        │ │
│  │  - PolicyAwareLockOperation.tsx                        │ │
│  │  - etc.                                                 │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         ↓                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  useFoundryOperations Hook                             │ │
│  │  - Manages wallet connection                           │ │
│  │  - Initializes FoundryOperationExecutor                │ │
│  │  - Provides operation execution methods                │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         ↓                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  FoundryOperationExecutor                              │ │
│  │  - Executes token operations via ethers.js             │ │
│  │  - Integrates with PolicyEngine for validation         │ │
│  │  - Handles gas estimation & transaction monitoring     │ │
│  └───────────┬──────────────────────┬─────────────────────┘ │
│              ↓                      ↓                        │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │ FoundryPolicyAdapter │  │ Token Contract ABIs  │       │
│  │ - On-chain validation│  │ - ERC20, ERC721, etc.│       │
│  └──────────┬───────────┘  └──────────────────────┘       │
└─────────────┼──────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Blockchain Layer                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PolicyEngine.sol (On-Chain)                           │ │
│  │  - Validates operations against on-chain policies      │ │
│  │  - Enforces amount limits, cooldowns, daily limits     │ │
│  │  - Manages multi-signature approvals                   │ │
│  │  - Emits OperationValidated/PolicyViolation events     │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         ↓                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Token Contracts (ERC20, ERC721, etc.)                 │ │
│  │  - PolicyProtectedToken.sol                            │ │
│  │  - Uses policyCompliant modifier                       │ │
│  │  - Calls PolicyEngine.validateOperation()              │ │
│  │  - Executes: mint, burn, transfer, lock, etc.          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Components

### 1. **FoundryPolicyAdapter.ts**
- **Purpose**: Connect frontend to on-chain PolicyEngine.sol
- **Features**:
  - View-only validation (no gas) via `canOperate()`
  - Transaction validation via `validateOperation()`
  - Policy querying and daily limit tracking
  - Multi-signature approval management

### 2. **FoundryOperationExecutor.ts**
- **Purpose**: Execute token operations through smart contracts
- **Supported Operations**:
  - Mint, Burn, Transfer
  - Lock, Unlock
  - Block, Unblock
  - Pause, Unpause
  - Role Management

### 3. **useFoundryOperations.ts**
- **Purpose**: React hook for PolicyAware components
- **Features**:
  - Automatic wallet connection handling
  - Operation execution methods
  - Policy validation helpers
  - Balance and status queries

## 🚀 Usage Guide

### Step 1: Deploy PolicyEngine Contract

```bash
cd frontend/foundry-contracts

# Deploy PolicyEngine
forge script script/DeployPolicyEngine.s.sol:DeployPolicyEngineScript \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify

# Note the deployed address
# Add to POLICY_ENGINE_ADDRESSES in useFoundryOperations.ts
```

### Step 2: Update PolicyEngine Addresses

Edit `frontend/src/infrastructure/foundry/hooks/useFoundryOperations.ts`:

```typescript
const POLICY_ENGINE_ADDRESSES: Record<string, string> = {
  'ethereum': '0xYourDeployedPolicyEngineAddress',
  'polygon': '0x...',
  'avalanche': '0x...',
  // Add your deployed addresses
};
```

### Step 3: Use in PolicyAware Components

```tsx
// In PolicyAwareMintOperation.tsx
import { useFoundryOperations } from '@/infrastructure/foundry/hooks/useFoundryOperations';

export const PolicyAwareMintOperation: React.FC<Props> = ({
  tokenId,
  tokenAddress,
  chain,
  ...props
}) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  // Initialize Foundry operations
  const {
    executeMint,
    validateOperation,
    getRemainingDailyLimit,
    loading,
    error
  } = useFoundryOperations(chain);

  // Pre-validate before showing confirmation
  const handleValidate = async () => {
    const isValid = await validateOperation(tokenAddress, {
      type: 'mint',
      amount: amount,
      to: recipient
    });

    if (!isValid) {
      alert('Operation violates on-chain policy');
      return;
    }

    // Get remaining daily limit
    const remaining = await getRemainingDailyLimit(tokenAddress, 'mint');
    console.log('Remaining daily limit:', remaining.toString());

    // Proceed to execution...
  };

  // Execute the mint operation
  const handleExecute = async () => {
    try {
      const result = await executeMint(tokenAddress, recipient, amount);
      
      console.log('Transaction hash:', result.hash);
      console.log('Block number:', result.blockNumber);
      
      // Show success notification
      toast.success(`Minted ${amount} tokens!`);
    } catch (err) {
      console.error('Mint failed:', err);
      toast.error(error?.message || 'Mint operation failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mint Tokens</CardTitle>
      </CardHeader>
      <CardContent>
        <Input
          placeholder="Recipient Address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <Input
          placeholder="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </CardContent>
      <CardFooter>
        <Button onClick={handleValidate} disabled={loading}>
          Validate
        </Button>
        <Button onClick={handleExecute} disabled={loading}>
          {loading ? 'Executing...' : 'Mint'}
        </Button>
      </CardFooter>
    </Card>
  );
};
```

### Step 4: Configure Policies On-Chain

```solidity
// After deploying PolicyEngine, configure policies:

// Example: Set mint policy for a token
policyEngine.createPolicy(
  tokenAddress,        // Token to apply policy to
  "mint",              // Operation type
  1000 * 10**18,       // Max amount per operation (1000 tokens)
  10000 * 10**18,      // Daily limit (10000 tokens)
  60                   // Cooldown period (60 seconds)
);

// Example: Enable multi-sig approval for large burns
policyEngine.createPolicy(
  tokenAddress,
  "burn",
  5000 * 10**18,       // Max 5000 tokens without approval
  50000 * 10**18,      // 50000 daily limit
  120                  // 2 minute cooldown
);

policyEngine.enableApprovalRequirement(
  tokenAddress,
  "burn",
  2                    // Require 2 approvals
);
```

## 🔄 Operation Flow

### Mint Operation Example:

1. **User Input** → PolicyAware component captures recipient & amount
2. **Pre-Validation** → `validateOperation()` checks on-chain policy (view call, no gas)
3. **User Confirmation** → Show policy compliance status, gas estimate
4. **Execute** → `executeMint()` calls token contract's `mint()` function
5. **On-Chain Validation** → Token contract's `policyCompliant` modifier calls PolicyEngine
6. **Policy Check** → PolicyEngine validates amount limits, cooldowns, daily limits
7. **Mint Execution** → If approved, tokens are minted
8. **Event Emission** → `TokensMinted` and `OperationValidated` events
9. **Frontend Update** → Transaction receipt received, UI updates

## 📊 Policy Enforcement Layers

### Layer 1: Off-Chain (Database) - Optional
- Fast pre-validation
- User experience optimization
- No gas cost
- Managed via Supabase

### Layer 2: On-Chain (Smart Contract) - Required
- Enforceable validation
- Cannot be bypassed
- Transparent and auditable
- Gas cost applies

## 🔐 Security Considerations

1. **Always validate on-chain** - Off-chain validation is for UX only
2. **Never trust client-side validation** - Smart contracts enforce final rules
3. **Monitor policy violations** - Listen for `PolicyViolation` events
4. **Regular audits** - Review on-chain policies periodically
5. **Multi-sig for critical operations** - Use approval workflow for large transactions

## 🧪 Testing

```bash
# Test PolicyEngine integration
cd frontend/foundry-contracts
forge test --match-contract PolicyEngineTest -vvv

# Test specific operation
forge test --match-test testMintWithPolicy -vvv

# Test with frontend
cd frontend
npm run dev
# Navigate to token operations
# Connect wallet
# Try mint/burn/lock operations
```

## 📝 Common Issues

### Issue: "PolicyEngine not deployed on {chain}"
**Solution**: Deploy PolicyEngine to the chain and update `POLICY_ENGINE_ADDRESSES`

### Issue: "Executor not initialized"
**Solution**: Ensure wallet is connected before calling operation methods

### Issue: "Operation violates policy"
**Solution**: Check on-chain policy settings, verify amounts and limits

### Issue: "Transaction reverted"
**Solution**: Ensure token contract has `policyCompliant` modifier integrated

## 🎯 Next Steps

1. ✅ Deploy PolicyEngine.sol to your target chains
2. ✅ Update PolicyEngine addresses in `useFoundryOperations.ts`
3. ✅ Configure on-chain policies for your tokens
4. ✅ Integrate `useFoundryOperations` into PolicyAware components
5. ✅ Test operations end-to-end
6. ✅ Monitor PolicyViolation events
7. ✅ Set up compliance tracking

## 📚 Related Documentation

- [PolicyEngine.sol Contract](../foundry-contracts/src/policy/PolicyEngine.sol)
- [PolicyAware Operations](../components/tokens/operations/)
- [Integration Master Plan](./POLICY-CRYPTO-INTEGRATION-MASTER-PLAN.md)
- [Foundry Guide](./Comprehensive%20Token%20Operations%20with%20Foundry.md)

---

**Note**: This integration provides **dual-layer policy enforcement** combining:
- Fast off-chain validation for UX
- Secure on-chain enforcement for compliance

Both layers work together but on-chain validation is the final authority.
