/**
 * Cosmos Wallet Generator
 * Handles wallet generation for Cosmos SDK based chains
 */

import { DirectSecp256k1HdWallet, DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { stringToPath, HdPath } from '@cosmjs/crypto';
import { fromHex, toHex } from '@cosmjs/encoding';
import * as bip39 from 'bip39';
import { WalletGenerator, Wallet as WalletInterface, WalletMetadata } from '../WalletGenerator';

/**
 * Interface for a generated Cosmos wallet
 */
export interface GeneratedWallet {
  address: string;
  publicKey: string;
  privateKey?: string;
  mnemonic?: string;
  prefix?: string;
  chainId?: string;
}

export interface WalletGenerationOptions {
  includePrivateKey?: boolean;
  includeMnemonic?: boolean;
  prefix?: string;
  hdPath?: string;
  chainId?: string;
}

/**
 * Supported Cosmos chains configuration
 */
export const COSMOS_CHAINS: { [key: string]: { prefix: string; coinType: number; chainId: string } } = {
  cosmos: { prefix: 'cosmos', coinType: 118, chainId: 'cosmoshub-4' },
  osmosis: { prefix: 'osmo', coinType: 118, chainId: 'osmosis-1' },
  juno: { prefix: 'juno', coinType: 118, chainId: 'juno-1' },
  secret: { prefix: 'secret', coinType: 529, chainId: 'secret-4' },
  akash: { prefix: 'akash', coinType: 118, chainId: 'akashnet-2' },
  persistence: { prefix: 'persistence', coinType: 118, chainId: 'core-1' },
  stride: { prefix: 'stride', coinType: 118, chainId: 'stride-1' },
  quicksilver: { prefix: 'quick', coinType: 118, chainId: 'quicksilver-2' },
  kava: { prefix: 'kava', coinType: 459, chainId: 'kava_2222-10' },
  evmos: { prefix: 'evmos', coinType: 60, chainId: 'evmos_9001-2' },
  dydx: { prefix: 'dydx', coinType: 118, chainId: 'dydx-mainnet-1' },
  celestia: { prefix: 'celestia', coinType: 118, chainId: 'celestia' },
};

/**
 * Implementation of WalletGenerator for Cosmos SDK wallets
 */
export class CosmosWalletGenerator implements WalletGenerator {
  private prefix: string;
  private chainId: string;
  private coinType: number;

  constructor(chain: string = 'cosmos') {
    const config = COSMOS_CHAINS[chain] || COSMOS_CHAINS.cosmos;
    this.prefix = config.prefix;
    this.chainId = config.chainId;
    this.coinType = config.coinType;
  }

  /**
   * Generate a new Cosmos wallet
   * @returns A wallet generation result with address and private key
   */
  public async generateWallet(): Promise<WalletInterface> {
    const mnemonic = bip39.generateMnemonic();
    const hdPath = this.getHdPath();
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: this.prefix,
      hdPaths: [hdPath]
    });

    const [account] = await wallet.getAccounts();
    
    return {
      address: account.address,
      // Note: DirectSecp256k1HdWallet doesn't expose private keys for security
      privateKey: '', // Not available from HD wallet
      publicKey: toHex(account.pubkey),
      mnemonic: mnemonic, // ✅ FIX: Return mnemonic that was generated
      metadata: this.getMetadata()
    };
  }

  /**
   * Generate HD path for the chain
   */
  private getHdPath(accountIndex: number = 0): HdPath {
    return stringToPath(`m/44'/${this.coinType}'/${accountIndex}'/0/0`);
  }

  /**
   * Validate a Cosmos address
   * @param address The address to validate
   * @returns True if the address is valid, false otherwise
   */
  public validateAddress(address: string): boolean {
    try {
      // Check if address starts with the expected prefix
      if (!address.startsWith(this.prefix)) {
        return false;
      }

      // Basic bech32 validation
      const bech32Regex = new RegExp(`^${this.prefix}1[a-z0-9]{38,}$`);
      return bech32Regex.test(address);
    } catch {
      return false;
    }
  }

  /**
   * Static helper method to validate an address with specific prefix
   * @param address The address to validate
   * @param prefix The expected prefix
   * @returns True if the address is valid, false otherwise
   */
  public static isValidAddress(address: string, prefix: string = 'cosmos'): boolean {
    try {
      if (!address.startsWith(prefix)) {
        return false;
      }
      const bech32Regex = new RegExp(`^${prefix}1[a-z0-9]{38,}$`);
      return bech32Regex.test(address);
    } catch {
      return false;
    }
  }

  /**
   * Get the wallet type
   * @returns The string identifier for this wallet type
   */
  public getWalletType(): string {
    return `cosmos-${this.prefix}`;
  }

  /**
   * Get metadata for the wallet
   * @returns The wallet metadata
   */
  public getMetadata(): WalletMetadata {
    return {
      type: `cosmos-${this.prefix}`,
      chainId: -1, // Cosmos doesn't use numeric chain IDs
      standard: 'COSMOS',
      coinType: this.coinType.toString(),
      network: this.chainId
    };
  }

  /**
   * Create a wallet from a private key
   * @param privateKey The private key (hex string)
   * @returns The wallet
   */
  public static async walletFromPrivateKey(
    privateKey: string,
    prefix: string = 'cosmos'
  ): Promise<GeneratedWallet> {
    const privKeyBytes = fromHex(privateKey.replace('0x', ''));
    const wallet = await DirectSecp256k1Wallet.fromKey(privKeyBytes, prefix);
    
    const [account] = await wallet.getAccounts();
    
    return {
      address: account.address,
      publicKey: toHex(account.pubkey),
      privateKey: privateKey,
      prefix: prefix
    };
  }

  /**
   * Create a wallet from a mnemonic phrase
   */
  public static async fromMnemonic(
    mnemonic: string,
    options: WalletGenerationOptions = {}
  ): Promise<GeneratedWallet> {
    try {
      const prefix = options.prefix || 'cosmos';
      const hdPath = options.hdPath || `m/44'/118'/0'/0/0`;
      
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: prefix,
        hdPaths: [stringToPath(hdPath)]
      });
      
      const [account] = await wallet.getAccounts();
      
      return CosmosWalletGenerator.formatWalletOutput(
        account.address,
        toHex(account.pubkey),
        '', // Private key not available from HD wallet
        mnemonic,
        prefix,
        options
      );
    } catch (error) {
      throw new Error(`Invalid mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple Cosmos wallets
   */
  public static async generateMultipleWallets(
    count: number,
    options: WalletGenerationOptions = {}
  ): Promise<GeneratedWallet[]> {
    const wallets: GeneratedWallet[] = [];
    const prefix = options.prefix || 'cosmos';
    const coinType = COSMOS_CHAINS[prefix]?.coinType || 118;
    
    // Generate a single mnemonic for HD derivation
    const mnemonic = bip39.generateMnemonic();
    
    for (let i = 0; i < count; i++) {
      const hdPath = `m/44'/${coinType}'/${i}'/0/0`;
      
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: prefix,
        hdPaths: [stringToPath(hdPath)]
      });
      
      const [account] = await wallet.getAccounts();
      
      const generatedWallet = CosmosWalletGenerator.formatWalletOutput(
        account.address,
        toHex(account.pubkey),
        '', // Private key not available from HD wallet
        i === 0 ? mnemonic : undefined, // Only include mnemonic for first wallet
        prefix,
        options
      );
      
      wallets.push(generatedWallet);
    }
    
    return wallets;
  }

  /**
   * Format wallet output based on options
   */
  private static formatWalletOutput(
    address: string,
    publicKey: string,
    privateKey: string,
    mnemonic: string | undefined,
    prefix: string,
    options: WalletGenerationOptions = {}
  ): GeneratedWallet {
    const result: GeneratedWallet = {
      address: address,
      publicKey: publicKey,
      prefix: prefix
    };

    if (options.includePrivateKey) {
      result.privateKey = privateKey;
    }

    if (options.includeMnemonic && mnemonic) {
      result.mnemonic = mnemonic;
    }

    if (options.chainId) {
      result.chainId = options.chainId;
    }

    return result;
  }

  /**
   * Get chain configuration
   */
  public static getChainConfig(chain: string): typeof COSMOS_CHAINS[string] | undefined {
    return COSMOS_CHAINS[chain];
  }

  /**
   * Get supported chains
   */
  public static getSupportedChains(): string[] {
    return Object.keys(COSMOS_CHAINS);
  }
}