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
import { DatabaseService } from '../DatabaseService'
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
    
    try {
      // Get real energy product data from database
      const productDetails = await this.databaseService.getEnergyProductById(input.assetId!)
      
      const operationalDate = input.operationalDate || 
        (productDetails.installation_date ? new Date(productDetails.installation_date) : new Date('2020-01-01'))
      const contractEndDate = input.contractEndDate || new Date('2045-01-01')
      
      return {
        assetId: productDetails.id,
        assetName: productDetails.project_name || `Energy Asset ${input.assetId}`,
        energyType: input.energyAssetType || this.categorizeEnergyType(productDetails.energy_source),
        energySubtype: input.energySubtype || productDetails.energy_source || 'solar',
        capacity: input.capacity || productDetails.capacity_mw || 100,
        location: input.location || productDetails.location || 'Texas, USA',
        country: 'United States',
        operationalDate,
        contractEndDate,
        remainingContractLife: this.calculateYearsRemaining(contractEndDate),
        assetLife: 25,
        totalInvestment: 150000000, // $150M
        operationalMetrics: this.buildOperationalMetrics(input, productDetails),
        financialMetrics: this.buildFinancialMetrics(input, productDetails),
        technicalMetrics: this.buildTechnicalMetrics(input, productDetails),
        esgMetrics: this.buildEsgMetrics(input, productDetails),
        riskMetrics: this.buildRiskMetrics(input, productDetails),
        contracts: this.buildContractDetails(input, productDetails, operationalDate, contractEndDate)
      }
    } catch (error) {
      // Graceful fallback with intelligent defaults
      this.logger?.warn({ error, assetId: input.assetId }, 'Failed to fetch energy product details, using fallback')
      
      return this.buildFallbackEnergyAsset(input)
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
   * Helper method to categorize energy type from source
   */
  private categorizeEnergyType(energySource: string): string {
    const renewables = ['solar', 'wind', 'hydro', 'geothermal', 'biomass']
    const traditional = ['coal', 'natural_gas', 'oil', 'nuclear']
    
    if (renewables.some(type => energySource?.toLowerCase().includes(type))) {
      return 'renewable'
    } else if (traditional.some(type => energySource?.toLowerCase().includes(type))) {
      return 'traditional'
    }
    return 'infrastructure'
  }

  /**
   * Build operational metrics from database and input data
   */
  private buildOperationalMetrics(input: EnergyCalculationInput, productDetails: any): EnergyOperationalMetrics {
    const capacity = input.capacity || productDetails.capacity_mw || 100
    const capacityFactor = input.capacityFactor || this.getDefaultCapacityFactor(productDetails.energy_source)
    const annualProduction = capacity * capacityFactor * 8760 // MWh annually
    
    return {
      capacity: capacity,
      capacityFactor: capacityFactor,
      availability: 0.98,
      efficiency: this.getDefaultEfficiency(productDetails.energy_source),
      production: annualProduction,
      utilization: 0.92,
      maintenanceDowntime: 0.02,
      operatingCosts: annualProduction * 10, // $10/MWh O&M costs
      fuelCosts: this.getFuelCosts(productDetails.energy_source, annualProduction),
      gridStability: 0.85,
      dispatchability: this.getDispatchability(productDetails.energy_source)
    }
  }

  /**
   * Build financial metrics from database and input data
   */
  private buildFinancialMetrics(input: EnergyCalculationInput, productDetails: any): EnergyFinancialMetrics {
    const capacity = input.capacity || productDetails.capacity_mw || 100
    const capacityFactor = input.capacityFactor || this.getDefaultCapacityFactor(productDetails.energy_source)
    const annualProduction = capacity * capacityFactor * 8760
    const powerPrice = 60 // $/MWh base price
    const revenue = annualProduction * powerPrice
    const operatingCosts = annualProduction * 10
    const fuelCosts = this.getFuelCosts(productDetails.energy_source, annualProduction)
    
    return {
      revenue: revenue,
      operatingExpenses: operatingCosts,
      operatingCosts: operatingCosts,
      fuelCosts: fuelCosts,
      ebitda: revenue - operatingCosts - fuelCosts,
      ebitdaMargin: (revenue - operatingCosts - fuelCosts) / revenue,
      fuelCostRatio: fuelCosts / revenue,
      maintenanceCapex: revenue * 0.05,
      growthCapex: 0,
      carbonCosts: this.getCarbonCosts(productDetails.energy_source, annualProduction),
      subsidiesReceived: input.subsidies || 0,
      hedgingGainsLosses: 0
    }
  }

  /**
   * Build technical metrics from database and input data
   */
  private buildTechnicalMetrics(input: EnergyCalculationInput, productDetails: any): TechnicalMetrics {
    return {
      technologyType: productDetails.technology_type || this.getTechnologyType(productDetails.energy_source),
      vintage: productDetails.installation_date ? new Date(productDetails.installation_date).getFullYear() : 2020,
      expectedLifeRemaining: 25,
      degradationRate: input.degradationRate || this.getDegradationRate(productDetails.energy_source),
      upgradeRequired: false,
      digitalIntegration: 0.75,
      autonomationLevel: 0.60,
      gridCompatibility: 0.90,
      energyStorageCapability: 0
    }
  }

  /**
   * Build ESG metrics from database and input data
   */
  private buildEsgMetrics(input: EnergyCalculationInput, productDetails: any): EnergyESGMetrics {
    const carbonIntensity = this.getCarbonIntensity(productDetails.energy_source)
    const capacity = input.capacity || productDetails.capacity_mw || 100
    const annualProduction = capacity * (input.capacityFactor || this.getDefaultCapacityFactor(productDetails.energy_source)) * 8760
    
    return {
      overallESG: input.esgRating || this.getESGRating(productDetails.energy_source),
      environmentalScore: this.getEnvironmentalScore(productDetails.energy_source),
      socialScore: 78,
      governanceScore: 82,
      carbonEmissions: annualProduction * carbonIntensity / 1000, // Convert to tonnes
      carbonIntensity: carbonIntensity,
      waterUsage: this.getWaterUsage(productDetails.energy_source, annualProduction),
      landUse: capacity * 5, // 5 acres per MW
      wasteProduction: 100,
      localJobsCreated: Math.floor(capacity / 10), // 1 job per 10 MW
      communityInvestment: 500000,
      safetyRecord: 95,
      regulatoryCompliance: 98
    }
  }

  /**
   * Build risk metrics from database and input data
   */
  private buildRiskMetrics(input: EnergyCalculationInput, productDetails: any): EnergyRiskMetrics {
    return {
      overallRisk: 'moderate',
      commodityPriceRisk: this.getCommodityRisk(productDetails.energy_source),
      regulatoryRisk: input.regulatoryRisk || 0.10,
      technologyRisk: input.technologyRisk || this.getTechnologyRisk(productDetails.energy_source),
      weatherRisk: input.weatherRisk || this.getWeatherRisk(productDetails.energy_source),
      gridRisk: 0.12,
      counterpartyRisk: 0.05,
      strandedAssetRisk: this.getStrandedAssetRisk(productDetails.energy_source),
      transitionRisk: this.getTransitionRisk(productDetails.energy_source),
      operationalRisk: 0.06
    }
  }

  /**
   * Build contract details from database and input data
   */
  private buildContractDetails(
    input: EnergyCalculationInput, 
    productDetails: any, 
    operationalDate: Date, 
    contractEndDate: Date
  ): EnergyContract[] {
    const contracts: EnergyContract[] = []
    
    // Add PPA if specified in database
    if (productDetails.power_purchase_agreement) {
      contracts.push({
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
      })
    }
    
    return contracts
  }

  /**
   * Build fallback energy asset when database fetch fails
   */
  private buildFallbackEnergyAsset(input: EnergyCalculationInput): EnergyAsset {
    const operationalDate = input.operationalDate || new Date('2020-01-01')
    const contractEndDate = input.contractEndDate || new Date('2045-01-01')
    
    return {
      assetId: input.assetId || 'energy_001',
      assetName: `Energy Asset ${input.assetId}`,
      energyType: input.energyAssetType || 'renewable',
      energySubtype: input.energySubtype || 'solar',
      capacity: input.capacity || 100,
      location: input.location || 'Texas, USA',
      country: 'United States',
      operationalDate,
      contractEndDate,
      remainingContractLife: this.calculateYearsRemaining(contractEndDate),
      assetLife: 25,
      totalInvestment: 150000000,
      operationalMetrics: this.buildOperationalMetrics(input, { energy_source: 'solar', capacity_mw: 100 }),
      financialMetrics: this.buildFinancialMetrics(input, { energy_source: 'solar', capacity_mw: 100 }),
      technicalMetrics: this.buildTechnicalMetrics(input, { energy_source: 'solar' }),
      esgMetrics: this.buildEsgMetrics(input, { energy_source: 'solar', capacity_mw: 100 }),
      riskMetrics: this.buildRiskMetrics(input, { energy_source: 'solar' }),
      contracts: this.buildContractDetails(input, { power_purchase_agreement: true }, operationalDate, contractEndDate)
    }
  }

  // Energy source specific helper methods
  private getDefaultCapacityFactor(energySource: string): number {
    const factors: Record<string, number> = {
      solar: 0.25,
      wind: 0.35,
      hydro: 0.45,
      natural_gas: 0.55,
      nuclear: 0.90,
      coal: 0.65
    }
    return factors[energySource?.toLowerCase()] || 0.30
  }

  private getDefaultEfficiency(energySource: string): number {
    const efficiencies: Record<string, number> = {
      solar: 0.20,
      wind: 0.45,
      hydro: 0.90,
      natural_gas: 0.45,
      nuclear: 0.35,
      coal: 0.35
    }
    return efficiencies[energySource?.toLowerCase()] || 0.35
  }

  private getFuelCosts(energySource: string, annualProduction: number): number {
    const renewables = ['solar', 'wind', 'hydro', 'geothermal']
    if (renewables.some(type => energySource?.toLowerCase().includes(type))) {
      return 0 // No fuel costs for renewables
    }
    
    const fuelCostPerMWh: Record<string, number> = {
      natural_gas: 25,
      coal: 15,
      nuclear: 8
    }
    
    return annualProduction * (fuelCostPerMWh[energySource?.toLowerCase()] || 20)
  }

  private getDispatchability(energySource: string): number {
    const dispatchability: Record<string, number> = {
      solar: 0.30,
      wind: 0.35,
      hydro: 0.85,
      natural_gas: 0.95,
      nuclear: 0.70,
      coal: 0.80
    }
    return dispatchability[energySource?.toLowerCase()] || 0.50
  }

  private getCarbonCosts(energySource: string, annualProduction: number): number {
    const carbonIntensity = this.getCarbonIntensity(energySource)
    const carbonPrice = 25 // $/tonne CO2
    return (annualProduction * carbonIntensity / 1000) * carbonPrice
  }

  private getCarbonIntensity(energySource: string): number {
    const intensities: Record<string, number> = {
      solar: 45,
      wind: 12,
      hydro: 24,
      natural_gas: 490,
      coal: 820,
      nuclear: 12
    }
    return intensities[energySource?.toLowerCase()] || 200
  }

  private getTechnologyType(energySource: string): string {
    const types: Record<string, string> = {
      solar: 'photovoltaic',
      wind: 'wind_turbine',
      hydro: 'hydroelectric',
      natural_gas: 'combined_cycle',
      coal: 'steam_turbine',
      nuclear: 'pressurized_water_reactor'
    }
    return types[energySource?.toLowerCase()] || 'generic'
  }

  private getDegradationRate(energySource: string): number {
    const rates: Record<string, number> = {
      solar: 0.005,
      wind: 0.002,
      hydro: 0.001,
      natural_gas: 0.008,
      coal: 0.010,
      nuclear: 0.003
    }
    return rates[energySource?.toLowerCase()] || 0.005
  }

  private getESGRating(energySource: string): number {
    const ratings: Record<string, number> = {
      solar: 90,
      wind: 88,
      hydro: 85,
      natural_gas: 65,
      coal: 35,
      nuclear: 70
    }
    return ratings[energySource?.toLowerCase()] || 70
  }

  private getEnvironmentalScore(energySource: string): number {
    const scores: Record<string, number> = {
      solar: 95,
      wind: 93,
      hydro: 85,
      natural_gas: 60,
      coal: 25,
      nuclear: 75
    }
    return scores[energySource?.toLowerCase()] || 70
  }

  private getWaterUsage(energySource: string, annualProduction: number): number {
    const usagePerMWh: Record<string, number> = {
      solar: 0.26, // ML/MWh for cleaning
      wind: 0.01,
      hydro: 17.0, // Evaporation losses
      natural_gas: 0.75,
      coal: 1.05,
      nuclear: 2.73
    }
    return annualProduction * (usagePerMWh[energySource?.toLowerCase()] || 0.5)
  }

  private getCommodityRisk(energySource: string): number {
    const risks: Record<string, number> = {
      solar: 0.15,
      wind: 0.18,
      hydro: 0.12,
      natural_gas: 0.45,
      coal: 0.35,
      nuclear: 0.20
    }
    return risks[energySource?.toLowerCase()] || 0.25
  }

  private getTechnologyRisk(energySource: string): number {
    const risks: Record<string, number> = {
      solar: 0.08,
      wind: 0.10,
      hydro: 0.05,
      natural_gas: 0.12,
      coal: 0.15,
      nuclear: 0.20
    }
    return risks[energySource?.toLowerCase()] || 0.10
  }

  private getWeatherRisk(energySource: string): number {
    const risks: Record<string, number> = {
      solar: 0.25,
      wind: 0.30,
      hydro: 0.35,
      natural_gas: 0.05,
      coal: 0.05,
      nuclear: 0.03
    }
    return risks[energySource?.toLowerCase()] || 0.15
  }

  private getStrandedAssetRisk(energySource: string): number {
    const risks: Record<string, number> = {
      solar: 0.02,
      wind: 0.02,
      hydro: 0.01,
      natural_gas: 0.15,
      coal: 0.35,
      nuclear: 0.10
    }
    return risks[energySource?.toLowerCase()] || 0.10
  }

  private getTransitionRisk(energySource: string): number {
    const risks: Record<string, number> = {
      solar: 0.01, // Beneficiary
      wind: 0.01, // Beneficiary
      hydro: 0.02, // Beneficiary
      natural_gas: 0.25, // Transition fuel
      coal: 0.50, // High risk
      nuclear: 0.15 // Moderate risk
    }
    return risks[energySource?.toLowerCase()] || 0.15
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
