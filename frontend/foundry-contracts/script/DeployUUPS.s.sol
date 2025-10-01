// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/governance/UpgradeGovernor.sol";
import "../src/registry/TokenRegistry.sol";
import "../src/masters/ERC20Master.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployUUPS
 * @notice Deployment script for Stage 2: UUPS Pattern components
 * @dev Deploys UpgradeGovernor and TokenRegistry with multi-sig setup
 */
contract DeployUUPS is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("===================================");
        console.log("STAGE 2: UUPS PATTERN DEPLOYMENT");
        console.log("===================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // ============ Step 1: Deploy UpgradeGovernor ============
        console.log("Step 1: Deploying UpgradeGovernor...");
        
        address[] memory upgraders = new address[](3);
        upgraders[0] = deployer;
        // Add additional upgraders from env or use deployer for testing
        upgraders[1] = vm.envOr("UPGRADER_2", deployer);
        upgraders[2] = vm.envOr("UPGRADER_3", deployer);
        
        uint256 requiredApprovals = 2; // 2-of-3 multi-sig
        uint256 timeLockDuration = 0;  // No time lock for testing (use 48 hours in prod)
        
        UpgradeGovernor governor = new UpgradeGovernor(
            upgraders,
            requiredApprovals,
            timeLockDuration
        );
        
        console.log("UpgradeGovernor deployed at:", address(governor));
        console.log("  - Required approvals:", requiredApprovals);
        console.log("  - Time lock:", timeLockDuration, "seconds");
        console.log("  - Upgraders:");
        for (uint i = 0; i < upgraders.length; i++) {
            console.log("    -", upgraders[i]);
        }
        console.log("");

        
        // ============ Step 2: Deploy TokenRegistry ============
        console.log("Step 2: Deploying TokenRegistry...");
        
        // Deploy implementation
        TokenRegistry registryImpl = new TokenRegistry();
        console.log("TokenRegistry implementation:", address(registryImpl));
        
        // Prepare initialization data
        bytes memory registryInitData = abi.encodeWithSelector(
            TokenRegistry.initialize.selector,
            deployer
        );
        
        // Deploy proxy
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            registryInitData
        );
        
        TokenRegistry registry = TokenRegistry(address(registryProxy));
        console.log("TokenRegistry proxy:", address(registry));
        
        // Grant REGISTRAR_ROLE to TokenFactory (will be added later)
        // Grant UPGRADER_ROLE to UpgradeGovernor
        bytes32 UPGRADER_ROLE = registry.UPGRADER_ROLE();
        registry.grantRole(UPGRADER_ROLE, address(governor));
        console.log("  - Granted UPGRADER_ROLE to UpgradeGovernor");
        console.log("");
        
        // ============ Step 3: Deploy Sample Token ============
        console.log("Step 3: Deploying sample ERC20 token...");
        
        // Deploy implementation
        ERC20Master tokenImpl = new ERC20Master();
        console.log("ERC20Master implementation:", address(tokenImpl));
        
        // Prepare initialization data
        bytes memory tokenInitData = abi.encodeWithSelector(
            ERC20Master.initialize.selector,
            "Chain Capital Token",    // name
            "CCT",                     // symbol
            1000000 * 10**18,          // maxSupply
            100000 * 10**18,           // initialSupply
            deployer                   // owner
        );
        
        // Deploy proxy
        ERC1967Proxy tokenProxy = new ERC1967Proxy(
            address(tokenImpl),
            tokenInitData
        );
        
        console.log("Sample ERC20 token deployed at:", address(tokenProxy));
        console.log("");
        
        // ============ Step 4: Register Token ============
        console.log("Step 4: Registering token in registry...");
        
        bytes32 REGISTRAR_ROLE = registry.REGISTRAR_ROLE();
        registry.grantRole(REGISTRAR_ROLE, deployer);
        
        registry.registerToken(
            address(tokenProxy),
            address(tokenImpl),
            deployer,
            "ERC20",
            "Chain Capital Token",
            "CCT"
        );
        
        console.log("Token registered successfully");
        console.log("");

        
        // ============ Summary ============
        console.log("===================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("===================================");
        console.log("");
        console.log("Governance:");
        console.log("  UpgradeGovernor:", address(governor));
        console.log("");
        console.log("Registry:");
        console.log("  TokenRegistry (impl):", address(registryImpl));
        console.log("  TokenRegistry (proxy):", address(registry));
        console.log("");
        console.log("Sample Token:");
        console.log("  ERC20Master (impl):", address(tokenImpl));
        console.log("  ERC20Master (proxy):", address(tokenProxy));
        console.log("");
        console.log("Next Steps:");
        console.log("1. Verify contracts on block explorer");
        console.log("2. Update TokenFactory to use TokenRegistry");
        console.log("3. Test upgrade process using UpgradeGovernor");
        console.log("4. Set time lock duration for production (48 hours recommended)");
        console.log("");
        console.log("===================================");
        
        vm.stopBroadcast();
        
        // ============ Save Deployment Addresses ============
        string memory deployments = string(abi.encodePacked(
            "{\n",
            '  "upgradeGovernor": "', vm.toString(address(governor)), '",\n',
            '  "tokenRegistry": "', vm.toString(address(registry)), '",\n',
            '  "tokenRegistryImpl": "', vm.toString(address(registryImpl)), '",\n',
            '  "sampleToken": "', vm.toString(address(tokenProxy)), '",\n',
            '  "sampleTokenImpl": "', vm.toString(address(tokenImpl)), '",\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "deployer": "', vm.toString(deployer), '"\n',
            "}\n"
        ));
        
        vm.writeFile("deployments/stage2-deployment.json", deployments);
        console.log("Deployment addresses saved to: deployments/stage2-deployment.json");
    }
}
