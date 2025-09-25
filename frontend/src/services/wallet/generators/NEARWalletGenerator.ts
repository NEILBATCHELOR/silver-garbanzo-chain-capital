import { WalletGenerator, Wallet, WalletMetadata, WalletGenerationOptions } from '../WalletGenerator';
import { nearWalletService } from '../near/NEARWalletService';

/**
 * Implementation of WalletGenerator for NEAR wallets
 * Updated to use real NEARWalletService with near-api-js instead of mock implementation
 */
export class NEARWalletGenerator implements WalletGenerator {
  /**
   * Generate a new NEAR wallet using real near-js
   * @param options Optional wallet generation options
   * @returns Generated wallet object
   */
  async generateWallet(options?: WalletGenerationOptions & { accountId?: string }): Promise<Wallet> {
    try {
      const account = nearWalletService.generateAccount({
        includePrivateKey: true,
        includeSecretKey: true,
        includeMnemonic: options?.includeMnemonic,
        accountId: options?.accountId
      });
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to generate NEAR wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple wallets
   * @param count Number of wallets to generate
   * @param options Generation options
   * @returns Array of generated wallets
   */
  async generateMultiple(
    count: number, 
    options?: WalletGenerationOptions & { baseAccountId?: string }
  ): Promise<Wallet[]> {
    try {
      const accounts = nearWalletService.generateMultipleAccounts(count, {
        includePrivateKey: true,
        includeSecretKey: true,
        includeMnemonic: options?.includeMnemonic,
        accountId: options?.baseAccountId
      });

      return accounts.map(account => ({
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      }));
    } catch (error) {
      throw new Error(`Failed to generate NEAR wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from private key
   * @param privateKey NEAR private key
   * @param accountId NEAR account ID (required for NEAR)
   * @returns Generated wallet
   */
  async fromPrivateKey(privateKey: string, accountId?: string): Promise<Wallet> {
    try {
      if (!accountId) {
        throw new Error('Account ID is required for NEAR wallets');
      }

      const account = nearWalletService.fromPrivateKey(privateKey, accountId, {
        includePrivateKey: true,
        includeSecretKey: true
      });
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create NEAR wallet from private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from mnemonic
   * @param mnemonic Mnemonic phrase
   * @param accountId NEAR account ID (required for NEAR)
   * @param index Derivation index
   * @returns Generated wallet
   */
  async fromMnemonic(mnemonic: string, accountId?: string, index: number = 0): Promise<Wallet> {
    try {
      if (!accountId) {
        throw new Error('Account ID is required for NEAR wallets');
      }

      const account = nearWalletService.restoreFromMnemonic(mnemonic, accountId, index);
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create NEAR wallet from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate HD wallets from mnemonic
   * @param mnemonic Mnemonic phrase
   * @param baseAccountId Base account ID for wallet generation
   * @param count Number of wallets to generate
   * @returns Array of generated wallets
   */
  async generateHDWallets(
    mnemonic: string, 
    baseAccountId: string,
    count: number = 1
  ): Promise<Wallet[]> {
    try {
      const accounts = nearWalletService.generateHDWallets(mnemonic, baseAccountId, count, {
        includePrivateKey: true,
        includeSecretKey: true,
        includeMnemonic: true
      });

      return accounts.map(account => ({
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      }));
    } catch (error) {
      throw new Error(`Failed to generate NEAR HD wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate mnemonic phrase
   * @returns Mnemonic phrase
   */
  generateMnemonic(): string {
    try {
      return nearWalletService.generateMnemonic();
    } catch (error) {
      throw new Error(`Failed to generate mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate a NEAR account ID using real validation
   * @param accountId Account ID to validate
   * @returns Boolean indicating if account ID is valid
   */
  validateAccountId(accountId: string): boolean {
    return nearWalletService.isValidAccountId(accountId);
  }

  /**
   * Validate a NEAR address (alias for validateAccountId)
   * @param address Address to validate
   * @returns Boolean indicating if address is valid
   */
  validateAddress(address: string): boolean {
    return nearWalletService.isValidAddress(address);
  }

  /**
   * Validate a NEAR private key
   * @param privateKey Private key to validate
   * @returns Boolean indicating if private key is valid
   */
  validatePrivateKey(privateKey: string): boolean {
    return nearWalletService.isValidPrivateKey(privateKey);
  }

  /**
   * Validate a mnemonic phrase
   * @param mnemonic Mnemonic to validate
   * @returns Boolean indicating if mnemonic is valid
   */
  validateMnemonic(mnemonic: string): boolean {
    return nearWalletService.isValidMnemonic(mnemonic);
  }

  /**
   * Get metadata for NEAR wallets
   * @returns NEAR wallet metadata
   */
  getMetadata(): WalletMetadata {
    return {
      type: 'near',
      chainId: 1,
      standard: 'NEAR',
      coinType: '397',
      network: 'near'
    };
  }

  /**
   * Get wallet type
   * @returns Wallet type string
   */
  getWalletType(): string {
    return 'near';
  }

  /**
   * Format account ID for display
   * @param accountId Account ID to format
   * @param maxLength Maximum display length
   * @returns Formatted account ID
   */
  formatAccountId(accountId: string, maxLength: number = 20): string {
    return nearWalletService.formatAccountId(accountId, maxLength);
  }

  /**
   * Format address for display (alias)
   * @param address Address to format
   * @param length Display length
   * @returns Formatted address
   */
  formatAddress(address: string, length: number = 20): string {
    return nearWalletService.formatAddress(address, length);
  }

  /**
   * Get explorer URL
   * @param accountIdOrTxHash Account ID or transaction hash
   * @param type Type of URL ('account', 'address', or 'tx')
   * @returns Explorer URL
   */
  getExplorerUrl(accountIdOrTxHash: string, type: 'account' | 'address' | 'tx' = 'account'): string {
    return nearWalletService.getExplorerUrl(accountIdOrTxHash, type);
  }

  /**
   * Get balance for account
   * @param accountId Account ID to check
   * @returns Promise with balance in NEAR
   */
  async getBalance(accountId: string): Promise<string> {
    try {
      return await nearWalletService.getBalance(accountId);
    } catch (error) {
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if account exists on network
   * @param accountId Account ID to check
   * @returns Promise with existence status
   */
  async accountExists(accountId: string): Promise<boolean> {
    try {
      return await nearWalletService.accountExists(accountId);
    } catch (error) {
      console.error('Error checking account existence:', error);
      return false;
    }
  }

  /**
   * Get account information from network
   * @param accountId Account ID to query
   * @returns Promise with account info or null
   */
  async getAccountInfo(accountId: string) {
    try {
      return await nearWalletService.getAccountInfo(accountId);
    } catch (error) {
      console.error('Error getting account info:', error);
      return null;
    }
  }

  /**
   * Get access keys for account
   * @param accountId Account ID to query
   * @returns Promise with access keys
   */
  async getAccessKeys(accountId: string) {
    try {
      return await nearWalletService.getAccessKeys(accountId);
    } catch (error) {
      console.error('Error getting access keys:', error);
      return [];
    }
  }

  /**
   * Convert NEAR to yoctoNEAR
   * @param near NEAR amount
   * @returns yoctoNEAR amount as string
   */
  nearToYocto(near: string): string {
    return nearWalletService.nearToYocto(near);
  }

  /**
   * Convert yoctoNEAR to NEAR
   * @param yocto yoctoNEAR amount
   * @returns NEAR amount as string
   */
  yoctoToNear(yocto: string): string {
    return nearWalletService.yoctoToNear(yocto);
  }

  /**
   * Generate random account ID for development/testing
   * @returns Random account ID
   */
  generateRandomAccountId(): string {
    return nearWalletService['generateRandomAccountId']();
  }
}
