/**
 * Enhanced Eligibility Service - Implements Three Core Redemption Principles
 * 
 * Principle 1: Redemptions can only occur when redemptions are "open"
 * Principle 2: Redemptions can be opened after specified date OR in windows OR date ranges
 * Principle 3: Redemptions may be limited to percentage of amount distributed
 */

import { supabase } from '@/infrastructure/database/client';

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
  maxAmount?: number;
  windowId?: string;
  distributionIds?: string[];
  validationDetails?: Record<string, any>;
}

export interface RedemptionRequest {
  investor_id: string;
  project_id: string;
  token_amount: number;
  product_type?: string;
  product_id?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  maxAmount?: number;
  checkId?: string;
}

export interface RedemptionRules {
  id: string;
  project_id: string;
  product_type?: string;
  product_id?: string;
  is_redemption_open: boolean;
  open_after_date?: string;
  allow_continuous_redemption: boolean;
  max_redemption_percentage?: number;
  lock_up_period?: number;
  redemption_type: string;
}

export interface RedemptionWindow {
  id: string;
  config_id: string;
  project_id: string;
  start_date: string;
  end_date: string;
  submission_start_date: string;
  submission_end_date: string;
  status: string;
  max_redemption_amount?: number;
}

export interface Distribution {
  id: string;
  investor_id: string;
  project_id: string;
  token_amount: number;
  remaining_amount: number;
  redemption_percentage_used: number;
  fully_redeemed: boolean;
  distribution_date: string;
}

export class EnhancedEligibilityService {
  /**
   * PRINCIPLE 1: Check if redemptions are open
   * Validates that redemptions are globally enabled for the project/product
   */
  async isRedemptionOpen(
    projectId: string, 
    productType?: string, 
    productId?: string
  ): Promise<{ open: boolean; reason: string; rules?: RedemptionRules }> {
    try {
      let query = supabase
        .from('redemption_rules')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_redemption_open', true);

      if (productType) {
        query = query.eq('product_type', productType);
      }
      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data: rules, error } = await query.order('created_at', { ascending: false }).limit(1);

      if (error) {
        throw new Error(`Failed to check redemption rules: ${error.message}`);
      }

      if (!rules || rules.length === 0) {
        return {
          open: false,
          reason: 'No redemption rules found or redemptions are closed for this project/product'
        };
      }

      return {
        open: true,
        reason: 'Redemptions are open',
        rules: rules[0]
      };
    } catch (error) {
      console.error('Error checking redemption status:', error);
      return {
        open: false,
        reason: `Error checking redemption status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * PRINCIPLE 2: Check date/window eligibility
   * Validates opening dates, date ranges, and active redemption windows
   */
  async checkDateEligibility(
    projectId: string,
    rules: RedemptionRules
  ): Promise<{ eligible: boolean; reason: string; windowId?: string }> {
    try {
      const now = new Date();

      // Check if redemption period has opened (open_after_date)
      if (rules.open_after_date) {
        const openDate = new Date(rules.open_after_date);
        if (now < openDate) {
          return {
            eligible: false,
            reason: `Redemption period opens on ${openDate.toLocaleString()}`
          };
        }
      }

      // If continuous redemption is allowed, date eligibility is satisfied
      if (rules.allow_continuous_redemption) {
        return {
          eligible: true,
          reason: 'Continuous redemption is enabled'
        };
      }

      // Check for active redemption windows
      const { data: activeWindows, error } = await supabase
        .from('redemption_windows')
        .select(`
          *,
          redemption_window_configs!inner(project_id, active)
        `)
        .eq('redemption_window_configs.project_id', projectId)
        .eq('redemption_window_configs.active', true)
        .eq('status', 'active')
        .lte('submission_start_date', now.toISOString())
        .gte('submission_end_date', now.toISOString())
        .order('end_date', { ascending: true });

      if (error) {
        throw new Error(`Failed to check redemption windows: ${error.message}`);
      }

      if (!activeWindows || activeWindows.length === 0) {
        return {
          eligible: false,
          reason: 'No active redemption window available'
        };
      }

      return {
        eligible: true,
        reason: `Active redemption window until ${new Date(activeWindows[0].submission_end_date).toLocaleString()}`,
        windowId: activeWindows[0].id
      };
    } catch (error) {
      console.error('Error checking date eligibility:', error);
      return {
        eligible: false,
        reason: `Error checking date eligibility: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * PRINCIPLE 3: Check distribution percentage limits
   * Validates that redemption amount doesn't exceed distributed amounts and percentage limits
   */
  async checkDistributionLimits(
    investorId: string,
    projectId: string,
    requestedAmount: number,
    rules: RedemptionRules,
    productType?: string,
    productId?: string
  ): Promise<{
    eligible: boolean;
    reason: string;
    maxAmount: number;
    distributionIds: string[];
    availableDistributions: Distribution[];
  }> {
    try {
      // Get investor's distributions for this project
      let query = supabase
        .from('distributions')
        .select('*')
        .eq('investor_id', investorId)
        .eq('project_id', projectId)
        .eq('fully_redeemed', false)
        .gt('remaining_amount', 0);

      // Add product filtering if specified
      if (productType || productId) {
        // This would require additional join logic based on your product linking strategy
        // For now, we'll filter in memory after retrieving
      }

      const { data: distributions, error } = await query.order('distribution_date', { ascending: true });

      if (error) {
        throw new Error(`Failed to get distributions: ${error.message}`);
      }

      if (!distributions || distributions.length === 0) {
        return {
          eligible: false,
          reason: 'No eligible distributions found for this investor in this project',
          maxAmount: 0,
          distributionIds: [],
          availableDistributions: []
        };
      }

      // Calculate maximum redeemable amounts per distribution
      const eligibleDistributions = distributions.map(dist => {
        let maxRedeemable = dist.remaining_amount;

        // Apply percentage limit if configured
        if (rules.max_redemption_percentage) {
          const percentageLimit = (dist.token_amount * rules.max_redemption_percentage) / 100;
          const alreadyRedeemed = dist.token_amount - dist.remaining_amount;
          const percentageAvailable = Math.max(0, percentageLimit - alreadyRedeemed);
          maxRedeemable = Math.min(maxRedeemable, percentageAvailable);
        }

        return {
          ...dist,
          maxRedeemable
        };
      }).filter(dist => dist.maxRedeemable > 0);

      const totalAvailable = eligibleDistributions.reduce((sum, dist) => sum + dist.maxRedeemable, 0);

      if (totalAvailable === 0) {
        return {
          eligible: false,
          reason: `All distributions have reached the ${rules.max_redemption_percentage}% redemption limit`,
          maxAmount: 0,
          distributionIds: [],
          availableDistributions: distributions
        };
      }

      if (requestedAmount > totalAvailable) {
        return {
          eligible: false,
          reason: `Requested amount (${requestedAmount.toLocaleString()}) exceeds maximum redeemable amount (${totalAvailable.toLocaleString()})`,
          maxAmount: totalAvailable,
          distributionIds: eligibleDistributions.map(d => d.id),
          availableDistributions: distributions
        };
      }

      return {
        eligible: true,
        reason: 'Distribution limits satisfied',
        maxAmount: totalAvailable,
        distributionIds: eligibleDistributions.map(d => d.id),
        availableDistributions: distributions
      };
    } catch (error) {
      console.error('Error checking distribution limits:', error);
      return {
        eligible: false,
        reason: `Error checking distribution limits: ${error instanceof Error ? error.message : 'Unknown error'}`,
        maxAmount: 0,
        distributionIds: [],
        availableDistributions: []
      };
    }
  }

  /**
   * COMBINED VALIDATION: Check all three principles
   * Main entry point for redemption eligibility validation
   */
  async validateRedemptionRequest(request: RedemptionRequest): Promise<ValidationResult> {
    try {
      const checkId = crypto.randomUUID();

      // Step 1: Check if redemptions are open (Principle 1)
      const openCheck = await this.isRedemptionOpen(
        request.project_id,
        request.product_type,
        request.product_id
      );

      if (!openCheck.open) {
        return {
          valid: false,
          errors: [openCheck.reason],
          checkId
        };
      }

      const rules = openCheck.rules!;

      // Step 2: Check date/window eligibility (Principle 2)
      const dateCheck = await this.checkDateEligibility(request.project_id, rules);

      if (!dateCheck.eligible) {
        return {
          valid: false,
          errors: [dateCheck.reason],
          checkId
        };
      }

      // Step 3: Check distribution limits (Principle 3)
      const distributionCheck = await this.checkDistributionLimits(
        request.investor_id,
        request.project_id,
        request.token_amount,
        rules,
        request.product_type,
        request.product_id
      );

      if (!distributionCheck.eligible) {
        return {
          valid: false,
          errors: [distributionCheck.reason],
          maxAmount: distributionCheck.maxAmount,
          checkId
        };
      }

      // All checks passed
      return {
        valid: true,
        errors: [],
        maxAmount: distributionCheck.maxAmount,
        checkId
      };
    } catch (error) {
      console.error('Error validating redemption request:', error);
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Get redemption rules for a project/product
   */
  async getRedemptionRules(
    projectId: string,
    productType?: string,
    productId?: string
  ): Promise<RedemptionRules[]> {
    try {
      let query = supabase
        .from('redemption_rules')
        .select('*')
        .eq('project_id', projectId);

      if (productType) {
        query = query.eq('product_type', productType);
      }
      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get redemption rules: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting redemption rules:', error);
      return [];
    }
  }

  /**
   * Get active redemption windows for a project
   */
  async getActiveRedemptionWindows(projectId: string): Promise<RedemptionWindow[]> {
    try {
      const { data, error } = await supabase
        .from('redemption_windows')
        .select(`
          *,
          redemption_window_configs!inner(project_id, active)
        `)
        .eq('redemption_window_configs.project_id', projectId)
        .eq('redemption_window_configs.active', true)
        .eq('status', 'active')
        .order('start_date', { ascending: true });

      if (error) {
        throw new Error(`Failed to get redemption windows: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting redemption windows:', error);
      return [];
    }
  }

  /**
   * Get investor distributions for a project
   */
  async getInvestorDistributions(
    investorId: string,
    projectId: string
  ): Promise<Distribution[]> {
    try {
      const { data, error } = await supabase
        .from('distributions')
        .select('*')
        .eq('investor_id', investorId)
        .eq('project_id', projectId)
        .order('distribution_date', { ascending: true });

      if (error) {
        throw new Error(`Failed to get distributions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting distributions:', error);
      return [];
    }
  }

  /**
   * Real-time eligibility checking for UI
   * Returns comprehensive eligibility status for display
   */
  async getRealtimeEligibilityStatus(
    investorId: string,
    projectId: string,
    productType?: string,
    productId?: string
  ): Promise<{
    eligible: boolean;
    reasons: string[];
    maxAmount: number;
    windowInfo?: {
      id: string;
      endsAt: string;
      type: 'continuous' | 'window';
    };
    distributionSummary: {
      totalDistributed: number;
      totalRemaining: number;
      totalRedeemable: number;
      distributionCount: number;
    };
  }> {
    try {
      // Use the database function for comprehensive checking
      const { data, error } = await supabase.rpc('check_redemption_eligibility', {
        p_investor_id: investorId,
        p_project_id: projectId,
        p_requested_amount: 0, // We'll calculate max available
        p_product_type: productType,
        p_product_id: productId
      });

      if (error) {
        throw new Error(`Failed to check eligibility: ${error.message}`);
      }

      const eligibilityResult = data?.[0];
      if (!eligibilityResult) {
        return {
          eligible: false,
          reasons: ['No eligibility data available'],
          maxAmount: 0,
          distributionSummary: {
            totalDistributed: 0,
            totalRemaining: 0,
            totalRedeemable: 0,
            distributionCount: 0
          }
        };
      }

      // Get distribution summary
      const distributions = await this.getInvestorDistributions(investorId, projectId);
      const distributionSummary = {
        totalDistributed: distributions.reduce((sum, d) => sum + d.token_amount, 0),
        totalRemaining: distributions.reduce((sum, d) => sum + d.remaining_amount, 0),
        totalRedeemable: eligibilityResult.max_amount || 0,
        distributionCount: distributions.length
      };

      // Determine window info
      let windowInfo;
      if (eligibilityResult.window_id) {
        const { data: window } = await supabase
          .from('redemption_windows')
          .select('id, end_date, submission_end_date')
          .eq('id', eligibilityResult.window_id)
          .single();
        
        if (window) {
          windowInfo = {
            id: window.id,
            endsAt: window.submission_end_date,
            type: 'window' as const
          };
        }
      } else {
        // Check if continuous redemption
        const rules = await this.getRedemptionRules(projectId, productType, productId);
        if (rules.some(r => r.allow_continuous_redemption)) {
          windowInfo = {
            id: 'continuous',
            endsAt: '',
            type: 'continuous' as const
          };
        }
      }

      return {
        eligible: eligibilityResult.eligible,
        reasons: eligibilityResult.eligible ? ['Eligible for redemption'] : [eligibilityResult.reason],
        maxAmount: eligibilityResult.max_amount || 0,
        windowInfo,
        distributionSummary
      };
    } catch (error) {
      console.error('Error getting realtime eligibility status:', error);
      return {
        eligible: false,
        reasons: [`Error checking eligibility: ${error instanceof Error ? error.message : 'Unknown error'}`],
        maxAmount: 0,
        distributionSummary: {
          totalDistributed: 0,
          totalRemaining: 0,
          totalRedeemable: 0,
          distributionCount: 0
        }
      };
    }
  }
}

// Export singleton instance
export const enhancedEligibilityService = new EnhancedEligibilityService();
export default enhancedEligibilityService;
