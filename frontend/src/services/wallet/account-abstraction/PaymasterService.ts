/**
 * Frontend PaymasterService - EIP-4337 Gas Sponsorship Integration
 * 
 * Provides frontend interface to backend paymaster operations:
 * - Gas sponsorship and subsidy management  
 * - Paymaster configuration retrieval
 * - User operation sponsorship verification
 * - Sponsorship analytics and tracking
 */

import { supabase } from '@/infrastructure/database/client';

// Types matching backend interfaces
export interface PaymasterConfiguration {
  id: string;
  paymasterName: string;
  paymasterAddress: string;
  entryPointAddress: string;
  chainId: number;
  sponsorshipType: 'full' | 'partial' | 'conditional';
  isActive: boolean;
  maxSponsorshipAmount: string;
  balanceThreshold: string;
  sponsorshipRules: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface SponsorshipRequest {
  userOperation: any;
  chainId: number;
  entryPoint: string;
  sponsor: string;
  validUntil?: number;
  validAfter?: number;
}

export interface SponsorshipResponse {
  paymasterAndData: string;
  preVerificationGas: string;
  verificationGasLimit: string;
  callGasLimit: string;
  sponsored: boolean;
  sponsorshipId?: string;
}

/**
 * Frontend Paymaster Service
 * Proxy to backend paymaster operations
 */
export class PaymasterService {
  private static instance: PaymasterService;

  static getInstance(): PaymasterService {
    if (!PaymasterService.instance) {
      PaymasterService.instance = new PaymasterService();
    }
    return PaymasterService.instance;
  }

  /**
   * Request gas sponsorship for a user operation
   */
  async sponsorUserOperation(request: SponsorshipRequest): Promise<SponsorshipResponse> {
    try {
      // Call backend API endpoint
      const response = await fetch('/api/paymaster/sponsor', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Paymaster API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to sponsor user operation:', error);
      throw error;
    }
  }

  /**
   * Get paymaster configuration for a specific chain
   */
  async getPaymasterData(chainId: number): Promise<PaymasterConfiguration | null> {
    try {
      const response = await fetch(`/api/paymaster/data/${chainId}`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Paymaster API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get paymaster data:', error);
      return null;
    }
  }

  /**
   * Check if user operation is eligible for sponsorship
   */
  async checkSponsorship(userOperation: any, chainId: number): Promise<boolean> {
    try {
      const response = await fetch('/api/paymaster/check-eligibility', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ userOperation, chainId })
      });

      if (!response.ok) {
        throw new Error(`Paymaster API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.eligible || false;
    } catch (error) {
      console.error('Failed to check sponsorship eligibility:', error);
      return false;
    }
  }

  /**
   * Get sponsorship analytics
   */
  async getSponsorshipAnalytics(chainId?: number): Promise<any> {
    try {
      const url = chainId ? `/api/paymaster/analytics?chainId=${chainId}` : '/api/paymaster/analytics';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Paymaster API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get sponsorship analytics:', error);
      return null;
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
export const paymasterService = PaymasterService.getInstance();
