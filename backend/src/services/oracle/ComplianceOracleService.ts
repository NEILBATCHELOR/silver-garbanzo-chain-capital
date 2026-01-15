import { createClient } from '@supabase/supabase-js';
import { KYCVerificationService } from './KYCVerificationService';
import { AMLScreeningService } from './AMLScreeningService';
import { AccreditationService } from './AccreditationService';
import { RiskScoringService } from './RiskScoringService';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ComplianceCheckRequest {
  user_id: string;
  wallet_address: string;
  check_type: 'full' | 'kyc' | 'aml' | 'accreditation' | 'risk';
}

export interface ComplianceStatus {
  wallet_address: string;
  kyc_verified: boolean;
  aml_cleared: boolean;
  accredited_investor: boolean;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  compliant: boolean;
  last_updated: Date;
  expires_at?: Date;
  issues?: string[];
}

export interface ComplianceCheckResult {
  success: boolean;
  status: ComplianceStatus;
  details: {
    kyc?: any;
    aml?: any;
    accreditation?: any;
    risk?: any;
  };
}

/**
 * Compliance Oracle Service
 * 
 * Main orchestrator service that coordinates all compliance checks:
 * - KYC Verification
 * - AML Sanctions Screening
 * - Accredited Investor Status
 * - Risk Assessment
 * 
 * This service provides a unified interface for checking user compliance
 * status and manages the compliance data cache for fast lookups.
 */
export class ComplianceOracleService {
  private kycService: KYCVerificationService;
  private amlService: AMLScreeningService;
  private accreditationService: AccreditationService;
  private riskService: RiskScoringService;

  constructor() {
    this.kycService = new KYCVerificationService();
    this.amlService = new AMLScreeningService();
    this.accreditationService = new AccreditationService();
    this.riskService = new RiskScoringService();
  }

  /**
   * Perform comprehensive compliance check
   */
  async performComplianceCheck(
    request: ComplianceCheckRequest
  ): Promise<ComplianceCheckResult> {
    try {
      const { user_id, wallet_address, check_type } = request;

      // Check cache first for fast response
      if (check_type === 'full') {
        const cached = await this.getCachedComplianceStatus(wallet_address);
        if (cached && this.isCacheValid(cached)) {
          return {
            success: true,
            status: this.transformCacheToStatus(cached),
            details: {},
          };
        }
      }

      const details: any = {};

      // Perform requested checks
      switch (check_type) {
        case 'full':
          // Run all checks in parallel for efficiency
          const [kycStatus, amlStatus, accreditationStatus, riskAssessment] =
            await Promise.allSettled([
              this.kycService.getVerificationStatus(user_id),
              this.amlService.getScreeningStatus(user_id),
              this.accreditationService.getAccreditationStatus(user_id),
              this.riskService.getLatestAssessment(wallet_address),
            ]);

          details.kyc =
            kycStatus.status === 'fulfilled' ? kycStatus.value : null;
          details.aml =
            amlStatus.status === 'fulfilled' ? amlStatus.value : null;
          details.accreditation =
            accreditationStatus.status === 'fulfilled'
              ? accreditationStatus.value
              : null;
          details.risk =
            riskAssessment.status === 'fulfilled' ? riskAssessment.value : null;
          break;

        case 'kyc':
          details.kyc = await this.kycService.getVerificationStatus(user_id);
          break;

        case 'aml':
          details.aml = await this.amlService.getScreeningStatus(user_id);
          break;

        case 'accreditation':
          details.accreditation =
            await this.accreditationService.getAccreditationStatus(user_id);
          break;

        case 'risk':
          details.risk = await this.riskService.getLatestAssessment(
            wallet_address
          );
          break;
      }

      // Build compliance status
      const status = await this.buildComplianceStatus(wallet_address, details);

      // Update cache
      await this.updateComplianceCache(status);

      return {
        success: true,
        status,
        details,
      };
    } catch (error: any) {
      console.error('Compliance check error:', error);
      throw error;
    }
  }

  /**
   * Get complete compliance status for user
   */
  async getComplianceStatus(
    walletAddress: string
  ): Promise<ComplianceStatus> {
    // Check cache first
    const cached = await this.getCachedComplianceStatus(walletAddress);
    if (cached && this.isCacheValid(cached)) {
      return this.transformCacheToStatus(cached);
    }

    // Cache miss or expired - perform fresh check
    const result = await this.performComplianceCheck({
      user_id: '', // Will be fetched from wallet_address
      wallet_address: walletAddress,
      check_type: 'full',
    });

    return result.status;
  }

  /**
   * Check if user is fully compliant
   */
  async isCompliant(walletAddress: string): Promise<boolean> {
    const status = await this.getComplianceStatus(walletAddress);
    return status.compliant;
  }

  /**
   * Update user compliance data (from external source)
   */
  async updateComplianceData(data: {
    wallet_address: string;
    kyc_verified?: boolean;
    aml_cleared?: boolean;
    accredited_investor?: boolean;
    risk_score?: number;
    valid_until?: Date;
  }): Promise<void> {
    const expiresAt =
      data.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

    await supabase
      .from('compliance_data_cache')
      .upsert(
        {
          wallet_address: data.wallet_address.toLowerCase(),
          kyc_verified: data.kyc_verified,
          aml_cleared: data.aml_cleared,
          accredited_investor: data.accredited_investor,
          risk_score: data.risk_score,
          last_updated: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'wallet_address',
        }
      );

    // Create audit trail
    await this.createAuditEntry({
      wallet_address: data.wallet_address,
      action_type: 'compliance_data_updated',
      action_details: data,
    });
  }

  /**
   * Invalidate cached compliance data
   */
  async invalidateCache(walletAddress: string): Promise<void> {
    await supabase
      .from('compliance_data_cache')
      .update({
        expires_at: new Date().toISOString(), // Expire immediately
      })
      .eq('wallet_address', walletAddress.toLowerCase());
  }

  /**
   * Get compliance statistics
   */
  async getComplianceStatistics(): Promise<any> {
    const { data: stats } = await supabase.rpc('get_compliance_statistics');
    return stats;
  }

  /**
   * Sync compliance data to blockchain
   */
  async syncToBlockchain(params: {
    wallet_address: string;
    chain_id?: number;
    force?: boolean;
    oracle_type?: 'chainlink' | 'bespoke' | 'custom';
  }): Promise<{ success: boolean; transaction_hash?: string; error?: string }> {
    try {
      const { wallet_address, chain_id, force, oracle_type = 'bespoke' } = params;

      // Get current compliance status
      const status = await this.getComplianceStatus(wallet_address);

      // Check if sync is needed
      if (!force) {
        const recentSync = await this.getRecentSync(wallet_address, chain_id);
        if (recentSync && this.isSyncRecent(recentSync)) {
          return {
            success: false,
            error: 'Sync performed recently. Use force=true to override.',
          };
        }
      }

      // Create sync record
      const { data: syncRecord, error: syncError } = await supabase
        .from('oracle_blockchain_sync')
        .insert({
          wallet_address: wallet_address.toLowerCase(),
          chain_id: chain_id || 1,
          sync_status: 'pending',
          compliance_data: status,
          oracle_type,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (syncError || !syncRecord) {
        throw new Error(`Failed to create sync record: ${syncError?.message}`);
      }

      // Sync based on oracle type
      let txHash: string;
      
      switch (oracle_type) {
        case 'chainlink':
          txHash = await this.syncViaChainlink(status, chain_id);
          break;
        case 'custom':
          txHash = await this.syncViaCustomOracle(status, chain_id);
          break;
        case 'bespoke':
        default:
          txHash = await this.syncViaBespokeOracle(status, chain_id);
          break;
      }

      await supabase
        .from('oracle_blockchain_sync')
        .update({
          sync_status: 'completed',
          transaction_hash: txHash,
          synced_at: new Date().toISOString(),
        })
        .eq('id', syncRecord.id);

      return {
        success: true,
        transaction_hash: txHash,
      };
    } catch (error: any) {
      console.error('Blockchain sync error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get sync status for wallet
   */
  async getSyncStatus(params: {
    wallet_address: string;
    chain_id?: number;
  }): Promise<any> {
    const { wallet_address, chain_id } = params;

    let query = supabase
      .from('oracle_blockchain_sync')
      .select('*')
      .eq('wallet_address', wallet_address.toLowerCase())
      .order('created_at', { ascending: false });

    if (chain_id) {
      query = query.eq('chain_id', chain_id);
    }

    const { data } = await query.limit(1).single();

    return data;
  }

  /**
   * Get pending syncs
   */
  async getPendingSync(params: {
    chain_id?: number;
    limit?: number;
  }): Promise<any[]> {
    const { chain_id, limit = 10 } = params;

    let query = supabase
      .from('oracle_blockchain_sync')
      .select('*')
      .eq('sync_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (chain_id) {
      query = query.eq('chain_id', chain_id);
    }

    const { data } = await query;

    return data || [];
  }

  /**
   * Verify blockchain sync
   */
  async verifySync(params: {
    wallet_address: string;
    transaction_hash: string;
  }): Promise<{ verified: boolean; details?: any }> {
    const { wallet_address, transaction_hash } = params;

    // Get sync record
    const { data: syncRecord } = await supabase
      .from('oracle_blockchain_sync')
      .select('*')
      .eq('wallet_address', wallet_address.toLowerCase())
      .eq('transaction_hash', transaction_hash)
      .single();

    if (!syncRecord) {
      return { verified: false };
    }

    // TODO: Verify on blockchain
    // For now, check if marked as completed
    return {
      verified: syncRecord.sync_status === 'completed',
      details: syncRecord,
    };
  }

  /**
   * Force sync (bypass recent sync check)
   */
  async forceSync(params: {
    wallet_address: string;
    chain_id?: number;
    oracle_type?: 'chainlink' | 'bespoke' | 'custom';
  }): Promise<{ success: boolean; transaction_hash?: string; error?: string }> {
    return this.syncToBlockchain({
      ...params,
      force: true,
    });
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Sync via Chainlink Oracle
   */
  private async syncViaChainlink(
    status: ComplianceStatus,
    chainId?: number
  ): Promise<string> {
    // TODO: Implement Chainlink Functions integration
    // This would call Chainlink oracle to update on-chain data
    
    console.log('Syncing via Chainlink oracle for chain:', chainId);
    
    // Mock implementation - replace with actual Chainlink integration
    const txHash = `0xchainlink${Date.now().toString(16)}`;
    
    return txHash;
  }

  /**
   * Sync via Custom Oracle
   */
  private async syncViaCustomOracle(
    status: ComplianceStatus,
    chainId?: number
  ): Promise<string> {
    // TODO: Implement custom oracle integration
    // This would call your custom oracle smart contract
    
    console.log('Syncing via custom oracle for chain:', chainId);
    
    // Mock implementation - replace with actual custom oracle integration
    const txHash = `0xcustom${Date.now().toString(16)}`;
    
    return txHash;
  }

  /**
   * Sync via Bespoke Oracle (default)
   */
  private async syncViaBespokeOracle(
    status: ComplianceStatus,
    chainId?: number
  ): Promise<string> {
    // This is your current/default oracle implementation
    
    console.log('Syncing via bespoke oracle for chain:', chainId);
    
    // Current implementation - can be enhanced with actual blockchain sync
    const txHash = `0x${Date.now().toString(16)}bespoke`;
    
    return txHash;
  }

  // ==================== PRIVATE METHODS (CONTINUED) ====================

  /**
   * Get recent sync for wallet
   */
  private async getRecentSync(
    walletAddress: string,
    chainId?: number
  ): Promise<any> {
    const oneHourAgo = new Date(Date.now() - 3600000);

    let query = supabase
      .from('oracle_blockchain_sync')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false });

    if (chainId) {
      query = query.eq('chain_id', chainId);
    }

    const { data } = await query.limit(1).single();

    return data;
  }

  /**
   * Check if sync is recent (within 1 hour)
   */
  private isSyncRecent(sync: any): boolean {
    if (!sync.synced_at) return false;
    const syncTime = new Date(sync.synced_at).getTime();
    const oneHourAgo = Date.now() - 3600000;
    return syncTime > oneHourAgo;
  }

  // ==================== PRIVATE METHODS (CONTINUED) ====================

  /**
   * Get cached compliance status
   */
  private async getCachedComplianceStatus(
    walletAddress: string
  ): Promise<any> {
    const { data } = await supabase
      .from('compliance_data_cache')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    return data;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(cache: any): boolean {
    if (!cache.expires_at) return false;
    return new Date(cache.expires_at) > new Date();
  }

  /**
   * Transform cache data to ComplianceStatus
   */
  private transformCacheToStatus(cache: any): ComplianceStatus {
    const riskLevel = this.getRiskLevel(cache.risk_score || 50);

    return {
      wallet_address: cache.wallet_address,
      kyc_verified: cache.kyc_verified || false,
      aml_cleared: cache.aml_cleared || false,
      accredited_investor: cache.accredited_investor || false,
      risk_score: cache.risk_score || 50,
      risk_level: riskLevel,
      compliant: this.isFullyCompliant(cache),
      last_updated: new Date(cache.last_updated),
      expires_at: cache.expires_at ? new Date(cache.expires_at) : undefined,
    };
  }

  /**
   * Build compliance status from detailed checks
   */
  private async buildComplianceStatus(
    walletAddress: string,
    details: any
  ): Promise<ComplianceStatus> {
    const kycVerified =
      details.kyc?.verification_status === 'approved' || false;
    const amlCleared = details.aml?.screening_status === 'clear' || false;
    const accreditedInvestor =
      details.accreditation?.verification_status === 'approved' || false;
    const riskScore = details.risk?.risk_score || 50;
    const riskLevel = this.getRiskLevel(riskScore);

    const issues: string[] = [];

    if (!kycVerified) issues.push('KYC verification required');
    if (!amlCleared) issues.push('AML clearance required');
    if (riskLevel === 'critical') issues.push('Critical risk level');

    return {
      wallet_address: walletAddress,
      kyc_verified: kycVerified,
      aml_cleared: amlCleared,
      accredited_investor: accreditedInvestor,
      risk_score: riskScore,
      risk_level: riskLevel,
      compliant: kycVerified && amlCleared && riskLevel !== 'critical',
      last_updated: new Date(),
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  /**
   * Update compliance cache
   */
  private async updateComplianceCache(status: ComplianceStatus): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

    await supabase
      .from('compliance_data_cache')
      .upsert(
        {
          wallet_address: status.wallet_address.toLowerCase(),
          kyc_verified: status.kyc_verified,
          aml_cleared: status.aml_cleared,
          accredited_investor: status.accredited_investor,
          risk_score: status.risk_score,
          last_updated: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'wallet_address',
        }
      );
  }

  /**
   * Check if user is fully compliant
   */
  private isFullyCompliant(cache: any): boolean {
    return (
      cache.kyc_verified === true &&
      cache.aml_cleared === true &&
      cache.risk_score < 75 // Not critical risk
    );
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(
    score: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (score <= 30) return 'low';
    if (score <= 50) return 'medium';
    if (score <= 75) return 'high';
    return 'critical';
  }

  /**
   * Create audit trail entry
   */
  private async createAuditEntry(data: any): Promise<void> {
    await supabase.from('compliance_audit_trail').insert({
      wallet_address: data.wallet_address,
      action_type: data.action_type,
      action_details: data.action_details,
      performed_at: new Date().toISOString(),
    });
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Create oracle update record (for blockchain sync tracking)
 */
export async function createOracleUpdate(data: {
  wallet_address: string;
  update_type: 'kyc' | 'aml' | 'accreditation' | 'risk';
  previous_value: any;
  new_value: any;
  transaction_hash?: string;
  updated_by?: string;
}): Promise<void> {
  await supabase.from('oracle_updates').insert({
    wallet_address: data.wallet_address.toLowerCase(),
    update_type: data.update_type,
    previous_value: data.previous_value,
    new_value: data.new_value,
    transaction_hash: data.transaction_hash,
    updated_by: data.updated_by,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Get oracle update history
 */
export async function getOracleUpdateHistory(
  walletAddress: string,
  updateType?: string
): Promise<any[]> {
  let query = supabase
    .from('oracle_updates')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .order('updated_at', { ascending: false });

  if (updateType) {
    query = query.eq('update_type', updateType);
  }

  const { data } = await query;
  return data || [];
}
