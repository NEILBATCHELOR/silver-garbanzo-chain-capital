import { Wallet, WalletGenerator, WalletGenerationOptions, WalletMetadata } from '../WalletGenerator';
import { ethers } from 'ethers';

/**
 * Implementation of WalletGenerator for XRPL EVM
 * XRPL EVM is an EVM-compatible sidechain of the XRP Ledger
 * 
 * IMPORTANT: This uses standard EVM wallet generation (same as Ethereum)
 * but connects to XRPL EVM network endpoints
 * 
 * XRPL EVM Chain IDs:
 * - Mainnet: 1440002
 * - Testnet: 1440001
 */
export class XRPLEvmWalletGenerator implements WalletGenerator {
  /**
   * Helper to get public key from ethers wallet
   * Accepts both Wallet and HDNodeWallet types
   */
  private getPublicKey(wallet: ethers.Wallet | ethers.HDNodeWallet): string {
    return wallet.signingKey.publicKey;
  }

  /**
   * Generate a new XRPL EVM wallet
   * Uses standard EVM wallet generation (Ethereum-compatible)
   * @param options Optional wallet generation options
   * @returns Generated wallet object
   */
  async generateWallet(options?: WalletGenerationOptions): Promise<Wallet> {
    try {
      // XRPL EVM uses standard EVM wallet generation
      if (options?.includeMnemonic) {
        // Generate with mnemonic - returns HDNodeWallet
        const ethWallet: ethers.HDNodeWallet = ethers.Wallet.createRandom();
        const mnemonic = ethWallet.mnemonic;
        
        if (!mnemonic) {
          throw new Error('Failed to generate mnemonic');
        }

        return {
          address: ethWallet.address,
          privateKey: ethWallet.privateKey,
          publicKey: this.getPublicKey(ethWallet),
          mnemonic: mnemonic.phrase,
          metadata: this.getMetadata()
        };
      } else {
        // Generate without mnemonic
        const ethWallet = ethers.Wallet.createRandom();

        return {
          address: ethWallet.address,
          privateKey: ethWallet.privateKey,
          publicKey: this.getPublicKey(ethWallet),
          metadata: this.getMetadata()
        };
      }
    } catch (error) {
      throw new Error(`Failed to generate XRPL EVM wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple wallets
   * @param count Number of wallets to generate
   * @param options Generation options
   * @returns Array of generated wallets
   */
  async generateMultiple(
    count: number, 
    options?: WalletGenerationOptions
  ): Promise<Wallet[]> {
    const wallets: Wallet[] = [];
    for (let i = 0; i < count; i++) {
      wallets.push(await this.generateWallet(options));
    }
    return wallets;
  }

  /**
   * Create wallet from private key
   * @param privateKey XRPL EVM private key (EVM format)
   * @returns Generated wallet
   */
  async fromPrivateKey(privateKey: string): Promise<Wallet> {
    try {
      const ethWallet = new ethers.Wallet(privateKey);
      
      return {
        address: ethWallet.address,
        privateKey: ethWallet.privateKey,
        publicKey: this.getPublicKey(ethWallet),
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create XRPL EVM wallet from private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create wallet from mnemonic
   * @param mnemonic Mnemonic phrase
   * @param index Derivation index
   * @returns Generated wallet
   */
  async fromMnemonic(mnemonic: string, index: number = 0): Promise<Wallet> {
    try {
      // Standard EVM derivation path
      const path = `m/44'/60'/0'/0/${index}`;
      const ethWallet: ethers.HDNodeWallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path);
      
      return {
        address: ethWallet.address,
        privateKey: ethWallet.privateKey,
        publicKey: this.getPublicKey(ethWallet),
        mnemonic,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Failed to create XRPL EVM wallet from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate mnemonic phrase
   * @returns Mnemonic phrase
   */
  generateMnemonic(): string {
    try {
      const wallet: ethers.HDNodeWallet = ethers.Wallet.createRandom();
      const mnemonic = wallet.mnemonic;
      
      if (!mnemonic) {
        throw new Error('Failed to generate mnemonic');
      }
      
      return mnemonic.phrase;
    } catch (error) {
      throw new Error(`Failed to generate mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get metadata for XRPL EVM wallets
   * @returns XRPL EVM wallet metadata
   */
  getMetadata(): WalletMetadata {
    return {
      type: 'xrpl-evm',
      chainId: 1440002, // XRPL EVM Mainnet (number type)
      standard: 'EIP-155',
      network: 'mainnet',
      coinType: '60' // Same as Ethereum (EVM-compatible)
    };
  }
  
  /**
   * Validate an XRPL EVM address (EVM format)
   * @param address Address to validate
   * @returns Boolean indicating if address is valid
   */
  validateAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Validate an XRPL EVM private key
   * @param privateKey Private key to validate
   * @returns Boolean indicating if private key is valid
   */
  validatePrivateKey(privateKey: string): boolean {
    try {
      new ethers.Wallet(privateKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get wallet type
   * @returns Wallet type string
   */
  getWalletType(): string {
    return 'xrpl-evm';
  }

  /**
   * Format address for display
   * @param address Address to format
   * @param length Display length
   * @returns Formatted address
   */
  formatAddress(address: string, length: number = 6): string {
    if (address.length <= length * 2) return address;
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }

  /**
   * Get explorer URL
   * @param address Address or transaction hash
   * @param type Type of URL ('address' or 'tx')
   * @param network Network ('mainnet' or 'testnet')
   * @returns Explorer URL
   */
  getExplorerUrl(
    address: string, 
    type: 'address' | 'tx' = 'address',
    network: 'mainnet' | 'testnet' = 'mainnet'
  ): string {
    const baseUrl = network === 'mainnet' 
      ? 'https://evm-sidechain.xrpl.org'
      : 'https://evm-poa-sidechain.peersyst.tech';
    
    if (type === 'tx') {
      return `${baseUrl}/tx/${address}`;
    }
    return `${baseUrl}/address/${address}`;
  }

  /**
   * Get balance for address
   * Note: Requires connection to XRPL EVM RPC endpoint
   * @param address Address to check
   * @returns Promise with balance in native token
   */
  async getBalance(address: string): Promise<string> {
    // Placeholder - requires XRPL EVM RPC endpoint configuration
    // To implement: Create provider with XRPL EVM RPC URL and fetch balance
    // Example:
    // const provider = new ethers.JsonRpcProvider('https://rpc.xrpl-evm.network');
    // const balance = await provider.getBalance(address);
    // return ethers.formatEther(balance);
    
    throw new Error('XRPL EVM balance checking not yet implemented - requires RPC endpoint configuration');
  }
}
