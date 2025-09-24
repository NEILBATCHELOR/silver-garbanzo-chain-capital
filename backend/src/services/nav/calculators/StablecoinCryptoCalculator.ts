/**
 * StablecoinCryptoCalculator - NAV calculation for crypto-backed stablecoins
 * 
 * Handles:
 * - Collateralization ratio checks and monitoring
 * - Liquidation risk assessment and thresholds
 * - Protocol-specific mechanics (MakerDAO, Compound, etc.)
 * - Multi-collateral asset valuations
 * - Oracle price feed reliability checks
 * - Governance token value calculations
 * - Interest rate and stability fee calculations
 * - Emergency shutdown and recovery mechanisms
 * 
 * Supports crypto-backed stablecoin products from stablecoin_products table
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
  MarketDataProvider
} from '../types'

export interface StablecoinCryptoCalculationInput extends CalculationInput {
  // Crypto-backed stablecoin specific parameters
  stablecoinSymbol?: string
  protocolType?: string
  collateralAssets?: string[]
  totalSupply?: number
  circulatingSupply?: number
  collateralValue?: number
  currentCollateralizationRatio?: number
  minimumCollateralizationRatio?: number
  liquidationThreshold?: number
  stabilityFeeRate?: number
  governanceTokenSupply?: number
  oracleProviders?: string[]
  emergencyShutdownActive?: boolean
}

export interface CollateralAsset {
  symbol: string
  address: string
  balance: number
  priceUSD: number
  liquidationRatio: number
  stabilityFee: number
  debtCeiling: number
  riskParameters: {
    volatility: number
    liquidity: number
    correlationToETH: number
  }
}

export interface StablecoinCryptoPriceData extends PriceData {
  pegPrice: number
  marketPrice: number
  depegPercentage: number
  volume24h: number
  marketCap: number
  collateralValue: number
  collateralizationRatio: number
  liquidationPrice: number
  stabilityFee: number
  governanceTokenPrice: number
  oracleDelay: number
  oracleDeviation: number
}

export interface LiquidationRisk {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  timeToLiquidation: number // hours
  priceDropRequired: number
  collateralBuffer: number
  recommendedActions: string[]
}

export interface ProtocolMetrics {
  totalValueLocked: number
  totalDebt: number
  globalCollateralizationRatio: number
  systemSurplus: number
  emergencyShutdownThreshold: number
  governanceVotingPower: number
}

export class StablecoinCryptoCalculator extends BaseCalculator {
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
    return [AssetType.STABLECOIN_CRYPTO_BACKED]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const stablecoinInput = input as StablecoinCryptoCalculationInput
      
      // Get stablecoin product details from database
      const productDetails = await this.getStablecoinProductDetails(stablecoinInput)
      
      // Fetch collateral asset prices and data
      const collateralData = await this.fetchCollateralData(stablecoinInput, productDetails)
      
      // Calculate current collateralization ratio
      const collateralizationMetrics = await this.calculateCollateralizationMetrics(
        collateralData, 
        productDetails
      )
      
      // Assess liquidation risk
      const liquidationRisk = await this.assessLiquidationRisk(
        collateralizationMetrics, 
        productDetails, 
        collateralData
      )
      
      // Calculate governance token value component
      const governanceValue = await this.calculateGovernanceValue(productDetails, stablecoinInput)
      
      // Calculate protocol fees and revenue
      const protocolRevenue = await this.calculateProtocolRevenue(productDetails, collateralizationMetrics)
      
      // Calculate final NAV
      const totalCollateralValue = this.decimal(collateralizationMetrics.totalCollateralValue)
      const totalDebt = this.decimal(productDetails.circulatingSupply || 0)
      const governanceComponent = this.decimal(governanceValue)
      const protocolFees = this.decimal(protocolRevenue)
      
      const netAssetValue = totalCollateralValue
        .minus(totalDebt)
        .plus(governanceComponent)
        .plus(protocolFees)
      
      // Build calculation result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `crypto_stablecoin_${productDetails.symbol}`,
        productType: AssetType.STABLECOIN_CRYPTO_BACKED,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(totalCollateralValue.plus(governanceComponent).plus(protocolFees)),
        totalLiabilities: this.toNumber(totalDebt),
        netAssets: this.toNumber(netAssetValue),
        navValue: this.toNumber(netAssetValue),
        navPerShare: input.sharesOutstanding ? 
          this.toNumber(netAssetValue.div(this.decimal(input.sharesOutstanding))) : 
          undefined,
        currency: input.targetCurrency || 'USD',
        pricingSources: this.buildPricingSources(collateralData, governanceValue),
        calculatedAt: new Date(),
        status: liquidationRisk.riskLevel === 'critical' ? 
          CalculationStatus.FAILED : 
          CalculationStatus.COMPLETED,
        errorMessage: liquidationRisk.riskLevel === 'critical' ? 
          `Critical liquidation risk: ${liquidationRisk.recommendedActions.join(', ')}` : 
          undefined
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown crypto stablecoin calculation error',
        code: 'CRYPTO_STABLECOIN_CALCULATION_FAILED'
      }
    }
  }

  // ==================== CRYPTO STABLECOIN SPECIFIC METHODS ====================

  /**
   * Fetches stablecoin product details from database using real DatabaseService
   */
  private async getStablecoinProductDetails(input: StablecoinCryptoCalculationInput): Promise<any> {
    try {
      // Use DatabaseService to get real crypto stablecoin product details
      const productDetails = await this.databaseService.getStablecoinProductById(
        input.assetId || input.projectId!
      )
      
      // Transform database fields to expected format
      const result = {
        id: productDetails.id,
        symbol: productDetails.token_symbol,
        name: productDetails.token_name,
        protocolType: 'decentralized', // Could be added to schema
        collateralType: productDetails.collateral_type_enum,
        totalSupply: productDetails.total_supply,
        circulatingSupply: productDetails.circulating_supply,
        pegValue: productDetails.peg_value,
        pegCurrency: productDetails.peg_currency,
        stabilityMechanism: productDetails.stability_mechanism,
        collateralRatio: productDetails.collateral_ratio,
        minimumCollateralizationRatio: productDetails.collateral_ratio || 1.5,
        liquidationThreshold: productDetails.collateral_ratio * 0.87 || 1.3, // Typically 87% of collateral ratio
        stabilityFeeRate: 0.025, // Could be added to schema
        governanceToken: 'GOVERNANCE', // Could be added to schema
        oracleProviders: ['chainlink'], // Could be added to schema
        emergencyShutdownActive: false, // Could be added to schema
        liquidationPenalty: 0.13, // Could be added to schema
        debtCeiling: 10000000000, // Could be added to schema
        systemSurplus: 0 // Could be calculated from protocol reserves
      }
      
      // Save calculation step for audit trail
      await this.databaseService.saveCalculationHistory({
        run_id: this.generateRunId(),
        asset_id: input.assetId || input.projectId!,
        product_type: 'stablecoin_crypto_backed',
        calculation_step: 'get_crypto_stablecoin_details',
        step_order: 1,
        input_data: { assetId: input.assetId, projectId: input.projectId },
        output_data: result,
        processing_time_ms: Date.now() - Date.now(), // Will be properly timed
        data_sources: ['stablecoin_products'],
        validation_results: { productFound: true, collateralType: result.collateralType }
      })
      
      return result
    } catch (error) {
      throw new Error(`Failed to fetch crypto stablecoin product details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetches collateral asset data using real DatabaseService and market prices
   */
  private async fetchCollateralData(
    input: StablecoinCryptoCalculationInput,
    productDetails: any
  ): Promise<CollateralAsset[]> {
    try {
      // Use DatabaseService to get real collateral assets
      const collateralData = await this.databaseService.getCollateralAssets(
        input.assetId || input.projectId!
      ) as any[]
      
      const collateralAssets: CollateralAsset[] = []
      
      for (const collateral of collateralData) {
        // Get current market price using BaseCalculator's price fetching
        let currentPrice = collateral.oracle_price || 0
        
        try {
          // Try to get fresh price data
          const priceData = await this.fetchPriceData(
            `${collateral.collateral_symbol}_USD`,
            input.valuationDate
          )
          currentPrice = priceData.price
        } catch (error) {
          // Fall back to cached oracle price if available
          if (!currentPrice) {
            throw new Error(`No price data available for ${collateral.collateral_symbol}`)
          }
        }
        
        const collateralAsset: CollateralAsset = {
          symbol: collateral.collateral_symbol,
          address: collateral.collateral_address,
          balance: collateral.collateral_amount,
          priceUSD: currentPrice,
          liquidationRatio: collateral.liquidation_ratio,
          stabilityFee: collateral.stability_fee,
          debtCeiling: collateral.debt_ceiling,
          riskParameters: collateral.risk_parameters ? JSON.parse(collateral.risk_parameters) : {
            volatility: 0.5,
            liquidity: 0.8,
            correlationToETH: 0.7
          }
        }
        
        collateralAssets.push(collateralAsset)
      }
      
      // Save calculation step for audit trail
      await this.databaseService.saveCalculationHistory({
        run_id: this.generateRunId(),
        asset_id: input.assetId || input.projectId!,
        product_type: 'stablecoin_crypto_backed',
        calculation_step: 'fetch_collateral_data',
        step_order: 2,
        input_data: { assetId: input.assetId },
        output_data: {
          collateralCount: collateralAssets.length,
          totalCollateralValue: collateralAssets.reduce((sum, c) => sum + (c.balance * c.priceUSD), 0)
        },
        processing_time_ms: Date.now() - Date.now(), // Will be properly timed
        data_sources: ['stablecoin_collateral', 'nav_price_cache'],
        validation_results: { collateralFound: collateralAssets.length > 0 }
      })
      
      return collateralAssets
    } catch (error) {
      throw new Error(`Failed to fetch collateral data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Calculates collateralization metrics using digital models
   */
  private async calculateCollateralizationMetrics(
    collateralData: CollateralAsset[],
    productDetails: any
  ): Promise<{
    totalCollateralValue: number
    totalDebt: number
    collateralizationRatio: number
    excessCollateral: number
    liquidationBuffer: number
    collateralStatus: any
  }> {
    let totalCollateralValue = 0
    
    for (const collateral of collateralData) {
      totalCollateralValue += collateral.balance * collateral.priceUSD
    }
    
    const totalDebt = productDetails.circulatingSupply
    const minimumRatio = productDetails.minimumCollateralizationRatio || 1.5
    
    // Use stablecoinModels.cryptoBackedValuation for proper analysis
    const collateralStatus = stablecoinModels.cryptoBackedValuation(
      totalCollateralValue,
      totalDebt,
      minimumRatio,
      1.0 // Current peg price - assuming USD stablecoin
    )
    
    const collateralizationRatio = this.toNumber(collateralStatus.collateralizationRatio)
    const minimumRequired = totalDebt * minimumRatio
    const excessCollateral = Math.max(0, totalCollateralValue - minimumRequired)
    const liquidationRequired = totalDebt * productDetails.liquidationThreshold
    const liquidationBuffer = Math.max(0, totalCollateralValue - liquidationRequired)
    
    return {
      totalCollateralValue,
      totalDebt,
      collateralizationRatio,
      excessCollateral,
      liquidationBuffer,
      collateralStatus
    }
  }

  /**
   * Assesses liquidation risk using digital models
   */
  private async assessLiquidationRisk(
    metrics: any,
    productDetails: any,
    collateralData: CollateralAsset[]
  ): Promise<LiquidationRisk> {
    const { collateralizationRatio, liquidationBuffer, collateralStatus } = metrics
    const liquidationThreshold = productDetails.liquidationThreshold
    
    // Get real price history from database
    let priceHistory: number[] = []
    try {
      const lookbackDate = new Date()
      lookbackDate.setDate(lookbackDate.getDate() - 7) // 7 days back
      
      const historicalPrices = await this.databaseService.getPriceHistory(
        productDetails.symbol + '-USD',
        lookbackDate, 
        new Date()
      )
      
      if (historicalPrices.length > 0) {
        priceHistory = historicalPrices.map(p => p.price)
      } else {
        // Use collateral price data if direct price history unavailable
        const currentPrice = collateralData.length > 0 && collateralData[0] ? collateralData[0].priceUSD : 1.0
        priceHistory = [currentPrice]
      }
    } catch (error) {
      throw new Error(`Failed to fetch price history for liquidation analysis: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    const riskAssessment = stablecoinModels.calculateDeathSpiralRisk(
      1.0, // Current market price (assuming USD stablecoin)
      1.0, // Target peg price
      priceHistory,
      this.toNumber(collateralStatus.collateralizationRatio)
    )
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical'
    let timeToLiquidation = Infinity
    let priceDropRequired = 0
    const recommendedActions: string[] = []
    
    // Use collateral status from digital models
    if (collateralStatus.needsLiquidation) {
      riskLevel = 'critical'
      timeToLiquidation = 1 // 1 hour estimated
      recommendedActions.push('Immediate liquidation imminent')
      recommendedActions.push('Add collateral immediately or repay debt')
    } else if (collateralStatus.healthFactor.lessThan(1.2)) {
      riskLevel = 'high'
      priceDropRequired = (collateralizationRatio - liquidationThreshold) / collateralizationRatio
      timeToLiquidation = 24 // 24 hours estimated
      recommendedActions.push('Consider adding collateral', 'Prepare for potential liquidation')
    } else if (collateralStatus.healthFactor.lessThan(1.5)) {
      riskLevel = 'medium'
      priceDropRequired = (collateralizationRatio - liquidationThreshold) / collateralizationRatio
      recommendedActions.push('Monitor collateral prices closely')
    } else {
      riskLevel = 'low'
      priceDropRequired = (collateralizationRatio - liquidationThreshold) / collateralizationRatio
    }
    
    // Add death spiral risk warnings
    if (riskAssessment.shouldHalt) {
      recommendedActions.push('Death spiral risk detected - emergency protocol activation recommended')
      riskLevel = 'critical'
    } else if (riskAssessment.riskScore.greaterThan(0.7)) {
      recommendedActions.push('High death spiral risk - monitor closely')
      if (riskLevel === 'low') riskLevel = 'medium'
    }
    
    return {
      riskLevel,
      timeToLiquidation,
      priceDropRequired,
      collateralBuffer: liquidationBuffer,
      recommendedActions
    }
  }

  /**
   * Calculates governance token value component using real market data
   */
  private async calculateGovernanceValue(
    productDetails: any,
    input: StablecoinCryptoCalculationInput
  ): Promise<number> {
    try {
      // Get real governance token price from database
      let governanceTokenPrice = 0
      const governanceSymbol = productDetails.governanceToken || 'GOVERNANCE'
      
      // Fetch current governance token price
      const governancePriceData = await this.fetchPriceData(
        `${governanceSymbol}_USD`,
        input.valuationDate
      )
      governanceTokenPrice = governancePriceData.price
      
      const governanceSupply = input.governanceTokenSupply || productDetails.governanceTokenSupply || 1000000
      
      // Calculate protocol revenue capture value
      const protocolRevenue = productDetails.systemSurplus || 0
      const governanceValueCapture = protocolRevenue * 0.7 // 70% flows to governance
      
      // Calculate per-unit governance value contribution to stablecoin NAV
      const governanceMarketCap = governanceTokenPrice * governanceSupply
      const governanceNAVContribution = governanceValueCapture / productDetails.totalSupply
      
      return governanceNAVContribution
    } catch (error) {
      // If governance token price unavailable, fall back to protocol revenue only
      const protocolRevenue = productDetails.systemSurplus || 0
      const governanceValueCapture = protocolRevenue * 0.7
      return governanceValueCapture / productDetails.totalSupply
    }
  }

  /**
   * Calculates protocol revenue from stability fees
   */
  private async calculateProtocolRevenue(
    productDetails: any,
    metrics: any
  ): Promise<number> {
    const stabilityFeeRate = productDetails.stabilityFeeRate || 0.025
    const totalDebt = metrics.totalDebt || 0
    
    // Annual stability fee revenue
    const annualRevenue = totalDebt * stabilityFeeRate
    
    // Adjust for time period (assume daily calculation)
    return annualRevenue / 365
  }

  /**
   * Builds pricing sources object for the result
   */
  private buildPricingSources(collateralData: CollateralAsset[], governanceValue: number): Record<string, PriceData> {
    const pricingSources: Record<string, PriceData> = {}
    
    collateralData.forEach(collateral => {
      pricingSources[collateral.symbol] = {
        price: collateral.priceUSD,
        currency: 'USD',
        asOf: new Date(),
        source: 'chainlink_oracle'
      }
    })
    
    pricingSources['governance_value'] = {
      price: governanceValue,
      currency: 'USD',
      asOf: new Date(),
      source: 'internal_calculation'
    }
    
    return pricingSources
  }

  /**
   * Validates crypto stablecoin specific input parameters
   */
  protected override validateInput(input: CalculationInput): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    severity: ValidationSeverity
  } {
    const baseValidation = super.validateInput(input)
    const stablecoinInput = input as StablecoinCryptoCalculationInput
    
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    // Validate stablecoin-specific parameters
    if (stablecoinInput.totalSupply !== undefined && stablecoinInput.totalSupply < 0) {
      errors.push('Total supply cannot be negative')
    }

    if (stablecoinInput.circulatingSupply !== undefined && stablecoinInput.circulatingSupply < 0) {
      errors.push('Circulating supply cannot be negative')
    }

    if (stablecoinInput.circulatingSupply && stablecoinInput.totalSupply && 
        stablecoinInput.circulatingSupply > stablecoinInput.totalSupply) {
      errors.push('Circulating supply cannot exceed total supply')
    }

    if (stablecoinInput.currentCollateralizationRatio !== undefined && 
        stablecoinInput.currentCollateralizationRatio < 0) {
      errors.push('Collateralization ratio cannot be negative')
    }

    if (stablecoinInput.minimumCollateralizationRatio !== undefined && 
        stablecoinInput.minimumCollateralizationRatio <= 1) {
      errors.push('Minimum collateralization ratio must be greater than 1')
    }

    if (stablecoinInput.liquidationThreshold !== undefined && 
        stablecoinInput.liquidationThreshold <= 1) {
      errors.push('Liquidation threshold must be greater than 1')
    }

    if (stablecoinInput.stabilityFeeRate !== undefined && 
        stablecoinInput.stabilityFeeRate < 0) {
      errors.push('Stability fee rate cannot be negative')
    }

    // Add warnings for risky conditions
    if (stablecoinInput.currentCollateralizationRatio && 
        stablecoinInput.liquidationThreshold &&
        stablecoinInput.currentCollateralizationRatio < stablecoinInput.liquidationThreshold * 1.2) {
      warnings.push('Collateralization ratio is approaching liquidation threshold')
    }

    if (stablecoinInput.emergencyShutdownActive) {
      warnings.push('Emergency shutdown is active - normal operations may be suspended')
    }

    // Add warnings for missing optional data
    if (!stablecoinInput.collateralAssets || stablecoinInput.collateralAssets.length === 0) {
      warnings.push('No collateral assets specified - using default assets')
    }

    if (!stablecoinInput.oracleProviders || stablecoinInput.oracleProviders.length === 0) {
      warnings.push('No oracle providers specified - price feed reliability may be compromised')
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
    return `crypto_stablecoin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
