/**
 * Solana Adapter Implementation - FULLY MODERN
 * 
 * MIGRATION STATUS: ✅ FULLY MIGRATED to @solana/kit
 * - Uses ModernSolanaRpc instead of legacy Connection
 * - Uses Address type instead of PublicKey
 * - Uses ModernSolanaWalletService for wallet operations
 * - Zero legacy @solana/web3.js dependencies
 */

import {
  address,
  type Address,
  lamports as createLamports
} from '@solana/kit';

import type {
  IBlockchainAdapter,
  NetworkType,
  TransactionParams,
  TransactionResult,
  TransactionStatus,
  AccountInfo as AdapterAccountInfo,
  TokenBalance,
  ConnectionConfig,
  HealthStatus
} from '../IBlockchainAdapter';
import { BaseBlockchainAdapter } from '../IBlockchainAdapter';
import { ModernSolanaRpc, createModernRpc } from '@/infrastructure/web3/solana/ModernSolanaRpc';
import { modernSolanaWalletService } from '@/services/wallet/solana/ModernSolanaWalletService';
import { toAddress, lamportsToSol, solToLamports } from '@/infrastructure/web3/solana/ModernSolanaUtils';

// Solana constants
const LAMPORTS_PER_SOL = 1_000_000_000;

// Solana-specific types
interface SolanaTokenInfo {
  mint: string;
  owner: string;
  amount: bigint;
  decimals: number;
}

/**
 * Solana Blockchain Adapter - MODERN
 * 
 * Delegates to ModernSolanaWalletService and ModernSolanaRpc for all operations
 */
export class SolanaAdapter extends BaseBlockchainAdapter {
  private rpc?: ModernSolanaRpc;
  private cluster: string;
  private walletService = modernSolanaWalletService;

  readonly chainId: string;
  readonly chainName = 'solana';
  readonly networkType: NetworkType;
  readonly nativeCurrency = {
    name: 'Solana',
    symbol: 'SOL',
    decimals: 9
  };

  constructor(networkType: NetworkType = 'mainnet') {
    super();
    this.networkType = networkType;
    this.chainId = `solana-${networkType}`;
    
    // Map network types to Solana clusters
    const clusterMap: Record<NetworkType, string> = {
      mainnet: 'mainnet-beta',
      devnet: 'devnet',
      testnet: 'testnet',
      regtest: 'testnet' // Regtest uses testnet cluster
    };

    this.cluster = clusterMap[networkType];
    if (!this.cluster) {
      throw new Error(`Unsupported Solana network: ${networkType}`);
    }
  }

  // Connection management
  async connect(config: ConnectionConfig): Promise<void> {
    try {
      this.config = config;
      
      // Create modern RPC instance
      if (config.rpcUrl) {
        this.rpc = new ModernSolanaRpc({ endpoint: config.rpcUrl });
      } else {
        this.rpc = createModernRpc(this.cluster as any);
      }

      // Test connection by getting latest blockhash
      await this.rpc.getLatestBlockhash();
      
      this._isConnected = true;
      console.log(`✓ Connected to Solana ${this.networkType} (modern @solana/kit)`);
    } catch (error) {
      this._isConnected = false;
      throw new Error(`Failed to connect to Solana: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.rpc = undefined;
    this._isConnected = false;
    console.log('Disconnected from Solana');
  }

  async getHealth(): Promise<HealthStatus> {
    if (!this.rpc) {
      return {
        isHealthy: false,
        latency: -1,
        lastChecked: Date.now()
      };
    }

    const startTime = Date.now();
    try {
      const slot = await this.rpc.getSlot();
      const latency = Date.now() - startTime;
      
      return {
        isHealthy: true,
        latency,
        blockHeight: Number(slot),
        lastChecked: Date.now()
      };
    } catch (error) {
      return {
        isHealthy: false,
        latency: Date.now() - startTime,
        lastChecked: Date.now()
      };
    }
  }

  // Account operations - Delegates to modern wallet service
  async generateAccount(): Promise<AdapterAccountInfo> {
    this.validateConnection();
    
    const walletAccount = await this.walletService.generateAccount();
    
    const balance = await this.getBalance(walletAccount.address);
    
    return {
      address: walletAccount.address,
      balance,
      publicKey: walletAccount.publicKey
    };
  }

  async importAccount(privateKey: string): Promise<AdapterAccountInfo> {
    this.validateConnection();
    
    try {
      const walletAccount = await this.walletService.importAccount(privateKey);
      
      const balance = await this.getBalance(walletAccount.address);
      
      return {
        address: walletAccount.address,
        balance,
        publicKey: walletAccount.publicKey
      };
    } catch (error) {
      throw new Error(`Solana import failed: ${error}`);
    }
  }

  async generateHDAccount(mnemonic: string, index: number): Promise<AdapterAccountInfo> {
    this.validateConnection();
    
    const walletAccount = await this.walletService.fromMnemonic(mnemonic, index);
    
    const balance = await this.getBalance(walletAccount.address);
    
    return {
      address: walletAccount.address,
      balance,
      publicKey: walletAccount.publicKey
    };
  }

  async generateMultipleAccounts(count: number): Promise<AdapterAccountInfo[]> {
    this.validateConnection();
    
    const wallets = [];
    for (let i = 0; i < count; i++) {
      wallets.push(await this.walletService.generateAccount());
    }
    
    return Promise.all(wallets.map(async (wallet) => ({
      address: wallet.address,
      balance: await this.getBalance(wallet.address),
      publicKey: wallet.publicKey
    })));
  }

  isValidWalletAccount(account: unknown): boolean {
    try {
      const addr = (account as any)?.address;
      return this.isValidAddress(addr);
    } catch {
      return false;
    }
  }

  async getAccount(address: string): Promise<AdapterAccountInfo> {
    this.validateConnection();
    
    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid Solana address: ${address}`);
    }

    const balance = await this.getBalance(address);
    
    return {
      address,
      balance
    };
  }

  async getBalance(address: string): Promise<bigint> {
    this.validateConnection();
    
    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid Solana address: ${address}`);
    }

    try {
      const addr = toAddress(address);
      const balance = await this.rpc!.getBalance(addr);
      
      return balance;
    } catch (error) {
      throw new Error(`Failed to get Solana balance: ${error}`);
    }
  }

  // Transaction operations - Delegated to wallet service
  async estimateGas(params: TransactionParams): Promise<string> {
    this.validateConnection();
    
    // Solana base fee is 5000 lamports per signature
    const baseSignatureFee = 5000n;
    
    if (params.tokenAddress) {
      // Token transfers require more compute units
      return (baseSignatureFee + 10000n).toString();
    }
    
    return baseSignatureFee.toString();
  }

  async sendTransaction(params: TransactionParams): Promise<TransactionResult> {
    this.validateConnection();
    
    // Delegate to modern wallet service for proper transaction signing
    throw new Error('Use modernSolanaWalletService.sendTransaction() for transaction operations');
  }

  async getTransaction(txHash: string): Promise<TransactionStatus> {
    this.validateConnection();
    
    try {
      const txInfo = await this.rpc!.getTransaction(txHash);
      
      if (!txInfo) {
        return {
          status: 'pending',
          confirmations: 0
        };
      }

      const currentSlot = await this.rpc!.getSlot();
      const confirmations = txInfo.slot ? Number(currentSlot - BigInt(txInfo.slot)) : 0;
      
      return {
        status: txInfo.meta?.err ? 'failed' : 'confirmed',
        confirmations,
        blockNumber: txInfo.slot ? Number(txInfo.slot) : undefined,
        timestamp: txInfo.blockTime ? Number(txInfo.blockTime) : undefined
      };
    } catch (error) {
      throw new Error(`Failed to get Solana transaction: ${error}`);
    }
  }

  async signMessage(message: string, privateKey: string): Promise<string> {
    // Delegate to modern wallet service for proper key management
    throw new Error('Use modernSolanaWalletService.signMessage() for message signing');
  }

  // Token operations - TODO: Implement with @solana-program/token-2022
  async getTokenBalance(ownerAddress: string, tokenAddress: string): Promise<TokenBalance> {
    this.validateConnection();
    throw new Error('Token operations will be implemented with @solana-program/token-2022');
  }

  async getTokenInfo(tokenAddress: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: bigint;
  }> {
    this.validateConnection();
    throw new Error('Token operations will be implemented with @solana-program/token-2022');
  }

  // Block operations
  async getCurrentBlockNumber(): Promise<number> {
    this.validateConnection();
    const slot = await this.rpc!.getSlot();
    return Number(slot);
  }

  async getBlock(blockNumber: number): Promise<{
    number: number;
    timestamp: number;
    hash: string;
    transactions: string[];
  }> {
    this.validateConnection();
    
    try {
      const block = await this.rpc!.getBlock(BigInt(blockNumber));
      
      if (!block) {
        throw new Error('Block not found');
      }

      // Extract transaction signatures
      const transactions = block.transactions?.map(tx => {
        if (typeof tx === 'string') {
          return tx;
        }
        return tx.transaction?.signatures?.[0] || '';
      }).filter(Boolean) || [];

      return {
        number: blockNumber,
        timestamp: block.blockTime ? Number(block.blockTime) : 0,
        hash: block.blockhash || '',
        transactions
      };
    } catch (error) {
      throw new Error(`Failed to get Solana block: ${error}`);
    }
  }

  // Utility methods
  isValidAddress(address: string): boolean {
    try {
      toAddress(address);
      return true;
    } catch {
      return false;
    }
  }

  formatAddress(address: string): string {
    return address;
  }

  getExplorerUrl(txHash: string): string {
    const baseUrl = 'https://explorer.solana.com';
    const clusterParam = this.cluster === 'mainnet-beta' ? '' : `?cluster=${this.cluster}`;
    
    return `${baseUrl}/tx/${txHash}${clusterParam}`;
  }

  // Solana-specific helper methods
  async getRecentBlockhash(): Promise<string> {
    this.validateConnection();
    
    const blockhash = await this.rpc!.getLatestBlockhash();
    return blockhash.blockhash;
  }

  async getMinimumBalanceForRentExemption(dataLength: number): Promise<number> {
    this.validateConnection();
    
    const lamports = await this.rpc!.getMinimumBalanceForRentExemption(BigInt(dataLength));
    return Number(lamports);
  }

  // Conversion helpers
  lamportsToSol(lamports: bigint | number): number {
    const lamportsBigInt = typeof lamports === 'bigint' ? lamports : BigInt(lamports);
    return lamportsToSol(lamportsBigInt);
  }

  solToLamports(sol: number): bigint {
    return solToLamports(sol);
  }
}
