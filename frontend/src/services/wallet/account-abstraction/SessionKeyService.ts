/**
 * Frontend SessionKeyService - EIP-4337 Session Key Management Integration
 * 
 * Provides frontend interface to backend session key operations:
 * - Temporary session key creation and management
 * - Session validation and authorization
 * - Session key revocation and cleanup
 * - Session analytics and monitoring
 */

import { supabase } from '@/infrastructure/database/client';

// Types matching backend interfaces
export interface SessionKeyRequest {
  ownerAddress: string;
  sessionDuration: number; // Duration in seconds
  permissions: SessionPermission[];
  validAfter?: number;
  validUntil?: number;
  metadata?: any;
}

export interface SessionPermission {
  target: string; // Contract address
  selector: string; // Function selector
  maxValue: string; // Maximum value allowed
  rules?: any; // Additional permission rules
}

export interface SessionKeyData {
  id: string;
  sessionKeyAddress: string;
  ownerAddress: string;
  isActive: boolean;
  expiresAt: Date;
  permissions: SessionPermission[];
  usageCount: number;
  maxUsage?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionValidationResult {
  isValid: boolean;
  reason?: string;
  remainingUsage?: number;
  expiresIn?: number;
}

/**
 * Frontend Session Key Service
 * Proxy to backend session key operations
 */
export class SessionKeyService {
  private static instance: SessionKeyService;

  static getInstance(): SessionKeyService {
    if (!SessionKeyService.instance) {
      SessionKeyService.instance = new SessionKeyService();
    }
    return SessionKeyService.instance;
  }

  /**
   * Create a new session key
   */
  async createSessionKey(request: SessionKeyRequest): Promise<SessionKeyData> {
    try {
      const response = await fetch('/api/session-keys/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Session Key API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create session key:', error);
      throw error;
    }
  }

  /**
   * Validate a session key for operation
   */
  async validateSession(sessionKeyAddress: string, operation: any): Promise<SessionValidationResult> {
    try {
      const response = await fetch('/api/session-keys/validate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ sessionKeyAddress, operation })
      });

      if (!response.ok) {
        throw new Error(`Session Key API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to validate session:', error);
      return { isValid: false, reason: 'Validation failed' };
    }
  }

  /**
   * Get session key data by address
   */
  async getSessionKey(sessionKeyAddress: string): Promise<SessionKeyData | null> {
    try {
      const response = await fetch(`/api/session-keys/${sessionKeyAddress}`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Session Key API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get session key:', error);
      return null;
    }
  }

  /**
   * Get all session keys for an owner
   */
  async getSessionKeysForOwner(ownerAddress: string): Promise<SessionKeyData[]> {
    try {
      const response = await fetch(`/api/session-keys/owner/${ownerAddress}`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Session Key API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get session keys for owner:', error);
      return [];
    }
  }

  /**
   * Revoke a session key
   */
  async revokeSessionKey(sessionKeyAddress: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/session-keys/${sessionKeyAddress}/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Session Key API error: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to revoke session key:', error);
      return false;
    }
  }

  /**
   * Clean up expired session keys
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const response = await fetch('/api/session-keys/cleanup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Session Key API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.cleanedCount || 0;
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  /**
   * Get authentication token for API requests
   */
  private async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  }
}

// Export singleton instance
export const sessionKeyService = SessionKeyService.getInstance();
