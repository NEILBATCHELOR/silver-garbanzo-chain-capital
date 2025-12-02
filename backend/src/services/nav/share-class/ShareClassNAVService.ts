/**
 * Share Class NAV Service
 * 
 * Calculates NAV for different share classes of the same ETF
 * All share classes share the same portfolio but have different:
 * - Expense ratios
 * - Minimum investments
 * - Distribution settings
 * 
 * NAV Calculation: Share Class NAV = Base NAV - (Expense Ratio Differential × Days / 365)
 * 
 * Following ZERO HARDCODED VALUES principle
 */

import { Decimal } from 'decimal.js'
import { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface ETFProduct {
  id: string
  parent_fund_id: string | null
  share_class_name: string | null
  expense_ratio: number | null
  total_expense_ratio: number | null
  net_asset_value: number
  shares_outstanding: number
  inception_date: Date
}

export interface ShareClassNAVRequest {
  parentETF: ETFProduct
  shareClass: ETFProduct
  baseNAV: Decimal
  asOfDate: Date
  inceptionDate?: Date
}

export interface ShareClassNAVResult {
  shareClassId: string
  shareClassName: string
  shareClassNAV: Decimal
  baseNAV: Decimal
  expenseRatioDifferential: Decimal
  daysSinceInception: number
  cumulativeExpenseImpact: Decimal
  metadata: {
    calculationDate: Date
    parentExpenseRatio: number
    shareClassExpenseRatio: number
    dailyExpenseImpact: Decimal
  }
}

export interface ShareClassComparisonResult {
  parentETF: {
    id: string
    name: string
    expenseRatio: number
    nav: Decimal
  }
  shareClasses: Array<{
    id: string
    name: string
    expenseRatio: number
    nav: Decimal
    expenseDifferential: number
    navDifferential: Decimal
    navDifferentialPercent: Decimal
  }>
}

export interface ShareClassNAVServiceConfig {
  supabaseClient?: SupabaseClient
  defaultDaysPerYear?: number
}

// =====================================================
// SHARE CLASS NAV SERVICE
// =====================================================

export class ShareClassNAVService {
  private readonly config: ShareClassNAVServiceConfig
  private readonly daysPerYear: number
  
  constructor(config: ShareClassNAVServiceConfig = {}) {
    this.config = config
    this.daysPerYear = config.defaultDaysPerYear || 365
  }
  
  /**
   * Calculate NAV for a specific share class
   * 
   * Formula: Share Class NAV = Base NAV - Cumulative Expense Impact
   * 
   * Where:
   * - Base NAV = Parent ETF NAV (before any expense ratio adjustments)
   * - Cumulative Expense Impact = (Expense Differential × Days Since Inception) / 365
   * - Expense Differential = Share Class Expense Ratio - Parent Expense Ratio
   */
  async calculateShareClassNAV(request: ShareClassNAVRequest): Promise<ShareClassNAVResult> {
    // Validate inputs
    if (!request.shareClass.parent_fund_id) {
      throw new Error('Share class must have a parent_fund_id')
    }
    
    if (request.shareClass.parent_fund_id !== request.parentETF.id) {
      throw new Error('Share class parent_fund_id does not match parent ETF id')
    }
    
    // Get expense ratios
    const parentExpenseRatio = request.parentETF.expense_ratio || 0
    const shareClassExpenseRatio = request.shareClass.expense_ratio || 0
    
    // Calculate expense ratio differential (in decimal form)
    const expenseRatioDifferential = new Decimal(shareClassExpenseRatio - parentExpenseRatio).div(100)
    
    // Calculate days since inception
    const inceptionDate = request.inceptionDate || request.shareClass.inception_date
    const daysSinceInception = this.calculateDaysBetween(inceptionDate, request.asOfDate)
    
    // Calculate cumulative expense impact
    // Impact = (Differential × Days) / DaysPerYear × Base NAV
    const cumulativeExpenseImpact = expenseRatioDifferential
      .times(daysSinceInception)
      .div(this.daysPerYear)
      .times(request.baseNAV)
    
    // Calculate share class NAV
    const shareClassNAV = request.baseNAV.minus(cumulativeExpenseImpact)
    
    // Calculate daily expense impact
    const dailyExpenseImpact = expenseRatioDifferential
      .div(this.daysPerYear)
      .times(request.baseNAV)
    
    return {
      shareClassId: request.shareClass.id,
      shareClassName: request.shareClass.share_class_name || 'Unknown',
      shareClassNAV,
      baseNAV: request.baseNAV,
      expenseRatioDifferential,
      daysSinceInception,
      cumulativeExpenseImpact,
      metadata: {
        calculationDate: request.asOfDate,
        parentExpenseRatio,
        shareClassExpenseRatio,
        dailyExpenseImpact
      }
    }
  }
  
  /**
   * Calculate expense ratio differential impact
   * 
   * This method calculates how much the NAV would differ due to different expense ratios
   * over a given period
   */
  calculateExpenseRatioDifferential(
    parentExpenseRatio: number,
    shareClassExpenseRatio: number,
    days: number
  ): Decimal {
    // Convert percentage to decimal
    const differential = new Decimal(shareClassExpenseRatio - parentExpenseRatio).div(100)
    
    // Calculate impact: (Differential × Days) / DaysPerYear
    const impact = differential.times(days).div(this.daysPerYear)
    
    return impact
  }
  
  /**
   * Compare all share classes of a parent ETF
   */
  async compareShareClasses(
    parentETF: ETFProduct,
    shareClasses: ETFProduct[],
    baseNAV: Decimal,
    asOfDate: Date
  ): Promise<ShareClassComparisonResult> {
    
    const shareClassResults = await Promise.all(
      shareClasses.map(async (shareClass) => {
        const navResult = await this.calculateShareClassNAV({
          parentETF,
          shareClass,
          baseNAV,
          asOfDate
        })
        
        const expenseDiff = (shareClass.expense_ratio || 0) - (parentETF.expense_ratio || 0)
        const navDiff = navResult.shareClassNAV.minus(baseNAV)
        const navDiffPercent = navDiff.div(baseNAV).times(100)
        
        return {
          id: shareClass.id,
          name: shareClass.share_class_name || 'Unknown',
          expenseRatio: shareClass.expense_ratio || 0,
          nav: navResult.shareClassNAV,
          expenseDifferential: expenseDiff,
          navDifferential: navDiff,
          navDifferentialPercent: navDiffPercent
        }
      })
    )
    
    return {
      parentETF: {
        id: parentETF.id,
        name: parentETF.share_class_name || 'Parent',
        expenseRatio: parentETF.expense_ratio || 0,
        nav: baseNAV
      },
      shareClasses: shareClassResults
    }
  }
  
  /**
   * Calculate NAV impact over multiple periods
   * Useful for projecting future NAV differences
   */
  calculateProjectedNAVImpact(
    baseNAV: Decimal,
    expenseRatioDifferential: number,
    periods: number[]
  ): Map<number, Decimal> {
    
    const results = new Map<number, Decimal>()
    
    periods.forEach(days => {
      const impact = this.calculateExpenseRatioDifferential(
        0, // Using differential directly, so parent is 0
        expenseRatioDifferential,
        days
      )
      
      const projectedNAV = baseNAV.times(new Decimal(1).minus(impact))
      results.set(days, projectedNAV)
    })
    
    return results
  }
  
  /**
   * Calculate days between two dates
   */
  private calculateDaysBetween(startDate: Date, endDate: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    
    return Math.floor((end - start) / msPerDay)
  }
  
  /**
   * Validate share class relationship
   */
  validateShareClassRelationship(
    parentETF: ETFProduct,
    shareClass: ETFProduct
  ): { isValid: boolean; errors: string[] } {
    
    const errors: string[] = []
    
    // Check parent_fund_id
    if (!shareClass.parent_fund_id) {
      errors.push('Share class must have a parent_fund_id')
    } else if (shareClass.parent_fund_id !== parentETF.id) {
      errors.push('Share class parent_fund_id does not match parent ETF id')
    }
    
    // Check share_class_name
    if (!shareClass.share_class_name) {
      errors.push('Share class must have a share_class_name')
    }
    
    // Check expense ratio
    if (shareClass.expense_ratio === null || shareClass.expense_ratio === undefined) {
      errors.push('Share class must have an expense_ratio')
    }
    
    // Check inception date
    if (!shareClass.inception_date) {
      errors.push('Share class must have an inception_date')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Fetch share classes for a parent ETF from database
   */
  async fetchShareClasses(parentETFId: string): Promise<ETFProduct[]> {
    if (!this.config.supabaseClient) {
      throw new Error('Supabase client not configured')
    }
    
    const { data, error } = await this.config.supabaseClient
      .from('fund_products')
      .select('*')
      .eq('parent_fund_id', parentETFId)
      .like('fund_type', 'etf_%')
    
    if (error) {
      throw new Error(`Failed to fetch share classes: ${error.message}`)
    }
    
    return data || []
  }
}

// Export singleton factory
export function createShareClassNAVService(config?: ShareClassNAVServiceConfig): ShareClassNAVService {
  return new ShareClassNAVService(config)
}
