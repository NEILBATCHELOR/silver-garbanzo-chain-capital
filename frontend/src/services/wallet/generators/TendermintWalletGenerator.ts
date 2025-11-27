/**
 * Tendermint Wallet Generator
 * Handles wallet generation for Tendermint-based chains
 */

import { DirectSecp256k1HdWallet, DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { stringToPath, HdPath } from '@cosmjs/crypto';
import { fromHex, toHex } from '@cosmjs/encoding';
import * as bip39 from 'bip39';
import { WalletGenerator, Wallet as WalletInterface, WalletMetadata } from '../WalletGenerator';

/**
 * Interface for a generated Tendermint wallet
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
 * Supported Tendermint chains configuration
 */
export const TENDERMINT_CHAINS: { [key: string]: { prefix: string; coinType: number; chainId: string } } = {
  // Core Tendermint chains
  tendermint: { prefix: 'tm', coinType: 118, chainId: 'tendermint-1' },
  
  // BFT consensus chains
  terra: { prefix: 'terra', coinType: 330, chainId: 'phoenix-1' },
  terraClassic: { prefix: 'terra', coinType: 118, chainId: 'columbus-5' },
  
  // Binance Chain (uses Tendermint BFT)
  binance: { prefix: 'bnb', coinType: 714, chainId: 'Binance-Chain-Tigris' },
  
  // Other Tendermint-based chains
  cronos: { prefix: 'cro', coinType: 394, chainId: 'crypto-org-chain-mainnet-1' },
  thorchain: { prefix: 'thor', coinType: 931, chainId: 'thorchain-mainnet-v1' },
  band: { prefix: 'band', coinType: 494, chainId: 'laozi-mainnet' },
  iris: { prefix: 'iaa', coinType: 118, chainId: 'irishub-1' },
  okexchain: { prefix: 'ex', coinType: 996, chainId: 'exchain-66' },
  emoney: { prefix: 'emoney', coinType: 118, chainId: 'emoney-3' },
  sifchain: { prefix: 'sif', coinType: 118, chainId: 'sifchain-1' },
  starname: { prefix: 'star', coinType: 234, chainId: 'iov-mainnet-ibc' },
  regen: { prefix: 'regen', coinType: 118, chainId: 'regen-1' },
  sentinel: { prefix: 'sent', coinType: 118, chainId: 'sentinelhub-2' },
  ixo: { prefix: 'ixo', coinType: 118, chainId: 'ixo-5' },
  desmos: { prefix: 'desmos', coinType: 852, chainId: 'desmos-mainnet' },
  agoric: { prefix: 'agoric', coinType: 564, chainId: 'agoric-3' },
  bitsong: { prefix: 'bitsong', coinType: 639, chainId: 'bitsong-2b' },
  chihuahua: { prefix: 'chihuahua', coinType: 118, chainId: 'chihuahua-1' },
  comdex: { prefix: 'comdex', coinType: 118, chainId: 'comdex-1' },
  lum: { prefix: 'lum', coinType: 880, chainId: 'lum-network-1' },
  fetch: { prefix: 'fetch', coinType: 118, chainId: 'fetchhub-4' },
  kichain: { prefix: 'ki', coinType: 118, chainId: 'kichain-2' },
  medibloc: { prefix: 'panacea', coinType: 371, chainId: 'panacea-3' },
  bostrom: { prefix: 'bostrom', coinType: 118, chainId: 'bostrom' },
  konstellation: { prefix: 'darc', coinType: 118, chainId: 'darchub' },
  umee: { prefix: 'umee', coinType: 118, chainId: 'umee-1' },
  gravity: { prefix: 'gravity', coinType: 118, chainId: 'gravity-bridge-3' },
  sommelier: { prefix: 'somm', coinType: 118, chainId: 'sommelier-3' },
  stargaze: { prefix: 'stars', coinType: 118, chainId: 'stargaze-1' },
  assetmantle: { prefix: 'mantle', coinType: 118, chainId: 'mantle-1' },
  crescent: { prefix: 'cre', coinType: 118, chainId: 'crescent-1' },
  axelar: { prefix: 'axelar', coinType: 118, chainId: 'axelar-dojo-1' },
  provenance: { prefix: 'pb', coinType: 505, chainId: 'pio-mainnet-1' },
};

/**
 * Implementation of WalletGenerator for Tendermint wallets
 */
export class TendermintWalletGenerator implements WalletGenerator {
  private prefix: string;
  private chainId: string;
  private coinType: number;

  constructor(chain: string = 'tendermint') {
    const config = TENDERMINT_CHAINS[chain] || TENDERMINT_CHAINS.tendermint;
    this.prefix = config.prefix;
    this.chainId = config.chainId;
    this.coinType = config.coinType;
  }

  /**
   * Generate a new Tendermint wallet
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
   * Validate a Tendermint address
   * @param address The address to validate
   * @returns True if the address is valid, false otherwise
   */
  public validateAddress(address: string): boolean {
    try {
      // Check if address starts with the expected prefix
      if (!address.startsWith(this.prefix)) {
        return false;
      }

      // Basic bech32 validation for Tendermint addresses
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
  public static isValidAddress(address: string, prefix: string = 'tm'): boolean {
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
    return `tendermint-${this.prefix}`;
  }

  /**
   * Get metadata for the wallet
   * @returns The wallet metadata
   */
  public getMetadata(): WalletMetadata {
    return {
      type: `tendermint-${this.prefix}`,
      chainId: -1, // Tendermint doesn't use numeric chain IDs
      standard: 'TENDERMINT',
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
    prefix: string = 'tm'
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
      const prefix = options.prefix || 'tm';
      const chain = Object.entries(TENDERMINT_CHAINS).find(([_, config]) => config.prefix === prefix)?.[0] || 'tendermint';
      const coinType = TENDERMINT_CHAINS[chain]?.coinType || 118;
      const hdPath = options.hdPath || `m/44'/${coinType}'/0'/0/0`;
      
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: prefix,
        hdPaths: [stringToPath(hdPath)]
      });
      
      const [account] = await wallet.getAccounts();
      
      return TendermintWalletGenerator.formatWalletOutput(
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
   * Generate multiple Tendermint wallets
   */
  public static async generateMultipleWallets(
    count: number,
    options: WalletGenerationOptions = {}
  ): Promise<GeneratedWallet[]> {
    const wallets: GeneratedWallet[] = [];
    const prefix = options.prefix || 'tm';
    const chain = Object.entries(TENDERMINT_CHAINS).find(([_, config]) => config.prefix === prefix)?.[0] || 'tendermint';
    const coinType = TENDERMINT_CHAINS[chain]?.coinType || 118;
    
    // Generate a single mnemonic for HD derivation
    const mnemonic = bip39.generateMnemonic();
    
    for (let i = 0; i < count; i++) {
      const hdPath = `m/44'/${coinType}'/${i}'/0/0`;
      
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: prefix,
        hdPaths: [stringToPath(hdPath)]
      });
      
      const [account] = await wallet.getAccounts();
      
      const generatedWallet = TendermintWalletGenerator.formatWalletOutput(
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
  public static getChainConfig(chain: string): typeof TENDERMINT_CHAINS[string] | undefined {
    return TENDERMINT_CHAINS[chain];
  }

  /**
   * Get supported chains
   */
  public static getSupportedChains(): string[] {
    return Object.keys(TENDERMINT_CHAINS);
  }

  /**
   * Check if a chain uses Tendermint consensus
   */
  public static isTendermintChain(chainId: string): boolean {
    return Object.values(TENDERMINT_CHAINS).some(config => config.chainId === chainId);
  }
}