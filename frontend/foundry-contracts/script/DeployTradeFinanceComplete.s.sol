// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Network Configuration
import "./trade-finance/NetworkConfig.sol";

// Phase Deployment Scripts
import "./trade-finance/DeployPhase1Governance.s.sol";
import "./trade-finance/DeployPhase2CoreProtocol.s.sol";
import "./trade-finance/DeployPhase3RiskSecurity.s.sol";
import "./trade-finance/DeployPhase4RewardsTreasury.s.sol";
import "./trade-finance/DeployPhase5Liquidation.s.sol";

// Proxy imports - UUPS Pattern
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Infrastructure
import "../src/trade-finance/deployment/TradeFinanceRegistry.sol";

// Token Templates (non-upgradeable)
import "../src/trade-finance/tokens/CommodityReceiptToken.sol";
import "../src/trade-finance/tokens/CommodityDebtToken.sol";

/**
 * @title DeployTradeFinanceComplete
 * @notice Orchestrator for complete Trade Finance protocol deployment
 * @dev Delegates to modular phase scripts for cleaner, maintainable deployment
 * 
 * Deployment Flow:
 * 1. Infrastructure (TradeFinanceRegistry)
 * 2. Phase 1 - Governance (PoolAddressesProvider, ACLManager, PoolConfigurator)
 * 3. Phase 2 - Core Protocol (Pool, Oracles, Interest Rates)
 * 4. Phase 3 - Risk & Security (Haircut, CircuitBreakers, Emergency)
 * 5. Phase 4 - Rewards & Treasury
 * 6. Phase 5 - Liquidation
 * 7. Token Templates (Receipt & Debt Token implementations)
 * 8. Configuration & Validation
 * 
 * Benefits of Modular Approach:
 * - Each phase can be deployed independently
 * - Easier testing and debugging
 * - Cleaner code organization
 * - Reusable deployment scripts
 */
contract DeployTradeFinanceComplete is Script, NetworkConfig {
    
    // Configuration
    string public marketId;
    string public version;
    address public deployer;
    address public superAdmin;
    uint256 public txCount = 0;
    
    // Infrastructure
    TradeFinanceRegistry public tradeFinanceRegistry;
    address public tradeFinanceRegistryImpl;
    
    // Token Templates
    CommodityReceiptToken public receiptTokenImpl;
    CommodityDebtToken public debtTokenImpl;
    
    // Phase Deployment Results
    struct PhaseAddresses {
        // Phase 1
        address poolAddressesProvider;
        address aclManager;
        address poolConfigurator;
        
        // Phase 2
        address commodityLendingPool;
        address commodityOracle;
        address futuresCurveOracle;
        address priceOracleSentinel;
        address interestRateStrategyV2;
        address interestRateStrategyV3;
        address oracleConfigurator;
        
        // Phase 3
        address haircutEngine;
        address circuitBreakers;
        address emergencyModule;
        
        // Phase 4
        address rewardsController;
        address emissionManager;
        address rewardsDistributor;
        address collector;
        address protocolReserve;
        address revenueSplitter;
        
        // Phase 5
        address dutchAuctionLiquidator;
        address gracefulLiquidation;
        address flashLiquidation;
        address dexLiquidationAdapter;
        address liquidationDataProvider;
    }
    
    PhaseAddresses public addresses;
    
    function run() external {
        // Initialize configuration
        deployer = vm.envAddress("DEPLOYER_ADDRESS");
        superAdmin = vm.envOr("SUPER_ADMIN_ADDRESS", deployer);
        marketId = vm.envOr("MARKET_ID", string("ChainCapital-Commodities"));
        version = vm.envOr("TRADE_FINANCE_VERSION", string("v1.0.0"));
        
        logDeploymentHeader();
        
        vm.startBroadcast();
        
        // 1. Deploy Infrastructure
        deployInfrastructure();
        
        // 2. Deploy Phase 1 - Governance
        deployPhase1();
        
        // 3. Deploy Phase 2 - Core Protocol
        deployPhase2();
        
        // 4. Deploy Phase 3 - Risk & Security
        deployPhase3();
        
        // 5. Deploy Phase 4 - Rewards & Treasury
        deployPhase4();
        
        // 6. Deploy Phase 5 - Liquidation
        deployPhase5();
        
        // 7. Deploy Token Templates
        deployTokenTemplates();
        
        // 8. Configure Protocol
        configureProtocol();
        
        vm.stopBroadcast();
        
        // 9. Validate Deployment
        validateDeployment();
        
        // 10. Save Deployment
        saveDeploymentAddresses();
        
        logDeploymentComplete();
    }
    
    function deployInfrastructure() internal {
        console.log("");
        console.log("=============================================");
        console.log("INFRASTRUCTURE: TradeFinanceRegistry (UUPS)");
        console.log("=============================================");
        
        // Deploy implementation
        TradeFinanceRegistry impl = new TradeFinanceRegistry();
        tradeFinanceRegistryImpl = address(impl);
        txCount++;
        console.log("  Implementation:", tradeFinanceRegistryImpl);
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            TradeFinanceRegistry.initialize.selector,
            superAdmin
        );
        ERC1967Proxy proxy = new ERC1967Proxy(tradeFinanceRegistryImpl, initData);
        tradeFinanceRegistry = TradeFinanceRegistry(address(proxy));
        txCount++;
        console.log("  Proxy:", address(tradeFinanceRegistry));
        console.log(unicode"  ✓ TradeFinanceRegistry deployed");
        console.log("=============================================");
    }
    
    function deployPhase1() internal {
        DeployPhase1Governance phase1 = new DeployPhase1Governance();
        phase1.run();
        
        // Collect addresses
        addresses.poolAddressesProvider = phase1.poolAddressesProvider();
        addresses.aclManager = phase1.aclManager();
        addresses.poolConfigurator = phase1.poolConfigurator();
        
        txCount += phase1.txCount();
    }
    
    function deployPhase2() internal {
        DeployPhase2CoreProtocol phase2 = new DeployPhase2CoreProtocol(
            addresses.poolAddressesProvider
        );
        phase2.run();
        
        // Collect addresses
        addresses.commodityLendingPool = phase2.commodityLendingPool();
        addresses.commodityOracle = phase2.commodityOracle();
        addresses.futuresCurveOracle = phase2.futuresCurveOracle();
        addresses.priceOracleSentinel = phase2.priceOracleSentinel();
        addresses.interestRateStrategyV2 = phase2.interestRateStrategyV2();
        addresses.interestRateStrategyV3 = phase2.interestRateStrategyV3();
        addresses.oracleConfigurator = phase2.oracleConfigurator();
        
        txCount += phase2.txCount();
    }
    
    function deployPhase3() internal {
        DeployPhase3RiskSecurity phase3 = new DeployPhase3RiskSecurity(
            addresses.poolAddressesProvider,
            addresses.commodityLendingPool,
            addresses.aclManager,
            addresses.commodityOracle
        );
        phase3.run();
        
        // Collect addresses
        addresses.haircutEngine = phase3.haircutEngine();
        addresses.circuitBreakers = phase3.circuitBreakers();
        addresses.emergencyModule = phase3.emergencyModule();
        
        txCount += phase3.txCount();
    }
    
    function deployPhase4() internal {
        DeployPhase4RewardsTreasury phase4 = new DeployPhase4RewardsTreasury(
            addresses.poolAddressesProvider
        );
        phase4.run();
        
        // Collect addresses
        addresses.rewardsController = phase4.rewardsController();
        addresses.emissionManager = phase4.emissionManager();
        addresses.rewardsDistributor = phase4.rewardsDistributor();
        addresses.collector = phase4.collector();
        addresses.protocolReserve = phase4.protocolReserve();
        addresses.revenueSplitter = phase4.revenueSplitter();
        
        txCount += phase4.txCount();
    }
    
    function deployPhase5() internal {
        DeployPhase5Liquidation phase5 = new DeployPhase5Liquidation(
            addresses.poolAddressesProvider,
            addresses.commodityLendingPool,
            addresses.aclManager,
            addresses.commodityOracle
        );
        phase5.run();
        
        // Collect addresses
        addresses.dutchAuctionLiquidator = phase5.dutchAuctionLiquidator();
        addresses.gracefulLiquidation = phase5.gracefulLiquidation();
        addresses.flashLiquidation = phase5.flashLiquidation();
        addresses.dexLiquidationAdapter = phase5.dexLiquidationAdapter();
        addresses.liquidationDataProvider = phase5.liquidationDataProvider();
        
        txCount += phase5.txCount();
    }
    
    function deployTokenTemplates() internal {
        console.log("");
        console.log("=============================================");
        console.log("TOKEN TEMPLATES");
        console.log("=============================================");
        
        // Deploy receipt token template (with placeholder values for template)
        receiptTokenImpl = new CommodityReceiptToken(
            addresses.commodityLendingPool,
            address(0), // underlyingCommodity - will be set during clone
            "Receipt Token Template",
            "cTEMPLATE"
        );
        txCount++;
        console.log("  ReceiptToken Implementation:", address(receiptTokenImpl));
        
        // Deploy debt token template (with placeholder values for template)
        debtTokenImpl = new CommodityDebtToken(
            ICommodityLendingPool(addresses.commodityLendingPool),
            "Debt Token Template",
            "dTEMPLATE",
            18  // decimals
        );
        txCount++;
        console.log("  DebtToken Implementation:", address(debtTokenImpl));
        
        console.log(unicode"  ✓ Token Templates deployed");
        console.log("=============================================");
    }
    
    function configureProtocol() internal {
        console.log("");
        console.log("=============================================");
        console.log("PROTOCOL CONFIGURATION");
        console.log("=============================================");
        
        // Set addresses in PoolAddressesProvider
        PoolAddressesProvider provider = PoolAddressesProvider(addresses.poolAddressesProvider);
        provider.setPool(addresses.commodityLendingPool);
        provider.setACLManager(addresses.aclManager);
        provider.setPriceOracle(addresses.commodityOracle);
        provider.setPoolConfigurator(addresses.poolConfigurator);
        txCount += 4;
        
        console.log(unicode"  ✓ PoolAddressesProvider configured");
        console.log("=============================================");
    }
    
    function validateDeployment() internal view {
        console.log("");
        console.log("=============================================");
        console.log("DEPLOYMENT VALIDATION");
        console.log("=============================================");
        
        // Validate Infrastructure
        require(address(tradeFinanceRegistry) != address(0), "Registry not deployed");
        console.log(unicode"[1/5] ✓ Infrastructure validated");
        
        // Validate Phase 1
        require(addresses.poolAddressesProvider != address(0), "Provider not deployed");
        require(addresses.aclManager != address(0), "ACLManager not deployed");
        require(addresses.poolConfigurator != address(0), "Configurator not deployed");
        console.log(unicode"[2/5] ✓ Phase 1 validated");
        
        // Validate Phase 2
        require(addresses.commodityLendingPool != address(0), "Pool not deployed");
        require(addresses.commodityOracle != address(0), "Oracle not deployed");
        console.log(unicode"[3/5] ✓ Phase 2 validated");
        
        // Validate Phase 3
        require(addresses.haircutEngine != address(0), "HaircutEngine not deployed");
        console.log(unicode"[4/5] ✓ Phase 3 validated");
        
        // Validate Phase 4
        require(addresses.rewardsController != address(0), "RewardsController not deployed");
        console.log(unicode"[5/5] ✓ Phase 4 validated");
        
        console.log("");
        console.log(unicode"✅ ALL VALIDATIONS PASSED");
        console.log("=============================================");
    }
    
    function saveDeploymentAddresses() internal {
        // Create deployment JSON
        string memory deploymentData = _buildDeploymentJSON();
        
        // Save to file
        string memory filename = string.concat(
            "deployments/trade-finance-complete-",
            vm.toString(block.chainid),
            "-",
            vm.toString(block.timestamp),
            ".json"
        );
        
        vm.writeFile(filename, deploymentData);
        console.log("Deployment saved to:", filename);
    }
    
    function _buildDeploymentJSON() internal view returns (string memory) {
        return string.concat(
            "{\n",
            '  "metadata": {\n',
            '    "network": "', getConfig().name, '",\n',
            '    "chainId": ', vm.toString(block.chainid), ',\n',
            '    "timestamp": ', vm.toString(block.timestamp), ',\n',
            '    "marketId": "', marketId, '",\n',
            '    "version": "', version, '",\n',
            '    "deployer": "', vm.toString(deployer), '",\n',
            '    "superAdmin": "', vm.toString(superAdmin), '",\n',
            '    "totalTransactions": ', vm.toString(txCount), '\n',
            '  },\n',
            '  "infrastructure": {\n',
            '    "tradeFinanceRegistry": "', vm.toString(address(tradeFinanceRegistry)), '"\n',
            '  },\n',
            '  "phase1": {\n',
            '    "poolAddressesProvider": "', vm.toString(addresses.poolAddressesProvider), '",\n',
            '    "aclManager": "', vm.toString(addresses.aclManager), '",\n',
            '    "poolConfigurator": "', vm.toString(addresses.poolConfigurator), '"\n',
            '  },\n',
            '  "phase2": {\n',
            '    "commodityLendingPool": "', vm.toString(addresses.commodityLendingPool), '",\n',
            '    "commodityOracle": "', vm.toString(addresses.commodityOracle), '",\n',
            '    "futuresCurveOracle": "', vm.toString(addresses.futuresCurveOracle), '",\n',
            '    "priceOracleSentinel": "', vm.toString(addresses.priceOracleSentinel), '"\n',
            '  },\n',
            '  "phase3": {\n',
            '    "haircutEngine": "', vm.toString(addresses.haircutEngine), '",\n',
            '    "circuitBreakers": "', vm.toString(addresses.circuitBreakers), '",\n',
            '    "emergencyModule": "', vm.toString(addresses.emergencyModule), '"\n',
            '  },\n',
            '  "phase4": {\n',
            '    "rewardsController": "', vm.toString(addresses.rewardsController), '",\n',
            '    "emissionManager": "', vm.toString(addresses.emissionManager), '",\n',
            '    "collector": "', vm.toString(addresses.collector), '"\n',
            '  },\n',
            '  "phase5": {\n',
            '    "dutchAuctionLiquidator": "', vm.toString(addresses.dutchAuctionLiquidator), '",\n',
            '    "gracefulLiquidation": "', vm.toString(addresses.gracefulLiquidation), '",\n',
            '    "flashLiquidation": "', vm.toString(addresses.flashLiquidation), '"\n',
            '  },\n',
            '  "tokens": {\n',
            '    "receiptTokenImpl": "', vm.toString(address(receiptTokenImpl)), '",\n',
            '    "debtTokenImpl": "', vm.toString(address(debtTokenImpl)), '"\n',
            '  }\n',
            "}"
        );
    }
    
    function logDeploymentHeader() internal view {
        console.log("=============================================");
        console.log("Trade Finance Complete Deployment (Modular)");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Super Admin:", superAdmin);
        console.log("Market ID:", marketId);
        console.log("Version:", version);
        console.log("Network:", getConfig().name);
        console.log("Chain ID:", block.chainid);
        console.log("=============================================");
    }
    
    function logDeploymentComplete() internal view {
        console.log("");
        console.log("=============================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("=============================================");
        console.log("Total Transactions:", txCount);
        console.log("=============================================");
    }
}
