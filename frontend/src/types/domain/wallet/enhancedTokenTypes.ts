/**
 * Enhanced Token Types for Production Wallet
 * Comprehensive token balance and metadata types for all supported standards
 */

// Base token interface
export interface BaseToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoUri?: string;
  verified?: boolean;
}

// Token standards enum
export enum TokenStandard {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721', 
  ERC1155 = 'ERC1155',
  ERC3525 = 'ERC3525',
  ERC4626 = 'ERC4626'
}

// ERC20 Token Balance
export interface ERC20Balance {
  token: BaseToken;
  balance: string;
  balanceFormatted: string;
  usdValue?: number;
  pricePerToken?: number;
  percentChange24h?: number;
  marketCap?: number;
  volume24h?: number;
}

// ERC721 (NFT) Token Balance
export interface ERC721Balance {
  token: BaseToken;
  tokenIds: string[];
  totalCount: number;
  nfts: Array<{
    tokenId: string;
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
    lastPrice?: number;
    estimatedValue?: number;
  }>;
  floorPrice?: number;
  totalEstimatedValue?: number;
  // Additional properties for component compatibility
  name?: string;
  symbol?: string;
  ownedTokens?: Array<{
    tokenId: string;
    name?: string;
    description?: string;
    image?: string;
  }>;
}

// ERC1155 (Multi-Token) Balance
export interface ERC1155Balance {
  token: BaseToken;
  balances: Array<{
    tokenId: string;
    balance: string;
    balanceFormatted: string;
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
    isFungible: boolean;
    pricePerToken?: number;
    totalValue?: number;
  }>;
  totalTypes: number;
  totalValue?: number;
  // Additional properties for component compatibility
  name?: string;
  symbol?: string;
  tokenTypes?: Array<{
    tokenId: string;
    balance: string;
    name?: string;
  }>;
  totalValueUsd?: number;
}

// ERC3525 (Semi-Fungible Token) Balance  
export interface ERC3525Balance {
  token: BaseToken;
  slots: Array<{
    slotId: string;
    slotName?: string;
    slotDescription?: string;
    tokenIds: string[];
    totalValue: string;
    totalValueFormatted: string;
    tokens: Array<{
      tokenId: string;
      value: string;
      valueFormatted: string;
      name?: string;
      description?: string;
      image?: string;
    }>;
  }>;
  totalSlots: number;
  totalValue: string;
  totalValueFormatted: string;
  estimatedUsdValue?: number;
  // Additional properties for component compatibility
  name?: string;
  symbol?: string;
  ownedTokens?: Array<{
    tokenId: string;
    name?: string;
    description?: string;
    image?: string;
  }>;
  valueDecimals?: number;
}

// ERC4626 (Vault) Balance
export interface ERC4626Balance {
  token: BaseToken;
  shares: string;
  sharesFormatted: string;
  assets: string;
  assetsFormatted: string;
  underlyingToken: BaseToken;
  exchangeRate: number;
  apy?: number;
  totalDeposited?: string;
  earnedYield?: string;
  vaultMetadata?: {
    strategy?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    lockupPeriod?: number;
    fees?: {
      managementFee?: number;
      performanceFee?: number;
      withdrawalFee?: number;
    };
  };
  // Additional properties for component compatibility
  name?: string;
  symbol?: string;
  valueUsd?: number;
  underlyingSymbol?: string;
  underlyingValue?: string;
  sharePrice?: number;
}

// Union type for all enhanced token balance types
export type EnhancedTokenBalance = ERC20Balance | ERC721Balance | ERC1155Balance | ERC3525Balance | ERC4626Balance;

// Enhanced Token (unified interface) - compatible with component usage
export interface EnhancedToken {
  standard: TokenStandard;
  token: BaseToken;
  balance: string;
  balanceFormatted?: string;
  valueUsd?: number;
  contractAddress: string;
  lastUpdated: Date;
  source: 'blockchain' | 'cache' | 'api';
  isStale?: boolean;
  error?: string;
  // Additional properties for different token types
  name?: string;
  symbol?: string;
  // For NFTs
  ownedTokens?: Array<{
    tokenId: string;
    name?: string;
    description?: string;
    image?: string;
  }>;
  // For ERC-1155
  tokenTypes?: Array<{
    tokenId: string;
    balance: string;
    name?: string;
  }>;
  totalValueUsd?: number;
  // For ERC-3525
  valueDecimals?: number;
  // For ERC-4626
  underlyingSymbol?: string;
  underlyingValue?: string;
  sharePrice?: number;
}

// Token detection configuration
export interface TokenDetectionConfig {
  enabledStandards: TokenStandard[];
  maxTokensPerStandard: number;
  includeZeroBalances: boolean;
  refreshInterval: number; // in milliseconds
  useCache: boolean;
  cacheTimeout: number; // in milliseconds
}

// Token portfolio summary
export interface TokenPortfolioSummary {
  totalUsdValue: number;
  tokenCount: number;
  nftCount: number;
  byStandard: Record<TokenStandard, {
    count: number;
    totalValue: number;
    percentOfPortfolio: number;
  }>;
  topHoldings: Array<{
    token: BaseToken;
    standard: TokenStandard;
    usdValue: number;
    percentOfPortfolio: number;
  }>;
  lastUpdated: Date;
}

// Token metadata interfaces
export interface TokenMetadata {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
    max_value?: number;
  }>;
  background_color?: string;
  animation_url?: string;
  youtube_url?: string;
}

// Token price data
export interface TokenPriceData {
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  marketCap?: number;
  volume24h?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  lastUpdated: Date;
}
