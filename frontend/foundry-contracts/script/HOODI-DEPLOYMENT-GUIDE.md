# Complete Hoodi Deployment Guide
**Chain Capital Token Factory - Full System Deployment**

## 🎯 Overview

This guide walks through deploying the complete Chain Capital token factory system to Hoodi testnet, including:
- ✅ 5 Infrastructure contracts
- ✅ TokenFactory (+ 50+ masters internally)
- ✅ ExtensionModuleFactory (+ 4 beacons)
- ✅ MultiSigWalletFactory
- ✅ 3 Deployer utilities

**Total Deployment:** ~70 contracts (11 top-level + ~60 internal masters/beacons)

---

## 📋 Prerequisites

### 1. Network Information
```
Network:    Ethereum Hoodi (Testnet)
Chain ID:   560048
RPC:        https://ethereum-hoodi-rpc.publicnode.com/
Explorer:   https://hoodi.etherscan.io/
Faucet:     https://hoodi.ethpandaops.io
```

### 2. Your Wallet
```
Address:    0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b
Location:   project_wallets table (encrypted)
Project ID: cdc4f92c-8da1-4d80-a917-a94eb8cafaf0
Network:    hoodi
```

### 3. Required Tools
- ✅ Foundry installed (`forge --version`)
- ✅ Access to project_wallets table
- ✅ ~1 ETH testnet funds (free from faucet)

---

## 🚀 Step-by-Step Deployment

### Step 1: Get Testnet ETH

Visit the Hoodi faucet and request funds:
```bash
# Open faucet
open https://hoodi.ethpandaops.io

# Enter your wallet address
0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b

# Request 1 ETH (may need to wait if recently requested)
```

**Check balance:**
```bash
cast balance 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b \
  --rpc-url https://ethereum-hoodi-rpc.publicnode.com/
```

Should show at least `1000000000000000000` (1 ETH in wei).

---

### Step 2: Decrypt Private Key

**Option A: Query Database Directly**
```sql
SELECT 
    wallet_address,
    private_key,  -- Encrypted JSON
    net,
    chain_id
FROM project_wallets
WHERE 
    project_id = 'cdc4f92c-8da1-4d80-a917-a94eb8cafaf0'
    AND net = 'hoodi'
    AND wallet_type = 'ethereum';
```

**Option B: Use Frontend Service**
```typescript
import { WalletEncryptionClient } from '@/services/wallet/encryption/WalletEncryptionClient';

const encryptedKey = '...'; // from database
const privateKey = await WalletEncryptionClient.decrypt(encryptedKey);
console.log('Decrypted:', privateKey);
```

**Option C: Use Backend Endpoint**
```bash
# Call backend decryption endpoint
curl -X POST http://localhost:3001/api/wallet-encryption/decrypt \
  -H "Content-Type: application/json" \
  -d '{"encrypted_key": "..."}'
```

---

### Step 3: Set Environment Variables

Create `.env` in foundry-contracts directory:
```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts

# Create .env file
cat > .env << 'EOF'
# Hoodi Testnet Configuration
HOODI_RPC=https://ethereum-hoodi-rpc.publicnode.com/
HOODI_PRIVATE_KEY=0x<your_decrypted_private_key>

# Optional: For contract verification
ETHERSCAN_API_KEY=<your_etherscan_api_key>
EOF

# Secure the file
chmod 600 .env
```

**Verify environment:**
```bash
# Check RPC connectivity
cast chain-id --rpc-url $HOODI_RPC
# Should output: 560048

# Check wallet balance
cast balance $(cast wallet address --private-key $HOODI_PRIVATE_KEY) \
  --rpc-url $HOODI_RPC
```

---

### Step 4: Build Contracts

```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts

# Clean previous builds
~/.foundry/bin/forge clean

# Build all contracts
~/.foundry/bin/forge build

# Expected output:
# [⠊] Compiling...
# [⠒] Compiling 150+ files with Solc 0.8.28
# [⠢] Solc 0.8.28 finished in X.XXs
# Compiler run successful!
```

**Verify build:**
```bash
ls -la out/DeployAllToHoodi.s.sol/
# Should see DeployAllToHoodi.json
```

---

### Step 5: Simulate Deployment (Dry Run)

Test the deployment without broadcasting:
```bash
~/.foundry/bin/forge script script/DeployAllToHoodi.s.sol \
  --rpc-url $HOODI_RPC \
  -vvv

# Expected output:
# ========================================
#   HOODI TESTNET DEPLOYMENT
# ========================================
# Chain ID: 560048
# Deployer: 0x5a4E...4c1
# Balance: 1.0 ETH
# ========================================
# 
# PHASE 1: Core Infrastructure (5 contracts)
# ...
```

**Check for errors** before proceeding to actual deployment.

---

### Step 6: Deploy to Hoodi

**IMPORTANT:** This will broadcast real transactions and spend ETH.

```bash
~/.foundry/bin/forge script script/DeployAllToHoodi.s.sol \
  --rpc-url $HOODI_RPC \
  --broadcast \
  --verify \
  -vvv

# Deployment will take 5-10 minutes
# Watch for transaction confirmations
```

**Expected Flow:**
```
Phase 1: Infrastructure (2-3 minutes)
  ✅ PolicyEngine: 0x...
  ✅ PolicyRegistry: 0x...
  ✅ TokenRegistry: 0x...
  ✅ UpgradeGovernor: 0x...
  ✅ UpgradeGovernance: 0x...

Phase 2: Token Factory (3-4 minutes)
  ✅ TokenFactory: 0x...
  (Internally deploys ~50 masters)

Phase 3: Extension Module Factory (1-2 minutes)
  ✅ ExtensionModuleFactory: 0x...
  (Includes 4 beacons)

Phase 4: Wallet Factory (30 seconds)
  ✅ MultiSigWalletFactory: 0x...

Phase 5: Deployer Utilities (1 minute)
  ✅ CREATE2Deployer: 0x...
  ✅ UniversalDeployer: 0x...
  ✅ BeaconProxyFactory: 0x...

========================================
  ✅ DEPLOYMENT COMPLETE
========================================
```

---

### Step 7: Save Deployment Addresses

Deployment is automatically saved to:
```
./deployments/hoodi-complete-<timestamp>.json
./deployments/hoodi-latest.json
```

**View deployment file:**
```bash
cat deployments/hoodi-latest.json | jq
```

**Expected structure:**
```json
{
  "policyEngine": "0x...",
  "policyRegistry": "0x...",
  "tokenRegistry": "0x...",
  "upgradeGovernor": "0x...",
  "upgradeGovernance": "0x...",
  "tokenFactory": "0x...",
  "extensionModuleFactory": "0x...",
  "multiSigFactory": "0x...",
  "create2Deployer": "0x...",
  "universalDeployer": "0x...",
  "beaconProxyFactory": "0x..."
}
```

---

### Step 8: Verify on Hoodi Etherscan

The `--verify` flag should auto-verify, but you can manually verify if needed:

```bash
# Verify PolicyEngine
~/.foundry/bin/forge verify-contract \
  <policy_engine_address> \
  src/policy/PolicyEngine.sol:PolicyEngine \
  --chain-id 560048 \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Repeat for all contracts...
```

**Check verification:**
```bash
# Open in browser
open "https://hoodi.etherscan.io/address/<contract_address>"
```

---

## 📊 Post-Deployment: Database Updates

### Step 9: Update `contract_masters` Table

**Get deployment addresses:**
```bash
# Load deployment file
export DEPLOYMENT=$(cat deployments/hoodi-latest.json)

# Extract addresses
export POLICY_ENGINE=$(echo $DEPLOYMENT | jq -r .policyEngine)
export TOKEN_FACTORY=$(echo $DEPLOYMENT | jq -r .tokenFactory)
# ... etc
```

**SQL Insert Script:**
```sql
-- Insert PolicyEngine
INSERT INTO contract_masters (
    network,
    environment,
    contract_type,
    contract_address,
    version,
    abi,
    deployed_by,
    deployment_tx_hash,
    is_active,
    deployment_data
) VALUES (
    'ethereum',
    'testnet',
    'policy_engine',
    '<policy_engine_address>',
    '1.0.0',
    '<policy_engine_abi_json>',
    '<your_user_id>',
    '<deployment_tx_hash>',
    true,
    jsonb_build_object(
        'network_name', 'hoodi',
        'chain_id', 560048,
        'deployed_at', now()
    )
);

-- Insert PolicyRegistry
INSERT INTO contract_masters (...) VALUES (...);

-- Insert TokenRegistry
INSERT INTO contract_masters (...) VALUES (...);

-- Insert TokenFactory (MOST IMPORTANT)
INSERT INTO contract_masters (
    network,
    environment,
    contract_type,
    contract_address,
    version,
    abi,
    deployed_by,
    deployment_tx_hash,
    is_active,
    deployment_data
) VALUES (
    'ethereum',
    'testnet',
    'factory',
    '<token_factory_address>',
    '1.0.0',
    '<token_factory_abi_json>',
    '<your_user_id>',
    '<deployment_tx_hash>',
    true,
    jsonb_build_object(
        'network_name', 'hoodi',
        'chain_id', 560048,
        'masters', jsonb_build_object(
            'erc20', '<erc20_master_from_factory>',
            'erc721', '<erc721_master_from_factory>',
            'erc1155', '<erc1155_master_from_factory>'
        ),
        'beacons', jsonb_build_object(
            'erc20', '<erc20_beacon_from_factory>',
            'erc721', '<erc721_beacon_from_factory>',
            'erc1155', '<erc1155_beacon_from_factory>'
        )
    )
);

-- Repeat for all contracts...
```

**Get master addresses from TokenFactory:**
```bash
# Get ERC20Master address
cast call $TOKEN_FACTORY "erc20Master()(address)" \
  --rpc-url $HOODI_RPC

# Get ERC20Beacon address
cast call $TOKEN_FACTORY "erc20Beacon()(address)" \
  --rpc-url $HOODI_RPC

# Repeat for all token standards...
```

---

## 🧪 Testing Deployment

### Test 1: Deploy ERC20 Token

```bash
# Set variables
export FACTORY_ADDRESS=<token_factory_address>
export DEPLOYER=0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b

# Deploy test token
cast send $FACTORY_ADDRESS \
  "deployERC20(string,string,uint256,uint256,address)(address)" \
  "Test Token" \
  "TEST" \
  "1000000000000000000000000" \
  "1000000000000000000000" \
  $DEPLOYER \
  --rpc-url $HOODI_RPC \
  --private-key $HOODI_PRIVATE_KEY

# Get transaction receipt
cast receipt <tx_hash> --rpc-url $HOODI_RPC

# Extract token address from event
export TOKEN_ADDRESS=<from_event_logs>
```

**Verify token:**
```bash
# Check token name
cast call $TOKEN_ADDRESS "name()(string)" --rpc-url $HOODI_RPC
# Output: Test Token

# Check symbol
cast call $TOKEN_ADDRESS "symbol()(string)" --rpc-url $HOODI_RPC
# Output: TEST

# Check total supply
cast call $TOKEN_ADDRESS "totalSupply()(uint256)" --rpc-url $HOODI_RPC
# Output: 1000000000000000000000 (1000 tokens with 18 decimals)
```

---

### Test 2: Deploy with Beacon (Upgradeable)

```bash
cast send $FACTORY_ADDRESS \
  "deployERC20WithBeacon(string,string,uint256,uint256,address)(address)" \
  "Beacon Token" \
  "BEACON" \
  "1000000000000000000000000" \
  "1000000000000000000000" \
  $DEPLOYER \
  --rpc-url $HOODI_RPC \
  --private-key $HOODI_PRIVATE_KEY
```

---

### Test 3: Deploy Multi-Sig Wallet

```bash
export MULTISIG_FACTORY=<multisig_factory_address>

# Create 2-of-3 wallet
cast send $MULTISIG_FACTORY \
  "createWallet(address[],uint256)(address)" \
  "[$DEPLOYER,0x...,0x...]" \
  2 \
  --rpc-url $HOODI_RPC \
  --private-key $HOODI_PRIVATE_KEY
```

---

## 📈 Monitoring & Maintenance

### Gas Usage Tracking
```bash
# Get deployment gas used
cast receipt <deployment_tx_hash> \
  --rpc-url $HOODI_RPC \
  --json | jq .gasUsed

# Typical costs:
# PolicyEngine:            ~2,000,000 gas
# TokenFactory:            ~15,000,000 gas (includes all masters)
# ExtensionModuleFactory:  ~3,000,000 gas
# Total:                   ~25,000,000 gas (~0.5 ETH @ 20 gwei)
```

### Beacon Monitoring
```bash
# Check beacon implementation
cast call $ERC20_BEACON "implementation()(address)" \
  --rpc-url $HOODI_RPC

# Should match TokenFactory's erc20Master
```

---

## 🚨 Troubleshooting

### Issue: "Insufficient funds"
```bash
# Check balance
cast balance $DEPLOYER --rpc-url $HOODI_RPC

# Request more from faucet
open https://hoodi.ethpandaops.io
```

### Issue: "Nonce too low"
```bash
# Reset nonce
cast wallet nonce $DEPLOYER --rpc-url $HOODI_RPC
```

### Issue: "Transaction timeout"
```bash
# Increase gas price
--gas-price 50000000000  # 50 gwei
```

### Issue: "Contract too large"
This shouldn't happen as TokenFactory handles large deployments internally. If it does, contact support.

---

## 📚 Next Steps

1. ✅ **Complete Deployment** - All contracts on Hoodi
2. 🔍 **Database Updates** - Record addresses in contract_masters
3. 🎨 **Frontend Config** - Update RPC and contract addresses
4. 🧪 **Integration Testing** - Test token creation from UI
5. 📝 **Documentation** - Update deployment docs with actual addresses
6. 🚀 **Mainnet Planning** - Prepare for production deployment

---

## 📞 Support

**Documentation:**
- Contract Verification: `/docs/hoodi-complete-contract-verification.md`
- Architecture: `/docs/OLD-DEPLOYMENT-FLOW-COMPREHENSIVE-EXPLANATION.md`

**Network:**
- Hoodi GitHub: https://github.com/eth-clients/hoodi
- Hoodi Docs: https://hoodi.ethpandaops.io

**Contract Issues:**
- Check Hoodi Etherscan for transaction details
- Review deployment logs in `deployments/` folder
- Compare with simulation (dry run) results

---

**Last Updated:** October 2025  
**Network:** Hoodi Testnet (Chain ID: 560048)  
**Status:** Ready for Deployment ✅
