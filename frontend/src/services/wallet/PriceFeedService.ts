/**
 * Price Feed Service
 * 
 * Integrates with CoinGecko API via Supabase Edge Function to fetch real-time cryptocurrency prices
 * Avoids CORS issues by using edge function proxy
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
 * CoinGecko API integration via Edge Function for cryptocurrency price data
 * Implements proper rate limiting and caching for production use
 */
export class PriceFeedService {
  private static instance: PriceFeedService;
  private readonly priceCache = new Map<string, TokenPrice>();
  private readonly cacheExpiry = 60000; // 1 minute cache
  private lastRequestTime = 0;
  private readonly rateLimit = 500; // 500ms between requests
  private readonly apiKey: string | undefined;

  constructor() {
    // Get API key from environment variable
    this.apiKey = import.meta.env.VITE_COINGECKO_API_KEY;
    
    if (this.apiKey) {
      console.log('💰 CoinGecko API key loaded from environment');
    } else {
      console.log('💰 Using CoinGecko free tier (no API key)');
    }
  }

  // CoinGecko ID mappings for common tokens
  private readonly coinGeckoIds: { [symbol: string]: string } = {
    // Major cryptocurrencies
    'ETH': 'ethereum',
    'BTC': 'bitcoin',
    'SOL': 'solana',
    'BNB': 'binancecoin',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'AVAX': 'avalanche-2',
    'MATIC': 'matic-network',
    'POL': 'matic-network', // POL is the new ticker for MATIC
    'NEAR': 'near',
    'FTM': 'fantom',
    'CRO': 'crypto-com-chain',
    'SEI': 'sei-network',
    'RON': 'ronin',
    'CORE': 'coredaoorg',
    
    // Layer 2 and Alternative Chains
    'INJ': 'injective-protocol',
    'APT': 'aptos',
    'SUI': 'sui',
    'ATOM': 'cosmos',
    'OSMO': 'osmosis',
    'JUNO': 'juno-network',
    'XRP': 'ripple',
    'SCRT': 'secret',
    'TRX': 'tron',
    'TON': 'the-open-network',
    'HBAR': 'hedera-hashgraph',
    'XLM': 'stellar',
    'ALGO': 'algorand',
    'KAS': 'kaspa',
    'TIA': 'celestia',
    'ICP': 'internet-computer',
    'DOGE': 'dogecoin',
    'LTC': 'litecoin',
    'BCH': 'bitcoin-cash',
    'XMR': 'monero',
    'VET': 'vechain',
    'FIL': 'filecoin',
    'THETA': 'theta-token',
    'RUNE': 'thorchain',
    'BEAM': 'beam',
    
    // Stablecoins
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'DAI': 'dai',
    'BUSD': 'binance-usd',
    'TUSD': 'true-usd',
    'FRAX': 'frax',
    
    // DeFi tokens
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
    'LDO': 'lido-dao',
    'ONDO': 'ondo-finance',
    'ENS': 'ethereum-name-service',
    'GRT': 'the-graph',
    
    // Meme coins
    'SHIB': 'shiba-inu',
    'FLOKI': 'floki',
    'PEPE': 'pepe',
    'WIF': 'dogwifhat',
    'BONK': 'bonk',
    'BRETT': 'based-brett',
    
    // Gaming/Metaverse
    'AXS': 'axie-infinity',
    'SAND': 'the-sandbox',
    'MANA': 'decentraland',
    'GALA': 'gala',
    'IMX': 'immutable-x',
    
    // Wrapped tokens
    'WBTC': 'wrapped-bitcoin',
    'WETH': 'weth',
    'WMATIC': 'wmatic',
    'WAVAX': 'wrapped-avax'
  };

  // Reverse mapping: CoinGecko ID to symbol for backward compatibility
  private readonly reverseCoinGeckoIds: { [coingeckoId: string]: string } = Object.entries(this.coinGeckoIds).reduce((acc, [symbol, id]) => {
    acc[id] = symbol;
    return acc;
  }, {} as { [coingeckoId: string]: string });

  public static getInstance(): PriceFeedService {
    if (!PriceFeedService.instance) {
      PriceFeedService.instance = new PriceFeedService();
    }
    return PriceFeedService.instance;
  }

  /**
   * Call CoinGecko API via Supabase Edge Function to avoid CORS issues
   */
  private async callEdgeFunction(endpoint: string, params: Record<string, string | number>): Promise<any> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    }

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/market-data-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          provider: 'coingecko',
          endpoint,
          params: {
            ...params,
            ...(this.apiKey && { api_key: this.apiKey })
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge Function response error:', errorText);
        throw new Error(`Edge Function failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`CoinGecko API error: ${result.error}`);
      }

      return result.data;
    } catch (error) {
      console.error('Edge function call failed:', error);
      throw error;
    }
  }

  /**
   * Get price for a single token
   * @param symbolOrId Token symbol (e.g., 'ETH') or CoinGecko ID (e.g., 'ethereum')
   * @param vsCurrency Currency to convert to (default: 'usd')
   * @param forceRefresh Force refresh from API, bypassing cache
   */
  async getTokenPrice(symbolOrId: string, vsCurrency: string = 'usd', forceRefresh: boolean = false): Promise<TokenPrice | null> {
    const cacheKey = `${symbolOrId}-${vsCurrency}`;
    
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cached = this.priceCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.lastUpdated)) {
        console.log(`💾 Using cached price for ${symbolOrId}: $${cached.priceUsd}`);
        return cached;
      }
    }

    try {
      const coinGeckoId = this.getCoinGeckoId(symbolOrId);
      if (!coinGeckoId) {
        console.warn(`No CoinGecko ID found for symbol: ${symbolOrId}`);
        return null;
      }

      await this.respectRateLimit();
      console.log(`📊 Fetching price for ${symbolOrId} (${coinGeckoId}) from CoinGecko...`);

      // Use Edge Function proxy instead of direct API calls to avoid CORS
      const data = await this.callEdgeFunction('simple/price', {
        ids: coinGeckoId,
        vs_currencies: vsCurrency,
        include_24hr_change: 'true',
        include_market_cap: 'true',
        include_24hr_vol: 'true'
      });

      const tokenData = data[coinGeckoId];
      
      if (!tokenData) {
        console.warn(`No price data found for ${symbolOrId} (${coinGeckoId})`);
        return null;
      }

      // Use the original symbol if it was a symbol, otherwise use the reverse mapping or uppercase coinGeckoId
      let displaySymbol = symbolOrId.toUpperCase();
      if (this.reverseCoinGeckoIds[coinGeckoId]) {
        displaySymbol = this.reverseCoinGeckoIds[coinGeckoId];
      }

      const price: TokenPrice = {
        symbol: displaySymbol,
        coinGeckoId,
        priceUsd: tokenData[vsCurrency] || 0,
        priceChange24h: tokenData[`${vsCurrency}_24h_change`] || 0,
        marketCap: tokenData[`${vsCurrency}_market_cap`] || 0,
        volume24h: tokenData[`${vsCurrency}_24h_vol`] || 0,
        lastUpdated: new Date()
      };

      console.log(`✅ Got price for ${displaySymbol}: $${price.priceUsd}`);

      // Cache the result
      this.priceCache.set(cacheKey, price);
      return price;

    } catch (error) {
      console.error(`❌ Error fetching price for ${symbolOrId}:`, error);
      // Return cached value if available, even if expired
      const cached = this.priceCache.get(cacheKey);
      if (cached) {
        console.log(`⚠️ Using expired cached price for ${symbolOrId}`);
        return cached;
      }
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
          console.log(`📊 Fetching prices for ${coinGeckoIds.length} tokens from CoinGecko...`);

          // Use Edge Function proxy instead of direct API calls to avoid CORS
          const data = await this.callEdgeFunction('simple/price', {
            ids: coinGeckoIds.join(','),
            vs_currencies: vsCurrency,
            include_24hr_change: 'true',
            include_market_cap: 'true',
            include_24hr_vol: 'true'
          });

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
          
          console.log(`✅ Got prices for ${Object.keys(result).length} tokens`);
        }
      } catch (error) {
        console.error('❌ Error fetching multiple token prices:', error);
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
      console.log(`📊 Fetching price for contract ${contractAddress.slice(0, 10)}... on ${platformId}`);

      // Use Edge Function proxy instead of direct API calls to avoid CORS
      const data = await this.callEdgeFunction(`simple/token_price/${platformId}`, {
        contract_addresses: contractAddress.toLowerCase(),
        vs_currencies: vsCurrency,
        include_24hr_change: 'true'
      });

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
      console.error(`❌ Error fetching price for contract ${contractAddress}:`, error);
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
      console.log(`📈 Fetching ${days}-day historical prices for ${symbol}`);

      // Use Edge Function proxy instead of direct API calls to avoid CORS
      const data = await this.callEdgeFunction(`coins/${coinGeckoId}/market_chart`, {
        vs_currency: vsCurrency,
        days: days.toString()
      });
      
      if (!data.prices) {
        return null;
      }

      return data.prices.map((point: [number, number]) => ({
        timestamp: point[0],
        price: point[1]
      }));

    } catch (error) {
      console.error(`❌ Error fetching historical prices for ${symbol}:`, error);
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
    this.reverseCoinGeckoIds[coinGeckoId] = symbol.toUpperCase();
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.priceCache.clear();
    console.log('🗑️ Price cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; expiredCount: number; validCount: number } {
    let expiredCount = 0;
    let validCount = 0;
    
    for (const [, price] of this.priceCache) {
      if (this.isCacheValid(price.lastUpdated)) {
        validCount++;
      } else {
        expiredCount++;
      }
    }

    return {
      size: this.priceCache.size,
      expiredCount,
      validCount
    };
  }

  // Private helper methods

  private getCoinGeckoId(symbolOrId: string): string | null {
    const upperSymbol = symbolOrId.toUpperCase();
    
    // First check if it's a symbol we can map to CoinGecko ID
    if (this.coinGeckoIds[upperSymbol]) {
      return this.coinGeckoIds[upperSymbol];
    }
    
    // Check if it's already a CoinGecko ID (for backward compatibility)
    if (this.reverseCoinGeckoIds[symbolOrId.toLowerCase()]) {
      return symbolOrId.toLowerCase();
    }
    
    // For unknown tokens, assume it's already a CoinGecko ID
    return symbolOrId.toLowerCase();
  }

  private getChainPlatformId(chainId: number): string | null {
    const platformIds: { [chainId: number]: string } = {
      1: 'ethereum',
      137: 'polygon-pos',
      42161: 'arbitrum-one',
      10: 'optimistic-ethereum',
      43114: 'avalanche',
      56: 'binance-smart-chain',
      8453: 'base',
      250: 'fantom',
      25: 'cronos',
      1329: 'sei-network',
      2020: 'ronin',
      1116: 'coredaoorg',
      // Testnets (return mainnet platform for price reference)
      11155111: 'ethereum', // Sepolia
      17000: 'ethereum', // Holesky
      80002: 'polygon-pos', // Amoy
      11155420: 'optimistic-ethereum', // Optimism Sepolia
      421614: 'arbitrum-one', // Arbitrum Sepolia
      84532: 'base', // Base Sepolia
      43113: 'avalanche', // Fuji
      97: 'binance-smart-chain', // BSC Testnet
      4002: 'fantom', // Fantom Testnet
      338: 'cronos', // Cronos Testnet
      1328: 'sei-network', // Sei Testnet
      2021: 'ronin', // Ronin Testnet
      1115: 'coredaoorg', // Core Testnet
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
