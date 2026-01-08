/**
 * Verifiers Index
 * 
 * Central export point for all token standard and module verifiers
 * Updated: 2025-01-08 - Added final 2 enhanced verifiers for 100% database-first coverage
 */

// ============================================
// ERC20 STANDARD & MODULES
// ============================================
export { ERC20Verifier } from './erc20Verifier';

// ERC20 Module Verifiers (Basic)
export {
  ERC20VotesModuleVerifier,
  ERC20PermitModuleVerifier,
  ERC20SnapshotModuleVerifier,
  ERC20FlashMintModuleVerifier
} from './erc20ModuleVerifiers';

// Enhanced ERC20 Module Verifiers (Database-First) ✅ 10/10 COMPLETE
export { EnhancedERC20FeesModuleVerifier } from './enhancedERC20FeesModuleVerifier';
export { EnhancedTimelockModuleVerifier } from './enhancedTimelockModuleVerifier';
export { EnhancedTemporaryApprovalModuleVerifier } from './enhancedTemporaryApprovalModuleVerifier';
export { EnhancedERC20FlashMintModuleVerifier } from './enhancedERC20FlashMintModuleVerifier';
export { EnhancedPayableTokenModuleVerifier } from './enhancedPayableTokenModuleVerifier';
export { EnhancedPermitModuleVerifier } from './enhancedPermitModuleVerifier';
export { EnhancedSnapshotModuleVerifier } from './enhancedSnapshotModuleVerifier';
export { EnhancedVotesModuleVerifier } from './enhancedVotesModuleVerifier';

// ============================================
// ERC721 STANDARD & MODULES
// ============================================
export { ERC721Verifier } from './erc721Verifier';

// Enhanced ERC721 Module Verifiers (Database-First) ✅ 7/7 COMPLETE
export { EnhancedERC721RoyaltyModuleVerifier } from './enhancedERC721RoyaltyModuleVerifier';
export { EnhancedERC721RentalModuleVerifier } from './enhancedERC721RentalModuleVerifier';
export { EnhancedConsecutiveModuleVerifier } from './enhancedConsecutiveModuleVerifier';
export { EnhancedFractionModuleVerifier } from './enhancedFractionModuleVerifier';
export { EnhancedSoulboundModuleVerifier } from './enhancedSoulboundModuleVerifier';
export { EnhancedMetadataEventsModuleVerifier } from './enhancedMetadataEventsModuleVerifier'; // ✨ NEW

// ============================================
// ERC1155 STANDARD & MODULES
// ============================================
export { ERC1155Verifier } from './erc1155Verifier';

// Enhanced ERC1155 Module Verifiers (Database-First) ✅ 4/4 COMPLETE
export { EnhancedERC1155RoyaltyModuleVerifier } from './enhancedERC1155RoyaltyModuleVerifier';
export { EnhancedSupplyCapModuleVerifier } from './enhancedSupplyCapModuleVerifier';
export { EnhancedURIManagementModuleVerifier } from './enhancedURIManagementModuleVerifier';
export { EnhancedGranularApprovalModuleVerifier } from './enhancedGranularApprovalModuleVerifier';

// ============================================
// ERC3525 STANDARD & MODULES
// ============================================
export { ERC3525Verifier } from './erc3525Verifier';

// Enhanced ERC3525 Module Verifiers (Database-First) ✅ 3/3 COMPLETE
export { EnhancedSlotManagerModuleVerifier } from './enhancedSlotManagerModuleVerifier';
export { EnhancedSlotApprovableModuleVerifier } from './enhancedSlotApprovableModuleVerifier';
export { EnhancedValueExchangeModuleVerifier } from './enhancedValueExchangeModuleVerifier';

// ============================================
// ERC4626 STANDARD & MODULES (Tokenized Vaults)
// ============================================
export { ERC4626Verifier } from './erc4626Verifier';

// Enhanced ERC4626 Module Verifiers (Database-First) ✅ 7/7 COMPLETE
export { EnhancedFeeStrategyModuleVerifier } from './enhancedFeeStrategyModuleVerifier';
export { EnhancedWithdrawalQueueModuleVerifier } from './enhancedWithdrawalQueueModuleVerifier';
export { EnhancedYieldStrategyModuleVerifier } from './enhancedYieldStrategyModuleVerifier';
export { EnhancedNativeVaultModuleVerifier } from './enhancedNativeVaultModuleVerifier';
export { EnhancedAsyncVaultModuleVerifier } from './enhancedAsyncVaultModuleVerifier';
export { EnhancedMultiAssetVaultModuleVerifier } from './enhancedMultiAssetVaultModuleVerifier';
export { EnhancedRouterModuleVerifier } from './enhancedRouterModuleVerifier';

// ============================================
// ERC1400 STANDARD & MODULES (Security Tokens)
// ============================================
export { ERC1400Verifier } from './erc1400Verifier';

// Enhanced ERC1400 Module Verifiers (Database-First) ✅ 3/3 COMPLETE
export { EnhancedTransferRestrictionsModuleVerifier } from './enhancedTransferRestrictionsModuleVerifier';
export { EnhancedControllerModuleVerifier } from './enhancedControllerModuleVerifier';
export { EnhancedERC1400DocumentModuleVerifier } from './enhancedERC1400DocumentModuleVerifier';

// ============================================
// WRAPPER STANDARDS
// ============================================
export { 
  ERC20WrapperVerifier,
  ERC721WrapperVerifier
} from './wrapperVerifiers';

// ============================================
// REBASING STANDARD
// ============================================
export { ERC20RebasingVerifier } from './rebasingVerifier';

// ============================================
// UNIVERSAL MODULES (Cross-Standard)
// ============================================
// Enhanced Universal Module Verifiers (Database-First) ✅ 3/3 COMPLETE
export { EnhancedComplianceModuleVerifier } from './enhancedComplianceModuleVerifier';
export { EnhancedVestingModuleVerifier } from './enhancedVestingModuleVerifier';
export { EnhancedUniversalDocumentModuleVerifier } from './enhancedUniversalDocumentModuleVerifier'; // ✨ NEW

// Basic Universal Module Verifiers (Legacy - use enhanced versions above)
export {
  UniversalDocumentModuleVerifier,
  ERC4906MetadataModuleVerifier,
  ERC5216GranularApprovalModuleVerifier,
  ERC1363PayableTokenModuleVerifier,
  ERC3525ReceiverModuleVerifier
} from './universalModuleVerifiers';
