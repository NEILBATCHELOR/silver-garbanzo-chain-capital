/**
 * Injective Native TokenFactory Types
 * Backend-specific types for Injective operations
 */

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  displayDenom?: string;
  uri?: string;  // Optional logo URI (IPFS recommended)
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
