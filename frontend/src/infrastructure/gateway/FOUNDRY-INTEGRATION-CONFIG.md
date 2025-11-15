# Gateway-Foundry Integration Configuration Guide

## 🎯 Overview

This guide explains how to configure the `CryptoOperationGateway` to use Foundry smart contracts for on-chain policy enforcement.

## 📋 Configuration Options

### Option 1: Standard Mode (Current Default)
Uses `EnhancedTokenManager` with off-chain policy validation only.

```typescript
import { CryptoOperationGateway } from '@/infrastructure/gateway';

// Standard configuration - off-chain validation only
const gateway = new CryptoOperationGateway({
  policyConfig: {
    cacheEnabled: true,
    strictMode: false
  }
});
```

**Flow**:
1. Gateway validates with `PolicyEngine` (database policies)
2. Standard executors use `EnhancedTokenManager`
3. Blockchain calls via adapters
4. ✅ Fast, flexible
5. ❌ No on-chain enforcement

---

### Option 2: Foundry Mode (Enhanced Security)
Uses Foundry smart contracts with dual-layer validation.

```typescript
import { CryptoOperationGateway } from '@/infrastructure/gateway';
import { ethers } from 'ethers';

// Setup provider and signer
const provider = new ethers.JsonRpcProvider(
  process.env.VITE_ETHEREUM_RPC_URL
);
const signer = new ethers.Wallet(
  process.env.VITE_PRIVATE_KEY,
  provider
);

// Foundry configuration - dual-layer validation
const gateway = new CryptoOperationGateway({
  useFoundry: true,
  foundryConfig: {
    policyEngineAddress: '0xYourDeployedPolicyEngine...',
    provider,
    signer,
    defaultGasLimit: BigInt(500000)
  },
  policyConfig: {
    cacheEnabled: true,
    strictMode: true // Recommended with Foundry
  }
});
```

**Flow**:
1. Gateway validates with `PolicyEngine` (database policies) ✅ Off-chain
2. Foundry executors call smart contracts
3. Smart contract validates with `PolicyEngine.sol` ✅ On-chain
4. ✅ Maximum security (cannot be bypassed)
5. ✅ Transparent, immutable enforcement

---

## 🌐 Multi-Chain Configuration

```typescript
const gateway = new CryptoOperationGateway({
  useFoundry: true,
  foundryConfig: {
    policyEngineAddress: '0xDefaultPolicyEngine...', // Default for all chains
    provider, // Will be overridden per network
    signer,
    networks: {
      ethereum: {
        rpcUrl: process.env.VITE_ETHEREUM_RPC_URL,
        chainId: 1,
        policyEngineAddress: '0xEthereumPolicyEngine...' // Override
      },
      polygon: {
        rpcUrl: process.env.VITE_POLYGON_RPC_URL,
        chainId: 137,
        policyEngineAddress: '0xPolygonPolicyEngine...'
      },
      avalanche: {
        rpcUrl: process.env.VITE_AVALANCHE_RPC_URL,
        chainId: 43114,
        policyEngineAddress: '0xAvalanchePolicyEngine...'
      }
    }
  }
});
```

---

## 🔧 Gateway Enhancement (Implementation)

To enable Foundry mode, update `CryptoOperationGateway.ts`:

```typescript
// In CryptoOperationGateway.ts
export class CryptoOperationGateway {
  private config: GatewayConfig;
  
  constructor(config: GatewayConfig = {}) {
    this.config = config;
    this.policyEngine = new PolicyEngine(config.policyConfig || {});
    this.tokenManager = new EnhancedTokenManager();
    this.validators = new Map();
    this.executors = new Map();
    
    this.initializeValidators();
    this.initializeExecutors();
  }
  
  private async initializeExecutors(): Promise<void> {
    if (this.config.useFoundry && this.config.foundryConfig) {
      // Use Foundry executors for on-chain validation
      await this.initializeFoundryExecutors(this.config.foundryConfig);
    } else {
      // Use standard executors with EnhancedTokenManager
      await this.initializeStandardExecutors();
    }
  }
  
  private async initializeFoundryExecutors(
    foundryConfig: FoundryGatewayConfig
  ): Promise<void> {
    const { FoundryMintExecutor } = await import('./executors/FoundryMintExecutor');
    const { FoundryBurnExecutor } = await import('./executors/FoundryBurnExecutor');
    const { FoundryTransferExecutor } = await import('./executors/FoundryTransferExecutor');
    // ... import other Foundry executors
    
    const executorConfig = {
      provider: foundryConfig.provider,
      signer: foundryConfig.signer,
      policyEngineAddress: foundryConfig.policyEngineAddress,
      defaultGasLimit: foundryConfig.defaultGasLimit
    };
    
    this.executors.set('mint', new FoundryMintExecutor(executorConfig));
    this.executors.set('burn', new FoundryBurnExecutor(executorConfig));
    this.executors.set('transfer', new FoundryTransferExecutor(executorConfig));
    // ... register other executors
    
    console.log('✅ Foundry executors initialized with on-chain validation');
  }
  
  private async initializeStandardExecutors(): Promise<void> {
    const { MintExecutor } = await import('./executors/MintExecutor');
    const { BurnExecutor } = await import('./executors/BurnExecutor');
    const { TransferExecutor } = await import('./executors/TransferExecutor');
    // ... import other standard executors
    
    this.executors.set('mint', new MintExecutor(this.tokenManager));
    this.executors.set('burn', new BurnExecutor(this.tokenManager));
    this.executors.set('transfer', new TransferExecutor(this.tokenManager));
    // ... register other executors
    
    console.log('✅ Standard executors initialized');
  }
}
```

---

## 📦 Environment Variables

Create `.env` file:

```bash
# Blockchain RPC URLs
VITE_ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc

# Deployed Contract Addresses
VITE_POLICY_ENGINE_ETHEREUM=0x...
VITE_POLICY_ENGINE_POLYGON=0x...
VITE_POLICY_ENGINE_AVALANCHE=0x...

# Private Key (for transactions - KEEP SECURE!)
VITE_PRIVATE_KEY=0x...

# Or use wallet provider instead
VITE_USE_WALLET_PROVIDER=true
```

---

## 🔐 Wallet Provider Integration

Instead of using a private key, integrate with user's wallet:

```typescript
import { BrowserProvider } from 'ethers';

// Get provider from MetaMask/wallet
const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const gateway = new CryptoOperationGateway({
  useFoundry: true,
  foundryConfig: {
    policyEngineAddress: process.env.VITE_POLICY_ENGINE_ETHEREUM,
    provider,
    signer // User's wallet signer
  }
});
```

---

## 🎨 React Component Usage

### Standard Mode
```tsx
import { useCryptoOperationGateway } from '@/infrastructure/gateway';

function MintComponent() {
  const { executeOperation } = useCryptoOperationGateway();
  
  const handleMint = async () => {
    const result = await executeOperation({
      type: 'mint',
      chain: 'ethereum',
      tokenAddress: '0x123...',
      parameters: { to: '0x456...', amount: '1000' }
    });
  };
}
```

### Foundry Mode
```tsx
import { useCryptoOperationGateway } from '@/infrastructure/gateway';
import { ethers } from 'ethers';

function MintComponent() {
  const [provider, setSigner] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  
  useEffect(() => {
    const initWallet = async () => {
      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      setProvider(p);
      setSigner(s);
    };
    initWallet();
  }, []);
  
  const { executeOperation } = useCryptoOperationGateway({
    useFoundry: true,
    foundryConfig: {
      policyEngineAddress: process.env.VITE_POLICY_ENGINE_ETHEREUM,
      provider,
      signer
    }
  });
  
  const handleMint = async () => {
    const result = await executeOperation({
      type: 'mint',
      chain: 'ethereum',
      tokenAddress: '0x123...',
      parameters: { to: '0x456...', amount: '1000' }
    });
    
    // Result includes on-chain validation ✅
  };
}
```

---

## 🚀 Deployment Checklist

### 1. Deploy Smart Contracts
```bash
cd frontend/foundry-contracts
forge script script/DeployPolicyEngine.s.sol --rpc-url $RPC_URL --broadcast
```

### 2. Update Environment Variables
Add deployed contract addresses to `.env`

### 3. Configure Policies On-Chain
```typescript
import { FoundryPolicyAdapter } from '@/infrastructure/foundry';

const adapter = new FoundryPolicyAdapter({
  policyEngineAddress: process.env.VITE_POLICY_ENGINE_ETHEREUM,
  provider,
  signer
});

// Create on-chain policy for mint operation
await adapter.createPolicy('0xTokenAddress...', 'mint', {
  maxAmount: ethers.parseEther('10000'),
  dailyLimit: ethers.parseEther('100000'),
  cooldownPeriod: 60, // seconds
  requiresApproval: false
});
```

### 4. Test Dual-Layer Validation
```typescript
// Verify both layers work
const result = await gateway.executeOperation({...});
console.log('Policy validation:', result.policyValidation);
// Should show both off-chain and on-chain checks
```

---

## 📊 Monitoring & Debugging

```typescript
// Enable detailed logging
const gateway = new CryptoOperationGateway({
  useFoundry: true,
  foundryConfig: {...},
  policyConfig: {
    logLevel: 'debug' // See all policy evaluations
  }
});

// Check cache statistics
const stats = gateway.policyEngine.getCacheStats();
console.log('Policy cache stats:', stats);

// Get policy adapter for direct queries
const executor = gateway.getExecutor('mint') as FoundryMintExecutor;
const adapter = executor.getPolicyAdapter();

// Query on-chain policy
const policy = await adapter.getPolicy('0xToken...', 'mint');
console.log('On-chain policy:', policy);
```

---

## ⚠️ Important Notes

1. **Gas Costs**: Foundry mode requires gas for on-chain validation
2. **Wallet Required**: User must have a connected wallet (MetaMask, etc.)
3. **Network Selection**: Ensure wallet is on correct network
4. **Policy Sync**: Keep DB policies synchronized with on-chain policies
5. **Testing**: Always test on testnet first (Sepolia, Mumbai, Fuji)

---

## 🎯 Recommendation

For **production systems handling real value**:
- ✅ Use Foundry mode for maximum security
- ✅ Enable strict mode in policy config
- ✅ Implement policy sync monitoring
- ✅ Set up alerts for policy violations

For **development/testing**:
- Standard mode is faster and cheaper
- Switch to Foundry mode before production
