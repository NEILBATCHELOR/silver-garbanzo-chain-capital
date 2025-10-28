/**
 * PSP Rates With Spreads Service
 * Combines market rates with spread configurations to provide final trading rates
 */

import { BaseService } from '../BaseService';
import { logger } from '@/utils/logger';
import { PSPMarketRatesService } from './PSPMarketRatesService';
import { PSPSpreadsService } from './PSPSpreadsService';
import {
  RateWithSpread,
  SupportedPSPCryptoAsset,
  SupportedPSPNetwork,
  GetRatesWithSpreadsRequest,
  GetRatesWithSpreadsResponse
} from '@/types/psp-market-rates';

export class PSPRatesWithSpreadsService extends BaseService {
  private marketRatesService: PSPMarketRatesService;
  private spreadsService: PSPSpreadsService;

  constructor() {
    super('PSPRatesWithSpreads');
    this.marketRatesService = new PSPMarketRatesService();
    this.spreadsService = new PSPSpreadsService();
  }

  /**
   * Get market rates with spreads applied
   */
  async getRatesWithSpreads(
    request: GetRatesWithSpreadsRequest
  ): Promise<GetRatesWithSpreadsResponse> {
    try {
      this.logInfo('Getting rates with spreads', {
        assets: request.assets,
        amount: request.transactionAmount,
        projectId: request.projectId
      });

      // Fetch market rates
      const marketRatesResponse = await this.marketRatesService.getMarketRates({
        assets: request.assets
      });

      // Apply spreads
      const ratesWithSpreads: RateWithSpread[] = [];

      for (const marketRate of marketRatesResponse.rates) {
        // Get spread configuration for this asset and amount
        const spread = await this.spreadsService.getSpread(
          request.projectId,
          marketRate.symbol as SupportedPSPCryptoAsset,
          marketRate.network as SupportedPSPNetwork | null,
          request.transactionAmount
        );

        const buySpreadBps = spread?.buySpreadBps || 0;
        const sellSpreadBps = spread?.sellSpreadBps || 0;

        // Calculate rates with spreads
        const buyRate = this.calculateBuyRate(marketRate.usdPrice, buySpreadBps);
        const sellRate = this.calculateSellRate(marketRate.usdPrice, sellSpreadBps);

        ratesWithSpreads.push({
          asset: marketRate.symbol,
          network: marketRate.network,
          baseRate: marketRate.usdPrice,
          buySpreadBps,
          sellSpreadBps,
          buyRate,
          sellRate,
          timestamp: marketRate.lastUpdated
        });
      }

      return {
        success: true,
        rates: ratesWithSpreads,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logError('Failed to get rates with spreads', { error, request });
      throw error;
    }
  }

  /**
   * Calculate buy rate (user buying crypto with fiat)
   * Spread is added to the base rate
   */
  private calculateBuyRate(baseRate: number, spreadBps: number): number {
    const spreadMultiplier = 1 + (spreadBps / 10000);
    return baseRate * spreadMultiplier;
  }

  /**
   * Calculate sell rate (user selling crypto for fiat)
   * Spread is subtracted from the base rate
   */
  private calculateSellRate(baseRate: number, spreadBps: number): number {
    const spreadMultiplier = 1 - (spreadBps / 10000);
    return baseRate * spreadMultiplier;
  }

  /**
   * Get quote for buying crypto with fiat
   */
  async getQuoteForBuyCrypto(
    projectId: string,
    fiatAmount: number,
    cryptoAsset: SupportedPSPCryptoAsset,
    network?: SupportedPSPNetwork
  ): Promise<{
    fiatAmount: number;
    cryptoAmount: number;
    rate: number;
    spread: number;
    timestamp: string;
  }> {
    try {
      const ratesResponse = await this.getRatesWithSpreads({
        projectId,
        assets: [cryptoAsset],
        transactionAmount: fiatAmount
      });

      const rate = ratesResponse.rates.find(
        r => r.asset === cryptoAsset && (!network || r.network === network)
      );

      if (!rate) {
        throw new Error(`Rate not found for ${cryptoAsset}`);
      }

      const cryptoAmount = fiatAmount / rate.buyRate;

      return {
        fiatAmount,
        cryptoAmount,
        rate: rate.buyRate,
        spread: rate.buySpreadBps,
        timestamp: rate.timestamp
      };
    } catch (error) {
      this.logError('Failed to get buy crypto quote', { error, fiatAmount, cryptoAsset });
      throw error;
    }
  }

  /**
   * Get quote for selling crypto for fiat
   */
  async getQuoteForSellCrypto(
    projectId: string,
    cryptoAmount: number,
    cryptoAsset: SupportedPSPCryptoAsset,
    network?: SupportedPSPNetwork
  ): Promise<{
    cryptoAmount: number;
    fiatAmount: number;
    rate: number;
    spread: number;
    timestamp: string;
  }> {
    try {
      // For sell quotes, we need to estimate the fiat amount first to get correct tier
      // Use a conservative estimate (assume highest tier)
      const estimateResponse = await this.marketRatesService.getMarketRates({
        assets: [cryptoAsset]
      });

      const marketRate = estimateResponse.rates.find(r => r.symbol === cryptoAsset);
      if (!marketRate) {
        throw new Error(`Market rate not found for ${cryptoAsset}`);
      }

      const estimatedFiatAmount = cryptoAmount * marketRate.usdPrice;

      // Get rate with correct spread tier
      const ratesResponse = await this.getRatesWithSpreads({
        projectId,
        assets: [cryptoAsset],
        transactionAmount: estimatedFiatAmount
      });

      const rate = ratesResponse.rates.find(
        r => r.asset === cryptoAsset && (!network || r.network === network)
      );

      if (!rate) {
        throw new Error(`Rate not found for ${cryptoAsset}`);
      }

      const fiatAmount = cryptoAmount * rate.sellRate;

      return {
        cryptoAmount,
        fiatAmount,
        rate: rate.sellRate,
        spread: rate.sellSpreadBps,
        timestamp: rate.timestamp
      };
    } catch (error) {
      this.logError('Failed to get sell crypto quote', { error, cryptoAmount, cryptoAsset });
      throw error;
    }
  }
}
