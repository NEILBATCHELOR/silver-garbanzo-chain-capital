// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "./NetworkConfig.sol";
import "../../src/trade-finance/core/CommodityLendingPool.sol";
import "../../src/trade-finance/oracles/CommodityOracle.sol";
import "../../src/trade-finance/oracles/PriceOracleSentinel.sol";
import "../../src/trade-finance/oracles/chainlink-adapters/ChainlinkOracleAdapter.sol";
import "../../src/trade-finance/oracles/chainlink-adapters/GoldPriceFeedAdapter.sol";
import "../../src/trade-finance/oracles/chainlink-adapters/OilPriceFeedAdapter.sol";
import "../../src/trade-finance/oracles/chainlink-adapters/AgriculturalPriceFeedAdapter.sol";
import "../../src/trade-finance/governance/PoolAddressesProvider.sol";
import "../../src/trade-finance/governance/ACLManager.sol";
import "../../src/trade-finance/governance/PoolConfigurator.sol";
import "../../src/trade-finance/risk/HaircutEngine.sol";
import "../../src/trade-finance/security/EmergencyModule.sol";
import "../../src/trade-finance/security/CircuitBreakers.sol";

/**
 * @title DeployTradeFinanceCore
 * @notice Deploy core Trade Finance contracts (Pool, Oracles, Governance, Risk)
 * @dev Step 1 of Trade Finance deployment
 */
contract DeployTradeFinanceCore is Script, NetworkConfig {
    
    // Deployment addresses
    struct CoreDeployment {
        address poolAddressesProvider;
        address aclManager;
        address commodityLendingPool;
        address commodityOracle;
        address priceOracleSentinel;
        address poolConfigurator;
        address haircutEngine;
        address emergencyModule;
        address circuitBreakers;
        
        // Oracle adapters
        address chainlinkAdapter;
        address goldAdapter;
        address oilAdapter;
        address agriculturalAdapter;
    }
    
    CoreDeployment public deployment;
    
    function run() external {
        NetworkConfiguration memory config = getConfig();
        
        console.log("\n====================================");
        console.log("Trade Finance Core Deployment");
        console.log("====================================\n");
        
        logNetworkInfo();
        
        vm.startBroadcast(config.deployer);
        
        // Step 1: Deploy infrastructure
        _deployInfrastructure(config);
        
        // Step 2: Deploy oracle system
        _deployOracles(config);
        
        // Step 3: Deploy core pool
        _deployPool(config);
        
        // Step 4: Deploy risk management
        _deployRiskManagement(config);
        
        // Step 5: Deploy security
        _deploySecurity(config);
        
        // Step 6: Wire everything together
        _wireContracts(config);
        
        vm.stopBroadcast();
        
        // Save deployment
        _saveDeployment();
        
        console.log("\n====================================");
        console.log("Core Deployment Complete!");
        console.log("====================================\n");
        _logDeployment();
    }
    
    function _deployInfrastructure(NetworkConfiguration memory config) internal {
        console.log("\n[1/6] Deploying Infrastructure...");
        
        // Deploy PoolAddressesProvider (registry for all contracts)
        deployment.poolAddressesProvider = address(new PoolAddressesProvider(
            "ChainCapital Commodity Pool", // Market ID
            config.deployer // Owner
        ));
        console.log("  PoolAddressesProvider:", deployment.poolAddressesProvider);
        
        // Deploy ACL Manager (role-based access control)
        deployment.aclManager = address(new ACLManager(
            deployment.poolAddressesProvider
        ));
        console.log("  ACLManager:", deployment.aclManager);
        
        // Register ACL Manager
        PoolAddressesProvider(deployment.poolAddressesProvider)
            .setACLManager(deployment.aclManager);
        
        // Set up roles
        ACLManager aclManager = ACLManager(deployment.aclManager);
        aclManager.addPoolAdmin(config.deployer);
        aclManager.addEmergencyAdmin(
            config.emergencyAdmin != address(0) ? config.emergencyAdmin : config.deployer
        );
        aclManager.addRiskAdmin(config.deployer);
        
        console.log("  Roles configured");
    }
    
    function _deployOracles(NetworkConfiguration memory config) internal {
        console.log("\n[2/6] Deploying Oracle System...");
        
        // Deploy Commodity Oracle (aggregator)
        deployment.commodityOracle = address(new CommodityOracle(
            deployment.poolAddressesProvider
        ));
        console.log("  CommodityOracle:", deployment.commodityOracle);
        
        // Register oracle in provider
        PoolAddressesProvider(deployment.poolAddressesProvider)
            .setPriceOracle(deployment.commodityOracle);
        
        // Deploy Oracle Sentinel (L2 protection)
        if (config.hasSequencer) {
            deployment.priceOracleSentinel = address(new PriceOracleSentinel(
                deployment.poolAddressesProvider,
                config.sequencerFeed,
                1 hours // Grace period
            ));
            console.log("  PriceOracleSentinel:", deployment.priceOracleSentinel);
            
            PoolAddressesProvider(deployment.poolAddressesProvider)
                .setPriceOracleSentinel(deployment.priceOracleSentinel);
        }
        
        // Deploy Chainlink adapters (if available)
        if (hasChainlinkFeeds()) {
            deployment.chainlinkAdapter = address(new ChainlinkOracleAdapter());
            console.log("  ChainlinkOracleAdapter:", deployment.chainlinkAdapter);
            
            if (config.goldPriceFeed != address(0)) {
                deployment.goldAdapter = address(new GoldPriceFeedAdapter(
                    config.goldPriceFeed
                ));
                console.log("  GoldAdapter:", deployment.goldAdapter);
            }
            
            if (config.oilPriceFeed != address(0)) {
                deployment.oilAdapter = address(new OilPriceFeedAdapter(
                    config.oilPriceFeed
                ));
                console.log("  OilAdapter:", deployment.oilAdapter);
            }
            
            // Agricultural adapter (placeholder, needs multi-feed config)
            deployment.agriculturalAdapter = address(new AgriculturalPriceFeedAdapter());
            console.log("  AgriculturalAdapter:", deployment.agriculturalAdapter);
        } else {
            console.log("  No Chainlink feeds available on this network");
            console.log("  Manual price feeding required");
        }
    }
    
    function _deployPool(NetworkConfiguration memory config) internal {
        console.log("\n[3/6] Deploying Lending Pool...");
        
        // Deploy CommodityLendingPool
        deployment.commodityLendingPool = address(new CommodityLendingPool());
        console.log("  CommodityLendingPool:", deployment.commodityLendingPool);
        
        // Initialize pool
        CommodityLendingPool(deployment.commodityLendingPool).initialize(
            deployment.poolAddressesProvider,
            deployment.commodityOracle,
            config.hasSequencer ? deployment.priceOracleSentinel : address(0)
        );
        console.log("  Pool initialized");
        
        // Register pool in provider
        PoolAddressesProvider(deployment.poolAddressesProvider)
            .setPoolImpl(deployment.commodityLendingPool);
        
        // Deploy Pool Configurator
        deployment.poolConfigurator = address(new PoolConfigurator());
        console.log("  PoolConfigurator:", deployment.poolConfigurator);
        
        PoolAddressesProvider(deployment.poolAddressesProvider)
            .setPoolConfigurator(deployment.poolConfigurator);
    }
    
    function _deployRiskManagement(NetworkConfiguration memory config) internal {
        console.log("\n[4/6] Deploying Risk Management...");
        
        // Deploy Haircut Engine
        deployment.haircutEngine = address(new HaircutEngine(
            deployment.poolAddressesProvider
        ));
        console.log("  HaircutEngine:", deployment.haircutEngine);
    }
    
    function _deploySecurity(NetworkConfiguration memory config) internal {
        console.log("\n[5/6] Deploying Security...");
        
        // Deploy Emergency Module
        deployment.emergencyModule = address(new EmergencyModule(
            deployment.poolAddressesProvider
        ));
        console.log("  EmergencyModule:", deployment.emergencyModule);
        
        // Deploy Circuit Breakers
        deployment.circuitBreakers = address(new CircuitBreakers(
            deployment.poolAddressesProvider
        ));
        console.log("  CircuitBreakers:", deployment.circuitBreakers);
    }
    
    function _wireContracts(NetworkConfiguration memory config) internal {
        console.log("\n[6/6] Wiring Contracts...");
        
        // Grant appropriate roles
        ACLManager aclManager = ACLManager(deployment.aclManager);
        
        // Pool Configurator needs POOL_ADMIN
        aclManager.addPoolAdmin(deployment.poolConfigurator);
        
        // Emergency Module needs EMERGENCY_ADMIN
        aclManager.addEmergencyAdmin(deployment.emergencyModule);
        
        // Circuit Breakers needs RISK_ADMIN
        aclManager.addRiskAdmin(deployment.circuitBreakers);
        
        console.log("  All contracts wired");
    }
    
    function _saveDeployment() internal {
        string memory json = string.concat(
            '{\n',
            '  "network": "', getConfig().name, '",\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "timestamp": ', vm.toString(block.timestamp), ',\n',
            '  "poolAddressesProvider": "', vm.toString(deployment.poolAddressesProvider), '",\n',
            '  "aclManager": "', vm.toString(deployment.aclManager), '",\n',
            '  "commodityLendingPool": "', vm.toString(deployment.commodityLendingPool), '",\n',
            '  "commodityOracle": "', vm.toString(deployment.commodityOracle), '",\n',
            '  "priceOracleSentinel": "', vm.toString(deployment.priceOracleSentinel), '",\n',
            '  "poolConfigurator": "', vm.toString(deployment.poolConfigurator), '",\n',
            '  "haircutEngine": "', vm.toString(deployment.haircutEngine), '",\n',
            '  "emergencyModule": "', vm.toString(deployment.emergencyModule), '",\n',
            '  "circuitBreakers": "', vm.toString(deployment.circuitBreakers), '",\n',
            '  "chainlinkAdapter": "', vm.toString(deployment.chainlinkAdapter), '",\n',
            '  "goldAdapter": "', vm.toString(deployment.goldAdapter), '",\n',
            '  "oilAdapter": "', vm.toString(deployment.oilAdapter), '",\n',
            '  "agriculturalAdapter": "', vm.toString(deployment.agriculturalAdapter), '"\n',
            '}'
        );
        
        string memory filename = string.concat(
            "./deployments/trade-finance-core-",
            vm.toString(block.chainid),
            ".json"
        );
        
        vm.writeFile(filename, json);
        console.log("\n  Deployment saved to:", filename);
    }
    
    function _logDeployment() internal view {
        console.log("\n=== Core Contracts ===");
        console.log("PoolAddressesProvider:", deployment.poolAddressesProvider);
        console.log("ACLManager:", deployment.aclManager);
        console.log("CommodityLendingPool:", deployment.commodityLendingPool);
        console.log("CommodityOracle:", deployment.commodityOracle);
        console.log("PoolConfigurator:", deployment.poolConfigurator);
        console.log("\n=== Risk Management ===");
        console.log("HaircutEngine:", deployment.haircutEngine);
        console.log("\n=== Security ===");
        console.log("EmergencyModule:", deployment.emergencyModule);
        console.log("CircuitBreakers:", deployment.circuitBreakers);
        
        if (deployment.priceOracleSentinel != address(0)) {
            console.log("\n=== L2 Protection ===");
            console.log("PriceOracleSentinel:", deployment.priceOracleSentinel);
        }
        
        if (deployment.goldAdapter != address(0)) {
            console.log("\n=== Oracle Adapters ===");
            console.log("ChainlinkAdapter:", deployment.chainlinkAdapter);
            console.log("GoldAdapter:", deployment.goldAdapter);
            if (deployment.oilAdapter != address(0)) {
                console.log("OilAdapter:", deployment.oilAdapter);
            }
            console.log("AgriculturalAdapter:", deployment.agriculturalAdapter);
        }
    }
}
