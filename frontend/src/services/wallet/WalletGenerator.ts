import { ethers } from 'ethers';

// Define wallet metadata interface
export interface WalletMetadata {
  type: string;
  chainId: number;
  standard: string;
  [key: string]: any; // Allow for additional properties
}

// Define wallet interface - ENHANCED to include optional mnemonic
export interface Wallet {
  address: string;
  privateKey: string;
  publicKey?: string;
  mnemonic?: string; // ✅ ADDED: Support mnemonic in base wallet interface
  metadata: WalletMetadata;
}

// Define wallet generation options - ENHANCED with standard options
export interface WalletGenerationOptions {
  chainId?: number;
  entropy?: string;
  includePrivateKey?: boolean; // ✅ ADDED: Control private key inclusion
  includeMnemonic?: boolean; // ✅ ADDED: Control mnemonic inclusion
  [key: string]: any; // Allow for additional properties
}

// Define the wallet generator interface
export interface WalletGenerator {
  /**
   * Generate a new wallet
   * @param options Optional wallet generation options
   * @returns Generated wallet
   */
  generateWallet(options?: WalletGenerationOptions): Promise<Wallet>; // ✅ FIXED: Now accepts options
  
  /**
   * Get metadata for this wallet generator
   * @returns Wallet metadata
   */
  getMetadata(): WalletMetadata;
  
  /**
   * Validate a wallet address
   * @param address Address to validate
   * @returns Whether the address is valid
   */
  validateAddress(address: string): boolean;
}