// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "./NetworkConfig.sol";
import "../../src/trade-finance/tokens/CommodityReceiptToken.sol";
import "../../src/trade-finance/tokens/CommodityDebtToken.sol";
import "../../src/trade-finance/interfaces/ICommodityLendingPool.sol";

/**
 * @title DeployTradeFinanceTokens
 * @notice Deploy Trade Finance tokens (cTokens and dTokens)
 * @dev Step 2 of Trade Finance deployment
 * 
 * Usage:
 *   forge script script/trade-finance/DeployTradeFinanceTokens.s.sol:DeployTradeFinanceTokens \
 *     --rpc-url $RPC_URL \
 *     --broadcast \
 *     --verify
 */
contract DeployTradeFinanceTokens is Script, NetworkConfig {
    
    struct TokenDeployment {
        // Gold tokens
        address cGold;
        address dGold;
        
        // Silver tokens
        address cSilver;
        address dSilver;
        
        // Oil tokens
        address cOil;
        address dOil;
        
        // Agricultural tokens (example: soybeans)
        address cSoybeans;
        address dSoybeans;
    }
    
    TokenDeployment public deployment;
    address public poolAddress;
    
    function run() external {
        // Load pool address from core deployment
        _loadCoreDeployment();
        
        NetworkConfiguration memory config = getConfig();
        
        console.log("\n====================================");
        console.log("Trade Finance Tokens Deployment");
        console.log("====================================\n");
        
        vm.startBroadcast(config.deployer);
        
        // Deploy commodity receipt tokens (cTokens) and debt tokens (dTokens)
        _deployGoldTokens();
        _deploySilverTokens();
        _deployOilTokens();
        _deploySoybeansTokens();
        
        vm.stopBroadcast();
        
        // Save deployment
        _saveDeployment();
        
        console.log("\n====================================");
        console.log("Tokens Deployment Complete!");
        console.log("====================================\n");
        _logDeployment();
    }
    
    function _loadCoreDeployment() internal {
        string memory filename = string.concat(
            "./deployments/trade-finance-core-",
            vm.toString(block.chainid),
            ".json"
        );
        
        string memory json = vm.readFile(filename);
        poolAddress = vm.parseJsonAddress(json, ".commodityLendingPool");
        
        require(poolAddress != address(0), "Core deployment not found");
        console.log("Loaded pool address:", poolAddress);
    }
    
    function _deployGoldTokens() internal {
        console.log("\n[1/4] Deploying Gold Tokens...");
        
        deployment.cGold = address(new CommodityReceiptToken(
            poolAddress,
            address(0), // Underlying commodity (set later)
            "Chain Capital Gold",
            "cGOLD"
        ));
        console.log("  cGOLD:", deployment.cGold);
        
        deployment.dGold = address(new CommodityDebtToken(
            ICommodityLendingPool(poolAddress),
            "Chain Capital Gold Debt",
            "dGOLD",
            18
        ));
        console.log("  dGOLD:", deployment.dGold);
    }
    
    function _deploySilverTokens() internal {
        console.log("\n[2/4] Deploying Silver Tokens...");
        
        deployment.cSilver = address(new CommodityReceiptToken(
            poolAddress,
            address(0),
            "Chain Capital Silver",
            "cSILVER"
        ));
        console.log("  cSILVER:", deployment.cSilver);
        
        deployment.dSilver = address(new CommodityDebtToken(
            ICommodityLendingPool(poolAddress),
            "Chain Capital Silver Debt",
            "dSILVER",
            18
        ));
        console.log("  dSILVER:", deployment.dSilver);
    }
    
    function _deployOilTokens() internal {
        console.log("\n[3/4] Deploying Oil Tokens...");
        
        deployment.cOil = address(new CommodityReceiptToken(
            poolAddress,
            address(0),
            "Chain Capital Oil",
            "cOIL"
        ));
        console.log("  cOIL:", deployment.cOil);
        
        deployment.dOil = address(new CommodityDebtToken(
            ICommodityLendingPool(poolAddress),
            "Chain Capital Oil Debt",
            "dOIL",
            18
        ));
        console.log("  dOIL:", deployment.dOil);
    }
    
    function _deploySoybeansTokens() internal {
        console.log("\n[4/4] Deploying Soybeans Tokens...");
        
        deployment.cSoybeans = address(new CommodityReceiptToken(
            poolAddress,
            address(0),
            "Chain Capital Soybeans",
            "cSOY"
        ));
        console.log("  cSOY:", deployment.cSoybeans);
        
        deployment.dSoybeans = address(new CommodityDebtToken(
            ICommodityLendingPool(poolAddress),
            "Chain Capital Soybeans Debt",
            "dSOY",
            18
        ));
        console.log("  dSOY:", deployment.dSoybeans);
    }
    
    function _saveDeployment() internal {
        string memory json = string.concat(
            '{\n',
            '  "network": "', getConfig().name, '",\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "timestamp": ', vm.toString(block.timestamp), ',\n',
            '  "poolAddress": "', vm.toString(poolAddress), '",\n',
            '  "cGold": "', vm.toString(deployment.cGold), '",\n',
            '  "dGold": "', vm.toString(deployment.dGold), '",\n',
            '  "cSilver": "', vm.toString(deployment.cSilver), '",\n',
            '  "dSilver": "', vm.toString(deployment.dSilver), '",\n',
            '  "cOil": "', vm.toString(deployment.cOil), '",\n',
            '  "dOil": "', vm.toString(deployment.dOil), '",\n',
            '  "cSoybeans": "', vm.toString(deployment.cSoybeans), '",\n',
            '  "dSoybeans": "', vm.toString(deployment.dSoybeans), '"\n',
            '}'
        );
        
        string memory filename = string.concat(
            "./deployments/trade-finance-tokens-",
            vm.toString(block.chainid),
            ".json"
        );
        
        vm.writeFile(filename, json);
        console.log("\n  Deployment saved to:", filename);
    }
    
    function _logDeployment() internal view {
        console.log("\n=== Receipt Tokens (cTokens) ===");
        console.log("cGOLD:", deployment.cGold);
        console.log("cSILVER:", deployment.cSilver);
        console.log("cOIL:", deployment.cOil);
        console.log("cSOY:", deployment.cSoybeans);
        
        console.log("\n=== Debt Tokens (dTokens) ===");
        console.log("dGOLD:", deployment.dGold);
        console.log("dSILVER:", deployment.dSilver);
        console.log("dOIL:", deployment.dOil);
        console.log("dSOY:", deployment.dSoybeans);
    }
}
