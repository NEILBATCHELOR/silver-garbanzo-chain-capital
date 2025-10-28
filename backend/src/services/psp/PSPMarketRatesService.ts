/**
 * PSP Market Rates Service
 * Integrates with CoinGecko edge function to fetch crypto market rates
 */

import { BaseService } from '../BaseService';
import { logger } from '@/utils/logger';
import {
  MarketRate,
  COINGECKO_ASSET_MAP,
  SupportedPSPCryptoAsset,
  GetMarketRatesRequest,
  GetMarketRatesResponse
} from '@/types/psp-market-rates';

export class PSPMarketRatesService extends BaseService {
  private edgeFunctionUrl: string;

  constructor() {
    super('PSPMarketRates');
    // Use the market-data-proxy edge function
    this.edgeFunctionUrl = `${process.env.SUPABASE_URL}/functions/v1/market-data-proxy`;
  }

  /**
   * Fetch market rates from CoinGecko via edge function
   */
  async getMarketRates(request: GetMarketRatesRequest): Promise<GetMarketRatesResponse> {
    try {
      this.logInfo('Fetching market rates', { assets: request.assets });

      const rates: MarketRate[] = [];

      // Fetch rates for each asset
      for (const asset of request.assets) {
        const coinGeckoId = COINGECKO_ASSET_MAP[asset];
        if (!coinGeckoId) {
          this.logWarn(`No CoinGecko mapping for asset: ${asset}`);
          continue;
        }

        try {
          const rate = await this.fetchAssetRate(
            coinGeckoId,
            asset,
            request.vsCurrency || 'usd'
          );
          rates.push(rate);
        } catch (error) {
          this.logError(`Failed to fetch rate for ${asset}`, { error });
          // Continue with other assets
        }
      }

      return {
        success: true,
        rates,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logError('Failed to fetch market rates', { error });
      throw error;
    }
  }

  /**
   * Fetch rate for a single asset from CoinGecko
   */
  private async fetchAssetRate(
    coinGeckoId: string,
    symbol: string,
    vsCurrency: string
  ): Promise<MarketRate> {
    try {
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          provider: 'coingecko',
          endpoint: 'simple/price',
          params: {
            ids: coinGeckoId,
            vs_currencies: vsCurrency,
            include_last_updated_at: true,
            api_key: process.env.COINGECKO_API_KEY || 'demo'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`CoinGecko API request failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Invalid response from CoinGecko');
      }

      // Extract price from CoinGecko response
      const assetData = result.data[coinGeckoId];
      if (!assetData) {
        throw new Error(`No data returned for ${coinGeckoId}`);
      }

      const usdPrice = assetData[vsCurrency];
      const lastUpdated = assetData.last_updated_at 
        ? new Date(assetData.last_updated_at * 1000).toISOString()
        : new Date().toISOString();

      return {
        symbol,
        usdPrice,
        lastUpdated,
        source: 'coingecko'
      };
    } catch (error) {
      this.logError(`Failed to fetch rate for ${symbol}`, { error, coinGeckoId });
      throw error;
    }
  }

  /**
   * Get cached rates (if implemented)
   * For now, always fetch fresh rates
   */
  async getCachedRates(assets: SupportedPSPCryptoAsset[]): Promise<MarketRate[]> {
    // TODO: Implement caching with Redis or similar
    const response = await this.getMarketRates({ assets });
    return response.rates;
  }

  /**
   * Calculate exchange amount based on rate
   */
  calculateExchange(
    fromAmount: number,
    rate: number,
    spreadBps: number = 0
  ): number {
    const spreadMultiplier = 1 + (spreadBps / 10000);
    return fromAmount / (rate * spreadMultiplier);
  }

  /**
   * Calculate fiat value of crypto amount
   */
  calculateFiatValue(
    cryptoAmount: number,
    rate: number,
    spreadBps: number = 0
  ): number {
    const spreadMultiplier = 1 - (spreadBps / 10000);
    return cryptoAmount * rate * spreadMultiplier;
  }
}
