/**
 * Trade Finance Marketplace Types
 * 
 * Core types for the commodities lending marketplace
 */

// ============================================================================
// MARKET OVERVIEW
// ============================================================================

export interface MarketOverview {
  totalValueLocked: number;
  totalSupplied: number;
  totalBorrowed: number;
  activeUsers: number;
  totalReserves: number;
  utilizationRate: number;
  timestamp: string;
}

// ============================================================================
// COMMODITY MARKET
// ============================================================================

export interface CommodityMarket {
  commodityType: string;
  commodityName: string;
  symbol: string;
  tokenAddress: string | null;
  oracleAddress: string | null;
  
  // Supply metrics
  totalSupply: number;
  totalSupplyUSD: number;
  supplyAPY: number;
  
  // Borrow metrics
  totalBorrow: number;
  totalBorrowUSD: number;
  borrowAPY: number;
  
  // Liquidity
  availableLiquidity: number;
  
  // Utilization
  utilizationRate: number;
  
  // Caps
  supplyCap: number;
  borrowCap: number;
  supplyCapUSD: number;
  borrowCapUSD: number;
  
  // Risk params
  ltv: number;
  liquidationThreshold: number;
  liquidationBonus: number;
  
  // Price
  currentPrice: number;
  priceChange24h: number;
  
  // Status
  isActive: boolean;
  isIsolated: boolean;
  canBeCollateral: boolean;
  canBeBorrowed: boolean;
  
  // Metadata
  listedAt: string;
  updatedAt: string;
}

// Type aliases for backwards compatibility
export type BorrowableAsset = CommodityMarket;
export type CommodityDetail = CommodityMarket;

// ============================================================================
// USER POSITION
// ============================================================================

export interface UserPosition {
  walletAddress: string;
  netWorth: number;
  totalCollateralUSD: number;
  totalDebtUSD: number;
  availableToBorrowUSD: number;
  availableToBorrow: number; // Backwards compatibility
  healthFactor: number;
  
  // Primary properties (what code uses)
  collateral: PositionAsset[];
  debt: PositionAsset[];
  
  // Aliases for semantic clarity
  supplies: PositionAsset[];
  borrows: PositionAsset[];
  
  status: 'healthy' | 'warning' | 'danger' | 'liquidatable';
  updatedAt: string;
}

export interface PositionAsset {
  commodityType: string;
  commodityName: string;
  symbol: string;
  assetAddress?: string; // Token contract address
  amount: number;
  amountUSD: number;
  valueUSD?: number; // Backwards compatibility (same as amountUSD)
  apy: number;
  apyType: 'supply' | 'borrow';
}

// ============================================================================
// SUPPLY / BORROW ACTIONS
// ============================================================================

export interface SupplyParams {
  commodityType: string;
  amount: number;
  onBehalfOf?: string;
}

export interface WithdrawParams {
  commodityType: string;
  amount: number;
  to?: string;
}

export interface BorrowParams {
  commodityType: string;
  amount: number;
  interestRateMode: 'stable' | 'variable';
  onBehalfOf?: string;
}

export interface RepayParams {
  commodityType: string;
  amount: number;
  interestRateMode: 'stable' | 'variable';
  onBehalfOf?: string;
}

// ============================================================================
// TRANSACTION STATUS
// ============================================================================

export interface TransactionStatus {
  status: 'idle' | 'approving' | 'pending' | 'confirming' | 'success' | 'error';
  txHash?: string;
  error?: string;
  message?: string;
}

// ============================================================================
// MARKET STATS
// ============================================================================

export interface MarketStats {
  totalMarkets: number;
  activeMarkets: number;
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  averageSupplyAPY: number;
  averageBorrowAPY: number;
  highestSupplyAPY: {
    commodity: string;
    apy: number;
  };
  highestBorrowAPY: {
    commodity: string;
    apy: number;
  };
}

// ============================================================================
// ACTIVITY / HISTORY
// ============================================================================

export interface MarketActivity {
  id: string;
  type: 'supply' | 'withdraw' | 'borrow' | 'repay' | 'liquidation';
  user: string;
  walletAddress?: string; // User wallet address
  commodity: string;
  commodityType?: string; // Backwards compatibility
  amount: number | string; // Support both number and string
  amountUSD: number;
  valueUSD?: number; // Backwards compatibility
  txHash: string;
  timestamp: string;
}

// ============================================================================
// FILTERS
// ============================================================================

export interface MarketFilters {
  search?: string;
  commodityTypes?: string[];
  minAPY?: number;
  maxAPY?: number;
  onlyActive?: boolean;
  onlyCollateral?: boolean;
  onlyBorrowable?: boolean;
  sortBy?: 'supplyAPY' | 'borrowAPY' | 'totalSupply' | 'totalBorrow' | 'utilization';
  sortOrder?: 'asc' | 'desc';
}
