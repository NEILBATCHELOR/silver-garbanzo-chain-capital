import { ethers } from 'ethers';
import { Wallet as EthersWallet, HDNodeWallet } from 'ethers';
import { WalletGenerator, Wallet as WalletInterface, WalletMetadata, WalletGenerationOptions } from '../WalletGenerator';

/**
 * Interface for a generated Base wallet
 */
export interface GeneratedBaseWallet {
  address: string;
  publicKey: string;
  privateKey?: string;
  mnemonic?: string;
}

/**
 * Base-specific wallet generation options
 */
export interface BaseWalletGenerationOptions extends WalletGenerationOptions {
  network?: 'mainnet' | 'sepolia'; // Base Mainnet or Base Sepolia Testnet
  path?: string; // HD wallet derivation path
  useCDP?: boolean; // Whether to use Coinbase Developer Platform SDK (backend only)
}

/**
 * Implementation of WalletGenerator for Base Network (Ethereum L2)
 * Base is an Ethereum Layer 2 solution built by Coinbase
 * 
 * Chain IDs:
 * - Base Mainnet: 8453
 * - Base Sepolia Testnet: 84532
 * 
 * Features:
 * - Full EVM compatibility
 * - Ethereum-style addresses and private keys
 * - HD wallet support with BIP44 derivation
 * - Integration with Coinbase Developer Platform SDK
 * - Support for both mainnet and testnet
 */
export class BaseWalletGenerator implements WalletGenerator {
  private readonly MAINNET_CHAIN_ID = 8453;
  private readonly TESTNET_CHAIN_ID = 84532;
  
  /**
   * Generate a new Base wallet
   * @param options Wallet generation options
   * @returns A wallet generation result with address, private key, and optionally mnemonic
   */
  public async generateWallet(options: BaseWalletGenerationOptions = {}): Promise<WalletInterface> {
    const generatedWallet = BaseWalletGenerator.generateWallet(options);
    
    const chainId = options.network === 'mainnet' 
      ? this.MAINNET_CHAIN_ID 
      : this.TESTNET_CHAIN_ID;
    
    return {
      address: generatedWallet.address,
      privateKey: generatedWallet.privateKey || '',
      publicKey: generatedWallet.publicKey,
      mnemonic: generatedWallet.mnemonic,
      metadata: this.getMetadata(chainId)
    };
  }

  /**
   * Validate a Base address (same as Ethereum address validation)
   * @param address The address to validate
   * @returns True if the address is valid, false otherwise
   */
  public validateAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Static helper method to validate an address
   * @param address The address to validate
   * @returns True if the address is valid, false otherwise
   */
  public static isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Get the wallet type
   * @returns The string identifier for this wallet type
   */
  public getWalletType(): string {
    return 'base';
  }

  /**
   * Get metadata for the wallet
   * @param chainId Optional chain ID (defaults to mainnet)
   * @returns The wallet metadata
   */
  public getMetadata(chainId?: number): WalletMetadata {
    const actualChainId = chainId || this.MAINNET_CHAIN_ID;
    const isMainnet = actualChainId === this.MAINNET_CHAIN_ID;
    
    return {
      type: 'base',
      chainId: actualChainId,
      standard: 'ERC20',
      coinType: '60', // Ethereum coin type for BIP44
      network: isMainnet ? 'base-mainnet' : 'base-sepolia',
      displayName: isMainnet ? 'Base Mainnet' : 'Base Sepolia Testnet',
      symbol: 'ETH',
      isL2: true,
      parentChain: 'ethereum'
    };
  }

  /**
   * Create a wallet from a private key
   * @param privateKey The private key
   * @returns The wallet
   */
  public static walletFromPrivateKey(privateKey: string): GeneratedBaseWallet {
    const wallet = new EthersWallet(privateKey);
    return {
      address: wallet.address,
      publicKey: wallet.address,
      privateKey: wallet.privateKey
    };
  }

  /**
   * Create wallets from a mnemonic phrase
   * @param mnemonic The mnemonic phrase
   * @param numWallets Number of wallets to generate
   * @param network Target network (mainnet or sepolia)
   * @returns Array of wallets
   */
  public static generateHDWallets(
    mnemonic: string,
    numWallets = 1,
    network: 'mainnet' | 'sepolia' = 'mainnet'
  ): GeneratedBaseWallet[] {
    const wallets: GeneratedBaseWallet[] = [];
    for (let i = 0; i < numWallets; i++) {
      const path = `m/44'/60'/0'/0/${i}`;
      const hdWallet = ethers.HDNodeWallet.fromPhrase(mnemonic).derivePath(path);
      wallets.push({
        address: hdWallet.address,
        publicKey: hdWallet.address,
        privateKey: hdWallet.privateKey
      });
    }
    return wallets;
  }

  /**
   * Create wallets from a mnemonic phrase using the paths provided
   * @param mnemonic The mnemonic phrase
   * @param paths Derivation paths to use
   * @returns Array of wallets
   */
  public static generateWalletsFromPaths(
    mnemonic: string,
    paths: string[]
  ): GeneratedBaseWallet[] {
    const wallets: GeneratedBaseWallet[] = [];
    for (const path of paths) {
      const hdWallet = ethers.HDNodeWallet.fromPhrase(mnemonic).derivePath(path);
      wallets.push({
        address: hdWallet.address,
        publicKey: hdWallet.address,
        privateKey: hdWallet.privateKey
      });
    }
    return wallets;
  }

  /**
   * Generate multiple wallets at once
   * @param count Number of wallets to generate
   * @param options Wallet generation options
   * @returns Array of generated wallets
   */
  public static generateMultipleWallets(
    count: number, 
    options: BaseWalletGenerationOptions = {}
  ): GeneratedBaseWallet[] {
    const wallets: GeneratedBaseWallet[] = [];
    
    for (let i = 0; i < count; i++) {
      const wallet = EthersWallet.createRandom();
      wallets.push(BaseWalletGenerator.formatWalletOutput(wallet, options));
    }
    
    return wallets;
  }
  
  /**
   * Generate a single wallet (alias for backwards compatibility)
   * @param options Wallet generation options
   * @returns A single generated wallet
   */
  public static generateWallet(
    options: BaseWalletGenerationOptions = {}
  ): GeneratedBaseWallet {
    return BaseWalletGenerator.generateMultipleWallets(1, options)[0];
  }
  
  /**
   * Create a wallet from a private key
   * @param privateKey The private key
   * @param options Wallet generation options
   * @returns Generated wallet
   */
  public static fromPrivateKey(
    privateKey: string,
    options: BaseWalletGenerationOptions = {}
  ): GeneratedBaseWallet {
    try {
      const wallet = new EthersWallet(privateKey);
      return BaseWalletGenerator.formatWalletOutput(wallet, options);
    } catch (error) {
      throw new Error(`Invalid private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Create a wallet from a mnemonic phrase
   * @param mnemonic The mnemonic phrase
   * @param options Wallet generation options
   * @returns Generated wallet
   */
  public static fromMnemonic(
    mnemonic: string,
    options: BaseWalletGenerationOptions = {}
  ): GeneratedBaseWallet {
    try {
      // Default derivation path for Ethereum (and Base)
      const defaultPath = "m/44'/60'/0'/0/0";
      const path = options.path || defaultPath;
      
      const hdWallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path);
      
      return BaseWalletGenerator.formatWalletOutput(hdWallet, { ...options, includeMnemonic: true });
    } catch (error) {
      throw new Error(`Invalid mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Format wallet output based on options
   * @param wallet The ethers.js wallet
   * @param options Generation options
   * @returns Formatted wallet output
   */
  private static formatWalletOutput(
    wallet: EthersWallet | HDNodeWallet,
    options: BaseWalletGenerationOptions = {}
  ): GeneratedBaseWallet {
    const result: GeneratedBaseWallet = {
      address: wallet.address,
      publicKey: wallet.address,
    };

    if (options.includePrivateKey) {
      result.privateKey = wallet.privateKey;
    }

    if (options.includeMnemonic && 'mnemonic' in wallet && wallet.mnemonic) {
      result.mnemonic = wallet.mnemonic.phrase;
    }

    return result;
  }
  
  /**
   * Encrypt a wallet for secure storage
   * @param wallet The wallet to encrypt
   * @param password The password to use
   * @returns Encrypted JSON string
   */
  public static async encryptWallet(
    wallet: EthersWallet, 
    password: string
  ): Promise<string> {
    return wallet.encrypt(password);
  }
  
  /**
   * Decrypt a wallet from storage
   * @param encryptedJson The encrypted wallet JSON
   * @param password The password to decrypt with
   * @returns Decrypted wallet
   */
  public static async decryptWallet(
    encryptedJson: string,
    password: string
  ): Promise<EthersWallet | HDNodeWallet> {
    return await EthersWallet.fromEncryptedJson(encryptedJson, password);
  }

  /**
   * Get chain configuration for Base networks
   * @param network The network (mainnet or sepolia)
   * @returns Chain configuration
   */
  public static getChainConfig(network: 'mainnet' | 'sepolia' = 'mainnet'): {
    chainId: number;
    name: string;
    symbol: string;
    explorer: string;
    rpcUrl: string;
  } {
    if (network === 'mainnet') {
      return {
        chainId: 8453,
        name: 'Base Mainnet',
        symbol: 'ETH',
        explorer: 'https://basescan.org',
        rpcUrl: 'https://mainnet.base.org'
      };
    } else {
      return {
        chainId: 84532,
        name: 'Base Sepolia Testnet',
        symbol: 'ETH',
        explorer: 'https://sepolia.basescan.org',
        rpcUrl: 'https://sepolia.base.org'
      };
    }
  }
}
