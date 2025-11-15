/**
 * Time-Weighted Average Price (TWAP) Calculator
 * 
 * Calculates TWAP over a given period using price points
 */

import { OHLCV } from '../types';

export interface TWAPResult {
  twap: number;
  periodStart: string;
  periodEnd: string;
  dataPoints: number;
}

export class TWAPCalculator {
  /**
   * Calculate TWAP from OHLCV data
   * Uses simple average of open, high, low, close
   */
  calculateFromOHLCV(ohlcv: OHLCV): number {
    return (ohlcv.open + ohlcv.high + ohlcv.low + ohlcv.close) / 4;
  }

  /**
   * Calculate TWAP from multiple price points
   * Time-weights each price by duration
   */
  calculateFromPrices(prices: Array<{ price: number; timestamp: string }>): TWAPResult {
    if (prices.length === 0) {
      throw new Error('No prices provided for TWAP calculation');
    }

    if (prices.length === 1) {
      return {
        twap: prices[0].price,
        periodStart: prices[0].timestamp,
        periodEnd: prices[0].timestamp,
        dataPoints: 1
      };
    }

    // Sort by timestamp
    const sorted = [...prices].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let weightedSum = 0;
    let totalDuration = 0;

    // Calculate time-weighted average
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentPrice = sorted[i].price;
      const duration = 
        new Date(sorted[i + 1].timestamp).getTime() - 
        new Date(sorted[i].timestamp).getTime();
      
      weightedSum += currentPrice * duration;
      totalDuration += duration;
    }

    // Add last price (weighted by average interval)
    const avgInterval = totalDuration / (sorted.length - 1);
    weightedSum += sorted[sorted.length - 1].price * avgInterval;
    totalDuration += avgInterval;

    const twap = weightedSum / totalDuration;

    return {
      twap,
      periodStart: sorted[0].timestamp,
      periodEnd: sorted[sorted.length - 1].timestamp,
      dataPoints: sorted.length
    };
  }

  /**
   * Calculate TWAP for multiple periods
   */
  calculateMultiplePeriods(
    periods: Array<{ ohlcv: OHLCV; periodStart: string; periodEnd: string }>
  ): TWAPResult {
    if (periods.length === 0) {
      throw new Error('No periods provided for TWAP calculation');
    }

    const sum = periods.reduce(
      (acc, period) => acc + this.calculateFromOHLCV(period.ohlcv),
      0
    );

    return {
      twap: sum / periods.length,
      periodStart: periods[0].periodStart,
      periodEnd: periods[periods.length - 1].periodEnd,
      dataPoints: periods.length
    };
  }
}
