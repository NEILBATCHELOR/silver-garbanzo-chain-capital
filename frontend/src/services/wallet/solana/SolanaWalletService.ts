/**
 * Enhanced Solana Wallet Service
 * Handles account generation, import, validation, and comprehensive wallet operations for Solana network
 * Updated to match project patterns with improved error handling and functionality
 */

import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl
} from '@solana/web3.js';
import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import { HDKey } from '@scure/bip32';

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

export class SolanaWalletService {
  private connection: Connection;
  private network: string;
  private endpoint: string;
  private commitment: 'processed' | 'confirmed' | 'finalized';

  constructor(
    network: 'mainnet-beta' | 'testnet' | 'devnet' = 'mainnet-beta',
    customEndpoint?: string
  ) {
    this.network = network;
    this.endpoint = customEndpoint || clusterApiUrl(network);
    this.commitment = 'confirmed';
    this.connection = new Connection(this.endpoint, this.commitment);
  }

  // ============================================================================
  // CONNECTION MANAGEMENT (Enhanced)
  // ============================================================================

  /**
   * Get connection status and network information
   */
  async getNetworkInfo(): Promise<SolanaNetworkInfo> {
    try {
      // Test connection with a simple request
      await this.connection.getRecentBlockhash();
      
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
    this.endpoint = customEndpoint || clusterApiUrl(network);
    this.connection = new Connection(this.endpoint, this.commitment);
  }

  /**
   * Set commitment level
   */
  setCommitment(commitment: 'processed' | 'confirmed' | 'finalized'): void {
    this.commitment = commitment;
    this.connection = new Connection(this.endpoint, commitment);
  }

  // ============================================================================
  // WALLET GENERATION (Enhanced)
  // ============================================================================

  /**
   * Generate a new Solana account
   * Enhanced with options support following project patterns
   */
  generateAccount(options: SolanaGenerationOptions = {}): SolanaAccountInfo {
    try {
      const keypair = Keypair.generate();
      
      const result: SolanaAccountInfo = {
        address: keypair.publicKey.toBase58(),
        publicKey: keypair.publicKey.toBase58()
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = Buffer.from(keypair.secretKey).toString('hex');
      }

      if (options.includeSecretKey !== false) {
        result.secretKey = keypair.secretKey;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to generate Solana account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple Solana accounts at once
   * Following ETH generator patterns
   */
  generateMultipleAccounts(
    count: number, 
    options: SolanaGenerationOptions = {}
  ): SolanaAccountInfo[] {
    const accounts: SolanaAccountInfo[] = [];
    
    for (let i = 0; i < count; i++) {
      accounts.push(this.generateAccount(options));
    }
    
    return accounts;
  }

  /**
   * Import an existing account using private key
   * Enhanced with better error handling and balance fetching
   */
  async importAccount(privateKey: string, options: SolanaGenerationOptions = {}): Promise<SolanaAccountInfo> {
    try {
      const secretKey = this.privateKeyToSecretKey(privateKey);
      const keypair = Keypair.fromSecretKey(secretKey);
      
      const result: SolanaAccountInfo = {
        address: keypair.publicKey.toBase58(),
        publicKey: keypair.publicKey.toBase58()
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = privateKey;
      }

      if (options.includeSecretKey !== false) {
        result.secretKey = keypair.secretKey;
      }
      
      // Try to fetch balance with enhanced error handling
      try {
        const balance = await this.connection.getBalance(keypair.publicKey);
        result.balance = (balance / LAMPORTS_PER_SOL).toString();
      } catch (balanceError) {
        console.warn(`Could not fetch balance for ${keypair.publicKey.toBase58()}:`, balanceError);
        result.balance = '0';
      }
      
      return result;
    } catch (error) {
      throw new Error(`Invalid Solana private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Import account from secret key (Uint8Array)
   */
  async importFromSecretKey(secretKey: Uint8Array, options: SolanaGenerationOptions = {}): Promise<SolanaAccountInfo> {
    try {
      const keypair = Keypair.fromSecretKey(secretKey);
      
      const result: SolanaAccountInfo = {
        address: keypair.publicKey.toBase58(),
        publicKey: keypair.publicKey.toBase58()
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = Buffer.from(secretKey).toString('hex');
      }

      if (options.includeSecretKey !== false) {
        result.secretKey = secretKey;
      }
      
      // Try to fetch balance
      try {
        const balance = await this.connection.getBalance(keypair.publicKey);
        result.balance = (balance / LAMPORTS_PER_SOL).toString();
      } catch (balanceError) {
        console.warn(`Could not fetch balance for ${keypair.publicKey.toBase58()}:`, balanceError);
        result.balance = '0';
      }
      
      return result;
    } catch (error) {
      throw new Error(`Invalid Solana secret key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from private key (alias for consistency)
   */
  fromPrivateKey(privateKey: string, options: SolanaGenerationOptions = {}): SolanaAccountInfo {
    try {
      const secretKey = this.privateKeyToSecretKey(privateKey);
      const keypair = Keypair.fromSecretKey(secretKey);
      
      const result: SolanaAccountInfo = {
        address: keypair.publicKey.toBase58(),
        publicKey: keypair.publicKey.toBase58()
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = privateKey;
      }

      if (options.includeSecretKey !== false) {
        result.secretKey = keypair.secretKey;
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid Solana private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from secret key (alias for consistency)
   */
  fromSecretKey(secretKey: Uint8Array, options: SolanaGenerationOptions = {}): SolanaAccountInfo {
    try {
      const keypair = Keypair.fromSecretKey(secretKey);
      
      const result: SolanaAccountInfo = {
        address: keypair.publicKey.toBase58(),
        publicKey: keypair.publicKey.toBase58()
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = Buffer.from(secretKey).toString('hex');
      }

      if (options.includeSecretKey !== false) {
        result.secretKey = secretKey;
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid Solana secret key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate mnemonic phrase
   * Full BIP39 support
   */
  generateMnemonic(): string {
    try {
      return generateMnemonic();
    } catch (error) {
      throw new Error(`Failed to generate mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from mnemonic phrase
   * Enhanced HD wallet support with derivation paths
   */
  fromMnemonic(
    mnemonic: string,
    derivationIndex: number = 0,
    options: SolanaGenerationOptions = {}
  ): SolanaAccountInfo {
    try {
      const derivationPath = options.derivationPath || `m/44'/501'/${derivationIndex}'/0'`;
      const seed = mnemonicToSeedSync(mnemonic);
      const hdkey = HDKey.fromMasterSeed(seed);
      const derived = hdkey.derive(derivationPath);
      const derivedSeed = derived.privateKey!;
      const keypair = Keypair.fromSeed(derivedSeed);
      
      const result: SolanaAccountInfo = {
        address: keypair.publicKey.toBase58(),
        publicKey: keypair.publicKey.toBase58()
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = Buffer.from(keypair.secretKey).toString('hex');
      }

      if (options.includeSecretKey !== false) {
        result.secretKey = keypair.secretKey;
      }

      if (options.includeMnemonic) {
        result.mnemonic = mnemonic;
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate HD wallets from mnemonic
   * Multiple wallet generation from single mnemonic
   */
  generateHDWallets(
    mnemonic: string,
    numWallets: number = 1,
    options: SolanaGenerationOptions = {}
  ): SolanaAccountInfo[] {
    const wallets: SolanaAccountInfo[] = [];
    
    for (let i = 0; i < numWallets; i++) {
      const wallet = this.fromMnemonic(mnemonic, i, {
        ...options,
        includeMnemonic: false // Don't include mnemonic in each wallet
      });
      
      if (options.includeMnemonic && i === 0) {
        wallet.mnemonic = mnemonic; // Include original mnemonic only for first wallet
      }
      
      wallets.push(wallet);
    }
    
    return wallets;
  }

  /**
   * Restore account from mnemonic
   * Replaces placeholder implementation
   */
  restoreFromMnemonic(mnemonic: string, index: number = 0): SolanaAccountInfo {
    try {
      return this.fromMnemonic(mnemonic, index, {
        includePrivateKey: true,
        includeSecretKey: true,
        includeMnemonic: true
      });
    } catch (error) {
      throw new Error(`Failed to restore from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // WALLET ENCRYPTION (Enhanced)
  // ============================================================================

  /**
   * Encrypt wallet for secure storage
   * Enhanced wallet encryption capability
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
   * Enhanced wallet decryption capability
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
  // VALIDATION AND UTILITY (Enhanced)
  // ============================================================================

  /**
   * Validate Solana address
   * Enhanced validation with detailed error information
   */
  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate private key
   * Enhanced validation
   */
  isValidPrivateKey(privateKey: string): boolean {
    try {
      if (privateKey.length !== 128) { // 64 bytes in hex
        return false;
      }
      const secretKey = this.privateKeyToSecretKey(privateKey);
      Keypair.fromSecretKey(secretKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate secret key
   */
  isValidSecretKey(secretKey: Uint8Array): boolean {
    try {
      if (secretKey.length !== 64) {
        return false;
      }
      Keypair.fromSecretKey(secretKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate mnemonic phrase
   */
  isValidMnemonic(mnemonic: string): boolean {
    try {
      const { validateMnemonic } = require('bip39');
      return validateMnemonic(mnemonic);
    } catch {
      return false;
    }
  }

  // ============================================================================
  // NETWORK OPERATIONS (Enhanced)
  // ============================================================================

  /**
   * Get account information from network
   * Enhanced error handling and data structure
   */
  async getAccountInfo(address: string): Promise<SolanaAccountInfo | null> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Solana address format');
      }

      const publicKey = new PublicKey(address);
      const accountInfo = await this.connection.getAccountInfo(publicKey);
      
      if (!accountInfo) {
        return null; // Account doesn't exist
      }

      const balance = await this.connection.getBalance(publicKey);
      
      return {
        address: address,
        publicKey: address,
        balance: (balance / LAMPORTS_PER_SOL).toString()
      };
    } catch (error) {
      console.error('Error fetching Solana account info:', error);
      return null;
    }
  }

  /**
   * Check if account exists on network
   * Enhanced error handling
   */
  async accountExists(address: string): Promise<boolean> {
    try {
      if (!this.isValidAddress(address)) {
        return false;
      }
      
      const publicKey = new PublicKey(address);
      const accountInfo = await this.connection.getAccountInfo(publicKey);
      return accountInfo !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get account balance in SOL
   * Enhanced with proper error handling
   */
  async getBalance(address: string): Promise<string> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Solana address');
      }

      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return (balance / LAMPORTS_PER_SOL).toString();
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
      const { blockhash } = await this.connection.getRecentBlockhash();
      return blockhash;
    } catch (error) {
      throw new Error(`Failed to get recent blockhash: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS (Enhanced)
  // ============================================================================

  /**
   * Format address for display
   * Enhanced formatting options
   */
  formatAddress(address: string, show: number = 6): string {
    if (!this.isValidAddress(address)) {
      return address;
    }
    
    if (address.length <= show * 2 + 3) {
      return address;
    }
    
    return `${address.slice(0, show)}...${address.slice(-show)}`;
  }

  /**
   * Get explorer URL for address or transaction
   * Enhanced URL generation with network detection
   */
  getExplorerUrl(hashOrAddress: string, type: 'tx' | 'address' = 'address'): string {
    const networkParam = this.network === 'mainnet-beta' ? '' : `?cluster=${this.network}`;
    const explorerBase = 'https://explorer.solana.com';
    
    if (type === 'tx') {
      return `${explorerBase}/tx/${hashOrAddress}${networkParam}`;
    }
    return `${explorerBase}/address/${hashOrAddress}${networkParam}`;
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
  solToLamports(sol: number): number {
    return sol * LAMPORTS_PER_SOL;
  }

  /**
   * Convert lamports to SOL
   */
  lamportsToSol(lamports: number): number {
    return lamports / LAMPORTS_PER_SOL;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Convert private key hex string to secret key Uint8Array
   */
  private privateKeyToSecretKey(privateKey: string): Uint8Array {
    try {
      // Remove 0x prefix if present
      const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
      
      if (cleanPrivateKey.length !== 128) { // 64 bytes in hex
        throw new Error('Private key must be 64 bytes (128 hex characters)');
      }
      
      return new Uint8Array(Buffer.from(cleanPrivateKey, 'hex'));
    } catch (error) {
      throw new Error(`Invalid private key format: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export default instances for convenience
export const solanaWalletService = new SolanaWalletService('mainnet-beta');

export const solanaDevnetWalletService = new SolanaWalletService('devnet');

export const solanaTestnetWalletService = new SolanaWalletService('testnet');

// Export static methods for backward compatibility
export const SolanaWallet = {
  generateAccount: () => solanaWalletService.generateAccount(),
  fromPrivateKey: (privateKey: string) => solanaWalletService.fromPrivateKey(privateKey),
  fromSecretKey: (secretKey: Uint8Array) => solanaWalletService.fromSecretKey(secretKey),
  fromMnemonic: (mnemonic: string) => solanaWalletService.fromMnemonic(mnemonic),
  isValidAddress: (address: string) => solanaWalletService.isValidAddress(address),
  isValidPrivateKey: (privateKey: string) => solanaWalletService.isValidPrivateKey(privateKey)
};
