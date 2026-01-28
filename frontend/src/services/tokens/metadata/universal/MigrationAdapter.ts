/**
 * Universal Framework Migration Adapter
 * 
 * Provides backward compatibility by converting existing metadata inputs
 * to Universal Framework format
 * 
 * This allows:
 * 1. Existing code to continue working
 * 2. Gradual migration to universal framework
 * 3. Side-by-side usage of both approaches
 */

import { universalMetadataBuilder } from './UniversalMetadataBuilder';
import type { UniversalStructuredProductInput } from './UniversalStructuredProductTypes';
import type {
  AutocallableInput,
  PrincipalProtectedNoteInput,
  ReverseConvertibleInput,
  OnChainMetadataResult
} from '../OnChainMetadataTypes';
import type { CouponType } from './UniversalStructuredProductTypes';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map OnChain coupon types to Universal Framework types
 * Handles kebab-case to snake_case conversion and special mappings
 */
function mapCouponType(onchainType: string): CouponType {
  // Special mappings
  if (onchainType === 'snowballing') return 'memory';
  
  // Convert kebab-case to snake_case
  const snakeCaseType = onchainType.replace(/-/g, '_');
  
  // Validate it's a valid CouponType
  const validTypes: CouponType[] = [
    'fixed', 'conditional', 'memory', 'floating', 
    'range_accrual', 'digital', 'step_up', 'step_down'
  ];
  
  if (validTypes.includes(snakeCaseType as CouponType)) {
    return snakeCaseType as CouponType;
  }
  
  // Default to 'fixed' if unknown
  console.warn(`Unknown coupon type: ${onchainType}, defaulting to 'fixed'`);
  return 'fixed';
}

// ============================================================================
// MIGRATION ADAPTERS
// ============================================================================

/**
 * Convert Autocallable input to Universal Framework
 */
export function convertAutocallableToUniversal(
  input: AutocallableInput
): UniversalStructuredProductInput {
  return {
    type: 'universal_structured_product',
    name: input.name,
    symbol: input.symbol,
    uri: input.uri,
    decimals: input.decimals,
    
    // Universal fields
    issuer: input.issuer,
    jurisdiction: input.jurisdiction,
    issueDate: input.issueDate,
    maturityDate: input.maturityDate,
    currency: input.currency,
    
    // Product classification
    productCategory: 'autocallable',
    productSubtype: input.productSubtype,
    
    // Underlying
    underlyings: [{
      identifier: input.underlying,
      name: input.underlyingName,
      type: 'equity_index', // Assume index for backward compat
      initialPrice: input.initialPrice.toString(),
      oracleAddress: input.oracleAddress,
      oracleProvider: input.oracleProvider
    }],
    
    // Payoff
    payoffStructure: {
      payoffType: 'linear',
      returnCalculation: 'point_to_point',
      cap: input.cap?.toString(),
      memoryFeature: input.memoryFeature ? 'true' : 'false'
    },
    
    // Barriers
    barriers: {
      barriers: [
        {
          barrierType: 'autocall_barrier',
          level: input.barrierLevel.toString(),
          direction: 'up',
          observationType: 'discrete',
          breached: 'false',
          appliesTo: 'single'
        },
        {
          barrierType: 'knock_in',
          level: input.knockInBarrier.toString(),
          direction: 'down',
          observationType: 'continuous',
          breached: 'false',
          appliesTo: 'single'
        }
      ]
    },
    
    // Coupons
    coupons: {
      memoryFeature: input.memoryFeature ? 'true' : 'false',
      coupons: [{
        // Map OnChain coupon types to Universal types
        // Handle kebab-case to snake_case conversion and special mappings
        couponType: mapCouponType(input.couponType),
        rate: input.couponRate.toString(),
        frequency: input.observationFreq,
        conditional: input.couponType === 'conditional' ? 'true' : 'false',
        condition: input.couponType === 'conditional' ? {
          type: 'barrier',
          barrierLevel: input.barrierLevel.toString(),
          comparisonOperator: '>='
        } : undefined
      }]
    },
    
    // Callable
    callableFeature: {
      callType: input.callType,
      callDates: JSON.stringify([]), // Would need to be calculated
      callPrices: JSON.stringify([]),
      called: 'false'
    },
    
    // Participation
    participation: {
      upsideParticipation: input.upsideParticipation.toString(),
      downsideParticipation: input.downsideParticipation.toString(),
      upsideCap: input.cap?.toString()
    },
    
    // Capital Protection (if knock-in barrier exists)
    capitalProtection: input.protectionBarrier ? {
      protectionType: 'conditional',
      protectionLevel: '100',
      condition: {
        type: 'barrier',
        barrierLevel: input.knockInBarrier.toString()
      }
    } : undefined,
    
    // Observation
    observation: {
      observationType: 'discrete',
      observationFrequency: input.observationFreq,
      valuationMethod: input.valuationMethod === 'end-of-day' ? 'end_of_day' : 'mark_to_market',
      valuationTime: input.fixingTime
    },
    
    // Settlement
    settlement: {
      settlementType: 'cash',
      settlementMethod: input.redemptionMethod,
      settlementDays: input.settlementDays.toString(),
      redemptionVault: input.redemptionVault
    },
    
    // Oracles
    oracles: [{
      purpose: 'underlying_price',
      provider: input.oracleProvider,
      oracleAddress: input.oracleAddress,
      updateFrequency: 'realtime',
      dataType: 'price'
    }],
    
    // Optional URIs
    prospectusUri: input.prospectusUri,
    termSheetUri: input.termSheetUri
  };
}

/**
 * Convert Principal Protected Note input to Universal Framework
 */
export function convertPPNToUniversal(
  input: PrincipalProtectedNoteInput
): UniversalStructuredProductInput {
  return {
    type: 'universal_structured_product',
    name: input.name,
    symbol: input.symbol,
    uri: input.uri,
    decimals: input.decimals,
    
    issuer: input.issuer,
    jurisdiction: input.jurisdiction,
    issueDate: input.issueDate,
    maturityDate: input.maturityDate,
    currency: input.currency,
    
    productCategory: 'capital_guarantee',
    productSubtype: 'principal_protected_note',
    
    underlyings: [{
      identifier: input.underlying,
      name: input.underlyingName,
      type: 'equity_index',
      initialPrice: input.initialPrice.toString(),
      oracleAddress: input.oracleAddress,
      oracleProvider: input.oracleProvider
    }],
    
    payoffStructure: {
      payoffType: 'capped_linear',
      returnCalculation: 'point_to_point',
      cap: input.capLevel?.toString()
    },
    
    participation: {
      upsideParticipation: input.upsideParticipation.toString(),
      downsideParticipation: '0',
      upsideCap: input.capLevel?.toString()
    },
    
    capitalProtection: {
      protectionType: input.protectionType,
      protectionLevel: input.protectionLevel.toString()
    },
    
    observation: {
      observationType: 'discrete',
      valuationMethod: 'end_of_day'
    },
    
    settlement: {
      settlementType: 'cash',
      settlementMethod: input.redemptionMethod === 'maturity-only' ? 'automatic' : 'manual',
      settlementDays: '2',
      redemptionVault: input.redemptionVault
    },
    
    oracles: [{
      purpose: 'underlying_price',
      provider: input.oracleProvider,
      oracleAddress: input.oracleAddress,
      updateFrequency: 'realtime',
      dataType: 'price'
    }],
    
    prospectusUri: input.prospectusUri,
    termSheetUri: input.termSheetUri
  };
}

/**
 * Convert Reverse Convertible input to Universal Framework
 */
export function convertReverseConvertibleToUniversal(
  input: ReverseConvertibleInput
): UniversalStructuredProductInput {
  return {
    type: 'universal_structured_product',
    name: input.name,
    symbol: input.symbol,
    uri: input.uri,
    decimals: input.decimals,
    
    issuer: input.issuer,
    jurisdiction: input.jurisdiction,
    issueDate: input.issueDate,
    maturityDate: input.maturityDate,
    currency: input.currency,
    
    productCategory: 'yield_enhancement',
    productSubtype: 'reverse_convertible',
    
    underlyings: [{
      identifier: input.underlying,
      name: input.underlyingName,
      type: 'equity_single',
      initialPrice: input.initialPrice.toString(),
      oracleAddress: input.oracleAddress,
      oracleProvider: input.oracleProvider
    }],
    
    payoffStructure: {
      payoffType: 'digital',
      returnCalculation: 'point_to_point'
    },
    
    barriers: {
      barriers: [{
        barrierType: 'knock_in',
        level: input.knockInBarrier.toString(),
        direction: 'down',
        observationType: input.barrierType === 'continuous' ? 'continuous' : 'discrete',
        breached: 'false',
        appliesTo: 'single'
      }]
    },
    
    coupons: {
      memoryFeature: 'false',
      coupons: [{
        couponType: input.couponType,
        rate: input.couponRate.toString(),
        frequency: input.couponFrequency,
        conditional: input.couponType === 'conditional' ? 'true' : 'false'
      }]
    },
    
    participation: {
      upsideParticipation: '0',
      downsideParticipation: '100'
    },
    
    observation: {
      observationType: input.observationType,
      valuationMethod: 'mark_to_market'
    },
    
    settlement: {
      settlementType: input.settlementType,
      settlementMethod: 'automatic',
      settlementDays: '2',
      redemptionVault: input.redemptionVault
    },
    
    oracles: [{
      purpose: 'underlying_price',
      provider: input.oracleProvider,
      oracleAddress: input.oracleAddress,
      updateFrequency: 'realtime',
      dataType: 'price'
    }],
    
    prospectusUri: input.prospectusUri,
    termSheetUri: input.termSheetUri
  };
}

// ============================================================================
// MIGRATION SERVICE
// ============================================================================

export class UniversalFrameworkMigrationAdapter {
  
  /**
   * Build metadata using Universal Framework from legacy input
   * 
   * Automatically detects input type and converts to universal format
   */
  buildFromLegacyInput(
    input: AutocallableInput | PrincipalProtectedNoteInput | ReverseConvertibleInput
  ): OnChainMetadataResult {
    let universalInput: UniversalStructuredProductInput;
    
    // Detect type and convert
    if ('productSubtype' in input && input.productSubtype) {
      // Autocallable
      universalInput = convertAutocallableToUniversal(input as AutocallableInput);
    } else if ('protectionType' in input) {
      // Principal Protected Note
      universalInput = convertPPNToUniversal(input as PrincipalProtectedNoteInput);
    } else if ('strikePrice' in input) {
      // Reverse Convertible
      universalInput = convertReverseConvertibleToUniversal(input as ReverseConvertibleInput);
    } else {
      throw new Error('Unknown input type - cannot convert to Universal Framework');
    }
    
    // Build using universal builder
    return universalMetadataBuilder.buildStructuredProduct(universalInput);
  }
  
  /**
   * Build Autocallable using Universal Framework
   */
  buildAutocallable(input: AutocallableInput): OnChainMetadataResult {
    const universalInput = convertAutocallableToUniversal(input);
    return universalMetadataBuilder.buildStructuredProduct(universalInput);
  }
  
  /**
   * Build Principal Protected Note using Universal Framework
   */
  buildPrincipalProtectedNote(input: PrincipalProtectedNoteInput): OnChainMetadataResult {
    const universalInput = convertPPNToUniversal(input);
    return universalMetadataBuilder.buildStructuredProduct(universalInput);
  }
  
  /**
   * Build Reverse Convertible using Universal Framework
   */
  buildReverseConvertible(input: ReverseConvertibleInput): OnChainMetadataResult {
    const universalInput = convertReverseConvertibleToUniversal(input);
    return universalMetadataBuilder.buildStructuredProduct(universalInput);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const migrationAdapter = new UniversalFrameworkMigrationAdapter();
