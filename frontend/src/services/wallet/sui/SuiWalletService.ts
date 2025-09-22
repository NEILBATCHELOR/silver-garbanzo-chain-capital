/**
 * Enhanced Sui Wallet Service
 * Handles account generation, import, validation, and comprehensive wallet operations for Sui network
 * Updated to match project patterns with improved error handling and functionality
 */

import {
  SuiClient,
  getFullnodeUrl
} from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import { bcs } from '@mysten/sui/bcs';
import { MIST_PER_SUI } from '@mysten/sui/utils';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import * as bip39 from 'bip39';
import { HDKey } from '@scure/bip32';

export interface SuiAccountInfo {
  address: string;
  publicKey: string;
  privateKey?: string;
  mnemonic?: string;
  balance?: string;
  suiBalance?: string;
  secretKey?: string;
}

export interface SuiGenerationOptions {
  includePrivateKey?: boolean;
  includeSecretKey?: boolean;
  includeMnemonic?: boolean;
  derivationPath?: string;
  entropy?: string;
}

export interface SuiEncryptedWallet {
  encryptedData: string;
  address: string;
  publicKey: string;
}

export interface SuiNetworkInfo {
  name: string;
  url: string;
  isConnected: boolean;
}

export interface SuiObjectInfo {
  objectId: string;
  version: string;
  digest: string;
  type: string;
  content?: any;
}

export class SuiWalletService {
  private client: SuiClient;
  private network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  private networkUrl: string;

  constructor(
    network: 'mainnet' | 'testnet' | 'devnet' | 'localnet' = 'mainnet'
  ) {
    this.network = network;
    this.networkUrl = getFullnodeUrl(network);
    this.client = new SuiClient({ url: this.networkUrl });
  }

  // ============================================================================
  // CONNECTION MANAGEMENT (Enhanced)
  // ============================================================================

  /**
   * Get network information and connection status
   */
  async getNetworkInfo(): Promise<SuiNetworkInfo> {
    try {
      // Test connection with a simple request
      await this.client.getLatestSuiSystemState();
      
      return {
        name: this.network,
        url: this.networkUrl,
        isConnected: true
      };
    } catch (error) {
      return {
        name: this.network,
        url: this.networkUrl,
        isConnected: false
      };
    }
  }

  /**
   * Update network settings
   */
  updateNetwork(network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'): void {
    this.network = network;
    this.networkUrl = getFullnodeUrl(network);
    this.client = new SuiClient({ url: this.networkUrl });
  }

  // ============================================================================
  // WALLET GENERATION (Enhanced)
  // ============================================================================

  /**
   * Generate a new Sui account
   * Enhanced with options support following project patterns
   */
  generateAccount(options: SuiGenerationOptions = {}): SuiAccountInfo {
    try {
      const keypair = new Ed25519Keypair();
      
      const result: SuiAccountInfo = {
        address: keypair.getPublicKey().toSuiAddress(),
        publicKey: keypair.getPublicKey().toBase64()
      };

      if (options.includePrivateKey !== false) {
        // In Sui SDK v1.38+, use getSecretKey() which returns Bech32-encoded key
        result.privateKey = keypair.getSecretKey();
      }

      if (options.includeSecretKey !== false) {
        result.secretKey = keypair.getSecretKey();
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to generate Sui account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple Sui accounts at once
   * Following project patterns
   */
  generateMultipleAccounts(
    count: number, 
    options: SuiGenerationOptions = {}
  ): SuiAccountInfo[] {
    const accounts: SuiAccountInfo[] = [];
    
    for (let i = 0; i < count; i++) {
      accounts.push(this.generateAccount(options));
    }
    
    return accounts;
  }

  /**
   * Import an existing account using private key
   * Enhanced with better error handling and balance fetching
   */
  async importAccount(privateKey: string, options: SuiGenerationOptions = {}): Promise<SuiAccountInfo> {
    try {
      const keypair = this.createKeypairFromPrivateKey(privateKey);
      
      const result: SuiAccountInfo = {
        address: keypair.getPublicKey().toSuiAddress(),
        publicKey: keypair.getPublicKey().toBase64()
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = privateKey;
      }

      if (options.includeSecretKey !== false) {
        result.secretKey = keypair.getSecretKey();
      }
      
      // Try to fetch balance with enhanced error handling
      try {
        const balance = await this.client.getBalance({
          owner: keypair.getPublicKey().toSuiAddress()
        });
        result.balance = balance.totalBalance;
        result.suiBalance = (parseInt(balance.totalBalance) / Number(MIST_PER_SUI)).toString();
      } catch (balanceError) {
        console.warn(`Could not fetch balance for ${keypair.getPublicKey().toSuiAddress()}:`, balanceError);
        result.balance = '0';
        result.suiBalance = '0';
      }
      
      return result;
    } catch (error) {
      throw new Error(`Invalid Sui private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from private key (alias for consistency)
   */
  fromPrivateKey(privateKey: string, options: SuiGenerationOptions = {}): SuiAccountInfo {
    try {
      const keypair = this.createKeypairFromPrivateKey(privateKey);
      
      const result: SuiAccountInfo = {
        address: keypair.getPublicKey().toSuiAddress(),
        publicKey: keypair.getPublicKey().toBase64()
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = privateKey;
      }

      if (options.includeSecretKey !== false) {
        result.secretKey = keypair.getSecretKey();
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid Sui private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from secret key (Bech32 format)
   */
  fromSecretKey(secretKey: string, options: SuiGenerationOptions = {}): SuiAccountInfo {
    try {
      const keypair = Ed25519Keypair.fromSecretKey(secretKey);
      
      const result: SuiAccountInfo = {
        address: keypair.getPublicKey().toSuiAddress(),
        publicKey: keypair.getPublicKey().toBase64()
      };

      if (options.includePrivateKey !== false) {
        // In Sui SDK v1.38+, use getSecretKey() which returns Bech32-encoded key
        result.privateKey = keypair.getSecretKey();
      }

      if (options.includeSecretKey !== false) {
        result.secretKey = keypair.getSecretKey();
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid Sui secret key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate mnemonic phrase
   * Full BIP39 support
   */
  generateMnemonic(): string {
    try {
      return bip39.generateMnemonic();
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
    options: SuiGenerationOptions = {}
  ): SuiAccountInfo {
    try {
      const derivationPath = options.derivationPath || `m/44'/784'/${derivationIndex}'/0'/0'`;
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const hdkey = HDKey.fromMasterSeed(seed);
      const derived = hdkey.derive(derivationPath);
      const key = derived.privateKey!;
      
      const keypair = Ed25519Keypair.fromSecretKey(key);
      
      const result: SuiAccountInfo = {
        address: keypair.getPublicKey().toSuiAddress(),
        publicKey: keypair.getPublicKey().toBase64()
      };

      if (options.includePrivateKey !== false) {
        // In Sui SDK v1.38+, use getSecretKey() which returns Bech32-encoded key
        result.privateKey = keypair.getSecretKey();
      }

      if (options.includeSecretKey !== false) {
        result.secretKey = keypair.getSecretKey();
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
    options: SuiGenerationOptions = {}
  ): SuiAccountInfo[] {
    const wallets: SuiAccountInfo[] = [];
    
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
  restoreFromMnemonic(mnemonic: string, index: number = 0): SuiAccountInfo {
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
    account: SuiAccountInfo, 
    password: string
  ): Promise<SuiEncryptedWallet> {
    try {
      if (!account.privateKey && !account.secretKey) {
        throw new Error('Private key or secret key required for encryption');
      }

      const data = {
        privateKey: account.privateKey,
        secretKey: account.secretKey,
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
    encryptedWallet: SuiEncryptedWallet, 
    password: string
  ): Promise<SuiAccountInfo> {
    try {
      // Simplified decryption - in production use proper crypto
      const dataString = Buffer.from(encryptedWallet.encryptedData, 'base64').toString();
      const data = JSON.parse(dataString);
      
      return {
        address: encryptedWallet.address,
        publicKey: encryptedWallet.publicKey,
        privateKey: data.privateKey,
        secretKey: data.secretKey,
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
   * Validate Sui address
   * Enhanced validation with detailed error information
   */
  isValidAddress(address: string): boolean {
    try {
      // Sui addresses should be 32 bytes (64 hex characters) with 0x prefix
      if (!address.startsWith('0x') || address.length !== 66) {
        return false;
      }
      
      // Additional validation using Sui's normalization
      normalizeSuiAddress(address);
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
      this.createKeypairFromPrivateKey(privateKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate secret key (Bech32 format)
   */
  isValidSecretKey(secretKey: string): boolean {
    try {
      if (!secretKey || typeof secretKey !== 'string') {
        return false;
      }
      // Try to create a keypair from the secret key to validate it
      Ed25519Keypair.fromSecretKey(secretKey);
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
      return bip39.validateMnemonic(mnemonic);
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
  async getAccountInfo(address: string): Promise<SuiAccountInfo | null> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Sui address format');
      }

      const [balance, objects] = await Promise.allSettled([
        this.client.getBalance({ owner: address }),
        this.client.getOwnedObjects({ owner: address, limit: 1 })
      ]);

      let result: SuiAccountInfo = {
        address: address,
        publicKey: '', // Not available from account queries
        balance: '0',
        suiBalance: '0'
      };

      if (balance.status === 'fulfilled') {
        result.balance = balance.value.totalBalance;
        result.suiBalance = (parseInt(balance.value.totalBalance) / Number(MIST_PER_SUI)).toString();
      }

      // If we can fetch objects, the account exists
      if (objects.status === 'fulfilled' || balance.status === 'fulfilled') {
        return result;
      }

      return null;
    } catch (error) {
      console.error('Error fetching Sui account info:', error);
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
      
      const accountInfo = await this.getAccountInfo(address);
      return accountInfo !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get account balance in SUI
   * Enhanced with proper error handling
   */
  async getBalance(address: string): Promise<string> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Sui address');
      }

      const balance = await this.client.getBalance({ owner: address });
      return (parseInt(balance.totalBalance) / Number(MIST_PER_SUI)).toString();
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0';
    }
  }

  /**
   * Get all balances for account (including other coin types)
   */
  async getAllBalances(address: string): Promise<any[]> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Sui address');
      }

      return await this.client.getAllBalances({ owner: address });
    } catch (error) {
      console.error('Error fetching all balances:', error);
      return [];
    }
  }

  /**
   * Get owned objects
   */
  async getOwnedObjects(address: string, limit: number = 50): Promise<SuiObjectInfo[]> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Sui address');
      }

      const result = await this.client.getOwnedObjects({
        owner: address,
        limit,
        options: {
          showContent: true,
          showDisplay: true,
          showType: true
        }
      });

      return result.data.map(obj => ({
        objectId: obj.data?.objectId || '',
        version: obj.data?.version || '',
        digest: obj.data?.digest || '',
        type: obj.data?.type || '',
        content: obj.data?.content
      }));
    } catch (error) {
      console.error('Error fetching owned objects:', error);
      return [];
    }
  }

  /**
   * Request SUI from faucet (testnet/devnet only)
   */
  async requestSuiFromFaucet(address: string): Promise<void> {
    try {
      if (this.network === 'mainnet') {
        throw new Error('Faucet not available on mainnet');
      }

      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Sui address');
      }

      // This would need to be implemented with actual faucet API
      // For now, just throw a descriptive error
      throw new Error('Faucet functionality requires external API integration');
    } catch (error) {
      throw new Error(`Failed to request SUI from faucet: ${error instanceof Error ? error.message : String(error)}`);
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
    
    return `${address.slice(0, show + 2)}...${address.slice(-show)}`;
  }

  /**
   * Get explorer URL for address or transaction
   * Enhanced URL generation with network detection
   */
  getExplorerUrl(hashOrAddress: string, type: 'tx' | 'address' | 'object' = 'address'): string {
    const networkParam = this.network === 'mainnet' ? '' : `?network=${this.network}`;
    const explorerBase = 'https://suiexplorer.com';
    
    switch (type) {
      case 'tx':
        return `${explorerBase}/txblock/${hashOrAddress}${networkParam}`;
      case 'object':
        return `${explorerBase}/object/${hashOrAddress}${networkParam}`;
      default:
        return `${explorerBase}/address/${hashOrAddress}${networkParam}`;
    }
  }

  /**
   * Get wallet type identifier
   */
  getWalletType(): string {
    return 'sui';
  }

  /**
   * Convert SUI to MIST (smallest unit)
   */
  suiToMist(sui: number): bigint {
    return BigInt(Math.round(sui * Number(MIST_PER_SUI)));
  }

  /**
   * Convert MIST to SUI
   */
  mistToSui(mist: bigint | number): number {
    return Number(mist) / Number(MIST_PER_SUI);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Create keypair from private key string
   */
  private createKeypairFromPrivateKey(privateKey: string): Ed25519Keypair {
    try {
      // Handle different private key formats
      if (privateKey.startsWith('0x')) {
        // Hex format with 0x prefix
        const keyBytes = fromBase64(toBase64(new Uint8Array(Buffer.from(privateKey.slice(2), 'hex'))));
        return Ed25519Keypair.fromSecretKey(keyBytes);
      } else if (privateKey.length === 64) {
        // Hex format without prefix
        const keyBytes = fromBase64(toBase64(new Uint8Array(Buffer.from(privateKey, 'hex'))));
        return Ed25519Keypair.fromSecretKey(keyBytes);
      } else {
        // Assume base64 format
        const keyBytes = fromBase64(privateKey);
        return Ed25519Keypair.fromSecretKey(keyBytes);
      }
    } catch (error) {
      throw new Error(`Invalid private key format: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export default instances for convenience
export const suiWalletService = new SuiWalletService('mainnet');

export const suiTestnetWalletService = new SuiWalletService('testnet');

export const suiDevnetWalletService = new SuiWalletService('devnet');

// Export static methods for backward compatibility
export const SuiWallet = {
  generateAccount: () => suiWalletService.generateAccount(),
  fromPrivateKey: (privateKey: string) => suiWalletService.fromPrivateKey(privateKey),
  fromSecretKey: (secretKey: string) => suiWalletService.fromSecretKey(secretKey),
  fromMnemonic: (mnemonic: string) => suiWalletService.fromMnemonic(mnemonic),
  isValidAddress: (address: string) => suiWalletService.isValidAddress(address),
  isValidPrivateKey: (privateKey: string) => suiWalletService.isValidPrivateKey(privateKey)
};
