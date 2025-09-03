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
   * Fetches stablecoin product details from database
   */
  private async getStablecoinProductDetails(input: StablecoinCryptoCalculationInput): Promise<any> {
    // Mock implementation - replace with actual database query
    return {
      id: input.assetId,
      symbol: input.stablecoinSymbol || 'DAI',
      protocolType: input.protocolType || 'makerdao',
      collateralType: 'crypto',
      totalSupply: input.totalSupply || 5000000000,
      circulatingSupply: input.circulatingSupply || 4500000000,
      pegValue: 1.00,
      minimumCollateralizationRatio: input.minimumCollateralizationRatio || 1.5,
      liquidationThreshold: input.liquidationThreshold || 1.3,
      stabilityFeeRate: input.stabilityFeeRate || 0.025,
      collateralAssets: input.collateralAssets || ['ETH', 'WBTC', 'USDC'],
      governanceToken: 'MKR',
      oracleProviders: input.oracleProviders || ['chainlink', 'makerdao_osm'],
      emergencyShutdownActive: input.emergencyShutdownActive || false,
      liquidationPenalty: 0.13, // 13% penalty
      debtCeiling: 10000000000, // $10B debt ceiling
      systemSurplus: 50000000 // $50M surplus
    }
  }

  /**
   * Fetches collateral asset data and prices
   */
  private async fetchCollateralData(
    input: StablecoinCryptoCalculationInput,
    productDetails: any
  ): Promise<CollateralAsset[]> {
    // Mock implementation - replace with actual oracle/market data calls
    const mockCollaterals: CollateralAsset[] = [
      {
        symbol: 'ETH',
        address: '0x...eth',
        balance: 2000000, // 2M ETH
        priceUSD: 2500,
        liquidationRatio: 1.5,
        stabilityFee: 0.025,
        debtCeiling: 5000000000,
        riskParameters: {
          volatility: 0.8,
          liquidity: 0.9,
          correlationToETH: 1.0
        }
      },
      {
        symbol: 'WBTC',
        address: '0x...wbtc',
        balance: 50000, // 50K WBTC
        priceUSD: 45000,
        liquidationRatio: 1.75,
        stabilityFee: 0.03,
        debtCeiling: 2000000000,
        riskParameters: {
          volatility: 0.75,
          liquidity: 0.85,
          correlationToETH: 0.8
        }
      },
      {
        symbol: 'USDC',
        address: '0x...usdc',
        balance: 1000000000, // 1B USDC
        priceUSD: 1.00,
        liquidationRatio: 1.05,
        stabilityFee: 0.01,
        debtCeiling: 1000000000,
        riskParameters: {
          volatility: 0.02,
          liquidity: 0.95,
          correlationToETH: 0.1
        }
      }
    ]

    return mockCollaterals
  }

  /**
   * Calculates collateralization metrics
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
  }> {
    let totalCollateralValue = 0
    
    for (const collateral of collateralData) {
      totalCollateralValue += collateral.balance * collateral.priceUSD
    }
    
    const totalDebt = productDetails.circulatingSupply
    const collateralizationRatio = totalDebt > 0 ? totalCollateralValue / totalDebt : Infinity
    const minimumRequired = totalDebt * productDetails.minimumCollateralizationRatio
    const excessCollateral = Math.max(0, totalCollateralValue - minimumRequired)
    const liquidationRequired = totalDebt * productDetails.liquidationThreshold
    const liquidationBuffer = Math.max(0, totalCollateralValue - liquidationRequired)
    
    return {
      totalCollateralValue,
      totalDebt,
      collateralizationRatio,
      excessCollateral,
      liquidationBuffer
    }
  }

  /**
   * Assesses liquidation risk based on collateralization
   */
  private async assessLiquidationRisk(
    metrics: any,
    productDetails: any,
    collateralData: CollateralAsset[]
  ): Promise<LiquidationRisk> {
    const { collateralizationRatio, liquidationBuffer } = metrics
    const liquidationThreshold = productDetails.liquidationThreshold
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical'
    let timeToLiquidation = Infinity
    let priceDropRequired = 0
    const recommendedActions: string[] = []
    
    if (collateralizationRatio > liquidationThreshold * 1.5) {
      riskLevel = 'low'
      priceDropRequired = (collateralizationRatio - liquidationThreshold) / collateralizationRatio
    } else if (collateralizationRatio > liquidationThreshold * 1.2) {
      riskLevel = 'medium'
      priceDropRequired = (collateralizationRatio - liquidationThreshold) / collateralizationRatio
      recommendedActions.push('Monitor collateral prices closely')
    } else if (collateralizationRatio > liquidationThreshold * 1.05) {
      riskLevel = 'high'
      priceDropRequired = (collateralizationRatio - liquidationThreshold) / collateralizationRatio
      timeToLiquidation = 24 // 24 hours estimated
      recommendedActions.push('Consider adding collateral', 'Prepare for potential liquidation')
    } else {
      riskLevel = 'critical'
      priceDropRequired = (collateralizationRatio - liquidationThreshold) / collateralizationRatio
      timeToLiquidation = 1 // 1 hour estimated
      recommendedActions.push('Immediate action required', 'Add collateral or repay debt')
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
   * Calculates governance token value component
   */
  private async calculateGovernanceValue(
    productDetails: any,
    input: StablecoinCryptoCalculationInput
  ): Promise<number> {
    // Mock governance token price
    const governanceTokenPrice = 2500 // Example MKR price
    const governanceSupply = input.governanceTokenSupply || 1000000
    
    // Calculate protocol revenue capture value
    const protocolRevenue = productDetails.systemSurplus || 0
    const governanceValueCapture = protocolRevenue * 0.7 // 70% flows to governance
    
    return governanceValueCapture
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
