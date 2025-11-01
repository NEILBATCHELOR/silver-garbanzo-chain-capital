/**
 * PSP API Key Service
 * 
 * Manages API key generation, validation, and lifecycle for PSP projects.
 * Provides secure key generation, hashing, and validation with IP whitelisting.
 * 
 * Security Features:
 * - Cryptographically secure key generation
 * - Bcrypt hashing for key storage
 * - Encrypted Warp API key storage via vault
 * - IP whitelist support
 * - Usage tracking and audit logging
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { BaseService } from '../../BaseService';
import { logger } from '@/utils/logger';
import { PSPEncryptionService } from '../security/pspEncryptionService';

export interface CreateApiKeyRequest {
  projectId: string;
  description: string;
  warpApiKey: string;
  environment: 'sandbox' | 'production';
  ipWhitelist?: string[];
  expiresAt?: Date;
}

export interface ApiKeyResponse {
  id: string;
  projectId: string;
  apiKey?: string;  // Only present when first created
  description: string;
  environment: 'sandbox' | 'production';
  ipWhitelist: string[];
  status: 'active' | 'suspended' | 'revoked';
  lastUsedAt: Date | null;
  createdAt: Date | null;
  expiresAt: Date | null;
}

export interface ValidatedApiKey {
  id: string;
  projectId: string;
  environment: 'sandbox' | 'production';
  warpApiKey: string;  // Decrypted from vault
}

export class ApiKeyService extends BaseService {
  constructor() {
    super('ApiKey');
  }

  /**
   * Generate a new API key with secure random bytes
   */
  private generateApiKey(): string {
    const randomBytes = crypto.randomBytes(32);
    const key = randomBytes.toString('base64url');
    return `warp_${key}`;
  }

  /**
   * Hash an API key for storage
   */
  private async hashApiKey(apiKey: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(apiKey, saltRounds);
  }

  /**
   * Verify an API key against its hash
   */
  private async verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
    return bcrypt.compare(apiKey, hash);
  }

  /**
   * Check if an IP is in the whitelist
   */
  private isIpWhitelisted(ip: string, whitelist: string[] | null): boolean {
    // If no whitelist, allow all IPs
    if (!whitelist || whitelist.length === 0) {
      return true;
    }

    // Check if IP matches any whitelist entry
    return whitelist.includes(ip);
  }

  /**
   * Create a new API key
   * Returns the plaintext API key only once - it will not be retrievable later
   */
  async createApiKey(
    request: CreateApiKeyRequest,
    userId: string = 'system'
  ): Promise<ApiKeyResponse> {
    this.logInfo('Creating new API key', { 
      projectId: request.projectId,
      environment: request.environment 
    });

    try {
      // Generate API key
      const apiKey = this.generateApiKey();
      const keyHash = await this.hashApiKey(apiKey);

      // Encrypt Warp API key
      const vaultRef = await PSPEncryptionService.encryptWarpApiKey(
        request.warpApiKey,
        request.projectId,
        request.description,
        userId
      );

      // Create record
      const record = await this.db.psp_api_keys.create({
        data: {
          project_id: request.projectId,
          key_hash: keyHash,
          key_description: request.description,
          environment: request.environment,
          warp_api_key_vault_id: vaultRef.vaultId,
          ip_whitelist: request.ipWhitelist || [],
          status: 'active',
          created_by: userId,
          expires_at: request.expiresAt || null
        }
      });

      this.logInfo('API key created successfully', { 
        keyId: record.id,
        projectId: request.projectId 
      });

      return {
        id: record.id,
        projectId: record.project_id,
        apiKey, // Return plaintext key only during creation
        description: record.key_description,
        environment: record.environment as 'sandbox' | 'production',
        ipWhitelist: record.ip_whitelist || [],
        status: record.status as 'active' | 'suspended' | 'revoked',
        lastUsedAt: record.last_used_at,
        createdAt: record.created_at,
        expiresAt: record.expires_at
      };
    } catch (error) {
      this.logError('Failed to create API key', { 
        error,
        projectId: request.projectId 
      });
      throw error;
    }
  }

  /**
   * Validate an API key and return authenticated context with decrypted Warp API key
   * Used internally for making Warp API calls on behalf of the project
   * Updates last_used_at timestamp
   */
  async validateAndDecryptApiKey(
    apiKey: string,
    ipAddress?: string
  ): Promise<ValidatedApiKey | null> {
    try {
      // Get all active API keys
      const allKeys = await this.db.psp_api_keys.findMany({
        where: {
          status: 'active'
        }
      });

      // Try to find matching key
      for (const record of allKeys) {
        // Check if key matches hash
        const isValid = await this.verifyApiKey(apiKey, record.key_hash);
        if (!isValid) continue;

        // Check if expired
        if (record.expires_at && record.expires_at < new Date()) {
          this.logWarn('Attempted use of expired API key', { keyId: record.id });
          continue;
        }

        // Check IP whitelist
        if (ipAddress && !this.isIpWhitelisted(ipAddress, record.ip_whitelist)) {
          this.logWarn('IP not whitelisted for API key', { 
            keyId: record.id, 
            ip: ipAddress 
          });
          continue;
        }

        // Update last_used_at
        await this.db.psp_api_keys.update({
          where: { id: record.id },
          data: {
            last_used_at: new Date(),
            usage_count: (record.usage_count || 0) + 1
          }
        });

        // Decrypt Warp API key - only if vault ID exists
        if (!record.warp_api_key_vault_id) {
          this.logWarn('API key missing vault reference', { keyId: record.id });
          continue;
        }

        const warpApiKey = await PSPEncryptionService.decryptWarpApiKey(
          record.warp_api_key_vault_id
        );

        this.logInfo('API key validated successfully', { 
          keyId: record.id,
          projectId: record.project_id 
        });

        return {
          id: record.id,
          projectId: record.project_id,
          environment: record.environment as 'sandbox' | 'production',
          warpApiKey
        };
      }

      this.logWarn('API key validation failed', { ipAddress });
      return null;
    } catch (error) {
      this.logError('Error validating API key', error);
      throw error;
    }
  }

  /**
   * List all API keys for a project
   * Does not return API key values, only metadata
   */
  async listApiKeys(projectId: string): Promise<ApiKeyResponse[]> {
    this.logInfo('Listing API keys', { projectId });

    const records = await this.db.psp_api_keys.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' }
    });

    return records.map(record => ({
      id: record.id,
      projectId: record.project_id,
      description: record.key_description,
      environment: record.environment as 'sandbox' | 'production',
      ipWhitelist: record.ip_whitelist || [],
      status: record.status as 'active' | 'suspended' | 'revoked',
      lastUsedAt: record.last_used_at,
      createdAt: record.created_at,
      expiresAt: record.expires_at
    }));
  }

  /**
   * Get a specific API key by ID
   */
  async getApiKey(keyId: string): Promise<ApiKeyResponse | null> {
    const record = await this.db.psp_api_keys.findUnique({
      where: { id: keyId }
    });

    if (!record) return null;

    return {
      id: record.id,
      projectId: record.project_id,
      description: record.key_description,
      environment: record.environment as 'sandbox' | 'production',
      ipWhitelist: record.ip_whitelist || [],
      status: record.status as 'active' | 'suspended' | 'revoked',
      lastUsedAt: record.last_used_at,
      createdAt: record.created_at,
      expiresAt: record.expires_at
    };
  }

  /**
   * Revoke an API key (permanent - cannot be reactivated)
   */
  async revokeApiKey(keyId: string): Promise<void> {
    this.logInfo('Revoking API key', { keyId });

    await this.db.psp_api_keys.update({
      where: { id: keyId },
      data: {
        status: 'revoked',
        updated_at: new Date()
      }
    });

    this.logInfo('API key revoked successfully', { keyId });
  }

  /**
   * Suspend an API key (temporary - can be reactivated)
   */
  async suspendApiKey(keyId: string): Promise<void> {
    this.logInfo('Suspending API key', { keyId });

    await this.db.psp_api_keys.update({
      where: { id: keyId },
      data: {
        status: 'suspended',
        updated_at: new Date()
      }
    });

    this.logInfo('API key suspended successfully', { keyId });
  }

  /**
   * Reactivate a suspended API key
   */
  async reactivateApiKey(keyId: string): Promise<void> {
    this.logInfo('Reactivating API key', { keyId });

    const record = await this.db.psp_api_keys.findUnique({
      where: { id: keyId }
    });

    if (!record) {
      throw new Error('API key not found');
    }

    if (record.status === 'revoked') {
      throw new Error('Cannot reactivate a revoked API key');
    }

    await this.db.psp_api_keys.update({
      where: { id: keyId },
      data: {
        status: 'active',
        updated_at: new Date()
      }
    });

    this.logInfo('API key reactivated successfully', { keyId });
  }

  /**
   * Update IP whitelist for an API key
   */
  async updateIpWhitelist(keyId: string, ipWhitelist: string[]): Promise<void> {
    this.logInfo('Updating IP whitelist', { keyId, ipCount: ipWhitelist.length });

    await this.db.psp_api_keys.update({
      where: { id: keyId },
      data: {
        ip_whitelist: ipWhitelist,
        updated_at: new Date()
      }
    });

    this.logInfo('IP whitelist updated successfully', { keyId });
  }

  /**
   * Add a single IP to the whitelist
   */
  async addIpToWhitelist(keyId: string, request: { ip: string; description?: string }): Promise<{ id: string; ipWhitelist: string[]; message: string }> {
    this.logInfo('Adding IP to whitelist', { keyId, ip: request.ip });

    const record = await this.db.psp_api_keys.findUnique({
      where: { id: keyId }
    });

    if (!record) {
      throw new Error('API key not found');
    }

    const currentWhitelist = record.ip_whitelist || [];
    
    // Check if IP already exists
    if (currentWhitelist.includes(request.ip)) {
      throw new Error('IP address already in whitelist');
    }

    // Add IP to whitelist
    const updatedWhitelist = [...currentWhitelist, request.ip];

    await this.db.psp_api_keys.update({
      where: { id: keyId },
      data: {
        ip_whitelist: updatedWhitelist,
        updated_at: new Date()
      }
    });

    this.logInfo('IP added to whitelist successfully', { keyId, ip: request.ip });

    return {
      id: keyId,
      ipWhitelist: updatedWhitelist,
      message: 'IP address added to whitelist'
    };
  }

  /**
   * Remove a single IP from the whitelist
   */
  async removeIpFromWhitelist(keyId: string, ip: string): Promise<{ id: string; ipWhitelist: string[]; message: string }> {
    this.logInfo('Removing IP from whitelist', { keyId, ip });

    const record = await this.db.psp_api_keys.findUnique({
      where: { id: keyId }
    });

    if (!record) {
      throw new Error('API key not found');
    }

    const currentWhitelist = record.ip_whitelist || [];
    
    // Check if IP exists
    if (!currentWhitelist.includes(ip)) {
      throw new Error('IP address not found in whitelist');
    }

    // Remove IP from whitelist
    const updatedWhitelist = currentWhitelist.filter(item => item !== ip);

    await this.db.psp_api_keys.update({
      where: { id: keyId },
      data: {
        ip_whitelist: updatedWhitelist,
        updated_at: new Date()
      }
    });

    this.logInfo('IP removed from whitelist successfully', { keyId, ip });

    return {
      id: keyId,
      ipWhitelist: updatedWhitelist,
      message: 'IP address removed from whitelist'
    };
  }

  /**
   * Delete an API key and its encrypted Warp key from vault
   */
  async deleteApiKey(keyId: string): Promise<void> {
    this.logInfo('Deleting API key', { keyId });

    const record = await this.db.psp_api_keys.findUnique({
      where: { id: keyId }
    });

    if (!record) {
      throw new Error('API key not found');
    }

    // Delete encrypted Warp API key from vault
    if (record.warp_api_key_vault_id) {
      await PSPEncryptionService.deleteVaultKey(record.warp_api_key_vault_id);
    }

    // Delete API key record
    await this.db.psp_api_keys.delete({
      where: { id: keyId }
    });

    this.logInfo('API key deleted successfully', { keyId });
  }

  /**
   * Get API keys that haven't been used in specified days
   */
  async getInactiveKeys(projectId: string, inactiveDays: number): Promise<ApiKeyResponse[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    const records = await this.db.psp_api_keys.findMany({
      where: {
        project_id: projectId,
        status: 'active',
        last_used_at: {
          lt: cutoffDate
        }
      }
    });

    return records.map(record => ({
      id: record.id,
      projectId: record.project_id,
      description: record.key_description,
      environment: record.environment as 'sandbox' | 'production',
      ipWhitelist: record.ip_whitelist || [],
      status: record.status as 'active' | 'suspended' | 'revoked',
      lastUsedAt: record.last_used_at,
      createdAt: record.created_at,
      expiresAt: record.expires_at
    }));
  }

  /**
   * Get API keys expiring within specified days
   */
  async getExpiringKeys(projectId: string, expiresInDays: number): Promise<ApiKeyResponse[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + expiresInDays);

    const records = await this.db.psp_api_keys.findMany({
      where: {
        project_id: projectId,
        status: 'active',
        expires_at: {
          lte: cutoffDate,
          gt: new Date()
        }
      }
    });

    return records.map(record => ({
      id: record.id,
      projectId: record.project_id,
      description: record.key_description,
      environment: record.environment as 'sandbox' | 'production',
      ipWhitelist: record.ip_whitelist || [],
      status: record.status as 'active' | 'suspended' | 'revoked',
      lastUsedAt: record.last_used_at,
      createdAt: record.created_at,
      expiresAt: record.expires_at
    }));
  }

  /**
   * Validate API key for middleware (simplified validation)
   * Returns validation result with detailed context
   */
  async validateApiKey(apiKey: string): Promise<{
    valid: boolean
    reason?: string
    projectId?: string
    keyId?: string
    environment?: 'sandbox' | 'production'
    ipWhitelist?: string[]
  }> {
    try {
      // Get all active API keys
      const allKeys = await this.db.psp_api_keys.findMany({
        where: {
          status: 'active'
        }
      });

      // Try to find matching key
      for (const record of allKeys) {
        // Check if key matches hash
        const isValid = await this.verifyApiKey(apiKey, record.key_hash);
        if (!isValid) continue;

        // Check if expired
        if (record.expires_at && record.expires_at < new Date()) {
          this.logWarn('Attempted use of expired API key', { keyId: record.id });
          return {
            valid: false,
            reason: 'API key has expired'
          };
        }

        // Return validation success with context
        return {
          valid: true,
          projectId: record.project_id,
          keyId: record.id,
          environment: record.environment as 'sandbox' | 'production',
          ipWhitelist: record.ip_whitelist || []
        };
      }

      return {
        valid: false,
        reason: 'Invalid or inactive API key'
      };

    } catch (error) {
      this.logError('Error validating API key', error);
      return {
        valid: false,
        reason: 'Validation failed'
      };
    }
  }

  /**
   * Update last used timestamp for an API key
   * Non-critical operation - doesn't throw on error
   */
  async updateLastUsed(keyId: string): Promise<void> {
    try {
      await this.db.psp_api_keys.update({
        where: { id: keyId },
        data: {
          last_used_at: new Date(),
          usage_count: {
            increment: 1
          }
        }
      });
    } catch (error) {
      // Non-critical error, just log it
      this.logWarn('Failed to update last_used_at', { keyId, error });
    }
  }
}

export default ApiKeyService;
