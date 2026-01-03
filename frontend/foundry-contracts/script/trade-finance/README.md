# Trade Finance Deployment Scripts

**Organization**: Modular phase-based deployment  
**Pattern**: UUPS upgradeable contracts  
**Total Phases**: 5

---

## 📁 Scripts Overview

### Phase Scripts

| Script | Contracts | Dependencies | Lines |
|--------|-----------|--------------|-------|
| `DeployPhase1Governance.s.sol` | 3 | None | ~160 |
| `DeployPhase2CoreProtocol.s.sol` | 7 | Phase 1 | ~280 |
| `DeployPhase3RiskSecurity.s.sol` | 8 | Phase 1,2 | ~350 |
| `DeployPhase4RewardsTreasury.s.sol` | 6 | Phase 1,2 | ~300 |
| `DeployPhase5Liquidation.s.sol` | 5 | Phase 1,2 | ~240 |

### Utilities

- `DeploymentBase.sol` - Shared deployment utilities
- `NetworkConfig.sol` - Network-specific configuration

---

## 🚀 Quick Start

### Option 1: Automated Complete Deployment

```bash
# From project root
cd script
chmod +x deploy-complete.sh
./deploy-complete.sh
```

### Option 2: Manual Phase Deployment

```bash
# Phase 1 - No dependencies
forge script script/trade-finance/DeployPhase1Governance.s.sol \
    --rpc-url $HOODI_RPC_URL --broadcast --verify

# Phase 2 - Requires Phase 1 addresses
forge script script/trade-finance/DeployPhase2CoreProtocol.s.sol \
    --rpc-url $HOODI_RPC_URL --broadcast --verify \
    --sig "run(address,address)" \
    $POOL_ADDRESSES_PROVIDER \
    $ACL_MANAGER

# Phase 3 - Requires Phase 1 & 2 addresses
forge script script/trade-finance/DeployPhase3RiskSecurity.s.sol \
    --rpc-url $HOODI_RPC_URL --broadcast --verify \
    --sig "run(address,address,address,address)" \
    $POOL_ADDRESSES_PROVIDER \
    $COMMODITY_LENDING_POOL \
    $ACL_MANAGER \
    $COMMODITY_ORACLE

# Phase 4 - Requires Phase 1 & 2 addresses
forge script script/trade-finance/DeployPhase4RewardsTreasury.s.sol \
    --rpc-url $HOODI_RPC_URL --broadcast --verify \
    --sig "run(address,address,address)" \
    $POOL_ADDRESSES_PROVIDER \
    $COMMODITY_LENDING_POOL \
    $ACL_MANAGER

# Phase 5 - Requires Phase 1 & 2 addresses
forge script script/trade-finance/DeployPhase5Liquidation.s.sol \
    --rpc-url $HOODI_RPC_URL --broadcast --verify \
    --sig "run(address,address,address,address)" \
    $POOL_ADDRESSES_PROVIDER \
    $COMMODITY_LENDING_POOL \
    $ACL_MANAGER \
    $COMMODITY_ORACLE
```

---

## 📋 Phase Dependencies

```
Phase 1 (Governance)
    │
    ├─→ Phase 2 (Core Protocol)
    │       │
    │       ├─→ Phase 3 (Risk & Security)
    │       │
    │       ├─→ Phase 4 (Rewards & Treasury)
    │       │
    │       └─→ Phase 5 (Liquidation)
```

**Required Environment Variables**:

```bash
# For all phases
export DEPLOYER_ADDRESS=0x...
export PRIVATE_KEY=0x...
export HOODI_RPC_URL=https://...
export HOODI_ETHERSCAN_API_KEY=...  # Optional but recommended

# Save after Phase 1
export POOL_ADDRESSES_PROVIDER=0x...
export ACL_MANAGER=0x...
export POOL_CONFIGURATOR=0x...

# Save after Phase 2
export COMMODITY_LENDING_POOL=0x...
export COMMODITY_ORACLE=0x...
export FUTURES_CURVE_ORACLE=0x...
export PRICE_ORACLE_SENTINEL=0x...
```

---

## 📝 Contract Details

### Phase 1: Governance (Week 1)

**Critical**: Controls all protocol permissions

- `PoolAddressesProvider` - Central address registry
- `ACLManager` - Role-based access control
- `PoolConfigurator` - Reserve configuration

### Phase 2: Core Protocol (Week 2)

**High**: Core lending and oracle infrastructure

- `CommodityLendingPool` - Main lending pool
- `CommodityOracle` - Spot price oracle
- `FuturesCurveOracle` - Futures curve pricing
- `PriceOracleSentinel` - Emergency price monitoring
- `CommodityInterestRateStrategyV2` - Interest rate model
- `CommodityInterestRateStrategyV3` - Advanced interest model
- `CommodityOracleConfigurator` - Oracle management

### Phase 3: Risk & Security (Week 3)

**High**: Risk management and emergency systems

- `HaircutEngine` - Collateral haircut calculations
- `CircuitBreakers` - Emergency stop mechanisms
- `EmergencyModule` - Protocol emergency controls
- `DutchAuctionLiquidator` - MEV-resistant liquidation
- `GracefulLiquidation` - Soft liquidation with grace periods
- `FlashLiquidation` - Flash loan liquidation
- `DEXLiquidationAdapter` - DEX integration for liquidations
- `LiquidationDataProvider` - Liquidation data aggregation

### Phase 4: Rewards & Treasury (Week 4)

**Medium**: Tokenomics and treasury management

- `RewardsController` - Reward distribution controller
- `EmissionManager` - Emission schedule management
- `RewardsDistributor` - Reward token distribution
- `Collector` - Fee collection
- `ProtocolReserve` - Protocol treasury
- `RevenueSplitter` - Revenue distribution

### Phase 5: Liquidation (Week 5)

**High**: Liquidation mechanism implementations

- `DutchAuctionLiquidator` - Auction-based liquidation
- `GracefulLiquidation` - Margin call system
- `FlashLiquidation` - Zero-capital liquidation
- `DEXLiquidationAdapter` - DEX swap integration
- `LiquidationDataProvider` - Liquidation analytics

---

## ✅ Post-Deployment Checklist

### After Each Phase

- [ ] Save proxy addresses to environment variables
- [ ] Save implementation addresses for records
- [ ] Verify contracts on block explorer
- [ ] Check owner/admin addresses
- [ ] Record in database
- [ ] Update documentation

### After Complete Deployment

- [ ] All contracts verified
- [ ] All addresses in database
- [ ] Configuration validated
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Team notified

---

## 🔍 Verification

```bash
# Check implementation
cast implementation <PROXY_ADDRESS> --rpc-url $HOODI_RPC_URL

# Check owner
cast call <PROXY_ADDRESS> "owner()(address)" --rpc-url $HOODI_RPC_URL

# Check version
cast call <PROXY_ADDRESS> "version()(string)" --rpc-url $HOODI_RPC_URL
```

---

## 📚 Documentation

- [Modular Deployment Guide](../../docs/DEPLOYMENT_MODULAR_GUIDE.md)
- [Refactoring Summary](../../docs/DEPLOYMENT_REFACTORING_SUMMARY.md)
- [Upgradeability Analysis](../../docs/TRADE_FINANCE_UPGRADEABILITY_ANALYSIS.md)
- [Implementation Guide](../../docs/TRADE_FINANCE_UPGRADEABILITY_IMPLEMENTATION.md)
- [Quick Reference](../../docs/TRADE_FINANCE_UPGRADEABILITY_QUICKREF.md)

---

## 🐛 Troubleshooting

### Deployment Fails

```bash
# Check RPC connectivity
curl -X POST $HOODI_RPC_URL \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check wallet balance
cast balance $DEPLOYER_ADDRESS --rpc-url $HOODI_RPC_URL

# Check nonce
cast nonce $DEPLOYER_ADDRESS --rpc-url $HOODI_RPC_URL
```

### Verification Fails

```bash
# Wait and retry
sleep 120
forge verify-contract <ADDRESS> <CONTRACT_NAME> \
    --chain-id <CHAIN_ID> \
    --etherscan-api-key $HOODI_ETHERSCAN_API_KEY \
    --watch
```

---

**Last Updated**: January 3, 2026  
**Status**: ✅ All phases ready for deployment
