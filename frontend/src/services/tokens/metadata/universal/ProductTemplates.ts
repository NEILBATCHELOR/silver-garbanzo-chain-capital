/**
 * Universal Structured Product Templates
 * 
 * Pre-configured templates for common structured products
 * Each template demonstrates how to compose components to create specific products
 * 
 * These templates can be used as:
 * 1. Starting points for product creation
 * 2. Reference examples
 * 3. Testing configurations
 */

import type {
  UniversalStructuredProductInput,
  UnderlyingAsset,
  ProductCategory,
  PayoffStructure,
  BarrierConfiguration,
  CouponConfiguration,
  CallableConfiguration,
  ParticipationConfiguration,
  CapitalProtectionConfiguration,
  ObservationConfiguration,
  SettlementConfiguration,
  OracleConfiguration
} from './UniversalStructuredProductTypes';

// ============================================================================
// TEMPLATE BUILDER INTERFACE
// ============================================================================

export interface ProductTemplate {
  name: string;
  description: string;
  category: ProductCategory;
  build: (params: TemplateParams) => Partial<UniversalStructuredProductInput>;
}

export interface TemplateParams {
  // Basic info
  tokenName?: string;
  tokenSymbol?: string;
  issuer?: string;
  jurisdiction?: string;
  currency?: string;
  
  // Underlying
  underlyingTicker?: string;
  underlyingName?: string;
  initialPrice?: number;
  oracleAddress?: string;
  
  // Product-specific
  barrierLevel?: number;
  knockInBarrier?: number;
  couponRate?: number;
  maturityDate?: Date;
  
  // Vaults
  redemptionVault?: string;
  
  // URIs
  uri?: string;
  prospectusUri?: string;
  termSheetUri?: string;
}

// ============================================================================
// AUTOCALLABLE TEMPLATES
// ============================================================================

/**
 * Standard Autocallable with Barrier
 * 
 * Features:
 * - Quarterly observations
 * - 100% barrier
 * - Conditional coupons with memory
 * - 60% knock-in protection
 */
export const AutocallableBarrierTemplate: ProductTemplate = {
  name: 'Autocallable Barrier',
  description: 'Standard autocallable with 100% barrier and memory coupons',
  category: 'autocallable',
  
  build: (params: TemplateParams) => ({
    type: 'universal_structured_product',
    productCategory: 'autocallable',
    productSubtype: 'barrier_autocallable',
    
    decimals: 6,
    currency: params.currency || 'USD',
    issuer: params.issuer || 'Chain Capital LLC',
    jurisdiction: params.jurisdiction || 'US',
    issueDate: new Date().toISOString().split('T')[0],
    maturityDate: params.maturityDate,
    
    underlyings: [{
      identifier: params.underlyingTicker || 'SPX',
      name: params.underlyingName || 'S&P 500 Index',
      type: 'equity_index',
      initialPrice: params.initialPrice?.toString() || '5000',
      oracleAddress: params.oracleAddress || '',
      oracleProvider: 'pyth'
    }],
    
    payoffStructure: {
      payoffType: 'linear',
      returnCalculation: 'point_to_point',
      cap: '150',
      memoryFeature: 'true'
    },
    
    barriers: {
      barriers: [
        {
          barrierType: 'autocall_barrier',
          level: (params.barrierLevel || 100).toString(),
          direction: 'up',
          observationType: 'discrete',
          breached: 'false',
          appliesTo: 'single'
        },
        {
          barrierType: 'knock_in',
          level: (params.knockInBarrier || 60).toString(),
          direction: 'down',
          observationType: 'continuous',
          breached: 'false',
          appliesTo: 'single'
        },
        {
          barrierType: 'protection_barrier',
          level: '80',
          direction: 'down',
          observationType: 'continuous',
          breached: 'false',
          appliesTo: 'single'
        }
      ]
    },
    
    coupons: {
      memoryFeature: 'true',
      coupons: [{
        couponType: 'conditional',
        rate: (params.couponRate || 8.5).toString(),
        frequency: 'quarterly',
        conditional: 'true',
        condition: {
          type: 'barrier',
          barrierLevel: (params.barrierLevel || 100).toString(),
          comparisonOperator: '>='
        }
      }]
    },
    
    callableFeature: {
      callType: 'bermudan',
      callDates: JSON.stringify([]), // To be populated based on maturity
      callPrices: JSON.stringify([]),
      called: 'false'
    },
    
    participation: {
      upsideParticipation: '100',
      downsideParticipation: '100',
      upsideCap: '150'
    },
    
    capitalProtection: {
      protectionType: 'conditional',
      protectionLevel: '100',
      condition: {
        type: 'barrier',
        barrierLevel: '60'
      }
    },
    
    observation: {
      observationType: 'discrete',
      observationFrequency: 'quarterly',
      valuationMethod: 'end_of_day',
      valuationTime: '16:00:00UTC'
    },
    
    settlement: {
      settlementType: 'cash',
      settlementMethod: 'automatic',
      settlementDays: '2',
      redemptionVault: params.redemptionVault || ''
    },
    
    oracles: [{
      purpose: 'underlying_price',
      provider: 'pyth',
      oracleAddress: params.oracleAddress || '',
      updateFrequency: 'realtime',
      dataType: 'price'
    }]
  })
};

/**
 * Worst-Of Autocallable
 * 
 * Features:
 * - 3 underlyings (worst-of basket)
 * - All must be >= barrier for autocall
 * - Higher coupon for additional risk
 */
export const WorstOfAutocallableTemplate: ProductTemplate = {
  name: 'Worst-Of Autocallable',
  description: 'Autocallable on basket of 3 assets (worst performer determines payout)',
  category: 'autocallable',
  
  build: (params: TemplateParams) => ({
    type: 'universal_structured_product',
    productCategory: 'autocallable',
    productSubtype: 'worst_of_autocallable',
    
    decimals: 6,
    currency: params.currency || 'USD',
    issuer: params.issuer || 'Chain Capital LLC',
    jurisdiction: params.jurisdiction || 'US',
    issueDate: new Date().toISOString().split('T')[0],
    maturityDate: params.maturityDate,
    
    underlyings: [
      {
        identifier: 'AAPL',
        name: 'Apple Inc',
        type: 'equity_single',
        initialPrice: '180',
        weight: '33.33',
        oracleAddress: 'AAPL_ORACLE',
        oracleProvider: 'pyth'
      },
      {
        identifier: 'MSFT',
        name: 'Microsoft Corp',
        type: 'equity_single',
        initialPrice: '420',
        weight: '33.33',
        oracleAddress: 'MSFT_ORACLE',
        oracleProvider: 'pyth'
      },
      {
        identifier: 'GOOGL',
        name: 'Alphabet Inc',
        type: 'equity_single',
        initialPrice: '150',
        weight: '33.34',
        oracleAddress: 'GOOGL_ORACLE',
        oracleProvider: 'pyth'
      }
    ],
    
    underlyingBasket: {
      basketType: 'worst_of'
    },
    
    payoffStructure: {
      payoffType: 'linear',
      returnCalculation: 'point_to_point'
    },
    
    barriers: {
      barriers: [
        {
          barrierType: 'autocall_barrier',
          level: '100',
          direction: 'up',
          observationType: 'discrete',
          breached: 'false',
          appliesTo: 'all' // ALL must be >= 100%
        },
        {
          barrierType: 'knock_in',
          level: '60',
          direction: 'down',
          observationType: 'continuous',
          breached: 'false',
          appliesTo: 'worst_of' // Worst performer
        }
      ]
    },
    
    coupons: {
      memoryFeature: 'true',
      coupons: [{
        couponType: 'conditional',
        rate: '10', // Higher coupon for worst-of risk
        frequency: 'quarterly',
        conditional: 'true',
        condition: {
          type: 'barrier',
          barrierLevel: '100',
          comparisonOperator: '>=' // All >= 100%
        }
      }]
    },
    
    callableFeature: {
      callType: 'bermudan',
      callDates: JSON.stringify([]),
      callPrices: JSON.stringify([]),
      called: 'false'
    },
    
    observation: {
      observationType: 'discrete',
      observationFrequency: 'quarterly',
      valuationMethod: 'end_of_day',
      valuationTime: '16:00:00UTC'
    },
    
    settlement: {
      settlementType: 'cash',
      settlementMethod: 'automatic',
      settlementDays: '2',
      redemptionVault: params.redemptionVault || ''
    },
    
    oracles: [
      {
        purpose: 'underlying_price',
        provider: 'pyth',
        oracleAddress: 'AAPL_ORACLE',
        updateFrequency: 'realtime',
        dataType: 'price'
      },
      {
        purpose: 'underlying_price',
        provider: 'pyth',
        oracleAddress: 'MSFT_ORACLE',
        updateFrequency: 'realtime',
        dataType: 'price'
      },
      {
        purpose: 'underlying_price',
        provider: 'pyth',
        oracleAddress: 'GOOGL_ORACLE',
        updateFrequency: 'realtime',
        dataType: 'price'
      }
    ]
  })
};

// ============================================================================
// BONUS CERTIFICATE TEMPLATE
// ============================================================================

export const BonusCertificateTemplate: ProductTemplate = {
  name: 'Bonus Certificate',
  description: 'Participation with bonus level if barrier not breached',
  category: 'participation',
  
  build: (params: TemplateParams) => ({
    type: 'universal_structured_product',
    productCategory: 'participation',
    productSubtype: 'bonus_certificate',
    
    decimals: 6,
    currency: params.currency || 'USD',
    issuer: params.issuer || 'Chain Capital LLC',
    jurisdiction: params.jurisdiction || 'US',
    issueDate: new Date().toISOString().split('T')[0],
    maturityDate: params.maturityDate,
    
    underlyings: [{
      identifier: params.underlyingTicker || 'AAPL',
      name: params.underlyingName || 'Apple Inc',
      type: 'equity_single',
      initialPrice: params.initialPrice?.toString() || '180',
      oracleAddress: params.oracleAddress || '',
      oracleProvider: 'pyth'
    }],
    
    payoffStructure: {
      payoffType: 'bonus',
      returnCalculation: 'point_to_point',
      floor: '120' // Bonus level = minimum return if barrier not breached
    },
    
    barriers: {
      barriers: [{
        barrierType: 'knock_in',
        level: '70', // 70% barrier
        direction: 'down',
        observationType: 'continuous',
        breached: 'false',
        appliesTo: 'single'
      }]
    },
    
    participation: {
      upsideParticipation: '100',
      downsideParticipation: '100'
    },
    
    observation: {
      observationType: 'continuous',
      valuationMethod: 'mark_to_market'
    },
    
    settlement: {
      settlementType: 'cash',
      settlementMethod: 'automatic',
      settlementDays: '2',
      redemptionVault: params.redemptionVault || ''
    },
    
    oracles: [{
      purpose: 'underlying_price',
      provider: 'pyth',
      oracleAddress: params.oracleAddress || '',
      updateFrequency: 'realtime',
      dataType: 'price'
    }]
  })
};

// ============================================================================
// PRINCIPAL PROTECTED NOTE TEMPLATE
// ============================================================================

export const PrincipalProtectedNoteTemplate: ProductTemplate = {
  name: 'Principal Protected Note',
  description: '100% capital protection with upside participation',
  category: 'capital_guarantee',
  
  build: (params: TemplateParams) => ({
    type: 'universal_structured_product',
    productCategory: 'capital_guarantee',
    productSubtype: 'principal_protected_note',
    
    decimals: 6,
    currency: params.currency || 'USD',
    issuer: params.issuer || 'Chain Capital LLC',
    jurisdiction: params.jurisdiction || 'US',
    issueDate: new Date().toISOString().split('T')[0],
    maturityDate: params.maturityDate,
    
    underlyings: [{
      identifier: params.underlyingTicker || 'QQQ',
      name: params.underlyingName || 'Nasdaq-100 ETF',
      type: 'equity_index',
      initialPrice: params.initialPrice?.toString() || '450',
      oracleAddress: params.oracleAddress || '',
      oracleProvider: 'pyth'
    }],
    
    payoffStructure: {
      payoffType: 'capped_linear',
      returnCalculation: 'point_to_point',
      cap: '200' // 200% cap on returns
    },
    
    participation: {
      upsideParticipation: '80', // 80% of upside
      downsideParticipation: '0', // No downside
      upsideCap: '200'
    },
    
    capitalProtection: {
      protectionType: 'hard',
      protectionLevel: '100' // Full principal protection
    },
    
    observation: {
      observationType: 'discrete',
      valuationMethod: 'end_of_day',
      valuationTime: '16:00:00UTC'
    },
    
    settlement: {
      settlementType: 'cash',
      settlementMethod: 'automatic',
      settlementDays: '2',
      redemptionVault: params.redemptionVault || ''
    },
    
    oracles: [{
      purpose: 'underlying_price',
      provider: 'pyth',
      oracleAddress: params.oracleAddress || '',
      updateFrequency: 'realtime',
      dataType: 'price'
    }]
  })
};

// ============================================================================
// REVERSE CONVERTIBLE TEMPLATE
// ============================================================================

export const ReverseConvertibleTemplate: ProductTemplate = {
  name: 'Reverse Convertible',
  description: 'High yield with potential equity conversion',
  category: 'yield_enhancement',
  
  build: (params: TemplateParams) => ({
    type: 'universal_structured_product',
    productCategory: 'yield_enhancement',
    productSubtype: 'reverse_convertible',
    
    decimals: 6,
    currency: params.currency || 'USD',
    issuer: params.issuer || 'Chain Capital LLC',
    jurisdiction: params.jurisdiction || 'US',
    issueDate: new Date().toISOString().split('T')[0],
    maturityDate: params.maturityDate,
    
    underlyings: [{
      identifier: params.underlyingTicker || 'TSLA',
      name: params.underlyingName || 'Tesla Inc',
      type: 'equity_single',
      initialPrice: params.initialPrice?.toString() || '250',
      oracleAddress: params.oracleAddress || '',
      oracleProvider: 'pyth'
    }],
    
    payoffStructure: {
      payoffType: 'digital',
      returnCalculation: 'point_to_point'
    },
    
    barriers: {
      barriers: [{
        barrierType: 'knock_in',
        level: '80', // 80% strike price
        direction: 'down',
        observationType: 'continuous',
        breached: 'false',
        appliesTo: 'single'
      }]
    },
    
    coupons: {
      memoryFeature: 'false',
      coupons: [{
        couponType: 'fixed',
        rate: '15', // High yield
        frequency: 'quarterly',
        conditional: 'false'
      }]
    },
    
    participation: {
      upsideParticipation: '0', // No upside
      downsideParticipation: '100' // Full downside if knocked in
    },
    
    observation: {
      observationType: 'continuous',
      valuationMethod: 'mark_to_market'
    },
    
    settlement: {
      settlementType: 'physical', // Can deliver shares if knocked in
      settlementMethod: 'automatic',
      settlementDays: '2',
      redemptionVault: params.redemptionVault || ''
    },
    
    oracles: [{
      purpose: 'underlying_price',
      provider: 'pyth',
      oracleAddress: params.oracleAddress || '',
      updateFrequency: 'realtime',
      dataType: 'price'
    }]
  })
};

// ============================================================================
// DIGITAL ASSET SETTLEMENT TEMPLATE (NEW)
// ============================================================================

export const CryptoSettledAutocallableTemplate: ProductTemplate = {
  name: 'Crypto-Settled Autocallable',
  description: 'Autocallable with USDC settlement on Solana',
  category: 'autocallable',
  
  build: (params: TemplateParams) => ({
    type: 'universal_structured_product',
    productCategory: 'autocallable',
    productSubtype: 'crypto_settled_autocallable',
    
    decimals: 6,
    currency: 'USDC',
    issuer: params.issuer || 'Chain Capital DAO',
    jurisdiction: 'Decentralized',
    issueDate: new Date().toISOString().split('T')[0],
    maturityDate: params.maturityDate,
    
    underlyings: [{
      identifier: 'SOL',
      name: 'Solana',
      type: 'crypto_asset',
      initialPrice: params.initialPrice?.toString() || '100',
      oracleAddress: params.oracleAddress || '',
      oracleProvider: 'pyth'
    }],
    
    payoffStructure: {
      payoffType: 'linear',
      returnCalculation: 'point_to_point',
      memoryFeature: 'true'
    },
    
    barriers: {
      barriers: [
        {
          barrierType: 'autocall_barrier',
          level: '100',
          direction: 'up',
          observationType: 'discrete',
          breached: 'false',
          appliesTo: 'single'
        },
        {
          barrierType: 'knock_in',
          level: '60',
          direction: 'down',
          observationType: 'continuous',
          breached: 'false',
          appliesTo: 'single'
        }
      ]
    },
    
    coupons: {
      memoryFeature: 'true',
      coupons: [{
        couponType: 'conditional',
        rate: '12', // Higher yield for crypto volatility
        frequency: 'monthly',
        conditional: 'true',
        condition: {
          type: 'barrier',
          barrierLevel: '100',
          comparisonOperator: '>='
        }
      }]
    },
    
    observation: {
      observationType: 'discrete',
      observationFrequency: 'monthly',
      valuationMethod: 'end_of_day',
      valuationTime: '00:00:00UTC'
    },
    
    settlement: {
      settlementType: 'digital_asset',
      settlementMethod: 'automatic',
      settlementDays: '0', // Instant settlement
      settlementCurrency: 'USDC',
      redemptionVault: params.redemptionVault || '',
      deliveryInstructions: {
        deliveryType: 'digital',
        blockchain: 'solana',
        tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
        deliveryAddress: params.redemptionVault || ''
      }
    },
    
    oracles: [{
      purpose: 'underlying_price',
      provider: 'pyth',
      oracleAddress: params.oracleAddress || '',
      updateFrequency: 'realtime',
      dataType: 'price'
    }]
  })
};

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const ProductTemplates = {
  AutocallableBarrier: AutocallableBarrierTemplate,
  WorstOfAutocallable: WorstOfAutocallableTemplate,
  BonusCertificate: BonusCertificateTemplate,
  PrincipalProtectedNote: PrincipalProtectedNoteTemplate,
  ReverseConvertible: ReverseConvertibleTemplate,
  CryptoSettledAutocallable: CryptoSettledAutocallableTemplate
};

/**
 * Get all available templates
 */
export function getAllTemplates(): ProductTemplate[] {
  return Object.values(ProductTemplates);
}

/**
 * Get template by name
 */
export function getTemplate(name: keyof typeof ProductTemplates): ProductTemplate {
  return ProductTemplates[name];
}
