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
 * @notice Upgrades master contracts via beacon pattern with enhanced module support
 * @dev Deploys new masters and updates beacons - existing tokens auto-upgraded
 * 
 * CRITICAL: Fill beacon addresses from deployments/hoodi-latest.json before running!
 * 
 * Usage:
 * 1. Get beacon addresses: cat deployments/hoodi-latest.json | grep Beacon
 * 2. Update constants below
 * 3. Test: forge script script/RedeployMastersViaBeacons.s.sol --rpc-url $HOODI_RPC -vvv
 * 4. Deploy: forge script script/RedeployMastersViaBeacons.s.sol --rpc-url $HOODI_RPC --broadcast --verify -vvv
 */
contract RedeployMastersViaBeacons is Script {
    
    // ========================================
    // CRITICAL: UPDATE THESE ADDRESSES
    // Get from: deployments/hoodi-latest.json
    // ========================================
    address constant ERC20_BEACON = 0x9E9b43BB6396DE240b66FC83B3f1517dDEB5379B;
    address constant ERC721_BEACON = 0x99c012A0723D9F8b7B759082a3393dfF87e19c86;
    address constant ERC1155_BEACON = 0x9397cb807BF97F653eE8f4e31fC101a7BD97aa71;
    address constant ERC3525_BEACON = 0xCc4E531C0bF28C0e071f728755D1fb5927f66b8c;
    address constant ERC4626_BEACON = 0x307b33B9693fFDA68e6Bd87Bd475a71c303c7ceA;
    address constant ERC1400_BEACON = 0x052dfC495221eA8325F830c2Ed9e7a124D5312a1;
    address constant ERC20_REBASING_BEACON = 0x1D4B05025453189f8313dA9A7c059E742379AaA5;
    
    struct NewMasters {
        address erc20Master;
        address erc721Master;
        address erc1155Master;
        address erc3525Master;
        address erc4626Master;
        address erc1400Master;
        address erc20RebasingMaster;
    }
    
    struct OldMasters {
        address erc20Master;
        address erc721Master;
        address erc1155Master;
        address erc3525Master;
        address erc4626Master;
        address erc1400Master;
        address erc20RebasingMaster;
    }
    
    NewMasters public newMasters;
    OldMasters public oldMasters;
    
    function run() external {
        require(block.chainid == 560048, "Must deploy to Hoodi testnet (560048)");
        
        // Validate beacon addresses are set
        require(ERC20_BEACON != address(0), "ERC20_BEACON not set");
        require(ERC721_BEACON != address(0), "ERC721_BEACON not set");
        require(ERC1155_BEACON != address(0), "ERC1155_BEACON not set");
        require(ERC3525_BEACON != address(0), "ERC3525_BEACON not set");
        require(ERC4626_BEACON != address(0), "ERC4626_BEACON not set");
        require(ERC1400_BEACON != address(0), "ERC1400_BEACON not set");
        require(ERC20_REBASING_BEACON != address(0), "ERC20_REBASING_BEACON not set");
        
        uint256 deployerPrivateKey = vm.envUint("HOODI_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("Master Contracts Beacon Upgrade");
        console.log("========================================");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log("========================================\n");
        
        require(deployer.balance > 0.2 ether, "Need 0.2+ ETH for redeployment");
        
        // Record old master implementations before upgrade
        console.log("Current Master Implementations:");
        recordOldMasters();
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Step 1: Deploy new master implementations
        console.log("\nStep 1: Deploying New Master Implementations...\n");
        deployNewMasters();
        
        // Step 2: Upgrade beacons
        console.log("\nStep 2: Upgrading Beacon Proxies...\n");
        upgradeBeacons();
        
        vm.stopBroadcast();
        
        // Step 3: Save and verify
        saveDeployment();
        printSummary();
    }
    
    function recordOldMasters() internal {
        oldMasters.erc20Master = TokenBeacon(ERC20_BEACON).implementation();
        console.log("  OLD ERC20Master:", oldMasters.erc20Master);
        
        oldMasters.erc721Master = TokenBeacon(ERC721_BEACON).implementation();
        console.log("  OLD ERC721Master:", oldMasters.erc721Master);
        
        oldMasters.erc1155Master = TokenBeacon(ERC1155_BEACON).implementation();
        console.log("  OLD ERC1155Master:", oldMasters.erc1155Master);
        
        oldMasters.erc3525Master = TokenBeacon(ERC3525_BEACON).implementation();
        console.log("  OLD ERC3525Master:", oldMasters.erc3525Master);
        
        oldMasters.erc4626Master = TokenBeacon(ERC4626_BEACON).implementation();
        console.log("  OLD ERC4626Master:", oldMasters.erc4626Master);
        
        oldMasters.erc1400Master = TokenBeacon(ERC1400_BEACON).implementation();
        console.log("  OLD ERC1400Master:", oldMasters.erc1400Master);
        
        oldMasters.erc20RebasingMaster = TokenBeacon(ERC20_REBASING_BEACON).implementation();
        console.log("  OLD ERC20RebasingMaster:", oldMasters.erc20RebasingMaster);
    }
    
    function deployNewMasters() internal {
        // ERC20Master with 11 module setters
        console.log("  Deploying ERC20Master (11 module setters)...");
        newMasters.erc20Master = address(new ERC20Master());
        console.log("    NEW ERC20Master:", newMasters.erc20Master);
        
        // ERC721Master with enhanced module support
        console.log("  Deploying ERC721Master (10 module setters)...");
        newMasters.erc721Master = address(new ERC721Master());
        console.log("    NEW ERC721Master:", newMasters.erc721Master);
        
        // ERC1155Master with enhanced module support
        console.log("  Deploying ERC1155Master (7 module setters)...");
        newMasters.erc1155Master = address(new ERC1155Master());
        console.log("    NEW ERC1155Master:", newMasters.erc1155Master);
        
        // ERC3525Master with enhanced module support
        console.log("  Deploying ERC3525Master (7 module setters)...");
        newMasters.erc3525Master = address(new ERC3525Master());
        console.log("    NEW ERC3525Master:", newMasters.erc3525Master);
        
        // ERC4626Master with enhanced module support
        console.log("  Deploying ERC4626Master (10 module setters)...");
        newMasters.erc4626Master = address(new ERC4626Master());
        console.log("    NEW ERC4626Master:", newMasters.erc4626Master);
        
        // ERC1400Master with enhanced module support
        console.log("  Deploying ERC1400Master (7 module setters)...");
        newMasters.erc1400Master = address(new ERC1400Master());
        console.log("    NEW ERC1400Master:", newMasters.erc1400Master);
        
        // ERC20RebasingMaster
        console.log("  Deploying ERC20RebasingMaster...");
        newMasters.erc20RebasingMaster = address(new ERC20RebasingMaster());
        console.log("    NEW ERC20RebasingMaster:", newMasters.erc20RebasingMaster);
    }
    
    function upgradeBeacons() internal {
        // Upgrade ERC20 Beacon
        console.log("  Upgrading ERC20 Beacon...");
        TokenBeacon(ERC20_BEACON).upgradeTo(newMasters.erc20Master);
        console.log("    [OK] ERC20 Beacon upgraded");
        console.log("    Beacon:", ERC20_BEACON);
        console.log("    New Implementation:", newMasters.erc20Master);
        
        // Upgrade ERC721 Beacon
        console.log("  Upgrading ERC721 Beacon...");
        TokenBeacon(ERC721_BEACON).upgradeTo(newMasters.erc721Master);
        console.log("    [OK] ERC721 Beacon upgraded");
        console.log("    Beacon:", ERC721_BEACON);
        console.log("    New Implementation:", newMasters.erc721Master);
        
        // Upgrade ERC1155 Beacon
        console.log("  Upgrading ERC1155 Beacon...");
        TokenBeacon(ERC1155_BEACON).upgradeTo(newMasters.erc1155Master);
        console.log("    [OK] ERC1155 Beacon upgraded");
        console.log("    Beacon:", ERC1155_BEACON);
        console.log("    New Implementation:", newMasters.erc1155Master);
        
        // Upgrade ERC3525 Beacon
        console.log("  Upgrading ERC3525 Beacon...");
        TokenBeacon(ERC3525_BEACON).upgradeTo(newMasters.erc3525Master);
        console.log("    [OK] ERC3525 Beacon upgraded");
        console.log("    Beacon:", ERC3525_BEACON);
        console.log("    New Implementation:", newMasters.erc3525Master);
        
        // Upgrade ERC4626 Beacon
        console.log("  Upgrading ERC4626 Beacon...");
        TokenBeacon(ERC4626_BEACON).upgradeTo(newMasters.erc4626Master);
        console.log("    [OK] ERC4626 Beacon upgraded");
        console.log("    Beacon:", ERC4626_BEACON);
        console.log("    New Implementation:", newMasters.erc4626Master);
        
        // Upgrade ERC1400 Beacon
        console.log("  Upgrading ERC1400 Beacon...");
        TokenBeacon(ERC1400_BEACON).upgradeTo(newMasters.erc1400Master);
        console.log("    [OK] ERC1400 Beacon upgraded");
        console.log("    Beacon:", ERC1400_BEACON);
        console.log("    New Implementation:", newMasters.erc1400Master);
        
        // Upgrade ERC20Rebasing Beacon
        console.log("  Upgrading ERC20Rebasing Beacon...");
        TokenBeacon(ERC20_REBASING_BEACON).upgradeTo(newMasters.erc20RebasingMaster);
        console.log("    [OK] ERC20Rebasing Beacon upgraded");
        console.log("    Beacon:", ERC20_REBASING_BEACON);
        console.log("    New Implementation:", newMasters.erc20RebasingMaster);
    }
    
    function saveDeployment() internal {
        string memory json = "master-upgrade";
        
        // New masters
        vm.serializeAddress(json, "erc20Master", newMasters.erc20Master);
        vm.serializeAddress(json, "erc721Master", newMasters.erc721Master);
        vm.serializeAddress(json, "erc1155Master", newMasters.erc1155Master);
        vm.serializeAddress(json, "erc3525Master", newMasters.erc3525Master);
        vm.serializeAddress(json, "erc4626Master", newMasters.erc4626Master);
        vm.serializeAddress(json, "erc1400Master", newMasters.erc1400Master);
        vm.serializeAddress(json, "erc20RebasingMaster", newMasters.erc20RebasingMaster);
        
        // Beacon addresses (unchanged)
        vm.serializeAddress(json, "erc20Beacon", ERC20_BEACON);
        vm.serializeAddress(json, "erc721Beacon", ERC721_BEACON);
        vm.serializeAddress(json, "erc1155Beacon", ERC1155_BEACON);
        vm.serializeAddress(json, "erc3525Beacon", ERC3525_BEACON);
        vm.serializeAddress(json, "erc4626Beacon", ERC4626_BEACON);
        vm.serializeAddress(json, "erc1400Beacon", ERC1400_BEACON);
        vm.serializeAddress(json, "erc20RebasingBeacon", ERC20_REBASING_BEACON);
        
        // Old masters (for rollback reference)
        vm.serializeAddress(json, "old_erc20Master", oldMasters.erc20Master);
        vm.serializeAddress(json, "old_erc721Master", oldMasters.erc721Master);
        vm.serializeAddress(json, "old_erc1155Master", oldMasters.erc1155Master);
        vm.serializeAddress(json, "old_erc3525Master", oldMasters.erc3525Master);
        vm.serializeAddress(json, "old_erc4626Master", oldMasters.erc4626Master);
        vm.serializeAddress(json, "old_erc1400Master", oldMasters.erc1400Master);
        string memory finalJson = vm.serializeAddress(json, "old_erc20RebasingMaster", oldMasters.erc20RebasingMaster);
        
        vm.writeJson(finalJson, "./deployments/hoodi-master-upgrade.json");
        console.log("\n[OK] Upgrade addresses saved to: deployments/hoodi-master-upgrade.json");
    }
    
    function printSummary() internal view {
        console.log("\n========================================");
        console.log("BEACON UPGRADE COMPLETE [OK]");
        console.log("========================================");
        console.log("\nNew Master Implementations (Enhanced with Module Support):");
        console.log("  ERC20Master (11 modules):", newMasters.erc20Master);
        console.log("  ERC721Master (10 modules):", newMasters.erc721Master);
        console.log("  ERC1155Master (7 modules):", newMasters.erc1155Master);
        console.log("  ERC3525Master (7 modules):", newMasters.erc3525Master);
        console.log("  ERC4626Master (10 modules):", newMasters.erc4626Master);
        console.log("  ERC1400Master (7 modules):", newMasters.erc1400Master);
        console.log("  ERC20RebasingMaster:", newMasters.erc20RebasingMaster);
        
        console.log("\nBeacons (unchanged addresses, updated implementations):");
        console.log("  ERC20 Beacon:", ERC20_BEACON);
        console.log("  ERC721 Beacon:", ERC721_BEACON);
        console.log("  ERC1155 Beacon:", ERC1155_BEACON);
        console.log("  ERC3525 Beacon:", ERC3525_BEACON);
        console.log("  ERC4626 Beacon:", ERC4626_BEACON);
        console.log("  ERC1400 Beacon:", ERC1400_BEACON);
        console.log("  ERC20Rebasing Beacon:", ERC20_REBASING_BEACON);
        
        console.log("\nOld Master Implementations (for rollback if needed):");
        console.log("  OLD ERC20Master:", oldMasters.erc20Master);
        console.log("  OLD ERC721Master:", oldMasters.erc721Master);
        console.log("  OLD ERC1155Master:", oldMasters.erc1155Master);
        console.log("  OLD ERC3525Master:", oldMasters.erc3525Master);
        console.log("  OLD ERC4626Master:", oldMasters.erc4626Master);
        console.log("  OLD ERC1400Master:", oldMasters.erc1400Master);
        console.log("  OLD ERC20RebasingMaster:", oldMasters.erc20RebasingMaster);
        
        console.log("\n========================================");
        console.log("NEXT STEPS:");
        console.log("========================================");
        console.log("1. Verify new master implementations on Hoodi Etherscan:");
        console.log("   forge verify-contract <ADDRESS> <CONTRACT> --chain-id 560048");
        console.log("");
        console.log("2. Update contract_masters table in database:");
        console.log("   UPDATE contract_masters SET");
        console.log("     contract_address = '<NEW_ADDRESS>',");
        console.log("     updated_at = NOW()");
        console.log("   WHERE standard = '<standard>' AND network = 'hoodi';");
        console.log("");
        console.log("3. Test existing tokens still work:");
        console.log("   - Call existing token functions");
        console.log("   - Verify balance queries work");
        console.log("   - Test transfer operations");
        console.log("");
        console.log("4. Test new module setters:");
        console.log("   - Call setFlashMintModule()");
        console.log("   - Call setPermitModule()");
        console.log("   - Call setSnapshotModule()");
        console.log("   - etc.");
        console.log("");
        console.log("5. Deploy extension modules for new features:");
        console.log("   - Flash mint modules");
        console.log("   - Permit modules");
        console.log("   - Snapshot modules");
        console.log("   - Timelock modules");
        console.log("   - Votes modules");
        console.log("");
        console.log("6. ROLLBACK (if needed):");
        console.log("   TokenBeacon(<BEACON>).upgradeTo(<OLD_MASTER>);");
        console.log("========================================\n");
    }
}
