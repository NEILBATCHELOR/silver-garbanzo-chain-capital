// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./DeploymentBase.sol";
import "../../src/trade-finance/governance/PoolAddressesProvider.sol";
import "../../src/trade-finance/governance/ACLManager.sol";
import "../../src/trade-finance/governance/PoolConfigurator.sol";

/**
 * @title DeployPhase1Governance
 * @notice Deployment script for Phase 1: Critical Governance
 * @dev Deploys all governance layer contracts
 * 
 * Contracts Deployed (UUPS Upgradeable):
 * 1. PoolAddressesProvider - Central registry for protocol addresses
 * 2. ACLManager - Access control and permissions
 * 3. PoolConfigurator - Reserve configuration management
 * 
 * Timeline: Week 1
 * Priority: CRITICAL - Controls all protocol permissions
 */
contract DeployPhase1Governance is DeploymentBase {
    
    // Proxy addresses
    address public poolAddressesProvider;
    address public aclManager;
    address public poolConfigurator;
    
    // Implementation addresses
    address public poolAddressesProviderImpl;
    address public aclManagerImpl;
    address public poolConfiguratorImpl;
    
    uint256 public txCount = 0;
    
    function run() external {
        address owner = getSuperAdmin();
        string memory marketId = getMarketId();
        
        logPhaseStart(
            "PHASE 1: CRITICAL GOVERNANCE (UUPS)",
            "Week 1 - Controls all protocol permissions"
        );
        
        vm.startBroadcast();
        
        // 1. PoolAddressesProvider
        deployPoolAddressesProvider(marketId, owner);
        
        // 2. ACLManager
        deployACLManager(owner);
        
        // 3. PoolConfigurator
        deployPoolConfigurator();
        
        vm.stopBroadcast();
        
        logPhaseComplete("Phase 1 - Governance Layer");
        
        // Summary
        console.log("");
        console.log("Transaction Count:", txCount);
        console.log("");
        console.log("Deployed Contracts:");
        console.log("  PoolAddressesProvider:", poolAddressesProvider);
        console.log("  ACLManager:", aclManager);
        console.log("  PoolConfigurator:", poolConfigurator);
    }
    
    function deployPoolAddressesProvider(
        string memory marketId,
        address owner
    ) internal {
        console.log("[1/3] Deploying PoolAddressesProvider (UUPS)...");
        
        // Deploy implementation
        PoolAddressesProvider impl = new PoolAddressesProvider();
        poolAddressesProviderImpl = address(impl);
        txCount++;
        
        // Prepare initialization
        bytes memory initData = abi.encodeWithSelector(
            PoolAddressesProvider.initialize.selector,
            marketId,
            owner
        );
        
        // Deploy proxy
        poolAddressesProvider = deployUUPSProxy(
            poolAddressesProviderImpl,
            initData
        );
        txCount++;
        
        logDeployment(
            "PoolAddressesProvider",
            poolAddressesProviderImpl,
            poolAddressesProvider
        );
        
        // Verify
        PoolAddressesProvider provider = PoolAddressesProvider(poolAddressesProvider);
        require(
            keccak256(bytes(provider.getMarketId())) == keccak256(bytes(marketId)),
            "Market ID mismatch"
        );
        require(provider.owner() == owner, "Owner mismatch");
        
        console.log(unicode"  ✓ PoolAddressesProvider deployed");
    }
    
    function deployACLManager(address owner) internal {
        console.log("[2/3] Deploying ACLManager (UUPS)...");
        
        // Deploy implementation
        ACLManager impl = new ACLManager();
        aclManagerImpl = address(impl);
        txCount++;
        
        // Prepare initialization
        bytes memory initData = abi.encodeWithSelector(
            ACLManager.initialize.selector,
            IPoolAddressesProvider(poolAddressesProvider),
            owner
        );
        
        // Deploy proxy
        aclManager = deployUUPSProxy(aclManagerImpl, initData);
        txCount++;
        
        logDeployment("ACLManager", aclManagerImpl, aclManager);
        
        // Verify
        ACLManager acl = ACLManager(aclManager);
        bytes32 defaultAdminRole = acl.DEFAULT_ADMIN_ROLE();
        require(acl.hasRole(defaultAdminRole, owner), "Admin role not granted");
        
        console.log(unicode"  ✓ ACLManager deployed");
    }
    
    function deployPoolConfigurator() internal {
        console.log("[3/3] Deploying PoolConfigurator (UUPS)...");
        
        // Deploy implementation
        PoolConfigurator impl = new PoolConfigurator();
        poolConfiguratorImpl = address(impl);
        txCount++;
        
        // Prepare initialization
        bytes memory initData = abi.encodeWithSelector(
            PoolConfigurator.initialize.selector,
            IPoolAddressesProvider(poolAddressesProvider)
        );
        
        // Deploy proxy
        poolConfigurator = deployUUPSProxy(poolConfiguratorImpl, initData);
        txCount++;
        
        logDeployment("PoolConfigurator", poolConfiguratorImpl, poolConfigurator);
        
        console.log(unicode"  ✓ PoolConfigurator deployed");
    }
}
