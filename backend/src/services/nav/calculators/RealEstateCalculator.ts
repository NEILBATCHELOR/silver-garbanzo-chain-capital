/**
 * RealEstateCalculator - NAV calculation for Real Estate holdings
 * 
 * Handles:
 * - Direct real estate property valuations with multiple approaches
 * - REIT (Real Estate Investment Trust) holdings and distributions
 * - Cap rate analysis and market-based valuations
 * - Net Operating Income (NOI) calculations
 * - Property appreciation and depreciation modeling
 * - Lease income analysis and tenant diversification
 * - Market rent comparisons and vacancy adjustments
 * - Development projects and construction loans
 * - Property tax and insurance adjustments
 * - Environmental and sustainability certifications impact
 * - Geographic diversification and market analysis
 * - Debt service and loan-to-value ratio calculations
 * 
 * Supports real estate products from real_estate_products table
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

export interface RealEstateCalculationInput extends CalculationInput {
  // Real estate specific parameters
  propertyId?: string
  propertyType?: string // residential, commercial, industrial, mixed-use, land
  propertyAddress?: string
  geographicLocation?: string
  acquisitionDate?: Date
  developmentStage?: string // development, stabilized, disposition
  propertySubtype?: string // office, retail, multifamily, warehouse, hotel
  totalUnits?: number
  totalSquareFootage?: number
  occupancyRate?: number
  marketRentGrowth?: number
  capRate?: number
  discountRate?: number
  environmentalCertifications?: string[]
  // REIT specific
  reitTicker?: string
  reitType?: string // equity, mortgage, hybrid
  dividendYield?: number
  fundsFromOperations?: number
  // Valuation approaches
  valuationMethod?: 'income' | 'sales_comparison' | 'cost' | 'hybrid'
}

export interface PropertyDetails {
  propertyId: string
  propertyName: string
  propertyType: string
  propertyAddress: string
  geographicLocation: string
  acquisitionDate: Date
  developmentStage: string
  totalUnits: number
  totalSquareFootage: number
  buildingClass: string
  yearBuilt: number
  lastRenovated?: Date
  occupancyRate: number
  averageRent: number
  marketRent: number
  grossRentalIncome: number
  netOperatingIncome: number
  capRate: number
  environmentalCertifications: string[]
  propertyTaxes: number
  insurance: number
  maintenanceReserves: number
}

export interface LeaseDetails {
  leaseId: string
  tenantName: string
  unitNumber: string
  leaseStartDate: Date
  leaseEndDate: Date
  monthlyRent: number
  securityDeposit: number
  leaseType: string // gross, net, modified_gross
  escalationClause: boolean
  renewalOptions: number
  earlyTerminationClause: boolean
  creditRating: string
}

export interface MarketComparables {
  comparableProperties: PropertyComparable[]
  averageCapRate: number
  averagePricePerSqFt: number
  averagePricePerUnit: number
  marketRentGrowth: number
  vacancyRate: number
  marketTrends: MarketTrend[]
  submarketAnalysis: SubmarketData
}

export interface PropertyComparable {
  address: string
  saleDate: Date
  salePrice: number
  pricePerSqFt: number
  capRate: number
  occupancyRate: number
  buildingClass: string
  yearBuilt: number
  adjustments: Record<string, number>
}

export interface MarketTrend {
  period: string
  rentGrowth: number
  occupancyChange: number
  capRateMovement: number
  newSupply: number
  absorption: number
}

export interface SubmarketData {
  submarketName: string
  averageRent: number
  vacancyRate: number
  rentGrowthRate: number
  employmentGrowth: number
  populationGrowth: number
  transitScore: number
  walkabilityScore: number
}

export interface ValuationResult {
  approachUsed: string
  estimatedValue: Decimal
  confidenceLevel: number
  keyAssumptions: Record<string, any>
  sensitivityAnalysis: SensitivityAnalysis
}

export interface SensitivityAnalysis {
  capRateImpact: Record<string, number> // Cap rate changes vs value impact
  occupancyImpact: Record<string, number>
  rentGrowthImpact: Record<string, number>
  expenseRatioImpact: Record<string, number>
}

export interface ReitMetrics {
  ticker: string
  reitType: string
  marketCap: number
  sharePrice: number
  dividendYield: number
  payoutRatio: number
  fundsFromOperations: number
  adjustedFundsFromOperations: number
  netAssetValue: number
  priceToFFO: number
  priceToBook: number
  debtToEquity: number
  occupancyRate: number
  sameStoreNOIGrowth: number
}

export class RealEstateCalculator extends BaseCalculator {
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
    return [AssetType.REAL_ESTATE]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const reInput = input as RealEstateCalculationInput

      // Determine if this is direct real estate or REIT
      const investmentType = this.determineInvestmentType(reInput)

      let result: CalculationResult

      if (investmentType === 'direct_property') {
        result = await this.calculateDirectProperty(reInput)
      } else if (investmentType === 'reit') {
        result = await this.calculateReitHolding(reInput)
      } else {
        // Hybrid or portfolio approach
        result = await this.calculateHybridRealEstate(reInput)
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown real estate calculation error',
        code: 'REAL_ESTATE_CALCULATION_FAILED'
      }
    }
  }

  // ==================== DIRECT PROPERTY VALUATION ====================

  private async calculateDirectProperty(input: RealEstateCalculationInput): Promise<CalculationResult> {
    // Get property details and market data
    const propertyDetails = await this.getPropertyDetails(input)
    const leaseDetails = await this.getLeaseDetails(input, propertyDetails)
    const marketComparables = await this.getMarketComparables(propertyDetails)
    
    // Calculate property value using multiple approaches
    const incomeApproach = await this.calculateIncomeApproach(propertyDetails, leaseDetails)
    const salesComparisonApproach = await this.calculateSalesComparison(propertyDetails, marketComparables)
    const costApproach = await this.calculateCostApproach(propertyDetails)
    
    // Reconcile valuations to final estimate
    const reconciledValue = this.reconcilePropertyValuations([
      incomeApproach,
      salesComparisonApproach,
      costApproach
    ])
    
    // Apply property-specific adjustments
    const adjustments = await this.calculatePropertyAdjustments(propertyDetails, input)
    
    // Calculate final NAV
    const grossAssetValue = reconciledValue.estimatedValue
    const totalLiabilities = this.calculatePropertyLiabilities(propertyDetails, adjustments)
    const netAssetValue = grossAssetValue.minus(totalLiabilities)
    
    return {
      runId: this.generateRunId(),
      assetId: input.assetId || `property_${propertyDetails.propertyId}`,
      productType: AssetType.REAL_ESTATE,
      projectId: input.projectId,
      valuationDate: input.valuationDate,
      totalAssets: this.toNumber(grossAssetValue),
      totalLiabilities: this.toNumber(totalLiabilities),
      netAssets: this.toNumber(netAssetValue),
      navValue: this.toNumber(netAssetValue),
      currency: input.targetCurrency || 'USD',
      pricingSources: this.buildPropertyPricingSources(incomeApproach, salesComparisonApproach, costApproach),
      calculatedAt: new Date(),
      status: CalculationStatus.COMPLETED,
      metadata: {
        propertyType: propertyDetails.propertyType,
        valuationMethod: reconciledValue.approachUsed,
        capRate: propertyDetails.capRate,
        occupancyRate: propertyDetails.occupancyRate,
        netOperatingIncome: propertyDetails.netOperatingIncome,
        pricePerSqFt: this.toNumber(grossAssetValue.div(propertyDetails.totalSquareFootage)),
        marketMetrics: {
          averageCapRate: marketComparables.averageCapRate,
          marketRentGrowth: marketComparables.marketRentGrowth,
          vacancyRate: marketComparables.vacancyRate
        },
        sensitivityAnalysis: reconciledValue.sensitivityAnalysis
      }
    }
  }

  // ==================== REIT VALUATION ====================

  private async calculateReitHolding(input: RealEstateCalculationInput): Promise<CalculationResult> {
    // Get REIT data and metrics
    const reitMetrics = await this.getReitMetrics(input)
    const reitHoldings = await this.getReitHoldings(input)
    
    // Calculate REIT value based on multiple factors
    const marketValue = this.calculateReitMarketValue(reitMetrics, reitHoldings)
    const navBasedValue = this.calculateReitNAVValue(reitMetrics, reitHoldings)
    const dividendValue = this.calculateReitDividendValue(reitMetrics, reitHoldings)
    
    // Weight different valuation approaches
    const weightedValue = this.weightReitValuations(marketValue, navBasedValue, dividendValue)
    
    // Apply REIT-specific adjustments
    const adjustments = await this.calculateReitAdjustments(reitMetrics, input)
    
    const grossAssetValue = weightedValue
    const totalLiabilities = adjustments.managementFees.plus(adjustments.otherExpenses)
    const netAssetValue = grossAssetValue.minus(totalLiabilities)
    
    return {
      runId: this.generateRunId(),
      assetId: input.assetId || `reit_${reitMetrics.ticker}`,
      productType: AssetType.REAL_ESTATE,
      projectId: input.projectId,
      valuationDate: input.valuationDate,
      totalAssets: this.toNumber(grossAssetValue),
      totalLiabilities: this.toNumber(totalLiabilities),
      netAssets: this.toNumber(netAssetValue),
      navValue: this.toNumber(netAssetValue),
      currency: input.targetCurrency || 'USD',
      pricingSources: this.buildReitPricingSources(reitMetrics),
      calculatedAt: new Date(),
      status: CalculationStatus.COMPLETED,
      metadata: {
        reitTicker: reitMetrics.ticker,
        reitType: reitMetrics.reitType,
        sharePrice: reitMetrics.sharePrice,
        dividendYield: reitMetrics.dividendYield,
        fundsFromOperations: reitMetrics.fundsFromOperations,
        priceToFFO: reitMetrics.priceToFFO,
        priceToBook: reitMetrics.priceToBook,
        debtToEquity: reitMetrics.debtToEquity,
        occupancyRate: reitMetrics.occupancyRate
      }
    }
  }

  // ==================== VALUATION METHODS ====================

  /**
   * Income approach using cap rate and NOI
   */
  private async calculateIncomeApproach(
    property: PropertyDetails,
    leases: LeaseDetails[]
  ): Promise<ValuationResult> {
    // Calculate stabilized NOI
    const stabilizedNOI = this.calculateStabilizedNOI(property, leases)
    
    // Apply market cap rate with adjustments
    const adjustedCapRate = this.applyCapRateAdjustments(property.capRate, property)
    
    // Calculate value
    const estimatedValue = stabilizedNOI.div(adjustedCapRate)
    
    // Sensitivity analysis
    const sensitivityAnalysis = this.performCapRateSensitivity(stabilizedNOI, adjustedCapRate)
    
    return {
      approachUsed: 'income_capitalization',
      estimatedValue,
      confidenceLevel: 0.85,
      keyAssumptions: {
        stabilizedNOI: this.toNumber(stabilizedNOI),
        capRate: adjustedCapRate,
        occupancyRate: property.occupancyRate,
        marketRentGrowth: 0.03 // Assume 3% growth
      },
      sensitivityAnalysis
    }
  }

  /**
   * Sales comparison approach using market comparables
   */
  private async calculateSalesComparison(
    property: PropertyDetails,
    comparables: MarketComparables
  ): Promise<ValuationResult> {
    let adjustedValue = new Decimal(0)
    let totalWeight = 0
    
    for (const comp of comparables.comparableProperties) {
      // Calculate similarity weight
      const weight = this.calculateComparableWeight(property, comp)
      
      // Apply adjustments for differences
      const adjustedPrice = this.applyComparableAdjustments(comp, property)
      
      // Weight the comparable
      adjustedValue = adjustedValue.plus(adjustedPrice.times(weight))
      totalWeight += weight
    }
    
    const estimatedValue = totalWeight > 0 ? 
      adjustedValue.div(totalWeight).times(property.totalSquareFootage) : 
      new Decimal(0)
    
    return {
      approachUsed: 'sales_comparison',
      estimatedValue,
      confidenceLevel: 0.75,
      keyAssumptions: {
        comparablesUsed: comparables.comparableProperties.length,
        averagePricePerSqFt: comparables.averagePricePerSqFt,
        adjustmentRange: '±15%'
      },
      sensitivityAnalysis: this.performSalesComparisonSensitivity(estimatedValue)
    }
  }

  /**
   * Cost approach using replacement cost minus depreciation
   */
  private async calculateCostApproach(property: PropertyDetails): Promise<ValuationResult> {
    // Calculate land value
    const landValue = await this.estimateLandValue(property)
    
    // Calculate replacement cost new
    const replacementCostNew = this.calculateReplacementCost(property)
    
    // Calculate depreciation
    const depreciation = this.calculateDepreciation(property)
    
    // Calculate value
    const estimatedValue = landValue.plus(replacementCostNew.minus(depreciation))
    
    return {
      approachUsed: 'cost',
      estimatedValue,
      confidenceLevel: 0.65, // Lower confidence for income-producing properties
      keyAssumptions: {
        landValue: this.toNumber(landValue),
        replacementCostNew: this.toNumber(replacementCostNew),
        totalDepreciation: this.toNumber(depreciation)
      },
      sensitivityAnalysis: this.performCostApproachSensitivity(landValue, replacementCostNew, depreciation)
    }
  }

  // ==================== HELPER METHODS ====================

  private determineInvestmentType(input: RealEstateCalculationInput): string {
    if (input.reitTicker) return 'reit'
    if (input.propertyId) return 'direct_property'
    return 'hybrid'
  }

  private async getPropertyDetails(input: RealEstateCalculationInput): Promise<PropertyDetails> {
    // TODO: Replace with actual database query
    return {
      propertyId: input.propertyId || 'prop_001',
      propertyName: `Property ${input.propertyId}`,
      propertyType: input.propertyType || 'commercial',
      propertyAddress: input.propertyAddress || '123 Main St',
      geographicLocation: input.geographicLocation || 'New York',
      acquisitionDate: input.acquisitionDate || new Date('2020-01-01'),
      developmentStage: input.developmentStage || 'stabilized',
      totalUnits: input.totalUnits || 100,
      totalSquareFootage: input.totalSquareFootage || 50000,
      buildingClass: 'A',
      yearBuilt: 2015,
      occupancyRate: input.occupancyRate || 0.92,
      averageRent: 25,
      marketRent: 27,
      grossRentalIncome: 1350000,
      netOperatingIncome: 950000,
      capRate: input.capRate || 0.065,
      environmentalCertifications: input.environmentalCertifications || ['LEED Gold'],
      propertyTaxes: 125000,
      insurance: 35000,
      maintenanceReserves: 75000
    }
  }

  private async getLeaseDetails(
    input: RealEstateCalculationInput, 
    property: PropertyDetails
  ): Promise<LeaseDetails[]> {
    // TODO: Replace with actual database query
    return [
      {
        leaseId: 'lease_001',
        tenantName: 'Major Corp',
        unitNumber: 'Suite 100',
        leaseStartDate: new Date('2022-01-01'),
        leaseEndDate: new Date('2027-01-01'),
        monthlyRent: 45000,
        securityDeposit: 90000,
        leaseType: 'net',
        escalationClause: true,
        renewalOptions: 2,
        earlyTerminationClause: false,
        creditRating: 'A'
      }
    ]
  }

  private async getMarketComparables(property: PropertyDetails): Promise<MarketComparables> {
    // TODO: Replace with actual market data service
    return {
      comparableProperties: [
        {
          address: '456 Market St',
          saleDate: new Date('2023-06-01'),
          salePrice: 15000000,
          pricePerSqFt: 300,
          capRate: 0.062,
          occupancyRate: 0.95,
          buildingClass: 'A',
          yearBuilt: 2018,
          adjustments: {
            location: 0.05,
            age: -0.02,
            size: 0.03
          }
        }
      ],
      averageCapRate: 0.065,
      averagePricePerSqFt: 295,
      averagePricePerUnit: 150000,
      marketRentGrowth: 0.035,
      vacancyRate: 0.08,
      marketTrends: [
        {
          period: '2023',
          rentGrowth: 0.04,
          occupancyChange: 0.02,
          capRateMovement: -0.005,
          newSupply: 150000,
          absorption: 180000
        }
      ],
      submarketAnalysis: {
        submarketName: 'Downtown',
        averageRent: 26,
        vacancyRate: 0.07,
        rentGrowthRate: 0.04,
        employmentGrowth: 0.025,
        populationGrowth: 0.015,
        transitScore: 85,
        walkabilityScore: 92
      }
    }
  }

  private calculateStabilizedNOI(property: PropertyDetails, leases: LeaseDetails[]): Decimal {
    // Calculate potential gross income
    const potentialGrossIncome = this.decimal(property.marketRent)
      .times(property.totalSquareFootage)
      .times(12)
    
    // Apply vacancy and collection loss
    const vacancyRate = 1 - property.occupancyRate
    const effectiveGrossIncome = potentialGrossIncome.times(1 - vacancyRate)
    
    // Calculate operating expenses (% of EGI)
    const operatingExpenseRatio = 0.30 // 30% of EGI
    const operatingExpenses = effectiveGrossIncome.times(operatingExpenseRatio)
    
    return effectiveGrossIncome.minus(operatingExpenses)
  }

  private applyCapRateAdjustments(baseCapRate: number, property: PropertyDetails): number {
    let adjustedCapRate = baseCapRate
    
    // Adjust for property quality
    if (property.buildingClass === 'A') {
      adjustedCapRate -= 0.005 // Lower cap rate for higher quality
    }
    
    // Adjust for occupancy
    if (property.occupancyRate < 0.90) {
      adjustedCapRate += 0.01 // Higher cap rate for lower occupancy
    }
    
    // Adjust for age
    const currentYear = new Date().getFullYear()
    const age = currentYear - property.yearBuilt
    if (age > 20) {
      adjustedCapRate += 0.005 // Higher cap rate for older properties
    }
    
    return Math.max(0.04, Math.min(0.12, adjustedCapRate)) // Cap between 4% and 12%
  }

  private performCapRateSensitivity(noi: Decimal, capRate: number): SensitivityAnalysis {
    const baseValue = noi.div(capRate)
    
    const capRateImpact: Record<string, number> = {}
    const capRateChanges = [-0.01, -0.005, 0, 0.005, 0.01]
    
    capRateChanges.forEach(change => {
      const newCapRate = capRate + change
      const newValue = noi.div(newCapRate)
      const percentChange = ((this.toNumber(newValue) - this.toNumber(baseValue)) / this.toNumber(baseValue)) * 100
      capRateImpact[`${change > 0 ? '+' : ''}${(change * 100).toFixed(1)}%`] = Math.round(percentChange * 100) / 100
    })
    
    return {
      capRateImpact,
      occupancyImpact: this.calculateOccupancyImpact(noi, capRate),
      rentGrowthImpact: this.calculateRentGrowthImpact(noi, capRate),
      expenseRatioImpact: this.calculateExpenseRatioImpact(noi, capRate)
    }
  }

  private calculateOccupancyImpact(noi: Decimal, capRate: number): Record<string, number> {
    // Simplified occupancy sensitivity
    return {
      '85%': -8.5,
      '90%': -4.2,
      '95%': 0,
      '98%': 3.1
    }
  }

  private calculateRentGrowthImpact(noi: Decimal, capRate: number): Record<string, number> {
    // Simplified rent growth sensitivity
    return {
      '0%': -10.0,
      '2%': -5.0,
      '3%': 0,
      '4%': 5.2,
      '5%': 10.8
    }
  }

  private calculateExpenseRatioImpact(noi: Decimal, capRate: number): Record<string, number> {
    // Simplified expense ratio sensitivity
    return {
      '25%': 6.7,
      '30%': 0,
      '35%': -6.7,
      '40%': -13.3
    }
  }

  private calculateComparableWeight(property: PropertyDetails, comparable: PropertyComparable): number {
    let weight = 1.0
    
    // Adjust for age similarity
    const ageProperty = new Date().getFullYear() - property.yearBuilt
    const ageComparable = new Date().getFullYear() - comparable.yearBuilt
    const ageDiff = Math.abs(ageProperty - ageComparable)
    weight *= Math.max(0.3, 1 - (ageDiff * 0.02))
    
    // Adjust for building class
    if (property.buildingClass === comparable.buildingClass) {
      weight *= 1.2
    }
    
    // Adjust for sale recency
    const monthsOld = this.calculateMonthsSinceSale(comparable.saleDate)
    weight *= Math.max(0.5, 1 - (monthsOld * 0.02))
    
    return Math.max(0.1, Math.min(2.0, weight))
  }

  private calculateMonthsSinceSale(saleDate: Date): number {
    const now = new Date()
    const yearDiff = now.getFullYear() - saleDate.getFullYear()
    const monthDiff = now.getMonth() - saleDate.getMonth()
    return yearDiff * 12 + monthDiff
  }

  private applyComparableAdjustments(comparable: PropertyComparable, property: PropertyDetails): Decimal {
    let adjustedPrice = this.decimal(comparable.pricePerSqFt)
    
    // Apply adjustments from comparable data
    Object.values(comparable.adjustments).forEach(adjustment => {
      adjustedPrice = adjustedPrice.times(1 + adjustment)
    })
    
    return adjustedPrice
  }

  private performSalesComparisonSensitivity(value: Decimal): SensitivityAnalysis {
    // Simplified sensitivity for sales comparison
    return {
      capRateImpact: {},
      occupancyImpact: {},
      rentGrowthImpact: {},
      expenseRatioImpact: {}
    }
  }

  private async estimateLandValue(property: PropertyDetails): Promise<Decimal> {
    // Simplified land value estimation (typically 20-30% of total value)
    const landValuePerSqFt = 50 // $50 per sq ft assumption
    return this.decimal(property.totalSquareFootage).times(landValuePerSqFt).times(0.25)
  }

  private calculateReplacementCost(property: PropertyDetails): Decimal {
    // Simplified replacement cost calculation
    const costPerSqFt = property.propertyType === 'commercial' ? 200 : 150
    return this.decimal(property.totalSquareFootage).times(costPerSqFt)
  }

  private calculateDepreciation(property: PropertyDetails): Decimal {
    const currentYear = new Date().getFullYear()
    const age = currentYear - property.yearBuilt
    const usefulLife = 40 // 40 years for commercial properties
    const depreciationRate = Math.min(age / usefulLife, 0.8) // Max 80% depreciation
    
    const replacementCost = this.calculateReplacementCost(property)
    return replacementCost.times(depreciationRate)
  }

  private performCostApproachSensitivity(
    landValue: Decimal, 
    replacementCost: Decimal, 
    depreciation: Decimal
  ): SensitivityAnalysis {
    // Simplified sensitivity for cost approach
    return {
      capRateImpact: {},
      occupancyImpact: {},
      rentGrowthImpact: {},
      expenseRatioImpact: {}
    }
  }

  private reconcilePropertyValuations(valuations: ValuationResult[]): ValuationResult {
    // Weight the different approaches
    const weights = {
      income_capitalization: 0.6,
      sales_comparison: 0.3,
      cost: 0.1
    }
    
    let weightedValue = new Decimal(0)
    let totalWeight = 0
    
    valuations.forEach(valuation => {
      const weight = weights[valuation.approachUsed as keyof typeof weights] || 0
      weightedValue = weightedValue.plus(valuation.estimatedValue.times(weight))
      totalWeight += weight
    })
    
    const finalValue = totalWeight > 0 ? weightedValue.div(totalWeight) : new Decimal(0)
    
    return {
      approachUsed: 'hybrid_weighted',
      estimatedValue: finalValue,
      confidenceLevel: 0.80,
      keyAssumptions: {
        incomeWeight: weights.income_capitalization,
        salesWeight: weights.sales_comparison,
        costWeight: weights.cost
      },
      sensitivityAnalysis: valuations[0]?.sensitivityAnalysis || {
        capRateImpact: {},
        occupancyImpact: {},
        rentGrowthImpact: {},
        expenseRatioImpact: {}
      } // Use income approach sensitivity
    }
  }

  private async calculatePropertyAdjustments(
    property: PropertyDetails, 
    input: RealEstateCalculationInput
  ): Promise<any> {
    const propertyTaxes = this.decimal(property.propertyTaxes)
    const insurance = this.decimal(property.insurance)
    const maintenance = this.decimal(property.maintenanceReserves)
    const managementFees = this.decimal(property.grossRentalIncome).times(0.05) // 5% management fee
    
    return {
      propertyTaxes,
      insurance,
      maintenance,
      managementFees,
      total: propertyTaxes.plus(insurance).plus(maintenance).plus(managementFees)
    }
  }

  private calculatePropertyLiabilities(property: PropertyDetails, adjustments: any): Decimal {
    // Include ongoing liabilities (annual amounts)
    return adjustments.total
  }

  private async calculateHybridRealEstate(input: RealEstateCalculationInput): Promise<CalculationResult> {
    // For hybrid portfolios, this would combine direct property and REIT calculations
    // Simplified implementation for now
    return await this.calculateDirectProperty(input)
  }

  private async getReitMetrics(input: RealEstateCalculationInput): Promise<ReitMetrics> {
    // TODO: Replace with actual REIT data service
    return {
      ticker: input.reitTicker || 'VNQ',
      reitType: input.reitType || 'equity',
      marketCap: 50000000000,
      sharePrice: 85.50,
      dividendYield: input.dividendYield || 0.035,
      payoutRatio: 0.85,
      fundsFromOperations: input.fundsFromOperations || 2.50,
      adjustedFundsFromOperations: 2.45,
      netAssetValue: 92.00,
      priceToFFO: 34.2,
      priceToBook: 0.93,
      debtToEquity: 0.45,
      occupancyRate: 0.94,
      sameStoreNOIGrowth: 0.025
    }
  }

  private async getReitHoldings(input: RealEstateCalculationInput): Promise<any> {
    // TODO: Replace with actual holdings data
    return {
      shares: input.sharesOutstanding || 1000,
      averageCost: 80.00,
      currentValue: 85.50,
      dividendsReceived: 2.50,
      totalReturn: 0.125
    }
  }

  private calculateReitMarketValue(metrics: ReitMetrics, holdings: any): Decimal {
    return this.decimal(metrics.sharePrice).times(holdings.shares)
  }

  private calculateReitNAVValue(metrics: ReitMetrics, holdings: any): Decimal {
    return this.decimal(metrics.netAssetValue).times(holdings.shares)
  }

  private calculateReitDividendValue(metrics: ReitMetrics, holdings: any): Decimal {
    // DCF approach using dividend yield
    const annualDividends = this.decimal(metrics.sharePrice).times(metrics.dividendYield)
    const discountRate = 0.08 // 8% required return
    const growthRate = 0.02 // 2% dividend growth
    
    // Gordon growth model
    const dividendValue = annualDividends.div(discountRate - growthRate)
    return dividendValue.times(holdings.shares)
  }

  private weightReitValuations(marketValue: Decimal, navValue: Decimal, dividendValue: Decimal): Decimal {
    // Weight different REIT valuation methods
    const marketWeight = 0.50
    const navWeight = 0.30
    const dividendWeight = 0.20
    
    return marketValue.times(marketWeight)
      .plus(navValue.times(navWeight))
      .plus(dividendValue.times(dividendWeight))
  }

  private async calculateReitAdjustments(metrics: ReitMetrics, input: RealEstateCalculationInput): Promise<any> {
    const managementFees = this.decimal(0) // REITs handle their own management
    const otherExpenses = this.decimal(0)
    
    return {
      managementFees,
      otherExpenses
    }
  }

  private buildPropertyPricingSources(
    incomeApproach: ValuationResult,
    salesComparison: ValuationResult,
    costApproach: ValuationResult
  ): Record<string, PriceData> {
    return {
      income_approach: {
        price: this.toNumber(incomeApproach.estimatedValue),
        currency: 'USD',
        asOf: new Date(),
        source: 'cap_rate_analysis'
      },
      sales_comparison: {
        price: this.toNumber(salesComparison.estimatedValue),
        currency: 'USD',
        asOf: new Date(),
        source: 'market_comparables'
      },
      cost_approach: {
        price: this.toNumber(costApproach.estimatedValue),
        currency: 'USD',
        asOf: new Date(),
        source: 'replacement_cost'
      }
    }
  }

  private buildReitPricingSources(metrics: ReitMetrics): Record<string, PriceData> {
    return {
      market_price: {
        price: metrics.sharePrice,
        currency: 'USD',
        asOf: new Date(),
        source: MarketDataProvider.MANUAL_OVERRIDE.toString()
      },
      nav_based: {
        price: metrics.netAssetValue,
        currency: 'USD',
        asOf: new Date(),
        source: 'reit_nav_calculation'
      }
    }
  }

  protected override generateRunId(): string {
    return `re_nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
