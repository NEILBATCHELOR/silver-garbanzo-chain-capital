import { WalletGenerator, Wallet, WalletMetadata, WalletGenerationOptions } from '../WalletGenerator';
import { aptosWalletService } from '../aptos/AptosWalletService';

/**
 * Implementation of WalletGenerator for Aptos wallets
 * Updated to use real AptosWalletService with @aptos-labs/ts-sdk instead of mock implementation
 */
export class AptosWalletGenerator implements WalletGenerator {
  /**
   * Generate a new Aptos wallet using real @aptos-labs/ts-sdk
   * @param options Optional wallet generation options
   * @returns Generated wallet object
   */
  async generateWallet(options?: WalletGenerationOptions): Promise<Wallet> {
    try {
      const account = aptosWalletService.generateAccount({
        includePrivateKey: true,
        includeMnemonic: options?.includeMnemonic
      });
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to generate Aptos wallet: ${error instanceof Error ? error.message : String(error)}`);
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
      const accounts = aptosWalletService.generateMultipleAccounts(count, {
        includePrivateKey: true,
        includeMnemonic: options?.includeMnemonic
      });

      return accounts.map(account => ({
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      }));
    } catch (error) {
      throw new Error(`Failed to generate Aptos wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from private key
   * @param privateKey Aptos private key
   * @returns Generated wallet
   */
  async fromPrivateKey(privateKey: string): Promise<Wallet> {
    try {
      const account = aptosWalletService.fromPrivateKey(privateKey, {
        includePrivateKey: true
      });
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create Aptos wallet from private key: ${error instanceof Error ? error.message : String(error)}`);
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
      const account = aptosWalletService.restoreFromMnemonic(mnemonic, index);
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create Aptos wallet from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
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
      const accounts = aptosWalletService.generateHDWallets(mnemonic, count, {
        includePrivateKey: true,
        includeMnemonic: true
      });

      return accounts.map(account => ({
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      }));
    } catch (error) {
      throw new Error(`Failed to generate Aptos HD wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate mnemonic phrase
   * @returns Mnemonic phrase
   */
  generateMnemonic(): string {
    try {
      return aptosWalletService.generateMnemonic();
    } catch (error) {
      throw new Error(`Failed to generate mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate an Aptos address using real validation
   * @param address Address to validate
   * @returns Boolean indicating if address is valid
   */
  validateAddress(address: string): boolean {
    return aptosWalletService.isValidAddress(address);
  }

  /**
   * Validate an Aptos private key
   * @param privateKey Private key to validate
   * @returns Boolean indicating if private key is valid
   */
  validatePrivateKey(privateKey: string): boolean {
    return aptosWalletService.isValidPrivateKey(privateKey);
  }

  /**
   * Validate a mnemonic phrase
   * @param mnemonic Mnemonic to validate
   * @returns Boolean indicating if mnemonic is valid
   */
  validateMnemonic(mnemonic: string): boolean {
    return aptosWalletService.isValidMnemonic(mnemonic);
  }

  /**
   * Get metadata for Aptos wallets
   * @returns Aptos wallet metadata
   */
  getMetadata(): WalletMetadata {
    return {
      type: 'aptos',
      chainId: 1,
      standard: 'Aptos',
      coinType: '637',
      network: 'aptos'
    };
  }

  /**
   * Get wallet type
   * @returns Wallet type string
   */
  getWalletType(): string {
    return 'aptos';
  }

  /**
   * Format address for display
   * @param address Address to format
   * @param length Display length
   * @returns Formatted address
   */
  formatAddress(address: string, length: number = 6): string {
    return aptosWalletService.formatAddress(address, length);
  }

  /**
   * Get explorer URL
   * @param address Address or transaction hash
   * @param type Type of URL ('address' or 'tx')
   * @returns Explorer URL
   */
  getExplorerUrl(address: string, type: 'address' | 'tx' = 'address'): string {
    return aptosWalletService.getExplorerUrl(address, type);
  }

  /**
   * Get balance for address
   * @param address Address to check
   * @returns Promise with balance in APT
   */
  async getBalance(address: string): Promise<string> {
    try {
      return await aptosWalletService.getBalance(address);
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
      return await aptosWalletService.accountExists(address);
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
      return await aptosWalletService.getAccountInfo(address);
    } catch (error) {
      console.error('Error getting account info:', error);
      return null;
    }
  }

  /**
   * Fund account (for testnet/devnet only)
   * @param address Address to fund
   * @param amount Amount in Octas (default: 1 APT)
   */
  async fundAccount(address: string, amount: number = 100000000): Promise<void> {
    try {
      return await aptosWalletService.fundAccount(address, amount);
    } catch (error) {
      throw new Error(`Failed to fund account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get chain ID
   * @returns Promise with chain ID
   */
  async getChainId(): Promise<number> {
    try {
      return await aptosWalletService.getChainId();
    } catch (error) {
      throw new Error(`Failed to get chain ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert APT to Octas
   * @param apt APT amount
   * @returns Octas amount
   */
  aptToOctas(apt: number): number {
    return aptosWalletService.aptToOctas(apt);
  }

  /**
   * Convert Octas to APT
   * @param octas Octas amount
   * @returns APT amount
   */
  octasToApt(octas: number): number {
    return aptosWalletService.octasToApt(octas);
  }
}
