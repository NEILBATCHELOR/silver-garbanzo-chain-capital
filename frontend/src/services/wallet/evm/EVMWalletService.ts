/**
 * Enhanced EVM Wallet Service
 * Handles account generation, import, validation, and comprehensive wallet operations for EVM chains
 * Supports Ethereum, Polygon, Arbitrum, Optimism, Base, BSC, ZKSync, and Avalanche
 */

import { ethers, Wallet, HDNodeWallet } from 'ethers';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import CryptoJS from 'crypto-js';

export interface EVMAccountInfo {
  address: string;
  publicKey: string;
  privateKey?: string;
  mnemonic?: string;
  balance?: string;
  chainId?: string;
  derivationPath?: string;
}

export interface EVMGenerationOptions {
  includePrivateKey?: boolean;
  includeMnemonic?: boolean;
  derivationPath?: string;
  entropy?: string;
  chainId?: string;
}

export interface EVMEncryptedWallet {
  encryptedData: string;
  address: string;
  publicKey: string;
  chainId?: string;
}

export interface EVMNetworkInfo {
  name: string;
  chainId: string;
  rpcUrl?: string;
  isConnected?: boolean;
}

export class EVMWalletService {
  private network: string;
  private chainId: string;

  constructor(
    network: string = 'ethereum',
    chainId: string = '1'
  ) {
    this.network = network;
    this.chainId = chainId;
  }

  // ============================================================================
  // WALLET GENERATION (Enhanced)
  // ============================================================================

  /**
   * Generate a new EVM account with enhanced options
   */
  generateAccount(options: EVMGenerationOptions = {}): EVMAccountInfo {
    try {
      const wallet = Wallet.createRandom();
      
      const result: EVMAccountInfo = {
        address: wallet.address,
        publicKey: wallet.signingKey.publicKey,
        chainId: options.chainId || this.chainId
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = wallet.privateKey;
      }

      if (options.includeMnemonic) {
        result.mnemonic = wallet.mnemonic?.phrase;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to generate EVM account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple EVM accounts at once
   */
  generateMultipleAccounts(
    count: number,
    options: EVMGenerationOptions = {}
  ): EVMAccountInfo[] {
    const accounts: EVMAccountInfo[] = [];
    
    for (let i = 0; i < count; i++) {
      accounts.push(this.generateAccount(options));
    }
    
    return accounts;
  }

  /**
   * Import an existing account using private key
   */
  async importAccount(privateKey: string, options: EVMGenerationOptions = {}): Promise<EVMAccountInfo> {
    try {
      // Normalize private key format
      let normalizedKey = privateKey;
      if (!privateKey.startsWith('0x')) {
        normalizedKey = `0x${privateKey}`;
      }

      const wallet = new Wallet(normalizedKey);
      
      const result: EVMAccountInfo = {
        address: wallet.address,
        publicKey: wallet.signingKey.publicKey,
        chainId: options.chainId || this.chainId
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = wallet.privateKey;
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid EVM private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from private key (synchronous version)
   */
  fromPrivateKey(privateKey: string, options: EVMGenerationOptions = {}): EVMAccountInfo {
    try {
      let normalizedKey = privateKey;
      if (!privateKey.startsWith('0x')) {
        normalizedKey = `0x${privateKey}`;
      }

      const wallet = new Wallet(normalizedKey);
      
      const result: EVMAccountInfo = {
        address: wallet.address,
        publicKey: wallet.signingKey.publicKey,
        chainId: options.chainId || this.chainId
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = wallet.privateKey;
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid EVM private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // HD WALLET SUPPORT (Enhanced)
  // ============================================================================

  /**
   * Generate account from mnemonic phrase
   */
  fromMnemonic(
    mnemonic: string,
    derivationIndex: number = 0,
    options: EVMGenerationOptions = {}
  ): EVMAccountInfo {
    try {
      if (!validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      const derivationPath = options.derivationPath || `m/44'/60'/0'/0/${derivationIndex}`;
      const hdWallet = HDNodeWallet.fromPhrase(mnemonic, undefined, derivationPath);
      
      const result: EVMAccountInfo = {
        address: hdWallet.address,
        publicKey: hdWallet.signingKey.publicKey,
        chainId: options.chainId || this.chainId,
        derivationPath
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = hdWallet.privateKey;
      }

      if (options.includeMnemonic !== false) {
        result.mnemonic = mnemonic;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to create account from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple HD wallets from single mnemonic
   */
  generateHDWallets(
    mnemonic: string,
    numWallets: number,
    options: EVMGenerationOptions = {}
  ): EVMAccountInfo[] {
    const accounts: EVMAccountInfo[] = [];
    
    for (let i = 0; i < numWallets; i++) {
      accounts.push(this.fromMnemonic(mnemonic, i, options));
    }
    
    return accounts;
  }

  /**
   * Generate new mnemonic phrase
   */
  generateMnemonic(entropy?: string): string {
    return generateMnemonic(128); // 12 words
  }

  // ============================================================================
  // WALLET ENCRYPTION (Enhanced)
  // ============================================================================

  /**
   * Encrypt wallet with password using AES-256
   */
  async encryptWallet(account: EVMAccountInfo, password: string): Promise<EVMEncryptedWallet> {
    try {
      if (!account.privateKey) {
        throw new Error('Private key required for wallet encryption');
      }

      const dataToEncrypt = {
        privateKey: account.privateKey,
        address: account.address,
        publicKey: account.publicKey,
        mnemonic: account.mnemonic,
        chainId: account.chainId,
        derivationPath: account.derivationPath
      };

      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify(dataToEncrypt),
        password
      ).toString();

      return {
        encryptedData,
        address: account.address,
        publicKey: account.publicKey,
        chainId: account.chainId
      };
    } catch (error) {
      throw new Error(`Failed to encrypt wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Decrypt wallet with password
   */
  async decryptWallet(encryptedWallet: EVMEncryptedWallet, password: string): Promise<EVMAccountInfo> {
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedWallet.encryptedData, password);
      const decryptedData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));

      return {
        address: decryptedData.address,
        publicKey: decryptedData.publicKey,
        privateKey: decryptedData.privateKey,
        mnemonic: decryptedData.mnemonic,
        chainId: decryptedData.chainId,
        derivationPath: decryptedData.derivationPath
      };
    } catch (error) {
      throw new Error(`Failed to decrypt wallet: Invalid password or corrupted data`);
    }
  }

  // ============================================================================
  // VALIDATION UTILITIES (Enhanced)
  // ============================================================================

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Validate private key format
   */
  isValidPrivateKey(privateKey: string): boolean {
    try {
      let normalizedKey = privateKey;
      if (!privateKey.startsWith('0x')) {
        normalizedKey = `0x${privateKey}`;
      }
      
      // Try to create a wallet with the private key
      new Wallet(normalizedKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate mnemonic phrase
   */
  isValidMnemonic(mnemonic: string): boolean {
    return validateMnemonic(mnemonic);
  }

  /**
   * Validate account structure
   */
  isValidAccount(account: unknown): account is EVMAccountInfo {
    return (
      typeof account === 'object' &&
      account !== null &&
      typeof (account as EVMAccountInfo).address === 'string' &&
      typeof (account as EVMAccountInfo).publicKey === 'string' &&
      this.isValidAddress((account as EVMAccountInfo).address)
    );
  }

  // ============================================================================
  // NETWORK UTILITIES
  // ============================================================================

  /**
   * Update network configuration
   */
  updateNetwork(network: string, chainId: string): void {
    this.network = network;
    this.chainId = chainId;
  }

  /**
   * Get current network information
   */
  getNetworkInfo(): EVMNetworkInfo {
    return {
      name: this.network,
      chainId: this.chainId
    };
  }

  // ============================================================================
  // FORMATTING UTILITIES
  // ============================================================================

  /**
   * Format address for display
   */
  formatAddress(address: string, short: boolean = false): string {
    if (!this.isValidAddress(address)) {
      return address;
    }

    if (short) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    return ethers.getAddress(address); // Checksum format
  }

  /**
   * Convert private key to different formats
   */
  formatPrivateKey(privateKey: string, format: 'hex' | 'buffer' | 'uint8array' = 'hex'): string | Buffer | Uint8Array {
    let normalizedKey = privateKey;
    if (!privateKey.startsWith('0x')) {
      normalizedKey = `0x${privateKey}`;
    }

    switch (format) {
      case 'hex':
        return normalizedKey;
      case 'buffer':
        return Buffer.from(normalizedKey.slice(2), 'hex');
      case 'uint8array':
        return new Uint8Array(Buffer.from(normalizedKey.slice(2), 'hex'));
      default:
        return normalizedKey;
    }
  }
}

// Static utility class for common operations
export class EVMWallet {
  static generateAccount = (options?: EVMGenerationOptions): EVMAccountInfo => {
    const service = new EVMWalletService();
    return service.generateAccount(options);
  };

  static importAccount = async (privateKey: string, options?: EVMGenerationOptions): Promise<EVMAccountInfo> => {
    const service = new EVMWalletService();
    return service.importAccount(privateKey, options);
  };

  static fromMnemonic = (mnemonic: string, index?: number, options?: EVMGenerationOptions): EVMAccountInfo => {
    const service = new EVMWalletService();
    return service.fromMnemonic(mnemonic, index, options);
  };

  static isValidAddress = (address: string): boolean => {
    return ethers.isAddress(address);
  };

  static isValidPrivateKey = (privateKey: string): boolean => {
    const service = new EVMWalletService();
    return service.isValidPrivateKey(privateKey);
  };
}

// Service instances for different networks
export const evmWalletService = new EVMWalletService('ethereum', '1');
export const ethereumWalletService = new EVMWalletService('ethereum', '1');
export const polygonWalletService = new EVMWalletService('polygon', '137');
export const arbitrumWalletService = new EVMWalletService('arbitrum', '42161');
export const optimismWalletService = new EVMWalletService('optimism', '10');
export const baseWalletService = new EVMWalletService('base', '8453');
export const avalancheWalletService = new EVMWalletService('avalanche', '43114');
export const bscWalletService = new EVMWalletService('bsc', '56');

// Testnet instances
export const ethereumSepoliaWalletService = new EVMWalletService('ethereum-sepolia', '11155111');
export const polygonMumbaiWalletService = new EVMWalletService('polygon-mumbai', '80001');
export const arbitrumSepoliaWalletService = new EVMWalletService('arbitrum-sepolia', '421614');
export const optimismSepoliaWalletService = new EVMWalletService('optimism-sepolia', '11155420');
export const baseSepoliaWalletService = new EVMWalletService('base-sepolia', '84532');
export const avalancheFujiWalletService = new EVMWalletService('avalanche-fuji', '43113');
export const bscTestnetWalletService = new EVMWalletService('bsc-testnet', '97');
