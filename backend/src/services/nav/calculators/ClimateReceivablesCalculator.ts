/**
 * ClimateReceivablesCalculator - NAV calculation for climate-related receivables
 * 
 * Handles:
 * - Carbon credit valuations and market analysis
 * - Renewable energy certificate (REC) pricing
 * - Climate policy impact modeling and regulatory risk assessment
 * - Verification and certification tracking for environmental credits
 * - Climate risk calculations and transition scenarios
 * - ESG impact measurement and sustainability metrics
 * - Market dynamics and carbon pricing mechanisms
 * - Offset verification and additionality assessments
 * 
 * Supports climate receivables from climate_receivables table
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

export interface ClimateReceivablesCalculationInput extends CalculationInput {
  // Climate receivables specific parameters
  receivableId?: string
  assetId?: string
  payerId?: string
  amount?: number
  dueDate?: Date
  riskScore?: number
  discountRate?: number
  creditType?: string
  vintage?: number
  verificationStandard?: string
  certificationBody?: string
  projectType?: string
  geography?: string
  additionality?: boolean
  permanence?: number
  cobenefit?: CobenefitDetails
  registry?: string
  serialNumber?: string
  issuanceDate?: Date
  retirementDate?: Date
  methodology?: string
}

export interface CobenefitDetails {
  biodiversity: number // 0-100 impact score
  socialImpact: number // 0-100 impact score
  economicDevelopment: number // 0-100 impact score
  airQuality: number // 0-100 impact score
  waterQuality: number // 0-100 impact score
  sdgAlignment: string[] // UN Sustainable Development Goals
}

export interface ClimateReceivablesPriceData extends PriceData {
  carbonPrice: number // Price per tonne CO2 equivalent
  recPrice: number // Renewable energy certificate price per MWh
  complianceValue: number // Value in compliance markets
  voluntaryValue: number // Value in voluntary markets
  futuresPrice: number // Future contract price if available
  spot: number // Spot market price
  vintage: number // Credit vintage year
  qualityPremium: number // Premium for high-quality credits
  geography: string // Geographic region
  priceVolatility: number // Historical price volatility
  liquidityScore: number // 0-100 market liquidity score
  demandGrowth: number // Year-over-year demand growth
  supplyConstraints: number // Supply availability score
}

export interface VerificationMetrics {
  certificationStatus: string // 'verified', 'pending', 'rejected', 'expired'
  verifiedBy: string // Certification body
  verificationDate: Date
  verificationExpiry: Date
  additionalityScore: number // 0-100 additionality confidence
  permanenceRisk: number // 0-100 reversal risk score
  leakageRisk: number // 0-100 leakage risk score
  measurementAccuracy: number // 0-100 measurement confidence
  monitoringQuality: number // 0-100 monitoring system quality
  reportingTransparency: number // 0-100 transparency score
}

export interface PolicyImpactAnalysis {
  regulatoryRisk: number // 0-100 regulatory change risk
  policySupport: number // 0-100 policy support level
  complianceRequirement: boolean // Required for regulatory compliance
  taxIncentives: number // Value of tax incentives
  subsidies: number // Government subsidies available
  carbonTax: number // Carbon tax rate if applicable
  capAndTrade: boolean // Part of cap-and-trade system
  netZeroCommitments: number // Corporate net-zero demand driver
  internationalAgreements: string[] // Paris Agreement, etc.
}

export interface ClimateRiskAssessment {
  transitionRisk: number // Risk from low-carbon transition
  physicalRisk: number // Risk from climate change impacts
  technologyRisk: number // Risk from technology changes
  marketRisk: number // Carbon market price risk
  policyRisk: number // Regulatory and policy risk
  reputationalRisk: number // ESG and reputation risk
  counterpartyRisk: number // Credit risk of payer
  operationalRisk: number // Project delivery risk
  overallRisk: number // Composite risk score
}

export interface SustainabilityMetrics {
  co2Reduction: number // Tonnes CO2 equivalent reduced
  renewableGeneration: number // MWh renewable energy generated
  forestProtection: number // Hectares forest protected
  biodiversityImpact: number // Biodiversity impact score
  communityBenefit: number // Local community benefit score
  sdgContribution: Record<string, number> // SDG contribution scores
  additionality: number // Additional impact beyond baseline
  permanence: number // Long-term impact permanence score
}

export interface MarketDynamics {
  complianceMarkets: ComplianceMarketData
  voluntaryMarkets: VoluntaryMarketData
  futures: FuturesMarketData
  correlations: MarketCorrelations
}

export interface ComplianceMarketData {
  euEts: number // EU ETS price
  caeT: number // California cap-and-trade price
  rggi: number // RGGI price
  volume: number // Market volume
  growth: number // Year-over-year growth
}

export interface VoluntaryMarketData {
  vcs: number // Verified Carbon Standard price
  goldStandard: number // Gold Standard price
  ccb: number // Climate Community & Biodiversity price
  car: number // Climate Action Reserve price
  volume: number // Market volume
  growth: number // Year-over-year growth
}

export interface FuturesMarketData {
  nearTerm: number // Near-term futures price
  longTerm: number // Long-term futures price
  backwardation: number // Market backwardation/contango
  volatility: number // Implied volatility
}

export interface MarketCorrelations {
  oilPrice: number // Correlation with oil prices
  energyPrices: number // Correlation with energy prices
  economicGrowth: number // Correlation with GDP growth
  esgInvestment: number // Correlation with ESG investment flows
}

export class ClimateReceivablesCalculator extends BaseCalculator {
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
    return [AssetType.CLIMATE_RECEIVABLES]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const climateInput = input as ClimateReceivablesCalculationInput
      
      // Get climate receivables details from database
      const receivableDetails = await this.getClimateReceivableDetails(climateInput)
      
      // Fetch current market data for climate instruments
      const marketData = await this.fetchClimateMarketData(climateInput, receivableDetails)
      
      // Assess verification status and quality metrics
      const verificationMetrics = await this.assessVerificationQuality(climateInput, receivableDetails)
      
      // Analyze policy impact and regulatory environment
      const policyAnalysis = await this.analyzePolicyImpact(climateInput, receivableDetails)
      
      // Calculate base value from market prices
      const baseValue = await this.calculateBaseValue(climateInput, marketData, receivableDetails)
      
      // Apply quality adjustments based on verification and standards
      const qualityAdjustments = await this.calculateQualityAdjustments(
        climateInput, 
        verificationMetrics, 
        receivableDetails
      )
      
      // Apply risk discounts and policy adjustments
      const riskAdjustments = await this.calculateRiskAdjustments(
        climateInput, 
        policyAnalysis, 
        receivableDetails
      )
      
      // Calculate climate risk assessment
      const climateRisk = await this.assessClimateRisks(climateInput, marketData, receivableDetails)
      
      // Apply time-based discounting for future receivables
      const timeAdjustment = await this.calculateTimeValueAdjustment(climateInput, receivableDetails)
      
      // Calculate sustainability impact metrics
      const sustainabilityMetrics = await this.calculateSustainabilityMetrics(
        climateInput, 
        receivableDetails
      )
      
      // Calculate final net present value
      const finalValue = baseValue
        .plus(qualityAdjustments.qualityPremium)
        .plus(policyAnalysis.taxIncentives)
        .plus(policyAnalysis.subsidies)
        .minus(riskAdjustments.totalRiskAdjustment)
        .times(timeAdjustment)
      
      // Build calculation result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `climate_${receivableDetails.receivableId}`,
        productType: AssetType.CLIMATE_RECEIVABLES,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(finalValue),
        totalLiabilities: this.toNumber(riskAdjustments.totalRiskAdjustment),
        netAssets: this.toNumber(finalValue),
        navValue: this.toNumber(finalValue),
        navPerShare: input.sharesOutstanding ? 
          this.toNumber(finalValue.div(this.decimal(input.sharesOutstanding))) : 
          undefined,
        currency: input.targetCurrency || marketData.currency || 'USD',
        pricingSources: {
          carbonMarketPrice: {
            price: marketData.carbonPrice,
            currency: marketData.currency,
            asOf: marketData.asOf,
            source: marketData.source
          },
          complianceValue: {
            price: marketData.complianceValue,
            currency: marketData.currency,
            asOf: marketData.asOf,
            source: 'compliance_market'
          },
          voluntaryValue: {
            price: marketData.voluntaryValue,
            currency: marketData.currency,
            asOf: marketData.asOf,
            source: 'voluntary_market'
          },
          recPrice: {
            price: marketData.recPrice,
            currency: marketData.currency,
            asOf: marketData.asOf,
            source: 'rec_market'
          }
        },
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED,
        metadata: {
          verificationMetrics,
          policyAnalysis,
          climateRisk,
          sustainabilityMetrics,
          qualityAdjustments,
          riskAdjustments,
          marketDynamics: await this.analyzeMarketDynamics(marketData),
          impactMetrics: {
            co2Reduction: sustainabilityMetrics.co2Reduction,
            additionality: sustainabilityMetrics.additionality,
            permanence: sustainabilityMetrics.permanence,
            cobenefit: climateInput.cobenefit
          },
          creditDetails: {
            vintage: receivableDetails.vintage,
            methodology: receivableDetails.methodology,
            geography: receivableDetails.geography,
            projectType: receivableDetails.projectType,
            registry: receivableDetails.registry
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
        error: error instanceof Error ? error.message : 'Unknown climate receivables calculation error',
        code: 'CLIMATE_RECEIVABLES_CALCULATION_FAILED'
      }
    }
  }

  // ==================== CLIMATE RECEIVABLES SPECIFIC METHODS ====================

  /**
   * Fetches climate receivables details from the database
   */
  private async getClimateReceivableDetails(input: ClimateReceivablesCalculationInput): Promise<any> {
    // Mock implementation - replace with actual database query
    return {
      receivableId: input.receivableId || 'CLIMATE_REC_001',
      assetId: input.assetId || 'WIND_FARM_TX_001',
      payerId: input.payerId || 'UTILITY_CORP_001',
      amount: input.amount || 1000000, // 1M tonnes CO2 or 1M MWh
      dueDate: input.dueDate || new Date('2025-12-31'),
      riskScore: input.riskScore || 25, // Low risk
      discountRate: input.discountRate || 0.08, // 8% discount rate
      creditType: input.creditType || 'CARBON_OFFSET',
      vintage: input.vintage || 2024,
      verificationStandard: input.verificationStandard || 'VCS',
      certificationBody: input.certificationBody || 'Verra',
      projectType: input.projectType || 'Renewable Energy - Wind',
      geography: input.geography || 'Texas, USA',
      additionality: input.additionality !== false,
      permanence: input.permanence || 95, // 95% permanence confidence
      registry: input.registry || 'Verra Registry',
      serialNumber: input.serialNumber || 'VCS-1234567890-001',
      issuanceDate: input.issuanceDate || new Date('2024-01-15'),
      retirementDate: input.retirementDate,
      methodology: input.methodology || 'ACM0002 - Grid-connected renewable electricity generation',
      status: 'verified',
      currency: 'USD'
    }
  }

  /**
   * Fetches climate market data and pricing information
   */
  private async fetchClimateMarketData(
    input: ClimateReceivablesCalculationInput,
    receivableDetails: any
  ): Promise<ClimateReceivablesPriceData> {
    // Mock implementation - replace with actual climate market data service
    return {
      price: 25.50, // Base price
      currency: 'USD',
      asOf: input.valuationDate || new Date(),
      source: MarketDataProvider.MANUAL_OVERRIDE,
      carbonPrice: 25.50, // $25.50 per tonne CO2
      recPrice: 45.00, // $45.00 per MWh for RECs
      complianceValue: 28.75, // Compliance market premium
      voluntaryValue: 22.25, // Voluntary market discount
      futuresPrice: 26.80, // Future contract price
      spot: 25.50, // Current spot price
      vintage: receivableDetails.vintage || 2024,
      qualityPremium: 3.25, // Premium for high-quality credits
      geography: receivableDetails.geography || 'North America',
      priceVolatility: 0.18, // 18% volatility
      liquidityScore: 75, // Good liquidity
      demandGrowth: 0.35, // 35% year-over-year growth
      supplyConstraints: 65 // Moderate supply constraints
    }
  }

  /**
   * Assesses verification quality and certification status
   */
  private async assessVerificationQuality(
    input: ClimateReceivablesCalculationInput,
    receivableDetails: any
  ): Promise<VerificationMetrics> {
    return {
      certificationStatus: 'verified',
      verifiedBy: receivableDetails.certificationBody || 'Verra',
      verificationDate: receivableDetails.issuanceDate || new Date('2024-01-15'),
      verificationExpiry: new Date('2027-01-15'),
      additionalityScore: receivableDetails.additionality ? 90 : 40,
      permanenceRisk: 100 - (receivableDetails.permanence || 95),
      leakageRisk: 15, // Low leakage risk for wind projects
      measurementAccuracy: 88, // High accuracy for renewable energy
      monitoringQuality: 85, // Good monitoring systems
      reportingTransparency: 92 // High transparency
    }
  }

  /**
   * Analyzes policy impact and regulatory environment
   */
  private async analyzePolicyImpact(
    input: ClimateReceivablesCalculationInput,
    receivableDetails: any
  ): Promise<PolicyImpactAnalysis> {
    return {
      regulatoryRisk: 25, // Moderate regulatory risk
      policySupport: 80, // Strong policy support for renewables
      complianceRequirement: receivableDetails.creditType === 'COMPLIANCE',
      taxIncentives: 2500, // $2,500 in tax incentives
      subsidies: 1200, // $1,200 in subsidies
      carbonTax: 0, // No carbon tax in region
      capAndTrade: false, // Not part of cap-and-trade system
      netZeroCommitments: 85, // High corporate demand
      internationalAgreements: ['Paris Agreement', 'Glasgow Climate Pact']
    }
  }

  /**
   * Calculates base value from market pricing
   */
  private async calculateBaseValue(
    input: ClimateReceivablesCalculationInput,
    marketData: ClimateReceivablesPriceData,
    receivableDetails: any
  ): Promise<Decimal> {
    const amount = this.decimal(receivableDetails.amount || 0)
    let pricePerUnit = this.decimal(marketData.carbonPrice)
    
    // Use REC price if it's a renewable energy certificate
    if (receivableDetails.creditType === 'REC' || receivableDetails.projectType?.includes('Renewable')) {
      pricePerUnit = this.decimal(marketData.recPrice)
    }
    
    return amount.times(pricePerUnit)
  }

  /**
   * Calculates quality adjustments based on verification standards
   */
  private async calculateQualityAdjustments(
    input: ClimateReceivablesCalculationInput,
    verificationMetrics: VerificationMetrics,
    receivableDetails: any
  ): Promise<{ qualityPremium: Decimal; adjustmentFactors: Record<string, number> }> {
    const baseValue = this.decimal(receivableDetails.amount * 25.50) // Base calculation
    
    let qualityMultiplier = 0
    
    // Verification standard premium
    const standard = receivableDetails.verificationStandard?.toUpperCase()
    if (standard === 'GOLD_STANDARD') qualityMultiplier += 0.15
    else if (standard === 'VCS') qualityMultiplier += 0.10
    else if (standard === 'CAR') qualityMultiplier += 0.08
    
    // Additionality premium
    if (verificationMetrics.additionalityScore >= 85) qualityMultiplier += 0.12
    else if (verificationMetrics.additionalityScore >= 70) qualityMultiplier += 0.05
    
    // Permanence premium
    if (verificationMetrics.permanenceRisk <= 10) qualityMultiplier += 0.08
    else if (verificationMetrics.permanenceRisk <= 25) qualityMultiplier += 0.03
    
    // Co-benefits premium
    if (input.cobenefit) {
      const avgCobenefit = Object.values(input.cobenefit).reduce((a, b) => a + b, 0) / Object.values(input.cobenefit).length
      if (avgCobenefit >= 70) qualityMultiplier += 0.10
      else if (avgCobenefit >= 50) qualityMultiplier += 0.05
    }
    
    const qualityPremium = baseValue.times(this.decimal(qualityMultiplier))
    
    return {
      qualityPremium,
      adjustmentFactors: {
        verification: verificationMetrics.additionalityScore / 100,
        permanence: (100 - verificationMetrics.permanenceRisk) / 100,
        transparency: verificationMetrics.reportingTransparency / 100,
        accuracy: verificationMetrics.measurementAccuracy / 100
      }
    }
  }

  /**
   * Calculates risk adjustments and discounts
   */
  private async calculateRiskAdjustments(
    input: ClimateReceivablesCalculationInput,
    policyAnalysis: PolicyImpactAnalysis,
    receivableDetails: any
  ): Promise<{ totalRiskAdjustment: Decimal; riskBreakdown: Record<string, number> }> {
    const baseValue = this.decimal(receivableDetails.amount * 25.50)
    
    let totalRiskDiscount = 0
    
    // Regulatory risk discount
    totalRiskDiscount += (policyAnalysis.regulatoryRisk / 100) * 0.10
    
    // Counterparty risk discount
    const counterpartyRisk = (receivableDetails.riskScore || 25) / 100
    totalRiskDiscount += counterpartyRisk * 0.15
    
    // Market liquidity risk
    totalRiskDiscount += 0.02 // 2% base liquidity discount
    
    // Technology risk for newer technologies
    if (receivableDetails.projectType?.includes('New Technology')) {
      totalRiskDiscount += 0.05
    }
    
    const totalRiskAdjustment = baseValue.times(this.decimal(totalRiskDiscount))
    
    return {
      totalRiskAdjustment,
      riskBreakdown: {
        regulatory: policyAnalysis.regulatoryRisk / 100,
        counterparty: counterpartyRisk,
        market: 0.02,
        liquidity: 0.02,
        technology: receivableDetails.projectType?.includes('New Technology') ? 0.05 : 0
      }
    }
  }

  /**
   * Assesses comprehensive climate risks
   */
  private async assessClimateRisks(
    input: ClimateReceivablesCalculationInput,
    marketData: ClimateReceivablesPriceData,
    receivableDetails: any
  ): Promise<ClimateRiskAssessment> {
    return {
      transitionRisk: 20, // Low risk - renewables benefit from transition
      physicalRisk: 15, // Low risk for well-located projects
      technologyRisk: receivableDetails.projectType?.includes('Wind') ? 10 : 25,
      marketRisk: marketData.priceVolatility * 100,
      policyRisk: 25, // Moderate policy risk
      reputationalRisk: 5, // Low risk for verified credits
      counterpartyRisk: receivableDetails.riskScore || 25,
      operationalRisk: 20, // Moderate operational risk
      overallRisk: 18 // Composite risk score
    }
  }

  /**
   * Calculates time value adjustment for future receivables
   */
  private async calculateTimeValueAdjustment(
    input: ClimateReceivablesCalculationInput,
    receivableDetails: any
  ): Promise<Decimal> {
    const dueDate = receivableDetails.dueDate
    const valuationDate = input.valuationDate || new Date()
    
    if (!dueDate || dueDate <= valuationDate) {
      return this.decimal(1) // No adjustment for current receivables
    }
    
    const yearsToMaturity = (dueDate.getTime() - valuationDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    const discountRate = receivableDetails.discountRate || 0.08
    const discountFactor = Math.pow(1 + discountRate, -yearsToMaturity)
    
    return this.decimal(discountFactor)
  }

  /**
   * Calculates sustainability impact metrics
   */
  private async calculateSustainabilityMetrics(
    input: ClimateReceivablesCalculationInput,
    receivableDetails: any
  ): Promise<SustainabilityMetrics> {
    const amount = receivableDetails.amount || 0
    
    return {
      co2Reduction: amount, // Tonnes CO2 reduced
      renewableGeneration: receivableDetails.creditType === 'REC' ? amount : 0,
      forestProtection: receivableDetails.projectType?.includes('Forest') ? amount * 0.1 : 0,
      biodiversityImpact: input.cobenefit?.biodiversity || 50,
      communityBenefit: input.cobenefit?.socialImpact || 50,
      sdgContribution: {
        'SDG7': 85, // Clean Energy
        'SDG13': 95, // Climate Action
        'SDG15': input.cobenefit?.biodiversity || 30 // Life on Land
      },
      additionality: 85, // High additionality score
      permanence: receivableDetails.permanence || 95
    }
  }

  /**
   * Analyzes market dynamics and correlations
   */
  private async analyzeMarketDynamics(marketData: ClimateReceivablesPriceData): Promise<MarketDynamics> {
    return {
      complianceMarkets: {
        euEts: 85.50,
        caeT: 28.25,
        rggi: 14.75,
        volume: 1500000,
        growth: 0.25
      },
      voluntaryMarkets: {
        vcs: 22.25,
        goldStandard: 35.50,
        ccb: 28.00,
        car: 26.75,
        volume: 850000,
        growth: 0.45
      },
      futures: {
        nearTerm: 26.80,
        longTerm: 32.50,
        backwardation: -0.05,
        volatility: 0.18
      },
      correlations: {
        oilPrice: -0.15,
        energyPrices: -0.25,
        economicGrowth: 0.35,
        esgInvestment: 0.65
      }
    }
  }

  /**
   * Generates unique run ID for the calculation
   */
  protected override generateRunId(): string {
    return `climate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
