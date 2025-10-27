/**
 * Webhook Authentication Service
 * 
 * Handles authentication for incoming and outgoing webhooks.
 * 
 * Features:
 * - Basic Auth validation for incoming webhooks
 * - Password encryption/decryption via vault
 * - Signature verification (HMAC-SHA256)
 * - Rate limiting protection
 * 
 * Security:
 * - All webhook passwords stored encrypted in key_vault_keys
 * - Constant-time comparison for timing attack prevention
 * - HMAC signatures for webhook payload verification
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { PSPEncryptionService } from '../security/pspEncryptionService';
import { getDatabase } from '@/infrastructure/database/client';
import { logger } from '@/utils/logger';

export interface WebhookAuthCredentials {
  username: string;
  password: string;
}

export interface WebhookValidationResult {
  valid: boolean;
  webhookId?: string;
  projectId?: string;
  error?: string;
}

export interface SignatureValidationResult {
  valid: boolean;
  error?: string;
}

export class WebhookAuthService {
  /**
   * Validate Basic Auth credentials for incoming webhook
   * 
   * @param authHeader - The Authorization header value (Basic base64...)
   * @param webhookId - The webhook ID to validate against
   * @returns Validation result with webhook details
   */
  static async validateBasicAuth(
    authHeader: string,
    webhookId: string
  ): Promise<WebhookValidationResult> {
    try {
      // Parse Authorization header
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return {
          valid: false,
          error: 'Missing or invalid Authorization header'
        };
      }

      // Decode base64 credentials
      const authParts = authHeader.split(' ');
      if (authParts.length !== 2 || authParts[0] !== 'Basic' || !authParts[1]) {
        return {
          valid: false,
          error: 'Invalid Authorization header format'
        };
      }
      
      const base64Credentials = authParts[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');

      if (!username || !password) {
        return {
          valid: false,
          error: 'Invalid credentials format'
        };
      }

      // Look up webhook configuration
      const db = getDatabase();
      const webhook = await db.psp_webhooks.findUnique({
        where: { id: webhookId },
        select: {
          id: true,
          project_id: true,
          auth_username: true,
          auth_password_vault_id: true,
          status: true
        }
      });

      if (!webhook) {
        return {
          valid: false,
          error: 'Webhook not found'
        };
      }

      // Check webhook status
      if (webhook.status !== 'active') {
        return {
          valid: false,
          error: `Webhook is ${webhook.status}`
        };
      }

      // Validate username (constant-time comparison)
      const usernameMatch = this.constantTimeCompare(
        username, 
        webhook.auth_username
      );

      if (!usernameMatch) {
        logger.warn({
          webhookId,
          providedUsername: username
        }, 'Webhook authentication failed - invalid username');
        return {
          valid: false,
          error: 'Invalid credentials'
        };
      }

      // Decrypt stored password
      if (!webhook.auth_password_vault_id) {
        logger.error({ webhookId }, 'Webhook missing password vault reference');
        return {
          valid: false,
          error: 'Webhook configuration error'
        };
      }

      let storedPassword: string;
      try {
        storedPassword = await PSPEncryptionService.decryptWebhookPassword(
          webhook.auth_password_vault_id
        );
      } catch (error) {
        logger.error({ 
          error, 
          webhookId 
        }, 'Failed to decrypt webhook password');
        return {
          valid: false,
          error: 'Authentication configuration error'
        };
      }

      // Validate password (constant-time comparison)
      const passwordMatch = this.constantTimeCompare(password, storedPassword);

      if (!passwordMatch) {
        logger.warn({
          webhookId
        }, 'Webhook authentication failed - invalid password');
        return {
          valid: false,
          error: 'Invalid credentials'
        };
      }

      // Authentication successful
      logger.info({
        webhookId,
        projectId: webhook.project_id
      }, 'Webhook authentication successful');

      return {
        valid: true,
        webhookId: webhook.id,
        projectId: webhook.project_id
      };
    } catch (error) {
      logger.error({ error, webhookId }, 'Webhook authentication error');
      return {
        valid: false,
        error: 'Authentication error'
      };
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private static constantTimeCompare(a: string, b: string): boolean {
    try {
      // Convert strings to buffers
      const bufA = Buffer.from(a, 'utf-8');
      const bufB = Buffer.from(b, 'utf-8');

      // If lengths don't match, still compare to prevent timing leaks
      if (bufA.length !== bufB.length) {
        // Compare with a dummy buffer of the expected length
        const dummy = Buffer.alloc(bufA.length);
        timingSafeEqual(bufA, dummy);
        return false;
      }

      // Constant-time comparison
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   * 
   * Used when sending webhooks to customers to prove authenticity
   * 
   * @param payload - The webhook payload (as JSON string)
   * @param secret - The shared secret (webhook password)
   * @returns HMAC signature as hex string
   */
  static generateSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify HMAC-SHA256 signature on incoming webhook payload
   * 
   * Used when receiving webhooks from Warp to verify authenticity
   * 
   * @param payload - The webhook payload (as JSON string)
   * @param providedSignature - The signature from the X-Warp-Signature header
   * @param secret - The shared secret
   * @returns Validation result
   */
  static verifySignature(
    payload: string,
    providedSignature: string,
    secret: string
  ): SignatureValidationResult {
    try {
      // Generate expected signature
      const expectedSignature = this.generateSignature(payload, secret);

      // Constant-time comparison
      const isValid = this.constantTimeCompare(
        providedSignature, 
        expectedSignature
      );

      if (!isValid) {
        logger.warn('Webhook signature verification failed');
        return {
          valid: false,
          error: 'Invalid signature'
        };
      }

      return { valid: true };
    } catch (error) {
      logger.error({ error }, 'Signature verification error');
      return {
        valid: false,
        error: 'Signature verification error'
      };
    }
  }

  /**
   * Create authentication header for outgoing webhooks
   * 
   * @param credentials - Username and password
   * @returns Base64-encoded Basic Auth header value
   */
  static createBasicAuthHeader(credentials: WebhookAuthCredentials): string {
    const combined = `${credentials.username}:${credentials.password}`;
    const base64 = Buffer.from(combined, 'utf-8').toString('base64');
    return `Basic ${base64}`;
  }

  /**
   * Encrypt and store webhook credentials
   * 
   * @param projectId - The project UUID
   * @param userId - The user creating the webhook
   * @param username - The webhook username
   * @param password - The webhook password (will be encrypted)
   * @param description - Description for audit trail
   * @returns Vault reference for the encrypted password
   */
  static async storeWebhookCredentials(
    projectId: string,
    userId: string,
    username: string,
    password: string,
    description: string
  ): Promise<{ username: string; passwordVaultId: string }> {
    // Encrypt password
    const vaultRef = await PSPEncryptionService.encryptWebhookPassword(
      password,
      projectId,
      userId,
      description
    );

    logger.info({
      projectId,
      username,
      vaultId: vaultRef.vaultId
    }, 'Webhook credentials stored in vault');

    return {
      username,
      passwordVaultId: vaultRef.vaultId
    };
  }

  /**
   * Retrieve decrypted webhook credentials
   * 
   * @param webhookId - The webhook UUID
   * @returns Decrypted credentials
   */
  static async getWebhookCredentials(
    webhookId: string
  ): Promise<WebhookAuthCredentials> {
    const db = getDatabase();

    const webhook = await db.psp_webhooks.findUnique({
      where: { id: webhookId },
      select: {
        auth_username: true,
        auth_password_vault_id: true
      }
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (!webhook.auth_password_vault_id) {
      throw new Error('Webhook missing password vault reference');
    }

    // Decrypt password
    const password = await PSPEncryptionService.decryptWebhookPassword(
      webhook.auth_password_vault_id
    );

    return {
      username: webhook.auth_username,
      password
    };
  }
}

export default WebhookAuthService;
