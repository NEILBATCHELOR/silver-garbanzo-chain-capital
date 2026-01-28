/**
 * On-Chain Metadata Services
 * Export all metadata builder services and types
 * 
 * USAGE APPROACHES:
 * 
 * ⭐ RECOMMENDED: Universal Framework (New - Phase 4)
 * - One framework handles ALL structured products
 * - Component-based configuration
 * - Infinite product flexibility
 * 
 * Legacy: Individual Builders (Phase 1-3)
 * - Separate builders for each asset class
 * - Maintained for backward compatibility
 * - Will be deprecated in future versions
 */

// ============================================================================
// UNIVERSAL FRAMEWORK (RECOMMENDED) ⭐
// ============================================================================

/**
 * Universal Structured Product Framework
 * 
 * - Single builder for all structured products
 * - Component-based composition
 * - Pre-built templates for common products
 * - Full type safety
 * 
 * Example:
 * ```typescript
 * import { 
 *   universalMetadataBuilder,
 *   ProductTemplates
 * } from '@/services/tokens/metadata/universal';
 * 
 * // Use template
 * const config = ProductTemplates.AutocallableBarrier.build({
 *   underlyingTicker: 'SPX',
 *   initialPrice: 5000,
 *   couponRate: 8.5
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
export * from './universal';

// Migration adapter for converting legacy inputs to universal format
export { migrationAdapter } from './universal/MigrationAdapter';

// ============================================================================
// LEGACY BUILDERS (Backward Compatibility)
// ============================================================================

// Phase 1: Core types and base builder
// Export OnChain types with explicit re-export to avoid ambiguity with Universal types
export type {
  // Core types
  AssetClass,
  OnChainMetadataResult,
  BaseInput,
  
  // Structured Products
  AutocallableInput,
  PrincipalProtectedNoteInput,
  ReverseConvertibleInput,
  
  // Supporting types for OnChain metadata
  UnderlyingAsset as OnChainUnderlyingAsset,
  BarrierSchedule,
  CallSchedule,
  
  // Other asset classes
  CommonStockInput,
  PrivateEquityInput,
  CorporateBondInput,
  GovernmentBondInput,
  CommercialPaperInput,
  CreditLinkedNoteInput,
  MutualFundInput,
  ETFInput,
  ActivelyManagedCertificateInput,
  CommoditySpotInput,
  CommodityFuturesInput,
  TrackerCertificateInput,
  VentureCapitalFundInput,
  DirectLendingInput,
  CommercialRealEstateInput,
  REITInput,
  InfrastructureAssetInput,
  RenewableEnergyProjectInput,
  OilGasAssetInput,
  CollectibleInput,
  FiatBackedStablecoinInput,
  CryptoBackedStablecoinInput,
  AlgorithmicStablecoinInput,
  RebasingStablecoinInput,
  CommodityBackedStablecoinInput,
  CarbonCreditInput,
  RenewableEnergyCertificateInput,
  InvoiceReceivableInput
} from './OnChainMetadataTypes';

export * from './OnChainMetadataBuilder';

// Phase 2: Extended builders Part 1 (Fixed Income, Funds, Commodities)
import './OnChainMetadataBuilderExtensions';

// Phase 2.5: Extended builders Part 2 (Alternatives, Digital Native)
import './OnChainMetadataBuilderExtensions2';

// Phase 3: Complete deployment service
export * from './Token2022MetadataDeploymentService';

// ============================================================================
// QUICK START EXAMPLES
// ============================================================================

/**
 * NEW: Universal Framework Approach (RECOMMENDED)
 * 
 * ```typescript
 * import { 
 *   universalMetadataBuilder,
 *   ProductTemplates,
 *   type UniversalSPInput
 * } from '@/services/tokens/metadata/universal';
 * 
 * // Option 1: Use pre-built template
 * const autocallableConfig = ProductTemplates.AutocallableBarrier.build({
 *   underlyingTicker: 'SPX',
 *   initialPrice: 5000,
 *   couponRate: 8.5,
 *   redemptionVault: 'vault_address'
 * });
 * 
 * const metadata = universalMetadataBuilder.buildStructuredProduct({
 *   ...autocallableConfig,
 *   name: 'Autocallable S&P 500 Note 2026',
 *   symbol: 'ACSPX26',
 *   uri: 'ar://metadata-uri'
 * });
 * 
 * // Option 2: Build custom product from scratch
 * const customProduct: UniversalSPInput = {
 *   type: 'universal_structured_product',
 *   name: 'Custom Snowball Note',
 *   symbol: 'SNOW26',
 *   productCategory: 'range_accrual',
 *   productSubtype: 'snowball_note',
 *   underlyings: [{ ... }],
 *   barriers: { barriers: [ ... ] },
 *   coupons: { coupons: [ ... ] },
 *   observation: { ... },
 *   settlement: { ... },
 *   oracles: [ ... ]
 * };
 * 
 * const customMetadata = universalMetadataBuilder.buildStructuredProduct(customProduct);
 * ```
 */

/**
 * LEGACY: Individual Builder Approach (Maintained for backward compatibility)
 * 
 * ```typescript
 * import { token2022MetadataDeploymentService } from '@/services/tokens/metadata';
 * 
 * // Deploy autocallable with metadata
 * const result = await token2022MetadataDeploymentService.deployAutocallable({
 *   metadata: {
 *     type: 'autocallable',
 *     name: 'Autocallable S&P 500 Note 2026',
 *     symbol: 'ACSPX26',
 *     uri: 'ar://full-metadata-uri',
 *     decimals: 6,
 *     // ... autocallable-specific fields
 *   },
 *   initialSupply: 1000000,
 *   enablePermanentDelegate: true,
 *   deploymentOptions: {
 *     network: 'devnet',
 *     projectId: '...',
 *     userId: '...',
 *     walletPrivateKey: '...'
 *   }
 * });
 * ```
 */
