// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./DeploymentBase.sol";
import "../../src/trade-finance/liquidation/DutchAuctionLiquidator.sol";
import "../../src/trade-finance/liquidation/GracefulLiquidation.sol";
import "../../src/trade-finance/liquidation/FlashLiquidation.sol";
import "../../src/trade-finance/liquidation/DEXLiquidationAdapter.sol";
import "../../src/trade-finance/liquidation/LiquidationDataProvider.sol";

/**
 * @title DeployPhase5Liquidation
 * @notice Deployment script for Phase 5: Liquidation System
 * @dev Deploys all liquidation contracts with UUPS upgradeability
 * 
 * Contracts Deployed (UUPS Upgradeable):
 * 1. DutchAuctionLiquidator
 * 2. GracefulLiquidation
 * 3. FlashLiquidation
 * 4. DEXLiquidationAdapter
 * 5. LiquidationDataProvider
 */
contract DeployPhase5Liquidation is DeploymentBase {
    
    // Proxy addresses
    address public dutchAuctionLiquidator;
    address public gracefulLiquidation;
    address public flashLiquidation;
    address public dexLiquidationAdapter;
    address public liquidationDataProvider;
    
    // Implementation addresses
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
            "PHASE 5: LIQUIDATION (UUPS)",
            "Week 5 - Liquidation mechanisms"
        );
        
        vm.startBroadcast();
        
        // 1. DutchAuctionLiquidator
        deployDutchAuctionLiquidator(owner);
        
        // 2. GracefulLiquidation
        deployGracefulLiquidation(owner);
        
        // 3. FlashLiquidation
        deployFlashLiquidation(owner);
        
        // 4. DEXLiquidationAdapter
        deployDEXLiquidationAdapter(owner);
        
        // 5. LiquidationDataProvider
        deployLiquidationDataProvider(owner);
        
        vm.stopBroadcast();
        
        logPhaseComplete("Phase 5 Complete - Liquidation System");
        logSummary();
    }
    
    // ============================================
    // DEPLOYMENT FUNCTIONS
    // ============================================
    
    function deployDutchAuctionLiquidator(address owner) internal {
        logDeployment(1, 5, "DutchAuctionLiquidator", true);
        
        // Deploy implementation
        DutchAuctionLiquidator impl = new DutchAuctionLiquidator();
        dutchAuctionLiquidatorImpl = address(impl);
        txCount++;
        logImplementation(dutchAuctionLiquidatorImpl);
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            DutchAuctionLiquidator.initialize.selector,
            commodityLendingPool,
            aclManager,
            commodityOracle,
            owner
        );
        
        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(dutchAuctionLiquidatorImpl, initData);
        dutchAuctionLiquidator = address(proxy);
        txCount++;
        logProxy(dutchAuctionLiquidator);
        logSuccess("DutchAuctionLiquidator");
    }
    
    function deployGracefulLiquidation(address owner) internal {
        logDeployment(2, 5, "GracefulLiquidation", true);
        
        // Deploy implementation
        GracefulLiquidation impl = new GracefulLiquidation();
        gracefulLiquidationImpl = address(impl);
        txCount++;
        logImplementation(gracefulLiquidationImpl);
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            GracefulLiquidation.initialize.selector,
            commodityLendingPool,
            aclManager,
            owner
        );
        
        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(gracefulLiquidationImpl, initData);
        gracefulLiquidation = address(proxy);
        txCount++;
        logProxy(gracefulLiquidation);
        logSuccess("GracefulLiquidation");
    }
    
    function deployFlashLiquidation(address owner) internal {
        logDeployment(3, 5, "FlashLiquidation", true);
        
        // Deploy implementation
        FlashLiquidation impl = new FlashLiquidation();
        flashLiquidationImpl = address(impl);
        txCount++;
        logImplementation(flashLiquidationImpl);
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            FlashLiquidation.initialize.selector,
            poolAddressesProvider,
            aclManager,
            owner
        );
        
        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(flashLiquidationImpl, initData);
        flashLiquidation = address(proxy);
        txCount++;
        logProxy(flashLiquidation);
        logSuccess("FlashLiquidation");
    }
    
    function deployDEXLiquidationAdapter(address owner) internal {
        logDeployment(4, 5, "DEXLiquidationAdapter", true);
        
        // Deploy implementation
        DEXLiquidationAdapter impl = new DEXLiquidationAdapter();
        dexLiquidationAdapterImpl = address(impl);
        txCount++;
        logImplementation(dexLiquidationAdapterImpl);
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            DEXLiquidationAdapter.initialize.selector,
            commodityLendingPool,
            aclManager,
            owner
        );
        
        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(dexLiquidationAdapterImpl, initData);
        dexLiquidationAdapter = address(proxy);
        txCount++;
        logProxy(dexLiquidationAdapter);
        logSuccess("DEXLiquidationAdapter");
    }
    
    function deployLiquidationDataProvider(address owner) internal {
        logDeployment(5, 5, "LiquidationDataProvider", true);
        
        // Deploy implementation
        LiquidationDataProvider impl = new LiquidationDataProvider();
        liquidationDataProviderImpl = address(impl);
        txCount++;
        logImplementation(liquidationDataProviderImpl);
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            LiquidationDataProvider.initialize.selector,
            commodityLendingPool,
            commodityOracle,
            owner
        );
        
        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(liquidationDataProviderImpl, initData);
        liquidationDataProvider = address(proxy);
        txCount++;
        logProxy(liquidationDataProvider);
        logSuccess("LiquidationDataProvider");
    }
    
    function logSummary() internal view {
        console.log("");
        console.log("=============================================");
        console.log("PHASE 5 DEPLOYMENT SUMMARY");
        console.log("=============================================");
        console.log("Total Transactions:", txCount);
        console.log("");
        console.log("Liquidation Contracts:");
        console.log("  DutchAuctionLiquidator:", dutchAuctionLiquidator);
        console.log("  GracefulLiquidation:", gracefulLiquidation);
        console.log("  FlashLiquidation:", flashLiquidation);
        console.log("  DEXLiquidationAdapter:", dexLiquidationAdapter);
        console.log("  LiquidationDataProvider:", liquidationDataProvider);
        console.log("=============================================");
    }
}
