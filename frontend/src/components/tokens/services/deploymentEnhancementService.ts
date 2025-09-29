/**
 * Deployment Enhancement Service
 * Provides wallet selection, balance checking, gas estimation, and faucet integration
 */

import { ethers } from 'ethers';
import { providerManager, NetworkEnvironment } from '@/infrastructure/web3/ProviderManager';
import { supabase } from '@/infrastructure/database/client';
import { RealTimeFeeEstimator, FeePriority } from '@/services/blockchain/RealTimeFeeEstimator';

export interface ProjectWallet {
  id: string;
  wallet_address: string;
  wallet_type: string;
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
   * Get all project wallets for a specific blockchain
   * Note: For Ethereum testnets (sepolia, holesky), queries for 'ethereum' wallets
   * since they use the same address/key infrastructure
   */
  async getProjectWallets(
    projectId: string,
    blockchain: string
  ): Promise<ProjectWallet[]> {
    // Normalize blockchain for wallet queries - all Ethereum networks use 'ethereum' wallets
    const walletType = this.normalizeBlockchainForWallets(blockchain);
    
    const { data, error } = await supabase
      .from('project_wallets')
      .select('id, wallet_address, wallet_type, created_at')
      .eq('project_id', projectId)
      .eq('wallet_type', walletType)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching project wallets:', error);
      throw new Error(`Failed to fetch project wallets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Normalize blockchain name for wallet storage/retrieval
   * Ethereum testnets (Sepolia, Holesky) use the same wallet as mainnet
   */
  private normalizeBlockchainForWallets(blockchain: string): string {
    const ethereumNetworks = ['ethereum', 'sepolia', 'holesky'];
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
   * Estimate gas for token deployment dynamically
   */
  async estimateDeploymentGas(
    blockchain: string,
    environment: NetworkEnvironment,
    tokenType: string,
    contractBytecode?: string
  ): Promise<GasEstimation> {
    try {
      // Use RealTimeFeeEstimator for accurate gas price
      const feeData = await this.feeEstimator.getOptimalFeeData(blockchain, FeePriority.MEDIUM);
      
      // Estimate gas limit based on token type
      const gasLimit = this.estimateGasLimit(tokenType, contractBytecode);
      
      // Calculate total cost
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || '20000000000'; // 20 gwei fallback
      const gasPriceBigInt = BigInt(gasPrice);
      const gasLimitBigInt = BigInt(gasLimit);
      const totalCost = gasPriceBigInt * gasLimitBigInt;
      
      return {
        gasLimit: gasLimit.toString(),
        gasPrice: feeData.gasPrice || '',
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        totalCostNative: ethers.formatEther(totalCost),
        estimatedTimeSeconds: feeData.estimatedTimeSeconds
      };
    } catch (error) {
      console.error('Error estimating gas:', error);
      throw error;
    }
  }

  /**
   * Estimate gas limit based on token type
   */
  private estimateGasLimit(tokenType: string, contractBytecode?: string): number {
    // Base estimates for different token types
    const estimates: Record<string, number> = {
      'ERC20': 1500000,
      'EnhancedERC20': 2000000,
      'ERC721': 2500000,
      'EnhancedERC721': 3000000,
      'ERC1155': 2800000,
      'EnhancedERC1155': 3500000,
      'ERC3525': 3200000,
      'EnhancedERC3525': 4000000,
      'ERC4626': 2600000,
      'EnhancedERC4626': 3300000,
      'ERC1400': 3500000,
      'BaseERC1400': 3200000,
      'EnhancedERC1400': 4200000
    };

    return estimates[tokenType] || 3000000; // Default to 3M gas
  }

  /**
   * Get chain ID for blockchain and environment
   */
  private getChainId(blockchain: string, environment: NetworkEnvironment): number {
    const chainIds: Record<string, Record<string, number>> = {
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
      'polygon': {
        [NetworkEnvironment.MAINNET]: 137,
        [NetworkEnvironment.TESTNET]: 80002 // Amoy testnet
      },
      'bsc': {
        [NetworkEnvironment.MAINNET]: 56,
        [NetworkEnvironment.TESTNET]: 97
      },
      'avalanche': {
        [NetworkEnvironment.MAINNET]: 43114,
        [NetworkEnvironment.TESTNET]: 43113
      },
      'arbitrum': {
        [NetworkEnvironment.MAINNET]: 42161,
        [NetworkEnvironment.TESTNET]: 421614
      },
      'optimism': {
        [NetworkEnvironment.MAINNET]: 10,
        [NetworkEnvironment.TESTNET]: 11155420
      },
      'base': {
        [NetworkEnvironment.MAINNET]: 8453,
        [NetworkEnvironment.TESTNET]: 84532
      }
    };

    return chainIds[blockchain]?.[environment] || 1;
  }

  /**
   * Get native currency symbol for blockchain
   */
  private getNativeCurrency(blockchain: string): string {
    const currencies: Record<string, string> = {
      'ethereum': 'ETH',
      'sepolia': 'ETH',
      'holesky': 'ETH',
      'polygon': 'MATIC',
      'bsc': 'BNB',
      'avalanche': 'AVAX',
      'arbitrum': 'ETH',
      'optimism': 'ETH',
      'base': 'ETH'
    };

    return currencies[blockchain] || 'ETH';
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
