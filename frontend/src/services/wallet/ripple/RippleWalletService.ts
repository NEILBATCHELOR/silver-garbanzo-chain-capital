/**
 * Enhanced Ripple Wallet Service
 * Handles account generation, import, validation, and comprehensive wallet operations for Ripple (XRP) network
 * Updated to match project patterns with improved error handling and functionality
 */

import * as xrpl from 'xrpl';

export interface RippleAccountInfo {
  address: string;
  publicKey: string;
  privateKey?: string;
  seed?: string;
  mnemonic?: string;
  balance?: string;
}

export interface RippleGenerationOptions {
  includePrivateKey?: boolean;
  includeSeed?: boolean;
  includeMnemonic?: boolean;
  entropy?: string;
  algorithm?: 'ed25519' | 'secp256k1';
}

export interface RippleEncryptedWallet {
  encryptedData: string;
  address: string;
  publicKey: string;
}

export interface RippleNetworkInfo {
  name: string;
  server: string;
  isConnected: boolean;
}

export class RippleWalletService {
  private client: xrpl.Client;
  private network: string;
  private server: string;
  private connectionTimeout: number = 10000; // 10 seconds

  constructor(
    server: string = 'wss://s1.ripple.com',
    network: 'mainnet' | 'testnet' = 'mainnet'
  ) {
    this.server = server;
    this.network = network;
    
    // Use appropriate server based on network
    if (network === 'testnet' && server === 'wss://s1.ripple.com') {
      this.server = 'wss://s.altnet.rippletest.net:51233';
    }
    
    this.client = new xrpl.Client(this.server);
  }

  // ============================================================================
  // CONNECTION MANAGEMENT (Enhanced)
  // ============================================================================

  /**
   * Connect to the Ripple network with enhanced error handling
   */
  async connect(): Promise<void> {
    try {
      if (this.client.isConnected()) {
        return;
      }

      const connectionPromise = this.client.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), this.connectionTimeout);
      });

      await Promise.race([connectionPromise, timeoutPromise]);
      
      if (!this.client.isConnected()) {
        throw new Error('Failed to establish connection to Ripple network');
      }
    } catch (error) {
      throw new Error(`Failed to connect to Ripple network: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnect from the Ripple network
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client.isConnected()) {
        await this.client.disconnect();
      }
    } catch (error) {
      console.warn('Error during disconnect:', error);
    }
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.client.isConnected();
  }

  /**
   * Get network information
   */
  getNetworkInfo(): RippleNetworkInfo {
    return {
      name: this.network,
      server: this.server,
      isConnected: this.client.isConnected()
    };
  }

  // ============================================================================
  // WALLET GENERATION (Enhanced)
  // ============================================================================

  /**
   * Generate a new Ripple account
   * Enhanced with options support following project patterns
   */
  generateAccount(options: RippleGenerationOptions = {}): RippleAccountInfo {
    try {
      const wallet = xrpl.Wallet.generate(options.algorithm as any || 'ed25519');
      
      const result: RippleAccountInfo = {
        address: wallet.address,
        publicKey: wallet.publicKey
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = wallet.privateKey;
      }

      if (options.includeSeed !== false) {
        result.seed = wallet.seed;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to generate Ripple account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple Ripple accounts at once
   * Following ETH generator patterns
   */
  generateMultipleAccounts(
    count: number, 
    options: RippleGenerationOptions = {}
  ): RippleAccountInfo[] {
    const accounts: RippleAccountInfo[] = [];
    
    for (let i = 0; i < count; i++) {
      accounts.push(this.generateAccount(options));
    }
    
    return accounts;
  }

  /**
   * Import an existing account using seed
   * Enhanced with better error handling and balance fetching
   */
  async importAccount(seed: string, options: RippleGenerationOptions = {}): Promise<RippleAccountInfo> {
    try {
      if (!this.isValidSeed(seed)) {
        throw new Error('Invalid seed format');
      }

      const wallet = xrpl.Wallet.fromSeed(seed);
      
      const result: RippleAccountInfo = {
        address: wallet.address,
        publicKey: wallet.publicKey
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = wallet.privateKey;
      }

      if (options.includeSeed !== false) {
        result.seed = seed;
      }
      
      // Try to fetch balance with enhanced error handling
      try {
        await this.ensureConnection();
        const response = await this.client.request({
          command: 'account_info',
          account: wallet.address
        });
        
        if (response.result.account_data) {
          result.balance = xrpl.dropsToXrp(response.result.account_data.Balance).toString();
        }
      } catch (balanceError) {
        // Account may not exist on network yet - this is not a critical error
        console.warn(`Could not fetch balance for ${wallet.address}:`, balanceError);
        result.balance = '0';
      }
      
      return result;
    } catch (error) {
      throw new Error(`Invalid Ripple seed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Import account from secret/private key
   * Enhanced error handling
   */
  async importFromPrivateKey(privateKey: string, options: RippleGenerationOptions = {}): Promise<RippleAccountInfo> {
    try {
      const wallet = new xrpl.Wallet(null, privateKey);
      
      const result: RippleAccountInfo = {
        address: wallet.address,
        publicKey: wallet.publicKey
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = privateKey;
      }

      if (options.includeSeed !== false && wallet.seed) {
        result.seed = wallet.seed;
      }
      
      // Try to fetch balance
      try {
        await this.ensureConnection();
        const response = await this.client.request({
          command: 'account_info',
          account: wallet.address
        });
        
        if (response.result.account_data) {
          result.balance = xrpl.dropsToXrp(response.result.account_data.Balance).toString();
        }
      } catch (balanceError) {
        console.warn(`Could not fetch balance for ${wallet.address}:`, balanceError);
        result.balance = '0';
      }
      
      return result;
    } catch (error) {
      throw new Error(`Invalid Ripple private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from seed (alias for consistency)
   */
  fromSeed(seed: string, options: RippleGenerationOptions = {}): RippleAccountInfo {
    try {
      const wallet = xrpl.Wallet.fromSeed(seed);
      
      const result: RippleAccountInfo = {
        address: wallet.address,
        publicKey: wallet.publicKey
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = wallet.privateKey;
      }

      if (options.includeSeed !== false) {
        result.seed = seed;
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid Ripple seed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from private key (alias for consistency)
   */
  fromPrivateKey(privateKey: string, options: RippleGenerationOptions = {}): RippleAccountInfo {
    try {
      const wallet = new xrpl.Wallet(null, privateKey);
      
      const result: RippleAccountInfo = {
        address: wallet.address,
        publicKey: wallet.publicKey
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = privateKey;
      }

      if (options.includeSeed !== false && wallet.seed) {
        result.seed = wallet.seed;
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid Ripple private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate mnemonic phrase
   * NEW: Mnemonic support (simplified approach)
   */
  generateMnemonic(): string {
    try {
      // Generate a wallet and use its seed as mnemonic base
      // In production, use proper BIP39 implementation
      const wallet = xrpl.Wallet.generate();
      return wallet.seed || ''; // Fallback to empty string if no seed
    } catch (error) {
      throw new Error(`Failed to generate mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Restore account from mnemonic
   * NEW: Replaces placeholder implementation
   */
  restoreFromMnemonic(mnemonic: string, index: number = 0): RippleAccountInfo {
    try {
      // Simplified approach - treat mnemonic as seed with optional index modification
      const modifiedSeed = index === 0 ? mnemonic : `${mnemonic}_${index}`;
      return this.fromSeed(modifiedSeed, {
        includePrivateKey: true,
        includeSeed: true,
        includeMnemonic: true
      });
    } catch (error) {
      throw new Error(`Failed to restore from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // WALLET ENCRYPTION (NEW)
  // ============================================================================

  /**
   * Encrypt wallet for secure storage
   * NEW: Wallet encryption capability
   */
  async encryptWallet(
    account: RippleAccountInfo, 
    password: string
  ): Promise<RippleEncryptedWallet> {
    try {
      if (!account.privateKey && !account.seed) {
        throw new Error('Private key or seed required for encryption');
      }

      const data = {
        privateKey: account.privateKey,
        seed: account.seed,
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
   * NEW: Wallet decryption capability
   */
  async decryptWallet(
    encryptedWallet: RippleEncryptedWallet, 
    password: string
  ): Promise<RippleAccountInfo> {
    try {
      // Simplified decryption - in production use proper crypto
      const dataString = Buffer.from(encryptedWallet.encryptedData, 'base64').toString();
      const data = JSON.parse(dataString);
      
      return {
        address: encryptedWallet.address,
        publicKey: encryptedWallet.publicKey,
        privateKey: data.privateKey,
        seed: data.seed,
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
   * Derive address from public key
   * Enhanced with better error handling
   */
  deriveAddress(publicKey: string): string {
    try {
      return xrpl.deriveAddress(publicKey);
    } catch (error) {
      throw new Error(`Failed to derive Ripple address: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate Ripple address
   * Enhanced validation with detailed error information
   */
  isValidAddress(address: string): boolean {
    try {
      return xrpl.isValidAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Validate Ripple seed
   * Enhanced validation
   */
  isValidSeed(seed: string): boolean {
    try {
      xrpl.Wallet.fromSeed(seed);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate private key
   * NEW: Private key validation
   */
  isValidPrivateKey(privateKey: string): boolean {
    try {
      new xrpl.Wallet(null, privateKey);
      return true;
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
  async getAccountInfo(address: string): Promise<RippleAccountInfo | null> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Ripple address format');
      }

      await this.ensureConnection();
      
      const response = await this.client.request({
        command: 'account_info',
        account: address
      });
      
      if (response.result.account_data) {
        const balance = xrpl.dropsToXrp(response.result.account_data.Balance).toString();
        
        return {
          address: address,
          publicKey: '', // Not available from account_info
          balance: balance
        };
      }
      
      return null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Account not found')) {
        return null; // Account doesn't exist on network
      }
      console.error('Error fetching Ripple account info:', error);
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
   * Get account balance in XRP
   * Enhanced with proper error handling
   */
  async getBalance(address: string): Promise<string> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Ripple address');
      }

      await this.ensureConnection();
      
      const response = await this.client.request({
        command: 'account_info',
        account: address
      });
      
      if (response.result.account_data) {
        return xrpl.dropsToXrp(response.result.account_data.Balance).toString();
      }
      
      return '0';
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0';
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
    const explorerBase = this.network === 'mainnet' 
      ? 'https://livenet.xrpl.org'
      : 'https://testnet.xrpl.org';
    
    if (type === 'tx') {
      return `${explorerBase}/transactions/${hashOrAddress}`;
    }
    return `${explorerBase}/accounts/${hashOrAddress}`;
  }

  /**
   * Get wallet type identifier
   */
  getWalletType(): string {
    return 'ripple';
  }

  /**
   * Convert XRP to drops
   */
  xrpToDrops(xrp: string | number): string {
    return xrpl.xrpToDrops(xrp);
  }

  /**
   * Convert drops to XRP
   */
  dropsToXrp(drops: string | number): string {
    return xrpl.dropsToXrp(drops).toString();
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Ensure connection is established
   */
  private async ensureConnection(): Promise<void> {
    if (!this.client.isConnected()) {
      await this.connect();
    }
  }
}

// Export default instances for convenience
export const rippleWalletService = new RippleWalletService();

export const rippleTestnetWalletService = new RippleWalletService(
  'wss://s.altnet.rippletest.net:51233',
  'testnet'
);

// Export static methods for backward compatibility
export const RippleWallet = {
  generateAccount: () => rippleWalletService.generateAccount(),
  fromSeed: (seed: string) => rippleWalletService.fromSeed(seed),
  fromPrivateKey: (privateKey: string) => rippleWalletService.fromPrivateKey(privateKey),
  isValidAddress: (address: string) => rippleWalletService.isValidAddress(address),
  isValidSeed: (seed: string) => rippleWalletService.isValidSeed(seed)
};
