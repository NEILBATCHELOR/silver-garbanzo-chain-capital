/**
 * Injective TokenFactory Types
 * Backend-specific types for Injective TokenFactory operations
 * 
 * NOTE: Exchange and Vault types have been moved to:
 * - /services/exchange/types.ts
 * - /services/vault/types.ts
 */

// ============================================================================
// TOKENFACTORY TYPES
// ============================================================================

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  description?: string;        // Optional description
  uri?: string;                // Optional logo URI (IPFS hosted webp recommended)
  uriHash?: string;            // Optional hash of the URI
  
  // Display configuration (usually auto-generated from subdenom)
  displayDenom?: string;       // Custom display denom (defaults to subdenom)
}

export interface TokenConfig {
  subdenom: string;
  initialSupply?: string;
  metadata: TokenMetadata;
}

export interface MintParams {
  denom: string;
  amount: string;
  recipient?: string;
}

export interface BurnParams {
  denom: string;
  amount: string;
}

export interface SpotMarketConfig {
  ticker: string;
  baseDenom: string;
  quoteDenom: string;
  minPriceTickSize: string;
  minQuantityTickSize: string;
  minNotional?: string;
  baseDecimals?: number;
  quoteDecimals?: number;
  makerFeeRate?: string;
  takerFeeRate?: string;
}

export interface TokenCreationResult {
  success: boolean;
  denom: string;
  txHash: string;
  error?: string;
}

export interface MarketLaunchResult {
  success: boolean;
  marketId: string;
  txHash: string;
  error?: string;
}

export interface InjectiveAccountInfo {
  address: string;
  privateKey: string;
  useHSM?: boolean;
}

export type Network = 'mainnet' | 'testnet';
