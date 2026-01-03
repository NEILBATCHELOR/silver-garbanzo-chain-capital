// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../DeploymentBase.sol";
import "../../../src/trade-finance/liquidation/GracefulLiquidation.sol";

/**
 * @title Deploy_GracefulLiquidation
 * @notice Individual deployment script for GracefulLiquidation
 * @dev Deploys soft liquidation with grace periods
 * 
 * Features:
 * - Multi-tier health factor thresholds
 * - Configurable grace periods per commodity
 * - Margin call system
 * - Partial liquidation mechanism
 * - Insurance claim integration
 * - Warning system with cooldown
 * 
 * Dependencies Required:
 * - CommodityLendingPool (from Phase 2)
 * - ACLManager (from Phase 1)
 * 
 * Usage:
 * forge script script/trade-finance/liquidation/Deploy_GracefulLiquidation.s.sol \
 *     --rpc-url $RPC_URL \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 */
contract Deploy_GracefulLiquidation is DeploymentBase {
    
    // Deployed addresses
    address public proxy;
    address public implementation;
    
    // Dependencies
    address public commodityLendingPool;
    address public aclManager;
    
    function run() external returns (address proxyAddr, address implAddr) {
        // Get configuration
        address owner = getSuperAdmin();
        
        // Get dependencies from environment
        commodityLendingPool = vm.envAddress("COMMODITY_LENDING_POOL");
        aclManager = vm.envAddress("ACL_MANAGER");
        
        // Validate dependencies
        require(commodityLendingPool != address(0), "Invalid pool address");
        require(aclManager != address(0), "Invalid ACL manager");
        
        console.log("=============================================");
        console.log("GracefulLiquidation Deployment");
        console.log("=============================================");
        console.log("Network:", block.chainid);
        console.log("Owner:", owner);
        console.log("Pool:", commodityLendingPool);
        console.log("ACL Manager:", aclManager);
        console.log("=============================================");
        
        vm.startBroadcast();
        
        // 1. Deploy implementation
        GracefulLiquidation impl = new GracefulLiquidation();
        implementation = address(impl);
        
        console.log("");
        console.log("Step 1: Implementation Deployed");
        console.log("  Address:", implementation);
        
        // 2. Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            GracefulLiquidation.initialize.selector,
            commodityLendingPool,  // pool
            aclManager,            // aclManager
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
        GracefulLiquidation liquidator = GracefulLiquidation(proxy);
        require(liquidator.getPool() == commodityLendingPool, "Pool not set");
        require(liquidator.getACLManager() == aclManager, "ACL not set");
        require(liquidator.owner() == owner, "Owner not set");
        
        console.log("");
        console.log("Step 4: Initialization Verified");
        console.log(unicode"  ✓ Pool configured");
        console.log(unicode"  ✓ ACL Manager configured");
        console.log(unicode"  ✓ Owner set");
        
        console.log("");
        console.log("=============================================");
        console.log(unicode"✅ GracefulLiquidation Deployed Successfully");
        console.log("=============================================");
        console.log("Proxy:", proxy);
        console.log("Implementation:", implementation);
        console.log("=============================================");
        
        return (proxy, implementation);
    }
}
