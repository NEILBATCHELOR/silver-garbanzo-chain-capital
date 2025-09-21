/**
 * Base Balance Service
 * Abstract class that all chain-specific balance services extend
 */

import { priceFeedService } from '../PriceFeedService';
import { rpcManager } from '../../../infrastructure/web3/rpc/RPCConnectionManager';
import type { SupportedChain, NetworkType } from '../../../infrastructure/web3/adapters/IBlockchainAdapter';
import type {
  BaseBalanceService,
  BalanceServiceConfig,
  ChainBalance,
  TokenBalance,
  RateLimiter,
  BalanceCache
} from './types';
import { globalRateLimiter, globalCache } from './types';

export abstract class BaseChainBalanceService implements BaseBalanceService {
  protected readonly config: BalanceServiceConfig;
  protected readonly rateLimiter: RateLimiter;
  protected readonly cache: BalanceCache;
  protected readonly retryAttempts: number;
  protected readonly timeout: number;

  constructor(
    config: BalanceServiceConfig,
    rateLimiter: RateLimiter = globalRateLimiter,
    cache: BalanceCache = globalCache
  ) {
    this.config = config;
    this.rateLimiter = rateLimiter;
    this.cache = cache;
    this.retryAttempts = config.retryAttempts || 3;
    this.timeout = config.timeout || 10000;
  }

  abstract validateAddress(address: string): boolean;
  protected abstract fetchNativeBalance(address: string): Promise<string>;
  protected abstract fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]>;

  getChainConfig(): BalanceServiceConfig {
    // Determine if this is an EVM chain based on chainId ranges
    const isEVM = this.isEVMChain(this.config.chainId);
    
    return { 
      ...this.config,
      name: this.config.chainName, // Alias for backward compatibility
      isEVM // Required for TransactionHistoryService routing
    };
  }

  private isEVMChain(chainId: number): boolean {
    // EVM chains typically have chainId > 0 and are not Bitcoin (0) or other non-EVM chains
    const evmChainIds = [
      1, 3, 4, 5, 42, // Ethereum mainnet and testnets
      137, 80001, // Polygon
      10, 420, 11155420, // Optimism
      42161, 421613, 421614, // Arbitrum
      8453, 84531, 84532, // Base
      56, 97, // BSC
      43114, 43113, // Avalanche
      250, 4002, // Fantom
      1285, 1287, // Moonbeam/Moonriver
      100, 5000, // Gnosis Chain
      324, 280, // zkSync Era
      1101, 1442, // Polygon zkEVM
      59144, 59140, // Linea
      534352, 534351, // Scroll
      11155111, 17000 // Sepolia, Holesky
    ];
    
    return evmChainIds.includes(chainId);
  }

  isConfigured(): boolean {
    return !!(this.config.rpcUrl && this.config.rpcUrl.trim() !== '');
  }

  /**
   * Main method to fetch complete balance for an address
   */
  async fetchBalance(address: string): Promise<ChainBalance> {
    const cacheKey = `balance_${this.config.chainName}_${address}`;
    
    // Check cache first
    const cached = this.cache.get<ChainBalance>(cacheKey);
    if (cached) {
      console.log(`💾 Using cached balance for ${this.config.chainName}: ${address.slice(0, 10)}...`);
      return cached;
    }

    console.log(`🔍 Fetching ${this.config.chainName} balance for ${address.slice(0, 10)}...`);

    // Validate address
    if (!this.validateAddress(address)) {
      throw new Error(`Invalid ${this.config.chainName} address format: ${address}`);
    }

    // Check if RPC is configured
    if (!this.isConfigured()) {
      console.warn(`${this.config.chainName} RPC not configured`);
      return this.createErrorBalance(address, `${this.config.chainName} RPC not configured`);
    }

    try {
      // Wait for rate limit
      await this.rateLimiter.canMakeRequest();
      
      // Fetch native balance
      const nativeBalance = await this.withRetry(() => this.fetchNativeBalance(address));
      
      // Get native token price
      const nativePrice = await this.getNativeTokenPrice();
      const nativeValueUsd = parseFloat(nativeBalance) * nativePrice;

      // Fetch token balances
      let tokens: TokenBalance[] = [];
      try {
        await this.rateLimiter.canMakeRequest();
        tokens = await this.withRetry(() => this.fetchTokenBalances(address));
      } catch (tokenError) {
        console.warn(`⚠️ Token fetch failed for ${this.config.chainName}:`, tokenError.message);
      }

      const totalValueUsd = nativeValueUsd + tokens.reduce((sum, token) => sum + token.valueUsd, 0);

      console.log(`💰 ${this.config.chainName}: ${nativeBalance.slice(0, 8)} ${this.config.symbol} ($${nativeValueUsd.toFixed(2)}) + ${tokens.length} tokens`);

      const result: ChainBalance = {
        address,
        chainId: this.config.chainId,
        chainName: this.config.chainName,
        symbol: this.config.symbol,
        networkType: this.config.networkType,
        nativeBalance,
        nativeValueUsd,
        tokens,
        totalValueUsd,
        lastUpdated: new Date(),
        isOnline: true,
        rpcProvider: this.getRpcProviderName(),
        
        // Compatibility aliases for existing code
        totalUsdValue: totalValueUsd, // Alias for totalValueUsd
        nativeUsdValue: nativeValueUsd, // Alias for nativeValueUsd (backward compatibility)
        erc20Tokens: tokens, // Alias for tokens
        enhancedTokens: tokens, // Additional alias for enhanced tokens
        
        // Additional missing properties from wallet components (optional defaults)
        icon: this.getChainIcon(),
        color: this.getChainColor(),
        chainType: 'mainnet'
      };

      // Cache for 30 seconds
      this.cache.set(cacheKey, result, 30);
      
      this.rateLimiter.recordRequest();
      return result;

    } catch (error) {
      console.error(`❌ Error fetching ${this.config.chainName} balance:`, error.message);
      return this.createErrorBalance(address, error.message);
    }
  }

  /**
   * Fetch token balances (public method)
   */
  async fetchTokenBalances(address: string): Promise<TokenBalance[]> {
    if (!this.validateAddress(address)) {
      throw new Error(`Invalid ${this.config.chainName} address format: ${address}`);
    }

    return this.fetchTokenBalancesImpl(address);
  }

  /**
   * Get native token price from CoinGecko
   */
  protected async getNativeTokenPrice(): Promise<number> {
    try {
      const tokenPrice = await priceFeedService.getTokenPrice(this.config.coingeckoId);
      return tokenPrice?.priceUsd || 0;
    } catch (error) {
      console.warn(`⚠️ Price fetch failed for ${this.config.symbol}:`, error.message);
      return 0;
    }
  }

  /**
   * Get token price from CoinGecko
   */
  protected async getTokenPrice(symbol: string): Promise<number> {
    try {
      const tokenPrice = await priceFeedService.getTokenPrice(symbol);
      return tokenPrice?.priceUsd || 0;
    } catch (error) {
      console.warn(`⚠️ Price fetch failed for ${symbol}:`, error.message);
      return 0;
    }
  }

  /**
   * Retry mechanism for network calls
   */
  protected async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const timeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`${this.config.chainName} request timeout`)), this.timeout)
        );
        
        return await Promise.race([operation(), timeout]);
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ ${this.config.chainName} attempt ${attempt}/${this.retryAttempts} failed:`, error.message);
        
        if (attempt < this.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Get RPC provider name for debugging
   */
  protected getRpcProviderName(): string {
    if (!this.config.rpcUrl) return 'Not configured';
    
    const url = this.config.rpcUrl;
    if (url.includes('alchemy.com')) return 'Alchemy';
    if (url.includes('quiknode.pro')) return 'QuickNode';
    if (url.includes('infura.io')) return 'Infura';
    if (url.includes('publicnode.com')) return 'PublicNode';
    if (url.includes('binance.org')) return 'Binance';
    return 'Custom';
  }

  /**
   * Create error balance for failed requests
   */
  protected createErrorBalance(address: string, error: string): ChainBalance {
    return {
      address,
      chainId: this.config.chainId,
      chainName: this.config.chainName,
      symbol: this.config.symbol,
      networkType: this.config.networkType,
      nativeBalance: '0',
      nativeValueUsd: 0,
      tokens: [],
      totalValueUsd: 0,
      lastUpdated: new Date(),
      isOnline: false,
      error,
      rpcProvider: 'Error',
      
      // Compatibility aliases for existing code
      totalUsdValue: 0, // Alias for totalValueUsd
      nativeUsdValue: 0, // Alias for nativeValueUsd (backward compatibility)
      erc20Tokens: [], // Alias for tokens
      enhancedTokens: [], // Additional alias for enhanced tokens
      
      // Additional missing properties from wallet components (error defaults)
      icon: this.getChainIcon(),
      color: this.getChainColor(),
      chainType: 'mainnet'
    };
  }

  /**
   * Format balance with appropriate decimals
   */
  protected formatBalance(balance: string | number, decimals = 6): string {
    const numBalance = typeof balance === 'string' ? parseFloat(balance) : balance;
    if (numBalance === 0) return '0';
    if (numBalance < 0.000001) return '<0.000001';
    return numBalance.toFixed(Math.min(decimals, 8));
  }

  /**
   * Get RPC URL from manager
   */
  protected getRpcUrl(): string | null {
    try {
      const provider = rpcManager.getOptimalProvider(
        this.getChainNameForRPC() as SupportedChain,
        this.config.networkType as NetworkType
      );
      return provider?.config.url || this.config.rpcUrl || null;
    } catch {
      return this.config.rpcUrl || null;
    }
  }

  /**
   * Map chain name to RPC manager supported chain
   */
  protected getChainNameForRPC(): string {
    const chainMapping: { [key: string]: string } = {
      'Ethereum': 'ethereum',
      'Sepolia': 'ethereum',
      'Holesky': 'ethereum',
      'Polygon': 'polygon',
      'Amoy': 'polygon',
      'Arbitrum': 'arbitrum',
      'Arbitrum Sepolia': 'arbitrum',
      'Optimism': 'optimism',
      'Optimism Sepolia': 'optimism',
      'Base': 'base',
      'Base Sepolia': 'base',
      'Avalanche': 'avalanche',
      'Avalanche Testnet': 'avalanche',
      'Solana': 'solana',
      'Solana Devnet': 'solana',
      'Bitcoin': 'bitcoin',
      'Bitcoin Testnet': 'bitcoin',
      'NEAR': 'near',
      'NEAR Testnet': 'near',
      'Aptos': 'aptos',
      'Aptos Testnet': 'aptos',
      'Sui': 'sui'
    };

    return chainMapping[this.config.chainName] || this.config.chainName.toLowerCase();
  }

  /**
   * Get chain icon URL or identifier
   */
  protected getChainIcon(): string {
    const iconMapping: Record<string, string> = {
      'Ethereum': 'ethereum',
      'Polygon': 'polygon',
      'Arbitrum': 'arbitrum',
      'Optimism': 'optimism',
      'Base': 'base',
      'Avalanche': 'avalanche',
      'BSC': 'binance-smart-chain',
      'Bitcoin': 'bitcoin',
      'Solana': 'solana',
      'NEAR': 'near',
      'Aptos': 'aptos',
      'Sui': 'sui'
    };

    return iconMapping[this.config.chainName] || 'default-chain';
  }

  /**
   * Get chain color
   */
  protected getChainColor(): string {
    const colorMapping: Record<string, string> = {
      'Ethereum': '#627eea',
      'Polygon': '#8247e5',
      'Arbitrum': '#28a0f0',
      'Optimism': '#ff0420',
      'Base': '#0052ff',
      'Avalanche': '#e84142',
      'BSC': '#f3ba2f',
      'Bitcoin': '#f7931a',
      'Solana': '#9945ff',
      'NEAR': '#00ec97',
      'Aptos': '#000000',
      'Sui': '#4da2ff'
    };

    return colorMapping[this.config.chainName] || '#666666';
  }
}
