/**
 * Valuation Calculator
 * 
 * Calculates comprehensive valuation metrics including TWAP, VWAP, volatility
 */

import { OHLCV, ValuationMetrics } from '../types';
import { TWAPCalculator } from './TWAPCalculator';
import { VWAPCalculator } from './VWAPCalculator';

export interface ValuationCalculatorConfig {
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

export class ValuationCalculator {
  private twapCalculator: TWAPCalculator;
  private vwapCalculator: VWAPCalculator;
  private logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';

  constructor(config?: ValuationCalculatorConfig) {
    this.twapCalculator = new TWAPCalculator();
    this.vwapCalculator = new VWAPCalculator();
    this.logLevel = config?.logLevel ?? 'error';
  }

  /**
   * Calculate all metrics from a single OHLCV period
   */
  calculateMetrics(ohlcv: OHLCV, tokenId?: string): ValuationMetrics {
    const twap = this.twapCalculator.calculateFromOHLCV(ohlcv);
    const vwap = this.vwapCalculator.calculateFromOHLCV(ohlcv);
    
    const priceChange = ohlcv.close - ohlcv.open;
    const priceChangePercent = ohlcv.open !== 0
      ? (priceChange / ohlcv.open) * 100
      : 0;

    const volatility = this.calculateVolatility(ohlcv);

    this.log('debug', `Calculated metrics for ${tokenId ?? 'unknown'}: TWAP=${twap}, VWAP=${vwap}, Vol=${volatility}`);

    return {
      twap,
      vwap,
      volatility,
      priceChange,
      priceChangePercent
    };
  }

  /**
   * Calculate volatility from OHLCV
   * Uses simple range-based volatility: (High - Low) / Open
   */
  private calculateVolatility(ohlcv: OHLCV): number {
    if (ohlcv.open === 0) {
      return 0;
    }

    const range = ohlcv.high - ohlcv.low;
    return (range / ohlcv.open) * 100; // As percentage
  }

  /**
   * Calculate historical volatility from multiple periods
   */
  calculateHistoricalVolatility(
    periods: Array<{ ohlcv: OHLCV }>
  ): number {
    if (periods.length < 2) {
      return 0;
    }

    // Calculate returns for each period
    const returns: number[] = [];
    for (let i = 1; i < periods.length; i++) {
      const prevClose = periods[i - 1].ohlcv.close;
      const currentClose = periods[i].ohlcv.close;
      
      if (prevClose !== 0) {
        const returnValue = (currentClose - prevClose) / prevClose;
        returns.push(returnValue);
      }
    }

    if (returns.length === 0) {
      return 0;
    }

    // Calculate standard deviation of returns
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev * 100; // As percentage
  }

  /**
   * Calculate trend (positive/negative price movement)
   * Returns percentage change over period
   */
  calculateTrend(
    startPrice: number,
    endPrice: number
  ): number {
    if (startPrice === 0) {
      return 0;
    }

    return ((endPrice - startPrice) / startPrice) * 100;
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
      const prefix = `[ValuationCalculator] [${level.toUpperCase()}]`;

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
