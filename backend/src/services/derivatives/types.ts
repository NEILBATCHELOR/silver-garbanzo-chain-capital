/**
 * Derivatives Service Types - Backend
 * 
 * Types for derivatives trading (perpetuals, futures, options)
 */

// Market Types
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
export type OrderStatus = 'pending' | 'partial' | 'filled' | 'cancelled' | 'failed';
export type MarketStatus = 'active' | 'suspended' | 'expired' | 'settled';

// Database Models
export interface DerivativeMarket {
  id: string;
  project_id?: string;
  product_id?: string;
  blockchain: string;
  network: string;
  chain_id: string;
  market_id: string;
  market_type: MarketType;
  ticker: string;
  quote_denom: string;
  oracle_config: {
    base: string;
    quote: string;
    type: 'BAND' | 'PYTH' | 'CHAINLINK' | 'PROVIDER';
  };
  margin_config: {
    initial_margin_ratio: string;
    maintenance_margin_ratio: string;
  };
  fees: {
    maker_fee_rate: string;
    taker_fee_rate: string;
  };
  funding_config?: {
    funding_interval: number;
    min_funding_rate: string;
    max_funding_rate: string;
  };
  expiry_date?: string;
  settlement_price?: string;
  status: MarketStatus;
  volume_24h?: string;
  open_interest?: string;
  funding_rate?: string;
  total_trades?: number;
  total_liquidations?: number;
  created_at: string;
  updated_at: string;
}

export interface DerivativePosition {
  id: string;
  market_id: string;
  user_address: string;
  blockchain: string;
  network: string;
  chain_id: string;
  project_id?: string;
  product_id?: string;
  is_long: boolean;
  entry_price: string;
  quantity: string;
  leverage: number;
  margin: string;
  current_price?: string;
  unrealized_pnl?: string;
  realized_pnl?: string;
  funding_paid?: string;
  fees_paid?: string;
  liquidation_price?: string;
  status: PositionStatus;
  opened_at: string;
  closed_at?: string;
  liquidated_at?: string;
  updated_at: string;
}

// Launch Parameters
export interface LaunchPerpetualMarketParams {
  projectId?: string;
  productId?: string;
  blockchain: string;
  network: string;
  ticker: string;
  quoteDenom: string;
  oracleBase: string;
  oracleQuote: string;
  oracleScaleFactor?: number;
  oracleType: 'BAND' | 'PYTH' | 'CHAINLINK' | 'PROVIDER';
  initialMarginRatio: string;
  maintenanceMarginRatio: string;
  makerFeeRate: string;
  takerFeeRate: string;
  minPriceTickSize: string;
  minQuantityTickSize: string;
  minNotional?: string;
  fundingInterval?: number;
  minFundingRate?: string;
  maxFundingRate?: string;
  deployerAddress: string;
  privateKey?: string;
  useHSM?: boolean;
}

export interface LaunchExpiryFutureParams {
  projectId?: string;
  productId?: string;
  blockchain: string;
  network: string;
  ticker: string;
  quoteDenom: string;
  oracleBase: string;
  oracleQuote: string;
  oracleScaleFactor?: number;
  oracleType: 'BAND' | 'PYTH' | 'CHAINLINK' | 'PROVIDER';
  expiryDate: Date;
  settlementType: 'physical' | 'cash';
  initialMarginRatio: string;
  maintenanceMarginRatio: string;
  makerFeeRate: string;
  takerFeeRate: string;
  minPriceTickSize: string;
  minQuantityTickSize: string;
  minNotional?: string;
  deployerAddress: string;
  privateKey?: string;
  useHSM?: boolean;
}

// Position Management
export interface OpenPositionParams {
  marketId: string;
  userAddress: string;
  isLong: boolean;
  quantity: string;
  leverage: number;
  network: string;
  maintenanceMarginRatio?: string;
  price?: string;
  orderType?: OrderType;
  subaccountId?: string;
  privateKey?: string;
  useHSM?: boolean;
}

export interface ClosePositionParams {
  positionId: string;
  marketId: string;
  userAddress: string;
  isLong: boolean;
  network: string;
  entryPrice?: string;
  quantity?: string;
  price?: string;
  subaccountId?: string;
  privateKey?: string;
  useHSM?: boolean;
}

// Query Parameters
export interface GetMarketsParams {
  projectId?: string;
  productId?: string;
  blockchain?: string;
  network?: string;
  marketType?: MarketType;
  status?: MarketStatus;
}

export interface GetPositionsParams {
  userAddress?: string;
  marketId?: string;
  projectId?: string;
  productId?: string;
  blockchain?: string;
  network?: string;
  status?: PositionStatus;
}

// Result Types
export interface LaunchMarketResult {
  marketId: string;
  txHash: string;
  market: DerivativeMarket;
}

export interface OpenPositionResult {
  positionId: string;
  txHash: string;
  position: DerivativePosition;
  requiredMargin: string;
  liquidationPrice: string;
  estimatedFees: string;
}

export interface ClosePositionResult {
  positionId?: string;
  txHash: string;
  closedQuantity: string;
  exitPrice?: string;
  realizedPnl: string;
  fees: string;
}

export interface FundingRateInfo {
  marketId?: string;
  currentRate: string;
  nextPaymentTime: string; // ISO string instead of Date
  estimatedPayment: string;
}

export interface MarketInfo {
  marketId?: string;
  ticker?: string;
  lastPrice?: string;
  markPrice?: string;
  indexPrice?: string;
  volume24h?: string;
  high24h?: string;
  low24h?: string;
  openInterest?: string;
  market?: DerivativeMarket;
  orderbook: {
    bids: Array<{ price: string; quantity: string }>;
    asks: Array<{ price: string; quantity: string }>;
  };
  recentTrades: Array<{
    price: string;
    quantity: string;
    side: OrderSide;
    timestamp: string; // ISO string instead of Date
  }>;
  stats?: {
    volume24h: string;
    high24h: string;
    low24h: string;
    priceChange24h: string;
    priceChangePercent24h: string;
  };
}

// Adapter Interface
export interface IDerivativesAdapter {
  launchPerpetualMarket(params: LaunchPerpetualMarketParams): Promise<LaunchMarketResult>;
  launchExpiryFuture(params: LaunchExpiryFutureParams): Promise<LaunchMarketResult>;
  openPosition(params: OpenPositionParams): Promise<OpenPositionResult>;
  closePosition(params: ClosePositionParams): Promise<ClosePositionResult>;
  getMarketInfo(marketId: string, network: string): Promise<MarketInfo>;
  getFundingRate(marketId: string, network: string): Promise<FundingRateInfo>;
  getPositions(params: GetPositionsParams): Promise<DerivativePosition[]>;
  getOrders(params: {
    userAddress: string;
    marketId?: string;
    status?: 'pending' | 'partial' | 'filled' | 'cancelled';
    side?: 'buy' | 'sell';
    blockchain: string;
    network: string;
  }): Promise<any[]>;
  cancelOrder(params: {
    orderId: string;
    userAddress: string;
    marketId: string;
    blockchain: string;
    network: string;
    privateKey: string;
    subaccountId?: string;
  }): Promise<{ orderId: string; txHash: string }>;
  getTradeHistory(params: {
    userAddress: string;
    marketId?: string;
    side?: 'buy' | 'sell';
    blockchain: string;
    network: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]>;
}
