/**
 * Universal Structured Product Metadata Builder
 * 
 * Single builder for ALL structured products via component composition
 * Replaces 39+ individual builders with one flexible system
 * 
 * Key Features:
 * - Component-based construction
 * - Automatic validation
 * - Size optimization
 * - Type-safe building
 * 
 * Usage:
 * ```typescript
 * const metadata = universalMetadataBuilder.buildStructuredProduct({
 *   productCategory: 'autocallable',
 *   underlyings: [{ type: 'equity_index', identifier: 'SPX', ... }],
 *   barriers: { barriers: [{ barrierType: 'autocall_barrier', ... }] },
 *   coupons: { coupons: [{ couponType: 'conditional', ... }] },
 *   // ... other components
 * });
 * ```
 */

import type {
  UniversalStructuredProductInput,
  UniversalStructuredProductMetadata,
  UnderlyingAsset,
  BarrierConfiguration,
  CouponConfiguration,
  CallableConfiguration,
  PutableConfiguration,
  ParticipationConfiguration,
  CapitalProtectionConfiguration,
  ObservationConfiguration,
  SettlementConfiguration,
  OracleConfiguration,
  PayoffStructure,
  RiskMetrics,
  CollateralConfiguration,
  DeliveryInstructions
} from './UniversalStructuredProductTypes';

import type {
  OnChainMetadataResult,
  MetadataValidationResult
} from '../OnChainMetadataTypes';

// ============================================================================
// UNIVERSAL METADATA BUILDER
// ============================================================================

export class UniversalStructuredProductMetadataBuilder {
  
  // ==========================================================================
  // PUBLIC API
  // ==========================================================================
  
  /**
   * Build structured product metadata from universal input
   * 
   * This is the MAIN entry point for creating any structured product
   */
  buildStructuredProduct(
    input: UniversalStructuredProductInput
  ): OnChainMetadataResult {
    const metadata = new Map<string, string>();
    
    // Step 1: Add universal base fields
    this.addUniversalFields(metadata, input);
    
    // Step 2: Add product classification
    metadata.set('assetClass', 'structured_product');
    metadata.set('productCategory', input.productCategory);
    metadata.set('productSubtype', input.productSubtype);
    
    // Step 3: Add underlyings
    this.addUnderlyings(metadata, input.underlyings, input.underlyingBasket);
    
    // Step 4: Add payoff structure
    this.addPayoffStructure(metadata, input.payoffStructure);
    
    // Step 5: Add optional components (if configured)
    if (input.barriers) {
      this.addBarriers(metadata, input.barriers);
    }
    
    if (input.coupons) {
      this.addCoupons(metadata, input.coupons);
    }
    
    if (input.callableFeature) {
      this.addCallable(metadata, input.callableFeature);
    }
    
    if (input.putableFeature) {
      this.addPutable(metadata, input.putableFeature);
    }
    
    if (input.participation) {
      this.addParticipation(metadata, input.participation);
    }
    
    if (input.capitalProtection) {
      this.addCapitalProtection(metadata, input.capitalProtection);
    }
    
    // Step 6: Add observation configuration
    this.addObservation(metadata, input.observation);
    
    // Step 7: Add settlement configuration
    this.addSettlement(metadata, input.settlement);
    
    // Step 8: Add oracles
    this.addOracles(metadata, input.oracles);
    
    // Step 9: Add risk metrics (if provided)
    if (input.riskMetrics) {
      this.addRiskMetrics(metadata, input.riskMetrics);
    }
    
    // Step 10: Validate and return
    return this.finalizeMetadata(input.name, input.symbol, input.uri, metadata);
  }
  
  // ==========================================================================
  // COMPONENT BUILDERS
  // ==========================================================================
  
  /**
   * Add universal fields common to all products
   */
  private addUniversalFields(
    metadata: Map<string, string>,
    input: UniversalStructuredProductInput
  ): void {
    metadata.set('version', '1.0');
    metadata.set('issuer', this.truncate(input.issuer, 50));
    metadata.set('jurisdiction', input.jurisdiction);
    metadata.set('issueDate', this.formatDate(input.issueDate));
    
    if (input.maturityDate) {
      metadata.set('maturityDate', this.formatDate(input.maturityDate));
    }
    
    metadata.set('currency', input.currency);
    metadata.set('decimals', input.decimals.toString());
    
    if (input.prospectusUri) {
      metadata.set('prospectusUri', input.prospectusUri);
    }
    
    if (input.termSheetUri) {
      metadata.set('termSheetUri', input.termSheetUri);
    }
  }
  
  /**
   * Add underlying assets
   */
  private addUnderlyings(
    metadata: Map<string, string>,
    underlyings: UnderlyingAsset[],
    basket?: any
  ): void {
    if (underlyings.length === 1) {
      // Single underlying
      const u = underlyings[0];
      metadata.set('underlyingType', u.type);
      metadata.set('underlyingId', u.identifier);
      metadata.set('underlyingName', this.truncate(u.name, 32));
      
      if (u.initialPrice) {
        metadata.set('initialPrice', u.initialPrice);
      }
      
      if (u.currentPrice) {
        metadata.set('currentPrice', u.currentPrice);
      }
      
      metadata.set('underlyingOracle', u.oracleAddress);
      metadata.set('underlyingOracleProvider', u.oracleProvider);
      
    } else {
      // Multiple underlyings - encode as JSON
      metadata.set('underlyingCount', underlyings.length.toString());
      metadata.set('underlyings', JSON.stringify(
        underlyings.map(u => ({
          type: u.type,
          id: u.identifier,
          name: this.truncate(u.name, 20),
          weight: u.weight || null,
          oracle: u.oracleAddress
        }))
      ));
      
      if (basket) {
        metadata.set('basketType', basket.basketType);
        if (basket.n) metadata.set('basketN', basket.n);
      }
    }
  }
  
  /**
   * Add payoff structure
   */
  private addPayoffStructure(
    metadata: Map<string, string>,
    payoff: PayoffStructure
  ): void {
    metadata.set('payoffType', payoff.payoffType);
    metadata.set('returnCalc', payoff.returnCalculation);
    
    if (payoff.cap) metadata.set('cap', payoff.cap);
    if (payoff.floor) metadata.set('floor', payoff.floor);
    if (payoff.digitalPayout) metadata.set('digitalPayout', payoff.digitalPayout);
    if (payoff.nonDigitalPayout) metadata.set('nonDigitalPayout', payoff.nonDigitalPayout);
    if (payoff.payoffFormula) metadata.set('payoffFormula', this.truncate(payoff.payoffFormula, 128));
    if (payoff.averagingDates) metadata.set('avgDates', this.truncate(payoff.averagingDates, 128));
    if (payoff.memoryFeature) metadata.set('memoryFeature', payoff.memoryFeature);
    if (payoff.accumulationMethod) metadata.set('accumMethod', payoff.accumulationMethod);
  }
  
  /**
   * Add barriers
   */
  private addBarriers(
    metadata: Map<string, string>,
    config: BarrierConfiguration
  ): void {
    metadata.set('barrierCount', config.barriers.length.toString());
    
    // Encode barriers as JSON array
    metadata.set('barriers', JSON.stringify(
      config.barriers.map(b => ({
        type: b.barrierType,
        level: b.level,
        dir: b.direction,
        obs: b.observationType,
        breached: b.breached,
        appliesTo: b.appliesTo
      }))
    ));
  }
  
  /**
   * Add coupons
   */
  private addCoupons(
    metadata: Map<string, string>,
    config: CouponConfiguration
  ): void {
    metadata.set('couponCount', config.coupons.length.toString());
    metadata.set('couponMemory', config.memoryFeature);
    
    // Encode primary coupon (first in array)
    const primary = config.coupons[0];
    if (primary) {
      metadata.set('couponType', primary.couponType);
      metadata.set('couponRate', primary.rate);
      metadata.set('couponFreq', primary.frequency);
      metadata.set('couponCond', primary.conditional);
      
      if (primary.referenceRate) {
        metadata.set('couponRefRate', primary.referenceRate);
      }
    }
    
    // If multiple coupons, encode all as JSON
    if (config.coupons.length > 1) {
      metadata.set('allCoupons', JSON.stringify(
        config.coupons.map(c => ({
          type: c.couponType,
          rate: c.rate,
          freq: c.frequency
        }))
      ));
    }
  }
  
  /**
   * Add callable feature
   */
  private addCallable(
    metadata: Map<string, string>,
    config: CallableConfiguration
  ): void {
    metadata.set('callable', 'true');
    metadata.set('callType', config.callType);
    metadata.set('callDates', this.truncate(config.callDates, 128));
    metadata.set('callPrices', this.truncate(config.callPrices, 128));
    metadata.set('called', config.called);
    
    if (config.softCall) {
      metadata.set('softCall', config.softCall);
    }
    
    if (config.callPremium) {
      metadata.set('callPremium', config.callPremium);
    }
  }
  
  /**
   * Add putable feature
   */
  private addPutable(
    metadata: Map<string, string>,
    config: PutableConfiguration
  ): void {
    metadata.set('putable', 'true');
    metadata.set('putType', config.putType);
    metadata.set('putDates', this.truncate(config.putDates, 128));
    metadata.set('putPrices', this.truncate(config.putPrices, 128));
    metadata.set('exercised', config.exercised);
  }
  
  /**
   * Add participation configuration
   */
  private addParticipation(
    metadata: Map<string, string>,
    config: ParticipationConfiguration
  ): void {
    metadata.set('upsideParticipation', config.upsideParticipation);
    metadata.set('downsideParticipation', config.downsideParticipation);
    
    if (config.upsideCap) metadata.set('upsideCap', config.upsideCap);
    if (config.downsideFloor) metadata.set('downsideFloor', config.downsideFloor);
    if (config.leverage) metadata.set('leverage', config.leverage);
    if (config.strike) metadata.set('strike', config.strike);
  }
  
  /**
   * Add capital protection
   */
  private addCapitalProtection(
    metadata: Map<string, string>,
    config: CapitalProtectionConfiguration
  ): void {
    metadata.set('protectionType', config.protectionType);
    metadata.set('protectionLevel', config.protectionLevel);
    
    if (config.buffer) metadata.set('buffer', config.buffer);
    if (config.guarantor) metadata.set('guarantor', this.truncate(config.guarantor, 50));
    if (config.guarantorRating) metadata.set('guarantorRating', config.guarantorRating);
    
    if (config.condition) {
      metadata.set('protectionCondType', config.condition.type);
      if (config.condition.barrierLevel) {
        metadata.set('protectionBarrier', config.condition.barrierLevel);
      }
    }
  }
  
  /**
   * Add observation configuration
   */
  private addObservation(
    metadata: Map<string, string>,
    config: ObservationConfiguration
  ): void {
    metadata.set('obsType', config.observationType);
    metadata.set('valuationMethod', config.valuationMethod);
    
    if (config.observationDates) {
      metadata.set('obsDates', this.truncate(config.observationDates, 128));
    }
    
    if (config.observationFrequency) {
      metadata.set('obsFreq', config.observationFrequency);
    }
    
    if (config.valuationTime) {
      metadata.set('valuationTime', config.valuationTime);
    }
    
    if (config.fixingConvention) {
      metadata.set('fixingConv', config.fixingConvention);
    }
    
    if (config.holidayCalendar) {
      metadata.set('holidayCalendar', config.holidayCalendar);
    }
  }
  
  /**
   * Add settlement configuration
   */
  private addSettlement(
    metadata: Map<string, string>,
    config: SettlementConfiguration
  ): void {
    metadata.set('settlementType', config.settlementType);
    metadata.set('settlementMethod', config.settlementMethod);
    metadata.set('settlementDays', config.settlementDays);
    metadata.set('redemptionVault', config.redemptionVault);
    
    if (config.settlementCurrency) {
      metadata.set('settlementCurrency', config.settlementCurrency);
    }
    
    if (config.earlySettlementAllowed) {
      metadata.set('earlySettlement', config.earlySettlementAllowed);
    }
    
    if (config.earlySettlementPenalty) {
      metadata.set('earlySettlementPenalty', config.earlySettlementPenalty);
    }
    
    // Digital asset delivery instructions
    if (config.deliveryInstructions) {
      this.addDeliveryInstructions(metadata, config.deliveryInstructions);
    }
    
    // Collateral configuration
    if (config.collateral) {
      this.addCollateral(metadata, config.collateral);
    }
  }
  
  /**
   * Add delivery instructions (NEW for digital assets)
   */
  private addDeliveryInstructions(
    metadata: Map<string, string>,
    delivery: DeliveryInstructions
  ): void {
    metadata.set('deliveryType', delivery.deliveryType);
    
    if (delivery.blockchain) {
      metadata.set('deliveryBlockchain', delivery.blockchain);
    }
    
    if (delivery.tokenMint) {
      metadata.set('deliveryTokenMint', delivery.tokenMint);
    }
    
    if (delivery.deliveryAddress) {
      metadata.set('deliveryAddress', delivery.deliveryAddress);
    }
    
    if (delivery.lockupPeriod) {
      metadata.set('deliveryLockup', delivery.lockupPeriod);
    }
  }
  
  /**
   * Add collateral configuration (NEW for crypto-backed products)
   */
  private addCollateral(
    metadata: Map<string, string>,
    collateral: CollateralConfiguration
  ): void {
    metadata.set('collateralType', collateral.collateralType);
    metadata.set('collateralRatio', collateral.collateralRatio);
    
    if (collateral.maintenanceMargin) {
      metadata.set('maintMargin', collateral.maintenanceMargin);
    }
    
    if (collateral.liquidationThreshold) {
      metadata.set('liqThreshold', collateral.liquidationThreshold);
    }
    
    if (collateral.liquidationPenalty) {
      metadata.set('liqPenalty', collateral.liquidationPenalty);
    }
    
    if (collateral.collateralVault) {
      metadata.set('collateralVault', collateral.collateralVault);
    }
    
    // Encode collateral assets as JSON if multiple
    if (collateral.collateralAssets && collateral.collateralAssets.length > 0) {
      metadata.set('collateralAssets', JSON.stringify(
        collateral.collateralAssets.map(a => ({
          type: a.type,
          id: a.identifier,
          amt: a.amount,
          wt: a.weight
        }))
      ));
    }
  }
  
  /**
   * Add oracles
   */
  private addOracles(
    metadata: Map<string, string>,
    oracles: OracleConfiguration[]
  ): void {
    metadata.set('oracleCount', oracles.length.toString());
    
    // Primary oracle
    const primary = oracles[0];
    if (primary) {
      metadata.set('oraclePurpose', primary.purpose);
      metadata.set('oracleProvider', primary.provider);
      metadata.set('oracleAddress', primary.oracleAddress);
      metadata.set('oracleFreq', primary.updateFrequency);
      metadata.set('oracleDataType', primary.dataType);
    }
    
    // If multiple oracles, encode as JSON
    if (oracles.length > 1) {
      metadata.set('allOracles', JSON.stringify(
        oracles.map(o => ({
          purpose: o.purpose,
          provider: o.provider,
          address: o.oracleAddress
        }))
      ));
    }
  }
  
  /**
   * Add risk metrics
   */
  private addRiskMetrics(
    metadata: Map<string, string>,
    risk: RiskMetrics
  ): void {
    if (risk.delta) metadata.set('delta', risk.delta);
    if (risk.gamma) metadata.set('gamma', risk.gamma);
    if (risk.vega) metadata.set('vega', risk.vega);
    if (risk.theta) metadata.set('theta', risk.theta);
    if (risk.rho) metadata.set('rho', risk.rho);
    if (risk.duration) metadata.set('duration', risk.duration);
    if (risk.convexity) metadata.set('convexity', risk.convexity);
    if (risk.breakEven) metadata.set('breakEven', risk.breakEven);
    if (risk.maxLoss) metadata.set('maxLoss', risk.maxLoss);
    if (risk.maxGain) metadata.set('maxGain', risk.maxGain);
  }
  
  // ==========================================================================
  // VALIDATION & FINALIZATION
  // ==========================================================================
  
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
   * Validate metadata against Token-2022 constraints
   */
  private validate(
    name: string,
    symbol: string,
    uri: string,
    additionalMetadata: Map<string, string>
  ): MetadataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate standard fields
    if (this.getByteLength(name) > 32) {
      errors.push(`Name exceeds 32 bytes: "${name}"`);
    }
    
    if (this.getByteLength(symbol) > 10) {
      errors.push(`Symbol exceeds 10 bytes: "${symbol}"`);
    }
    
    if (this.getByteLength(uri) > 200) {
      errors.push(`URI exceeds 200 bytes: "${uri}"`);
    }
    
    // Validate additional metadata size
    let totalSize = 0;
    let fieldCount = 0;
    
    additionalMetadata.forEach((value, key) => {
      fieldCount++;
      const keySize = this.getByteLength(key);
      const valueSize = this.getByteLength(value);
      
      if (keySize > 32) {
        errors.push(`Metadata key "${key}" exceeds 32 bytes`);
      }
      
      if (valueSize > 128) {
        errors.push(`Metadata value for "${key}" exceeds 128 bytes`);
      }
      
      totalSize += keySize + valueSize;
    });
    
    if (fieldCount > 20) {
      warnings.push(`Metadata has ${fieldCount} fields (recommended max: 20)`);
    }
    
    if (totalSize > 1024) {
      errors.push(`Total metadata size ${totalSize} bytes exceeds target 1024 bytes`);
    } else if (totalSize > 900) {
      warnings.push(`Metadata size ${totalSize} bytes is close to limit 1024 bytes`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      estimatedSize: totalSize
    };
  }
  
  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================
  
  /**
   * Truncate string to max length
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
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const universalMetadataBuilder = new UniversalStructuredProductMetadataBuilder();
