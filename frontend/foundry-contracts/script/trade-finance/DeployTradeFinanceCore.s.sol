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
import "../../src/trade-finance/interfaces/IPoolAddressesProvider.sol";
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
        
        _deployInfrastructure(config);
        _deployOracles(config);
        _deployPool(config);
        _deployRiskManagement(config);
        _deploySecurity(config);
        _wireContracts(config);
        
        vm.stopBroadcast();
        
        _saveDeployment();
        
        console.log("\n====================================");
        console.log("Core Deployment Complete!");
        console.log("====================================\n");
        _logDeployment();
    }
    
    function _deployInfrastructure(NetworkConfiguration memory config) internal {
        console.log("\n[1/6] Deploying Infrastructure...");
        
        deployment.poolAddressesProvider = address(new PoolAddressesProvider(
            "ChainCapital Commodity Pool",
            config.deployer
        ));
        console.log("  PoolAddressesProvider:", deployment.poolAddressesProvider);
        
        deployment.aclManager = address(new ACLManager(
            IPoolAddressesProvider(deployment.poolAddressesProvider)
        ));
        console.log("  ACLManager:", deployment.aclManager);
        
        PoolAddressesProvider(deployment.poolAddressesProvider)
            .setACLManager(deployment.aclManager);
        
        _setupRoles(config);
        
        console.log("  Roles configured");
    }
    
    function _setupRoles(NetworkConfiguration memory config) internal {
        ACLManager aclManager = ACLManager(deployment.aclManager);
        aclManager.addPoolAdmin(config.deployer);
        
        address emergencyAdmin = config.emergencyAdmin != address(0) 
            ? config.emergencyAdmin 
            : config.deployer;
        aclManager.addEmergencyAdmin(emergencyAdmin);
        aclManager.addRiskAdmin(config.deployer);
    }
    
    function _deployOracles(NetworkConfiguration memory config) internal {
        console.log("\n[2/6] Deploying Oracle System...");
        
        deployment.commodityOracle = address(new CommodityOracle());
        console.log("  CommodityOracle:", deployment.commodityOracle);
        
        PoolAddressesProvider(deployment.poolAddressesProvider)
            .setPriceOracle(deployment.commodityOracle);
        
        if (config.hasSequencer) {
            _deploySentinel(config);
        }
        
        if (hasChainlinkFeeds()) {
            _deployChainlinkAdapters(config);
        } else {
            console.log("  No Chainlink feeds available on this network");
            console.log("  Manual price feeding required");
        }
    }
    
    function _deploySentinel(NetworkConfiguration memory config) internal {
        deployment.priceOracleSentinel = address(new PriceOracleSentinel(
            config.sequencerFeed,
            1 hours
        ));
        console.log("  PriceOracleSentinel:", deployment.priceOracleSentinel);
    }
    
    function _deployChainlinkAdapters(NetworkConfiguration memory config) internal {
        deployment.chainlinkAdapter = address(new ChainlinkOracleAdapter());
        console.log("  ChainlinkOracleAdapter:", deployment.chainlinkAdapter);
        
        if (config.goldPriceFeed != address(0)) {
            deployment.goldAdapter = address(new GoldPriceFeedAdapter(
                config.goldPriceFeed,
                3600
            ));
            console.log("  GoldAdapter:", deployment.goldAdapter);
        }
        
        if (config.oilPriceFeed != address(0)) {
            deployment.oilAdapter = address(new OilPriceFeedAdapter(
                config.oilPriceFeed,
                config.oilPriceFeed,
                3600
            ));
            console.log("  OilAdapter:", deployment.oilAdapter);
        }
        
        deployment.agriculturalAdapter = address(new AgriculturalPriceFeedAdapter());
        console.log("  AgriculturalAdapter:", deployment.agriculturalAdapter);
    }
    
    function _deployPool(NetworkConfiguration memory config) internal {
        console.log("\n[3/6] Deploying Lending Pool...");
        
        deployment.commodityLendingPool = address(new CommodityLendingPool());
        console.log("  CommodityLendingPool:", deployment.commodityLendingPool);
        
        address sentinel = config.hasSequencer ? deployment.priceOracleSentinel : address(0);
        CommodityLendingPool(deployment.commodityLendingPool).initialize(
            deployment.poolAddressesProvider,
            deployment.commodityOracle,
            sentinel
        );
        console.log("  Pool initialized");
        
        PoolAddressesProvider(deployment.poolAddressesProvider)
            .setPool(deployment.commodityLendingPool);
        
        _deployConfigurator();
    }
    
    function _deployConfigurator() internal {
        deployment.poolConfigurator = address(new PoolConfigurator(
            IPoolAddressesProvider(deployment.poolAddressesProvider)
        ));
        console.log("  PoolConfigurator:", deployment.poolConfigurator);
        
        PoolAddressesProvider(deployment.poolAddressesProvider)
            .setPoolConfigurator(deployment.poolConfigurator);
    }
    
    function _deployRiskManagement(NetworkConfiguration memory config) internal {
        console.log("\n[4/6] Deploying Risk Management...");
        
        deployment.haircutEngine = address(new HaircutEngine(
            config.deployer,
            config.deployer
        ));
        console.log("  HaircutEngine:", deployment.haircutEngine);
    }
    
    function _deploySecurity(NetworkConfiguration memory config) internal {
        console.log("\n[5/6] Deploying Security...");
        
        deployment.emergencyModule = address(new EmergencyModule(
            IPoolAddressesProvider(deployment.poolAddressesProvider)
        ));
        console.log("  EmergencyModule:", deployment.emergencyModule);
        
        deployment.circuitBreakers = address(new CircuitBreakers(
            IPoolAddressesProvider(deployment.poolAddressesProvider)
        ));
        console.log("  CircuitBreakers:", deployment.circuitBreakers);
    }
    
    function _wireContracts(NetworkConfiguration memory config) internal {
        console.log("\n[6/6] Wiring Contracts...");
        
        ACLManager aclManager = ACLManager(deployment.aclManager);
        
        aclManager.addPoolAdmin(deployment.poolConfigurator);
        aclManager.addEmergencyAdmin(deployment.emergencyModule);
        aclManager.addRiskAdmin(deployment.circuitBreakers);
        
        console.log("  All contracts wired");
    }
    
    function _saveDeployment() internal {
        string memory part1 = _buildJsonPart1();
        string memory part2 = _buildJsonPart2();
        string memory part3 = _buildJsonPart3();
        
        string memory json = string.concat(part1, part2, part3);
        
        string memory filename = string.concat(
            "./deployments/trade-finance-core-",
            vm.toString(block.chainid),
            ".json"
        );
        
        vm.writeFile(filename, json);
        console.log("\n  Deployment saved to:", filename);
    }
    
    function _buildJsonPart1() internal view returns (string memory) {
        return string.concat(
            '{\n',
            '  "network": "', getConfig().name, '",\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "timestamp": ', vm.toString(block.timestamp), ',\n',
            '  "poolAddressesProvider": "', vm.toString(deployment.poolAddressesProvider), '",\n',
            '  "aclManager": "', vm.toString(deployment.aclManager), '",\n'
        );
    }
    
    function _buildJsonPart2() internal view returns (string memory) {
        return string.concat(
            '  "commodityLendingPool": "', vm.toString(deployment.commodityLendingPool), '",\n',
            '  "commodityOracle": "', vm.toString(deployment.commodityOracle), '",\n',
            '  "priceOracleSentinel": "', vm.toString(deployment.priceOracleSentinel), '",\n',
            '  "poolConfigurator": "', vm.toString(deployment.poolConfigurator), '",\n',
            '  "haircutEngine": "', vm.toString(deployment.haircutEngine), '",\n'
        );
    }
    
    function _buildJsonPart3() internal view returns (string memory) {
        return string.concat(
            '  "emergencyModule": "', vm.toString(deployment.emergencyModule), '",\n',
            '  "circuitBreakers": "', vm.toString(deployment.circuitBreakers), '",\n',
            '  "chainlinkAdapter": "', vm.toString(deployment.chainlinkAdapter), '",\n',
            '  "goldAdapter": "', vm.toString(deployment.goldAdapter), '",\n',
            '  "oilAdapter": "', vm.toString(deployment.oilAdapter), '",\n',
            '  "agriculturalAdapter": "', vm.toString(deployment.agriculturalAdapter), '"\n',
            '}'
        );
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
            _logOracleAdapters();
        }
    }
    
    function _logOracleAdapters() internal view {
        console.log("\n=== Oracle Adapters ===");
        console.log("ChainlinkAdapter:", deployment.chainlinkAdapter);
        console.log("GoldAdapter:", deployment.goldAdapter);
        if (deployment.oilAdapter != address(0)) {
            console.log("OilAdapter:", deployment.oilAdapter);
        }
        console.log("AgriculturalAdapter:", deployment.agriculturalAdapter);
    }
}
