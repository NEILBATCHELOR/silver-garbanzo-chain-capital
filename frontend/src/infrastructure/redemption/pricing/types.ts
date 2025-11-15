/**
 * Stage 8: Exchange Rate & Valuation Service - Type Definitions
 * 
 * This file contains all type definitions for the exchange rate and valuation system.
 * Follows project naming conventions:
 * - Database models: snake_case (matching DB columns exactly)
 * - Application models: camelCase (for TypeScript usage)
 * - Type mappers provided for conversion between DB and App models
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Supported stable currencies for redemption settlement
 */
export enum Currency {
  USDC = 'USDC',
  USDT = 'USDT'
}

/**
 * Price data source types
 */
export enum PriceSourceType {
  ORACLE = 'oracle',
  MANUAL = 'manual',
  MARKET = 'market',
  AGGREGATED = 'aggregated'
}

/**
 * Exchange rate error types
 */
export enum ExchangeRateErrorType {
  NO_RATES_AVAILABLE = 'NO_RATES_AVAILABLE',
  EXCESSIVE_DEVIATION = 'EXCESSIVE_DEVIATION',
  STALE_DATA = 'STALE_DATA',
  INVALID_SOURCE = 'INVALID_SOURCE',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNKNOWN = 'UNKNOWN'
}

// ============================================================================
// DATABASE MODELS (snake_case - matches DB exactly)
// ============================================================================

/**
 * Database model for token_exchange_configs table
 */
export interface TokenExchangeConfigDB {
  id: string;
  token_id: string;
  currency: string;
  base_currency: string;
  update_frequency: number;
  sources: PriceSourceDB[];
  fallback_rate: string | null;
  max_deviation: string | null;
  require_multi_source: boolean | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

/**
 * Database model for exchange_rate_history table
 */
export interface ExchangeRateHistoryDB {
  id: string;
  token_id: string;
  currency: string;
  rate: string;
  source: PriceSourceDB;
  confidence: string | null;
  effective_from: string;
  effective_to: string | null;
  created_at: string | null;
}

/**
 * Database model for valuation_price_history table
 */
export interface ValuationPriceHistoryDB {
  id: string;
  token_id: string;
  period_start: string;
  period_end: string;
  open_price: string | null;
  high_price: string | null;
  low_price: string | null;
  close_price: string | null;
  volume: string | null;
  price_count: number | null;
  sources: string[] | null;
  created_at: string | null;
}

/**
 * Database model for price source (JSONB field)
 */
export interface PriceSourceDB {
  type: string;
  provider: string;
  references: string[];
  methodology: string;
}

// ============================================================================
// APPLICATION MODELS (camelCase - for TypeScript usage)
// ============================================================================

/**
 * Exchange rate configuration for a token
 */
export interface TokenExchangeConfig {
  id: string;
  tokenId: string;
  currency: Currency;
  baseCurrency: Currency;
  updateFrequency: number; // in seconds
  sources: PriceSource[];
  fallbackRate?: number;
  maxDeviation: number; // percentage
  requireMultiSource: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Historical exchange rate record
 */
export interface ExchangeRate {
  id: string;
  tokenId: string;
  tokenAddress?: string;
  currency: Currency;
  rate: number;
  source: PriceSource;
  confidence: number;
  effectiveFrom: string;
  effectiveTo?: string;
  lastUpdated: string;
}

/**
 * Price source information
 */
export interface PriceSource {
  type: PriceSourceType;
  provider: string;
  references: string[];
  methodology: string;
}

/**
 * 4-hour valuation period with OHLCV data
 */
export interface ValuationPriceHistory {
  id: string;
  tokenId: string;
  period: TimePeriod;
  ohlcv: OHLCV;
  priceCount: number;
  sources: string[];
  createdAt: string;
}

/**
 * Time period for valuation
 */
export interface TimePeriod {
  start: string;
  end: string;
  duration: '4h';
}

/**
 * OHLCV (Open, High, Low, Close, Volume) data
 */
export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
}

/**
 * Live price update from oracle
 */
export interface LivePrice {
  tokenId: string;
  price: number;
  volume: number;
  timestamp: string;
  source: string;
}

/**
 * Token valuation with metrics
 */
export interface TokenValuation {
  tokenId: string;
  period: TimePeriod;
  ohlcv: OHLCV;
  metrics: ValuationMetrics;
  lastUpdated: string;
}

/**
 * Valuation metrics (TWAP, VWAP, etc.)
 */
export interface ValuationMetrics {
  twap: number; // Time-Weighted Average Price
  vwap: number; // Volume-Weighted Average Price
  volatility: number;
  priceChange: number;
  priceChangePercent: number;
}

/**
 * Valuation history with statistics
 */
export interface ValuationHistory {
  tokenId: string;
  startDate: string;
  endDate: string;
  periods: ValuationPriceHistory[];
  statistics: HistoricalStatistics;
  chartData: ChartDataPoint[];
}

/**
 * Historical statistics
 */
export interface HistoricalStatistics {
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  totalVolume: number;
  volatility: number;
  periodCount: number;
}

/**
 * Chart data point for visualization
 */
export interface ChartDataPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================================
// SERVICE REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request to create or update exchange rate configuration
 */
export interface CreateExchangeConfigRequest {
  tokenId: string;
  currency: Currency;
  baseCurrency: Currency;
  updateFrequency: number;
  sources: PriceSource[];
  fallbackRate?: number;
  maxDeviation?: number;
  requireMultiSource?: boolean;
}

/**
 * Request to get exchange rate
 */
export interface GetExchangeRateRequest {
  tokenId: string;
  currency: Currency;
  timestamp?: string;
}

/**
 * Response with exchange rate
 */
export interface GetExchangeRateResponse {
  rate: ExchangeRate;
  cached: boolean;
  age: number; // milliseconds
}

/**
 * Request to get valuation for period
 */
export interface GetValuationRequest {
  tokenId: string;
  timestamp?: string;
}

/**
 * Request to get historical valuation
 */
export interface GetHistoricalValuationRequest {
  tokenId: string;
  startDate: string;
  endDate: string;
}

/**
 * Price data from oracle
 */
export interface PriceData {
  price: number;
  decimals: number;
  timestamp: string;
  confidence: number;
  source: string;
}

/**
 * Aggregated price from multiple sources
 */
export interface AggregatedPrice {
  tokenId: string;
  currency: Currency;
  rate: number;
  sources: PriceData[];
  weightedAverage: number;
  confidence: number;
  timestamp: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Custom error for exchange rate operations
 */
export class ExchangeRateError extends Error {
  type: ExchangeRateErrorType;
  details?: unknown;

  constructor(type: ExchangeRateErrorType, message: string, details?: unknown) {
    super(message);
    this.name = 'ExchangeRateError';
    this.type = type;
    this.details = details;
    Object.setPrototypeOf(this, ExchangeRateError.prototype);
  }
}

/**
 * Error thrown when no rates are available
 */
export class NoRatesAvailableError extends ExchangeRateError {
  constructor(tokenId: string, details?: unknown) {
    super(
      ExchangeRateErrorType.NO_RATES_AVAILABLE,
      `No exchange rates available for token ${tokenId}`,
      details
    );
  }
}

/**
 * Error thrown when price deviation exceeds threshold
 */
export class ExcessiveDeviationError extends ExchangeRateError {
  constructor(rate: number, maxDeviation: number, details?: unknown) {
    super(
      ExchangeRateErrorType.EXCESSIVE_DEVIATION,
      `Rate ${rate} exceeds maximum deviation of ${maxDeviation}%`,
      details
    );
  }
}

/**
 * Error thrown when data is stale
 */
export class StaleDataError extends ExchangeRateError {
  constructor(age: number, maxAge: number, details?: unknown) {
    super(
      ExchangeRateErrorType.STALE_DATA,
      `Data is ${age}ms old, exceeds max age of ${maxAge}ms`,
      details
    );
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends ExchangeRateError {
  constructor(message: string, details?: unknown) {
    super(ExchangeRateErrorType.CONFIGURATION_ERROR, message, details);
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for Currency enum
 */
export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && Object.values(Currency).includes(value as Currency);
}

/**
 * Type guard for PriceSourceType enum
 */
export function isPriceSourceType(value: unknown): value is PriceSourceType {
  return typeof value === 'string' && Object.values(PriceSourceType).includes(value as PriceSourceType);
}

/**
 * Type guard for ExchangeRate
 */
export function isExchangeRate(value: unknown): value is ExchangeRate {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.tokenId === 'string' &&
    isCurrency(obj.currency) &&
    typeof obj.rate === 'number' &&
    typeof obj.source === 'object' &&
    typeof obj.confidence === 'number'
  );
}

// ============================================================================
// TYPE MAPPERS (DB ↔ App Model Conversion)
// ============================================================================

/**
 * Convert database PriceSourceDB to application PriceSource
 */
export function mapPriceSourceFromDB(db: PriceSourceDB): PriceSource {
  return {
    type: db.type as PriceSourceType,
    provider: db.provider,
    references: db.references,
    methodology: db.methodology
  };
}

/**
 * Convert application PriceSource to database PriceSourceDB
 */
export function mapPriceSourceToDB(source: PriceSource): PriceSourceDB {
  return {
    type: source.type,
    provider: source.provider,
    references: source.references,
    methodology: source.methodology
  };
}

/**
 * Convert database TokenExchangeConfigDB to application TokenExchangeConfig
 */
export function mapTokenExchangeConfigFromDB(db: TokenExchangeConfigDB): TokenExchangeConfig {
  return {
    id: db.id,
    tokenId: db.token_id,
    currency: db.currency as Currency,
    baseCurrency: db.base_currency as Currency,
    updateFrequency: db.update_frequency,
    sources: db.sources.map(mapPriceSourceFromDB),
    fallbackRate: db.fallback_rate ? parseFloat(db.fallback_rate) : undefined,
    maxDeviation: db.max_deviation ? parseFloat(db.max_deviation) : 5,
    requireMultiSource: db.require_multi_source ?? false,
    active: db.active ?? true,
    createdAt: db.created_at ?? new Date().toISOString(),
    updatedAt: db.updated_at ?? new Date().toISOString(),
    createdBy: db.created_by ?? undefined
  };
}

/**
 * Convert application TokenExchangeConfig to database TokenExchangeConfigDB
 */
export function mapTokenExchangeConfigToDB(config: TokenExchangeConfig): Partial<TokenExchangeConfigDB> {
  return {
    id: config.id,
    token_id: config.tokenId,
    currency: config.currency,
    base_currency: config.baseCurrency,
    update_frequency: config.updateFrequency,
    sources: config.sources.map(mapPriceSourceToDB),
    fallback_rate: config.fallbackRate?.toString() ?? null,
    max_deviation: config.maxDeviation.toString(),
    require_multi_source: config.requireMultiSource,
    active: config.active,
    created_by: config.createdBy ?? null
  };
}

/**
 * Convert database ExchangeRateHistoryDB to application ExchangeRate
 */
export function mapExchangeRateFromDB(db: ExchangeRateHistoryDB): ExchangeRate {
  return {
    id: db.id,
    tokenId: db.token_id,
    currency: db.currency as Currency,
    rate: parseFloat(db.rate),
    source: mapPriceSourceFromDB(db.source),
    confidence: db.confidence ? parseFloat(db.confidence) : 100,
    effectiveFrom: db.effective_from,
    effectiveTo: db.effective_to ?? undefined,
    lastUpdated: db.created_at ?? new Date().toISOString()
  };
}

/**
 * Convert application ExchangeRate to database ExchangeRateHistoryDB
 */
export function mapExchangeRateToDB(rate: ExchangeRate): Partial<ExchangeRateHistoryDB> {
  return {
    id: rate.id,
    token_id: rate.tokenId,
    currency: rate.currency,
    rate: rate.rate.toString(),
    source: mapPriceSourceToDB(rate.source),
    confidence: rate.confidence.toString(),
    effective_from: rate.effectiveFrom,
    effective_to: rate.effectiveTo ?? null
  };
}

/**
 * Convert database ValuationPriceHistoryDB to application ValuationPriceHistory
 */
export function mapValuationPriceHistoryFromDB(db: ValuationPriceHistoryDB): ValuationPriceHistory {
  return {
    id: db.id,
    tokenId: db.token_id,
    period: {
      start: db.period_start,
      end: db.period_end,
      duration: '4h'
    },
    ohlcv: {
      open: db.open_price ? parseFloat(db.open_price) : 0,
      high: db.high_price ? parseFloat(db.high_price) : 0,
      low: db.low_price ? parseFloat(db.low_price) : 0,
      close: db.close_price ? parseFloat(db.close_price) : 0,
      volume: db.volume ? parseFloat(db.volume) : 0,
      timestamp: db.period_start
    },
    priceCount: db.price_count ?? 0,
    sources: db.sources ?? [],
    createdAt: db.created_at ?? new Date().toISOString()
  };
}

/**
 * Convert application ValuationPriceHistory to database ValuationPriceHistoryDB
 */
export function mapValuationPriceHistoryToDB(valuation: ValuationPriceHistory): Partial<ValuationPriceHistoryDB> {
  return {
    id: valuation.id,
    token_id: valuation.tokenId,
    period_start: valuation.period.start,
    period_end: valuation.period.end,
    open_price: valuation.ohlcv.open.toString(),
    high_price: valuation.ohlcv.high.toString(),
    low_price: valuation.ohlcv.low.toString(),
    close_price: valuation.ohlcv.close.toString(),
    volume: valuation.ohlcv.volume.toString(),
    price_count: valuation.priceCount,
    sources: valuation.sources
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate 4-hour period for a given timestamp
 */
export function get4HourPeriod(timestamp: Date): TimePeriod {
  const hours = timestamp.getUTCHours();
  const periodStart = Math.floor(hours / 4) * 4;

  const start = new Date(timestamp);
  start.setUTCHours(periodStart, 0, 0, 0);

  const end = new Date(start);
  end.setUTCHours(periodStart + 4, 0, 0, 0);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    duration: '4h'
  };
}

/**
 * Check if data is stale based on age
 */
export function isDataStale(timestamp: string, maxAgeMs: number): boolean {
  const age = Date.now() - new Date(timestamp).getTime();
  return age > maxAgeMs;
}

/**
 * Format price with appropriate decimals
 */
export function formatPrice(price: number, decimals: number = 8): string {
  return price.toFixed(decimals);
}

/**
 * Calculate price change percentage
 */
export function calculatePriceChange(oldPrice: number, newPrice: number): number {
  if (oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}
