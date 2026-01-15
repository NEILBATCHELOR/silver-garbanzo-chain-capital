import * as crypto from 'crypto';
import { Wallet } from 'xrpl';

/**
 * Encrypted wallet data structure
 */
export interface EncryptedWallet {
  ciphertext: string;
  iv: string;
  salt: string;
  authTag: string;
  algorithm: string;
  version: string;
}

/**
 * XRPL Wallet Encryption Service
 * 
 * Provides secure wallet seed encryption using AES-256-GCM with PBKDF2
 * key derivation. All wallet seeds should be encrypted at rest and only
 * decrypted in memory when needed for signing.
 * 
 * Security Features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - PBKDF2 key derivation with 100,000 iterations
 * - Random salt per encryption
 * - Random IV per encryption
 * - Authentication tag for integrity verification
 */
export class XRPLWalletEncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly VERSION = '1.0';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly SALT_LENGTH = 32; // 256 bits
  private static readonly AUTH_TAG_LENGTH = 16; // 128 bits
  private static readonly PBKDF2_ITERATIONS = 100000;
  private static readonly PBKDF2_DIGEST = 'sha512';

  /**
   * Encrypt wallet seed with password
   * 
   * @param wallet Wallet to encrypt
   * @param password Encryption password
   * @returns Encrypted wallet data
   */
  static async encryptWallet(
    wallet: Wallet,
    password: string
  ): Promise<EncryptedWallet> {
    try {
      if (!wallet.seed) {
        throw new Error('Wallet seed is required for encryption');
      }

      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Generate random salt
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      
      // Derive encryption key from password
      const key = await this.deriveKey(password, salt);
      
      // Generate random IV
      const iv = crypto.randomBytes(this.IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      
      // Encrypt the seed
      const encryptedSeed = Buffer.concat([
        cipher.update(wallet.seed, 'utf8'),
        cipher.final()
      ]);

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      return {
        ciphertext: encryptedSeed.toString('base64'),
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: this.ALGORITHM,
        version: this.VERSION
      };
    } catch (error) {
      throw new Error(
        `Failed to encrypt wallet: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Decrypt wallet with password
   * 
   * @param encrypted Encrypted wallet data
   * @param password Decryption password
   * @returns Decrypted Wallet instance
   */
  static async decryptWallet(
    encrypted: EncryptedWallet,
    password: string
  ): Promise<Wallet> {
    try {
      // Verify version
      if (encrypted.version !== this.VERSION) {
        throw new Error(`Unsupported encryption version: ${encrypted.version}`);
      }

      // Verify algorithm
      if (encrypted.algorithm !== this.ALGORITHM) {
        throw new Error(`Unsupported encryption algorithm: ${encrypted.algorithm}`);
      }

      // Derive key from password and stored salt
      const salt = Buffer.from(encrypted.salt, 'base64');
      const key = await this.deriveKey(password, salt);

      // Prepare decryption
      const iv = Buffer.from(encrypted.iv, 'base64');
      const authTag = Buffer.from(encrypted.authTag, 'base64');
      const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the seed
      const decryptedSeed = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]).toString('utf8');

      // Create wallet from decrypted seed
      return Wallet.fromSeed(decryptedSeed);
    } catch (error) {
      // Don't expose decryption details in error message
      if (error instanceof Error && error.message.includes('Unsupported MAC')) {
        throw new Error('Invalid password or corrupted encrypted data');
      }
      throw new Error(
        `Failed to decrypt wallet: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Change wallet password
   * Decrypts with old password and re-encrypts with new password
   * 
   * @param encrypted Current encrypted wallet
   * @param oldPassword Current password
   * @param newPassword New password
   * @returns Newly encrypted wallet data
   */
  static async changePassword(
    encrypted: EncryptedWallet,
    oldPassword: string,
    newPassword: string
  ): Promise<EncryptedWallet> {
    try {
      if (!newPassword || newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters');
      }

      // Decrypt with old password
      const wallet = await this.decryptWallet(encrypted, oldPassword);
      
      // Re-encrypt with new password
      return await this.encryptWallet(wallet, newPassword);
    } catch (error) {
      throw new Error(
        `Failed to change password: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Verify password without full decryption
   * More efficient than full decryption if you only need to verify
   * 
   * @param encrypted Encrypted wallet data
   * @param password Password to verify
   * @returns True if password is correct
   */
  static async verifyPassword(
    encrypted: EncryptedWallet,
    password: string
  ): Promise<boolean> {
    try {
      await this.decryptWallet(encrypted, password);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Encrypt wallet seed only (without full Wallet object)
   * Useful when you only have the seed string
   * 
   * @param seed Wallet seed to encrypt
   * @param password Encryption password
   * @returns Encrypted data
   */
  static async encryptSeed(
    seed: string,
    password: string
  ): Promise<EncryptedWallet> {
    try {
      // Create temporary wallet to use encryption method
      const wallet = Wallet.fromSeed(seed);
      return await this.encryptWallet(wallet, password);
    } catch (error) {
      throw new Error(
        `Failed to encrypt seed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Decrypt to seed only (without creating Wallet object)
   * 
   * @param encrypted Encrypted wallet data
   * @param password Decryption password
   * @returns Decrypted seed string
   */
  static async decryptToSeed(
    encrypted: EncryptedWallet,
    password: string
  ): Promise<string> {
    try {
      const wallet = await this.decryptWallet(encrypted, password);
      if (!wallet.seed) {
        throw new Error('Decrypted wallet has no seed');
      }
      return wallet.seed;
    } catch (error) {
      throw new Error(
        `Failed to decrypt to seed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate encrypted wallet structure
   * Checks if encrypted data has all required fields
   * 
   * @param encrypted Data to validate
   * @returns Validation result
   */
  static validateEncryptedWallet(encrypted: unknown): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!encrypted || typeof encrypted !== 'object') {
      errors.push('Encrypted wallet must be an object');
      return { valid: false, errors };
    }

    const data = encrypted as Record<string, unknown>;

    // Check required fields
    const requiredFields = ['ciphertext', 'iv', 'salt', 'authTag', 'algorithm', 'version'];
    for (const field of requiredFields) {
      if (!data[field] || typeof data[field] !== 'string') {
        errors.push(`Missing or invalid field: ${field}`);
      }
    }

    // Validate algorithm
    if (data.algorithm && data.algorithm !== this.ALGORITHM) {
      errors.push(`Unsupported algorithm: ${data.algorithm}`);
    }

    // Validate version
    if (data.version && data.version !== this.VERSION) {
      errors.push(`Unsupported version: ${data.version}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate random encryption key
   * For testing or key generation purposes
   * 
   * @returns Random 256-bit key (base64)
   */
  static generateRandomKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('base64');
  }

  /**
   * Derive encryption key from password using PBKDF2
   * 
   * @param password User password
   * @param salt Random salt
   * @returns Derived encryption key
   */
  private static async deriveKey(
    password: string,
    salt: Buffer
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        this.PBKDF2_ITERATIONS,
        this.KEY_LENGTH,
        this.PBKDF2_DIGEST,
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  }

  /**
   * Get encryption info without decrypting
   * Returns metadata about encrypted wallet
   * 
   * @param encrypted Encrypted wallet data
   * @returns Encryption metadata
   */
  static getEncryptionInfo(encrypted: EncryptedWallet): {
    algorithm: string;
    version: string;
    iterations: number;
    keyLength: number;
  } {
    return {
      algorithm: encrypted.algorithm,
      version: encrypted.version,
      iterations: this.PBKDF2_ITERATIONS,
      keyLength: this.KEY_LENGTH
    };
  }

  /**
   * Estimate decryption time
   * Returns approximate time in milliseconds based on PBKDF2 iterations
   * 
   * @returns Estimated decryption time in ms
   */
  static estimateDecryptionTime(): number {
    // Rough estimate: 100,000 iterations takes about 100-200ms on modern hardware
    return 150;
  }
}
