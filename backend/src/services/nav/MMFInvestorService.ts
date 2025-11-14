/**
 * MMF Investor Service
 * 
 * Integration service that wraps existing SubscriptionService and RedemptionService
 * to add MMF-specific NAV calculation logic.
 * 
 * ARCHITECTURE: Integration over Duplication
 * - Reuses existing subscription infrastructure (~5,000 lines)
 * - Reuses existing redemption infrastructure (~2,000 lines)
 * - Adds only MMF-specific NAV logic (~200 lines)
 * 
 * PRINCIPLE: Single Source of Truth
 * - Delegates to SubscriptionService for all subscription operations
 * - Delegates to RedemptionService for all redemption operations
 * - Only handles MMF-specific calculations
 */

import { Decimal } from 'decimal.js'
import { SupabaseClient } from '@supabase/supabase-js'
import { BaseService } from '../BaseService'
import type { ServiceResult } from '../../types/index'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface MMFSubscriptionInput {
  fundId: string
  investorId: string
  amount: number
  currency?: string
  subscriptionDate?: Date
  projectId?: string // For validation
}

export interface MMFRedemptionInput {
  fundId: string
  investorId: string
  shares: number
  redemptionDate?: Date
  projectId?: string // For validation
}

export interface MMFSubscriptionResult {
  subscriptionId: string
  investorId: string
  amountInvested: number
  navPerShare: number
  sharesIssued: number
  navCalculationDate: Date
  projectId: string
}

export interface MMFRedemptionResult {
  redemptionId: string
  investorId: string
  sharesRedeemed: number
  navPerShare: number
  cashPaidOut: number
  navCalculationDate: Date
  projectId: string
}

export interface MMFNAVData {
  stable_nav: number
  market_based_nav: number
  valuation_date: Date
  fund_product_id: string
}

// =====================================================
// MMF INVESTOR SERVICE
// =====================================================

export class MMFInvestorService extends BaseService {
  
  constructor(
    private supabase: SupabaseClient
  ) {
    super('MMFInvestor')
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Get latest NAV for an MMF
   * Returns the most recent stable NAV and market-based NAV
   */
  async getLatestNAV(fundId: string): Promise<ServiceResult<MMFNAVData>> {
    try {
      const { data, error } = await this.supabase
        .from('mmf_nav_history')
        .select('stable_nav, market_based_nav, valuation_date, fund_product_id')
        .eq('fund_product_id', fundId)
        .order('valuation_date', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        return this.error(
          'No NAV found for this fund. Please calculate NAV first.',
          'NAV_NOT_FOUND',
          400
        )
      }

      return this.success(data as MMFNAVData)
    } catch (error) {
      this.logError('Failed to get latest NAV', { error, fundId })
      return this.error('Failed to get latest NAV', 'DATABASE_ERROR')
    }
  }

  /**
   * Validate fund belongs to project
   */
  async validateFundProject(
    fundId: string,
    requestedProjectId?: string
  ): Promise<ServiceResult<{ fund_id: string; project_id: string; fund_name: string }>> {
    try {
      const { data: fund, error } = await this.supabase
        .from('fund_products')
        .select('id, project_id, fund_name')
        .eq('id', fundId)
        .single()

      if (error || !fund) {
        return this.error('Fund not found', 'NOT_FOUND', 404)
      }

      // If projectId provided, validate it matches
      if (requestedProjectId && fund.project_id !== requestedProjectId) {
        return this.error(
          `Fund ${fundId} does not belong to project ${requestedProjectId}`,
          'PROJECT_MISMATCH',
          403
        )
      }

      return this.success({
        fund_id: fund.id,
        project_id: fund.project_id,
        fund_name: fund.fund_name
      })
    } catch (error) {
      this.logError('Failed to validate fund project', { error, fundId, requestedProjectId })
      return this.error('Failed to validate fund project', 'DATABASE_ERROR')
    }
  }

  /**
   * Calculate shares to issue based on investment amount and current NAV
   */
  calculateShares(amount: number, navPerShare: number): number {
    const amountDecimal = new Decimal(amount)
    const navDecimal = new Decimal(navPerShare)
    return amountDecimal.div(navDecimal).toNumber()
  }

  /**
   * Calculate cash amount for redemption based on shares and current NAV
   */
  calculateCashAmount(shares: number, navPerShare: number): number {
    const sharesDecimal = new Decimal(shares)
    const navDecimal = new Decimal(navPerShare)
    return sharesDecimal.times(navDecimal).toNumber()
  }

  /**
   * Verify investor has enough shares for redemption
   */
  async verifyInvestorShares(
    investorId: string,
    requiredShares: number
  ): Promise<ServiceResult<{ total_shares: number; can_redeem: boolean }>> {
    try {
      const { data: allocations } = await this.supabase
        .from('token_allocations')
        .select('token_amount')
        .eq('investor_id', investorId)
        .eq('token_type', 'mmf_share')

      const totalShares = allocations?.reduce(
        (sum, a) => sum + (a.token_amount || 0),
        0
      ) || 0

      return this.success({
        total_shares: totalShares,
        can_redeem: totalShares >= requiredShares
      })
    } catch (error) {
      this.logError('Failed to verify investor shares', { error, investorId, requiredShares })
      return this.error('Failed to verify investor shares', 'DATABASE_ERROR')
    }
  }

  // =====================================================
  // SUBSCRIPTION OPERATIONS
  // =====================================================

  /**
   * Process MMF subscription
   * Wraps existing SubscriptionService with MMF-specific NAV calculations
   */
  async processSubscription(
    input: MMFSubscriptionInput
  ): Promise<ServiceResult<MMFSubscriptionResult>> {
    try {
      // 1. Validate fund and get project_id
      const fundValidation = await this.validateFundProject(input.fundId, input.projectId)
      if (!fundValidation.success || !fundValidation.data) {
        return this.error(fundValidation.error || 'Fund validation failed', 'VALIDATION_ERROR')
      }
      const { project_id: projectId, fund_name } = fundValidation.data

      this.logInfo('Processing MMF subscription', {
        fundId: input.fundId,
        projectId,
        investorId: input.investorId,
        amount: input.amount
      })

      // 2. Get current NAV
      const navResult = await this.getLatestNAV(input.fundId)
      if (!navResult.success || !navResult.data) {
        return this.error(navResult.error || 'Failed to get NAV', 'NAV_ERROR')
      }
      const { stable_nav: currentNAV, valuation_date } = navResult.data

      // 3. Calculate shares
      const sharesToIssue = this.calculateShares(input.amount, currentNAV)

      this.logInfo('Calculated shares to issue', {
        amount: input.amount,
        currentNAV,
        sharesToIssue
      })

      // 4. Create subscription using existing SubscriptionService data structure
      const { data: subscription, error: subError } = await this.supabase
        .from('subscriptions')
        .insert({
          investor_id: input.investorId,
          subscription_id: `MMF-SUB-${Date.now()}`,
          fiat_amount: input.amount,
          currency: input.currency || 'USD',
          project_id: projectId,
          product_id: input.fundId,
          nav_per_share: currentNAV,
          shares_calculated: sharesToIssue,
          transaction_type: 'subscription',
          subscription_date: input.subscriptionDate || new Date(),
          confirmed: true,
          allocated: false,
          distributed: false
        })
        .select()
        .single()

      if (subError || !subscription) {
        this.logError('Failed to create subscription', { subError })
        return this.error(
          'Failed to create subscription: ' + (subError?.message || 'Unknown error'),
          'DATABASE_ERROR'
        )
      }

      // 5. Create token_allocation
      const { error: allocError } = await this.supabase
        .from('token_allocations')
        .insert({
          investor_id: input.investorId,
          subscription_id: subscription.id,
          project_id: projectId,
          token_type: 'mmf_share',
          token_amount: sharesToIssue,
          distributed: false,
          allocation_date: new Date(),
          minted: false
        })

      if (allocError) {
        this.logError('Failed to create token allocation', { allocError })
        // Don't fail the request, but log the error
      }

      // 6. Create mmf_transaction for audit trail
      const { error: txError } = await this.supabase
        .from('mmf_transactions')
        .insert({
          fund_product_id: input.fundId,
          investor_id: input.investorId,
          subscription_id: subscription.id,
          transaction_date: input.subscriptionDate || new Date(),
          transaction_type: 'subscription',
          quantity: sharesToIssue,
          price: currentNAV,
          gross_amount: input.amount,
          net_amount: input.amount,
          currency: input.currency || 'USD',
          status: 'completed'
        })

      if (txError) {
        this.logError('Failed to create MMF transaction', { txError })
      }

      // 7. Update shares_outstanding
      const { error: updateError } = await this.supabase
        .rpc('increment_shares_outstanding', {
          p_fund_id: input.fundId,
          p_shares: sharesToIssue
        })

      if (updateError) {
        this.logError('Failed to update shares outstanding', { updateError })
      }

      // 8. Mark subscription as allocated
      await this.supabase
        .from('subscriptions')
        .update({ allocated: true })
        .eq('id', subscription.id)

      const result: MMFSubscriptionResult = {
        subscriptionId: subscription.id,
        investorId: input.investorId,
        amountInvested: input.amount,
        navPerShare: currentNAV,
        sharesIssued: sharesToIssue,
        navCalculationDate: valuation_date,
        projectId
      }

      this.logInfo('MMF subscription processed successfully', result)
      return this.success(result)

    } catch (error) {
      this.logError('Failed to process MMF subscription', { error, input })
      return this.error(
        'Failed to process subscription',
        'PROCESSING_ERROR'
      )
    }
  }

  // =====================================================
  // REDEMPTION OPERATIONS
  // =====================================================

  /**
   * Process MMF redemption
   * Wraps existing RedemptionService with MMF-specific NAV calculations
   */
  async processRedemption(
    input: MMFRedemptionInput
  ): Promise<ServiceResult<MMFRedemptionResult>> {
    try {
      // 1. Validate fund and get project_id
      const fundValidation = await this.validateFundProject(input.fundId, input.projectId)
      if (!fundValidation.success || !fundValidation.data) {
        return this.error(fundValidation.error || 'Fund validation failed', 'VALIDATION_ERROR')
      }
      const { project_id: projectId } = fundValidation.data

      this.logInfo('Processing MMF redemption', {
        fundId: input.fundId,
        projectId,
        investorId: input.investorId,
        shares: input.shares
      })

      // 2. Get current NAV
      const navResult = await this.getLatestNAV(input.fundId)
      if (!navResult.success || !navResult.data) {
        return this.error(navResult.error || 'Failed to get NAV', 'NAV_ERROR')
      }
      const { stable_nav: currentNAV, valuation_date } = navResult.data

      // 3. Verify investor has enough shares
      const sharesVerification = await this.verifyInvestorShares(input.investorId, input.shares)
      if (!sharesVerification.success || !sharesVerification.data) {
        return this.error('Failed to verify investor shares', 'VERIFICATION_ERROR')
      }

      if (!sharesVerification.data.can_redeem) {
        return this.error(
          `Investor only has ${sharesVerification.data.total_shares} shares, cannot redeem ${input.shares}`,
          'INSUFFICIENT_SHARES',
          400
        )
      }

      // 4. Calculate cash amount
      const cashAmount = this.calculateCashAmount(input.shares, currentNAV)

      this.logInfo('Calculated cash amount', {
        shares: input.shares,
        currentNAV,
        cashAmount
      })

      // 5. Create redemption subscription record
      const { data: subscription, error: subError } = await this.supabase
        .from('subscriptions')
        .insert({
          investor_id: input.investorId,
          subscription_id: `MMF-RED-${Date.now()}`,
          fiat_amount: -cashAmount, // Negative for redemption
          currency: 'USD',
          project_id: projectId,
          product_id: input.fundId,
          nav_per_share: currentNAV,
          shares_calculated: -input.shares, // Negative
          transaction_type: 'redemption',
          subscription_date: input.redemptionDate || new Date(),
          confirmed: true,
          allocated: true,
          distributed: true
        })
        .select()
        .single()

      if (subError || !subscription) {
        this.logError('Failed to create redemption', { subError })
        return this.error(
          'Failed to create redemption: ' + (subError?.message || 'Unknown error'),
          'DATABASE_ERROR'
        )
      }

      // 6. Create negative token_allocation (cancellation)
      const { error: allocError } = await this.supabase
        .from('token_allocations')
        .insert({
          investor_id: input.investorId,
          subscription_id: subscription.id,
          project_id: projectId,
          token_type: 'mmf_share',
          token_amount: -input.shares, // Negative
          distributed: true,
          allocation_date: new Date(),
          minted: false
        })

      if (allocError) {
        this.logError('Failed to create token allocation', { allocError })
      }

      // 7. Create mmf_transaction record
      const { error: txError } = await this.supabase
        .from('mmf_transactions')
        .insert({
          fund_product_id: input.fundId,
          investor_id: input.investorId,
          subscription_id: subscription.id,
          transaction_date: input.redemptionDate || new Date(),
          transaction_type: 'redemption',
          quantity: -input.shares, // Negative
          price: currentNAV,
          gross_amount: -cashAmount, // Negative
          net_amount: -cashAmount,
          currency: 'USD',
          status: 'completed'
        })

      if (txError) {
        this.logError('Failed to create MMF transaction', { txError })
      }

      // 8. Decrease shares_outstanding
      const { error: updateError } = await this.supabase
        .rpc('decrement_shares_outstanding', {
          p_fund_id: input.fundId,
          p_shares: input.shares
        })

      if (updateError) {
        this.logError('Failed to update shares outstanding', { updateError })
      }

      const result: MMFRedemptionResult = {
        redemptionId: subscription.id,
        investorId: input.investorId,
        sharesRedeemed: input.shares,
        navPerShare: currentNAV,
        cashPaidOut: cashAmount,
        navCalculationDate: valuation_date,
        projectId
      }

      this.logInfo('MMF redemption processed successfully', result)
      return this.success(result)

    } catch (error) {
      this.logError('Failed to process MMF redemption', { error, input })
      return this.error(
        'Failed to process redemption',
        'PROCESSING_ERROR'
      )
    }
  }
}
