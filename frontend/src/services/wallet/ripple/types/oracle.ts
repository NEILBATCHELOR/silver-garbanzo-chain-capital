/**
 * XRPL Price Oracle Types
 * Phase 6: Oracle & Price Feeds
 */

/**
 * Price data point for an asset pair
 */
export interface PriceDataPoint {
  baseAsset: string;      // e.g., "BTC"
  quoteAsset: string;     // e.g., "USD"
  assetPrice: number;
  scale: number;          // Decimal places
}

/**
 * Parameters for setting/updating an oracle
 */
export interface OracleSetParams {
  oracleWallet: any;      // XRPL Wallet
  oracleDocumentId: number;
  provider: string;
  uri: string;
  lastUpdateTime: number; // Unix timestamp
  assetClass: string;     // e.g., "currency", "commodity"
  priceDataSeries: PriceDataPoint[];
}

/**
 * Oracle configuration in database
 */
export interface XRPLPriceOracle {
  id: string;
  projectId: string | null;
  oracleAddress: string;
  oracleDocumentId: number;
  provider: string;
  uri: string | null;
  assetClass: string;
  status: 'active' | 'inactive' | 'deprecated';
  lastUpdateTime: number | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

/**
 * Price data record in database
 */
export interface XRPLOraclePriceData {
  id: string;
  oracleId: string;
  baseAsset: string;
  quoteAsset: string;
  assetPrice: number;
  scale: number;
  updateTime: number;
  createdAt: Date;
}

/**
 * Oracle update history record
 */
export interface XRPLOracleUpdate {
  id: string;
  oracleId: string;
  transactionHash: string;
  ledgerIndex: number | null;
  priceData: PriceDataPoint[];
  previousPriceData: PriceDataPoint[] | null;
  updateTime: number;
  createdAt: Date;
  updatedBy: string | null;
}

/**
 * Result from setting/creating an oracle
 */
export interface OracleSetResult {
  oracleDocumentId: number;
  transactionHash: string;
}

/**
 * Result from deleting an oracle
 */
export interface OracleDeleteResult {
  transactionHash: string;
}

/**
 * Oracle details retrieved from XRPL
 */
export interface OracleDetails {
  provider: string;
  uri: string;
  lastUpdateTime: number;
  assetClass: string;
  priceData: PriceDataPoint[];
}

/**
 * Summary of an account's oracles
 */
export interface AccountOracleSummary {
  oracleDocumentId: number;
  provider: string;
  assetClass: string;
  lastUpdateTime: number;
}

/**
 * Request to create a new oracle
 */
export interface CreateOracleRequest {
  projectId?: string;
  provider: string;
  uri: string;
  assetClass: string;
  initialPriceData: PriceDataPoint[];
}

/**
 * Request to update oracle prices
 */
export interface UpdatePricesRequest {
  oracleDocumentId: number;
  priceUpdates: PriceDataPoint[];
}

/**
 * Oracle analytics
 */
export interface OracleAnalytics {
  totalOracles: number;
  activeOracles: number;
  totalUpdates: number;
  avgUpdateInterval: number;
  priceRanges: Map<string, { min: number; max: number; current: number }>;
}

/**
 * Oracle subscription for price updates
 */
export interface OracleSubscription {
  oracleAddress: string;
  oracleDocumentId: number;
  assetPairs: Array<{ baseAsset: string; quoteAsset: string }>;
  callback: (priceData: PriceDataPoint[]) => void;
  active: boolean;
}

/**
 * Oracle error types
 */
export type OracleErrorType =
  | 'ORACLE_NOT_FOUND'
  | 'INVALID_PRICE_DATA'
  | 'UPDATE_FAILED'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR';

/**
 * Oracle error
 */
export interface OracleError {
  type: OracleErrorType;
  message: string;
  details?: any;
  timestamp: Date;
}
