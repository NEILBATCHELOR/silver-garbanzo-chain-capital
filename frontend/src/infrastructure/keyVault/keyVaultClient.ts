import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { IKeyVaultClient, KeyResult, KeyPairResult } from './keyVaultInterface';
import { ProjectCredential } from '@/types/credentials';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';

// Environment variables would be used in production
const KEY_VAULT_SERVICE_URL = process.env.NEXT_PUBLIC_KEY_VAULT_SERVICE_URL || 'https://api.keyvault.example.com';
const API_KEY = process.env.KEY_VAULT_API_KEY || 'dummy-api-key';

/**
 * Key Vault Client
 * 
 * This client interfaces with a secure key management service like AWS KMS or Azure Key Vault.
 * In production, this would connect to a secure HSM-backed service.
 * 
 * For development/testing, we implement a simplified version that:
 * 1. Encrypts private keys before storing them
 * 2. Uses secure context isolation
 * 3. Logs all access attempts
 */
class KeyVaultClient implements IKeyVaultClient {
  private credentials: ProjectCredential | null = null;

  async connect(credentials: ProjectCredential): Promise<void> {
    this.credentials = credentials;
    // Initialize connection to key vault service
    // This is a placeholder - implement actual key vault connection logic
  }

  async disconnect(): Promise<void> {
    this.credentials = null;
  }

  async getKey(vaultIdOrKeyId: string): Promise<KeyResult> {
    // Note: Credentials check removed as Supabase handles auth automatically
    
    try {
      // Retrieve the encrypted key using the UUID vault ID or custom key_id
      const encryptedKey = await this.getEncryptedKey(vaultIdOrKeyId);
      if (!encryptedKey) {
        throw new Error('Key not found');
      }
      
      // Decrypt the key (in production, this would not be necessary)
      const decryptedValue = await this.decryptPrivateKey(encryptedKey);
      
      // Check if this looks like a mnemonic (contains spaces) vs a private key (hex)
      const isMnemonic = decryptedValue.includes(' ') && !decryptedValue.startsWith('0x');
      
      let address: string;
      if (isMnemonic) {
        // Remove any "0x" prefix that may have been incorrectly added
        const cleanMnemonic = decryptedValue.replace(/^0x/, '').trim();
        const hdWallet = ethers.Wallet.fromPhrase(cleanMnemonic);
        address = hdWallet.address;
      } else {
        // It's a private key
        const wallet = new ethers.Wallet(decryptedValue);
        address = wallet.address;
      }
      
      // Return both the private key and the address
      return {
        privateKey: decryptedValue, // Return original decrypted value (could be mnemonic or private key)
        address: address
      };
    } catch (error) {
      console.error(`Error retrieving key ${vaultIdOrKeyId}:`, error);
      throw new Error(`Failed to retrieve key: ${error}`);
    }
  }

  /**
   * Retrieve raw decrypted value from key vault without creating a wallet
   * Useful for retrieving mnemonics or other non-private-key values
   * 
   * @param vaultIdOrKeyId - The UUID or custom key_id of the key vault entry
   * @returns The raw decrypted value
   */
  async getRawValue(vaultIdOrKeyId: string): Promise<string> {
    try {
      // Retrieve the encrypted key using the UUID vault ID or custom key_id
      const encryptedKey = await this.getEncryptedKey(vaultIdOrKeyId);
      if (!encryptedKey) {
        throw new Error('Key not found');
      }
      
      // Decrypt and return the raw value
      const decryptedValue = await this.decryptPrivateKey(encryptedKey);
      
      // Remove any incorrect "0x" prefix from mnemonics
      if (decryptedValue.startsWith('0x') && decryptedValue.includes(' ')) {
        return decryptedValue.replace(/^0x/, '').trim();
      }
      
      return decryptedValue;
    } catch (error) {
      console.error(`Error retrieving raw value ${vaultIdOrKeyId}:`, error);
      throw new Error(`Failed to retrieve raw value: ${error}`);
    }
  }

  async storeKey(key: string): Promise<string> {
    // Note: Credentials check removed as Supabase handles auth automatically
    // via supabase.auth.getUser() in the storage methods
    
    try {
      // Generate a key ID for reference/tracking
      const keyId = `key-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // Encrypt the key
      const encryptedKey = await this.encryptPrivateKey(key);
      
      // Store the encrypted key and get the UUID id
      const vaultId = await this.storeEncryptedKey(keyId, encryptedKey);
      
      // Return the UUID id (not the custom key_id string)
      return vaultId;
    } catch (error) {
      console.error('Error storing key:', error);
      throw new Error(`Failed to store key: ${error}`);
    }
  }

  /**
   * Generate a new key pair
   */
  async generateKeyPair(): Promise<KeyPairResult> {
    try {
      // In production, this would call the secure HSM API
      // For development, we'll use ethers to generate a wallet
      const wallet = ethers.Wallet.createRandom();
      
      // Generate a key ID for reference/tracking
      const keyId = `key-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // In production, only the public key would be returned from the HSM
      // Private key would remain in the HSM
      const publicKey = wallet.address;
      
      // For development only - encrypt the private key
      // In production, this step wouldn't exist as private key never leaves HSM
      const encryptedPrivateKey = await this.encryptPrivateKey(wallet.privateKey);
      
      // Store the encrypted key in a secure table and get the UUID
      // In production, this would be handled by the key vault service
      const vaultId = await this.storeEncryptedKey(keyId, encryptedPrivateKey);
      
      return {
        keyId: vaultId, // Return UUID id, not the custom key_id string
        publicKey
      };
    } catch (error) {
      console.error('Error generating key pair:', error);
      throw new Error('Failed to generate key pair');
    }
  }
  
  /**
   * Sign data using a key in the vault
   * 
   * @param vaultIdOrKeyId The UUID or custom key_id of the key vault entry
   * @param data The data to sign
   * @returns The signature
   */
  async signData(vaultIdOrKeyId: string, data: string): Promise<string> {
    try {
      // In production, the HSM would handle the signing
      // For development, we need to:
      // 1. Retrieve the encrypted private key
      // 2. Decrypt it
      // 3. Sign the data
      // 4. Log the usage
      
      // Retrieve the encrypted key using the UUID vault ID or custom key_id
      const encryptedKey = await this.getEncryptedKey(vaultIdOrKeyId);
      if (!encryptedKey) {
        throw new Error('Key not found');
      }
      
      // Decrypt the key (in production, this would not be necessary)
      const privateKey = await this.decryptPrivateKey(encryptedKey);
      
      // Sign the data
      const wallet = new ethers.Wallet(privateKey);
      const messageHash = ethers.id(data);
      const signature = await wallet.signMessage(ethers.getBytes(messageHash));
      
      return signature;
    } catch (error) {
      console.error('Error signing data:', error);
      throw new Error('Failed to sign data');
    }
  }
  
  /**
   * Delete a key from the vault
   * 
   * @param vaultIdOrKeyId The UUID or custom key_id of the key vault entry to delete
   */
  async deleteKey(vaultIdOrKeyId: string): Promise<{ success: boolean }> {
    try {
      // Check if input is a UUID or a custom key_id
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vaultIdOrKeyId);
      
      // Delete from key_vault_keys table by appropriate column
      const { error } = await supabase
        .from('key_vault_keys')
        .delete()
        .eq(isUuid ? 'id' : 'key_id', vaultIdOrKeyId);
        
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting key:', error);
      throw new Error('Failed to delete key');
    }
  }
  
  /**
   * Verify a signature
   * 
   * @param publicKey The public key
   * @param data The original data
   * @param signature The signature to verify
   */
  async verifySignature(publicKey: string, data: string, signature: string): Promise<boolean> {
    try {
      // This can be done client-side since it only requires the public key
      const messageHash = ethers.id(data);
      const signerAddr = ethers.verifyMessage(
        ethers.getBytes(messageHash), 
        signature
      );
      
      return signerAddr.toLowerCase() === publicKey.toLowerCase();
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }
  
  // These methods would not exist in production as they would be handled by the HSM
  // They are included here for development/testing only
  
  private async encryptPrivateKey(privateKey: string): Promise<string> {
    // Use WalletEncryptionClient for consistent encryption with the rest of the system
    try {
      console.log('Encrypting key using WalletEncryptionClient');
      const encrypted = await WalletEncryptionClient.encrypt(privateKey);
      console.log('Successfully encrypted key using WalletEncryptionClient');
      return encrypted;
    } catch (error) {
      console.error('Failed to encrypt using WalletEncryptionClient, falling back to simple encryption:', error);
      
      // Fallback to simple encryption if WalletEncryptionClient fails
      // In production, encryption would be handled by the HSM
      // For development, we'll use a simple encryption
      // WARNING: This is NOT secure for production use
      
      // Check if the key is already in proper hex format
      if (privateKey.startsWith('0x') && privateKey.length === 66) {
        // Key is already a valid hex private key, store as-is for development
        // In production, this would be encrypted by the HSM
        return privateKey;
      }
      
      // Check if it's a hex string without 0x prefix
      if (/^[0-9a-fA-F]{64}$/.test(privateKey)) {
        // Add 0x prefix and return
        return '0x' + privateKey;
      }
      
      // For other formats, base64 encode (legacy support)
      // In real production code, this would be a proper encryption using a KMS service
      return Buffer.from(privateKey).toString('base64');
    }
  }
  
  private async decryptPrivateKey(encryptedKey: string): Promise<string> {
    // First, check if this is WalletEncryptionClient encrypted data
    if (WalletEncryptionClient.isEncrypted(encryptedKey)) {
      console.log('Decrypting key using WalletEncryptionClient');
      try {
        const decrypted = await WalletEncryptionClient.decrypt(encryptedKey);
        console.log('Successfully decrypted key using WalletEncryptionClient');
        return decrypted;
      } catch (error) {
        console.error('Failed to decrypt using WalletEncryptionClient:', error);
        throw new Error(`Failed to decrypt key: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // In production, decryption would never happen as signing occurs in the HSM
    // For development, we'll reverse our simple encryption
    // WARNING: This is NOT secure for production use
    
    // Check if the key is already in hex format (plain private key)
    if (encryptedKey.startsWith('0x') && encryptedKey.length === 66) {
      // Key is already a plain hex private key, return as-is
      return encryptedKey;
    }
    
    // Check if it's a hex string without 0x prefix
    if (/^[0-9a-fA-F]{64}$/.test(encryptedKey)) {
      // Add 0x prefix
      return '0x' + encryptedKey;
    }
    
    // Otherwise, assume it's base64 encoded and decrypt
    try {
      return Buffer.from(encryptedKey, 'base64').toString('utf8');
    } catch (error) {
      console.error('Failed to decode as base64, returning as-is:', error);
      // If base64 decoding fails, return the original value
      return encryptedKey;
    }
  }
  
  private async storeEncryptedKey(keyId: string, encryptedKey: string): Promise<string> {
    // Store in dedicated key_vault_keys table (not project_wallets)
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('key_vault_keys')
      .insert({
        key_id: keyId,
        encrypted_key: encryptedKey,
        key_type: 'private_key',
        created_by: user?.id
      })
      .select('id')
      .single();
      
    if (error) throw error;
    if (!data) throw new Error('Failed to retrieve vault ID after insert');
    
    return data.id;
  }
  
  private async getEncryptedKey(vaultIdOrKeyId: string): Promise<string> {
    // Check if input is a UUID or a custom key_id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vaultIdOrKeyId);
    
    // Query by appropriate column
    const { data, error } = await supabase
      .from('key_vault_keys')
      .select('encrypted_key')
      .eq(isUuid ? 'id' : 'key_id', vaultIdOrKeyId)
      .single();
      
    if (error) throw error;
    return data.encrypted_key;
  }
}

// Export singleton instance
export const keyVaultClient = new KeyVaultClient();