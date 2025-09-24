/**
 * StablecoinAlgorithmicCalculator - NAV calculation for Algorithmic Stablecoins
 * 
 * Handles:
 * - Algorithmic stability mechanisms without full backing
 * - Supply expansion/contraction based on price deviations
 * - Seigniorage shares and bonds systems
 * - Fractional reserve algorithmic models (e.g., FRAX)
 * - Elastic supply mechanisms (e.g., AMPL-style rebasing)
 * - Protocol-owned liquidity and treasury management
 * - Death spiral risk assessment and prevention
 * - Market maker and arbitrage mechanisms
 * - Governance token integration and utility
 * - Emergency stabilization protocols
 * 
 * Supports algorithmic stablecoin products from stablecoin_products table
 */

import { Decimal } from 'decimal.js'
import { BaseCalculator, CalculatorOptions } from './BaseCalculator'
import { DatabaseService } from '../DatabaseService'
import { stablecoinModels, rebaseModels } from '../models'
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

export interface StablecoinAlgorithmicCalculationInput extends CalculationInput {
  // Algorithmic stablecoin specific parameters
  stablecoinSymbol?: string // FRAX, UST, LUSD, etc.
  algorithmType?: 'fractional_reserve' | 'elastic_supply' | 'seigniorage' | 'cdp_based'
  contractAddress?: string
  chainId?: number
  totalSupply?: number
  circulatingSupply?: number
  targetPrice?: number
  currentPrice?: number
  collateralRatio?: number // For fractional reserve types
  protocolOwnedLiquidity?: number
  treasuryAssets?: number
  governanceTokenSupply?: number
  stabilityMechanism?: string
  expansionThreshold?: number // Price above which supply expands
  contractionThreshold?: number // Price below which supply contracts
  expansionRate?: number // Rate of supply expansion
  contractionRate?: number // Rate of supply contraction
  emergencyShutdownActive?: boolean
  lastRebaseEvent?: Date
  deathSpiralProtection?: boolean
}

export interface AlgorithmicReserve extends AssetHolding {
  reserveType: 'protocol_owned_liquidity' | 'treasury_assets' | 'governance_tokens' | 'bonds' | 'insurance_fund'
  assetSymbol: string
  liquidityValue?: number
  stakingRewards?: number
  votingPower?: number
  lockupPeriod?: number
  utilityValue?: number
}

export interface StabilityMechanism {
  mechanismType: 'mint_burn' | 'rebase' | 'interest_rate' | 'bond_system' | 'market_operations'
  isActive: boolean
  lastTriggered?: Date
  effectivenessScore: number
  parameters: Record<string, number>
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export interface AlgorithmicMetrics {
  pegStability: number // How well peg is maintained
  supplyElasticity: number // How responsive supply is to price changes
  marketCapRatio: number // Market cap vs backing assets
  velocityOfMoney: number // Transaction frequency
  demandDamping: number // Resistance to price changes
  protocolRevenue: number // Revenue from operations
  burnRate: number // Token burn rate
  expansionRate: number // Token expansion rate
  governanceParticipation: number // Governance engagement
}

export interface DeathSpiralRisk {
  riskScore: number // 0-1 scale
  triggers: string[]
  currentPhase: 'stable' | 'moderate_stress' | 'high_stress' | 'critical' | 'death_spiral'
  timeToTrigger?: number // Estimated hours to death spiral
  mitigationMeasures: string[]
  emergencyProtocols: string[]
}

export class StablecoinAlgorithmicCalculator extends BaseCalculator {
  private static readonly DEFAULT_TARGET_PRICE = 1.00
  private static readonly EXPANSION_THRESHOLD = 1.01 // +1%
  private static readonly CONTRACTION_THRESHOLD = 0.99 // -1%
  private static readonly MAX_EXPANSION_RATE = 0.10 // 10% per day
  private static readonly MAX_CONTRACTION_RATE = 0.05 // 5% per day
  private static readonly DEATH_SPIRAL_THRESHOLD = 0.85 // $0.85

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
    return [AssetType.STABLECOIN_ALGORITHMIC]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const algorithmicInput = input as StablecoinAlgorithmicCalculationInput
      
      // Get algorithmic stablecoin product details
      const productDetails = await this.getAlgorithmicProductDetails(algorithmicInput)
      
      // Fetch algorithmic reserves and protocol assets
      const algorithmicReserves = await this.getAlgorithmicReserves(algorithmicInput)
      
      // Get current market price and peg analysis
      const marketData = await this.fetchAlgorithmicMarketData(algorithmicInput, productDetails)
      
      // Analyze stability mechanisms using digital models
      const stabilityAnalysis = await this.analyzeStabilityMechanisms(
        productDetails,
        marketData,
        algorithmicReserves
      )
      
      // Assess death spiral risk using models
      const deathSpiralRisk = await this.assessDeathSpiralRisk(
        marketData,
        productDetails,
        stabilityAnalysis
      )
      
      // Calculate supply adjustments needed
      const supplyAdjustments = await this.calculateSupplyAdjustments(
        marketData,
        productDetails,
        stabilityAnalysis
      )
      
      // Calculate protocol value and NAV
      const protocolValuation = await this.calculateProtocolValuation(
        algorithmicReserves,
        productDetails,
        stabilityAnalysis
      )
      
      // Apply algorithmic adjustments
      const finalValuation = await this.applyAlgorithmicAdjustments(
        protocolValuation,
        supplyAdjustments,
        deathSpiralRisk,
        productDetails
      )
      
      // Determine calculation status
      let calculationStatus = CalculationStatus.COMPLETED
      let errorMessage: string | undefined
      
      if (deathSpiralRisk.currentPhase === 'death_spiral') {
        calculationStatus = CalculationStatus.FAILED
        errorMessage = 'Death spiral detected - emergency protocol activation required'
      } else if (deathSpiralRisk.currentPhase === 'critical') {
        calculationStatus = CalculationStatus.FAILED
        errorMessage = `Critical stability risk: ${deathSpiralRisk.triggers.join(', ')}`
      }
      
      // Build comprehensive result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `algorithmic_stablecoin_${productDetails.symbol}`,
        productType: AssetType.STABLECOIN_ALGORITHMIC,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(protocolValuation.totalAssets),
        totalLiabilities: this.toNumber(protocolValuation.totalLiabilities),
        netAssets: this.toNumber(finalValuation.netValue),
        navValue: this.toNumber(finalValuation.totalValue),
        navPerShare: this.toNumber(finalValuation.valuePerToken),
        sharesOutstanding: productDetails.circulatingSupply,
        currency: 'USD',
        pricingSources: this.buildAlgorithmicPricingSources(algorithmicReserves, marketData),
        calculatedAt: new Date(),
        status: calculationStatus,
        errorMessage,
        metadata: {
          algorithmType: productDetails.algorithmType,
          targetPrice: productDetails.targetPrice,
          currentPrice: marketData.currentPrice,
          pegDeviation: marketData.pegDeviation,
          collateralRatio: productDetails.collateralRatio,
          stabilityScore: stabilityAnalysis.overallStability,
          deathSpiralRisk: {
            riskScore: deathSpiralRisk.riskScore,
            currentPhase: deathSpiralRisk.currentPhase,
            triggers: deathSpiralRisk.triggers
          },
          supplyAdjustments: {
            recommendedChange: supplyAdjustments.recommendedChange,
            adjustmentType: supplyAdjustments.adjustmentType,
            newSupply: supplyAdjustments.newSupply
          },
          protocolMetrics: {
            treasuryValue: this.toNumber(protocolValuation.treasuryValue),
            liquidityValue: this.toNumber(protocolValuation.liquidityValue),
            governanceValue: this.toNumber(protocolValuation.governanceValue)
          }
        }
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown algorithmic stablecoin calculation error',
        code: 'ALGORITHMIC_STABLECOIN_CALCULATION_FAILED'
      }
    }
  }

  // ==================== ALGORITHMIC STABLECOIN SPECIFIC METHODS ====================

  /**
   * Get algorithmic stablecoin product details from database
   */
  private async getAlgorithmicProductDetails(input: StablecoinAlgorithmicCalculationInput): Promise<any> {
    try {
      const productDetails = await this.databaseService.getStablecoinProductById(
        input.assetId || input.projectId!
      )
      
      return {
        id: productDetails.id,
        symbol: productDetails.token_symbol,
        name: productDetails.token_name,
        algorithmType: input.algorithmType || this.determineAlgorithmType(productDetails.token_symbol),
        targetPrice: input.targetPrice || StablecoinAlgorithmicCalculator.DEFAULT_TARGET_PRICE,
        totalSupply: productDetails.total_supply,
        circulatingSupply: productDetails.circulating_supply,
        collateralRatio: input.collateralRatio || this.getDefaultCollateralRatio(input.algorithmType),
        stabilityMechanism: productDetails.stability_mechanism,
        expansionThreshold: input.expansionThreshold || StablecoinAlgorithmicCalculator.EXPANSION_THRESHOLD,
        contractionThreshold: input.contractionThreshold || StablecoinAlgorithmicCalculator.CONTRACTION_THRESHOLD,
        expansionRate: input.expansionRate || 0.05,
        contractionRate: input.contractionRate || 0.03,
        protocolOwnedLiquidity: input.protocolOwnedLiquidity || 10000000,
        treasuryAssets: input.treasuryAssets || 5000000,
        governanceTokenSupply: input.governanceTokenSupply || 100000000,
        emergencyShutdownActive: input.emergencyShutdownActive || false,
        deathSpiralProtection: input.deathSpiralProtection !== false
      }
    } catch (error) {
      throw new Error(`Failed to fetch algorithmic product details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get algorithmic reserves and protocol assets
   */
  private async getAlgorithmicReserves(input: StablecoinAlgorithmicCalculationInput): Promise<AlgorithmicReserve[]> {
    try {
      const reservesData = await this.databaseService.getFiatReserves(
        input.assetId || input.projectId!
      ) as any[]
      
      const algorithmicReserves: AlgorithmicReserve[] = []
      
      for (const reserve of reservesData) {
        const algorithmicReserve: AlgorithmicReserve = {
          instrumentKey: reserve.instrument_key,
          quantity: reserve.quantity,
          currency: reserve.holding_currency || 'USD',
          effectiveDate: new Date(reserve.effective_date),
          reserveType: this.mapAlgorithmicReserveType(reserve.instrument_key),
          assetSymbol: this.extractAssetSymbol(reserve.instrument_key),
          liquidityValue: reserve.value,
          stakingRewards: reserve.value * 0.05, // 5% APY
          votingPower: reserve.value * 100, // Governance weight
          lockupPeriod: 0,
          utilityValue: reserve.value * 0.1
        }
        
        algorithmicReserves.push(algorithmicReserve)
      }
      
      return algorithmicReserves
    } catch (error) {
      throw new Error(`Failed to fetch algorithmic reserves: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetch algorithmic stablecoin market data
   */
  private async fetchAlgorithmicMarketData(
    input: StablecoinAlgorithmicCalculationInput,
    productDetails: any
  ): Promise<{
    currentPrice: number,
    targetPrice: number,
    pegDeviation: number,
    marketCap: number,
    tradingVolume24h: number,
    liquidityDepth: number,
    priceHistory: number[]
  }> {
    // Mock market data - replace with real feeds
    const currentPrice = input.currentPrice || (0.95 + Math.random() * 0.10) // $0.95-$1.05
    const targetPrice = productDetails.targetPrice
    const pegDeviation = (currentPrice - targetPrice) / targetPrice
    
    // Generate price history for risk assessment
    const priceHistory: number[] = []
    for (let i = 0; i < 14; i++) {
      const historicalPrice = targetPrice + (Math.random() - 0.5) * 0.04 // ±2% historical volatility
      priceHistory.push(historicalPrice)
    }
    
    return {
      currentPrice,
      targetPrice,
      pegDeviation,
      marketCap: productDetails.circulatingSupply * currentPrice,
      tradingVolume24h: 25000000, // $25M daily volume
      liquidityDepth: 5000000, // $5M liquidity
      priceHistory
    }
  }

  /**
   * Analyze stability mechanisms using digital models
   */
  private async analyzeStabilityMechanisms(
    productDetails: any,
    marketData: any,
    reserves: AlgorithmicReserve[]
  ): Promise<{
    overallStability: number,
    activeMechanisms: StabilityMechanism[],
    recommendedActions: string[],
    algorithmicHealth: any
  }> {
    const activeMechanisms: StabilityMechanism[] = []
    const recommendedActions: string[] = []
    
    // Use stablecoin models for algorithmic stabilization
    const stabilizationResult = stablecoinModels.algorithmicStabilization(
      marketData.currentPrice,
      marketData.targetPrice,
      productDetails.circulatingSupply,
      {
        expansionFactor: productDetails.expansionThreshold,
        contractionFactor: productDetails.contractionThreshold
      }
    )
    
    // Add supply adjustment mechanism
    activeMechanisms.push({
      mechanismType: 'mint_burn',
      isActive: Math.abs(marketData.pegDeviation) > 0.01,
      lastTriggered: new Date(),
      effectivenessScore: 0.75,
      parameters: {
        expansionThreshold: productDetails.expansionThreshold,
        contractionThreshold: productDetails.contractionThreshold,
        expansionRate: productDetails.expansionRate,
        contractionRate: productDetails.contractionRate
      },
      riskLevel: Math.abs(marketData.pegDeviation) > 0.05 ? 'high' : 'medium'
    })
    
    // Add liquidity operations mechanism
    const liquidityValue = reserves.reduce((sum, r) => 
      r.reserveType === 'protocol_owned_liquidity' ? sum + (r.liquidityValue || 0) : sum, 0)
    
    activeMechanisms.push({
      mechanismType: 'market_operations',
      isActive: liquidityValue > 1000000,
      effectivenessScore: Math.min(1.0, liquidityValue / 5000000),
      parameters: {
        liquidityValue,
        utilizationRate: 0.3
      },
      riskLevel: liquidityValue < 2000000 ? 'high' : 'low'
    })
    
    // Generate recommendations based on stability mechanism
    if (stabilizationResult.stabilityMechanism === 'expand') {
      recommendedActions.push('Increase token supply to reduce price pressure')
    } else if (stabilizationResult.stabilityMechanism === 'contract') {
      recommendedActions.push('Reduce token supply or increase demand incentives')
    }
    
    if (Math.abs(marketData.pegDeviation) > 0.05) {
      recommendedActions.push('Activate emergency stabilization protocols')
    }
    
    const overallStability = activeMechanisms.reduce((sum, m) => sum + m.effectivenessScore, 0) / activeMechanisms.length
    
    return {
      overallStability,
      activeMechanisms,
      recommendedActions,
      algorithmicHealth: stabilizationResult
    }
  }

  /**
   * Assess death spiral risk using models
   */
  private async assessDeathSpiralRisk(
    marketData: any,
    productDetails: any,
    stabilityAnalysis: any
  ): Promise<DeathSpiralRisk> {
    // Use stablecoin models for death spiral risk
    const riskAssessment = stablecoinModels.calculateDeathSpiralRisk(
      marketData.currentPrice,
      marketData.targetPrice,
      marketData.priceHistory,
      productDetails.collateralRatio
    )
    
    const triggers = []
    let currentPhase: 'stable' | 'moderate_stress' | 'high_stress' | 'critical' | 'death_spiral' = 'stable'
    let timeToTrigger: number | undefined
    
    // Determine current phase based on price and risk factors
    if (marketData.currentPrice < StablecoinAlgorithmicCalculator.DEATH_SPIRAL_THRESHOLD) {
      currentPhase = 'death_spiral'
      triggers.push('Price below death spiral threshold')
    } else if (marketData.currentPrice < 0.90) {
      currentPhase = 'critical'
      triggers.push('Severe depeg detected')
      timeToTrigger = 24
    } else if (marketData.currentPrice < 0.95) {
      currentPhase = 'high_stress'
      triggers.push('Significant depeg detected')
      timeToTrigger = 72
    } else if (Math.abs(marketData.pegDeviation) > 0.02) {
      currentPhase = 'moderate_stress'
      triggers.push('Peg deviation exceeds 2%')
    }
    
    if (stabilityAnalysis.overallStability < 0.5) {
      triggers.push('Low stability mechanism effectiveness')
      if (currentPhase === 'stable') currentPhase = 'moderate_stress'
    }
    
    if (riskAssessment.shouldHalt) {
      triggers.push('Model recommends emergency halt')
      currentPhase = 'critical'
    }
    
    const mitigationMeasures = [
      'Increase protocol-owned liquidity',
      'Activate bond mechanism',
      'Emergency governance intervention',
      'Market maker incentives'
    ]
    
    const emergencyProtocols = [
      'Emergency shutdown',
      'Collateral backstop activation',
      'Treasury intervention',
      'Governance emergency powers'
    ]
    
    return {
      riskScore: this.toNumber(riskAssessment.riskScore),
      triggers,
      currentPhase,
      timeToTrigger,
      mitigationMeasures,
      emergencyProtocols
    }
  }

  /**
   * Calculate supply adjustments using digital models
   */
  private async calculateSupplyAdjustments(
    marketData: any,
    productDetails: any,
    stabilityAnalysis: any
  ): Promise<{
    recommendedChange: number,
    adjustmentType: 'expand' | 'contract' | 'neutral',
    newSupply: number,
    timeframe: string
  }> {
    const currentSupply = productDetails.circulatingSupply
    const pegDeviation = marketData.pegDeviation
    
    let adjustmentType: 'expand' | 'contract' | 'neutral' = 'neutral'
    let recommendedChange = 0
    
    if (marketData.currentPrice > productDetails.expansionThreshold) {
      adjustmentType = 'expand'
      recommendedChange = Math.min(
        currentSupply * productDetails.expansionRate,
        currentSupply * StablecoinAlgorithmicCalculator.MAX_EXPANSION_RATE
      )
    } else if (marketData.currentPrice < productDetails.contractionThreshold) {
      adjustmentType = 'contract'
      recommendedChange = -Math.min(
        currentSupply * productDetails.contractionRate,
        currentSupply * StablecoinAlgorithmicCalculator.MAX_CONTRACTION_RATE
      )
    }
    
    const newSupply = currentSupply + recommendedChange
    
    return {
      recommendedChange,
      adjustmentType,
      newSupply,
      timeframe: '24_hours'
    }
  }

  /**
   * Calculate protocol valuation using reserves and assets
   */
  private async calculateProtocolValuation(
    reserves: AlgorithmicReserve[],
    productDetails: any,
    stabilityAnalysis: any
  ): Promise<{
    totalAssets: Decimal,
    totalLiabilities: Decimal,
    treasuryValue: Decimal,
    liquidityValue: Decimal,
    governanceValue: Decimal
  }> {
    let treasuryValue = this.decimal(0)
    let liquidityValue = this.decimal(0)
    let governanceValue = this.decimal(0)
    
    for (const reserve of reserves) {
      const value = this.decimal(reserve.liquidityValue || 0)
      
      switch (reserve.reserveType) {
        case 'treasury_assets':
          treasuryValue = treasuryValue.plus(value)
          break
        case 'protocol_owned_liquidity':
          liquidityValue = liquidityValue.plus(value)
          break
        case 'governance_tokens':
          governanceValue = governanceValue.plus(value)
          break
      }
    }
    
    const totalAssets = treasuryValue.plus(liquidityValue).plus(governanceValue)
    const totalLiabilities = this.decimal(productDetails.circulatingSupply * 1.0) // 1:1 liability to holders
    
    return {
      totalAssets,
      totalLiabilities,
      treasuryValue,
      liquidityValue,
      governanceValue
    }
  }

  /**
   * Apply algorithmic adjustments to final valuation
   */
  private async applyAlgorithmicAdjustments(
    protocolValuation: any,
    supplyAdjustments: any,
    deathSpiralRisk: DeathSpiralRisk,
    productDetails: any
  ): Promise<{
    totalValue: Decimal,
    netValue: Decimal,
    valuePerToken: Decimal
  }> {
    let adjustedValue = protocolValuation.totalAssets
    
    // Apply death spiral risk adjustment
    const riskAdjustment = this.decimal(1 - (deathSpiralRisk.riskScore * 0.3))
    adjustedValue = adjustedValue.times(riskAdjustment)
    
    // Apply supply adjustment impact
    const adjustedSupply = this.decimal(supplyAdjustments.newSupply)
    
    const netValue = adjustedValue.minus(protocolValuation.totalLiabilities)
    const valuePerToken = adjustedSupply.greaterThan(0) ? netValue.div(adjustedSupply) : this.decimal(0)
    
    return {
      totalValue: adjustedValue,
      netValue,
      valuePerToken
    }
  }

  // ==================== HELPER METHODS ====================

  private determineAlgorithmType(symbol: string): 'fractional_reserve' | 'elastic_supply' | 'seigniorage' | 'cdp_based' {
    if (symbol.includes('FRAX')) return 'fractional_reserve'
    if (symbol.includes('AMPL') || symbol.includes('BASE')) return 'elastic_supply'
    if (symbol.includes('LUSD') || symbol.includes('DAI')) return 'cdp_based'
    return 'seigniorage'
  }

  private getDefaultCollateralRatio(algorithmType?: string): number {
    const ratios: Record<string, number> = {
      'fractional_reserve': 0.85,
      'elastic_supply': 0,
      'seigniorage': 0,
      'cdp_based': 1.1
    }
    return ratios[algorithmType || 'seigniorage'] || 0
  }

  private mapAlgorithmicReserveType(instrumentKey: string): 'protocol_owned_liquidity' | 'treasury_assets' | 'governance_tokens' | 'bonds' | 'insurance_fund' {
    if (instrumentKey.includes('LP') || instrumentKey.includes('LIQUIDITY')) return 'protocol_owned_liquidity'
    if (instrumentKey.includes('TREASURY')) return 'treasury_assets'
    if (instrumentKey.includes('GOV') || instrumentKey.includes('GOVERNANCE')) return 'governance_tokens'
    if (instrumentKey.includes('BOND')) return 'bonds'
    return 'treasury_assets'
  }

  private extractAssetSymbol(instrumentKey: string): string {
    const symbols = instrumentKey.split('_')
    return symbols[0] || 'UNKNOWN'
  }

  private buildAlgorithmicPricingSources(
    reserves: AlgorithmicReserve[],
    marketData: any
  ): Record<string, PriceData> {
    const pricingSources: Record<string, PriceData> = {}
    
    // Market price
    pricingSources['market_price'] = {
      price: marketData.currentPrice,
      currency: 'USD',
      asOf: new Date(),
      source: 'dex_aggregator'
    }
    
    // Reserve valuations
    reserves.forEach((reserve, index) => {
      pricingSources[`reserve_${index + 1}`] = {
        price: reserve.liquidityValue || 0,
        currency: reserve.currency,
        asOf: new Date(),
        source: 'protocol_treasury'
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
    const algorithmicInput = input as StablecoinAlgorithmicCalculationInput
    
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    // Validate algorithmic-specific parameters
    if (algorithmicInput.collateralRatio !== undefined && algorithmicInput.collateralRatio < 0) {
      errors.push('Collateral ratio cannot be negative')
    }

    if (algorithmicInput.expansionRate !== undefined && algorithmicInput.expansionRate < 0) {
      errors.push('Expansion rate cannot be negative')
    }

    if (algorithmicInput.contractionRate !== undefined && algorithmicInput.contractionRate < 0) {
      errors.push('Contraction rate cannot be negative')
    }

    // Add warnings for risk factors
    if (algorithmicInput.algorithmType === 'elastic_supply') {
      warnings.push('Elastic supply mechanisms carry high volatility risk')
    }

    if (algorithmicInput.deathSpiralProtection === false) {
      warnings.push('Death spiral protection disabled - high risk of total failure')
    }

    if (algorithmicInput.emergencyShutdownActive) {
      warnings.push('Emergency shutdown active - limited functionality')
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
    return `algorithmic_stablecoin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
