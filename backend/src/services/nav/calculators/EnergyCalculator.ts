/**
 * EnergyCalculator - NAV calculation for Energy assets
 * 
 * Handles:
 * - Traditional energy assets (oil, gas, coal) with commodity price exposure
 * - Renewable energy projects (solar, wind, hydro) with power purchase agreements
 * - Energy infrastructure (pipelines, storage, transmission) with capacity payments
 * - Power generation assets with dispatch modeling and grid integration
 * - Carbon credit valuation and environmental impact assessments
 * - Regulatory compliance and environmental, social, governance (ESG) factors
 * - Resource depletion and reserve life calculations
 * - Technology risk assessment and operational efficiency metrics
 * - Energy transition impact and stranded asset risk
 * - Weather and seasonal demand variations
 * - Grid stability and interconnection requirements
 * - Fuel supply contracts and hedging strategies
 * 
 * Supports energy products from energy_products table
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

export interface EnergyCalculationInput extends CalculationInput {
  // Energy specific parameters
  energyAssetType?: string // renewable, traditional, infrastructure, storage
  energySubtype?: string // solar, wind, oil_gas, pipeline, battery
  capacity?: number // MW for power, Bcf for gas, bbl for oil
  location?: string
  operationalDate?: Date
  contractEndDate?: Date
  // Traditional energy
  reserveLife?: number // years
  productionRate?: number
  commodityType?: string // crude_oil, natural_gas, coal
  hedgingRatio?: number
  // Renewable energy
  powerPurchaseAgreement?: PowerPurchaseAgreement
  capacityFactor?: number
  degradationRate?: number
  subsidies?: number
  // All energy types
  carbonIntensity?: number
  esgRating?: number
  regulatoryRisk?: number
  technologyRisk?: number
  weatherRisk?: number
}

export interface PowerPurchaseAgreement {
  counterparty: string
  contractLength: number
  startDate: Date
  endDate: Date
  priceStructure: string // fixed, escalating, market_linked
  basePrice: number // $/MWh
  escalationRate?: number
  volumeCommitment: number // MWh annually
  curtailmentClauses: string[]
  terminationClauses: TerminationClause[]
  creditRating: string
  guarantees: string[]
}

export interface TerminationClause {
  trigger: string
  noticePeriod: number
  compensationMechanism: string
  penaltyAmount?: number
}

export interface EnergyAsset {
  assetId: string
  assetName: string
  energyType: string // renewable, traditional, infrastructure
  energySubtype: string
  capacity: number
  location: string
  country: string
  operationalDate: Date
  contractEndDate?: Date
  remainingContractLife: number
  assetLife: number
  totalInvestment: number
  operationalMetrics: EnergyOperationalMetrics
  financialMetrics: EnergyFinancialMetrics
  technicalMetrics: TechnicalMetrics
  esgMetrics: EnergyESGMetrics
  riskMetrics: EnergyRiskMetrics
  contracts: EnergyContract[]
}

export interface EnergyOperationalMetrics {
  capacity: number
  capacityFactor: number
  availability: number
  efficiency: number
  production: number // MWh, Bcf, bbl depending on type
  utilization: number
  maintenanceDowntime: number
  operatingCosts: number
  fuelCosts: number
  gridStability: number
  dispatchability: number
}

export interface EnergyFinancialMetrics {
  revenue: number
  operatingExpenses: number
  operatingCosts: number
  fuelCosts: number
  ebitda: number
  ebitdaMargin: number
  fuelCostRatio: number
  maintenanceCapex: number
  growthCapex: number
  carbonCosts: number
  subsidiesReceived: number
  hedgingGainsLosses: number
}

export interface TechnicalMetrics {
  technologyType: string
  vintage: number
  expectedLifeRemaining: number
  degradationRate: number
  upgradeRequired: boolean
  digitalIntegration: number
  autonomationLevel: number
  gridCompatibility: number
  energyStorageCapability: number
}

export interface EnergyESGMetrics {
  overallESG: number
  environmentalScore: number
  socialScore: number
  governanceScore: number
  carbonEmissions: number
  carbonIntensity: number // kg CO2/MWh
  waterUsage: number
  landUse: number
  wasteProduction: number
  localJobsCreated: number
  communityInvestment: number
  safetyRecord: number
  regulatoryCompliance: number
}

export interface EnergyRiskMetrics {
  overallRisk: string
  commodityPriceRisk: number
  regulatoryRisk: number
  technologyRisk: number
  weatherRisk: number
  gridRisk: number
  counterpartyRisk: number
  strandedAssetRisk: number
  transitionRisk: number
  operationalRisk: number
}

export interface EnergyContract {
  contractType: string // ppa, fuel_supply, transportation, hedging
  counterparty: string
  startDate: Date
  endDate: Date
  volumeCommitment: number
  priceStructure: PriceStructure
  escalationMechanism: EscalationMechanism
  performanceMetrics: PerformanceMetric[]
  creditRating: string
  terminationClauses: TerminationClause[]
}

export interface PriceStructure {
  type: string // fixed, variable, hybrid
  basePrice: number
  indexLinked: boolean
  index: string // henry_hub, pjm, brent
  priceFloor?: number
  priceCeiling?: number
  heatRate?: number // For gas-fired plants
}

export interface EscalationMechanism {
  type: string // cpi, fixed_rate, commodity_linked
  rate: number
  frequency: string
  caps?: number
  floors?: number
}

export interface PerformanceMetric {
  metric: string
  target: number
  actual: number
  penalty: number
  bonus: number
}

export interface CommodityExposure {
  commodity: string
  exposureAmount: number
  hedgedAmount: number
  netExposure: number
  priceVolatility: number
  correlation: number
}

export interface WeatherRisk {
  windSpeed: WeatherProfile
  solarIrradiance: WeatherProfile
  temperature: WeatherProfile
  precipitation: WeatherProfile
  seasonalVariation: number
  extremeWeatherRisk: number
}

export interface WeatherProfile {
  average: number
  volatility: number
  trend: number
  extremeEventProbability: number
}

export interface EnergyValuationScenario {
  scenario: string
  probability: number
  assumptions: EnergyScenarioAssumptions
  cashFlows: EnergyProjection[]
  presentValue: Decimal
}

export interface EnergyScenarioAssumptions {
  commodityPriceGrowth: number
  powerPriceGrowth: number
  carbonPriceGrowth: number
  inflationRate: number
  discountRate: number
  capacityDegradation: number
  operatingCostGrowth: number
  fuelCostGrowth: number
  regulatoryChange: boolean
  technologyImprovement: number
}

export interface EnergyProjection {
  year: number
  production: Decimal
  revenue: Decimal
  operatingCosts: Decimal
  fuelCosts: Decimal
  carbonCosts: Decimal
  ebitda: Decimal
  capex: Decimal
  freeCashFlow: Decimal
  presentValue: Decimal
}

export class EnergyCalculator extends BaseCalculator {
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
    return [AssetType.ENERGY]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const energyInput = input as EnergyCalculationInput

      // Get energy asset details
      const assetDetails = await this.getEnergyAssetDetails(energyInput)
      
      // Assess commodity and market exposures
      const commodityExposures = await this.assessCommodityExposures(assetDetails)
      
      // Evaluate weather and operational risks
      const weatherRisk = await this.assessWeatherRisk(assetDetails, energyInput)
      
      // Generate valuation scenarios
      const scenarios = await this.generateEnergyScenarios(assetDetails, commodityExposures, weatherRisk)
      
      // Calculate scenario-weighted valuation
      const valuation = await this.calculateWeightedValuation(scenarios)
      
      // Apply energy-specific adjustments
      const adjustments = await this.calculateEnergyAdjustments(assetDetails, energyInput)
      
      // Calculate final NAV
      const grossAssetValue = valuation.presentValue
      const totalLiabilities = adjustments.environmentalLiabilities
        .plus(adjustments.decommissioningReserves)
        .plus(adjustments.carbonLiabilities)
      
      const netAssetValue = grossAssetValue.minus(totalLiabilities)
      
      // Build comprehensive result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `energy_${assetDetails.assetId}`,
        productType: AssetType.ENERGY,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(grossAssetValue),
        totalLiabilities: this.toNumber(totalLiabilities),
        netAssets: this.toNumber(netAssetValue),
        navValue: this.toNumber(netAssetValue),
        currency: input.targetCurrency || 'USD',
        pricingSources: this.buildEnergyPricingSources(scenarios, commodityExposures),
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED,
        metadata: {
          energyType: assetDetails.energyType,
          energySubtype: assetDetails.energySubtype,
          capacity: assetDetails.capacity,
          capacityFactor: assetDetails.operationalMetrics.capacityFactor,
          efficiency: assetDetails.operationalMetrics.efficiency,
          remainingLife: assetDetails.assetLife,
          operationalMetrics: {
            production: assetDetails.operationalMetrics.production,
            availability: assetDetails.operationalMetrics.availability,
            utilization: assetDetails.operationalMetrics.utilization,
            ebitdaMargin: assetDetails.financialMetrics.ebitdaMargin
          },
          esgMetrics: {
            overallESG: assetDetails.esgMetrics.overallESG,
            carbonIntensity: assetDetails.esgMetrics.carbonIntensity,
            environmentalScore: assetDetails.esgMetrics.environmentalScore
          },
          riskProfile: {
            overallRisk: assetDetails.riskMetrics.overallRisk,
            commodityRisk: assetDetails.riskMetrics.commodityPriceRisk,
            regulatoryRisk: assetDetails.riskMetrics.regulatoryRisk,
            weatherRisk: assetDetails.riskMetrics.weatherRisk,
            strandedAssetRisk: assetDetails.riskMetrics.strandedAssetRisk
          },
          valuationSummary: {
            baseCase: this.toNumber(scenarios[0]?.presentValue || this.decimal(0)),
            upside: scenarios.length > 1 ? this.toNumber(scenarios[1]?.presentValue || this.decimal(0)) : undefined,
            downside: scenarios.length > 2 ? this.toNumber(scenarios[2]?.presentValue || this.decimal(0)) : undefined,
            probabilityWeighted: this.toNumber(valuation.presentValue)
          },
          commodityExposures: commodityExposures.map(exp => ({
            commodity: exp.commodity,
            netExposure: exp.netExposure,
            hedgedRatio: exp.hedgedAmount / exp.exposureAmount
          }))
        }
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown energy calculation error',
        code: 'ENERGY_CALCULATION_FAILED'
      }
    }
  }

  // ==================== ENERGY SPECIFIC METHODS ====================

  /**
   * Fetches energy asset details from database
   */
  private async getEnergyAssetDetails(input: EnergyCalculationInput): Promise<EnergyAsset> {
    // TODO: Replace with actual database query
    const operationalDate = input.operationalDate || new Date('2020-01-01')
    const contractEndDate = input.contractEndDate || new Date('2045-01-01')
    
    return {
      assetId: input.assetId || 'energy_001',
      assetName: `Energy Asset ${input.assetId}`,
      energyType: input.energyAssetType || 'renewable',
      energySubtype: input.energySubtype || 'solar',
      capacity: input.capacity || 100, // MW
      location: input.location || 'Texas, USA',
      country: 'United States',
      operationalDate,
      contractEndDate,
      remainingContractLife: this.calculateYearsRemaining(contractEndDate),
      assetLife: 25,
      totalInvestment: 150000000, // $150M
      operationalMetrics: {
        capacity: input.capacity || 100,
        capacityFactor: input.capacityFactor || 0.25, // 25% for solar
        availability: 0.98,
        efficiency: 0.20, // 20% solar panel efficiency
        production: 219000, // MWh annually
        utilization: 0.92,
        maintenanceDowntime: 0.02,
        operatingCosts: 2000000, // $2M annually
        fuelCosts: 0, // No fuel for solar
        gridStability: 0.85,
        dispatchability: 0.30 // Low for solar without storage
      },
      financialMetrics: {
        revenue: 13140000, // $60/MWh * 219,000 MWh
        operatingExpenses: 2000000,
        operatingCosts: 2000000,
        fuelCosts: 0, // No fuel costs for solar
        ebitda: 11140000,
        ebitdaMargin: 0.85,
        fuelCostRatio: 0,
        maintenanceCapex: 1500000,
        growthCapex: 0,
        carbonCosts: 0,
        subsidiesReceived: input.subsidies || 3000000,
        hedgingGainsLosses: 0
      },
      technicalMetrics: {
        technologyType: 'photovoltaic',
        vintage: 2020,
        expectedLifeRemaining: 25,
        degradationRate: input.degradationRate || 0.005, // 0.5% annually
        upgradeRequired: false,
        digitalIntegration: 0.75,
        autonomationLevel: 0.60,
        gridCompatibility: 0.90,
        energyStorageCapability: 0
      },
      esgMetrics: {
        overallESG: input.esgRating || 85,
        environmentalScore: 95,
        socialScore: 78,
        governanceScore: 82,
        carbonEmissions: 0, // Solar produces no direct emissions
        carbonIntensity: input.carbonIntensity || 45, // kg CO2/MWh lifecycle
        waterUsage: 200, // ML annually for cleaning
        landUse: 500, // acres
        wasteProduction: 100, // tonnes annually
        localJobsCreated: 25,
        communityInvestment: 500000,
        safetyRecord: 95,
        regulatoryCompliance: 98
      },
      riskMetrics: {
        overallRisk: 'moderate',
        commodityPriceRisk: 0.15, // Power price volatility
        regulatoryRisk: input.regulatoryRisk || 0.10,
        technologyRisk: input.technologyRisk || 0.08,
        weatherRisk: input.weatherRisk || 0.20, // High for solar
        gridRisk: 0.12,
        counterpartyRisk: 0.05,
        strandedAssetRisk: 0.02, // Low for renewables
        transitionRisk: 0.01, // Beneficiary of energy transition
        operationalRisk: 0.06
      },
      contracts: [
        {
          contractType: 'ppa',
          counterparty: 'Regional Utility Company',
          startDate: operationalDate,
          endDate: contractEndDate,
          volumeCommitment: 200000, // MWh annually
          priceStructure: {
            type: 'fixed_escalating',
            basePrice: 65, // $/MWh
            indexLinked: false,
            index: '',
            priceFloor: 55,
            priceCeiling: 120
          },
          escalationMechanism: {
            type: 'fixed_rate',
            rate: 0.025, // 2.5% annual escalation
            frequency: 'annual',
            caps: 0.04,
            floors: 0.01
          },
          performanceMetrics: [
            {
              metric: 'availability',
              target: 0.97,
              actual: 0.98,
              penalty: 0.02,
              bonus: 0.01
            }
          ],
          creditRating: 'A',
          terminationClauses: [
            {
              trigger: 'default',
              noticePeriod: 180,
              compensationMechanism: 'fair_market_value',
              penaltyAmount: 5000000
            }
          ]
        }
      ]
    }
  }

  /**
   * Assesses commodity price exposures
   */
  private async assessCommodityExposures(asset: EnergyAsset): Promise<CommodityExposure[]> {
    const exposures: CommodityExposure[] = []
    
    // Power price exposure (universal for all energy assets)
    exposures.push({
      commodity: 'electricity',
      exposureAmount: asset.financialMetrics.revenue,
      hedgedAmount: asset.contracts.filter(c => c.contractType === 'ppa')
        .reduce((sum, contract) => sum + (contract.volumeCommitment * contract.priceStructure.basePrice), 0),
      netExposure: asset.financialMetrics.revenue * 0.2, // 20% merchant exposure
      priceVolatility: 0.35, // 35% price volatility
      correlation: 0.85
    })
    
    // Fuel price exposure (for traditional energy)
    if (asset.energyType === 'traditional') {
      let fuelCommodity = 'natural_gas'
      if (asset.energySubtype.includes('oil')) fuelCommodity = 'crude_oil'
      if (asset.energySubtype.includes('coal')) fuelCommodity = 'coal'
      
      exposures.push({
        commodity: fuelCommodity,
        exposureAmount: asset.financialMetrics.fuelCosts,
        hedgedAmount: asset.financialMetrics.fuelCosts * 0.7, // 70% hedged
        netExposure: asset.financialMetrics.fuelCosts * 0.3,
        priceVolatility: 0.45,
        correlation: -0.60 // Negative correlation with power prices
      })
    }
    
    // Carbon price exposure
    exposures.push({
      commodity: 'carbon_allowances',
      exposureAmount: asset.esgMetrics.carbonEmissions * 25, // $25/tonne CO2
      hedgedAmount: 0, // Usually not hedged
      netExposure: asset.esgMetrics.carbonEmissions * 25,
      priceVolatility: 0.60,
      correlation: 0.25
    })
    
    return exposures
  }

  /**
   * Assesses weather risk for renewable energy assets
   */
  private async assessWeatherRisk(asset: EnergyAsset, input: EnergyCalculationInput): Promise<WeatherRisk> {
    // Weather risk varies by technology and location
    let baseWeatherRisk = 0.10
    
    // Technology-specific weather sensitivity
    switch (asset.energySubtype) {
      case 'solar':
        baseWeatherRisk = 0.25 // High solar irradiance dependency
        break
      case 'wind':
        baseWeatherRisk = 0.30 // High wind speed dependency
        break
      case 'hydro':
        baseWeatherRisk = 0.35 // High precipitation dependency
        break
      default:
        baseWeatherRisk = 0.05 // Low for traditional energy
    }
    
    return {
      windSpeed: {
        average: 7.5, // m/s
        volatility: 0.20,
        trend: 0.01, // Slight increasing trend
        extremeEventProbability: 0.05
      },
      solarIrradiance: {
        average: 5.2, // kWh/m²/day
        volatility: 0.15,
        trend: -0.002, // Slight decreasing trend due to climate change
        extremeEventProbability: 0.03
      },
      temperature: {
        average: 22, // °C
        volatility: 0.12,
        trend: 0.02, // Rising temperatures
        extremeEventProbability: 0.08
      },
      precipitation: {
        average: 800, // mm annually
        volatility: 0.25,
        trend: 0.005,
        extremeEventProbability: 0.10
      },
      seasonalVariation: 0.40, // 40% seasonal variation
      extremeWeatherRisk: baseWeatherRisk
    }
  }

  /**
   * Generates energy-specific valuation scenarios
   */
  private async generateEnergyScenarios(
    asset: EnergyAsset,
    commodityExposures: CommodityExposure[],
    weatherRisk: WeatherRisk
  ): Promise<EnergyValuationScenario[]> {
    const scenarios: EnergyValuationScenario[] = []
    
    // Base case scenario
    const baseAssumptions: EnergyScenarioAssumptions = {
      commodityPriceGrowth: 0.03,
      powerPriceGrowth: 0.025,
      carbonPriceGrowth: 0.08, // 8% annual carbon price growth
      inflationRate: 0.025,
      discountRate: 0.08,
      capacityDegradation: asset.technicalMetrics.degradationRate,
      operatingCostGrowth: 0.03,
      fuelCostGrowth: 0.04,
      regulatoryChange: false,
      technologyImprovement: 0.01
    }
    
    const baseCashFlows = this.projectEnergyCashFlows(asset, baseAssumptions)
    const baseNPV = this.calculateNPV(baseCashFlows, baseAssumptions.discountRate)
    
    scenarios.push({
      scenario: 'base',
      probability: 0.50,
      assumptions: baseAssumptions,
      cashFlows: baseCashFlows,
      presentValue: baseNPV
    })
    
    // Renewable energy upside scenario
    if (asset.energyType === 'renewable') {
      const renewableUpsideAssumptions: EnergyScenarioAssumptions = {
        ...baseAssumptions,
        powerPriceGrowth: 0.04,
        carbonPriceGrowth: 0.12,
        capacityDegradation: baseAssumptions.capacityDegradation * 0.8,
        technologyImprovement: 0.02,
        regulatoryChange: true // Favorable policy changes
      }
      
      const renewableUpsideCashFlows = this.projectEnergyCashFlows(asset, renewableUpsideAssumptions)
      const renewableUpsideNPV = this.calculateNPV(renewableUpsideCashFlows, renewableUpsideAssumptions.discountRate)
      
      scenarios.push({
        scenario: 'renewable_upside',
        probability: 0.25,
        assumptions: renewableUpsideAssumptions,
        cashFlows: renewableUpsideCashFlows,
        presentValue: renewableUpsideNPV
      })
    }
    
    // Downside scenario
    const downsideAssumptions: EnergyScenarioAssumptions = {
      ...baseAssumptions,
      commodityPriceGrowth: 0.01,
      powerPriceGrowth: 0.01,
      capacityDegradation: baseAssumptions.capacityDegradation * 1.5,
      operatingCostGrowth: 0.05,
      discountRate: 0.10,
      technologyImprovement: -0.005
    }
    
    const downsideCashFlows = this.projectEnergyCashFlows(asset, downsideAssumptions)
    const downsideNPV = this.calculateNPV(downsideCashFlows, downsideAssumptions.discountRate)
    
    scenarios.push({
      scenario: 'downside',
      probability: 0.25,
      assumptions: downsideAssumptions,
      cashFlows: downsideCashFlows,
      presentValue: downsideNPV
    })
    
    return scenarios
  }

  // ==================== HELPER METHODS ====================

  private calculateYearsRemaining(endDate: Date): number {
    const now = new Date()
    const yearsDiff = endDate.getFullYear() - now.getFullYear()
    const monthsDiff = endDate.getMonth() - now.getMonth()
    return yearsDiff + (monthsDiff / 12)
  }

  private projectEnergyCashFlows(asset: EnergyAsset, assumptions: EnergyScenarioAssumptions): EnergyProjection[] {
    const projectionYears = Math.min(asset.assetLife, 30)
    const cashFlows = []
    
    let baseProduction = asset.operationalMetrics.production
    let baseRevenue = asset.financialMetrics.revenue
    let baseOpex = asset.financialMetrics.operatingCosts
    let baseFuelCosts = asset.financialMetrics.fuelCosts
    
    for (let year = 1; year <= projectionYears; year++) {
      // Apply capacity degradation
      const degradationFactor = Math.pow(1 - assumptions.capacityDegradation, year)
      const production = this.decimal(baseProduction).times(degradationFactor)
      
      // Apply price growth
      const powerPriceInflator = Math.pow(1 + assumptions.powerPriceGrowth, year)
      const revenue = this.decimal(baseRevenue).times(powerPriceInflator).times(degradationFactor)
      
      // Apply cost inflation
      const costInflator = Math.pow(1 + assumptions.operatingCostGrowth, year)
      const operatingCosts = this.decimal(baseOpex).times(costInflator)
      
      const fuelInflator = Math.pow(1 + assumptions.fuelCostGrowth, year)
      const fuelCosts = this.decimal(baseFuelCosts).times(fuelInflator)
      
      // Carbon costs
      const carbonInflator = Math.pow(1 + assumptions.carbonPriceGrowth, year)
      const carbonCosts = this.decimal(asset.esgMetrics.carbonEmissions * 25).times(carbonInflator)
      
      const ebitda = revenue.minus(operatingCosts).minus(fuelCosts).minus(carbonCosts)
      
      // Capex (maintenance)
      const capex = this.decimal(asset.financialMetrics.maintenanceCapex).times(costInflator)
      
      const freeCashFlow = ebitda.minus(capex)
      
      // Present value
      const discountFactor = Math.pow(1 + assumptions.discountRate, year)
      const presentValue = freeCashFlow.div(discountFactor)
      
      cashFlows.push({
        year,
        production,
        revenue,
        operatingCosts,
        fuelCosts,
        carbonCosts,
        ebitda,
        capex,
        freeCashFlow,
        presentValue
      })
    }
    
    return cashFlows
  }

  private calculateNPV(cashFlows: EnergyProjection[], discountRate: number): Decimal {
    return cashFlows.reduce((npv, cf) => npv.plus(cf.presentValue), new Decimal(0))
  }

  private async calculateWeightedValuation(scenarios: EnergyValuationScenario[]): Promise<any> {
    let weightedValue = new Decimal(0)
    let totalProbability = 0
    
    scenarios.forEach(scenario => {
      weightedValue = weightedValue.plus(scenario.presentValue.times(scenario.probability))
      totalProbability += scenario.probability
    })
    
    if (totalProbability !== 1.0 && totalProbability > 0) {
      weightedValue = weightedValue.div(totalProbability)
    }
    
    return {
      presentValue: weightedValue,
      scenarios: scenarios
    }
  }

  private async calculateEnergyAdjustments(asset: EnergyAsset, input: EnergyCalculationInput): Promise<any> {
    const totalInvestment = this.decimal(asset.totalInvestment)
    
    // Environmental liabilities (cleanup, restoration)
    let environmentalLiabilities = totalInvestment.times(0.02) // 2% for renewables
    if (asset.energyType === 'traditional') {
      environmentalLiabilities = totalInvestment.times(0.08) // 8% for traditional energy
    }
    
    // Decommissioning reserves
    const decommissioningReserves = totalInvestment.times(0.05) // 5% decommissioning cost
    
    // Carbon liabilities (based on future carbon costs)
    const carbonLiabilities = this.decimal(asset.esgMetrics.carbonEmissions)
      .times(50) // $50/tonne future carbon price
      .times(asset.assetLife)
    
    return {
      environmentalLiabilities,
      decommissioningReserves,
      carbonLiabilities,
      total: environmentalLiabilities.plus(decommissioningReserves).plus(carbonLiabilities)
    }
  }

  private buildEnergyPricingSources(
    scenarios: EnergyValuationScenario[],
    commodityExposures: CommodityExposure[]
  ): Record<string, PriceData> {
    const pricingSources: Record<string, PriceData> = {}
    
    // Scenario valuations
    scenarios.forEach(scenario => {
      pricingSources[scenario.scenario] = {
        price: this.toNumber(scenario.presentValue),
        currency: 'USD',
        asOf: new Date(),
        source: `energy_dcf_${scenario.scenario}`
      }
    })
    
    // Commodity exposures
    commodityExposures.forEach((exposure, index) => {
      pricingSources[`commodity_${index + 1}`] = {
        price: exposure.netExposure,
        currency: 'USD',
        asOf: new Date(),
        source: `${exposure.commodity}_exposure`
      }
    })
    
    return pricingSources
  }

  protected override generateRunId(): string {
    return `energy_nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
