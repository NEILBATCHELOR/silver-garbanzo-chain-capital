import { createClient } from '@supabase/supabase-js';
import { 
  AMLProviderInterface, 
  AMLScreeningRequest,
  AMLScreeningResult,
  SanctionsMatch 
} from './providers/AMLProviderInterface';
import { InternalAMLProvider } from './providers/InternalAMLProvider';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AMLScreeningServiceRequest {
  user_id: string;
  wallet_address: string;
  name: string;
  date_of_birth?: string;
  nationality?: string;
  address?: string;
}

export interface AMLScreeningServiceResult {
  success: boolean;
  screening_id: string;
  status: 'clear' | 'flagged' | 'blocked';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  matches: SanctionsMatch[];
  screened_at: Date;
}

/**
 * AML Screening Service
 * 
 * Provides Anti-Money Laundering screening functionality:
 * - Screen users against international sanctions lists (OFAC, EU, UN, UK)
 * - Check PEP (Politically Exposed Persons) status
 * - Calculate geographic risk scores
 * - Perform periodic re-screening
 * - Monitor watchlist updates
 */
export class AMLScreeningService {
  private amlProvider: AMLProviderInterface;

  constructor(provider?: AMLProviderInterface) {
    this.amlProvider = provider || new InternalAMLProvider();
  }

  /**
   * Submit AML screening request
   * Alias for submitScreening for route compatibility
   */
  async performScreening(
    request: AMLScreeningServiceRequest
  ): Promise<AMLScreeningServiceResult> {
    return this.submitScreening(request);
  }

  /**
   * Submit AML screening request
   */
  async submitScreening(
    request: AMLScreeningServiceRequest
  ): Promise<AMLScreeningServiceResult> {
    try {
      // 1. Check if user has recent screening (within 7 days)
      const recentScreening = await this.getRecentScreening(
        request.wallet_address
      );

      if (recentScreening && this.isScreeningValid(recentScreening)) {
        return {
          success: true,
          screening_id: recentScreening.id,
          status: recentScreening.screening_status,
          risk_level: recentScreening.risk_level,
          matches: recentScreening.matches || [],
          screened_at: new Date(recentScreening.screened_at),
        };
      }

      // 2. Perform screening with AML provider
      const providerResult = await this.amlProvider.screenUser({
        user_id: request.user_id,
        name: request.name,
        date_of_birth: request.date_of_birth,
        nationality: request.nationality,
        address: request.address,
        wallet_address: request.wallet_address,
        screening_type: 'individual',
      });

      // 3. Create screening record in database
      const { data: screening, error: screeningError } = await supabase
        .from('aml_screenings')
        .insert({
          user_id: request.user_id,
          wallet_address: request.wallet_address.toLowerCase(),
          screening_status: providerResult.status,
          risk_level: providerResult.risk_level,
          geographic_risk_score: providerResult.geographic_risk_score,
          screening_reference: providerResult.screening_reference,
          screened_at: new Date().toISOString(),
          next_screening_date: this.calculateNextScreeningDate(),
          lists_checked: providerResult.lists_checked,
          pep_match: providerResult.pep_match || false,
          screening_provider: this.amlProvider.getProviderName(),
        })
        .select()
        .single();

      if (screeningError || !screening) {
        throw new Error(
          `Failed to create screening: ${screeningError?.message}`
        );
      }

      // 4. Store sanctions matches
      if (providerResult.matches && providerResult.matches.length > 0) {
        await this.storeSanctionsMatches(screening.id, providerResult.matches);
      }

      // 5. Update compliance cache
      await this.updateComplianceCache(
        request.wallet_address,
        providerResult.status === 'clear',
        providerResult.risk_level
      );

      // 6. Create audit trail
      await this.createAuditEntry({
        user_id: request.user_id,
        wallet_address: request.wallet_address,
        action_type: 'aml_screening',
        action_details: {
          screening_id: screening.id,
          status: providerResult.status,
          risk_level: providerResult.risk_level,
          matches_found: providerResult.matches.length,
          provider: this.amlProvider.getProviderName(),
        },
      });

      // 7. If flagged or blocked, require manual review
      if (providerResult.status === 'flagged' || providerResult.status === 'blocked') {
        await this.flagForManualReview(screening.id, providerResult);
      }

      return {
        success: true,
        screening_id: screening.id,
        status: providerResult.status,
        risk_level: providerResult.risk_level,
        matches: providerResult.matches,
        screened_at: new Date(),
      };
    } catch (error: any) {
      console.error('AML screening error:', error);
      throw error;
    }
  }

  /**
   * Get screening status for user
   */
  async getScreeningStatus(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('aml_screenings')
      .select(
        `
        *,
        matches:sanctions_matches(*)
      `
      )
      .eq('user_id', userId)
      .order('screened_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  }

  /**
   * Check if user is AML cleared
   */
  async isCleared(walletAddress: string): Promise<boolean> {
    const { data } = await supabase
      .from('aml_screenings')
      .select('screening_status, screened_at, next_screening_date')
      .eq('wallet_address', walletAddress.toLowerCase())
      .order('screened_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) return false;

    // Check if status is clear
    if (data.screening_status !== 'clear') return false;

    // Check if screening is still valid
    if (data.next_screening_date) {
      const nextScreening = new Date(data.next_screening_date);
      if (nextScreening < new Date()) {
        // Screening expired, needs re-screening
        return false;
      }
    }

    return true;
  }

  /**
   * Perform re-screening (periodic check)
   */
  async rescreen(userId: string): Promise<AMLScreeningServiceResult> {
    // Get previous screening
    const previousScreening = await this.getScreeningStatus(userId);
    if (!previousScreening) {
      throw new Error('No previous screening found');
    }

    // Get user details
    const { data: user } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) {
      throw new Error('User not found');
    }

    // Perform new screening
    return this.submitScreening({
      user_id: userId,
      wallet_address: previousScreening.wallet_address,
      name: user.full_name || '',
      date_of_birth: user.date_of_birth,
      nationality: user.nationality,
      address: user.address,
    });
  }

  /**
   * Check for watchlist updates
   */
  async checkWatchlistUpdates(screeningReference: string): Promise<boolean> {
    try {
      return await this.amlProvider.checkForWatchlistUpdates(screeningReference);
    } catch (error) {
      console.error('Watchlist update check error:', error);
      return false;
    }
  }

  /**
   * Calculate geographic risk
   */
  calculateGeographicRisk(nationality: string): number {
    return this.amlProvider.calculateGeographicRisk(nationality);
  }

  /**
   * Get sanctions matches for a screening
   */
  async getSanctionsMatches(screeningId: string): Promise<SanctionsMatch[]> {
    const { data, error } = await supabase
      .from('sanctions_matches')
      .select('*')
      .eq('screening_id', screeningId)
      .order('match_score', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Review and update a sanctions match
   */
  async reviewMatch(params: {
    match_id: string;
    reviewer_id: string;
    review_decision: 'false_positive' | 'true_positive' | 'needs_investigation';
    review_notes?: string;
  }): Promise<void> {
    const { match_id, reviewer_id, review_decision, review_notes } = params;

    // Get the match and associated screening
    const { data: match, error: matchError } = await supabase
      .from('sanctions_matches')
      .select('*, screening:aml_screenings(*)')
      .eq('id', match_id)
      .single();

    if (matchError || !match) {
      throw new Error('Match not found');
    }

    // Update match with review
    await supabase
      .from('sanctions_matches')
      .update({
        review_status: review_decision,
        reviewed_by: reviewer_id,
        review_notes: review_notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', match_id);

    // If all matches reviewed and cleared, update screening status
    if (review_decision === 'false_positive') {
      const { data: remainingMatches } = await supabase
        .from('sanctions_matches')
        .select('id')
        .eq('screening_id', match.screening_id)
        .or('review_status.is.null,review_status.neq.false_positive');

      if (!remainingMatches || remainingMatches.length === 0) {
        // All matches cleared - update screening to clear
        await supabase
          .from('aml_screenings')
          .update({
            screening_status: 'clear',
            requires_manual_review: false,
          })
          .eq('id', match.screening_id);

        // Update compliance cache
        if (match.screening) {
          await this.updateComplianceCache(
            match.screening.wallet_address,
            true,
            'low'
          );
        }
      }
    }

    // Create audit trail
    await this.createAuditEntry({
      user_id: match.screening?.user_id || '',
      wallet_address: match.screening?.wallet_address || '',
      action_type: 'sanctions_match_reviewed',
      action_details: {
        match_id,
        review_decision,
        reviewer_id,
        review_notes,
      },
    });
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Get recent screening for user (within 7 days)
   */
  private async getRecentScreening(walletAddress: string): Promise<any> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data } = await supabase
      .from('aml_screenings')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .gte('screened_at', sevenDaysAgo.toISOString())
      .order('screened_at', { ascending: false })
      .limit(1)
      .single();

    return data;
  }

  /**
   * Check if screening is still valid
   */
  private isScreeningValid(screening: any): boolean {
    if (!screening.next_screening_date) return true;
    const nextScreening = new Date(screening.next_screening_date);
    return nextScreening > new Date();
  }

  /**
   * Store sanctions matches in database
   */
  private async storeSanctionsMatches(
    screeningId: string,
    matches: SanctionsMatch[]
  ): Promise<void> {
    const matchRecords = matches.map((match) => ({
      screening_id: screeningId,
      list_name: match.list_name,
      entity_name: match.entity_name,
      match_score: match.match_score,
      match_type: match.match_type,
      entity_type: match.entity_type,
      entity_details: match.entity_details,
    }));

    const { error } = await supabase
      .from('sanctions_matches')
      .insert(matchRecords);

    if (error) {
      console.error('Failed to store sanctions matches:', error);
      throw error;
    }
  }

  /**
   * Update compliance data cache
   */
  private async updateComplianceCache(
    walletAddress: string,
    amlCleared: boolean,
    riskLevel: string
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // AML valid for 7 days

    // Map risk level to risk score
    const riskScoreMap: Record<string, number> = {
      low: 10,
      medium: 40,
      high: 70,
      critical: 95,
    };

    await supabase
      .from('compliance_data_cache')
      .upsert(
        {
          wallet_address: walletAddress.toLowerCase(),
          aml_cleared: amlCleared,
          risk_score: riskScoreMap[riskLevel] || 50,
          last_updated: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'wallet_address',
        }
      );
  }

  /**
   * Calculate next screening date (7 days from now)
   */
  private calculateNextScreeningDate(): string {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7);
    return nextDate.toISOString();
  }

  /**
   * Flag screening for manual review
   */
  private async flagForManualReview(
    screeningId: string,
    result: AMLScreeningResult
  ): Promise<void> {
    await supabase.from('aml_screenings').update({
      requires_manual_review: true,
      review_notes: `Flagged: ${result.status} | Risk: ${result.risk_level} | Matches: ${result.matches.length}`,
    }).eq('id', screeningId);
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
