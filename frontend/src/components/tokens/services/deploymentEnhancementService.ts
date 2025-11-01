/**
 * Deployment Enhancement Service
 * Provides wallet selection, balance checking, gas estimation, and faucet integration
 */

import { ethers } from 'ethers';
import { providerManager, NetworkEnvironment } from '@/infrastructure/web3/ProviderManager';
import { supabase } from '@/infrastructure/database/client';
import { RealTimeFeeEstimator, FeePriority } from '@/services/blockchain/RealTimeFeeEstimator';
import { enhancedGasEstimator } from '@/services/blockchain/EnhancedGasEstimationService';

export interface ProjectWallet {
  id: string;
  wallet_address: string;
  chain_id?: string; // Chain ID for the wallet's network
  non_evm_network?: string; // Non-EVM network identifier
  created_at: string;
}

export interface WalletBalance {
  address: string;
  balance: string; // In native currency (ETH, MATIC, etc.)
  balanceFormatted: string; // Human readable
  balanceUsd: string; // USD value
}

export interface GasEstimation {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  totalCostNative: string; // In native currency
  totalCostUsd?: string;
  estimatedTimeSeconds: number;
}

/**
 * Options for gas estimation when contract data is available
 */
export interface GasEstimationOptions {
  contractBytecode?: string;
  abi?: any[];
  constructorArgs?: any[];
  deployerAddress?: string;
}

export interface FaucetInfo {
  name: string;
  url: string;
  description: string;
  supported: boolean;
}

class DeploymentEnhancementService {
  private feeEstimator: RealTimeFeeEstimator;

  constructor() {
    this.feeEstimator = RealTimeFeeEstimator.getInstance();
  }

  /**
   * Get all project wallets for a specific blockchain and chain ID
   * Filters by chain_id to ensure wallets match the exact network (mainnet/testnet)
   */
  async getProjectWallets(
    projectId: string,
    blockchain: string,
    chainId?: string | number
  ): Promise<ProjectWallet[]> {
    let query = supabase
      .from('project_wallets')
      .select('id, wallet_address, wallet_type, created_at, chain_id')
      .eq('project_id', projectId);

    // Filter by chain_id if provided (preferred method for precise filtering)
    if (chainId !== undefined && chainId !== null) {
      query = query.eq('chain_id', chainId.toString());
    } else {
      // Fallback to wallet_type filtering (legacy behavior)
      const walletType = this.normalizeBlockchainForWallets(blockchain);
      query = query.eq('wallet_type', walletType);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching project wallets:', error);
      throw new Error(`Failed to fetch project wallets: ${error.message}`);
    }

    console.log(`[getProjectWallets] Found ${data?.length || 0} wallets for project ${projectId}, chain_id ${chainId}`);
    return data || [];
  }

  /**
   * Normalize blockchain name for wallet storage/retrieval
   * ✅ FIX #9: Include hoodi and other Ethereum testnets
   * Ethereum testnets (Sepolia, Holesky, Hoodi) use the same wallet as mainnet
   */
  private normalizeBlockchainForWallets(blockchain: string): string {
    const ethereumNetworks = ['ethereum', 'sepolia', 'holesky', 'hoodi'];
    return ethereumNetworks.includes(blockchain.toLowerCase()) ? 'ethereum' : blockchain;
  }

  /**
   * Get wallet balance for a specific address
   */
  async getWalletBalance(
    address: string,
    blockchain: string,
    environment: NetworkEnvironment
  ): Promise<WalletBalance> {
    try {
      const provider = providerManager.getProviderForEnvironment(
        blockchain as any,
        environment
      );

      if (!provider) {
        throw new Error(`No provider available for ${blockchain} (${environment})`);
      }

      const balance = await provider.getBalance(address);
      const balanceInEth = ethers.formatEther(balance);

      // TODO: Integrate with PriceFeedService for USD value
      // For now, return without USD value
      return {
        address,
        balance: balance.toString(),
        balanceFormatted: `${parseFloat(balanceInEth).toFixed(6)} ${this.getNativeCurrency(blockchain)}`,
        balanceUsd: '0.00' // TODO: Implement price feed integration
      };
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      throw error;
    }
  }

  /**
   * Estimate gas for token deployment
   * If contract data is not provided, returns null (estimation will happen at deployment time)
   * If contract data is provided, performs real blockchain-based estimation
   */
  async estimateDeploymentGas(
    blockchain: string,
    environment: NetworkEnvironment,
    tokenType: string,
    options?: {
      contractBytecode?: string;
      abi?: any[];
      constructorArgs?: any[];
      deployerAddress?: string;
    }
  ): Promise<GasEstimation | null> {
    try {
      // If no contract data provided, return null - estimation will happen at deployment time
      if (!options?.contractBytecode || !options?.abi || !options?.deployerAddress) {
        console.log(`[DeploymentEnhancement] Contract data not yet available - gas estimation deferred to deployment time`);
        return null;
      }

      console.log(`[DeploymentEnhancement] Estimating gas for ${tokenType} on ${blockchain} with real contract data`);
      
      // Get provider for blockchain
      const provider = providerManager.getProviderForEnvironment(
        blockchain as any,
        environment
      );

      if (!provider) {
        throw new Error(`No provider available for ${blockchain} (${environment})`);
      }

      // Use real blockchain-based estimation
      const estimate = await enhancedGasEstimator.estimateDeploymentCost({
        provider,
        bytecode: options.contractBytecode,
        abi: options.abi,
        constructorArgs: options.constructorArgs || [],
        blockchain,
        tokenType,
        from: options.deployerAddress,
        priority: FeePriority.MEDIUM
      });

      console.log(`[DeploymentEnhancement] Real Blockchain Estimate:
        - Gas Limit: ${estimate.recommendedGasLimit.toString()}
        - Gas Price Source: ${estimate.gasPriceSource}
        - Total Cost: ${estimate.estimatedCostNative} ${estimate.breakdown.nativeCurrency}
        - Estimated Time: ${estimate.estimatedTimeSeconds}s
        - Network Congestion: ${estimate.networkCongestion}`);
      
      // Format for UI display
      return {
        gasLimit: estimate.recommendedGasLimit.toString(),
        gasPrice: estimate.breakdown.gasPrice,
        maxFeePerGas: estimate.breakdown.maxFeePerGas,
        maxPriorityFeePerGas: estimate.breakdown.maxPriorityFeePerGas,
        totalCostNative: estimate.estimatedCostNative,
        totalCostUsd: estimate.estimatedCostUSD,
        estimatedTimeSeconds: estimate.estimatedTimeSeconds
      };
    } catch (error) {
      console.error('[DeploymentEnhancement] Gas estimation error:', error);
      throw error;
    }
  }

  /**
   * Get chain ID for blockchain and environment
   * ✅ FIX #9: Comprehensive chain ID mapping for ALL supported networks
   * Public method to allow external access for wallet filtering
   */
  getChainId(blockchain: string, environment: NetworkEnvironment): number {
    const chainIds: Record<string, Record<string, number>> = {
      // Ethereum Networks
      'ethereum': {
        [NetworkEnvironment.MAINNET]: 1,
        [NetworkEnvironment.TESTNET]: 11155111 // Sepolia by default
      },
      'sepolia': {
        [NetworkEnvironment.TESTNET]: 11155111
      },
      'holesky': {
        [NetworkEnvironment.TESTNET]: 17000
      },
      'hoodi': {
        [NetworkEnvironment.TESTNET]: 560048
      },
      
      // Layer 2 Networks - Arbitrum
      'arbitrum': {
        [NetworkEnvironment.MAINNET]: 42161,
        [NetworkEnvironment.TESTNET]: 421614
      },
      'arbitrumone': {
        [NetworkEnvironment.MAINNET]: 42161
      },
      'arbitrumnova': {
        [NetworkEnvironment.MAINNET]: 42170
      },
      'arbitrumsepolia': {
        [NetworkEnvironment.TESTNET]: 421614
      },
      
      // Layer 2 Networks - Base
      'base': {
        [NetworkEnvironment.MAINNET]: 8453,
        [NetworkEnvironment.TESTNET]: 84532
      },
      'basesepolia': {
        [NetworkEnvironment.TESTNET]: 84532
      },
      
      // Layer 2 Networks - Optimism
      'optimism': {
        [NetworkEnvironment.MAINNET]: 10,
        [NetworkEnvironment.TESTNET]: 11155420
      },
      'optimismsepolia': {
        [NetworkEnvironment.TESTNET]: 11155420
      },
      
      // Layer 2 Networks - Blast
      'blast': {
        [NetworkEnvironment.MAINNET]: 81457,
        [NetworkEnvironment.TESTNET]: 168587773
      },
      'blastsepolia': {
        [NetworkEnvironment.TESTNET]: 168587773
      },
      
      // Layer 2 Networks - Scroll
      'scroll': {
        [NetworkEnvironment.MAINNET]: 534352,
        [NetworkEnvironment.TESTNET]: 534351
      },
      'scrollsepolia': {
        [NetworkEnvironment.TESTNET]: 534351
      },
      
      // Layer 2 Networks - zkSync
      'zksync': {
        [NetworkEnvironment.MAINNET]: 324,
        [NetworkEnvironment.TESTNET]: 300
      },
      'zksyncsepolia': {
        [NetworkEnvironment.TESTNET]: 300
      },
      
      // Layer 2 Networks - Polygon zkEVM
      'polygonzkevm': {
        [NetworkEnvironment.MAINNET]: 1101,
        [NetworkEnvironment.TESTNET]: 2442
      },
      'polygonzkevmcardona': {
        [NetworkEnvironment.TESTNET]: 2442
      },
      
      // Layer 2 Networks - Linea
      'linea': {
        [NetworkEnvironment.MAINNET]: 59144,
        [NetworkEnvironment.TESTNET]: 59141
      },
      'lineasepolia': {
        [NetworkEnvironment.TESTNET]: 59141
      },
      
      // Layer 2 Networks - Mantle
      'mantle': {
        [NetworkEnvironment.MAINNET]: 5000,
        [NetworkEnvironment.TESTNET]: 5003
      },
      'mantlesepolia': {
        [NetworkEnvironment.TESTNET]: 5003
      },
      
      // Layer 2 Networks - Taiko
      'taiko': {
        [NetworkEnvironment.MAINNET]: 167000,
        [NetworkEnvironment.TESTNET]: 167009
      },
      'taikohekla': {
        [NetworkEnvironment.TESTNET]: 167009
      },
      
      // Layer 2 Networks - Sonic
      'sonic': {
        [NetworkEnvironment.MAINNET]: 146,
        [NetworkEnvironment.TESTNET]: 14601
      },
      'sonictestnet': {
        [NetworkEnvironment.TESTNET]: 14601
      },
      
      // Layer 2 Networks - Unichain
      'unichain': {
        [NetworkEnvironment.MAINNET]: 130,
        [NetworkEnvironment.TESTNET]: 1301
      },
      'unichainsepolia': {
        [NetworkEnvironment.TESTNET]: 1301
      },
      
      // Layer 2 Networks - Abstract
      'abstract': {
        [NetworkEnvironment.MAINNET]: 2741,
        [NetworkEnvironment.TESTNET]: 11124
      },
      'abstractsepolia': {
        [NetworkEnvironment.TESTNET]: 11124
      },
      
      // Layer 2 Networks - Fraxtal
      'fraxtal': {
        [NetworkEnvironment.MAINNET]: 252,
        [NetworkEnvironment.TESTNET]: 2522
      },
      'fraxtaltestnet': {
        [NetworkEnvironment.TESTNET]: 2522
      },
      
      // Layer 2 Networks - Swellchain
      'swellchain': {
        [NetworkEnvironment.MAINNET]: 1923,
        [NetworkEnvironment.TESTNET]: 1924
      },
      'swellchaintestnet': {
        [NetworkEnvironment.TESTNET]: 1924
      },
      
      // Polygon Networks
      'polygon': {
        [NetworkEnvironment.MAINNET]: 137,
        [NetworkEnvironment.TESTNET]: 80002 // Amoy testnet
      },
      'polygonamoy': {
        [NetworkEnvironment.TESTNET]: 80002
      },
      
      // BNB Chain Networks
      'bsc': {
        [NetworkEnvironment.MAINNET]: 56,
        [NetworkEnvironment.TESTNET]: 97
      },
      'bnb': {
        [NetworkEnvironment.MAINNET]: 56,
        [NetworkEnvironment.TESTNET]: 97
      },
      'binance': {
        [NetworkEnvironment.MAINNET]: 56,
        [NetworkEnvironment.TESTNET]: 97
      },
      'bnbtestnet': {
        [NetworkEnvironment.TESTNET]: 97
      },
      'opbnb': {
        [NetworkEnvironment.MAINNET]: 204,
        [NetworkEnvironment.TESTNET]: 5611
      },
      'opbnbtestnet': {
        [NetworkEnvironment.TESTNET]: 5611
      },
      
      // Avalanche Networks
      'avalanche': {
        [NetworkEnvironment.MAINNET]: 43114,
        [NetworkEnvironment.TESTNET]: 43113
      },
      'avax': {
        [NetworkEnvironment.MAINNET]: 43114,
        [NetworkEnvironment.TESTNET]: 43113
      },
      'avalanchefuji': {
        [NetworkEnvironment.TESTNET]: 43113
      },
      
      // Other Major Networks
      'gnosis': {
        [NetworkEnvironment.MAINNET]: 100
      },
      'celo': {
        [NetworkEnvironment.MAINNET]: 42220,
        [NetworkEnvironment.TESTNET]: 44787
      },
      'celoalfajores': {
        [NetworkEnvironment.TESTNET]: 44787
      },
      'moonbeam': {
        [NetworkEnvironment.MAINNET]: 1284
      },
      'moonriver': {
        [NetworkEnvironment.MAINNET]: 1285
      },
      'moonbasealpha': {
        [NetworkEnvironment.TESTNET]: 1287
      },
      'berachain': {
        [NetworkEnvironment.MAINNET]: 80094,
        [NetworkEnvironment.TESTNET]: 80069
      },
      'berachainbepolia': {
        [NetworkEnvironment.TESTNET]: 80069
      },
      'sei': {
        [NetworkEnvironment.MAINNET]: 1329,
        [NetworkEnvironment.TESTNET]: 1328
      },
      'seitestnet': {
        [NetworkEnvironment.TESTNET]: 1328
      },
      'injective': {
        [NetworkEnvironment.MAINNET]: 1776,
        [NetworkEnvironment.TESTNET]: 1439
      },
      'injectivetestnet': {
        [NetworkEnvironment.TESTNET]: 1439
      },
      'katana': {
        [NetworkEnvironment.MAINNET]: 747474
      },
      'world': {
        [NetworkEnvironment.MAINNET]: 480,
        [NetworkEnvironment.TESTNET]: 4801
      },
      'worldsepolia': {
        [NetworkEnvironment.TESTNET]: 4801
      },
      'sophon': {
        [NetworkEnvironment.MAINNET]: 50104,
        [NetworkEnvironment.TESTNET]: 531050104
      },
      'sophonsepolia': {
        [NetworkEnvironment.TESTNET]: 531050104
      },
      'monad': {
        [NetworkEnvironment.TESTNET]: 10143
      },
      
      // Other Networks
      'bittorrent': {
        [NetworkEnvironment.MAINNET]: 199,
        [NetworkEnvironment.TESTNET]: 1029
      },
      'bittorrenttestnet': {
        [NetworkEnvironment.TESTNET]: 1029
      },
      'xdc': {
        [NetworkEnvironment.MAINNET]: 50,
        [NetworkEnvironment.TESTNET]: 51
      },
      'xdcapothem': {
        [NetworkEnvironment.TESTNET]: 51
      },
      'hyperevm': {
        [NetworkEnvironment.MAINNET]: 999
      },
      'apechain': {
        [NetworkEnvironment.MAINNET]: 33139,
        [NetworkEnvironment.TESTNET]: 33111
      },
      'apechaincurtis': {
        [NetworkEnvironment.TESTNET]: 33111
      },
      'memecore': {
        [NetworkEnvironment.TESTNET]: 43521
      },
      
      // Fantom
      'fantom': {
        [NetworkEnvironment.MAINNET]: 250
      },
      
      // Deprecated Networks
      'cronos': {
        [NetworkEnvironment.MAINNET]: 25
      }
    };

    const chainId = chainIds[blockchain.toLowerCase()]?.[environment];
    
    if (!chainId) {
      console.warn(`[getChainId] No chain ID found for blockchain: ${blockchain}, environment: ${environment}. Falling back to Ethereum mainnet (1).`);
      return 1; // Fallback to Ethereum mainnet
    }
    
    return chainId;
  }

  /**
   * Get native currency symbol for blockchain
   * ✅ FIX #9: Comprehensive native currency mapping
   */
  private getNativeCurrency(blockchain: string): string {
    const currencies: Record<string, string> = {
      // Ethereum and testnets
      'ethereum': 'ETH',
      'sepolia': 'ETH',
      'holesky': 'ETH',
      'hoodi': 'ETH',
      
      // Layer 2 - Most use ETH
      'arbitrum': 'ETH',
      'arbitrumone': 'ETH',
      'arbitrumnova': 'ETH',
      'arbitrumsepolia': 'ETH',
      'base': 'ETH',
      'basesepolia': 'ETH',
      'optimism': 'ETH',
      'optimismsepolia': 'ETH',
      'blast': 'ETH',
      'blastsepolia': 'ETH',
      'scroll': 'ETH',
      'scrollsepolia': 'ETH',
      'zksync': 'ETH',
      'zksyncsepolia': 'ETH',
      'polygonzkevm': 'ETH',
      'polygonzkevmcardona': 'ETH',
      'linea': 'ETH',
      'lineasepolia': 'ETH',
      'mantle': 'MNT',
      'mantlesepolia': 'MNT',
      'taiko': 'ETH',
      'taikohekla': 'ETH',
      'sonic': 'S',
      'sonictestnet': 'S',
      'unichain': 'ETH',
      'unichainsepolia': 'ETH',
      'abstract': 'ETH',
      'abstractsepolia': 'ETH',
      'fraxtal': 'frxETH',
      'fraxtaltestnet': 'frxETH',
      'swellchain': 'ETH',
      'swellchaintestnet': 'ETH',
      
      // Polygon
      'polygon': 'MATIC',
      'polygonamoy': 'MATIC',
      
      // BNB Chain
      'bsc': 'BNB',
      'bnb': 'BNB',
      'binance': 'BNB',
      'bnbtestnet': 'BNB',
      'opbnb': 'BNB',
      'opbnbtestnet': 'BNB',
      
      // Avalanche
      'avalanche': 'AVAX',
      'avax': 'AVAX',
      'avalanchefuji': 'AVAX',
      
      // Other Major Networks
      'gnosis': 'xDAI',
      'celo': 'CELO',
      'celoalfajores': 'CELO',
      'moonbeam': 'GLMR',
      'moonriver': 'MOVR',
      'moonbasealpha': 'DEV',
      'berachain': 'BERA',
      'berachainbepolia': 'BERA',
      'sei': 'SEI',
      'seitestnet': 'SEI',
      'injective': 'INJ',
      'injectivetestnet': 'INJ',
      'katana': 'ETH',
      'world': 'ETH',
      'worldsepolia': 'ETH',
      'sophon': 'SOPH',
      'sophonsepolia': 'SOPH',
      'monad': 'MON',
      
      // Other Networks
      'bittorrent': 'BTT',
      'bittorrenttestnet': 'BTT',
      'xdc': 'XDC',
      'xdcapothem': 'XDC',
      'hyperevm': 'HYP',
      'apechain': 'APE',
      'apechaincurtis': 'APE',
      'memecore': 'MEME',
      'fantom': 'FTM',
      'cronos': 'CRO'
    };

    return currencies[blockchain.toLowerCase()] || 'ETH';
  }

  /**
   * Get testnet faucet information
   */
  getFaucetInfo(blockchain: string, environment: NetworkEnvironment): FaucetInfo[] {
    console.log('[getFaucetInfo] Called with blockchain:', blockchain, 'environment:', environment);
    
    if (environment !== NetworkEnvironment.TESTNET) {
      return [];
    }

    const faucets: Record<string, FaucetInfo[]> = {
      'ethereum': [
        {
          name: 'Sepolia Faucet (Alchemy)',
          url: 'https://sepoliafaucet.com/',
          description: 'Get Sepolia ETH from Alchemy - requires Alchemy account',
          supported: true
        },
        {
          name: 'Sepolia Faucet (QuickNode)',
          url: 'https://faucet.quicknode.com/ethereum/sepolia',
          description: 'Get Sepolia ETH from QuickNode',
          supported: true
        }
      ],
      'sepolia': [
        {
          name: 'Sepolia Faucet (Alchemy)',
          url: 'https://sepoliafaucet.com/',
          description: 'Get Sepolia ETH from Alchemy - requires Alchemy account',
          supported: true
        },
        {
          name: 'Sepolia Faucet (QuickNode)',
          url: 'https://faucet.quicknode.com/ethereum/sepolia',
          description: 'Get Sepolia ETH from QuickNode',
          supported: true
        },
        {
          name: 'Sepolia PoW Faucet',
          url: 'https://sepolia-faucet.pk910.de/',
          description: 'Mine Sepolia ETH using your browser',
          supported: true
        }
      ],
      'holesky': [
        {
          name: 'Holesky Faucet (QuickNode)',
          url: 'https://faucet.quicknode.com/ethereum/holesky',
          description: 'Get Holesky ETH from QuickNode',
          supported: true
        },
        {
          name: 'Holesky PoW Faucet',
          url: 'https://holesky-faucet.pk910.de/',
          description: 'Mine Holesky ETH using your browser',
          supported: true
        }
      ],
      'polygon': [
        {
          name: 'Polygon Amoy Faucet',
          url: 'https://faucet.polygon.technology/',
          description: 'Get MATIC for Polygon Amoy testnet',
          supported: true
        }
      ],
      'bsc': [
        {
          name: 'BNB Testnet Faucet',
          url: 'https://testnet.bnbchain.org/faucet-smart',
          description: 'Get BNB for BSC testnet',
          supported: true
        }
      ],
      'avalanche': [
        {
          name: 'Avalanche Fuji Faucet',
          url: 'https://faucet.avax.network/',
          description: 'Get AVAX for Fuji testnet',
          supported: true
        }
      ]
    };

    const result = faucets[blockchain] || [];
    console.log('[getFaucetInfo] Returning faucets:', result.length, 'for blockchain:', blockchain);
    return result;
  }

  /**
   * Check if wallet has sufficient balance for deployment
   */
  async checkSufficientBalance(
    address: string,
    blockchain: string,
    environment: NetworkEnvironment,
    gasEstimation: GasEstimation
  ): Promise<{ sufficient: boolean; deficit?: string }> {
    try {
      const balance = await this.getWalletBalance(address, blockchain, environment);
      const balanceBigInt = BigInt(balance.balance);
      const requiredBigInt = BigInt(
        ethers.parseEther(gasEstimation.totalCostNative).toString()
      );

      if (balanceBigInt < requiredBigInt) {
        const deficit = ethers.formatEther(requiredBigInt - balanceBigInt);
        return {
          sufficient: false,
          deficit: `${deficit} ${this.getNativeCurrency(blockchain)}`
        };
      }

      return { sufficient: true };
    } catch (error) {
      console.error('Error checking balance:', error);
      throw error;
    }
  }
}

export const deploymentEnhancementService = new DeploymentEnhancementService();
