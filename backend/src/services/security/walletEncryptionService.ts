/**
 * Wallet Encryption Service (Backend)
 * 
 * SECURITY: This service MUST run on the backend with service role access.
 * Private keys should NEVER be accessible in the frontend.
 * 
 * Provides AES-256-GCM encryption/decryption for wallet private keys and mnemonics.
 * Uses a master password from environment variables to derive encryption keys.
 * 
 * Security Features:
 * - AES-256-GCM authenticated encryption
 * - Unique salt and IV for each encryption operation
 * - PBKDF2 key derivation with 100,000 iterations
 * - Authentication tags to prevent tampering
 * - Version tracking for future algorithm updates
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2 } from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);

export interface EncryptedData {
  version: number;
  algorithm: string;
  salt: string;
  iv: string;
  encrypted: string;
  authTag: string;
}

export class WalletEncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly SALT_LENGTH = 32; // 256 bits
  private static readonly TAG_LENGTH = 16; // 128 bits
  private static readonly PBKDF2_ITERATIONS = 100000;
  private static readonly VERSION = 1;

  /**
   * Get master password from environment
   * @private
   */
  private static getMasterPassword(): string {
    const masterPassword = process.env.WALLET_MASTER_PASSWORD;
    
    if (!masterPassword) {
      throw new Error(
        'WALLET_MASTER_PASSWORD environment variable is not set. ' +
        'Please configure it in your .env file.'
      );
    }

    // Validate password strength (minimum 32 characters recommended)
    if (masterPassword.length < 32) {
      console.warn(
        'WARNING: WALLET_MASTER_PASSWORD is shorter than recommended (32 characters). ' +
        'Consider using a longer password for better security.'
      );
    }

    return masterPassword;
  }

  /**
   * Derive encryption key from master password using PBKDF2
   * @private
   */
  private static async deriveKey(
    masterPassword: string,
    salt: Buffer
  ): Promise<Buffer> {
    return await pbkdf2Async(
      masterPassword,
      salt,
      this.PBKDF2_ITERATIONS,
      this.KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Encrypt a private key or mnemonic phrase
   * 
   * @param plaintext The private key or mnemonic to encrypt
   * @returns Encrypted data as JSON string
   * @throws Error if encryption fails or master password not configured
   */
  static async encrypt(plaintext: string): Promise<string> {
    try {
      // Get master password
      const masterPassword = this.getMasterPassword();

      // Generate random salt and IV
      const salt = randomBytes(this.SALT_LENGTH);
      const iv = randomBytes(this.IV_LENGTH);

      // Derive encryption key from master password
      const key = await this.deriveKey(masterPassword, salt);

      // Create cipher
      const cipher = createCipheriv(this.ALGORITHM, key, iv);

      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Package encrypted data with metadata
      const encryptedData: EncryptedData = {
        version: this.VERSION,
        algorithm: this.ALGORITHM,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        encrypted,
        authTag: authTag.toString('hex')
      };

      // Return as JSON string
      return JSON.stringify(encryptedData);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error(
        `Failed to encrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypt an encrypted private key or mnemonic phrase
   * 
   * @param encryptedDataString The encrypted data as JSON string
   * @returns Decrypted plaintext
   * @throws Error if decryption fails or data is corrupted
   */
  static async decrypt(encryptedDataString: string): Promise<string> {
    try {
      // Get master password
      const masterPassword = this.getMasterPassword();

      // Parse encrypted data
      const data: EncryptedData = JSON.parse(encryptedDataString);

      // Validate version
      if (data.version !== this.VERSION) {
        throw new Error(
          `Unsupported encryption version: ${data.version}. Current version: ${this.VERSION}`
        );
      }

      // Validate algorithm
      if (data.algorithm !== this.ALGORITHM) {
        throw new Error(
          `Unsupported encryption algorithm: ${data.algorithm}. Expected: ${this.ALGORITHM}`
        );
      }

      // Parse components
      const salt = Buffer.from(data.salt, 'hex');
      const iv = Buffer.from(data.iv, 'hex');
      const encrypted = data.encrypted;
      const authTag = Buffer.from(data.authTag, 'hex');

      // Derive decryption key
      const key = await this.deriveKey(masterPassword, salt);

      // Create decipher
      const decipher = createDecipheriv(this.ALGORITHM, key, iv);

      // Set authentication tag
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      
      // Provide specific error messages for common issues
      if (error instanceof SyntaxError) {
        throw new Error('Invalid encrypted data format: Not valid JSON');
      }
      
      if (error instanceof Error && error.message.includes('Unsupported state')) {
        throw new Error('Decryption failed: Invalid authentication tag or corrupted data');
      }

      throw new Error(
        `Failed to decrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a string appears to be encrypted data
   * 
   * @param data The string to check
   * @returns True if data appears to be encrypted
   */
  static isEncrypted(data: string | null | undefined): boolean {
    if (!data) return false;

    try {
      const parsed = JSON.parse(data);
      return (
        typeof parsed === 'object' &&
        parsed !== null &&
        'version' in parsed &&
        'algorithm' in parsed &&
        'salt' in parsed &&
        'iv' in parsed &&
        'encrypted' in parsed &&
        'authTag' in parsed
      );
    } catch {
      return false;
    }
  }

  /**
   * Validate that master password is configured
   * 
   * @returns True if master password is configured
   */
  static isMasterPasswordConfigured(): boolean {
    try {
      this.getMasterPassword();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a secure random master password
   * This should be called once during initial setup and stored securely
   * 
   * @param length Length of password (default: 64 characters)
   * @returns Random password string
   */
  static generateMasterPassword(length: number = 64): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const bytes = randomBytes(length);
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const byte = bytes[i];
      if (byte !== undefined) {
        password += chars[byte % chars.length];
      }
    }
    
    return password;
  }
}

export default WalletEncryptionService;
