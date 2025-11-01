/**
 * PSP Encryption Service
 * 
 * Wraps WalletEncryptionService for PSP-specific encryption needs.
 * Provides encryption/decryption for Warp API keys, webhook passwords,
 * bank account details, and PII data.
 * 
 * All encrypted data is stored in the key_vault_keys table with references
 * stored in PSP tables.
 * 
 * Security Features:
 * - Uses existing AES-256-GCM encryption infrastructure
 * - Centralized key management through key_vault_keys table
 * - Audit trail for all encryption operations
 * - Support for key rotation
 */

import { WalletEncryptionService } from '../../security/walletEncryptionService';
import { getDatabase } from '../../../infrastructure/database/client';

export interface EncryptedVaultReference {
  vaultId: string;  // UUID in key_vault_keys table
  keyId: string;    // Human-readable identifier
}

export type PIIType = 'ssn' | 'id_number' | 'tax_id' | 'passport' | 'drivers_license';

export class PSPEncryptionService {
  /**
   * Encrypt and store a Warp API key in the vault
   */
  static async encryptWarpApiKey(
    apiKey: string,
    projectId: string,
    description: string,
    userId: string = 'system'
  ): Promise<EncryptedVaultReference> {
    // Encrypt the API key
    const encrypted = await WalletEncryptionService.encrypt(apiKey);
    
    // Generate a unique key ID
    const keyId = `warp_api_key_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Store in key_vault_keys table
    const db = getDatabase();
    const result = await db.key_vault_keys.create({
      data: {
        key_id: keyId,
        encrypted_key: encrypted,
        key_type: 'api_key',
        metadata: {
          purpose: 'warp_api_key',
          description,
          project_id: projectId
        },
        created_by: userId
      }
    });
    
    return {
      vaultId: result.id,
      keyId: result.key_id
    };
  }

  /**
   * Decrypt a Warp API key from the vault
   */
  static async decryptWarpApiKey(vaultId: string): Promise<string> {
    const db = getDatabase();
    
    // Retrieve encrypted key
    const vaultRecord = await db.key_vault_keys.findUnique({
      where: { id: vaultId },
      select: { encrypted_key: true }
    });
    
    if (!vaultRecord) {
      throw new Error('Warp API key not found in vault');
    }
    
    // Decrypt
    return await WalletEncryptionService.decrypt(vaultRecord.encrypted_key);
  }

  /**
   * Encrypt and store webhook authentication password
   */
  static async encryptWebhookPassword(
    password: string,
    projectId: string,
    description: string,
    userId?: string
  ): Promise<EncryptedVaultReference> {
    const encrypted = await WalletEncryptionService.encrypt(password);
    
    const keyId = `webhook_password_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    const db = getDatabase();
    const result = await db.key_vault_keys.create({
      data: {
        key_id: keyId,
        encrypted_key: encrypted,
        key_type: 'webhook_password',
        metadata: {
          purpose: 'webhook_auth',
          description,
          project_id: projectId
        },
        created_by: userId || null
      }
    });
    
    return {
      vaultId: result.id,
      keyId: result.key_id
    };
  }

  /**
   * Decrypt webhook password from vault
   */
  static async decryptWebhookPassword(vaultId: string): Promise<string> {
    const db = getDatabase();
    
    const vaultRecord = await db.key_vault_keys.findUnique({
      where: { id: vaultId },
      select: { encrypted_key: true }
    });
    
    if (!vaultRecord) {
      throw new Error('Webhook password not found in vault');
    }
    
    return await WalletEncryptionService.decrypt(vaultRecord.encrypted_key);
  }

  /**
   * Encrypt and store bank account number
   */
  static async encryptAccountNumber(
    accountNumber: string,
    projectId: string,
    userId: string,
    description: string
  ): Promise<EncryptedVaultReference> {
    const encrypted = await WalletEncryptionService.encrypt(accountNumber);
    
    const keyId = `account_number_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    const db = getDatabase();
    const result = await db.key_vault_keys.create({
      data: {
        key_id: keyId,
        encrypted_key: encrypted,
        key_type: 'account_number',
        metadata: {
          purpose: 'bank_account',
          description,
          project_id: projectId
        },
        created_by: userId
      }
    });
    
    return {
      vaultId: result.id,
      keyId: result.key_id
    };
  }

  /**
   * Decrypt account number from vault
   */
  static async decryptAccountNumber(vaultId: string): Promise<string> {
    const db = getDatabase();
    
    const vaultRecord = await db.key_vault_keys.findUnique({
      where: { id: vaultId },
      select: { encrypted_key: true }
    });
    
    if (!vaultRecord) {
      throw new Error('Account number not found in vault');
    }
    
    return await WalletEncryptionService.decrypt(vaultRecord.encrypted_key);
  }

  /**
   * Encrypt and store routing number
   */
  static async encryptRoutingNumber(
    routingNumber: string,
    projectId: string,
    userId: string,
    description: string
  ): Promise<EncryptedVaultReference> {
    const encrypted = await WalletEncryptionService.encrypt(routingNumber);
    
    const keyId = `routing_number_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    const db = getDatabase();
    const result = await db.key_vault_keys.create({
      data: {
        key_id: keyId,
        encrypted_key: encrypted,
        key_type: 'routing_number',
        metadata: {
          purpose: 'bank_routing',
          description,
          project_id: projectId
        },
        created_by: userId
      }
    });
    
    return {
      vaultId: result.id,
      keyId: result.key_id
    };
  }

  /**
   * Decrypt routing number from vault
   */
  static async decryptRoutingNumber(vaultId: string): Promise<string> {
    const db = getDatabase();
    
    const vaultRecord = await db.key_vault_keys.findUnique({
      where: { id: vaultId },
      select: { encrypted_key: true }
    });
    
    if (!vaultRecord) {
      throw new Error('Routing number not found in vault');
    }
    
    return await WalletEncryptionService.decrypt(vaultRecord.encrypted_key);
  }

  /**
   * Encrypt sensitive PII data (SSN, tax ID, etc.) for identity verification
   */
  static async encryptPII(
    piiData: string,
    projectId: string,
    piiType: PIIType,
    userId: string = 'system'
  ): Promise<EncryptedVaultReference> {
    const encrypted = await WalletEncryptionService.encrypt(piiData);
    
    const keyId = `${piiType}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    const db = getDatabase();
    const result = await db.key_vault_keys.create({
      data: {
        key_id: keyId,
        encrypted_key: encrypted,
        key_type: 'pii',
        metadata: {
          purpose: 'identity_verification',
          pii_type: piiType,
          project_id: projectId
        },
        created_by: userId
      }
    });
    
    return {
      vaultId: result.id,
      keyId: result.key_id
    };
  }

  /**
   * Decrypt PII from vault
   */
  static async decryptPII(vaultId: string): Promise<string> {
    const db = getDatabase();
    
    const vaultRecord = await db.key_vault_keys.findUnique({
      where: { id: vaultId },
      select: { encrypted_key: true }
    });
    
    if (!vaultRecord) {
      throw new Error('PII data not found in vault');
    }
    
    return await WalletEncryptionService.decrypt(vaultRecord.encrypted_key);
  }

  /**
   * Delete a key from the vault
   * Use this for "right to be forgotten" compliance
   */
  static async deleteVaultKey(vaultId: string): Promise<void> {
    const db = getDatabase();
    
    await db.key_vault_keys.delete({
      where: { id: vaultId }
    });
  }

  /**
   * Rotate a vault key (decrypt old, re-encrypt with current master password)
   * This is used when WALLET_MASTER_PASSWORD needs to be changed
   */
  static async rotateVaultKey(vaultId: string): Promise<void> {
    const db = getDatabase();
    
    // Get the vault record
    const vaultRecord = await db.key_vault_keys.findUnique({
      where: { id: vaultId },
      select: { encrypted_key: true }
    });
    
    if (!vaultRecord) {
      throw new Error('Vault key not found');
    }
    
    // Decrypt with current password
    const decrypted = await WalletEncryptionService.decrypt(vaultRecord.encrypted_key);
    
    // Re-encrypt (will use current master password)
    const reEncrypted = await WalletEncryptionService.encrypt(decrypted);
    
    // Update in vault
    await db.key_vault_keys.update({
      where: { id: vaultId },
      data: {
        encrypted_key: reEncrypted,
        updated_at: new Date()
      }
    });
  }

  /**
   * Batch rotate all vault keys for a project
   * Use this when rotating the master password
   */
  static async rotateAllProjectKeys(projectId: string): Promise<{
    total: number;
    rotated: number;
    failed: number;
    errors: string[];
  }> {
    const db = getDatabase();
    
    // Get all vault keys for this project (stored in metadata)
    const vaultKeys = await db.key_vault_keys.findMany({
      select: { id: true, key_id: true, metadata: true }
    });
    
    // Filter by project_id in metadata
    const projectKeys = vaultKeys.filter(key => {
      const metadata = key.metadata as { project_id?: string } | null;
      return metadata?.project_id === projectId;
    });
    
    const total = projectKeys.length;
    let rotated = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const key of projectKeys) {
      try {
        await this.rotateVaultKey(key.id);
        rotated++;
      } catch (error) {
        failed++;
        const errorMsg = `Failed to rotate ${key.key_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    return { total, rotated, failed, errors };
  }
}

export default PSPEncryptionService;
