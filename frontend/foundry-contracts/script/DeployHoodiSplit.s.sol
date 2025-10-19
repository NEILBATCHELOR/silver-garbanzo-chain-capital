// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Masters
import "../src/masters/ERC20Master.sol";
import "../src/masters/ERC721Master.sol";
import "../src/masters/ERC1155Master.sol";
import "../src/masters/ERC3525Master.sol";
import "../src/masters/ERC4626Master.sol";
import "../src/masters/ERC1400Master.sol";
import "../src/masters/ERC20RebasingMaster.sol";

// Beacons
import "../src/deployers/beacon/TokenBeacon.sol";

// Infrastructure
import "../src/policy/PolicyEngine.sol";
import "../src/policy/PolicyRegistry.sol";
import "../src/registry/TokenRegistry.sol";
import "../src/governance/UpgradeGovernor.sol";

// Proxies
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployHoodiSplit - WORKING VERSION
 * @notice Split deployment to avoid 24KB contract size limit
 * @dev TokenFactory is 46KB so we deploy masters separately
 * 
 * Network: Hoodi Testnet (Chain ID: 560048)
 * RPC: https://ethereum-hoodi-rpc.publicnode.com/
 */
contract DeployHoodiSplit is Script {
    
    struct Deployment {
        address policyEngine;
        address policyRegistry;
        address tokenRegistry;
        address upgradeGovernor;
        
        address erc20Master;
        address erc721Master;
        address erc1155Master;
        address erc3525Master;
        address erc4626Master;
        address erc1400Master;
        address erc20RebasingMaster;
        
        address erc20Beacon;
        address erc721Beacon;
        address erc1155Beacon;
        address erc3525Beacon;
        address erc4626Beacon;
        address erc1400Beacon;
        address erc20RebasingBeacon;
    }
    
    Deployment public deployed;
    
    function run() external {
        require(block.chainid == 560048, "Must deploy to Hoodi (560048)");
        
        uint256 deployerPrivateKey = vm.envUint("HOODI_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("HOODI SPLIT DEPLOYMENT");
        console.log("========================================");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log("========================================\n");
        
        require(deployer.balance > 0.5 ether, "Need 0.5+ ETH");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Phase 1: Infrastructure
        console.log("PHASE 1: Infrastructure (4 contracts)");
        console.log("==========================================");
        deployInfrastructure(deployer);
        
        // Phase 2: Masters
        console.log("\nPHASE 2: Master Contracts (7 contracts)");
        console.log("==========================================");
        deployMasters();
        
        // Phase 3: Beacons
        console.log("\nPHASE 3: Beacons (7 contracts)");
        console.log("==========================================");
        deployBeacons(deployer);
        
        vm.stopBroadcast();
        
        // Save
        saveDeployment();
        printSummary();
    }
    
    function deployInfrastructure(address deployer) internal {
        // PolicyRegistry with proxy
        address policyRegistryImpl = address(new PolicyRegistry());
        bytes memory policyRegistryInit = abi.encodeCall(PolicyRegistry.initialize, (deployer));
        ERC1967Proxy policyRegistryProxy = new ERC1967Proxy(policyRegistryImpl, policyRegistryInit);
        deployed.policyRegistry = address(policyRegistryProxy);
        console.log(unicode"  ✅ PolicyRegistry:", deployed.policyRegistry);
        
        // PolicyEngine with proxy
        address policyEngineImpl = address(new PolicyEngine());
        bytes memory policyEngineInit = abi.encodeCall(PolicyEngine.initialize, (deployer));
        ERC1967Proxy policyEngineProxy = new ERC1967Proxy(policyEngineImpl, policyEngineInit);
        deployed.policyEngine = address(policyEngineProxy);
        console.log(unicode"  ✅ PolicyEngine:", deployed.policyEngine);
        
        // TokenRegistry with proxy
        address tokenRegistryImpl = address(new TokenRegistry());
        bytes memory tokenRegistryInit = abi.encodeCall(TokenRegistry.initialize, (deployer));
        ERC1967Proxy tokenRegistryProxy = new ERC1967Proxy(tokenRegistryImpl, tokenRegistryInit);
        deployed.tokenRegistry = address(tokenRegistryProxy);
        console.log(unicode"  ✅ TokenRegistry:", deployed.tokenRegistry);
        
        // UpgradeGovernor (direct, not UUPS)
        address[] memory upgraders = new address[](1);
        upgraders[0] = deployer;
        UpgradeGovernor upgradeGovernor = new UpgradeGovernor(upgraders, 1, 0);
        deployed.upgradeGovernor = address(upgradeGovernor);
        console.log(unicode"  ✅ UpgradeGovernor:", deployed.upgradeGovernor);
    }
    
    function deployMasters() internal {
        deployed.erc20Master = address(new ERC20Master());
        console.log(unicode"  ✅ ERC20Master:", deployed.erc20Master);
        
        deployed.erc721Master = address(new ERC721Master());
        console.log(unicode"  ✅ ERC721Master:", deployed.erc721Master);
        
        deployed.erc1155Master = address(new ERC1155Master());
        console.log(unicode"  ✅ ERC1155Master:", deployed.erc1155Master);
        
        deployed.erc3525Master = address(new ERC3525Master());
        console.log(unicode"  ✅ ERC3525Master:", deployed.erc3525Master);
        
        deployed.erc4626Master = address(new ERC4626Master());
        console.log(unicode"  ✅ ERC4626Master:", deployed.erc4626Master);
        
        deployed.erc1400Master = address(new ERC1400Master());
        console.log(unicode"  ✅ ERC1400Master:", deployed.erc1400Master);
        
        deployed.erc20RebasingMaster = address(new ERC20RebasingMaster());
        console.log(unicode"  ✅ ERC20RebasingMaster:", deployed.erc20RebasingMaster);
    }
    
    function deployBeacons(address deployer) internal {
        deployed.erc20Beacon = address(new TokenBeacon(deployed.erc20Master, deployer));
        console.log(unicode"  ✅ ERC20Beacon:", deployed.erc20Beacon);
        
        deployed.erc721Beacon = address(new TokenBeacon(deployed.erc721Master, deployer));
        console.log(unicode"  ✅ ERC721Beacon:", deployed.erc721Beacon);
        
        deployed.erc1155Beacon = address(new TokenBeacon(deployed.erc1155Master, deployer));
        console.log(unicode"  ✅ ERC1155Beacon:", deployed.erc1155Beacon);
        
        deployed.erc3525Beacon = address(new TokenBeacon(deployed.erc3525Master, deployer));
        console.log(unicode"  ✅ ERC3525Beacon:", deployed.erc3525Beacon);
        
        deployed.erc4626Beacon = address(new TokenBeacon(deployed.erc4626Master, deployer));
        console.log(unicode"  ✅ ERC4626Beacon:", deployed.erc4626Beacon);
        
        deployed.erc1400Beacon = address(new TokenBeacon(deployed.erc1400Master, deployer));
        console.log(unicode"  ✅ ERC1400Beacon:", deployed.erc1400Beacon);
        
        deployed.erc20RebasingBeacon = address(new TokenBeacon(deployed.erc20RebasingMaster, deployer));
        console.log(unicode"  ✅ ERC20RebasingBeacon:", deployed.erc20RebasingBeacon);
    }
    
    function saveDeployment() internal {
        string memory json = "deployment";
        vm.serializeAddress(json, "policyEngine", deployed.policyEngine);
        vm.serializeAddress(json, "policyRegistry", deployed.policyRegistry);
        vm.serializeAddress(json, "tokenRegistry", deployed.tokenRegistry);
        vm.serializeAddress(json, "upgradeGovernor", deployed.upgradeGovernor);
        vm.serializeAddress(json, "erc20Master", deployed.erc20Master);
        vm.serializeAddress(json, "erc721Master", deployed.erc721Master);
        vm.serializeAddress(json, "erc1155Master", deployed.erc1155Master);
        vm.serializeAddress(json, "erc3525Master", deployed.erc3525Master);
        vm.serializeAddress(json, "erc4626Master", deployed.erc4626Master);
        vm.serializeAddress(json, "erc1400Master", deployed.erc1400Master);
        vm.serializeAddress(json, "erc20RebasingMaster", deployed.erc20RebasingMaster);
        vm.serializeAddress(json, "erc20Beacon", deployed.erc20Beacon);
        vm.serializeAddress(json, "erc721Beacon", deployed.erc721Beacon);
        vm.serializeAddress(json, "erc1155Beacon", deployed.erc1155Beacon);
        vm.serializeAddress(json, "erc3525Beacon", deployed.erc3525Beacon);
        vm.serializeAddress(json, "erc4626Beacon", deployed.erc4626Beacon);
        vm.serializeAddress(json, "erc1400Beacon", deployed.erc1400Beacon);
        string memory finalJson = vm.serializeAddress(json, "erc20RebasingBeacon", deployed.erc20RebasingBeacon);
        
        vm.writeJson(finalJson, "./deployments/hoodi-latest.json");
        console.log(unicode"\n📁 Saved: deployments/hoodi-latest.json");
    }
    
    function printSummary() internal view {
        console.log(unicode"\n========================================");
        console.log(unicode"  ✅ DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("\nINFRASTRUCTURE:");
        console.log("  PolicyEngine:", deployed.policyEngine);
        console.log("  PolicyRegistry:", deployed.policyRegistry);
        console.log("  TokenRegistry:", deployed.tokenRegistry);
        console.log("  UpgradeGovernor:", deployed.upgradeGovernor);
        console.log("\nMASTERS:");
        console.log("  ERC20Master:", deployed.erc20Master);
        console.log("  ERC721Master:", deployed.erc721Master);
        console.log("  ERC1155Master:", deployed.erc1155Master);
        console.log("\nBEACONS:");
        console.log("  ERC20Beacon:", deployed.erc20Beacon);
        console.log("  ERC721Beacon:", deployed.erc721Beacon);
        console.log("  ERC1155Beacon:", deployed.erc1155Beacon);
        console.log("\nTOTAL: 18 contracts deployed");
        console.log("========================================\n");
    }
}
