/**
 * Master Balance Service Orchestrator
 * Integrates all 27 chain-specific balance services for comprehensive wallet balance fetching
 */

// Import types
import type { TokenBalance as ChainTokenBalance, ChainBalance, BaseBalanceService, BalanceServiceConfig } from './types';

// Import all EVM balance services (16 services)
import { ethereumBalanceService } from './evm/EthereumBalanceService';
import { sepoliaBalanceService } from './evm/SepoliaBalanceService';
import { holeskyBalanceService } from './evm/HoleskyBalanceService';
import { polygonBalanceService } from './evm/PolygonBalanceService';
import { amoyBalanceService } from './evm/AmoyBalanceService';
import { optimismBalanceService } from './evm/OptimismBalanceService';
import { optimismSepoliaBalanceService } from './evm/OptimismSepoliaBalanceService';
import { arbitrumBalanceService } from './evm/ArbitrumBalanceService';
import { arbitrumSepoliaBalanceService } from './evm/ArbitrumSepoliaBalanceService';
import { baseBalanceService } from './evm/BaseBalanceService';
import { baseSepoliaBalanceService } from './evm/BaseSepoliaBalanceService';
import { bscBalanceService } from './evm/BSCBalanceService';
import { zkSyncBalanceService } from './evm/ZkSyncBalanceService';
import { zkSyncSepoliaBalanceService } from './evm/ZkSyncSepoliaBalanceService';
import { avalancheBalanceService } from './evm/AvalancheBalanceService';
import { avalancheTestnetBalanceService } from './evm/AvalancheTestnetBalanceService';

// Import Bitcoin balance services (2 services)
import { bitcoinBalanceService } from './bitcoin/BitcoinBalanceService';
import { bitcoinTestnetBalanceService } from './bitcoin/BitcoinTestnetBalanceService';

// Import Solana balance services (2 services)
import { solanaBalanceService } from './solana/SolanaBalanceService';
import { solanaDevnetBalanceService } from './solana/SolanaDevnetBalanceService';

// Import Aptos balance services (2 services)
import { aptosBalanceService } from './aptos/AptosBalanceService';
import { aptosTestnetBalanceService } from './aptos/AptosTestnetBalanceService';

// Import Sui balance services (2 services)
import { suiBalanceService } from './sui/SuiBalanceService';
import { suiTestnetBalanceService } from './sui/SuiTestnetBalanceService';

// Import Near balance services (2 services)
import { nearBalanceService } from './near/NearBalanceService';
import { nearTestnetBalanceService } from './near/NearTestnetBalanceService';

// Import Injective balance services (2 services)
import { injectiveBalanceService } from './injective/InjectiveBalanceService';
import { injectiveTestnetBalanceService } from './injective/InjectiveTestnetBalanceService';

// Legacy interface for backward compatibility
export interface TokenBalance {
  symbol: string;
  balance: string;
  valueUsd: number;
  decimals: number;
  contractAddress?: string;
  standard?: string;
}

export interface WalletBalance {
  address: string;
  network: string;
  nativeBalance: string;
  nativeValueUsd: number;
  tokens: TokenBalance[];
  totalValueUsd: number;
  lastUpdated: Date;
  isOnline?: boolean;
  error?: string;
}

// Export new types for future use
export type { ChainTokenBalance, ChainBalance, BaseBalanceService };

/**
 * Master Balance Service - Routes requests to appropriate chain services
 */
export class BalanceService {
  private static instance: BalanceService;
  private readonly retryAttempts = 3;
  private readonly retryDelay = 1000;

  // Service registry mapping network names to balance services
  private readonly services: Record<string, BaseBalanceService> = {
    // Ethereum networks
    'ethereum': ethereumBalanceService,
    'sepolia': sepoliaBalanceService,
    'holesky': holeskyBalanceService,
    'eth-mainnet': ethereumBalanceService,
    'eth-testnet': sepoliaBalanceService,
    
    // Polygon networks  
    'polygon': polygonBalanceService,
    'amoy': amoyBalanceService,
    'matic': polygonBalanceService,
    'polygon-mainnet': polygonBalanceService,
    'polygon-testnet': amoyBalanceService,
    
    // Optimism networks
    'optimism': optimismBalanceService,
    'optimism-sepolia': optimismSepoliaBalanceService,
    'opt-mainnet': optimismBalanceService,
    'opt-testnet': optimismSepoliaBalanceService,
    
    // Arbitrum networks
    'arbitrum': arbitrumBalanceService,
    'arbitrum-sepolia': arbitrumSepoliaBalanceService,
    'arb-mainnet': arbitrumBalanceService,
    'arb-testnet': arbitrumSepoliaBalanceService,
    
    // Base networks
    'base': baseBalanceService,
    'base-sepolia': baseSepoliaBalanceService,
    'base-mainnet': baseBalanceService,
    'base-testnet': baseSepoliaBalanceService,
    
    // BSC network
    'bsc': bscBalanceService,
    'binance': bscBalanceService,
    'bnb': bscBalanceService,
    
    // zkSync networks
    'zksync': zkSyncBalanceService,
    'zksync-sepolia': zkSyncSepoliaBalanceService,
    'zksync-mainnet': zkSyncBalanceService,
    'zksync-testnet': zkSyncSepoliaBalanceService,
    
    // Avalanche networks
    'avalanche': avalancheBalanceService,
    'avalanche-testnet': avalancheTestnetBalanceService,
    'avax': avalancheBalanceService,
    'fuji': avalancheTestnetBalanceService,
    
    // Bitcoin networks
    'bitcoin': bitcoinBalanceService,
    'bitcoin-testnet': bitcoinTestnetBalanceService,
    'btc': bitcoinBalanceService,
    'btc-testnet': bitcoinTestnetBalanceService,
    
    // Solana networks
    'solana': solanaBalanceService,
    'solana-devnet': solanaDevnetBalanceService,
    'sol': solanaBalanceService,
    'sol-devnet': solanaDevnetBalanceService,
    
    // Aptos networks
    'aptos': aptosBalanceService,
    'aptos-testnet': aptosTestnetBalanceService,
    'apt': aptosBalanceService,
    'apt-testnet': aptosTestnetBalanceService,
    
    // Sui networks
    'sui': suiBalanceService,
    'sui-testnet': suiTestnetBalanceService,
    
    // Near networks
    'near': nearBalanceService,
    'near-testnet': nearTestnetBalanceService,
    
    // Injective networks
    'injective': injectiveBalanceService,
    'injective-testnet': injectiveTestnetBalanceService,
    'inj': injectiveBalanceService,
    'inj-testnet': injectiveTestnetBalanceService,
  };

  constructor() {}

  public static getInstance(): BalanceService {
    if (!BalanceService.instance) {
      BalanceService.instance = new BalanceService();
    }
    return BalanceService.instance;
  }

  /**
   * Debug configuration - displays RPC configurations for troubleshooting
   */
  public static debugConfiguration(): void {
    const instance = BalanceService.getInstance();
    console.group('🔧 BalanceService Configuration Debug');
    console.log(`📊 Total Networks Supported: ${Object.keys(instance.services).length}`);
    console.log('🌐 Network Configurations:');
    
    Object.entries(instance.services).forEach(([network, service]) => {
      const config = service.getChainConfig();
      console.log(`  ${network}: ${config.chainName} (Chain ID: ${config.chainId}) - ${config.networkType}`);
    });
    console.groupEnd();
  }

  /**
   * Fetch multi-chain balance for an address across all supported networks
   */
  public static async fetchMultiChainBalance(address: string): Promise<{
    address: string;
    totalUsdValue: number;
    chains: ChainBalance[];
    lastUpdated: Date;
  }> {
    const instance = BalanceService.getInstance();
    const chains: ChainBalance[] = [];
    let totalUsdValue = 0;

    // Get a representative set of main networks to check
    const primaryNetworks = [
      'ethereum', 'polygon', 'optimism', 'arbitrum', 'base', 'bsc', 
      'avalanche', 'bitcoin', 'solana', 'aptos', 'sui', 'near'
    ];

    const balancePromises = primaryNetworks.map(async (network) => {
      try {
        const service = instance.services[network];
        if (service) {
          const balance = await service.fetchBalance(address);
          if (balance.totalValueUsd > 0 || balance.nativeBalance !== '0') {
            return balance;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch balance for ${address} on ${network}:`, error);
        return null;
      }
      return null;
    });

    const results = await Promise.all(balancePromises);
    
    results.forEach((balance) => {
      if (balance) {
        chains.push(balance);
        totalUsdValue += balance.totalValueUsd;
      }
    });

    return {
      address,
      totalUsdValue,
      chains,
      lastUpdated: new Date()
    };
  }

  /**
   * Format USD value with proper currency formatting
   */
  public static formatUsdValue(value: number): string {
    if (value < 0.01) return '$0.00';
    if (value < 1) return `$${value.toFixed(3)}`;
    if (value < 1000) return `$${value.toFixed(2)}`;
    if (value < 1000000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${(value / 1000000).toFixed(2)}M`;
  }

  /**
   * Format token balance with appropriate decimal places
   */
  public static formatBalance(balance: string, decimals: number = 18, maxDecimals: number = 4): string {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.0001) return '<0.0001';
    if (num < 1) return num.toFixed(Math.min(maxDecimals, 6));
    if (num < 1000) return num.toFixed(Math.min(maxDecimals, 2));
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
    return `${(num / 1000000).toFixed(2)}M`;
  }

  /**
   * Get supported chains configuration
   */
  public static getSupportedChains(): Array<BalanceServiceConfig> {
    const instance = BalanceService.getInstance();
    return Object.values(instance.services).map(service => service.getChainConfig());
  }

  /**
   * Fetch wallet balance for a specific network using appropriate chain service
   */
  async fetchWalletBalance(address: string, network: string): Promise<WalletBalance> {
    const normalizedNetwork = network.toLowerCase().trim();
    const service = this.services[normalizedNetwork];

    if (!service) {
      const supportedNetworks = Object.keys(this.services).join(', ');
      throw new Error(`Unsupported network: ${network}. Supported networks: ${supportedNetworks}`);
    }

    try {
      console.log(`🔍 Fetching balance for ${address} on ${network} via ${service.getChainConfig().chainName}`);
      
      const chainBalance = await service.fetchBalance(address);
      
      // Convert ChainBalance to legacy WalletBalance interface
      return this.convertToLegacyFormat(chainBalance, network);
      
    } catch (error) {
      console.error(`❌ Error fetching balance for ${address} on ${network}:`, error);
      
      // Return empty balance with error info
      return {
        address,
        network,
        nativeBalance: '0',
        nativeValueUsd: 0,
        tokens: [],
        totalValueUsd: 0,
        lastUpdated: new Date(),
        isOnline: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch balances for multiple wallets using appropriate chain services
   */
  async fetchMultipleWalletBalances(wallets: Array<{ address: string; network: string }>): Promise<WalletBalance[]> {
    console.log(`🔄 Fetching balances for ${wallets.length} wallets across multiple chains`);
    
    const balancePromises = wallets.map(async (wallet) => {
      try {
        return await this.fetchWalletBalance(wallet.address, wallet.network);
      } catch (error) {
        console.error(`❌ Failed to fetch balance for wallet ${wallet.address} on ${wallet.network}:`, error);
        return {
          address: wallet.address,
          network: wallet.network,
          nativeBalance: '0',
          nativeValueUsd: 0,
          tokens: [],
          totalValueUsd: 0,
          lastUpdated: new Date(),
          isOnline: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    try {
      const results = await Promise.all(balancePromises);
      const totalValue = results.reduce((sum, balance) => sum + balance.totalValueUsd, 0);
      console.log(`✅ Successfully fetched ${results.length} wallet balances. Total portfolio value: $${totalValue.toFixed(2)}`);
      return results;
    } catch (error) {
      console.error('❌ Error in batch balance fetching:', error);
      throw error;
    }
  }

  /**
   * Get supported networks list
   */
  getSupportedNetworks(): string[] {
    return Object.keys(this.services).sort();
  }

  /**
   * Check if a network is supported
   */
  isNetworkSupported(network: string): boolean {
    return this.services.hasOwnProperty(network.toLowerCase().trim());
  }

  /**
   * Get chain service for a network (for direct access)
   */
  getChainService(network: string): BaseBalanceService | undefined {
    return this.services[network.toLowerCase().trim()];
  }

  /**
   * Get chain configuration for a network
   */
  getChainConfig(network: string) {
    const service = this.getChainService(network);
    return service?.getChainConfig();
  }

  /**
   * Validate address for a specific network
   */
  validateAddress(address: string, network: string): boolean {
    const service = this.getChainService(network);
    return service?.validateAddress(address) || false;
  }

  /**
   * Convert ChainBalance to legacy WalletBalance format for backward compatibility
   */
  private convertToLegacyFormat(chainBalance: ChainBalance, network: string): WalletBalance {
    return {
      address: chainBalance.address,
      network: network,
      nativeBalance: chainBalance.nativeBalance,
      nativeValueUsd: chainBalance.nativeValueUsd,
      tokens: chainBalance.tokens.map(token => ({
        symbol: token.symbol,
        balance: token.balance,
        valueUsd: token.valueUsd,
        decimals: token.decimals,
        contractAddress: token.contractAddress,
        standard: token.standard,
      })),
      totalValueUsd: chainBalance.totalValueUsd,
      lastUpdated: chainBalance.lastUpdated,
      isOnline: chainBalance.isOnline,
      error: chainBalance.error,
    };
  }

  /**
   * Update a single wallet's balance in localStorage (legacy method)
   */
  async updateWalletBalance(walletId: string, address: string, network: string): Promise<void> {
    try {
      const balance = await this.fetchWalletBalance(address, network);
      
      const storedWallets = localStorage.getItem('userWallets');
      if (!storedWallets) return;
      
      const wallets = JSON.parse(storedWallets);
      const walletIndex = wallets.findIndex((w: any) => w.id === walletId);
      
      if (walletIndex !== -1) {
        wallets[walletIndex].balance = balance.totalValueUsd.toFixed(2);
        wallets[walletIndex].lastUpdated = new Date().toISOString();
        localStorage.setItem('userWallets', JSON.stringify(wallets));
        console.log(`💰 Updated balance for wallet ${walletId}: $${balance.totalValueUsd.toFixed(2)}`);
      }
    } catch (error) {
      console.error(`❌ Error updating wallet ${walletId} balance:`, error);
    }
  }

  /**
   * Update all wallets' balances (legacy method)
   */
  async updateAllWalletBalances(): Promise<void> {
    try {
      const storedWallets = localStorage.getItem('userWallets');
      if (!storedWallets) return;
      
      const wallets = JSON.parse(storedWallets);
      console.log(`🔄 Updating balances for ${wallets.length} stored wallets`);
      
      for (const wallet of wallets) {
        await this.updateWalletBalance(wallet.id, wallet.address, wallet.network);
        await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
      }
      
      console.log('✅ Updated all wallet balances');
    } catch (error) {
      console.error('❌ Error updating all wallet balances:', error);
    }
  }
}

export const balanceService = BalanceService.getInstance();
