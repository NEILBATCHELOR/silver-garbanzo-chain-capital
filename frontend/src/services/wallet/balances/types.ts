/**
 * Common types for per-chain balance services
 * Provides standardized interfaces for all blockchain networks
 */

export interface TokenBalance {
  symbol: string;
  balance: string;
  balanceRaw?: string;
  valueUsd: number;
  decimals: number;
  contractAddress?: string;
  standard?: 'ERC-20' | 'BEP-20' | 'SPL' | 'native' | 'other' | 'Aptos Coin' | 'IBC' | 'NEP-141' | 'Sui Coin';
  logoUrl?: string;
  priceChange24h?: number;
}

export interface ChainBalance {
  address: string;
  chainId: number;
  chainName: string;
  symbol: string;
  networkType: 'mainnet' | 'testnet' | 'devnet';
  nativeBalance: string;
  nativeBalanceRaw?: string;
  nativeValueUsd: number;
  tokens: TokenBalance[];
  totalValueUsd: number;
  lastUpdated: Date;
  isOnline: boolean;
  error?: string;
  rpcProvider?: string;
  
  // Compatibility aliases for existing code
  totalUsdValue: number; // Alias for totalValueUsd
  nativeUsdValue: number; // Alias for nativeValueUsd (backward compatibility)
  erc20Tokens: TokenBalance[]; // Alias for tokens
  enhancedTokens: TokenBalance[]; // Additional alias for enhanced tokens
  
  // Additional missing properties from wallet components
  icon?: string;
  color?: string;
  chainType?: string;
}

export interface BalanceServiceConfig {
  chainId: number;
  chainName: string;
  name: string; // Alias for chainName for backward compatibility
  symbol: string;
  decimals: number;
  networkType: 'mainnet' | 'testnet' | 'devnet';
  rpcUrl?: string;
  wsUrl?: string;
  explorerUrl: string;
  coingeckoId: string;
  timeout?: number;
  retryAttempts?: number;
  isEVM: boolean; // Required for TransactionHistoryService routing
}

export interface BaseBalanceService {
  getChainConfig(): BalanceServiceConfig;
  fetchBalance(address: string): Promise<ChainBalance>;
  fetchTokenBalances(address: string): Promise<TokenBalance[]>;
  validateAddress(address: string): boolean;
  isConfigured(): boolean;
}

export interface RateLimiter {
  canMakeRequest(): Promise<boolean>;
  recordRequest(): void;
}

export interface BalanceCache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlSeconds?: number): void;
  clear(): void;
}

export class SimpleRateLimiter implements RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 3, windowMs = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async canMakeRequest(): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime + 100));
      }
      return this.canMakeRequest();
    }
    
    return true;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }
}

export class SimpleCache implements BalanceCache {
  private cache = new Map<string, { value: any; expiry: number }>();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds = 30): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global instances
export const globalRateLimiter = new SimpleRateLimiter(2, 1000); // 2 requests per second
export const globalCache = new SimpleCache();
