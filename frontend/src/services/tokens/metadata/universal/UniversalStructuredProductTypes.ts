/**
 * Universal Structured Product Framework - Type Definitions
 * 
 * Composable, configurable metadata system for ALL structured products
 * Based on Chain Capital Universal Framework v1.0.0
 * 
 * Key Principles:
 * 1. Composability over Enumeration
 * 2. Mix and match components
 * 3. Single implementation for infinite products
 * 4. Configuration-driven architecture
 * 
 * Date: January 27, 2026
 */

import type { UniversalMetadata } from '../OnChainMetadataTypes';

// ============================================================================
// CORE UNIVERSAL METADATA INTERFACE
// ============================================================================

export interface UniversalStructuredProductMetadata extends UniversalMetadata {
  assetClass: 'structured_product';
  
  // ===== PRODUCT CLASSIFICATION =====
  productCategory: ProductCategory;
  productSubtype: string; // Free-form for specific naming
  
  // ===== UNDERLYING(S) =====
  underlyings: UnderlyingAsset[];
  underlyingBasket?: BasketConfiguration;
  
  // ===== PAYOFF STRUCTURE =====
  payoffStructure: PayoffStructure;
  
  // ===== BARRIER CONFIGURATION =====
  barriers?: BarrierConfiguration;
  
  // ===== COUPON STRUCTURE =====
  coupons?: CouponConfiguration;
  
  // ===== CALLABLE/PUTABLE FEATURES =====
  callableFeature?: CallableConfiguration;
  putableFeature?: PutableConfiguration;
  
  // ===== PARTICIPATION & LEVERAGE =====
  participation?: ParticipationConfiguration;
  
  // ===== CAPITAL PROTECTION =====
  capitalProtection?: CapitalProtectionConfiguration;
  
  // ===== OBSERVATION & VALUATION =====
  observation: ObservationConfiguration;
  
  // ===== SETTLEMENT & REDEMPTION =====
  settlement: SettlementConfiguration;
  
  // ===== RISK METRICS =====
  riskMetrics?: RiskMetrics;
  
  // ===== ORACLE CONFIGURATION =====
  oracles: OracleConfiguration[];
}

// ============================================================================
// PRODUCT CATEGORIES (Top-Level Classification)
// ============================================================================

export type ProductCategory =
  // Capital Guarantee
  | 'capital_guarantee'          // 100% principal protected
  | 'partial_protection'         // Buffer/barrier protection
  
  // Yield Enhancement
  | 'yield_enhancement'          // High coupons, capital at risk
  | 'income_generation'          // Regular distributions
  
  // Participation
  | 'participation'              // Upside participation
  | 'leveraged_participation'    // Geared exposure
  
  // Autocallable
  | 'autocallable'               // Early redemption features
  | 'callable'                   // Issuer call rights
  
  // Range/Path-Dependent
  | 'range_accrual'              // Accumulation within range
  | 'path_dependent'             // History matters
  
  // Volatility
  | 'volatility'                 // Vol exposure
  | 'dispersion'                 // Index vs components vol
  
  // Credit
  | 'credit_linked'              // Credit event exposure
  | 'credit_derivative'          // Credit swaps
  
  // Rate-Linked
  | 'rate_linked'                // Interest rate exposure
  | 'inflation_linked'           // CPI/inflation exposure
  
  // FX-Linked
  | 'fx_linked'                  // Currency exposure
  | 'dual_currency'              // Multi-currency
  
  // Commodity
  | 'commodity_linked'           // Commodity exposure
  
  // Options
  | 'option'                     // Standard/exotic options
  | 'exotic_option';             // Path-dependent options

// ============================================================================
// UNDERLYING ASSET (Supports Any Asset Type)
// ============================================================================

export interface UnderlyingAsset {
  // Identification
  identifier: string;            // Ticker, CUSIP, ISIN, address
  name: string;
  type: UnderlyingType;
  
  // Pricing
  initialPrice?: string;
  currentPrice?: string;
  
  // Weighting (for baskets)
  weight?: string;               // % of basket
  
  // Oracle
  oracleAddress: string;
  oracleProvider: 'pyth' | 'chainlink' | 'switchboard';
  
  // Additional Context
  currency?: string;
  exchange?: string;
  sector?: string;
}

export type UnderlyingType =
  // Equities
  | 'equity_single'
  | 'equity_index'
  | 'equity_basket'
  
  // Rates
  | 'interest_rate'              // SOFR, LIBOR, etc.
  | 'yield_curve'                // Spread between rates
  | 'cms_rate'                   // Constant Maturity Swap
  | 'inflation_index'            // CPI, PCE
  
  // FX
  | 'fx_spot'
  | 'fx_forward'
  | 'fx_cross'
  
  // Credit
  | 'credit_spread'
  | 'credit_index'               // CDX, iTraxx
  | 'reference_entity'           // For CDS
  
  // Commodities
  | 'commodity_spot'
  | 'commodity_futures'
  
  // Volatility
  | 'volatility_index'           // VIX, VVIX
  | 'realized_volatility'
  | 'implied_volatility'
  
  // Digital Assets (NEW)
  | 'crypto_asset'               // BTC, ETH, SOL
  | 'stablecoin'                 // USDC, USDT
  | 'digital_commodity'          // Tokenized gold, oil
  
  // Other
  | 'bond'
  | 'fund'
  | 'custom';

// ============================================================================
// BASKET CONFIGURATION (For Multi-Asset Products)
// ============================================================================

export interface BasketConfiguration {
  basketType: 'worst_of' | 'best_of' | 'average' | 'nth_best' | 'rainbow' | 'weighted_basket';
  
  // For nth-best
  n?: string;                    // e.g., "2" for 2nd best of 5
  
  // Correlation assumptions
  assumedCorrelation?: string;
  
  // Rebalancing
  rebalanceFrequency?: 'never' | 'quarterly' | 'annual';
  lastRebalance?: string;        // ISO date
}

// ============================================================================
// PAYOFF STRUCTURE (Defines Return Calculation)
// ============================================================================

export interface PayoffStructure {
  payoffType: PayoffType;
  
  // Return Calculation
  returnCalculation: 'point_to_point' | 'average' | 'lookback' | 'cliquet' | 'performance';
  
  // Caps & Floors
  cap?: string;                  // Maximum return %
  floor?: string;                // Minimum return %
  
  // Digital/Binary
  digitalPayout?: string;        // Fixed payout if condition met
  nonDigitalPayout?: string;     // Payout if condition not met
  
  // Payoff Formula (for complex structures)
  payoffFormula?: string;        // e.g., "MAX(0, (S_T - K) / K) * participation"
  
  // Smoothing/Averaging
  averagingDates?: string;       // JSON array of observation dates
  
  // Memory/Accumulation
  memoryFeature?: 'true' | 'false';
  accumulationMethod?: 'sum' | 'compound';
}

export type PayoffType =
  // Linear
  | 'linear'                     // 1:1 participation
  | 'capped_linear'              // Linear up to cap
  
  // Leveraged
  | 'leveraged'                  // N:1 participation
  | 'outperformance'             // Geared above strike
  
  // Digital
  | 'digital'                    // All-or-nothing
  | 'range_digital'              // Binary based on range
  
  // Protected
  | 'buffered'                   // First X% losses absorbed
  | 'floored'                    // Minimum return guaranteed
  
  // Path-Dependent
  | 'asian'                      // Average price
  | 'lookback'                   // Best/worst during period
  | 'cliquet'                    // Periodic resets
  
  // Complex
  | 'twin_win'                   // Win on up AND down
  | 'bonus'                      // Conditional bonus
  | 'custom';                    // Custom formula

// ============================================================================
// BARRIER CONFIGURATION (Knock-In/Out Features)
// ============================================================================

export interface BarrierConfiguration {
  barriers: Barrier[];
}

export interface Barrier {
  barrierType: BarrierType;
  level: string;                 // % or absolute
  direction: 'up' | 'down';
  
  // Observation
  observationType: 'continuous' | 'discrete' | 'closing_price' | 'intraday';
  observationDates?: string;     // For discrete barriers
  
  // State
  breached: 'true' | 'false';
  breachDate?: string;
  
  // Rebate
  rebate?: string;               // Payment if barrier hit
  
  // Reference
  appliesTo: 'single' | 'all' | 'worst_of' | 'best_of' | 'nth';
  underlyingIndex?: string;      // Which underlying (for baskets)
}

export type BarrierType =
  | 'knock_in'                   // Activates if breached
  | 'knock_out'                  // Terminates if breached
  | 'call_barrier'               // Early redemption trigger
  | 'coupon_barrier'             // Coupon payment trigger
  | 'protection_barrier'         // Capital protection threshold
  | 'autocall_barrier';          // Autocallable trigger

// ============================================================================
// COUPON CONFIGURATION (Income Features)
// ============================================================================

export interface CouponConfiguration {
  coupons: Coupon[];
  
  // Memory Feature
  memoryFeature: 'true' | 'false';
  
  // Accumulation
  accumulatedCoupons?: string;
  unpaidCoupons?: string;        // For memory coupons
}

export interface Coupon {
  // Type & Amount
  couponType: CouponType;
  rate: string;                  // Annual % or absolute amount
  
  // Frequency & Dates
  frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'at_maturity';
  paymentDates?: string;         // JSON array
  nextPaymentDate?: string;
  
  // Conditional Logic
  conditional: 'true' | 'false';
  condition?: CouponCondition;
  
  // Variable Rate (for floating coupons)
  referenceRate?: string;        // SOFR, LIBOR, etc.
  spread?: string;               // bps
  
  // Range Accrual
  accrualRange?: {
    lower: string;
    upper: string;
    ratePerDay?: string;
  };
  
  // State
  daysInRange?: string;
  accruedAmount?: string;
}

export type CouponType =
  | 'fixed'                      // Fixed rate
  | 'conditional'                // Pays if condition met
  | 'memory'                     // Accumulates if not paid
  | 'floating'                   // Variable rate
  | 'range_accrual'              // Accrues if in range
  | 'digital'                    // All-or-nothing
  | 'step_up'                    // Increases over time
  | 'step_down';                 // Decreases over time

export interface CouponCondition {
  type: 'barrier' | 'performance' | 'rate_level' | 'custom';
  
  // Barrier-based
  barrierLevel?: string;
  comparisonOperator?: '>=' | '>' | '<=' | '<' | '==';
  
  // Performance-based
  minPerformance?: string;
  
  // Custom formula
  formula?: string;
}

// ============================================================================
// CALLABLE/PUTABLE CONFIGURATION (Optionality)
// ============================================================================

export interface CallableConfiguration {
  callType: 'american' | 'european' | 'bermudan';
  
  // Call Schedule
  callDates: string;             // JSON array of ISO dates
  callPrices: string;            // JSON array of prices/levels
  
  // Soft Call (conditional call)
  softCall?: 'true' | 'false';
  softCallTrigger?: string;      // Condition for call right
  
  // Premium
  callPremium?: string;          // % or absolute
  
  // State
  called: 'true' | 'false';
  callDate?: string;
}

export interface PutableConfiguration {
  putType: 'american' | 'european' | 'bermudan';
  
  // Put Schedule
  putDates: string;              // JSON array
  putPrices: string;             // JSON array
  
  // State
  exercised: 'true' | 'false';
  putDate?: string;
}

// ============================================================================
// PARTICIPATION CONFIGURATION (Leverage & Gearing)
// ============================================================================

export interface ParticipationConfiguration {
  // Upside
  upsideParticipation: string;   // % (e.g., "100", "150", "200")
  upsideCap?: string;            // Maximum upside %
  
  // Downside
  downsideParticipation: string; // % (e.g., "100", "0", "50")
  downsideFloor?: string;        // Maximum downside %
  
  // Gearing
  leverage?: string;             // Multiplier
  
  // Strike (for outperformance structures)
  strike?: string;
  belowStrikeParticipation?: string;
  aboveStrikeParticipation?: string;
  
  // Asymmetric
  convexityAdjustment?: string;
}

// ============================================================================
// CAPITAL PROTECTION (Guarantee Features)
// ============================================================================

export interface CapitalProtectionConfiguration {
  protectionType: 'hard' | 'soft' | 'conditional';
  protectionLevel: string;       // % of notional (e.g., "100", "90")
  
  // Conditional Protection
  condition?: {
    type: 'barrier' | 'maturity_only';
    barrierLevel?: string;
  };
  
  // Buffer
  buffer?: string;               // First X% losses absorbed
  
  // Guarantor
  guarantor?: string;
  guarantorRating?: string;
}

// ============================================================================
// OBSERVATION CONFIGURATION (Pricing & Monitoring)
// ============================================================================

export interface ObservationConfiguration {
  // Observation Schedule
  observationType: 'continuous' | 'discrete' | 'closing_price' | 'intraday' | 'monthly' | 'quarterly';
  observationDates?: string;     // JSON array for discrete
  observationFrequency?: string; // For regular observations
  
  // Valuation
  valuationMethod: 'mark_to_market' | 'model_based' | 'end_of_day' | 'vwap' | 'twap';
  valuationTime?: string;        // e.g., "16:00:00UTC"
  
  // Fixing
  fixingConvention?: 'official_close' | 'auction' | 'average' | 'worst_of' | 'best_of';
  
  // Holidays & Business Days
  holidayCalendar?: string;      // e.g., "NYSE", "TARGET"
  businessDayConvention?: 'following' | 'preceding' | 'modified_following';
}

// ============================================================================
// SETTLEMENT CONFIGURATION (Redemption)
// ============================================================================

export interface SettlementConfiguration {
  // Settlement Type
  settlementType: SettlementType;
  
  // Method
  settlementMethod: 'automatic' | 'manual' | 'claim_based';
  
  // Timing
  settlementDays: string;        // T+N
  settlementCurrency?: string;
  
  // Vault/Address
  redemptionVault: string;
  
  // Physical/Digital Delivery (if applicable)
  deliveryInstructions?: DeliveryInstructions;
  
  // Early Settlement
  earlySettlementAllowed?: 'true' | 'false';
  earlySettlementPenalty?: string;
  
  // Collateral (for certain settlement types)
  collateral?: CollateralConfiguration;
}

/**
 * Settlement Types - ENHANCED with Digital Assets
 */
export type SettlementType = 
  | 'cash'                       // Fiat currency settlement
  | 'physical'                   // Physical asset delivery
  | 'hybrid'                     // Mix of cash and physical
  | 'digital_asset'              // Cryptocurrency/stablecoin settlement
  | 'tokenized_security';        // Security token settlement

/**
 * Delivery Instructions - NEW
 */
export interface DeliveryInstructions {
  deliveryType: 'physical' | 'digital' | 'security_token';
  
  // For physical delivery
  warehouseAddress?: string;
  custodian?: string;
  
  // For digital asset delivery
  blockchain?: 'solana' | 'ethereum' | 'polygon' | 'arbitrum' | 'optimism';
  tokenMint?: string;            // Token address for delivery
  deliveryAddress?: string;      // Recipient address
  
  // Transfer restrictions
  transferRestrictions?: string;
  lockupPeriod?: string;
}

/**
 * Collateral Configuration - NEW
 */
export interface CollateralConfiguration {
  collateralType: CollateralType;
  collateralRatio: string;       // % of notional
  
  // Collateral assets
  collateralAssets?: CollateralAsset[];
  
  // Margin/Liquidation
  maintenanceMargin?: string;
  liquidationThreshold?: string;
  liquidationPenalty?: string;
  
  // Collateral management
  collateralVault?: string;
  canRehypothecate?: 'true' | 'false';
}

/**
 * Collateral Types - ENHANCED
 */
export type CollateralType =
  // Traditional
  | 'cash'
  | 'government_bonds'
  | 'corporate_bonds'
  | 'equity'
  
  // Digital Assets  
  | 'crypto_asset'               // BTC, ETH, SOL
  | 'stablecoin'                 // USDC, USDT, DAI
  | 'lp_token'                   // Liquidity pool tokens
  | 'staked_asset'               // Staked tokens (stSOL, etc.)
  | 'yield_bearing_token'        // aTokens, cTokens
  
  // Hybrid
  | 'mixed'                      // Multiple collateral types
  | 'synthetic';                 // Synthetic collateral

/**
 * Individual Collateral Asset
 */
export interface CollateralAsset {
  type: CollateralType;
  identifier: string;            // Token address or ticker
  amount: string;
  weight: string;                // % of total collateral
  
  // Valuation
  currentValue?: string;
  haircut?: string;              // Discount applied to value
  
  // For digital assets
  blockchain?: string;
  tokenMint?: string;
  oracleAddress?: string;
}

// ============================================================================
// RISK METRICS (Greeks, Sensitivities)
// ============================================================================

export interface RiskMetrics {
  // Market Risk
  delta?: string;                // Underlying sensitivity
  gamma?: string;                // Delta sensitivity
  vega?: string;                 // Volatility sensitivity
  theta?: string;                // Time decay
  rho?: string;                  // Rate sensitivity
  
  // Credit Risk
  creditDelta?: string;
  jumpToDefault?: string;
  
  // Other
  duration?: string;             // Interest rate duration
  convexity?: string;
  
  // Scenario Analysis
  breakEven?: string;
  maxLoss?: string;
  maxGain?: string;
  
  // Probability
  probabilityOfCall?: string;
  probabilityOfBarrier?: string;
}

// ============================================================================
// ORACLE CONFIGURATION (Price Feeds)
// ============================================================================

export interface OracleConfiguration {
  purpose: 'underlying_price' | 'rate_reference' | 'fx_rate' | 'volatility' | 'credit_event' | 'barrier_monitoring';
  
  provider: 'pyth' | 'chainlink' | 'switchboard' | 'custom';
  oracleAddress: string;
  
  // Update Frequency
  updateFrequency: 'realtime' | 'minute' | 'hourly' | 'daily' | 'on_demand';
  
  // Fallback
  fallbackOracle?: string;
  
  // Data Type
  dataType: 'price' | 'rate' | 'index' | 'spread' | 'volatility' | 'binary';
}

// ============================================================================
// BUILDER INPUT TYPES
// ============================================================================

/**
 * Input configuration for building Universal Structured Products
 * Extends UniversalMetadata with all component configurations
 */
export interface UniversalStructuredProductInput {
  // Base metadata
  type: 'universal_structured_product';
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  
  // Universal fields
  issuer: string;
  jurisdiction: string;
  issueDate: string | Date;
  maturityDate?: string | Date;
  currency: string;
  
  // Product classification
  productCategory: ProductCategory;
  productSubtype: string;
  
  // Components (optional based on product structure)
  underlyings: UnderlyingAsset[];
  underlyingBasket?: BasketConfiguration;
  payoffStructure: PayoffStructure;
  barriers?: BarrierConfiguration;
  coupons?: CouponConfiguration;
  callableFeature?: CallableConfiguration;
  putableFeature?: PutableConfiguration;
  participation?: ParticipationConfiguration;
  capitalProtection?: CapitalProtectionConfiguration;
  observation: ObservationConfiguration;
  settlement: SettlementConfiguration;
  riskMetrics?: RiskMetrics;
  oracles: OracleConfiguration[];
  
  // Optional URIs
  prospectusUri?: string;
  termSheetUri?: string;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  UniversalStructuredProductMetadata as UniversalSPMetadata,
  UniversalStructuredProductInput as UniversalSPInput
};
