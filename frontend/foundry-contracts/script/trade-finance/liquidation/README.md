# Liquidation Contracts - Individual Deployment Scripts

This directory contains individual deployment scripts for each liquidation contract in the Trade Finance protocol.

## 📁 Scripts

### 1. DutchAuctionLiquidator
**File**: `Deploy_DutchAuctionLiquidator.s.sol`  
**Features**: MEV-resistant Dutch auction liquidation

**Dependencies**:
```bash
export COMMODITY_LENDING_POOL=0x...
export ACL_MANAGER=0x...
export COMMODITY_ORACLE=0x...
```

**Deploy**:
```bash
forge script script/trade-finance/liquidation/Deploy_DutchAuctionLiquidator.s.sol \
    --rpc-url $RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

---

### 2. FlashLiquidation
**File**: `Deploy_FlashLiquidation.s.sol`  
**Features**: Zero-capital flash loan liquidation

**Dependencies**:
```bash
export POOL_ADDRESSES_PROVIDER=0x...
export ACL_MANAGER=0x...
```

**Deploy**:
```bash
forge script script/trade-finance/liquidation/Deploy_FlashLiquidation.s.sol \
    --rpc-url $RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

---

### 3. GracefulLiquidation
**File**: `Deploy_GracefulLiquidation.s.sol`  
**Features**: Soft liquidation with grace periods

**Dependencies**:
```bash
export COMMODITY_LENDING_POOL=0x...
export ACL_MANAGER=0x...
```

**Deploy**:
```bash
forge script script/trade-finance/liquidation/Deploy_GracefulLiquidation.s.sol \
    --rpc-url $RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

---

### 4. DEXLiquidationAdapter
**File**: `Deploy_DEXLiquidationAdapter.s.sol`  
**Features**: DEX integration for liquidation swaps

**Dependencies**:
```bash
export COMMODITY_LENDING_POOL=0x...
export ACL_MANAGER=0x...
```

**Deploy**:
```bash
forge script script/trade-finance/liquidation/Deploy_DEXLiquidationAdapter.s.sol \
    --rpc-url $RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

---

### 5. LiquidationDataProvider
**File**: `Deploy_LiquidationDataProvider.s.sol`  
**Features**: Liquidation data and analytics

**Dependencies**:
```bash
export COMMODITY_LENDING_POOL=0x...
export COMMODITY_ORACLE=0x...
```

**Deploy**:
```bash
forge script script/trade-finance/liquidation/Deploy_LiquidationDataProvider.s.sol \
    --rpc-url $RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

---

## 🎯 Usage Scenarios

### Scenario 1: Deploy All Liquidation Contracts
Use the Phase 3 deployment script:
```bash
forge script script/trade-finance/DeployPhase3RiskSecurity.s.sol \
    --rpc-url $RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

### Scenario 2: Deploy Single Contract for Testing
```bash
# Deploy just DutchAuctionLiquidator
forge script script/trade-finance/liquidation/Deploy_DutchAuctionLiquidator.s.sol \
    --rpc-url $RPC_URL \
    --broadcast \
    -vvvv
```

### Scenario 3: Upgrade Specific Contract
```bash
# Deploy new implementation
forge create src/trade-finance/liquidation/DutchAuctionLiquidatorV2.sol:DutchAuctionLiquidatorV2 \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

# Upgrade proxy
cast send $DUTCH_AUCTION_PROXY \
    "upgradeToAndCall(address,bytes)" \
    $NEW_IMPL \
    0x \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY
```

---

## ✅ Verification

After deployment, verify each contract:

```bash
# Check implementation
cast implementation $PROXY_ADDRESS --rpc-url $RPC_URL

# Check version (if implemented)
cast call $PROXY_ADDRESS "version()(string)" --rpc-url $RPC_URL

# Check owner
cast call $PROXY_ADDRESS "owner()(address)" --rpc-url $RPC_URL
```

---

## 📚 Documentation

- [Complete Upgradeability Guide](../../../docs/LIQUIDATION_UPGRADEABILITY_COMPLETE.md)
- [Quick Reference](../../../docs/LIQUIDATION_QUICK_REFERENCE.md)
- [Progress Tracker](../../../docs/LIQUIDATION_UPGRADEABILITY_PROGRESS.md)

---

## 🔧 Troubleshooting

### Issue: Missing Dependencies
**Error**: `Invalid pool address` or similar

**Solution**: Ensure all environment variables are set:
```bash
source .env
echo $COMMODITY_LENDING_POOL
echo $ACL_MANAGER
echo $COMMODITY_ORACLE
```

### Issue: Deployment Fails
**Solution**: Check RPC connectivity and wallet balance:
```bash
curl -X POST $RPC_URL -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

cast balance $DEPLOYER_ADDRESS --rpc-url $RPC_URL
```

### Issue: Verification Fails
**Solution**: Wait and retry:
```bash
sleep 120  # Wait 2 minutes
forge verify-contract $ADDRESS $CONTRACT_NAME --chain-id $CHAIN_ID --watch
```

---

**Last Updated**: January 3, 2026
