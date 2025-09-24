/**
 * InfrastructureCalculator - NAV calculation for Infrastructure assets
 * 
 * Handles:
 * - Infrastructure investments across transportation, energy, utilities, social infrastructure
 * - Regulatory framework analysis and rate base calculations
 * - Long-term cash flow projections with inflation adjustments
 * - Asset lifecycle management and replacement capex modeling
 * - Revenue model analysis (regulated, contracted, merchant)
 * - Economic and regulatory risk assessment
 * - Concession agreement valuation and termination provisions
 * - ESG factors and sustainability impact
 * - Construction and development phase modeling
 * - Operations and maintenance cost projections
 * - Asset condition and depreciation schedules
 * - Political and regulatory change impact
 * 
 * Supports infrastructure products from infrastructure_products table
 */

import { Decimal } from 'decimal.js'
import { BaseCalculator, CalculatorOptions } from './BaseCalculator'
import { DatabaseService } from '../DatabaseService'
import { infrastructureModels } from '../models'
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

export interface InfrastructureCalculationInput extends CalculationInput {
  // Infrastructure specific parameters
  assetId?: string
  assetType?: string // transportation, energy, utilities, social, telecom
  subAssetType?: string // toll_roads, airports, power_generation, water_treatment, hospitals
  geographicLocation?: string
  constructionStartDate?: Date
  operationalDate?: Date
  concessionEndDate?: Date
  regulatoryFramework?: string // regulated_utility, concession, ppp, merchant
  revenueModel?: string // regulated_tariff, availability_payment, merchant_revenue
  // Financial parameters
  totalInvestment?: number
  constructionCost?: number
  operatingRevenue?: number
  operatingExpenses?: number
  regulatedAssetBase?: number
  allowedReturnOnEquity?: number
  concessionLength?: number // years
  // Risk factors
  regulatoryRisk?: number
  constructionRisk?: number
  operationalRisk?: number
  politicalRisk?: number
  inflationLinked?: boolean
  currencyRisk?: boolean
  // ESG factors
  esgScore?: number
  carbonIntensity?: number
  socialImpactScore?: number
}

export interface InfrastructureAsset {
  assetId: string
  assetName: string
  assetType: string
  subAssetType: string
  geographicLocation: string
  country: string
  region: string
  constructionStartDate?: Date
  operationalDate: Date
  concessionEndDate?: Date
  remainingConcessionLife: number
  assetLifeRemaining: number
  totalInvestment: number
  constructionCost: number
  regulatoryFramework: string
  revenueModel: string
  keyContracts: ContractDetails[]
  regulatoryMetrics: RegulatoryMetrics
  operationalMetrics: OperationalMetrics
  esgMetrics: ESGMetrics
  assetCondition: AssetCondition
}

export interface ContractDetails {
  contractType: string // concession, ppa, capacity_agreement, service_contract
  counterparty: string
  contractLength: number
  startDate: Date
  endDate: Date
  revenueType: string // fixed, variable, availability, performance
  escalation: EscalationMechanism
  terminationClauses: TerminationClause[]
  performanceMetrics: PerformanceMetric[]
  creditRating: string
  guarantees: string[]
}

export interface EscalationMechanism {
  type: string // cpi_linked, fixed_rate, performance_based
  baseRate: number
  inflationIndex: string
  cappedRate?: number
  flooredRate?: number
  reviewFrequency: string
}

export interface TerminationClause {
  trigger: string // default, convenience, force_majeure
  noticePeriod: number
  compensationMechanism: string
  assetOwnership: string // revert, transfer, shared
}

export interface PerformanceMetric {
  metric: string // availability, throughput, quality
  target: number
  actual: number
  penaltyRate: number
  bonusRate: number
  measurementFrequency: string
}

export interface RegulatoryMetrics {
  framework: string
  regulator: string
  rateBase: number
  allowedROE: number
  allowedROA: number
  nextRateReview: Date
  rateReviewFrequency: number
  tariffEscalation: number
  subsidiesReceived: number
  regulatoryChanges: RegulatoryChange[]
}

export interface RegulatoryChange {
  changeDate: Date
  description: string
  financialImpact: number
  probabilityOfImplementation: number
  timeToImplementation: number
}

export interface OperationalMetrics {
  capacity: number
  utilization: number
  throughput: number
  availability: number
  operatingCosts: number
  maintenanceCosts: number
  capitalExpenditures: number
  operatingMargin: number
  ebitdaMargin: number
  fuelOrEnergyCosts?: number
  laborCosts: number
  contractorCosts: number
  insuranceCosts: number
  // Derived revenue metrics
  operatingRevenue?: number
  operatingExpenses?: number
}

export interface ESGMetrics {
  overallScore: number
  environmentalScore: number
  socialScore: number
  socialImpactScore: number
  governanceScore: number
  carbonEmissions: number
  carbonIntensity: number
  waterUsage: number
  wasteGeneration: number
  jobsCreated: number
  localCommunityImpact: number
  safetyIncidents: number
  complianceScore: number
}

export interface AssetCondition {
  overallCondition: string // excellent, good, fair, poor
  ageYears: number
  expectedLifeRemaining: number
  maintenanceBacklog: number
  replacementCapexRequired: number
  conditionAssessments: ConditionAssessment[]
  maintenancePlans: MaintenancePlan[]
}

export interface ConditionAssessment {
  assessmentDate: Date
  component: string
  condition: string
  recommendedAction: string
  costEstimate: number
  urgency: string // immediate, within_year, within_5_years, long_term
}

export interface MaintenancePlan {
  component: string
  maintenanceType: string // preventive, corrective, capital
  frequency: string
  annualCost: number
  nextScheduledDate: Date
  deferralImpact: number
}

export interface InfrastructureRiskAssessment {
  overallRisk: string // low, moderate, high, very_high
  constructionRisk: number
  operationalRisk: number
  regulatoryRisk: number
  politicalRisk: number
  technologyRisk: number
  environmentalRisk: number
  demandRisk: number
  creditRisk: number
  liquidityRisk: number
  riskMitigationFactors: string[]
  riskPremium: number
}

export class InfrastructureCalculator extends BaseCalculator {
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
    return [AssetType.INFRASTRUCTURE]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const infraInput = input as InfrastructureCalculationInput

      // Get infrastructure asset details
      const assetDetails = await this.getInfrastructureAssetDetails(infraInput)
      
      // Perform risk assessment
      const riskAssessment = await this.performRiskAssessment(assetDetails, infraInput)
      
      // Calculate valuation using infrastructure models
      const valuation = await this.calculateInfrastructureValuation(assetDetails, riskAssessment, infraInput)
      
      // Apply infrastructure-specific adjustments
      const adjustments = await this.calculateInfrastructureAdjustments(
        assetDetails, 
        riskAssessment, 
        infraInput
      )
      
      // Calculate final NAV
      const grossAssetValue = valuation.totalValue
      const totalLiabilities = adjustments.operationalLiabilities
        .plus(adjustments.regulatoryLiabilities)
        .plus(adjustments.maintenanceReserves)
      
      const netAssetValue = grossAssetValue.minus(totalLiabilities)
      
      // Build comprehensive result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `infra_${assetDetails.assetId}`,
        productType: AssetType.INFRASTRUCTURE,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(grossAssetValue),
        totalLiabilities: this.toNumber(totalLiabilities),
        netAssets: this.toNumber(netAssetValue),
        navValue: this.toNumber(netAssetValue),
        currency: input.targetCurrency || 'USD',
        pricingSources: this.buildInfrastructurePricingSources(valuation, assetDetails),
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED,
        metadata: {
          assetType: assetDetails.assetType,
          subAssetType: assetDetails.subAssetType,
          regulatoryFramework: assetDetails.regulatoryFramework,
          revenueModel: assetDetails.revenueModel,
          concessionRemaining: assetDetails.remainingConcessionLife,
          assetLifeRemaining: assetDetails.assetLifeRemaining,
          operationalMetrics: {
            capacity: assetDetails.operationalMetrics.capacity,
            utilization: assetDetails.operationalMetrics.utilization,
            availability: assetDetails.operationalMetrics.availability,
            ebitdaMargin: assetDetails.operationalMetrics.ebitdaMargin
          },
          esgMetrics: {
            overallScore: assetDetails.esgMetrics.overallScore,
            carbonIntensity: assetDetails.esgMetrics.carbonIntensity,
            socialImpactScore: assetDetails.esgMetrics.socialImpactScore
          },
          riskAssessment: {
            overallRisk: riskAssessment.overallRisk,
            regulatoryRisk: riskAssessment.regulatoryRisk,
            operationalRisk: riskAssessment.operationalRisk,
            riskPremium: riskAssessment.riskPremium
          },
          valuationSummary: {
            pppValue: valuation.pppValue ? this.toNumber(valuation.pppValue) : undefined,
            regulatedAssetBase: valuation.rab ? this.toNumber(valuation.rab) : undefined,
            tariffRevenue: valuation.tariffRevenue ? this.toNumber(valuation.tariffRevenue) : undefined,
            totalValue: this.toNumber(valuation.totalValue)
          },
          financialMetrics: valuation.metrics ? {
            projectIRR: this.toNumber(valuation.metrics.irr),
            debtServiceCoverageRatio: this.toNumber(valuation.metrics.dscr),
            loanLifeCoverageRatio: this.toNumber(valuation.metrics.llcr)
          } : undefined
        }
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown infrastructure calculation error',
        code: 'INFRASTRUCTURE_CALCULATION_FAILED'
      }
    }
  }

  // ==================== INFRASTRUCTURE SPECIFIC METHODS ====================

  /**
   * Calculates infrastructure valuation using specialized models
   */
  private async calculateInfrastructureValuation(
    asset: InfrastructureAsset,
    riskAssessment: InfrastructureRiskAssessment,
    input: InfrastructureCalculationInput
  ): Promise<any> {
    const discountRate = 0.08 + riskAssessment.riskPremium
    
    // Use appropriate valuation method based on regulatory framework
    if (asset.regulatoryFramework === 'ppp' || asset.regulatoryFramework === 'concession') {
      // PPP Valuation for Public-Private Partnerships
      const pppValue = infrastructureModels.pppValuation({
        availabilityPayments: this.generateAvailabilityPayments(asset),
        concessionPeriod: asset.remainingConcessionLife,
        discountRate: discountRate,
        inflationRate: 0.025,
        operatingCosts: this.generateOperatingCostArray(asset)
      })
      
      // Also calculate infrastructure DCF
      const dcfValue = infrastructureModels.infrastructureDCF({
        cashFlows: this.generateInfrastructureCashFlows(asset),
        discountRate: discountRate,
        inflationRate: 0.02,
        taxRate: 0.25
      })
      
      return {
        pppValue,
        dcfValue,
        totalValue: pppValue.plus(dcfValue).div(2), // Average of two methods
        metrics: infrastructureModels.calculateMetrics(
          asset.totalInvestment,
          this.generateCashFlows(asset),
          asset.totalInvestment * 0.7,
          this.generateDebtServiceArray(asset.totalInvestment * 0.7, 0.045, Math.min(20, asset.remainingConcessionLife)),
          discountRate
        )
      }
    } else if (asset.regulatoryFramework === 'regulated_utility') {
      // Regulatory Asset Base valuation for regulated utilities
      const rab = infrastructureModels.regulatoryAssetBase({
        initialInvestment: asset.totalInvestment,
        depreciation: this.calculateAccumulatedDepreciation(asset),
        additions: this.calculateCapitalAdditions(asset),
        workingCapital: this.calculateWorkingCapital(asset),
        regulatoryPeriod: 1,
        allowedReturn: 0.025 // regulatory depreciation rate
      })
      
      // Calculate allowed revenue
      const allowedRevenue = infrastructureModels.calculateAllowedRevenue(
        this.toNumber(rab),
        input.allowedReturnOnEquity || 0.095,
        this.calculateDepreciation(asset),
        asset.operationalMetrics.operatingCosts,
        0.25 // tax rate
      )
      
      const dcfValue = infrastructureModels.infrastructureDCF({
        cashFlows: this.generateRegulatedInfrastructureCashFlows(asset, allowedRevenue),
        discountRate: discountRate,
        inflationRate: 0.02,
        taxRate: 0.25
      })
      
      return {
        rab,
        allowedRevenue,
        dcfValue,
        totalValue: dcfValue,
        metrics: infrastructureModels.calculateMetrics(
          asset.totalInvestment,
          this.generateRegulatedCashFlows(asset, allowedRevenue),
          asset.totalInvestment * 0.6,
          this.generateDebtServiceArray(asset.totalInvestment * 0.6, 0.04, 25),
          discountRate
        )
      }
    } else {
      // Merchant/Tariff model for other infrastructure
      const tariffRevenue = infrastructureModels.tariffModel({
        usageVolume: asset.operationalMetrics.throughput,
        fixedTariff: 25, // fixed tariff per unit
        variableTariff: asset.operationalMetrics.throughput * 0.15 // variable tariff
      })
      
      const dcfValue = infrastructureModels.infrastructureDCF({
        cashFlows: this.generateMerchantInfrastructureCashFlows(asset, tariffRevenue),
        discountRate: discountRate,
        inflationRate: 0.02,
        taxRate: 0.25
      })
      
      return {
        tariffRevenue,
        dcfValue,
        totalValue: dcfValue,
        metrics: infrastructureModels.calculateMetrics(
          asset.totalInvestment,
          this.generateMerchantCashFlows(asset, tariffRevenue),
          asset.totalInvestment * 0.5,
          this.generateDebtServiceArray(asset.totalInvestment * 0.5, 0.05, 20),
          discountRate
        )
      }
    }
  }

  /**
   * Fetches infrastructure asset details from database
   */
  private async getInfrastructureAssetDetails(input: InfrastructureCalculationInput): Promise<InfrastructureAsset> {
    try {
      // Get real infrastructure product data from database
      const productDetails = await this.databaseService.getInfrastructureProductById(input.assetId!)
      
      const operationalDate = input.operationalDate || 
        (productDetails.operational_date ? new Date(productDetails.operational_date) : new Date('2020-01-01'))
      const concessionEndDate = input.concessionEndDate || this.calculateConcessionEndDate(operationalDate, productDetails.concession_period_years || 30)
      const remainingConcessionLife = this.calculateYearsRemaining(concessionEndDate)
      
      return {
        assetId: productDetails.id,
        assetName: productDetails.project_name || `Infrastructure Asset ${input.assetId}`,
        assetType: input.assetType || productDetails.infrastructure_type || 'transportation',
        subAssetType: input.subAssetType || this.getSubAssetType(productDetails.infrastructure_type),
        geographicLocation: input.geographicLocation || productDetails.location || 'United States',
        country: 'United States',
        region: 'North America',
        constructionStartDate: input.constructionStartDate || (productDetails.construction_date ? new Date(productDetails.construction_date) : undefined),
        operationalDate,
        concessionEndDate,
        remainingConcessionLife,
        assetLifeRemaining: 25,
        totalInvestment: input.totalInvestment || productDetails.asset_value || 500000000,
        constructionCost: input.constructionCost || (productDetails.asset_value ? productDetails.asset_value * 0.9 : 450000000),
        regulatoryFramework: input.regulatoryFramework || this.getRegularoryFramework(productDetails.infrastructure_type),
        revenueModel: input.revenueModel || productDetails.revenue_model || 'merchant_revenue',
        keyContracts: this.buildInfrastructureContracts(productDetails, operationalDate, concessionEndDate),
        regulatoryMetrics: this.buildRegulatoryMetrics(input, productDetails),
        operationalMetrics: this.buildOperationalMetrics(input, productDetails),
        esgMetrics: this.buildEsgMetrics(input, productDetails),
        assetCondition: this.buildAssetCondition(input, productDetails, operationalDate)
      }
    } catch (error) {
      // Graceful fallback with intelligent defaults
      this.logger?.warn({ error, assetId: input.assetId }, 'Failed to fetch infrastructure product details, using fallback')
      
      return this.buildFallbackInfrastructureAsset(input)
    }
  }

  /**
   * Performs comprehensive risk assessment for infrastructure assets
   */
  private async performRiskAssessment(
    asset: InfrastructureAsset, 
    input: InfrastructureCalculationInput
  ): Promise<InfrastructureRiskAssessment> {
    // Assess different risk categories
    const constructionRisk = asset.operationalDate ? 0.02 : 0.15 // Lower if operational
    const operationalRisk = this.assessOperationalRisk(asset)
    const regulatoryRisk = input.regulatoryRisk || this.assessRegulatoryRisk(asset)
    const politicalRisk = input.politicalRisk || this.assessPoliticalRisk(asset)
    const technologyRisk = this.assessTechnologyRisk(asset)
    const environmentalRisk = this.assessEnvironmentalRisk(asset)
    const demandRisk = this.assessDemandRisk(asset)
    const creditRisk = this.assessCreditRisk(asset)
    const liquidityRisk = 0.10 // Infrastructure is typically illiquid
    
    // Calculate overall risk score
    const overallRiskScore = (
      constructionRisk * 0.10 +
      operationalRisk * 0.20 +
      regulatoryRisk * 0.25 +
      politicalRisk * 0.15 +
      technologyRisk * 0.05 +
      environmentalRisk * 0.10 +
      demandRisk * 0.10 +
      creditRisk * 0.05
    )
    
    let overallRisk = 'moderate'
    if (overallRiskScore < 0.05) overallRisk = 'low'
    else if (overallRiskScore > 0.15) overallRisk = 'high'
    else if (overallRiskScore > 0.25) overallRisk = 'very_high'
    
    // Risk mitigation factors
    const riskMitigationFactors = this.identifyRiskMitigationFactors(asset)
    
    // Calculate risk premium
    const baseRiskPremium = overallRiskScore * 2.5 // Convert to risk premium
    const mitigatedRiskPremium = this.applyRiskMitigation(baseRiskPremium, riskMitigationFactors)
    
    return {
      overallRisk,
      constructionRisk,
      operationalRisk,
      regulatoryRisk,
      politicalRisk,
      technologyRisk,
      environmentalRisk,
      demandRisk,
      creditRisk,
      liquidityRisk,
      riskMitigationFactors,
      riskPremium: mitigatedRiskPremium
    }
  }

  // ==================== HELPER METHODS ====================

  private generateAvailabilityPayments(asset: InfrastructureAsset): number[] {
    // Generate annual availability payments for PPP projects
    const basePayment = asset.totalInvestment * 0.08 // 8% of investment
    const payments: number[] = []
    
    for (let year = 0; year < Math.floor(asset.remainingConcessionLife); year++) {
      const inflationAdjustment = Math.pow(1.025, year) // 2.5% annual inflation
      payments.push(basePayment * inflationAdjustment)
    }
    
    return payments
  }

  private generateCashFlows(asset: InfrastructureAsset): number[] {
    const cashFlows: number[] = []
    const baseRevenue = asset.operationalMetrics.operatingRevenue || asset.totalInvestment * 0.12
    const baseExpenses = asset.operationalMetrics.operatingExpenses || asset.operationalMetrics.operatingCosts
    
    for (let year = 0; year < Math.floor(asset.assetLifeRemaining); year++) {
      const revenue = baseRevenue * Math.pow(1.03, year) // 3% growth
      const expenses = baseExpenses * Math.pow(1.025, year) // 2.5% inflation
      const capex = revenue * 0.15 // 15% of revenue for maintenance capex
      
      cashFlows.push(revenue - expenses - capex)
    }
    
    return cashFlows
  }

  private generateRegulatedCashFlows(asset: InfrastructureAsset, allowedRevenue: Decimal): number[] {
    const cashFlows: number[] = []
    const baseRevenue = this.toNumber(allowedRevenue)
    
    for (let year = 0; year < Math.floor(asset.assetLifeRemaining); year++) {
      const revenue = baseRevenue * Math.pow(1.025, year) // Regulated escalation
      const expenses = (asset.operationalMetrics.operatingExpenses || asset.operationalMetrics.operatingCosts) * Math.pow(1.02, year)
      const capex = revenue * 0.12 // Lower capex for regulated utilities
      
      cashFlows.push(revenue - expenses - capex)
    }
    
    return cashFlows
  }

  private generateMerchantCashFlows(asset: InfrastructureAsset, tariffRevenue: Decimal): number[] {
    const cashFlows: number[] = []
    const baseRevenue = this.toNumber(tariffRevenue)
    
    for (let year = 0; year < Math.floor(asset.assetLifeRemaining); year++) {
      const demandGrowth = Math.pow(1.02, year) // 2% demand growth
      const priceEscalation = Math.pow(1.025, year) // 2.5% price escalation
      const revenue = baseRevenue * demandGrowth * priceEscalation
      const expenses = (asset.operationalMetrics.operatingExpenses || asset.operationalMetrics.operatingCosts) * Math.pow(1.025, year)
      const capex = revenue * 0.18 // Higher capex for merchant assets
      
      cashFlows.push(revenue - expenses - capex)
    }
    
    return cashFlows
  }

  private calculateAccumulatedDepreciation(asset: InfrastructureAsset): number {
    const ageYears = this.calculateAssetAge(asset.operationalDate)
    const annualDepreciation = asset.totalInvestment / 40 // 40-year life
    return annualDepreciation * ageYears
  }

  private calculateCapitalAdditions(asset: InfrastructureAsset): number {
    // Estimate capital additions based on asset age
    const ageYears = this.calculateAssetAge(asset.operationalDate)
    const annualCapex = asset.totalInvestment * 0.02 // 2% of initial investment
    return annualCapex * Math.min(ageYears, 10) // Cap at 10 years
  }

  private calculateWorkingCapital(asset: InfrastructureAsset): number {
    // Working capital as % of operating costs
    return asset.operationalMetrics.operatingCosts * 0.15
  }

  private calculateDepreciation(asset: InfrastructureAsset): number {
    return asset.totalInvestment / 40 // Straight-line over 40 years
  }

  private calculateAssetAge(operationalDate: Date): number {
    const now = new Date()
    const yearsDiff = now.getFullYear() - operationalDate.getFullYear()
    const monthsDiff = now.getMonth() - operationalDate.getMonth()
    return yearsDiff + (monthsDiff / 12)
  }

  private calculateYearsRemaining(endDate: Date): number {
    const now = new Date()
    const yearsDiff = endDate.getFullYear() - now.getFullYear()
    const monthsDiff = endDate.getMonth() - now.getMonth()
    return Math.max(0, yearsDiff + (monthsDiff / 12))
  }

  private calculateConcessionEndDate(operationalDate: Date, concessionYears: number): Date {
    const endDate = new Date(operationalDate)
    endDate.setFullYear(endDate.getFullYear() + concessionYears)
    return endDate
  }

  private getSubAssetType(infrastructureType: string | undefined): string {
    const mapping: Record<string, string> = {
      'transportation': 'toll_roads',
      'energy': 'power_generation',
      'utilities': 'water_treatment',
      'social': 'hospitals',
      'telecom': 'fiber_networks'
    }
    return mapping[infrastructureType || ''] || 'general_infrastructure'
  }

  private getRegularoryFramework(infrastructureType: string | undefined): string {
    const mapping: Record<string, string> = {
      'utilities': 'regulated_utility',
      'transportation': 'concession',
      'social': 'ppp',
      'energy': 'merchant',
      'telecom': 'merchant'
    }
    return mapping[infrastructureType || ''] || 'merchant'
  }

  // Risk assessment helper methods
  private assessOperationalRisk(asset: InfrastructureAsset): number {
    let risk = 0.05
    if (asset.operationalMetrics.availability < 0.95) risk += 0.02
    if (asset.operationalMetrics.utilization < 0.70) risk += 0.03
    if (asset.assetCondition.overallCondition === 'poor') risk += 0.05
    return Math.min(0.25, risk)
  }

  private assessRegulatoryRisk(asset: InfrastructureAsset): number {
    if (asset.regulatoryFramework === 'regulated_utility') return 0.03
    if (asset.regulatoryFramework === 'ppp') return 0.05
    if (asset.regulatoryFramework === 'concession') return 0.07
    return 0.10 // merchant
  }

  private assessPoliticalRisk(asset: InfrastructureAsset): number {
    // Simplified political risk based on region
    if (asset.region === 'North America' || asset.region === 'Europe') return 0.02
    if (asset.region === 'Asia Pacific') return 0.05
    return 0.10 // Emerging markets
  }

  private assessTechnologyRisk(asset: InfrastructureAsset): number {
    if (asset.assetType === 'telecom') return 0.15 // High tech risk
    if (asset.assetType === 'energy' && asset.subAssetType?.includes('renewable')) return 0.08
    return 0.03 // Traditional infrastructure
  }

  private assessEnvironmentalRisk(asset: InfrastructureAsset): number {
    let risk = 0.02
    if (asset.esgMetrics.carbonIntensity > 100) risk += 0.05
    if (asset.esgMetrics.environmentalScore < 50) risk += 0.03
    return Math.min(0.20, risk)
  }

  private assessDemandRisk(asset: InfrastructureAsset): number {
    if (asset.revenueModel === 'availability_payment') return 0.02 // Low demand risk
    if (asset.operationalMetrics.utilization < 0.60) return 0.15
    if (asset.operationalMetrics.utilization < 0.80) return 0.08
    return 0.04
  }

  private assessCreditRisk(asset: InfrastructureAsset): number {
    // Simplified credit risk assessment
    const avgCreditScore = this.getAverageCounterpartyCredit(asset)
    if (avgCreditScore === 'AAA' || avgCreditScore === 'AA') return 0.01
    if (avgCreditScore === 'A' || avgCreditScore === 'BBB') return 0.03
    return 0.08
  }

  private getAverageCounterpartyCredit(asset: InfrastructureAsset): string {
    // Would aggregate from contracts
    return 'A'
  }

  private identifyRiskMitigationFactors(asset: InfrastructureAsset): string[] {
    const factors: string[] = []
    
    if (asset.regulatoryFramework === 'regulated_utility') {
      factors.push('Regulated revenue framework')
    }
    if (asset.revenueModel === 'availability_payment') {
      factors.push('Availability-based payments reduce demand risk')
    }
    if (asset.keyContracts.some(c => c.guarantees.length > 0)) {
      factors.push('Government guarantees')
    }
    if (asset.esgMetrics.overallScore > 75) {
      factors.push('Strong ESG credentials')
    }
    if (asset.operationalMetrics.availability > 0.95) {
      factors.push('Excellent operational track record')
    }
    
    return factors
  }

  private applyRiskMitigation(baseRiskPremium: number, factors: string[]): number {
    // Each mitigation factor reduces risk premium by 10%
    const mitigationFactor = Math.pow(0.9, factors.length)
    return baseRiskPremium * mitigationFactor
  }

  // Database helper methods
  private buildInfrastructureContracts(productDetails: any, operationalDate: Date, concessionEndDate?: Date): ContractDetails[] {
    return [{
      contractType: 'concession',
      counterparty: 'Government Authority',
      contractLength: productDetails.concession_period_years || 30,
      startDate: operationalDate,
      endDate: concessionEndDate || new Date('2050-01-01'),
      revenueType: productDetails.revenue_model === 'availability_payment' ? 'fixed' : 'variable',
      escalation: {
        type: 'cpi_linked',
        baseRate: 0.025,
        inflationIndex: 'CPI',
        cappedRate: 0.05,
        flooredRate: 0,
        reviewFrequency: 'annual'
      },
      terminationClauses: [],
      performanceMetrics: [],
      creditRating: 'A',
      guarantees: []
    }]
  }

  private buildRegulatoryMetrics(input: InfrastructureCalculationInput, productDetails: any): RegulatoryMetrics {
    return {
      framework: input.regulatoryFramework || 'merchant',
      regulator: 'Federal Infrastructure Authority',
      rateBase: input.regulatedAssetBase || productDetails.asset_value || 500000000,
      allowedROE: input.allowedReturnOnEquity || 0.095,
      allowedROA: 0.075,
      nextRateReview: new Date('2026-01-01'),
      rateReviewFrequency: 5,
      tariffEscalation: 0.025,
      subsidiesReceived: 0,
      regulatoryChanges: []
    }
  }

  private buildOperationalMetrics(input: InfrastructureCalculationInput, productDetails: any): OperationalMetrics {
    const revenue = input.operatingRevenue || productDetails.asset_value * 0.12 || 60000000
    const expenses = input.operatingExpenses || revenue * 0.4
    
    return {
      capacity: 100000, // Units depend on asset type
      utilization: 0.85,
      throughput: 85000,
      availability: 0.96,
      operatingCosts: expenses,
      maintenanceCosts: expenses * 0.25,
      capitalExpenditures: revenue * 0.15,
      operatingMargin: 0.6,
      ebitdaMargin: 0.5,
      laborCosts: expenses * 0.3,
      contractorCosts: expenses * 0.2,
      insuranceCosts: expenses * 0.05,
      // Derived revenue metrics
      operatingRevenue: revenue,
      operatingExpenses: expenses
    }
  }

  private buildEsgMetrics(input: InfrastructureCalculationInput, productDetails: any): ESGMetrics {
    return {
      overallScore: input.esgScore || 75,
      environmentalScore: 70,
      socialScore: 80,
      socialImpactScore: input.socialImpactScore || 85,
      governanceScore: 75,
      carbonEmissions: 50000,
      carbonIntensity: input.carbonIntensity || 50,
      waterUsage: 100000,
      wasteGeneration: 5000,
      jobsCreated: 500,
      localCommunityImpact: 8,
      safetyIncidents: 2,
      complianceScore: 95
    }
  }

  private buildAssetCondition(input: InfrastructureCalculationInput, productDetails: any, operationalDate: Date): AssetCondition {
    const ageYears = this.calculateAssetAge(operationalDate)
    
    return {
      overallCondition: ageYears < 5 ? 'excellent' : ageYears < 15 ? 'good' : 'fair',
      ageYears,
      expectedLifeRemaining: Math.max(0, 40 - ageYears),
      maintenanceBacklog: ageYears * 1000000,
      replacementCapexRequired: ageYears > 20 ? productDetails.asset_value * 0.3 : 0,
      conditionAssessments: [],
      maintenancePlans: []
    }
  }

  private buildFallbackInfrastructureAsset(input: InfrastructureCalculationInput): InfrastructureAsset {
    const operationalDate = input.operationalDate || new Date('2020-01-01')
    const concessionEndDate = input.concessionEndDate || new Date('2050-01-01')
    
    return {
      assetId: input.assetId || 'infra_001',
      assetName: 'Infrastructure Asset',
      assetType: input.assetType || 'transportation',
      subAssetType: input.subAssetType || 'toll_roads',
      geographicLocation: input.geographicLocation || 'United States',
      country: 'United States',
      region: 'North America',
      constructionStartDate: input.constructionStartDate,
      operationalDate,
      concessionEndDate,
      remainingConcessionLife: this.calculateYearsRemaining(concessionEndDate),
      assetLifeRemaining: 25,
      totalInvestment: input.totalInvestment || 500000000,
      constructionCost: input.constructionCost || 450000000,
      regulatoryFramework: input.regulatoryFramework || 'concession',
      revenueModel: input.revenueModel || 'merchant_revenue',
      keyContracts: [],
      regulatoryMetrics: this.buildRegulatoryMetrics(input, {}),
      operationalMetrics: this.buildOperationalMetrics(input, {}),
      esgMetrics: this.buildEsgMetrics(input, {}),
      assetCondition: this.buildAssetCondition(input, { asset_value: 500000000 }, operationalDate)
    }
  }

  private async calculateInfrastructureAdjustments(
    asset: InfrastructureAsset,
    riskAssessment: InfrastructureRiskAssessment,
    input: InfrastructureCalculationInput
  ): Promise<any> {
    const operationalLiabilities = this.decimal(asset.operationalMetrics.operatingCosts * 0.25)
    const regulatoryLiabilities = this.decimal(asset.regulatoryMetrics.subsidiesReceived || 0)
    const maintenanceReserves = this.decimal(asset.assetCondition.maintenanceBacklog || 0)
    
    return {
      operationalLiabilities,
      regulatoryLiabilities,
      maintenanceReserves
    }
  }

  private generateOperatingCostArray(asset: InfrastructureAsset): number[] {
    const costs: number[] = []
    const baseCost = asset.operationalMetrics.operatingCosts
    
    for (let year = 0; year < Math.floor(asset.remainingConcessionLife); year++) {
      costs.push(baseCost * Math.pow(1.025, year)) // 2.5% inflation
    }
    
    return costs
  }

  private generateInfrastructureCashFlows(asset: InfrastructureAsset): any[] {
    const cashFlows: any[] = []
    const baseRevenue = asset.operationalMetrics.operatingRevenue || asset.totalInvestment * 0.12
    const baseOpex = asset.operationalMetrics.operatingExpenses || asset.operationalMetrics.operatingCosts
    
    for (let year = 0; year < Math.floor(asset.assetLifeRemaining); year++) {
      cashFlows.push({
        period: year,
        revenue: baseRevenue * Math.pow(1.03, year),
        opex: baseOpex * Math.pow(1.025, year),
        capex: baseRevenue * 0.15 * Math.pow(1.025, year)
      })
    }
    
    return cashFlows
  }

  private generateRegulatedInfrastructureCashFlows(asset: InfrastructureAsset, allowedRevenue: Decimal): any[] {
    const cashFlows: any[] = []
    const baseRevenue = this.toNumber(allowedRevenue)
    const baseOpex = asset.operationalMetrics.operatingExpenses || asset.operationalMetrics.operatingCosts
    
    for (let year = 0; year < Math.floor(asset.assetLifeRemaining); year++) {
      cashFlows.push({
        period: year,
        revenue: baseRevenue * Math.pow(1.025, year),
        opex: baseOpex * Math.pow(1.02, year),
        capex: baseRevenue * 0.12 * Math.pow(1.025, year)
      })
    }
    
    return cashFlows
  }

  private generateMerchantInfrastructureCashFlows(asset: InfrastructureAsset, tariffRevenue: Decimal): any[] {
    const cashFlows: any[] = []
    const baseRevenue = this.toNumber(tariffRevenue)
    const baseOpex = asset.operationalMetrics.operatingExpenses || asset.operationalMetrics.operatingCosts
    
    for (let year = 0; year < Math.floor(asset.assetLifeRemaining); year++) {
      const demandGrowth = Math.pow(1.02, year)
      const priceEscalation = Math.pow(1.025, year)
      
      cashFlows.push({
        period: year,
        revenue: baseRevenue * demandGrowth * priceEscalation,
        opex: baseOpex * Math.pow(1.025, year),
        capex: baseRevenue * 0.18 * Math.pow(1.025, year)
      })
    }
    
    return cashFlows
  }

  private generateDebtServiceArray(principal: number, interestRate: number, term: number): number[] {
    const debtService: number[] = []
    const r = interestRate
    const n = Math.floor(term)
    
    // Calculate annual payment for amortizing loan
    const payment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    
    for (let year = 0; year < n; year++) {
      debtService.push(payment)
    }
    
    return debtService
  }

  private buildInfrastructurePricingSources(valuation: any, asset: InfrastructureAsset): Record<string, PriceData> {
    const sources: Record<string, PriceData> = {
      dcf_valuation: {
        price: this.toNumber(valuation.totalValue),
        currency: 'USD',
        asOf: new Date(),
        source: 'discounted_cash_flow'
      }
    }
    
    if (valuation.pppValue) {
      sources.ppp_valuation = {
        price: this.toNumber(valuation.pppValue),
        currency: 'USD',
        asOf: new Date(),
        source: 'ppp_model'
      }
    }
    
    if (valuation.rab) {
      sources.regulatory_asset_base = {
        price: this.toNumber(valuation.rab),
        currency: 'USD',
        asOf: new Date(),
        source: 'regulatory_framework'
      }
    }
    
    return sources
  }

  protected override generateRunId(): string {
    return `infra_nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
