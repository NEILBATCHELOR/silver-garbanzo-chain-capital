# Chain Capital Deployment Scripts
**Production-Ready Smart Contract Deployment System**

## 📁 Script Organization

### Core Deployment Scripts
- `DeployAllMasters.s.sol` - Deploy all 6 ERC standard master implementations
- `DeployTokenFactory.s.sol` - Deploy TokenFactory with minimal proxy support
- `DeployUUPS.s.sol` - Deploy governance and registry (Stage 2)
- `MultiChainDeploy.s.sol` - Deploy to single Layer 2 network

### Extension Module Scripts
- `DeployExtensionsPhase1.s.sol` - Critical compliance modules (P0)
- `DeployExtensionsPhase2.s.sol` - Governance & fees modules (P1)
- `DeployExtensionsPhase3.s.sol` - Advanced features (P2)
- `DeployExtensionsPhase4.s.sol` - DeFi integration (P3)

### Utility Scripts
- `VerifyContracts.s.sol` - Verify all contracts on block explorers
- `UpgradeToken.s.sol` - Upgrade existing token implementations
- `BatchDeployTokens.s.sol` - Deploy multiple tokens efficiently
- `MultiChainBatchDeploy.s.sol` - Deploy to all networks simultaneously

### Validation Scripts
- `ProductionChecklist.s.sol` - Pre-deployment validation and testing
- `TestDeployment.s.sol` - Test deployment with sample tokens

---

## 🚀 Quick Start

### 1. Local Testing (Anvil)
```bash
# Terminal 1: Start local node
anvil

# Terminal 2: Deploy everything locally
forge script script/DeployAllMasters.s.sol --rpc-url http://localhost:8545 --broadcast
```

### 2. Testnet Deployment (FREE)
```bash
# Deploy to Sepolia testnet
forge script script/DeployAllMasters.s.sol \
  --rpc-url sepolia \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### 3. Layer 2 Production (Base)
```bash
# Deploy to Base mainnet ($5-10 per token)
forge script script/MultiChainDeploy.s.sol \
  --rpc-url base \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### 4. Multi-Chain Deployment
```bash
# Deploy to all supported networks
forge script script/MultiChainBatchDeploy.s.sol \
  --rpc-url sepolia \
  --broadcast \
  --multi
```

---

## 📋 Deployment Order

### Stage 1: Core Infrastructure
1. `DeployAllMasters.s.sol` - Master implementations
2. `DeployTokenFactory.s.sol` - Factory contract
3. `TestDeployment.s.sol` - Verify everything works

### Stage 2: Governance
1. `DeployUUPS.s.sol` - Governance + Registry
2. Test upgrade process

### Stage 3: Extensions
1. `DeployExtensionsPhase1.s.sol` - Compliance (required for legal)
2. `DeployExtensionsPhase2.s.sol` - Governance & Fees
3. `DeployExtensionsPhase3.s.sol` - Advanced features
4. `DeployExtensionsPhase4.s.sol` - DeFi integration

### Stage 4: Production
1. `ProductionChecklist.s.sol` - Final validation
2. Deploy to mainnet/Layer 2
3. `VerifyContracts.s.sol` - Verify on explorer

---

## 🌐 Supported Networks

### Testnets (FREE)
- Ethereum Sepolia (11155111)
- Base Sepolia (84532)
- Arbitrum Sepolia (421614)
- Polygon Amoy (80002)
- Optimism Sepolia (11155420)

### Mainnets
- Ethereum (1) - ~$140 per token
- Base (8453) - ~$7.50 per token ⭐ RECOMMENDED
- Arbitrum (42161) - ~$12 per token
- Polygon (137) - ~$1.50 per token
- Optimism (10) - ~$9 per token

---

## 🔐 Environment Variables

Create `.env` file:
```bash
# Deployment
PRIVATE_KEY=your_private_key

# RPC Endpoints
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_key
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
POLYGON_RPC_URL=https://polygon-rpc.com

# Block Explorers
ETHERSCAN_API_KEY=your_etherscan_key
BASESCAN_API_KEY=your_basescan_key
ARBISCAN_API_KEY=your_arbiscan_key
POLYGONSCAN_API_KEY=your_polygonscan_key

# Multi-Sig (Stage 2)
UPGRADER_2=0x...
UPGRADER_3=0x...
```

---

## 📊 Gas Cost Estimates

| Network | Master Deploy | Token Clone | 10 Tokens | 100 Tokens |
|---------|--------------|-------------|-----------|------------|
| **Ethereum** | $140 | $140 | $1,400 | $14,000 |
| **Base** | $7.50 | $7.50 | $75 | $750 |
| **Arbitrum** | $12 | $12 | $120 | $1,200 |
| **Polygon** | $1.50 | $1.50 | $15 | $150 |
| **Optimism** | $9 | $9 | $90 | $900 |

**Savings vs Ethereum**: 87-99% on Layer 2

---

## ✅ Pre-Deployment Checklist

- [ ] Test on local Anvil node
- [ ] Deploy to testnet (Sepolia/Base Sepolia)
- [ ] Verify contracts on explorer
- [ ] Test all token operations
- [ ] Run `ProductionChecklist.s.sol`
- [ ] Set up multi-sig for upgrades
- [ ] Configure monitoring/alerts
- [ ] Deploy to mainnet/Layer 2

---

## 🛠️ Troubleshooting

### "Insufficient funds"
- Ensure you have enough ETH/MATIC for gas
- Get testnet tokens from faucets

### "Verification failed"
- Wait 1-2 minutes after deployment
- Ensure correct API key
- Check network configuration

### "Nonce too low"
- Reset nonce: `cast wallet nonce --rpc-url <url>`

### "Gas estimation failed"
- Increase gas limit: `--gas-limit 5000000`
- Check RPC endpoint is working

---

## 📞 Support

- Documentation: `/docs/`
- Issues: GitHub Issues
- Discord: [Community Channel]

---

**Last Updated**: January 2025  
**Status**: ✅ Production Ready
