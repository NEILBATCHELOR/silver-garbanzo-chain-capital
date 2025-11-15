/**
 * Volume-Weighted Average Price (VWAP) Calculator
 * 
 * Calculates VWAP weighted by trading volume
 */

import { OHLCV } from '../types';

export interface VWAPResult {
  vwap: number;
  totalVolume: number;
  periodStart: string;
  periodEnd: string;
  dataPoints: number;
}

export class VWAPCalculator {
  /**
   * Calculate VWAP from OHLCV data
   * Uses typical price (H+L+C)/3 weighted by volume
   */
  calculateFromOHLCV(ohlcv: OHLCV): number {
    if (ohlcv.volume === 0) {
      // Fall back to simple average if no volume
      return (ohlcv.high + ohlcv.low + ohlcv.close) / 3;
    }

    const typicalPrice = (ohlcv.high + ohlcv.low + ohlcv.close) / 3;
    return typicalPrice; // Single period VWAP equals typical price
  }

  /**
   * Calculate VWAP from multiple OHLCV periods
   */
  calculateFromPeriods(
    periods: Array<{ ohlcv: OHLCV; periodStart: string; periodEnd: string }>
  ): VWAPResult {
    if (periods.length === 0) {
      throw new Error('No periods provided for VWAP calculation');
    }

    let priceVolumeSum = 0;
    let totalVolume = 0;

    for (const period of periods) {
      const typicalPrice = (period.ohlcv.high + period.ohlcv.low + period.ohlcv.close) / 3;
      priceVolumeSum += typicalPrice * period.ohlcv.volume;
      totalVolume += period.ohlcv.volume;
    }

    if (totalVolume === 0) {
      // Fall back to simple average if no volume
      const sum = periods.reduce(
        (acc, p) => acc + (p.ohlcv.high + p.ohlcv.low + p.ohlcv.close) / 3,
        0
      );
      return {
        vwap: sum / periods.length,
        totalVolume: 0,
        periodStart: periods[0].periodStart,
        periodEnd: periods[periods.length - 1].periodEnd,
        dataPoints: periods.length
      };
    }

    return {
      vwap: priceVolumeSum / totalVolume,
      totalVolume,
      periodStart: periods[0].periodStart,
      periodEnd: periods[periods.length - 1].periodEnd,
      dataPoints: periods.length
    };
  }

  /**
   * Calculate VWAP from price/volume pairs
   */
  calculateFromPriceVolume(
    data: Array<{ price: number; volume: number; timestamp: string }>
  ): VWAPResult {
    if (data.length === 0) {
      throw new Error('No data provided for VWAP calculation');
    }

    let priceVolumeSum = 0;
    let totalVolume = 0;

    for (const point of data) {
      priceVolumeSum += point.price * point.volume;
      totalVolume += point.volume;
    }

    if (totalVolume === 0) {
      // Fall back to simple average
      const sum = data.reduce((acc, p) => acc + p.price, 0);
      return {
        vwap: sum / data.length,
        totalVolume: 0,
        periodStart: data[0].timestamp,
        periodEnd: data[data.length - 1].timestamp,
        dataPoints: data.length
      };
    }

    return {
      vwap: priceVolumeSum / totalVolume,
      totalVolume,
      periodStart: data[0].timestamp,
      periodEnd: data[data.length - 1].timestamp,
      dataPoints: data.length
    };
  }
}
