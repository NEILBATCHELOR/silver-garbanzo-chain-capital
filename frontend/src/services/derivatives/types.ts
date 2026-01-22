/**
 * Derivatives Service Types
 * 
 * Types for perpetual futures, expiry futures, binary options, and index perps
 * Extends exchange types for derivatives trading
 */

// ============================================================================
// DATABASE TYPES
// ============================================================================

export type MarketType = 
  | 'perpetual' 
  | 'expiry_future' 
  | 'binary_option' 
  | 'index_perpetual' 
  | 'election_perpetual' 
  | 'pre_launch_future';

export type OrderType = 
  | 'market' 
  | 'limit' 
  | 'stop_market' 
  | 'stop_limit' 
  | 'take_profit';

export type OrderSide = 'buy' | 'sell';

export type PositionStatus = 'open' | 'closed' | 'liquidated';

export type OrderStatus = 
  | 'pending' 
  | 'active' 
  | 'filled' 
  | 'partially_filled' 
  | 'cancelled' 
  | 'expired' 
  | 'rejected';

export type MarketStatus = 'active' | 'paused' | 'settled' | 'expired';

export interface DerivativeMarket {
  id: string;
  marketId: string;
  marketType: MarketType;
  ticker: string;
  blockchain: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  chainId: string;
  projectId?: string;
  productId?: string;
  productType?: string;
  baseDenom?: string;
  quoteDenom: string;
  oracleBase?: string;
  oracleQuote?: string;
  oracleType?: 'BAND' | 'PYTH' | 'CHAINLINK' | 'PROVIDER';
  oracleScaleFactor: number;
  initialMarginRatio: string;
  maintenanceMarginRatio: string;
  makerFeeRate?: string;
  takerFeeRate?: string;
  minPriceTickSize?: string;
  minQuantityTickSize?: string;
  minNotional?: string;
  fundingInterval?: number;
  nextFundingTimestamp?: string;
  lastFundingRate?: string;
  expiryTimestamp?: string;
  settlementPrice?: string;
  settledAt?: string;
  totalVolume: string;
  totalPositionsOpened: number;
  totalLiquidations: number;
  openInterest: string;
  status: MarketStatus;
  launchedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DerivativePosition {
  id: string;
  positionId?: string;
  marketId: string;
  blockchain: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  chainId: string;
  userAddress: string;
  userId?: string;
  subaccountId?: string;
  projectId?: string;
  productId?: string;
  isLong: boolean;
  quantity: string;
  leverage?: number;
  entryPrice: string;
  currentPrice?: string;
  liquidationPrice?: string;
  margin: string;
  availableMargin?: string;
  unrealizedPnl: string;
  realizedPnl: string;
  totalFundingPaid: string;
  totalFeesPaid: string;
  openedAt: string;
  lastUpdatedAt: string;
  closedAt?: string;
  closePrice?: string;
  closePnl?: string;
  status: PositionStatus;
  openTxHash?: string;
  closeTxHash?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Additional types continue...
export interface OpenPositionParams {
  marketId: string;
  blockchain: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  userAddress: string;
  subaccountId: string;
  isLong: boolean;
  quantity: string;
  leverage?: number;
  orderType: 'market' | 'limit';
  price?: string;
  slippage?: number;
  reduceOnly?: boolean;
}

export interface LaunchPerpetualMarketParams {
  projectId?: string;
  productId?: string;
  blockchain: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  ticker: string;
  quoteDenom: string;
  oracleBase: string;
  oracleQuote: string;
  oracleType: 'BAND' | 'PYTH' | 'CHAINLINK' | 'PROVIDER';
  oracleScaleFactor?: number;
  initialMarginRatio: string;
  maintenanceMarginRatio: string;
  makerFeeRate: string;
  takerFeeRate: string;
  minPriceTickSize: string;
  minQuantityTickSize: string;
  minNotional?: string;
  productType?: string;
  notes?: string;
}

export interface OpenPositionResult {
  success: boolean;
  positionId?: string;
  orderHash?: string;
  fillPrice?: string;
  txHash?: string;
  blockchain?: string;
  network?: string;
  error?: string;
}

export interface FundingRateInfo {
  marketId: string;
  currentRate: string;
  nextPaymentTimestamp: string;
  fundingInterval: number;
  indexPrice: string;
  markPrice: string;
}
