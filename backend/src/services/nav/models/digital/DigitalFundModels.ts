/**
 * Digital Fund Models
 * Automated NAV computation for tokenized funds
 * As per NAV Pricing - Digital Asset Products specification
 */

import { Decimal } from 'decimal.js'

/**
 * Mint/Burn event parameters
 */
export interface MintBurnParams {
  currentSupply: Decimal
  assetChange: Decimal
  pricePerToken: Decimal
  feeRate?: Decimal
}

/**
 * Redemption calculation result
 */
export interface RedemptionResult {
  grossAmount: Decimal
  fees: Decimal
  netAmount: Decimal
  slippageAdjustment: Decimal
  exchangeRate: Decimal
}

/**
 * NAV calculation result with detailed breakdown
 */
export interface NAVResult {
  totalAssets: Decimal
  liabilities: Decimal
  outstandingTokens: Decimal
  navPerToken: Decimal
  timestamp: Date
  isValid: boolean
}

/**
 * Amortized cost parameters for MMF
 */
export interface AmortizedCostParams {
  purchasePrice: Decimal
  parValue: Decimal
  daysToMaturity: number
  daysSincePurchase: number
  yieldRate?: Decimal
}

/**
 * Digital Fund Models class
 * Implements automated NAV computation and token operations
 */
export class DigitalFundModels {
  private readonly DEFAULT_FEE_RATE = new Decimal(0.005) // 0.5% default fee
  private readonly MIN_NAV = new Decimal(0.0001) // Minimum NAV to prevent division issues
  private readonly MAX_SLIPPAGE = new Decimal(0.05) // 5% maximum slippage
  
  /**
   * Calculate tokenized NAV per token
   * Spec: "Core Formula: NAV = (Total Assets - Liabilities) / Outstanding Tokens"
   * 
   * @param totalAssets - Total fund assets value
   * @param liabilities - Total liabilities
   * @param outstandingTokens - Current token supply
   * @returns NAV per token
   */
  public calculateTokenizedNAV(
    totalAssets: number,
    liabilities: number,
    outstandingTokens: number
  ): Decimal {
    const assetsDecimal = new Decimal(totalAssets)
    const liabilitiesDecimal = new Decimal(liabilities)
    const tokensDecimal = new Decimal(outstandingTokens)
    
    // Prevent division by zero
    if (tokensDecimal.isZero() || tokensDecimal.lessThan(this.MIN_NAV)) {
      return new Decimal(0)
    }
    
    // NAV = (Assets - Liabilities) / Tokens
    const nav = assetsDecimal.minus(liabilitiesDecimal).dividedBy(tokensDecimal)
    
    // Ensure non-negative NAV
    return Decimal.max(nav, new Decimal(0))
  }

  /**
   * Adjust token supply for mint/burn events
   * Spec: "Automatic mint/burn based on deposits"
   * 
   * @param currentSupply - Current token supply
   * @param assetChange - Change in assets (positive for deposit, negative for withdrawal)
   * @param pricePerToken - Current NAV per token
   * @param feeRate - Fee rate for mint/burn operations
   * @returns New token supply after adjustment
   */
  public adjustTokenSupply(
    currentSupply: number,
    assetChange: number,
    pricePerToken: number,
    feeRate: number = 0.005
  ): Decimal {
    const supplyDecimal = new Decimal(currentSupply)
    const changeDecimal = new Decimal(assetChange)
    const priceDecimal = new Decimal(pricePerToken)
    const feeDecimal = new Decimal(feeRate)
    
    // Calculate tokens to mint/burn based on asset change
    if (priceDecimal.isZero() || priceDecimal.lessThan(this.MIN_NAV)) {
      return supplyDecimal // No change if price is invalid
    }
    
    // For deposits (positive change): mint tokens
    // For withdrawals (negative change): burn tokens
    let tokenAdjustment: Decimal
    
    if (changeDecimal.greaterThan(0)) {
      // Minting: Apply fee to deposited amount
      const netDeposit = changeDecimal.times(new Decimal(1).minus(feeDecimal))
      tokenAdjustment = netDeposit.dividedBy(priceDecimal)
    } else {
      // Burning: Apply fee to withdrawn tokens
      const tokensToRedeem = changeDecimal.abs().dividedBy(priceDecimal)
      tokenAdjustment = tokensToRedeem.times(new Decimal(1).plus(feeDecimal)).negated()
    }
    
    // Calculate new supply
    const newSupply = supplyDecimal.plus(tokenAdjustment)
    
    // Ensure non-negative supply
    return Decimal.max(newSupply, new Decimal(0))
  }

  /**
   * Calculate redemption rate with slippage adjustment
   * Spec: "Redemption Exchange Rates: Rate = NAV per Token * Quantity, with slippage"
   * 
   * @param navPerToken - Current NAV per token
   * @param quantity - Number of tokens to redeem
   * @param slippage - Slippage percentage (0-1)
   * @param feeRate - Redemption fee rate
   * @param poolDepth - Liquidity pool depth for slippage calculation
   * @returns Redemption details including net amount
   */
  public calculateRedemptionRate(
    navPerToken: number,
    quantity: number,
    slippage: number = 0,
    feeRate: number = 0.005,
    poolDepth?: number
  ): RedemptionResult {
    const navDecimal = new Decimal(navPerToken)
    const quantityDecimal = new Decimal(quantity)
    const slippageDecimal = new Decimal(Math.min(Math.max(slippage, 0), this.MAX_SLIPPAGE.toNumber()))
    const feeDecimal = new Decimal(feeRate)
    
    // Calculate gross redemption amount
    const grossAmount = navDecimal.times(quantityDecimal)
    
    // Calculate slippage adjustment based on pool depth if provided
    let slippageAdjustment: Decimal
    if (poolDepth !== undefined && poolDepth > 0) {
      const poolDecimal = new Decimal(poolDepth)
      const impactRatio = quantityDecimal.dividedBy(poolDecimal)
      // Quadratic slippage model for large redemptions
      slippageAdjustment = grossAmount.times(impactRatio.pow(2)).times(slippageDecimal)
    } else {
      // Linear slippage model
      slippageAdjustment = grossAmount.times(slippageDecimal)
    }
    
    // Calculate fees
    const fees = grossAmount.times(feeDecimal)
    
    // Calculate net amount
    const netAmount = grossAmount.minus(fees).minus(slippageAdjustment)
    
    // Calculate effective exchange rate
    const exchangeRate = quantityDecimal.isZero() 
      ? new Decimal(0)
      : netAmount.dividedBy(quantityDecimal)
    
    return {
      grossAmount,
      fees,
      netAmount: Decimal.max(netAmount, new Decimal(0)),
      slippageAdjustment,
      exchangeRate
    }
  }

  /**
   * Amortized cost valuation for MMF assets
   * Spec: "Amortized cost assumes par value at maturity with linear accrual"
   * 
   * @param purchasePrice - Price paid for the asset
   * @param parValue - Par value at maturity
   * @param daysToMaturity - Total days to maturity from purchase
   * @param daysSincePurchase - Days elapsed since purchase
   * @param yieldRate - Optional yield rate for more accurate calculation
   * @returns Current amortized value
   */
  public amortizedCostValuation(
    purchasePrice: number,
    parValue: number,
    daysToMaturity: number,
    daysSincePurchase: number = 0,
    yieldRate?: number
  ): Decimal {
    const purchaseDecimal = new Decimal(purchasePrice)
    const parDecimal = new Decimal(parValue)
    const totalDays = new Decimal(Math.max(daysToMaturity, 1))
    const elapsedDays = new Decimal(Math.min(daysSincePurchase, daysToMaturity))
    
    if (yieldRate !== undefined) {
      // Use yield rate for more accurate calculation
      const rate = new Decimal(yieldRate)
      const timeElapsed = elapsedDays.dividedBy(365)
      const accruedInterest = purchaseDecimal.times(rate).times(timeElapsed)
      return purchaseDecimal.plus(accruedInterest)
    } else {
      // Linear accrual from purchase price to par value
      const discount = parDecimal.minus(purchaseDecimal)
      const dailyAccrual = discount.dividedBy(totalDays)
      const accruedAmount = dailyAccrual.times(elapsedDays)
      
      return purchaseDecimal.plus(accruedAmount)
    }
  }

  /**
   * Comprehensive NAV calculation with validation
   * Spec: "On-Chain NAV Computation Smart Contracts"
   * 
   * @param totalAssets - Total assets value
   * @param liabilities - Total liabilities
   * @param outstandingTokens - Token supply
   * @param includeValidation - Whether to perform validation checks
   * @returns Detailed NAV result
   */
  public computeComprehensiveNAV(
    totalAssets: number,
    liabilities: number,
    outstandingTokens: number,
    includeValidation: boolean = true
  ): NAVResult {
    const assetsDecimal = new Decimal(totalAssets)
    const liabilitiesDecimal = new Decimal(liabilities)
    const tokensDecimal = new Decimal(outstandingTokens)
    
    // Calculate NAV per token
    const navPerToken = this.calculateTokenizedNAV(totalAssets, liabilities, outstandingTokens)
    
    // Validation checks
    let isValid = true
    if (includeValidation) {
      // Check for negative NAV
      if (assetsDecimal.lessThan(liabilitiesDecimal)) {
        isValid = false
      }
      // Check for zero or negative tokens
      if (tokensDecimal.lessThanOrEqualTo(0)) {
        isValid = false
      }
      // Check for unreasonably high NAV (potential calculation error)
      if (navPerToken.greaterThan(1000000)) {
        isValid = false
      }
    }
    
    return {
      totalAssets: assetsDecimal,
      liabilities: liabilitiesDecimal,
      outstandingTokens: tokensDecimal,
      navPerToken,
      timestamp: new Date(),
      isValid
    }
  }

  /**
   * Calculate token price impact for large transactions
   * Used for determining slippage and market impact
   * 
   * @param transactionSize - Size of the transaction
   * @param poolLiquidity - Total pool liquidity
   * @param priceElasticity - Price elasticity coefficient
   * @returns Price impact percentage
   */
  public calculatePriceImpact(
    transactionSize: number,
    poolLiquidity: number,
    priceElasticity: number = 2
  ): Decimal {
    const sizeDecimal = new Decimal(transactionSize)
    const liquidityDecimal = new Decimal(poolLiquidity)
    const elasticityDecimal = new Decimal(priceElasticity)
    
    if (liquidityDecimal.isZero()) {
      return new Decimal(1) // 100% impact if no liquidity
    }
    
    // Impact = (size / liquidity) ^ elasticity
    const ratio = sizeDecimal.dividedBy(liquidityDecimal)
    const impact = ratio.pow(elasticityDecimal)
    
    // Cap at 100% impact
    return Decimal.min(impact, new Decimal(1))
  }

  /**
   * Handle edge cases like negative NAV with circuit breakers
   * Spec: "If NAV turns negative, trigger circuit breakers to halt redemptions"
   * 
   * @param nav - Current NAV
   * @param volatility - Market volatility indicator
   * @param liquidityRatio - Current liquidity ratio
   * @returns Circuit breaker decision and actions
   */
  public evaluateCircuitBreaker(
    nav: number,
    volatility: number,
    liquidityRatio: number
  ): {
    shouldHalt: boolean
    haltRedemptions: boolean
    haltMinting: boolean
    reason: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  } {
    const navDecimal = new Decimal(nav)
    const volatilityDecimal = new Decimal(volatility)
    const liquidityDecimal = new Decimal(liquidityRatio)
    
    let shouldHalt = false
    let haltRedemptions = false
    let haltMinting = false
    let reason = 'Normal operations'
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
    
    // Check for negative NAV
    if (navDecimal.lessThanOrEqualTo(0)) {
      shouldHalt = true
      haltRedemptions = true
      haltMinting = true
      reason = 'NAV is negative or zero'
      severity = 'critical'
    }
    // Check for extreme volatility
    else if (volatilityDecimal.greaterThan(0.5)) {
      haltRedemptions = true
      reason = 'Extreme market volatility detected'
      severity = 'high'
    }
    // Check for low liquidity
    else if (liquidityDecimal.lessThan(0.1)) {
      haltRedemptions = true
      reason = 'Insufficient liquidity'
      severity = 'medium'
    }
    // Check for rapid NAV decline
    else if (navDecimal.lessThan(0.5)) {
      haltMinting = true
      reason = 'NAV below safety threshold'
      severity = 'medium'
    }
    
    return {
      shouldHalt,
      haltRedemptions,
      haltMinting,
      reason,
      severity
    }
  }
}

// Export singleton instance
export const digitalFundModels = new DigitalFundModels()
