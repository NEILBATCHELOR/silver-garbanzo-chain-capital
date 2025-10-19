// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// OpenZeppelin Proxy
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Core Infrastructure
import "../src/policy/PolicyEngine.sol";
import "../src/policy/PolicyRegistry.sol";
import "../src/registry/TokenRegistry.sol";
import "../src/governance/UpgradeGovernor.sol";
import "../src/governance/UpgradeGovernance.sol";

// Factories (includes all masters internally)
import "../src/TokenFactory.sol";
import "../src/wallets/MultiSigWalletFactory.sol";
import "../src/deployers/ExtensionModuleFactory.sol";

// Deployers & Utilities
import "../src/deployers/beacon/BeaconProxyFactory.sol";
import "../src/deployers/CREATE2Deployer.sol";
import "../src/deployers/UniversalDeployer.sol";

// Import masters for ExtensionModuleFactory
import "../src/extensions/compliance/ERC20ComplianceModule.sol";
import "../src/extensions/vesting/ERC20VestingModule.sol";
import "../src/extensions/fees/ERC20FeeModule.sol";
import "../src/extensions/royalty/ERC721RoyaltyModule.sol";

/**
 * @title DeployAllToHoodi
 * @notice COMPREHENSIVE deployment script for Hoodi testnet
 * @dev Deploys EVERYTHING except tests and individual extension module instances
 * 
 * ARCHITECTURE:
 * ============
 * 1. Core Infrastructure (5 contracts)
 *    - PolicyEngine: On-chain policy validation
 *    - PolicyRegistry: Policy template storage
 *    - TokenRegistry: Central token tracking
 *    - UpgradeGovernor: Multi-sig for beacon upgrades
 *    - UpgradeGovernance: Timelock governance for upgrades
 * 
 * 2. TokenFactory (1 contract, deploys 50+ masters internally)
 *    - Deploys 9 token master implementations
 *    - Deploys 30+ extension module masters
 *    - Deploys 7 beacons (one per token standard)
 *    - Provides deployment functions for all token types
 * 
 * 3. Extension Module Factory (1 contract + 4 beacons)
 *    - Beacon-based factory for extension modules
 *    - Enables batch upgrades (99% gas savings)
 *    - Deploy modules on-demand as needed
 * 
 * 4. Wallet Factory (1 contract)
 *    - Multi-sig wallet deployment
 *    - Supports 2-of-3, 3-of-5, etc.
 * 
 * 5. Deployer Utilities (3 contracts)
 *    - CREATE2Deployer: Deterministic deployments
 *    - UniversalDeployer: Standard deployment wrapper
 *    - BeaconProxyFactory: Generic beacon proxy factory
 * 
 * TOTAL CONTRACTS DEPLOYED: 15 core contracts
 * (TokenFactory internally creates 50+ masters but they're not separate deployments)
 * 
 * Network: Hoodi testnet (Chain ID: 560048)
 * RPC: https://ethereum-hoodi-rpc.publicnode.com/
 * Faucet: https://hoodi.ethpandaops.io
 * 
 * USAGE:
 * ======
 * 1. Get testnet ETH from faucet (~1 ETH recommended)
 * 2. Set environment: export HOODI_PRIVATE_KEY=0x...
 * 3. Run deployment:
 *    forge script script/DeployAllToHoodi.s.sol \
 *      --rpc-url https://ethereum-hoodi-rpc.publicnode.com/ \
 *      --broadcast \
 *      --verify
 * 
 * ESTIMATED COST: ~0.8-1.0 ETH (FREE on testnet)
 * ESTIMATED TIME: 5-10 minutes
 */
contract DeployAllToHoodi is Script {
    
    // ============ Deployment State ============
    struct Addresses {
        // Infrastructure
        address policyEngine;
        address policyRegistry;
        address tokenRegistry;
        address upgradeGovernor;
        address upgradeGovernance;
        
        // Factories
        address tokenFactory;
        address extensionModuleFactory;
        address multiSigFactory;
        
        // Deployers
        address create2Deployer;
        address universalDeployer;
        address beaconProxyFactory;
    }
    
    Addresses public deployed;
    
    // ============ Main Deployment Function ============
    
    function run() external {
        // Verify Hoodi network
        require(block.chainid == 560048, "Must deploy to Hoodi testnet (560048)");
        
        uint256 deployerPrivateKey = vm.envUint("HOODI_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("  HOODI TESTNET DEPLOYMENT");
        console.log("========================================");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        require(deployer.balance > 0.5 ether, "Need at least 0.5 ETH for deployment");
        console.log("========================================\n");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Phase 1: Core Infrastructure
        console.log("PHASE 1: Core Infrastructure (5 contracts)");
        console.log("==========================================");
        deployInfrastructure(deployer);
        
        // Phase 2: Token Factory (deploys all masters internally)
        console.log("\nPHASE 2: Token Factory + All Masters");
        console.log("==========================================");
        deployTokenFactory(deployer);
        
        // Phase 3: Extension Module Factory
        console.log("\nPHASE 3: Extension Module Factory");
        console.log("==========================================");
        deployExtensionModuleFactory(deployer);
        
        // Phase 4: Wallet Factory
        console.log("\nPHASE 4: Multi-Sig Wallet Factory");
        console.log("==========================================");
        deployWalletFactory(deployer);
        
        // Phase 5: Deployer Utilities
        console.log("\nPHASE 5: Deployer Utilities");
        console.log("==========================================");
        deployDeployerUtilities(deployer);
        
        vm.stopBroadcast();
        
        // Save and summarize
        saveDeployment();
        printSummary();
    }
    
    // ============ Phase 1: Infrastructure ============
    
    function deployInfrastructure(address deployer) internal {
        // PolicyRegistry - Deploy implementation + proxy
        address policyRegistryImpl = address(new PolicyRegistry());
        bytes memory policyRegistryInit = abi.encodeCall(PolicyRegistry.initialize, (deployer));
        ERC1967Proxy policyRegistryProxy = new ERC1967Proxy(policyRegistryImpl, policyRegistryInit);
        deployed.policyRegistry = address(policyRegistryProxy);
        console.log(unicode"  ✅ PolicyRegistry:", deployed.policyRegistry);
        console.log("     Implementation:", policyRegistryImpl);
        
        // PolicyEngine - Deploy implementation + proxy
        address policyEngineImpl = address(new PolicyEngine());
        bytes memory policyEngineInit = abi.encodeCall(PolicyEngine.initialize, (deployer));
        ERC1967Proxy policyEngineProxy = new ERC1967Proxy(policyEngineImpl, policyEngineInit);
        deployed.policyEngine = address(policyEngineProxy);
        console.log(unicode"  ✅ PolicyEngine:", deployed.policyEngine);
        console.log("     Implementation:", policyEngineImpl);
        
        // TokenRegistry - Deploy implementation + proxy
        address tokenRegistryImpl = address(new TokenRegistry());
        bytes memory tokenRegistryInit = abi.encodeCall(TokenRegistry.initialize, (deployer));
        ERC1967Proxy tokenRegistryProxy = new ERC1967Proxy(tokenRegistryImpl, tokenRegistryInit);
        deployed.tokenRegistry = address(tokenRegistryProxy);
        console.log(unicode"  ✅ TokenRegistry:", deployed.tokenRegistry);
        console.log("     Implementation:", tokenRegistryImpl);
        
        // UpgradeGovernor (simple multi-sig) - NOT UUPS, direct deployment
        address[] memory upgraders = new address[](1);
        upgraders[0] = deployer;
        UpgradeGovernor upgradeGovernor = new UpgradeGovernor(upgraders, 1, 0);
        deployed.upgradeGovernor = address(upgradeGovernor);
        console.log(unicode"  ✅ UpgradeGovernor:", deployed.upgradeGovernor);
        
        // UpgradeGovernance (timelock governance) - Check if UUPS
        UpgradeGovernance upgradeGovernance = new UpgradeGovernance(
            deployer,  // admin
            2 days,    // timelock delay
            2          // min approvers
        );
        deployed.upgradeGovernance = address(upgradeGovernance);
        console.log(unicode"  ✅ UpgradeGovernance:", deployed.upgradeGovernance);
        
        console.log("\n  Total: 5 infrastructure contracts deployed");
        console.log("  (3 with UUPS proxies, 2 direct)");
    }
    
    // ============ Phase 2: Token Factory ============
    
    function deployTokenFactory(address deployer) internal {
        // TokenFactory deploys ALL masters and beacons in its constructor
        TokenFactory factory = new TokenFactory(
            deployed.policyEngine,
            deployed.policyRegistry,
            deployed.tokenRegistry,
            deployed.upgradeGovernor,
            address(0)  // L2GasOptimizer is a library
        );
        
        deployed.tokenFactory = address(factory);
        console.log(unicode"  ✅ TokenFactory:", deployed.tokenFactory);
        console.log("\n  TokenFactory internally deployed:");
        console.log("    - 9 token master implementations");
        console.log("    - 30+ extension module masters");
        console.log("    - 7 beacons (one per token standard)");
        console.log("    Total: ~50 contracts created in constructor");
    }
    
    // ============ Phase 3: Extension Module Factory ============
    
    function deployExtensionModuleFactory(address deployer) internal {
        // Deploy master implementations for extension modules
        address complianceMaster = address(new ERC20ComplianceModule());
        address vestingMaster = address(new ERC20VestingModule());
        address feeMaster = address(new ERC20FeeModule());
        address royaltyMaster = address(new ERC721RoyaltyModule());
        
        console.log(unicode"  📦 Extension Module Masters:");
        console.log("    - ComplianceModule:", complianceMaster);
        console.log("    - VestingModule:", vestingMaster);
        console.log("    - FeeModule:", feeMaster);
        console.log("    - RoyaltyModule:", royaltyMaster);
        
        // Deploy factory (deploys 4 beacons in constructor)
        ExtensionModuleFactory extensionFactory = new ExtensionModuleFactory(
            complianceMaster,
            vestingMaster,
            feeMaster,
            royaltyMaster,
            deployer
        );
        
        deployed.extensionModuleFactory = address(extensionFactory);
        console.log(unicode"\n  ✅ ExtensionModuleFactory:", deployed.extensionModuleFactory);
        console.log("    (Includes 4 beacons for batch upgrades)");
    }
    
    // ============ Phase 4: Wallet Factory ============
    
    function deployWalletFactory(address deployer) internal {
        MultiSigWalletFactory walletFactory = new MultiSigWalletFactory();
        deployed.multiSigFactory = address(walletFactory);
        console.log(unicode"  ✅ MultiSigWalletFactory:", deployed.multiSigFactory);
    }
    
    // ============ Phase 5: Deployer Utilities ============
    
    function deployDeployerUtilities(address deployer) internal {
        // CREATE2Deployer for deterministic addresses
        CREATE2Deployer create2 = new CREATE2Deployer();
        deployed.create2Deployer = address(create2);
        console.log(unicode"  ✅ CREATE2Deployer:", deployed.create2Deployer);
        
        // UniversalDeployer for standard deployments (creates masters internally)
        UniversalDeployer universal = new UniversalDeployer();
        deployed.universalDeployer = address(universal);
        console.log(unicode"  ✅ UniversalDeployer:", deployed.universalDeployer);
        
        // BeaconProxyFactory for generic beacon proxies
        BeaconProxyFactory beaconProxy = new BeaconProxyFactory(deployer);
        deployed.beaconProxyFactory = address(beaconProxy);
        console.log(unicode"  ✅ BeaconProxyFactory:", deployed.beaconProxyFactory);
        
        console.log("\n  Total: 3 deployer utilities");
    }
    
    // ============ Save Deployment ============
    
    function saveDeployment() internal {
        string memory json = "deployment";
        
        // Infrastructure
        vm.serializeAddress(json, "policyEngine", deployed.policyEngine);
        vm.serializeAddress(json, "policyRegistry", deployed.policyRegistry);
        vm.serializeAddress(json, "tokenRegistry", deployed.tokenRegistry);
        vm.serializeAddress(json, "upgradeGovernor", deployed.upgradeGovernor);
        vm.serializeAddress(json, "upgradeGovernance", deployed.upgradeGovernance);
        
        // Factories
        vm.serializeAddress(json, "tokenFactory", deployed.tokenFactory);
        vm.serializeAddress(json, "extensionModuleFactory", deployed.extensionModuleFactory);
        vm.serializeAddress(json, "multiSigFactory", deployed.multiSigFactory);
        
        // Deployers
        vm.serializeAddress(json, "create2Deployer", deployed.create2Deployer);
        vm.serializeAddress(json, "universalDeployer", deployed.universalDeployer);
        string memory finalJson = vm.serializeAddress(json, "beaconProxyFactory", deployed.beaconProxyFactory);
        
        // Save to file
        string memory filename = string.concat(
            "./deployments/hoodi-complete-",
            vm.toString(block.timestamp),
            ".json"
        );
        vm.writeJson(finalJson, filename);
        vm.writeJson(finalJson, "./deployments/hoodi-latest.json");
        
        console.log(unicode"\n📁 Deployment saved:");
        console.log("  -", filename);
        console.log("  - ./deployments/hoodi-latest.json");
    }
    
    // ============ Print Summary ============
    
    function printSummary() internal view {
        console.log("\n========================================");
        console.log(unicode"  ✅ DEPLOYMENT COMPLETE");
        console.log("========================================\n");
        
        console.log("INFRASTRUCTURE (5):");
        console.log("  PolicyEngine:           ", deployed.policyEngine);
        console.log("  PolicyRegistry:         ", deployed.policyRegistry);
        console.log("  TokenRegistry:          ", deployed.tokenRegistry);
        console.log("  UpgradeGovernor:        ", deployed.upgradeGovernor);
        console.log("  UpgradeGovernance:      ", deployed.upgradeGovernance);
        
        console.log("\nFACTORIES (3):");
        console.log("  TokenFactory:           ", deployed.tokenFactory);
        console.log("  ExtensionModuleFactory: ", deployed.extensionModuleFactory);
        console.log("  MultiSigFactory:        ", deployed.multiSigFactory);
        
        console.log("\nDEPLOYER UTILITIES (3):");
        console.log("  CREATE2Deployer:        ", deployed.create2Deployer);
        console.log("  UniversalDeployer:      ", deployed.universalDeployer);
        console.log("  BeaconProxyFactory:     ", deployed.beaconProxyFactory);
        
        console.log("\n========================================");
        console.log("TOTAL: 11 core contracts deployed");
        console.log("       + ~50 masters in TokenFactory");
        console.log("       + 4 extension beacons");
        console.log("       + 7 token beacons");
        console.log("========================================\n");
        
        // Get TokenFactory master addresses for display
        TokenFactory factory = TokenFactory(deployed.tokenFactory);
        
        console.log("TOKEN MASTERS (from TokenFactory):");
        console.log("  ERC20Master:            ", factory.erc20Master());
        console.log("  ERC721Master:           ", factory.erc721Master());
        console.log("  ERC1155Master:          ", factory.erc1155Master());
        console.log("  ERC3525Master:          ", factory.erc3525Master());
        console.log("  ERC4626Master:          ", factory.erc4626Master());
        console.log("  ERC1400Master:          ", factory.erc1400Master());
        console.log("  ERC20RebasingMaster:    ", factory.erc20RebasingMaster());
        
        console.log("\nTOKEN BEACONS (from TokenFactory):");
        console.log("  ERC20Beacon:            ", factory.erc20Beacon());
        console.log("  ERC721Beacon:           ", factory.erc721Beacon());
        console.log("  ERC1155Beacon:          ", factory.erc1155Beacon());
        console.log("  ERC3525Beacon:          ", factory.erc3525Beacon());
        console.log("  ERC4626Beacon:          ", factory.erc4626Beacon());
        console.log("  ERC1400Beacon:          ", factory.erc1400Beacon());
        
        console.log("\n========================================");
        console.log("NEXT STEPS:");
        console.log("========================================");
        console.log(unicode"1. ✅ All contracts deployed");
        console.log(unicode"2. 🔍 Verify contracts on Hoodi Etherscan");
        console.log(unicode"3. 💾 Update contract_masters table in database");
        console.log(unicode"4. 🧪 Test token deployment:");
        console.log("   cast send", deployed.tokenFactory);
        console.log("   'deployERC20(...)'");
        console.log(unicode"5. 🧪 Test multi-sig wallet creation");
        console.log(unicode"6. 🧪 Test extension module deployment");
        console.log(unicode"\n📖 Documentation:");
        console.log("   - Deployment: /docs/hoodi-deployment-complete-guide.md");
        console.log("   - Verification: /docs/hoodi-complete-contract-verification.md");
        console.log("========================================\n");
    }
}
