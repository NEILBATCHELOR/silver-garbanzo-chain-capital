// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/TokenFactory.sol";
import "../src/masters/ERC20Master.sol";
import "../src/masters/ERC721Master.sol";
import "../src/masters/ERC1155Master.sol";
import "../src/masters/ERC3525Master.sol";
import "../src/masters/ERC4626Master.sol";
import "../src/masters/ERC1400Master.sol";
import "../src/extensions/compliance/ERC20ComplianceModule.sol";
import "../src/extensions/vesting/ERC20VestingModule.sol";
import "../src/extensions/royalty/ERC721RoyaltyModule.sol";
import "../src/extensions/fees/ERC20FeeModule.sol";

/**
 * @title DeployTokenFactoryMultiStep
 * @notice Deploys all master contracts separately, then TokenFactory
 * @dev This avoids the 49KB init code size limit by splitting deployment
 */
contract DeployTokenFactoryMultiStep is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==================================================");
        console.log("Multi-Step TokenFactory Deployment");
        console.log("==================================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // ============ STEP 1: Deploy Master Contracts ============
        console.log("STEP 1: Deploying Master Contracts...");
        console.log("--------------------------------------------------");
        
        console.log("Deploying ERC20Master...");
        ERC20Master erc20Master = new ERC20Master();
        console.log("  ERC20Master deployed at:", address(erc20Master));
        
        console.log("Deploying ERC721Master...");
        ERC721Master erc721Master = new ERC721Master();
        console.log("  ERC721Master deployed at:", address(erc721Master));
        
        console.log("Deploying ERC1155Master...");
        ERC1155Master erc1155Master = new ERC1155Master();
        console.log("  ERC1155Master deployed at:", address(erc1155Master));
        
        console.log("Deploying ERC3525Master...");
        ERC3525Master erc3525Master = new ERC3525Master();
        console.log("  ERC3525Master deployed at:", address(erc3525Master));
        
        console.log("Deploying ERC4626Master...");
        ERC4626Master erc4626Master = new ERC4626Master();
        console.log("  ERC4626Master deployed at:", address(erc4626Master));
        
        console.log("Deploying ERC1400Master...");
        ERC1400Master erc1400Master = new ERC1400Master();
        console.log("  ERC1400Master deployed at:", address(erc1400Master));
        
        console.log("");
        
        // ============ STEP 2: Deploy Extension Modules ============
        console.log("STEP 2: Deploying Extension Modules...");
        console.log("--------------------------------------------------");
        
        console.log("Deploying ERC20ComplianceModule...");
        ERC20ComplianceModule complianceModule = new ERC20ComplianceModule();
        console.log("  ComplianceModule deployed at:", address(complianceModule));
        
        console.log("Deploying ERC20VestingModule...");
        ERC20VestingModule vestingModule = new ERC20VestingModule();
        console.log("  VestingModule deployed at:", address(vestingModule));
        
        console.log("Deploying ERC721RoyaltyModule...");
        ERC721RoyaltyModule royaltyModule = new ERC721RoyaltyModule();
        console.log("  RoyaltyModule deployed at:", address(royaltyModule));
        
        console.log("Deploying ERC20FeeModule...");
        ERC20FeeModule feeModule = new ERC20FeeModule();
        console.log("  FeeModule deployed at:", address(feeModule));
        
        console.log("");
        
        // ============ STEP 3: Deploy TokenFactory ============
        console.log("STEP 3: Deploying TokenFactory...");
        console.log("--------------------------------------------------");
        
        // Deploy with Tier 1 infrastructure addresses
        // Note: Using address(0) for optional infrastructure components
        TokenFactory factory = new TokenFactory(
            address(0),  // policyEngine - set to address(0) to disable
            address(0),  // policyRegistry - set to address(0) to disable
            address(0),  // tokenRegistry - set to address(0) to disable
            address(0),  // upgradeGovernor - set to address(0) to disable
            address(0)   // l2GasOptimizer - set to address(0) to disable
        );
        
        console.log("  TokenFactory deployed at:", address(factory));
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("==================================================");
        console.log("Deployment Complete!");
        console.log("==================================================");
        console.log("");
        console.log("Summary:");
        console.log("--------------------------------------------------");
        console.log("TokenFactory:", address(factory));
        console.log("");
        console.log("Master Contracts:");
        console.log("  ERC20Master:", address(erc20Master));
        console.log("  ERC721Master:", address(erc721Master));
        console.log("  ERC1155Master:", address(erc1155Master));
        console.log("  ERC3525Master:", address(erc3525Master));
        console.log("  ERC4626Master:", address(erc4626Master));
        console.log("  ERC1400Master:", address(erc1400Master));
        console.log("");
        console.log("Extension Modules:");
        console.log("  ComplianceModule:", address(complianceModule));
        console.log("  VestingModule:", address(vestingModule));
        console.log("  RoyaltyModule:", address(royaltyModule));
        console.log("  FeeModule:", address(feeModule));
        console.log("");
        
        // Save deployment info to JSON
        string memory json = "deployment";
        vm.serializeAddress(json, "tokenFactory", address(factory));
        vm.serializeAddress(json, "erc20Master", address(erc20Master));
        vm.serializeAddress(json, "erc721Master", address(erc721Master));
        vm.serializeAddress(json, "erc1155Master", address(erc1155Master));
        vm.serializeAddress(json, "erc3525Master", address(erc3525Master));
        vm.serializeAddress(json, "erc4626Master", address(erc4626Master));
        vm.serializeAddress(json, "erc1400Master", address(erc1400Master));
        vm.serializeAddress(json, "complianceModule", address(complianceModule));
        vm.serializeAddress(json, "vestingModule", address(vestingModule));
        vm.serializeAddress(json, "royaltyModule", address(royaltyModule));
        vm.serializeAddress(json, "feeModule", address(feeModule));
        vm.serializeUint(json, "chainId", block.chainid);
        vm.serializeAddress(json, "deployer", deployer);
        string memory finalJson = vm.serializeUint(json, "timestamp", block.timestamp);
        
        // Auto-detect network based on chain ID and save to appropriate file
        string memory filename;
        if (block.chainid == 11155111) {
            filename = "./deployments/sepolia-live.json";
        } else if (block.chainid == 17000) {
            filename = "./deployments/holesky-live.json";
        } else if (block.chainid == 1) {
            filename = "./deployments/mainnet-live.json";
        } else {
            // Default for unknown networks
            filename = string(abi.encodePacked("./deployments/chain-", vm.toString(block.chainid), "-live.json"));
        }
        
        vm.writeJson(finalJson, filename);
        console.log("Deployment info saved to:", filename);
        console.log("==================================================");
    }
}
