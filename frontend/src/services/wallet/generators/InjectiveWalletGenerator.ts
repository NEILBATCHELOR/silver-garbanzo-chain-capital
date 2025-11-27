import { PrivateKey, Address, getEthereumAddress } from '@injectivelabs/sdk-ts';
import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import { WalletGenerator, Wallet as WalletInterface, WalletMetadata } from '../WalletGenerator';
import { injectiveWalletService } from '../injective/InjectiveWalletService';

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
   * @param options Wallet generation options
   * @returns A wallet generation result with address, private key, and optionally mnemonic
   */
  public async generateWallet(options?: WalletGenerationOptions): Promise<WalletInterface> {
    const includePrivateKey = options?.includePrivateKey ?? true;
    const includeMnemonic = options?.includeMnemonic ?? false;

    const account = await injectiveWalletService.generateAccount({
      includePrivateKey,
      includeMnemonic
    });

    return {
      address: account.address,
      privateKey: includePrivateKey ? account.privateKey ?? '' : '',
      publicKey: account.publicKey,
      mnemonic: includeMnemonic ? account.mnemonic : undefined, // ✅ FIX: Return mnemonic if requested
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

  /**
   * Derive EVM address from Injective bech32 address
   * @param injectiveAddress The Injective bech32 address (inj1...)
   * @returns The corresponding EVM address (0x...)
   */
  public static getEvmAddress(injectiveAddress: string): string {
    try {
      return getEthereumAddress(injectiveAddress);
    } catch (error) {
      throw new Error(`Failed to derive EVM address: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Derive EVM-compatible private key from mnemonic
   * This derives an Ethereum private key using BIP44 path m/44'/60'/0'/0/0
   * @param mnemonic The mnemonic phrase
   * @returns The EVM private key (64 hex characters with 0x prefix)
   */
  public static getEvmPrivateKey(mnemonic: string): string {
    try {
      // Derive Ethereum private key from mnemonic using standard BIP44 path
      const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
      return hdNode.privateKey; // Returns 0x... 64 hex chars
    } catch (error) {
      throw new Error(`Failed to derive EVM private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
