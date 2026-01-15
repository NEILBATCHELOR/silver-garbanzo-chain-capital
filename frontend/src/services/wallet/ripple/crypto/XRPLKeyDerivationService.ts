import { Wallet, ECDSA } from 'xrpl';
import * as bip39 from 'bip39';

/**
 * Derived key information for both Ed25519 and secp256k1 algorithms
 */
export interface DerivedKeys {
  seed: string;
  seedHex: string;
  ed25519: {
    privateKey: string;
    publicKey: string;
    address: string;
  };
  secp256k1: {
    privateKey: string;
    publicKey: string;
    address: string;
  };
}

/**
 * XRPL Key Derivation Service
 * 
 * Handles wallet generation and key derivation for XRPL using both
 * Ed25519 (default, recommended) and secp256k1 algorithms.
 * 
 * Based on: xrpl-dev-portal _code-samples/key-derivation/
 */
export class XRPLKeyDerivationService {
  /**
   * Generate a new random wallet
   * @param algorithm Cryptographic algorithm to use (ECDSA.ed25519 recommended)
   * @returns New Wallet instance
   */
  static generateWallet(algorithm: ECDSA = ECDSA.ed25519): Wallet {
    return Wallet.generate(algorithm);
  }

  /**
   * Derive wallet from seed
   * @param seed Family seed (starts with 's')
   * @param algorithm Cryptographic algorithm to use
   * @returns Wallet instance
   */
  static fromSeed(
    seed: string,
    algorithm: ECDSA = ECDSA.ed25519
  ): Wallet {
    try {
      return Wallet.fromSeed(seed, { algorithm });
    } catch (error) {
      throw new Error(
        `Failed to derive wallet from seed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Derive wallet from mnemonic phrase (BIP39)
   * @param mnemonic 12 or 24 word mnemonic phrase
   * @param derivationPath Optional BIP44 derivation path
   * @param algorithm Cryptographic algorithm to use
   * @returns Wallet instance
   */
  static fromMnemonic(
    mnemonic: string,
    derivationPath?: string,
    algorithm: ECDSA = ECDSA.ed25519
  ): Wallet {
    try {
      // Validate mnemonic first
      if (!this.isValidMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      return Wallet.fromMnemonic(mnemonic, { 
        derivationPath, 
        algorithm 
      });
    } catch (error) {
      throw new Error(
        `Failed to derive wallet from mnemonic: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate a new 24-word mnemonic phrase
   * Uses 256 bits of entropy for maximum security
   * @returns 24-word mnemonic phrase
   */
  static generateMnemonic(): string {
    try {
      // Generate 32 bytes (256 bits) of entropy for 24 words
      const entropy = Buffer.from(crypto.getRandomValues(new Uint8Array(32)));
      return bip39.entropyToMnemonic(entropy);
    } catch (error) {
      throw new Error(
        `Failed to generate mnemonic: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate 12-word mnemonic (less secure but more user-friendly)
   * @returns 12-word mnemonic phrase
   */
  static generateMnemonic12(): string {
    try {
      // Generate 16 bytes (128 bits) of entropy for 12 words
      const entropy = Buffer.from(crypto.getRandomValues(new Uint8Array(16)));
      return bip39.entropyToMnemonic(entropy);
    } catch (error) {
      throw new Error(
        `Failed to generate 12-word mnemonic: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Derive complete key information from seed for both algorithms
   * Useful for migration or testing purposes
   * @param seed Family seed
   * @returns Complete key information for both Ed25519 and secp256k1
   */
  static deriveAllKeys(seed: string): DerivedKeys {
    try {
      const ed25519Wallet = Wallet.fromSeed(seed, { algorithm: ECDSA.ed25519 });
      const secp256k1Wallet = Wallet.fromSeed(seed, { algorithm: ECDSA.secp256k1 });

      return {
        seed,
        seedHex: Buffer.from(seed).toString('hex'),
        ed25519: {
          privateKey: ed25519Wallet.privateKey,
          publicKey: ed25519Wallet.publicKey,
          address: ed25519Wallet.address
        },
        secp256k1: {
          privateKey: secp256k1Wallet.privateKey,
          publicKey: secp256k1Wallet.publicKey,
          address: secp256k1Wallet.address
        }
      };
    } catch (error) {
      throw new Error(
        `Failed to derive all keys: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate multiple HD wallets from a single mnemonic
   * @param mnemonic Mnemonic phrase
   * @param count Number of wallets to generate
   * @param algorithm Cryptographic algorithm to use
   * @returns Array of Wallet instances
   */
  static generateHDWallets(
    mnemonic: string,
    count: number,
    algorithm: ECDSA = ECDSA.ed25519
  ): Wallet[] {
    try {
      if (!this.isValidMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      const wallets: Wallet[] = [];
      
      for (let i = 0; i < count; i++) {
        // BIP44 derivation path: m/44'/144'/i'/0/0
        // 144 is XRP's coin type
        const derivationPath = `m/44'/144'/${i}'/0/0`;
        const wallet = Wallet.fromMnemonic(mnemonic, {
          derivationPath,
          algorithm
        });
        wallets.push(wallet);
      }

      return wallets;
    } catch (error) {
      throw new Error(
        `Failed to generate HD wallets: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate a family seed format
   * @param seed Seed to validate
   * @returns True if seed is valid
   */
  static isValidSeed(seed: string): boolean {
    try {
      Wallet.fromSeed(seed);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate an XRPL address
   * @param address Address to validate
   * @returns True if address is valid
   */
  static isValidAddress(address: string): boolean {
    // Classic address format: r followed by 25-34 alphanumeric characters
    return /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address);
  }

  /**
   * Validate an X-Address (tagged address format)
   * @param xAddress X-Address to validate
   * @returns True if X-Address is valid
   */
  static isValidXAddress(xAddress: string): boolean {
    // X-Address format: X followed by 46 alphanumeric characters
    return /^X[1-9A-HJ-NP-Za-km-z]{46}$/.test(xAddress);
  }

  /**
   * Validate a mnemonic phrase
   * @param mnemonic Mnemonic to validate
   * @returns True if mnemonic is valid
   */
  static isValidMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  /**
   * Get algorithm used by an address
   * Ed25519 addresses start with 'rE', secp256k1 with 'r' followed by other chars
   * @param address XRPL address
   * @returns Algorithm type or 'unknown'
   */
  static detectAlgorithm(address: string): 'ed25519' | 'secp256k1' | 'unknown' {
    if (!this.isValidAddress(address)) {
      return 'unknown';
    }
    
    // Ed25519 addresses typically start with 'rE'
    // This is a heuristic and not 100% accurate
    if (address.startsWith('rE')) {
      return 'ed25519';
    }
    
    return 'secp256k1';
  }

  /**
   * Generate wallet with custom entropy
   * @param entropy Custom entropy (hex string)
   * @param algorithm Cryptographic algorithm to use
   * @returns Wallet instance
   */
  static fromEntropy(
    entropy: string,
    algorithm: ECDSA = ECDSA.ed25519
  ): Wallet {
    try {
      // Convert hex entropy to mnemonic
      const mnemonic = bip39.entropyToMnemonic(entropy);
      return this.fromMnemonic(mnemonic, undefined, algorithm);
    } catch (error) {
      throw new Error(
        `Failed to generate wallet from entropy: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get entropy from mnemonic
   * @param mnemonic Mnemonic phrase
   * @returns Entropy as hex string
   */
  static mnemonicToEntropy(mnemonic: string): string {
    try {
      if (!this.isValidMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }
      // Note: mnemonicToEntropy is synchronous, not async
      return bip39.mnemonicToEntropy(mnemonic);
    } catch (error) {
      throw new Error(
        `Failed to extract entropy from mnemonic: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
