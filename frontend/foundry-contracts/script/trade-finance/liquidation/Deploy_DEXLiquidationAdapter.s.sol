// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../DeploymentBase.sol";
import "../../../src/trade-finance/liquidation/DEXLiquidationAdapter.sol";

/**
 * @title Deploy_DEXLiquidationAdapter
 * @notice Individual deployment script for DEXLiquidationAdapter
 * @dev Deploys DEX integration for liquidation swaps
 * 
 * Features:
 * - Multi-DEX routing support
 * - Optimal swap path calculation
 * - Slippage protection
 * - Gas optimization
 * - Router approval management
 * 
 * Dependencies Required:
 * - CommodityLendingPool (from Phase 2)
 * - ACLManager (from Phase 1)
 * 
 * Usage:
 * forge script script/trade-finance/liquidation/Deploy_DEXLiquidationAdapter.s.sol \
 *     --rpc-url $RPC_URL \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 */
contract Deploy_DEXLiquidationAdapter is DeploymentBase {
    
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
        console.log("DEXLiquidationAdapter Deployment");
        console.log("=============================================");
        console.log("Network:", block.chainid);
        console.log("Owner:", owner);
        console.log("Pool:", commodityLendingPool);
        console.log("ACL Manager:", aclManager);
        console.log("=============================================");
        
        vm.startBroadcast();
        
        // 1. Deploy implementation
        DEXLiquidationAdapter impl = new DEXLiquidationAdapter();
        implementation = address(impl);
        
        console.log("");
        console.log("Step 1: Implementation Deployed");
        console.log("  Address:", implementation);
        
        // 2. Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            DEXLiquidationAdapter.initialize.selector,
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
        DEXLiquidationAdapter adapter = DEXLiquidationAdapter(proxy);
        require(adapter.getPool() == commodityLendingPool, "Pool not set");
        require(adapter.getACLManager() == aclManager, "ACL not set");
        require(adapter.owner() == owner, "Owner not set");
        
        console.log("");
        console.log("Step 4: Initialization Verified");
        console.log(unicode"  ✓ Pool configured");
        console.log(unicode"  ✓ ACL Manager configured");
        console.log(unicode"  ✓ Owner set");
        
        console.log("");
        console.log("=============================================");
        console.log(unicode"✅ DEXLiquidationAdapter Deployed Successfully");
        console.log("=============================================");
        console.log("Proxy:", proxy);
        console.log("Implementation:", implementation);
        console.log("=============================================");
        
        return (proxy, implementation);
    }
}
