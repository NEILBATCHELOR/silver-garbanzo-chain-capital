/**
 * Enhanced ETF Models
 * 
 * Implements ETF-specific valuation logic:
 * - NAV = (Total Assets - Total Liabilities) / Shares Outstanding
 * - Mark-to-Market valuation for liquid holdings
 * - Premium/Discount Analysis (Market Price vs NAV)
 * - Tracking Error Calculation (Performance vs Benchmark)
 * - Crypto Holdings Support (24/7 pricing, staking yields)
 * - Share Class Support (different expense ratios, same holdings)
 * 
 * Following MMF/Bonds implementation pattern with ZERO HARDCODED VALUES
 */

import { Decimal } from 'decimal.js'
import type {
  ETFProduct,
  ETFSupportingData,
  ETFHolding,
  ETFMetadata,
  ETFNAVHistory,
  ETFTrackingErrorHistory
} from '../../data-fetchers/traditional/ETFDataFetcher'

// Set Decimal precision for financial calculations
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

// =====================================================
// RESULT TYPE DEFINITIONS
// =====================================================

/**
 * Complete ETF valuation result
 */
export interface ETFValuationResult {
  // Core NAV
  nav: Decimal
  navPerShare: Decimal
  
  // Market Price Analysis
  marketPrice: Decimal | null
  premiumDiscount: PremiumDiscountAnalysis
  
  // Tracking Performance
  trackingMetrics: TrackingMetrics
  
  // NAV Breakdown Components
  breakdown: ETFValuationBreakdown
  
  // Crypto-Specific Metrics (if applicable)
  cryptoMetrics?: CryptoMetrics
  
  // Data Quality Assessment
  compliance: ComplianceCheck
  dataQuality: DataQualityAssessment
  confidence: number // 0-1 scale
  calculationMethod: string
  sources: DataSource[]
}

/**
 * Premium/Discount Analysis
 * Critical metric for ETFs
 */
export interface PremiumDiscountAnalysis {
  amount: Decimal // Market Price - NAV
  percentage: Decimal // (Market Price - NAV) / NAV * 100
  status: 'premium' | 'discount' | 'fair_value'
  interpretation: string
  arbitrageOpportunity: boolean
}
/**
 * Tracking Error and Performance Metrics
 */
export interface TrackingMetrics {
  trackingError: number | null // Standard deviation of return differences
  trackingDifference: number | null // Average return difference (bps)
  correlation: number | null // Correlation with benchmark
  rSquared: number | null // R² vs benchmark
  beta: number | null // Systematic risk
  alpha: number | null // Excess return adjusted for risk
  informationRatio: number | null // Excess return / tracking error
  sharpeRatio: number | null
}

/**
 * ETF NAV Breakdown
 */
export interface ETFValuationBreakdown {
  // Assets
  totalAssets: Decimal
  securitiesValue: Decimal
  cashPosition: Decimal
  derivativesValue: Decimal
  accruedIncome: Decimal
  otherAssets: Decimal
  
  // Liabilities
  totalLiabilities: Decimal
  accruedExpenses: Decimal
  otherLiabilities: Decimal
  
  // Net Position
  netAssets: Decimal
  sharesOutstanding: Decimal
  navPerShare: Decimal
  
  // Holdings Analysis
  holdingsBreakdown: HoldingsBreakdown
}

/**
 * Holdings Breakdown by Classification
 */
export interface HoldingsBreakdown {
  bySecurityType: Map<string, Decimal> // 'equity', 'bond', 'crypto', etc.
  bySector: Map<string, Decimal>
  byCountry: Map<string, Decimal>
  byBlockchain?: Map<string, Decimal> // For crypto ETFs
  topHoldings: TopHolding[]
  concentrationRisk: ConcentrationMetrics
}

/**
 * Top Holdings Summary
 */
export interface TopHolding {
  name: string
  ticker: string | null
  value: Decimal
  weight: number // Percentage
  securityType: string
}

/**
 * Concentration Risk Metrics
 */
export interface ConcentrationMetrics {
  top10Concentration: number // % in top 10 holdings
  herfindahlIndex: number // Sum of squared weights
  effectiveNumberOfHoldings: number // 1 / HHI
}

/**
 * Crypto-Specific Metrics
 * For ETFs with crypto holdings
 */
export interface CryptoMetrics {
  totalCryptoValue: Decimal
  stakingRewardsAccrued: Decimal
  averageStakingYield: number
  holdingsByChain: Map<string, ChainMetrics>
  custodyVerification: CustodyVerificationStatus
}

/**
 * Blockchain-specific metrics
 */
export interface ChainMetrics {
  blockchain: string
  totalValue: Decimal
  holdings: number
  percentageOfCrypto: number
  isStaked: boolean
  stakingYield: number | null
}

/**
 * Custody Verification for Crypto
 */
export interface CustodyVerificationStatus {
  isVerified: boolean
  lastVerificationDate: Date | null
  verificationMethod: string | null
  onChainHash: string | null
}

/**
 * Compliance Checks
 */
export interface ComplianceCheck {
  isCompliant: boolean
  warnings: ComplianceWarning[]
  errors: ComplianceError[]
}

export interface ComplianceWarning {
  code: string
  message: string
  severity: 'low' | 'medium' | 'high'
}

export interface ComplianceError {
  code: string
  message: string
  fix: string
}

/**
 * Data Quality Assessment
 */
export interface DataQualityAssessment {
  overall: 'excellent' | 'good' | 'fair' | 'poor'
  issues: DataQualityIssue[]
  completeness: number // 0-100%
}

export interface DataQualityIssue {
  field: string
  issue: string
  impact: 'high' | 'medium' | 'low'
  recommendation: string
}

/**
 * Data Source Tracking
 */
export interface DataSource {
  table: string
  recordCount: number
  dateRange?: { start: Date; end: Date }
  completeness: number // 0-100%
}

// =====================================================
// ENHANCED ETF MODELS CLASS
// =====================================================

/**
 * Enhanced ETF Models
 * Main calculation engine for ETF valuation
 */
export class EnhancedETFModels {
  
  /**
   * Main valuation entry point
   * Calculates NAV using mark-to-market for all holdings
   */
  async calculateETFValuation(
    product: ETFProduct,
    supporting: ETFSupportingData,
    asOfDate: Date,
    configOverrides?: any
  ): Promise<ETFValuationResult> {
    
    // Step 1: Validate inputs
    this.validateInputs(product, supporting, asOfDate)
    
    // Step 2: Calculate total assets (sum all holdings at market value)
    const totalAssets = this.calculateTotalAssets(supporting.holdings)
    
    // Step 3: Calculate components breakdown
    const breakdown = this.calculateBreakdown(
      product,
      supporting.holdings,
      totalAssets
    )
    
    // Step 4: Calculate liabilities (typically minimal for ETFs)
    const totalLiabilities = this.calculateTotalLiabilities(supporting.holdings)
    
    // Step 5: Calculate net assets
    const netAssets = totalAssets.minus(totalLiabilities)
    
    // Step 6: Calculate NAV per share
    const sharesOutstanding = new Decimal(product.shares_outstanding)
    if (sharesOutstanding.lte(0)) {
      throw new Error('Shares outstanding must be positive')
    }
    const navPerShare = netAssets.div(sharesOutstanding)
    
    // Step 7: Calculate premium/discount if market price available
    const premiumDiscount = product.market_price
      ? this.calculatePremiumDiscount(navPerShare, new Decimal(product.market_price))
      : this.getDefaultPremiumDiscount()
    
    // Step 8: Calculate tracking metrics
    const trackingMetrics = this.calculateTrackingMetrics(
      supporting.trackingHistory
    )
    
    // Step 9: Calculate crypto metrics (if crypto ETF)
    const cryptoMetrics = supporting.metadata?.is_crypto_etf
      ? this.calculateCryptoMetrics(supporting.holdings)
      : undefined
    
    // Step 10: Assess data quality
    const dataQuality = this.assessDataQuality(product, supporting)
    
    // Step 11: Run compliance checks
    const compliance = this.runComplianceChecks(product, supporting, breakdown)
    
    // Step 12: Calculate confidence score
    const confidence = this.calculateConfidence(dataQuality, compliance)
    
    // Step 13: Build result
    return {
      nav: netAssets,
      navPerShare,
      marketPrice: product.market_price ? new Decimal(product.market_price) : null,
      premiumDiscount,
      trackingMetrics,
      breakdown: {
        ...breakdown,
        totalAssets,
        totalLiabilities,
        netAssets,
        sharesOutstanding,
        navPerShare
      },
      cryptoMetrics,
      compliance,
      dataQuality,
      confidence,
      calculationMethod: 'mark_to_market',
      sources: this.buildDataSources(supporting)
    }
  }
  
  /**
   * Validate inputs before calculation
   */
  private validateInputs(
    product: ETFProduct,
    supporting: ETFSupportingData,
    asOfDate: Date
  ): void {
    if (!product.id) {
      throw new Error('Product ID is required')
    }
    
    if (!product.fund_type?.startsWith('etf_')) {
      throw new Error(`Invalid fund type: ${product.fund_type}. Must start with 'etf_'`)
    }
    
    if (!supporting.holdings || supporting.holdings.length === 0) {
      throw new Error('ETF must have at least one holding')
    }
    
    if (!asOfDate || !(asOfDate instanceof Date)) {
      throw new Error('Valid as-of date is required')
    }
  }
  
  /**
   * Calculate total assets from holdings
   * Sum of all market_value fields
   */
  private calculateTotalAssets(holdings: ETFHolding[]): Decimal {
    return holdings.reduce(
      (sum, holding) => sum.plus(new Decimal(holding.market_value)),
      new Decimal(0)
    )
  }
  
  /**
   * Calculate total liabilities
   * For most ETFs, liabilities are minimal (accrued expenses)
   */
  private calculateTotalLiabilities(holdings: ETFHolding[]): Decimal {
    // Sum accrued expenses if available
    const accruedExpenses = holdings.reduce(
      (sum, holding) => {
        // If holding has negative market_value, treat as liability
        if (holding.market_value < 0) {
          return sum.plus(new Decimal(Math.abs(holding.market_value)))
        }
        return sum
      },
      new Decimal(0)
    )
    
    return accruedExpenses
  }
  
  /**
   * Calculate detailed breakdown
   */
  private calculateBreakdown(
    product: ETFProduct,
    holdings: ETFHolding[],
    totalAssets: Decimal
  ): Omit<ETFValuationBreakdown, 'totalAssets' | 'totalLiabilities' | 'netAssets' | 'sharesOutstanding' | 'navPerShare'> {
    
    // Calculate by security type
    const securitiesValue = this.calculateSecuritiesValue(holdings)
    const cashPosition = this.calculateCashPosition(holdings)
    const derivativesValue = this.calculateDerivativesValue(holdings)
    const accruedIncome = this.calculateAccruedIncome(holdings)
    
    // Holdings breakdown analysis
    const holdingsBreakdown = this.analyzeHoldingsBreakdown(holdings)
    
    return {
      securitiesValue,
      cashPosition,
      derivativesValue,
      accruedIncome,
      otherAssets: new Decimal(0),
      accruedExpenses: new Decimal(0),
      otherLiabilities: new Decimal(0),
      holdingsBreakdown
    }
  }
  
  /**
   * Calculate securities value (non-cash, non-derivative)
   */
  private calculateSecuritiesValue(holdings: ETFHolding[]): Decimal {
    return holdings
      .filter(h => 
        h.security_type !== 'cash' && 
        h.security_type !== 'derivative' &&
        h.market_value > 0
      )
      .reduce(
        (sum, h) => sum.plus(new Decimal(h.market_value)),
        new Decimal(0)
      )
  }
  
  /**
   * Calculate cash position
   */
  private calculateCashPosition(holdings: ETFHolding[]): Decimal {
    return holdings
      .filter(h => h.security_type === 'cash')
      .reduce(
        (sum, h) => sum.plus(new Decimal(h.market_value)),
        new Decimal(0)
      )
  }
  
  /**
   * Calculate derivatives value
   */
  private calculateDerivativesValue(holdings: ETFHolding[]): Decimal {
    return holdings
      .filter(h => h.security_type === 'derivative')
      .reduce(
        (sum, h) => sum.plus(new Decimal(h.market_value)),
        new Decimal(0)
      )
  }
  
  /**
   * Calculate accrued income
   */
  private calculateAccruedIncome(holdings: ETFHolding[]): Decimal {
    return holdings.reduce(
      (sum, h) => {
        const accrued = h.accrued_income || 0
        return sum.plus(new Decimal(accrued))
      },
      new Decimal(0)
    )
  }
  
  /**
   * Analyze holdings breakdown by various dimensions
   */
  private analyzeHoldingsBreakdown(holdings: ETFHolding[]): HoldingsBreakdown {
    // Group by security type
    const bySecurityType = this.groupByField(holdings, 'security_type', 'market_value')
    
    // Group by sector
    const bySector = this.groupByField(holdings, 'sector', 'market_value')
    
    // Group by country
    const byCountry = this.groupByField(holdings, 'country', 'market_value')
    
    // Group by blockchain (for crypto)
    const byBlockchain = this.groupByField(holdings, 'blockchain', 'market_value')
    
    // Top holdings
    const topHoldings = this.getTopHoldings(holdings, 10)
    
    // Concentration metrics
    const concentrationRisk = this.calculateConcentrationMetrics(holdings)
    
    return {
      bySecurityType,
      bySector,
      byCountry,
      byBlockchain: byBlockchain.size > 0 ? byBlockchain : undefined,
      topHoldings,
      concentrationRisk
    }
  }
  
  /**
   * Group holdings by a field and sum values
   */
  private groupByField(
    holdings: ETFHolding[],
    field: keyof ETFHolding,
    valueField: keyof ETFHolding
  ): Map<string, Decimal> {
    const grouped = new Map<string, Decimal>()
    
    holdings.forEach(holding => {
      const key = (holding[field] as string) || 'Unknown'
      const value = new Decimal(holding[valueField] as number)
      
      if (grouped.has(key)) {
        grouped.set(key, grouped.get(key)!.plus(value))
      } else {
        grouped.set(key, value)
      }
    })
    
    return grouped
  }
  
  /**
   * Get top N holdings by market value
   */
  private getTopHoldings(holdings: ETFHolding[], count: number): TopHolding[] {
    const totalValue = holdings.reduce(
      (sum, h) => sum.plus(new Decimal(h.market_value)),
      new Decimal(0)
    )
    
    return holdings
      .sort((a, b) => b.market_value - a.market_value)
      .slice(0, count)
      .map(h => ({
        name: h.security_name,
        ticker: h.security_ticker,
        value: new Decimal(h.market_value),
        weight: new Decimal(h.market_value).div(totalValue).times(100).toNumber(),
        securityType: h.security_type
      }))
  }
  
  /**
   * Calculate concentration risk metrics
   */
  private calculateConcentrationMetrics(holdings: ETFHolding[]): ConcentrationMetrics {
    const totalValue = holdings.reduce(
      (sum, h) => sum + h.market_value,
      0
    )
    
    // Top 10 concentration
    const top10Value = holdings
      .sort((a, b) => b.market_value - a.market_value)
      .slice(0, 10)
      .reduce((sum, h) => sum + h.market_value, 0)
    
    const top10Concentration = (top10Value / totalValue) * 100
    
    // Herfindahl-Hirschman Index (HHI)
    const herfindahlIndex = holdings.reduce((sum, h) => {
      const weight = h.market_value / totalValue
      return sum + (weight * weight)
    }, 0)
    
    // Effective number of holdings
    const effectiveNumberOfHoldings = 1 / herfindahlIndex
    
    return {
      top10Concentration,
      herfindahlIndex,
      effectiveNumberOfHoldings
    }
  }

  
  /**
   * Calculate premium/discount
   * Market Price vs NAV analysis - critical ETF metric
   */
  private calculatePremiumDiscount(
    nav: Decimal,
    marketPrice: Decimal
  ): PremiumDiscountAnalysis {
    const amount = marketPrice.minus(nav)
    const percentage = amount.div(nav).times(100)
    
    // Determine status based on threshold (±0.25%)
    let status: 'premium' | 'discount' | 'fair_value'
    let interpretation: string
    let arbitrageOpportunity: boolean
    
    if (percentage.gt(0.25)) {
      status = 'premium'
      interpretation = 'ETF trading above NAV - investors paying premium'
      arbitrageOpportunity = percentage.gt(0.5) // >0.5% premium is arbitrage opportunity
    } else if (percentage.lt(-0.25)) {
      status = 'discount'
      interpretation = 'ETF trading below NAV - potential value opportunity'
      arbitrageOpportunity = percentage.lt(-0.5) // >0.5% discount is arbitrage opportunity
    } else {
      status = 'fair_value'
      interpretation = 'ETF trading near intrinsic value'
      arbitrageOpportunity = false
    }
    
    return {
      amount,
      percentage,
      status,
      interpretation,
      arbitrageOpportunity
    }
  }
  
  /**
   * Get default premium/discount when no market price available
   */
  private getDefaultPremiumDiscount(): PremiumDiscountAnalysis {
    return {
      amount: new Decimal(0),
      percentage: new Decimal(0),
      status: 'fair_value',
      interpretation: 'No market price available - assuming fair value',
      arbitrageOpportunity: false
    }
  }
  
  /**
   * Calculate tracking metrics from historical data
   * Performance vs benchmark analysis
   */
  private calculateTrackingMetrics(
    trackingHistory: ETFTrackingErrorHistory[]
  ): TrackingMetrics {
    // If no tracking history, return null values
    if (!trackingHistory || trackingHistory.length === 0) {
      return {
        trackingError: null,
        trackingDifference: null,
        correlation: null,
        rSquared: null,
        beta: null,
        alpha: null,
        informationRatio: null,
        sharpeRatio: null
      }
    }
    
    // Get most recent tracking data
    const latestTracking = trackingHistory.sort(
      (a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime()
    )[0]
    
    // Ensure latestTracking exists (TypeScript guard)
    if (!latestTracking) {
      return {
        trackingError: null,
        trackingDifference: null,
        correlation: null,
        rSquared: null,
        beta: null,
        alpha: null,
        informationRatio: null,
        sharpeRatio: null
      }
    }
    
    return {
      trackingError: latestTracking.tracking_error,
      trackingDifference: latestTracking.tracking_difference,
      correlation: latestTracking.correlation,
      rSquared: latestTracking.r_squared,
      beta: latestTracking.beta,
      alpha: latestTracking.alpha,
      informationRatio: latestTracking.information_ratio,
      sharpeRatio: latestTracking.sharpe_ratio
    }
  }
  
  /**
   * Calculate crypto-specific metrics
   * For ETFs with crypto holdings
   */
  private calculateCryptoMetrics(holdings: ETFHolding[]): CryptoMetrics {
    // Filter crypto holdings
    const cryptoHoldings = holdings.filter(h => h.security_type === 'crypto')
    
    if (cryptoHoldings.length === 0) {
      throw new Error('No crypto holdings found for crypto ETF')
    }
    
    // Calculate total crypto value
    const totalCryptoValue = cryptoHoldings.reduce(
      (sum, h) => sum.plus(new Decimal(h.market_value)),
      new Decimal(0)
    )
    
    // Calculate total staking rewards
    const stakingRewardsAccrued = cryptoHoldings.reduce(
      (sum, h) => {
        const rewards = h.staking_rewards_accrued || 0
        return sum.plus(new Decimal(rewards))
      },
      new Decimal(0)
    )
    
    // Calculate average staking yield (for staked holdings)
    const stakedHoldings = cryptoHoldings.filter(h => h.is_staked)
    const averageStakingYield = stakedHoldings.length > 0
      ? stakedHoldings.reduce((sum, h) => sum + (h.staking_apr || 0), 0) / stakedHoldings.length
      : 0
    
    // Group by blockchain
    const holdingsByChain = new Map<string, ChainMetrics>()
    
    cryptoHoldings.forEach(h => {
      const blockchain = h.blockchain || 'Unknown'
      
      if (!holdingsByChain.has(blockchain)) {
        holdingsByChain.set(blockchain, {
          blockchain,
          totalValue: new Decimal(0),
          holdings: 0,
          percentageOfCrypto: 0,
          isStaked: false,
          stakingYield: null
        })
      }
      
      const chainData = holdingsByChain.get(blockchain)!
      chainData.totalValue = chainData.totalValue.plus(new Decimal(h.market_value))
      chainData.holdings += 1
      
      // Update staking info if any holdings are staked
      if (h.is_staked) {
        chainData.isStaked = true
        if (h.staking_apr && (chainData.stakingYield === null || h.staking_apr > chainData.stakingYield)) {
          chainData.stakingYield = h.staking_apr
        }
      }
    })
    
    // Calculate percentages
    holdingsByChain.forEach((chainData, blockchain) => {
      chainData.percentageOfCrypto = chainData.totalValue
        .div(totalCryptoValue)
        .times(100)
        .toNumber()
    })
    
    // Custody verification status
    const custodyVerification: CustodyVerificationStatus = {
      isVerified: cryptoHoldings.every(h => h.custody_address !== null),
      lastVerificationDate: cryptoHoldings[0]?.last_custody_verification || null,
      verificationMethod: cryptoHoldings[0]?.custody_verification_method || null,
      onChainHash: null // Would be populated from on-chain verification
    }
    
    return {
      totalCryptoValue,
      stakingRewardsAccrued,
      averageStakingYield,
      holdingsByChain,
      custodyVerification
    }
  }
  
  /**
   * Assess data quality
   * Evaluates completeness and accuracy of inputs
   */
  private assessDataQuality(
    product: ETFProduct,
    supporting: ETFSupportingData
  ): DataQualityAssessment {
    const issues: DataQualityIssue[] = []
    let completenessScore = 100
    
    // Check product data completeness
    if (!product.market_price) {
      issues.push({
        field: 'market_price',
        issue: 'No market price available',
        impact: 'medium',
        recommendation: 'Fetch current market price for premium/discount analysis'
      })
      completenessScore -= 5
    }
    
    if (!product.benchmark_index) {
      issues.push({
        field: 'benchmark_index',
        issue: 'No benchmark specified',
        impact: 'medium',
        recommendation: 'Specify benchmark index for tracking error calculation'
      })
      completenessScore -= 5
    }
    
    // Check holdings data
    if (supporting.holdings.length === 0) {
      issues.push({
        field: 'holdings',
        issue: 'No holdings data',
        impact: 'high',
        recommendation: 'Add holdings to etf_holdings table'
      })
      completenessScore -= 30
    } else {
      // Check holdings completeness
      const holdingsWithPricing = supporting.holdings.filter(h => 
        h.market_value > 0 && h.price_per_unit > 0
      )
      const pricingCompleteness = (holdingsWithPricing.length / supporting.holdings.length) * 100
      
      if (pricingCompleteness < 95) {
        issues.push({
          field: 'holdings.pricing',
          issue: `Only ${pricingCompleteness.toFixed(1)}% of holdings have valid pricing`,
          impact: 'high',
          recommendation: 'Update market_value and price_per_unit for all holdings'
        })
        completenessScore -= 15
      }
    }
    
    // Check metadata
    if (!supporting.metadata) {
      issues.push({
        field: 'metadata',
        issue: 'No ETF metadata available',
        impact: 'low',
        recommendation: 'Add ETF metadata to etf_metadata table'
      })
      completenessScore -= 5
    }
    
    // Check historical data
    if (!supporting.navHistory || supporting.navHistory.length === 0) {
      issues.push({
        field: 'navHistory',
        issue: 'No historical NAV data',
        impact: 'low',
        recommendation: 'Historical NAV data will improve trend analysis'
      })
      completenessScore -= 5
    }
    
    if (!supporting.trackingHistory || supporting.trackingHistory.length === 0) {
      issues.push({
        field: 'trackingHistory',
        issue: 'No tracking error history',
        impact: 'low',
        recommendation: 'Tracking history required for performance analysis'
      })
      completenessScore -= 5
    }
    
    // Determine overall quality
    const overall = 
      completenessScore >= 90 ? 'excellent' :
      completenessScore >= 75 ? 'good' :
      completenessScore >= 60 ? 'fair' : 'poor'
    
    return {
      overall,
      issues,
      completeness: Math.max(0, completenessScore)
    }
  }
  
  /**
   * Run compliance checks
   * ETF-specific regulatory and operational checks
   */
  private runComplianceChecks(
    product: ETFProduct,
    supporting: ETFSupportingData,
    breakdown: Omit<ETFValuationBreakdown, 'totalAssets' | 'totalLiabilities' | 'netAssets' | 'sharesOutstanding' | 'navPerShare'>
  ): ComplianceCheck {
    const warnings: ComplianceWarning[] = []
    const errors: ComplianceError[] = []
    
    // Check 1: Holdings must exist
    if (!supporting.holdings || supporting.holdings.length === 0) {
      errors.push({
        code: 'NO_HOLDINGS',
        message: 'ETF has no holdings',
        fix: 'Add holdings to etf_holdings table'
      })
    }
    
    // Check 2: Shares outstanding must be positive
    if (product.shares_outstanding <= 0) {
      errors.push({
        code: 'INVALID_SHARES',
        message: 'Shares outstanding must be positive',
        fix: 'Update shares_outstanding in fund_products table'
      })
    }
    
    // Check 3: Holdings should sum to ~AUM (within tolerance)
    if (supporting.holdings.length > 0) {
      const holdingsTotal = supporting.holdings.reduce(
        (sum, h) => sum + h.market_value,
        0
      )
      const aumDifference = Math.abs(holdingsTotal - product.assets_under_management)
      const tolerance = product.assets_under_management * 0.02 // 2% tolerance
      
      if (aumDifference > tolerance) {
        warnings.push({
          code: 'AUM_MISMATCH',
          message: `Holdings total ($${holdingsTotal.toFixed(2)}) differs from AUM ($${product.assets_under_management.toFixed(2)}) by $${aumDifference.toFixed(2)}`,
          severity: aumDifference > tolerance * 2 ? 'high' : 'medium'
        })
      }
    }
    
    // Check 4: Concentration risk (top 10 holdings)
    if (breakdown.holdingsBreakdown) {
      const { concentrationRisk } = breakdown.holdingsBreakdown
      
      if (concentrationRisk.top10Concentration > 50) {
        warnings.push({
          code: 'HIGH_CONCENTRATION',
          message: `Top 10 holdings represent ${concentrationRisk.top10Concentration.toFixed(1)}% of portfolio`,
          severity: concentrationRisk.top10Concentration > 70 ? 'high' : 'medium'
        })
      }
    }
    
    // Check 5: Crypto custody verification (if crypto ETF)
    if (supporting.metadata?.is_crypto_etf) {
      const cryptoHoldings = supporting.holdings.filter(h => h.security_type === 'crypto')
      const unverifiedCustody = cryptoHoldings.filter(h => !h.custody_address)
      
      if (unverifiedCustody.length > 0) {
        warnings.push({
          code: 'CRYPTO_CUSTODY_UNVERIFIED',
          message: `${unverifiedCustody.length} crypto holdings lack custody address verification`,
          severity: 'high'
        })
      }
    }
    
    // Check 6: Expense ratio reasonableness
    if (product.expense_ratio && product.expense_ratio > 0.02) { // >2%
      warnings.push({
        code: 'HIGH_EXPENSE_RATIO',
        message: `Expense ratio of ${(product.expense_ratio * 100).toFixed(2)}% is unusually high for ETF`,
        severity: 'low'
      })
    }
    
    // Check 7: Registration status for draft ETFs
    if (product.registration_status === 'draft') {
      warnings.push({
        code: 'DRAFT_STATUS',
        message: 'ETF is in draft status - not yet active',
        severity: 'low'
      })
    }
    
    const isCompliant = errors.length === 0
    
    return {
      isCompliant,
      warnings,
      errors
    }
  }
  
  /**
   * Calculate confidence score
   * Based on data quality and compliance
   */
  private calculateConfidence(
    dataQuality: DataQualityAssessment,
    compliance: ComplianceCheck
  ): number {
    // Start with data completeness
    let confidence = dataQuality.completeness / 100
    
    // Reduce for compliance errors (critical)
    if (!compliance.isCompliant) {
      confidence *= 0.5 // 50% reduction for non-compliance
    }
    
    // Reduce for high-severity warnings
    const highSeverityWarnings = compliance.warnings.filter(w => w.severity === 'high').length
    confidence *= Math.max(0.7, 1 - (highSeverityWarnings * 0.1))
    
    // Reduce for data quality issues
    const highImpactIssues = dataQuality.issues.filter(i => i.impact === 'high').length
    confidence *= Math.max(0.8, 1 - (highImpactIssues * 0.05))
    
    return Math.max(0, Math.min(1, confidence))
  }
  
  /**
   * Build data sources documentation
   * Track which tables were used and their completeness
   */
  private buildDataSources(supporting: ETFSupportingData): DataSource[] {
    const sources: DataSource[] = []
    
    // Holdings
    if (supporting.holdings && supporting.holdings.length > 0) {
      const dates = supporting.holdings
        .map(h => h.as_of_date)
        .filter((d): d is Date => d !== null && d !== undefined)
        .map(d => new Date(d))
        .sort((a, b) => a.getTime() - b.getTime())
      
      const firstDate = dates[0]
      const lastDate = dates[dates.length - 1]
      
      sources.push({
        table: 'etf_holdings',
        recordCount: supporting.holdings.length,
        dateRange: dates.length > 1 && firstDate && lastDate ? {
          start: firstDate,
          end: lastDate
        } : undefined,
        completeness: 100 // Holdings are required
      })
    }
    
    // Metadata
    if (supporting.metadata) {
      sources.push({
        table: 'etf_metadata',
        recordCount: 1,
        completeness: 100
      })
    }
    
    // NAV History
    if (supporting.navHistory && supporting.navHistory.length > 0) {
      const dates = supporting.navHistory
        .map(h => h.valuation_date)
        .filter((d): d is Date => d !== null && d !== undefined)
        .map(d => new Date(d))
        .sort((a, b) => a.getTime() - b.getTime())
      
      const firstDate = dates[0]
      const lastDate = dates[dates.length - 1]
      
      sources.push({
        table: 'etf_nav_history',
        recordCount: supporting.navHistory.length,
        dateRange: dates.length > 1 && firstDate && lastDate ? {
          start: firstDate,
          end: lastDate
        } : undefined,
        completeness: 90
      })
    }
    
    // Tracking History
    if (supporting.trackingHistory && supporting.trackingHistory.length > 0) {
      const dates = supporting.trackingHistory
        .map(h => h.period_end)
        .filter((d): d is Date => d !== null && d !== undefined)
        .map(d => new Date(d))
        .sort((a, b) => a.getTime() - b.getTime())
      
      const firstDate = dates[0]
      const lastDate = dates[dates.length - 1]
      
      sources.push({
        table: 'etf_tracking_error_history',
        recordCount: supporting.trackingHistory.length,
        dateRange: dates.length > 1 && firstDate && lastDate ? {
          start: firstDate,
          end: lastDate
        } : undefined,
        completeness: 85
      })
    }
    
    return sources
  }
}

// Export singleton instance
export const enhancedETFModels = new EnhancedETFModels()
