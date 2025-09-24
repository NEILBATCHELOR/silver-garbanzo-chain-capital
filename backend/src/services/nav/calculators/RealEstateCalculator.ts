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
import { DatabaseService } from '../DatabaseService'
import { realEstateModels } from '../models'
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
  // Leverage fields
  leverage?: number
  debtCost?: number
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
  // Additional properties to fix compilation errors
  rentGrowthRate?: number
  vacancyRate?: number
  discountRate?: number
  marketRentGrowth?: number
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
    
    // Calculate property value using real estate models
    const incomeApproach = realEstateModels.incomeApproach({
      netOperatingIncome: propertyDetails.netOperatingIncome,
      capRate: propertyDetails.capRate,
      growthRate: propertyDetails.rentGrowthRate || 0.03,
      holdingPeriod: 10 // Default 10-year holding period
    })
    
    const salesComparisonApproach = realEstateModels.comparableSalesApproach({
      comparables: marketComparables.comparableProperties.map(comp => ({
        address: comp.address,
        type: propertyDetails.propertyType as any, // Cast to the expected type
        squareFeet: propertyDetails.totalSquareFootage,
        yearBuilt: comp.yearBuilt,
        condition: 'good' as any, // Default condition
        location: 'secondary' as any // Default location
      })),
      subjectProperty: {
        address: propertyDetails.propertyAddress,
        type: propertyDetails.propertyType as any,
        squareFeet: propertyDetails.totalSquareFootage,
        yearBuilt: propertyDetails.yearBuilt,
        condition: 'good' as any,
        location: 'secondary' as any
      },
      adjustments: [
        { factor: 'location', adjustment: 0.05, isPercentage: true },
        { factor: 'age', adjustment: -0.02, isPercentage: true },
        { factor: 'condition', adjustment: 0, isPercentage: true }
      ],
      pricesPerSqFt: marketComparables.comparableProperties.map(comp => comp.pricePerSqFt)
    })
    
    const costApproach = realEstateModels.costApproach({
      landValue: await this.estimateLandValue(propertyDetails),
      improvementCost: this.calculateReplacementCost(propertyDetails),
      depreciation: this.calculateDepreciation(propertyDetails),
      functionalObsolescence: this.calculateObsolescence(propertyDetails) * 0.5, // Split obsolescence
      economicObsolescence: this.calculateObsolescence(propertyDetails) * 0.5
    })
    
    // Reconcile valuations to final estimate
    const reconciledValue = this.reconcilePropertyValuations(
      incomeApproach,
      salesComparisonApproach,
      costApproach
    )
    
    // Apply property-specific adjustments
    const adjustments = await this.calculatePropertyAdjustments(propertyDetails, input)
    
    // Calculate leveraged metrics if debt exists
    const leverageMetrics = realEstateModels.leveragedYield({
      unleveragedReturn: propertyDetails.capRate, // Use the property's cap rate as unleveraged return
      leverageRatio: input.leverage || 0,
      debtCost: input.debtCost || 0.045
    })
    
    // Calculate comprehensive metrics
    const metrics = realEstateModels.calculateMetrics(
      reconciledValue.toNumber(), // purchasePrice
      propertyDetails.grossRentalIncome, // annualRentalIncome
      propertyDetails.grossRentalIncome * 0.3, // annualOperatingExpenses (30% of gross)
      reconciledValue.times(1 - (input.leverage || 0)).toNumber(), // downPayment
      reconciledValue.times(input.leverage || 0).toNumber(), // loanAmount
      input.debtCost || 0.045, // interestRate
      30, // amortizationYears
      [propertyDetails.netOperatingIncome], // projectedCashFlows (simplified)
      reconciledValue.times(1.2).toNumber() // exitPrice (20% appreciation assumption)
    )
    
    // Calculate final NAV
    const grossAssetValue = reconciledValue
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
        valuationMethod: 'hybrid_weighted',
        capRate: propertyDetails.capRate,
        occupancyRate: propertyDetails.occupancyRate,
        netOperatingIncome: propertyDetails.netOperatingIncome,
        pricePerSqFt: this.toNumber(grossAssetValue.div(propertyDetails.totalSquareFootage)),
        marketMetrics: {
          averageCapRate: marketComparables.averageCapRate,
          marketRentGrowth: marketComparables.marketRentGrowth,
          vacancyRate: marketComparables.vacancyRate
        },
        financialMetrics: {
          grossRentMultiplier: metrics.grossRentMultiplier,
          debtServiceCoverageRatio: metrics.debtServiceCoverageRatio,
          cashOnCashReturn: metrics.cashOnCashReturn,
          internalRateOfReturn: metrics.internalRateOfReturn
        },
        leverageMetrics: input.leverage && input.leverage > 0 ? {
          leveragedReturn: leverageMetrics, // This is already a number
          returnOnEquity: leverageMetrics, // Simplified - using same value
          cashFlowAfterDebt: this.toNumber(netAssetValue.times(0.8)) // Estimated cash flow after debt
        } : undefined
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

  // ==================== HELPER METHODS ====================

  private determineInvestmentType(input: RealEstateCalculationInput): string {
    if (input.reitTicker) return 'reit'
    if (input.propertyId) return 'direct_property'
    return 'hybrid'
  }

  private async getPropertyDetails(input: RealEstateCalculationInput): Promise<PropertyDetails> {
    if (!input.assetId) {
      throw new Error('Asset ID is required for real estate property lookup')
    }

    try {
      const productDetails = await this.databaseService.getRealEstateProductById(input.assetId)
      
      // Calculate derived values from database fields
      const grossRentalIncome = (productDetails.gross_amount || 0) * 12 // Convert monthly to annual
      const netOperatingIncome = grossRentalIncome * 0.7 // Assume 70% NOI margin
      const capRate = netOperatingIncome > 0 && productDetails.property_value ?
        netOperatingIncome / productDetails.property_value : 
        (input.capRate || 0.065)
      
      return {
        propertyId: productDetails.property_id || input.propertyId || productDetails.id,
        propertyName: productDetails.property_name,
        propertyType: productDetails.property_type || input.propertyType || 'commercial',
        propertyAddress: productDetails.property_address,
        geographicLocation: productDetails.geographic_location,
        acquisitionDate: new Date(productDetails.acquisition_date) || input.acquisitionDate || new Date(),
        developmentStage: productDetails.development_stage || input.developmentStage || 'stabilized',
        totalUnits: productDetails.units || input.totalUnits || 1,
        totalSquareFootage: input.totalSquareFootage || 50000,
        buildingClass: 'A',
        yearBuilt: new Date().getFullYear() - 10,
        occupancyRate: input.occupancyRate || 0.92,
        averageRent: (productDetails.gross_amount || 25) / (productDetails.units || 1),
        marketRent: ((productDetails.gross_amount || 25) * 1.08) / (productDetails.units || 1),
        grossRentalIncome,
        netOperatingIncome,
        capRate,
        environmentalCertifications: productDetails.environmental_certifications || input.environmentalCertifications || [],
        propertyTaxes: productDetails.taxable_amount || 125000,
        insurance: 35000,
        maintenanceReserves: grossRentalIncome * 0.05,
        // Additional properties to fix compilation errors
        rentGrowthRate: input.marketRentGrowth || 0.03,
        vacancyRate: 1 - (input.occupancyRate || 0.92),
        discountRate: input.discountRate || 0.08,
        marketRentGrowth: input.marketRentGrowth || 0.03
      }
    } catch (error) {
      throw new Error(`Failed to get real estate property details: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        monthlyRent: property.averageRent * property.totalUnits / 12,
        securityDeposit: property.averageRent * 2,
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
            size: 0.03,
            condition: 0
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

  private async estimateLandValue(property: PropertyDetails): Promise<number> {
    // Use market comparables for land value
    const landValuePerSqFt = 50 // $50 per sq ft assumption
    return property.totalSquareFootage * landValuePerSqFt * 0.25
  }

  private calculateReplacementCost(property: PropertyDetails): number {
    const costPerSqFt = property.propertyType === 'commercial' ? 200 : 150
    return property.totalSquareFootage * costPerSqFt
  }

  private calculateDepreciation(property: PropertyDetails): number {
    const currentYear = new Date().getFullYear()
    const age = currentYear - property.yearBuilt
    const usefulLife = 40 // 40 years for commercial properties
    const depreciationRate = Math.min(age / usefulLife, 0.8) // Max 80% depreciation
    
    const replacementCost = this.calculateReplacementCost(property)
    return replacementCost * depreciationRate
  }

  private calculateObsolescence(property: PropertyDetails): number {
    // Functional and economic obsolescence
    let obsolescence = 0
    
    // Functional obsolescence based on building class
    if (property.buildingClass === 'B') obsolescence += 0.05
    if (property.buildingClass === 'C') obsolescence += 0.10
    
    // Economic obsolescence based on vacancy
    if (property.occupancyRate < 0.85) obsolescence += 0.05
    if (property.occupancyRate < 0.75) obsolescence += 0.10
    
    return obsolescence
  }

  private reconcilePropertyValuations(
    incomeValue: Decimal,
    salesValue: Decimal,
    costValue: Decimal
  ): Decimal {
    // Weight the different approaches
    const weights = {
      income: 0.6,
      sales: 0.3,
      cost: 0.1
    }
    
    return incomeValue.times(weights.income)
      .plus(salesValue.times(weights.sales))
      .plus(costValue.times(weights.cost))
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
    incomeApproach: Decimal,
    salesComparison: Decimal,
    costApproach: Decimal
  ): Record<string, PriceData> {
    return {
      income_approach: {
        price: this.toNumber(incomeApproach),
        currency: 'USD',
        asOf: new Date(),
        source: 'cap_rate_analysis'
      },
      sales_comparison: {
        price: this.toNumber(salesComparison),
        currency: 'USD',
        asOf: new Date(),
        source: 'market_comparables'
      },
      cost_approach: {
        price: this.toNumber(costApproach),
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
