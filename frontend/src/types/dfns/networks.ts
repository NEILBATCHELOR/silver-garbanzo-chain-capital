/**
 * DFNS Networks API Types
 * 
 * Type definitions for DFNS Networks API endpoints
 * Based on: https://docs.dfns.co/d/api-docs/networks
 */

import type { DfnsNetwork } from './core';

// Re-export DfnsNetwork for convenience
export type { DfnsNetwork } from './core';

// ==============================================
// NETWORKS API TYPES
// ==============================================

/**
 * Base network information
 */
export interface DfnsNetworkInfo {
  network: DfnsNetwork;
  kind: 'Evm' | 'Bitcoin' | 'Solana' | 'Cosmos' | 'Stellar' | 'Algorand' | 'Other';
  chainId?: number;
  nativeCurrency: {
    symbol: string;
    name: string;
    decimals: number;
  };
  supportedFeatures: {
    feeEstimation: boolean;
    contractReading: boolean;
    validators: boolean;
    staking: boolean;
  };
}

// ==============================================
// FEE ESTIMATION TYPES
// ==============================================

/**
 * Fee estimation request
 * GET /networks/fees?network={network}
 */
export interface DfnsFeeEstimationRequest {
  network: DfnsNetwork;
}

/**
 * EIP-1559 fee strategy for each priority level
 */
export interface DfnsEip1559FeeStrategy {
  maxPriorityFeePerGas: string; // Wei as string
  maxFeePerGas: string; // Wei as string
}

/**
 * Legacy fee strategy
 */
export interface DfnsLegacyFeeStrategy {
  gasPrice: string; // Wei as string
}

/**
 * EIP-1559 fee estimation response
 */
export interface DfnsEip1559FeeEstimation {
  kind: 'Eip1559';
  network: DfnsNetwork;
  baseFeePerGas: string; // Wei as string
  blockNumber: number;
  slow: DfnsEip1559FeeStrategy;
  standard: DfnsEip1559FeeStrategy;
  fast: DfnsEip1559FeeStrategy;
}

/**
 * Legacy fee estimation response
 */
export interface DfnsLegacyFeeEstimation {
  kind: 'Legacy';
  network: DfnsNetwork;
  blockNumber: number;
  slow: DfnsLegacyFeeStrategy;
  standard: DfnsLegacyFeeStrategy;
  fast: DfnsLegacyFeeStrategy;
}

/**
 * Fee estimation response (union type)
 */
export type DfnsFeeEstimationResponse = DfnsEip1559FeeEstimation | DfnsLegacyFeeEstimation;

/**
 * Fee priority levels
 */
export type DfnsFeePriority = 'slow' | 'standard' | 'fast';

// ==============================================
// CONTRACT READING TYPES
// ==============================================

/**
 * EVM contract read request
 */
export interface DfnsEvmContractReadRequest {
  kind: 'Evm';
  network: DfnsNetwork;
  contract: string; // Contract address
  data: string; // Hex-encoded function call data
}

/**
 * Contract read request (union type for future non-EVM chains)
 */
export type DfnsContractReadRequest = DfnsEvmContractReadRequest;

/**
 * Contract read response
 */
export interface DfnsContractReadResponse {
  data: string; // Hex-encoded response data
  success: boolean;
  gasUsed?: string;
  blockNumber?: number;
}

// ==============================================
// VALIDATORS TYPES
// ==============================================

/**
 * Validator status
 */
export type DfnsValidatorStatus = 'Active' | 'Inactive' | 'Pending' | 'Suspended';

/**
 * Validator kind (Updated to match DFNS API)
 */
export type DfnsValidatorKind = 'Shared' | 'Custom';

/**
 * OAuth2 configuration for custom validators
 */
export interface DfnsOAuth2Config {
  domain: string;
  tokenPath?: string; // Optional, defaults to /oauth/token
  clientId: string;
  clientSecret: string;
  audience: string;
}

/**
 * Base validator (Updated to match DFNS API)
 */
export interface DfnsValidator {
  id: string;
  network: DfnsNetwork;
  name: string;
  kind: DfnsValidatorKind;
  dateCreated: string;
  url?: string; // For custom validators
  oauth2?: DfnsOAuth2Config; // For custom validators
  partyHint?: string; // Shared validators
}

/**
 * Create validator request (Updated to match DFNS API)
 */
export interface DfnsCreateValidatorRequest {
  name: string;
  kind: DfnsValidatorKind;
  url?: string; // Required for Custom validators
  oauth2?: DfnsOAuth2Config; // Required for Custom validators
}

/**
 * Create validator response (Updated to match DFNS API)
 */
export interface DfnsCreateValidatorResponse extends DfnsValidator {}

/**
 * List validators request (Updated to match DFNS API)
 */
export interface DfnsListValidatorsRequest {
  // No query parameters for this endpoint
}

/**
 * List validators response (Updated to match DFNS API)
 */
export interface DfnsListValidatorsResponse {
  items: DfnsValidator[];
  nextPageToken?: string;
}

/**
 * Get validator request (Updated to match DFNS API)
 */
export interface DfnsGetValidatorRequest {
  networkId: string;
  validatorId: string;
}

/**
 * Update validator request (Not supported in current API)
 */
export interface DfnsUpdateValidatorRequest {
  networkId: string;
  validatorId: string;
  name?: string;
}

/**
 * Delete validator request (Not supported in current API)
 */
export interface DfnsDeleteValidatorRequest {
  networkId: string;
  validatorId: string;
}

// ==============================================
// HELPER TYPES
// ==============================================

/**
 * Network capability check
 */
export interface DfnsNetworkCapabilities {
  network: DfnsNetwork;
  supportsFeeEstimation: boolean;
  supportsContractReading: boolean;
  supportsValidators: boolean;
  isEvm: boolean;
  chainId?: number;
}

/**
 * Fee estimation utilities
 */
export interface DfnsFeeEstimationUtils {
  /**
   * Convert fee estimation to human-readable format
   */
  formatFees(fees: DfnsFeeEstimationResponse): {
    network: string;
    kind: string;
    baseFee?: string; // In Gwei for EIP-1559
    slow: string;
    standard: string;
    fast: string;
  };

  /**
   * Get recommended fee for priority level
   */
  getRecommendedFee(fees: DfnsFeeEstimationResponse, priority: DfnsFeePriority): string;

  /**
   * Check if network supports EIP-1559
   */
  isEip1559(fees: DfnsFeeEstimationResponse): fees is DfnsEip1559FeeEstimation;
}

/**
 * Contract reading utilities
 */
export interface DfnsContractReadUtils {
  /**
   * Encode function call data
   */
  encodeFunctionCall(abi: any[], functionName: string, params: any[]): string;

  /**
   * Decode function result data
   */
  decodeFunctionResult(abi: any[], functionName: string, data: string): any;

  /**
   * Validate contract address format
   */
  isValidContractAddress(address: string, network: DfnsNetwork): boolean;
}

// ==============================================
// ERROR TYPES
// ==============================================

/**
 * Network-specific errors
 */
export interface DfnsNetworkError {
  code: 'NETWORK_NOT_SUPPORTED' | 'FEATURE_NOT_AVAILABLE' | 'INVALID_NETWORK' | 'CONTRACT_READ_FAILED' | 'FEE_ESTIMATION_FAILED' | 'VALIDATOR_OPERATION_FAILED';
  message: string;
  network?: DfnsNetwork;
  feature?: string;
  details?: Record<string, any>;
}

// ==============================================
// DATABASE TYPES
// ==============================================

/**
 * Database schema for dfns_validators table (Updated)
 */
export interface DfnsValidatorDbRecord {
  id: string;
  network: string;
  name: string;
  kind: string;
  date_created: string;
  url?: string;
  oauth2_config?: Record<string, any>;
  party_hint?: string;
  external_id?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database schema for dfns_network_fees table (for caching)
 */
export interface DfnsNetworkFeesDbRecord {
  id: string;
  network: string;
  kind: string;
  base_fee_per_gas?: string;
  block_number?: number;
  slow_fee: string;
  standard_fee: string;
  fast_fee: string;
  slow_priority_fee?: string;
  standard_priority_fee?: string;
  fast_priority_fee?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database schema for dfns_contract_reads table (for caching)
 */
export interface DfnsContractReadsDbRecord {
  id: string;
  network: string;
  contract_address: string;
  function_data: string;
  response_data: string;
  gas_used?: string;
  block_number?: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
}
