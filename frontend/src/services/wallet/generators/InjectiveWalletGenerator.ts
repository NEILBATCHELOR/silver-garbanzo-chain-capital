import { PrivateKey, Address } from '@injectivelabs/sdk-ts';
import * as bip39 from 'bip39';
import { WalletGenerator, Wallet as WalletInterface, WalletMetadata } from '../WalletGenerator';

/**
 * Interface for a generated wallet
 */
export interface GeneratedWallet {
  address: string;
  publicKey: string;
  privateKey?: string; // Optional - only included if explicitly requested
  mnemonic?: string;
}

export interface WalletGenerationOptions {
  includePrivateKey?: boolean;
  includeMnemonic?: boolean;
}

/**
 * Implementation of WalletGenerator for Injective wallets
 */
export class InjectiveWalletGenerator implements WalletGenerator {
  /**
   * Generate a new Injective wallet
   * @returns A wallet generation result with address and private key
   */
  public async generateWallet(): Promise<WalletInterface> {
    const mnemonic = bip39.generateMnemonic();
    const privateKey = PrivateKey.fromMnemonic(mnemonic);

    return {
      address: privateKey.toAddress().toBech32(),
      privateKey: privateKey.toHex(),
      publicKey: privateKey.toPublicKey().toBase64(),
      metadata: this.getMetadata()
    };
  }

  /**
   * Validate an Injective address
   * @param address The address to validate
   * @returns True if the address is valid, false otherwise
   */
  public validateAddress(address: string): boolean {
    try {
      Address.fromBech32(address);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Static helper method to validate an address
   * @param address The address to validate
   * @returns True if the address is valid, false otherwise
   */
  public static isValidAddress(address: string): boolean {
    try {
      Address.fromBech32(address);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get the wallet type
   * @returns The string identifier for this wallet type
   */
  public getWalletType(): string {
    return 'injective';
  }

  /**
   * Get metadata for the wallet
   * @returns The wallet metadata
   */
  public getMetadata(): WalletMetadata {
    return {
      type: 'injective',
      chainId: -1, // Injective does not have a traditional chainId
      standard: 'INJ',
      coinType: '60', // Same as Ethereum
      network: 'injective'
    };
  }

  /**
   * Create a wallet from a private key
   * @param privateKey The private key
   * @returns The wallet
   */
  public static walletFromPrivateKey(privateKey: string): GeneratedWallet {
    const pk = PrivateKey.fromHex(privateKey);
    return {
      address: pk.toAddress().toBech32(),
      publicKey: pk.toPublicKey().toBase64(),
      privateKey: pk.toHex()
    };
  }

  /**
   * Create a wallet from a mnemonic phrase
   */
  public static fromMnemonic(
    mnemonic: string,
    options: WalletGenerationOptions = {}
  ): GeneratedWallet {
    try {
      const privateKey = PrivateKey.fromMnemonic(mnemonic);
      return InjectiveWalletGenerator.formatWalletOutput(privateKey, mnemonic, options);
    } catch (error) {
      throw new Error(`Invalid mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Format wallet output based on options
   * @param privateKey The Injective private key
   * @param mnemonic The mnemonic phrase
   * @param options Generation options
   * @returns Formatted wallet output
   */
  private static formatWalletOutput(
    privateKey: PrivateKey,
    mnemonic: string,
    options: WalletGenerationOptions = {}
  ): GeneratedWallet {
    const result: GeneratedWallet = {
      address: privateKey.toAddress().toBech32(),
      publicKey: privateKey.toPublicKey().toBase64(),
    };

    if (options.includePrivateKey) {
      result.privateKey = privateKey.toHex();
    }

    if (options.includeMnemonic) {
      result.mnemonic = mnemonic;
    }

    return result;
  }
}
