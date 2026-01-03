// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./DeploymentBase.sol";
import "../../src/trade-finance/governance/PoolAddressesProvider.sol";
import "../../src/trade-finance/rewards/EmissionManager.sol";
import "../../src/trade-finance/rewards/RewardsController.sol";
import "../../src/trade-finance/rewards/RewardsDistributor.sol";
import "../../src/trade-finance/treasury/Collector.sol";
import "../../src/trade-finance/treasury/ProtocolReserve.sol";
import "../../src/trade-finance/treasury/RevenueSplitter.sol";

/**
 * @title DeployPhase4RewardsTreasury
 * @notice Deployment script for Phase 4: Rewards & Treasury
 * @dev Deploys all rewards and treasury management contracts
 * 
 * Contracts Deployed:
 * UUPS Upgradeable (5):
 * 1. EmissionManager - Emission schedule management
 * 2. RewardsController - Reward distribution controller
 * 3. RewardsDistributor - Distributor implementation
 * 4. Collector - Fee collection
 * 5. ProtocolReserve - Reserve management
 * 
 * Non-Upgradeable (1):
 * 6. RevenueSplitter - Revenue distribution (70% collector, 30% reserve)
 * 
 * Timeline: Week 4
 * Priority: MEDIUM - Tokenomics and treasury
 * 
 * Dependencies Required:
 * - PoolAddressesProvider (from Phase 1)
 */
contract DeployPhase4RewardsTreasury is DeploymentBase {
    
    // Proxy addresses (UUPS)
    address public emissionManager;
    address public rewardsController;
    address public rewardsDistributor;
    address public collector;
    address public protocolReserve;
    
    // Implementation addresses (UUPS)
    address public emissionManagerImpl;
    address public rewardsControllerImpl;
    address public rewardsDistributorImpl;
    address public collectorImpl;
    address public protocolReserveImpl;
    
    // Non-upgradeable
    address public revenueSplitter;
    
    // Dependency
    address public poolAddressesProvider;
    
    uint256 public txCount = 0;
    
    constructor(address _poolAddressesProvider) {
        require(_poolAddressesProvider != address(0), "Invalid provider");
        poolAddressesProvider = _poolAddressesProvider;
    }
    
    function run() external {
        address owner = getSuperAdmin();
        
        logPhaseStart(
            "PHASE 4: REWARDS & TREASURY (UUPS)",
            "Week 4 - Tokenomics and treasury management"
        );
        
        vm.startBroadcast();
        
        // 1. EmissionManager
        deployEmissionManager(owner);
        
        // 2. RewardsController
        deployRewardsController();
        
        // 3. RewardsDistributor
        deployRewardsDistributor();
        
        // 4. Collector
        deployCollector(owner);
        
        // 5. ProtocolReserve
        deployProtocolReserve(owner);
        
        // 6. RevenueSplitter (non-upgradeable)
        deployRevenueSplitter();
        
        vm.stopBroadcast();
        
        logPhaseComplete("Phase 4 - Rewards & Treasury");
        
        // Summary
        console.log("");
        console.log("Transaction Count:", txCount);
        console.log("");
        console.log("Upgradeable Contracts:");
        console.log("  EmissionManager:", emissionManager);
        console.log("  RewardsController:", rewardsController);
        console.log("  RewardsDistributor:", rewardsDistributor);
        console.log("  Collector:", collector);
        console.log("  ProtocolReserve:", protocolReserve);
        console.log("");
        console.log("Non-Upgradeable Contracts:");
        console.log("  RevenueSplitter:", revenueSplitter);
    }
    
    function deployEmissionManager(address owner) internal {
        console.log("[1/6] Deploying EmissionManager (UUPS)...");
        
        EmissionManager impl = new EmissionManager();
        emissionManagerImpl = address(impl);
        txCount++;
        
        bytes memory initData = abi.encodeWithSelector(
            EmissionManager.initialize.selector,
            owner
        );
        
        emissionManager = deployUUPSProxy(emissionManagerImpl, initData);
        txCount++;
        
        logDeployment("EmissionManager", emissionManagerImpl, emissionManager);
        
        console.log(unicode"  ✓ EmissionManager deployed");
    }
    
    function deployRewardsController() internal {
        console.log("[2/6] Deploying RewardsController (UUPS)...");
        
        RewardsController impl = new RewardsController();
        rewardsControllerImpl = address(impl);
        txCount++;
        
        bytes memory initData = abi.encodeWithSelector(
            RewardsController.initialize.selector,
            emissionManager
        );
        
        rewardsController = deployUUPSProxy(rewardsControllerImpl, initData);
        txCount++;
        
        logDeployment("RewardsController", rewardsControllerImpl, rewardsController);
        
        console.log(unicode"  ✓ RewardsController deployed");
    }
    
    function deployRewardsDistributor() internal {
        console.log("[3/6] Deploying RewardsDistributor (UUPS)...");
        
        RewardsDistributor impl = new RewardsDistributor();
        rewardsDistributorImpl = address(impl);
        txCount++;
        
        bytes memory initData = abi.encodeWithSelector(
            RewardsDistributor.initialize.selector,
            emissionManager
        );
        
        rewardsDistributor = deployUUPSProxy(rewardsDistributorImpl, initData);
        txCount++;
        
        logDeployment(
            "RewardsDistributor",
            rewardsDistributorImpl,
            rewardsDistributor
        );
        
        console.log(unicode"  ✓ RewardsDistributor deployed");
    }
    
    function deployCollector(address owner) internal {
        console.log("[4/6] Deploying Collector (UUPS)...");
        
        Collector impl = new Collector();
        collectorImpl = address(impl);
        txCount++;
        
        bytes memory initData = abi.encodeWithSelector(
            Collector.initialize.selector,
            poolAddressesProvider,
            owner
        );
        
        collector = deployUUPSProxy(collectorImpl, initData);
        txCount++;
        
        logDeployment("Collector", collectorImpl, collector);
        
        console.log(unicode"  ✓ Collector deployed");
    }
    
    function deployProtocolReserve(address owner) internal {
        console.log("[5/6] Deploying ProtocolReserve (UUPS)...");
        
        ProtocolReserve impl = new ProtocolReserve();
        protocolReserveImpl = address(impl);
        txCount++;
        
        bytes memory initData = abi.encodeWithSelector(
            ProtocolReserve.initialize.selector,
            owner
        );
        
        protocolReserve = deployUUPSProxy(protocolReserveImpl, initData);
        txCount++;
        
        logDeployment("ProtocolReserve", protocolReserveImpl, protocolReserve);
        
        console.log(unicode"  ✓ ProtocolReserve deployed");
    }
    
    function deployRevenueSplitter() internal {
        console.log("[6/6] Deploying RevenueSplitter (UUPS)...");
        
        address[] memory payees = new address[](2);
        uint256[] memory shares = new uint256[](2);
        
        payees[0] = collector;
        payees[1] = protocolReserve;
        shares[0] = 70; // 70% to collector
        shares[1] = 30; // 30% to reserve
        
        // Get ACL Manager from PoolAddressesProvider
        PoolAddressesProvider provider = PoolAddressesProvider(poolAddressesProvider);
        address aclManager = provider.getACLManager();
        address owner = getSuperAdmin();
        
        // Deploy implementation
        RevenueSplitter revenueSplitterImpl = new RevenueSplitter();
        txCount++;
        
        // Deploy proxy
        bytes memory revenueSplitterInitData = abi.encodeWithSelector(
            RevenueSplitter.initialize.selector,
            aclManager,
            payees,
            shares,
            owner
        );
        
        ERC1967Proxy revenueSplitterProxy = new ERC1967Proxy(
            address(revenueSplitterImpl),
            revenueSplitterInitData
        );
        txCount++;
        
        revenueSplitter = address(revenueSplitterProxy);
        
        console.log("  Implementation:", address(revenueSplitterImpl));
        console.log("  Proxy:", revenueSplitter);
        console.log("  Collector (70%):", collector);
        console.log("  Reserve (30%):", protocolReserve);
    }
}
