# Trade Finance Universal Deployment Scripts

## 📋 Overview

Universal Foundry deployment scripts for the Chain Capital Commodity Trade Finance platform. Deploy to any supported network with a single command.

## 🌐 Supported Networks

### Ethereum
- **Mainnet** (Chain ID: 1)
- **Sepolia** (Chain ID: 11155111)
- **Holesky** (Chain ID: 17000)

### Layer 2 - Mainnet
- **Base** (Chain ID: 8453)
- **Arbitrum One** (Chain ID: 42161)
- **Optimism** (Chain ID: 10)
- **Polygon** (Chain ID: 137)

### Layer 2 - Testnet
- **Base Sepolia** (Chain ID: 84532)
- **Arbitrum Sepolia** (Chain ID: 421614)
- **Optimism Sepolia** (Chain ID: 11155420)
- **Amoy** (Chain ID: 80002)

## 🚀 Quick Start

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Set up environment variables
cp .env.example .env
# Edit .env with your keys
```

### Required Environment Variables

```bash
# Deployer
DEPLOYER_ADDRESS=0x...
DEPLOYER_PRIVATE_KEY=0x...

# Network RPC URLs
VITE_MAINNET_RPC_URL=https://...
VITE_SEPOLIA_RPC_URL=https://...
VITE_BASE_RPC_URL=https://...
VITE_ARBITRUM_RPC_URL=https://...
VITE_OPTIMISM_RPC_URL=https://...
VITE_POLYGON_RPC_URL=https://...

# Testnet RPC URLs
VITE_BASE_SEPOLIA_RPC_URL=https://...
VITE_ARBITRUM_SEPOLIA_RPC_URL=https://...
VITE_OPTIMISM_SEPOLIA_RPC_URL=https://...
VITE_AMOY_RPC_URL=https://...

# Etherscan API Key (for verification)
VITE_ETHERSCAN_API_KEY=...

# Optional: Governance
GOVERNANCE_MULTISIG=0x...
EMERGENCY_ADMIN=0x...
```

## 📦 Deployment Options

### Option 1: Complete Deployment (Recommended)

Deploy everything in one command:

```bash
# Sepolia (testnet)
forge script script/trade-finance/DeployTradeFinanceComplete.s.sol:DeployTradeFinanceComplete \
  --rpc-url sepolia \
  --broadcast \
  --verify

# Base Sepolia
forge script script/trade-finance/DeployTradeFinanceComplete.s.sol:DeployTradeFinanceComplete \
  --rpc-url base_sepolia \
  --broadcast \
  --verify

# Mainnet (⚠️  use with caution)
forge script script/trade-finance/DeployTradeFinanceComplete.s.sol:DeployTradeFinanceComplete \
  --rpc-url mainnet \
  --broadcast \
  --verify \
  --slow # Add safety delay
```

### Option 2: Step-by-Step Deployment

Deploy components individually:

#### Step 1: Core Contracts
```bash
forge script script/trade-finance/DeployTradeFinanceCore.s.sol:DeployTradeFinanceCore \
  --rpc-url sepolia \
  --broadcast \
  --verify
```

Deploys:
- PoolAddressesProvider
- ACLManager
- CommodityLendingPool
- CommodityOracle
- PriceOracleSentinel (L2 only)
- PoolConfigurator
- HaircutEngine
- EmergencyModule
- CircuitBreakers
- Oracle adapters (if Chainlink available)

#### Step 2: Tokens
```bash
forge script script/trade-finance/DeployTradeFinanceTokens.s.sol:DeployTradeFinanceTokens \
  --rpc-url sepolia \
  --broadcast \
  --verify
```

Deploys:
- cGOLD / dGOLD (Gold receipt & debt tokens)
- cSILVER / dSILVER (Silver tokens)
- cOIL / dOIL (Oil tokens)
- cSOY / dSOY (Soybeans tokens)

### Option 3: Dry Run (No Broadcast)

Test deployment without sending transactions:

```bash
forge script script/trade-finance/DeployTradeFinanceComplete.s.sol:DeployTradeFinanceComplete \
  --rpc-url sepolia
```

## 🔍 Verification

### Automatic Verification

Verification happens automatically when using `--verify` flag:

```bash
forge script script/trade-finance/DeployTradeFinanceComplete.s.sol:DeployTradeFinanceComplete \
  --rpc-url sepolia \
  --broadcast \
  --verify \
  --etherscan-api-key $VITE_ETHERSCAN_API_KEY
```

### Manual Verification

If automatic verification fails:

```bash
# Verify single contract
forge verify-contract \
  --chain-id 11155111 \
  --etherscan-api-key $VITE_ETHERSCAN_API_KEY \
  0x... \ # Contract address
  src/trade-finance/core/CommodityLendingPool.sol:CommodityLendingPool

# Verify all contracts
bash script/trade-finance/verify-all.sh
```

## 📂 Deployment Artifacts

Deployments are saved to `deployments/` directory:

```
deployments/
├── trade-finance-core-11155111.json      # Sepolia core
├── trade-finance-tokens-11155111.json    # Sepolia tokens
├── trade-finance-core-84532.json         # Base Sepolia core
└── trade-finance-tokens-84532.json       # Base Sepolia tokens
```

View deployment:
```bash
cat deployments/trade-finance-core-11155111.json | jq
```

## ⚙️ Post-Deployment Configuration

After deployment, configure the protocol:

### 1. Set Up Reserves

```bash
# Example: Configure gold as a commodity reserve
cast send $POOL_CONFIGURATOR \
  "initReserve(address,address,address,uint8,address)" \
  $GOLD_TOKEN_ADDRESS \
  $C_GOLD_ADDRESS \
  $D_GOLD_ADDRESS \
  18 \
  $INTEREST_RATE_STRATEGY \
  --rpc-url sepolia \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### 2. Configure Risk Parameters

```solidity
// Example configuration
PoolConfigurator(poolConfigurator).setReserveFactors(
    goldToken,
    8000,  // 80% LTV
    8500,  // 85% Liquidation Threshold
    10500  // 105% Liquidation Bonus (5% profit)
);
```

### 3. Set Up Oracle Feeds

```bash
# Link Chainlink price feed
cast send $COMMODITY_ORACLE \
  "setAssetSource(address,address)" \
  $GOLD_TOKEN \
  $GOLD_PRICE_FEED \
  --rpc-url sepolia \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### 4. Configure Haircut Parameters

```bash
# Set statistical risk metrics
cast send $HAIRCUT_ENGINE \
  "updateRiskMetrics(uint8,tuple)" \
  0 \ # PRECIOUS_METAL
  "(1245,823,189,294,73,9500,365,$TIMESTAMP)" \
  --rpc-url sepolia \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## 🧪 Testing Deployment

### Run Integration Tests

```bash
forge test --match-contract TradeFinanceIntegration -vvv
```

### Manual Test Flow

```bash
# 1. Supply collateral
cast send $COMMODITY_POOL \
  "supply(address,uint256,address,uint16)" \
  $GOLD_TOKEN \
  1000000000000000000 \ # 1 gold token
  $YOUR_ADDRESS \
  0 \
  --rpc-url sepolia \
  --private-key $YOUR_PRIVATE_KEY

# 2. Borrow against collateral
cast send $COMMODITY_POOL \
  "borrow(address,uint256)" \
  $USDC_ADDRESS \
  500000000 \ # 500 USDC
  --rpc-url sepolia \
  --private-key $YOUR_PRIVATE_KEY

# 3. Check health factor
cast call $COMMODITY_POOL \
  "calculateHealthFactor(address)" \
  $YOUR_ADDRESS \
  --rpc-url sepolia
```

## 🔐 Security Considerations

### Before Mainnet Deployment

- [ ] Complete security audits (3+ firms)
- [ ] Run fuzzing tests (Echidna/Foundry)
- [ ] Formal verification of critical functions
- [ ] Bug bounty program launched
- [ ] Emergency procedures documented
- [ ] Multi-sig setup for governance
- [ ] Insurance coverage obtained

### Access Control Setup

```bash
# Set up multi-sig as governance
cast send $ACL_MANAGER \
  "addPoolAdmin(address)" \
  $GOVERNANCE_MULTISIG \
  --rpc-url mainnet \
  --private-key $DEPLOYER_PRIVATE_KEY

# Remove deployer as admin (after testing)
cast send $ACL_MANAGER \
  "removePoolAdmin(address)" \
  $DEPLOYER_ADDRESS \
  --rpc-url mainnet \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## 📊 Network-Specific Notes

### Ethereum Mainnet
- ✅ Full Chainlink oracle support
- ⚠️  High gas costs
- 💰 Recommend gas price: 20-50 gwei

### Base/Arbitrum/Optimism
- ✅ L2 Sequencer sentinel enabled
- ✅ Low gas costs
- ℹ️  1-hour grace period on liquidations during sequencer downtime

### Polygon
- ⚠️  Limited Chainlink feeds
- ℹ️  May require manual price feeding
- 💰 Recommend priority fee: 30+ gwei

## 🐛 Troubleshooting

### "Insufficient funds"
Ensure deployer has enough native tokens for gas:
- Ethereum: 0.5 ETH
- Base/Arbitrum/Optimism: 0.1 ETH
- Polygon: 100 MATIC

### "Nonce too low"
Reset nonce:
```bash
cast nonce $DEPLOYER_ADDRESS --rpc-url sepolia
# Use returned nonce in next transaction
```

### "Contract size exceeds 24KB"
This shouldn't happen due to modular architecture. If it does:
- Check if optimizer is enabled in foundry.toml
- Increase optimizer_runs to 200-1000

### "Verification failed"
- Ensure correct compiler version (0.8.20)
- Check constructor arguments match
- Wait 30 seconds after deployment before verifying

## 📚 Additional Resources

- [Component Analysis](../../../docs/COMMODITY_TRADE_FINANCE_COMPONENT_ANALYSIS.md)
- [Implementation Spec](../../../docs/COMMODITY_TRADE_FINANCE_IMPLEMENTATION.md)
- [Haircut Engine Guide](../../../docs/HAIRCUT_ENGINE_USAGE.md)
- [Chain Capital Learnings](../../../docs/AAVE_LEARNINGS_SUMMARY.md)

## 🆘 Support

- **Issues**: Create issue on GitHub
- **Questions**: Discord #trade-finance channel
- **Security**: security@chaincapital.com

---

**Last Updated**: December 11, 2024
**Version**: 1.0.0
**Status**: Ready for Testnet Deployment
