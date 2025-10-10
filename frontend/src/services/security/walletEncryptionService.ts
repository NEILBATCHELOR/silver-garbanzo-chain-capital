/**
 * Wallet Encryption API Client (Frontend)
 * 
 * SECURITY NOTICE:
 * This is a frontend API client only. Actual encryption happens on the backend.
 * Private keys are NEVER handled in the frontend for security reasons.
 * 
 * This client provides a safe interface to backend encryption services.
 */

export interface EncryptedData {
  version: number;
  algorithm: string;
  salt: string;
  iv: string;
  encrypted: string;
  authTag: string;
}

export class WalletEncryptionClient {
  private static readonly API_BASE_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  /**
   * Check if data appears to be encrypted
   * This is safe to do client-side as it only checks format
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
   * Encrypt data via backend API
   * 
   * ⚠️ WARNING: This should only be used for non-sensitive wallet operations.
   * For production, wallets should be generated and encrypted entirely on the backend.
   * 
   * @param plaintext Data to encrypt
   * @returns Encrypted data as JSON string
   */
  static async encrypt(plaintext: string): Promise<string> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/wallet/encrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ plaintext })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Encryption failed');
      }

      const result = await response.json();
      return result.encrypted;
    } catch (error) {
      console.error('Encryption API call failed:', error);
      throw new Error(
        `Failed to encrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypt data via backend API
   * 
   * @param encryptedDataString Encrypted data as JSON string
   * @returns Decrypted plaintext
   */
  static async decrypt(encryptedDataString: string): Promise<string> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/wallet/decrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ encrypted: encryptedDataString })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Decryption failed');
      }

      const result = await response.json();
      return result.plaintext;
    } catch (error) {
      console.error('Decryption API call failed:', error);
      throw new Error(
        `Failed to decrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if master password is configured (backend)
   */
  static async isMasterPasswordConfigured(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/wallet/encryption-status`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.configured === true;
    } catch {
      return false;
    }
  }
}

export default WalletEncryptionClient;
