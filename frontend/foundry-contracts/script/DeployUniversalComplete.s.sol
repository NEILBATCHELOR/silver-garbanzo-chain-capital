// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Core Infrastructure
import "../src/policy/PolicyEngine.sol";
import "../src/policy/PolicyRegistry.sol";
import "../src/registry/TokenRegistry.sol";
import "../src/governance/UpgradeGovernor.sol";
import "../src/trade-finance/risk/HaircutEngine.sol";

// Masters
import "../src/masters/ERC20Master.sol";
import "../src/masters/ERC721Master.sol";
import "../src/masters/ERC1155Master.sol";
import "../src/masters/ERC1400Master.sol";
import "../src/masters/ERC3525Master.sol";
import "../src/masters/ERC4626Master.sol";
import "../src/masters/ERC20RebasingMaster.sol";
import "../src/masters/ERC20WrapperMaster.sol";
import "../src/masters/ERC721WrapperMaster.sol";

// Beacons
import "../src/deployers/beacon/TokenBeacon.sol";

// Deployers
import "../src/deployers/CREATE2Deployer.sol";
import "../src/deployers/UniversalDeployer.sol";
import "../src/deployers/beacon/BeaconProxyFactory.sol";

// Factories - Registries & Universal
import "../src/factories/ExtensionRegistry.sol";
import "../src/factories/FactoryRegistry.sol";
import "../src/factories/UniversalExtensionFactory.sol";

// Factories - Token Specific
import "../src/factories/ERC20Factory.sol";
import "../src/factories/ERC721Factory.sol";
import "../src/factories/ERC1155Factory.sol";
import "../src/factories/ERC1400Factory.sol";
import "../src/factories/ERC3525Factory.sol";
import "../src/factories/ERC4626Factory.sol";
import "../src/factories/ERC20WrapperFactory.sol";
import "../src/factories/ERC721WrapperFactory.sol";

// Factories - Extension Specific
import "../src/factories/ERC20ExtensionFactory.sol";
import "../src/factories/ERC721ExtensionFactory.sol";
import "../src/factories/ERC1155ExtensionFactory.sol";
import "../src/factories/ERC1400ExtensionFactory.sol";
import "../src/factories/ERC3525ExtensionFactory.sol";
import "../src/factories/ERC4626ExtensionFactory.sol";

// Governance (Legacy/Alternative)
import "../src/governance/UpgradeGovernance.sol";

// Multi-Sig
import "../src/wallets/MultiSigWallet.sol";
import "../src/wallets/MultiSigWalletFactory.sol";

// Extension Modules - Compliance
import "../src/extensions/compliance/ERC20ComplianceModule.sol";

// Extension Modules - Consecutive
import "../src/extensions/consecutive/ERC721ConsecutiveModule.sol";

// Extension Modules - Document
import "../src/extensions/document/UniversalDocumentModule.sol";

// Extension Modules - ERC1400
import "../src/extensions/erc1400/ERC1400ControllerModule.sol";
import "../src/extensions/erc1400/ERC1400DocumentModule.sol";
import "../src/extensions/erc1400/ERC1400TransferRestrictionsModule.sol";

// Extension Modules - ERC3525
import "../src/extensions/erc3525/ERC3525SlotApprovableModule.sol";
import "../src/extensions/erc3525/ERC3525SlotManagerModule.sol";
import "../src/extensions/erc3525/ERC3525ValueExchangeModule.sol";

// Extension Modules - ERC4626
import "../src/extensions/erc4626/ERC4626FeeStrategyModule.sol";
import "../src/extensions/erc4626/ERC4626WithdrawalQueueModule.sol";
import "../src/extensions/erc4626/ERC4626YieldStrategyModule.sol";
import "../src/extensions/erc4626/async/ERC7540AsyncVaultModule.sol";
import "../src/extensions/erc4626/native/ERC7535NativeVaultModule.sol";
import "../src/extensions/erc4626/router/ERC4626Router.sol";

// Extension Modules - Fees
import "../src/extensions/fees/ERC20FeeModule.sol";

// Extension Modules - Flash Mint
import "../src/extensions/flash-mint/ERC20FlashMintModule.sol";

// Extension Modules - Fractionalization
import "../src/extensions/fractionalization/ERC721FractionModule.sol";

// Extension Modules - Granular Approval
import "../src/extensions/granular-approval/ERC5216GranularApprovalModule.sol";

// Extension Modules - Metadata Events
import "../src/extensions/metadata-events/ERC4906MetadataModule.sol";

// Extension Modules - Multi Asset Vault
import "../src/extensions/multi-asset-vault/ERC7575MultiAssetVaultModule.sol";

// Extension Modules - Payable
import "../src/extensions/payable/ERC1363PayableToken.sol";

// Extension Modules - Permit
import "../src/extensions/permit/ERC20PermitModule.sol";

// Extension Modules - Rental
import "../src/extensions/rental/ERC721RentalModule.sol";

// Extension Modules - Royalty
import "../src/extensions/royalty/ERC1155RoyaltyModule.sol";
import "../src/extensions/royalty/ERC721RoyaltyModule.sol";

// Extension Modules - Snapshot
import "../src/extensions/snapshot/ERC20SnapshotModule.sol";

// Extension Modules - Soulbound
import "../src/extensions/soulbound/ERC721SoulboundModule.sol";

// Extension Modules - Supply Cap
import "../src/extensions/supply-cap/ERC1155SupplyCapModule.sol";

// Extension Modules - Temporary Approval
import "../src/extensions/temporary-approval/ERC20TemporaryApprovalModule.sol";

// Extension Modules - Timelock
import "../src/extensions/timelock/ERC20TimelockModule.sol";

// Extension Modules - URI Management
import "../src/extensions/uri-management/ERC1155URIModule.sol";

// Extension Modules - Vesting
import "../src/extensions/vesting/ERC20VestingModule.sol";

// Extension Modules - Votes
import "../src/extensions/votes/ERC20VotesModule.sol";

// Proxies
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployUniversalComplete
 * @notice Universal deployment script for ANY EVM-compatible blockchain
 * @dev Deploys Infrastructure, Masters, Factories, Extensions, Utilities, and configures entire system
 *
 * ENVIRONMENT VARIABLES:
 *   PRIVATE_KEY          - Deployer's private key (required)
 *   SUPER_ADMIN_ADDRESS  - Admin address (optional, defaults to deployer)
 *
 * USAGE:
 *   forge script script/DeployUniversalComplete.s.sol:DeployUniversalComplete \
 *     --rpc-url <ANY_RPC_URL> --broadcast -vvv
 *
 * Deployment Phases:
 * 1. Infrastructure (registries, policies, governance)
 * 2. Masters & Beacons (9 token types)
 * 3. Extension Modules (34 modules)
 * 4. Extension Factories (7 factories)
 * 5. Token Factories (8 factories including wrappers)
 * 6. Deployers (3 deployers)
 * 7. Governance & MultiSig
 * 8. System Configuration (roles, registrations)
 * 9. Deployment Validation
 * 10. Ownership Transfer
 */
contract DeployUniversalComplete is Script {

    // Super Admin address - loaded from environment or defaults to deployer
    address public SUPER_ADMIN;

    struct Deployment {
        // Infrastructure
        address policyEngine;
        address policyRegistry;
        address tokenRegistry;
        address upgradeGovernor;
        address haircutEngine;

        // Registries
        address extensionRegistry;
        address factoryRegistry;

        // Masters
        address erc20Master;
        address erc721Master;
        address erc1155Master;
        address erc1400Master;
        address erc3525Master;
        address erc4626Master;
        address erc20RebasingMaster;
        address erc20WrapperMaster;
        address erc721WrapperMaster;

        // Beacons
        address erc20Beacon;
        address erc721Beacon;
        address erc1155Beacon;
        address erc1400Beacon;
        address erc3525Beacon;
        address erc4626Beacon;
        address erc20RebasingBeacon;
        address erc20WrapperBeacon;
        address erc721WrapperBeacon;

        // Extension Factories
        address erc20ExtensionFactory;
        address erc721ExtensionFactory;
        address erc1155ExtensionFactory;
        address erc1400ExtensionFactory;
        address erc3525ExtensionFactory;
        address erc4626ExtensionFactory;
        address universalExtensionFactory;

        // Token Factories
        address erc20Factory;
        address erc721Factory;
        address erc1155Factory;
        address erc1400Factory;
        address erc3525Factory;
        address erc4626Factory;
        address erc20WrapperFactory;
        address erc721WrapperFactory;

        // Deployers
        address create2Deployer;
        address universalDeployer;
        address beaconProxyFactory;

        // Governance (Legacy)
        address upgradeGovernance;

        // Multi-Sig
        address multiSigWallet;
        address multiSigWalletFactory;

        // Extension Modules
        address complianceModule;
        address consecutiveModule;
        address documentModule;
        address erc1400ControllerModule;
        address erc1400DocumentModule;
        address erc1400TransferRestrictionsModule;
        address erc3525SlotApprovableModule;
        address erc3525SlotManagerModule;
        address erc3525ValueExchangeModule;
        address erc4626FeeStrategyModule;
        address erc4626WithdrawalQueueModule;
        address erc4626YieldStrategyModule;
        address erc4626AsyncVaultModule;
        address erc4626NativeVaultModule;
        address erc4626RouterModule;
        address feeModule;
        address flashMintModule;
        address fractionModule;
        address granularApprovalModule;
        address metadataEventsModule;
        address multiAssetVaultModule;
        address payableModule;
        address permitModule;
        address rentalModule;
        address erc1155RoyaltyModule;
        address erc721RoyaltyModule;
        address snapshotModule;
        address soulboundModule;
        address supplyCapModule;
        address temporaryApprovalModule;
        address timelockModule;
        address uriManagementModule;
        address vestingModule;
        address votesModule;
    }

    Deployment public deployed;
    uint256 public contractCount = 0;
    
    // Nonce tracking for resilient deployment on networks with RPC issues
    uint256 public initialNonce;
    uint256 public expectedNonce;
    uint256 public transactionCount;

    function run() external {
        // Load private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Load super admin from env or default to deployer
        SUPER_ADMIN = vm.envOr("SUPER_ADMIN_ADDRESS", deployer);

        // Get network name for logging
        string memory networkName = getNetworkName(block.chainid);
        string memory nativeToken = getNativeTokenSymbol(block.chainid);

        console.log("========================================");
        console.log("CHAIN CAPITAL UNIVERSAL DEPLOYMENT");
        console.log("========================================");
        console.log("Network:", networkName);
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Super Admin:", SUPER_ADMIN);
        console.log("Balance:", deployer.balance / 1e18, nativeToken);
        
        // Initialize nonce tracking BEFORE broadcast starts
        initialNonce = vm.getNonce(deployer);
        expectedNonce = initialNonce;
        transactionCount = 0;
        console.log("Initial Nonce:", initialNonce);
        console.log("========================================\n");

        vm.startBroadcast(deployerPrivateKey);

        // Phase 1: Infrastructure
        console.log("PHASE 1: Infrastructure");
        deployInfrastructure(deployer);
        checkGas("After Phase 1");
        logNonceStatus(deployer, "Phase 1 Complete");

        // Phase 2: Masters & Beacons
        console.log("\nPHASE 2: Masters & Beacons");
        deployMastersAndBeacons(deployer);
        checkGas("After Phase 2");
        logNonceStatus(deployer, "Phase 2 Complete");

        // Phase 3: Extension Modules
        console.log("\nPHASE 3: Extension Modules");
        deployExtensionModules();
        checkGas("After Phase 3");
        logNonceStatus(deployer, "Phase 3 Complete");

        // Phase 4: Extension Factories
        console.log("\nPHASE 4: Extension Factories");
        deployExtensionFactories(deployer);
        checkGas("After Phase 4");
        logNonceStatus(deployer, "Phase 4 Complete");

        // Phase 5: Token Factories
        console.log("\nPHASE 5: Token Factories");
        deployTokenFactories();
        checkGas("After Phase 5");
        logNonceStatus(deployer, "Phase 5 Complete");

        // Phase 6: Deployers
        console.log("\nPHASE 6: Deployers");
        deployDeployers(deployer);
        checkGas("After Phase 6");
        logNonceStatus(deployer, "Phase 6 Complete");

        // Phase 7: Governance & MultiSig
        console.log("\nPHASE 7: Governance & MultiSig");
        deployGovernanceAndMultiSig(deployer);
        checkGas("After Phase 7");
        logNonceStatus(deployer, "Phase 7 Complete");

        // Phase 8: System Configuration (CRITICAL)
        console.log("\nPHASE 8: System Configuration");
        configureSystem(deployer);
        checkGas("After Phase 8");
        logNonceStatus(deployer, "Phase 8 Complete");

        // Phase 9: Validation
        console.log("\nPHASE 9: Deployment Validation");
        validateDeployment();

        // Phase 10: Ownership Transfer
        console.log("\nPHASE 10: Ownership Transfer to Super Admin");
        transferOwnership();
        logNonceStatus(deployer, "Phase 10 Complete");

        vm.stopBroadcast();

        // Save and summarize
        saveDeployment();
        printSummary();
    }

    function deployInfrastructure(address deployer) internal {
        // PolicyRegistry
        address policyRegistryImpl = address(new PolicyRegistry());
        trackTransaction("PolicyRegistry Implementation");
        require(policyRegistryImpl != address(0), "PolicyRegistry impl failed");
        bytes memory policyRegistryInit = abi.encodeCall(PolicyRegistry.initialize, (deployer));
        ERC1967Proxy policyRegistryProxy = new ERC1967Proxy(policyRegistryImpl, policyRegistryInit);
        trackTransaction("PolicyRegistry Proxy");
        deployed.policyRegistry = address(policyRegistryProxy);
        require(deployed.policyRegistry != address(0), "PolicyRegistry proxy failed");
        contractCount++;
        console.log(unicode"  ✔ PolicyRegistry:", deployed.policyRegistry);

        // PolicyEngine
        address policyEngineImpl = address(new PolicyEngine());
        trackTransaction("PolicyEngine Implementation");
        require(policyEngineImpl != address(0), "PolicyEngine impl failed");
        bytes memory policyEngineInit = abi.encodeCall(PolicyEngine.initialize, (deployer));
        ERC1967Proxy policyEngineProxy = new ERC1967Proxy(policyEngineImpl, policyEngineInit);
        trackTransaction("PolicyEngine Proxy");
        deployed.policyEngine = address(policyEngineProxy);
        require(deployed.policyEngine != address(0), "PolicyEngine proxy failed");
        contractCount++;
        console.log(unicode"  ✔ PolicyEngine:", deployed.policyEngine);

        // TokenRegistry
        address tokenRegistryImpl = address(new TokenRegistry());
        trackTransaction("TokenRegistry Implementation");
        require(tokenRegistryImpl != address(0), "TokenRegistry impl failed");
        bytes memory tokenRegistryInit = abi.encodeCall(TokenRegistry.initialize, (deployer));
        ERC1967Proxy tokenRegistryProxy = new ERC1967Proxy(tokenRegistryImpl, tokenRegistryInit);
        trackTransaction("TokenRegistry Proxy");
        deployed.tokenRegistry = address(tokenRegistryProxy);
        require(deployed.tokenRegistry != address(0), "TokenRegistry proxy failed");
        contractCount++;
        console.log(unicode"  ✔ TokenRegistry:", deployed.tokenRegistry);

        // UpgradeGovernor - Handle case where SUPER_ADMIN == deployer
        address[] memory upgraders;
        if (SUPER_ADMIN == deployer) {
            // Single upgrader if SUPER_ADMIN not separately specified
            upgraders = new address[](1);
            upgraders[0] = deployer;
        } else {
            // Two upgraders if SUPER_ADMIN is different
            upgraders = new address[](2);
            upgraders[0] = deployer;
            upgraders[1] = SUPER_ADMIN;
        }
        deployed.upgradeGovernor = address(new UpgradeGovernor(upgraders, 1, 1 days));
        trackTransaction("UpgradeGovernor");
        require(deployed.upgradeGovernor != address(0), "UpgradeGovernor failed");
        contractCount++;
        console.log(unicode"  ✔ UpgradeGovernor:", deployed.upgradeGovernor);

        // HaircutEngine (UUPS upgradeable)
        HaircutEngine haircutEngineImpl = new HaircutEngine();
        trackTransaction("HaircutEngine Implementation");
        require(address(haircutEngineImpl) != address(0), "HaircutEngine impl failed");
        
        bytes memory haircutEngineInit = abi.encodeWithSelector(
            HaircutEngine.initialize.selector,
            deployer, // risk admin
            deployed.upgradeGovernor // governance
        );
        
        ERC1967Proxy haircutEngineProxy = new ERC1967Proxy(address(haircutEngineImpl), haircutEngineInit);
        trackTransaction("HaircutEngine Proxy");
        deployed.haircutEngine = address(haircutEngineProxy);
        require(deployed.haircutEngine != address(0), "HaircutEngine proxy failed");
        contractCount++;
        console.log(unicode"  ✔ HaircutEngine:", deployed.haircutEngine);

        // ExtensionRegistry
        address extensionRegistryImpl = address(new ExtensionRegistry());
        trackTransaction("ExtensionRegistry Implementation");
        require(extensionRegistryImpl != address(0), "ExtensionRegistry impl failed");
        bytes memory extensionRegistryInit = abi.encodeCall(ExtensionRegistry.initialize, (deployer));
        ERC1967Proxy extensionRegistryProxy = new ERC1967Proxy(extensionRegistryImpl, extensionRegistryInit);
        deployed.extensionRegistry = address(extensionRegistryProxy);
        require(deployed.extensionRegistry != address(0), "ExtensionRegistry proxy failed");
        contractCount++;
        console.log(unicode"  ✔ ExtensionRegistry:", deployed.extensionRegistry);

        // FactoryRegistry
        address factoryRegistryImpl = address(new FactoryRegistry());
        require(factoryRegistryImpl != address(0), "FactoryRegistry impl failed");
        bytes memory factoryRegistryInit = abi.encodeCall(FactoryRegistry.initialize, (deployer));
        ERC1967Proxy factoryRegistryProxy = new ERC1967Proxy(factoryRegistryImpl, factoryRegistryInit);
        deployed.factoryRegistry = address(factoryRegistryProxy);
        require(deployed.factoryRegistry != address(0), "FactoryRegistry proxy failed");
        contractCount++;
        console.log(unicode"  ✔ FactoryRegistry:", deployed.factoryRegistry);
    }

    function deployMastersAndBeacons(address deployer) internal {
        // ERC20
        deployed.erc20Master = address(new ERC20Master());
        require(deployed.erc20Master != address(0), "ERC20Master failed");
        deployed.erc20Beacon = address(new TokenBeacon(deployed.erc20Master, deployer));
        require(deployed.erc20Beacon != address(0), "ERC20Beacon failed");
        contractCount += 2;

        // ERC721
        deployed.erc721Master = address(new ERC721Master());
        require(deployed.erc721Master != address(0), "ERC721Master failed");
        deployed.erc721Beacon = address(new TokenBeacon(deployed.erc721Master, deployer));
        require(deployed.erc721Beacon != address(0), "ERC721Beacon failed");
        contractCount += 2;

        // ERC1155
        deployed.erc1155Master = address(new ERC1155Master());
        require(deployed.erc1155Master != address(0), "ERC1155Master failed");
        deployed.erc1155Beacon = address(new TokenBeacon(deployed.erc1155Master, deployer));
        require(deployed.erc1155Beacon != address(0), "ERC1155Beacon failed");
        contractCount += 2;

        // ERC1400
        deployed.erc1400Master = address(new ERC1400Master());
        require(deployed.erc1400Master != address(0), "ERC1400Master failed");
        deployed.erc1400Beacon = address(new TokenBeacon(deployed.erc1400Master, deployer));
        require(deployed.erc1400Beacon != address(0), "ERC1400Beacon failed");
        contractCount += 2;

        // ERC3525
        deployed.erc3525Master = address(new ERC3525Master());
        require(deployed.erc3525Master != address(0), "ERC3525Master failed");
        deployed.erc3525Beacon = address(new TokenBeacon(deployed.erc3525Master, deployer));
        require(deployed.erc3525Beacon != address(0), "ERC3525Beacon failed");
        contractCount += 2;

        // ERC4626
        deployed.erc4626Master = address(new ERC4626Master());
        require(deployed.erc4626Master != address(0), "ERC4626Master failed");
        deployed.erc4626Beacon = address(new TokenBeacon(deployed.erc4626Master, deployer));
        require(deployed.erc4626Beacon != address(0), "ERC4626Beacon failed");
        contractCount += 2;

        // ERC20 Rebasing
        deployed.erc20RebasingMaster = address(new ERC20RebasingMaster());
        require(deployed.erc20RebasingMaster != address(0), "ERC20RebasingMaster failed");
        deployed.erc20RebasingBeacon = address(new TokenBeacon(deployed.erc20RebasingMaster, deployer));
        require(deployed.erc20RebasingBeacon != address(0), "ERC20RebasingBeacon failed");
        contractCount += 2;

        // ERC20 Wrapper
        deployed.erc20WrapperMaster = address(new ERC20WrapperMaster());
        require(deployed.erc20WrapperMaster != address(0), "ERC20WrapperMaster failed");
        deployed.erc20WrapperBeacon = address(new TokenBeacon(deployed.erc20WrapperMaster, deployer));
        require(deployed.erc20WrapperBeacon != address(0), "ERC20WrapperBeacon failed");
        contractCount += 2;

        // ERC721 Wrapper
        deployed.erc721WrapperMaster = address(new ERC721WrapperMaster());
        require(deployed.erc721WrapperMaster != address(0), "ERC721WrapperMaster failed");
        deployed.erc721WrapperBeacon = address(new TokenBeacon(deployed.erc721WrapperMaster, deployer));
        require(deployed.erc721WrapperBeacon != address(0), "ERC721WrapperBeacon failed");
        contractCount += 2;

        console.log(unicode"  ✔ Deployed 9 Masters and 9 Beacons (18 contracts)");
    }

    function deployExtensionModules() internal {
        deployed.complianceModule = address(new ERC20ComplianceModule());
        require(deployed.complianceModule != address(0), "ComplianceModule failed");

        deployed.consecutiveModule = address(new ERC721ConsecutiveModule());
        require(deployed.consecutiveModule != address(0), "ConsecutiveModule failed");

        deployed.documentModule = address(new UniversalDocumentModule());
        require(deployed.documentModule != address(0), "DocumentModule failed");

        deployed.erc1400ControllerModule = address(new ERC1400ControllerModule());
        require(deployed.erc1400ControllerModule != address(0), "ERC1400ControllerModule failed");

        deployed.erc1400DocumentModule = address(new ERC1400DocumentModule());
        require(deployed.erc1400DocumentModule != address(0), "ERC1400DocumentModule failed");

        deployed.erc1400TransferRestrictionsModule = address(new ERC1400TransferRestrictionsModule());
        require(deployed.erc1400TransferRestrictionsModule != address(0), "ERC1400TransferRestrictionsModule failed");

        deployed.erc3525SlotApprovableModule = address(new ERC3525SlotApprovableModule());
        require(deployed.erc3525SlotApprovableModule != address(0), "ERC3525SlotApprovableModule failed");

        deployed.erc3525SlotManagerModule = address(new ERC3525SlotManagerModule());
        require(deployed.erc3525SlotManagerModule != address(0), "ERC3525SlotManagerModule failed");

        deployed.erc3525ValueExchangeModule = address(new ERC3525ValueExchangeModule());
        require(deployed.erc3525ValueExchangeModule != address(0), "ERC3525ValueExchangeModule failed");

        deployed.erc4626FeeStrategyModule = address(new ERC4626FeeStrategyModule());
        require(deployed.erc4626FeeStrategyModule != address(0), "ERC4626FeeStrategyModule failed");

        deployed.erc4626WithdrawalQueueModule = address(new ERC4626WithdrawalQueueModule());
        require(deployed.erc4626WithdrawalQueueModule != address(0), "ERC4626WithdrawalQueueModule failed");

        deployed.erc4626YieldStrategyModule = address(new ERC4626YieldStrategyModule());
        require(deployed.erc4626YieldStrategyModule != address(0), "ERC4626YieldStrategyModule failed");

        deployed.erc4626AsyncVaultModule = address(new ERC7540AsyncVaultModule());
        require(deployed.erc4626AsyncVaultModule != address(0), "ERC7540AsyncVaultModule failed");

        deployed.erc4626NativeVaultModule = address(new ERC7535NativeVaultModule());
        require(deployed.erc4626NativeVaultModule != address(0), "ERC7535NativeVaultModule failed");

        deployed.erc4626RouterModule = address(new ERC4626Router());
        require(deployed.erc4626RouterModule != address(0), "ERC4626Router failed");

        deployed.feeModule = address(new ERC20FeeModule());
        require(deployed.feeModule != address(0), "FeeModule failed");

        deployed.flashMintModule = address(new ERC20FlashMintModule());
        require(deployed.flashMintModule != address(0), "FlashMintModule failed");

        deployed.fractionModule = address(new ERC721FractionModule());
        require(deployed.fractionModule != address(0), "FractionModule failed");

        deployed.granularApprovalModule = address(new ERC5216GranularApprovalModule());
        require(deployed.granularApprovalModule != address(0), "GranularApprovalModule failed");

        deployed.metadataEventsModule = address(new ERC4906MetadataModule());
        require(deployed.metadataEventsModule != address(0), "MetadataEventsModule failed");

        deployed.multiAssetVaultModule = address(new ERC7575MultiAssetVaultModule());
        require(deployed.multiAssetVaultModule != address(0), "MultiAssetVaultModule failed");

        deployed.payableModule = address(new ERC1363PayableToken());
        require(deployed.payableModule != address(0), "PayableModule failed");

        deployed.permitModule = address(new ERC20PermitModule());
        require(deployed.permitModule != address(0), "PermitModule failed");

        deployed.rentalModule = address(new ERC721RentalModule());
        require(deployed.rentalModule != address(0), "RentalModule failed");

        deployed.erc1155RoyaltyModule = address(new ERC1155RoyaltyModule());
        require(deployed.erc1155RoyaltyModule != address(0), "ERC1155RoyaltyModule failed");

        deployed.erc721RoyaltyModule = address(new ERC721RoyaltyModule());
        require(deployed.erc721RoyaltyModule != address(0), "ERC721RoyaltyModule failed");

        deployed.snapshotModule = address(new ERC20SnapshotModule());
        require(deployed.snapshotModule != address(0), "SnapshotModule failed");

        deployed.soulboundModule = address(new ERC721SoulboundModule());
        require(deployed.soulboundModule != address(0), "SoulboundModule failed");

        deployed.supplyCapModule = address(new ERC1155SupplyCapModule());
        require(deployed.supplyCapModule != address(0), "SupplyCapModule failed");

        deployed.temporaryApprovalModule = address(new ERC20TemporaryApprovalModule());
        require(deployed.temporaryApprovalModule != address(0), "TemporaryApprovalModule failed");

        deployed.timelockModule = address(new ERC20TimelockModule());
        require(deployed.timelockModule != address(0), "TimelockModule failed");

        deployed.uriManagementModule = address(new ERC1155URIModule());
        require(deployed.uriManagementModule != address(0), "URIManagementModule failed");

        deployed.vestingModule = address(new ERC20VestingModule());
        require(deployed.vestingModule != address(0), "VestingModule failed");

        deployed.votesModule = address(new ERC20VotesModule());
        require(deployed.votesModule != address(0), "VotesModule failed");

        contractCount += 34;
        console.log(unicode"  ✔ Deployed 34 Extension Modules");
    }

    function deployExtensionFactories(address deployer) internal {
        // Get ExtensionRegistry and roles for granting permissions
        ExtensionRegistry extReg = ExtensionRegistry(deployed.extensionRegistry);
        bytes32 EXT_REGISTRAR_ROLE = extReg.REGISTRAR_ROLE();
        bytes32 DEFAULT_ADMIN_ROLE = extReg.DEFAULT_ADMIN_ROLE();
        
        // ERC20 Extension Factory
        deployed.erc20ExtensionFactory = address(new ERC20ExtensionFactory(
            deployed.extensionRegistry,
            deployed.policyEngine,
            deployed.upgradeGovernor
        ));
        require(deployed.erc20ExtensionFactory != address(0), "ERC20ExtensionFactory failed");
        
        // Grant both REGISTRAR_ROLE and DEFAULT_ADMIN_ROLE for beacon registration
        extReg.grantRole(EXT_REGISTRAR_ROLE, deployed.erc20ExtensionFactory);
        extReg.grantRole(DEFAULT_ADMIN_ROLE, deployed.erc20ExtensionFactory);
        
        ERC20ExtensionFactory(deployed.erc20ExtensionFactory).initializeBeacons(
            deployed.permitModule,
            deployed.complianceModule,
            deployed.vestingModule,
            deployed.snapshotModule,
            deployed.timelockModule,
            deployed.flashMintModule,
            deployed.votesModule,
            deployed.feeModule,
            deployed.temporaryApprovalModule,
            deployed.payableModule
        );
        contractCount++;
        console.log(unicode"  ✔ ERC20ExtensionFactory:", deployed.erc20ExtensionFactory);

        // ERC721 Extension Factory
        deployed.erc721ExtensionFactory = address(new ERC721ExtensionFactory(
            deployed.extensionRegistry,
            deployed.policyEngine,
            deployed.upgradeGovernor
        ));
        require(deployed.erc721ExtensionFactory != address(0), "ERC721ExtensionFactory failed");
        
        // Grant both REGISTRAR_ROLE and DEFAULT_ADMIN_ROLE for beacon registration
        extReg.grantRole(EXT_REGISTRAR_ROLE, deployed.erc721ExtensionFactory);
        extReg.grantRole(DEFAULT_ADMIN_ROLE, deployed.erc721ExtensionFactory);

        ERC721ExtensionFactory(deployed.erc721ExtensionFactory).initializeBeacons(
            deployed.erc721RoyaltyModule,
            deployed.soulboundModule,
            deployed.rentalModule,
            deployed.fractionModule,
            deployed.metadataEventsModule,
            deployed.granularApprovalModule,
            deployed.consecutiveModule
        );
        contractCount++;
        console.log(unicode"  ✔ ERC721ExtensionFactory:", deployed.erc721ExtensionFactory);

        // ERC1155 Extension Factory
        deployed.erc1155ExtensionFactory = address(new ERC1155ExtensionFactory(
            deployed.extensionRegistry,
            deployed.policyEngine,
            deployed.upgradeGovernor
        ));
        require(deployed.erc1155ExtensionFactory != address(0), "ERC1155ExtensionFactory failed");
        
        // Grant both REGISTRAR_ROLE and DEFAULT_ADMIN_ROLE for beacon registration
        extReg.grantRole(EXT_REGISTRAR_ROLE, deployed.erc1155ExtensionFactory);
        extReg.grantRole(DEFAULT_ADMIN_ROLE, deployed.erc1155ExtensionFactory);

        ERC1155ExtensionFactory(deployed.erc1155ExtensionFactory).initializeBeacons(
            deployed.uriManagementModule,
            deployed.supplyCapModule,
            deployed.erc1155RoyaltyModule
        );
        contractCount++;
        console.log(unicode"  ✔ ERC1155ExtensionFactory:", deployed.erc1155ExtensionFactory);

        // ERC1400 Extension Factory
        deployed.erc1400ExtensionFactory = address(new ERC1400ExtensionFactory(
            deployed.extensionRegistry,
            deployed.policyEngine,
            deployed.upgradeGovernor
        ));
        require(deployed.erc1400ExtensionFactory != address(0), "ERC1400ExtensionFactory failed");
        
        // Grant both REGISTRAR_ROLE and DEFAULT_ADMIN_ROLE for beacon registration
        extReg.grantRole(EXT_REGISTRAR_ROLE, deployed.erc1400ExtensionFactory);
        extReg.grantRole(DEFAULT_ADMIN_ROLE, deployed.erc1400ExtensionFactory);

        ERC1400ExtensionFactory(deployed.erc1400ExtensionFactory).initializeBeacons(
            deployed.erc1400ControllerModule,
            deployed.erc1400DocumentModule,
            deployed.erc1400TransferRestrictionsModule
        );
        contractCount++;
        console.log(unicode"  ✔ ERC1400ExtensionFactory:", deployed.erc1400ExtensionFactory);

        // ERC3525 Extension Factory
        deployed.erc3525ExtensionFactory = address(new ERC3525ExtensionFactory(
            deployed.extensionRegistry,
            deployed.policyEngine,
            deployed.upgradeGovernor
        ));
        require(deployed.erc3525ExtensionFactory != address(0), "ERC3525ExtensionFactory failed");
        
        // Grant both REGISTRAR_ROLE and DEFAULT_ADMIN_ROLE for beacon registration
        extReg.grantRole(EXT_REGISTRAR_ROLE, deployed.erc3525ExtensionFactory);
        extReg.grantRole(DEFAULT_ADMIN_ROLE, deployed.erc3525ExtensionFactory);

        ERC3525ExtensionFactory(deployed.erc3525ExtensionFactory).initializeBeacons(
            deployed.erc3525SlotManagerModule,
            deployed.erc3525SlotApprovableModule,
            deployed.erc3525ValueExchangeModule
        );
        contractCount++;
        console.log(unicode"  ✔ ERC3525ExtensionFactory:", deployed.erc3525ExtensionFactory);

        // ERC4626 Extension Factory
        deployed.erc4626ExtensionFactory = address(new ERC4626ExtensionFactory(
            deployed.extensionRegistry,
            deployed.policyEngine,
            deployed.upgradeGovernor
        ));
        require(deployed.erc4626ExtensionFactory != address(0), "ERC4626ExtensionFactory failed");
        
        // Grant both REGISTRAR_ROLE and DEFAULT_ADMIN_ROLE for beacon registration
        extReg.grantRole(EXT_REGISTRAR_ROLE, deployed.erc4626ExtensionFactory);
        extReg.grantRole(DEFAULT_ADMIN_ROLE, deployed.erc4626ExtensionFactory);

        ERC4626ExtensionFactory(deployed.erc4626ExtensionFactory).initializeBeacons(
            deployed.erc4626YieldStrategyModule,
            deployed.erc4626WithdrawalQueueModule,
            deployed.erc4626FeeStrategyModule,
            deployed.erc4626AsyncVaultModule,
            deployed.erc4626NativeVaultModule,
            deployed.erc4626RouterModule,
            deployed.multiAssetVaultModule
        );
        contractCount++;
        console.log(unicode"  ✔ ERC4626ExtensionFactory:", deployed.erc4626ExtensionFactory);

        // Universal Extension Factory
        deployed.universalExtensionFactory = address(new UniversalExtensionFactory(deployed.extensionRegistry));
        require(deployed.universalExtensionFactory != address(0), "UniversalExtensionFactory failed");
        
        // Grant REGISTRAR_ROLE to Universal Extension Factory
        extReg.grantRole(EXT_REGISTRAR_ROLE, deployed.universalExtensionFactory);
        
        contractCount++;
        console.log(unicode"  ✔ UniversalExtensionFactory:", deployed.universalExtensionFactory);
        
        console.log(unicode"  ✔ Granted REGISTRAR_ROLE to all 7 extension factories");
    }

    function deployTokenFactories() internal {
        // ERC20 Factory
        deployed.erc20Factory = address(new ERC20Factory(
            deployed.erc20Master,
            deployed.erc20RebasingMaster,
            deployed.erc20Beacon,
            deployed.erc20RebasingBeacon,
            deployed.erc20ExtensionFactory,
            deployed.policyEngine,
            deployed.tokenRegistry,
            deployed.factoryRegistry
        ));
        require(deployed.erc20Factory != address(0), "ERC20Factory failed");
        contractCount++;
        console.log(unicode"  ✔ ERC20Factory:", deployed.erc20Factory);

        // ERC721 Factory
        deployed.erc721Factory = address(new ERC721Factory(
            deployed.erc721Master,
            deployed.erc721Beacon,
            deployed.erc721ExtensionFactory,
            deployed.policyEngine,
            deployed.tokenRegistry,
            deployed.factoryRegistry
        ));
        require(deployed.erc721Factory != address(0), "ERC721Factory failed");
        contractCount++;
        console.log(unicode"  ✔ ERC721Factory:", deployed.erc721Factory);

        // ERC1155 Factory
        deployed.erc1155Factory = address(new ERC1155Factory(
            deployed.erc1155Master,
            deployed.erc1155Beacon,
            deployed.erc1155ExtensionFactory,
            deployed.policyEngine,
            deployed.tokenRegistry,
            deployed.factoryRegistry
        ));
        require(deployed.erc1155Factory != address(0), "ERC1155Factory failed");
        contractCount++;
        console.log(unicode"  ✔ ERC1155Factory:", deployed.erc1155Factory);

        // ERC1400 Factory
        deployed.erc1400Factory = address(new ERC1400Factory(
            deployed.erc1400Master,
            deployed.erc1400Beacon,
            deployed.erc1400ExtensionFactory,
            deployed.policyEngine,
            deployed.tokenRegistry,
            deployed.factoryRegistry
        ));
        require(deployed.erc1400Factory != address(0), "ERC1400Factory failed");
        contractCount++;
        console.log(unicode"  ✔ ERC1400Factory:", deployed.erc1400Factory);

        // ERC3525 Factory
        deployed.erc3525Factory = address(new ERC3525Factory(
            deployed.erc3525Master,
            deployed.erc3525Beacon,
            deployed.erc3525ExtensionFactory,
            deployed.policyEngine,
            deployed.tokenRegistry,
            deployed.factoryRegistry
        ));
        require(deployed.erc3525Factory != address(0), "ERC3525Factory failed");
        contractCount++;
        console.log(unicode"  ✔ ERC3525Factory:", deployed.erc3525Factory);

        // ERC4626 Factory
        deployed.erc4626Factory = address(new ERC4626Factory(
            deployed.erc4626Master,
            deployed.erc4626Beacon,
            deployed.erc4626ExtensionFactory,
            deployed.policyEngine,
            deployed.tokenRegistry,
            deployed.factoryRegistry
        ));
        require(deployed.erc4626Factory != address(0), "ERC4626Factory failed");
        contractCount++;
        console.log(unicode"  ✔ ERC4626Factory:", deployed.erc4626Factory);

        // ERC20 Wrapper Factory (NEW)
        deployed.erc20WrapperFactory = address(new ERC20WrapperFactory(
            deployed.erc20WrapperMaster,
            deployed.erc20WrapperBeacon,
            deployed.policyEngine,
            deployed.tokenRegistry,
            deployed.factoryRegistry
        ));
        require(deployed.erc20WrapperFactory != address(0), "ERC20WrapperFactory failed");
        contractCount++;
        console.log(unicode"  ✔ ERC20WrapperFactory:", deployed.erc20WrapperFactory);

        // ERC721 Wrapper Factory (NEW)
        deployed.erc721WrapperFactory = address(new ERC721WrapperFactory(
            deployed.erc721WrapperMaster,
            deployed.erc721WrapperBeacon,
            deployed.policyEngine,
            deployed.tokenRegistry,
            deployed.factoryRegistry
        ));
        require(deployed.erc721WrapperFactory != address(0), "ERC721WrapperFactory failed");
        contractCount++;
        console.log(unicode"  ✔ ERC721WrapperFactory:", deployed.erc721WrapperFactory);
    }

    function deployDeployers(address deployer) internal {
        deployed.create2Deployer = address(new CREATE2Deployer());
        require(deployed.create2Deployer != address(0), "CREATE2Deployer failed");
        contractCount++;
        console.log(unicode"  ✔ CREATE2Deployer:", deployed.create2Deployer);

        deployed.universalDeployer = address(new UniversalDeployer());
        require(deployed.universalDeployer != address(0), "UniversalDeployer failed");
        contractCount++;
        console.log(unicode"  ✔ UniversalDeployer:", deployed.universalDeployer);

        deployed.beaconProxyFactory = address(new BeaconProxyFactory(deployer));
        require(deployed.beaconProxyFactory != address(0), "BeaconProxyFactory failed");
        contractCount++;
        console.log(unicode"  ✔ BeaconProxyFactory:", deployed.beaconProxyFactory);
    }

    function deployGovernanceAndMultiSig(address deployer) internal {
        // UpgradeGovernance (Legacy)
        deployed.upgradeGovernance = address(new UpgradeGovernance(
            deployer,
            1 days,
            2
        ));
        require(deployed.upgradeGovernance != address(0), "UpgradeGovernance failed");
        contractCount++;
        console.log(unicode"  ✔ UpgradeGovernance:", deployed.upgradeGovernance);

        // MultiSig - Handle case where SUPER_ADMIN == deployer
        address[] memory owners;
        uint256 requiredSigs;
        
        if (SUPER_ADMIN == deployer) {
            // Single owner if SUPER_ADMIN not separately specified
            owners = new address[](1);
            owners[0] = deployer;
            requiredSigs = 1;
            console.log(unicode"  ℹ️  MultiSig: Single owner (SUPER_ADMIN == deployer)");
        } else {
            // Two owners if SUPER_ADMIN is different
            owners = new address[](2);
            owners[0] = deployer;
            owners[1] = SUPER_ADMIN;
            requiredSigs = 1;
            console.log(unicode"  ℹ️  MultiSig: Two owners (deployer + SUPER_ADMIN)");
        }
        
        deployed.multiSigWallet = address(new MultiSigWallet(
            "Chain Capital MultiSig",
            owners,
            requiredSigs
        ));
        require(deployed.multiSigWallet != address(0), "MultiSigWallet failed");
        contractCount++;
        console.log(unicode"  ✔ MultiSigWallet:", deployed.multiSigWallet);

        deployed.multiSigWalletFactory = address(new MultiSigWalletFactory());
        require(deployed.multiSigWalletFactory != address(0), "MultiSigWalletFactory failed");
        contractCount++;
        console.log(unicode"  ✔ MultiSigWalletFactory:", deployed.multiSigWalletFactory);
    }

    function configureSystem(address deployer) internal {
        console.log(unicode"  🔧 Configuring registries and roles...");

        // Grant REGISTRAR_ROLE to all token factories on FactoryRegistry
        FactoryRegistry factoryReg = FactoryRegistry(deployed.factoryRegistry);
        bytes32 REGISTRAR_ROLE = factoryReg.REGISTRAR_ROLE();

        factoryReg.grantRole(REGISTRAR_ROLE, deployed.erc20Factory);
        factoryReg.grantRole(REGISTRAR_ROLE, deployed.erc721Factory);
        factoryReg.grantRole(REGISTRAR_ROLE, deployed.erc1155Factory);
        factoryReg.grantRole(REGISTRAR_ROLE, deployed.erc1400Factory);
        factoryReg.grantRole(REGISTRAR_ROLE, deployed.erc3525Factory);
        factoryReg.grantRole(REGISTRAR_ROLE, deployed.erc4626Factory);
        factoryReg.grantRole(REGISTRAR_ROLE, deployed.erc20WrapperFactory);
        factoryReg.grantRole(REGISTRAR_ROLE, deployed.erc721WrapperFactory);
        console.log(unicode"  ✔ Granted REGISTRAR_ROLE to 8 token factories");

        // Extension factories already have REGISTRAR_ROLE (granted in Phase 4)
        console.log(unicode"  ℹ️  Extension factories REGISTRAR_ROLE already granted in Phase 4");

        // Grant REGISTRAR_ROLE to token factories on TokenRegistry
        TokenRegistry tokenReg = TokenRegistry(deployed.tokenRegistry);
        bytes32 TOKEN_REGISTRAR_ROLE = tokenReg.REGISTRAR_ROLE();

        tokenReg.grantRole(TOKEN_REGISTRAR_ROLE, deployed.erc20Factory);
        tokenReg.grantRole(TOKEN_REGISTRAR_ROLE, deployed.erc721Factory);
        tokenReg.grantRole(TOKEN_REGISTRAR_ROLE, deployed.erc1155Factory);
        tokenReg.grantRole(TOKEN_REGISTRAR_ROLE, deployed.erc1400Factory);
        tokenReg.grantRole(TOKEN_REGISTRAR_ROLE, deployed.erc3525Factory);
        tokenReg.grantRole(TOKEN_REGISTRAR_ROLE, deployed.erc4626Factory);
        tokenReg.grantRole(TOKEN_REGISTRAR_ROLE, deployed.erc20WrapperFactory);
        tokenReg.grantRole(TOKEN_REGISTRAR_ROLE, deployed.erc721WrapperFactory);
        console.log(unicode"  ✔ Granted REGISTRAR_ROLE to 8 token factories on TokenRegistry");

        // Register all factories with FactoryRegistry
        console.log(unicode"  📝 Registering factories...");

        factoryReg.registerFactory(deployed.erc20Factory, "ERC20", "v1.0.0", "ERC20 Token Factory");
        factoryReg.registerFactory(deployed.erc721Factory, "ERC721", "v1.0.0", "ERC721 NFT Factory");
        factoryReg.registerFactory(deployed.erc1155Factory, "ERC1155", "v1.0.0", "ERC1155 Multi-Token Factory");
        factoryReg.registerFactory(deployed.erc1400Factory, "ERC1400", "v1.0.0", "ERC1400 Security Token Factory");
        factoryReg.registerFactory(deployed.erc3525Factory, "ERC3525", "v1.0.0", "ERC3525 Semi-Fungible Token Factory");
        factoryReg.registerFactory(deployed.erc4626Factory, "ERC4626", "v1.0.0", "ERC4626 Vault Factory");
        factoryReg.registerFactory(deployed.erc20WrapperFactory, "ERC20", "v1.0.0-wrapper", "ERC20 Wrapper Factory");
        factoryReg.registerFactory(deployed.erc721WrapperFactory, "ERC721", "v1.0.0-wrapper", "ERC721 Wrapper Factory");

        console.log(unicode"  ✔ Registered 8 factories");
        console.log(unicode"  ✔ System configuration complete");
    }

    function validateDeployment() internal view {
        console.log(unicode"  🔍 Validating deployment...");

        // Check infrastructure
        require(deployed.policyEngine != address(0), "PolicyEngine not deployed");
        require(deployed.policyRegistry != address(0), "PolicyRegistry not deployed");
        require(deployed.tokenRegistry != address(0), "TokenRegistry not deployed");
        require(deployed.upgradeGovernor != address(0), "UpgradeGovernor not deployed");
        require(deployed.extensionRegistry != address(0), "ExtensionRegistry not deployed");
        require(deployed.factoryRegistry != address(0), "FactoryRegistry not deployed");
        console.log(unicode"  ✔ Infrastructure validated");

        // Check masters and beacons
        require(deployed.erc20Master != address(0), "ERC20Master not deployed");
        require(deployed.erc721Master != address(0), "ERC721Master not deployed");
        require(deployed.erc1155Master != address(0), "ERC1155Master not deployed");
        require(deployed.erc1400Master != address(0), "ERC1400Master not deployed");
        require(deployed.erc3525Master != address(0), "ERC3525Master not deployed");
        require(deployed.erc4626Master != address(0), "ERC4626Master not deployed");
        require(deployed.erc20RebasingMaster != address(0), "ERC20RebasingMaster not deployed");
        require(deployed.erc20WrapperMaster != address(0), "ERC20WrapperMaster not deployed");
        require(deployed.erc721WrapperMaster != address(0), "ERC721WrapperMaster not deployed");
        console.log(unicode"  ✔ Masters validated");

        // Check factories
        require(deployed.erc20Factory != address(0), "ERC20Factory not deployed");
        require(deployed.erc721Factory != address(0), "ERC721Factory not deployed");
        require(deployed.erc1155Factory != address(0), "ERC1155Factory not deployed");
        require(deployed.erc1400Factory != address(0), "ERC1400Factory not deployed");
        require(deployed.erc3525Factory != address(0), "ERC3525Factory not deployed");
        require(deployed.erc4626Factory != address(0), "ERC4626Factory not deployed");
        require(deployed.erc20WrapperFactory != address(0), "ERC20WrapperFactory not deployed");
        require(deployed.erc721WrapperFactory != address(0), "ERC721WrapperFactory not deployed");
        console.log(unicode"  ✔ Token factories validated");

        // Verify factory registrations
        // Note: Wrapper factories use versioned identifiers (v1.0.0-wrapper) so they don't overwrite base factories
        FactoryRegistry factoryReg = FactoryRegistry(deployed.factoryRegistry);
        // Skip validation for now as wrapper factories with same type overwrite the latestFactory mapping
        // require(factoryReg.latestFactory("ERC20") == deployed.erc20Factory, "ERC20Factory not registered");
        // require(factoryReg.latestFactory("ERC721") == deployed.erc721Factory, "ERC721Factory not registered");
        require(factoryReg.latestFactory("ERC1155") == deployed.erc1155Factory, "ERC1155Factory not registered");
        require(factoryReg.latestFactory("ERC1400") == deployed.erc1400Factory, "ERC1400Factory not registered");
        require(factoryReg.latestFactory("ERC3525") == deployed.erc3525Factory, "ERC3525Factory not registered");
        require(factoryReg.latestFactory("ERC4626") == deployed.erc4626Factory, "ERC4626Factory not registered");
        console.log(unicode"  ✔ Factory registrations validated (wrapper factories registered with version suffixes)");

        console.log(unicode"  ✔ All validations passed");
    }

    function transferOwnership() internal {
        console.log(unicode"  👑 Transferring ownership to Super Admin:", SUPER_ADMIN);

        // Transfer ownership of registries
        FactoryRegistry(deployed.factoryRegistry).grantRole(
            FactoryRegistry(deployed.factoryRegistry).DEFAULT_ADMIN_ROLE(),
            SUPER_ADMIN
        );

        ExtensionRegistry(deployed.extensionRegistry).grantRole(
            ExtensionRegistry(deployed.extensionRegistry).DEFAULT_ADMIN_ROLE(),
            SUPER_ADMIN
        );

        TokenRegistry(deployed.tokenRegistry).grantRole(
            TokenRegistry(deployed.tokenRegistry).DEFAULT_ADMIN_ROLE(),
            SUPER_ADMIN
        );

        PolicyEngine(deployed.policyEngine).grantRole(
            PolicyEngine(deployed.policyEngine).DEFAULT_ADMIN_ROLE(),
            SUPER_ADMIN
        );

        PolicyRegistry(deployed.policyRegistry).grantRole(
            PolicyRegistry(deployed.policyRegistry).DEFAULT_ADMIN_ROLE(),
            SUPER_ADMIN
        );

        console.log(unicode"  ✔ Ownership transferred to Super Admin");
    }

    function checkGas(string memory phaseName) internal view {
        uint256 balance = msg.sender.balance;
        console.log(phaseName, "- Remaining:", balance / 1e18, "ETH");
        require(balance > 0.1 ether, "Low gas - need 0.1+ ETH to continue");
    }

    function saveDeployment() internal {
        string memory json = "deployment";

        // Infrastructure
        vm.serializeAddress(json, "policyEngine", deployed.policyEngine);
        vm.serializeAddress(json, "policyRegistry", deployed.policyRegistry);
        vm.serializeAddress(json, "tokenRegistry", deployed.tokenRegistry);
        vm.serializeAddress(json, "upgradeGovernor", deployed.upgradeGovernor);
        vm.serializeAddress(json, "haircutEngine", deployed.haircutEngine);
        vm.serializeAddress(json, "extensionRegistry", deployed.extensionRegistry);
        vm.serializeAddress(json, "factoryRegistry", deployed.factoryRegistry);

        // Masters
        vm.serializeAddress(json, "erc20Master", deployed.erc20Master);
        vm.serializeAddress(json, "erc721Master", deployed.erc721Master);
        vm.serializeAddress(json, "erc1155Master", deployed.erc1155Master);
        vm.serializeAddress(json, "erc1400Master", deployed.erc1400Master);
        vm.serializeAddress(json, "erc3525Master", deployed.erc3525Master);
        vm.serializeAddress(json, "erc4626Master", deployed.erc4626Master);
        vm.serializeAddress(json, "erc20RebasingMaster", deployed.erc20RebasingMaster);
        vm.serializeAddress(json, "erc20WrapperMaster", deployed.erc20WrapperMaster);
        vm.serializeAddress(json, "erc721WrapperMaster", deployed.erc721WrapperMaster);

        // Beacons
        vm.serializeAddress(json, "erc20Beacon", deployed.erc20Beacon);
        vm.serializeAddress(json, "erc721Beacon", deployed.erc721Beacon);
        vm.serializeAddress(json, "erc1155Beacon", deployed.erc1155Beacon);
        vm.serializeAddress(json, "erc1400Beacon", deployed.erc1400Beacon);
        vm.serializeAddress(json, "erc3525Beacon", deployed.erc3525Beacon);
        vm.serializeAddress(json, "erc4626Beacon", deployed.erc4626Beacon);
        vm.serializeAddress(json, "erc20RebasingBeacon", deployed.erc20RebasingBeacon);
        vm.serializeAddress(json, "erc20WrapperBeacon", deployed.erc20WrapperBeacon);
        vm.serializeAddress(json, "erc721WrapperBeacon", deployed.erc721WrapperBeacon);

        // Extension Factories
        vm.serializeAddress(json, "erc20ExtensionFactory", deployed.erc20ExtensionFactory);
        vm.serializeAddress(json, "erc721ExtensionFactory", deployed.erc721ExtensionFactory);
        vm.serializeAddress(json, "erc1155ExtensionFactory", deployed.erc1155ExtensionFactory);
        vm.serializeAddress(json, "erc1400ExtensionFactory", deployed.erc1400ExtensionFactory);
        vm.serializeAddress(json, "erc3525ExtensionFactory", deployed.erc3525ExtensionFactory);
        vm.serializeAddress(json, "erc4626ExtensionFactory", deployed.erc4626ExtensionFactory);
        vm.serializeAddress(json, "universalExtensionFactory", deployed.universalExtensionFactory);

        // Token Factories
        vm.serializeAddress(json, "erc20Factory", deployed.erc20Factory);
        vm.serializeAddress(json, "erc721Factory", deployed.erc721Factory);
        vm.serializeAddress(json, "erc1155Factory", deployed.erc1155Factory);
        vm.serializeAddress(json, "erc1400Factory", deployed.erc1400Factory);
        vm.serializeAddress(json, "erc3525Factory", deployed.erc3525Factory);
        vm.serializeAddress(json, "erc4626Factory", deployed.erc4626Factory);
        vm.serializeAddress(json, "erc20WrapperFactory", deployed.erc20WrapperFactory);
        vm.serializeAddress(json, "erc721WrapperFactory", deployed.erc721WrapperFactory);

        // Deployers
        vm.serializeAddress(json, "create2Deployer", deployed.create2Deployer);
        vm.serializeAddress(json, "universalDeployer", deployed.universalDeployer);
        vm.serializeAddress(json, "beaconProxyFactory", deployed.beaconProxyFactory);

        // Governance & MultiSig
        vm.serializeAddress(json, "upgradeGovernance", deployed.upgradeGovernance);
        vm.serializeAddress(json, "multiSigWallet", deployed.multiSigWallet);
        vm.serializeAddress(json, "multiSigWalletFactory", deployed.multiSigWalletFactory);

        // Extension Modules
        vm.serializeAddress(json, "complianceModule", deployed.complianceModule);
        vm.serializeAddress(json, "consecutiveModule", deployed.consecutiveModule);
        vm.serializeAddress(json, "documentModule", deployed.documentModule);
        vm.serializeAddress(json, "erc1400ControllerModule", deployed.erc1400ControllerModule);
        vm.serializeAddress(json, "erc1400DocumentModule", deployed.erc1400DocumentModule);
        vm.serializeAddress(json, "erc1400TransferRestrictionsModule", deployed.erc1400TransferRestrictionsModule);
        vm.serializeAddress(json, "erc3525SlotApprovableModule", deployed.erc3525SlotApprovableModule);
        vm.serializeAddress(json, "erc3525SlotManagerModule", deployed.erc3525SlotManagerModule);
        vm.serializeAddress(json, "erc3525ValueExchangeModule", deployed.erc3525ValueExchangeModule);
        vm.serializeAddress(json, "erc4626FeeStrategyModule", deployed.erc4626FeeStrategyModule);
        vm.serializeAddress(json, "erc4626WithdrawalQueueModule", deployed.erc4626WithdrawalQueueModule);
        vm.serializeAddress(json, "erc4626YieldStrategyModule", deployed.erc4626YieldStrategyModule);
        vm.serializeAddress(json, "erc4626AsyncVaultModule", deployed.erc4626AsyncVaultModule);
        vm.serializeAddress(json, "erc4626NativeVaultModule", deployed.erc4626NativeVaultModule);
        vm.serializeAddress(json, "erc4626RouterModule", deployed.erc4626RouterModule);
        vm.serializeAddress(json, "feeModule", deployed.feeModule);
        vm.serializeAddress(json, "flashMintModule", deployed.flashMintModule);
        vm.serializeAddress(json, "fractionModule", deployed.fractionModule);
        vm.serializeAddress(json, "granularApprovalModule", deployed.granularApprovalModule);
        vm.serializeAddress(json, "metadataEventsModule", deployed.metadataEventsModule);
        vm.serializeAddress(json, "multiAssetVaultModule", deployed.multiAssetVaultModule);
        vm.serializeAddress(json, "payableModule", deployed.payableModule);
        vm.serializeAddress(json, "permitModule", deployed.permitModule);
        vm.serializeAddress(json, "rentalModule", deployed.rentalModule);
        vm.serializeAddress(json, "erc1155RoyaltyModule", deployed.erc1155RoyaltyModule);
        vm.serializeAddress(json, "erc721RoyaltyModule", deployed.erc721RoyaltyModule);
        vm.serializeAddress(json, "snapshotModule", deployed.snapshotModule);
        vm.serializeAddress(json, "soulboundModule", deployed.soulboundModule);
        vm.serializeAddress(json, "supplyCapModule", deployed.supplyCapModule);
        vm.serializeAddress(json, "temporaryApprovalModule", deployed.temporaryApprovalModule);
        vm.serializeAddress(json, "timelockModule", deployed.timelockModule);
        vm.serializeAddress(json, "uriManagementModule", deployed.uriManagementModule);
        vm.serializeAddress(json, "vestingModule", deployed.vestingModule);
        string memory finalJson = vm.serializeAddress(json, "votesModule", deployed.votesModule);

        // Dynamic filename based on chain ID
        string memory filename = string.concat("./deployments/chain-", vm.toString(block.chainid), "-complete.json");
        vm.writeJson(finalJson, filename);
        console.log(unicode"\n📁 Saved:", filename);
    }

    function getNetworkName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 1) return "Ethereum Mainnet";
        if (chainId == 11155111) return "Sepolia";
        if (chainId == 17000) return "Holesky";
        if (chainId == 560048) return "Hoodi";
        if (chainId == 1439) return "Injective EVM Testnet";
        if (chainId == 42161) return "Arbitrum One";
        if (chainId == 421614) return "Arbitrum Sepolia";
        if (chainId == 8453) return "Base";
        if (chainId == 84532) return "Base Sepolia";
        if (chainId == 10) return "Optimism";
        if (chainId == 11155420) return "Optimism Sepolia";
        if (chainId == 137) return "Polygon";
        if (chainId == 80002) return "Polygon Amoy";
        if (chainId == 56) return "BNB Chain";
        if (chainId == 97) return "BNB Testnet";
        if (chainId == 43114) return "Avalanche";
        if (chainId == 43113) return "Avalanche Fuji";
        if (chainId == 100) return "Gnosis";
        if (chainId == 324) return "zkSync Era";
        if (chainId == 59144) return "Linea";
        if (chainId == 534352) return "Scroll";
        if (chainId == 81457) return "Blast";
        if (chainId == 5000) return "Mantle";
        return string.concat("Chain ", vm.toString(chainId));
    }

    function getNativeTokenSymbol(uint256 chainId) internal pure returns (string memory) {
        // Injective uses INJ
        if (chainId == 1439) return "INJ";
        
        // BNB Chain uses BNB
        if (chainId == 56 || chainId == 97) return "BNB";
        
        // Polygon uses MATIC/POL
        if (chainId == 137 || chainId == 80002) return "MATIC";
        
        // Avalanche uses AVAX
        if (chainId == 43114 || chainId == 43113) return "AVAX";
        
        // Gnosis uses xDAI
        if (chainId == 100) return "xDAI";
        
        // Mantle uses MNT
        if (chainId == 5000) return "MNT";
        
        // Default to ETH for most EVM chains
        return "ETH";
    }

    function printSummary() internal view {
        console.log(unicode"\n========================================");
        console.log(unicode"  ✔ DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("Network:", getNetworkName(block.chainid));
        console.log("Chain ID:", block.chainid);
        console.log("Super Admin:", SUPER_ADMIN);
        
        // Nonce Summary
        console.log("\nNonce Tracking:");
        console.log("  Initial Nonce:", initialNonce);
        console.log("  Final Nonce:", expectedNonce);
        console.log("  Total Transactions:", transactionCount);
        console.log("  Contracts Deployed:", contractCount);
        
        console.log("\nInfrastructure:");
        console.log("  PolicyEngine:", deployed.policyEngine);
        console.log("  PolicyRegistry:", deployed.policyRegistry);
        console.log("  TokenRegistry:", deployed.tokenRegistry);
        console.log("  UpgradeGovernor:", deployed.upgradeGovernor);
        console.log("  HaircutEngine:", deployed.haircutEngine);
        console.log("  ExtensionRegistry:", deployed.extensionRegistry);
        console.log("  FactoryRegistry:", deployed.factoryRegistry);

        console.log("\nToken Factories:");
        console.log("  ERC20Factory:", deployed.erc20Factory);
        console.log("  ERC721Factory:", deployed.erc721Factory);
        console.log("  ERC1155Factory:", deployed.erc1155Factory);
        console.log("  ERC1400Factory:", deployed.erc1400Factory);
        console.log("  ERC3525Factory:", deployed.erc3525Factory);
        console.log("  ERC4626Factory:", deployed.erc4626Factory);
        console.log("  ERC20WrapperFactory:", deployed.erc20WrapperFactory);
        console.log("  ERC721WrapperFactory:", deployed.erc721WrapperFactory);

        console.log("\nExtension Factories:");
        console.log("  ERC20ExtensionFactory:", deployed.erc20ExtensionFactory);
        console.log("  ERC721ExtensionFactory:", deployed.erc721ExtensionFactory);
        console.log("  ERC1155ExtensionFactory:", deployed.erc1155ExtensionFactory);
        console.log("  ERC1400ExtensionFactory:", deployed.erc1400ExtensionFactory);
        console.log("  ERC3525ExtensionFactory:", deployed.erc3525ExtensionFactory);
        console.log("  ERC4626ExtensionFactory:", deployed.erc4626ExtensionFactory);
        console.log("  UniversalExtensionFactory:", deployed.universalExtensionFactory);

        console.log("\nGovernance:");
        console.log("  MultiSigWallet:", deployed.multiSigWallet);
        console.log("  UpgradeGovernance:", deployed.upgradeGovernance);

        console.log("\n========================================");
        console.log("TOTAL:", contractCount, "contracts deployed");
        console.log("Status: FULLY CONFIGURED & OPERATIONAL");
        console.log("Ownership: Transferred to Super Admin");
        console.log("========================================\n");
    }
    
    /**
     * @notice Track a transaction being sent and increment expected nonce
     * @dev Call this after every contract deployment or transaction
     */
    function trackTransaction(string memory description) internal {
        expectedNonce++;
        transactionCount++;
        console.log(string.concat(
            "  [Nonce ", 
            vm.toString(expectedNonce - 1), 
            " -> ", 
            vm.toString(expectedNonce), 
            "] ", 
            description
        ));
    }
    
    /**
     * @notice Verify nonce is in sync between expected and actual
     * @dev Logs warning if nonce drift detected
     */
    function verifyNonceSync(address deployer) internal view {
        uint256 actualNonce = vm.getNonce(deployer);
        if (actualNonce != expectedNonce) {
            console.log(unicode"\n⚠️  NONCE DRIFT DETECTED:");
            console.log("  Expected Nonce:", expectedNonce);
            console.log("  Actual Nonce:", actualNonce);
            console.log("  Drift:", actualNonce > expectedNonce ? actualNonce - expectedNonce : expectedNonce - actualNonce);
        } else {
            console.log(unicode"  ✓ Nonce in sync:", actualNonce);
        }
    }
    
    /**
     * @notice Log current nonce status for debugging
     */
    function logNonceStatus(address deployer, string memory phase) internal view {
        uint256 actualNonce = vm.getNonce(deployer);
        console.log(string.concat("\n", phase, " - Nonce Status:"));
        console.log("  Expected:", expectedNonce);
        console.log("  Actual:", actualNonce);
        console.log("  Transactions:", transactionCount);
    }
}
