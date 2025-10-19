// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Additional Masters
import "../src/masters/ERC20WrapperMaster.sol";
import "../src/masters/ERC721WrapperMaster.sol";

// Deployers
import "../src/deployers/CREATE2Deployer.sol";
import "../src/deployers/ExtensionModuleFactory.sol";
import "../src/deployers/UniversalDeployer.sol";
import "../src/deployers/beacon/BeaconProxyFactory.sol";
import "../src/deployers/beacon/TokenBeacon.sol";

// Governance
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

/**
 * @title DeployHoodiRemaining
 * @notice Deploys all remaining contracts (42 total)
 * @dev Excludes: L2GasOptimizer, TokenFactory (needs refactoring)
 * 
 * Network: Hoodi Testnet (Chain ID: 560048)
 * RPC: https://ethereum-hoodi-rpc.publicnode.com/
 */
contract DeployHoodiRemaining is Script {
    
    struct Deployment {
        // Additional Masters
        address erc20WrapperMaster;
        address erc721WrapperMaster;
        
        // Additional Beacons
        address erc20WrapperBeacon;
        address erc721WrapperBeacon;
        
        // Deployers
        address create2Deployer;
        address extensionModuleFactory;
        address universalDeployer;
        address beaconProxyFactory;
        
        // Governance
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
    
    function run() external {
        require(block.chainid == 560048, "Must deploy to Hoodi (560048)");
        
        uint256 deployerPrivateKey = vm.envUint("HOODI_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("HOODI REMAINING CONTRACTS DEPLOYMENT");
        console.log("========================================");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log("Target: 42 contracts");
        console.log("========================================\n");
        
        require(deployer.balance > 1 ether, "Need 1+ ETH for full deployment");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Phase 4: Additional Masters + Beacons
        console.log("PHASE 4: Additional Masters + Beacons (4 contracts)");
        console.log("=======================================================");
        deployAdditionalMasters();
        deployAdditionalBeacons(deployer);
        
        // Phase 5: Extension Modules (deploy BEFORE deployers that need them)
        console.log("\nPHASE 5: Extension Modules (31 contracts)");
        console.log("=======================================================");
        deployExtensions(deployer);
        
        // Phase 6: Deployers (some depend on extension modules)
        console.log("\nPHASE 6: Deployer Contracts (4 contracts)");
        console.log("=======================================================");
        deployDeployers(deployer);
        
        // Phase 7: Governance
        console.log("\nPHASE 7: Governance (1 contract)");
        console.log("=======================================================");
        deployGovernance(deployer);
        
        // Phase 8: Multi-Sig
        console.log("\nPHASE 8: Multi-Sig Wallets (2 contracts)");
        console.log("=======================================================");
        deployMultiSig(deployer);
        
        vm.stopBroadcast();
        
        // Save and summarize
        saveDeployment();
        printSummary();
    }
    
    function deployAdditionalMasters() internal {
        deployed.erc20WrapperMaster = address(new ERC20WrapperMaster());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC20WrapperMaster:", deployed.erc20WrapperMaster);
        
        deployed.erc721WrapperMaster = address(new ERC721WrapperMaster());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC721WrapperMaster:", deployed.erc721WrapperMaster);
    }
    
    function deployAdditionalBeacons(address deployer) internal {
        deployed.erc20WrapperBeacon = address(new TokenBeacon(deployed.erc20WrapperMaster, deployer));
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC20WrapperBeacon:", deployed.erc20WrapperBeacon);
        
        deployed.erc721WrapperBeacon = address(new TokenBeacon(deployed.erc721WrapperMaster, deployer));
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC721WrapperBeacon:", deployed.erc721WrapperBeacon);
    }
    
    function deployDeployers(address deployer) internal {
        deployed.create2Deployer = address(new CREATE2Deployer());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "CREATE2Deployer:", deployed.create2Deployer);
        
        // ExtensionModuleFactory needs: compliance, vesting, fee, royalty master addresses + owner
        // We already deployed these as extension modules, so we'll use those addresses
        deployed.extensionModuleFactory = address(new ExtensionModuleFactory(
            deployed.complianceModule,    // compliance master
            deployed.vestingModule,       // vesting master
            deployed.feeModule,           // fee master
            deployed.erc721RoyaltyModule, // royalty master
            deployer                      // owner
        ));
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ExtensionModuleFactory:", deployed.extensionModuleFactory);
        
        deployed.universalDeployer = address(new UniversalDeployer());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "UniversalDeployer:", deployed.universalDeployer);
        
        deployed.beaconProxyFactory = address(new BeaconProxyFactory(deployer));
        contractCount++;
        console.log(unicode"  ✅", contractCount, "BeaconProxyFactory:", deployed.beaconProxyFactory);
    }
    
    function deployGovernance(address deployer) internal {
        // UpgradeGovernance needs: address admin, uint256 timelockDelay, uint256 minApprovers
        deployed.upgradeGovernance = address(new UpgradeGovernance(
            deployer,        // admin
            1 days,          // timelockDelay (minimum 1 day)
            2                // minApprovers (minimum 2)
        ));
        contractCount++;
        console.log(unicode"  ✅", contractCount, "UpgradeGovernance:", deployed.upgradeGovernance);
    }
    
    function deployMultiSig(address deployer) internal {
        address[] memory owners = new address[](1);
        owners[0] = deployer;
        // MultiSigWallet needs: string name, address[] owners, uint256 requiredSignatures
        deployed.multiSigWallet = address(new MultiSigWallet(
            "Chain Capital MultiSig", // name
            owners,                    // owners array
            1                          // requiredSignatures
        ));
        contractCount++;
        console.log(unicode"  ✅", contractCount, "MultiSigWallet:", deployed.multiSigWallet);
        
        deployed.multiSigWalletFactory = address(new MultiSigWalletFactory());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "MultiSigWalletFactory:", deployed.multiSigWalletFactory);
    }
    
    function deployExtensions(address deployer) internal {
        // Compliance
        deployed.complianceModule = address(new ERC20ComplianceModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC20ComplianceModule:", deployed.complianceModule);
        
        // Consecutive
        deployed.consecutiveModule = address(new ERC721ConsecutiveModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC721ConsecutiveModule:", deployed.consecutiveModule);
        
        // Document
        deployed.documentModule = address(new UniversalDocumentModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "UniversalDocumentModule:", deployed.documentModule);
        
        // ERC1400 Modules
        deployed.erc1400ControllerModule = address(new ERC1400ControllerModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC1400ControllerModule:", deployed.erc1400ControllerModule);
        
        deployed.erc1400DocumentModule = address(new ERC1400DocumentModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC1400DocumentModule:", deployed.erc1400DocumentModule);
        
        deployed.erc1400TransferRestrictionsModule = address(new ERC1400TransferRestrictionsModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC1400TransferRestrictionsModule:", deployed.erc1400TransferRestrictionsModule);
        
        // ERC3525 Modules
        deployed.erc3525SlotApprovableModule = address(new ERC3525SlotApprovableModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC3525SlotApprovableModule:", deployed.erc3525SlotApprovableModule);
        
        deployed.erc3525SlotManagerModule = address(new ERC3525SlotManagerModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC3525SlotManagerModule:", deployed.erc3525SlotManagerModule);
        
        deployed.erc3525ValueExchangeModule = address(new ERC3525ValueExchangeModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC3525ValueExchangeModule:", deployed.erc3525ValueExchangeModule);
        
        // ERC4626 Modules
        deployed.erc4626FeeStrategyModule = address(new ERC4626FeeStrategyModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC4626FeeStrategyModule:", deployed.erc4626FeeStrategyModule);
        
        deployed.erc4626WithdrawalQueueModule = address(new ERC4626WithdrawalQueueModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC4626WithdrawalQueueModule:", deployed.erc4626WithdrawalQueueModule);
        
        deployed.erc4626YieldStrategyModule = address(new ERC4626YieldStrategyModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC4626YieldStrategyModule:", deployed.erc4626YieldStrategyModule);
        
        // Fees
        deployed.feeModule = address(new ERC20FeeModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC20FeeModule:", deployed.feeModule);
        
        // Flash Mint
        deployed.flashMintModule = address(new ERC20FlashMintModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC20FlashMintModule:", deployed.flashMintModule);
        
        // Fractionalization
        deployed.fractionModule = address(new ERC721FractionModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC721FractionModule:", deployed.fractionModule);
        
        // Granular Approval
        deployed.granularApprovalModule = address(new ERC5216GranularApprovalModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC5216GranularApprovalModule:", deployed.granularApprovalModule);
        
        // Metadata Events
        deployed.metadataEventsModule = address(new ERC4906MetadataModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC4906MetadataModule:", deployed.metadataEventsModule);
        
        // Multi Asset Vault
        deployed.multiAssetVaultModule = address(new ERC7575MultiAssetVaultModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC7575MultiAssetVaultModule:", deployed.multiAssetVaultModule);
        
        // Payable
        deployed.payableModule = address(new ERC1363PayableToken());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC1363PayableToken:", deployed.payableModule);
        
        // Permit
        deployed.permitModule = address(new ERC20PermitModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC20PermitModule:", deployed.permitModule);
        
        // Rental
        deployed.rentalModule = address(new ERC721RentalModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC721RentalModule:", deployed.rentalModule);
        
        // Royalty
        deployed.erc1155RoyaltyModule = address(new ERC1155RoyaltyModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC1155RoyaltyModule:", deployed.erc1155RoyaltyModule);
        
        deployed.erc721RoyaltyModule = address(new ERC721RoyaltyModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC721RoyaltyModule:", deployed.erc721RoyaltyModule);
        
        // Snapshot
        deployed.snapshotModule = address(new ERC20SnapshotModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC20SnapshotModule:", deployed.snapshotModule);
        
        // Soulbound
        deployed.soulboundModule = address(new ERC721SoulboundModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC721SoulboundModule:", deployed.soulboundModule);
        
        // Supply Cap
        deployed.supplyCapModule = address(new ERC1155SupplyCapModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC1155SupplyCapModule:", deployed.supplyCapModule);
        
        // Temporary Approval
        deployed.temporaryApprovalModule = address(new ERC20TemporaryApprovalModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC20TemporaryApprovalModule:", deployed.temporaryApprovalModule);
        
        // Timelock
        deployed.timelockModule = address(new ERC20TimelockModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC20TimelockModule:", deployed.timelockModule);
        
        // URI Management
        deployed.uriManagementModule = address(new ERC1155URIModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC1155URIModule:", deployed.uriManagementModule);
        
        // Vesting
        deployed.vestingModule = address(new ERC20VestingModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC20VestingModule:", deployed.vestingModule);
        
        // Votes
        deployed.votesModule = address(new ERC20VotesModule());
        contractCount++;
        console.log(unicode"  ✅", contractCount, "ERC20VotesModule:", deployed.votesModule);
    }
    
    function saveDeployment() internal {
        string memory json = "deployment";
        
        // Additional Masters
        vm.serializeAddress(json, "erc20WrapperMaster", deployed.erc20WrapperMaster);
        vm.serializeAddress(json, "erc721WrapperMaster", deployed.erc721WrapperMaster);
        
        // Additional Beacons
        vm.serializeAddress(json, "erc20WrapperBeacon", deployed.erc20WrapperBeacon);
        vm.serializeAddress(json, "erc721WrapperBeacon", deployed.erc721WrapperBeacon);
        
        // Deployers
        vm.serializeAddress(json, "create2Deployer", deployed.create2Deployer);
        vm.serializeAddress(json, "extensionModuleFactory", deployed.extensionModuleFactory);
        vm.serializeAddress(json, "universalDeployer", deployed.universalDeployer);
        vm.serializeAddress(json, "beaconProxyFactory", deployed.beaconProxyFactory);
        
        // Governance
        vm.serializeAddress(json, "upgradeGovernance", deployed.upgradeGovernance);
        
        // Multi-Sig
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
        
        vm.writeJson(finalJson, "./deployments/hoodi-remaining.json");
        console.log(unicode"\n📁 Saved: deployments/hoodi-remaining.json");
    }
    
    function printSummary() internal view {
        console.log(unicode"\n========================================");
        console.log(unicode"  ✅ DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("\nADDITIONAL MASTERS:");
        console.log("  ERC20WrapperMaster:", deployed.erc20WrapperMaster);
        console.log("  ERC721WrapperMaster:", deployed.erc721WrapperMaster);
        
        console.log("\nADDITIONAL BEACONS:");
        console.log("  ERC20WrapperBeacon:", deployed.erc20WrapperBeacon);
        console.log("  ERC721WrapperBeacon:", deployed.erc721WrapperBeacon);
        
        console.log("\nDEPLOYERS:");
        console.log("  CREATE2Deployer:", deployed.create2Deployer);
        console.log("  ExtensionModuleFactory:", deployed.extensionModuleFactory);
        console.log("  UniversalDeployer:", deployed.universalDeployer);
        console.log("  BeaconProxyFactory:", deployed.beaconProxyFactory);
        
        console.log("\nGOVERNANCE:");
        console.log("  UpgradeGovernance:", deployed.upgradeGovernance);
        
        console.log("\nMULTI-SIG:");
        console.log("  MultiSigWallet:", deployed.multiSigWallet);
        console.log("  MultiSigWalletFactory:", deployed.multiSigWalletFactory);
        
        console.log("\nEXTENSION MODULES (31 total):");
        console.log("  Compliance, Consecutive, Document, ERC1400 (3), ERC3525 (3),");
        console.log("  ERC4626 (3), Fees, FlashMint, Fraction, GranularApproval,");
        console.log("  MetadataEvents, MultiAssetVault, Payable, Permit, Rental,");
        console.log("  Royalty (2), Snapshot, Soulbound, SupplyCap, TemporaryApproval,");
        console.log("  Timelock, URIManagement, Vesting, Votes");
        
        console.log("\nTOTAL:", contractCount, "contracts deployed");
        console.log("========================================\n");
    }
}
