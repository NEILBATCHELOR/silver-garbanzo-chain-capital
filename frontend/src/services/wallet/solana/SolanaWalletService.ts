/**
 * Solana Wallet Service (Compatibility Layer)
 * 
 * MIGRATION STATUS: ✅ MIGRATED TO MODERN
 * Delegates all operations to ModernSolanaWalletService
 * Maintains backward compatibility with existing code
 * 
 * Uses: ModernSolanaWalletService (@solana/kit + @solana/client)
 */

import { 
  ModernSolanaWalletService,
  type SolanaAccountInfo as ModernAccountInfo,
  type SolanaGenerationOptions as ModernGenerationOptions,
  type SolanaEncryptedWallet as ModernEncryptedWallet,
  type SolanaNetworkInfo as ModernNetworkInfo
} from './ModernSolanaWalletService';

// Re-export types from modern service for backward compatibility
export type SolanaAccountInfo = ModernAccountInfo;
export type SolanaGenerationOptions = ModernGenerationOptions;
export type SolanaEncryptedWallet = ModernEncryptedWallet;
export type SolanaNetworkInfo = ModernNetworkInfo;

/**
 * Legacy Solana Wallet Service - Delegates to Modern Implementation
 */
export class SolanaWalletService {
  private modernService: ModernSolanaWalletService;

  constructor(
    network: 'mainnet-beta' | 'testnet' | 'devnet' = 'mainnet-beta',
    customEndpoint?: string
  ) {
    this.modernService = new ModernSolanaWalletService(network, customEndpoint);
  }

  // ============================================================================
  // CONNECTION MANAGEMENT - Delegates to Modern Service
  // ============================================================================

  async getNetworkInfo(): Promise<SolanaNetworkInfo> {
    return this.modernService.getNetworkInfo();
  }

  updateConnection(
    network: 'mainnet-beta' | 'testnet' | 'devnet',
    customEndpoint?: string
  ): void {
    this.modernService.updateConnection(network, customEndpoint);
  }

  setCommitment(commitment: 'processed' | 'confirmed' | 'finalized'): void {
    this.modernService.setCommitment(commitment);
  }

  // ============================================================================
  // WALLET GENERATION - Delegates to Modern Service
  // ============================================================================

  generateAccount(options: SolanaGenerationOptions = {}): SolanaAccountInfo {
    return this.modernService.generateAccount(options);
  }

  async generateMultipleAccounts(
    count: number, 
    options: SolanaGenerationOptions = {}
  ): Promise<SolanaAccountInfo[]> {
    return this.modernService.generateMultipleAccounts(count, options);
  }

  async importAccount(privateKey: string, options: SolanaGenerationOptions = {}): Promise<SolanaAccountInfo> {
    return this.modernService.importAccount(privateKey, options);
  }

  async importFromSecretKey(secretKey: Uint8Array, options: SolanaGenerationOptions = {}): Promise<SolanaAccountInfo> {
    return this.modernService.importFromSecretKey(secretKey, options);
  }

  fromPrivateKey(privateKey: string, options: SolanaGenerationOptions = {}): SolanaAccountInfo {
    return this.modernService.fromPrivateKey(privateKey, options);
  }

  fromSecretKey(secretKey: Uint8Array, options: SolanaGenerationOptions = {}): SolanaAccountInfo {
    return this.modernService.fromSecretKey(secretKey, options);
  }

  generateMnemonic(): string {
    return this.modernService.generateMnemonic();
  }

  fromMnemonic(
    mnemonic: string,
    derivationIndex: number = 0,
    options: SolanaGenerationOptions = {}
  ): SolanaAccountInfo {
    return this.modernService.fromMnemonic(mnemonic, derivationIndex, options);
  }

  async generateHDWallets(
    mnemonic: string,
    numWallets: number = 1,
    options: SolanaGenerationOptions = {}
  ): Promise<SolanaAccountInfo[]> {
    return this.modernService.generateHDWallets(mnemonic, numWallets, options);
  }

  restoreFromMnemonic(mnemonic: string, index: number = 0): SolanaAccountInfo {
    return this.modernService.restoreFromMnemonic(mnemonic, index);
  }

  // ============================================================================
  // WALLET ENCRYPTION - Delegates to Modern Service
  // ============================================================================

  async encryptWallet(
    account: SolanaAccountInfo, 
    password: string
  ): Promise<SolanaEncryptedWallet> {
    return this.modernService.encryptWallet(account, password);
  }

  async decryptWallet(
    encryptedWallet: SolanaEncryptedWallet, 
    password: string
  ): Promise<SolanaAccountInfo> {
    return this.modernService.decryptWallet(encryptedWallet, password);
  }

  // ============================================================================
  // VALIDATION AND UTILITY - Delegates to Modern Service
  // ============================================================================

  isValidAddress(address: string): boolean {
    return this.modernService.isValidAddress(address);
  }

  isValidPrivateKey(privateKey: string): boolean {
    return this.modernService.isValidPrivateKey(privateKey);
  }

  isValidSecretKey(secretKey: Uint8Array): boolean {
    return this.modernService.isValidSecretKey(secretKey);
  }

  isValidMnemonic(mnemonic: string): boolean {
    return this.modernService.isValidMnemonic(mnemonic);
  }

  // ============================================================================
  // NETWORK OPERATIONS - Delegates to Modern Service
  // ============================================================================

  async getAccountInfo(address: string): Promise<SolanaAccountInfo | null> {
    return this.modernService.getAccountInfo(address);
  }

  async accountExists(address: string): Promise<boolean> {
    return this.modernService.accountExists(address);
  }

  async getBalance(address: string): Promise<string> {
    return this.modernService.getBalance(address);
  }

  async getRecentBlockhash(): Promise<string> {
    return this.modernService.getRecentBlockhash();
  }

  // ============================================================================
  // UTILITY METHODS - Delegates to Modern Service
  // ============================================================================

  formatAddress(address: string, show: number = 6): string {
    return this.modernService.formatAddress(address, show);
  }

  getExplorerUrl(hashOrAddress: string, type: 'tx' | 'address' = 'address'): string {
    return this.modernService.getExplorerUrl(hashOrAddress, type);
  }

  getWalletType(): string {
    return this.modernService.getWalletType();
  }

  solToLamports(sol: number): number {
    return Number(this.modernService.solToLamports(sol));
  }

  lamportsToSol(lamports: number): number {
    return parseFloat(this.modernService.lamportsToSol(BigInt(lamports)));
  }
}

// Export default instances for convenience - using legacy wrapper for backward compatibility
export const solanaWalletService = new SolanaWalletService('mainnet-beta');
export const solanaDevnetWalletService = new SolanaWalletService('devnet');
export const solanaTestnetWalletService = new SolanaWalletService('testnet');

// Export static methods for backward compatibility
export const SolanaWallet = {
  generateAccount: () => solanaWalletService.generateAccount(),
  fromPrivateKey: (privateKey: string) => solanaWalletService.fromPrivateKey(privateKey),
  fromSecretKey: (secretKey: Uint8Array) => solanaWalletService.fromSecretKey(secretKey),
  fromMnemonic: (mnemonic: string) => solanaWalletService.fromMnemonic(mnemonic),
  isValidAddress: (address: string) => solanaWalletService.isValidAddress(address),
  isValidPrivateKey: (privateKey: string) => solanaWalletService.isValidPrivateKey(privateKey)
};
