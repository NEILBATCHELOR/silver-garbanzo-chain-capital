// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../DeploymentBase.sol";
import "../../../src/trade-finance/liquidation/LiquidationDataProvider.sol";

/**
 * @title Deploy_LiquidationDataProvider
 * @notice Individual deployment script for LiquidationDataProvider
 * @dev Deploys liquidation data and analytics provider
 * 
 * Features:
 * - Real-time liquidation eligibility checks
 * - Health factor calculations
 * - Collateral value assessments
 * - Liquidation profit estimates
 * - Historical liquidation data
 * - Risk metrics aggregation
 * 
 * Dependencies Required:
 * - CommodityLendingPool (from Phase 2)
 * - CommodityOracle (from Phase 2)
 * 
 * Usage:
 * forge script script/trade-finance/liquidation/Deploy_LiquidationDataProvider.s.sol \
 *     --rpc-url $RPC_URL \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 */
contract Deploy_LiquidationDataProvider is DeploymentBase {
    
    // Deployed addresses
    address public proxy;
    address public implementation;
    
    // Dependencies
    address public commodityLendingPool;
    address public commodityOracle;
    
    function run() external returns (address proxyAddr, address implAddr) {
        // Get configuration
        address owner = getSuperAdmin();
        
        // Get dependencies from environment
        commodityLendingPool = vm.envAddress("COMMODITY_LENDING_POOL");
        commodityOracle = vm.envAddress("COMMODITY_ORACLE");
        
        // Validate dependencies
        require(commodityLendingPool != address(0), "Invalid pool address");
        require(commodityOracle != address(0), "Invalid oracle address");
        
        console.log("=============================================");
        console.log("LiquidationDataProvider Deployment");
        console.log("=============================================");
        console.log("Network:", block.chainid);
        console.log("Owner:", owner);
        console.log("Pool:", commodityLendingPool);
        console.log("Oracle:", commodityOracle);
        console.log("=============================================");
        
        vm.startBroadcast();
        
        // 1. Deploy implementation
        LiquidationDataProvider impl = new LiquidationDataProvider();
        implementation = address(impl);
        
        console.log("");
        console.log("Step 1: Implementation Deployed");
        console.log("  Address:", implementation);
        
        // 2. Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            LiquidationDataProvider.initialize.selector,
            commodityLendingPool,  // pool
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
        LiquidationDataProvider provider = LiquidationDataProvider(proxy);
        require(provider.getPool() == commodityLendingPool, "Pool not set");
        require(provider.getPriceOracle() == commodityOracle, "Oracle not set");
        require(provider.owner() == owner, "Owner not set");
        
        console.log("");
        console.log("Step 4: Initialization Verified");
        console.log(unicode"  ✓ Pool configured");
        console.log(unicode"  ✓ Oracle configured");
        console.log(unicode"  ✓ Owner set");
        
        console.log("");
        console.log("=============================================");
        console.log(unicode"✅ LiquidationDataProvider Deployed Successfully");
        console.log("=============================================");
        console.log("Proxy:", proxy);
        console.log("Implementation:", implementation);
        console.log("=============================================");
        
        return (proxy, implementation);
    }
}
