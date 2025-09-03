/**
 * PrivateDebtCalculator - NAV calculation for Private Credit holdings
 * 
 * Handles:
 * - Private credit loans and direct lending
 * - Covenant tracking and compliance monitoring
 * - Default probability modeling and loss given default (LGD)
 * - Credit risk assessment and rating changes
 * - Accrued interest and payment schedules
 * - Collateral valuation and security analysis
 * - Recovery rate estimation and workout scenarios
 * - Credit spread analysis and mark-to-market
 * - Concentration risk and diversification metrics
 * - Vintage analysis and portfolio seasoning
 * - Liquidity adjustments for private markets
 * - Fee income and origination costs
 * 
 * Supports private debt products from private_debt_products table
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

export interface PrivateDebtCalculationInput extends CalculationInput {
  // Private debt specific parameters
  loanId?: string
  loanType?: string // senior_secured, subordinated, mezzanine, unitranche
  borrowerName?: string
  industry?: string
  origination_date?: Date
  maturityDate?: Date
  principalAmount?: number
  outstandingPrincipal?: number
  interestRate?: number
  paymentFrequency?: string // monthly, quarterly, semi-annual, annual
  loanToValue?: number
  debtServiceCoverageRatio?: number
  collateralType?: string
  collateralValue?: number
  creditRating?: string
  probabilityOfDefault?: number
  lossGivenDefault?: number
  recoveryRate?: number
  covenants?: LoanCovenant[]
  // Portfolio level
  portfolioSpread?: number
  benchmarkRate?: string
  liquidityDiscount?: number
}

export interface LoanDetails {
  loanId: string
  borrowerName: string
  industry: string
  loanType: string
  originationDate: Date
  maturityDate: Date
  principalAmount: number
  outstandingPrincipal: number
  accruedInterest: number
  interestRate: number
  paymentFrequency: string
  nextPaymentDate: Date
  loanToValue: number
  currentLTV: number
  debtServiceCoverageRatio: number
  collateralType: string
  collateralValue: number
  creditRating: string
  internalRating: string
  riskCategory: string
  covenants: LoanCovenant[]
  paymentHistory: PaymentRecord[]
  covenant_compliance: CovenantStatus[]
  lastReview: Date
  watchlistStatus: boolean
}

export interface LoanCovenant {
  covenantType: string // financial, operational, negative
  description: string
  metric: string // debt_to_ebitda, current_ratio, minimum_liquidity
  threshold: number
  testFrequency: string // quarterly, annual, monthly
  lastTestDate: Date
  lastTestValue: number
  compliant: boolean
  breachDate?: Date
  waiver?: boolean
  amendment?: boolean
}

export interface PaymentRecord {
  paymentDate: Date
  scheduledAmount: number
  actualAmount: number
  principalPortion: number
  interestPortion: number
  feesPortion: number
  status: string // on_time, late, missed, partial
  daysLate: number
}

export interface CovenantStatus {
  covenantId: string
  testDate: Date
  actualValue: number
  threshold: number
  compliant: boolean
  marginOfSafety: number
  trend: string // improving, stable, deteriorating
}

export interface CreditRiskAssessment {
  internalRating: string
  externalRating?: string
  probabilityOfDefault: number
  lossGivenDefault: number
  expectedLoss: number
  creditSpread: number
  migrationRisk: number
  recoveryRate: number
  timeToDefault?: number
  stressTestResults: StressTestScenario[]
}

export interface StressTestScenario {
  scenario: string // base, adverse, severely_adverse
  newPD: number
  newLGD: number
  expectedLoss: number
  fairValue: number
  markdownPercentage: number
}

export interface CollateralAnalysis {
  collateralType: string
  currentValue: number
  appraisedValue: number
  appraisalDate: Date
  loanToValue: number
  collateralCoverage: number
  liquidityScore: number
  volatilityScore: number
  recoveryScenarios: RecoveryScenario[]
  haircuts: CollateralHaircut[]
}

export interface RecoveryScenario {
  scenario: string // liquidation, going_concern, fire_sale
  timeframe: number // months
  recoveryRate: number
  recoveryValue: number
  costs: number
  netRecovery: number
}

export interface CollateralHaircut {
  assetClass: string
  standardHaircut: number
  stressHaircut: number
  liquidityAdjustment: number
  concentrationAdjustment: number
  finalHaircut: number
}

export interface PortfolioMetrics {
  totalCommitments: Decimal
  totalOutstanding: Decimal
  weightedAverageRate: number
  weightedAverageLTV: number
  weightedAverageRating: string
  diversificationMetrics: DiversificationMetrics
  concentrationRisk: ConcentrationRisk
  vintageAnalysis: VintageAnalysis
  creditMigration: CreditMigration
}

export interface DiversificationMetrics {
  industryConcentration: Record<string, number>
  geographicConcentration: Record<string, number>
  borrowerConcentration: Record<string, number>
  vintageConcentration: Record<string, number>
  herfindahlIndex: number
}

export interface ConcentrationRisk {
  top5BorrowerExposure: number
  top10BorrowerExposure: number
  largestSectorExposure: number
  singleNameLimit: number
  breaches: ConcentrationBreach[]
}

export interface ConcentrationBreach {
  limitType: string
  currentExposure: number
  limit: number
  excessAmount: number
  borrowerName?: string
  sector?: string
}

export interface VintageAnalysis {
  vintageYear: number
  totalOriginated: number
  totalOutstanding: number
  cumulativeDefaults: number
  cumulativeRecoveries: number
  netLossRate: number
  performanceVsBenchmark: number
}

export interface CreditMigration {
  upgrades: number
  downgrades: number
  stableRatings: number
  migrationMatrix: Record<string, Record<string, number>>
}

export class PrivateDebtCalculator extends BaseCalculator {
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
    return [AssetType.PRIVATE_DEBT]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const pdInput = input as PrivateDebtCalculationInput

      // Get loan details and portfolio data
      const loanDetails = await this.getLoanDetails(pdInput)
      const portfolioMetrics = await this.calculatePortfolioMetrics(pdInput)
      
      // Perform credit risk assessment
      const creditAssessment = await this.performCreditRiskAssessment(loanDetails)
      
      // Calculate collateral and recovery analysis
      const collateralAnalysis = await this.analyzeCollateral(loanDetails)
      
      // Calculate fair value using multiple approaches
      const discountedCashFlowValue = await this.calculateDiscountedCashFlow(loanDetails, creditAssessment)
      const markToMarketValue = await this.calculateMarkToMarket(loanDetails, creditAssessment)
      const recoveryBasedValue = await this.calculateRecoveryBasedValue(loanDetails, collateralAnalysis)
      
      // Reconcile valuations
      const reconciledValue = this.reconcileDebtValuations(
        discountedCashFlowValue,
        markToMarketValue,
        recoveryBasedValue,
        loanDetails
      )
      
      // Apply liquidity and complexity adjustments
      const adjustments = await this.calculatePrivateDebtAdjustments(loanDetails, creditAssessment, pdInput)
      
      // Calculate final NAV
      const grossAssetValue = reconciledValue.fairValue
      const totalLiabilities = adjustments.fundingCosts
        .plus(adjustments.managementFees)
        .plus(adjustments.expectedLosses)
      
      const netAssetValue = grossAssetValue.minus(totalLiabilities)
      
      // Build comprehensive result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `loan_${loanDetails.loanId}`,
        productType: AssetType.PRIVATE_DEBT,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(grossAssetValue),
        totalLiabilities: this.toNumber(totalLiabilities),
        netAssets: this.toNumber(netAssetValue),
        navValue: this.toNumber(netAssetValue),
        currency: input.targetCurrency || 'USD',
        pricingSources: this.buildPrivateDebtPricingSources(
          discountedCashFlowValue,
          markToMarketValue,
          recoveryBasedValue,
          creditAssessment
        ),
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED,
        metadata: {
          loanType: loanDetails.loanType,
          borrowerName: loanDetails.borrowerName,
          industry: loanDetails.industry,
          creditRating: loanDetails.creditRating,
          interestRate: loanDetails.interestRate,
          loanToValue: loanDetails.currentLTV,
          maturityDate: loanDetails.maturityDate,
          covenantCompliance: loanDetails.covenant_compliance.every(c => c.compliant),
          creditMetrics: {
            probabilityOfDefault: creditAssessment.probabilityOfDefault,
            lossGivenDefault: creditAssessment.lossGivenDefault,
            expectedLoss: creditAssessment.expectedLoss,
            creditSpread: creditAssessment.creditSpread,
            recoveryRate: creditAssessment.recoveryRate
          },
          portfolioMetrics: {
            totalOutstanding: this.toNumber(portfolioMetrics.totalOutstanding),
            weightedAverageRate: portfolioMetrics.weightedAverageRate,
            weightedAverageLTV: portfolioMetrics.weightedAverageLTV,
            diversificationScore: 1 - portfolioMetrics.diversificationMetrics.herfindahlIndex
          },
          valuationApproach: reconciledValue.primaryMethod,
          liquidityDiscount: adjustments.liquidityDiscount
        }
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown private debt calculation error',
        code: 'PRIVATE_DEBT_CALCULATION_FAILED'
      }
    }
  }

  // ==================== PRIVATE DEBT SPECIFIC METHODS ====================

  /**
   * Fetches loan details from database
   */
  private async getLoanDetails(input: PrivateDebtCalculationInput): Promise<LoanDetails> {
    // TODO: Replace with actual database query
    return {
      loanId: input.loanId || 'loan_001',
      borrowerName: input.borrowerName || 'TechCorp Ltd',
      industry: input.industry || 'technology',
      loanType: input.loanType || 'senior_secured',
      originationDate: input.origination_date || new Date('2022-06-01'),
      maturityDate: input.maturityDate || new Date('2027-06-01'),
      principalAmount: input.principalAmount || 25000000,
      outstandingPrincipal: input.outstandingPrincipal || 22000000,
      accruedInterest: 125000,
      interestRate: input.interestRate || 0.085, // 8.5%
      paymentFrequency: input.paymentFrequency || 'quarterly',
      nextPaymentDate: new Date('2025-03-01'),
      loanToValue: input.loanToValue || 0.65,
      currentLTV: 0.68, // May have drifted from original
      debtServiceCoverageRatio: input.debtServiceCoverageRatio || 1.25,
      collateralType: input.collateralType || 'equipment_and_inventory',
      collateralValue: input.collateralValue || 35000000,
      creditRating: input.creditRating || 'B+',
      internalRating: 'IRR_7',
      riskCategory: 'watch',
      covenants: input.covenants || [
        {
          covenantType: 'financial',
          description: 'Maximum debt-to-EBITDA ratio',
          metric: 'debt_to_ebitda',
          threshold: 4.0,
          testFrequency: 'quarterly',
          lastTestDate: new Date('2024-12-31'),
          lastTestValue: 3.8,
          compliant: true,
          breachDate: undefined,
          waiver: false,
          amendment: false
        }
      ],
      paymentHistory: [
        {
          paymentDate: new Date('2024-12-01'),
          scheduledAmount: 468750,
          actualAmount: 468750,
          principalPortion: 0,
          interestPortion: 468750,
          feesPortion: 0,
          status: 'on_time',
          daysLate: 0
        }
      ],
      covenant_compliance: [
        {
          covenantId: 'debt_ebitda',
          testDate: new Date('2024-12-31'),
          actualValue: 3.8,
          threshold: 4.0,
          compliant: true,
          marginOfSafety: 0.2,
          trend: 'stable'
        }
      ],
      lastReview: new Date('2025-01-15'),
      watchlistStatus: false
    }
  }

  /**
   * Calculates portfolio-level metrics and diversification
   */
  private async calculatePortfolioMetrics(input: PrivateDebtCalculationInput): Promise<PortfolioMetrics> {
    // TODO: Replace with actual portfolio calculation
    const totalCommitments = this.decimal(100000000)
    const totalOutstanding = this.decimal(85000000)
    
    return {
      totalCommitments,
      totalOutstanding,
      weightedAverageRate: 0.082,
      weightedAverageLTV: 0.68,
      weightedAverageRating: 'B+',
      diversificationMetrics: {
        industryConcentration: {
          technology: 0.35,
          healthcare: 0.25,
          manufacturing: 0.20,
          services: 0.20
        },
        geographicConcentration: {
          north_america: 0.70,
          europe: 0.25,
          asia: 0.05
        },
        borrowerConcentration: {
          largest: 0.12,
          top_5: 0.45,
          top_10: 0.68
        },
        vintageConcentration: {
          '2022': 0.40,
          '2023': 0.35,
          '2024': 0.25
        },
        herfindahlIndex: 0.15 // Lower is more diversified
      },
      concentrationRisk: {
        top5BorrowerExposure: 0.45,
        top10BorrowerExposure: 0.68,
        largestSectorExposure: 0.35,
        singleNameLimit: 0.15,
        breaches: []
      },
      vintageAnalysis: {
        vintageYear: 2022,
        totalOriginated: 500000000,
        totalOutstanding: 420000000,
        cumulativeDefaults: 15000000,
        cumulativeRecoveries: 8000000,
        netLossRate: 0.014,
        performanceVsBenchmark: 0.002 // 20bps better than benchmark
      },
      creditMigration: {
        upgrades: 3,
        downgrades: 7,
        stableRatings: 35,
        migrationMatrix: {
          'A': { 'A': 0.92, 'B': 0.08, 'C': 0.00 },
          'B': { 'A': 0.05, 'B': 0.85, 'C': 0.10 },
          'C': { 'A': 0.00, 'B': 0.15, 'C': 0.85 }
        }
      }
    }
  }

  /**
   * Performs comprehensive credit risk assessment
   */
  private async performCreditRiskAssessment(loan: LoanDetails): Promise<CreditRiskAssessment> {
    // Calculate base probability of default based on rating and metrics
    const basePD = this.calculateBaseProbabilityOfDefault(loan.creditRating, loan.internalRating)
    
    // Adjust for loan-specific factors
    const adjustedPD = this.adjustPDForLoanFactors(basePD, loan)
    
    // Calculate loss given default
    const lgd = this.calculateLossGivenDefault(loan)
    
    // Calculate expected loss
    const expectedLoss = adjustedPD * lgd
    
    // Calculate credit spread
    const creditSpread = this.calculateCreditSpread(adjustedPD, lgd, loan)
    
    // Estimate recovery rate
    const recoveryRate = 1 - lgd
    
    // Perform stress testing
    const stressTests = this.performStressTests(adjustedPD, lgd, loan)
    
    return {
      internalRating: loan.internalRating,
      externalRating: loan.creditRating,
      probabilityOfDefault: adjustedPD,
      lossGivenDefault: lgd,
      expectedLoss,
      creditSpread,
      migrationRisk: 0.15, // 15% chance of rating migration
      recoveryRate,
      stressTestResults: stressTests
    }
  }

  /**
   * Analyzes collateral value and recovery scenarios
   */
  private async analyzeCollateral(loan: LoanDetails): Promise<CollateralAnalysis> {
    const currentValue = loan.collateralValue
    const loanToValue = loan.outstandingPrincipal / currentValue
    
    // Recovery scenarios
    const recoveryScenarios: RecoveryScenario[] = [
      {
        scenario: 'going_concern',
        timeframe: 12,
        recoveryRate: 0.85,
        recoveryValue: currentValue * 0.85,
        costs: currentValue * 0.05,
        netRecovery: currentValue * 0.80
      },
      {
        scenario: 'liquidation',
        timeframe: 6,
        recoveryRate: 0.65,
        recoveryValue: currentValue * 0.65,
        costs: currentValue * 0.10,
        netRecovery: currentValue * 0.55
      },
      {
        scenario: 'fire_sale',
        timeframe: 3,
        recoveryRate: 0.45,
        recoveryValue: currentValue * 0.45,
        costs: currentValue * 0.15,
        netRecovery: currentValue * 0.30
      }
    ]
    
    // Collateral haircuts by scenario
    const haircuts: CollateralHaircut[] = [
      {
        assetClass: loan.collateralType,
        standardHaircut: 0.20,
        stressHaircut: 0.35,
        liquidityAdjustment: 0.05,
        concentrationAdjustment: 0.03,
        finalHaircut: 0.28
      }
    ]
    
    return {
      collateralType: loan.collateralType,
      currentValue,
      appraisedValue: currentValue * 1.05, // Slight premium to market
      appraisalDate: new Date('2024-06-01'),
      loanToValue,
      collateralCoverage: currentValue / loan.outstandingPrincipal,
      liquidityScore: 0.60, // 60% liquidity score
      volatilityScore: 0.35, // 35% volatility score
      recoveryScenarios,
      haircuts
    }
  }

  /**
   * Discounted cash flow valuation approach
   */
  private async calculateDiscountedCashFlow(
    loan: LoanDetails,
    creditAssessment: CreditRiskAssessment
  ): Promise<any> {
    const cashFlows = this.projectLoanCashFlows(loan)
    const discountRate = this.calculateDiscountRate(loan, creditAssessment)
    
    let presentValue = new Decimal(0)
    let cumulativePD = 0
    
    cashFlows.forEach((cashFlow, period) => {
      const survivalProbability = Math.pow(1 - creditAssessment.probabilityOfDefault, period / 12)
      const expectedCashFlow = cashFlow * survivalProbability
      const discountFactor = Math.pow(1 + discountRate, period / 12)
      const pv = this.decimal(expectedCashFlow).div(discountFactor)
      presentValue = presentValue.plus(pv)
    })
    
    // Add recovery value in default scenario
    const defaultValue = this.decimal(loan.outstandingPrincipal)
      .times(creditAssessment.recoveryRate)
      .times(creditAssessment.probabilityOfDefault)
    
    const totalValue = presentValue.plus(defaultValue)
    
    return {
      approach: 'discounted_cash_flow',
      fairValue: totalValue,
      discountRate,
      expectedCashFlows: cashFlows,
      creditAdjustment: this.toNumber(defaultValue),
      confidence: 0.80
    }
  }

  /**
   * Mark-to-market valuation using credit spreads
   */
  private async calculateMarkToMarket(
    loan: LoanDetails,
    creditAssessment: CreditRiskAssessment
  ): Promise<any> {
    const riskFreeRate = 0.045 // 4.5% risk-free rate
    const creditSpread = creditAssessment.creditSpread
    const marketRate = riskFreeRate + creditSpread
    
    const timeToMaturity = this.calculateTimeToMaturity(loan.maturityDate)
    const cashFlows = this.projectLoanCashFlows(loan)
    
    let marketValue = new Decimal(0)
    
    cashFlows.forEach((cashFlow, period) => {
      const discountFactor = Math.pow(1 + marketRate, period / 12)
      const pv = this.decimal(cashFlow).div(discountFactor)
      marketValue = marketValue.plus(pv)
    })
    
    return {
      approach: 'mark_to_market',
      fairValue: marketValue,
      marketRate,
      creditSpread,
      riskFreeRate,
      confidence: 0.75
    }
  }

  /**
   * Recovery-based valuation focusing on collateral value
   */
  private async calculateRecoveryBasedValue(
    loan: LoanDetails,
    collateralAnalysis: CollateralAnalysis
  ): Promise<any> {
    // Weight different recovery scenarios
    const scenarioWeights = {
      going_concern: 0.60,
      liquidation: 0.30,
      fire_sale: 0.10
    }
    
    let weightedRecoveryValue = new Decimal(0)
    
    collateralAnalysis.recoveryScenarios.forEach(scenario => {
      const weight = scenarioWeights[scenario.scenario as keyof typeof scenarioWeights] || 0
      weightedRecoveryValue = weightedRecoveryValue.plus(
        this.decimal(scenario.netRecovery).times(weight)
      )
    })
    
    // Apply additional haircuts for uncertainty
    const finalValue = weightedRecoveryValue.times(0.90) // 10% uncertainty discount
    
    return {
      approach: 'recovery_based',
      fairValue: finalValue,
      weightedRecovery: this.toNumber(weightedRecoveryValue),
      scenarios: collateralAnalysis.recoveryScenarios,
      confidence: 0.65
    }
  }

  /**
   * Reconciles multiple valuation approaches
   */
  private reconcileDebtValuations(
    dcfValue: any,
    mtmValue: any,
    recoveryValue: any,
    loan: LoanDetails
  ): any {
    // Weight valuations based on loan characteristics and market conditions
    let weights = { dcf: 0.50, mtm: 0.35, recovery: 0.15 }
    
    // Adjust weights based on loan quality
    if (loan.riskCategory === 'watch') {
      weights = { dcf: 0.30, mtm: 0.25, recovery: 0.45 } // More weight on recovery
    } else if (loan.creditRating.startsWith('A')) {
      weights = { dcf: 0.60, mtm: 0.35, recovery: 0.05 } // Less weight on recovery
    }
    
    const weightedValue = dcfValue.fairValue.times(weights.dcf)
      .plus(mtmValue.fairValue.times(weights.mtm))
      .plus(recoveryValue.fairValue.times(weights.recovery))
    
    // Determine primary method based on highest weight
    let primaryMethod = 'discounted_cash_flow'
    if (weights.mtm > weights.dcf && weights.mtm > weights.recovery) {
      primaryMethod = 'mark_to_market'
    } else if (weights.recovery > weights.dcf && weights.recovery > weights.mtm) {
      primaryMethod = 'recovery_based'
    }
    
    return {
      fairValue: weightedValue,
      primaryMethod,
      weights,
      dcfValue: dcfValue.fairValue,
      mtmValue: mtmValue.fairValue,
      recoveryValue: recoveryValue.fairValue
    }
  }

  // ==================== HELPER METHODS ====================

  private calculateBaseProbabilityOfDefault(externalRating: string, internalRating: string): number {
    // Simplified PD mapping based on ratings
    const ratingToPD: Record<string, number> = {
      'AAA': 0.0001, 'AA+': 0.0002, 'AA': 0.0003, 'AA-': 0.0005,
      'A+': 0.0008, 'A': 0.0012, 'A-': 0.0020,
      'BBB+': 0.0035, 'BBB': 0.0055, 'BBB-': 0.0085,
      'BB+': 0.0140, 'BB': 0.0220, 'BB-': 0.0340,
      'B+': 0.0520, 'B': 0.0780, 'B-': 0.1150,
      'CCC+': 0.1650, 'CCC': 0.2350, 'CCC-': 0.3200
    }
    
    return ratingToPD[externalRating] || 0.05 // Default to 5% if rating not found
  }

  private adjustPDForLoanFactors(basePD: number, loan: LoanDetails): number {
    let adjustedPD = basePD
    
    // Adjust for LTV
    if (loan.currentLTV > 0.80) {
      adjustedPD *= 1.3 // 30% increase for high LTV
    } else if (loan.currentLTV < 0.60) {
      adjustedPD *= 0.8 // 20% decrease for low LTV
    }
    
    // Adjust for covenant compliance
    const covenantBreaches = loan.covenant_compliance.filter(c => !c.compliant).length
    if (covenantBreaches > 0) {
      adjustedPD *= (1 + covenantBreaches * 0.25) // 25% increase per breach
    }
    
    // Adjust for payment history
    const latePayments = loan.paymentHistory.filter(p => p.status !== 'on_time').length
    if (latePayments > 0) {
      adjustedPD *= (1 + latePayments * 0.15) // 15% increase per late payment
    }
    
    return Math.min(0.50, adjustedPD) // Cap at 50%
  }

  private calculateLossGivenDefault(loan: LoanDetails): number {
    let baseLGD = 0.40 // 40% base LGD for senior secured
    
    // Adjust based on loan type
    switch (loan.loanType) {
      case 'senior_secured':
        baseLGD = 0.35
        break
      case 'subordinated':
        baseLGD = 0.65
        break
      case 'mezzanine':
        baseLGD = 0.75
        break
      case 'unsecured':
        baseLGD = 0.80
        break
    }
    
    // Adjust for collateral coverage
    const collateralCoverage = loan.collateralValue / loan.outstandingPrincipal
    if (collateralCoverage > 1.5) {
      baseLGD *= 0.8 // Better collateral = lower LGD
    } else if (collateralCoverage < 1.0) {
      baseLGD *= 1.2 // Poor collateral = higher LGD
    }
    
    return Math.min(0.90, Math.max(0.10, baseLGD)) // Cap between 10% and 90%
  }

  private calculateCreditSpread(pd: number, lgd: number, loan: LoanDetails): number {
    const expectedLoss = pd * lgd
    const riskPremium = expectedLoss * 2.5 // Risk premium multiplier
    const liquidityPremium = 0.015 // 150bps liquidity premium for private debt
    
    return riskPremium + liquidityPremium
  }

  private performStressTests(pd: number, lgd: number, loan: LoanDetails): StressTestScenario[] {
    return [
      {
        scenario: 'base',
        newPD: pd,
        newLGD: lgd,
        expectedLoss: pd * lgd,
        fairValue: loan.outstandingPrincipal * (1 - pd * lgd),
        markdownPercentage: 0
      },
      {
        scenario: 'adverse',
        newPD: pd * 1.5,
        newLGD: lgd * 1.1,
        expectedLoss: (pd * 1.5) * (lgd * 1.1),
        fairValue: loan.outstandingPrincipal * (1 - (pd * 1.5) * (lgd * 1.1)),
        markdownPercentage: 0.15
      },
      {
        scenario: 'severely_adverse',
        newPD: pd * 2.5,
        newLGD: lgd * 1.25,
        expectedLoss: (pd * 2.5) * (lgd * 1.25),
        fairValue: loan.outstandingPrincipal * (1 - (pd * 2.5) * (lgd * 1.25)),
        markdownPercentage: 0.35
      }
    ]
  }

  private projectLoanCashFlows(loan: LoanDetails): number[] {
    const monthsToMaturity = this.calculateTimeToMaturity(loan.maturityDate)
    const monthlyRate = loan.interestRate / 12
    const monthlyPayment = loan.outstandingPrincipal * monthlyRate / 
      (1 - Math.pow(1 + monthlyRate, -monthsToMaturity))
    
    const cashFlows = []
    for (let month = 1; month <= monthsToMaturity; month++) {
      if (month === monthsToMaturity) {
        // Final payment includes remaining principal
        cashFlows.push(loan.outstandingPrincipal + monthlyPayment)
      } else {
        cashFlows.push(monthlyPayment)
      }
    }
    
    return cashFlows
  }

  private calculateDiscountRate(loan: LoanDetails, creditAssessment: CreditRiskAssessment): number {
    const riskFreeRate = 0.045 // 4.5%
    const creditSpread = creditAssessment.creditSpread
    const illiquidityPremium = 0.02 // 200bps for private debt
    
    return riskFreeRate + creditSpread + illiquidityPremium
  }

  private calculateTimeToMaturity(maturityDate: Date): number {
    const now = new Date()
    const timeDiff = maturityDate.getTime() - now.getTime()
    return Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24 * 30))) // Months
  }

  private async calculatePrivateDebtAdjustments(
    loan: LoanDetails,
    creditAssessment: CreditRiskAssessment,
    input: PrivateDebtCalculationInput
  ): Promise<any> {
    const outstandingPrincipal = this.decimal(loan.outstandingPrincipal)
    
    // Funding costs (cost of capital)
    const fundingCosts = outstandingPrincipal.times(0.03) // 3% funding cost
    
    // Management fees (typically 1-2% of AUM)
    const managementFees = outstandingPrincipal.times(0.015) // 1.5% management fee
    
    // Expected losses based on credit assessment
    const expectedLosses = outstandingPrincipal.times(creditAssessment.expectedLoss)
    
    // Liquidity discount for private markets
    const liquidityDiscount = input.liquidityDiscount || 0.05 // 5% default
    
    return {
      fundingCosts,
      managementFees,
      expectedLosses,
      liquidityDiscount,
      total: fundingCosts.plus(managementFees).plus(expectedLosses)
    }
  }

  private buildPrivateDebtPricingSources(
    dcfValue: any,
    mtmValue: any,
    recoveryValue: any,
    creditAssessment: CreditRiskAssessment
  ): Record<string, PriceData> {
    return {
      discounted_cash_flow: {
        price: this.toNumber(dcfValue.fairValue),
        currency: 'USD',
        asOf: new Date(),
        source: 'dcf_model'
      },
      mark_to_market: {
        price: this.toNumber(mtmValue.fairValue),
        currency: 'USD',
        asOf: new Date(),
        source: 'credit_spread_model'
      },
      recovery_based: {
        price: this.toNumber(recoveryValue.fairValue),
        currency: 'USD',
        asOf: new Date(),
        source: 'collateral_analysis'
      },
      credit_spread: {
        price: creditAssessment.creditSpread,
        currency: 'SPREAD_BPS',
        asOf: new Date(),
        source: 'credit_risk_model'
      }
    }
  }

  protected override generateRunId(): string {
    return `pd_nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
