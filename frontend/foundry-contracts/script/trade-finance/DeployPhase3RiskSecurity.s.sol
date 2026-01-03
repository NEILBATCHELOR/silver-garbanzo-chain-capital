// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./DeploymentBase.sol";
import "../../src/trade-finance/risk/HaircutEngine.sol";
import "../../src/trade-finance/security/EmergencyModule.sol";
import "../../src/trade-finance/security/CircuitBreakers.sol";
import "../../src/trade-finance/liquidation/DutchAuctionLiquidator.sol";
import "../../src/trade-finance/liquidation/GracefulLiquidation.sol";
import "../../src/trade-finance/liquidation/FlashLiquidation.sol";
import "../../src/trade-finance/liquidation/DEXLiquidationAdapter.sol";
import "../../src/trade-finance/liquidation/LiquidationDataProvider.sol";

/**
 * @title DeployPhase3RiskSecurity
 * @notice Deployment script for Phase 3: Risk Management & Security
 * @dev Deploys all risk management, security, and liquidation contracts
 * 
 * Contracts Deployed (UUPS Upgradeable):
 * 1. HaircutEngine
 * 2. CircuitBreakers
 * 3. EmergencyModule
 * 4. DutchAuctionLiquidator
 * 5. GracefulLiquidation
 * 6. FlashLiquidation
 * 7. DEXLiquidationAdapter
 * 8. LiquidationDataProvider
 */
contract DeployPhase3RiskSecurity is DeploymentBase {
    
    // Proxy addresses
    address public haircutEngine;
    address public circuitBreakers;
    address public emergencyModule;
    address public dutchAuctionLiquidator;
    address public gracefulLiquidation;
    address public flashLiquidation;
    address public dexLiquidationAdapter;
    address public liquidationDataProvider;
    
    // Implementation addresses
    address public haircutEngineImpl;
    address public circuitBreakersImpl;
    address public emergencyModuleImpl;
    address public dutchAuctionLiquidatorImpl;
    address public gracefulLiquidationImpl;
    address public flashLiquidationImpl;
    address public dexLiquidationAdapterImpl;
    address public liquidationDataProviderImpl;
    
    // Required dependencies from Phase 1 & 2
    address public poolAddressesProvider;
    address public commodityLendingPool;
    address public aclManager;
    address public commodityOracle;
    
    uint256 public txCount = 0;
    
    constructor(
        address _poolAddressesProvider,
        address _commodityLendingPool,
        address _aclManager,
        address _commodityOracle
    ) {
        require(_poolAddressesProvider != address(0), "Invalid provider");
        require(_commodityLendingPool != address(0), "Invalid pool");
        require(_aclManager != address(0), "Invalid ACL");
        require(_commodityOracle != address(0), "Invalid oracle");
        
        poolAddressesProvider = _poolAddressesProvider;
        commodityLendingPool = _commodityLendingPool;
        aclManager = _aclManager;
        commodityOracle = _commodityOracle;
    }
    
    function run() external {
        address owner = getSuperAdmin();
        
        logPhaseStart(
            "PHASE 3: RISK & SECURITY (UUPS)",
            "Week 3 - Risk management, security, and liquidation"
        );
        
        vm.startBroadcast();
        
        // 1. HaircutEngine
        deployHaircutEngine(owner);
        
        // 2. CircuitBreakers
        deployCircuitBreakers(owner);
        
        // 3. EmergencyModule
        deployEmergencyModule(owner);
        
        // 4. DutchAuctionLiquidator
        deployDutchAuctionLiquidator(owner);
        
        // 5. GracefulLiquidation
        deployGracefulLiquidation(owner);
        
        // 6. FlashLiquidation
        deployFlashLiquidation(owner);
        
        // 7. DEXLiquidationAdapter
        deployDEXLiquidationAdapter(owner);
        
        // 8. LiquidationDataProvider
        deployLiquidationDataProvider(owner);
        
        vm.stopBroadcast();
        
        // Validate deployments
        validateDeployments();
        
        logPhaseComplete("Phase 3 - Risk & Security");
        
        console.log("");
        console.log("Total Transactions:", txCount);
    }
    
    // ============================================
    // DEPLOYMENT FUNCTIONS
    // ============================================
    
    function deployHaircutEngine(address owner) internal {
        console.log("[1/8] Deploying HaircutEngine (UUPS)...");
        
        // Deploy implementation
        HaircutEngine impl = new HaircutEngine();
        haircutEngineImpl = address(impl);
        txCount++;
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            HaircutEngine.initialize.selector,
            poolAddressesProvider
        );
        
        // Deploy proxy
        haircutEngine = deployUUPSProxy(haircutEngineImpl, initData);
        txCount++;
        
        logDeployment("HaircutEngine", haircutEngineImpl, haircutEngine);
    }
    
    function deployCircuitBreakers(address owner) internal {
        console.log("[2/8] Deploying CircuitBreakers (UUPS)...");
        
        // Deploy implementation
        CircuitBreakers impl = new CircuitBreakers();
        circuitBreakersImpl = address(impl);
        txCount++;
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            CircuitBreakers.initialize.selector,
            poolAddressesProvider
        );
        
        // Deploy proxy
        circuitBreakers = deployUUPSProxy(circuitBreakersImpl, initData);
        txCount++;
        
        logDeployment("CircuitBreakers", circuitBreakersImpl, circuitBreakers);
    }
    
    function deployEmergencyModule(address owner) internal {
        console.log("[3/8] Deploying EmergencyModule (UUPS)...");
        
        // Deploy implementation
        EmergencyModule impl = new EmergencyModule();
        emergencyModuleImpl = address(impl);
        txCount++;
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            EmergencyModule.initialize.selector,
            poolAddressesProvider,
            owner
        );
        
        // Deploy proxy
        emergencyModule = deployUUPSProxy(emergencyModuleImpl, initData);
        txCount++;
        
        logDeployment("EmergencyModule", emergencyModuleImpl, emergencyModule);
    }
    
    function deployDutchAuctionLiquidator(address owner) internal {
        console.log("[4/8] Deploying DutchAuctionLiquidator (UUPS)...");
        
        // Deploy implementation
        DutchAuctionLiquidator impl = new DutchAuctionLiquidator();
        dutchAuctionLiquidatorImpl = address(impl);
        txCount++;
        
        // Prepare initialization data - CORRECTED SIGNATURE
        bytes memory initData = abi.encodeWithSelector(
            DutchAuctionLiquidator.initialize.selector,
            commodityLendingPool,  // pool
            aclManager,            // aclManager
            commodityOracle,       // priceOracle
            owner                  // owner
        );
        
        // Deploy proxy
        dutchAuctionLiquidator = deployUUPSProxy(dutchAuctionLiquidatorImpl, initData);
        txCount++;
        
        logDeployment("DutchAuctionLiquidator", dutchAuctionLiquidatorImpl, dutchAuctionLiquidator);
    }
    
    function deployGracefulLiquidation(address owner) internal {
        console.log("[5/8] Deploying GracefulLiquidation (UUPS)...");
        
        // Deploy implementation
        GracefulLiquidation impl = new GracefulLiquidation();
        gracefulLiquidationImpl = address(impl);
        txCount++;
        
        // Prepare initialization data - CORRECTED SIGNATURE
        bytes memory initData = abi.encodeWithSelector(
            GracefulLiquidation.initialize.selector,
            commodityLendingPool,  // pool
            aclManager,            // aclManager
            owner                  // owner
        );
        
        // Deploy proxy
        gracefulLiquidation = deployUUPSProxy(gracefulLiquidationImpl, initData);
        txCount++;
        
        logDeployment("GracefulLiquidation", gracefulLiquidationImpl, gracefulLiquidation);
    }
    
    function deployFlashLiquidation(address owner) internal {
        console.log("[6/8] Deploying FlashLiquidation (UUPS)...");
        
        // Deploy implementation
        FlashLiquidation impl = new FlashLiquidation();
        flashLiquidationImpl = address(impl);
        txCount++;
        
        // Prepare initialization data - CORRECTED SIGNATURE
        bytes memory initData = abi.encodeWithSelector(
            FlashLiquidation.initialize.selector,
            poolAddressesProvider,  // addressesProvider
            aclManager,             // aclManager
            owner                   // owner
        );
        
        // Deploy proxy
        flashLiquidation = deployUUPSProxy(flashLiquidationImpl, initData);
        txCount++;
        
        logDeployment("FlashLiquidation", flashLiquidationImpl, flashLiquidation);
    }
    
    function deployDEXLiquidationAdapter(address owner) internal {
        console.log("[7/8] Deploying DEXLiquidationAdapter (UUPS)...");
        
        // Deploy implementation
        DEXLiquidationAdapter impl = new DEXLiquidationAdapter();
        dexLiquidationAdapterImpl = address(impl);
        txCount++;
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            DEXLiquidationAdapter.initialize.selector,
            commodityLendingPool,  // pool
            aclManager,            // aclManager
            owner                  // owner
        );
        
        // Deploy proxy
        dexLiquidationAdapter = deployUUPSProxy(dexLiquidationAdapterImpl, initData);
        txCount++;
        
        logDeployment("DEXLiquidationAdapter", dexLiquidationAdapterImpl, dexLiquidationAdapter);
    }
    
    function deployLiquidationDataProvider(address owner) internal {
        console.log("[8/8] Deploying LiquidationDataProvider (UUPS)...");
        
        // Deploy implementation
        LiquidationDataProvider impl = new LiquidationDataProvider();
        liquidationDataProviderImpl = address(impl);
        txCount++;
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            LiquidationDataProvider.initialize.selector,
            commodityLendingPool,  // pool
            commodityOracle,       // priceOracle
            owner                  // owner
        );
        
        // Deploy proxy
        liquidationDataProvider = deployUUPSProxy(liquidationDataProviderImpl, initData);
        txCount++;
        
        logDeployment("LiquidationDataProvider", liquidationDataProviderImpl, liquidationDataProvider);
    }
    
    // ============================================
    // VALIDATION
    // ============================================
    
    function validateDeployments() internal view {
        console.log("");
        console.log("Validating Phase 3 deployments...");
        
        // Validate risk management
        require(haircutEngine != address(0), "HaircutEngine not deployed");
        require(circuitBreakers != address(0), "CircuitBreakers not deployed");
        require(emergencyModule != address(0), "EmergencyModule not deployed");
        
        // Validate liquidation contracts
        require(dutchAuctionLiquidator != address(0), "DutchAuctionLiquidator not deployed");
        require(gracefulLiquidation != address(0), "GracefulLiquidation not deployed");
        require(flashLiquidation != address(0), "FlashLiquidation not deployed");
        require(dexLiquidationAdapter != address(0), "DEXLiquidationAdapter not deployed");
        require(liquidationDataProvider != address(0), "LiquidationDataProvider not deployed");
        
        // Validate implementations
        require(haircutEngineImpl != address(0), "HaircutEngine impl not deployed");
        require(circuitBreakersImpl != address(0), "CircuitBreakers impl not deployed");
        require(emergencyModuleImpl != address(0), "EmergencyModule impl not deployed");
        require(dutchAuctionLiquidatorImpl != address(0), "DutchAuctionLiquidator impl not deployed");
        require(gracefulLiquidationImpl != address(0), "GracefulLiquidation impl not deployed");
        require(flashLiquidationImpl != address(0), "FlashLiquidation impl not deployed");
        require(dexLiquidationAdapterImpl != address(0), "DEXLiquidationAdapter impl not deployed");
        require(liquidationDataProviderImpl != address(0), "LiquidationDataProvider impl not deployed");
        
        // Verify proxy setups
        verifyProxySetup(haircutEngine, haircutEngineImpl);
        verifyProxySetup(circuitBreakers, circuitBreakersImpl);
        verifyProxySetup(emergencyModule, emergencyModuleImpl);
        verifyProxySetup(dutchAuctionLiquidator, dutchAuctionLiquidatorImpl);
        verifyProxySetup(gracefulLiquidation, gracefulLiquidationImpl);
        verifyProxySetup(flashLiquidation, flashLiquidationImpl);
        verifyProxySetup(dexLiquidationAdapter, dexLiquidationAdapterImpl);
        verifyProxySetup(liquidationDataProvider, liquidationDataProviderImpl);
        
        console.log(unicode"✅ All Phase 3 deployments validated");
    }
}
