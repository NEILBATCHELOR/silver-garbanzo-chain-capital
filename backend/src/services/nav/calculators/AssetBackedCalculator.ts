/**
 * AssetBackedCalculator - NAV calculation for asset-backed securities
 * 
 * Handles:
 * - Underlying asset valuation and appraisal methods
 * - Tranching and waterfall calculations
 * - Credit enhancement factors and subordination
 * - Delinquency and default rate analysis
 * - Recovery rate and loss severity calculations
 * - Prepayment and extension risk modeling
 * - Credit rating impact on valuations
 * - Servicer performance and cash flow timing
 * 
 * Supports asset-backed products from asset_backed_products table
 */

import { Decimal } from 'decimal.js'
import { BaseCalculator, CalculatorOptions } from './BaseCalculator'
import {
  AssetType,
  CalculationInput,
  CalculationResult,
  CalculationStatus,
  PriceData,
  NavServiceResult,
  ValidationSeverity,
  MarketDataProvider
} from '../types'

export interface AssetBackedCalculationInput extends CalculationInput {
  // Asset-backed security specific parameters
  assetNumber?: string
  assetType?: string
  originalAmount?: number
  currentBalance?: number
  maturityDate?: Date
  interestRate?: number
  accrualType?: string
  lienPosition?: string
  paymentFrequency?: string
  delinquencyStatus?: number
  modificationIndicator?: boolean
  prepaymentPenalty?: number
  creditQuality?: string
  recoveryRate?: number
  servicerName?: string
  poolSize?: number
  subordinationLevel?: number
  creditEnhancement?: number
}

export interface AssetBackedPriceData extends PriceData {
  underlyingAssetValue: number
  creditSpread: number
  discountRate: number
  prepaymentSpeed: number
  defaultRate: number
  lossGivenDefault: number
  recoveryRate: number
  servicingFee: number
  trancheRating: string
  liquidityPremium: number
  durationRisk: number
}

export interface CashFlowProjection {
  date: Date
  principalPayment: number
  interestPayment: number
  prepaymentAmount: number
  defaultAmount: number
  recoveryAmount: number
  servicingFee: number
  netCashFlow: number
}

export interface CreditMetrics {
  weightedAverageLife: number
  duration: number
  convexity: number
  creditSpread: number
  probabilityOfDefault: number
  lossGivenDefault: number
  expectedLoss: number
  unexpectedLoss: number
  economicCapital: number
}

export interface TranchingStructure {
  trancheId: string
  seniority: number
  originalSize: number
  currentSize: number
  rating: string
  coupon: number
  attachment: number
  detachment: number
  enhancement: number
}

export class AssetBackedCalculator extends BaseCalculator {
  constructor(options: CalculatorOptions = {}) {
    super(options)
  }

  // ==================== ABSTRACT METHOD IMPLEMENTATIONS ====================

  canHandle(input: CalculationInput): boolean {
    if (!input.productType) return false
    
    const supportedTypes = this.getAssetTypes()
    return supportedTypes.includes(input.productType as AssetType)
  }

  getAssetTypes(): AssetType[] {
    return [AssetType.ASSET_BACKED]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const assetBackedInput = input as AssetBackedCalculationInput
      
      // Get asset-backed product details from database
      const productDetails = await this.getAssetBackedProductDetails(assetBackedInput)
      
      // Calculate underlying asset values
      const underlyingValue = await this.calculateUnderlyingAssetValue(assetBackedInput, productDetails)
      
      // Generate cash flow projections
      const cashFlowProjections = await this.generateCashFlowProjections(productDetails, underlyingValue)
      
      // Calculate credit metrics and risk adjustments
      const creditMetrics = await this.calculateCreditMetrics(productDetails, cashFlowProjections)
      
      // Apply tranching and subordination effects
      const tranchingAdjustment = await this.applyTranchingStructure(
        productDetails, 
        creditMetrics, 
        assetBackedInput
      )
      
      // Calculate present value of cash flows
      const presentValue = await this.calculatePresentValue(cashFlowProjections, creditMetrics)
      
      // Apply liquidity and market adjustments
      const marketAdjustments = await this.calculateMarketAdjustments(
        presentValue, 
        productDetails, 
        creditMetrics
      )
      
      // Calculate final NAV
      const finalNAV = presentValue.plus(tranchingAdjustment).minus(marketAdjustments.totalAdjustments)
      
      // Build calculation result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `abs_${productDetails.assetNumber}`,
        productType: AssetType.ASSET_BACKED,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(presentValue.plus(tranchingAdjustment)),
        totalLiabilities: this.toNumber(marketAdjustments.totalAdjustments),
        netAssets: this.toNumber(finalNAV),
        navValue: this.toNumber(finalNAV),
        navPerShare: input.sharesOutstanding ? 
          this.toNumber(finalNAV.div(this.decimal(input.sharesOutstanding))) : 
          undefined,
        currency: input.targetCurrency || 'USD',
        pricingSources: this.buildPricingSources(underlyingValue, creditMetrics, marketAdjustments),
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown asset-backed calculation error',
        code: 'ASSET_BACKED_CALCULATION_FAILED'
      }
    }
  }

  // ==================== ASSET-BACKED SPECIFIC METHODS ====================

  /**
   * Fetches asset-backed product details from database
   */
  private async getAssetBackedProductDetails(input: AssetBackedCalculationInput): Promise<any> {
    // Mock implementation - replace with actual database query
    return {
      id: input.assetId,
      assetNumber: input.assetNumber || 'ABS001',
      assetType: input.assetType || 'mortgage',
      originationDate: new Date('2020-01-01'),
      originalAmount: input.originalAmount || 1000000,
      currentBalance: input.currentBalance || 800000,
      maturityDate: input.maturityDate || new Date('2030-01-01'),
      interestRate: input.interestRate || 0.045,
      accrualType: input.accrualType || 'simple',
      lienPosition: input.lienPosition || 'first',
      paymentFrequency: input.paymentFrequency || 'monthly',
      delinquencyStatus: input.delinquencyStatus || 0,
      modificationIndicator: input.modificationIndicator || false,
      prepaymentPenalty: input.prepaymentPenalty || 0.02,
      debtorCreditQuality: input.creditQuality || 'prime',
      recoveryRatePercentage: input.recoveryRate || 0.70,
      collectionPeriodDays: 30,
      diversificationMetrics: 'high',
      servicerRating: 'A',
      poolCharacteristics: {
        size: input.poolSize || 100000000,
        numberOfLoans: 500,
        averageLoanSize: 200000,
        weightedAverageCoupon: 0.045,
        weightedAverageMaturity: 180 // months
      },
      tranchingStructure: [
        {
          trancheId: 'Senior',
          seniority: 1,
          originalSize: 800000000,
          currentSize: 640000000,
          rating: 'AAA',
          coupon: 0.035,
          attachment: 0.80,
          detachment: 1.00,
          enhancement: 0.20
        },
        {
          trancheId: 'Mezzanine',
          seniority: 2,
          originalSize: 150000000,
          currentSize: 120000000,
          rating: 'BBB',
          coupon: 0.055,
          attachment: 0.65,
          detachment: 0.80,
          enhancement: 0.35
        },
        {
          trancheId: 'Equity',
          seniority: 3,
          originalSize: 50000000,
          currentSize: 40000000,
          rating: 'NR',
          coupon: 0.00, // Residual
          attachment: 0.00,
          detachment: 0.65,
          enhancement: 0.00
        }
      ]
    }
  }

  /**
   * Calculates the value of underlying assets
   */
  private async calculateUnderlyingAssetValue(
    input: AssetBackedCalculationInput,
    productDetails: any
  ): Promise<{
    grossValue: Decimal
    adjustments: Decimal
    netValue: Decimal
    appraisalMethod: string
  }> {
    const currentBalance = this.decimal(productDetails.currentBalance)
    
    // Apply mark-to-market adjustments based on asset type
    let markToMarketAdjustment = this.decimal(1.0)
    
    switch (productDetails.assetType.toLowerCase()) {
      case 'mortgage':
        // Real estate price appreciation/depreciation
        markToMarketAdjustment = this.decimal(1.05) // 5% appreciation
        break
      case 'auto':
        // Vehicle depreciation
        markToMarketAdjustment = this.decimal(0.85) // 15% depreciation
        break
      case 'equipment':
        // Equipment depreciation
        markToMarketAdjustment = this.decimal(0.80) // 20% depreciation
        break
      default:
        markToMarketAdjustment = this.decimal(0.95) // Conservative 5% discount
    }
    
    const grossValue = currentBalance.mul(markToMarketAdjustment)
    
    // Apply adjustments for delinquency and credit quality
    const delinquencyAdjustment = this.calculateDelinquencyAdjustment(
      productDetails.delinquencyStatus,
      productDetails.debtorCreditQuality
    )
    
    const adjustments = grossValue.mul(delinquencyAdjustment)
    const netValue = grossValue.minus(adjustments)
    
    return {
      grossValue,
      adjustments,
      netValue,
      appraisalMethod: 'mark_to_market_with_adjustments'
    }
  }

  /**
   * Calculates delinquency adjustment factor
   */
  private calculateDelinquencyAdjustment(delinquencyStatus: number, creditQuality: string): Decimal {
    let baseAdjustment = this.decimal(0.0)
    
    // Delinquency status adjustments (days past due)
    if (delinquencyStatus >= 30 && delinquencyStatus < 60) {
      baseAdjustment = this.decimal(0.05) // 5% adjustment
    } else if (delinquencyStatus >= 60 && delinquencyStatus < 90) {
      baseAdjustment = this.decimal(0.15) // 15% adjustment
    } else if (delinquencyStatus >= 90) {
      baseAdjustment = this.decimal(0.30) // 30% adjustment
    }
    
    // Credit quality multiplier
    const creditMultipliers: Record<string, number> = {
      'super_prime': 0.5,
      'prime': 0.7,
      'near_prime': 1.0,
      'subprime': 1.5,
      'deep_subprime': 2.0
    }
    
    const multiplier = this.decimal(creditMultipliers[creditQuality.toLowerCase()] || 1.0)
    
    return baseAdjustment.mul(multiplier)
  }

  /**
   * Generates cash flow projections for the asset pool
   */
  private async generateCashFlowProjections(
    productDetails: any,
    underlyingValue: any
  ): Promise<CashFlowProjection[]> {
    const projections: CashFlowProjection[] = []
    const monthsToMaturity = Math.ceil(
      (productDetails.maturityDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)
    )
    
    let remainingBalance = this.decimal(productDetails.currentBalance)
    const monthlyRate = this.decimal(productDetails.interestRate).div(this.decimal(12))
    const prepaymentRate = this.decimal(0.005) // 0.5% monthly prepayment
    const defaultRate = this.decimal(0.001) // 0.1% monthly default
    
    for (let month = 1; month <= monthsToMaturity; month++) {
      const date = new Date()
      date.setMonth(date.getMonth() + month)
      
      // Calculate scheduled principal payment
      const scheduledPrincipal = remainingBalance.div(this.decimal(monthsToMaturity - month + 1))
      
      // Calculate interest payment
      const interestPayment = remainingBalance.mul(monthlyRate)
      
      // Calculate prepayments
      const prepaymentAmount = remainingBalance.mul(prepaymentRate)
      
      // Calculate defaults
      const defaultAmount = remainingBalance.mul(defaultRate)
      
      // Calculate recovery
      const recoveryAmount = defaultAmount.mul(this.decimal(productDetails.recoveryRatePercentage))
      
      // Calculate servicing fee (typically 0.25-0.50% annually)
      const servicingFee = remainingBalance.mul(this.decimal(0.0025).div(this.decimal(12)))
      
      const netCashFlow = scheduledPrincipal
        .plus(interestPayment)
        .plus(prepaymentAmount)
        .plus(recoveryAmount)
        .minus(servicingFee)
      
      projections.push({
        date,
        principalPayment: this.toNumber(scheduledPrincipal),
        interestPayment: this.toNumber(interestPayment),
        prepaymentAmount: this.toNumber(prepaymentAmount),
        defaultAmount: this.toNumber(defaultAmount),
        recoveryAmount: this.toNumber(recoveryAmount),
        servicingFee: this.toNumber(servicingFee),
        netCashFlow: this.toNumber(netCashFlow)
      })
      
      // Update remaining balance
      remainingBalance = remainingBalance
        .minus(scheduledPrincipal)
        .minus(prepaymentAmount)
        .minus(defaultAmount)
      
      if (remainingBalance.lte(0)) break
    }
    
    return projections
  }

  /**
   * Calculates credit metrics and risk measures
   */
  private async calculateCreditMetrics(
    productDetails: any,
    cashFlows: CashFlowProjection[]
  ): Promise<CreditMetrics> {
    // Calculate weighted average life
    let weightedCashFlows = 0
    let totalCashFlows = 0
    
    cashFlows.forEach((cf, index) => {
      const monthsOut = index + 1
      weightedCashFlows += cf.principalPayment * monthsOut
      totalCashFlows += cf.principalPayment
    })
    
    const weightedAverageLife = totalCashFlows > 0 ? weightedCashFlows / totalCashFlows / 12 : 0
    
    // Credit spread based on rating and asset type
    const creditSpreads: Record<string, number> = {
      'AAA': 0.005,
      'AA': 0.008,
      'A': 0.015,
      'BBB': 0.025,
      'BB': 0.050,
      'B': 0.100,
      'CCC': 0.200,
      'NR': 0.150
    }
    
    const tranche = productDetails.tranchingStructure[0] // Use senior tranche
    const creditSpread = creditSpreads[tranche.rating] || 0.050
    
    return {
      weightedAverageLife,
      duration: weightedAverageLife * 0.8, // Approximate modified duration
      convexity: 0.05, // Simplified convexity
      creditSpread,
      probabilityOfDefault: 0.02, // 2% PD
      lossGivenDefault: 0.30, // 30% LGD
      expectedLoss: 0.02 * 0.30, // PD * LGD
      unexpectedLoss: 0.015, // Statistical measure
      economicCapital: 0.025 // Required capital
    }
  }

  /**
   * Applies tranching structure and subordination effects
   */
  private async applyTranchingStructure(
    productDetails: any,
    creditMetrics: CreditMetrics,
    input: AssetBackedCalculationInput
  ): Promise<Decimal> {
    // Determine which tranche we're valuing (default to senior)
    const targetTranche = productDetails.tranchingStructure[0]
    const subordinationLevel = input.subordinationLevel || targetTranche.enhancement
    
    // Credit enhancement value
    const enhancementValue = this.decimal(subordinationLevel).mul(
      this.decimal(productDetails.poolCharacteristics.size)
    )
    
    // Protection value from subordination
    const protectionValue = enhancementValue.mul(this.decimal(0.1)) // 10% protection benefit
    
    return protectionValue
  }

  /**
   * Calculates present value of projected cash flows
   */
  private async calculatePresentValue(
    cashFlows: CashFlowProjection[],
    creditMetrics: CreditMetrics
  ): Promise<Decimal> {
    const discountRate = this.decimal(0.05 + creditMetrics.creditSpread) // Risk-free + spread
    const monthlyRate = discountRate.div(this.decimal(12))
    
    let presentValue = this.decimal(0)
    
    cashFlows.forEach((cf, index) => {
      const discountFactor = this.decimal(1).div(
        this.decimal(1).plus(monthlyRate).pow(this.decimal(index + 1))
      )
      
      const discountedCashFlow = this.decimal(cf.netCashFlow).mul(discountFactor)
      presentValue = presentValue.plus(discountedCashFlow)
    })
    
    return presentValue
  }

  /**
   * Calculates market and liquidity adjustments
   */
  private async calculateMarketAdjustments(
    presentValue: Decimal,
    productDetails: any,
    creditMetrics: CreditMetrics
  ): Promise<{
    liquidityDiscount: Decimal
    marketRiskAdjustment: Decimal
    totalAdjustments: Decimal
  }> {
    // Liquidity discount based on asset type and tranche rating
    const liquidityDiscount = presentValue.mul(this.decimal(0.02)) // 2% liquidity discount
    
    // Market risk adjustment for credit spread volatility
    const marketRiskAdjustment = presentValue.mul(this.decimal(creditMetrics.unexpectedLoss))
    
    const totalAdjustments = liquidityDiscount.plus(marketRiskAdjustment)
    
    return {
      liquidityDiscount,
      marketRiskAdjustment,
      totalAdjustments
    }
  }

  /**
   * Builds pricing sources object
   */
  private buildPricingSources(
    underlyingValue: any,
    creditMetrics: CreditMetrics,
    marketAdjustments: any
  ): Record<string, PriceData> {
    return {
      underlying_assets: {
        price: this.toNumber(underlyingValue.netValue),
        currency: 'USD',
        asOf: new Date(),
        source: 'appraisal_valuation'
      },
      credit_spread: {
        price: creditMetrics.creditSpread,
        currency: 'USD',
        asOf: new Date(),
        source: 'credit_rating_model'
      },
      liquidity_adjustment: {
        price: this.toNumber(marketAdjustments.liquidityDiscount),
        currency: 'USD',
        asOf: new Date(),
        source: 'market_liquidity_model'
      }
    }
  }

  /**
   * Validates asset-backed specific input parameters
   */
  protected override validateInput(input: CalculationInput): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    severity: ValidationSeverity
  } {
    const baseValidation = super.validateInput(input)
    const assetBackedInput = input as AssetBackedCalculationInput
    
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    // Validate asset-backed specific parameters
    if (assetBackedInput.originalAmount !== undefined && assetBackedInput.originalAmount <= 0) {
      errors.push('Original amount must be positive')
    }

    if (assetBackedInput.currentBalance !== undefined && assetBackedInput.currentBalance < 0) {
      errors.push('Current balance cannot be negative')
    }

    if (assetBackedInput.originalAmount && assetBackedInput.currentBalance &&
        assetBackedInput.currentBalance > assetBackedInput.originalAmount) {
      errors.push('Current balance cannot exceed original amount')
    }

    if (assetBackedInput.interestRate !== undefined && assetBackedInput.interestRate < 0) {
      errors.push('Interest rate cannot be negative')
    }

    if (assetBackedInput.recoveryRate !== undefined && 
        (assetBackedInput.recoveryRate < 0 || assetBackedInput.recoveryRate > 1)) {
      errors.push('Recovery rate must be between 0 and 1')
    }

    if (assetBackedInput.delinquencyStatus !== undefined && assetBackedInput.delinquencyStatus < 0) {
      errors.push('Delinquency status cannot be negative')
    }

    // Date validations
    if (assetBackedInput.maturityDate && assetBackedInput.maturityDate <= input.valuationDate) {
      warnings.push('Asset has matured - using expired asset pricing')
    }

    // Add warnings for missing optional data
    if (!assetBackedInput.creditQuality) {
      warnings.push('No credit quality specified - using default assumptions')
    }

    if (!assetBackedInput.servicerName) {
      warnings.push('No servicer specified - servicer performance may affect valuation')
    }

    if (assetBackedInput.delinquencyStatus && assetBackedInput.delinquencyStatus > 90) {
      warnings.push('Asset is severely delinquent - increased default risk')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity: errors.length > 0 ? ValidationSeverity.ERROR : 
               warnings.length > 0 ? ValidationSeverity.WARN : 
               ValidationSeverity.INFO
    }
  }

  /**
   * Generates a unique run ID for the calculation
   */
  protected override generateRunId(): string {
    return `abs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
