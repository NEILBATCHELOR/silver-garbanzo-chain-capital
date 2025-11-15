/**
 * Stage 8: Price History Tracker
 * 
 * Tracks and retrieves historical valuation data
 */

import { createClient } from '@supabase/supabase-js';
import {
  ValuationHistory,
  ValuationPriceHistory,
  HistoricalStatistics,
  ChartDataPoint,
  ValuationPriceHistoryDB,
  mapValuationPriceHistoryFromDB
} from './types';
import { TWAPCalculator, VWAPCalculator } from './calculators';

export interface PriceHistoryTrackerConfig {
  supabaseUrl: string;
  supabaseKey: string;
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Price History Tracker Service
 * 
 * Retrieves and processes historical valuation data
 */
export class PriceHistoryTracker {
  private supabase;
  private twapCalculator: TWAPCalculator;
  private vwapCalculator: VWAPCalculator;
  private logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';

  constructor(config: PriceHistoryTrackerConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.twapCalculator = new TWAPCalculator();
    this.vwapCalculator = new VWAPCalculator();
    this.logLevel = config.logLevel ?? 'error';
  }

  /**
   * Get historical valuation for date range
   */
  async getHistoricalValuation(
    tokenId: string,
    startDate: string,
    endDate: string
  ): Promise<ValuationHistory> {
    const { data, error } = await this.supabase
      .from('valuation_price_history')
      .select('*')
      .eq('token_id', tokenId)
      .gte('period_start', startDate)
      .lte('period_end', endDate)
      .order('period_start', { ascending: true });

    if (error) {
      this.log('error', `Failed to fetch historical valuation: ${error.message}`);
      throw new Error(`Failed to fetch historical valuation: ${error.message}`);
    }

    if (!data || data.length === 0) {
      this.log('warn', `No historical data found for ${tokenId} between ${startDate} and ${endDate}`);
      return {
        tokenId,
        startDate,
        endDate,
        periods: [],
        statistics: this.getEmptyStatistics(),
        chartData: []
      };
    }

    // Map database records to application models
    const periods = data.map(record =>
      mapValuationPriceHistoryFromDB(record as ValuationPriceHistoryDB)
    );

    // Calculate statistics
    const statistics = this.calculateStatistics(periods);

    // Prepare chart data
    const chartData = this.prepareChartData(periods);

    this.log('info', `Retrieved ${periods.length} periods for ${tokenId}`);

    return {
      tokenId,
      startDate,
      endDate,
      periods,
      statistics,
      chartData
    };
  }

  /**
   * Get most recent valuation periods
   */
  async getRecentPeriods(
    tokenId: string,
    count: number = 6 // Default: last 24 hours (6 x 4-hour periods)
  ): Promise<ValuationPriceHistory[]> {
    const { data, error } = await this.supabase
      .from('valuation_price_history')
      .select('*')
      .eq('token_id', tokenId)
      .order('period_start', { ascending: false })
      .limit(count);

    if (error) {
      this.log('error', `Failed to fetch recent periods: ${error.message}`);
      throw new Error(`Failed to fetch recent periods: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data
      .map(record => mapValuationPriceHistoryFromDB(record as ValuationPriceHistoryDB))
      .reverse(); // Return in chronological order
  }

  /**
   * Calculate statistics from periods
   */
  private calculateStatistics(periods: ValuationPriceHistory[]): HistoricalStatistics {
    if (periods.length === 0) {
      return this.getEmptyStatistics();
    }

    const prices = periods.map(p => p.ohlcv.close);
    const volumes = periods.map(p => p.ohlcv.volume);

    const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const totalVolume = volumes.reduce((sum, v) => sum + v, 0);

    // Calculate median
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const medianPrice = sortedPrices.length % 2 === 0
      ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
      : sortedPrices[Math.floor(sortedPrices.length / 2)];

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Calculate volatility (standard deviation of returns)
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] !== 0) {
        const returnValue = (prices[i] - prices[i - 1]) / prices[i - 1];
        returns.push(returnValue);
      }
    }

    let volatility = 0;
    if (returns.length > 0) {
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      volatility = Math.sqrt(variance) * 100; // As percentage
    }

    return {
      averagePrice,
      medianPrice,
      minPrice,
      maxPrice,
      totalVolume,
      volatility,
      periodCount: periods.length
    };
  }

  /**
   * Prepare chart data from periods
   */
  private prepareChartData(periods: ValuationPriceHistory[]): ChartDataPoint[] {
    return periods.map(period => ({
      timestamp: period.period.start,
      open: period.ohlcv.open,
      high: period.ohlcv.high,
      low: period.ohlcv.low,
      close: period.ohlcv.close,
      volume: period.ohlcv.volume
    }));
  }

  /**
   * Get empty statistics object
   */
  private getEmptyStatistics(): HistoricalStatistics {
    return {
      averagePrice: 0,
      medianPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      totalVolume: 0,
      volatility: 0,
      periodCount: 0
    };
  }

  /**
   * Get price trend over time
   */
  async getPriceTrend(
    tokenId: string,
    days: number = 7
  ): Promise<{
    trend: 'up' | 'down' | 'flat';
    changePercent: number;
    startPrice: number;
    endPrice: number;
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const history = await this.getHistoricalValuation(
      tokenId,
      startDate.toISOString(),
      endDate.toISOString()
    );

    if (history.periods.length < 2) {
      return {
        trend: 'flat',
        changePercent: 0,
        startPrice: 0,
        endPrice: 0
      };
    }

    const startPrice = history.periods[0].ohlcv.open;
    const endPrice = history.periods[history.periods.length - 1].ohlcv.close;
    const changePercent = startPrice !== 0
      ? ((endPrice - startPrice) / startPrice) * 100
      : 0;

    let trend: 'up' | 'down' | 'flat' = 'flat';
    if (Math.abs(changePercent) > 1) {
      trend = changePercent > 0 ? 'up' : 'down';
    }

    return {
      trend,
      changePercent,
      startPrice,
      endPrice
    };
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
      const prefix = `[PriceHistoryTracker] [${level.toUpperCase()}]`;

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
