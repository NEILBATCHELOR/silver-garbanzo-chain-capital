# 🚀 Hoodi Deployment - Automated Quick Start

## Overview

This deployment system is **fully automated** - it reads configuration from your frontend `.env` file, automatically decrypts your wallet from the database, and performs comprehensive pre-flight checks.

**No manual .env setup required!**

---

## ✅ What's Automated

1. **Reads from frontend/.env**
   - VITE_HOODI_RPC_URL
   - VITE_ETHERSCAN_API_KEY
   - VITE_WALLET_MASTER_PASSWORD
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_SERVICE_ROLE_KEY

2. **Automatically decrypts wallet**
   - Queries `project_wallets` table
   - Decrypts using `WalletEncryptionClient`
   - Creates foundry-contracts/.env

3. **Comprehensive validation**
   - Foundry installation
   - Node.js and dependencies
   - RPC connectivity
   - Wallet balance
   - Contract compilation
   - Deployment simulation

---

## 📋 Prerequisites

### 1. Get Testnet ETH (Required)

Visit the Hoodi faucet and request 1 ETH:
```bash
https://hoodi.ethpandaops.io
```

**Your wallet address:**
```
0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b
```

### 2. Install ts-node (If Not Already Installed)

```bash
npm install -g ts-node
```

### 3. Verify Frontend .env

Ensure these variables are set in `/frontend/.env`:
```bash
VITE_SUPABASE_URL=https://jrwfkxfzsnnjppogthaw.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
VITE_WALLET_MASTER_PASSWORD=xyrY6n9MdwMDvZNLfESrk5RkvVJwLz2G
VITE_HOODI_RPC_URL=https://eth-hoodi.g.alchemy.com/v2/...
VITE_ETHERSCAN_API_KEY=ZSGGP71WKZ3RSWHAS9F4IBIJ2MCBEX1CAJ
```

---

## 🎯 Quick Start (2 Steps)

### Step 1: Run Pre-Flight Check

```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts
./script/pre-flight-check.sh
```

This will:
- ✅ Verify Foundry installation
- ✅ Check Node.js and ts-node
- ✅ Validate frontend .env configuration
- ✅ Decrypt wallet from database automatically
- ✅ Test RPC connectivity
- ✅ Check wallet balance (needs 0.5+ ETH)
- ✅ Compile all contracts
- ✅ Verify deployment script
- ✅ Run deployment simulation
- ✅ Display final configuration

**Expected Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Pre-Flight Check Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ✅ Passed: 10 / 10
   ❌ Failed: 0 / 10

✅ All checks passed! Ready to deploy! 🚀
```

### Step 2: Deploy (If All Checks Pass)

```bash
forge script script/DeployAllToHoodi.s.sol \
  --rpc-url $HOODI_RPC \
  --broadcast \
  --verify \
  -vvv
```

---

## 📊 What Gets Deployed

### Infrastructure Contracts (5)
- PolicyEngine
- PolicyRegistry  
- TokenRegistry
- UpgradeGovernor
- UpgradeGovernance

### TokenFactory (1 contract, deploys ~57 internally)
- Factory contract itself
- 7 Master implementations (ERC20, ERC721, ERC1155, ERC3525, ERC4626, ERC1400, ERC20Rebasing)
- 7 Beacon contracts for upgrades

### ExtensionModuleFactory (1 contract, deploys ~4 internally)
- Factory contract
- 4 Beacons for extension modules

### Utility Contracts (3)
- CREATE2Deployer
- UniversalDeployer  
- BeaconProxyFactory

### MultiSigWalletFactory (1)

**Total Deployment:** 11 top-level + ~60 internal = **~70 contracts**

---

## 💰 Estimated Costs

| Component | Gas | Cost @ 20 gwei |
|-----------|-----|----------------|
| Infrastructure | ~10M | ~0.2 ETH |
| TokenFactory | ~15M | ~0.3 ETH |
| ExtensionFactory | ~3M | ~0.06 ETH |
| Utilities | ~2M | ~0.04 ETH |
| **Total** | **~30M** | **~0.6 ETH** |

**All FREE on Hoodi testnet!**

---

## 🔍 Troubleshooting

### Issue: "ts-node: command not found"

**Solution:**
```bash
npm install -g ts-node
```

### Issue: "Insufficient funds"

**Solution:**
1. Visit https://hoodi.ethpandaops.io
2. Request ETH for: `0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b`
3. Wait 1-2 minutes
4. Run pre-flight check again

### Issue: "Cannot connect to RPC"

**Solution:**
1. Check `VITE_HOODI_RPC_URL` in `frontend/.env`
2. Try alternative RPC: `https://ethereum-hoodi-rpc.publicnode.com/`
3. Verify network is up: https://hoodi.ethpandaops.io

### Issue: "Decryption failed"

**Solution:**
1. Verify `VITE_WALLET_MASTER_PASSWORD` in `frontend/.env`
2. Check database connectivity
3. Ensure wallet exists with:
   - `project_id: cdc4f92c-8da1-4d80-a917-a94eb8cafaf0`
   - `net: hoodi`

### Issue: "Simulation failed"

**Solution:**
1. Run `forge clean`
2. Run `forge build`
3. Check logs: `/tmp/hoodi-simulation.log`
4. Verify all contracts compile

---

## 📁 Generated Files

After running the pre-flight check, these files are created:

### foundry-contracts/.env (Auto-generated)
```bash
# DO NOT COMMIT THIS FILE
HOODI_RPC=https://eth-hoodi.g.alchemy.com/v2/...
HOODI_CHAIN_ID=560048
HOODI_PRIVATE_KEY=0x...
DEPLOYER_ADDRESS=0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b
ETHERSCAN_API_KEY=ZSGGP71WKZ3RSWHAS9F4IBIJ2MCBEX1CAJ
PROJECT_ID=cdc4f92c-8da1-4d80-a917-a94eb8cafaf0
```

### deployments/hoodi-latest.json (After deployment)
```json
{
  "timestamp": "2025-01-18T10:30:00Z",
  "deployer": "0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b",
  "network": "hoodi",
  "chainId": 560048,
  "contracts": {
    "PolicyEngine": "0x...",
    "TokenFactory": "0x...",
    "ExtensionModuleFactory": "0x...",
    ...
  }
}
```

---

## ✅ Post-Deployment Checklist

After successful deployment:

### 1. Verify Contracts on Etherscan

```bash
# View your deployments
cat deployments/hoodi-latest.json

# Check each contract
open https://hoodi.etherscan.io/address/<CONTRACT_ADDRESS>
```

### 2. Update Database

Run SQL to insert deployment records:
```sql
-- Insert all deployed contracts
INSERT INTO contract_masters (
    network,
    environment,
    contract_type,
    contract_address,
    version,
    abi,
    deployed_by,
    deployment_tx_hash,
    is_active
) VALUES
    ('ethereum', 'testnet', 'factory', '<FACTORY_ADDRESS>', '1.0.0', '<ABI>', '<USER_ID>', '<TX_HASH>', true),
    -- Add all other contracts...
```

### 3. Test Token Deployment

```bash
# Load environment
source .env

# Deploy test token
cast send $FACTORY_ADDRESS \
  "deployERC20(string,string,uint256,uint256,address)" \
  "Test Token" "TEST" \
  "1000000000000000000000000" \
  "1000000000000000000000" \
  $DEPLOYER_ADDRESS \
  --rpc-url $HOODI_RPC \
  --private-key $HOODI_PRIVATE_KEY

# Get token address from transaction receipt
TOKEN_ADDRESS="0x..."

# Verify token
cast call $TOKEN_ADDRESS "name()(string)" --rpc-url $HOODI_RPC
cast call $TOKEN_ADDRESS "symbol()(string)" --rpc-url $HOODI_RPC
cast call $TOKEN_ADDRESS "totalSupply()(uint256)" --rpc-url $HOODI_RPC
```

### 4. Update Frontend Configuration

Update your frontend deployment configuration to use the new addresses.

---

## 📚 Additional Documentation

- **Comprehensive Verification:** `docs/hoodi-complete-contract-verification.md`
- **Deployment Guide:** `script/HOODI-DEPLOYMENT-GUIDE.md`
- **Deployment Summary:** `script/DEPLOYMENT-SUMMARY.md`
- **Old Deployment Flow:** `docs/OLD-DEPLOYMENT-FLOW-COMPREHENSIVE-EXPLANATION.md`

---

## 🎓 Key Features

### 1. Automatic Decryption
- No manual .env setup
- Reads master password from frontend/.env
- Queries database directly
- Uses existing WalletEncryptionClient logic

### 2. Comprehensive Validation
- 10 automated checks
- Clear error messages
- Helpful remediation steps
- Simulation before actual deployment

### 3. Safe & Auditable
- Creates audit log in database
- Simulation first (no gas wasted)
- Clear confirmation before broadcast
- All transactions logged

---

## 🆘 Support

### Quick Commands Reference

```bash
# Check balance
cast balance 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b \
  --rpc-url https://eth-hoodi.g.alchemy.com/v2/...

# Get current block
cast block-number --rpc-url $HOODI_RPC

# Check nonce
cast nonce 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b \
  --rpc-url $HOODI_RPC

# Clean and rebuild
forge clean
forge build

# Run tests
forge test -vvv
```

### Get Help

If you encounter issues:
1. Check `/tmp/hoodi-simulation.log` for detailed logs
2. Review frontend `.env` configuration
3. Verify wallet has sufficient testnet ETH
4. Ensure RPC is responding

---

## 🎯 Success Criteria

Your deployment is successful when:

✅ Pre-flight check shows 10/10 passed
✅ All contracts deployed without errors
✅ Addresses saved to `deployments/hoodi-latest.json`
✅ Contracts verified on Hoodi Etherscan
✅ Test token deployment succeeds
✅ Database updated with deployment records

---

**Ready to deploy! Start with:**

```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts
./script/pre-flight-check.sh
```

Good luck! 🚀
