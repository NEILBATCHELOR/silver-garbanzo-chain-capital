/**
 * InvoiceReceivablesCalculator - NAV calculation for invoice receivables and factoring
 * 
 * Handles:
 * - Accounts receivable factoring and discounting
 * - Credit risk assessment of invoice debtors
 * - Collection probability modeling and aging analysis  
 * - Invoice verification and authenticity checks
 * - Working capital financing and cash flow management
 * - Dilution risk and dispute management
 * - Industry-specific collection patterns
 * - Cross-border invoice risks and currency exposures
 * 
 * Supports invoice receivables from invoices table
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

export interface InvoiceReceivablesCalculationInput extends CalculationInput {
  // Invoice receivables specific parameters
  invoiceId?: string
  invoiceNumber?: string
  amount?: number
  currency?: string
  issuedDate?: Date
  dueDate?: Date
  paid?: boolean
  subscriptionId?: string
  debtorId?: string
  debtorName?: string
  debtorCreditRating?: string
  industry?: string
  geography?: string
  paymentTerms?: number // Days
  invoiceAge?: number // Days since issued
  disputeStatus?: string
  collectionHistory?: CollectionHistory
  guarantees?: GuaranteeDetails[]
  insurance?: InsuranceDetails
  verificationStatus?: VerificationStatus
}

export interface CollectionHistory {
  debtorId: string
  totalInvoices: number
  paidOnTime: number
  paidLate: number
  disputed: number
  defaulted: number
  averagePaymentDays: number
  disputeRate: number // Percentage of invoices disputed
  defaultRate: number // Percentage of invoices defaulted
}

export interface GuaranteeDetails {
  guarantorId: string
  guarantorName: string
  guarantorRating: string
  guaranteeAmount: number
  guaranteeType: string // 'full', 'partial', 'conditional'
  validUntil: Date
}

export interface InsuranceDetails {
  insured: boolean
  insurerId: string
  policyNumber: string
  coverageAmount: number
  coveragePercentage: number // 0-100
  deductible: number
  premium: number
}

export interface VerificationStatus {
  verified: boolean
  verificationDate: Date
  verificationMethod: string
  documentIntegrity: number // 0-100 score
  authenticity: number // 0-100 score
  completeness: number // 0-100 score
}

export interface InvoiceReceivablesPriceData extends PriceData {
  factoringRate: number // Discount rate for factoring
  collectionProbability: number // 0-100 probability of collection
  expectedCollectionDays: number // Expected days to collect
  industryBenchmark: number // Industry average collection rate
  creditSpread: number // Credit spread based on debtor rating
  dilutionRate: number // Historical dilution/dispute rate
  concentrationRisk: number // Risk from debtor concentration
  currencyRisk: number // FX risk for cross-border invoices
}

export interface CreditRiskAssessment {
  debtorCreditScore: number // 0-1000 credit score
  probabilityOfDefault: number // 0-100 PD over invoice term
  lossGivenDefault: number // 0-100 LGD percentage
  expectedLoss: number // Expected loss amount
  creditRating: string // S&P equivalent rating
  outlookStable: boolean
  debtCapacity: number // Remaining debt capacity
  liquidityRatio: number // Current ratio or similar
  debtToAssets: number // Debt-to-assets ratio
}

export interface CollectionMetrics {
  collectionProbability: number // Overall collection probability
  expectedCollectionAmount: number // Expected collection after losses
  collectionTimeframe: number // Expected days to full collection
  earlyPaymentProbability: number // Probability of early payment
  latePaymentProbability: number // Probability of late payment
  disputeRisk: number // Risk of invoice being disputed
  dilutionRisk: number // Risk of amount reduction
}

export interface FactoringTerms {
  advanceRate: number // Percentage advanced upfront
  factoringFee: number // Fee percentage
  reserveHoldback: number // Amount held in reserve
  recourseType: string // 'full-recourse', 'non-recourse', 'limited-recourse'
  approvalRequired: boolean // Whether factoring approval is needed
  concentrationLimits: ConcentrationLimits
}

export interface ConcentrationLimits {
  maxDebtorPercentage: number // Max percentage from single debtor
  maxIndustryPercentage: number // Max percentage from single industry  
  maxGeographyPercentage: number // Max percentage from single geography
  diversificationScore: number // Portfolio diversification score
}

export interface IndustryAnalysis {
  industryType: string
  averagePaymentDays: number
  disputeRate: number
  defaultRate: number
  seasonality: SeasonalityPattern[]
  cyclicalRisk: number // Economic cycle sensitivity
  regulatoryRisk: number // Industry-specific regulatory risk
}

export interface SeasonalityPattern {
  month: number
  collectionMultiplier: number // Seasonal adjustment factor
  volumeMultiplier: number // Seasonal volume factor
}

export interface DilutionAnalysis {
  returnsRate: number // Rate of product returns
  allowancesRate: number // Rate of allowances/discounts
  disputesRate: number // Rate of payment disputes
  chargebacksRate: number // Rate of chargebacks
  totalDilutionRate: number // Combined dilution rate
  historicalTrend: number // Trend in dilution rates
}

export class InvoiceReceivablesCalculator extends BaseCalculator {
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
    return [AssetType.INVOICE_RECEIVABLES]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const invoiceInput = input as InvoiceReceivablesCalculationInput
      
      // Get invoice receivables details from database
      const invoiceDetails = await this.getInvoiceReceivableDetails(invoiceInput)
      
      // Assess debtor credit risk and payment capability
      const creditRisk = await this.assessCreditRisk(invoiceInput, invoiceDetails)
      
      // Analyze collection probability and timing
      const collectionMetrics = await this.analyzeCollectionMetrics(invoiceInput, invoiceDetails, creditRisk)
      
      // Assess industry-specific factors
      const industryAnalysis = await this.analyzeIndustryFactors(invoiceInput, invoiceDetails)
      
      // Calculate dilution and dispute risks
      const dilutionAnalysis = await this.analyzeDilutionRisk(invoiceInput, invoiceDetails)
      
      // Determine factoring terms and advance rates
      const factoringTerms = await this.calculateFactoringTerms(
        invoiceInput, 
        invoiceDetails, 
        creditRisk, 
        collectionMetrics
      )
      
      // Apply time value and risk adjustments
      const riskAdjustments = await this.calculateRiskAdjustments(
        invoiceInput, 
        creditRisk, 
        collectionMetrics, 
        dilutionAnalysis
      )
      
      // Calculate insurance and guarantee value
      const protectionValue = await this.calculateProtectionValue(invoiceInput, invoiceDetails)
      
      // Apply concentration and portfolio effects
      const concentrationAdjustment = await this.calculateConcentrationAdjustment(
        invoiceInput, 
        invoiceDetails
      )
      
      // Calculate base invoice value
      const baseValue = this.decimal(invoiceDetails.amount || 0)
      
      // Calculate net present value of receivable
      const expectedCollectionAmount = baseValue.times(
        this.decimal(collectionMetrics.collectionProbability / 100)
      )
      
      // Apply dilution adjustments
      const dilutionAdjustment = expectedCollectionAmount.times(
        this.decimal(dilutionAnalysis.totalDilutionRate / 100)
      )
      
      // Apply time value discounting
      const timeDiscountFactor = await this.calculateTimeDiscountFactor(
        collectionMetrics.expectedCollectionAmount,
        collectionMetrics.collectionTimeframe,
        factoringTerms.factoringFee
      )
      
      // Calculate final net asset value
      const finalValue = expectedCollectionAmount
        .minus(dilutionAdjustment)
        .minus(riskAdjustments.totalRiskAdjustment)
        .plus(protectionValue)
        .minus(concentrationAdjustment)
        .times(timeDiscountFactor)
      
      // Build calculation result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `invoice_${invoiceDetails.invoiceId}`,
        productType: AssetType.INVOICE_RECEIVABLES,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(baseValue),
        totalLiabilities: this.toNumber(
          dilutionAdjustment
            .plus(riskAdjustments.totalRiskAdjustment)
            .plus(concentrationAdjustment)
        ),
        netAssets: this.toNumber(finalValue),
        navValue: this.toNumber(finalValue),
        navPerShare: input.sharesOutstanding ? 
          this.toNumber(finalValue.div(this.decimal(input.sharesOutstanding))) : 
          undefined,
        currency: input.targetCurrency || invoiceDetails.currency || 'USD',
        pricingSources: {
          invoiceAmount: {
            price: this.toNumber(baseValue),
            currency: invoiceDetails.currency,
            asOf: invoiceDetails.issuedDate || new Date(),
            source: 'invoice_document'
          },
          expectedCollection: {
            price: this.toNumber(expectedCollectionAmount),
            currency: invoiceDetails.currency,
            asOf: input.valuationDate || new Date(),
            source: 'collection_model'
          },
          factoringValue: {
            price: this.toNumber(finalValue),
            currency: invoiceDetails.currency,
            asOf: input.valuationDate || new Date(),
            source: 'factoring_model'
          }
        },
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED,
        metadata: {
          creditRisk,
          collectionMetrics,
          industryAnalysis,
          dilutionAnalysis,
          factoringTerms,
          riskAdjustments,
          protectionValue: this.toNumber(protectionValue),
          concentrationAdjustment: this.toNumber(concentrationAdjustment),
          invoiceDetails: {
            invoiceNumber: invoiceDetails.invoiceNumber,
            debtorName: invoiceDetails.debtorName,
            industry: invoiceDetails.industry,
            paymentTerms: invoiceDetails.paymentTerms,
            invoiceAge: invoiceDetails.invoiceAge,
            dueDate: invoiceDetails.dueDate
          },
          qualityMetrics: {
            verification: invoiceDetails.verificationStatus?.verified || false,
            creditRating: creditRisk.creditRating,
            collectionProbability: collectionMetrics.collectionProbability,
            dilutionRisk: dilutionAnalysis.totalDilutionRate
          }
        }
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown invoice receivables calculation error',
        code: 'INVOICE_RECEIVABLES_CALCULATION_FAILED'
      }
    }
  }

  // ==================== INVOICE RECEIVABLES SPECIFIC METHODS ====================

  /**
   * Fetches invoice receivable details from the database
   */
  private async getInvoiceReceivableDetails(input: InvoiceReceivablesCalculationInput): Promise<any> {
    // Mock implementation - replace with actual database query
    return {
      invoiceId: input.invoiceId || 'INV_001',
      invoiceNumber: input.invoiceNumber || 'INV-2024-001234',
      amount: input.amount || 50000,
      currency: input.currency || 'USD',
      issuedDate: input.issuedDate || new Date('2024-01-15'),
      dueDate: input.dueDate || new Date('2024-03-15'),
      paid: input.paid || false,
      subscriptionId: input.subscriptionId,
      debtorId: input.debtorId || 'DEBTOR_CORP_001',
      debtorName: input.debtorName || 'Fortune 500 Corporation',
      debtorCreditRating: input.debtorCreditRating || 'A-',
      industry: input.industry || 'Technology',
      geography: input.geography || 'United States',
      paymentTerms: input.paymentTerms || 60, // Net 60 days
      invoiceAge: input.invoiceAge || 30, // 30 days since issued
      disputeStatus: input.disputeStatus || 'none',
      status: 'outstanding',
      verificationStatus: input.verificationStatus || {
        verified: true,
        verificationDate: new Date('2024-01-16'),
        verificationMethod: 'digital_signature',
        documentIntegrity: 98,
        authenticity: 96,
        completeness: 99
      }
    }
  }

  /**
   * Assesses credit risk of the invoice debtor
   */
  private async assessCreditRisk(
    input: InvoiceReceivablesCalculationInput,
    invoiceDetails: any
  ): Promise<CreditRiskAssessment> {
    // Mock implementation - would integrate with credit agencies
    const rating = invoiceDetails.debtorCreditRating || 'BBB'
    
    // Credit score mapping from rating
    let creditScore = 650 // Default
    const ratingMap: Record<string, number> = {
      'AAA': 850, 'AA+': 820, 'AA': 800, 'AA-': 780,
      'A+': 750, 'A': 720, 'A-': 700,
      'BBB+': 680, 'BBB': 650, 'BBB-': 620,
      'BB+': 590, 'BB': 560, 'BB-': 530,
      'B+': 500, 'B': 470, 'B-': 440
    }
    
    creditScore = ratingMap[rating] || 650
    
    // PD calculation based on credit score and invoice term
    const termInYears = (invoiceDetails.paymentTerms || 60) / 365.25
    let basePD = Math.max(0.1, Math.min(25, (1000 - creditScore) / 40)) // Base PD in %
    const pdOverTerm = basePD * termInYears
    
    return {
      debtorCreditScore: creditScore,
      probabilityOfDefault: pdOverTerm,
      lossGivenDefault: 40, // 40% LGD assumption for corporate receivables
      expectedLoss: (invoiceDetails.amount || 0) * (pdOverTerm / 100) * 0.4,
      creditRating: rating,
      outlookStable: true,
      debtCapacity: 75, // 75% debt capacity remaining
      liquidityRatio: 1.8, // Current ratio of 1.8
      debtToAssets: 0.35 // 35% debt-to-assets ratio
    }
  }

  /**
   * Analyzes collection probability and timing
   */
  private async analyzeCollectionMetrics(
    input: InvoiceReceivablesCalculationInput,
    invoiceDetails: any,
    creditRisk: CreditRiskAssessment
  ): Promise<CollectionMetrics> {
    // Base collection probability from credit assessment
    let collectionProb = Math.max(50, 100 - creditRisk.probabilityOfDefault)
    
    // Adjust for invoice age
    const invoiceAge = invoiceDetails.invoiceAge || 0
    if (invoiceAge > 90) collectionProb *= 0.85
    else if (invoiceAge > 60) collectionProb *= 0.92
    else if (invoiceAge > 30) collectionProb *= 0.98
    
    // Adjust for dispute status
    if (invoiceDetails.disputeStatus === 'disputed') {
      collectionProb *= 0.70
    } else if (invoiceDetails.disputeStatus === 'resolved') {
      collectionProb *= 0.95
    }
    
    // Calculate expected collection amount
    const baseAmount = invoiceDetails.amount || 0
    const expectedAmount = baseAmount * (collectionProb / 100)
    
    // Calculate collection timeframe
    const paymentTerms = invoiceDetails.paymentTerms || 60
    let expectedDays = paymentTerms
    
    // Adjust for credit quality
    if (creditRisk.creditRating >= 'A-') expectedDays = paymentTerms * 0.9
    else if (creditRisk.creditRating >= 'BBB') expectedDays = paymentTerms * 1.1
    else expectedDays = paymentTerms * 1.3
    
    return {
      collectionProbability: Math.max(0, Math.min(100, collectionProb)),
      expectedCollectionAmount: expectedAmount,
      collectionTimeframe: expectedDays,
      earlyPaymentProbability: creditRisk.creditRating >= 'A' ? 25 : 10,
      latePaymentProbability: creditRisk.creditRating <= 'BBB-' ? 35 : 15,
      disputeRisk: invoiceDetails.industry === 'Construction' ? 8 : 3,
      dilutionRisk: invoiceDetails.industry === 'Retail' ? 5 : 2
    }
  }

  /**
   * Analyzes industry-specific collection factors
   */
  private async analyzeIndustryFactors(
    input: InvoiceReceivablesCalculationInput,
    invoiceDetails: any
  ): Promise<IndustryAnalysis> {
    const industry = invoiceDetails.industry || 'General'
    
    // Industry-specific benchmarks
    const industryData: Record<string, any> = {
      'Technology': {
        averagePaymentDays: 45,
        disputeRate: 2,
        defaultRate: 1.5,
        cyclicalRisk: 3,
        regulatoryRisk: 2
      },
      'Healthcare': {
        averagePaymentDays: 75,
        disputeRate: 8,
        defaultRate: 3,
        cyclicalRisk: 2,
        regulatoryRisk: 7
      },
      'Construction': {
        averagePaymentDays: 85,
        disputeRate: 12,
        defaultRate: 6,
        cyclicalRisk: 8,
        regulatoryRisk: 4
      },
      'Retail': {
        averagePaymentDays: 35,
        disputeRate: 6,
        defaultRate: 4,
        cyclicalRisk: 7,
        regulatoryRisk: 3
      }
    }
    
    const data = industryData[industry] || industryData['Technology']
    
    return {
      industryType: industry,
      averagePaymentDays: data.averagePaymentDays,
      disputeRate: data.disputeRate,
      defaultRate: data.defaultRate,
      seasonality: [
        { month: 1, collectionMultiplier: 0.85, volumeMultiplier: 0.9 },
        { month: 12, collectionMultiplier: 0.75, volumeMultiplier: 1.2 }
      ],
      cyclicalRisk: data.cyclicalRisk,
      regulatoryRisk: data.regulatoryRisk
    }
  }

  /**
   * Analyzes dilution risk from returns, allowances, disputes
   */
  private async analyzeDilutionRisk(
    input: InvoiceReceivablesCalculationInput,
    invoiceDetails: any
  ): Promise<DilutionAnalysis> {
    const industry = invoiceDetails.industry || 'General'
    
    // Industry-specific dilution rates
    let returnsRate = 1.0
    let allowancesRate = 0.5
    let disputesRate = 2.0
    let chargebacksRate = 0.3
    
    if (industry === 'Retail') {
      returnsRate = 4.0
      allowancesRate = 2.0
    } else if (industry === 'Healthcare') {
      disputesRate = 5.0
      allowancesRate = 1.5
    } else if (industry === 'Construction') {
      disputesRate = 8.0
      allowancesRate = 3.0
    }
    
    const totalDilution = returnsRate + allowancesRate + disputesRate + chargebacksRate
    
    return {
      returnsRate,
      allowancesRate,
      disputesRate,
      chargebacksRate,
      totalDilutionRate: totalDilution,
      historicalTrend: -0.1 // Slight improvement over time
    }
  }

  /**
   * Calculates factoring terms and advance rates
   */
  private async calculateFactoringTerms(
    input: InvoiceReceivablesCalculationInput,
    invoiceDetails: any,
    creditRisk: CreditRiskAssessment,
    collectionMetrics: CollectionMetrics
  ): Promise<FactoringTerms> {
    // Base advance rate depends on credit quality
    let advanceRate = 80 // Default 80%
    if (creditRisk.creditRating >= 'A') advanceRate = 90
    else if (creditRisk.creditRating >= 'BBB') advanceRate = 85
    else if (creditRisk.creditRating <= 'BB') advanceRate = 70
    
    // Factoring fee based on risk and term
    let factoringFee = 2.0 // Base 2% fee
    factoringFee += (100 - collectionMetrics.collectionProbability) * 0.1
    factoringFee += collectionMetrics.dilutionRisk * 0.2
    
    return {
      advanceRate,
      factoringFee,
      reserveHoldback: 100 - advanceRate,
      recourseType: creditRisk.creditRating >= 'BBB' ? 'non-recourse' : 'full-recourse',
      approvalRequired: creditRisk.creditRating <= 'BB',
      concentrationLimits: {
        maxDebtorPercentage: 20,
        maxIndustryPercentage: 30,
        maxGeographyPercentage: 40,
        diversificationScore: 75
      }
    }
  }

  /**
   * Calculates comprehensive risk adjustments
   */
  private async calculateRiskAdjustments(
    input: InvoiceReceivablesCalculationInput,
    creditRisk: CreditRiskAssessment,
    collectionMetrics: CollectionMetrics,
    dilutionAnalysis: DilutionAnalysis
  ): Promise<{ totalRiskAdjustment: Decimal; riskBreakdown: Record<string, number> }> {
    const baseAmount = this.decimal(input.amount || 0)
    
    // Credit risk adjustment
    const creditAdjustment = baseAmount.times(this.decimal(creditRisk.expectedLoss / (input.amount || 1)))
    
    // Collection risk adjustment
    const collectionRiskRate = (100 - collectionMetrics.collectionProbability) / 100
    const collectionAdjustment = baseAmount.times(this.decimal(collectionRiskRate * 0.5))
    
    // Concentration risk adjustment
    const concentrationAdjustment = baseAmount.times(this.decimal(0.01)) // 1% base
    
    const totalRiskAdjustment = creditAdjustment.plus(collectionAdjustment).plus(concentrationAdjustment)
    
    return {
      totalRiskAdjustment,
      riskBreakdown: {
        credit: this.toNumber(creditAdjustment),
        collection: this.toNumber(collectionAdjustment),
        concentration: this.toNumber(concentrationAdjustment),
        dilution: dilutionAnalysis.totalDilutionRate
      }
    }
  }

  /**
   * Calculates value from insurance and guarantees
   */
  private async calculateProtectionValue(
    input: InvoiceReceivablesCalculationInput,
    invoiceDetails: any
  ): Promise<Decimal> {
    let protectionValue = this.decimal(0)
    
    // Insurance protection value
    if (invoiceDetails.insurance?.insured) {
      const coverageAmount = invoiceDetails.insurance.coverageAmount || 0
      const coveragePercent = invoiceDetails.insurance.coveragePercentage || 0
      protectionValue = protectionValue.plus(
        this.decimal(Math.min(coverageAmount, (input.amount || 0) * (coveragePercent / 100)))
      )
    }
    
    // Guarantee value
    if (invoiceDetails.guarantees?.length > 0) {
      for (const guarantee of invoiceDetails.guarantees) {
        const guaranteeValue = Math.min(guarantee.guaranteeAmount || 0, input.amount || 0)
        protectionValue = protectionValue.plus(this.decimal(guaranteeValue * 0.8)) // 80% value
      }
    }
    
    return protectionValue.times(this.decimal(0.1)) // 10% of protection value
  }

  /**
   * Calculates concentration risk adjustments
   */
  private async calculateConcentrationAdjustment(
    input: InvoiceReceivablesCalculationInput,
    invoiceDetails: any
  ): Promise<Decimal> {
    // Mock concentration calculation - would normally assess portfolio concentration
    const baseAmount = this.decimal(input.amount || 0)
    
    // If this is a large invoice relative to portfolio, apply concentration discount
    const concentrationDiscount = 0.02 // 2% base concentration discount
    
    return baseAmount.times(this.decimal(concentrationDiscount))
  }

  /**
   * Calculates time value discount factor
   */
  private async calculateTimeDiscountFactor(
    expectedAmount: number,
    expectedDays: number,
    annualRate: number
  ): Promise<Decimal> {
    const yearsToCollection = expectedDays / 365.25
    const discountRate = annualRate / 100
    const discountFactor = 1 / Math.pow(1 + discountRate, yearsToCollection)
    
    return this.decimal(discountFactor)
  }

  /**
   * Generates unique run ID for the calculation
   */
  protected override generateRunId(): string {
    return `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
