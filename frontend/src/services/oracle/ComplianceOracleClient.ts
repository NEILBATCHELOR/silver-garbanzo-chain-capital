/**
 * ComplianceOracleClient.ts
 * Frontend client for querying compliance oracle data
 */

import { supabase } from '@/infrastructure/database/client';

export interface ComplianceData {
  kycVerified: boolean;
  amlCleared: boolean;
  accreditedInvestor: boolean;
  riskScore: number; // 0-100
  lastUpdated: Date;
  expiresAt: Date | null;
  blockchainTxHash?: string;
}

export interface OracleQueryResult {
  success: boolean;
  data?: ComplianceData;
  error?: string;
  cached: boolean;
  dataAge?: number; // milliseconds since last update
}

export class ComplianceOracleClient {
  private cacheEnabled: boolean;
  private cacheTTL: number; // milliseconds

  constructor(config: { cacheEnabled?: boolean; cacheTTL?: number } = {}) {
    this.cacheEnabled = config.cacheEnabled ?? true;
    this.cacheTTL = config.cacheTTL ?? 300000; // 5 minutes default
  }

  /**
   * Get compliance data for a wallet address
   */
  async getComplianceData(walletAddress: string): Promise<OracleQueryResult> {
    try {
      // Query cached compliance data
      const { data, error } = await supabase
        .from('compliance_data_cache')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found
          return {
            success: false,
            error: 'No compliance data found for this address',
            cached: false
          };
        }
        return {
          success: false,
          error: error.message,
          cached: false
        };
      }

      // Check if data is expired
      const now = new Date();
      const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
      const lastUpdated = new Date(data.last_updated);

      if (expiresAt && now > expiresAt) {
        return {
          success: false,
          error: 'Compliance data has expired',
          cached: true
        };
      }

      // Check cache freshness
      const dataAge = now.getTime() - lastUpdated.getTime();
      if (this.cacheEnabled && dataAge > this.cacheTTL) {
        // Data is stale but not expired - return with warning
        console.warn(`Compliance data is ${Math.round(dataAge / 1000)}s old`);
      }

      return {
        success: true,
        data: {
          kycVerified: data.kyc_verified,
          amlCleared: data.aml_cleared,
          accreditedInvestor: data.accredited_investor,
          riskScore: data.risk_score,
          lastUpdated,
          expiresAt,
          blockchainTxHash: data.blockchain_tx_hash
        },
        cached: true,
        dataAge
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        cached: false
      };
    }
  }

  /**
   * Check if user is KYC verified
   */
  async isKYCVerified(walletAddress: string): Promise<boolean> {
    const result = await this.getComplianceData(walletAddress);
    return result.success && result.data?.kycVerified === true;
  }

  /**
   * Check if user passed AML screening
   */
  async isAMLCleared(walletAddress: string): Promise<boolean> {
    const result = await this.getComplianceData(walletAddress);
    return result.success && result.data?.amlCleared === true;
  }

  /**
   * Check if user is accredited investor
   */
  async isAccreditedInvestor(walletAddress: string): Promise<boolean> {
    const result = await this.getComplianceData(walletAddress);
    return result.success && result.data?.accreditedInvestor === true;
  }

  /**
   * Get user's risk score
   */
  async getRiskScore(walletAddress: string): Promise<number> {
    const result = await this.getComplianceData(walletAddress);
    if (!result.success || !result.data) {
      return 100; // Maximum risk if no data
    }
    return result.data.riskScore;
  }

  /**
   * Request oracle update for a wallet address
   */
  async requestOracleUpdate(walletAddress: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Call backend API to trigger oracle update
      const response = await fetch('/api/oracle/request-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress,
          userId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to request oracle update'
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get oracle update history for a wallet
   */
  async getOracleHistory(walletAddress: string, limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('oracle_updates')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
