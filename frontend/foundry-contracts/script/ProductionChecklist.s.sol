// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/TokenFactory.sol";
import "../src/masters/ERC20Master.sol";
import "../src/governance/UpgradeGovernor.sol";
import "../src/registry/TokenRegistry.sol";

/**
 * @title ProductionChecklist
 * @notice Pre-deployment validation and testing script
 * @dev Run this before any mainnet deployment to verify system integrity
 * 
 * USAGE:
 *   forge script script/ProductionChecklist.s.sol --rpc-url sepolia
 */
contract ProductionChecklist is Script {
    
    // Checklist items
    struct CheckResult {
        string name;
        bool passed;
        string message;
    }
    
    CheckResult[] public results;
    uint256 public passedChecks;
    uint256 public totalChecks;
    
    function run() external {
        string memory divider = "============================================================";
        
        console.log(divider);
        console.log("PRODUCTION DEPLOYMENT CHECKLIST");
        console.log(divider);
        console.log("Network:", getNetworkName(block.chainid));
        console.log("Chain ID:", block.chainid);
        console.log("Timestamp:", block.timestamp);
        console.log(divider);
        
        console.log("\nRunning pre-deployment checks...\n");
        
        // Load deployment addresses
        address factoryAddress = vm.envOr("TOKEN_FACTORY", address(0));
        address governorAddress = vm.envOr("UPGRADE_GOVERNOR", address(0));
        address registryAddress = vm.envOr("TOKEN_REGISTRY", address(0));
        
        // ============ Check 1: Environment Variables ============
        check(
            "Environment Variables",
            vm.envOr("PRIVATE_KEY", uint256(0)) != 0,
            "PRIVATE_KEY is set"
        );
        
        // ============ Check 2: Factory Deployment ============
        check(
            "TokenFactory Deployed",
            factoryAddress != address(0) && factoryAddress.code.length > 0,
            string(abi.encodePacked("Factory at: ", vm.toString(factoryAddress)))
        );
        
        if (factoryAddress != address(0)) {
            TokenFactory factory = TokenFactory(factoryAddress);
            
            check(
                "ERC20 Master",
                factory.erc20Master().code.length > 0,
                string(abi.encodePacked("Master at: ", vm.toString(factory.erc20Master())))
            );
            
            check(
                "ERC721 Master",
                factory.erc721Master().code.length > 0,
                string(abi.encodePacked("Master at: ", vm.toString(factory.erc721Master())))
            );
            
            check(
                "ERC1155 Master",
                factory.erc1155Master().code.length > 0,
                string(abi.encodePacked("Master at: ", vm.toString(factory.erc1155Master())))
            );
        }
        
        // ============ Check 3: Governance ============
        check(
            "UpgradeGovernor Deployed",
            governorAddress != address(0) && governorAddress.code.length > 0,
            governorAddress != address(0) ? "Deployed" : "NOT DEPLOYED"
        );
        
        // ============ Check 4: Registry ============
        check(
            "TokenRegistry Deployed",
            registryAddress != address(0) && registryAddress.code.length > 0,
            registryAddress != address(0) ? "Deployed" : "NOT DEPLOYED"
        );
        
        // ============ Check 5: Test Token Deployment ============
        if (factoryAddress != address(0) && TokenFactory(factoryAddress).erc20Master().code.length > 0) {
            uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
            vm.startBroadcast(deployerPrivateKey);
            
            try TokenFactory(factoryAddress).deployERC20(
                "Test Token",
                "TEST",
                1000000 * 10**18,
                100000 * 10**18,
                vm.addr(deployerPrivateKey)
            ) returns (address testToken) {
                check(
                    "Test Token Deployment",
                    testToken.code.length > 0,
                    string(abi.encodePacked("Deployed at: ", vm.toString(testToken)))
                );
                
                // Test token operations
                ERC20Master token = ERC20Master(testToken);
                
                check(
                    "Token Name",
                    keccak256(bytes(token.name())) == keccak256(bytes("Test Token")),
                    token.name()
                );
                
                check(
                    "Token Supply",
                    token.totalSupply() == 100000 * 10**18,
                    string(abi.encodePacked(vm.toString(token.totalSupply() / 10**18), " TEST"))
                );
                
            } catch {
                check("Test Token Deployment", false, "DEPLOYMENT FAILED");
            }
            
            vm.stopBroadcast();
        }
        
        // ============ Final Summary ============
        displayResults();
    }
    
    function check(string memory name, bool passed, string memory message) internal {
        results.push(CheckResult({
            name: name,
            passed: passed,
            message: message
        }));
        
        totalChecks++;
        if (passed) passedChecks++;
        
        string memory status = passed ? unicode"✅ PASS" : unicode"❌ FAIL";
        console.log("[%s] %s: %s", status, name, message);
    }
    
    function displayResults() internal view {
        string memory divider = "============================================================";
        
        console.log("\n%s", divider);
        console.log("CHECKLIST RESULTS");
        console.log(divider);
        console.log("Passed:", passedChecks);
        console.log("Failed:", totalChecks - passedChecks);
        console.log("Total:", totalChecks);
        console.log("Success Rate:", (passedChecks * 100) / totalChecks, "%");
        console.log(divider);
        
        if (passedChecks == totalChecks) {
            console.log(unicode"\n✅ ALL CHECKS PASSED - READY FOR PRODUCTION");
        } else {
            console.log(unicode"\n❌ SOME CHECKS FAILED - FIX ISSUES BEFORE DEPLOYMENT");
            console.log("\nFailed Checks:");
            for (uint i = 0; i < results.length; i++) {
                if (!results[i].passed) {
                    console.log("  -", results[i].name);
                }
            }
        }
        
        console.log("\n%s\n", divider);
    }
    
    function getNetworkName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 1) return "ethereum";
        if (chainId == 11155111) return "sepolia";
        if (chainId == 8453) return "base";
        if (chainId == 42161) return "arbitrum";
        if (chainId == 137) return "polygon";
        if (chainId == 10) return "optimism";
        if (chainId == 31337) return "anvil";
        return "unknown";
    }
}
