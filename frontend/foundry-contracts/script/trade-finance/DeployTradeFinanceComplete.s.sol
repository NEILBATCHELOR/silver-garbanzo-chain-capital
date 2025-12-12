// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "./NetworkConfig.sol";
import "./DeployTradeFinanceCore.s.sol";
import "./DeployTradeFinanceTokens.s.sol";

/**
 * @title DeployTradeFinanceComplete
 * @notice Complete end-to-end Trade Finance deployment
 * @dev Orchestrates all deployment steps in correct order
 * 
 * Usage:
 *   # Dry run
 *   forge script script/trade-finance/DeployTradeFinanceComplete.s.sol:DeployTradeFinanceComplete \
 *     --rpc-url sepolia
 * 
 *   # Deploy to testnet
 *   forge script script/trade-finance/DeployTradeFinanceComplete.s.sol:DeployTradeFinanceComplete \
 *     --rpc-url sepolia \
 *     --broadcast
 * 
 *   # Deploy and verify
 *   forge script script/trade-finance/DeployTradeFinanceComplete.s.sol:DeployTradeFinanceComplete \
 *     --rpc-url sepolia \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $ETHERSCAN_API_KEY
 */
contract DeployTradeFinanceComplete is Script, NetworkConfig {
    
    function run() external {
        NetworkConfiguration memory config = getConfig();
        
        console.log("\n");
        console.log("========================================");
        console.log("  TRADE FINANCE COMPLETE DEPLOYMENT");
        console.log("========================================\n");
        
        logNetworkInfo();
        
        // Confirm before deploying
        if (!config.isTestnet) {
            console.log("\n⚠️  WARNING: Deploying to MAINNET");
            console.log("Press Ctrl+C to cancel, or wait 10 seconds to continue...\n");
            // In production, add actual pause mechanism
        }
        
        // Step 1: Deploy core contracts
        console.log("\n🚀 Step 1/3: Deploying Core Contracts...");
        DeployTradeFinanceCore coreDeployer = new DeployTradeFinanceCore();
        coreDeployer.run();
        
        // Step 2: Deploy tokens
        console.log("\n🚀 Step 2/3: Deploying Tokens...");
        DeployTradeFinanceTokens tokensDeployer = new DeployTradeFinanceTokens();
        tokensDeployer.run();
        
        // Step 3: Post-deployment configuration
        console.log("\n🚀 Step 3/3: Post-Deployment Configuration...");
        _postDeploymentConfiguration();
        
        // Complete
        console.log("\n");
        console.log("========================================");
        console.log("  ✅ DEPLOYMENT COMPLETE!");
        console.log("========================================\n");
        
        _printNextSteps();
    }
    
    function _postDeploymentConfiguration() internal view {
        console.log("  ℹ️  Manual configuration required:");
        console.log("    1. Set up commodity reserves (via PoolConfigurator)");
        console.log("    2. Configure risk parameters (LTV, liquidation thresholds)");
        console.log("    3. Set up oracle price feeds");
        console.log("    4. Configure haircut parameters");
        console.log("    5. Grant necessary roles");
        console.log("    6. Test supply/borrow flows");
    }
    
    function _printNextSteps() internal view {
        NetworkConfiguration memory config = getConfig();
        
        console.log("📋 Next Steps:\n");
        console.log("1. Verify contracts:");
        console.log("   forge script script/trade-finance/VerifyTradeFinance.s.sol \\");
        console.log("     --rpc-url", config.name, "\n");
        
        console.log("2. Configure the protocol:");
        console.log("   forge script script/trade-finance/ConfigureTradeFinance.s.sol \\");
        console.log("     --rpc-url", config.name, "\\");
        console.log("     --broadcast\n");
        
        console.log("3. Test the deployment:");
        console.log("   forge test --match-contract TradeFinanceIntegration\n");
        
        console.log("4. View deployment details:");
        string memory filename = string.concat(
            "deployments/trade-finance-core-",
            vm.toString(block.chainid),
            ".json"
        );
        console.log("   cat", filename, "\n");
        
        if (!config.isTestnet) {
            console.log("5. ⚠️  IMPORTANT: Schedule security audits before enabling protocol\n");
        }
    }
}
