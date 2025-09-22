/**
 * Frontend UserOperationService - EIP-4337 User Operation Management Integration
 * 
 * Provides frontend interface to backend user operation building:
 * - User operation construction and validation
 * - Gas estimation and optimization
 * - User operation submission and tracking
 * - Batch operation support
 */

import { supabase } from '@/infrastructure/database/client';

// Types matching backend interfaces
export interface UserOperationRequest {
  sender: string;
  target: string;
  data: string;
  value?: string;
  chainId: number;
  entryPoint: string;
  sessionKey?: string;
}

export interface UserOperationData {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

export interface UserOperationResponse {
  userOpHash: string;
  userOperation: UserOperationData;
  entryPoint: string;
  chainId: number;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
}

export interface GasEstimation {
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  totalGasCost: string;
}

export interface BatchOperationRequest {
  operations: UserOperationRequest[];
  chainId: number;
  entryPoint: string;
  batchType: 'sequential' | 'parallel';
}

/**
 * Frontend User Operation Service
 * Proxy to backend user operation operations
 */
export class UserOperationService {
  private static instance: UserOperationService;

  static getInstance(): UserOperationService {
    if (!UserOperationService.instance) {
      UserOperationService.instance = new UserOperationService();
    }
    return UserOperationService.instance;
  }

  /**
   * Build a user operation from request parameters
   */
  async buildUserOperation(request: UserOperationRequest): Promise<UserOperationData> {
    try {
      const response = await fetch('/api/user-operations/build', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`User Operation API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to build user operation:', error);
      throw error;
    }
  }

  /**
   * Estimate gas for a user operation
   */
  async estimateGas(request: UserOperationRequest): Promise<GasEstimation> {
    try {
      const response = await fetch('/api/user-operations/estimate-gas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`User Operation API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      throw error;
    }
  }

  /**
   * Submit a user operation to the bundler
   */
  async submitUserOperation(userOperation: UserOperationData, entryPoint: string, chainId: number): Promise<UserOperationResponse> {
    try {
      const response = await fetch('/api/user-operations/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ userOperation, entryPoint, chainId })
      });

      if (!response.ok) {
        throw new Error(`User Operation API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to submit user operation:', error);
      throw error;
    }
  }

  /**
   * Get user operation status by hash
   */
  async getUserOperationStatus(userOpHash: string): Promise<UserOperationResponse | null> {
    try {
      const response = await fetch(`/api/user-operations/${userOpHash}`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`User Operation API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get user operation status:', error);
      return null;
    }
  }

  /**
   * Get user operations for a specific sender
   */
  async getUserOperations(sender: string, limit?: number, offset?: number): Promise<UserOperationResponse[]> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      const response = await fetch(`/api/user-operations/sender/${sender}?${params}`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`User Operation API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get user operations:', error);
      return [];
    }
  }

  /**
   * Submit batch operations
   */
  async submitBatchOperations(batchRequest: BatchOperationRequest): Promise<UserOperationResponse[]> {
    try {
      const response = await fetch('/api/user-operations/batch', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(batchRequest)
      });

      if (!response.ok) {
        throw new Error(`User Operation API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to submit batch operations:', error);
      throw error;
    }
  }

  /**
   * Validate user operation before submission
   */
  async validateUserOperation(userOperation: UserOperationData, entryPoint: string, chainId: number): Promise<{ isValid: boolean; errors?: string[] }> {
    try {
      const response = await fetch('/api/user-operations/validate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ userOperation, entryPoint, chainId })
      });

      if (!response.ok) {
        throw new Error(`User Operation API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to validate user operation:', error);
      return { isValid: false, errors: ['Validation failed'] };
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
export const userOperationService = UserOperationService.getInstance();
