import { WalletGenerator, Wallet, WalletMetadata, WalletGenerationOptions } from '../WalletGenerator';
import { suiWalletService } from '../sui/SuiWalletService';

/**
 * Implementation of WalletGenerator for Sui wallets
 * Updated to use real SuiWalletService with @mysten/sui.js instead of mock implementation
 */
export class SuiWalletGenerator implements WalletGenerator {
  /**
   * Generate a new Sui wallet using real @mysten/sui.js
   * @param options Optional wallet generation options
   * @returns Generated wallet object
   */
  async generateWallet(options?: WalletGenerationOptions): Promise<Wallet> {
    try {
      const account = suiWalletService.generateAccount({
        includePrivateKey: true,
        includeSecretKey: true,
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
      throw new Error(`Failed to generate Sui wallet: ${error instanceof Error ? error.message : String(error)}`);
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
      const accounts = suiWalletService.generateMultipleAccounts(count, {
        includePrivateKey: true,
        includeSecretKey: true,
        includeMnemonic: options?.includeMnemonic
      });

      return accounts.map(account => ({
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      }));
    } catch (error) {
      throw new Error(`Failed to generate Sui wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from private key
   * @param privateKey Sui private key
   * @returns Generated wallet
   */
  async fromPrivateKey(privateKey: string): Promise<Wallet> {
    try {
      const account = suiWalletService.fromPrivateKey(privateKey, {
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
      throw new Error(`Failed to create Sui wallet from private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from secret key (Bech32 format string)
   * @param secretKey Sui secret key in Bech32 format
   * @returns Generated wallet
   */
  async fromSecretKey(secretKey: string): Promise<Wallet> {
    try {
      const account = suiWalletService.fromSecretKey(secretKey, {
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
      throw new Error(`Failed to create Sui wallet from secret key: ${error instanceof Error ? error.message : String(error)}`);
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
      const account = suiWalletService.restoreFromMnemonic(mnemonic, index);
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create Sui wallet from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate HD wallets from mnemonic
   * @param mnemonic Mnemonic phrase
   * @param count Number of wallets to generate
   * @returns Array of generated wallets
   */
  async generateHDWallets(
    mnemonic: string, 
    count: number = 1
  ): Promise<Wallet[]> {
    try {
      const accounts = suiWalletService.generateHDWallets(mnemonic, count, {
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
      throw new Error(`Failed to generate Sui HD wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate mnemonic phrase
   * @returns Mnemonic phrase
   */
  generateMnemonic(): string {
    try {
      return suiWalletService.generateMnemonic();
    } catch (error) {
      throw new Error(`Failed to generate mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate a Sui address using real validation
   * @param address Address to validate
   * @returns Boolean indicating if address is valid
   */
  validateAddress(address: string): boolean {
    return suiWalletService.isValidAddress(address);
  }

  /**
   * Validate a Sui private key
   * @param privateKey Private key to validate
   * @returns Boolean indicating if private key is valid
   */
  validatePrivateKey(privateKey: string): boolean {
    return suiWalletService.isValidPrivateKey(privateKey);
  }

  /**
   * Validate a Sui secret key (Bech32 format)
   * @param secretKey Secret key in Bech32 format to validate
   * @returns Boolean indicating if secret key is valid
   */
  validateSecretKey(secretKey: string): boolean {
    return suiWalletService.isValidSecretKey(secretKey);
  }

  /**
   * Validate a mnemonic phrase
   * @param mnemonic Mnemonic to validate
   * @returns Boolean indicating if mnemonic is valid
   */
  validateMnemonic(mnemonic: string): boolean {
    return suiWalletService.isValidMnemonic(mnemonic);
  }

  /**
   * Get metadata for Sui wallets
   * @returns Sui wallet metadata
   */
  getMetadata(): WalletMetadata {
    return {
      type: 'sui',
      chainId: 1,
      standard: 'Sui',
      coinType: '784',
      network: 'sui'
    };
  }

  /**
   * Get wallet type
   * @returns Wallet type string
   */
  getWalletType(): string {
    return 'sui';
  }

  /**
   * Format address for display
   * @param address Address to format
   * @param length Display length
   * @returns Formatted address
   */
  formatAddress(address: string, length: number = 6): string {
    return suiWalletService.formatAddress(address, length);
  }

  /**
   * Get explorer URL
   * @param address Address or transaction hash
   * @param type Type of URL ('address', 'tx', or 'object')
   * @returns Explorer URL
   */
  getExplorerUrl(address: string, type: 'address' | 'tx' | 'object' = 'address'): string {
    return suiWalletService.getExplorerUrl(address, type);
  }

  /**
   * Get balance for address
   * @param address Address to check
   * @returns Promise with balance in SUI
   */
  async getBalance(address: string): Promise<string> {
    try {
      return await suiWalletService.getBalance(address);
    } catch (error) {
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all balances for address (including other coin types)
   * @param address Address to check
   * @returns Promise with all balances
   */
  async getAllBalances(address: string): Promise<any[]> {
    try {
      return await suiWalletService.getAllBalances(address);
    } catch (error) {
      throw new Error(`Failed to get all balances: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if account exists on network
   * @param address Address to check
   * @returns Promise with existence status
   */
  async accountExists(address: string): Promise<boolean> {
    try {
      return await suiWalletService.accountExists(address);
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
      return await suiWalletService.getAccountInfo(address);
    } catch (error) {
      console.error('Error getting account info:', error);
      return null;
    }
  }

  /**
   * Get owned objects for address
   * @param address Address to query
   * @param limit Maximum number of objects to return
   * @returns Promise with owned objects
   */
  async getOwnedObjects(address: string, limit: number = 50) {
    try {
      return await suiWalletService.getOwnedObjects(address, limit);
    } catch (error) {
      console.error('Error getting owned objects:', error);
      return [];
    }
  }

  /**
   * Request SUI from faucet (testnet/devnet only)
   * @param address Address to fund
   */
  async requestSuiFromFaucet(address: string): Promise<void> {
    try {
      return await suiWalletService.requestSuiFromFaucet(address);
    } catch (error) {
      throw new Error(`Failed to request SUI from faucet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert SUI to MIST
   * @param sui SUI amount
   * @returns MIST amount
   */
  suiToMist(sui: number): bigint {
    return suiWalletService.suiToMist(sui);
  }

  /**
   * Convert MIST to SUI
   * @param mist MIST amount
   * @returns SUI amount
   */
  mistToSui(mist: bigint | number): number {
    return suiWalletService.mistToSui(mist);
  }
}
