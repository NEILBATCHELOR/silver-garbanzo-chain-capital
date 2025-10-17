// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/TokenFactory.sol";
import "../src/masters/ERC20Master.sol";
import "../src/masters/ERC721Master.sol";
import "../src/masters/ERC1155Master.sol";
import "../src/masters/ERC3525Master.sol";
import "../src/masters/ERC4626Master.sol";
import "../src/masters/ERC1400Master.sol";
import "../src/masters/ERC20RebasingMaster.sol";
import "../src/policy/PolicyEngine.sol";
import "../src/policy/PolicyRegistry.sol";
import "../src/registry/TokenRegistry.sol";
import "../src/governance/UpgradeGovernor.sol";
import "../src/deployers/beacon/TokenBeacon.sol";
import "../src/optimizations/L2GasOptimizer.sol";

/**
 * @title DeployToHoodi
 * @notice Comprehensive deployment script for Hoodi testnet (Chain ID: 560048)
 * @dev Deploys all masters, beacons, factory, and infrastructure
 * 
 * Network Details:
 * - Chain ID: 560048
 * - RPC: https://ethereum-hoodi-rpc.publicnode.com/
 * - Explorer: https://hoodi.etherscan.io/
 * - Faucet: https://hoodi.ethpandaops.io
 * 
 * Wallet (from project_wallets):
 * - Address: 0x5a4E0904cFf2902F821713FA215198f2CB5ECf9b
 * - Private key: Encrypted in database
 * 
 * Usage:
 * 1. Get testnet ETH from faucet
 * 2. Export HOODI_PRIVATE_KEY (decrypted via WalletEncryptionClient)
 * 3. Run: forge script script/DeployToHoodi.s.sol --rpc-url $HOODI_RPC --broadcast --verify
 */
contract DeployToHoodi is Script {
    
    // Deployment addresses will be saved here
    struct Deployment {
        // Core Infrastructure
        address policyEngine;
        address policyRegistry;
        address tokenRegistry;
        address upgradeGovernor;
        
        // Master Contracts
        address erc20Master;
        address erc721Master;
        address erc1155Master;
        address erc3525Master;
        address erc4626Master;
        address erc1400Master;
        address erc20RebasingMaster;
        
        // Beacons
        address erc20Beacon;
        address erc721Beacon;
        address erc1155Beacon;
        address erc3525Beacon;
        address erc4626Beacon;
        address erc1400Beacon;
        address erc20RebasingBeacon;
        
        // Factory
        address tokenFactory;
    }
    
    Deployment public deployed;
    
    function run() external {
        // Hoodi testnet configuration
        require(block.chainid == 560048, "Must deploy to Hoodi testnet (560048)");
        
        // Get deployer from environment
        uint256 deployerPrivateKey = vm.envUint("HOODI_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("Deploying to Hoodi Testnet");
        console.log("========================================");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log("========================================\n");
        
        require(deployer.balance > 0.5 ether, "Insufficient balance (need 0.5+ ETH)");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Phase 1: Core Infrastructure
        console.log("Phase 1: Deploying Core Infrastructure...");
        deployInfrastructure(deployer);
        
        // Phase 2: Token Factory (deploys all masters and beacons internally)
        console.log("\nPhase 2: Deploying Token Factory...");
        console.log("  (TokenFactory will deploy all masters and beacons internally)");
        deployFactory(deployer);
        
        vm.stopBroadcast();
        
        // Save deployment addresses
        saveDeployment();
        
        // Print summary
        printSummary();
    }
    
    function deployInfrastructure(address deployer) internal {
        // Deploy PolicyRegistry
        PolicyRegistry policyRegistry = new PolicyRegistry();
        deployed.policyRegistry = address(policyRegistry);
        policyRegistry.initialize(deployer);
        console.log("  PolicyRegistry:", address(policyRegistry));
        
        // Deploy PolicyEngine
        PolicyEngine policyEngine = new PolicyEngine();
        deployed.policyEngine = address(policyEngine);
        policyEngine.initialize(deployer);
        console.log("  PolicyEngine:", address(policyEngine));
        
        // Deploy TokenRegistry
        TokenRegistry tokenRegistry = new TokenRegistry();
        deployed.tokenRegistry = address(tokenRegistry);
        tokenRegistry.initialize(deployer);
        console.log("  TokenRegistry:", address(tokenRegistry));
        
        // Deploy UpgradeGovernor
        address[] memory upgraders = new address[](1);
        upgraders[0] = deployer;
        UpgradeGovernor upgradeGovernor = new UpgradeGovernor(
            upgraders,
            1, // requiredApprovals: 1 for single deployer
            0  // timeLockDuration: 0 (no timelock)
        );
        deployed.upgradeGovernor = address(upgradeGovernor);
        console.log("  UpgradeGovernor:", address(upgradeGovernor));
        
        // Note: L2GasOptimizer is a library, not deployed
        console.log("  L2GasOptimizer: Library (not deployed)");
    }
    
    function deployMasters() internal {
        // ERC20Master
        ERC20Master erc20Master = new ERC20Master();
        deployed.erc20Master = address(erc20Master);
        console.log("  ERC20Master:", address(erc20Master));
        
        // ERC721Master
        ERC721Master erc721Master = new ERC721Master();
        deployed.erc721Master = address(erc721Master);
        console.log("  ERC721Master:", address(erc721Master));
        
        // ERC1155Master
        ERC1155Master erc1155Master = new ERC1155Master();
        deployed.erc1155Master = address(erc1155Master);
        console.log("  ERC1155Master:", address(erc1155Master));
        
        // ERC3525Master
        ERC3525Master erc3525Master = new ERC3525Master();
        deployed.erc3525Master = address(erc3525Master);
        console.log("  ERC3525Master:", address(erc3525Master));
        
        // ERC4626Master
        ERC4626Master erc4626Master = new ERC4626Master();
        deployed.erc4626Master = address(erc4626Master);
        console.log("  ERC4626Master:", address(erc4626Master));
        
        // ERC1400Master
        ERC1400Master erc1400Master = new ERC1400Master();
        deployed.erc1400Master = address(erc1400Master);
        console.log("  ERC1400Master:", address(erc1400Master));
        
        // ERC20RebasingMaster
        ERC20RebasingMaster erc20RebasingMaster = new ERC20RebasingMaster();
        deployed.erc20RebasingMaster = address(erc20RebasingMaster);
        console.log("  ERC20RebasingMaster:", address(erc20RebasingMaster));
    }
    
    function deployBeacons(address deployer) internal {
        // ERC20 Beacon
        TokenBeacon erc20Beacon = new TokenBeacon(deployed.erc20Master, deployer);
        deployed.erc20Beacon = address(erc20Beacon);
        console.log("  ERC20 Beacon:", address(erc20Beacon));
        
        // ERC721 Beacon
        TokenBeacon erc721Beacon = new TokenBeacon(deployed.erc721Master, deployer);
        deployed.erc721Beacon = address(erc721Beacon);
        console.log("  ERC721 Beacon:", address(erc721Beacon));
        
        // ERC1155 Beacon
        TokenBeacon erc1155Beacon = new TokenBeacon(deployed.erc1155Master, deployer);
        deployed.erc1155Beacon = address(erc1155Beacon);
        console.log("  ERC1155 Beacon:", address(erc1155Beacon));
        
        // ERC3525 Beacon
        TokenBeacon erc3525Beacon = new TokenBeacon(deployed.erc3525Master, deployer);
        deployed.erc3525Beacon = address(erc3525Beacon);
        console.log("  ERC3525 Beacon:", address(erc3525Beacon));
        
        // ERC4626 Beacon
        TokenBeacon erc4626Beacon = new TokenBeacon(deployed.erc4626Master, deployer);
        deployed.erc4626Beacon = address(erc4626Beacon);
        console.log("  ERC4626 Beacon:", address(erc4626Beacon));
        
        // ERC1400 Beacon
        TokenBeacon erc1400Beacon = new TokenBeacon(deployed.erc1400Master, deployer);
        deployed.erc1400Beacon = address(erc1400Beacon);
        console.log("  ERC1400 Beacon:", address(erc1400Beacon));
        
        // ERC20Rebasing Beacon
        TokenBeacon erc20RebasingBeacon = new TokenBeacon(deployed.erc20RebasingMaster, deployer);
        deployed.erc20RebasingBeacon = address(erc20RebasingBeacon);
        console.log("  ERC20Rebasing Beacon:", address(erc20RebasingBeacon));
    }
    
    function deployFactory(address deployer) internal {
        TokenFactory factory = new TokenFactory(
            deployed.policyEngine,
            deployed.policyRegistry,
            deployed.tokenRegistry,
            deployed.upgradeGovernor,
            address(0) // L2GasOptimizer is a library, pass address(0)
        );
        
        deployed.tokenFactory = address(factory);
        console.log("  TokenFactory:", address(factory));
        
        // Note: TokenFactory deploys all masters internally
        console.log("  (All master contracts deployed internally by TokenFactory)");
    }
    
    function saveDeployment() internal {
        string memory json = "hoodi-deployment";
        
        // Infrastructure
        vm.serializeAddress(json, "policyEngine", deployed.policyEngine);
        vm.serializeAddress(json, "policyRegistry", deployed.policyRegistry);
        vm.serializeAddress(json, "tokenRegistry", deployed.tokenRegistry);
        vm.serializeAddress(json, "upgradeGovernor", deployed.upgradeGovernor);
        
        // Masters
        vm.serializeAddress(json, "erc20Master", deployed.erc20Master);
        vm.serializeAddress(json, "erc721Master", deployed.erc721Master);
        vm.serializeAddress(json, "erc1155Master", deployed.erc1155Master);
        vm.serializeAddress(json, "erc3525Master", deployed.erc3525Master);
        vm.serializeAddress(json, "erc4626Master", deployed.erc4626Master);
        vm.serializeAddress(json, "erc1400Master", deployed.erc1400Master);
        vm.serializeAddress(json, "erc20RebasingMaster", deployed.erc20RebasingMaster);
        
        // Beacons
        vm.serializeAddress(json, "erc20Beacon", deployed.erc20Beacon);
        vm.serializeAddress(json, "erc721Beacon", deployed.erc721Beacon);
        vm.serializeAddress(json, "erc1155Beacon", deployed.erc1155Beacon);
        vm.serializeAddress(json, "erc3525Beacon", deployed.erc3525Beacon);
        vm.serializeAddress(json, "erc4626Beacon", deployed.erc4626Beacon);
        vm.serializeAddress(json, "erc1400Beacon", deployed.erc1400Beacon);
        vm.serializeAddress(json, "erc20RebasingBeacon", deployed.erc20RebasingBeacon);
        
        // Factory
        string memory finalJson = vm.serializeAddress(json, "tokenFactory", deployed.tokenFactory);
        
        vm.writeJson(finalJson, "./deployments/hoodi-latest.json");
        console.log("\n[SUCCESS] Deployment addresses saved to: deployments/hoodi-latest.json");
    }
    
    function printSummary() internal view {
        console.log("\n========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("\nCore Infrastructure:");
        console.log("  PolicyEngine:", deployed.policyEngine);
        console.log("  PolicyRegistry:", deployed.policyRegistry);
        console.log("  TokenRegistry:", deployed.tokenRegistry);
        console.log("  UpgradeGovernor:", deployed.upgradeGovernor);
        
        console.log("\nMaster Contracts:");
        console.log("  ERC20Master:", deployed.erc20Master);
        console.log("  ERC721Master:", deployed.erc721Master);
        console.log("  ERC1155Master:", deployed.erc1155Master);
        
        console.log("\nBeacons:");
        console.log("  ERC20Beacon:", deployed.erc20Beacon);
        console.log("  ERC721Beacon:", deployed.erc721Beacon);
        
        console.log("\nToken Factory:");
        console.log("  TokenFactory:", deployed.tokenFactory);
        
        console.log("\n========================================");
        console.log("NEXT STEPS:");
        console.log("1. Verify contracts on Hoodi Etherscan");
        console.log("2. Update contract_masters table with addresses");
        console.log("3. Test token deployment via factory");
        console.log("4. Deploy extension modules if needed");
        console.log("========================================\n");
    }
}
