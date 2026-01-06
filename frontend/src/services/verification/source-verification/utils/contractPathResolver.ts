/**
 * Contract path resolver
 * Maps token standards and module types to Solidity file paths
 * Matches paths used in foundry-contracts
 */

import type { TokenStandard } from '@/types/core/centralModels';

/**
 * Contract Path Resolver Class
 * Provides methods to resolve contract paths for verification
 */
export class ContractPathResolver {
  /**
   * Get contract path for token standards
   * Used for master contract verification
   */
  getTokenPath(standard: TokenStandard | string): string {
    const pathMap: Record<string, string> = {
      'ERC-20': 'src/masters/ERC20Master.sol:ERC20Master',
      'ERC-721': 'src/masters/ERC721Master.sol:ERC721Master',
      'ERC-1155': 'src/masters/ERC1155Master.sol:ERC1155Master',
      'ERC-1400': 'src/masters/ERC1400Master.sol:ERC1400Master',
      'ERC-3525': 'src/masters/ERC3525Master.sol:ERC3525Master',
      'ERC-4626': 'src/masters/ERC4626Master.sol:ERC4626Master',
      'ERC-20-WRAPPER': 'src/masters/ERC20WrapperMaster.sol:ERC20WrapperMaster',
      'ERC-721-WRAPPER': 'src/masters/ERC721WrapperMaster.sol:ERC721WrapperMaster',
      'ERC-20-REBASING': 'src/masters/ERC20RebasingMaster.sol:ERC20RebasingMaster'
    };

    return pathMap[standard] || pathMap['ERC-20'];
  }

  /**
   * Get contract path for module types
   * Used for module contract verification
   */
  getModulePath(moduleType: string): string {
    const pathMap: Record<string, string> = {
      // ERC20 Modules
      'fees': 'src/extensions/fees/ERC20FeeModule.sol:ERC20FeeModule',
      'vesting': 'src/extensions/vesting/ERC20VestingModule.sol:ERC20VestingModule',
      'timelock': 'src/extensions/timelock/ERC20TimelockModule.sol:ERC20TimelockModule',
      'votes': 'src/extensions/votes/ERC20VotesModule.sol:ERC20VotesModule',
      'permit': 'src/extensions/permit/ERC20PermitModule.sol:ERC20PermitModule',
      'snapshot': 'src/extensions/snapshot/ERC20SnapshotModule.sol:ERC20SnapshotModule',
      'flashMint': 'src/extensions/flash-mint/ERC20FlashMintModule.sol:ERC20FlashMintModule',
      'temporaryApproval': 'src/extensions/temporary-approval/ERC20TemporaryApprovalModule.sol:ERC20TemporaryApprovalModule',
      'compliance': 'src/extensions/compliance/ERC20ComplianceModule.sol:ERC20ComplianceModule',

      // ERC721 Modules
      'royalty': 'src/extensions/royalty/ERC721RoyaltyModule.sol:ERC721RoyaltyModule',
      'rental': 'src/extensions/rental/ERC721RentalModule.sol:ERC721RentalModule',
      'fraction': 'src/extensions/fractionalization/ERC721FractionModule.sol:ERC721FractionModule',
      'soulbound': 'src/extensions/soulbound/ERC721SoulboundModule.sol:ERC721SoulboundModule',
      'consecutive': 'src/extensions/consecutive/ERC721ConsecutiveModule.sol:ERC721ConsecutiveModule',

      // ERC1155 Modules
      'erc1155Royalty': 'src/extensions/royalty/ERC1155RoyaltyModule.sol:ERC1155RoyaltyModule',
      'supplyCap': 'src/extensions/supply-cap/ERC1155SupplyCapModule.sol:ERC1155SupplyCapModule',
      'uriManagement': 'src/extensions/uri-management/ERC1155URIModule.sol:ERC1155URIModule',

      // ERC1400 Modules
      'controller': 'src/extensions/erc1400/ERC1400ControllerModule.sol:ERC1400ControllerModule',
      'erc1400Document': 'src/extensions/erc1400/ERC1400DocumentModule.sol:ERC1400DocumentModule',
      'transferRestrictions': 'src/extensions/erc1400/ERC1400TransferRestrictionsModule.sol:ERC1400TransferRestrictionsModule',

      // ERC3525 Modules
      'slotManager': 'src/extensions/erc3525/ERC3525SlotManagerModule.sol:ERC3525SlotManagerModule',
      'slotApprovable': 'src/extensions/erc3525/ERC3525SlotApprovableModule.sol:ERC3525SlotApprovableModule',
      'valueExchange': 'src/extensions/erc3525/ERC3525ValueExchangeModule.sol:ERC3525ValueExchangeModule',

      // ERC4626 Modules
      'feeStrategy': 'src/extensions/erc4626/ERC4626FeeStrategyModule.sol:ERC4626FeeStrategyModule',
      'withdrawalQueue': 'src/extensions/erc4626/ERC4626WithdrawalQueueModule.sol:ERC4626WithdrawalQueueModule',
      'yieldStrategy': 'src/extensions/erc4626/ERC4626YieldStrategyModule.sol:ERC4626YieldStrategyModule',
      'asyncVault': 'src/extensions/erc4626/async/ERC7540AsyncVaultModule.sol:ERC7540AsyncVaultModule',
      'nativeVault': 'src/extensions/erc4626/native/ERC7535NativeVaultModule.sol:ERC7535NativeVaultModule',
      'multiAssetVault': 'src/extensions/multi-asset-vault/ERC7575MultiAssetVaultModule.sol:ERC7575MultiAssetVaultModule',
      'router': 'src/extensions/erc4626/router/ERC4626Router.sol:ERC4626Router',

      // Universal Modules
      'document': 'src/extensions/document/UniversalDocumentModule.sol:UniversalDocumentModule',
      'metadataEvents': 'src/extensions/metadata-events/ERC4906MetadataModule.sol:ERC4906MetadataModule',
      'granularApproval': 'src/extensions/granular-approval/ERC5216GranularApprovalModule.sol:ERC5216GranularApprovalModule',
      'payable': 'src/extensions/payable/ERC1363PayableToken.sol:ERC1363PayableToken',
      'receiver': 'src/extensions/receiver/ERC3525ReceiverModule.sol:ERC3525ReceiverModule'
    };

    return pathMap[moduleType] || `src/extensions/${moduleType}/${moduleType}.sol:${moduleType}`;
  }

  /**
   * Get beacon contract path
   * All beacons use the same contract
   */
  getBeaconPath(): string {
    return 'src/deployers/beacon/TokenBeacon.sol:TokenBeacon';
  }
}

// ============================================================================
// Legacy function exports (for backwards compatibility)
// ============================================================================

/**
 * Get contract path for token standards
 * @deprecated Use ContractPathResolver class instead
 */
export function getStandardContractPath(standard: TokenStandard | string): string {
  const resolver = new ContractPathResolver();
  return resolver.getTokenPath(standard);
}

/**
 * Get contract path for module types
 * @deprecated Use ContractPathResolver class instead
 */
export function getModuleContractPath(moduleType: string): string {
  const resolver = new ContractPathResolver();
  return resolver.getModulePath(moduleType);
}

/**
 * Get beacon contract path
 * @deprecated Use ContractPathResolver class instead
 */
export function getBeaconContractPath(): string {
  const resolver = new ContractPathResolver();
  return resolver.getBeaconPath();
}
