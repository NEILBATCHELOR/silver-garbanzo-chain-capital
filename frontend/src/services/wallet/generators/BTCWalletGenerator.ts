import { Wallet, WalletGenerator, WalletGenerationOptions, WalletMetadata } from '../WalletGenerator';
import { bitcoinWalletService } from '../bitcoin/BitcoinWalletService';

/**
 * Implementation of WalletGenerator for Bitcoin wallets
 * Updated to use real BitcoinWalletService with bitcoinjs-lib instead of mock implementation
 */
export class BTCWalletGenerator implements WalletGenerator {
  /**
   * Generate a new Bitcoin wallet using real bitcoinjs-lib
   * @param options Optional wallet generation options
   * @returns Generated wallet object
   */
  async generateWallet(options?: WalletGenerationOptions): Promise<Wallet> {
    try {
      const account = await bitcoinWalletService.generateAccount({
        includePrivateKey: options?.includePrivateKey ?? true,
        includeWIF: true,
        includeMnemonic: options?.includeMnemonic ?? false,
        addressType: 'bech32' // Default to modern bech32 addresses
      });
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        mnemonic: account.mnemonic, // ✅ FIX: Return mnemonic if generated
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to generate Bitcoin wallet: ${error instanceof Error ? error.message : String(error)}`);
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
      const accounts = await bitcoinWalletService.generateMultipleAccounts(count, {
        includePrivateKey: true,
        includeWIF: true,
        includeMnemonic: options?.includeMnemonic,
        addressType: 'bech32'
      });

      return accounts.map(account => ({
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      }));
    } catch (error) {
      throw new Error(`Failed to generate Bitcoin wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from private key
   * @param privateKey Bitcoin private key (hex or WIF format)
   * @returns Generated wallet
   */
  async fromPrivateKey(privateKey: string): Promise<Wallet> {
    try {
      const account = await bitcoinWalletService.fromPrivateKey(privateKey, {
        includePrivateKey: true,
        includeWIF: true,
        addressType: 'bech32'
      });
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create Bitcoin wallet from private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from WIF (Wallet Import Format)
   * @param wif Bitcoin WIF
   * @returns Generated wallet
   */
  async fromWIF(wif: string): Promise<Wallet> {
    try {
      const account = await bitcoinWalletService.fromWIF(wif, {
        includePrivateKey: true,
        includeWIF: true,
        addressType: 'bech32'
      });
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create Bitcoin wallet from WIF: ${error instanceof Error ? error.message : String(error)}`);
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
      const account = await bitcoinWalletService.restoreFromMnemonic(mnemonic, index);
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create Bitcoin wallet from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
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
      const accounts = await bitcoinWalletService.generateHDWallets(mnemonic, count, {
        includePrivateKey: true,
        includeWIF: true,
        includeMnemonic: true,
        includeExtendedKeys: true,
        addressType: 'bech32'
      });

      return accounts.map(account => ({
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      }));
    } catch (error) {
      throw new Error(`Failed to generate Bitcoin HD wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate wallet with specific address type
   * @param addressType Type of address to generate
   * @param options Additional options
   * @returns Generated wallet
   */
  async generateWithAddressType(
    addressType: 'legacy' | 'p2sh-segwit' | 'bech32' | 'taproot',
    options?: WalletGenerationOptions
  ): Promise<Wallet> {
    try {
      const account = await bitcoinWalletService.generateAccount({
        includePrivateKey: true,
        includeWIF: true,
        includeMnemonic: options?.includeMnemonic,
        addressType: addressType
      });
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: {
          ...this.getMetadata(),
          standard: this.getStandardForAddressType(addressType)
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate Bitcoin wallet with ${addressType} address: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate mnemonic phrase
   * @returns Mnemonic phrase
   */
  generateMnemonic(): string {
    try {
      return bitcoinWalletService.generateMnemonic();
    } catch (error) {
      throw new Error(`Failed to generate mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate a Bitcoin address using real validation
   * @param address Address to validate
   * @returns Boolean indicating if address is valid
   */
  validateAddress(address: string): boolean {
    return bitcoinWalletService.isValidAddress(address);
  }

  /**
   * Validate a Bitcoin private key
   * @param privateKey Private key to validate
   * @returns Boolean indicating if private key is valid
   */
  async validatePrivateKey(privateKey: string): Promise<boolean> {
    return await bitcoinWalletService.isValidPrivateKey(privateKey);
  }

  /**
   * Validate a Bitcoin WIF
   * @param wif WIF to validate
   * @returns Boolean indicating if WIF is valid
   */
  async validateWIF(wif: string): Promise<boolean> {
    return await bitcoinWalletService.isValidWIF(wif);
  }

  /**
   * Validate a mnemonic phrase
   * @param mnemonic Mnemonic to validate
   * @returns Boolean indicating if mnemonic is valid
   */
  validateMnemonic(mnemonic: string): boolean {
    return bitcoinWalletService.isValidMnemonic(mnemonic);
  }

  /**
   * Detect address type
   * @param address Address to analyze
   * @returns Address type or null if invalid
   */
  detectAddressType(address: string): string | null {
    return bitcoinWalletService.detectAddressType(address);
  }

  /**
   * Get metadata for Bitcoin wallets
   * @returns Bitcoin wallet metadata
   */
  getMetadata(): WalletMetadata {
    return {
      type: 'bitcoin',
      chainId: 1,
      standard: 'BIP84', // Default to bech32 (BIP84)
      network: 'mainnet',
      coinType: '0'
    };
  }

  /**
   * Get wallet type
   * @returns Wallet type string
   */
  getWalletType(): string {
    return 'bitcoin';
  }

  /**
   * Format address for display
   * @param address Address to format
   * @param length Display length
   * @returns Formatted address
   */
  formatAddress(address: string, length: number = 6): string {
    return bitcoinWalletService.formatAddress(address, length);
  }

  /**
   * Get explorer URL
   * @param address Address or transaction hash
   * @param type Type of URL ('address' or 'tx')
   * @returns Explorer URL
   */
  getExplorerUrl(address: string, type: 'address' | 'tx' = 'address'): string {
    return bitcoinWalletService.getExplorerUrl(address, type);
  }

  /**
   * Get balance for address (placeholder - requires external API)
   * @param address Address to check
   * @returns Promise with balance in BTC
   */
  async getBalance(address: string): Promise<string> {
    try {
      return await bitcoinWalletService.getBalance(address);
    } catch (error) {
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if address exists on network (placeholder - requires external API)
   * @param address Address to check
   * @returns Promise with existence status
   */
  async addressExists(address: string): Promise<boolean> {
    try {
      return await bitcoinWalletService.addressExists(address);
    } catch (error) {
      console.error('Error checking address existence:', error);
      return false;
    }
  }

  /**
   * Convert BTC to satoshis
   * @param btc BTC amount
   * @returns Satoshis amount
   */
  btcToSatoshis(btc: number): number {
    return bitcoinWalletService.btcToSatoshis(btc);
  }

  /**
   * Convert satoshis to BTC
   * @param satoshis Satoshis amount
   * @returns BTC amount
   */
  satoshisToBtc(satoshis: number): number {
    return bitcoinWalletService.satoshisToBtc(satoshis);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get BIP standard for address type
   */
  private getStandardForAddressType(addressType: string): string {
    switch (addressType) {
      case 'legacy':
        return 'BIP44';
      case 'p2sh-segwit':
        return 'BIP49';
      case 'bech32':
        return 'BIP84';
      case 'taproot':
        return 'BIP86';
      default:
        return 'BIP84';
    }
  }
}
