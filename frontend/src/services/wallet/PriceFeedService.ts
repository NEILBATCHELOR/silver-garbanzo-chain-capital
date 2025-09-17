/**
 * Price Feed Service
 * 
 * Integrates with CoinGecko API to fetch real-time cryptocurrency prices
 * Provides USD valuations for portfolio balances and transaction history
 * Implements caching and rate limiting for production use
 */

export interface TokenPrice {
  symbol: string;
  coinGeckoId: string;
  priceUsd: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: Date;
}

export interface PriceRequest {
  symbols: string[];
  vsCurrency?: string;
}

export interface PriceResponse {
  [symbol: string]: TokenPrice;
}

/**
 * CoinGecko API integration for cryptocurrency price data
 * Implements proper rate limiting and caching for production use
 */
export class PriceFeedService {
  private static instance: PriceFeedService;
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  private readonly priceCache = new Map<string, TokenPrice>();
  private readonly cacheExpiry = 60000; // 1 minute cache
  private lastRequestTime = 0;
  private readonly rateLimit = 1000; // 1 second between requests (free tier limit)
  private readonly apiKey: string | undefined;

  constructor() {
    // Get API key from environment variable
    this.apiKey = import.meta.env.VITE_COINGECKO_API_KEY;
    
    if (this.apiKey) {
      console.log('CoinGecko API key loaded from environment');
      // With API key, we can make more requests per minute
      Object.defineProperty(this, 'rateLimit', { value: 500, writable: false }); // 500ms with API key
    } else {
      console.warn('No CoinGecko API key found. Using free tier rate limits.');
    }
  }

  // CoinGecko ID mappings for common tokens
  private readonly coinGeckoIds: { [symbol: string]: string } = {
    'ETH': 'ethereum',
    'BTC': 'bitcoin',
    'MATIC': 'matic-network',
    'AVAX': 'avalanche-2',
    'SOL': 'solana',
    'NEAR': 'near',
    'BNB': 'binancecoin',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'DAI': 'dai',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'AAVE': 'aave',
    'COMP': 'compound-coin',
    'MKR': 'maker',
    'CRV': 'curve-dao-token',
    'YFI': 'yearn-finance',
    'SUSHI': 'sushi',
    'SNX': 'synthetix-network-token',
    '1INCH': '1inch',
    'BAL': 'balancer',
    'WBTC': 'wrapped-bitcoin'
  };

  public static getInstance(): PriceFeedService {
    if (!PriceFeedService.instance) {
      PriceFeedService.instance = new PriceFeedService();
    }
    return PriceFeedService.instance;
  }

  /**
   * Get price for a single token
   */
  async getTokenPrice(symbol: string, vsCurrency: string = 'usd'): Promise<TokenPrice | null> {
    const cacheKey = `${symbol}-${vsCurrency}`;
    
    // Check cache first
    const cached = this.priceCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.lastUpdated)) {
      return cached;
    }

    try {
      const coinGeckoId = this.getCoinGeckoId(symbol);
      if (!coinGeckoId) {
        console.warn(`No CoinGecko ID found for symbol: ${symbol}`);
        return null;
      }

      await this.respectRateLimit();

      const headers: HeadersInit = {
        'Accept': 'application/json'
      };

      // Add API key to headers if available
      if (this.apiKey) {
        headers['x-cg-demo-api-key'] = this.apiKey;
      }

      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${coinGeckoId}&vs_currencies=${vsCurrency}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const tokenData = data[coinGeckoId];
      
      if (!tokenData) {
        console.warn(`No price data found for ${symbol} (${coinGeckoId})`);
        return null;
      }

      const price: TokenPrice = {
        symbol: symbol.toUpperCase(),
        coinGeckoId,
        priceUsd: tokenData[vsCurrency] || 0,
        priceChange24h: tokenData[`${vsCurrency}_24h_change`] || 0,
        marketCap: tokenData[`${vsCurrency}_market_cap`] || 0,
        volume24h: tokenData[`${vsCurrency}_24h_vol`] || 0,
        lastUpdated: new Date()
      };

      // Cache the result
      this.priceCache.set(cacheKey, price);
      return price;

    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get prices for multiple tokens in batch
   */
  async getMultipleTokenPrices(symbols: string[], vsCurrency: string = 'usd'): Promise<PriceResponse> {
    const result: PriceResponse = {};
    
    // Separate cached and non-cached symbols
    const nonCachedSymbols: string[] = [];
    
    for (const symbol of symbols) {
      const cacheKey = `${symbol}-${vsCurrency}`;
      const cached = this.priceCache.get(cacheKey);
      
      if (cached && this.isCacheValid(cached.lastUpdated)) {
        result[symbol] = cached;
      } else {
        nonCachedSymbols.push(symbol);
      }
    }

    // Fetch non-cached prices
    if (nonCachedSymbols.length > 0) {
      try {
        const coinGeckoIds = nonCachedSymbols
          .map(symbol => this.getCoinGeckoId(symbol))
          .filter(id => id !== null) as string[];

        if (coinGeckoIds.length > 0) {
          await this.respectRateLimit();

          const headers: HeadersInit = {
            'Accept': 'application/json'
          };

          // Add API key to headers if available
          if (this.apiKey) {
            headers['x-cg-demo-api-key'] = this.apiKey;
          }

          const response = await fetch(
            `${this.baseUrl}/simple/price?ids=${coinGeckoIds.join(',')}&vs_currencies=${vsCurrency}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
            { headers }
          );

          if (response.ok) {
            const data = await response.json();

            for (const symbol of nonCachedSymbols) {
              const coinGeckoId = this.getCoinGeckoId(symbol);
              if (coinGeckoId && data[coinGeckoId]) {
                const tokenData = data[coinGeckoId];
                
                const price: TokenPrice = {
                  symbol: symbol.toUpperCase(),
                  coinGeckoId,
                  priceUsd: tokenData[vsCurrency] || 0,
                  priceChange24h: tokenData[`${vsCurrency}_24h_change`] || 0,
                  marketCap: tokenData[`${vsCurrency}_market_cap`] || 0,
                  volume24h: tokenData[`${vsCurrency}_24h_vol`] || 0,
                  lastUpdated: new Date()
                };

                result[symbol] = price;
                this.priceCache.set(`${symbol}-${vsCurrency}`, price);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching multiple token prices:', error);
      }
    }

    return result;
  }

  /**
   * Get price for token by contract address (for ERC-20 tokens)
   */
  async getTokenPriceByContract(
    contractAddress: string, 
    chainId: number, 
    vsCurrency: string = 'usd'
  ): Promise<TokenPrice | null> {
    try {
      const platformId = this.getChainPlatformId(chainId);
      if (!platformId) {
        console.warn(`No CoinGecko platform ID found for chain ID: ${chainId}`);
        return null;
      }

      await this.respectRateLimit();

      const headers: HeadersInit = {
        'Accept': 'application/json'
      };

      // Add API key to headers if available
      if (this.apiKey) {
        headers['x-cg-demo-api-key'] = this.apiKey;
      }

      const response = await fetch(
        `${this.baseUrl}/simple/token_price/${platformId}?contract_addresses=${contractAddress}&vs_currencies=${vsCurrency}&include_24hr_change=true`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko token API error: ${response.status}`);
      }

      const data = await response.json();
      const tokenData = data[contractAddress.toLowerCase()];
      
      if (!tokenData) {
        console.warn(`No price data found for contract: ${contractAddress}`);
        return null;
      }

      return {
        symbol: 'TOKEN', // Symbol would need to be fetched separately
        coinGeckoId: '',
        priceUsd: tokenData[vsCurrency] || 0,
        priceChange24h: tokenData[`${vsCurrency}_24h_change`] || 0,
        marketCap: 0,
        volume24h: 0,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error(`Error fetching price for contract ${contractAddress}:`, error);
      return null;
    }
  }

  /**
   * Get historical prices for charts
   */
  async getHistoricalPrices(
    symbol: string, 
    days: number = 7, 
    vsCurrency: string = 'usd'
  ): Promise<Array<{timestamp: number; price: number}> | null> {
    try {
      const coinGeckoId = this.getCoinGeckoId(symbol);
      if (!coinGeckoId) {
        return null;
      }

      await this.respectRateLimit();

      const headers: HeadersInit = {
        'Accept': 'application/json'
      };

      // Add API key to headers if available
      if (this.apiKey) {
        headers['x-cg-demo-api-key'] = this.apiKey;
      }

      const response = await fetch(
        `${this.baseUrl}/coins/${coinGeckoId}/market_chart?vs_currency=${vsCurrency}&days=${days}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko historical API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.prices) {
        return null;
      }

      return data.prices.map((point: [number, number]) => ({
        timestamp: point[0],
        price: point[1]
      }));

    } catch (error) {
      console.error(`Error fetching historical prices for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Calculate USD value for a token amount
   */
  async calculateUsdValue(
    symbol: string, 
    amount: number, 
    decimals: number = 18
  ): Promise<number> {
    const price = await this.getTokenPrice(symbol);
    if (!price) {
      return 0;
    }

    const adjustedAmount = amount / Math.pow(10, decimals);
    return adjustedAmount * price.priceUsd;
  }

  /**
   * Get supported tokens list
   */
  getSupportedTokens(): string[] {
    return Object.keys(this.coinGeckoIds);
  }

  /**
   * Add custom token mapping
   */
  addTokenMapping(symbol: string, coinGeckoId: string): void {
    this.coinGeckoIds[symbol.toUpperCase()] = coinGeckoId;
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.priceCache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; expiredCount: number } {
    let expiredCount = 0;
    const now = new Date();
    
    for (const [, price] of this.priceCache) {
      if (!this.isCacheValid(price.lastUpdated)) {
        expiredCount++;
      }
    }

    return {
      size: this.priceCache.size,
      expiredCount
    };
  }

  // Private helper methods

  private getCoinGeckoId(symbol: string): string | null {
    return this.coinGeckoIds[symbol.toUpperCase()] || null;
  }

  private getChainPlatformId(chainId: number): string | null {
    const platformIds: { [chainId: number]: string } = {
      1: 'ethereum',
      137: 'polygon-pos',
      42161: 'arbitrum-one',
      10: 'optimistic-ethereum',
      43114: 'avalanche',
      56: 'binance-smart-chain',
      8453: 'base'
    };

    return platformIds[chainId] || null;
  }

  private isCacheValid(lastUpdated: Date): boolean {
    return Date.now() - lastUpdated.getTime() < this.cacheExpiry;
  }

  private async respectRateLimit(): Promise<void> {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimit) {
      const delay = this.rateLimit - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }
}

export const priceFeedService = PriceFeedService.getInstance();
