/**
 * Master Balance Service Orchestrator
 * Integrates all chain-specific balance services for comprehensive wallet balance fetching
 * Includes both mainnet and testnet support for all chains
 */

// Import types
import type { TokenBalance as ChainTokenBalance, ChainBalance, BaseBalanceService, BalanceServiceConfig } from './types';

// Import address validation utilities
import { detectAddressFormat, getChainCategory, isAddressCompatibleWithChain } from './utils/AddressValidator';

// Import all EVM balance services (Mainnet and Testnet)
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

// Import Solana balance services (3 services)
import { solanaBalanceService } from './solana/SolanaBalanceService';
import { solanaDevnetBalanceService } from './solana/SolanaDevnetBalanceService';

// Import other chain services
import { aptosBalanceService } from './aptos/AptosBalanceService';
import { aptosTestnetBalanceService } from './aptos/AptosTestnetBalanceService';
import { suiBalanceService } from './sui/SuiBalanceService';
import { suiTestnetBalanceService } from './sui/SuiTestnetBalanceService';
import { nearBalanceService } from './near/NearBalanceService';
import { nearTestnetBalanceService } from './near/NearTestnetBalanceService';
import { injectiveBalanceService } from './injective/InjectiveBalanceService';
import { injectiveTestnetBalanceService } from './injective/InjectiveTestnetBalanceService';
import { rippleMainnetBalanceService, rippleTestnetBalanceService } from './ripple/RippleBalanceService';

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
  isTestnet?: boolean;
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
    'eth-sepolia': sepoliaBalanceService,
    'eth-holesky': holeskyBalanceService,
    
    // Polygon networks  
    'polygon': polygonBalanceService,
    'amoy': amoyBalanceService,
    'matic': polygonBalanceService,
    'polygon-mainnet': polygonBalanceService,
    'polygon-testnet': amoyBalanceService,
    'polygon-amoy': amoyBalanceService,
    
    // Optimism networks
    'optimism': optimismBalanceService,
    'optimism-sepolia': optimismSepoliaBalanceService,
    'opt-mainnet': optimismBalanceService,
    'opt-sepolia': optimismSepoliaBalanceService,
    
    // Arbitrum networks
    'arbitrum': arbitrumBalanceService,
    'arbitrum-sepolia': arbitrumSepoliaBalanceService,
    'arb-mainnet': arbitrumBalanceService,
    'arb-sepolia': arbitrumSepoliaBalanceService,
    
    // Base networks
    'base': baseBalanceService,
    'base-sepolia': baseSepoliaBalanceService,
    'base-mainnet': baseBalanceService,
    
    // BSC network
    'bsc': bscBalanceService,
    'binance': bscBalanceService,
    'bnb': bscBalanceService,
    // 'bsc-testnet': bscTestnetBalanceService,
    // 'bnb-testnet': bscTestnetBalanceService,
    
    // zkSync networks
    'zksync': zkSyncBalanceService,
    'zksync-sepolia': zkSyncSepoliaBalanceService,
    'zksync-mainnet': zkSyncBalanceService,
    
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
    // 'solana-testnet': solanaTestnetBalanceService,
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
    
    // Ripple networks
    'ripple': rippleMainnetBalanceService,
    'ripple-testnet': rippleTestnetBalanceService,
    'xrp': rippleMainnetBalanceService,
    'xrp-testnet': rippleTestnetBalanceService,
    'xrpl': rippleMainnetBalanceService,
    'xrpl-testnet': rippleTestnetBalanceService,
    
    // Additional EVM chains (to be implemented)
    // 'fantom': fantomBalanceService,
    // 'fantom-testnet': fantomTestnetBalanceService,
    // 'ftm': fantomBalanceService,
    // 'ftm-testnet': fantomTestnetBalanceService,
    // 'cronos': cronosBalanceService,
    // 'cronos-testnet': cronosTestnetBalanceService,
    // 'cro': cronosBalanceService,
    // 'cro-testnet': cronosTestnetBalanceService,
    // 'sei': seiBalanceService,
    // 'sei-testnet': seiTestnetBalanceService,
    // 'ronin': roninBalanceService,
    // 'ronin-testnet': roninTestnetBalanceService,
    // 'ron': roninBalanceService,
    // 'ron-testnet': roninTestnetBalanceService,
    // 'core': coreBalanceService,
    // 'core-testnet': coreTestnetBalanceService,
  };

  // Define testnet networks for easy identification
  private readonly testnetNetworks = new Set([
    'sepolia', 'holesky', 'amoy', 'optimism-sepolia', 'arbitrum-sepolia',
    'base-sepolia', 'bsc-testnet', 'zksync-sepolia', 'avalanche-testnet',
    'fuji', 'bitcoin-testnet', 'solana-devnet', 'solana-testnet',
    'aptos-testnet', 'sui-testnet', 'near-testnet', 'injective-testnet',
    'ripple-testnet', 'fantom-testnet', 'cronos-testnet', 'sei-testnet',
    'ronin-testnet', 'core-testnet', 'eth-sepolia', 'eth-holesky',
    'polygon-testnet', 'polygon-amoy', 'opt-sepolia', 'arb-sepolia',
    'bnb-testnet', 'ftm-testnet', 'cro-testnet', 'ron-testnet',
    'btc-testnet', 'sol-devnet', 'apt-testnet', 'inj-testnet',
    'xrp-testnet', 'xrpl-testnet'
  ]);

  // Mainnet to testnet mapping
  private readonly mainnetToTestnet: Record<string, string[]> = {
    'ethereum': ['sepolia', 'holesky'],
    'polygon': ['amoy'],
    'optimism': ['optimism-sepolia'],
    'arbitrum': ['arbitrum-sepolia'],
    'base': ['base-sepolia'],
    'bsc': ['bsc-testnet'],
    'avalanche': ['fuji'],
    'bitcoin': ['bitcoin-testnet'],
    'solana': ['solana-devnet', 'solana-testnet'],
    'aptos': ['aptos-testnet'],
    'sui': ['sui-testnet'],
    'near': ['near-testnet'],
    'injective': ['injective-testnet'],
    'ripple': ['ripple-testnet'],
    'zksync': ['zksync-sepolia'],
    'fantom': ['fantom-testnet'],
    'cronos': ['cronos-testnet'],
    'sei': ['sei-testnet'],
    'ronin': ['ronin-testnet'],
    'core': ['core-testnet']
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
    console.log(`🧪 Testnet Networks: ${instance.testnetNetworks.size}`);
    console.log('🌐 Network Configurations:');
    
    Object.entries(instance.services).forEach(([network, service]) => {
      const config = service.getChainConfig();
      const isTestnet = instance.testnetNetworks.has(network);
      console.log(`  ${network}: ${config.chainName} (Chain ID: ${config.chainId}) - ${config.networkType} ${isTestnet ? '🧪' : '💎'}`);
    });
    console.groupEnd();
  }

  /**
   * Fetch balances including both mainnet and testnets for a given address
   * This is the main method to get ALL balances including testnets
   */
  public async fetchAllBalancesIncludingTestnets(address: string): Promise<WalletBalance[]> {
    const allBalances: WalletBalance[] = [];
    
    console.log(`🔍 Scanning ALL networks (mainnet + testnet) for ${address.slice(0, 10)}...`);
    
    // Detect address format to filter compatible services
    const addressInfo = detectAddressFormat(address);
    
    if (!addressInfo.isValid) {
      console.warn(`⚠️ Invalid or unrecognized address format: ${address}`);
      return allBalances;
    }
    
    console.log(`✓ Detected ${addressInfo.category.toUpperCase()} address format`);
    
    // Get all unique services (both mainnet and testnet)
    const uniqueServices = new Map<string, BaseBalanceService>();
    Object.entries(this.services).forEach(([network, service]) => {
      const config = service.getChainConfig();
      const key = `${config.chainId}_${config.chainName}`;
      
      // Only add service if it's compatible with the address format
      if (!uniqueServices.has(key) && isAddressCompatibleWithChain(address, config.chainName)) {
        uniqueServices.set(key, service);
      }
    });

    console.log(`📋 Checking ${uniqueServices.size} compatible chains for ${addressInfo.category} address`);

    // Process in batches to avoid overwhelming the system
    const serviceArray = Array.from(uniqueServices.values());
    const batchSize = 5; // Process 5 chains at a time
    
    for (let i = 0; i < serviceArray.length; i += batchSize) {
      const batch = serviceArray.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (service) => {
        try {
          const config = service.getChainConfig();
          const isTestnet = config.networkType === 'testnet' || 
                           this.testnetNetworks.has(config.chainName.toLowerCase());
          
          const balance = await service.fetchBalance(address);
          
          // Convert to WalletBalance format
          const walletBalance: WalletBalance = {
            address,
            network: config.chainName,
            nativeBalance: balance.nativeBalance,
            nativeValueUsd: isTestnet ? 0 : balance.nativeValueUsd, // Testnet tokens have no real value
            tokens: balance.tokens.map(token => ({
              ...token,
              valueUsd: isTestnet ? 0 : token.valueUsd // Testnet tokens have no real value
            })),
            totalValueUsd: isTestnet ? 0 : balance.totalValueUsd,
            lastUpdated: balance.lastUpdated,
            isOnline: balance.isOnline,
            error: balance.error,
            isTestnet
          };
          
          // Only include if there's a balance or it's a major network
          if (parseFloat(balance.nativeBalance) > 0 || balance.tokens.length > 0) {
            console.log(`✅ ${config.chainName}: Found balance`);
            return walletBalance;
          }
          
          return null;
        } catch (error) {
          console.warn(`⚠️ Failed to fetch from ${service.getChainConfig().chainName}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(batchPromises);
      results.forEach(result => {
        if (result) {
          allBalances.push(result);
        }
      });
    }
    
    console.log(`📊 Found balances on ${allBalances.length} networks`);
    return allBalances;
  }

  /**
   * Fetch multi-chain balance for an address across all supported networks
   * Including testnets
   */
  public static async fetchMultiChainBalanceWithTestnets(address: string): Promise<{
    address: string;
    totalUsdValue: number;
    mainnets: ChainBalance[];
    testnets: ChainBalance[];
    lastUpdated: Date;
  }> {
    const instance = BalanceService.getInstance();
    const mainnets: ChainBalance[] = [];
    const testnets: ChainBalance[] = [];
    let totalUsdValue = 0;

    // Get all networks to check (mainnet + testnet)
    const allNetworks = Object.keys(instance.services);

    const balancePromises = allNetworks.map(async (network) => {
      try {
        const service = instance.services[network];
        if (service) {
          const balance = await service.fetchBalance(address);
          const isTestnet = instance.testnetNetworks.has(network);
          
          if (balance.totalValueUsd > 0 || balance.nativeBalance !== '0') {
            return { balance, isTestnet };
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch balance for ${address} on ${network}:`, error);
        return null;
      }
      return null;
    });

    const results = await Promise.all(balancePromises);
    
    results.forEach((result) => {
      if (result) {
        if (result.isTestnet) {
          testnets.push(result.balance);
        } else {
          mainnets.push(result.balance);
          totalUsdValue += result.balance.totalValueUsd;
        }
      }
    });

    return {
      address,
      totalUsdValue,
      mainnets,
      testnets,
      lastUpdated: new Date()
    };
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

    // Get primary networks plus testnets  
    const primaryNetworks = [
      'ethereum', 'sepolia', 'holesky', // Ethereum + testnets
      'polygon', 'amoy', // Polygon + testnet
      'optimism', 'optimism-sepolia', // Optimism + testnet
      'arbitrum', 'arbitrum-sepolia', // Arbitrum + testnet
      'base', 'base-sepolia', // Base + testnet
      'bsc', 'bsc-testnet', // BSC + testnet
      'avalanche', 'fuji', // Avalanche + testnet
      'bitcoin', 'bitcoin-testnet', // Bitcoin + testnet
      'solana', 'solana-devnet', // Solana + devnet
      'aptos', 'aptos-testnet', // Aptos + testnet
      'sui', 'sui-testnet', // Sui + testnet
      'near', 'near-testnet', // Near + testnet
      'injective', 'injective-testnet', // Injective + testnet
      'zksync', 'zksync-sepolia' // zkSync + testnet
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
   * Get testnet networks for a mainnet
   */
  public getTestnetsForMainnet(mainnet: string): string[] {
    const normalizedMainnet = mainnet.toLowerCase().trim();
    return this.mainnetToTestnet[normalizedMainnet] || [];
  }

  /**
   * Check if a network is a testnet
   */
  public isTestnet(network: string): boolean {
    return this.testnetNetworks.has(network.toLowerCase().trim());
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
        isTestnet: this.isTestnet(network)
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
          isTestnet: this.isTestnet(wallet.network)
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
      isTestnet: this.isTestnet(network)
    };
  }

  /**
   * Map wallet type to service keys (including mainnet and testnet variants)
   */
  private getServiceKeysForWalletType(walletType: string): string[] {
    const normalized = walletType.toLowerCase();
    
    const mapping: Record<string, string[]> = {
      'ethereum': ['ethereum', 'sepolia', 'holesky'],
      'polygon': ['polygon', 'amoy'],
      'optimism': ['optimism', 'optimism-sepolia'],
      'arbitrum': ['arbitrum', 'arbitrum-sepolia'],
      'base': ['base', 'base-sepolia'],
      'bsc': ['bsc'],
      'binance': ['bsc'],
      'bnb': ['bsc'],
      'zksync': ['zksync', 'zksync-sepolia'],
      'avalanche': ['avalanche', 'avalanche-testnet', 'fuji'],
      'avax': ['avalanche', 'avalanche-testnet', 'fuji'],
      'bitcoin': ['bitcoin', 'bitcoin-testnet'],
      'btc': ['bitcoin', 'bitcoin-testnet'],
      'solana': ['solana', 'solana-devnet'],
      'sol': ['solana', 'solana-devnet'],
      'aptos': ['aptos', 'aptos-testnet'],
      'apt': ['aptos', 'aptos-testnet'],
      'sui': ['sui', 'sui-testnet'],
      'near': ['near', 'near-testnet'],
      'injective': ['injective', 'injective-testnet'],
      'inj': ['injective', 'injective-testnet'],
      'ripple': ['ripple', 'ripple-testnet'],
      'xrp': ['ripple', 'ripple-testnet'],
      'xrpl': ['ripple', 'ripple-testnet'],
    };
    
    return mapping[normalized] || [normalized];
  }

  /**
   * Fetch balances only for chains that exist in the project
   * @param address Wallet address
   * @param projectWalletTypes Array of wallet_type values from project_wallets table
   */
  public async fetchBalancesForProject(
    address: string, 
    projectWalletTypes: string[]
  ): Promise<WalletBalance[]> {
    const allBalances: WalletBalance[] = [];
    
    console.log(`🔍 Scanning project networks for ${address.slice(0, 10)}...`);
    console.log(`📋 Input wallet types:`, projectWalletTypes);
    
    // Normalize and trim the address
    const normalizedAddress = address.trim();
    
    // Detect address format for compatibility check
    const addressInfo = detectAddressFormat(normalizedAddress);
    
    if (!addressInfo.isValid) {
      console.warn(`⚠️ Invalid or unrecognized address format: ${normalizedAddress}`);
      return allBalances;
    }
    
    console.log(`✓ Detected ${addressInfo.category.toUpperCase()} address format`);
    console.log(`✓ Address compatible with chains:`, addressInfo.compatibleChains);
    
    // Get all service keys from project wallet types
    const projectServiceKeys = new Set<string>();
    projectWalletTypes.forEach(walletType => {
      const serviceKeys = this.getServiceKeysForWalletType(walletType);
      serviceKeys.forEach(key => projectServiceKeys.add(key));
    });
    
    console.log(`📋 Project wallet types: ${projectWalletTypes.join(', ')}`);
    console.log(`🔗 Checking ${projectServiceKeys.size} service keys: ${Array.from(projectServiceKeys).join(', ')}`);
    
    // DEBUG: Show what services are actually registered
    console.log(`🗂️ Available services in registry:`, Object.keys(this.services));
    
    // Get services that match both: (1) exist in project, (2) compatible with address
    const relevantServices = new Map<string, BaseBalanceService>();
    projectServiceKeys.forEach(key => {
      const service = this.services[key];
      console.log(`🔑 Checking service key: ${key}, exists: ${!!service}`);
      
      if (service) {
        const config = service.getChainConfig();
        const serviceKey = `${config.chainId}_${config.chainName}`;
        
        console.log(`📊 Service config for ${key}:`, { 
          chainId: config.chainId, 
          chainName: config.chainName,
          name: config.name 
        });
        
        // Check address compatibility
        const isCompatible = isAddressCompatibleWithChain(normalizedAddress, config.chainName);
        console.log(`🔍 Address compatibility check: ${normalizedAddress.slice(0, 15)}... vs ${config.chainName} = ${isCompatible}`);
        
        // Only add if compatible with address format
        if (isCompatible) {
          relevantServices.set(serviceKey, service);
          console.log(`✅ Added ${key} to relevant services`);
        } else {
          console.log(`❌ Skipped ${key} - not compatible`);
        }
      } else {
        console.log(`❌ Service not found in registry for key: ${key}`);
      }
    });

    if (relevantServices.size === 0) {
      console.warn(`⚠️ No compatible services found for this project and address`);
      return allBalances;
    }

    console.log(`🎯 Querying ${relevantServices.size} compatible chains`);

    // Process in batches
    const serviceArray = Array.from(relevantServices.values());
    const batchSize = 5;
    
    for (let i = 0; i < serviceArray.length; i += batchSize) {
      const batch = serviceArray.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (service) => {
        try {
          const config = service.getChainConfig();
          const isTestnet = config.networkType === 'testnet' || 
                           this.testnetNetworks.has(config.chainName.toLowerCase());
          
          const balance = await service.fetchBalance(normalizedAddress);
          
          const walletBalance: WalletBalance = {
            address: normalizedAddress,
            network: config.chainName,
            nativeBalance: balance.nativeBalance,
            nativeValueUsd: isTestnet ? 0 : balance.nativeValueUsd,
            tokens: balance.tokens.map(token => ({
              ...token,
              valueUsd: isTestnet ? 0 : token.valueUsd
            })),
            totalValueUsd: isTestnet ? 0 : balance.totalValueUsd,
            lastUpdated: balance.lastUpdated,
            isOnline: balance.isOnline,
            error: balance.error,
            isTestnet
          };
          
          if (parseFloat(balance.nativeBalance) > 0 || balance.tokens.length > 0) {
            console.log(`✅ ${config.chainName}: ${balance.nativeBalance} ${config.symbol}`);
            return walletBalance;
          }
          
          return null;
        } catch (error) {
          console.warn(`⚠️ Failed to fetch from ${service.getChainConfig().chainName}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(batchPromises);
      results.forEach(result => {
        if (result) {
          allBalances.push(result);
        }
      });
    }
    
    console.log(`📊 Found balances on ${allBalances.length} networks`);
    return allBalances;
  }

  /**
   * NEW METHOD: Fetch balances for wallets with their specific chain types
   * This avoids trying to match one address against incompatible chains
   * 
   * @param wallets Array of {address, walletType} objects
   * @returns Array of WalletBalance objects
   */
  public async fetchBalancesForWallets(
    wallets: Array<{ address: string; walletType: string }>
  ): Promise<WalletBalance[]> {
    const allBalances: WalletBalance[] = [];
    
    console.log(`🔍 Fetching balances for ${wallets.length} specific wallet(s)`);
    
    // Process each wallet with its specific chain
    for (const { address, walletType } of wallets) {
      try {
        const normalizedAddress = address.trim();
        
        // Get service keys for this specific wallet type
        const serviceKeys = this.getServiceKeysForWalletType(walletType);
        console.log(`📋 Wallet ${normalizedAddress.slice(0, 10)}... (${walletType}) → services:`, serviceKeys);
        
        // Query each service (mainnet + testnet variants)
        for (const serviceKey of serviceKeys) {
          const service = this.services[serviceKey];
          
          if (!service) {
            console.warn(`⚠️ Service not found: ${serviceKey}`);
            continue;
          }
          
          try {
            const config = service.getChainConfig();
            const isTestnet = config.networkType === 'testnet' || 
                             this.testnetNetworks.has(config.chainName.toLowerCase());
            
            const balance = await service.fetchBalance(normalizedAddress);
            
            // Always include balance, even if zero (user wants to see their wallets)
            const walletBalance: WalletBalance = {
              address: normalizedAddress,
              network: config.chainName,
              nativeBalance: balance.nativeBalance,
              nativeValueUsd: isTestnet ? 0 : balance.nativeValueUsd,
              tokens: balance.tokens.map(token => ({
                ...token,
                valueUsd: isTestnet ? 0 : token.valueUsd
              })),
              totalValueUsd: isTestnet ? 0 : balance.totalValueUsd,
              lastUpdated: balance.lastUpdated,
              isOnline: balance.isOnline,
              error: balance.error,
              isTestnet
            };
            
            const balanceAmount = parseFloat(balance.nativeBalance);
            if (balanceAmount > 0 || balance.tokens.length > 0) {
              console.log(`✅ ${config.chainName}: ${balance.nativeBalance} ${config.symbol}`);
            } else {
              console.log(`💰 ${config.chainName}: 0 ${config.symbol} (zero balance)`);
            }
            allBalances.push(walletBalance);
          } catch (error) {
            console.warn(`⚠️ Failed to fetch balance for ${normalizedAddress} on ${serviceKey}:`, error);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing wallet ${address}:`, error);
      }
    }
    
    console.log(`✅ Fetched ${allBalances.length} balance(s) across all wallets`);
    return allBalances;
  }
}

export const balanceService = BalanceService.getInstance();
