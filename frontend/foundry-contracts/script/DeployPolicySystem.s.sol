// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/policy/PolicyEngine.sol";
import "../src/policy/PolicyRegistry.sol";
import "../src/policy/libraries/PolicyTypes.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployPolicySystem
 * @notice Deployment script for the complete policy enforcement system
 * @dev Deploys PolicyEngine and PolicyRegistry with UUPS proxies
 */
contract DeployPolicySystem is Script {
    
    /**
     * @notice Main deployment function
     * @dev Deploys both PolicyEngine and PolicyRegistry with proper initialization
     */
    function run() public virtual {
        // Get deployment configuration from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address adminAddress = vm.envAddress("ADMIN_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Deploying Policy System ===");
        console.log("Admin Address:", adminAddress);
        console.log("Deployer:", msg.sender);
        
        // ============ Deploy PolicyEngine ============
        
        console.log("\n--- Deploying PolicyEngine ---");
        
        // 1. Deploy implementation
        PolicyEngine engineImpl = new PolicyEngine();
        console.log("PolicyEngine Implementation:", address(engineImpl));
        
        // 2. Deploy proxy with initialization
        bytes memory engineInitData = abi.encodeWithSelector(
            PolicyEngine.initialize.selector,
            adminAddress
        );
        
        ERC1967Proxy engineProxy = new ERC1967Proxy(
            address(engineImpl),
            engineInitData
        );
        console.log("PolicyEngine Proxy:", address(engineProxy));
        
        PolicyEngine policyEngine = PolicyEngine(address(engineProxy));
        
        // ============ Deploy PolicyRegistry ============
        
        console.log("\n--- Deploying PolicyRegistry ---");
        
        // 1. Deploy implementation
        PolicyRegistry registryImpl = new PolicyRegistry();
        console.log("PolicyRegistry Implementation:", address(registryImpl));
        
        // 2. Deploy proxy with initialization
        bytes memory registryInitData = abi.encodeWithSelector(
            PolicyRegistry.initialize.selector,
            adminAddress
        );
        
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            registryInitData
        );
        console.log("PolicyRegistry Proxy:", address(registryProxy));
        
        PolicyRegistry policyRegistry = PolicyRegistry(address(registryProxy));
        
        // ============ Verification ============
        
        console.log("\n--- Verification ---");
        
        // Verify PolicyEngine has correct admin
        bool engineHasAdmin = policyEngine.hasRole(
            policyEngine.DEFAULT_ADMIN_ROLE(),
            adminAddress
        );
        console.log("PolicyEngine Admin Role:", engineHasAdmin);
        
        // Verify PolicyRegistry has correct admin
        bool registryHasAdmin = policyRegistry.hasRole(
            policyRegistry.DEFAULT_ADMIN_ROLE(),
            adminAddress
        );
        console.log("PolicyRegistry Admin Role:", registryHasAdmin);
        
        vm.stopBroadcast();
        
        // ============ Summary ============
        
        console.log("\n=== Deployment Summary ===");
        console.log("PolicyEngine:");
        console.log("  Implementation:", address(engineImpl));
        console.log("  Proxy:", address(policyEngine));
        console.log("\nPolicyRegistry:");
        console.log("  Implementation:", address(registryImpl));
        console.log("  Proxy:", address(policyRegistry));
        console.log("\nAdmin Address:", adminAddress);
        console.log("\n=== Deployment Complete ===");
        
        // Save deployment addresses to file
        _saveDeploymentAddresses(
            address(engineImpl),
            address(policyEngine),
            address(registryImpl),
            address(policyRegistry),
            adminAddress
        );
    }
    
    /**
     * @notice Save deployment addresses to JSON file
     * @dev Creates a JSON file with all deployed contract addresses
     */
    function _saveDeploymentAddresses(
        address engineImpl,
        address engineProxy,
        address registryImpl,
        address registryProxy,
        address admin
    ) internal {
        string memory json = string(
            abi.encodePacked(
                '{\n',
                '  "network": "', _getNetworkName(), '",\n',
                '  "timestamp": ', vm.toString(block.timestamp), ',\n',
                '  "deployer": "', vm.toString(msg.sender), '",\n',
                '  "admin": "', vm.toString(admin), '",\n',
                '  "contracts": {\n',
                '    "PolicyEngine": {\n',
                '      "implementation": "', vm.toString(engineImpl), '",\n',
                '      "proxy": "', vm.toString(engineProxy), '"\n',
                '    },\n',
                '    "PolicyRegistry": {\n',
                '      "implementation": "', vm.toString(registryImpl), '",\n',
                '      "proxy": "', vm.toString(registryProxy), '"\n',
                '    }\n',
                '  }\n',
                '}'
            )
        );
        
        string memory filename = string(
            abi.encodePacked(
                "deployments/policy-",
                _getNetworkName(),
                "-",
                vm.toString(block.timestamp),
                ".json"
            )
        );
        
        vm.writeFile(filename, json);
        console.log("\nDeployment info saved to:", filename);
    }
    
    /**
     * @notice Get current network name
     * @return network Network name based on chain ID
     */
    function _getNetworkName() internal view returns (string memory) {
        uint256 chainId = block.chainid;
        
        if (chainId == 1) return "mainnet";
        if (chainId == 5) return "goerli";
        if (chainId == 11155111) return "sepolia";
        if (chainId == 137) return "polygon";
        if (chainId == 42161) return "arbitrum";
        if (chainId == 8453) return "base";
        if (chainId == 10) return "optimism";
        if (chainId == 31337) return "localhost";
        
        return vm.toString(chainId);
    }
}

/**
 * @title DeployPolicySystemWithSamplePolicies
 * @notice Extended deployment script that also creates sample policies
 * @dev Use this for testing or initial setup with predefined policies
 */
contract DeployPolicySystemWithSamplePolicies is DeployPolicySystem {
    
    /**
     * @notice Deploy system and create sample policies
     */
    function run() public override {
        // Run base deployment
        super.run();
        
        // Get deployment configuration
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address adminAddress = vm.envAddress("ADMIN_ADDRESS");
        
        // Get optional token address for sample policies
        address tokenAddress = vm.envOr("TOKEN_ADDRESS", address(0));
        
        if (tokenAddress == address(0)) {
            console.log("\nNo TOKEN_ADDRESS set, skipping sample policies");
            return;
        }
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("\n=== Creating Sample Policies ===");
        console.log("Token Address:", tokenAddress);
        
        // Get deployed contracts (assuming they were just deployed)
        // Note: In practice, you'd load these from the deployment file
        PolicyEngine policyEngine = PolicyEngine(vm.envAddress("POLICY_ENGINE_ADDRESS"));
        PolicyRegistry policyRegistry = PolicyRegistry(vm.envAddress("POLICY_REGISTRY_ADDRESS"));
        
        // Register token
        policyRegistry.registerToken(
            tokenAddress,
            "ERC20",
            address(policyEngine)
        );
        console.log("Token registered in registry");
        
        // Create mint policy
        policyEngine.createPolicy(
            tokenAddress,
            "mint",
            1000000 * 10**18,  // Max 1M per operation
            10000000 * 10**18, // Max 10M daily
            3600                // 1 hour cooldown
        );
        console.log("Mint policy created");
        
        // Register mint policy
        policyRegistry.registerPolicy(
            tokenAddress,
            "mint",
            address(policyEngine)
        );
        
        // Create burn policy
        policyEngine.createPolicy(
            tokenAddress,
            "burn",
            500000 * 10**18,   // Max 500K per operation
            5000000 * 10**18,  // Max 5M daily
            1800                // 30 minute cooldown
        );
        console.log("Burn policy created");
        
        policyRegistry.registerPolicy(
            tokenAddress,
            "burn",
            address(policyEngine)
        );
        
        // Create transfer policy
        policyEngine.createPolicy(
            tokenAddress,
            "transfer",
            100000 * 10**18,   // Max 100K per operation
            1000000 * 10**18,  // Max 1M daily
            60                  // 1 minute cooldown
        );
        console.log("Transfer policy created");
        
        policyRegistry.registerPolicy(
            tokenAddress,
            "transfer",
            address(policyEngine)
        );
        
        vm.stopBroadcast();
        
        console.log("\n=== Sample Policies Created ===");
    }
}
