/**
 * Enhanced Bitcoin Wallet Service
 * Handles account generation, import, validation, and comprehensive wallet operations for Bitcoin network
 * Updated to match project patterns with improved error handling and functionality
 */

import * as bitcoin from 'bitcoinjs-lib';
import { networks } from 'bitcoinjs-lib';
import * as bip39 from 'bip39';
import * as bip32 from '@scure/bip32';

// ECC library initialization
let eccLib: any = null;
let initPromise: Promise<void> | null = null;

async function initEcc() {
  if (eccLib) return;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    // Dynamic import for ESM-only tiny-secp256k1
    const ecc = await import('tiny-secp256k1');
    eccLib = ecc;
    bitcoin.initEccLib(ecc);
  })();
  
  return initPromise;
}

function ensureEccInit() {
  if (!eccLib) {
    throw new Error('ECC library not initialized. Call initEcc() first.');
  }
}

export interface BitcoinAccountInfo {
  address: string;
  publicKey: string;
  privateKey?: string;
  wif?: string; // Wallet Import Format
  mnemonic?: string;
  balance?: string;
  xpub?: string; // Extended public key
  xprv?: string; // Extended private key
  derivationPath?: string;
  addressType?: 'legacy' | 'p2sh-segwit' | 'bech32' | 'taproot';
}

export interface BitcoinGenerationOptions {
  includePrivateKey?: boolean;
  includeWIF?: boolean;
  includeMnemonic?: boolean;
  includeExtendedKeys?: boolean;
  addressType?: 'legacy' | 'p2sh-segwit' | 'bech32' | 'taproot';
  derivationPath?: string;
  network?: 'mainnet' | 'testnet';
}

export interface BitcoinEncryptedWallet {
  encryptedData: string;
  address: string;
  publicKey: string;
  addressType: string;
}

export interface BitcoinNetworkInfo {
  name: string;
  network: typeof networks.bitcoin;
  addressTypes: string[];
  derivationPaths: Record<string, string>;
}

export interface BitcoinUTXO {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey: string;
  confirmations?: number;
}

export class BitcoinWalletService {
  private network: typeof networks.bitcoin;
  private networkType: 'mainnet' | 'testnet';

  constructor(networkType: 'mainnet' | 'testnet' = 'mainnet') {
    this.networkType = networkType;
    this.network = networkType === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
  }

  // ============================================================================
  // NETWORK MANAGEMENT (Enhanced)
  // ============================================================================

  /**
   * Get network information
   */
  getNetworkInfo(): BitcoinNetworkInfo {
    return {
      name: this.networkType,
      network: this.network,
      addressTypes: ['legacy', 'p2sh-segwit', 'bech32', 'taproot'],
      derivationPaths: {
        legacy: "m/44'/0'/0'/0", // P2PKH
        'p2sh-segwit': "m/49'/0'/0'/0", // P2SH-P2WPKH
        bech32: "m/84'/0'/0'/0", // P2WPKH
        taproot: "m/86'/0'/0'/0" // P2TR
      }
    };
  }

  /**
   * Update network settings
   */
  updateNetwork(networkType: 'mainnet' | 'testnet'): void {
    this.networkType = networkType;
    this.network = networkType === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
  }

  // ============================================================================
  // WALLET GENERATION (Enhanced)
  // ============================================================================

  /**
   * Generate a new Bitcoin account
   * Enhanced with multiple address types and options support
   */
  async generateAccount(options: BitcoinGenerationOptions = {}): Promise<BitcoinAccountInfo> {
    try {
      // Ensure ECC library is initialized
      await initEcc();
      ensureEccInit();
      
      const keyPair = bitcoin.ECPair.makeRandom({ network: this.network });
      const addressType = options.addressType || 'bech32';
      const address = this.generateAddress(keyPair.publicKey!, addressType);
      
      const result: BitcoinAccountInfo = {
        address: address,
        publicKey: keyPair.publicKey!.toString('hex'),
        addressType: addressType
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = keyPair.privateKey!.toString('hex');
      }

      if (options.includeWIF !== false) {
        result.wif = keyPair.toWIF();
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to generate Bitcoin account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate multiple Bitcoin accounts at once
   * Following project patterns
   */
  async generateMultipleAccounts(
    count: number, 
    options: BitcoinGenerationOptions = {}
  ): Promise<BitcoinAccountInfo[]> {
    // Ensure ECC is initialized once before loop
    await initEcc();
    ensureEccInit();
    
    const accounts: BitcoinAccountInfo[] = [];
    
    for (let i = 0; i < count; i++) {
      accounts.push(await this.generateAccount(options));
    }
    
    return accounts;
  }

  /**
   * Import an existing account using private key
   * Enhanced with multiple formats and balance fetching
   */
  async importAccount(privateKey: string, options: BitcoinGenerationOptions = {}): Promise<BitcoinAccountInfo> {
    try {
      await initEcc();
      ensureEccInit();
      
      const keyPair = await this.privateKeyToECPair(privateKey);
      const addressType = options.addressType || 'bech32';
      const address = this.generateAddress(keyPair.publicKey!, addressType);
      
      const result: BitcoinAccountInfo = {
        address: address,
        publicKey: keyPair.publicKey!.toString('hex'),
        addressType: addressType
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = keyPair.privateKey!.toString('hex');
      }

      if (options.includeWIF !== false) {
        result.wif = keyPair.toWIF();
      }
      
      // Balance fetching would require external API integration
      result.balance = '0'; // Placeholder
      
      return result;
    } catch (error) {
      throw new Error(`Invalid Bitcoin private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Import account from WIF (Wallet Import Format)
   */
  async importFromWIF(wif: string, options: BitcoinGenerationOptions = {}): Promise<BitcoinAccountInfo> {
    try {
      await initEcc();
      ensureEccInit();
      
      const keyPair = bitcoin.ECPair.fromWIF(wif, this.network);
      const addressType = options.addressType || 'bech32';
      const address = this.generateAddress(keyPair.publicKey!, addressType);
      
      const result: BitcoinAccountInfo = {
        address: address,
        publicKey: keyPair.publicKey!.toString('hex'),
        wif: wif,
        addressType: addressType
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = keyPair.privateKey!.toString('hex');
      }
      
      result.balance = '0'; // Placeholder
      
      return result;
    } catch (error) {
      throw new Error(`Invalid Bitcoin WIF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from private key (alias for consistency)
   */
  async fromPrivateKey(privateKey: string, options: BitcoinGenerationOptions = {}): Promise<BitcoinAccountInfo> {
    try {
      await initEcc();
      ensureEccInit();
      
      const keyPair = await this.privateKeyToECPair(privateKey);
      const addressType = options.addressType || 'bech32';
      const address = this.generateAddress(keyPair.publicKey!, addressType);
      
      const result: BitcoinAccountInfo = {
        address: address,
        publicKey: keyPair.publicKey!.toString('hex'),
        addressType: addressType
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = privateKey;
      }

      if (options.includeWIF !== false) {
        result.wif = keyPair.toWIF();
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid Bitcoin private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from WIF (alias for consistency)
   */
  async fromWIF(wif: string, options: BitcoinGenerationOptions = {}): Promise<BitcoinAccountInfo> {
    try {
      await initEcc();
      ensureEccInit();
      
      const keyPair = bitcoin.ECPair.fromWIF(wif, this.network);
      const addressType = options.addressType || 'bech32';
      const address = this.generateAddress(keyPair.publicKey!, addressType);
      
      const result: BitcoinAccountInfo = {
        address: address,
        publicKey: keyPair.publicKey!.toString('hex'),
        wif: wif,
        addressType: addressType
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = keyPair.privateKey!.toString('hex');
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid Bitcoin WIF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate mnemonic phrase
   * Full BIP39 support
   */
  generateMnemonic(): string {
    try {
      return bip39.generateMnemonic();
    } catch (error) {
      throw new Error(`Failed to generate mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create account from mnemonic phrase
   * Enhanced HD wallet support with multiple derivation paths
   */
  async fromMnemonic(
    mnemonic: string,
    derivationIndex: number = 0,
    options: BitcoinGenerationOptions = {}
  ): Promise<BitcoinAccountInfo> {
    try {
      await initEcc();
      ensureEccInit();
      
      const addressType = options.addressType || 'bech32';
      const basePath = this.getDerivationPath(addressType);
      const derivationPath = options.derivationPath || `${basePath}/${derivationIndex}`;
      
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const root = bip32.HDKey.fromMasterSeed(seed);
      const child = root.derive(derivationPath);
      
      if (!child.privateKey) {
        throw new Error('Failed to derive private key from mnemonic');
      }

      const keyPair = bitcoin.ECPair.fromPrivateKey(child.privateKey, { network: this.network });
      const address = this.generateAddress(keyPair.publicKey!, addressType);
      
      const result: BitcoinAccountInfo = {
        address: address,
        publicKey: keyPair.publicKey!.toString('hex'),
        derivationPath: derivationPath,
        addressType: addressType
      };

      if (options.includePrivateKey !== false) {
        result.privateKey = keyPair.privateKey!.toString('hex');
      }

      if (options.includeWIF !== false) {
        result.wif = keyPair.toWIF();
      }

      if (options.includeMnemonic) {
        result.mnemonic = mnemonic;
      }

      if (options.includeExtendedKeys) {
        result.xpub = child.publicExtendedKey;
        result.xprv = child.privateExtendedKey;
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate HD wallets from mnemonic
   * Multiple wallet generation from single mnemonic
   */
  async generateHDWallets(
    mnemonic: string,
    numWallets: number = 1,
    options: BitcoinGenerationOptions = {}
  ): Promise<BitcoinAccountInfo[]> {
    await initEcc();
    ensureEccInit();
    
    const wallets: BitcoinAccountInfo[] = [];
    
    for (let i = 0; i < numWallets; i++) {
      const wallet = await this.fromMnemonic(mnemonic, i, {
        ...options,
        includeMnemonic: false // Don't include mnemonic in each wallet
      });
      
      if (options.includeMnemonic && i === 0) {
        wallet.mnemonic = mnemonic; // Include original mnemonic only for first wallet
      }
      
      wallets.push(wallet);
    }
    
    return wallets;
  }

  /**
   * Restore account from mnemonic
   * Replaces placeholder implementation
   */
  async restoreFromMnemonic(mnemonic: string, index: number = 0): Promise<BitcoinAccountInfo> {
    try {
      return await this.fromMnemonic(mnemonic, index, {
        includePrivateKey: true,
        includeWIF: true,
        includeMnemonic: true,
        includeExtendedKeys: true
      });
    } catch (error) {
      throw new Error(`Failed to restore from mnemonic: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // ADDRESS GENERATION (Enhanced)
  // ============================================================================

  /**
   * Generate address from public key with specified type
   */
  private generateAddress(publicKey: Buffer, addressType: string): string {
    try {
      switch (addressType) {
        case 'legacy': // P2PKH
          return bitcoin.payments.p2pkh({ pubkey: publicKey, network: this.network }).address!;
          
        case 'p2sh-segwit': // P2SH-P2WPKH
          return bitcoin.payments.p2sh({
            redeem: bitcoin.payments.p2wpkh({ pubkey: publicKey, network: this.network }),
            network: this.network
          }).address!;
          
        case 'bech32': // P2WPKH
          return bitcoin.payments.p2wpkh({ pubkey: publicKey, network: this.network }).address!;
          
        case 'taproot': // P2TR (simplified, doesn't use real taproot script)
          // Note: This is a simplified taproot implementation
          // For full taproot support, additional logic would be needed
          const internalPubkey = publicKey.slice(1, 33); // Remove first byte for x-only
          return bitcoin.payments.p2tr({ 
            internalPubkey: internalPubkey, 
            network: this.network 
          }).address!;
          
        default:
          throw new Error(`Unsupported address type: ${addressType}`);
      }
    } catch (error) {
      throw new Error(`Failed to generate address: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get derivation path for address type
   */
  private getDerivationPath(addressType: string): string {
    const coinType = this.networkType === 'mainnet' ? '0' : '1';
    
    switch (addressType) {
      case 'legacy':
        return `m/44'/${coinType}'/0'/0`;
      case 'p2sh-segwit':
        return `m/49'/${coinType}'/0'/0`;
      case 'bech32':
        return `m/84'/${coinType}'/0'/0`;
      case 'taproot':
        return `m/86'/${coinType}'/0'/0`;
      default:
        return `m/84'/${coinType}'/0'/0`; // Default to bech32
    }
  }

  // ============================================================================
  // WALLET ENCRYPTION (Enhanced)
  // ============================================================================

  /**
   * Encrypt wallet for secure storage
   */
  async encryptWallet(
    account: BitcoinAccountInfo, 
    password: string
  ): Promise<BitcoinEncryptedWallet> {
    try {
      if (!account.privateKey && !account.wif) {
        throw new Error('Private key or WIF required for encryption');
      }

      const data = {
        privateKey: account.privateKey,
        wif: account.wif,
        publicKey: account.publicKey,
        mnemonic: account.mnemonic,
        xprv: account.xprv,
        derivationPath: account.derivationPath
      };

      // Simplified encryption - in production use proper crypto
      const encryptedData = Buffer.from(JSON.stringify(data)).toString('base64');
      
      return {
        encryptedData,
        address: account.address,
        publicKey: account.publicKey,
        addressType: account.addressType || 'bech32'
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Decrypt wallet from storage
   */
  async decryptWallet(
    encryptedWallet: BitcoinEncryptedWallet, 
    password: string
  ): Promise<BitcoinAccountInfo> {
    try {
      // Simplified decryption - in production use proper crypto
      const dataString = Buffer.from(encryptedWallet.encryptedData, 'base64').toString();
      const data = JSON.parse(dataString);
      
      return {
        address: encryptedWallet.address,
        publicKey: encryptedWallet.publicKey,
        privateKey: data.privateKey,
        wif: data.wif,
        mnemonic: data.mnemonic,
        xprv: data.xprv,
        derivationPath: data.derivationPath,
        addressType: encryptedWallet.addressType as any
      };
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // VALIDATION AND UTILITY (Enhanced)
  // ============================================================================

  /**
   * Validate Bitcoin address
   * Enhanced validation with multiple address types
   */
  isValidAddress(address: string): boolean {
    try {
      bitcoin.address.toOutputScript(address, this.network);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate private key
   */
  async isValidPrivateKey(privateKey: string): Promise<boolean> {
    try {
      await this.privateKeyToECPair(privateKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate WIF (Wallet Import Format)
   */
  async isValidWIF(wif: string): Promise<boolean> {
    try {
      await initEcc();
      ensureEccInit();
      bitcoin.ECPair.fromWIF(wif, this.network);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate mnemonic phrase
   */
  isValidMnemonic(mnemonic: string): boolean {
    try {
      return bip39.validateMnemonic(mnemonic);
    } catch {
      return false;
    }
  }

  /**
   * Detect address type
   */
  detectAddressType(address: string): string | null {
    try {
      if (!this.isValidAddress(address)) {
        return null;
      }

      // Legacy addresses (P2PKH)
      if (address.startsWith('1') || (this.networkType === 'testnet' && (address.startsWith('m') || address.startsWith('n')))) {
        return 'legacy';
      }
      
      // P2SH addresses (could be P2SH-segwit)
      if (address.startsWith('3') || (this.networkType === 'testnet' && address.startsWith('2'))) {
        return 'p2sh-segwit';
      }
      
      // Bech32 addresses (P2WPKH or P2WSH)
      if (address.startsWith('bc1') || (this.networkType === 'testnet' && address.startsWith('tb1'))) {
        if (address.length === 42 || address.length === 43) {
          return 'bech32'; // P2WPKH
        } else if (address.length === 62 || address.length === 63) {
          return 'bech32'; // P2WSH (script hash)
        } else if (address.length === 62) {
          return 'taproot'; // P2TR
        }
      }
      
      return 'unknown';
    } catch {
      return null;
    }
  }

  // ============================================================================
  // UTILITY METHODS (Enhanced)
  // ============================================================================

  /**
   * Format address for display
   */
  formatAddress(address: string, show: number = 6): string {
    if (!this.isValidAddress(address)) {
      return address;
    }
    
    if (address.length <= show * 2 + 3) {
      return address;
    }
    
    return `${address.slice(0, show)}...${address.slice(-show)}`;
  }

  /**
   * Get explorer URL for address or transaction
   */
  getExplorerUrl(hashOrAddress: string, type: 'tx' | 'address' = 'address'): string {
    const explorerBase = this.networkType === 'mainnet' 
      ? 'https://blockstream.info' 
      : 'https://blockstream.info/testnet';
    
    if (type === 'tx') {
      return `${explorerBase}/tx/${hashOrAddress}`;
    }
    return `${explorerBase}/address/${hashOrAddress}`;
  }

  /**
   * Get wallet type identifier
   */
  getWalletType(): string {
    return 'bitcoin';
  }

  /**
   * Convert BTC to satoshis
   */
  btcToSatoshis(btc: number): number {
    return Math.round(btc * 100000000);
  }

  /**
   * Convert satoshis to BTC
   */
  satoshisToBtc(satoshis: number): number {
    return satoshis / 100000000;
  }

  // ============================================================================
  // NETWORK OPERATIONS (Placeholder)
  // ============================================================================

  /**
   * Get account balance (requires external API)
   * Placeholder implementation - would need blockchain API integration
   */
  async getBalance(address: string): Promise<string> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Bitcoin address');
      }

      // Placeholder - would integrate with blockchain API
      console.warn('Bitcoin balance fetching requires external API integration');
      return '0';
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0';
    }
  }

  /**
   * Check if address has transactions (requires external API)
   */
  async addressExists(address: string): Promise<boolean> {
    try {
      if (!this.isValidAddress(address)) {
        return false;
      }
      
      // Placeholder - would integrate with blockchain API
      return true; // Assume all valid addresses "exist"
    } catch {
      return false;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Convert private key to ECPair
   */
  private async privateKeyToECPair(privateKey: string): Promise<any> {
    await initEcc();
    ensureEccInit();
    
    try {
      // Handle different private key formats
      let keyBuffer: Buffer;
      
      if (privateKey.length === 64) {
        // Hex format
        keyBuffer = Buffer.from(privateKey, 'hex');
      } else if (privateKey.length === 66 && privateKey.startsWith('0x')) {
        // Hex format with 0x prefix
        keyBuffer = Buffer.from(privateKey.slice(2), 'hex');
      } else {
        // Try WIF format
        return bitcoin.ECPair.fromWIF(privateKey, this.network);
      }
      
      return bitcoin.ECPair.fromPrivateKey(keyBuffer, { network: this.network });
    } catch (error) {
      throw new Error(`Invalid private key format: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export default instances for convenience
export const bitcoinWalletService = new BitcoinWalletService('mainnet');

export const bitcoinTestnetWalletService = new BitcoinWalletService('testnet');

// Export static methods for backward compatibility
export const BitcoinWallet = {
  generateAccount: () => bitcoinWalletService.generateAccount(),
  fromPrivateKey: (privateKey: string) => bitcoinWalletService.fromPrivateKey(privateKey),
  fromWIF: (wif: string) => bitcoinWalletService.fromWIF(wif),
  fromMnemonic: (mnemonic: string) => bitcoinWalletService.fromMnemonic(mnemonic),
  isValidAddress: (address: string) => bitcoinWalletService.isValidAddress(address),
  isValidPrivateKey: (privateKey: string) => bitcoinWalletService.isValidPrivateKey(privateKey)
};
