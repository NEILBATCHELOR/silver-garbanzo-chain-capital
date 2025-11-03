# ⚡ Master Contracts Redeployment - Quick Reference

## 📋 Overview

**Objective:** Redeploy upgraded master contracts with enhanced module support via beacon pattern

**Time Estimate:** 1-2 hours including testing

**Cost:** ~7.5M gas (~0.15 ETH @ 20 gwei) - **FREE on Hoodi testnet**

---

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Environment (5 min)

```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts

# Get testnet ETH (if needed)
# Visit: https://hoodi.ethpandaops.io
# Request for: 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b

# Run pre-flight check
./script/pre-flight-check.sh
```

### Step 2: Get Beacon Addresses (2 min)

```bash
# Extract beacon addresses from previous deployment
cat deployments/hoodi-latest.json | grep Beacon
```

**Expected output:**
```json
"erc20Beacon": "0x...",
"erc721Beacon": "0x...",
"erc1155Beacon": "0x...",
"erc3525Beacon": "0x...",
"erc4626Beacon": "0x...",
"erc1400Beacon": "0x...",
"erc20RebasingBeacon": "0x..."
```

### Step 3: Update Deployment Script (2 min)

Edit `script/RedeployMastersViaBeacons.s.sol`:

```solidity
// Line 24-30: Update these constants
address constant ERC20_BEACON = 0x...; // From step 2
address constant ERC721_BEACON = 0x...;
address constant ERC1155_BEACON = 0x...;
address constant ERC3525_BEACON = 0x...;
address constant ERC4626_BEACON = 0x...;
address constant ERC1400_BEACON = 0x...;
address constant ERC20_REBASING_BEACON = 0x...;
```

### Step 4: Test Deployment (Dry Run) (5 min)

```bash
# Simulate without broadcasting
forge script script/RedeployMastersViaBeacons.s.sol \
  --rpc-url $HOODI_RPC \
  -vvv
```

**Check for:**
- ✅ All beacons loaded successfully
- ✅ Old master addresses recorded
- ✅ Gas estimates reasonable
- ✅ No errors in logs

### Step 5: Execute Deployment (10 min)

```bash
# Deploy and verify on Etherscan
forge script script/RedeployMastersViaBeacons.s.sol \
  --rpc-url $HOODI_RPC \
  --broadcast \
  --verify \
  -vvv
```

**Monitor output:**
- Deployment of 7 new masters
- Upgrade of 7 beacons
- Etherscan verification

### Step 6: Save Deployment Addresses (1 min)

```bash
# Addresses saved automatically to:
cat deployments/hoodi-master-upgrade.json
```

---

## 🔍 Verification Steps

### 1. Verify Contracts on Etherscan (10 min)

```bash
# Verify each new master (if auto-verify failed)
source .env

# ERC20Master
forge verify-contract \
  <NEW_ERC20_MASTER_ADDRESS> \
  src/masters/ERC20Master.sol:ERC20Master \
  --chain-id 560048 \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Repeat for each standard:
# ERC721Master, ERC1155Master, ERC3525Master, 
# ERC4626Master, ERC1400Master, ERC20RebasingMaster
```

### 2. Test Beacon Upgrades (5 min)

```bash
# Verify beacon implementations updated
cast call $ERC20_BEACON "implementation()" --rpc-url $HOODI_RPC
# Should return NEW_ERC20_MASTER_ADDRESS

# Test with existing token (if any deployed)
cast call <EXISTING_TOKEN_ADDRESS> \
  "symbol()" \
  --rpc-url $HOODI_RPC
```

### 3. Update Database (5 min)

```bash
# Open database update script
cat backend/migrations/update_master_contracts_hoodi_upgrade.sql

# Fill in addresses from hoodi-master-upgrade.json
# Execute via Supabase CLI or dashboard
```

---

## 🗄️ Database Update

```sql
-- Get addresses from deployments/hoodi-master-upgrade.json

-- Update ERC20 Master
UPDATE contract_masters
SET 
  contract_address = '<NEW_ERC20_MASTER_ADDRESS>',
  updated_at = NOW(),
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{modulesSupported}',
    '["compliance", "vesting", "fees", "policy", "flashMint", "permit", "snapshot", "timelock", "votes", "payableToken", "temporaryApproval"]'::jsonb
  )
WHERE 
  standard = 'erc20'
  AND network = 'hoodi'
  AND environment = 'testnet';

-- Repeat for: erc721, erc1155, erc3525, erc4626, erc1400, erc20_rebasing
```

**Full SQL:** `/backend/migrations/update_master_contracts_hoodi_upgrade.sql`

---

## ✅ Post-Deployment Checklist

### Deployment Success
- [ ] All 7 master contracts deployed
- [ ] All 7 beacons upgraded  
- [ ] Addresses saved to `hoodi-master-upgrade.json`
- [ ] No errors in deployment logs

### Verification
- [ ] All contracts verified on Hoodi Etherscan
- [ ] Beacon implementations point to new masters
- [ ] Database `contract_masters` table updated
- [ ] Module support metadata added

### Testing
- [ ] Existing tokens still function (if any deployed)
- [ ] New module setters callable:
  - `setFlashMintModule()`
  - `setPermitModule()`
  - `setSnapshotModule()`
  - `setTimelockModule()`
  - `setVotesModule()`
  - `setPayableTokenModule()`
  - `setTemporaryApprovalModule()`
- [ ] Policy engine integration intact
- [ ] Gas costs acceptable

---

## 🚨 Rollback Plan

**If issues arise:**

```solidity
// Get old master addresses from hoodi-master-upgrade.json
// Under "old_erc20Master", "old_erc721Master", etc.

// Revert beacon to old implementation
TokenBeacon(ERC20_BEACON).upgradeTo(OLD_ERC20_MASTER_ADDRESS);

// Repeat for affected standards
```

**Test rollback in dry run first:**
```bash
# Create rollback script if needed
forge script script/RollbackBeaconUpgrade.s.sol \
  --rpc-url $HOODI_RPC \
  -vvv
```

---

## 📊 What Changed

### ERC20Master
**Added 7 module setters:**
- `setFlashMintModule()` - Flash loans
- `setPermitModule()` - Gasless approvals (EIP-2612)
- `setSnapshotModule()` - Historical balances
- `setTimelockModule()` - Delayed operations
- `setVotesModule()` - Governance voting
- `setPayableTokenModule()` - ERC-1363 payments
- `setTemporaryApprovalModule()` - Time-limited approvals

### Other Standards
Similar module setter enhancements for:
- ERC721 (10 modules)
- ERC1155 (7 modules)
- ERC3525 (7 modules)
- ERC4626 (10 modules)
- ERC1400 (7 modules)

**Total:** 52 new module setters across all standards

---

## 🎯 Next Steps After Deployment

### 1. Deploy Extension Modules (Phase 2)

Deploy module implementations for new features:
- Flash mint modules
- Permit modules  
- Snapshot modules
- Timelock modules
- Votes modules

### 2. Update Frontend Forms

Add module address fields to token deployment forms:
- ERC20PropertiesForm (7 new fields)
- ERC721PropertiesForm (10 new fields)
- etc.

### 3. Test Module Attachment

Deploy test token and attach modules:
```javascript
await token.setFlashMintModule(flashMintModuleAddress);
await token.setPermitModule(permitModuleAddress);
// etc.
```

### 4. Document Module Capabilities

Update documentation:
- Module deployment guides
- Integration examples
- API reference

---

## 🔗 Key Resources

### Documentation
- **Strategy:** `script/MASTER-REDEPLOYMENT-STRATEGY.md`
- **Quick Ref:** `script/MASTER-REDEPLOYMENT-QUICK-REFERENCE.md` (this file)
- **Database:** `backend/migrations/update_master_contracts_hoodi_upgrade.sql`
- **Gap Analysis:** Provided documents

### Deployment Files
- **Script:** `script/RedeployMastersViaBeacons.s.sol`
- **Old Deployment:** `deployments/hoodi-latest.json`
- **New Deployment:** `deployments/hoodi-master-upgrade.json`

### Network Info
- **Faucet:** https://hoodi.ethpandaops.io
- **Explorer:** https://hoodi.etherscan.io
- **RPC:** https://ethereum-hoodi-rpc.publicnode.com/
- **Chain ID:** 560048

---

## 💡 Tips

### Gas Optimization
- Beacon upgrades are cheap (~70K gas each)
- Much cheaper than redeploying entire system
- All existing tokens automatically upgraded

### Safety
- Old master addresses saved for rollback
- Test with dry run first
- Verify on Etherscan before database update

### Testing
- Deploy test token after upgrade
- Verify module setters work
- Check existing tokens unaffected

---

## 📞 Support

**Issues?**
1. Check deployment logs for errors
2. Verify beacon addresses are correct
3. Confirm wallet has sufficient ETH
4. Test with dry run first
5. Review gap analysis documents

**Ready to proceed?**
```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts
# Fill beacon addresses in RedeployMastersViaBeacons.s.sol
# Then run:
forge script script/RedeployMastersViaBeacons.s.sol --rpc-url $HOODI_RPC --broadcast --verify -vvv
```

Good luck! 🚀
