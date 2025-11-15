/**
 * Stage 8: Valuation Oracle
 * 
 * Manages 4-hour price periods and OHLCV valuation tracking
 */

import { createClient } from '@supabase/supabase-js';
import {
  TokenValuation,
  ValuationPriceHistory,
  TimePeriod,
  OHLCV,
  LivePrice,
  ValuationPriceHistoryDB,
  get4HourPeriod,
  mapValuationPriceHistoryFromDB,
  mapValuationPriceHistoryToDB
} from './types';
import { ValuationCalculator } from './calculators/ValuationCalculator';

export interface ValuationOracleConfig {
  supabaseUrl: string;
  supabaseKey: string;
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

interface PricePoint {
  price: number;
  volume: number;
  timestamp: string;
  source: string;
}

/**
 * Valuation Oracle Service
 * 
 * Tracks and stores 4-hour price periods with OHLCV data
 */
export class ValuationOracle {
  private supabase;
  private calculator: ValuationCalculator;
  private logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';
  private currentPeriodData: Map<string, PricePoint[]> = new Map();

  constructor(config: ValuationOracleConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.calculator = new ValuationCalculator({ logLevel: config.logLevel });
    this.logLevel = config.logLevel ?? 'error';
  }

  /**
   * Get valuation for a specific time period
   */
  async getValuation(
    tokenId: string,
    timestamp?: string
  ): Promise<TokenValuation> {
    const currentTime = timestamp ? new Date(timestamp) : new Date();
    const period = get4HourPeriod(currentTime);

    // Try to get from database first
    const { data, error } = await this.supabase
      .from('valuation_price_history')
      .select('*')
      .eq('token_id', tokenId)
      .eq('period_start', period.start)
      .single();

    if (!error && data) {
      const history = mapValuationPriceHistoryFromDB(data as ValuationPriceHistoryDB);
      const metrics = this.calculator.calculateMetrics(history.ohlcv, tokenId);

      return {
        tokenId,
        period: history.period,
        ohlcv: history.ohlcv,
        metrics,
        lastUpdated: history.createdAt
      };
    }

    // If not in DB, we need to calculate from current period data
    const periodData = this.currentPeriodData.get(`${tokenId}:${period.start}`) || [];

    if (periodData.length === 0) {
      this.log('warn', `No data available for ${tokenId} in period ${period.start}`);
      throw new Error(`No valuation data available for token ${tokenId} in period ${period.start}`);
    }

    const ohlcv = this.calculateOHLCV(periodData);
    const metrics = this.calculator.calculateMetrics(ohlcv, tokenId);

    // Store in database
    await this.storeValuation(tokenId, period, ohlcv, periodData.map(p => p.source));

    return {
      tokenId,
      period,
      ohlcv,
      metrics,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Track a new price point
   * Updates current period data
   */
  updateCurrentPeriod(tokenId: string, price: LivePrice): void {
    const period = get4HourPeriod(new Date(price.timestamp));
    const key = `${tokenId}:${period.start}`;

    const periodData = this.currentPeriodData.get(key) || [];
    periodData.push({
      price: price.price,
      volume: price.volume,
      timestamp: price.timestamp,
      source: price.source
    });

    this.currentPeriodData.set(key, periodData);

    this.log('debug', `Updated period data for ${tokenId}: ${periodData.length} points`);

    // Check if period has ended - if so, finalize it
    const now = new Date();
    const periodEnd = new Date(period.end);

    if (now > periodEnd) {
      this.finalizePeriod(tokenId, period, periodData).catch(err => {
        this.log('error', `Failed to finalize period: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  }

  /**
   * Finalize a completed period and store to database
   */
  private async finalizePeriod(
    tokenId: string,
    period: TimePeriod,
    periodData: PricePoint[]
  ): Promise<void> {
    if (periodData.length === 0) {
      this.log('warn', `No data to finalize for period ${period.start}`);
      return;
    }

    const ohlcv = this.calculateOHLCV(periodData);
    await this.storeValuation(
      tokenId,
      period,
      ohlcv,
      [...new Set(periodData.map(p => p.source))]
    );

    // Clear from memory
    this.currentPeriodData.delete(`${tokenId}:${period.start}`);

    this.log('info', `Finalized period ${period.start} for ${tokenId}`);
  }

  /**
   * Calculate OHLCV from price points
   */
  private calculateOHLCV(prices: PricePoint[]): OHLCV {
    if (prices.length === 0) {
      throw new Error('Cannot calculate OHLCV from empty price array');
    }

    // Sort by timestamp
    const sorted = [...prices].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const priceValues = sorted.map(p => p.price);

    return {
      open: sorted[0].price,
      high: Math.max(...priceValues),
      low: Math.min(...priceValues),
      close: sorted[sorted.length - 1].price,
      volume: sorted.reduce((sum, p) => sum + p.volume, 0),
      timestamp: sorted[0].timestamp
    };
  }

  /**
   * Store valuation in database
   */
  private async storeValuation(
    tokenId: string,
    period: TimePeriod,
    ohlcv: OHLCV,
    sources: string[]
  ): Promise<void> {
    const valuationHistory: ValuationPriceHistory = {
      id: crypto.randomUUID(),
      tokenId,
      period,
      ohlcv,
      priceCount: sources.length,
      sources,
      createdAt: new Date().toISOString()
    };

    const dbData = mapValuationPriceHistoryToDB(valuationHistory);

    const { error } = await this.supabase
      .from('valuation_price_history')
      .upsert(dbData, {
        onConflict: 'token_id,period_start'
      });

    if (error) {
      this.log('error', `Failed to store valuation: ${error.message}`);
      throw new Error(`Failed to store valuation: ${error.message}`);
    }

    this.log('debug', `Stored valuation for ${tokenId} period ${period.start}`);
  }

  /**
   * Get current 4-hour period
   */
  getCurrentPeriod(timestamp?: Date): TimePeriod {
    return get4HourPeriod(timestamp ?? new Date());
  }

  /**
   * Cleanup old period data from memory
   * Removes data older than 24 hours
   */
  cleanupOldPeriodData(): number {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    let removed = 0;

    for (const [key, _] of this.currentPeriodData) {
      const periodStart = key.split(':')[1];
      if (new Date(periodStart) < cutoff) {
        this.currentPeriodData.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.log('info', `Cleaned up ${removed} old period data entries`);
    }

    return removed;
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
      const prefix = `[ValuationOracle] [${level.toUpperCase()}]`;

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
