// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../DeploymentBase.sol";
import "../../../src/trade-finance/liquidation/DutchAuctionLiquidator.sol";

/**
 * @title Deploy_DutchAuctionLiquidator
 * @notice Individual deployment script for DutchAuctionLiquidator
 * @dev Deploys MEV-resistant Dutch auction liquidation contract
 * 
 * Features:
 * - Time-based price decay (linear/exponential)
 * - MEV protection through gradual price discovery
 * - Commodity-specific auction parameters
 * - Physical delivery option
 * - Configurable auction duration (5m - 6h)
 * 
 * Dependencies Required:
 * - CommodityLendingPool (from Phase 2)
 * - ACLManager (from Phase 1)
 * - CommodityOracle (from Phase 2)
 * 
 * Usage:
 * forge script script/trade-finance/liquidation/Deploy_DutchAuctionLiquidator.s.sol \
 *     --rpc-url $RPC_URL \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 */
contract Deploy_DutchAuctionLiquidator is DeploymentBase {
    
    // Deployed addresses
    address public proxy;
    address public implementation;
    
    // Dependencies
    address public commodityLendingPool;
    address public aclManager;
    address public commodityOracle;
    
    function run() external returns (address proxyAddr, address implAddr) {
        // Get configuration
        address owner = getSuperAdmin();
        
        // Get dependencies from environment
        commodityLendingPool = vm.envAddress("COMMODITY_LENDING_POOL");
        aclManager = vm.envAddress("ACL_MANAGER");
        commodityOracle = vm.envAddress("COMMODITY_ORACLE");
        
        // Validate dependencies
        require(commodityLendingPool != address(0), "Invalid pool address");
        require(aclManager != address(0), "Invalid ACL manager");
        require(commodityOracle != address(0), "Invalid oracle address");
        
        console.log("=============================================");
        console.log("DutchAuctionLiquidator Deployment");
        console.log("=============================================");
        console.log("Network:", block.chainid);
        console.log("Owner:", owner);
        console.log("Pool:", commodityLendingPool);
        console.log("ACL Manager:", aclManager);
        console.log("Oracle:", commodityOracle);
        console.log("=============================================");
        
        vm.startBroadcast();
        
        // 1. Deploy implementation
        DutchAuctionLiquidator impl = new DutchAuctionLiquidator();
        implementation = address(impl);
        
        console.log("");
        console.log("Step 1: Implementation Deployed");
        console.log("  Address:", implementation);
        
        // 2. Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            DutchAuctionLiquidator.initialize.selector,
            commodityLendingPool,  // pool
            aclManager,            // aclManager
            commodityOracle,       // priceOracle
            owner                  // owner
        );
        
        // 3. Deploy proxy
        proxy = deployUUPSProxy(implementation, initData);
        
        console.log("");
        console.log("Step 2: Proxy Deployed");
        console.log("  Address:", proxy);
        
        // 4. Verify setup
        verifyProxySetup(proxy, implementation);
        
        console.log("");
        console.log("Step 3: Verification Complete");
        console.log(unicode"  ✓ Proxy points to implementation");
        console.log(unicode"  ✓ Addresses are distinct");
        
        vm.stopBroadcast();
        
        // 5. Verify initialization
        DutchAuctionLiquidator liquidator = DutchAuctionLiquidator(proxy);
        require(liquidator.getPool() == commodityLendingPool, "Pool not set");
        require(liquidator.getACLManager() == aclManager, "ACL not set");
        require(liquidator.getPriceOracle() == commodityOracle, "Oracle not set");
        require(liquidator.owner() == owner, "Owner not set");
        
        console.log("");
        console.log("Step 4: Initialization Verified");
        console.log(unicode"  ✓ Pool configured");
        console.log(unicode"  ✓ ACL Manager configured");
        console.log(unicode"  ✓ Oracle configured");
        console.log(unicode"  ✓ Owner set");
        
        console.log("");
        console.log("=============================================");
        console.log(unicode"✅ DutchAuctionLiquidator Deployed Successfully");
        console.log("=============================================");
        console.log("Proxy:", proxy);
        console.log("Implementation:", implementation);
        console.log("=============================================");
        
        return (proxy, implementation);
    }
}
