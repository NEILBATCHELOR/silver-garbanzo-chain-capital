// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./DeploymentBase.sol";
import "./NetworkConfig.sol";
import "../../src/trade-finance/core/CommodityLendingPool.sol";
import "../../src/trade-finance/core/CommodityInterestRateStrategyV2.sol";
import "../../src/trade-finance/core/CommodityInterestRateStrategyV3.sol";
import "../../src/trade-finance/oracles/CommodityOracle.sol";
import "../../src/trade-finance/oracles/FuturesCurveOracle.sol";
import "../../src/trade-finance/oracles/PriceOracleSentinel.sol";
import "../../src/trade-finance/config/CommodityOracleConfigurator.sol";

/**
 * @title DeployPhase2CoreProtocol
 * @notice Deployment script for Phase 2: Core Protocol
 * @dev Deploys all core lending and oracle contracts
 * 
 * Contracts Deployed:
 * UUPS Upgradeable (4):
 * 1. CommodityLendingPool - Core lending protocol
 * 2. CommodityOracle - Commodity price oracle
 * 3. FuturesCurveOracle - Futures curve pricing
 * 4. PriceOracleSentinel - Emergency sequencer monitoring
 * 
 * Non-Upgradeable (3):
 * 5. CommodityInterestRateStrategyV2 - Standard interest calculation
 * 6. CommodityInterestRateStrategyV3 - Advanced interest calculation
 * 7. CommodityOracleConfigurator - Oracle configuration helper
 * 
 * Timeline: Week 2
 * Priority: HIGH - Core protocol functionality
 * 
 * Dependencies Required:
 * - PoolAddressesProvider (from Phase 1)
 */
contract DeployPhase2CoreProtocol is DeploymentBase, NetworkConfig {
    
    // Proxy addresses (UUPS)
    address public commodityLendingPool;
    address public commodityOracle;
    address public futuresCurveOracle;
    address public priceOracleSentinel;
    
    // Implementation addresses (UUPS)
    address public commodityLendingPoolImpl;
    address public commodityOracleImpl;
    address public futuresCurveOracleImpl;
    address public priceOracleSentinelImpl;
    
    // Non-upgradeable contracts
    address public interestRateStrategyV2;
    address public interestRateStrategyV3;
    address public oracleConfigurator;
    
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
            "PHASE 2: CORE PROTOCOL (UUPS)",
            "Week 2 - Core lending and oracle operations"
        );
        
        vm.startBroadcast();
        
        // 1. CommodityLendingPool
        deployCommodityLendingPool();
        
        // 2. CommodityOracle
        deployCommodityOracle(owner);
        
        // 3. FuturesCurveOracle
        deployFuturesCurveOracle(owner);
        
        // 4. PriceOracleSentinel
        deployPriceOracleSentinel(owner);
        
        // 5-7. Non-Upgradeable Supporting Contracts
        deployInterestRateStrategies();
        deployOracleConfigurator();
        
        vm.stopBroadcast();
        
        logPhaseComplete("Phase 2 - Core Protocol");
        
        // Summary
        console.log("");
        console.log("Transaction Count:", txCount);
        console.log("");
        console.log("Upgradeable Contracts:");
        console.log("  CommodityLendingPool:", commodityLendingPool);
        console.log("  CommodityOracle:", commodityOracle);
        console.log("  FuturesCurveOracle:", futuresCurveOracle);
        console.log("  PriceOracleSentinel:", priceOracleSentinel);
        console.log("");
        console.log("Non-Upgradeable Contracts:");
        console.log("  InterestRateStrategyV2:", interestRateStrategyV2);
        console.log("  InterestRateStrategyV3:", interestRateStrategyV3);
        console.log("  OracleConfigurator:", oracleConfigurator);
    }
    
    function deployCommodityLendingPool() internal {
        console.log("[1/7] Deploying CommodityLendingPool (UUPS)...");
        
        CommodityLendingPool impl = new CommodityLendingPool();
        commodityLendingPoolImpl = address(impl);
        txCount++;
        
        bytes memory initData = abi.encodeWithSelector(
            CommodityLendingPool.initialize.selector,
            poolAddressesProvider
        );
        
        commodityLendingPool = deployUUPSProxy(commodityLendingPoolImpl, initData);
        txCount++;
        
        logDeployment(
            "CommodityLendingPool",
            commodityLendingPoolImpl,
            commodityLendingPool
        );
        
        console.log(unicode"  ✓ CommodityLendingPool deployed");
    }
    
    function deployCommodityOracle(address owner) internal {
        console.log("[2/7] Deploying CommodityOracle (UUPS)...");
        
        CommodityOracle impl = new CommodityOracle();
        commodityOracleImpl = address(impl);
        txCount++;
        
        bytes memory initData = abi.encodeWithSelector(
            CommodityOracle.initialize.selector,
            owner
        );
        
        commodityOracle = deployUUPSProxy(commodityOracleImpl, initData);
        txCount++;
        
        logDeployment("CommodityOracle", commodityOracleImpl, commodityOracle);
        
        console.log(unicode"  ✓ CommodityOracle deployed");
    }
    
    function deployFuturesCurveOracle(address owner) internal {
        console.log("[3/7] Deploying FuturesCurveOracle (UUPS)...");
        
        FuturesCurveOracle impl = new FuturesCurveOracle();
        futuresCurveOracleImpl = address(impl);
        txCount++;
        
        bytes memory initData = abi.encodeWithSelector(
            FuturesCurveOracle.initialize.selector,
            owner
        );
        
        futuresCurveOracle = deployUUPSProxy(futuresCurveOracleImpl, initData);
        txCount++;
        
        logDeployment(
            "FuturesCurveOracle",
            futuresCurveOracleImpl,
            futuresCurveOracle
        );
        
        console.log(unicode"  ✓ FuturesCurveOracle deployed");
    }
    
    function deployPriceOracleSentinel(address owner) internal {
        console.log("[4/7] Deploying PriceOracleSentinel (UUPS)...");
        
        NetworkConfiguration memory config = getConfig();
        address sequencerFeed = config.hasSequencer ? config.sequencerFeed : address(0);
        
        PriceOracleSentinel impl = new PriceOracleSentinel();
        priceOracleSentinelImpl = address(impl);
        txCount++;
        
        bytes memory initData = abi.encodeWithSelector(
            PriceOracleSentinel.initialize.selector,
            sequencerFeed,
            3600, // 1 hour grace period
            owner
        );
        
        priceOracleSentinel = deployUUPSProxy(priceOracleSentinelImpl, initData);
        txCount++;
        
        logDeployment(
            "PriceOracleSentinel",
            priceOracleSentinelImpl,
            priceOracleSentinel
        );
        
        console.log(unicode"  ✓ PriceOracleSentinel deployed");
    }
    
    function deployInterestRateStrategies() internal {
        console.log("[5/7] Deploying Interest Rate Strategies (non-upgradeable)...");
        
        interestRateStrategyV2 = address(
            new CommodityInterestRateStrategyV2(poolAddressesProvider)
        );
        txCount++;
        console.log("  InterestRateStrategyV2:", interestRateStrategyV2);
        
        console.log("[6/7] Deploying InterestRateStrategyV3...");
        interestRateStrategyV3 = address(
            new CommodityInterestRateStrategyV3(
                poolAddressesProvider,
                futuresCurveOracle
            )
        );
        txCount++;
        console.log("  InterestRateStrategyV3:", interestRateStrategyV3);
    }
    
    function deployOracleConfigurator() internal {
        console.log("[7/7] Deploying OracleConfigurator...");
        
        oracleConfigurator = address(
            new CommodityOracleConfigurator(commodityOracle)
        );
        txCount++;
        console.log("  OracleConfigurator:", oracleConfigurator);
    }
}
