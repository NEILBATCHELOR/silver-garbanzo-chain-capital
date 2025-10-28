/**
 * PSP Market Rates Types
 * Types for market data integration with CoinGecko and spread calculations
 */

// Market rate from CoinGecko
export interface MarketRate {
  symbol: string;
  network?: string;
  usdPrice: number;
  lastUpdated: string;
  source: string;
}

// Supported crypto assets for PSP
export const SUPPORTED_PSP_CRYPTO_ASSETS = [
  'BTC',
  'ETH',
  'USDC',
  'USDT',
  'MATIC',
  'AVAX',
  'SOL',
  'XLM',
  'TRX',
  'ALGO'
] as const;

export type SupportedPSPCryptoAsset = typeof SUPPORTED_PSP_CRYPTO_ASSETS[number];

// Supported networks
export const SUPPORTED_PSP_NETWORKS = [
  'ethereum',
  'polygon',
  'arbitrum',
  'avalanche',
  'solana',
  'stellar',
  'tron',
  'algorand'
] as const;

export type SupportedPSPNetwork = typeof SUPPORTED_PSP_NETWORKS[number];

// CoinGecko asset mapping (symbol to CoinGecko ID)
export const COINGECKO_ASSET_MAP: Record<SupportedPSPCryptoAsset, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDC: 'usd-coin',
  USDT: 'tether',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  SOL: 'solana',
  XLM: 'stellar',
  TRX: 'tron',
  ALGO: 'algorand'
};

// Fiat amount tiers for spreads
export interface FiatTier {
  name: string;
  min: number;
  max: number | null; // null for highest tier
}

export const DEFAULT_FIAT_TIERS: FiatTier[] = [
  { name: '≤10,000', min: 0, max: 10000 },
  { name: '≤100,000', min: 10000, max: 100000 },
  { name: '≤1,000,000', min: 100000, max: 1000000 },
  { name: '≤10,000,000', min: 1000000, max: 10000000 },
  { name: '>10,000,000', min: 10000000, max: null }
];

// Spread configuration
export interface SpreadConfig {
  id: string;
  projectId: string;
  cryptoAsset: SupportedPSPCryptoAsset;
  network: SupportedPSPNetwork | null;
  tierName: string;
  tierMin: number;
  tierMax: number | null;
  buySpreadBps: number; // Basis points (100 bps = 1%)
  sellSpreadBps: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// Spread matrix row (for UI display)
export interface SpreadMatrixRow {
  cryptoAsset: SupportedPSPCryptoAsset;
  network: SupportedPSPNetwork | null;
  tiers: {
    tierName: string;
    tierMin: number;
    tierMax: number | null;
    buySpreadBps: number;
    sellSpreadBps: number;
    configId?: string; // For updates
  }[];
}

// Rate with spread applied
export interface RateWithSpread {
  asset: string;
  network?: string;
  baseRate: number; // Market rate from CoinGecko
  buySpreadBps: number;
  sellSpreadBps: number;
  buyRate: number; // Rate after buy spread
  sellRate: number; // Rate after sell spread
  timestamp: string;
}

// Request/Response types for API
export interface GetMarketRatesRequest {
  assets: SupportedPSPCryptoAsset[];
  vsCurrency?: string; // Default: 'usd'
}

export interface GetMarketRatesResponse {
  success: boolean;
  rates: MarketRate[];
  timestamp: string;
}

export interface GetRatesWithSpreadsRequest {
  assets: SupportedPSPCryptoAsset[];
  transactionAmount: number; // USD amount
  projectId: string;
}

export interface GetRatesWithSpreadsResponse {
  success: boolean;
  rates: RateWithSpread[];
  timestamp: string;
}

export interface GetSpreadMatrixRequest {
  projectId: string;
}

export interface GetSpreadMatrixResponse {
  success: boolean;
  matrix: SpreadMatrixRow[];
}

export interface UpdateSpreadRequest {
  projectId: string;
  cryptoAsset: SupportedPSPCryptoAsset;
  network: SupportedPSPNetwork | null;
  tierName: string;
  tierMin: number;
  tierMax: number | null;
  buySpreadBps: number;
  sellSpreadBps: number;
}

export interface UpdateSpreadResponse {
  success: boolean;
  config: SpreadConfig;
}

export interface BulkUpdateSpreadsRequest {
  projectId: string;
  updates: {
    cryptoAsset: SupportedPSPCryptoAsset;
    network: SupportedPSPNetwork | null;
    tierName: string;
    tierMin: number;
    tierMax: number | null;
    buySpreadBps: number;
    sellSpreadBps: number;
  }[];
}

export interface BulkUpdateSpreadsResponse {
  success: boolean;
  updated: number;
  configs: SpreadConfig[];
}

// Copy operations for matrix
export type CopyDirection = 'row' | 'column';

export interface CopySpreadRequest {
  projectId: string;
  direction: CopyDirection;
  source: {
    cryptoAsset?: SupportedPSPCryptoAsset;
    network?: SupportedPSPNetwork | null;
    tierName?: string;
  };
  targets: {
    cryptoAsset?: SupportedPSPCryptoAsset;
    network?: SupportedPSPNetwork | null;
    tierName?: string;
  }[];
}

export interface CopySpreadResponse {
  success: boolean;
  copiedCount: number;
}
