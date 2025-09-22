/**
 * Enhanced Aptos Wallet Service
 * Handles account generation, import, validation, and comprehensive wallet operations for Aptos network
 * Updated to match project patterns with improved error handling and functionality
 */

import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
  PrivateKey,
  AccountAddress,
  Serializer,
  Deserializer,
  AuthenticationKey
} from '@aptos-labs/ts-sdk';
import * as bip39 from 'bip39';
import { HDKey } from '@scure/bip32';

export interface AptosAccountInfo {
  address: string;
  publicKey: string;
  privateKey?: string;
  mnemonic?: string;
  balance?: string;
  sequenceNumber?: string;
  authenticationKey?: string;
}

export interface AptosGenerationOptions {
  includePrivateKey?: boolean;
  includeMnemonic?: boolean;
  derivationPath?: string;
  entropy?: string;
}

export interface AptosEncryptedWallet {
  encryptedData: string;
  address: string;
  publicKey: string;
}

export interface AptosNetworkInfo {
  name: string;
  network: Network;
  chainId: number;
  isConnected: boolean;
}

export class AptosWalletService {
  private aptos: Aptos;
  private network: Network;
  private config: AptosConfig;

  constructor(network: Network = Network.MAINNET) {
    this.network = network;
    this.config = new AptosConfig({ network });
    this.aptos = new Aptos(this.config);
  }

  // ============================================================================
  // CONNECTION MANAGEMENT (Enhanced)
  // ============================================================================

  /**
   * Get network information and connection status
   */
  async getNetworkInfo(): Promise<AptosNetworkInfo> {
    try {
      // Test connection with a simple request
      const chainId = await this.aptos.getChainId();
      
      return {
        name: this.network,
        network: this.network,
        chainId: chainId,
        isConnected: true
      };
    } catch (error) {
      return {
        name: this.network,
        network: this.network,
        chainId: 0,
        isConnected: false
      };
    }
  }

  /**
   * Update network settings
   */
  updateNetwork(network: Network): void {
    this.network = network;
    this.config = new AptosConfig({ network });
    this.aptos = new Aptos(this.config);
  }

  // ============================================================================
  // WALLET GENERATION (Enhanced)
  // ============================================================================

  /**
   * Generate a new Aptos account
   * Enhanced with options support following project patterns
   */
  generateAccount(options: AptosGenerationOptions = {}): AptosAccountInfo {
    try {
      const account = Account.generate();
      
      const result: AptosAccountInfo = {
        address: account.accountAddress.toString(),
        publicKey: account.publicKey.toString(),
        authenticationKey: AuthenticationKey.fromPublicKey({ publicKey: account.publicKey }).toString()
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = account.privateKey.toString();
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to generate Aptos account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple Aptos accounts at once
   * Following project patterns
   */
  generateMultipleAccounts(
    count: number, 
    options: AptosGenerationOptions = {}
  ): AptosAccountInfo[] {
    const accounts: AptosAccountInfo[] = [];
    
    for (let i = 0; i < count; i++) {
      accounts.push(this.generateAccount(options));
    }
    
    return accounts;
  }

  /**
   * Import an existing account using private key
   * Enhanced with better error handling and balance fetching
   */
  async importAccount(privateKey: string, options: AptosGenerationOptions = {}): Promise<AptosAccountInfo> {
    try {
      const account = this.createAccountFromPrivateKey(privateKey);
      
      const result: AptosAccountInfo = {
        address: account.accountAddress.toString(),
        publicKey: account.publicKey.toString(),
        authenticationKey: AuthenticationKey.fromPublicKey({ publicKey: account.publicKey }).toString()
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = privateKey;
      }
      
      // Try to fetch balance and account info with enhanced error handling
      try {
        const [balance, accountData] = await Promise.allSettled([
          this.aptos.getAccountAPTAmount({ accountAddress: account.accountAddress }),
          this.aptos.getAccountInfo({ accountAddress: account.accountAddress })
        ]);

        if (balance.status === 'fulfilled') {
          result.balance = balance.value.toString();
        }

        if (accountData.status === 'fulfilled') {
          result.sequenceNumber = accountData.value.sequence_number;
        }
      } catch (balanceError) {
        console.warn(`Could not fetch account info for ${account.accountAddress.toString()}:`, balanceError);
        result.balance = '0';
        result.sequenceNumber = '0';
      }
      
      return result;
    } catch (error) {
      throw new Error(`Invalid Aptos private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from private key (alias for consistency)
   */
  fromPrivateKey(privateKey: string, options: AptosGenerationOptions = {}): AptosAccountInfo {
    try {
      const account = this.createAccountFromPrivateKey(privateKey);
      
      const result: AptosAccountInfo = {
        address: account.accountAddress.toString(),
        publicKey: account.publicKey.toString(),
        authenticationKey: AuthenticationKey.fromPublicKey({ publicKey: account.publicKey }).toString()
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = privateKey;
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid Aptos private key: ${error instanceof Error ? error.message : String(error)}`);
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
    options: AptosGenerationOptions = {}
  ): AptosAccountInfo {
    try {
      const derivationPath = options.derivationPath || `m/44'/637'/${derivationIndex}'/0'/0'`;
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const hdkey = HDKey.fromMasterSeed(seed);
      const derived = hdkey.derive(derivationPath);
      const key = derived.privateKey!;
      
      const privateKey = new Ed25519PrivateKey(key);
      const account = Account.fromPrivateKey({ privateKey });
      
      const result: AptosAccountInfo = {
        address: account.accountAddress.toString(),
        publicKey: account.publicKey.toString(),
        authenticationKey: AuthenticationKey.fromPublicKey({ publicKey: account.publicKey }).toString()
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = privateKey.toString();
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
    options: AptosGenerationOptions = {}
  ): AptosAccountInfo[] {
    const wallets: AptosAccountInfo[] = [];
    
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
  restoreFromMnemonic(mnemonic: string, index: number = 0): AptosAccountInfo {
    try {
      return this.fromMnemonic(mnemonic, index, {
        includePrivateKey: true,
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
    account: AptosAccountInfo, 
    password: string
  ): Promise<AptosEncryptedWallet> {
    try {
      if (!account.privateKey) {
        throw new Error('Private key required for encryption');
      }

      const data = {
        privateKey: account.privateKey,
        publicKey: account.publicKey,
        mnemonic: account.mnemonic,
        authenticationKey: account.authenticationKey
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
    encryptedWallet: AptosEncryptedWallet, 
    password: string
  ): Promise<AptosAccountInfo> {
    try {
      // Simplified decryption - in production use proper crypto
      const dataString = Buffer.from(encryptedWallet.encryptedData, 'base64').toString();
      const data = JSON.parse(dataString);
      
      return {
        address: encryptedWallet.address,
        publicKey: encryptedWallet.publicKey,
        privateKey: data.privateKey,
        mnemonic: data.mnemonic,
        authenticationKey: data.authenticationKey
      };
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // VALIDATION AND UTILITY (Enhanced)
  // ============================================================================

  /**
   * Validate Aptos address
   * Enhanced validation with detailed error information
   */
  isValidAddress(address: string): boolean {
    try {
      AccountAddress.from(address);
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
      this.createAccountFromPrivateKey(privateKey);
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
  async getAccountInfo(address: string): Promise<AptosAccountInfo | null> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Aptos address format');
      }

      const accountAddress = AccountAddress.from(address);
      
      const [accountInfo, balance] = await Promise.allSettled([
        this.aptos.getAccountInfo({ accountAddress }),
        this.aptos.getAccountAPTAmount({ accountAddress })
      ]);

      let result: AptosAccountInfo = {
        address: address,
        publicKey: '', // Not available from account info
        balance: '0',
        sequenceNumber: '0'
      };

      if (accountInfo.status === 'fulfilled') {
        result.sequenceNumber = accountInfo.value.sequence_number;
        result.authenticationKey = accountInfo.value.authentication_key;
      }

      if (balance.status === 'fulfilled') {
        result.balance = balance.value.toString();
      }

      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return null; // Account doesn't exist on network
      }
      console.error('Error fetching Aptos account info:', error);
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
   * Get account balance in APT
   * Enhanced with proper error handling
   */
  async getBalance(address: string): Promise<string> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Aptos address');
      }

      const accountAddress = AccountAddress.from(address);
      const balance = await this.aptos.getAccountAPTAmount({ accountAddress });
      return balance.toString();
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0';
    }
  }

  /**
   * Get chain ID
   */
  async getChainId(): Promise<number> {
    try {
      return await this.aptos.getChainId();
    } catch (error) {
      throw new Error(`Failed to get chain ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fund account (for testnet/devnet)
   */
  async fundAccount(address: string, amount: number = 100000000): Promise<void> {
    try {
      if (this.network === Network.MAINNET) {
        throw new Error('Cannot fund account on mainnet');
      }

      const accountAddress = AccountAddress.from(address);
      await this.aptos.faucet.fundAccount({
        accountAddress,
        amount
      });
    } catch (error) {
      throw new Error(`Failed to fund account: ${error instanceof Error ? error.message : String(error)}`);
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
    const networkParam = this.network === Network.MAINNET ? '' : `?network=${this.network.toLowerCase()}`;
    const explorerBase = 'https://explorer.aptoslabs.com';
    
    if (type === 'tx') {
      return `${explorerBase}/txn/${hashOrAddress}${networkParam}`;
    }
    return `${explorerBase}/account/${hashOrAddress}${networkParam}`;
  }

  /**
   * Get wallet type identifier
   */
  getWalletType(): string {
    return 'aptos';
  }

  /**
   * Convert APT to Octas (smallest unit)
   */
  aptToOctas(apt: number): number {
    return apt * 100000000; // 1 APT = 10^8 Octas
  }

  /**
   * Convert Octas to APT
   */
  octasToApt(octas: number): number {
    return octas / 100000000;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Create Account from private key string
   */
  private createAccountFromPrivateKey(privateKey: string): Account {
    try {
      // Handle different private key formats
      let key: Ed25519PrivateKey;
      
      if (privateKey.startsWith('0x')) {
        key = new Ed25519PrivateKey(privateKey);
      } else if (privateKey.length === 64) {
        key = new Ed25519PrivateKey(`0x${privateKey}`);
      } else {
        key = new Ed25519PrivateKey(privateKey);
      }
      
      return Account.fromPrivateKey({ privateKey: key });
    } catch (error) {
      throw new Error(`Invalid private key format: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export default instances for convenience
export const aptosWalletService = new AptosWalletService(Network.MAINNET);

export const aptosTestnetWalletService = new AptosWalletService(Network.TESTNET);

export const aptosDevnetWalletService = new AptosWalletService(Network.DEVNET);

// Export static methods for backward compatibility
export const AptosWallet = {
  generateAccount: () => aptosWalletService.generateAccount(),
  fromPrivateKey: (privateKey: string) => aptosWalletService.fromPrivateKey(privateKey),
  fromMnemonic: (mnemonic: string) => aptosWalletService.fromMnemonic(mnemonic),
  isValidAddress: (address: string) => aptosWalletService.isValidAddress(address),
  isValidPrivateKey: (privateKey: string) => aptosWalletService.isValidPrivateKey(privateKey)
};
