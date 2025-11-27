import { isAddress } from 'ethers';
import { WalletGenerator, Wallet, WalletMetadata, WalletGenerationOptions } from '../WalletGenerator';
import { Wallet as EthersWallet } from 'ethers';

/**
 * Implementation of WalletGenerator for Polygon wallets
 */
export class PolygonWalletGenerator implements WalletGenerator {
  /**
   * Generate a new Polygon wallet
   * @param options Wallet generation options
   * @returns A wallet generation result with address, private key, and optionally mnemonic
   */
  public async generateWallet(options?: WalletGenerationOptions): Promise<Wallet> {
    const includePrivateKey = options?.includePrivateKey ?? true;
    const includeMnemonic = options?.includeMnemonic ?? false;
    
    // Create a new random wallet
    const wallet = EthersWallet.createRandom();
    
    return {
      address: wallet.address,
      privateKey: includePrivateKey ? wallet.privateKey : '',
      publicKey: wallet.publicKey,
      mnemonic: includeMnemonic && wallet.mnemonic ? wallet.mnemonic.phrase : undefined,
      metadata: this.getMetadata()
    };
  }

  /**
   * Validate a Polygon address
   * @param address The address to validate
   * @returns True if the address is valid, false otherwise
   */
  public validateAddress(address: string): boolean {
    return  isAddress(address);
  }

  /**
   * Get metadata for the wallet
   * @returns The wallet metadata
   */
  public getMetadata(): WalletMetadata {
    return {
      type: 'polygon',
      chainId: 137,
      standard: 'ERC20',
      coinType: '60',
      network: 'polygon'
    };
  }
}