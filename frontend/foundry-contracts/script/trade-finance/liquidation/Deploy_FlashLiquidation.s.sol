// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../DeploymentBase.sol";
import "../../../src/trade-finance/liquidation/FlashLiquidation.sol";

/**
 * @title Deploy_FlashLiquidation
 * @notice Individual deployment script for FlashLiquidation
 * @dev Deploys zero-capital flash loan liquidation contract
 * 
 * Features:
 * - Flash loan-based liquidation
 * - DEX integration for collateral swaps
 * - Profit calculation and distribution
 * - Custom minimum profit thresholds
 * - Router approval system
 * - Liquidation history tracking
 * 
 * Dependencies Required:
 * - PoolAddressesProvider (from Phase 1)
 * - ACLManager (from Phase 1)
 * 
 * Usage:
 * forge script script/trade-finance/liquidation/Deploy_FlashLiquidation.s.sol \
 *     --rpc-url $RPC_URL \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 */
contract Deploy_FlashLiquidation is DeploymentBase {
    
    // Deployed addresses
    address public proxy;
    address public implementation;
    
    // Dependencies
    address public poolAddressesProvider;
    address public aclManager;
    
    function run() external returns (address proxyAddr, address implAddr) {
        // Get configuration
        address owner = getSuperAdmin();
        
        // Get dependencies from environment
        poolAddressesProvider = vm.envAddress("POOL_ADDRESSES_PROVIDER");
        aclManager = vm.envAddress("ACL_MANAGER");
        
        // Validate dependencies
        require(poolAddressesProvider != address(0), "Invalid provider");
        require(aclManager != address(0), "Invalid ACL manager");
        
        console.log("=============================================");
        console.log("FlashLiquidation Deployment");
        console.log("=============================================");
        console.log("Network:", block.chainid);
        console.log("Owner:", owner);
        console.log("Provider:", poolAddressesProvider);
        console.log("ACL Manager:", aclManager);
        console.log("=============================================");
        
        vm.startBroadcast();
        
        // 1. Deploy implementation
        FlashLiquidation impl = new FlashLiquidation();
        implementation = address(impl);
        
        console.log("");
        console.log("Step 1: Implementation Deployed");
        console.log("  Address:", implementation);
        
        // 2. Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            FlashLiquidation.initialize.selector,
            poolAddressesProvider,  // addressesProvider
            aclManager,             // aclManager
            owner                   // owner
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
        FlashLiquidation liquidator = FlashLiquidation(proxy);
        require(liquidator.getAddressesProvider() == poolAddressesProvider, "Provider not set");
        require(liquidator.getACLManager() == aclManager, "ACL not set");
        require(liquidator.owner() == owner, "Owner not set");
        
        console.log("");
        console.log("Step 4: Initialization Verified");
        console.log(unicode"  ✓ Addresses Provider configured");
        console.log(unicode"  ✓ ACL Manager configured");
        console.log(unicode"  ✓ Owner set");
        
        console.log("");
        console.log("=============================================");
        console.log(unicode"✅ FlashLiquidation Deployed Successfully");
        console.log("=============================================");
        console.log("Proxy:", proxy);
        console.log("Implementation:", implementation);
        console.log("=============================================");
        
        return (proxy, implementation);
    }
}
