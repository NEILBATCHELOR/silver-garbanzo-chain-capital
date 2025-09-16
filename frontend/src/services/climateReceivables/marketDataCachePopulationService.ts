/**
 * Market Data Cache Population Service
 * 
 * Service to populate climate_market_data_cache table using FreeMarketDataService
 * Ensures market data is available for risk calculations and dashboard display
 */

import { FreeMarketDataService } from './freeMarketDataService';

export interface CachePopulationResult {
  success: boolean;
  error?: string;
  data?: {
    treasury_rates_cached: boolean;
    credit_spreads_cached: boolean;
    energy_prices_cached: boolean;
    policy_changes_count: number;
    cache_timestamp: string;
    api_calls_made: number;
    processing_time_ms: number;
  };
}

/**
 * Service for populating market data cache
 */
export class MarketDataCachePopulationService {
  
  /**
   * Populate market data cache using FreeMarketDataService
   */
  public static async populateMarketDataCache(): Promise<CachePopulationResult> {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Starting market data cache population...');
      
      // Use the existing FreeMarketDataService to get comprehensive market data
      // This will automatically cache the data in climate_market_data_cache
      const marketSnapshot = await FreeMarketDataService.getMarketDataSnapshot();
      
      const processingTime = Date.now() - startTime;
      
      console.log('✅ Market data cache population completed successfully');
      console.log(`📊 Processing time: ${processingTime}ms`);
      console.log(`📈 API calls made: ${marketSnapshot.api_call_count}`);
      console.log(`💾 Cache hit rate: ${(marketSnapshot.cache_hit_rate * 100).toFixed(1)}%`);
      
      return {
        success: true,
        data: {
          treasury_rates_cached: !!marketSnapshot.treasury_rates,
          credit_spreads_cached: !!marketSnapshot.credit_spreads,
          energy_prices_cached: !!marketSnapshot.energy_prices,
          policy_changes_count: marketSnapshot.policy_changes.length,
          cache_timestamp: marketSnapshot.data_freshness,
          api_calls_made: marketSnapshot.api_call_count,
          processing_time_ms: processingTime
        }
      };
      
    } catch (error) {
      console.error('❌ Market data cache population failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check market data cache status
   */
  public static async checkCacheStatus(): Promise<{
    cache_entries: number;
    last_updated?: string;
    expires_at?: string;
    cache_age_hours?: number;
  }> {
    try {
      const { supabase } = await import('@/infrastructure/database/client');
      
      const { data, error } = await supabase
        .from('climate_market_data_cache')
        .select('cache_key, cached_at, expires_at')
        .eq('cache_key', 'market_snapshot')
        .single();

      if (error || !data) {
        return {
          cache_entries: 0
        };
      }

      const cacheAge = data.cached_at 
        ? (Date.now() - new Date(data.cached_at).getTime()) / (1000 * 60 * 60)
        : undefined;

      return {
        cache_entries: 1,
        last_updated: data.cached_at,
        expires_at: data.expires_at,
        cache_age_hours: cacheAge ? Math.round(cacheAge * 100) / 100 : undefined
      };

    } catch (error) {
      console.error('Failed to check cache status:', error);
      return {
        cache_entries: 0
      };
    }
  }
}
