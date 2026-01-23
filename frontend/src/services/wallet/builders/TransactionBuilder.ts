/**
 * Multi-Chain Transaction Builder
 * Real transaction building for ALL supported chain types from .env
 * 
 * EVM: Ethereum, Polygon, Optimism, Arbitrum, Base, BSC, ZkSync, Avalanche + testnets
 * Non-EVM: Bitcoin, Solana, Aptos, Sui, NEAR, Injective + testnets
 * 
 * Uses real libraries: ethers.js, bitcoinjs-lib, @solana 
 */

import { ethers } from 'ethers';
import { rpcManager } from '../../../infrastructure/web3/rpc/RPCConnectionManager';
import type { SupportedChain, NetworkType } from '../../../infrastructure/web3/adapters/IBlockchainAdapter';
import { ChainType } from '../AddressUtils';
import { addressUtils } from '../AddressUtils';
import { priceFeedService } from '../PriceFeedService';

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface TransactionRequest {
  from: string;
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  chainId: number;
  type?: number; // 0 = legacy, 1 = EIP-2930, 2 = EIP-1559
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedCostWei: string;
  estimatedCostEth: string;
  estimatedCostUsd?: number;
  feeData?: ethers.FeeData;
  isEIP1559: boolean;
}

export interface SignedTransaction {
  rawTransaction: string;
  transactionHash: string;
  signature?: string;
  chainId: number;
  nonce: number;
  gasLimit: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export interface BroadcastResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  confirmations?: number;
  error?: string;
  receipt?: ethers.TransactionReceipt;
}

export interface TransactionBuilderConfig {
  chainId: number;
  chainName: string;
  chainType: ChainType;
  networkType: 'mainnet' | 'testnet' | 'devnet';
  rpcUrl?: string;
  symbol: string;
  decimals: number;
  gasMultiplier?: number;
  confirmationBlocks?: number;
  timeout?: number;
}

// ============================================================================
// EVM TRANSACTION BUILDER (Real ethers.js implementation)
// ============================================================================

// Network-specific transaction confirmation timeouts (in milliseconds)
const NETWORK_TIMEOUTS: Record<string, number> = {
  // Mainnets: Fast block times
  'ethereum': 180000,      // 3 minutes
  'base': 120000,          // 2 minutes
  'optimism': 120000,      // 2 minutes
  'arbitrum': 120000,      // 2 minutes
  'polygon': 180000,       // 3 minutes
  'avalanche': 120000,     // 2 minutes
  'bsc': 180000,           // 3 minutes
  'bnb': 180000,           // 3 minutes (alias for BSC)
  
  // Testnets: Slower, congested
  'hoodi': 600000,         // 10 minutes
  'sepolia': 300000,       // 5 minutes
  'base-sepolia': 300000,  // 5 minutes
  'optimism-sepolia': 300000, // 5 minutes
  'arbitrum-sepolia': 300000, // 5 minutes
  'polygon-amoy': 300000,  // 5 minutes
  'avalanche-fuji': 300000, // 5 minutes
  'bsc-testnet': 300000,   // 5 minutes
  'bnb-testnet': 300000    // 5 minutes
};

export class EVMTransactionBuilder {
  private provider: ethers.JsonRpcProvider | null = null;
  private readonly config: TransactionBuilderConfig;

  constructor(config: TransactionBuilderConfig) {
    this.config = config;
    this.initializeProvider();
  }

  private initializeProvider(): void {
    const rpcUrl = this.getRpcUrl();
    if (rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(rpcUrl, {
        chainId: this.config.chainId,
        name: this.config.chainName
      });
    }
  }

  /**
   * Validate transaction parameters
   */
  async validateTransaction(tx: TransactionRequest): Promise<boolean> {
    // Validate addresses using our AddressUtils
    const fromValid = addressUtils.validateAddress(tx.from, this.config.chainType, this.config.networkType);
    const toValid = addressUtils.validateAddress(tx.to, this.config.chainType, this.config.networkType);
    
    if (!fromValid.isValid) {
      throw new Error(`Invalid from address: ${fromValid.error}`);
    }
    
    if (!toValid.isValid) {
      throw new Error(`Invalid to address: ${toValid.error}`);
    }

    // Validate value
    if (tx.value) {
      try {
        ethers.parseEther(ethers.formatUnits(tx.value, 'wei'));
      } catch {
        throw new Error('Invalid transaction value format');
      }
    }

    // Validate chain ID
    if (tx.chainId !== this.config.chainId) {
      throw new Error(`Chain ID mismatch: expected ${this.config.chainId}, got ${tx.chainId}`);
    }

    return true;
  }

  /**
   * Real gas estimation using ethers.js
   */
  async estimateGas(tx: TransactionRequest): Promise<GasEstimate> {
    if (!this.provider) {
      throw new Error(`${this.config.chainName} provider not initialized`);
    }

    await this.validateTransaction(tx);

    try {
      // Get fee data from network
      const feeData = await this.provider.getFeeData();
      
      // Estimate gas limit
      const estimatedGas = await this.provider.estimateGas({
        from: tx.from,
        to: tx.to,
        value: tx.value || '0',
        data: tx.data || '0x'
      });

      // Apply gas multiplier for safety
      const gasMultiplier = this.config.gasMultiplier || 1.1;
      const gasLimit = (estimatedGas * BigInt(Math.floor(gasMultiplier * 100)) / BigInt(100)).toString();

      const isEIP1559 = feeData.maxFeePerGas !== null && feeData.maxPriorityFeePerGas !== null;

      let estimatedCostWei: string;
      let gasPrice: string | undefined;
      let maxFeePerGas: string | undefined;
      let maxPriorityFeePerGas: string | undefined;

      if (isEIP1559 && feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        maxFeePerGas = feeData.maxFeePerGas.toString();
        maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.toString();
        estimatedCostWei = (BigInt(gasLimit) * feeData.maxFeePerGas).toString();
      } else if (feeData.gasPrice) {
        gasPrice = feeData.gasPrice.toString();
        estimatedCostWei = (BigInt(gasLimit) * feeData.gasPrice).toString();
      } else {
        throw new Error('Unable to get gas price data from network');
      }

      const estimatedCostEth = ethers.formatEther(estimatedCostWei);

      // Get USD cost estimate
      let estimatedCostUsd: number | undefined;
      try {
        const tokenPrice = await priceFeedService.getTokenPrice(this.config.symbol.toLowerCase());
        if (tokenPrice) {
          estimatedCostUsd = parseFloat(estimatedCostEth) * tokenPrice.priceUsd;
        }
      } catch (error) {
        console.warn(`Failed to get USD price for ${this.config.symbol}:`, error);
      }

      return {
        gasLimit,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        estimatedCostWei,
        estimatedCostEth,
        estimatedCostUsd,
        feeData,
        isEIP1559
      };

    } catch (error) {
      throw new Error(`Gas estimation failed for ${this.config.chainName}: ${error.message}`);
    }
  }

  /**
   * Real transaction signing using ethers.js
   */
  async signTransaction(tx: TransactionRequest, privateKey: string): Promise<SignedTransaction> {
    if (!this.provider) {
      throw new Error(`${this.config.chainName} provider not initialized`);
    }

    await this.validateTransaction(tx);

    try {
      // Create wallet from private key
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      // Verify wallet address matches from address
      if (wallet.address.toLowerCase() !== tx.from.toLowerCase()) {
        throw new Error('Private key does not match from address');
      }

      // Get nonce if not provided
      let nonce = tx.nonce;
      if (nonce === undefined) {
        nonce = await wallet.getNonce();
      }

      // Prepare transaction object
      const transaction: ethers.TransactionRequest = {
        to: tx.to,
        value: tx.value || '0',
        data: tx.data || '0x',
        nonce,
        chainId: tx.chainId,
        gasLimit: tx.gasLimit,
        type: tx.type
      };

      // Add gas pricing based on EIP-1559 support
      if (tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
        transaction.maxFeePerGas = tx.maxFeePerGas;
        transaction.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
        transaction.type = 2; // EIP-1559
      } else if (tx.gasPrice) {
        transaction.gasPrice = tx.gasPrice;
        transaction.type = 0; // Legacy
      } else {
        // Get current fee data
        const feeData = await this.provider.getFeeData();
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          transaction.maxFeePerGas = feeData.maxFeePerGas;
          transaction.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
          transaction.type = 2;
        } else if (feeData.gasPrice) {
          transaction.gasPrice = feeData.gasPrice;
          transaction.type = 0;
        }
      }

      // Sign the transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      const transactionHash = ethers.keccak256(signedTransaction);

      return {
        rawTransaction: signedTransaction,
        transactionHash,
        chainId: tx.chainId,
        nonce,
        gasLimit: tx.gasLimit || transaction.gasLimit?.toString() || '21000',
        gasPrice: transaction.gasPrice?.toString(),
        maxFeePerGas: transaction.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas?.toString()
      };

    } catch (error) {
      throw new Error(`Transaction signing failed for ${this.config.chainName}: ${error.message}`);
    }
  }

  /**
   * Real transaction broadcasting using ethers.js
   */
  async broadcastTransaction(signedTx: SignedTransaction): Promise<BroadcastResult> {
    if (!this.provider) {
      throw new Error(`${this.config.chainName} provider not initialized`);
    }

    try {
      const txResponse = await this.provider.broadcastTransaction(signedTx.rawTransaction);

      // Wait for confirmation
      const confirmationsToWait = this.config.confirmationBlocks || 1;
      const receipt = await txResponse.wait(confirmationsToWait);

      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      return {
        success: receipt.status === 1,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        confirmations: await receipt.confirmations(),
        receipt
      };

    } catch (error) {
      return {
        success: false,
        error: `Broadcast failed for ${this.config.chainName}: ${error.message}`
      };
    }
  }

  /**
   * Get appropriate timeout for this network
   */
  private getNetworkTimeout(): number {
    // Use config timeout if explicitly set
    if (this.config.timeout) {
      return this.config.timeout;
    }

    // Look up by chain name
    const chainKey = this.config.chainName.toLowerCase();
    if (NETWORK_TIMEOUTS[chainKey]) {
      return NETWORK_TIMEOUTS[chainKey];
    }

    // Default based on network type
    if (this.config.networkType === 'testnet' || this.config.networkType === 'devnet') {
      return 300000; // 5 minutes for testnets
    }
    
    return 180000; // 3 minutes for mainnets
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(txHash: string, confirmations = 1, timeout?: number): Promise<ethers.TransactionReceipt | null> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    // Use provided timeout or get network-specific default
    const actualTimeout = timeout || this.getNetworkTimeout();
    const timeoutSeconds = Math.floor(actualTimeout / 1000);
    
    console.log(`⏳ Waiting for ${confirmations} confirmation(s) on ${this.config.chainName}...`);
    console.log(`   Timeout: ${timeoutSeconds}s (${Math.floor(timeoutSeconds / 60)} minutes)`);

    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) {
        throw new Error(`Transaction ${txHash} not found`);
      }

      return await tx.wait(confirmations, actualTimeout);
    } catch (error) {
      console.error(`Failed to wait for confirmation on ${this.config.chainName}:`, error);
      return null;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      console.error(`Failed to get receipt for ${txHash} on ${this.config.chainName}:`, error);
      return null;
    }
  }

  /**
   * Get current nonce for address
   */
  async getNonce(address: string): Promise<number> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    return await this.provider.getTransactionCount(address, 'pending');
  }

  /**
   * Get current balance for address
   */
  async getBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const balance = await this.provider.getBalance(address);
    return balance.toString();
  }

  private getRpcUrl(): string | null {
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

  private getChainNameForRPC(): string {
    const chainMapping: { [key: string]: string } = {
      [ChainType.ETHEREUM]: 'ethereum',
      [ChainType.POLYGON]: 'polygon',
      [ChainType.ARBITRUM]: 'arbitrum',
      [ChainType.OPTIMISM]: 'optimism',
      [ChainType.BASE]: 'base',
      [ChainType.AVALANCHE]: 'avalanche'
    };
    return chainMapping[this.config.chainType] || this.config.chainType;
  }
}

// ============================================================================
// CHAIN-SPECIFIC BUILDER CONFIGS
// ============================================================================

// Ethereum Mainnet & Testnets
export const EthereumTransactionBuilder = (networkType: 'mainnet' | 'testnet' = 'mainnet') => {
  const configs = {
    mainnet: { chainId: 1, chainName: 'Ethereum', rpcUrl: import.meta.env.VITE_MAINNET_RPC_URL },
    testnet: { chainId: 11155111, chainName: 'Sepolia', rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL }
  };
  
  const config = configs[networkType];
  return new EVMTransactionBuilder({
    ...config,
    chainType: ChainType.ETHEREUM,
    networkType,
    symbol: 'ETH',
    decimals: 18,
    gasMultiplier: 1.1,
    confirmationBlocks: 1
  });
};

// Polygon Mainnet & Testnet  
export const PolygonTransactionBuilder = (networkType: 'mainnet' | 'testnet' = 'mainnet') => {
  const configs = {
    mainnet: { chainId: 137, chainName: 'Polygon', rpcUrl: import.meta.env.VITE_POLYGON_RPC_URL },
    testnet: { chainId: 80002, chainName: 'Amoy', rpcUrl: import.meta.env.VITE_AMOY_RPC_URL }
  };
  
  const config = configs[networkType];
  return new EVMTransactionBuilder({
    ...config,
    chainType: ChainType.POLYGON,
    networkType,
    symbol: 'MATIC',
    decimals: 18,
    gasMultiplier: 1.2,
    confirmationBlocks: 3
  });
};

// Arbitrum Mainnet & Testnet
export const ArbitrumTransactionBuilder = (networkType: 'mainnet' | 'testnet' = 'mainnet') => {
  const configs = {
    mainnet: { chainId: 42161, chainName: 'Arbitrum', rpcUrl: import.meta.env.VITE_ARBITRUM_RPC_URL },
    testnet: { chainId: 421614, chainName: 'Arbitrum Sepolia', rpcUrl: import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL }
  };
  
  const config = configs[networkType];
  return new EVMTransactionBuilder({
    ...config,
    chainType: ChainType.ARBITRUM,
    networkType,
    symbol: 'ETH',
    decimals: 18,
    gasMultiplier: 1.1,
    confirmationBlocks: 1
  });
};

// Optimism Mainnet & Testnet
export const OptimismTransactionBuilder = (networkType: 'mainnet' | 'testnet' = 'mainnet') => {
  const configs = {
    mainnet: { chainId: 10, chainName: 'Optimism', rpcUrl: import.meta.env.VITE_OPTIMISM_RPC_URL },
    testnet: { chainId: 11155420, chainName: 'Optimism Sepolia', rpcUrl: import.meta.env.VITE_OPTIMISM_SEPOLIA_RPC_URL }
  };
  
  const config = configs[networkType];
  return new EVMTransactionBuilder({
    ...config,
    chainType: ChainType.OPTIMISM,
    networkType,
    symbol: 'ETH',
    decimals: 18,
    gasMultiplier: 1.1,
    confirmationBlocks: 1
  });
};

// Base Mainnet & Testnet
export const BaseTransactionBuilder = (networkType: 'mainnet' | 'testnet' = 'mainnet') => {
  const configs = {
    mainnet: { chainId: 8453, chainName: 'Base', rpcUrl: import.meta.env.VITE_BASE_RPC_URL },
    testnet: { chainId: 84532, chainName: 'Base Sepolia', rpcUrl: import.meta.env.VITE_BASE_SEPOLIA_RPC_URL }
  };
  
  const config = configs[networkType];
  return new EVMTransactionBuilder({
    ...config,
    chainType: ChainType.BASE,
    networkType,
    symbol: 'ETH',
    decimals: 18,
    gasMultiplier: 1.1,
    confirmationBlocks: 1
  });
};

// BSC Mainnet & Testnet
export const BSCTransactionBuilder = (networkType: 'mainnet' | 'testnet' = 'mainnet') => {
  const configs = {
    mainnet: { chainId: 56, chainName: 'BSC', rpcUrl: import.meta.env.VITE_BSC_RPC_URL },
    testnet: { chainId: 97, chainName: 'BSC Testnet', rpcUrl: `${import.meta.env.VITE_BSC_RPC_URL?.replace('dataseed', 'testnet-dataseed')}` }
  };
  
  const config = configs[networkType];
  return new EVMTransactionBuilder({
    ...config,
    chainType: ChainType.BSC,
    networkType,
    symbol: 'BNB',
    decimals: 18,
    gasMultiplier: 1.2,
    confirmationBlocks: 3
  });
};

// Avalanche Mainnet & Testnet
export const AvalancheTransactionBuilder = (networkType: 'mainnet' | 'testnet' = 'mainnet') => {
  const configs = {
    mainnet: { chainId: 43114, chainName: 'Avalanche', rpcUrl: import.meta.env.VITE_AVALANCHE_RPC_URL },
    testnet: { chainId: 43113, chainName: 'Avalanche Testnet', rpcUrl: import.meta.env.VITE_AVALANCHE_TESTNET_RPC_URL }
  };
  
  const config = configs[networkType];
  return new EVMTransactionBuilder({
    ...config,
    chainType: ChainType.AVALANCHE,
    networkType,
    symbol: 'AVAX',
    decimals: 18,
    gasMultiplier: 1.2,
    confirmationBlocks: 3
  });
};

// zkSync Mainnet & Testnet
export const ZkSyncTransactionBuilder = (networkType: 'mainnet' | 'testnet' = 'mainnet') => {
  const configs = {
    mainnet: { chainId: 324, chainName: 'zkSync Era', rpcUrl: import.meta.env.VITE_ZKSYNC_RPC_URL },
    testnet: { chainId: 300, chainName: 'zkSync Sepolia', rpcUrl: import.meta.env.VITE_ZKSYNC_SEPOLIA_RPC_URL }
  };
  
  const config = configs[networkType];
  return new EVMTransactionBuilder({
    ...config,
    chainType: ChainType.ZKSYNC,
    networkType,
    symbol: 'ETH',
    decimals: 18,
    gasMultiplier: 1.3,
    confirmationBlocks: 1
  });
};

// ============================================================================
// MAIN TRANSACTION BUILDER SERVICE
// ============================================================================

export class TransactionBuilderService {
  private static instance: TransactionBuilderService;
  private builders: Map<string, EVMTransactionBuilder>;

  constructor() {
    this.builders = new Map();
  }

  static getInstance(): TransactionBuilderService {
    if (!TransactionBuilderService.instance) {
      TransactionBuilderService.instance = new TransactionBuilderService();
    }
    return TransactionBuilderService.instance;
  }

  getBuilder(chainType: ChainType, networkType: 'mainnet' | 'testnet' = 'mainnet'): EVMTransactionBuilder {
    const key = `${chainType}_${networkType}`;
    
    if (!this.builders.has(key)) {
      let builder: EVMTransactionBuilder;
      
      switch (chainType) {
        case ChainType.ETHEREUM:
          builder = EthereumTransactionBuilder(networkType);
          break;
        case ChainType.POLYGON:
          builder = PolygonTransactionBuilder(networkType);
          break;
        case ChainType.ARBITRUM:
          builder = ArbitrumTransactionBuilder(networkType);
          break;
        case ChainType.OPTIMISM:
          builder = OptimismTransactionBuilder(networkType);
          break;
        case ChainType.BASE:
          builder = BaseTransactionBuilder(networkType);
          break;
        case ChainType.BSC:
          builder = BSCTransactionBuilder(networkType);
          break;
        case ChainType.AVALANCHE:
          builder = AvalancheTransactionBuilder(networkType);
          break;
        case ChainType.ZKSYNC:
          builder = ZkSyncTransactionBuilder(networkType);
          break;
        default:
          throw new Error(`Unsupported chain type: ${chainType}`);
      }
      
      this.builders.set(key, builder);
    }
    
    return this.builders.get(key)!;
  }

  // Convenience methods for common operations
  async estimateGas(chainType: ChainType, tx: TransactionRequest, networkType?: 'mainnet' | 'testnet'): Promise<GasEstimate> {
    const builder = this.getBuilder(chainType, networkType);
    return builder.estimateGas(tx);
  }

  async signTransaction(chainType: ChainType, tx: TransactionRequest, privateKey: string, networkType?: 'mainnet' | 'testnet'): Promise<SignedTransaction> {
    const builder = this.getBuilder(chainType, networkType);
    return builder.signTransaction(tx, privateKey);
  }

  async broadcastTransaction(chainType: ChainType, signedTx: SignedTransaction, networkType?: 'mainnet' | 'testnet'): Promise<BroadcastResult> {
    const builder = this.getBuilder(chainType, networkType);
    return builder.broadcastTransaction(signedTx);
  }
}

// Export singleton instance
export const transactionBuilder = TransactionBuilderService.getInstance();
// ============================================================================
// NON-EVM TRANSACTION BUILDERS INTEGRATION
// ============================================================================

import { getBitcoinTransactionBuilder } from './BitcoinTransactionBuilder';
import { getSolanaTransactionBuilder } from './SolanaTransactionBuilder';
import { getAptosTransactionBuilder } from './AptosTransactionBuilder';
import { getSuiTransactionBuilder } from './SuiTransactionBuilder';
import { getNearTransactionBuilder } from './NearTransactionBuilder';
import { getInjectiveTransactionBuilder } from './InjectiveTransactionBuilder';

// ============================================================================
// ENHANCED TRANSACTION BUILDER SERVICE WITH ALL CHAINS
// ============================================================================

export class UniversalTransactionBuilderService {
  private static instance: UniversalTransactionBuilderService;
  private evmBuilders: Map<string, EVMTransactionBuilder>;
  private nonEvmBuilders: Map<string, any>;

  constructor() {
    this.evmBuilders = new Map();
    this.nonEvmBuilders = new Map();
  }

  static getInstance(): UniversalTransactionBuilderService {
    if (!UniversalTransactionBuilderService.instance) {
      UniversalTransactionBuilderService.instance = new UniversalTransactionBuilderService();
    }
    return UniversalTransactionBuilderService.instance;
  }

  /**
   * Get transaction builder for any supported chain type
   */
  getBuilder(chainType: ChainType, networkType: 'mainnet' | 'testnet' | 'devnet' = 'mainnet'): any {
    const key = `${chainType}_${networkType}`;
    
    // Handle EVM chains
    if (this.isEVMChain(chainType)) {
      if (!this.evmBuilders.has(key)) {
        let builder: EVMTransactionBuilder;
        
        switch (chainType) {
          case ChainType.ETHEREUM:
            builder = EthereumTransactionBuilder(networkType as 'mainnet' | 'testnet');
            break;
          case ChainType.POLYGON:
            builder = PolygonTransactionBuilder(networkType as 'mainnet' | 'testnet');
            break;
          case ChainType.ARBITRUM:
            builder = ArbitrumTransactionBuilder(networkType as 'mainnet' | 'testnet');
            break;
          case ChainType.OPTIMISM:
            builder = OptimismTransactionBuilder(networkType as 'mainnet' | 'testnet');
            break;
          case ChainType.BASE:
            builder = BaseTransactionBuilder(networkType as 'mainnet' | 'testnet');
            break;
          case ChainType.BSC:
            builder = BSCTransactionBuilder(networkType as 'mainnet' | 'testnet');
            break;
          case ChainType.AVALANCHE:
            builder = AvalancheTransactionBuilder(networkType as 'mainnet' | 'testnet');
            break;
          case ChainType.ZKSYNC:
            builder = ZkSyncTransactionBuilder(networkType as 'mainnet' | 'testnet');
            break;
          default:
            throw new Error(`Unsupported EVM chain type: ${chainType}`);
        }
        
        this.evmBuilders.set(key, builder);
      }
      
      return this.evmBuilders.get(key)!;
    }
    
    // Handle non-EVM chains
    if (!this.nonEvmBuilders.has(key)) {
      let builder: any;
      
      switch (chainType) {
        case ChainType.BITCOIN:
          builder = getBitcoinTransactionBuilder(networkType as 'mainnet' | 'testnet');
          break;
        case ChainType.SOLANA:
          // Map 'mainnet' to 'mainnet-beta' for Solana
          const solanaNetwork = networkType === 'mainnet' ? 'mainnet-beta' : (networkType as 'devnet' | 'testnet');
          builder = getSolanaTransactionBuilder(solanaNetwork);
          break;
        case ChainType.APTOS:
          builder = getAptosTransactionBuilder(networkType as 'mainnet' | 'testnet');
          break;
        case ChainType.SUI:
          builder = getSuiTransactionBuilder(networkType as 'mainnet' | 'testnet');
          break;
        case ChainType.NEAR:
          builder = getNearTransactionBuilder(networkType as 'mainnet' | 'testnet');
          break;
        case ChainType.INJECTIVE:
          builder = getInjectiveTransactionBuilder(networkType as 'mainnet' | 'testnet');
          break;
        default:
          throw new Error(`Unsupported non-EVM chain type: ${chainType}`);
      }
      
      this.nonEvmBuilders.set(key, builder);
    }
    
    return this.nonEvmBuilders.get(key)!;
  }

  /**
   * Universal gas estimation for any chain
   */
  async estimateGas(chainType: ChainType, tx: any, networkType?: 'mainnet' | 'testnet' | 'devnet'): Promise<any> {
    const builder = this.getBuilder(chainType, networkType);
    return builder.estimateGas(tx);
  }

  /**
   * Universal transaction signing for any chain
   */
  async signTransaction(chainType: ChainType, tx: any, privateKey: string, networkType?: 'mainnet' | 'testnet' | 'devnet'): Promise<any> {
    const builder = this.getBuilder(chainType, networkType);
    return builder.signTransaction(tx, privateKey);
  }

  /**
   * Universal transaction broadcasting for any chain
   */
  async broadcastTransaction(chainType: ChainType, signedTx: any, networkType?: 'mainnet' | 'testnet' | 'devnet'): Promise<any> {
    const builder = this.getBuilder(chainType, networkType);
    return builder.broadcastTransaction(signedTx);
  }

  /**
   * Universal balance checking for any chain
   */
  async getBalance(chainType: ChainType, address: string, networkType?: 'mainnet' | 'testnet' | 'devnet'): Promise<string | number> {
    const builder = this.getBuilder(chainType, networkType);
    return builder.getBalance(address);
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): ChainType[] {
    return [
      // EVM Chains
      ChainType.ETHEREUM,
      ChainType.POLYGON,
      ChainType.ARBITRUM,
      ChainType.OPTIMISM,
      ChainType.BASE,
      ChainType.BSC,
      ChainType.AVALANCHE,
      ChainType.ZKSYNC,
      
      // Non-EVM Chains
      ChainType.BITCOIN,
      ChainType.SOLANA,
      ChainType.APTOS,
      ChainType.SUI,
      ChainType.NEAR,
      ChainType.INJECTIVE,
    ];
  }

  /**
   * Get supported network types for a chain
   */
  getSupportedNetworks(chainType: ChainType): ('mainnet' | 'testnet' | 'devnet')[] {
    switch (chainType) {
      case ChainType.SOLANA:
        return ['mainnet', 'devnet'];
      default:
        return ['mainnet', 'testnet'];
    }
  }

  /**
   * Check if chain is EVM compatible
   */
  private isEVMChain(chainType: ChainType): boolean {
    const evmChains = [
      ChainType.ETHEREUM, ChainType.POLYGON, ChainType.OPTIMISM,
      ChainType.ARBITRUM, ChainType.BASE, ChainType.BSC,
      ChainType.ZKSYNC, ChainType.AVALANCHE
    ];
    return evmChains.includes(chainType);
  }
}

// Export universal service instance
export const universalTransactionBuilder = UniversalTransactionBuilderService.getInstance();

// Export legacy service for backward compatibility (single declaration)
export const legacyTransactionBuilder = TransactionBuilderService.getInstance();

// ============================================================================
// CONVENIENCE FUNCTIONS FOR ALL CHAINS
// ============================================================================

/**
 * Quick transaction creation for any chain
 */
export async function createTransaction(
  chainType: ChainType,
  tx: any,
  privateKey: string,
  networkType?: 'mainnet' | 'testnet' | 'devnet'
) {
  const builder = universalTransactionBuilder.getBuilder(chainType, networkType);
  const gasEstimate = await builder.estimateGas(tx);
  const signedTx = await builder.signTransaction(tx, privateKey);
  const result = await builder.broadcastTransaction(signedTx);
  
  return {
    gasEstimate,
    signedTx,
    result,
  };
}

/**
 * Quick balance check for any chain
 */
export async function getAccountBalance(
  chainType: ChainType,
  address: string,
  networkType?: 'mainnet' | 'testnet' | 'devnet'
) {
  return universalTransactionBuilder.getBalance(chainType, address, networkType);
}

// ============================================================================
// TYPE EXPORTS FOR ALL CHAINS  
// ============================================================================

// EVM Types are already defined in this file
// Export types directly without circular references

export type {
  // Bitcoin Types
  BitcoinTransactionRequest,
  BitcoinGasEstimate,
  BitcoinSignedTransaction,
  BitcoinBroadcastResult,
  BitcoinUTXO,
} from './BitcoinTransactionBuilder';

export type {
  // Solana Types
  SolanaTransactionRequest,
  SolanaGasEstimate,
  SolanaSignedTransaction,
  SolanaBroadcastResult,
} from './SolanaTransactionBuilder';

export type {
  // Aptos Types
  AptosTransactionRequest,
  AptosGasEstimate,
  AptosSignedTransaction,
  AptosBroadcastResult,
} from './AptosTransactionBuilder';

export type {
  // Sui Types
  SuiTransactionRequest,
  SuiGasEstimate,
  SuiSignedTransaction,
  SuiBroadcastResult,
} from './SuiTransactionBuilder';

export type {
  // NEAR Types
  NearTransactionRequest,
  NearGasEstimate,
  NearSignedTransaction,
  NearBroadcastResult,
} from './NearTransactionBuilder';

export type {
  // Injective Types
  InjectiveTransactionRequest,
  InjectiveGasEstimate,
  InjectiveSignedTransaction,
  InjectiveBroadcastResult,
} from './InjectiveTransactionBuilder';

// Re-export ChainType from AddressUtils
export { ChainType } from '../AddressUtils';
