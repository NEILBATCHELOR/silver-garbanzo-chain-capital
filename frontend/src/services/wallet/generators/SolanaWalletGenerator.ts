/**
 * Solana Wallet Generator (Compatibility Layer)
 * 
 * Delegates to ModernSolanaWalletGenerator for all operations
 * Maintains compatibility with legacy WalletGenerator interface
 * 
 * MIGRATION STATUS: ✅ MIGRATED TO MODERN
 * Uses: ModernSolanaWalletGenerator internally
 */

import { WalletGenerator, Wallet, WalletMetadata, WalletGenerationOptions } from '../WalletGenerator';
import { ModernSolanaWalletGenerator } from './ModernSolanaWalletGenerator';

/**
 * Solana wallet generator - delegates to modern implementation
 */
export class SolanaWalletGenerator implements WalletGenerator {
  private modernGenerator: ModernSolanaWalletGenerator;

  constructor() {
    this.modernGenerator = new ModernSolanaWalletGenerator();
  }

  /**
   * Generate a new Solana wallet
   */
  async generateWallet(options?: WalletGenerationOptions): Promise<Wallet> {
    return this.modernGenerator.generateWallet(options);
  }

  /**
   * Generate multiple wallets
   */
  async generateMultiple(count: number, options?: WalletGenerationOptions): Promise<Wallet[]> {
    return this.modernGenerator.generateMultiple(count, options);
  }

  /**
   * Create wallet from private key
   */
  async fromPrivateKey(privateKey: string): Promise<Wallet> {
    return this.modernGenerator.fromPrivateKey(privateKey);
  }

  /**
   * Create wallet from secret key
   */
  async fromSecretKey(secretKey: Uint8Array): Promise<Wallet> {
    return this.modernGenerator.fromSecretKey(secretKey);
  }

  /**
   * Create wallet from mnemonic
   */
  async fromMnemonic(mnemonic: string, index: number = 0): Promise<Wallet> {
    return this.modernGenerator.fromMnemonic(mnemonic, index);
  }

  /**
   * Generate HD wallets from mnemonic
   */
  async generateHDWallets(mnemonic: string, count: number = 1): Promise<Wallet[]> {
    return this.modernGenerator.generateHDWallets(mnemonic, count);
  }

  /**
   * Generate mnemonic phrase
   */
  generateMnemonic(): string {
    return this.modernGenerator.generateMnemonic();
  }

  /**
   * Validate Solana address
   */
  validateAddress(address: string): boolean {
    return this.modernGenerator.validateAddress(address);
  }

  /**
   * Validate private key
   */
  validatePrivateKey(privateKey: string): boolean {
    return this.modernGenerator.validatePrivateKey(privateKey);
  }

  /**
   * Validate secret key
   */
  validateSecretKey(secretKey: Uint8Array): boolean {
    return this.modernGenerator.validateSecretKey(secretKey);
  }

  /**
   * Validate mnemonic
   */
  validateMnemonic(mnemonic: string): boolean {
    return this.modernGenerator.validateMnemonic(mnemonic);
  }

  /**
   * Get wallet metadata
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
   */
  getWalletType(): string {
    return 'solana';
  }

  /**
   * Format address for display
   */
  formatAddress(address: string, length: number = 6): string {
    return this.modernGenerator.formatAddress(address, length);
  }

  /**
   * Get explorer URL
   */
  getExplorerUrl(address: string, type: 'address' | 'tx' = 'address'): string {
    return this.modernGenerator.getExplorerUrl(address, type);
  }

  /**
   * Get balance for address
   */
  async getBalance(address: string, network: 'mainnet-beta' | 'devnet' | 'testnet' = 'devnet'): Promise<string> {
    return this.modernGenerator.getBalance(address, network);
  }

  /**
   * Convert SOL to lamports
   */
  solToLamports(sol: number): bigint {
    return this.modernGenerator.solToLamports(sol);
  }

  /**
   * Convert lamports to SOL
   */
  lamportsToSol(lamports: bigint): string {
    return this.modernGenerator.lamportsToSol(lamports);
  }
}
