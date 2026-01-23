/**
 * Modern Solana Wallet Service
 * 
 * MIGRATION STATUS: ✅ MODERN (@solana/kit + @solana/client)
 * Replaces legacy SolanaWalletService with modern RPC and types
 * 
 * Uses:
 * - ModernSolanaRpc for network operations
 * - ModernSolanaWalletGenerator for wallet generation
 * - Modern utilities for helpers
 */

import { ModernSolanaRpc, type ModernRpcConfig } from '@/infrastructure/web3/solana/ModernSolanaRpc';
import { ModernSolanaWalletGenerator } from '../generators/ModernSolanaWalletGenerator';
import type { Wallet } from '../WalletGenerator';

// Re-export types for convenience
export interface SolanaAccountInfo {
  address: string;
  publicKey: string;
  privateKey?: string;
  secretKey?: Uint8Array;
  mnemonic?: string;
  balance?: string;
}

export interface SolanaGenerationOptions {
  includePrivateKey?: boolean;
  includeSecretKey?: boolean;
  includeMnemonic?: boolean;
  derivationPath?: string;
  entropy?: string;
}

export interface SolanaEncryptedWallet {
  encryptedData: string;
  address: string;
  publicKey: string;
}

export interface SolanaNetworkInfo {
  name: string;
  endpoint: string;
  isConnected: boolean;
  commitment: 'processed' | 'confirmed' | 'finalized';
}

/**
 * Modern Solana Wallet Service
 * Uses @solana/kit for all operations
 */
export class ModernSolanaWalletService {
  private rpc: ModernSolanaRpc;
  private network: 'mainnet-beta' | 'devnet' | 'testnet';
  private endpoint: string;
  private commitment: 'processed' | 'confirmed' | 'finalized';
  private generator: ModernSolanaWalletGenerator;

  constructor(
    network: 'mainnet-beta' | 'testnet' | 'devnet' = 'mainnet-beta',
    customEndpoint?: string
  ) {
    this.network = network;
    this.commitment = 'confirmed';
    
    // Set endpoint
    this.endpoint = customEndpoint || this.getDefaultEndpoint(network);
    
    // Create modern RPC
    this.rpc = new ModernSolanaRpc({
      endpoint: this.endpoint,
      commitment: this.commitment
    });

    // Create wallet generator
    this.generator = new ModernSolanaWalletGenerator();
  }

  /**
   * Get default RPC endpoint for network
   */
  private getDefaultEndpoint(network: 'mainnet-beta' | 'devnet' | 'testnet'): string {
    const endpoints = {
      'mainnet-beta': process.env.VITE_SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'devnet': process.env.VITE_SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
      'testnet': process.env.VITE_SOLANA_TESTNET_RPC_URL || 'https://api.testnet.solana.com'
    };
    return endpoints[network];
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Get connection status and network information
   */
  async getNetworkInfo(): Promise<SolanaNetworkInfo> {
    try {
      // Test connection with a simple request
      await this.rpc.getLatestBlockhash();
      
      return {
        name: this.network,
        endpoint: this.endpoint,
        isConnected: true,
        commitment: this.commitment
      };
    } catch (error) {
      return {
        name: this.network,
        endpoint: this.endpoint,
        isConnected: false,
        commitment: this.commitment
      };
    }
  }

  /**
   * Update connection settings
   */
  updateConnection(
    network: 'mainnet-beta' | 'testnet' | 'devnet',
    customEndpoint?: string
  ): void {
    this.network = network;
    this.endpoint = customEndpoint || this.getDefaultEndpoint(network);
    this.rpc = new ModernSolanaRpc({
      endpoint: this.endpoint,
      commitment: this.commitment
    });
  }

  /**
   * Set commitment level
   */
  setCommitment(commitment: 'processed' | 'confirmed' | 'finalized'): void {
    this.commitment = commitment;
    this.rpc = new ModernSolanaRpc({
      endpoint: this.endpoint,
      commitment: commitment
    });
  }

  /**
   * Get RPC instance
   */
  getRpc(): ModernSolanaRpc {
    return this.rpc;
  }

  // ============================================================================
  // WALLET GENERATION (Delegates to ModernSolanaWalletGenerator)
  // ============================================================================

  /**
   * Generate a new Solana account
   */
  generateAccount(options: SolanaGenerationOptions = {}): SolanaAccountInfo {
    try {
      const wallet = this.generator.generateWallet(options);
      return this.convertWalletToAccountInfo(wallet, options);
    } catch (error) {
      throw new Error(`Failed to generate Solana account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple Solana accounts at once
   */
  async generateMultipleAccounts(
    count: number, 
    options: SolanaGenerationOptions = {}
  ): Promise<SolanaAccountInfo[]> {
    const wallets = await this.generator.generateMultiple(count, options);
    return wallets.map(wallet => this.convertWalletToAccountInfo(wallet, options));
  }

  /**
   * Import an existing account using private key
   */
  async importAccount(privateKey: string, options: SolanaGenerationOptions = {}): Promise<SolanaAccountInfo> {
    try {
      const wallet = await this.generator.fromPrivateKey(privateKey);
      const accountInfo = this.convertWalletToAccountInfo(wallet, options);
      
      // Try to fetch balance
      try {
        accountInfo.balance = await this.getBalance(accountInfo.address);
      } catch (balanceError) {
        console.warn(`Could not fetch balance for ${accountInfo.address}:`, balanceError);
        accountInfo.balance = '0';
      }
      
      return accountInfo;
    } catch (error) {
      throw new Error(`Invalid Solana private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Import account from secret key (Uint8Array)
   */
  async importFromSecretKey(secretKey: Uint8Array, options: SolanaGenerationOptions = {}): Promise<SolanaAccountInfo> {
    try {
      const wallet = await this.generator.fromSecretKey(secretKey);
      const accountInfo = this.convertWalletToAccountInfo(wallet, options);
      
      // Try to fetch balance
      try {
        accountInfo.balance = await this.getBalance(accountInfo.address);
      } catch (balanceError) {
        console.warn(`Could not fetch balance for ${accountInfo.address}:`, balanceError);
        accountInfo.balance = '0';
      }
      
      return accountInfo;
    } catch (error) {
      throw new Error(`Invalid Solana secret key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from private key (alias for consistency)
   */
  fromPrivateKey(privateKey: string, options: SolanaGenerationOptions = {}): SolanaAccountInfo {
    try {
      const wallet = this.generator.fromPrivateKey(privateKey);
      return this.convertWalletToAccountInfo(wallet, options);
    } catch (error) {
      throw new Error(`Invalid Solana private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from secret key (alias for consistency)
   */
  fromSecretKey(secretKey: Uint8Array, options: SolanaGenerationOptions = {}): SolanaAccountInfo {
    try {
      const wallet = this.generator.fromSecretKey(secretKey);
      return this.convertWalletToAccountInfo(wallet, options);
    } catch (error) {
      throw new Error(`Invalid Solana secret key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate mnemonic phrase
   */
  generateMnemonic(): string {
    return this.generator.generateMnemonic();
  }

  /**
   * Create account from mnemonic phrase
   */
  fromMnemonic(
    mnemonic: string,
    derivationIndex: number = 0,
    options: SolanaGenerationOptions = {}
  ): SolanaAccountInfo {
    try {
      const wallet = this.generator.fromMnemonic(mnemonic, derivationIndex);
      return this.convertWalletToAccountInfo(wallet, options);
    } catch (error) {
      throw new Error(`Invalid mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate HD wallets from mnemonic
   */
  async generateHDWallets(
    mnemonic: string,
    numWallets: number = 1,
    options: SolanaGenerationOptions = {}
  ): Promise<SolanaAccountInfo[]> {
    const wallets = await this.generator.generateHDWallets(mnemonic, numWallets);
    return wallets.map((wallet, index) => {
      const accountInfo = this.convertWalletToAccountInfo(wallet, options);
      if (options.includeMnemonic && index === 0) {
        accountInfo.mnemonic = mnemonic;
      }
      return accountInfo;
    });
  }

  /**
   * Restore account from mnemonic
   */
  restoreFromMnemonic(mnemonic: string, index: number = 0): SolanaAccountInfo {
    try {
      const wallet = this.generator.fromMnemonic(mnemonic, index);
      return this.convertWalletToAccountInfo(wallet, {
        includePrivateKey: true,
        includeSecretKey: true,
        includeMnemonic: true
      });
    } catch (error) {
      throw new Error(`Failed to restore from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // WALLET ENCRYPTION
  // ============================================================================

  /**
   * Encrypt wallet for secure storage
   */
  async encryptWallet(
    account: SolanaAccountInfo, 
    password: string
  ): Promise<SolanaEncryptedWallet> {
    try {
      if (!account.privateKey && !account.secretKey) {
        throw new Error('Private key or secret key required for encryption');
      }

      const data = {
        privateKey: account.privateKey,
        secretKey: account.secretKey ? Array.from(account.secretKey) : undefined,
        publicKey: account.publicKey,
        mnemonic: account.mnemonic
      };

      // Simplified encryption - in production use proper crypto
      const encryptedData = Buffer.from(JSON.stringify(data)).toString('base64');
      
      return {
        encryptedData,
        address: account.address,
        publicKey: account.publicKey
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Decrypt wallet from storage
   */
  async decryptWallet(
    encryptedWallet: SolanaEncryptedWallet, 
    password: string
  ): Promise<SolanaAccountInfo> {
    try {
      // Simplified decryption - in production use proper crypto
      const dataString = Buffer.from(encryptedWallet.encryptedData, 'base64').toString();
      const data = JSON.parse(dataString);
      
      return {
        address: encryptedWallet.address,
        publicKey: encryptedWallet.publicKey,
        privateKey: data.privateKey,
        secretKey: data.secretKey ? new Uint8Array(data.secretKey) : undefined,
        mnemonic: data.mnemonic
      };
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // VALIDATION AND UTILITY
  // ============================================================================

  /**
   * Validate Solana address
   */
  isValidAddress(address: string): boolean {
    return this.generator.validateAddress(address);
  }

  /**
   * Validate private key
   */
  isValidPrivateKey(privateKey: string): boolean {
    return this.generator.validatePrivateKey(privateKey);
  }

  /**
   * Validate secret key
   */
  isValidSecretKey(secretKey: Uint8Array): boolean {
    return this.generator.validateSecretKey(secretKey);
  }

  /**
   * Validate mnemonic phrase
   */
  isValidMnemonic(mnemonic: string): boolean {
    return this.generator.validateMnemonic(mnemonic);
  }

  // ============================================================================
  // NETWORK OPERATIONS (Using ModernSolanaRpc)
  // ============================================================================

  /**
   * Get account information from network
   */
  async getAccountInfo(address: string): Promise<SolanaAccountInfo | null> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Solana address format');
      }

      const accountInfo = await this.rpc.getAccountInfo(address);
      
      if (!accountInfo) {
        return null; // Account doesn't exist
      }

      const balance = await this.rpc.getBalanceInSol(address);
      
      return {
        address: address,
        publicKey: address,
        balance: balance.toString()
      };
    } catch (error) {
      console.error('Error fetching Solana account info:', error);
      return null;
    }
  }

  /**
   * Check if account exists on network
   */
  async accountExists(address: string): Promise<boolean> {
    try {
      if (!this.isValidAddress(address)) {
        return false;
      }
      
      const accountInfo = await this.rpc.getAccountInfo(address);
      return accountInfo !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get account balance in SOL
   */
  async getBalance(address: string): Promise<string> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Solana address');
      }

      const balance = await this.rpc.getBalanceInSol(address);
      return balance.toString();
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0';
    }
  }

  /**
   * Get recent blockhash
   */
  async getRecentBlockhash(): Promise<string> {
    try {
      const blockhash = await this.rpc.getLatestBlockhash();
      return blockhash.blockhash;
    } catch (error) {
      throw new Error(`Failed to get recent blockhash: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Format address for display
   */
  formatAddress(address: string, show: number = 6): string {
    return this.generator.formatAddress(address, show);
  }

  /**
   * Get explorer URL for address or transaction
   */
  getExplorerUrl(hashOrAddress: string, type: 'tx' | 'address' = 'address'): string {
    return this.generator.getExplorerUrl(hashOrAddress, type);
  }

  /**
   * Get wallet type identifier
   */
  getWalletType(): string {
    return 'solana';
  }

  /**
   * Convert SOL to lamports
   */
  solToLamports(sol: number): bigint {
    return this.generator.solToLamports(sol);
  }

  /**
   * Convert lamports to SOL
   */
  lamportsToSol(lamports: bigint): string {
    return this.generator.lamportsToSol(lamports);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Convert Wallet to SolanaAccountInfo
   */
  private convertWalletToAccountInfo(
    wallet: any,
    options: SolanaGenerationOptions = {}
  ): SolanaAccountInfo {
    const accountInfo: SolanaAccountInfo = {
      address: wallet.address,
      publicKey: wallet.address
    };

    if (options.includePrivateKey !== false && wallet.privateKey) {
      accountInfo.privateKey = wallet.privateKey;
    }

    if (options.includeSecretKey !== false && wallet.secretKey) {
      accountInfo.secretKey = wallet.secretKey;
    }

    if (options.includeMnemonic && wallet.mnemonic) {
      accountInfo.mnemonic = wallet.mnemonic;
    }

    return accountInfo;
  }
}

// Export default instances for convenience
export const modernSolanaWalletService = new ModernSolanaWalletService('mainnet-beta');
export const modernSolanaDevnetWalletService = new ModernSolanaWalletService('devnet');
export const modernSolanaTestnetWalletService = new ModernSolanaWalletService('testnet');

// Export static methods for backward compatibility
export const ModernSolanaWallet = {
  generateAccount: () => modernSolanaWalletService.generateAccount(),
  fromPrivateKey: (privateKey: string) => modernSolanaWalletService.fromPrivateKey(privateKey),
  fromSecretKey: (secretKey: Uint8Array) => modernSolanaWalletService.fromSecretKey(secretKey),
  fromMnemonic: (mnemonic: string) => modernSolanaWalletService.fromMnemonic(mnemonic),
  isValidAddress: (address: string) => modernSolanaWalletService.isValidAddress(address),
  isValidPrivateKey: (privateKey: string) => modernSolanaWalletService.isValidPrivateKey(privateKey)
};
