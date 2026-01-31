/**
 * XRPL Services Index
 * 
 * Centralized exports for all XRPL-related services
 */

// MPT Database Synchronization
export { mptDatabaseSync, MPTDatabaseSyncService } from './mpt-database-sync.service';

// MPT Metadata Utilities (XLS-89 Compliant)
export {
  compressMetadata,
  expandMetadata,
  encodeMetadataToHex,
  decodeMetadataFromHex,
  getMetadataByteSize,
  validateMetadata,
  validateCompressedMetadata,
  createEmptyMetadata,
  parseMetadata,
  formatMetadataForDisplay
} from './mpt-metadata-utils';

// MPT Metadata Examples
export {
  treasuryBillTokenExpanded,
  treasuryBillTokenCompressed,
  usdStablecoinExpanded,
  defiGovernanceTokenExpanded,
  gamingTokenExpanded,
  realEstateTokenExpanded
} from './mpt-metadata-examples';

// Re-export types
export type {
  BlockchainIssuanceState,
  BlockchainHolderState,
  SyncTransactionParams,
  SyncIssuanceParams,
  SyncHolderParams
} from './mpt-database-sync.service';
