/**
 * Warp Client Service
 * 
 * Wrapper service that provides easy access to authenticated Warp API clients.
 * Integrates PSP authentication with the underlying WarpApiClient infrastructure.
 * 
 * Key Features:
 * - Automatic API key decryption from vault
 * - Project-level client instantiation
 * - Environment-specific configuration
 * - Client caching for performance
 * 
 * Usage:
 *   const client = await WarpClientService.getClientForProject(projectId, 'production');
 *   const wallets = await client.getWallets();
 */

import { WarpApiClient } from '@/infrastructure/warp/warpApiClient';
import { PSPEncryptionService } from '../security/pspEncryptionService';
import { getDatabase } from '@/infrastructure/database/client';
import { logger } from '@/utils/logger';
import type { PSPEnvironment } from '@/types/psp';

interface ClientCacheEntry {
  client: WarpApiClient;
  createdAt: Date;
  projectId: string;
  environment: PSPEnvironment;
}

export class WarpClientService {
  // Client cache to avoid repeated decryption
  private static clientCache = new Map<string, ClientCacheEntry>();
  
  // Cache TTL (5 minutes)
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000;

  /**
   * Get cache key for a project/environment combination
   */
  private static getCacheKey(projectId: string, environment: PSPEnvironment): string {
    return `${projectId}:${environment}`;
  }

  /**
   * Check if cached client is still valid
   */
  private static isCacheValid(entry: ClientCacheEntry): boolean {
    const now = new Date();
    const age = now.getTime() - entry.createdAt.getTime();
    return age < this.CACHE_TTL_MS;
  }

  /**
   * Clear the client cache
   * Call this when API keys are rotated or updated
   */
  static clearCache(projectId?: string, environment?: PSPEnvironment): void {
    if (projectId && environment) {
      // Clear specific project/environment
      const key = this.getCacheKey(projectId, environment);
      this.clientCache.delete(key);
      logger.info(`Cleared Warp client cache for ${projectId} (${environment})`);
    } else {
      // Clear all cached clients
      this.clientCache.clear();
      logger.info('Cleared all Warp client cache');
    }
  }

  /**
   * Get authenticated Warp API client for a project
   * 
   * This is the primary method to use when you need to make Warp API calls.
   * It handles:
   * - Finding the active API key for the project
   * - Decrypting the Warp API key from vault
   * - Creating and caching the client
   * 
   * @param projectId - The project UUID
   * @param environment - 'sandbox' or 'production'
   * @returns Configured WarpApiClient instance
   * @throws Error if no active API key found or decryption fails
   */
  static async getClientForProject(
    projectId: string, 
    environment: PSPEnvironment
  ): Promise<WarpApiClient> {
    // Check cache first
    const cacheKey = this.getCacheKey(projectId, environment);
    const cached = this.clientCache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      logger.debug(`Using cached Warp client for ${projectId} (${environment})`);
      return cached.client;
    }

    // Not in cache or expired - create new client
    logger.info(`Creating new Warp client for ${projectId} (${environment})`);
    
    const db = getDatabase();

    // Find active API key with Warp credentials
    const apiKey = await db.psp_api_keys.findFirst({
      where: {
        project_id: projectId,
        environment,
        status: 'active',
        warp_api_key_vault_id: { not: null }
      },
      select: {
        id: true,
        warp_api_key_vault_id: true,
        key_description: true
      }
    });

    if (!apiKey?.warp_api_key_vault_id) {
      const error = `No active Warp API key found for project ${projectId} in ${environment}`;
      logger.error(error);
      throw new Error(error);
    }

    // Decrypt Warp API key from vault
    let decryptedWarpKey: string;
    try {
      decryptedWarpKey = await PSPEncryptionService.decryptWarpApiKey(
        apiKey.warp_api_key_vault_id
      );
    } catch (error) {
      logger.error({ 
        error, 
        projectId, 
        apiKeyId: apiKey.id 
      }, 'Failed to decrypt Warp API key');
      throw new Error('Failed to decrypt Warp API key');
    }

    // Create new WarpApiClient
    const client = new WarpApiClient({
      apiKey: decryptedWarpKey,
      environment
    });

    // Cache the client
    this.clientCache.set(cacheKey, {
      client,
      createdAt: new Date(),
      projectId,
      environment
    });

    logger.info({
      apiKeyDescription: apiKey.key_description
    }, `Successfully created Warp client for ${projectId} (${environment})`);

    return client;
  }

  /**
   * Test a Warp API key by making a simple API call
   * 
   * @param projectId - The project UUID
   * @param environment - 'sandbox' or 'production'
   * @returns True if connection is successful
   */
  static async testConnection(
    projectId: string, 
    environment: PSPEnvironment
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.getClientForProject(projectId, environment);
      
      // Make a simple API call to test connectivity
      const response = await client.getWallets();
      
      if (response.success) {
        logger.info(`Warp API connection test successful for ${projectId} (${environment})`);
        return { success: true };
      } else {
        logger.warn({
          error: response.error
        }, `Warp API connection test failed for ${projectId} (${environment})`);
        return { 
          success: false, 
          error: response.error?.message || 'API call failed' 
        };
      }
    } catch (error) {
      logger.error({ 
        error 
      }, `Warp API connection test error for ${projectId} (${environment})`);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get Warp API client configuration (without sensitive data)
   * 
   * @param projectId - The project UUID
   * @param environment - 'sandbox' or 'production'
   * @returns Configuration details (base URL, environment, etc.)
   */
  static async getClientConfig(
    projectId: string, 
    environment: PSPEnvironment
  ): Promise<{
    baseURL: string;
    environment: PSPEnvironment;
    timeout: number;
    retries: number;
  }> {
    const client = await this.getClientForProject(projectId, environment);
    const config = client.getConfig();
    
    return {
      baseURL: client.getBaseURL(),
      environment: config.environment,
      timeout: config.timeout || 30000,
      retries: config.retries || 3
    };
  }

  /**
   * Clear expired cache entries
   * Call this periodically to free up memory
   */
  static clearExpiredCache(): void {
    const now = new Date();
    let cleared = 0;

    for (const [key, entry] of this.clientCache.entries()) {
      if (!this.isCacheValid(entry)) {
        this.clientCache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      logger.info(`Cleared ${cleared} expired Warp client cache entries`);
    }
  }

  /**
   * Get cache statistics (for monitoring)
   */
  static getCacheStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
  } {
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.clientCache.values()) {
      if (this.isCacheValid(entry)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.clientCache.size,
      validEntries,
      expiredEntries
    };
  }
}

export default WarpClientService;
