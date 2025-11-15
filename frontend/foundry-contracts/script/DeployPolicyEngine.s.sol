// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {PolicyEngine} from "../src/policy/PolicyEngine.sol";

/**
 * @title DeployPolicyEngine
 * @notice Deployment script for PolicyEngine contract
 * @dev Run: forge script script/DeployPolicyEngine.s.sol:DeployPolicyEngineScript --rpc-url $RPC_URL --broadcast
 */
contract DeployPolicyEngineScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying PolicyEngine with deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy PolicyEngine
        PolicyEngine policyEngine = new PolicyEngine();
        console.log("PolicyEngine deployed at:", address(policyEngine));
        
        // Initialize PolicyEngine with deployer as admin
        policyEngine.initialize(deployer);
        console.log("PolicyEngine initialized with admin:", deployer);
        
        vm.stopBroadcast();
        
        // Log deployment info
        console.log("\n=== Deployment Summary ===");
        console.log("PolicyEngine Address:", address(policyEngine));
        console.log("Admin Address:", deployer);
        console.log("\nNext steps:");
        console.log("1. Update POLICY_ENGINE_ADDRESSES in frontend/src/infrastructure/foundry/hooks/useFoundryOperations.ts");
        console.log("2. Grant roles as needed:");
        console.log("   - POLICY_ADMIN_ROLE for policy management");
        console.log("   - APPROVER_ROLE for multi-sig approvals");
        console.log("3. Create policies for your token contracts");
        console.log("4. Test policy enforcement with token operations");
    }
}
