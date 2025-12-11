/**
 * Trade Finance Services
 * 
 * Export all trade finance-related services
 */

// Chain Type (re-exported from wallet utils)
export { ChainType } from '@/services/wallet/AddressUtils';

// Pool Operations
export { 
  CommodityPoolService,
  createCommodityPoolService,
  parseHealthFactor,
  isLiquidatable,
  getLiquidationUrgency,
  type CommodityPoolConfig,
  type SupplyParams,
  type WithdrawParams,
  type BorrowParams,
  type RepayParams,
  type LiquidateParams,
  type HealthFactorResult
} from './CommodityPoolService';

// Tokenization
export {
  CommodityTokenizationService,
  CommodityType as TokenizationCommodityType,
  DocumentType as TokenizationDocumentType,
  type CommodityMetadata,
  type DocumentUpload,
  type CommodityTokenizationParams,
  type CommodityTokenizationResult
} from './CommodityTokenizationService';

// Document Upload (IPFS)
export {
  DocumentUploadService,
  createDocumentUploadService,
  DocumentType,
  type Document,
  type UploadedDocument,
  type DocumentManifest,
  type IPFSUploadOptions,
  type DocumentVerificationResult
} from './DocumentUploadService';

// Oracle Integration
export {
  OracleIntegrationService,
  createOracleIntegrationService,
  CommodityType,
  PriceSource,
  type PriceData,
  type OracleConfig,
  type PriceHistoryPoint,
  type HaircutMetrics,
  type AggregatedPrice
} from './OracleIntegrationService';
