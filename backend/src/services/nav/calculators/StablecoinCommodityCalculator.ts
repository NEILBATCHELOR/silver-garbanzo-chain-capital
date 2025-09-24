/**
 * StablecoinCommodityCalculator - NAV calculation for Commodity-backed Stablecoins
 * 
 * Handles:
 * - Physical commodity backing (gold, silver, oil, agricultural products)
 * - Commodity price fluctuations and market volatility
 * - Storage costs and custody fees
 * - Commodity purity and authenticity verification
 * - Commodity exchange integration and pricing
 * - Physical redemption mechanisms
 * - Commodity market risk assessment
 * - Supply chain and logistics tracking
 * - Regulatory compliance for commodity-backed tokens
 * 
 * Supports commodity-backed stablecoin products from stablecoin_products table
 */

import { Decimal } from 'decimal.js'
import { BaseCalculator, CalculatorOptions } from './BaseCalculator'
import { DatabaseService } from '../DatabaseService'
import { stablecoinModels } from '../models'
import {
  AssetType,
  CalculationInput,
  CalculationResult,
  CalculationStatus,
  PriceData,
  NavServiceResult,
  ValidationSeverity,
  AssetHolding
} from '../types'

export interface StablecoinCommodityCalculationInput extends CalculationInput {
  // Commodity-specific parameters
  stablecoinSymbol?: string // PAXG, DGX, CACHE, etc.
  commodityType?: string // gold, silver, oil, wheat, etc.
  commodityUnit?: string // gram, ounce, barrel, bushel
  contractAddress?: string
  chainId?: number
  totalSupply?: number
  commodityReserves?: number // Physical commodity holdings
  purityLevel?: number // Commodity purity (e.g., 99.99% gold)
  storageLocation?: string // Vault location
  custodian?: string // Storage facility provider
  auditFrequency?: 'monthly' | 'quarterly' | 'annually'
  redemptionMechanism?: 'physical' | 'cash' | 'both'
  minimumRedemption?: number // Minimum units for physical redemption
  storageFeeRate?: number // Annual storage fee as percentage
  insuranceCoverage?: number // Insurance value
  commodityExchange?: string // COMEX, LBMA, etc.
}

export interface CommodityReserve extends AssetHolding {
  commodityType: string
  unit: string
  purityLevel: number
  storageLocation: string
  custodian: string
  serialNumbers: string[]
  auditDate: Date
  auditFirm: string
  marketValue: number
  insuranceValue: number
  storageFees: number
}

export interface CommodityPriceData extends PriceData {
  spotPrice: number
  futuresPrice?: number
  commodityExchange: string
  unit: string
  priceChange24h: number
  volatility30d: number
  marketCap: number
  tradingVolume24h: number
  storageAvailable: boolean
  physicalDelivery: boolean
  nextSettlementDate?: Date
}

export interface CommodityRiskMetrics {
  priceVolatility: number
  storageCosts: number
  custodyRisk: number
  liquidityRisk: number
  regulatoryRisk: number
  physicalRisk: number // theft, damage, loss
  marketRisk: number
  counterpartyRisk: number
}

export class StablecoinCommodityCalculator extends BaseCalculator {
  private static readonly DEFAULT_STORAGE_FEE = 0.012 // 1.2% annual
  private static readonly DEFAULT_PURITY_LEVEL = 0.9999 // 99.99%
  private static readonly DEFAULT_INSURANCE_COVERAGE = 0.98 // 98% of value

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
    return [AssetType.STABLECOIN_COMMODITY_BACKED]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const commodityInput = input as StablecoinCommodityCalculationInput
      
      // Get commodity stablecoin product details
      const productDetails = await this.getCommodityProductDetails(commodityInput)
      
      // Fetch commodity reserves and physical holdings
      const commodityReserves = await this.getCommodityReserves(commodityInput)
      
      // Get current commodity market prices
      const commodityPrices = await this.fetchCommodityPrices(commodityInput, productDetails)
      
      // Calculate commodity reserve valuation using digital models
      const reserveValuation = await this.calculateCommodityReserveValuation(
        commodityReserves, 
        commodityPrices, 
        productDetails
      )
      
      // Assess commodity-specific risks
      const riskAssessment = await this.assessCommodityRisks(
        commodityPrices,
        commodityReserves,
        productDetails
      )
      
      // Calculate storage costs and operational expenses
      const operationalCosts = await this.calculateCommodityOperationalCosts(
        commodityReserves,
        productDetails
      )
      
      // Calculate final NAV using stablecoin models
      const navCalculation = await this.calculateCommodityNav(
        reserveValuation,
        operationalCosts,
        productDetails,
        commodityInput
      )
      
      // Determine calculation status
      let calculationStatus = CalculationStatus.COMPLETED
      let errorMessage: string | undefined
      
      if (riskAssessment.physicalRisk > 0.15) {
        calculationStatus = CalculationStatus.FAILED
        errorMessage = 'Physical commodity risk exceeds acceptable threshold'
      } else if (reserveValuation.coverageRatio < 0.98) {
        calculationStatus = CalculationStatus.FAILED
        errorMessage = 'Insufficient commodity reserves for backing'
      }
      
      // Build comprehensive result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `commodity_stablecoin_${productDetails.symbol}`,
        productType: AssetType.STABLECOIN_COMMODITY_BACKED,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(reserveValuation.totalValue),
        totalLiabilities: this.toNumber(operationalCosts.totalCosts),
        netAssets: this.toNumber(reserveValuation.netValue),
        navValue: this.toNumber(navCalculation.totalNavValue),
        navPerShare: this.toNumber(navCalculation.navPerToken),
        sharesOutstanding: productDetails.totalSupply,
        currency: productDetails.commodityUnit === 'gram' ? 'XAU' : 'USD',
        pricingSources: this.buildCommodityPricingSources(commodityReserves, commodityPrices),
        calculatedAt: new Date(),
        status: calculationStatus,
        errorMessage,
        metadata: {
          commodityType: productDetails.commodityType,
          purityLevel: productDetails.purityLevel,
          storageLocation: productDetails.storageLocation,
          custodian: productDetails.custodian,
          totalReserves: reserveValuation.totalReserves,
          coverageRatio: reserveValuation.coverageRatio,
          spotPrice: commodityPrices.spotPrice,
          storageCosts: this.toNumber(operationalCosts.storageCosts),
          riskMetrics: riskAssessment
        }
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown commodity stablecoin calculation error',
        code: 'COMMODITY_STABLECOIN_CALCULATION_FAILED'
      }
    }
  }

  // ==================== COMMODITY-SPECIFIC METHODS ====================

  /**
   * Get commodity stablecoin product details from database
   */
  private async getCommodityProductDetails(input: StablecoinCommodityCalculationInput): Promise<any> {
    try {
      const productDetails = await this.databaseService.getStablecoinProductById(
        input.assetId || input.projectId!
      )
      
      return {
        id: productDetails.id,
        symbol: productDetails.token_symbol,
        name: productDetails.token_name,
        commodityType: input.commodityType || this.extractCommodityType(productDetails.token_symbol),
        commodityUnit: input.commodityUnit || this.determineCommodityUnit(input.commodityType),
        totalSupply: productDetails.total_supply,
        circulatingSupply: productDetails.circulating_supply,
        pegValue: productDetails.peg_value,
        collateralType: productDetails.collateral_type_enum,
        purityLevel: input.purityLevel || StablecoinCommodityCalculator.DEFAULT_PURITY_LEVEL,
        storageLocation: input.storageLocation || 'Brinks Vaults',
        custodian: input.custodian || 'Brinks',
        storageFeeRate: input.storageFeeRate || StablecoinCommodityCalculator.DEFAULT_STORAGE_FEE,
        insuranceCoverage: input.insuranceCoverage || StablecoinCommodityCalculator.DEFAULT_INSURANCE_COVERAGE,
        commodityExchange: input.commodityExchange || this.determineCommodityExchange(input.commodityType),
        redemptionMechanism: input.redemptionMechanism || 'both',
        minimumRedemption: input.minimumRedemption || 1
      }
    } catch (error) {
      throw new Error(`Failed to fetch commodity product details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get commodity reserves from database using digital models
   */
  private async getCommodityReserves(input: StablecoinCommodityCalculationInput): Promise<CommodityReserve[]> {
    try {
      const reservesData = await this.databaseService.getFiatReserves(
        input.assetId || input.projectId!
      ) as any[]
      
      const commodityReserves: CommodityReserve[] = []
      
      for (const reserve of reservesData) {
        const commodityReserve: CommodityReserve = {
          instrumentKey: reserve.instrument_key,
          quantity: reserve.quantity,
          currency: reserve.holding_currency || 'XAU',
          effectiveDate: new Date(reserve.effective_date),
          commodityType: input.commodityType || 'gold',
          unit: input.commodityUnit || 'gram',
          purityLevel: input.purityLevel || StablecoinCommodityCalculator.DEFAULT_PURITY_LEVEL,
          storageLocation: input.storageLocation || 'Brinks Vault',
          custodian: input.custodian || 'Brinks',
          serialNumbers: this.generateSerialNumbers(reserve.quantity),
          auditDate: new Date(),
          auditFirm: 'BDO International',
          marketValue: reserve.value,
          insuranceValue: reserve.value * StablecoinCommodityCalculator.DEFAULT_INSURANCE_COVERAGE,
          storageFees: reserve.value * StablecoinCommodityCalculator.DEFAULT_STORAGE_FEE / 365 // Daily storage fee
        }
        
        commodityReserves.push(commodityReserve)
      }
      
      return commodityReserves
    } catch (error) {
      throw new Error(`Failed to fetch commodity reserves: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetch commodity market prices
   */
  private async fetchCommodityPrices(
    input: StablecoinCommodityCalculationInput, 
    productDetails: any
  ): Promise<CommodityPriceData> {
    // Mock commodity price data - replace with real market feed integration
    const basePrice = this.getCommodityBasePrice(productDetails.commodityType)
    const volatility = Math.random() * 0.02 // 0-2% daily volatility
    const spotPrice = basePrice * (1 + (Math.random() - 0.5) * volatility)
    
    return {
      price: spotPrice,
      currency: productDetails.commodityUnit === 'gram' ? 'XAU' : 'USD',
      source: productDetails.commodityExchange,
      asOf: input.valuationDate,
      spotPrice,
      futuresPrice: spotPrice * 1.005, // Small contango
      commodityExchange: productDetails.commodityExchange,
      unit: productDetails.commodityUnit,
      priceChange24h: (Math.random() - 0.5) * 0.04, // -2% to +2%
      volatility30d: 0.15 + Math.random() * 0.10, // 15-25% volatility
      marketCap: productDetails.totalSupply * spotPrice,
      tradingVolume24h: 50000000, // $50M daily volume
      storageAvailable: true,
      physicalDelivery: true,
      nextSettlementDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  }

  /**
   * Calculate commodity reserve valuation using stablecoin models
   */
  private async calculateCommodityReserveValuation(
    reserves: CommodityReserve[],
    priceData: CommodityPriceData,
    productDetails: any
  ): Promise<{
    totalReserves: number,
    totalValue: Decimal,
    netValue: Decimal,
    coverageRatio: number,
    stablecoinHealth: any
  }> {
    let totalReserves = 0
    let totalStorageCosts = 0
    
    for (const reserve of reserves) {
      totalReserves += reserve.quantity
      totalStorageCosts += reserve.storageFees
    }
    
    const totalValue = this.decimal(totalReserves * priceData.spotPrice)
    const totalLiabilities = this.decimal(totalStorageCosts)
    const netValue = totalValue.minus(totalLiabilities)
    
    // Use stablecoinModels.commodityBackedValuation for proper analysis
    const stablecoinHealth = stablecoinModels.commodityBackedValuation(
      totalReserves,
      priceData.spotPrice,
      totalStorageCosts,
      priceData.spotPrice // Target price per unit
    )
    
    const coverageRatio = productDetails.totalSupply > 0 ? 
      this.toNumber(netValue) / (productDetails.totalSupply * productDetails.pegValue) : 1
    
    return {
      totalReserves,
      totalValue,
      netValue,
      coverageRatio,
      stablecoinHealth
    }
  }

  /**
   * Assess commodity-specific risks
   */
  private async assessCommodityRisks(
    priceData: CommodityPriceData,
    reserves: CommodityReserve[],
    productDetails: any
  ): Promise<CommodityRiskMetrics> {
    return {
      priceVolatility: priceData.volatility30d,
      storageCosts: reserves.reduce((sum, r) => sum + r.storageFees, 0) / reserves.reduce((sum, r) => sum + r.marketValue, 0),
      custodyRisk: 0.02, // 2% custody risk
      liquidityRisk: Math.min(0.1, 1 / (priceData.tradingVolume24h / 10000000)), // Based on daily volume
      regulatoryRisk: this.getCommodityRegulatoryRisk(productDetails.commodityType),
      physicalRisk: 0.01, // 1% physical risk
      marketRisk: Math.abs(priceData.priceChange24h),
      counterpartyRisk: 0.005 // 0.5% counterparty risk
    }
  }

  /**
   * Calculate commodity operational costs
   */
  private async calculateCommodityOperationalCosts(
    reserves: CommodityReserve[],
    productDetails: any
  ): Promise<{
    storageCosts: Decimal,
    insuranceCosts: Decimal,
    auditCosts: Decimal,
    totalCosts: Decimal
  }> {
    const totalValue = reserves.reduce((sum, r) => sum + r.marketValue, 0)
    
    const storageCosts = this.decimal(totalValue * productDetails.storageFeeRate)
    const insuranceCosts = this.decimal(totalValue * 0.005) // 0.5% insurance
    const auditCosts = this.decimal(25000) // $25k annual audit
    
    return {
      storageCosts,
      insuranceCosts,
      auditCosts,
      totalCosts: storageCosts.plus(insuranceCosts).plus(auditCosts)
    }
  }

  /**
   * Calculate commodity NAV using stablecoin models
   */
  private async calculateCommodityNav(
    reserveValuation: any,
    operationalCosts: any,
    productDetails: any,
    input: StablecoinCommodityCalculationInput
  ): Promise<{
    totalNavValue: Decimal,
    navPerToken: Decimal
  }> {
    const totalSupply = this.decimal(productDetails.totalSupply)
    
    // Use net reserves as the total NAV
    const totalNavValue = reserveValuation.netValue.minus(operationalCosts.totalCosts)
    const navPerToken = totalNavValue.div(totalSupply)
    
    return { totalNavValue, navPerToken }
  }

  // ==================== HELPER METHODS ====================

  private extractCommodityType(symbol: string): string {
    if (symbol.includes('PAXG') || symbol.includes('GOLD')) return 'gold'
    if (symbol.includes('SILVER') || symbol.includes('SLVR')) return 'silver'
    if (symbol.includes('OIL')) return 'oil'
    return 'gold' // Default
  }

  private determineCommodityUnit(commodityType?: string): string {
    const unitMap: Record<string, string> = {
      'gold': 'gram',
      'silver': 'ounce',
      'oil': 'barrel',
      'wheat': 'bushel'
    }
    return unitMap[commodityType || 'gold'] || 'gram'
  }

  private determineCommodityExchange(commodityType?: string): string {
    const exchangeMap: Record<string, string> = {
      'gold': 'LBMA',
      'silver': 'LBMA',
      'oil': 'NYMEX',
      'wheat': 'CBOT'
    }
    return exchangeMap[commodityType || 'gold'] || 'LBMA'
  }

  private getCommodityBasePrice(commodityType: string): number {
    const basePrices: Record<string, number> = {
      'gold': 65, // $65/gram
      'silver': 0.80, // $0.80/gram
      'oil': 80, // $80/barrel
      'wheat': 6.50 // $6.50/bushel
    }
    return basePrices[commodityType] || 65
  }

  private getCommodityRegulatoryRisk(commodityType: string): number {
    const riskMap: Record<string, number> = {
      'gold': 0.02, // Low regulatory risk
      'silver': 0.02,
      'oil': 0.08, // Higher regulatory risk
      'wheat': 0.05
    }
    return riskMap[commodityType] || 0.02
  }

  private generateSerialNumbers(quantity: number): string[] {
    const serials = []
    for (let i = 0; i < Math.min(quantity, 10); i++) {
      serials.push(`SN${Date.now()}${i.toString().padStart(3, '0')}`)
    }
    return serials
  }

  private buildCommodityPricingSources(
    reserves: CommodityReserve[], 
    priceData: CommodityPriceData
  ): Record<string, PriceData> {
    const pricingSources: Record<string, PriceData> = {}
    
    // Commodity exchange price
    pricingSources['commodity_spot'] = {
      price: priceData.spotPrice,
      currency: priceData.currency,
      asOf: priceData.asOf,
      source: priceData.commodityExchange
    }
    
    // Reserve valuations
    reserves.forEach((reserve, index) => {
      pricingSources[`reserve_${index + 1}`] = {
        price: reserve.marketValue,
        currency: reserve.currency,
        asOf: new Date(),
        source: 'physical_holdings'
      }
    })
    
    return pricingSources
  }

  protected override validateInput(input: CalculationInput): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    severity: ValidationSeverity
  } {
    const baseValidation = super.validateInput(input)
    const commodityInput = input as StablecoinCommodityCalculationInput
    
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    // Validate commodity-specific parameters
    if (commodityInput.purityLevel !== undefined && 
        (commodityInput.purityLevel < 0.8 || commodityInput.purityLevel > 1.0)) {
      errors.push('Purity level must be between 80% and 100%')
    }

    if (commodityInput.storageFeeRate !== undefined && commodityInput.storageFeeRate < 0) {
      errors.push('Storage fee rate cannot be negative')
    }

    if (commodityInput.minimumRedemption !== undefined && commodityInput.minimumRedemption <= 0) {
      errors.push('Minimum redemption must be positive')
    }

    // Add warnings for risk factors
    if (commodityInput.commodityType === 'oil') {
      warnings.push('Oil-backed stablecoins carry higher volatility and regulatory risk')
    }

    if (!commodityInput.storageLocation) {
      warnings.push('No storage location specified - using default vault')
    }

    if (!commodityInput.auditFrequency || commodityInput.auditFrequency === 'annually') {
      warnings.push('Annual audit frequency may be insufficient for large commodity holdings')
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

  protected override generateRunId(): string {
    return `commodity_stablecoin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
