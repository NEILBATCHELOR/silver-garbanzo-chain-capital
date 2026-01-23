/**
 * Modern Solana Wallet Generator
 * 
 * Uses @solana/kit and modern utilities for wallet generation
 * Replaces legacy @solana/web3.js approach
 * 
 * MIGRATION STATUS: ✅ MODERN
 */

import type { KeyPairSigner } from '@solana/kit';
import {
  generateRandomKeypair,
  generateKeypairFromMnemonic,
  generateMnemonicPhrase,
  validateMnemonic,
  exportPrivateKeyBase58,
  exportPrivateKeyHex,
  getPublicKey,
  createModernRpc,
  createKeyPairSignerFromBytes
} from '@/infrastructure/web3/solana';
import type { WalletGenerator, WalletGenerationOptions, Wallet } from '../WalletGenerator';

export class ModernSolanaWalletGenerator implements WalletGenerator {
  /**
   * Get metadata for this wallet generator
   */
  getMetadata() {
    return {
      type: 'solana',
      chainId: 0,
      standard: 'Solana',
      name: 'Solana',
      nativeCurrency: {
        name: 'SOL',
        symbol: 'SOL',
        decimals: 9
      },
      networks: ['mainnet-beta', 'devnet', 'testnet']
    };
  }

  /**
   * Generate Solana wallet
   */
  async generateWallet(options?: WalletGenerationOptions): Promise<Wallet> {
    try {
      let keypair: KeyPairSigner;
      let mnemonic: string | undefined;

      if (options?.mnemonic) {
        if (!validateMnemonic(options.mnemonic)) {
          throw new Error('Invalid mnemonic phrase provided');
        }
        mnemonic = options.mnemonic;
        keypair = await generateKeypairFromMnemonic(mnemonic, options.accountIndex || 0);
      } else if (options?.includeMnemonic) {
        mnemonic = generateMnemonicPhrase(options.mnemonicStrength || 128);
        keypair = await generateKeypairFromMnemonic(mnemonic, 0);
      } else {
        keypair = await generateRandomKeypair();
      }

      const privateKeyBase58 = await exportPrivateKeyBase58(keypair);
      const publicKey = getPublicKey(keypair);

      return {
        address: publicKey,
        publicKey: publicKey,
        privateKey: privateKeyBase58,
        mnemonic: mnemonic,
        metadata: this.getMetadata()
      };
    } catch (error) {
      throw new Error(`Solana wallet generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple wallets
   */
  async generateMultiple(count: number, options?: WalletGenerationOptions): Promise<Wallet[]> {
    const wallets: Wallet[] = [];
    for (let i = 0; i < count; i++) {
      const wallet = await this.generateWallet(options);
      wallets.push(wallet);
    }
    return wallets;
  }

  /**
   * Create wallet from private key
   */
  async fromPrivateKey(privateKey: string): Promise<Wallet> {
    return this.restoreFromPrivateKey(privateKey);
  }

  /**
   * Create wallet from secret key
   */
  async fromSecretKey(secretKey: Uint8Array): Promise<Wallet> {
    const keypair = await createKeyPairSignerFromBytes(secretKey);
    const privateKeyBase58 = await exportPrivateKeyBase58(keypair);
    
    return {
      address: keypair.address,
      publicKey: keypair.address,
      privateKey: privateKeyBase58,
      metadata: this.getMetadata()
    };
  }

  /**
   * Create wallet from mnemonic
   */
  async fromMnemonic(mnemonic: string, index: number = 0): Promise<Wallet> {
    return this.generateWallet({ mnemonic, accountIndex: index });
  }

  /**
   * Generate HD wallets from mnemonic
   */
  async generateHDWallets(mnemonic: string, count: number = 1): Promise<Wallet[]> {
    return this.deriveWallets(mnemonic, count, 0);
  }

  /**
   * Generate mnemonic phrase
   */
  generateMnemonic(): string {
    return generateMnemonicPhrase(128);
  }

  /**
   * Validate Solana address
   */
  validateAddress(addressString: string): boolean {
    const { isValidAddress } = require('@/infrastructure/web3/solana');
    return isValidAddress(addressString);
  }

  /**
   * Validate private key
   */
  validatePrivateKey(privateKey: string): boolean {
    try {
      if (privateKey.length === 88 || privateKey.length === 87) {
        return true; // Base58
      } else if (privateKey.length === 128) {
        return /^[0-9a-fA-F]+$/.test(privateKey); // Hex
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Validate secret key
   */
  validateSecretKey(secretKey: Uint8Array): boolean {
    return secretKey.length === 64;
  }

  /**
   * Validate mnemonic
   */
  validateMnemonic(mnemonic: string): boolean {
    return validateMnemonic(mnemonic);
  }

  /**
   * Format address for display
   */
  formatAddress(address: string, length: number = 6): string {
    if (address.length <= length * 2 + 3) {
      return address;
    }
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }

  /**
   * Get explorer URL
   */
  getExplorerUrl(address: string, type: 'address' | 'tx' = 'address'): string {
    const baseUrl = 'https://explorer.solana.com';
    if (type === 'tx') {
      return `${baseUrl}/tx/${address}`;
    }
    return `${baseUrl}/address/${address}`;
  }

  /**
   * Get balance for address
   */
  async getBalance(address: string, network: 'mainnet-beta' | 'devnet' | 'testnet' = 'devnet'): Promise<string> {
    try {
      const rpc = createModernRpc(network);
      const lamports = await rpc.getBalance(address);
      return this.lamportsToSol(lamports);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0';
    }
  }

  /**
   * Convert SOL to lamports
   */
  solToLamports(sol: number): bigint {
    return BigInt(Math.floor(sol * 1_000_000_000));
  }

  /**
   * Convert lamports to SOL
   */
  lamportsToSol(lamports: bigint): string {
    return (Number(lamports) / 1_000_000_000).toFixed(9);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  getSupportedNetworks(): string[] {
    return ['mainnet-beta', 'devnet', 'testnet'];
  }

  getDefaultNetwork(): string {
    return 'mainnet-beta';
  }

  async deriveWallets(mnemonic: string, count: number, startIndex: number = 0): Promise<Wallet[]> {
    if (!validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    const wallets: Wallet[] = [];
    for (let i = 0; i < count; i++) {
      const accountIndex = startIndex + i;
      const wallet = await this.generateWallet({
        mnemonic,
        accountIndex,
        includeMnemonic: true
      });
      wallets.push(wallet);
    }
    return wallets;
  }

  async generateHDWallet(accountCount: number = 1, mnemonicStrength?: 128 | 256): Promise<{
    mnemonic: string;
    wallets: Wallet[];
  }> {
    const mnemonic = generateMnemonicPhrase(mnemonicStrength || 128);
    const wallets = await this.deriveWallets(mnemonic, accountCount, 0);
    return { mnemonic, wallets };
  }

  async restoreFromPrivateKey(privateKey: string, network?: 'mainnet-beta' | 'devnet' | 'testnet'): Promise<Wallet> {
    const { createSignerFromPrivateKey, createModernRpc } = await import('@/infrastructure/web3/solana');
    
    const keypair = await createSignerFromPrivateKey(privateKey);
    const privateKeyBase58 = await exportPrivateKeyBase58(keypair);

    return {
      address: keypair.address,
      publicKey: keypair.address,
      privateKey: privateKeyBase58,
      metadata: this.getMetadata()
    };
  }
}

// Export singleton instance
export const modernSolanaWalletGenerator = new ModernSolanaWalletGenerator();
