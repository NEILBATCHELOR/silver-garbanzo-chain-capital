/**
 * On-Chain Metadata Builder Service - Part 1/3
 * 
 * Builds, validates, and optimizes on-chain metadata for Token-2022 tokens
 * Supports all asset classes per Chain Capital Metadata Specification v1.0.0
 * 
 * Key Features:
 * - Size optimization (target <1KB)
 * - Type-safe builders for each asset class
 * - Validation against Token-2022 constraints
 * - Arweave/IPFS URI support
 * - Multi-chain compatible structure
 */

import {
  type OnChainMetadataResult,
  type MetadataValidationResult,
  type MetadataConstraints,
  type MetadataInput,
  type AutocallableInput,
  type PrincipalProtectedNoteInput,
  type ReverseConvertibleInput,
  type CommonStockInput,
  type PrivateEquityInput,
  type CorporateBondInput,
  type GovernmentBondInput,
  type CommercialPaperInput,
  type CreditLinkedNoteInput,
  type MutualFundInput,
  type ETFInput,
  type ActivelyManagedCertificateInput,
  type CommoditySpotInput,
  type CommodityFuturesInput,
  type TrackerCertificateInput,
  type GenericInput,
  TOKEN2022_METADATA_CONSTRAINTS
} from './OnChainMetadataTypes';

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class OnChainMetadataBuilder {
  private constraints: MetadataConstraints;

  constructor(constraints: MetadataConstraints = TOKEN2022_METADATA_CONSTRAINTS) {
    this.constraints = constraints;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Build metadata from input parameters
   */
  build(input: MetadataInput): OnChainMetadataResult {
    switch (input.type) {
      // Structured Products
      case 'autocallable':
        return this.buildAutocallable(input);
      case 'principal_protected_note':
        return this.buildPrincipalProtectedNote(input);
      case 'reverse_convertible':
        return this.buildReverseConvertible(input);
      
      // Equity
      case 'common_stock':
        return this.buildCommonStock(input);
      case 'private_equity':
        return this.buildPrivateEquity(input);
      
      // Fixed Income
      case 'corporate_bond':
        return this.buildCorporateBond(input);
      case 'government_bond':
        return this.buildGovernmentBond(input);
      case 'commercial_paper':
        return this.buildCommercialPaper(input);
      case 'credit_linked_note':
        return this.buildCreditLinkedNote(input);
      
      // Funds
      case 'mutual_fund':
        return this.buildMutualFund(input);
      case 'etf':
        return this.buildETF(input);
      case 'actively_managed_certificate':
        return this.buildActivelyManagedCertificate(input);
      
      // Commodities
      case 'commodity_spot':
        return this.buildCommoditySpot(input);
      case 'commodity_futures':
        return this.buildCommodityFutures(input);
      case 'tracker_certificate':
        return this.buildTrackerCertificate(input);
      
      // Alternative Investments
      case 'venture_capital_fund':
        return this.buildVentureCapitalFund(input);
      case 'direct_lending':
        return this.buildDirectLending(input);
      case 'commercial_real_estate':
        return this.buildCommercialRealEstate(input);
      case 'reit':
        return this.buildREIT(input);
      case 'infrastructure':
        return this.buildInfrastructureAsset(input);
      case 'renewable_energy_project':
        return this.buildRenewableEnergyProject(input);
      case 'oil_gas_asset':
        return this.buildOilGasAsset(input);
      case 'collectible':
        return this.buildCollectible(input);
      
      // Digital Native
      case 'fiat_backed_stablecoin':
        return this.buildFiatBackedStablecoin(input);
      case 'crypto_backed_stablecoin':
        return this.buildCryptoBackedStablecoin(input);
      case 'algorithmic_stablecoin':
        return this.buildAlgorithmicStablecoin(input);
      case 'rebasing_stablecoin':
        return this.buildRebasingStablecoin(input);
      case 'commodity_backed_stablecoin':
        return this.buildCommodityBackedStablecoin(input);
      case 'carbon_credit':
        return this.buildCarbonCredit(input);
      case 'renewable_energy_certificate':
        return this.buildRenewableEnergyCertificate(input);
      case 'invoice_receivable':
        return this.buildInvoiceReceivable(input);
      
      // Generic
      case 'generic':
        return this.buildGeneric(input);
      
      default:
        throw new Error(`Unsupported metadata type: ${(input as any).type}`);
    }
  }

  /**
   * Validate existing metadata Map
   */
  validate(
    name: string,
    symbol: string,
    uri: string,
    additionalMetadata: Map<string, string>
  ): MetadataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate standard fields
    if (this.getByteLength(name) > this.constraints.name) {
      errors.push(`Name exceeds ${this.constraints.name} bytes: "${name}"`);
    }

    if (this.getByteLength(symbol) > this.constraints.symbol) {
      errors.push(`Symbol exceeds ${this.constraints.symbol} bytes: "${symbol}"`);
    }

    if (this.getByteLength(uri) > this.constraints.uri) {
      errors.push(`URI exceeds ${this.constraints.uri} bytes: "${uri}"`);
    }

    // Validate additional metadata
    let totalSize = 0;
    let fieldCount = 0;

    additionalMetadata.forEach((value, key) => {
      fieldCount++;
      const keySize = this.getByteLength(key);
      const valueSize = this.getByteLength(value);

      if (keySize > this.constraints.additionalMetadata.maxKeyLength) {
        errors.push(
          `Metadata key "${key}" exceeds ${this.constraints.additionalMetadata.maxKeyLength} bytes`
        );
      }

      if (valueSize > this.constraints.additionalMetadata.maxValueLength) {
        errors.push(
          `Metadata value for "${key}" exceeds ${this.constraints.additionalMetadata.maxValueLength} bytes`
        );
      }

      totalSize += keySize + valueSize;
    });

    if (fieldCount > this.constraints.additionalMetadata.maxFields) {
      warnings.push(
        `Metadata has ${fieldCount} fields (recommended max: ${this.constraints.additionalMetadata.maxFields})`
      );
    }

    if (totalSize > this.constraints.additionalMetadata.totalSize) {
      errors.push(
        `Total metadata size ${totalSize} bytes exceeds target ${this.constraints.additionalMetadata.totalSize} bytes`
      );
    } else if (totalSize > this.constraints.additionalMetadata.totalSize * 0.9) {
      warnings.push(
        `Metadata size ${totalSize} bytes is close to limit ${this.constraints.additionalMetadata.totalSize} bytes`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      estimatedSize: totalSize
    };
  }

  // ==========================================================================
  // STRUCTURED PRODUCTS BUILDERS
  // ==========================================================================

  /**
   * Build Autocallable structured product metadata
   */
  buildAutocallable(params: AutocallableInput): OnChainMetadataResult {
    const metadata = new Map<string, string>();

    // Universal fields
    this.addUniversalFields(metadata, params);
    
    // Classification
    metadata.set('assetClass', 'structured_product');
    metadata.set('instrumentType', 'autocallable');
    metadata.set('productSubtype', params.productSubtype);

    // Underlying
    metadata.set('underlying', params.underlying);
    metadata.set('underlyingName', this.truncate(params.underlyingName, 32));
    metadata.set('initialPrice', this.formatNumber(params.initialPrice));

    // Autocallable Terms
    metadata.set('barrierLevel', this.formatNumber(params.barrierLevel));
    metadata.set('knockInBarrier', this.formatNumber(params.knockInBarrier));
    if (params.protectionBarrier) {
      metadata.set('protectionBarrier', this.formatNumber(params.protectionBarrier));
    }
    metadata.set('couponRate', this.formatNumber(params.couponRate));
    metadata.set('couponType', params.couponType);
    metadata.set('memoryFeature', params.memoryFeature ? 'true' : 'false');

    // Observation
    metadata.set('observationFreq', params.observationFreq);
    metadata.set('callType', params.callType);
    metadata.set('firstObsDate', this.formatDate(params.firstObsDate));
    metadata.set('finalObsDate', this.formatDate(params.finalObsDate));

    // Oracle & Pricing
    metadata.set('oracleProvider', params.oracleProvider);
    metadata.set('oracleAddress', params.oracleAddress);
    metadata.set('valuationMethod', params.valuationMethod);
    metadata.set('fixingTime', params.fixingTime);

    // Redemption
    metadata.set('redemptionVault', params.redemptionVault);
    metadata.set('redemptionMethod', params.redemptionMethod);
    metadata.set('settlementDays', params.settlementDays.toString());

    // Participation
    metadata.set('upsideParticipation', this.formatNumber(params.upsideParticipation));
    metadata.set('downsideParticipation', this.formatNumber(params.downsideParticipation));
    if (params.cap) {
      metadata.set('cap', this.formatNumber(params.cap));
    }

    return this.finalizeMetadata(params.name, params.symbol, params.uri, metadata);
  }

  /**
   * Build Principal Protected Note metadata
   */
  buildPrincipalProtectedNote(params: PrincipalProtectedNoteInput): OnChainMetadataResult {
    const metadata = new Map<string, string>();

    this.addUniversalFields(metadata, params);
    
    metadata.set('assetClass', 'structured_product');
    metadata.set('instrumentType', 'principal_protected_note');
    
    // Protection
    metadata.set('protectionLevel', this.formatNumber(params.protectionLevel));
    metadata.set('protectionType', params.protectionType);
    
    // Underlying
    metadata.set('underlying', params.underlying);
    metadata.set('underlyingName', this.truncate(params.underlyingName, 32));
    metadata.set('initialPrice', this.formatNumber(params.initialPrice));
    
    // Participation
    metadata.set('upsideParticipation', this.formatNumber(params.upsideParticipation));
    metadata.set('downsideProtection', this.formatNumber(params.downsideProtection));
    if (params.capLevel) {
      metadata.set('capLevel', this.formatNumber(params.capLevel));
    }
    
    // Oracle
    metadata.set('oracleProvider', params.oracleProvider);
    metadata.set('oracleAddress', params.oracleAddress);
    
    // Redemption
    metadata.set('redemptionVault', params.redemptionVault);
    metadata.set('redemptionMethod', params.redemptionMethod);

    return this.finalizeMetadata(params.name, params.symbol, params.uri, metadata);
  }

  /**
   * Build Reverse Convertible metadata
   */
  buildReverseConvertible(params: ReverseConvertibleInput): OnChainMetadataResult {
    const metadata = new Map<string, string>();

    this.addUniversalFields(metadata, params);
    
    metadata.set('assetClass', 'structured_product');
    metadata.set('instrumentType', 'reverse_convertible');
    
    // Underlying
    metadata.set('underlying', params.underlying);
    metadata.set('underlyingName', this.truncate(params.underlyingName, 32));
    metadata.set('initialPrice', this.formatNumber(params.initialPrice));
    metadata.set('strikePrice', this.formatNumber(params.strikePrice));
    
    // Coupon
    metadata.set('couponRate', this.formatNumber(params.couponRate));
    metadata.set('couponFrequency', params.couponFrequency);
    metadata.set('couponType', params.couponType);
    
    // Conversion
    metadata.set('knockInBarrier', this.formatNumber(params.knockInBarrier));
    metadata.set('conversionRatio', this.formatNumber(params.conversionRatio));
    metadata.set('barrierType', params.barrierType);
    
    // Observation
    metadata.set('observationType', params.observationType);
    
    // Oracle
    metadata.set('oracleProvider', params.oracleProvider);
    metadata.set('oracleAddress', params.oracleAddress);
    
    // Settlement
    metadata.set('settlementType', params.settlementType);
    metadata.set('redemptionVault', params.redemptionVault);

    return this.finalizeMetadata(params.name, params.symbol, params.uri, metadata);
  }

  // ==========================================================================
  // EQUITY SECURITIES BUILDERS
  // ==========================================================================

  /**
   * Build Common Stock metadata
   */
  buildCommonStock(params: CommonStockInput): OnChainMetadataResult {
    const metadata = new Map<string, string>();

    this.addUniversalFields(metadata, params);
    
    metadata.set('assetClass', 'equity');
    metadata.set('instrumentType', 'common_stock');
    metadata.set('securityType', params.securityType);
    
    // Company
    metadata.set('companyName', this.truncate(params.companyName, 50));
    if (params.ticker) metadata.set('ticker', params.ticker);
    if (params.cusip) metadata.set('cusip', params.cusip);
    if (params.isin) metadata.set('isin', params.isin);
    if (params.exchange) metadata.set('exchange', params.exchange);
    
    // Valuation
    metadata.set('valuationMethod', params.valuationMethod);
    if (params.oracleProvider) metadata.set('oracleProvider', params.oracleProvider);
    if (params.oracleAddress) metadata.set('oracleAddress', params.oracleAddress);
    
    // Dividends
    if (params.dividendYield) metadata.set('dividendYield', this.formatNumber(params.dividendYield));
    if (params.dividendFrequency) metadata.set('dividendFrequency', params.dividendFrequency);
    if (params.exDividendDate) metadata.set('exDividendDate', this.formatDate(params.exDividendDate));
    
    // Rights
    metadata.set('votingRights', params.votingRights ? 'true' : 'false');
    if (params.sharesOutstanding) metadata.set('sharesOutstanding', params.sharesOutstanding.toString());

    return this.finalizeMetadata(params.name, params.symbol, params.uri, metadata);
  }

  /**
   * Build Private Equity metadata
   */
  buildPrivateEquity(params: PrivateEquityInput): OnChainMetadataResult {
    const metadata = new Map<string, string>();

    this.addUniversalFields(metadata, params);
    
    metadata.set('assetClass', 'equity');
    metadata.set('instrumentType', 'private_equity');
    metadata.set('securityType', params.securityType);
    if (params.fundingRound) metadata.set('fundingRound', params.fundingRound);
    
    // Company
    metadata.set('companyName', this.truncate(params.companyName, 50));
    metadata.set('sector', params.sector);
    if (params.foundedYear) metadata.set('foundedYear', params.foundedYear);
    
    // Valuation
    metadata.set('valuationMethod', params.valuationMethod);
    metadata.set('fairMarketValue', this.formatNumber(params.fairMarketValue));
    if (params.lastRoundPrice) metadata.set('lastRoundPrice', this.formatNumber(params.lastRoundPrice));
    if (params.lastRoundDate) metadata.set('lastRoundDate', this.formatDate(params.lastRoundDate));
    
    // Rights
    if (params.liquidationPreference) {
      metadata.set('liquidationPreference', this.formatNumber(params.liquidationPreference) + 'x');
    }
    metadata.set('participationRights', params.participationRights ? 'true' : 'false');
    metadata.set('votingRights', params.votingRights ? 'true' : 'false');
    metadata.set('proRataRights', params.proRataRights ? 'true' : 'false');
    metadata.set('dragAlongRights', params.dragAlongRights ? 'true' : 'false');
    
    // Restrictions
    if (params.lockupPeriod) metadata.set('lockupPeriod', params.lockupPeriod.toString());
    if (params.transferRestrictions) metadata.set('transferRestrictions', params.transferRestrictions);
    
    // Documents
    if (params.articlesUri) metadata.set('articlesUri', params.articlesUri);
    if (params.shareholderAgreementUri) metadata.set('shareholderAgreementUri', params.shareholderAgreementUri);

    return this.finalizeMetadata(params.name, params.symbol, params.uri, metadata);
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Add universal fields common to all assets
   */
  private addUniversalFields(metadata: Map<string, string>, params: any): void {
    metadata.set('version', '1.0');
    metadata.set('issuer', this.truncate(params.issuer, 50));
    metadata.set('jurisdiction', params.jurisdiction);
    metadata.set('issueDate', this.formatDate(params.issueDate));
    if (params.maturityDate) metadata.set('maturityDate', this.formatDate(params.maturityDate));
    metadata.set('currency', params.currency);
    metadata.set('decimals', params.decimals.toString());
    if (params.prospectusUri) metadata.set('prospectusUri', params.prospectusUri);
    if (params.termSheetUri) metadata.set('termSheetUri', params.termSheetUri);
  }

  /**
   * Finalize metadata with validation
   */
  private finalizeMetadata(
    name: string,
    symbol: string,
    uri: string,
    metadata: Map<string, string>
  ): OnChainMetadataResult {
    const validation = this.validate(name, symbol, uri, metadata);
    return {
      name,
      symbol,
      uri,
      additionalMetadata: metadata,
      validation
    };
  }

  /**
   * Truncate string to max length, adding ellipsis if needed
   */
  private truncate(str: string, maxLength: number): string {
    if (this.getByteLength(str) <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format date to ISO 8601 (YYYY-MM-DD)
   */
  private formatDate(date: string | Date): string {
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    return date.toISOString().split('T')[0];
  }

  /**
   * Format number with reasonable precision (2 decimal places)
   */
  private formatNumber(num: number): string {
    return num.toFixed(2);
  }

  /**
   * Get byte length of UTF-8 string
   */
  private getByteLength(str: string): number {
    return new TextEncoder().encode(str).length;
  }

  /**
   * Calculate total metadata size
   */
  calculateMetadataSize(metadata: Map<string, string>): number {
    let total = 0;
    metadata.forEach((value, key) => {
      total += this.getByteLength(key) + this.getByteLength(value);
    });
    return total;
  }

  /**
   * Build generic metadata from custom fields
   */
  buildGeneric(params: GenericInput): OnChainMetadataResult {
    const metadata = new Map<string, string>();

    metadata.set('assetClass', params.assetClass);
    metadata.set('instrumentType', params.instrumentType);
    metadata.set('version', '1.0');

    Object.entries(params.customFields).forEach(([key, value]) => {
      metadata.set(key, value);
    });

    return this.finalizeMetadata(params.name, params.symbol, params.uri, metadata);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const onChainMetadataBuilder = new OnChainMetadataBuilder();
