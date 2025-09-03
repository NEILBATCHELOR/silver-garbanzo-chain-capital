/**
 * CommoditiesCalculator - NAV calculation for physical commodities
 * 
 * Handles:
 * - Spot price integration with multiple exchanges
 * - Storage and carrying costs calculations
 * - Quality adjustments and grade premiums/discounts
 * - Contango/backwardation curve adjustments
 * - Physical delivery and settlement costs
 * - Futures contract roll calculations
 * - Inventory levels and production data integration
 * 
 * Supports commodity products from commodities_products table
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

export interface CommodityCalculationInput extends CalculationInput {
  // Commodity-specific parameters
  commodityId?: string
  commodityType?: string
  unitOfMeasure?: string
  contractSize?: number
  gradeQuality?: string
  exchange?: string
  deliveryMonths?: string[]
  storageLocation?: string
  quantity?: number
  contractExpirationDate?: Date
  rollDate?: Date
  storageCosts?: number
  deliveryCosts?: number
  qualityAdjustment?: number
}

export interface CommodityPriceData extends PriceData {
  spotPrice: number
  futuresPrice: number
  contangoBackwardation: number
  volatility: number
  exchange: string
  deliveryMonth: string
  openInterest: number
  volume: number
  storageRate: number
  carryingCosts: number
  convenienceYield: number
  qualityPremiumDiscount: number
}

export interface CommodityRollData {
  currentContract: string
  nextContract: string
  rollDate: Date
  rollCost: number
  rollYield: number
}

export interface StorageCostData {
  dailyStorageCost: number
  insuranceCost: number
  handlingCost: number
  location: string
  capacity: number
  utilizationRate: number
}

export class CommoditiesCalculator extends BaseCalculator {
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
    return [AssetType.COMMODITIES]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const commodityInput = input as CommodityCalculationInput
      
      // Get commodity product details from database
      const productDetails = await this.getCommodityProductDetails(commodityInput)
      
      // Fetch current market data (spot and futures)
      const priceData = await this.fetchCommodityPriceData(commodityInput, productDetails)
      
      // Calculate storage and carrying costs
      const carryingCosts = await this.calculateCarryingCosts(commodityInput, productDetails)
      
      // Apply quality adjustments and grade premiums
      const qualityAdjustedPrice = await this.applyQualityAdjustments(priceData, productDetails)
      
      // Calculate physical commodity value
      const commodityValue = await this.calculateCommodityValue(
        commodityInput, 
        qualityAdjustedPrice, 
        carryingCosts
      )
      
      // Handle futures contract roll if applicable
      const rollAdjustment = await this.calculateRollAdjustment(commodityInput, productDetails)
      
      // Calculate final NAV including all adjustments
      const finalValue = commodityValue.minus(carryingCosts.totalCosts).plus(rollAdjustment)
      
      // Build calculation result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `commodity_${productDetails.commodityId}`,
        productType: AssetType.COMMODITIES,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(finalValue),
        totalLiabilities: this.toNumber(carryingCosts.totalCosts),
        netAssets: this.toNumber(finalValue.minus(carryingCosts.totalCosts)),
        navValue: this.toNumber(finalValue.minus(carryingCosts.totalCosts)),
        navPerShare: input.sharesOutstanding ? 
          this.toNumber(finalValue.minus(carryingCosts.totalCosts).div(this.decimal(input.sharesOutstanding))) : 
          undefined,
        currency: input.targetCurrency || priceData.currency || 'USD',
        pricingSources: {
          spotPrice: {
            price: priceData.spotPrice,
            currency: priceData.currency,
            asOf: priceData.asOf,
            source: priceData.source
          },
          futuresPrice: {
            price: priceData.futuresPrice,
            currency: priceData.currency,
            asOf: priceData.asOf,
            source: priceData.source
          },
          storageCosts: {
            price: this.toNumber(carryingCosts.totalCosts),
            currency: priceData.currency,
            asOf: priceData.asOf,
            source: 'internal_calculation'
          }
        },
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown commodity calculation error',
        code: 'COMMODITY_CALCULATION_FAILED'
      }
    }
  }

  // ==================== COMMODITY-SPECIFIC METHODS ====================

  /**
   * Fetches commodity product details from the database
   */
  private async getCommodityProductDetails(input: CommodityCalculationInput): Promise<any> {
    // Mock implementation - replace with actual database query
    return {
      id: input.assetId,
      commodityId: input.commodityId || 'CRUDE_OIL',
      commodityName: 'Crude Oil',
      commodityType: input.commodityType || 'energy',
      unitOfMeasure: input.unitOfMeasure || 'barrel',
      contractSize: input.contractSize || 1000,
      gradeQuality: input.gradeQuality || 'WTI',
      exchange: input.exchange || 'NYMEX',
      deliveryMonths: input.deliveryMonths || ['2024-03', '2024-06', '2024-09', '2024-12'],
      liquidityMetric: 0.85,
      currency: 'USD',
      contractIssueDate: new Date('2024-01-01'),
      expirationDate: input.contractExpirationDate || new Date('2024-12-31'),
      status: 'active',
      rollHistory: [],
      storageDeliveryCosts: input.storageCosts || 2.50,
      productionInventoryLevels: {
        currentStock: 1000000,
        weeklyProduction: 50000,
        demandForecast: 45000
      }
    }
  }

  /**
   * Fetches current market price data for the commodity
   */
  private async fetchCommodityPriceData(
    input: CommodityCalculationInput, 
    productDetails: any
  ): Promise<CommodityPriceData> {
    // Mock implementation - replace with actual market data service
    const basePrice = 75.00 // Example crude oil price
    
    return {
      price: basePrice,
      spotPrice: basePrice,
      futuresPrice: basePrice * 1.02, // Slight contango
      currency: productDetails.currency,
      source: 'bloomberg_commodities',
      asOf: input.valuationDate,
      contangoBackwardation: 0.02, // 2% contango
      volatility: 0.25, // 25% annualized volatility
      exchange: productDetails.exchange,
      deliveryMonth: productDetails.deliveryMonths[0],
      openInterest: 500000,
      volume: 100000,
      storageRate: 0.05, // 5% per annum
      carryingCosts: productDetails.storageDeliveryCosts,
      convenienceYield: 0.03, // 3% convenience yield
      qualityPremiumDiscount: input.qualityAdjustment || 0
    }
  }

  /**
   * Calculates storage and carrying costs for physical commodities
   */
  private async calculateCarryingCosts(
    input: CommodityCalculationInput, 
    productDetails: any
  ): Promise<{
    storageCosts: Decimal
    insuranceCosts: Decimal
    handlingCosts: Decimal
    totalCosts: Decimal
  }> {
    const quantity = this.decimal(input.quantity || productDetails.contractSize || 1000)
    const daysToExpiration = productDetails.expirationDate 
      ? Math.max(0, Math.floor((productDetails.expirationDate.getTime() - input.valuationDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 365

    // Storage costs per unit per day
    const dailyStorageRate = this.decimal(productDetails.storageDeliveryCosts || 0.01)
    const storageCosts = quantity.mul(dailyStorageRate).mul(this.decimal(daysToExpiration))

    // Insurance costs (typically 0.1% of value per year)
    const insuranceRate = this.decimal(0.001)
    const annualizedInsurance = quantity.mul(insuranceRate).mul(this.decimal(75)) // Assuming $75/unit value
    const insuranceCosts = annualizedInsurance.mul(this.decimal(daysToExpiration)).div(this.decimal(365))

    // Handling and transportation costs
    const handlingCosts = quantity.mul(this.decimal(0.50)) // $0.50 per unit handling

    const totalCosts = storageCosts.plus(insuranceCosts).plus(handlingCosts)

    return {
      storageCosts,
      insuranceCosts,
      handlingCosts,
      totalCosts
    }
  }

  /**
   * Applies quality adjustments and grade premiums/discounts
   */
  private async applyQualityAdjustments(
    priceData: CommodityPriceData, 
    productDetails: any
  ): Promise<CommodityPriceData> {
    const adjustedPriceData = { ...priceData }

    // Apply quality premium/discount based on grade
    const qualityMultiplier = this.getQualityMultiplier(productDetails.gradeQuality, productDetails.commodityType)
    
    adjustedPriceData.price *= qualityMultiplier
    adjustedPriceData.spotPrice *= qualityMultiplier
    adjustedPriceData.futuresPrice *= qualityMultiplier
    adjustedPriceData.qualityPremiumDiscount = qualityMultiplier - 1

    return adjustedPriceData
  }

  /**
   * Gets quality multiplier based on commodity grade
   */
  private getQualityMultiplier(grade: string, commodityType: string): number {
    // Mock implementation - in reality this would be a comprehensive mapping
    const qualityMultipliers: Record<string, Record<string, number>> = {
      energy: {
        'WTI': 1.02,        // Premium crude
        'Brent': 1.01,      // Slight premium
        'Dubai': 0.98,      // Slight discount
        'Heavy': 0.95       // Heavy crude discount
      },
      metals: {
        '99.99%': 1.05,     // High purity premium
        '99.5%': 1.00,      // Standard grade
        '99.0%': 0.97       // Lower grade discount
      },
      agricultural: {
        'Grade A': 1.03,
        'Grade B': 1.00,
        'Grade C': 0.95
      }
    }

    return qualityMultipliers[commodityType]?.[grade] || 1.00
  }

  /**
   * Calculates the market value of commodity holdings
   */
  private async calculateCommodityValue(
    input: CommodityCalculationInput,
    priceData: CommodityPriceData,
    carryingCosts: any
  ): Promise<Decimal> {
    const quantity = this.decimal(input.quantity || 1000)
    const pricePerUnit = this.decimal(priceData.price)
    
    // Base market value
    const baseValue = quantity.mul(pricePerUnit)
    
    // Apply convenience yield if holding physical commodity
    const convenienceYield = this.decimal(priceData.convenienceYield || 0)
    const convenienceValue = baseValue.mul(convenienceYield)
    
    return baseValue.plus(convenienceValue)
  }

  /**
   * Calculates futures contract roll adjustments
   */
  private async calculateRollAdjustment(
    input: CommodityCalculationInput, 
    productDetails: any
  ): Promise<Decimal> {
    // If no roll date or roll date hasn't arrived, no adjustment
    if (!input.rollDate || input.rollDate > input.valuationDate) {
      return this.decimal(0)
    }

    // Mock roll cost calculation
    const quantity = this.decimal(input.quantity || productDetails.contractSize || 1000)
    const rollCostPerUnit = this.decimal(0.25) // $0.25 per unit roll cost
    
    return quantity.mul(rollCostPerUnit).neg() // Roll costs reduce value
  }

  /**
   * Validates commodity-specific input parameters
   */
  protected override validateInput(input: CalculationInput): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    severity: ValidationSeverity
  } {
    const baseValidation = super.validateInput(input)
    const commodityInput = input as CommodityCalculationInput
    
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    // Validate commodity-specific parameters
    if (commodityInput.quantity !== undefined && commodityInput.quantity < 0) {
      errors.push('Commodity quantity cannot be negative')
    }

    if (commodityInput.contractSize !== undefined && commodityInput.contractSize <= 0) {
      errors.push('Contract size must be positive')
    }

    if (commodityInput.storageCosts !== undefined && commodityInput.storageCosts < 0) {
      errors.push('Storage costs cannot be negative')
    }

    // Validate dates
    if (commodityInput.contractExpirationDate && commodityInput.contractExpirationDate <= input.valuationDate) {
      warnings.push('Contract has expired - using expired contract pricing')
    }

    if (commodityInput.rollDate && commodityInput.rollDate <= input.valuationDate) {
      warnings.push('Roll date has passed - position may need to be rolled')
    }

    // Add warnings for missing optional data
    if (!commodityInput.commodityId) {
      warnings.push('No commodity ID provided - using default commodity')
    }

    if (!commodityInput.exchange) {
      warnings.push('No exchange specified - using default exchange pricing')
    }

    if (!commodityInput.gradeQuality) {
      warnings.push('No grade quality specified - no quality adjustments applied')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity: errors.length > 0 ? ValidationSeverity.ERROR : 
               warnings.length > 0 ? ValidationSeverity.WARN : 
               ValidationSeverity.INFO
    }
  }

  /**
   * Generates a unique run ID for the calculation
   */
  protected override generateRunId(): string {
    return `commodity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
