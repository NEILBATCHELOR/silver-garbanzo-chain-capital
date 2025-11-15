/**
 * Stage 8: Exchange Rate Service
 * 
 * Core service for managing exchange rates with multi-source aggregation,
 * caching, and database persistence.
 */

import { createClient } from '@supabase/supabase-js';
import { PriceFeedManager } from '@/infrastructure/web3/pricing/PriceFeedManager';
import { CoinGeckoAdapter } from '@/infrastructure/web3/pricing/CoinGeckoAdapter';
import { ExchangeRateCache } from './ExchangeRateCache';
import {
  ExchangeRate,
  Currency,
  PriceSource,
  PriceSourceType,
  TokenExchangeConfig,
  GetExchangeRateRequest,
  GetExchangeRateResponse,
  CreateExchangeConfigRequest,
  PriceData,
  AggregatedPrice,
  NoRatesAvailableError,
  ExcessiveDeviationError,
  ConfigurationError,
  ExchangeRateHistoryDB,
  TokenExchangeConfigDB,
  mapExchangeRateFromDB,
  mapExchangeRateToDB,
  mapTokenExchangeConfigFromDB,
  mapTokenExchangeConfigToDB,
  isDataStale
} from './types';

/**
 * Configuration for Exchange Rate Service
 */
export interface ExchangeRateServiceConfig {
  supabaseUrl: string;
  supabaseKey: string;
  cacheConfig?: {
    ttlMs?: number;
    maxSize?: number;
  };
  coinGeckoApiKey?: string;
  defaultUpdateFrequency?: number; // seconds
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Exchange Rate Service
 * 
 * Manages exchange rates for tokens with:
 * - Multi-source price aggregation
 * - Caching layer
 * - Database persistence
 * - Automatic updates
 */
export class ExchangeRateService {
  private supabase;
  private cache: ExchangeRateCache;
  private priceFeedManager: PriceFeedManager;
  private updateScheduler: Map<string, NodeJS.Timeout> = new Map();
  private logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';
  
  constructor(config: ExchangeRateServiceConfig) {
    // Initialize Supabase client
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    
    // Initialize cache
    this.cache = new ExchangeRateCache(config.cacheConfig);
    
    // Initialize price feed manager with CoinGecko
    this.priceFeedManager = new PriceFeedManager({
      defaultCurrency: 'USD',
      cacheTtlMs: 60 * 1000, // 1 minute for live prices
      logLevel: config.logLevel ?? 'error'
    });
    
    // Register CoinGecko adapter
    const coinGeckoAdapter = new CoinGeckoAdapter(config.coinGeckoApiKey);
    this.priceFeedManager.registerAdapter(coinGeckoAdapter);
    
    this.logLevel = config.logLevel ?? 'error';
  }
  
  /**
   * Get exchange rate for a token
   */
  async getExchangeRate(request: GetExchangeRateRequest): Promise<GetExchangeRateResponse> {
    const { tokenId, currency, timestamp } = request;
    
    // 1. Check cache first
    const cached = this.cache.get(tokenId, currency, timestamp);
    if (cached) {
      this.log('debug', `Using cached rate for ${tokenId} in ${currency}`);
      return cached;
    }
    
    // 2. Get configuration for this token
    const config = await this.getTokenConfig(tokenId, currency);
    if (!config) {
      throw new ConfigurationError(`No exchange rate configuration found for token ${tokenId} and currency ${currency}`);
    }
    
    // 3. If timestamp is provided, get historical rate
    if (timestamp) {
      return await this.getHistoricalRate(tokenId, currency, timestamp);
    }
    
    // 4. Fetch current rate from sources
    const rate = await this.fetchCurrentRate(tokenId, currency, config);
    
    // 5. Cache and return
    this.cache.set(rate);
    
    return {
      rate,
      cached: false,
      age: 0
    };
  }
  
  /**
   * Configure exchange rate for a token
   */
  async configureExchangeRate(request: CreateExchangeConfigRequest): Promise<TokenExchangeConfig> {
    const {
      tokenId,
      currency,
      baseCurrency,
      updateFrequency,
      sources,
      fallbackRate,
      maxDeviation,
      requireMultiSource
    } = request;
    
    // Validate configuration
    this.validateConfig(request);
    
    // Create config record
    const configData: Partial<TokenExchangeConfigDB> = {
      token_id: tokenId,
      currency,
      base_currency: baseCurrency,
      update_frequency: updateFrequency,
      sources: sources.map(s => ({
        type: s.type,
        provider: s.provider,
        references: s.references,
        methodology: s.methodology
      })),
      fallback_rate: fallbackRate?.toString() ?? null,
      max_deviation: (maxDeviation ?? 5).toString(),
      require_multi_source: requireMultiSource ?? false,
      active: true
    };
    
    // Upsert to database
    const { data, error } = await this.supabase
      .from('token_exchange_configs')
      .upsert(configData)
      .select()
      .single();
      
    if (error) {
      throw new ConfigurationError(`Failed to configure exchange rate: ${error.message}`, error);
    }
    
    const config = mapTokenExchangeConfigFromDB(data as TokenExchangeConfigDB);
    
    // Schedule automatic updates
    await this.scheduleUpdates(config);
    
    this.log('info', `Configured exchange rate for token ${tokenId}, currency ${currency}`);
    
    return config;
  }
  
  /**
   * Fetch current rate from configured sources
   */
  private async fetchCurrentRate(
    tokenId: string,
    currency: Currency,
    config: TokenExchangeConfig
  ): Promise<ExchangeRate> {
    const rates: PriceData[] = [];
    
    // Get token symbol for price feeds
    const tokenSymbol = await this.getTokenSymbol(tokenId);
    
    // Fetch from each configured source
    for (const source of config.sources) {
      try {
        const priceData = await this.fetchFromSource(tokenSymbol, currency, source);
        if (priceData) {
          rates.push(priceData);
        }
      } catch (error) {
        this.log('warn', `Failed to fetch from ${source.provider}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Check if we have enough sources
    if (rates.length === 0) {
      if (config.fallbackRate) {
        return this.createFallbackRate(tokenId, currency, config);
      }
      throw new NoRatesAvailableError(tokenId, { currency, sources: config.sources });
    }
    
    if (config.requireMultiSource && rates.length < 2) {
      throw new NoRatesAvailableError(tokenId, {
        currency,
        reason: 'Multi-source required but only one source available',
        availableSources: rates.length
      });
    }
    
    // Aggregate rates
    const aggregatedRate = this.aggregateRates(rates, config);
    
    // Validate deviation
    if (config.maxDeviation) {
      this.validateDeviation(aggregatedRate, config.maxDeviation);
    }
    
    // Create exchange rate record
    const exchangeRate: ExchangeRate = {
      id: crypto.randomUUID(),
      tokenId,
      currency,
      rate: aggregatedRate.rate,
      source: {
        type: PriceSourceType.AGGREGATED,
        provider: 'multi-source',
        references: rates.map(r => r.source),
        methodology: 'weighted-average'
      },
      confidence: aggregatedRate.confidence,
      effectiveFrom: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    // Store in database
    await this.storeExchangeRate(exchangeRate);
    
    return exchangeRate;
  }
  
  /**
   * Fetch price from a specific source
   */
  private async fetchFromSource(
    tokenSymbol: string,
    currency: Currency,
    source: PriceSource
  ): Promise<PriceData | null> {
    try {
      // Use PriceFeedManager to get current price
      const tokenPrice = await this.priceFeedManager.getCurrentPrice(
        tokenSymbol,
        currency
      );
      
      return {
        price: tokenPrice.price,
        decimals: 8, // Standard for fiat currencies
        timestamp: tokenPrice.lastUpdated,
        confidence: 100, // CoinGecko is generally reliable
        source: source.provider
      };
    } catch (error) {
      this.log('error', `Error fetching from ${source.provider}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  
  /**
   * Aggregate multiple price sources
   */
  private aggregateRates(
    rates: PriceData[],
    config: TokenExchangeConfig
  ): AggregatedPrice {
    if (rates.length === 0) {
      throw new NoRatesAvailableError(config.tokenId);
    }
    
    // Calculate weighted average based on confidence
    const totalConfidence = rates.reduce((sum, r) => sum + r.confidence, 0);
    let weightedSum = 0;
    
    for (const rate of rates) {
      const weight = rate.confidence / totalConfidence;
      weightedSum += rate.price * weight;
    }
    
    // Calculate minimum confidence
    const minConfidence = Math.min(...rates.map(r => r.confidence));
    
    return {
      tokenId: config.tokenId,
      currency: config.currency,
      rate: weightedSum,
      sources: rates,
      weightedAverage: weightedSum,
      confidence: minConfidence,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Validate price deviation
   */
  private validateDeviation(aggregated: AggregatedPrice, maxDeviation: number): void {
    if (aggregated.sources.length < 2) return;
    
    const prices = aggregated.sources.map(s => s.price);
    const avg = aggregated.rate;
    
    for (const price of prices) {
      const deviation = Math.abs((price - avg) / avg) * 100;
      
      if (deviation > maxDeviation) {
        throw new ExcessiveDeviationError(price, maxDeviation, {
          average: avg,
          deviation,
          sources: aggregated.sources.length
        });
      }
    }
  }
  
  /**
   * Create fallback rate
   */
  private createFallbackRate(
    tokenId: string,
    currency: Currency,
    config: TokenExchangeConfig
  ): ExchangeRate {
    if (!config.fallbackRate) {
      throw new NoRatesAvailableError(tokenId, { currency, reason: 'No fallback rate configured' });
    }
    
    return {
      id: crypto.randomUUID(),
      tokenId,
      currency,
      rate: config.fallbackRate,
      source: {
        type: PriceSourceType.MANUAL,
        provider: 'fallback',
        references: [],
        methodology: 'configured-fallback'
      },
      confidence: 50, // Lower confidence for fallback rates
      effectiveFrom: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Get historical exchange rate
   */
  private async getHistoricalRate(
    tokenId: string,
    currency: Currency,
    timestamp: string
  ): Promise<GetExchangeRateResponse> {
    const { data, error } = await this.supabase
      .from('exchange_rate_history')
      .select('*')
      .eq('token_id', tokenId)
      .eq('currency', currency)
      .lte('effective_from', timestamp)
      .or(`effective_to.is.null,effective_to.gte.${timestamp}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();
      
    if (error || !data) {
      throw new NoRatesAvailableError(tokenId, {
        currency,
        timestamp,
        reason: 'No historical rate found for this timestamp'
      });
    }
    
    const rate = mapExchangeRateFromDB(data as ExchangeRateHistoryDB);
    const age = new Date().getTime() - new Date(rate.lastUpdated).getTime();
    
    return {
      rate,
      cached: false,
      age
    };
  }
  
  /**
   * Store exchange rate in database
   */
  private async storeExchangeRate(rate: ExchangeRate): Promise<void> {
    const dbData = mapExchangeRateToDB(rate);
    
    const { error } = await this.supabase
      .from('exchange_rate_history')
      .insert(dbData);
      
    if (error) {
      this.log('error', `Failed to store exchange rate: ${error.message}`);
      throw new Error(`Failed to store exchange rate: ${error.message}`);
    }
  }
  
  /**
   * Get token configuration
   */
  private async getTokenConfig(
    tokenId: string,
    currency: Currency
  ): Promise<TokenExchangeConfig | null> {
    const { data, error } = await this.supabase
      .from('token_exchange_configs')
      .select('*')
      .eq('token_id', tokenId)
      .eq('currency', currency)
      .eq('active', true)
      .single();
      
    if (error || !data) {
      return null;
    }
    
    return mapTokenExchangeConfigFromDB(data as TokenExchangeConfigDB);
  }
  
  /**
   * Get token symbol from database
   */
  private async getTokenSymbol(tokenId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('tokens')
      .select('symbol')
      .eq('id', tokenId)
      .single();
      
    if (error || !data) {
      throw new Error(`Token not found: ${tokenId}`);
    }
    
    return data.symbol;
  }
  
  /**
   * Schedule automatic rate updates
   */
  private async scheduleUpdates(config: TokenExchangeConfig): Promise<void> {
    const key = `${config.tokenId}:${config.currency}`;
    
    // Clear existing schedule
    const existing = this.updateScheduler.get(key);
    if (existing) {
      clearInterval(existing);
    }
    
    // Schedule new updates
    const interval = setInterval(async () => {
      try {
        await this.getExchangeRate({
          tokenId: config.tokenId,
          currency: config.currency
        });
        this.log('debug', `Auto-updated rate for ${key}`);
      } catch (error) {
        this.log('error', `Auto-update failed for ${key}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, config.updateFrequency * 1000);
    
    this.updateScheduler.set(key, interval);
  }
  
  /**
   * Validate configuration
   */
  private validateConfig(config: CreateExchangeConfigRequest): void {
    if (!config.tokenId) {
      throw new ConfigurationError('Token ID is required');
    }
    
    if (!config.currency || !Object.values(Currency).includes(config.currency)) {
      throw new ConfigurationError('Invalid currency');
    }
    
    if (!config.baseCurrency || !Object.values(Currency).includes(config.baseCurrency)) {
      throw new ConfigurationError('Invalid base currency');
    }
    
    if (config.updateFrequency < 60) {
      throw new ConfigurationError('Update frequency must be at least 60 seconds');
    }
    
    if (!config.sources || config.sources.length === 0) {
      throw new ConfigurationError('At least one price source is required');
    }
  }
  
  /**
   * Stop all scheduled updates
   */
  stopAllUpdates(): void {
    for (const [key, interval] of this.updateScheduler) {
      clearInterval(interval);
      this.log('info', `Stopped scheduled updates for ${key}`);
    }
    this.updateScheduler.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStatistics() {
    return this.cache.getStatistics();
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Log message
   */
  private log(level: 'error' | 'warn' | 'info' | 'debug', message: string): void {
    const levels = {
      none: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4
    };
    
    if (levels[this.logLevel] >= levels[level]) {
      const prefix = `[ExchangeRateService] [${level.toUpperCase()}]`;
      
      switch (level) {
        case 'error':
          console.error(prefix, message);
          break;
        case 'warn':
          console.warn(prefix, message);
          break;
        case 'info':
          console.info(prefix, message);
          break;
        case 'debug':
          console.debug(prefix, message);
          break;
      }
    }
  }
}
