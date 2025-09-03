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

export interface CashFlowProjection {
  year: number
  operatingRevenue: Decimal
  operatingExpenses: Decimal
  ebitda: Decimal
  maintenanceCapex: Decimal
  growthCapex: Decimal
  workingCapitalChange: Decimal
  freeCashFlow: Decimal
  terminalValue?: Decimal
  discountFactor: number
  presentValue: Decimal
}

export interface ValuationScenario {
  scenario: string // base, upside, downside, stress
  probability: number
  assumptions: ScenarioAssumptions
  cashFlows: CashFlowProjection[]
  terminalValue: Decimal
  enterpriseValue: Decimal
  equityValue: Decimal
}

export interface ScenarioAssumptions {
  revenueGrowth: number
  inflationRate: number
  discountRate: number
  terminalGrowthRate: number
  capexAsPercentOfRevenue: number
  operatingMargin: number
  taxRate: number
  regulatoryChangeProbability: number
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
    return [AssetType.INFRASTRUCTURE]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const infraInput = input as InfrastructureCalculationInput

      // Get infrastructure asset details
      const assetDetails = await this.getInfrastructureAssetDetails(infraInput)
      
      // Perform risk assessment
      const riskAssessment = await this.performRiskAssessment(assetDetails, infraInput)
      
      // Generate cash flow projections
      const scenarios = await this.generateValuationScenarios(assetDetails, riskAssessment)
      
      // Calculate present value using multiple scenarios
      const valuation = await this.calculateScenarioWeightedValuation(scenarios)
      
      // Apply infrastructure-specific adjustments
      const adjustments = await this.calculateInfrastructureAdjustments(
        assetDetails, 
        riskAssessment, 
        infraInput
      )
      
      // Calculate final NAV
      const grossAssetValue = valuation.equityValue
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
        pricingSources: this.buildInfrastructurePricingSources(scenarios, valuation),
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
            baseCase: this.toNumber(scenarios[0]?.equityValue || this.decimal(0)),
            upside: this.toNumber(scenarios[1]?.equityValue || this.decimal(0)),
            downside: this.toNumber(scenarios[2]?.equityValue || this.decimal(0)),
            probabilityWeighted: this.toNumber(valuation.equityValue)
          },
          keyAssumptions: scenarios[0]?.assumptions
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
   * Fetches infrastructure asset details from database
   */
  private async getInfrastructureAssetDetails(input: InfrastructureCalculationInput): Promise<InfrastructureAsset> {
    // TODO: Replace with actual database query
    const operationalDate = input.operationalDate || new Date('2020-01-01')
    const concessionEndDate = input.concessionEndDate || new Date('2050-01-01')
    const remainingConcessionLife = this.calculateYearsRemaining(concessionEndDate)
    
    return {
      assetId: input.assetId || 'infra_001',
      assetName: `Infrastructure Asset ${input.assetId}`,
      assetType: input.assetType || 'transportation',
      subAssetType: input.subAssetType || 'toll_roads',
      geographicLocation: input.geographicLocation || 'United States',
      country: 'United States',
      region: 'North America',
      constructionStartDate: input.constructionStartDate,
      operationalDate,
      concessionEndDate,
      remainingConcessionLife,
      assetLifeRemaining: 25,
      totalInvestment: input.totalInvestment || 500000000,
      constructionCost: input.constructionCost || 450000000,
      regulatoryFramework: input.regulatoryFramework || 'concession',
      revenueModel: input.revenueModel || 'merchant_revenue',
      keyContracts: [
        {
          contractType: 'concession',
          counterparty: 'State Transportation Authority',
          contractLength: 30,
          startDate: operationalDate,
          endDate: concessionEndDate,
          revenueType: 'variable',
          escalation: {
            type: 'cpi_linked',
            baseRate: 0.025,
            inflationIndex: 'CPI',
            cappedRate: 0.045,
            flooredRate: 0.01,
            reviewFrequency: 'annual'
          },
          terminationClauses: [
            {
              trigger: 'default',
              noticePeriod: 90,
              compensationMechanism: 'debt_plus_equity',
              assetOwnership: 'revert'
            }
          ],
          performanceMetrics: [
            {
              metric: 'availability',
              target: 0.99,
              actual: 0.995,
              penaltyRate: 0.01,
              bonusRate: 0.005,
              measurementFrequency: 'monthly'
            }
          ],
          creditRating: 'A-',
          guarantees: ['government_guarantee', 'revenue_guarantee']
        }
      ],
      regulatoryMetrics: {
        framework: input.regulatoryFramework || 'concession',
        regulator: 'Transportation Authority',
        rateBase: input.regulatedAssetBase || 400000000,
        allowedROE: input.allowedReturnOnEquity || 0.095,
        allowedROA: 0.065,
        nextRateReview: new Date('2026-01-01'),
        rateReviewFrequency: 5,
        tariffEscalation: 0.03,
        subsidiesReceived: 0,
        regulatoryChanges: []
      },
      operationalMetrics: {
        capacity: 100000, // vehicles per day
        utilization: 0.75,
        throughput: 75000,
        availability: 0.995,
        operatingCosts: 25000000,
        maintenanceCosts: 15000000,
        capitalExpenditures: 10000000,
        operatingMargin: 0.65,
        ebitdaMargin: 0.70,
        laborCosts: 8000000,
        contractorCosts: 5000000,
        insuranceCosts: 2000000
      },
      esgMetrics: {
        overallScore: input.esgScore || 75,
        environmentalScore: 72,
        socialScore: 78,
        socialImpactScore: input.socialImpactScore || 82,
        governanceScore: 76,
        carbonEmissions: input.carbonIntensity || 1200,
        carbonIntensity: 0.15,
        waterUsage: 50000,
        wasteGeneration: 500,
        jobsCreated: 250,
        localCommunityImpact: 85,
        safetyIncidents: 2,
        complianceScore: 95
      },
      assetCondition: {
        overallCondition: 'good',
        ageYears: this.calculateAssetAge(operationalDate),
        expectedLifeRemaining: 25,
        maintenanceBacklog: 5000000,
        replacementCapexRequired: 50000000,
        conditionAssessments: [
          {
            assessmentDate: new Date('2024-06-01'),
            component: 'road_surface',
            condition: 'good',
            recommendedAction: 'routine_maintenance',
            costEstimate: 2000000,
            urgency: 'within_year'
          }
        ],
        maintenancePlans: [
          {
            component: 'toll_systems',
            maintenanceType: 'preventive',
            frequency: 'quarterly',
            annualCost: 1500000,
            nextScheduledDate: new Date('2025-04-01'),
            deferralImpact: 0.05
          }
        ]
      }
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
    const regulatoryRisk = this.assessRegulatoryRisk(asset)
    const politicalRisk = this.assessPoliticalRisk(asset)
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

  /**
   * Generates multiple valuation scenarios
   */
  private async generateValuationScenarios(
    asset: InfrastructureAsset,
    riskAssessment: InfrastructureRiskAssessment
  ): Promise<ValuationScenario[]> {
    const scenarios: ValuationScenario[] = []
    
    // Base case scenario
    const baseAssumptions: ScenarioAssumptions = {
      revenueGrowth: 0.03,
      inflationRate: 0.025,
      discountRate: 0.08 + riskAssessment.riskPremium,
      terminalGrowthRate: 0.02,
      capexAsPercentOfRevenue: 0.15,
      operatingMargin: asset.operationalMetrics.operatingMargin,
      taxRate: 0.25,
      regulatoryChangeProbability: 0.20
    }
    
    const baseCashFlows = this.projectCashFlows(asset, baseAssumptions)
    const baseTerminalValue = this.calculateTerminalValue(baseCashFlows, baseAssumptions)
    const baseEquityValue = this.calculateEquityValue(baseCashFlows, baseTerminalValue, baseAssumptions)
    
    scenarios.push({
      scenario: 'base',
      probability: 0.60,
      assumptions: baseAssumptions,
      cashFlows: baseCashFlows,
      terminalValue: baseTerminalValue,
      enterpriseValue: baseEquityValue,
      equityValue: baseEquityValue
    })
    
    // Upside scenario
    const upsideAssumptions: ScenarioAssumptions = {
      ...baseAssumptions,
      revenueGrowth: 0.05,
      operatingMargin: baseAssumptions.operatingMargin + 0.05,
      discountRate: baseAssumptions.discountRate - 0.01,
      regulatoryChangeProbability: 0.10
    }
    
    const upsideCashFlows = this.projectCashFlows(asset, upsideAssumptions)
    const upsideTerminalValue = this.calculateTerminalValue(upsideCashFlows, upsideAssumptions)
    const upsideEquityValue = this.calculateEquityValue(upsideCashFlows, upsideTerminalValue, upsideAssumptions)
    
    scenarios.push({
      scenario: 'upside',
      probability: 0.20,
      assumptions: upsideAssumptions,
      cashFlows: upsideCashFlows,
      terminalValue: upsideTerminalValue,
      enterpriseValue: upsideEquityValue,
      equityValue: upsideEquityValue
    })
    
    // Downside scenario
    const downsideAssumptions: ScenarioAssumptions = {
      ...baseAssumptions,
      revenueGrowth: 0.01,
      operatingMargin: baseAssumptions.operatingMargin - 0.05,
      discountRate: baseAssumptions.discountRate + 0.02,
      capexAsPercentOfRevenue: 0.20,
      regulatoryChangeProbability: 0.40
    }
    
    const downsideCashFlows = this.projectCashFlows(asset, downsideAssumptions)
    const downsideTerminalValue = this.calculateTerminalValue(downsideCashFlows, downsideAssumptions)
    const downsideEquityValue = this.calculateEquityValue(downsideCashFlows, downsideTerminalValue, downsideAssumptions)
    
    scenarios.push({
      scenario: 'downside',
      probability: 0.20,
      assumptions: downsideAssumptions,
      cashFlows: downsideCashFlows,
      terminalValue: downsideTerminalValue,
      enterpriseValue: downsideEquityValue,
      equityValue: downsideEquityValue
    })
    
    return scenarios
  }

  /**
   * Calculates scenario-weighted valuation
   */
  private async calculateScenarioWeightedValuation(scenarios: ValuationScenario[]): Promise<any> {
    let weightedValue = new Decimal(0)
    let totalProbability = 0
    
    scenarios.forEach(scenario => {
      weightedValue = weightedValue.plus(scenario.equityValue.times(scenario.probability))
      totalProbability += scenario.probability
    })
    
    // Normalize if probabilities don't sum to 1
    if (totalProbability !== 1.0 && totalProbability > 0) {
      weightedValue = weightedValue.div(totalProbability)
    }
    
    return {
      equityValue: weightedValue,
      scenarios: scenarios,
      weightedAverage: true
    }
  }

  // ==================== HELPER METHODS ====================

  private calculateYearsRemaining(endDate: Date): number {
    const now = new Date()
    const yearsDiff = endDate.getFullYear() - now.getFullYear()
    const monthsDiff = endDate.getMonth() - now.getMonth()
    return yearsDiff + (monthsDiff / 12)
  }

  private calculateAssetAge(operationalDate: Date): number {
    const now = new Date()
    const yearsDiff = now.getFullYear() - operationalDate.getFullYear()
    const monthsDiff = now.getMonth() - operationalDate.getMonth()
    return yearsDiff + (monthsDiff / 12)
  }

  private assessOperationalRisk(asset: InfrastructureAsset): number {
    let risk = 0.05 // Base operational risk
    
    // Adjust for asset condition
    if (asset.assetCondition.overallCondition === 'poor') risk += 0.03
    else if (asset.assetCondition.overallCondition === 'fair') risk += 0.01
    
    // Adjust for utilization
    if (asset.operationalMetrics.utilization < 0.70) risk += 0.02
    
    // Adjust for availability
    if (asset.operationalMetrics.availability < 0.95) risk += 0.015
    
    return Math.min(0.20, risk)
  }

  private assessRegulatoryRisk(asset: InfrastructureAsset): number {
    let risk = 0.05 // Base regulatory risk
    
    // Adjust for regulatory framework
    switch (asset.regulatoryFramework) {
      case 'regulated_utility':
        risk = 0.03 // Lower risk due to regulated returns
        break
      case 'concession':
        risk = 0.05
        break
      case 'merchant':
        risk = 0.10 // Higher risk for merchant assets
        break
    }
    
    // Adjust for time to next rate review
    const timeToReview = this.calculateYearsRemaining(asset.regulatoryMetrics.nextRateReview)
    if (timeToReview < 1) risk += 0.02
    
    return Math.min(0.25, risk)
  }

  private assessPoliticalRisk(asset: InfrastructureAsset): number {
    // Simplified political risk based on geography
    const countryRisk: Record<string, number> = {
      'United States': 0.02,
      'Canada': 0.02,
      'United Kingdom': 0.03,
      'Germany': 0.025,
      'Australia': 0.025,
      'Emerging Market': 0.08
    }
    
    return countryRisk[asset.country] || 0.05
  }

  private assessTechnologyRisk(asset: InfrastructureAsset): number {
    // Technology risk varies by asset type
    const technologyRisk: Record<string, number> = {
      'toll_roads': 0.01,
      'airports': 0.03,
      'power_generation': 0.05,
      'telecom': 0.08,
      'water_treatment': 0.02
    }
    
    return technologyRisk[asset.subAssetType] || 0.03
  }

  private assessEnvironmentalRisk(asset: InfrastructureAsset): number {
    let risk = 0.03 // Base environmental risk
    
    // Adjust for ESG score
    if (asset.esgMetrics.environmentalScore < 50) risk += 0.05
    else if (asset.esgMetrics.environmentalScore > 80) risk -= 0.01
    
    // Adjust for carbon intensity
    if (asset.esgMetrics.carbonIntensity > 0.20) risk += 0.02
    
    return Math.min(0.15, Math.max(0.01, risk))
  }

  private assessDemandRisk(asset: InfrastructureAsset): number {
    let risk = 0.05 // Base demand risk
    
    // Adjust for utilization trends
    if (asset.operationalMetrics.utilization < 0.60) risk += 0.05
    else if (asset.operationalMetrics.utilization > 0.90) risk -= 0.01
    
    // Adjust for asset type
    if (asset.subAssetType === 'toll_roads') risk += 0.02 // Traffic risk
    
    return Math.min(0.15, risk)
  }

  private assessCreditRisk(asset: InfrastructureAsset): number {
    // Average counterparty credit risk
    let totalRisk = 0
    let count = 0
    
    asset.keyContracts.forEach(contract => {
      const rating = contract.creditRating
      const ratingRisk = this.convertRatingToRisk(rating)
      totalRisk += ratingRisk
      count++
    })
    
    return count > 0 ? totalRisk / count : 0.03
  }

  private convertRatingToRisk(rating: string): number {
    const ratingRisk: Record<string, number> = {
      'AAA': 0.001, 'AA+': 0.002, 'AA': 0.003, 'AA-': 0.005,
      'A+': 0.008, 'A': 0.012, 'A-': 0.020,
      'BBB+': 0.035, 'BBB': 0.055, 'BBB-': 0.085,
      'BB+': 0.140, 'BB': 0.220, 'BB-': 0.340
    }
    
    return ratingRisk[rating] || 0.05
  }

  private identifyRiskMitigationFactors(asset: InfrastructureAsset): string[] {
    const mitigationFactors = []
    
    // Contract-based mitigations
    asset.keyContracts.forEach(contract => {
      if (contract.guarantees.length > 0) {
        mitigationFactors.push('government_guarantee')
      }
      if (contract.escalation.type === 'cpi_linked') {
        mitigationFactors.push('inflation_protection')
      }
    })
    
    // Asset-specific mitigations
    if (asset.assetCondition.overallCondition === 'excellent') {
      mitigationFactors.push('excellent_asset_condition')
    }
    
    if (asset.operationalMetrics.availability > 0.99) {
      mitigationFactors.push('high_availability')
    }
    
    if (asset.esgMetrics.overallScore > 80) {
      mitigationFactors.push('strong_esg_profile')
    }
    
    return mitigationFactors
  }

  private applyRiskMitigation(baseRiskPremium: number, mitigationFactors: string[]): number {
    let mitigatedPremium = baseRiskPremium
    
    // Apply mitigation discounts
    const mitigationDiscounts: Record<string, number> = {
      'government_guarantee': 0.30,
      'inflation_protection': 0.15,
      'excellent_asset_condition': 0.10,
      'high_availability': 0.05,
      'strong_esg_profile': 0.05
    }
    
    mitigationFactors.forEach(factor => {
      const discount = mitigationDiscounts[factor] || 0
      mitigatedPremium *= (1 - discount)
    })
    
    return Math.max(0.01, mitigatedPremium) // Minimum 1% risk premium
  }

  private projectCashFlows(asset: InfrastructureAsset, assumptions: ScenarioAssumptions): CashFlowProjection[] {
    const projectionYears = Math.min(asset.remainingConcessionLife, 30)
    const cashFlows = []
    
    let baseRevenue = asset.operationalMetrics.operatingCosts / (1 - assumptions.operatingMargin)
    let baseOpex = asset.operationalMetrics.operatingCosts
    
    for (let year = 1; year <= projectionYears; year++) {
      const inflatedRevenue = this.decimal(baseRevenue).times(
        Math.pow(1 + assumptions.revenueGrowth, year)
      )
      
      const inflatedOpex = this.decimal(baseOpex).times(
        Math.pow(1 + assumptions.inflationRate, year)
      )
      
      const ebitda = inflatedRevenue.minus(inflatedOpex)
      
      const maintenanceCapex = inflatedRevenue.times(assumptions.capexAsPercentOfRevenue * 0.7)
      const growthCapex = inflatedRevenue.times(assumptions.capexAsPercentOfRevenue * 0.3)
      
      const workingCapitalChange = this.decimal(0) // Minimal for infrastructure
      
      const freeCashFlow = ebitda.minus(maintenanceCapex).minus(growthCapex).minus(workingCapitalChange)
      
      const discountFactor = Math.pow(1 + assumptions.discountRate, year)
      const presentValue = freeCashFlow.div(discountFactor)
      
      cashFlows.push({
        year,
        operatingRevenue: inflatedRevenue,
        operatingExpenses: inflatedOpex,
        ebitda,
        maintenanceCapex,
        growthCapex,
        workingCapitalChange,
        freeCashFlow,
        discountFactor,
        presentValue
      })
    }
    
    return cashFlows
  }

  private calculateTerminalValue(cashFlows: CashFlowProjection[], assumptions: ScenarioAssumptions): Decimal {
    if (cashFlows.length === 0) return new Decimal(0)
    
    const finalYearCashFlow = cashFlows[cashFlows.length - 1]?.freeCashFlow || this.decimal(0)
    const terminalCashFlow = finalYearCashFlow.times(1 + assumptions.terminalGrowthRate)
    const terminalValue = terminalCashFlow.div(assumptions.discountRate - assumptions.terminalGrowthRate)
    
    // Discount terminal value to present
    const terminalDiscountFactor = Math.pow(1 + assumptions.discountRate, cashFlows.length)
    return terminalValue.div(terminalDiscountFactor)
  }

  private calculateEquityValue(
    cashFlows: CashFlowProjection[], 
    terminalValue: Decimal, 
    assumptions: ScenarioAssumptions
  ): Decimal {
    let totalPresentValue = new Decimal(0)
    
    cashFlows.forEach(cf => {
      totalPresentValue = totalPresentValue.plus(cf.presentValue)
    })
    
    return totalPresentValue.plus(terminalValue)
  }

  private async calculateInfrastructureAdjustments(
    asset: InfrastructureAsset,
    riskAssessment: InfrastructureRiskAssessment,
    input: InfrastructureCalculationInput
  ): Promise<any> {
    const totalInvestment = this.decimal(asset.totalInvestment)
    
    // Operational liabilities (maintenance backlog, etc.)
    const operationalLiabilities = this.decimal(asset.assetCondition.maintenanceBacklog)
      .plus(asset.assetCondition.replacementCapexRequired * 0.5) // 50% of replacement capex as liability
    
    // Regulatory liabilities (potential fines, compliance costs)
    const regulatoryLiabilities = totalInvestment.times(0.01) // 1% of investment
    
    // Maintenance reserves
    const maintenanceReserves = this.decimal(asset.operationalMetrics.maintenanceCosts).times(2) // 2 years of reserves
    
    return {
      operationalLiabilities,
      regulatoryLiabilities,
      maintenanceReserves,
      total: operationalLiabilities.plus(regulatoryLiabilities).plus(maintenanceReserves)
    }
  }

  private buildInfrastructurePricingSources(scenarios: ValuationScenario[], valuation: any): Record<string, PriceData> {
    return {
      base_case: {
        price: this.toNumber(scenarios[0]?.equityValue || this.decimal(0)),
        currency: 'USD',
        asOf: new Date(),
        source: 'dcf_base_case'
      },
      upside_case: {
        price: this.toNumber(scenarios[1]?.equityValue || this.decimal(0)),
        currency: 'USD',
        asOf: new Date(),
        source: 'dcf_upside_case'
      },
      downside_case: {
        price: this.toNumber(scenarios[2]?.equityValue || this.decimal(0)),
        currency: 'USD',
        asOf: new Date(),
        source: 'dcf_downside_case'
      },
      probability_weighted: {
        price: this.toNumber(valuation.equityValue),
        currency: 'USD',
        asOf: new Date(),
        source: 'scenario_weighted_valuation'
      }
    }
  }

  protected override generateRunId(): string {
    return `infra_nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
