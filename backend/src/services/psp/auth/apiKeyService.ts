/**
 * API Key Service
 * 
 * Manages PSP API keys for authentication and authorization.
 * 
 * Features:
 * - Generate secure API keys
 * - Hash keys for database storage
 * - Validate API keys
 * - IP whitelisting
 * - Key expiration
 * - Usage tracking
 */

import { randomBytes, createHash } from 'crypto';
import { getDatabase } from '../../../infrastructure/database/client';
import { PSPEncryptionService } from '../security/pspEncryptionService';
import type { 
  PSPApiKey, 
  PSPEnvironment, 
  PSPApiKeyStatus,
  CreateApiKeyRequest as ImportedCreateApiKeyRequest,
  ApiKeyResponse as ImportedApiKeyResponse
} from '../../../types/psp';

// Re-export types from psp.ts for convenience
export type CreateApiKeyRequest = ImportedCreateApiKeyRequest & {
  userId: string;  // Add userId for creator tracking
};

export type ApiKeyResponse = ImportedApiKeyResponse & {
  keyHash: string;
  ipWhitelist: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
};

export interface ValidateApiKeyRequest {
  apiKey: string;
  ipAddress?: string;
}

export interface ValidateApiKeyResponse {
  valid: boolean;
  projectId?: string;
  environment?: PSPEnvironment;
  error?: string;
}

export class ApiKeyService {
  /**
   * Generate a new API key
   * Format: psp_sandbox_xxxxx or psp_production_xxxxx
   */
  private static generateApiKey(environment: PSPEnvironment): string {
    const randomPart = randomBytes(32).toString('hex');
    return `psp_${environment}_${randomPart}`;
  }

  /**
   * Hash API key for storage
   */
  private static hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Create a new API key
   */
  static async createApiKey(request: CreateApiKeyRequest): Promise<ApiKeyResponse> {
    const db = getDatabase();

    // Generate new API key
    const apiKey = this.generateApiKey(request.environment);
    const keyHash = this.hashApiKey(apiKey);

    // Store Warp API key in vault if provided
    let warpApiKeyVaultId: string | undefined;
    if (request.warp_api_key) {
      const vaultRef = await PSPEncryptionService.encryptWarpApiKey(
        request.warp_api_key,
        request.project_id,
        request.userId,
        `Warp API key for ${request.key_description}`
      );
      warpApiKeyVaultId = vaultRef.vaultId;
    }

    // Create API key record
    const apiKeyRecord = await db.psp_api_keys.create({
      data: {
        project_id: request.project_id,
        key_hash: keyHash,
        key_description: request.key_description,
        environment: request.environment,
        warp_api_key_vault_id: warpApiKeyVaultId,
        ip_whitelist: request.ip_whitelist ?? [],
        status: 'active',
        created_by: request.userId,
        expires_at: request.expires_at ?? null
      }
    });

    return {
      id: apiKeyRecord.id,
      api_key: apiKey,  // Only returned during creation
      keyHash: apiKeyRecord.key_hash,
      key_description: apiKeyRecord.key_description,
      environment: apiKeyRecord.environment as PSPEnvironment,
      status: apiKeyRecord.status as PSPApiKeyStatus,
      ipWhitelist: apiKeyRecord.ip_whitelist as string[],
      created_at: apiKeyRecord.created_at ?? new Date(),
      expiresAt: apiKeyRecord.expires_at,
      lastUsedAt: apiKeyRecord.last_used_at
    };
  }

  /**
   * Validate an API key
   */
  static async validateApiKey(request: ValidateApiKeyRequest): Promise<ValidateApiKeyResponse> {
    const db = getDatabase();

    // Hash the provided key
    const keyHash = this.hashApiKey(request.apiKey);

    // Look up key in database
    const apiKeyRecord = await db.psp_api_keys.findUnique({
      where: { key_hash: keyHash },
      select: {
        id: true,
        project_id: true,
        environment: true,
        status: true,
        ip_whitelist: true,
        expires_at: true
      }
    });

    if (!apiKeyRecord) {
      return {
        valid: false,
        error: 'Invalid API key'
      };
    }

    // Check if key is active
    if (apiKeyRecord.status !== 'active') {
      return {
        valid: false,
        error: `API key is ${apiKeyRecord.status}`
      };
    }

    // Check if key is expired
    if (apiKeyRecord.expires_at && apiKeyRecord.expires_at < new Date()) {
      // Update status to revoked
      await db.psp_api_keys.update({
        where: { id: apiKeyRecord.id },
        data: { status: 'revoked' }
      });

      return {
        valid: false,
        error: 'API key has expired'
      };
    }

    // Check IP whitelist if provided
    if (request.ipAddress && apiKeyRecord.ip_whitelist && apiKeyRecord.ip_whitelist.length > 0) {
      const ipWhitelist = apiKeyRecord.ip_whitelist as string[];
      if (!ipWhitelist.includes(request.ipAddress)) {
        return {
          valid: false,
          error: 'IP address not whitelisted'
        };
      }
    }

    // Update last used timestamp
    await db.psp_api_keys.update({
      where: { id: apiKeyRecord.id },
      data: { last_used_at: new Date() }
    });

    return {
      valid: true,
      projectId: apiKeyRecord.project_id,
      environment: apiKeyRecord.environment as PSPEnvironment
    };
  }

  /**
   * List API keys for a project
   */
  static async listApiKeys(projectId: string): Promise<Omit<ApiKeyResponse, 'api_key'>[]> {
    const db = getDatabase();

    const apiKeys = await db.psp_api_keys.findMany({
      where: {
        project_id: projectId,
        status: { not: 'revoked' }
      },
      orderBy: { created_at: 'desc' }
    });

    return apiKeys.map(key => ({
      id: key.id,
      keyHash: key.key_hash,
      key_description: key.key_description,
      environment: key.environment as PSPEnvironment,
      status: key.status as PSPApiKeyStatus,
      ipWhitelist: key.ip_whitelist as string[],
      created_at: key.created_at ?? new Date(),
      expiresAt: key.expires_at,
      lastUsedAt: key.last_used_at
    }));
  }

  /**
   * Revoke an API key
   */
  static async revokeApiKey(apiKeyId: string): Promise<void> {
    const db = getDatabase();

    await db.psp_api_keys.update({
      where: { id: apiKeyId },
      data: { status: 'revoked', updated_at: new Date() }
    });
  }

  /**
   * Suspend an API key (temporary)
   */
  static async suspendApiKey(apiKeyId: string): Promise<void> {
    const db = getDatabase();

    await db.psp_api_keys.update({
      where: { id: apiKeyId },
      data: { status: 'suspended', updated_at: new Date() }
    });
  }

  /**
   * Reactivate a suspended API key
   */
  static async reactivateApiKey(apiKeyId: string): Promise<void> {
    const db = getDatabase();

    // Only reactivate suspended keys
    const apiKey = await db.psp_api_keys.findUnique({
      where: { id: apiKeyId },
      select: { status: true }
    });

    if (apiKey?.status !== 'suspended') {
      throw new Error('Can only reactivate suspended keys');
    }

    await db.psp_api_keys.update({
      where: { id: apiKeyId },
      data: { status: 'active', updated_at: new Date() }
    });
  }

  /**
   * Update IP whitelist for an API key
   */
  static async updateIpWhitelist(apiKeyId: string, ipWhitelist: string[]): Promise<void> {
    const db = getDatabase();

    await db.psp_api_keys.update({
      where: { id: apiKeyId },
      data: { ip_whitelist: ipWhitelist, updated_at: new Date() }
    });
  }

  /**
   * Get Warp API client for a project
   * Automatically decrypts and uses the stored Warp API key
   */
  static async getWarpClientForProject(projectId: string, environment: PSPEnvironment): Promise<any> {
    const db = getDatabase();

    // Find active API key for this project/environment
    const apiKey = await db.psp_api_keys.findFirst({
      where: {
        project_id: projectId,
        environment,
        status: 'active',
        warp_api_key_vault_id: { not: null }
      },
      select: {
        warp_api_key_vault_id: true
      }
    });

    if (!apiKey?.warp_api_key_vault_id) {
      throw new Error(`No active Warp API key found for project ${projectId} in ${environment}`);
    }

    // Decrypt Warp API key
    const decryptedWarpKey = await PSPEncryptionService.decryptWarpApiKey(
      apiKey.warp_api_key_vault_id
    );

    // Import WarpApiClient dynamically to avoid circular dependencies
    const { WarpApiClient } = await import('../../../infrastructure/warp');

    return new WarpApiClient({
      apiKey: decryptedWarpKey,
      environment
    });
  }
}

export default ApiKeyService;
