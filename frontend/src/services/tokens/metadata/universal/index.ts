/**
 * Universal Structured Product Framework - Main Export
 * 
 * Complete Universal Framework for composable structured products
 * 
 * Usage:
 * ```typescript
 * import { 
 *   universalMetadataBuilder,
 *   ProductTemplates,
 *   type UniversalSPInput
 * } from '@/services/tokens/metadata/universal';
 * 
 * // Use a template
 * const config = ProductTemplates.AutocallableBarrier.build({
 *   underlyingTicker: 'SPX',
 *   initialPrice: 5000,
 *   couponRate: 8.5,
 *   redemptionVault: 'vault_address'
 * });
 * 
 * // Build metadata
 * const metadata = universalMetadataBuilder.buildStructuredProduct({
 *   ...config,
 *   name: 'Autocallable S&P 500 Note 2026',
 *   symbol: 'ACSPX26',
 *   uri: 'ar://metadata-uri'
 * });
 * ```
 */

// Type exports
export type {
  UniversalStructuredProductMetadata,
  UniversalStructuredProductInput,
  UniversalSPMetadata,
  UniversalSPInput,
  ProductCategory,
  UnderlyingAsset,
  UnderlyingType,
  BasketConfiguration,
  PayoffStructure,
  PayoffType,
  BarrierConfiguration,
  Barrier,
  BarrierType,
  CouponConfiguration,
  Coupon,
  CouponType,
  CouponCondition,
  CallableConfiguration,
  PutableConfiguration,
  ParticipationConfiguration,
  CapitalProtectionConfiguration,
  ObservationConfiguration,
  SettlementConfiguration,
  SettlementType,
  DeliveryInstructions,
  CollateralConfiguration,
  CollateralType,
  CollateralAsset,
  RiskMetrics,
  OracleConfiguration
} from './UniversalStructuredProductTypes';

export type {
  ProductTemplate,
  TemplateParams
} from './ProductTemplates';

// Service exports
export { UniversalStructuredProductMetadataBuilder } from './UniversalMetadataBuilder';
export { universalMetadataBuilder } from './UniversalMetadataBuilder';

export { UniversalFrameworkIntegrationService, universalFrameworkIntegrationService } from './UniversalFrameworkIntegrationService';
export type { 
  UniversalProductDeploymentConfig,
  UniversalProductDeploymentResult
} from './UniversalFrameworkIntegrationService';

// Template exports
export {
  ProductTemplates,
  getAllTemplates,
  getTemplate,
  AutocallableBarrierTemplate,
  WorstOfAutocallableTemplate,
  BonusCertificateTemplate,
  PrincipalProtectedNoteTemplate,
  ReverseConvertibleTemplate,
  CryptoSettledAutocallableTemplate
} from './ProductTemplates';
