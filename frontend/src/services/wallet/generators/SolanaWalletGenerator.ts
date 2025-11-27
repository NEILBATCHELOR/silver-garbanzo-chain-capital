import { WalletGenerator, Wallet, WalletMetadata, WalletGenerationOptions } from '../WalletGenerator';
import { solanaWalletService } from '../solana/SolanaWalletService';

/**
 * Implementation of WalletGenerator for Solana wallets
 * Updated to use real SolanaWalletService instead of mock implementation
 */
export class SolanaWalletGenerator implements WalletGenerator {
  /**
   * Generate a new Solana wallet using real @solana/web3.js
   * @param options Optional wallet generation options
   * @returns Generated wallet object
   */
  async generateWallet(options?: WalletGenerationOptions): Promise<Wallet> {
    try {
      const account = solanaWalletService.generateAccount({
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
      throw new Error(`Failed to generate Solana wallet: ${error instanceof Error ? error.message : String(error)}`);
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
      const accounts = solanaWalletService.generateMultipleAccounts(count, {
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
      throw new Error(`Failed to generate Solana wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from private key
   * @param privateKey Solana private key (hex format)
   * @returns Generated wallet
   */
  async fromPrivateKey(privateKey: string): Promise<Wallet> {
    try {
      const account = solanaWalletService.fromPrivateKey(privateKey, {
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
      throw new Error(`Failed to create Solana wallet from private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from secret key (Uint8Array)
   * @param secretKey Solana secret key
   * @returns Generated wallet
   */
  async fromSecretKey(secretKey: Uint8Array): Promise<Wallet> {
    try {
      const account = solanaWalletService.fromSecretKey(secretKey, {
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
      throw new Error(`Failed to create Solana wallet from secret key: ${error instanceof Error ? error.message : String(error)}`);
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
      const account = solanaWalletService.restoreFromMnemonic(mnemonic, index);
      
      return {
        address: account.address,
        privateKey: account.privateKey || '',
        publicKey: account.publicKey,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create Solana wallet from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
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
      const accounts = solanaWalletService.generateHDWallets(mnemonic, count, {
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
      throw new Error(`Failed to generate Solana HD wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate mnemonic phrase
   * @returns Mnemonic phrase
   */
  generateMnemonic(): string {
    try {
      return solanaWalletService.generateMnemonic();
    } catch (error) {
      throw new Error(`Failed to generate mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate a Solana address using real validation
   * @param address Address to validate
   * @returns Boolean indicating if address is valid
   */
  validateAddress(address: string): boolean {
    return solanaWalletService.isValidAddress(address);
  }

  /**
   * Validate a Solana private key
   * @param privateKey Private key to validate
   * @returns Boolean indicating if private key is valid
   */
  validatePrivateKey(privateKey: string): boolean {
    return solanaWalletService.isValidPrivateKey(privateKey);
  }

  /**
   * Validate a Solana secret key
   * @param secretKey Secret key to validate
   * @returns Boolean indicating if secret key is valid
   */
  validateSecretKey(secretKey: Uint8Array): boolean {
    return solanaWalletService.isValidSecretKey(secretKey);
  }

  /**
   * Validate a mnemonic phrase
   * @param mnemonic Mnemonic to validate
   * @returns Boolean indicating if mnemonic is valid
   */
  validateMnemonic(mnemonic: string): boolean {
    return solanaWalletService.isValidMnemonic(mnemonic);
  }

  /**
   * Get metadata for Solana wallets
   * @returns Solana wallet metadata
   */
  getMetadata(): WalletMetadata {
    return {
      type: 'solana',
      chainId: 101,
      standard: 'SPL',
      coinType: '501',
      network: 'solana'
    };
  }

  /**
   * Get wallet type
   * @returns Wallet type string
   */
  getWalletType(): string {
    return 'solana';
  }

  /**
   * Format address for display
   * @param address Address to format
   * @param length Display length
   * @returns Formatted address
   */
  formatAddress(address: string, length: number = 6): string {
    return solanaWalletService.formatAddress(address, length);
  }

  /**
   * Get explorer URL
   * @param address Address or transaction hash
   * @param type Type of URL ('address' or 'tx')
   * @returns Explorer URL
   */
  getExplorerUrl(address: string, type: 'address' | 'tx' = 'address'): string {
    return solanaWalletService.getExplorerUrl(address, type);
  }

  /**
   * Get balance for address
   * @param address Address to check
   * @returns Promise with balance in SOL
   */
  async getBalance(address: string): Promise<string> {
    try {
      return await solanaWalletService.getBalance(address);
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
      return await solanaWalletService.accountExists(address);
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
      return await solanaWalletService.getAccountInfo(address);
    } catch (error) {
      console.error('Error getting account info:', error);
      return null;
    }
  }

  /**
   * Convert SOL to lamports
   * @param sol SOL amount
   * @returns Lamports amount
   */
  solToLamports(sol: number): number {
    return solanaWalletService.solToLamports(sol);
  }

  /**
   * Convert lamports to SOL
   * @param lamports Lamports amount
   * @returns SOL amount
   */
  lamportsToSol(lamports: number): number {
    return solanaWalletService.lamportsToSol(lamports);
  }
}
