# Chain Capital - Production Deployment Guide
**Complete Step-by-Step Guide for Mainnet/Layer 2 Deployment**

**Last Updated**: January 2025  
**Status**: ✅ Production Ready

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Deployment Sequence](#deployment-sequence)
4. [Verification](#verification)
5. [Post-Deployment Tasks](#post-deployment-tasks)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

### Required Tools
- [ ] Foundry installed (`forge --version`)
- [ ] Node.js v18+ installed
- [ ] Git repository access
- [ ] RPC endpoints configured
- [ ] Block explorer API keys
- [ ] Hardware wallet (recommended for mainnet)

### Network Decisions
- [ ] Choose target network(s):
  - ✅ **Base** (Recommended) - $7.50/token, fast, Coinbase integration
  - ⚠️ **Arbitrum** - $12/token, highest TPS
  - ⚠️ **Polygon** - $1.50/token, cheapest but slower
  - ⚠️ **Optimism** - $9/token, Superchain benefits
  - ❌ **Ethereum** - $140/token, only for high-value assets

### Security Preparation
- [ ] Generate deployment wallet
- [ ] Fund wallet with native gas tokens
- [ ] Set up multi-sig for upgrades (2-of-3 minimum)
- [ ] Test on testnet first (Sepolia/Base Sepolia)
- [ ] Audit smart contracts (Certik/Halborn)

---

## 🔧 Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/chaincapital/silver-garbanzo-chain-capital.git
cd silver-garbanzo-chain-capital/frontend/foundry-contracts
```

### 2. Install Dependencies
```bash
forge install
```

### 3. Configure Environment Variables

Create `.env` file:
```bash
# Deployment
PRIVATE_KEY=0x...your_private_key

# RPC Endpoints
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
POLYGON_RPC_URL=https://polygon-rpc.com
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Block Explorers (for verification)
BASESCAN_API_KEY=your_basescan_key
ARBISCAN_API_KEY=your_arbiscan_key
POLYGONSCAN_API_KEY=your_polygonscan_key
ETHERSCAN_API_KEY=your_etherscan_key

# Multi-Sig Addresses (Stage 2)
UPGRADER_2=0x...
UPGRADER_3=0x...
```

### 4. Test Compilation
```bash
forge build
```

**Expected Output**: `Compiler run successful` ✅

---

## 🚀 Deployment Sequence

### Phase 1: Testnet Deployment (FREE)

#### Step 1: Deploy to Sepolia/Base Sepolia
```bash
# Get testnet ETH from faucets:
# Sepolia: https://sepoliafaucet.com
# Base Sepolia: https://base.org/faucet

# Deploy all masters
forge script script/DeployAllMasters.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify

# Deploy TokenFactory
forge script script/DeployTokenFactory.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify

# Deploy Stage 2 (Governance + Registry)
forge script script/DeployUUPS.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify

# Deploy Phase 1 Extensions (Critical Compliance)
forge script script/DeployExtensionsPhase1.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify
```

#### Step 2: Run Production Checklist
```bash
# Update .env with deployed addresses
export TOKEN_FACTORY=0x...
export UPGRADE_GOVERNOR=0x...
export TOKEN_REGISTRY=0x...

# Run validation
forge script script/ProductionChecklist.s.sol \
  --rpc-url base_sepolia
```

**Expected Output**: `✅ ALL CHECKS PASSED - READY FOR PRODUCTION`

#### Step 3: Test Token Operations
```bash
# Deploy test tokens
forge script script/BatchDeployTokens.s.sol \
  --rpc-url base_sepolia \
  --broadcast

# Test mint, burn, transfer, pause
forge test --match-test testTokenOperations -vv
```

---

### Phase 2: Mainnet Deployment (PRODUCTION)

⚠️ **CRITICAL**: Only proceed after testnet success

#### Step 1: Deploy Masters (One-Time, ~$40-80)
```bash
forge script script/DeployAllMasters.s.sol \
  --rpc-url base \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  --slow
```

**What This Deploys**:
- ERC20Master
- ERC721Master
- ERC1155Master
- ERC3525Master
- ERC4626Master
- ERC1400Master

**Cost**: ~$40-80 on Base (one-time only)

#### Step 2: Deploy TokenFactory (~$10-15)
```bash
forge script script/DeployTokenFactory.s.sol \
  --rpc-url base \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  --slow
```

**What This Deploys**:
- TokenFactory contract
- Links to all master implementations

**Cost**: ~$10-15 on Base

#### Step 3: Deploy Governance & Registry (~$15-20)
```bash
forge script script/DeployUUPS.s.sol \
  --rpc-url base \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  --slow
```

**What This Deploys**:
- UpgradeGovernor (multi-sig)
- TokenRegistry (tracking)

**Cost**: ~$15-20 on Base

#### Step 4: Deploy Extension Modules (~$30-50)
```bash
# Phase 1: Critical Compliance
forge script script/DeployExtensionsPhase1.s.sol \
  --rpc-url base \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  --slow
```

**What This Deploys**:
- ERC20 Compliance Module
- ERC20 Vesting Module
- ERC721 Royalty Module
- ERC1400 Transfer Restrictions
- ERC1400 Document Module

**Cost**: ~$30-50 on Base

---

## ✅ Verification

### Verify All Contracts
```bash
forge script script/VerifyContracts.s.sol \
  --rpc-url base \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### Manual Verification (if needed)
```bash
# Example for ERC20Master
forge verify-contract \
  <DEPLOYED_ADDRESS> \
  src/masters/ERC20Master.sol:ERC20Master \
  --chain-id 8453 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --watch
```

---

## 📝 Post-Deployment Tasks

### 1. Save Deployment Addresses
All deployment info is automatically saved to:
- `deployments/masters-<network>.json`
- `deployments/stage2-deployment.json`
- `deployments/phase1-<network>.json`

### 2. Update Frontend Configuration
```typescript
// frontend/src/config/contracts.ts
export const CONTRACTS = {
  [ChainId.BASE]: {
    tokenFactory: "0x...",
    upgradeGovernor: "0x...",
    tokenRegistry: "0x...",
    extensions: {
      compliance: "0x...",
      vesting: "0x...",
      // ... other modules
    }
  }
};
```

### 3. Configure Multi-Sig
```bash
# Transfer ownership to multi-sig
cast send $TOKEN_FACTORY \
  "transferOwnership(address)" $MULTI_SIG_ADDRESS \
  --rpc-url base \
  --private-key $PRIVATE_KEY
```

### 4. Set Up Monitoring
- [ ] Configure Tenderly alerts
- [ ] Set up gas price monitoring
- [ ] Enable transaction tracking
- [ ] Configure error alerting

### 5. Security Measures
- [ ] Revoke deployment key access
- [ ] Store multi-sig keys securely
- [ ] Enable timelock on upgrades (48 hours)
- [ ] Set up emergency pause mechanism

---

## 🐛 Troubleshooting

### "Insufficient Funds"
**Solution**: Ensure wallet has enough native tokens for gas
```bash
# Check balance
cast balance $DEPLOYER_ADDRESS --rpc-url base

# Minimum recommended:
# Base: 0.05 ETH (~$150)
# Arbitrum: 0.1 ETH (~$300)
```

### "Verification Failed"
**Solution**: Wait 1-2 minutes, then retry
```bash
# Retry verification
forge verify-contract <ADDRESS> <CONTRACT_PATH> \
  --chain-id 8453 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --watch
```

### "Nonce Too Low/High"
**Solution**: Reset nonce
```bash
# Get current nonce
cast nonce $DEPLOYER_ADDRESS --rpc-url base

# Wait for pending transactions to clear
```

### "Gas Estimation Failed"
**Solution**: Increase gas limit
```bash
forge script <SCRIPT> \
  --gas-limit 5000000 \
  --rpc-url base \
  --broadcast
```

### "RPC Error"
**Solution**: Switch to backup RPC
```bash
# Backup Base RPCs:
# - https://base.llamarpc.com
# - https://base.blockpi.network/v1/rpc/public
# - https://1rpc.io/base
```

---

## 💰 Total Deployment Costs

### Base (Recommended)
| Component | Cost (USD) | One-Time | Per Token |
|-----------|-----------|----------|-----------|
| Masters | $40-80 | ✅ | - |
| Factory | $10-15 | ✅ | - |
| Governance | $15-20 | ✅ | - |
| Extensions | $30-50 | ✅ | - |
| Token Clone | $7-10 | - | ✅ |
| **TOTAL (Setup)** | **$95-165** | **✅** | - |
| **Per Token** | - | - | **$7-10** |

### Comparison vs Ethereum
| Network | Setup Cost | Per Token | 10 Tokens | 100 Tokens |
|---------|-----------|-----------|-----------|------------|
| Ethereum | ~$5,000 | $140 | $1,400 | $14,000 |
| Base | ~$150 | $10 | $100 | $1,000 |
| Arbitrum | ~$200 | $12 | $120 | $1,200 |
| Polygon | ~$50 | $1.50 | $15 | $150 |

**Savings on Base**: ~93% vs Ethereum

---

## 📞 Support & Resources

### Documentation
- Master Plan: `/docs/MASTER-PLAN.md`
- Stage Guides: `/docs/STAGE-*.md`
- Extension Guide: `/docs/ERC-EXTENSION-STRATEGY.md`

### Community
- Discord: [Community Channel]
- GitHub: [Issues & Discussions]
- Telegram: [Developer Group]

### Emergency Contacts
- Security Issues: security@chaincapital.com
- Technical Support: dev@chaincapital.com

---

## ✅ Deployment Completion Checklist

- [ ] All contracts deployed
- [ ] All contracts verified on explorer
- [ ] Production checklist passed (100%)
- [ ] Frontend updated with addresses
- [ ] Multi-sig configured
- [ ] Monitoring set up
- [ ] Team notified
- [ ] Documentation updated
- [ ] Security audit scheduled
- [ ] Deployment announcement prepared

---

**🎉 Congratulations! Your Chain Capital token system is now live in production!**

---

**Last Updated**: January 28, 2025  
**Maintained By**: Chain Capital Development Team
