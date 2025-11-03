# 🔄 Master Contracts Redeployment Strategy

## 🎯 Objective

Redeploy upgraded master contracts with enhanced module setter support while maintaining existing infrastructure and minimizing disruption.

---

## 📋 What Changed in Master Contracts

### ERC20Master Enhancements ✅
**Added 7 New Module Setters:**
1. `setFlashMintModule()` - Flash loan capability
2. `setPermitModule()` - Gasless approvals (EIP-2612)
3. `setSnapshotModule()` - Historical balance queries
4. `setTimelockModule()` - Time-delayed operations
5. `setVotesModule()` - Governance voting power
6. `setPayableTokenModule()` - ERC-1363 payments
7. `setTemporaryApprovalModule()` - Time-limited approvals

**Existing Setters (Unchanged):**
- `setComplianceModule()`
- `setVestingModule()`
- `setFeesModule()`
- `setPolicyEngine()`

### Other Standards
Similar enhancements applied to:
- **ERC721Master** - 10 module setters
- **ERC1155Master** - 7 module setters  
- **ERC3525Master** - 7 module setters
- **ERC4626Master** - 10 module setters
- **ERC1400Master** - 7 module setters
- **ERC20RebasingMaster** - Policy engine integration

---

## 🎯 Redeployment Strategy

### Option A: RECOMMENDED - Beacon Upgrade Pattern ⭐

**Advantages:**
✅ Minimal disruption to existing tokens
✅ All existing tokens automatically upgraded
✅ No need to redeploy TokenFactory
✅ Single transaction per standard
✅ Maintains all existing addresses

**Process:**
1. Deploy NEW master implementations
2. Update beacon proxies to point to new masters
3. Existing tokens inherit new functionality immediately
4. Update contract_masters table with new addresses

**Deployment Steps:**
```solidity
// For each standard:
1. Deploy new ERC20Master implementation
2. Call beacon.upgradeTo(newMasterAddress)
3. Verify upgrade successful
4. Test with existing token
```

**Cost:** ~7 transactions × 1M gas = ~7M gas (~0.14 ETH @ 20 gwei)

---

### Option B: Full Redeployment

**Advantages:**
✅ Clean slate deployment
✅ Updated TokenFactory configuration
✅ All contracts freshly verified

**Disadvantages:**
❌ Existing tokens NOT upgraded
❌ Requires more gas
❌ Need to update all integrations

**Process:**
1. Deploy new infrastructure (if needed)
2. Deploy new TokenFactory (deploys all masters internally)
3. Deploy extension modules
4. Update all database references

**Cost:** ~30M gas (~0.6 ETH @ 20 gwei)

---

## 📝 Recommended Approach: Beacon Upgrades

### Script: `RedeployMastersViaBeacons.s.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/masters/ERC20Master.sol";
import "../src/masters/ERC721Master.sol";
import "../src/masters/ERC1155Master.sol";
import "../src/masters/ERC3525Master.sol";
import "../src/masters/ERC4626Master.sol";
import "../src/masters/ERC1400Master.sol";
import "../src/masters/ERC20RebasingMaster.sol";
import "../src/deployers/beacon/TokenBeacon.sol";

/**
 * @title RedeployMastersViaBeacons
 * @notice Upgrades master contracts via beacon pattern
 * @dev Deploys new masters and updates beacons - existing tokens auto-upgraded
 */
contract RedeployMastersViaBeacons is Script {
    
    // EXISTING Hoodi beacon addresses (from previous deployment)
    address constant ERC20_BEACON = 0x...; // TODO: Fill from deployments/hoodi-latest.json
    address constant ERC721_BEACON = 0x...;
    address constant ERC1155_BEACON = 0x...;
    address constant ERC3525_BEACON = 0x...;
    address constant ERC4626_BEACON = 0x...;
    address constant ERC1400_BEACON = 0x...;
    address constant ERC20_REBASING_BEACON = 0x...;
    
    struct NewMasters {
        address erc20Master;
        address erc721Master;
        address erc1155Master;
        address erc3525Master;
        address erc4626Master;
        address erc1400Master;
        address erc20RebasingMaster;
    }
    
    NewMasters public newMasters;
    
    function run() external {
        require(block.chainid == 560048, "Must deploy to Hoodi testnet");
        
        uint256 deployerPrivateKey = vm.envUint("HOODI_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("Master Contracts Beacon Upgrade");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log("========================================\n");
        
        require(deployer.balance > 0.2 ether, "Need 0.2+ ETH for redeployment");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Step 1: Deploy new master implementations
        console.log("Step 1: Deploying New Master Implementations...\n");
        deployNewMasters();
        
        // Step 2: Upgrade beacons
        console.log("\nStep 2: Upgrading Beacon Proxies...\n");
        upgradeBeacons();
        
        vm.stopBroadcast();
        
        // Step 3: Save and verify
        saveDeployment();
        printSummary();
    }
    
    function deployNewMasters() internal {
        // ERC20Master with 11 module setters
        newMasters.erc20Master = address(new ERC20Master());
        console.log("  NEW ERC20Master:", newMasters.erc20Master);
        
        // ERC721Master with enhanced module support
        newMasters.erc721Master = address(new ERC721Master());
        console.log("  NEW ERC721Master:", newMasters.erc721Master);
        
        // ERC1155Master with enhanced module support
        newMasters.erc1155Master = address(new ERC1155Master());
        console.log("  NEW ERC1155Master:", newMasters.erc1155Master);
        
        // ERC3525Master with enhanced module support
        newMasters.erc3525Master = address(new ERC3525Master());
        console.log("  NEW ERC3525Master:", newMasters.erc3525Master);
        
        // ERC4626Master with enhanced module support
        newMasters.erc4626Master = address(new ERC4626Master());
        console.log("  NEW ERC4626Master:", newMasters.erc4626Master);
        
        // ERC1400Master with enhanced module support
        newMasters.erc1400Master = address(new ERC1400Master());
        console.log("  NEW ERC1400Master:", newMasters.erc1400Master);
        
        // ERC20RebasingMaster
        newMasters.erc20RebasingMaster = address(new ERC20RebasingMaster());
        console.log("  NEW ERC20RebasingMaster:", newMasters.erc20RebasingMaster);
    }
    
    function upgradeBeacons() internal {
        // Upgrade ERC20 Beacon
        TokenBeacon(ERC20_BEACON).upgradeTo(newMasters.erc20Master);
        console.log("  ✅ ERC20 Beacon upgraded");
        
        // Upgrade ERC721 Beacon
        TokenBeacon(ERC721_BEACON).upgradeTo(newMasters.erc721Master);
        console.log("  ✅ ERC721 Beacon upgraded");
        
        // Upgrade ERC1155 Beacon
        TokenBeacon(ERC1155_BEACON).upgradeTo(newMasters.erc1155Master);
        console.log("  ✅ ERC1155 Beacon upgraded");
        
        // Upgrade ERC3525 Beacon
        TokenBeacon(ERC3525_BEACON).upgradeTo(newMasters.erc3525Master);
        console.log("  ✅ ERC3525 Beacon upgraded");
        
        // Upgrade ERC4626 Beacon
        TokenBeacon(ERC4626_BEACON).upgradeTo(newMasters.erc4626Master);
        console.log("  ✅ ERC4626 Beacon upgraded");
        
        // Upgrade ERC1400 Beacon
        TokenBeacon(ERC1400_BEACON).upgradeTo(newMasters.erc1400Master);
        console.log("  ✅ ERC1400 Beacon upgraded");
        
        // Upgrade ERC20Rebasing Beacon
        TokenBeacon(ERC20_REBASING_BEACON).upgradeTo(newMasters.erc20RebasingMaster);
        console.log("  ✅ ERC20Rebasing Beacon upgraded");
    }
    
    function saveDeployment() internal {
        string memory json = "master-upgrade";
        
        vm.serializeAddress(json, "erc20Master", newMasters.erc20Master);
        vm.serializeAddress(json, "erc721Master", newMasters.erc721Master);
        vm.serializeAddress(json, "erc1155Master", newMasters.erc1155Master);
        vm.serializeAddress(json, "erc3525Master", newMasters.erc3525Master);
        vm.serializeAddress(json, "erc4626Master", newMasters.erc4626Master);
        vm.serializeAddress(json, "erc1400Master", newMasters.erc1400Master);
        string memory finalJson = vm.serializeAddress(json, "erc20RebasingMaster", newMasters.erc20RebasingMaster);
        
        vm.writeJson(finalJson, "./deployments/hoodi-master-upgrade.json");
        console.log("\n✅ Upgrade addresses saved to: deployments/hoodi-master-upgrade.json");
    }
    
    function printSummary() internal view {
        console.log("\n========================================");
        console.log("BEACON UPGRADE COMPLETE");
        console.log("========================================");
        console.log("\nNew Master Implementations:");
        console.log("  ERC20Master:", newMasters.erc20Master);
        console.log("  ERC721Master:", newMasters.erc721Master);
        console.log("  ERC1155Master:", newMasters.erc1155Master);
        console.log("  ERC3525Master:", newMasters.erc3525Master);
        console.log("  ERC4626Master:", newMasters.erc4626Master);
        console.log("  ERC1400Master:", newMasters.erc1400Master);
        console.log("  ERC20RebasingMaster:", newMasters.erc20RebasingMaster);
        
        console.log("\nBeacons Updated (unchanged addresses):");
        console.log("  ERC20 Beacon:", ERC20_BEACON);
        console.log("  ERC721 Beacon:", ERC721_BEACON);
        console.log("  ERC1155 Beacon:", ERC1155_BEACON);
        console.log("  ERC3525 Beacon:", ERC3525_BEACON);
        console.log("  ERC4626 Beacon:", ERC4626_BEACON);
        console.log("  ERC1400 Beacon:", ERC1400_BEACON);
        console.log("  ERC20Rebasing Beacon:", ERC20_REBASING_BEACON);
        
        console.log("\n========================================");
        console.log("NEXT STEPS:");
        console.log("1. Verify new master implementations on Etherscan");
        console.log("2. Update contract_masters table with new addresses");
        console.log("3. Test existing tokens still work");
        console.log("4. Test new module setters");
        console.log("5. Deploy extension modules for new features");
        console.log("========================================\n");
    }
}
```

---

## 🔧 Implementation Steps

### 1. Prepare Deployment Script

```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/foundry-contracts

# Create the redeployment script
# (Script provided above - save as RedeployMastersViaBeacons.s.sol)
```

### 2. Fill Beacon Addresses

Get existing beacon addresses from previous deployment:

```bash
cat deployments/hoodi-latest.json | grep Beacon
```

Update the constants in `RedeployMastersViaBeacons.s.sol`:
```solidity
address constant ERC20_BEACON = 0x...; // From hoodi-latest.json
address constant ERC721_BEACON = 0x...;
// etc.
```

### 3. Run Pre-Flight Check

```bash
./script/pre-flight-check.sh
```

### 4. Simulate Upgrade (Dry Run)

```bash
forge script script/RedeployMastersViaBeacons.s.sol \
  --rpc-url $HOODI_RPC \
  -vvv
```

### 5. Execute Upgrade (Live)

```bash
forge script script/RedeployMastersViaBeacons.s.sol \
  --rpc-url $HOODI_RPC \
  --broadcast \
  --verify \
  -vvv
```

### 6. Verify on Etherscan

```bash
# Verify each new master
forge verify-contract \
  <NEW_ERC20_MASTER_ADDRESS> \
  src/masters/ERC20Master.sol:ERC20Master \
  --chain-id 560048 \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

---

## 🗄️ Database Updates

### Update `contract_masters` Table

```sql
-- Update ERC20 Master
UPDATE contract_masters
SET 
  contract_address = '<NEW_ERC20_MASTER_ADDRESS>',
  updated_at = NOW()
WHERE 
  standard = 'erc20'
  AND network = 'hoodi'
  AND environment = 'testnet';

-- Repeat for each standard:
-- erc721, erc1155, erc3525, erc4626, erc1400, erc20_rebasing
```

### Add Module Capability Metadata

```sql
-- Add module support info
UPDATE contract_masters
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{modulesSupported}',
  '["compliance", "vesting", "fees", "policy", "flashMint", "permit", "snapshot", "timelock", "votes", "payableToken", "temporaryApproval"]'::jsonb
)
WHERE standard = 'erc20';
```

---

## ✅ Verification Checklist

### After Deployment

- [ ] All 7 new master contracts deployed
- [ ] All 7 beacon proxies upgraded
- [ ] Deployment addresses saved to JSON
- [ ] All contracts verified on Hoodi Etherscan

### Testing

- [ ] Existing tokens still function
- [ ] New module setters callable
- [ ] Module attachment works
- [ ] Policy engine integration intact
- [ ] Gas costs acceptable

### Database

- [ ] `contract_masters` table updated
- [ ] Module support metadata added
- [ ] Frontend can query new addresses

### Documentation

- [ ] Update DEPLOYMENT-SUMMARY.md
- [ ] Document new module capabilities
- [ ] Update integration guides

---

## 📊 Cost Estimates

| Component | Gas | Cost @ 20 gwei | Free on Hoodi |
|-----------|-----|----------------|---------------|
| Deploy 7 Masters | ~7M | ~0.14 ETH | ✅ FREE |
| Upgrade 7 Beacons | ~500K | ~0.01 ETH | ✅ FREE |
| **Total** | **~7.5M** | **~0.15 ETH** | **✅ FREE** |

**Much cheaper than full redeployment (~30M gas / 0.6 ETH)!**

---

## 🚨 Rollback Plan

If upgrade causes issues:

```solidity
// Revert beacon to old master
TokenBeacon(ERC20_BEACON).upgradeTo(OLD_ERC20_MASTER_ADDRESS);
```

**Save old addresses before upgrading!**

---

## 🎯 Alternative: Side-by-Side Deployment

If you want to test extensively before switching:

1. Deploy new masters with different beacon addresses
2. Test thoroughly in parallel
3. Update production beacons when confident
4. Retire old masters

**Recommended for mainnet, not needed for testnet.**

---

## 📝 Summary

**Recommended Approach:** Beacon Upgrade Pattern

**Why:**
- ✅ Minimal disruption
- ✅ Automatic upgrade of existing tokens
- ✅ Cheaper (7.5M gas vs 30M gas)
- ✅ Maintains existing infrastructure
- ✅ Easy rollback if needed

**Next Steps:**
1. Create `RedeployMastersViaBeacons.s.sol`
2. Fill beacon addresses from previous deployment
3. Run pre-flight check
4. Execute upgrade
5. Update database
6. Test thoroughly

**Time Estimate:** 1-2 hours including testing
