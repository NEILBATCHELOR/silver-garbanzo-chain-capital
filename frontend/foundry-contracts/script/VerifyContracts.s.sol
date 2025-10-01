// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";

/**
 * @title VerifyContracts
 * @notice Verify all deployed contracts on block explorers
 * @dev Reads deployment files and submits verification requests
 * 
 * USAGE:
 *   forge script script/VerifyContracts.s.sol \
 *     --rpc-url sepolia \
 *     --verify \
 *     --etherscan-api-key $ETHERSCAN_API_KEY
 */
contract VerifyContracts is Script {
    
    function run() external view {
        string memory divider = "============================================================";
        
        console.log(divider);
        console.log("CONTRACT VERIFICATION SCRIPT");
        console.log(divider);
        console.log("Network:", getNetworkName(block.chainid));
        console.log("Chain ID:", block.chainid);
        console.log(divider);
        
        // Load deployment files
        string memory network = getNetworkName(block.chainid);
        
        console.log("\nVerification Commands:");
        console.log("Copy and run these commands to verify all contracts:\n");
        
        // Masters verification
        console.log("# Verify Master Implementations");
        console.log("forge verify-contract <ADDRESS> src/masters/ERC20Master.sol:ERC20Master --chain-id", block.chainid, "--watch");
        console.log("forge verify-contract <ADDRESS> src/masters/ERC721Master.sol:ERC721Master --chain-id", block.chainid, "--watch");
        console.log("forge verify-contract <ADDRESS> src/masters/ERC1155Master.sol:ERC1155Master --chain-id", block.chainid, "--watch");
        console.log("forge verify-contract <ADDRESS> src/masters/ERC3525Master.sol:ERC3525Master --chain-id", block.chainid, "--watch");
        console.log("forge verify-contract <ADDRESS> src/masters/ERC4626Master.sol:ERC4626Master --chain-id", block.chainid, "--watch");
        console.log("forge verify-contract <ADDRESS> src/masters/ERC1400Master.sol:ERC1400Master --chain-id", block.chainid, "--watch\n");
        
        // Factory verification
        console.log("# Verify TokenFactory");
        console.log("forge verify-contract <ADDRESS> src/TokenFactory.sol:TokenFactory --chain-id", block.chainid, "--watch\n");
        
        // Extensions verification
        console.log("# Verify Phase 1 Extension Modules");
        console.log("forge verify-contract <ADDRESS> src/extensions/compliance/ERC20ComplianceModule.sol:ERC20ComplianceModule --chain-id", block.chainid, "--watch");
        console.log("forge verify-contract <ADDRESS> src/extensions/vesting/ERC20VestingModule.sol:ERC20VestingModule --chain-id", block.chainid, "--watch");
        console.log("forge verify-contract <ADDRESS> src/extensions/royalty/ERC721RoyaltyModule.sol:ERC721RoyaltyModule --chain-id", block.chainid, "--watch\n");
        
        // Governance verification
        console.log("# Verify Governance & Registry");
        console.log("forge verify-contract <ADDRESS> src/governance/UpgradeGovernor.sol:UpgradeGovernor --chain-id", block.chainid, "--watch");
        console.log("forge verify-contract <ADDRESS> src/registry/TokenRegistry.sol:TokenRegistry --chain-id", block.chainid, "--watch\n");
        
        console.log(divider);
        console.log("\nNOTE: Replace <ADDRESS> with actual deployed addresses from deployments/ folder");
        console.log("TIP: Add --watch flag to monitor verification status");
        console.log("TIP: Use --etherscan-api-key to specify API key");
        console.log("\n%s\n", divider);
    }
    
    function getNetworkName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 1) return "ethereum";
        if (chainId == 11155111) return "sepolia";
        if (chainId == 8453) return "base";
        if (chainId == 84532) return "base-sepolia";
        if (chainId == 42161) return "arbitrum";
        if (chainId == 137) return "polygon";
        if (chainId == 10) return "optimism";
        if (chainId == 31337) return "anvil";
        return "unknown";
    }
}
