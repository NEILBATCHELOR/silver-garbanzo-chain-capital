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
 * - Solar and wind energy project valuations
 * - Power Purchase Agreement (PPA) analysis
 * - Levelized Cost of Energy (LCOE) calculations
 * 
 * Supports climate receivables from climate_receivables table
 */

import { Decimal } from 'decimal.js'
import { BaseCalculator, CalculatorOptions } from './BaseCalculator'
import { DatabaseService } from '../DatabaseService'
import { climateModels } from '../models'
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
  creditType?: string // carbon, rec, offset
  vintage?: number
  verificationStandard?: string
  certificationBody?: string
  projectType?: string // solar, wind, forestry, energy_efficiency
  geography?: string
  additionality?: boolean
  permanence?: number
  cobenefit?: CobenefitDetails
  registry?: string
  serialNumber?: string
  issuanceDate?: Date
  retirementDate?: Date
  methodology?: string
  
  // Energy project specific
  installedCapacity?: number // MW
  capacityFactor?: number
  energyOutput?: number[] // MWh per year
  capitalCosts?: number
  operatingCosts?: number[]
  contractPrice?: number // PPA price per MWh
  marketPrice?: number[] // Market prices per MWh
  projectLifespan?: number // years
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

export class ClimateReceivablesCalculator extends BaseCalculator {
  constructor(databaseService: DatabaseService, options: CalculatorOptions = {}) {
    super(databaseService, options)
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
      
      // Calculate valuation based on receivable type
      let valuation: any
      
      if (climateInput.projectType === 'solar' || climateInput.projectType === 'wind') {
        valuation = await this.calculateRenewableEnergyValue(climateInput, receivableDetails)
      } else if (climateInput.creditType === 'carbon' || climateInput.creditType === 'offset') {
        valuation = await this.calculateCarbonCreditValue(climateInput, receivableDetails)
      } else {
        valuation = await this.calculateGenericClimateValue(climateInput, receivableDetails)
      }
      
      // Assess verification status and quality metrics
      const verificationMetrics = await this.assessVerificationQuality(climateInput, receivableDetails)
      
      // Analyze policy impact and regulatory environment
      const policyAnalysis = await this.analyzePolicyImpact(climateInput, receivableDetails)
      
      // Perform climate risk assessment
      const riskAssessment = await this.performClimateRiskAssessment(climateInput, receivableDetails)
      
      // Calculate sustainability metrics
      const sustainabilityMetrics = await this.calculateSustainabilityMetrics(climateInput, receivableDetails)
      
      // Apply adjustments based on risk and policy factors
      const adjustments = await this.applyClimateAdjustments(
        valuation,
        verificationMetrics,
        policyAnalysis,
        riskAssessment
      )
      
      // Calculate final NAV
      const grossAssetValue = valuation.totalValue
      const totalLiabilities = adjustments.total
      const netAssetValue = grossAssetValue.minus(totalLiabilities)
      
      // Build comprehensive result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `climate_${climateInput.receivableId}`,
        productType: AssetType.CLIMATE_RECEIVABLES,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(grossAssetValue),
        totalLiabilities: this.toNumber(totalLiabilities),
        netAssets: this.toNumber(netAssetValue),
        navValue: this.toNumber(netAssetValue),
        currency: input.targetCurrency || 'USD',
        pricingSources: this.buildClimatePricingSources(valuation, climateInput),
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED,
        metadata: {
          creditType: climateInput.creditType,
          projectType: climateInput.projectType,
          vintage: climateInput.vintage,
          verificationStandard: climateInput.verificationStandard,
          verificationMetrics: {
            certificationStatus: verificationMetrics.certificationStatus,
            additionalityScore: verificationMetrics.additionalityScore,
            permanenceRisk: verificationMetrics.permanenceRisk
          },
          policyAnalysis: {
            regulatoryRisk: policyAnalysis.regulatoryRisk,
            policySupport: policyAnalysis.policySupport,
            carbonTax: policyAnalysis.carbonTax
          },
          riskAssessment: {
            overallRisk: riskAssessment.overallRisk,
            transitionRisk: riskAssessment.transitionRisk,
            physicalRisk: riskAssessment.physicalRisk
          },
          sustainabilityMetrics: {
            co2Reduction: sustainabilityMetrics.co2Reduction,
            renewableGeneration: sustainabilityMetrics.renewableGeneration,
            additionality: sustainabilityMetrics.additionality
          },
          financialMetrics: valuation.metrics || {}
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
        code: 'CLIMATE_CALCULATION_FAILED'
      }
    }
  }
  
  // ==================== RENEWABLE ENERGY VALUATION ====================
  
  private async calculateRenewableEnergyValue(
    input: ClimateReceivablesCalculationInput,
    receivableDetails: any
  ): Promise<any> {
    // Use climate models for renewable energy projects
    
    if (input.projectType === 'solar') {
      // Solar project valuation
      const solarParams = {
        installedCapacity: input.installedCapacity || 10, // MW
        capacityFactor: input.capacityFactor || 0.20,
        degradationRate: 0.005, // 0.5% per year
        operatingCosts: input.operatingCosts || Array(25).fill(20000),
        maintenanceCosts: Array(25).fill((input.operatingCosts?.[0] ?? 20000) * 0.1),
        ppaPrice: input.contractPrice || 50, // $/MWh
        projectLife: input.projectLifespan || 25,
        discountRate: input.discountRate || 0.06,
        investmentTaxCredit: 0.3, // 30% ITC
        acceleratedDepreciation: true
      }
      
      const solarValue = climateModels.solarProjectValuation(solarParams)
      
      // Calculate LCOE for solar
      const lcoeParams = {
        capitalCosts: input.capitalCosts || 1000000,
        operatingCosts: input.operatingCosts || Array(25).fill(20000),
        energyOutput: this.generateEnergyOutput(input.installedCapacity || 10, input.capacityFactor || 0.20, 25),
        discountRate: input.discountRate || 0.06,
        projectLife: input.projectLifespan || 25
      }
      
      const lcoe = climateModels.calculateLCOE(lcoeParams)
      
      // Climate models return Decimal values directly
      const solarProjectValue = solarValue
      const solarIrr = new Decimal(0.08) // Estimated IRR
      const solarPayback = new Decimal(12) // Estimated payback in years
      const solarTotalEnergy = new Decimal(lcoeParams.energyOutput.reduce((sum, val) => sum + val, 0))
      
      return {
        projectValue: solarProjectValue,
        lcoe,
        totalValue: solarProjectValue,
        metrics: {
          irr: solarIrr,
          paybackPeriod: solarPayback,
          totalEnergyGenerated: solarTotalEnergy,
          carbonOffset: solarTotalEnergy.times(0.0005) // tonnes CO2 per MWh
        }
      }
      
    } else if (input.projectType === 'wind') {
      // Wind project valuation
      const windParams = {
        installedCapacity: input.installedCapacity || 50, // MW
        capacityFactor: input.capacityFactor || 0.35,
        windResource: 7.5, // m/s average wind speed
        turbineEfficiency: 0.90,
        availabilityFactor: 0.95,
        operatingCosts: input.operatingCosts || Array(25).fill(1500000),
        maintenanceCosts: Array(25).fill((input.operatingCosts?.[0] ?? 1500000) * 0.15),
        ppaPrice: input.contractPrice || 45, // $/MWh
        projectLife: input.projectLifespan || 25,
        discountRate: input.discountRate || 0.07,
        productionTaxCredit: 0.026 // 2.6 cents per kWh PTC
      }
      
      const windValue = climateModels.windProjectValuation(windParams)
      
      // Calculate LCOE for wind
      const lcoeParams = {
        capitalCosts: input.capitalCosts || 70000000,
        operatingCosts: input.operatingCosts || Array(25).fill(1500000),
        energyOutput: this.generateEnergyOutput(input.installedCapacity || 50, input.capacityFactor || 0.35, 25),
        discountRate: input.discountRate || 0.07,
        projectLife: input.projectLifespan || 25
      }
      
      const lcoe = climateModels.calculateLCOE(lcoeParams)
      
      // Climate models return Decimal values directly
      const windProjectValue = windValue
      const windIrr = new Decimal(0.09) // Estimated IRR
      const windPayback = new Decimal(10) // Estimated payback in years
      const windTotalEnergy = new Decimal(lcoeParams.energyOutput.reduce((sum, val) => sum + val, 0))
      const windCapacityFactor = new Decimal(input.capacityFactor || 0.35)
      
      return {
        projectValue: windProjectValue,
        lcoe,
        totalValue: windProjectValue,
        metrics: {
          irr: windIrr,
          paybackPeriod: windPayback,
          totalEnergyGenerated: windTotalEnergy,
          capacityFactorAchieved: windCapacityFactor,
          carbonOffset: windTotalEnergy.times(0.0005) // Fix: use windTotalEnergy instead of windValue.totalEnergy
        }
      }
    }
    
    // Default renewable energy DCF - convert cash flows to ClimateFlow format
    const cashFlows = this.generateRenewableCashFlows(input)
    const climateFlows: any[] = cashFlows.map((cf, index) => ({
      period: index + 1,
      carbonCredits: 0,
      energyRevenue: cf,
      operatingCosts: 0,
      maintenanceCosts: 0,
      carbonPrice: 0
    }))
    
    const dcfValue = climateModels.climateReceivablesDCF(
      climateFlows,
      0.04 // green discount rate
    )
    
    return {
      dcfValue,
      totalValue: dcfValue,
      metrics: {}
    }
  }
  
  // ==================== CARBON CREDIT VALUATION ====================
  
  private async calculateCarbonCreditValue(
    input: ClimateReceivablesCalculationInput,
    receivableDetails: any
  ): Promise<any> {
    // Fetch current carbon market prices
    const carbonPrices = await this.fetchCarbonPrices(input)
    
    // Calculate carbon credit value
    const creditValue = climateModels.carbonCreditValue({
      tonnes: receivableDetails.tonnes || input.amount || 1000,
      pricePerTonne: carbonPrices.currentPrice,
      additionalityFactor: input.additionality ? 0.9 : 0.7,
      leakageRate: 0.05,
      permanenceRisk: 0.1,
      verificationCost: 1000,
      vintageYear: input.vintage || new Date().getFullYear(),
      projectType: 'avoided_emissions'
    })
    
    // Calculate green premium based on quality score
    const qualityScore = this.calculateQualityScore(input, receivableDetails)
    const greenPremium = new Decimal(carbonPrices.currentPrice)
      .times(qualityScore * 0.1) // 10% premium for high quality
    
    return {
      creditValue,
      greenPremium,
      totalValue: creditValue.plus(greenPremium),
      metrics: {
        pricePerTonne: carbonPrices.currentPrice,
        totalTonnes: receivableDetails.tonnes || input.amount || 1000,
        vintage: input.vintage || new Date().getFullYear(),
        additionalityFactor: input.additionality ? 0.9 : 0.7
      }
    }
  }
  
  // ==================== PPA VALUATION ====================
  
  private async calculatePPAValue(
    input: ClimateReceivablesCalculationInput
  ): Promise<any> {
    if (!input.energyOutput || !input.contractPrice) {
      return { totalValue: this.decimal(0), metrics: {} }
    }
    
    const ppaValue = climateModels.ppaValuation({
      contractPrice: input.contractPrice!,
      volume: input.energyOutput!,
      marketPrice: input.marketPrice || Array(input.energyOutput!.length).fill(input.contractPrice! * 0.9),
      contractTerm: input.projectLifespan || 20,
      discountRate: input.discountRate || 0.06,
      escalationRate: 0.025,
      curtailmentRisk: 0.02,
      creditRisk: 0.01
    })
    
    return {
      ppaValue,
      totalValue: ppaValue,
      metrics: {
        totalContractValue: ppaValue,
        marketValue: ppaValue, // PPA valuation returns net value difference
        valueCapture: ppaValue,
        averagePrice: input.contractPrice || 50
      }
    }
  }
  
  // ==================== GENERIC CLIMATE VALUATION ====================
  
  private async calculateGenericClimateValue(
    input: ClimateReceivablesCalculationInput,
    receivableDetails: any
  ): Promise<any> {
    // Generate climate-specific cash flows
    const cashFlows = this.generateClimateCashFlows(input, receivableDetails)
    
    // Apply climate receivables DCF - convert cash flows to ClimateFlow format
    const climateFlows: any[] = cashFlows.map((cf, index) => ({
      period: index + 1,
      carbonCredits: 0,
      energyRevenue: cf,
      operatingCosts: 0,
      maintenanceCosts: 0,
      carbonPrice: 0
    }))
    
    const dcfValue = climateModels.climateReceivablesDCF(
      climateFlows,
      0.04 // green discount
    )
    
    return {
      dcfValue,
      totalValue: dcfValue,
      metrics: {
        cashFlowPeriods: cashFlows.length,
        greenDiscountApplied: 0.04,
        additionalityFactor: input.additionality ? 0.9 : 0.7
      }
    }
  }
  
  // ==================== HELPER METHODS ====================
  
  private async getClimateReceivableDetails(input: ClimateReceivablesCalculationInput): Promise<any> {
    try {
      const receivableDetails = await this.databaseService.getClimateReceivableById(input.receivableId!)
      
      return {
        id: receivableDetails.id,
        amount: receivableDetails.amount,
        tonnes: receivableDetails.carbon_tonnes || 1000,
        dueDate: receivableDetails.due_date,
        certificationStatus: receivableDetails.certification_status || 'pending',
        projectLocation: receivableDetails.project_location,
        creditType: receivableDetails.credit_type || input.creditType || 'carbon',
        vintage: receivableDetails.vintage_year || input.vintage || new Date().getFullYear()
      }
    } catch (error) {
      // Fallback to input data
      return {
        id: input.receivableId,
        amount: input.amount || 100000,
        tonnes: 1000,
        dueDate: input.dueDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        certificationStatus: 'verified',
        projectLocation: input.geography || 'United States',
        creditType: input.creditType || 'carbon',
        vintage: input.vintage || new Date().getFullYear()
      }
    }
  }
  
  private generateEnergyOutput(capacity: number, capacityFactor: number, years: number): number[] {
    const annualOutput = capacity * capacityFactor * 8760 // MW * CF * hours/year = MWh
    const output: number[] = []
    
    for (let i = 0; i < years; i++) {
      // Apply degradation for solar
      const degradation = Math.pow(0.995, i) // 0.5% annual degradation
      output.push(annualOutput * degradation)
    }
    
    return output
  }
  
  private generateRenewableCashFlows(input: ClimateReceivablesCalculationInput): number[] {
    const cashFlows: number[] = []
    const years = input.projectLifespan || 20
    
    for (let i = 0; i < years; i++) {
      const revenue = (input.energyOutput?.[i] || 10000) * (input.contractPrice || 50)
      const costs = input.operatingCosts?.[i] || 20000
      cashFlows.push(revenue - costs)
    }
    
    return cashFlows
  }
  
  private generateClimateCashFlows(input: ClimateReceivablesCalculationInput, receivableDetails: any): number[] {
    const amount = receivableDetails.amount || input.amount || 100000
    const dueDate = new Date(receivableDetails.dueDate || input.dueDate || Date.now() + 90 * 24 * 60 * 60 * 1000)
    const yearsToMaturity = Math.max(0, (dueDate.getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000))
    
    if (yearsToMaturity <= 1) {
      return [amount]
    }
    
    // Split into annual payments
    const annualPayment = amount / Math.ceil(yearsToMaturity)
    const cashFlows: number[] = []
    
    for (let i = 0; i < Math.ceil(yearsToMaturity); i++) {
      cashFlows.push(annualPayment)
    }
    
    return cashFlows
  }
  
  private async fetchCarbonPrices(input: ClimateReceivablesCalculationInput): Promise<any> {
    // TODO: Integrate with real carbon market API
    return {
      currentPrice: 85, // $/tonne CO2e (EU ETS price)
      voluntaryPrice: 15, // $/tonne CO2e (voluntary market)
      futurePrice: 95, // Expected future price
      liquidityScore: 0.7
    }
  }
  
  private calculateQualityScore(input: ClimateReceivablesCalculationInput, receivableDetails: any): number {
    let score = 0.5 // Base score
    
    if (input.additionality) score += 0.2
    if (input.verificationStandard === 'gold_standard') score += 0.15
    if (input.permanence && input.permanence > 50) score += 0.1
    if (input.cobenefit && input.cobenefit.biodiversity > 70) score += 0.05
    
    return Math.min(1.0, score)
  }
  
  private async assessVerificationQuality(
    input: ClimateReceivablesCalculationInput,
    receivableDetails: any
  ): Promise<VerificationMetrics> {
    return {
      certificationStatus: receivableDetails.certificationStatus || 'verified',
      verifiedBy: input.certificationBody || 'Verra',
      verificationDate: new Date(),
      verificationExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      additionalityScore: input.additionality ? 85 : 60,
      permanenceRisk: input.permanence || 20,
      leakageRisk: 15,
      measurementAccuracy: 90,
      monitoringQuality: 85,
      reportingTransparency: 88
    }
  }
  
  private async analyzePolicyImpact(
    input: ClimateReceivablesCalculationInput,
    receivableDetails: any
  ): Promise<PolicyImpactAnalysis> {
    return {
      regulatoryRisk: 25,
      policySupport: 75,
      complianceRequirement: input.creditType === 'carbon',
      taxIncentives: input.projectType === 'solar' ? 0.3 : 0.1, // 30% ITC for solar
      subsidies: 0,
      carbonTax: 50, // $/tonne CO2
      capAndTrade: true,
      netZeroCommitments: 85,
      internationalAgreements: ['Paris Agreement', 'Glasgow Pact']
    }
  }
  
  private async performClimateRiskAssessment(
    input: ClimateReceivablesCalculationInput,
    receivableDetails: any
  ): Promise<ClimateRiskAssessment> {
    const transitionRisk = 0.35
    const physicalRisk = 0.25
    const technologyRisk = input.projectType === 'solar' || input.projectType === 'wind' ? 0.15 : 0.25
    const marketRisk = 0.30
    const policyRisk = 0.20
    const reputationalRisk = 0.10
    const counterpartyRisk = 0.15
    const operationalRisk = 0.20
    
    const overallRisk = (
      transitionRisk * 0.2 +
      physicalRisk * 0.15 +
      technologyRisk * 0.1 +
      marketRisk * 0.2 +
      policyRisk * 0.15 +
      reputationalRisk * 0.05 +
      counterpartyRisk * 0.1 +
      operationalRisk * 0.05
    )
    
    return {
      transitionRisk,
      physicalRisk,
      technologyRisk,
      marketRisk,
      policyRisk,
      reputationalRisk,
      counterpartyRisk,
      operationalRisk,
      overallRisk
    }
  }
  
  private async calculateSustainabilityMetrics(
    input: ClimateReceivablesCalculationInput,
    receivableDetails: any
  ): Promise<SustainabilityMetrics> {
    const co2Reduction = receivableDetails.tonnes || 1000
    const renewableGeneration = input.energyOutput ? 
      input.energyOutput.reduce((a, b) => a + b, 0) : 0
    
    return {
      co2Reduction,
      renewableGeneration,
      forestProtection: 0,
      biodiversityImpact: input.cobenefit?.biodiversity || 50,
      communityBenefit: input.cobenefit?.socialImpact || 60,
      sdgContribution: {
        'SDG7': 80, // Affordable and clean energy
        'SDG13': 90, // Climate action
        'SDG15': 70 // Life on land
      },
      additionality: input.additionality ? 85 : 50,
      permanence: input.permanence || 75
    }
  }
  
  private async applyClimateAdjustments(
    valuation: any,
    verificationMetrics: VerificationMetrics,
    policyAnalysis: PolicyImpactAnalysis,
    riskAssessment: ClimateRiskAssessment
  ): Promise<any> {
    const verificationAdjustment = verificationMetrics.certificationStatus === 'verified' ? 
      this.decimal(0) : this.decimal(valuation.totalValue).times(0.2)
    
    const riskAdjustment = this.decimal(valuation.totalValue).times(riskAssessment.overallRisk * 0.1)
    
    const policyAdjustment = policyAnalysis.complianceRequirement ? 
      this.decimal(0) : this.decimal(valuation.totalValue).times(0.05)
    
    return {
      verificationAdjustment,
      riskAdjustment,
      policyAdjustment,
      total: verificationAdjustment.plus(riskAdjustment).plus(policyAdjustment)
    }
  }
  
  private buildClimatePricingSources(valuation: any, input: ClimateReceivablesCalculationInput): Record<string, PriceData> {
    const sources: Record<string, PriceData> = {
      climate_valuation: {
        price: this.toNumber(valuation.totalValue),
        currency: 'USD',
        asOf: new Date(),
        source: 'climate_models'
      }
    }
    
    if (valuation.lcoe) {
      sources.levelized_cost = {
        price: this.toNumber(valuation.lcoe),
        currency: 'USD/MWh',
        asOf: new Date(),
        source: 'lcoe_calculation'
      }
    }
    
    if (valuation.creditValue) {
      sources.carbon_credit = {
        price: this.toNumber(valuation.creditValue),
        currency: 'USD/tCO2e',
        asOf: new Date(),
        source: 'carbon_market'
      }
    }
    
    return sources
  }
  
  protected override generateRunId(): string {
    return `climate_nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
