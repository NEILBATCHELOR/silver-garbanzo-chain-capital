import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface RiskAssessmentRequest {
  user_id: string;
  wallet_address: string;
  assessment_type: 'initial' | 'periodic' | 'event_triggered';
  trigger_event?: string;
}

export interface RiskScoreBreakdown {
  account_age_risk: number;        // 0-20 points
  transaction_history_risk: number; // 0-20 points
  geographic_risk: number;          // 0-20 points
  compliance_history_risk: number;  // 0-20 points
  behavioral_risk: number;          // 0-20 points
  total_score: number;              // 0-100 points
}

export interface RiskAssessmentResult {
  success: boolean;
  assessment_id: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  breakdown: RiskScoreBreakdown;
  assessed_at: Date;
  next_assessment_date: Date;
  red_flags?: string[];
}

/**
 * Risk Scoring Service
 * 
 * Calculates comprehensive risk scores for users based on multiple factors:
 * 
 * Risk Factors (0-100 scale):
 * - Account Age (0-20): Newer accounts = higher risk
 * - Transaction History (0-20): Suspicious patterns = higher risk
 * - Geographic Location (0-20): High-risk jurisdictions = higher risk
 * - Compliance History (0-20): Violations = higher risk
 * - Behavioral Patterns (0-20): Anomalies = higher risk
 * 
 * Risk Levels:
 * - Low: 0-30 (Normal operations)
 * - Medium: 31-50 (Enhanced monitoring)
 * - High: 51-75 (Restricted operations)
 * - Critical: 76-100 (Operations blocked)
 */
export class RiskScoringService {
  // Risk thresholds
  private readonly LOW_RISK_THRESHOLD = 30;
  private readonly MEDIUM_RISK_THRESHOLD = 50;
  private readonly HIGH_RISK_THRESHOLD = 75;

  // Risk scoring weights
  private readonly WEIGHTS = {
    accountAge: 20,
    transactionHistory: 20,
    geographic: 20,
    complianceHistory: 20,
    behavioral: 20,
  };

  /**
   * Perform risk assessment
   */
  async assessRisk(
    request: RiskAssessmentRequest
  ): Promise<RiskAssessmentResult> {
    try {
      // 1. Calculate risk score breakdown
      const breakdown = await this.calculateRiskScore(
        request.user_id,
        request.wallet_address
      );

      // 2. Determine risk level
      const riskLevel = this.determineRiskLevel(breakdown.total_score);

      // 3. Identify red flags
      const redFlags = this.identifyRedFlags(breakdown);

      // 4. Create risk assessment record
      const { data: assessment, error: assessmentError } = await supabase
        .from('risk_assessments')
        .insert({
          user_id: request.user_id,
          wallet_address: request.wallet_address.toLowerCase(),
          risk_score: breakdown.total_score,
          risk_level: riskLevel,
          assessment_type: request.assessment_type,
          trigger_event: request.trigger_event,
          score_breakdown: breakdown,
          red_flags: redFlags,
          assessed_at: new Date().toISOString(),
          next_assessment_date: this.calculateNextAssessmentDate(riskLevel),
        })
        .select()
        .single();

      if (assessmentError || !assessment) {
        throw new Error(
          `Failed to create risk assessment: ${assessmentError?.message}`
        );
      }

      // 5. Update compliance cache
      await this.updateComplianceCache(
        request.wallet_address,
        breakdown.total_score
      );

      // 6. Create audit trail
      await this.createAuditEntry({
        user_id: request.user_id,
        wallet_address: request.wallet_address,
        action_type: 'risk_assessment',
        action_details: {
          assessment_id: assessment.id,
          risk_score: breakdown.total_score,
          risk_level: riskLevel,
          assessment_type: request.assessment_type,
          red_flags: redFlags,
        },
      });

      // 7. Alert if critical risk
      if (riskLevel === 'critical') {
        await this.triggerCriticalRiskAlert(assessment.id, breakdown);
      }

      return {
        success: true,
        assessment_id: assessment.id,
        risk_score: breakdown.total_score,
        risk_level: riskLevel,
        breakdown,
        assessed_at: new Date(),
        next_assessment_date: new Date(assessment.next_assessment_date),
        red_flags: redFlags.length > 0 ? redFlags : undefined,
      };
    } catch (error: any) {
      console.error('Risk assessment error:', error);
      throw error;
    }
  }

  /**
   * Get latest risk assessment for user
   */
  async getLatestAssessment(walletAddress: string): Promise<any> {
    const { data, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .order('assessed_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  /**
   * Get risk score for user
   */
  async getRiskScore(walletAddress: string): Promise<number> {
    const assessment = await this.getLatestAssessment(walletAddress);
    return assessment?.risk_score || 50; // Default to medium risk
  }

  /**
   * Get assessment history for user
   */
  async getAssessmentHistory(
    walletAddress: string,
    limit: number = 10
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .order('assessed_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Get risk factors breakdown for user
   */
  async getRiskFactors(walletAddress: string): Promise<RiskScoreBreakdown | null> {
    const assessment = await this.getLatestAssessment(walletAddress);
    if (!assessment || !assessment.score_breakdown) {
      return null;
    }

    return assessment.score_breakdown as RiskScoreBreakdown;
  }

  /**
   * Recalculate risk for user
   */
  async recalculateRisk(walletAddress: string): Promise<RiskAssessmentResult> {
    // Get user_id from wallet_address
    const { data: user } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (!user) {
      throw new Error('User not found for wallet address');
    }

    // Perform fresh risk assessment
    return this.assessRisk({
      user_id: user.id,
      wallet_address: walletAddress,
      assessment_type: 'periodic',
      trigger_event: 'manual_recalculation',
    });
  }

  // ==================== RISK CALCULATION METHODS ====================

  /**
   * Calculate comprehensive risk score
   */
  private async calculateRiskScore(
    userId: string,
    walletAddress: string
  ): Promise<RiskScoreBreakdown> {
    const [
      accountAgeRisk,
      transactionHistoryRisk,
      geographicRisk,
      complianceHistoryRisk,
      behavioralRisk,
    ] = await Promise.all([
      this.calculateAccountAgeRisk(userId),
      this.calculateTransactionHistoryRisk(walletAddress),
      this.calculateGeographicRisk(userId),
      this.calculateComplianceHistoryRisk(userId),
      this.calculateBehavioralRisk(walletAddress),
    ]);

    const totalScore = Math.min(
      100,
      accountAgeRisk +
        transactionHistoryRisk +
        geographicRisk +
        complianceHistoryRisk +
        behavioralRisk
    );

    return {
      account_age_risk: accountAgeRisk,
      transaction_history_risk: transactionHistoryRisk,
      geographic_risk: geographicRisk,
      compliance_history_risk: complianceHistoryRisk,
      behavioral_risk: behavioralRisk,
      total_score: totalScore,
    };
  }

  /**
   * Calculate account age risk (0-20)
   * Newer accounts = higher risk
   */
  private async calculateAccountAgeRisk(userId: string): Promise<number> {
    const { data: user } = await supabase
      .from('user_profiles')
      .select('created_at')
      .eq('id', userId)
      .single();

    if (!user?.created_at) return 20; // Max risk if no data

    const accountAgeInDays = Math.floor(
      (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Risk decreases with account age
    if (accountAgeInDays < 7) return 20;      // < 1 week = max risk
    if (accountAgeInDays < 30) return 15;     // < 1 month = high risk
    if (accountAgeInDays < 90) return 10;     // < 3 months = medium risk
    if (accountAgeInDays < 180) return 5;     // < 6 months = low risk
    return 0;                                  // > 6 months = no risk
  }

  /**
   * Calculate transaction history risk (0-20)
   * Suspicious patterns = higher risk
   */
  private async calculateTransactionHistoryRisk(
    walletAddress: string
  ): Promise<number> {
    // Get transaction count
    const { count: txCount } = await supabase
      .from('token_operations')
      .select('*', { count: 'exact', head: true })
      .eq('from_address', walletAddress.toLowerCase());

    // No transactions = high risk
    if (!txCount || txCount === 0) return 20;

    // Get recent transactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentTxs } = await supabase
      .from('token_operations')
      .select('operation_type, amount, created_at')
      .eq('from_address', walletAddress.toLowerCase())
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!recentTxs || recentTxs.length === 0) {
      return txCount < 10 ? 15 : 10; // Few historical transactions
    }

    let risk = 0;

    // Check for suspicious patterns
    // 1. High frequency (> 10 tx per day)
    const txFrequency = recentTxs.length / 30;
    if (txFrequency > 10) risk += 5;

    // 2. Large amounts (need to check averages)
    const amounts = recentTxs.map(tx => parseFloat(tx.amount || '0'));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    if (avgAmount > 100000) risk += 5; // Large average transaction

    // 3. Failed transactions (would need status field)
    // Placeholder for future implementation

    return Math.min(20, risk);
  }

  /**
   * Calculate geographic risk (0-20)
   * High-risk jurisdictions = higher risk
   */
  private async calculateGeographicRisk(userId: string): Promise<number> {
    const { data: user } = await supabase
      .from('user_profiles')
      .select('nationality')
      .eq('id', userId)
      .single();

    if (!user?.nationality) return 10; // Unknown = medium risk

    // High-risk countries per FATF (Financial Action Task Force)
    const highRiskCountries = [
      'KP', // North Korea
      'IR', // Iran
      'MM', // Myanmar
      'SY', // Syria
    ];

    // Medium-risk countries
    const mediumRiskCountries = [
      'AF', // Afghanistan
      'IQ', // Iraq
      'LY', // Libya
      'SO', // Somalia
      'YE', // Yemen
    ];

    if (highRiskCountries.includes(user.nationality.toUpperCase())) {
      return 20;
    }

    if (mediumRiskCountries.includes(user.nationality.toUpperCase())) {
      return 10;
    }

    return 0; // Low-risk country
  }

  /**
   * Calculate compliance history risk (0-20)
   * Previous violations = higher risk
   */
  private async calculateComplianceHistoryRisk(userId: string): Promise<number> {
    // Check KYC status
    const { data: kyc } = await supabase
      .from('kyc_verifications')
      .select('verification_status')
      .eq('user_id', userId)
      .single();

    let risk = 0;

    // No KYC or rejected KYC
    if (!kyc || kyc.verification_status === 'rejected') {
      risk += 10;
    }

    // Check AML screenings
    const { data: aml } = await supabase
      .from('aml_screenings')
      .select('screening_status')
      .eq('user_id', userId)
      .order('screened_at', { ascending: false })
      .limit(1)
      .single();

    // Flagged or blocked in AML
    if (aml?.screening_status === 'flagged') {
      risk += 5;
    } else if (aml?.screening_status === 'blocked') {
      risk += 10;
    }

    return Math.min(20, risk);
  }

  /**
   * Calculate behavioral risk (0-20)
   * Anomalous behavior = higher risk
   */
  private async calculateBehavioralRisk(
    walletAddress: string
  ): Promise<number> {
    let risk = 0;

    // Check for rapid succession transactions (velocity)
    const { data: recentTxs } = await supabase
      .from('token_operations')
      .select('created_at')
      .eq('from_address', walletAddress.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentTxs && recentTxs.length >= 5) {
      // Check if 5+ transactions within 1 hour
      const timestamps = recentTxs.map(tx => new Date(tx.created_at).getTime());
      const oneHourAgo = Date.now() - 3600000;
      const recentCount = timestamps.filter(ts => ts > oneHourAgo).length;

      if (recentCount >= 5) {
        risk += 10; // High velocity
      }
    }

    // Check for unusual patterns (e.g., always transacting at odd hours)
    // Placeholder for more sophisticated behavioral analysis

    return Math.min(20, risk);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(
    score: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (score <= this.LOW_RISK_THRESHOLD) return 'low';
    if (score <= this.MEDIUM_RISK_THRESHOLD) return 'medium';
    if (score <= this.HIGH_RISK_THRESHOLD) return 'high';
    return 'critical';
  }

  /**
   * Identify red flags from risk breakdown
   */
  private identifyRedFlags(breakdown: RiskScoreBreakdown): string[] {
    const redFlags: string[] = [];

    if (breakdown.account_age_risk >= 15) {
      redFlags.push('New account (< 30 days)');
    }

    if (breakdown.transaction_history_risk >= 15) {
      redFlags.push('Suspicious transaction patterns');
    }

    if (breakdown.geographic_risk >= 15) {
      redFlags.push('High-risk jurisdiction');
    }

    if (breakdown.compliance_history_risk >= 15) {
      redFlags.push('Compliance issues detected');
    }

    if (breakdown.behavioral_risk >= 15) {
      redFlags.push('Unusual behavioral patterns');
    }

    return redFlags;
  }

  /**
   * Calculate next assessment date based on risk level
   */
  private calculateNextAssessmentDate(
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  ): string {
    const nextDate = new Date();

    switch (riskLevel) {
      case 'low':
        nextDate.setDate(nextDate.getDate() + 90); // 3 months
        break;
      case 'medium':
        nextDate.setDate(nextDate.getDate() + 30); // 1 month
        break;
      case 'high':
        nextDate.setDate(nextDate.getDate() + 7);  // 1 week
        break;
      case 'critical':
        nextDate.setDate(nextDate.getDate() + 1);  // 1 day
        break;
    }

    return nextDate.toISOString();
  }

  /**
   * Update compliance cache with risk score
   */
  private async updateComplianceCache(
    walletAddress: string,
    riskScore: number
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

    await supabase
      .from('compliance_data_cache')
      .upsert(
        {
          wallet_address: walletAddress.toLowerCase(),
          risk_score: riskScore,
          last_updated: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'wallet_address',
        }
      );
  }

  /**
   * Trigger critical risk alert
   */
  private async triggerCriticalRiskAlert(
    assessmentId: string,
    breakdown: RiskScoreBreakdown
  ): Promise<void> {
    // Log critical risk event
    console.error('CRITICAL RISK ALERT:', {
      assessment_id: assessmentId,
      total_score: breakdown.total_score,
      breakdown,
    });

    // In production, would:
    // - Send email/SMS alerts to compliance team
    // - Create ticket in compliance system
    // - Automatically restrict user operations
    // - Trigger manual review workflow
  }

  /**
   * Create audit trail entry
   */
  private async createAuditEntry(data: any): Promise<void> {
    await supabase.from('compliance_audit_trail').insert({
      user_id: data.user_id,
      wallet_address: data.wallet_address,
      action_type: data.action_type,
      action_details: data.action_details,
      performed_at: new Date().toISOString(),
    });
  }
}
