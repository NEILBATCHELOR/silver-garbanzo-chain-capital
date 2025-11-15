# Integration Architecture: Policy + Gateway + Foundry

## 🎯 Overview

This document explains how the three core infrastructure layers work together to provide comprehensive, dual-layer policy enforcement for token operations.

## 📊 Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Application                         │
│                  (React Components + Hooks)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Layer 1: Gateway Layer                         │
│              /infrastructure/gateway/                            │
│                                                                  │
│  • CryptoOperationGateway (Central orchestrator)                │
│  • Operation Validators (Pre-execution checks)                  │
│  • Operation Executors (Execution handlers)                     │
│  • Gas Estimators & Monitors                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ↓               ↓               ↓
┌────────────────┐ ┌─────────────┐ ┌────────────────┐
│  Layer 2:      │ │  Layer 3:   │ │  Database      │
│  Policy Engine │ │  Foundry    │ │  (Supabase)    │
│                │ │  Operations │ │                │
│  Off-Chain     │ │  On-Chain   │ │  Audit Logs    │
│  Validation    │ │  Validation │ │  Compliance    │
└────────────────┘ └─────────────┘ └────────────────┘
```

## 🔄 Complete Operation Flow

### Step 1: Request Initiated (Gateway Entry Point)

```typescript
// User initiates operation through Gateway
const gateway = new CryptoOperationGateway();

const request: OperationRequest = {
  type: 'mint',
  chain: 'ethereum',
  tokenAddress: '0x123...',
  parameters: {
    to: '0x456...',
    amount: '1000'
  }
};

const result = await gateway.executeOperation(request);
```

### Step 2: Gateway Orchestration

The `CryptoOperationGateway` orchestrates the entire flow:

```typescript
async executeOperation(request: OperationRequest): Promise<OperationResult> {
  const operationId = this.generateOperationId();
  
  try {
    // 1️⃣ PRE-VALIDATION (Gateway Validators)
    await this.validateRequest(request);
    
    // 2️⃣ OFF-CHAIN POLICY EVALUATION (Policy Layer)
    const policyResult = await this.evaluatePoliciesForRequest(request);
    if (!policyResult.allowed) {
      return this.buildRejectionResult(operationId, policyResult, request);
    }
    
    // 3️⃣ GAS ESTIMATION
    const gasEstimate = await this.estimateGas(request);
    
    // 4️⃣ EXECUTION (Executor Layer)
    const executor = this.getExecutor(request.type);
    const txResult = await executor.execute(request, gasEstimate);
    
    // 5️⃣ DATABASE LOGGING
    await this.logOperation(operationId, request, txResult, policyResult);
    
    return { success: true, ... };
  } catch (error) {
    return this.handleOperationError(operationId, request, error);
  }
}
```

### Step 3: Policy Layer (Off-Chain Validation)

The `PolicyEngine` evaluates database-stored policies:

```typescript
// Inside Gateway: evaluatePoliciesForRequest()
private async evaluatePoliciesForRequest(request: OperationRequest) {
  const context = this.buildPolicyContext(request);
  const operation = this.mapToCryptoOperation(request);
  
  // PolicyEngine evaluates against Supabase policies
  return await this.policyEngine.evaluateOperation(operation, context);
}
```

#### PolicyEngine Process:
1. **Load Applicable Policies** from `policy_operation_mappings` table
2. **Evaluate Rules** through `RuleEvaluationPipeline`
3. **Check Conditions**: amount limits, time windows, addresses, compliance
4. **Aggregate Results**: violations, warnings, approval status
5. **Cache Results** for performance
6. **Log to Database**: `transaction_validations`, `policy_violations`

### Step 4: Executor Selection & Foundry Integration

```typescript
// Gateway gets the appropriate executor
const executor = this.getExecutor(request.type); // e.g., MintExecutor

// Executor can choose to use Foundry for on-chain execution
const txResult = await executor.execute(request, gasEstimate);
```

#### Two Execution Paths:

**Path A: Current Enhanced Token Manager (Default)**
```typescript
// executors/MintExecutor.ts
export class MintExecutor implements OperationExecutor {
  async execute(request: OperationRequest, gasEstimate: GasEstimate) {
    const adapter = await this.tokenManager.getAdapter(
      request.tokenAddress,
      request.chain
    );
    
    return await adapter.mint({
      to: request.parameters.to,
      amount: request.parameters.amount,
      gasLimit: gasEstimate.limit
    });
  }
}
```

**Path B: Foundry Smart Contract Integration (New)**
```typescript
// executors/FoundryMintExecutor.ts (Enhanced Version)
export class FoundryMintExecutor implements OperationExecutor {
  private foundryExecutor: FoundryOperationExecutor;
  
  async execute(request: OperationRequest, gasEstimate: GasEstimate) {
    // ✅ On-chain policy validation happens automatically
    // via PolicyEngine.sol modifier in the smart contract
    return await this.foundryExecutor.executeMint(request, gasEstimate);
  }
}
```

### Step 5: Foundry Layer (On-Chain Validation)

When using Foundry contracts, validation happens at TWO points:

#### Pre-Check (Optional, View-Only - No Gas Cost):
```typescript
// FoundryOperationExecutor checks policy before sending transaction
const operator = await this.signer.getAddress();
const preCheck = await this.policyAdapter.canOperate(
  request.tokenAddress,
  operator,
  {
    type: 'mint',
    amount: request.parameters.amount,
    to: request.parameters.to
  }
);

if (!preCheck.approved) {
  throw new Error(`On-chain policy pre-check failed: ${preCheck.reason}`);
}
```

#### On-Chain Enforcement (Automatic, via Smart Contract):
```solidity
// PolicyProtectedToken.sol
function mint(address to, uint256 amount) 
  public 
  onlyRole(MINTER_ROLE)
  policyCompliant("mint", amount)  // ⬅️ PolicyEngine.sol validation
  notBlocked(to)
{
  _mint(to, amount);
  emit TokensMinted(to, amount, policyEngine.getLastPolicyId());
}
```

The `policyCompliant` modifier calls `PolicyEngine.sol`:
```solidity
// PolicyEngine.sol
function validateOperation(
  address operator,
  string memory operation,
  uint256 amount
) public returns (bool) {
  Policy storage policy = policies[operationPolicies[operation]];
  
  // ❌ Reject if exceeds max amount
  if (amount > policy.maxAmount) return false;
  
  // ❌ Reject if within cooldown period
  if (block.timestamp < policy.lastOperationTime[operator] + policy.cooldownPeriod) {
    return false;
  }
  
  // ❌ Reject if exceeds daily limit
  if (policy.dailyTotal[operator] + amount > policy.dailyLimit) {
    return false;
  }
  
  // ✅ Update tracking and approve
  policy.lastOperationTime[operator] = block.timestamp;
  policy.dailyTotal[operator] += amount;
  return true;
}
```

## 🔗 Integration Points

### 1. Gateway ↔ Policy Integration

**Location**: `/infrastructure/gateway/CryptoOperationGateway.ts`

```typescript
export class CryptoOperationGateway {
  private policyEngine: PolicyEngine;
  
  constructor(config: GatewayConfig = {}) {
    this.policyEngine = new PolicyEngine(config.policyConfig || {});
  }
  
  // Public method for external use (e.g., TransactionValidator)
  public async evaluatePolicies(
    operation: CryptoOperation, 
    context: PolicyContext
  ): Promise<PolicyEvaluationResult> {
    return await this.policyEngine.evaluateOperation(operation, context);
  }
  
  // Internal method for gateway's own use
  private async evaluatePoliciesForRequest(request: OperationRequest) {
    const context = this.buildPolicyContext(request);
    const operation = this.mapToCryptoOperation(request);
    return await this.policyEngine.evaluateOperation(operation, context);
  }
}
```

**Used By**:
- Internal gateway validation before execution
- External components via `gateway.evaluatePolicies()` (e.g., `TransactionValidator`)

### 2. Gateway ↔ Foundry Integration

**Current State**: Executors use `EnhancedTokenManager` (indirect blockchain access)

**Enhanced State**: Create Foundry-aware executors

```typescript
// NEW: /infrastructure/gateway/executors/FoundryMintExecutor.ts
import { FoundryOperationExecutor } from '../../foundry/FoundryOperationExecutor';

export class FoundryMintExecutor implements OperationExecutor {
  private foundryExecutor: FoundryOperationExecutor;
  
  constructor(foundryConfig: FoundryExecutorConfig) {
    this.foundryExecutor = new FoundryOperationExecutor(foundryConfig);
  }
  
  async execute(
    request: OperationRequest, 
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    return await this.foundryExecutor.executeMint(request, gasEstimate);
  }
}
```

**Update Gateway Constructor**:
```typescript
// In CryptoOperationGateway.ts
private async initializeExecutors(): Promise<void> {
  // Option 1: Use Foundry executors (on-chain validation)
  if (this.config.useFoundry) {
    const { FoundryMintExecutor } = await import('./executors/FoundryMintExecutor');
    const { FoundryBurnExecutor } = await import('./executors/FoundryBurnExecutor');
    // ... etc
    
    this.executors.set('mint', new FoundryMintExecutor(this.config.foundryConfig));
    this.executors.set('burn', new FoundryBurnExecutor(this.config.foundryConfig));
  } 
  // Option 2: Use standard executors (off-chain only)
  else {
    const { MintExecutor } = await import('./executors/MintExecutor');
    const { BurnExecutor } = await import('./executors/BurnExecutor');
    // ... etc
    
    this.executors.set('mint', new MintExecutor(this.tokenManager));
    this.executors.set('burn', new BurnExecutor(this.tokenManager));
  }
}
```

### 3. Policy ↔ Foundry Sync

**Challenge**: Keep Supabase policies synchronized with on-chain `PolicyEngine.sol`

**Solution**: Policy Sync Service

```typescript
// NEW: /infrastructure/policy/PolicySyncService.ts
export class PolicySyncService {
  private policyEngine: PolicyEngine;
  private foundryAdapter: FoundryPolicyAdapter;
  
  async syncPolicyToChain(
    policyId: string,
    tokenAddress: string,
    operationType: string
  ): Promise<void> {
    // 1. Load policy from database
    const dbPolicy = await this.policyEngine.getPolicy(policyId);
    
    // 2. Get on-chain policy
    const onChainPolicy = await this.foundryAdapter.getPolicy(
      tokenAddress,
      operationType
    );
    
    // 3. Compare and update if different
    if (this.needsSync(dbPolicy, onChainPolicy)) {
      await this.foundryAdapter.updatePolicy(
        tokenAddress,
        operationType,
        this.transformToOnChainPolicy(dbPolicy)
      );
    }
  }
}
```

## 🎯 Usage Patterns

### Pattern 1: Simple Operation (Off-Chain Only)

```typescript
import { useCryptoOperationGateway } from '@/infrastructure/gateway';

function MintTokenComponent() {
  const { executeOperation, loading } = useCryptoOperationGateway();
  
  const handleMint = async () => {
    const result = await executeOperation({
      type: 'mint',
      chain: 'ethereum',
      tokenAddress: '0x123...',
      parameters: { to: '0x456...', amount: '1000' }
    });
    
    // Only off-chain (DB) policies checked
    // Transaction sent via EnhancedTokenManager
  };
}
```

### Pattern 2: Dual-Layer Validation (Off-Chain + On-Chain)

```typescript
import { useFoundryOperations } from '@/infrastructure/foundry';

function MintTokenComponentWithFoundry() {
  const { executeMint, validateOperation } = useFoundryOperations('ethereum');
  
  const handleMint = async () => {
    const tokenAddress = '0x123...';
    const recipient = '0x456...';
    const amount = '1000';
    
    // Step 1: Off-chain validation (view-only, no gas)
    const isValid = await validateOperation(tokenAddress, {
      type: 'mint',
      amount,
      to: recipient
    });
    
    if (!isValid.approved) {
      alert(`Policy violation: ${isValid.reason}`);
      return;
    }
    
    // Step 2: Execute with on-chain validation
    // PolicyEngine.sol will re-validate during mint() call
    const result = await executeMint(tokenAddress, recipient, amount);
    
    // Both layers enforced ✅
  };
}
```

### Pattern 3: Full Gateway Integration with Foundry

```typescript
import { useCryptoOperationGateway } from '@/infrastructure/gateway';

// Configure gateway to use Foundry executors
const gatewayConfig = {
  useFoundry: true,
  foundryConfig: {
    policyEngineAddress: '0xPolicyEngine...',
    provider: ethersProvider,
    signer: ethersSigner
  }
};

function MintTokenComponent() {
  const { executeOperation } = useCryptoOperationGateway(gatewayConfig);
  
  const handleMint = async () => {
    // Gateway automatically:
    // 1. Validates with off-chain PolicyEngine (DB)
    // 2. Routes to FoundryMintExecutor
    // 3. FoundryMintExecutor validates with on-chain PolicyEngine.sol
    // 4. Executes mint() on smart contract
    // 5. Logs everything to database
    
    const result = await executeOperation({
      type: 'mint',
      chain: 'ethereum',
      tokenAddress: '0x123...',
      parameters: { to: '0x456...', amount: '1000' }
    });
  };
}
```

## 📋 Database Integration

All three layers interact with Supabase:

### Policy Engine → Database
- **Reads**: `policy_operation_mappings`, `rules`
- **Writes**: `transaction_validations`, `policy_violations`, `rule_evaluations`

### Gateway → Database
- **Writes**: `token_operations`, `operation_validations`

### Compliance Layer → Database
- **Writes**: `compliance_audit_logs`, `compliance_reports`

## ⚙️ Configuration

### Unified Configuration Object

```typescript
// Complete system configuration
export interface SystemConfig {
  // Gateway config
  gateway: {
    useFoundry: boolean;
    policyConfig?: PolicyEngineConfig;
    foundryConfig?: FoundryExecutorConfig;
  };
  
  // Policy engine config
  policy: {
    cacheEnabled: boolean;
    cacheTTL: number;
    strictMode: boolean;
    parallelEvaluation: boolean;
  };
  
  // Foundry config (when useFoundry = true)
  foundry: {
    policyEngineAddress: string;
    networks: {
      [chain: string]: {
        rpcUrl: string;
        chainId: number;
      };
    };
  };
}
```

## 🔐 Security Layers

### Layer 1: Pre-Validation (Gateway Validators)
- Input sanitization
- Format validation
- Balance checks
- Address validation

### Layer 2: Off-Chain Policy (PolicyEngine)
- Database-stored policies
- Complex business rules
- Time-based restrictions
- Amount limits
- Compliance rules
- Multi-condition evaluation

### Layer 3: On-Chain Policy (PolicyEngine.sol)
- **Immutable enforcement** (cannot be bypassed)
- Smart contract modifiers
- On-chain state tracking
- Daily limits
- Cooldown periods
- Approval workflows

## 🎭 Dual-Layer Benefits

### Why Both Off-Chain AND On-Chain?

**Off-Chain (PolicyEngine)**:
✅ Fast evaluation (no gas cost)
✅ Complex rules (unlimited computation)
✅ Easy updates (database changes)
✅ Detailed logging
✅ Immediate feedback

**On-Chain (PolicyEngine.sol)**:
✅ **Cannot be bypassed** (enforced by blockchain)
✅ Transparent (visible to all)
✅ Auditable (blockchain history)
✅ Trustless (no intermediary)
✅ Final enforcement

**Together**:
🎯 Fast pre-checks + guaranteed enforcement
🎯 User feedback + transaction security
🎯 Flexible rules + immutable policies
🎯 Off-chain compliance + on-chain verification

## 🚀 Migration Path

### Current State → Enhanced State

**Phase 1**: Continue using current system
- Gateway with standard executors
- Policy engine with DB policies
- Works today ✅

**Phase 2**: Deploy Foundry contracts
```bash
cd frontend/foundry-contracts
forge script script/DeployPolicyEngine.s.sol --broadcast
```

**Phase 3**: Create Foundry executors
```typescript
// Create FoundryMintExecutor, FoundryBurnExecutor, etc.
```

**Phase 4**: Update Gateway config
```typescript
const gateway = new CryptoOperationGateway({
  useFoundry: true,
  foundryConfig: { ... }
});
```

**Phase 5**: Sync policies
```typescript
const syncService = new PolicySyncService();
await syncService.syncAllPoliciesToChain();
```

## 📝 Summary

The three layers work together to provide comprehensive policy enforcement:

1. **Gateway Layer**: Central orchestrator, routes operations, manages execution
2. **Policy Layer**: Off-chain validation, database-stored rules, fast evaluation
3. **Foundry Layer**: On-chain validation, immutable enforcement, blockchain security

**Key Insight**: You can use them independently OR together:
- Gateway alone = Off-chain validation only
- Gateway + Policy = Enhanced off-chain validation
- Gateway + Policy + Foundry = **Dual-layer enforcement (recommended)**

This architecture gives you flexibility while maintaining security and compliance! 🎉
