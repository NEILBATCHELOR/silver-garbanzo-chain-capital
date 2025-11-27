import { Wallet, WalletGenerator, WalletGenerationOptions, WalletMetadata } from '../WalletGenerator';
import { rippleWalletService } from '../ripple/RippleWalletService';

/**
 * Implementation of WalletGenerator for XRP (Ripple)
 * Updated to use real RippleWalletService instead of mock implementation
 */
export class XRPWalletGenerator implements WalletGenerator {
  /**
   * Generate a new XRP wallet using real xrpl library
   * @param options Optional wallet generation options
   * @returns Generated wallet object
   */
  async generateWallet(options?: WalletGenerationOptions): Promise<Wallet> {
    try {
      const account = rippleWalletService.generateAccount({
        includePrivateKey: true,
        includeSeed: true,
        includeMnemonic: options?.includeMnemonic
      });
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        mnemonic: account.mnemonic, // ✅ FIX: Return mnemonic if generated
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to generate XRP wallet: ${error instanceof Error ? error.message : String(error)}`);
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
    options?: WalletGenerationOptions
  ): Promise<Wallet[]> {
    try {
      const accounts = rippleWalletService.generateMultipleAccounts(count, {
        includePrivateKey: true,
        includeSeed: true,
        includeMnemonic: options?.includeMnemonic
      });

      return accounts.map(account => ({
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      }));
    } catch (error) {
      throw new Error(`Failed to generate XRP wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from private key
   * @param privateKey XRP private key
   * @returns Generated wallet
   */
  async fromPrivateKey(privateKey: string): Promise<Wallet> {
    try {
      const account = rippleWalletService.fromPrivateKey(privateKey, {
        includePrivateKey: true,
        includeSeed: true
      });
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create XRP wallet from private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from seed
   * @param seed XRP seed
   * @returns Generated wallet
   */
  async fromSeed(seed: string): Promise<Wallet> {
    try {
      const account = rippleWalletService.fromSeed(seed, {
        includePrivateKey: true,
        includeSeed: true
      });
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create XRP wallet from seed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from mnemonic
   * @param mnemonic Mnemonic phrase
   * @param index Derivation index
   * @returns Generated wallet
   */
  async fromMnemonic(mnemonic: string, index: number = 0): Promise<Wallet> {
    try {
      const account = rippleWalletService.restoreFromMnemonic(mnemonic, index);
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create XRP wallet from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate mnemonic phrase
   * @returns Mnemonic phrase
   */
  generateMnemonic(): string {
    try {
      return rippleWalletService.generateMnemonic();
    } catch (error) {
      throw new Error(`Failed to generate mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get metadata for XRP wallets
   * @returns XRP wallet metadata
   */
  getMetadata(): WalletMetadata {
    return {
      type: 'xrp',
      chainId: null,
      standard: 'XRPL',
      network: 'mainnet',
      coinType: '144'
    };
  }
  
  /**
   * Validate an XRP address using real validation
   * @param address Address to validate
   * @returns Boolean indicating if address is valid
   */
  validateAddress(address: string): boolean {
    return rippleWalletService.isValidAddress(address);
  }

  /**
   * Validate an XRP seed
   * @param seed Seed to validate
   * @returns Boolean indicating if seed is valid
   */
  validateSeed(seed: string): boolean {
    return rippleWalletService.isValidSeed(seed);
  }

  /**
   * Validate an XRP private key
   * @param privateKey Private key to validate
   * @returns Boolean indicating if private key is valid
   */
  validatePrivateKey(privateKey: string): boolean {
    return rippleWalletService.isValidPrivateKey(privateKey);
  }

  /**
   * Get wallet type
   * @returns Wallet type string
   */
  getWalletType(): string {
    return 'xrp';
  }

  /**
   * Format address for display
   * @param address Address to format
   * @param length Display length
   * @returns Formatted address
   */
  formatAddress(address: string, length: number = 6): string {
    return rippleWalletService.formatAddress(address, length);
  }

  /**
   * Get explorer URL
   * @param address Address or transaction hash
   * @param type Type of URL ('address' or 'tx')
   * @returns Explorer URL
   */
  getExplorerUrl(address: string, type: 'address' | 'tx' = 'address'): string {
    return rippleWalletService.getExplorerUrl(address, type);
  }

  /**
   * Get balance for address
   * @param address Address to check
   * @returns Promise with balance in XRP
   */
  async getBalance(address: string): Promise<string> {
    try {
      return await rippleWalletService.getBalance(address);
    } catch (error) {
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if account exists on network
   * @param address Address to check
   * @returns Promise with existence status
   */
  async accountExists(address: string): Promise<boolean> {
    try {
      return await rippleWalletService.accountExists(address);
    } catch (error) {
      console.error('Error checking account existence:', error);
      return false;
    }
  }

  /**
   * Get account information from network
   * @param address Address to query
   * @returns Promise with account info or null
   */
  async getAccountInfo(address: string) {
    try {
      return await rippleWalletService.getAccountInfo(address);
    } catch (error) {
      console.error('Error getting account info:', error);
      return null;
    }
  }

  /**
   * Convert XRP to drops
   * @param xrp XRP amount
   * @returns Drops amount as string
   */
  xrpToDrops(xrp: string | number): string {
    return rippleWalletService.xrpToDrops(xrp);
  }

  /**
   * Convert drops to XRP
   * @param drops Drops amount
   * @returns XRP amount as string
   */
  dropsToXrp(drops: string | number): string {
    return rippleWalletService.dropsToXrp(drops);
  }
}
