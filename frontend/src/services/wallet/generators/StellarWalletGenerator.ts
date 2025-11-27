import { WalletGenerator, Wallet, WalletMetadata, WalletGenerationOptions } from '../WalletGenerator';
import { stellarWalletService } from '../stellar/StellarWalletService';

/**
 * Implementation of WalletGenerator for Stellar wallets
 * Updated to use real StellarWalletService instead of mock implementation
 */
export class StellarWalletGenerator implements WalletGenerator {
  /**
   * Generate a new Stellar wallet using real stellar-sdk
   * @returns A wallet generation result with address and private key
   */
  public async generateWallet(options?: WalletGenerationOptions): Promise<Wallet> {
    try {
      const account = stellarWalletService.generateAccount({
        includeSecretKey: true,
        includeMnemonic: options?.includeMnemonic
      });
      
      return {
        address: account.address,
        privateKey: account.secretKey || '',
        publicKey: account.publicKey,
        mnemonic: account.mnemonic, // ✅ FIX: Return mnemonic if generated
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to generate Stellar wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple wallets
   * @param count Number of wallets to generate
   * @param options Generation options
   * @returns Array of generated wallets
   */
  public async generateMultiple(
    count: number, 
    options?: WalletGenerationOptions
  ): Promise<Wallet[]> {
    try {
      const accounts = stellarWalletService.generateMultipleAccounts(count, {
        includeSecretKey: true,
        includeMnemonic: options?.includeMnemonic
      });

      return accounts.map(account => ({
        address: account.address,
        privateKey: account.secretKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      }));
    } catch (error) {
      throw new Error(`Failed to generate Stellar wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from private key (secret key)
   * @param secretKey Stellar secret key
   * @returns Generated wallet
   */
  public async fromPrivateKey(secretKey: string): Promise<Wallet> {
    try {
      const account = stellarWalletService.fromSecretKey(secretKey, {
        includeSecretKey: true
      });
      
      return {
        address: account.address,
        privateKey: account.secretKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create Stellar wallet from private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from mnemonic
   * @param mnemonic Mnemonic phrase
   * @param index Derivation index
   * @returns Generated wallet
   */
  public async fromMnemonic(mnemonic: string, index: number = 0): Promise<Wallet> {
    try {
      const account = stellarWalletService.restoreFromMnemonic(mnemonic, index);
      
      return {
        address: account.address,
        privateKey: account.secretKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create Stellar wallet from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate HD wallets from mnemonic
   * @param mnemonic Mnemonic phrase
   * @param count Number of wallets to generate
   * @returns Array of generated wallets
   */
  public async generateHDWallets(
    mnemonic: string, 
    count: number = 1
  ): Promise<Wallet[]> {
    try {
      const accounts = stellarWalletService.generateHDWallets(mnemonic, count, {
        includeSecretKey: true,
        includeMnemonic: true
      });

      return accounts.map(account => ({
        address: account.address,
        privateKey: account.secretKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      }));
    } catch (error) {
      throw new Error(`Failed to generate Stellar HD wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate mnemonic phrase
   * @returns Mnemonic phrase
   */
  public generateMnemonic(): string {
    try {
      return stellarWalletService.generateMnemonic();
    } catch (error) {
      throw new Error(`Failed to generate mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate a Stellar address using real validation
   * @param address The address to validate
   * @returns True if the address is valid, false otherwise
   */
  public validateAddress(address: string): boolean {
    return stellarWalletService.isValidAddress(address);
  }

  /**
   * Validate a Stellar secret key
   * @param secretKey The secret key to validate
   * @returns True if the secret key is valid, false otherwise
   */
  public validateSecretKey(secretKey: string): boolean {
    return stellarWalletService.isValidSecretKey(secretKey);
  }

  /**
   * Get metadata for the wallet
   * @returns The wallet metadata
   */
  public getMetadata(): WalletMetadata {
    return {
      type: 'stellar',
      chainId: 1,
      standard: 'Stellar',
      coinType: '148',
      network: 'stellar'
    };
  }

  /**
   * Get wallet type
   * @returns Wallet type string
   */
  public getWalletType(): string {
    return 'stellar';
  }

  /**
   * Format address for display
   * @param address Address to format
   * @param length Display length
   * @returns Formatted address
   */
  public formatAddress(address: string, length: number = 6): string {
    return stellarWalletService.formatAddress(address, length);
  }

  /**
   * Get explorer URL
   * @param address Address or transaction hash
   * @param type Type of URL ('address' or 'tx')
   * @returns Explorer URL
   */
  public getExplorerUrl(address: string, type: 'address' | 'tx' = 'address'): string {
    return stellarWalletService.getExplorerUrl(address, type);
  }
}
