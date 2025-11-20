# Hoodi Testnet Complete Deployment Guide

## Overview

This guide covers the **maximal deployment** of the entire Chain Capital token infrastructure to Hoodi Testnet.

**Deployment Script**: `DeployHoodiComplete.s.sol`
**Network**: Hoodi Testnet (Chain ID: 560048)
**RPC**: https://ethereum-hoodi-rpc.publicnode.com/
**Super Admin**: `0xAD69315aD80648c0C8ce66EF06a7F9eB3c685C41`

---

## What Gets Deployed

### Total: 100+ Contracts

#### Infrastructure (7 contracts)
- ✅ PolicyEngine (UUPS upgradeable)
- ✅ PolicyRegistry (UUPS upgradeable)
- ✅ TokenRegistry (UUPS upgradeable)
- ✅ UpgradeGovernor (Multi-sig governance)
- ✅ HaircutEngine (Risk management)
- ✅ ExtensionRegistry (UUPS upgradeable)
- ✅ FactoryRegistry (UUPS upgradeable)

#### Masters & Beacons (18 contracts)
- ✅ 9 Master implementations (ERC20, ERC721, ERC1155, ERC1400, ERC3525, ERC4626, ERC20Rebasing, ERC20Wrapper, ERC721Wrapper)
- ✅ 9 Upgrade beacons (one per master)

#### Extension Modules (34 contracts)
- ✅ ERC20 extensions (10): Permit, Compliance, Vesting, Snapshot, Timelock, FlashMint, Votes, Fees, TemporaryApproval, Payable
- ✅ ERC721 extensions (7): Royalty, Soulbound, Rental, Fraction, Metadata, GranularApproval, Consecutive
- ✅ ERC1155 extensions (3): URIManagement, SupplyCap, Royalty
- ✅ ERC1400 extensions (3): Controller, Document, TransferRestrictions
- ✅ ERC3525 extensions (3): SlotManager, SlotApprovable, ValueExchange
- ✅ ERC4626 extensions (8): YieldStrategy, WithdrawalQueue, FeeStrategy, AsyncVault, NativeVault, Router, MultiAssetVault

#### Extension Factories (7 contracts)
- ✅ ERC20ExtensionFactory
- ✅ ERC721ExtensionFactory
- ✅ ERC1155ExtensionFactory
- ✅ ERC1400ExtensionFactory
- ✅ ERC3525ExtensionFactory
- ✅ ERC4626ExtensionFactory
- ✅ UniversalExtensionFactory

#### Token Factories (8 contracts)
- ✅ ERC20Factory
- ✅ ERC721Factory
- ✅ ERC1155Factory
- ✅ ERC1400Factory
- ✅ ERC3525Factory
- ✅ ERC4626Factory
- ✅ **ERC20WrapperFactory** (NEW)
- ✅ **ERC721WrapperFactory** (NEW)

#### Deployers (3 contracts)
- ✅ CREATE2Deployer
- ✅ UniversalDeployer
- ✅ BeaconProxyFactory

#### Governance & MultiSig (3 contracts)
- ✅ UpgradeGovernance (Legacy)
- ✅ MultiSigWallet (with deployer + super admin)
- ✅ MultiSigWalletFactory

---

## Deployment Phases

The script executes **10 phases** in order:

### Phase 1: Infrastructure
Deploys core registries and governance contracts with UUPS proxy pattern.

### Phase 2: Masters & Beacons
Deploys all 9 master implementations and their upgrade beacons.

### Phase 3: Extension Modules
Deploys all 34 extension module implementations.

### Phase 4: Extension Factories
Deploys 7 extension factories and initializes their beacons.

### Phase 5: Token Factories
Deploys 8 token factories (including new wrapper factories).

### Phase 6: Deployers
Deploys utility deployer contracts.

### Phase 7: Governance & MultiSig
Deploys governance and multi-signature wallet contracts.

### Phase 8: System Configuration ⚠️ **CRITICAL**
- Grants `REGISTRAR_ROLE` to all token factories on FactoryRegistry
- Grants `REGISTRAR_ROLE` to all extension factories on ExtensionRegistry
- Grants `REGISTRAR_ROLE` to all token factories on TokenRegistry
- Registers all 8 factories with FactoryRegistry

### Phase 9: Deployment Validation
- Validates all critical contracts are deployed
- Verifies factory registrations
- Ensures system is operational

### Phase 10: Ownership Transfer
Transfers DEFAULT_ADMIN_ROLE to Super Admin (`0xAD69315aD80648c0C8ce66EF06a7F9eB3c685C41`) for:
- FactoryRegistry
- ExtensionRegistry
- TokenRegistry
- PolicyEngine
- PolicyRegistry

---

## Prerequisites

### 1. Environment Variables

Create `.env` file in `foundry-contracts/` directory:

```bash
# Hoodi Testnet Configuration
HOODI_PRIVATE_KEY=<your_private_key_without_0x>
HOODI_RPC_URL=https://ethereum-hoodi-rpc.publicnode.com/
```

### 2. Wallet Requirements

- **Deployer wallet** must have **0.5+ ETH** on Hoodi Testnet
- Get Hoodi testnet ETH from faucet (if available) or bridge from another testnet

### 3. Verify Foundry Installation

```bash
forge --version
# Should be: forge 0.2.0 or higher
```

---

## Deployment Instructions

### Step 1: Navigate to Foundry Directory

```bash
cd frontend/foundry-contracts
```

### Step 2: Compile Contracts

```bash
forge build
```

**Expected output**: All contracts compile successfully

### Step 3: Dry Run (Simulation)

Test the deployment without broadcasting:

```bash
forge script script/DeployHoodiComplete.s.sol \
  --rpc-url $HOODI_RPC_URL \
  --private-key $HOODI_PRIVATE_KEY \
  -vvv
```

**What to check**:
- ✅ All phases complete without errors
- ✅ Contract count shows ~100 contracts
- ✅ Gas checks pass
- ✅ Validation phase passes

### Step 4: Execute Deployment

**⚠️ WARNING: This deploys to real network and costs gas**

```bash
forge script script/DeployHoodiComplete.s.sol \
  --rpc-url $HOODI_RPC_URL \
  --private-key $HOODI_PRIVATE_KEY \
  --broadcast \
  --verify \
  -vvv
```

**Flags**:
- `--broadcast`: Actually send transactions (REAL deployment)
- `--verify`: Verify contracts on block explorer (if supported)
- `-vvv`: Verbose logging

### Step 5: Monitor Deployment

Watch the console output for each phase:

```
PHASE 1: Infrastructure
  ✅ PolicyRegistry: 0x...
  ✅ PolicyEngine: 0x...
  ...
After Phase 1 - Remaining: X.XX ETH

PHASE 2: Masters & Beacons
  ✅ Deployed 9 Masters and 9 Beacons (18 contracts)
After Phase 2 - Remaining: X.XX ETH

...

PHASE 8: System Configuration
  🔧 Configuring registries and roles...
  ✅ Granted REGISTRAR_ROLE to 8 token factories
  ✅ Granted REGISTRAR_ROLE to 7 extension factories
  📝 Registering factories...
  ✅ Registered 8 factories
  ✅ System configuration complete

PHASE 9: Deployment Validation
  🔍 Validating deployment...
  ✅ Infrastructure validated
  ✅ Masters validated
  ✅ Token factories validated
  ✅ Factory registrations validated
  ✅ All validations passed

PHASE 10: Ownership Transfer to Super Admin
  👑 Transferring ownership to Super Admin: 0xAD69...
  ✅ Ownership transferred to Super Admin

========================================
  ✅ MAXIMAL DEPLOYMENT COMPLETE
========================================
TOTAL: 100+ contracts deployed
Status: FULLY CONFIGURED & OPERATIONAL
Ownership: Transferred to Super Admin
========================================
```

### Step 6: Verify Deployment Output

Check the generated deployment file:

```bash
cat deployments/hoodi-complete.json
```

This JSON file contains all deployed contract addresses.

---

## Post-Deployment Verification

### 1. Verify Factory Registrations

```bash
# Use cast to query FactoryRegistry
cast call <FACTORY_REGISTRY_ADDRESS> "latestFactory(string)(address)" "ERC20" \
  --rpc-url $HOODI_RPC_URL

# Should return: <ERC20_FACTORY_ADDRESS>
```

### 2. Verify Ownership Transfer

```bash
# Check PolicyEngine admin
cast call <POLICY_ENGINE_ADDRESS> "hasRole(bytes32,address)(bool)" \
  $(cast keccak "DEFAULT_ADMIN_ROLE") \
  0xAD69315aD80648c0C8ce66EF06a7F9eB3c685C41 \
  --rpc-url $HOODI_RPC_URL

# Should return: true
```

### 3. Test Token Deployment

Try deploying a test token:

```bash
cast send <ERC20_FACTORY_ADDRESS> \
  "deployERC20(string,string,uint256,uint256,address)(address)" \
  "Test Token" "TEST" 1000000 100000 <YOUR_ADDRESS> \
  --rpc-url $HOODI_RPC_URL \
  --private-key $HOODI_PRIVATE_KEY
```

---

## Troubleshooting

### Issue: "Need 0.5+ ETH for deployment"

**Solution**: Fund deployer wallet with more Hoodi testnet ETH

### Issue: "PolicyEngine impl failed"

**Solution**:
- Check RPC connection: `cast chain-id --rpc-url $HOODI_RPC_URL`
- Ensure chain ID is 560048
- Verify wallet has sufficient gas

### Issue: "Low gas - need 0.1+ ETH to continue"

**Solution**: The deployment ran out of gas mid-way. You'll need to:
1. Fund the wallet with more ETH
2. Re-run the deployment (it will fail fast on already-deployed contracts)
3. Or modify the script to resume from a specific phase

### Issue: Compilation Errors

**Solution**:
```bash
# Clean build artifacts
forge clean

# Update dependencies
forge update

# Rebuild
forge build
```

### Issue: "Factory already registered"

**Solution**: This means the factory was already registered. This is expected if re-running after a partial deployment. The script will continue.

---

## Gas Estimates

Estimated gas costs (approximate):

| Phase | Est. Gas Cost |
|-------|---------------|
| Phase 1 | 0.05 ETH |
| Phase 2 | 0.08 ETH |
| Phase 3 | 0.12 ETH |
| Phase 4 | 0.06 ETH |
| Phase 5 | 0.04 ETH |
| Phase 6 | 0.02 ETH |
| Phase 7 | 0.02 ETH |
| Phase 8 | 0.03 ETH |
| **TOTAL** | **~0.4-0.6 ETH** |

**Note**: Actual costs depend on network gas prices.

---

## Key Features

### ✅ Fail-Fast Error Handling
- Every deployment includes `require()` checks
- Script reverts immediately on any failure
- No partial deployments left in broken state

### ✅ Comprehensive Validation
- Phase 9 validates all critical components
- Checks factory registrations
- Verifies role grants

### ✅ Gas Monitoring
- Checks remaining balance after each phase
- Warns if balance drops below 0.1 ETH
- Prevents mid-deployment gas failures

### ✅ Complete Integration
- All factories registered with registries
- All roles granted correctly
- System is operational immediately after deployment

### ✅ Ownership Management
- Deployer retains access during deployment
- Super Admin receives control at the end
- Multi-sig wallet includes both deployer and super admin

---

## Next Steps After Deployment

### 1. Update Frontend Configuration

Update `frontend/src/config/contracts.ts` with deployed addresses from `hoodi-complete.json`.

### 2. Verify Contracts on Explorer

If Hoodi has a block explorer, verify contracts:

```bash
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> \
  --chain-id 560048 \
  --rpc-url $HOODI_RPC_URL
```

### 3. Test Token Creation

Use the frontend or CLI to test creating tokens via the deployed factories.

### 4. Configure Policies

Use PolicyEngine to set up initial policies for token operations.

---

## Support

If you encounter issues:

1. Check the console output for specific error messages
2. Verify all prerequisites are met
3. Ensure wallet has sufficient funds
4. Review the deployment JSON for partial deployments
5. Check RPC connectivity

---

**Deployment Date**: 2025-11-20
**Script Version**: 1.0.0
**Status**: Production Ready
