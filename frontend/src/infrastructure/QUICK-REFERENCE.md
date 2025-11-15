# Policy + Gateway + Foundry: Quick Reference

## 🎯 TL;DR

**Three layers working together for complete token operation security:**

1. **Policy Layer** (`/infrastructure/policy/`) - Database policies, off-chain validation
2. **Gateway Layer** (`/infrastructure/gateway/`) - Central orchestrator, execution management  
3. **Foundry Layer** (`/infrastructure/foundry/`) - Smart contracts, on-chain validation

## 📊 Architecture at a Glance

```
React Component
    ↓
Gateway (CryptoOperationGateway)
    ↓
┌───────┴────────┐
↓                ↓
PolicyEngine     Executor (Standard or Foundry)
(Off-chain)      ↓
                 ┌────────┴─────────┐
                 ↓                  ↓
                 EnhancedTokenManager  PolicyEngine.sol
                 (Current)             (On-chain)
```

## 🚀 Quick Start

### Standard Mode (Current - Off-chain only)
```typescript
import { useCryptoOperationGateway } from '@/infrastructure/gateway';

const { executeOperation } = useCryptoOperationGateway();

await executeOperation({
  type: 'mint',
  chain: 'ethereum',
  tokenAddress: '0x123...',
  parameters: { to: '0x456...', amount: '1000' }
});
```

### Foundry Mode (Enhanced - Dual validation)
```typescript
import { useCryptoOperationGateway } from '@/infrastructure/gateway';
import { ethers } from 'ethers';

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const { executeOperation } = useCryptoOperationGateway({
  useFoundry: true,
  foundryConfig: {
    policyEngineAddress: '0xPolicyEngine...',
    provider,
    signer
  }
});

await executeOperation({
  type: 'mint',
  chain: 'ethereum',
  tokenAddress: '0x123...',
  parameters: { to: '0x456...', amount: '1000' }
});
```

## 🔍 What Each Layer Does

### Policy Layer (`/infrastructure/policy/`)

**Purpose**: Off-chain business logic and compliance rules

**Key Files**:
- `PolicyEngine.ts` - Evaluates DB policies
- `PolicyEvaluator.ts` - Rule processing
- `RuleEvaluationPipeline.ts` - Sequential rule checks

**What it checks**:
- ✅ Amount limits (min/max)
- ✅ Time windows (business hours, blackout dates)
- ✅ Frequency limits (operations per hour/day)
- ✅ Address whitelists/blacklists
- ✅ Compliance requirements
- ✅ Multi-signature approvals

**Database Tables**:
- `policy_operation_mappings` - Links policies to operations
- `rules` - Rule definitions
- `transaction_validations` - Validation history
- `policy_violations` - Violation logs

---

### Gateway Layer (`/infrastructure/gateway/`)

**Purpose**: Central orchestrator for all token operations

**Key Files**:
- `CryptoOperationGateway.ts` - Main orchestrator
- `executors/*` - Operation execution handlers
- `validators/*` - Pre-execution validation

**What it does**:
1. Validates request format
2. Calls PolicyEngine for off-chain validation
3. Estimates gas
4. Routes to appropriate executor (Standard or Foundry)
5. Logs to database
6. Returns result

**Flow**:
```
Request → Validate → Policy Check → Execute → Log → Result
```

---

### Foundry Layer (`/infrastructure/foundry/`)

**Purpose**: On-chain policy enforcement via smart contracts

**Key Files**:
- `FoundryOperationExecutor.ts` - Smart contract execution
- `FoundryPolicyAdapter.ts` - PolicyEngine.sol interface
- `hooks/useFoundryOperations.ts` - React integration

**What it does**:
- Pre-checks policies (view function, no gas)
- Executes operations on smart contracts
- Smart contract validates via PolicyEngine.sol
- Cannot be bypassed (blockchain-enforced)

**Smart Contracts**:
- `PolicyEngine.sol` - On-chain policy validation
- `PolicyProtectedToken.sol` - Token with policy modifiers

---

## 🔄 Complete Flow Example

### Mint Operation with Dual Validation

```typescript
// 1. User initiates
await gateway.executeOperation({
  type: 'mint',
  chain: 'ethereum',
  tokenAddress: '0x123...',
  parameters: { to: '0x456...', amount: '1000' }
});

// 2. Gateway validates request format
// ✅ Check: recipient address valid, amount positive

// 3. PolicyEngine evaluates (off-chain)
// - Load policies from database
// - Check: amount <= maxAmount (10,000)
// - Check: daily total <= dailyLimit (100,000)
// - Check: operator in whitelist
// - Result: APPROVED ✅

// 4. If Foundry mode enabled:
//    FoundryMintExecutor pre-checks on-chain
//    - Call PolicyEngine.sol.canOperate() (view function)
//    - Result: APPROVED ✅

// 5. Execute transaction
//    Smart contract mint() function:
//    - policyCompliant modifier validates again
//    - PolicyEngine.sol checks limits on-chain
//    - Update daily totals on-chain
//    - Mint tokens if approved

// 6. Log to database
//    - token_operations
//    - operation_validations
//    - compliance_audit_logs

// 7. Return result to user
```

## 📂 File Locations

```
frontend/src/infrastructure/
├── policy/
│   ├── PolicyEngine.ts
│   ├── PolicyEvaluator.ts
│   ├── rules/
│   │   ├── RuleEvaluationPipeline.ts
│   │   └── processors/
│   └── validators/
│
├── gateway/
│   ├── CryptoOperationGateway.ts
│   ├── executors/
│   │   ├── MintExecutor.ts (Standard)
│   │   ├── FoundryMintExecutor.ts (Foundry)
│   │   └── ...
│   ├── validators/
│   └── hooks/
│
└── foundry/
    ├── FoundryOperationExecutor.ts
    ├── FoundryPolicyAdapter.ts
    ├── hooks/
    │   └── useFoundryOperations.ts
    └── INTEGRATION-GUIDE.md
```

## 🎛️ Configuration

### Environment Variables
```bash
# .env
VITE_ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_POLICY_ENGINE_ETHEREUM=0xYourDeployedPolicyEngine
VITE_USE_FOUNDRY=true
```

### Gateway Config
```typescript
const config: GatewayConfig = {
  // Standard mode
  useFoundry: false,
  policyConfig: {
    cacheEnabled: true,
    strictMode: false
  }
};

// OR Foundry mode
const config: GatewayConfig = {
  useFoundry: true,
  foundryConfig: {
    policyEngineAddress: '0x...',
    provider,
    signer
  },
  policyConfig: {
    cacheEnabled: true,
    strictMode: true
  }
};
```

## 🔐 Security Layers

| Layer | Type | Bypassable? | Speed | Flexibility |
|-------|------|-------------|-------|-------------|
| Gateway Validators | Pre-check | ✅ Yes (if compromised) | ⚡ Instant | 🔧 High |
| PolicyEngine (DB) | Off-chain | ✅ Yes (if DB compromised) | ⚡ Fast | 🔧 Very High |
| PolicyEngine.sol | On-chain | ❌ **NO** | 🐌 Slower (gas) | 🔧 Low |

**Recommendation**: Use all three layers for maximum security.

## 📊 When to Use What

### Use Standard Mode When:
- ✅ Development/testing
- ✅ Rapid iteration needed
- ✅ Gas costs are a concern
- ✅ Internal/trusted operations only

### Use Foundry Mode When:
- ✅ Production systems
- ✅ High-value operations
- ✅ External/untrusted users
- ✅ Regulatory compliance required
- ✅ Need immutable audit trail

## 🚀 Migration Path

1. **Today**: Use standard mode, off-chain policies
2. **Deploy**: Deploy PolicyEngine.sol and PolicyProtectedToken.sol
3. **Configure**: Add Foundry executors to gateway
4. **Test**: Validate dual-layer enforcement on testnet
5. **Enable**: Switch `useFoundry: true` in production
6. **Monitor**: Track both layers with compliance system

## 📖 Documentation

- **Integration Architecture**: `/infrastructure/INTEGRATION-ARCHITECTURE.md`
- **Foundry Config Guide**: `/infrastructure/gateway/FOUNDRY-INTEGRATION-CONFIG.md`
- **Foundry Integration**: `/infrastructure/foundry/INTEGRATION-GUIDE.md`
- **Policy Master Plan**: See attached documents

## ⚡ Performance Tips

1. **Cache Policies**: Enable `cacheEnabled: true` in PolicyEngine
2. **Pre-checks**: Use `canOperate()` view function before transactions
3. **Batch Operations**: Process multiple operations together
4. **Gas Optimization**: Set appropriate `defaultGasLimit`

## 🛠️ Debugging

```typescript
// Check policy evaluation
const result = await gateway.evaluatePolicies(operation, context);
console.log('Policy result:', result);

// Check cache stats
const stats = policyEngine.getCacheStats();
console.log('Cache stats:', stats);

// Check on-chain policy
const adapter = new FoundryPolicyAdapter({...});
const policy = await adapter.getPolicy(tokenAddress, 'mint');
console.log('On-chain policy:', policy);
```

## 🎯 Key Takeaways

1. **Three layers work independently OR together** - choose based on needs
2. **Gateway is the central entry point** - handles all operations
3. **Policy layer = fast, flexible** - database-stored rules
4. **Foundry layer = secure, immutable** - blockchain-enforced
5. **Dual validation = best of both** - speed + security
6. **Migration is gradual** - can enable Foundry incrementally

---

**Questions?** See detailed docs or ask in project chat! 🚀
