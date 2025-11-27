/**
 * Base Network Wallet Service - Simplified Version
 * 
 * Provides wallet generation for Base Network using ethers.js
 * This version focuses on local wallet generation without CDP SDK complexity
 * 
 * Features:
 * - Local wallet generation using ethers.js
 * - Multi-network support (Base Mainnet & Base Sepolia)
 * - Address validation
 * - HD wallet support
 * 
 * Chain IDs:
 * - Base Mainnet: 8453
 * - Base Sepolia Testnet: 84532
 */

import { ethers } from 'ethers';

export interface BaseWalletConfig {
  // Configuration for future CDP SDK integration
  apiKeyId?: string;
  apiKeySecret?: string;
  walletSecret?: string;
}

export interface BaseWalletResult {
  address: string;
  publicKey: string;
  privateKey?: string;
  mnemonic?: string;
  network: string;
  chainId: number;
}

/**
 * Base Wallet Service using ethers.js for local wallet generation
 */
export class BaseWalletService {
  constructor(private config?: BaseWalletConfig) {
    // Config stored for future CDP SDK integration
  }

  /**
   * Create a new wallet for Base network
   * 
   * @param network Target network
   * @param name Optional account name (for future use)
   * @param includePrivateKey Whether to include private key in response
   * @param includeMnemonic Whether to include mnemonic in response
   * @returns Wallet creation result
   */
  public async createAccount(
    network: 'base' | 'base-sepolia' = 'base-sepolia',
    name?: string,
    includePrivateKey: boolean = false,
    includeMnemonic: boolean = false
  ): Promise<BaseWalletResult> {
    try {
      const wallet = ethers.Wallet.createRandom();
      const chainId = network === 'base' ? 8453 : 84532;

      const result: BaseWalletResult = {
        address: wallet.address,
        publicKey: wallet.address, // For EVM, address serves as public key
        network,
        chainId
      };

      if (includePrivateKey) {
        result.privateKey = wallet.privateKey;
      }

      if (includeMnemonic && wallet.mnemonic) {
        result.mnemonic = wallet.mnemonic.phrase;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to create account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a wallet from private key
   * 
   * @param privateKey The private key
   * @param network Target network
   * @returns Wallet result
   */
  public async importFromPrivateKey(
    privateKey: string,
    network: 'base' | 'base-sepolia' = 'base-sepolia'
  ): Promise<BaseWalletResult> {
    try {
      const wallet = new ethers.Wallet(privateKey);
      const chainId = network === 'base' ? 8453 : 84532;

      return {
        address: wallet.address,
        publicKey: wallet.address,
        network,
        chainId
      };
    } catch (error) {
      throw new Error(`Failed to import wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a wallet from mnemonic
   * 
   * @param mnemonic The mnemonic phrase
   * @param network Target network
   * @param path Optional derivation path
   * @returns Wallet result
   */
  public async importFromMnemonic(
    mnemonic: string,
    network: 'base' | 'base-sepolia' = 'base-sepolia',
    path?: string
  ): Promise<BaseWalletResult> {
    try {
      const derivationPath = path || "m/44'/60'/0'/0/0";
      const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, derivationPath);
      const chainId = network === 'base' ? 8453 : 84532;

      return {
        address: hdNode.address,
        publicKey: hdNode.address,
        network,
        chainId,
        mnemonic: hdNode.mnemonic?.phrase
      };
    } catch (error) {
      throw new Error(`Failed to import from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple wallets from one mnemonic
   * 
   * @param mnemonic The mnemonic phrase
   * @param count Number of wallets to generate
   * @param network Target network
   * @returns Array of wallet results
   */
  public async generateHDWallets(
    mnemonic: string,
    count: number,
    network: 'base' | 'base-sepolia' = 'base-sepolia'
  ): Promise<BaseWalletResult[]> {
    try {
      const wallets: BaseWalletResult[] = [];
      const chainId = network === 'base' ? 8453 : 84532;

      for (let i = 0; i < count; i++) {
        const path = `m/44'/60'/0'/0/${i}`;
        const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic).derivePath(path);
        
        wallets.push({
          address: hdNode.address,
          publicKey: hdNode.address,
          network,
          chainId
        });
      }

      return wallets;
    } catch (error) {
      throw new Error(`Failed to generate HD wallets: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate a Base address
   * 
   * @param address The address to validate
   * @returns True if valid, false otherwise
   */
  public validateAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Get chain configuration for Base networks
   * 
   * @param network The network
   * @returns Chain configuration
   */
  public static getChainConfig(network: 'base' | 'base-sepolia' = 'base'): {
    chainId: number;
    name: string;
    symbol: string;
    explorer: string;
    rpcUrl: string;
    networkId: string;
  } {
    if (network === 'base') {
      return {
        chainId: 8453,
        name: 'Base Mainnet',
        symbol: 'ETH',
        explorer: 'https://basescan.org',
        rpcUrl: 'https://mainnet.base.org',
        networkId: 'base'
      };
    } else {
      return {
        chainId: 84532,
        name: 'Base Sepolia Testnet',
        symbol: 'ETH',
        explorer: 'https://sepolia.basescan.org',
        rpcUrl: 'https://sepolia.base.org',
        networkId: 'base-sepolia'
      };
    }
  }
}

/**
 * Create a Base wallet service instance
 * 
 * @param config Optional configuration
 * @returns BaseWalletService instance
 */
export function createBaseWalletService(config?: BaseWalletConfig): BaseWalletService {
  return new BaseWalletService(config);
}
