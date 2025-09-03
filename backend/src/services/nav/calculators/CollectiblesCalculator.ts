/**
 * CollectiblesCalculator - NAV calculation for collectibles and alternative assets
 * 
 * Handles:
 * - Art and collectibles valuation using auction data and market comparables
 * - Authentication and provenance verification impact on value
 * - Market liquidity and transaction cost modeling
 * - Insurance coverage and storage cost considerations
 * - Condition assessment and depreciation factors
 * - Rarity and scarcity premiums
 * - Market sentiment and trend analysis
 * - Authentication risk and fraud prevention
 * 
 * Supports collectibles from collectibles_products table
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

export interface CollectiblesCalculationInput extends CalculationInput {
  // Collectibles-specific parameters
  assetId?: string
  assetType?: string
  description?: string
  acquisitionDate?: Date
  purchasePrice?: number
  currentValue?: number
  condition?: string
  location?: string
  owner?: string
  insuranceDetails?: number
  appraisalDate?: Date
  saleDate?: Date
  salePrice?: number
  authenticity?: AuthenticityDetails
  provenance?: ProvenanceDetails
  marketData?: CollectiblesMarketData
  storageRequirements?: StorageRequirements
}

export interface AuthenticityDetails {
  certified: boolean
  certificationAuthority?: string
  certificationDate?: Date
  authenticationMethods?: string[]
  authenticityScore: number // 0-100 confidence score
  fraudRisk: number // 0-100 risk score
}

export interface ProvenanceDetails {
  documented: boolean
  documentationQuality: number // 0-100 quality score
  ownershipHistory: OwnershipRecord[]
  exhibitions?: Exhibition[]
  publications?: Publication[]
  provenanceGaps: boolean
  gapDetails?: string
}

export interface OwnershipRecord {
  owner: string
  acquisitionDate?: Date
  saleDate?: Date
  price?: number
  method: string // 'auction', 'private_sale', 'gift', 'inheritance'
  verified: boolean
}

export interface Exhibition {
  venue: string
  title: string
  date: Date
  significance: number // 0-100 significance score
}

export interface Publication {
  title: string
  author: string
  date: Date
  type: string // 'catalogue_raisonne', 'monograph', 'journal', 'newspaper'
  significance: number // 0-100 significance score
}

export interface CollectiblesMarketData extends PriceData {
  auctionResults: AuctionResult[]
  marketTrend: number // -100 to +100, negative = declining, positive = rising
  liquidity: number // 0-100 liquidity score
  volatility: number // Historical price volatility
  seasonality: number // Seasonal price variation
  demand: number // 0-100 demand score
  supply: number // 0-100 supply score
  investmentGrade: boolean
}

export interface AuctionResult {
  date: Date
  auctionHouse: string
  lotNumber: string
  hammerPrice: number
  estimateLow: number
  estimateHigh: number
  currency: string
  premium: number // Buyer's premium percentage
  similarity: number // 0-100 similarity to subject asset
}

export interface StorageRequirements {
  climateControlled: boolean
  securityLevel: number // 1-5 security level
  insuranceRequired: boolean
  specialHandling: boolean
  monthlyCost: number
  location: string
  accessibility: number // 0-100 accessibility score
}

export interface ValuationMetrics {
  baseValue: number
  authenticityAdjustment: number
  provenanceAdjustment: number
  conditionAdjustment: number
  marketTrendAdjustment: number
  liquidityDiscount: number
  insuranceValue: number
  transactionCosts: number
  storageValue: number
}

export interface RiskAssessment {
  authenticityRisk: number
  damageRisk: number
  theftRisk: number
  marketRisk: number
  liquidityRisk: number
  storageRisk: number
  legalRisk: number
  overallRisk: number
}

export class CollectiblesCalculator extends BaseCalculator {
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
    return [AssetType.COLLECTIBLES]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const collectiblesInput = input as CollectiblesCalculationInput
      
      // Get collectibles product details from database
      const productDetails = await this.getCollectiblesProductDetails(collectiblesInput)
      
      // Fetch current market data and comparable sales
      const marketData = await this.fetchCollectiblesMarketData(collectiblesInput, productDetails)
      
      // Assess authenticity and provenance
      const authenticityAssessment = await this.assessAuthenticity(collectiblesInput, productDetails)
      const provenanceAssessment = await this.assessProvenance(collectiblesInput, productDetails)
      
      // Calculate base value from market data
      const baseValuation = await this.calculateBaseValuation(collectiblesInput, marketData)
      
      // Apply authenticity and provenance adjustments
      const adjustedValuation = await this.applyQualityAdjustments(
        baseValuation, 
        authenticityAssessment, 
        provenanceAssessment,
        productDetails
      )
      
      // Calculate condition and depreciation impacts
      const conditionAdjustment = await this.calculateConditionAdjustment(collectiblesInput, productDetails)
      
      // Apply market trend and liquidity adjustments
      const marketAdjustments = await this.calculateMarketAdjustments(collectiblesInput, marketData)
      
      // Calculate storage and insurance costs
      const costs = await this.calculateOwnershipCosts(collectiblesInput, productDetails)
      
      // Perform risk assessment
      const riskAssessment = await this.assessCollectiblesRisks(collectiblesInput, productDetails, marketData)
      
      // Calculate final net asset value
      const finalValue = adjustedValuation
        .plus(conditionAdjustment)
        .plus(marketAdjustments.trendAdjustment)
        .minus(marketAdjustments.liquidityDiscount)
        .minus(costs.totalAnnualCosts)
      
      // Build detailed valuation metrics
      const valuationMetrics: ValuationMetrics = {
        baseValue: this.toNumber(baseValuation),
        authenticityAdjustment: this.toNumber(authenticityAssessment.valueImpact),
        provenanceAdjustment: this.toNumber(provenanceAssessment.valueImpact),
        conditionAdjustment: this.toNumber(conditionAdjustment),
        marketTrendAdjustment: this.toNumber(marketAdjustments.trendAdjustment),
        liquidityDiscount: this.toNumber(marketAdjustments.liquidityDiscount),
        insuranceValue: this.toNumber(costs.insuranceCosts),
        transactionCosts: this.toNumber(costs.transactionCosts),
        storageValue: this.toNumber(costs.storageCosts)
      }
      
      // Build calculation result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `collectible_${productDetails.assetId}`,
        productType: AssetType.COLLECTIBLES,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(finalValue.plus(costs.totalAnnualCosts)),
        totalLiabilities: this.toNumber(costs.totalAnnualCosts),
        netAssets: this.toNumber(finalValue),
        navValue: this.toNumber(finalValue),
        navPerShare: input.sharesOutstanding ? 
          this.toNumber(finalValue.div(this.decimal(input.sharesOutstanding))) : 
          undefined,
        currency: input.targetCurrency || marketData.currency || 'USD',
        pricingSources: {
          baseValuation: {
            price: this.toNumber(baseValuation),
            currency: marketData.currency,
            asOf: marketData.asOf,
            source: marketData.source
          },
          marketComparables: {
            price: marketData.auctionResults.length > 0 ? marketData.auctionResults[0]!.hammerPrice : 0,
            currency: marketData.currency,
            asOf: marketData.asOf,
            source: 'auction_data'
          },
          appraisalValue: {
            price: productDetails.currentValue || 0,
            currency: marketData.currency,
            asOf: productDetails.appraisalDate || marketData.asOf,
            source: 'professional_appraisal'
          }
        },
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED,
        metadata: {
          valuationMetrics,
          riskAssessment,
          authenticityAssessment,
          provenanceAssessment,
          marketData: {
            trend: marketData.marketTrend,
            liquidity: marketData.liquidity,
            volatility: marketData.volatility,
            comparableSales: marketData.auctionResults.length
          },
          qualityFactors: {
            condition: productDetails.condition,
            authenticity: authenticityAssessment.confidence,
            provenance: provenanceAssessment.completeness,
            rarity: await this.calculateRarityScore(collectiblesInput, productDetails)
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
        error: error instanceof Error ? error.message : 'Unknown collectibles calculation error',
        code: 'COLLECTIBLES_CALCULATION_FAILED'
      }
    }
  }

  // ==================== COLLECTIBLES-SPECIFIC METHODS ====================

  /**
   * Fetches collectibles product details from the database
   */
  private async getCollectiblesProductDetails(input: CollectiblesCalculationInput): Promise<any> {
    // Mock implementation - replace with actual database query
    return {
      id: input.assetId,
      assetId: input.assetId || 'COLLECTIBLE_001',
      assetType: input.assetType || 'fine_art',
      description: input.description || 'Pablo Picasso - Les Femmes d\'Alger (Version \'O\')',
      acquisitionDate: input.acquisitionDate || new Date('2015-05-11'),
      purchasePrice: input.purchasePrice || 179365000,
      currentValue: input.currentValue || 200000000,
      condition: input.condition || 'excellent',
      location: input.location || 'Private Collection, New York',
      owner: input.owner || 'Anonymous Collector',
      insuranceDetails: input.insuranceDetails || 220000000,
      appraisalDate: input.appraisalDate || new Date('2024-01-01'),
      saleDate: input.saleDate,
      salePrice: input.salePrice,
      status: 'held',
      currency: 'USD',
      category: 'painting',
      artist: 'Pablo Picasso',
      period: 'Cubist Period',
      medium: 'Oil on canvas',
      dimensions: '114 x 146.4 cm',
      yearCreated: 1955,
      edition: '1 of 1',
      rarity: 'unique'
    }
  }

  /**
   * Fetches market data and comparable sales for the collectible
   */
  private async fetchCollectiblesMarketData(
    input: CollectiblesCalculationInput, 
    productDetails: any
  ): Promise<CollectiblesMarketData> {
    // Mock implementation - replace with actual market data service
    const auctionResults: AuctionResult[] = [
      {
        date: new Date('2024-05-15'),
        auctionHouse: 'Christie\'s',
        lotNumber: '8B',
        hammerPrice: 195000000,
        estimateLow: 150000000,
        estimateHigh: 200000000,
        currency: 'USD',
        premium: 0.125,
        similarity: 85
      },
      {
        date: new Date('2023-11-10'),
        auctionHouse: 'Sotheby\'s',
        lotNumber: '15A',
        hammerPrice: 185000000,
        estimateLow: 140000000,
        estimateHigh: 180000000,
        currency: 'USD',
        premium: 0.12,
        similarity: 78
      }
    ]

    return {
      price: 198000000, // Current estimated market value
      currency: 'USD',
      asOf: input.valuationDate || new Date(),
      source: MarketDataProvider.MANUAL_OVERRIDE,
      auctionResults,
      marketTrend: 15, // 15% positive trend
      liquidity: 65, // Moderate liquidity for high-end art
      volatility: 0.25, // 25% volatility
      seasonality: 0.08, // 8% seasonal variation
      demand: 85, // High demand
      supply: 25, // Low supply
      investmentGrade: true
    }
  }

  /**
   * Assesses authenticity and certification status
   */
  private async assessAuthenticity(
    input: CollectiblesCalculationInput,
    productDetails: any
  ): Promise<{ confidence: number; valueImpact: Decimal; risks: string[] }> {
    // Mock assessment - in practice would integrate with authentication services
    const hasAuthentication = productDetails.category === 'painting'
    const confidence = hasAuthentication ? 95 : 60
    const baseValue = this.decimal(productDetails.currentValue || 0)
    
    // Authentication significantly impacts value
    let impactPercent = 0
    if (confidence >= 95) impactPercent = 0.1 // 10% premium for strong authentication
    else if (confidence >= 80) impactPercent = 0.0 // No adjustment
    else if (confidence >= 60) impactPercent = -0.15 // 15% discount
    else impactPercent = -0.35 // 35% discount for poor authentication
    
    const valueImpact = baseValue.times(this.decimal(impactPercent))
    
    const risks: string[] = []
    if (confidence < 90) risks.push('Authentication uncertainty')
    if (confidence < 70) risks.push('Potential attribution issues')
    if (confidence < 50) risks.push('Significant authenticity risk')
    
    return { confidence, valueImpact, risks }
  }

  /**
   * Assesses provenance documentation quality
   */
  private async assessProvenance(
    input: CollectiblesCalculationInput,
    productDetails: any
  ): Promise<{ completeness: number; valueImpact: Decimal; gaps: string[] }> {
    // Mock assessment - would integrate with provenance databases
    const hasGoodProvenance = productDetails.artist === 'Pablo Picasso'
    const completeness = hasGoodProvenance ? 88 : 45
    const baseValue = this.decimal(productDetails.currentValue || 0)
    
    // Provenance affects value and marketability
    let impactPercent = 0
    if (completeness >= 85) impactPercent = 0.05 // 5% premium
    else if (completeness >= 70) impactPercent = 0.0 // No adjustment
    else if (completeness >= 50) impactPercent = -0.1 // 10% discount
    else impactPercent = -0.25 // 25% discount for poor provenance
    
    const valueImpact = baseValue.times(this.decimal(impactPercent))
    
    const gaps: string[] = []
    if (completeness < 80) gaps.push('Missing early ownership records')
    if (completeness < 60) gaps.push('Incomplete exhibition history')
    if (completeness < 40) gaps.push('No documented publications')
    
    return { completeness, valueImpact, gaps }
  }

  /**
   * Calculates base valuation from market comparables
   */
  private async calculateBaseValuation(
    input: CollectiblesCalculationInput,
    marketData: CollectiblesMarketData
  ): Promise<Decimal> {
    if (marketData.auctionResults.length === 0) {
      // Fall back to appraised value if no comparables
      return this.decimal(input.currentValue || 0)
    }
    
    // Weight comparables by similarity and recency
    let weightedSum = this.decimal(0)
    let totalWeight = this.decimal(0)
    
    for (const result of marketData.auctionResults) {
      const ageInMonths = (Date.now() - result.date.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
      const ageWeight = Math.exp(-ageInMonths / 12) // Exponential decay over 12 months
      const similarityWeight = result.similarity / 100
      const weight = ageWeight * similarityWeight
      
      const adjustedPrice = result.hammerPrice * (1 + result.premium)
      
      weightedSum = weightedSum.plus(this.decimal(adjustedPrice * weight))
      totalWeight = totalWeight.plus(this.decimal(weight))
    }
    
    if (totalWeight.isZero()) {
      return this.decimal(input.currentValue || 0)
    }
    
    return weightedSum.div(totalWeight)
  }

  /**
   * Applies quality adjustments for authenticity, provenance, etc.
   */
  private async applyQualityAdjustments(
    baseValue: Decimal,
    authenticityAssessment: { confidence: number; valueImpact: Decimal; risks: string[] },
    provenanceAssessment: { completeness: number; valueImpact: Decimal; gaps: string[] },
    productDetails: any
  ): Promise<Decimal> {
    return baseValue
      .plus(authenticityAssessment.valueImpact)
      .plus(provenanceAssessment.valueImpact)
  }

  /**
   * Calculates condition-based value adjustments
   */
  private async calculateConditionAdjustment(
    input: CollectiblesCalculationInput,
    productDetails: any
  ): Promise<Decimal> {
    const baseValue = this.decimal(productDetails.currentValue || 0)
    const condition = productDetails.condition?.toLowerCase() || 'good'
    
    let conditionMultiplier = 0
    switch (condition) {
      case 'mint': conditionMultiplier = 0.15; break
      case 'excellent': conditionMultiplier = 0.05; break
      case 'very good': conditionMultiplier = 0.0; break
      case 'good': conditionMultiplier = -0.08; break
      case 'fair': conditionMultiplier = -0.20; break
      case 'poor': conditionMultiplier = -0.40; break
      default: conditionMultiplier = 0.0
    }
    
    return baseValue.times(this.decimal(conditionMultiplier))
  }

  /**
   * Calculates market trend and liquidity adjustments
   */
  private async calculateMarketAdjustments(
    input: CollectiblesCalculationInput,
    marketData: CollectiblesMarketData
  ): Promise<{ trendAdjustment: Decimal; liquidityDiscount: Decimal }> {
    const baseValue = this.decimal(marketData.price)
    
    // Market trend adjustment (capped at ±10%)
    const trendPercent = Math.max(-0.1, Math.min(0.1, marketData.marketTrend / 100))
    const trendAdjustment = baseValue.times(this.decimal(trendPercent))
    
    // Liquidity discount based on market liquidity
    let liquidityDiscountPercent = 0
    if (marketData.liquidity >= 80) liquidityDiscountPercent = 0.02 // 2% discount
    else if (marketData.liquidity >= 60) liquidityDiscountPercent = 0.05 // 5% discount
    else if (marketData.liquidity >= 40) liquidityDiscountPercent = 0.10 // 10% discount
    else liquidityDiscountPercent = 0.20 // 20% discount for illiquid assets
    
    const liquidityDiscount = baseValue.times(this.decimal(liquidityDiscountPercent))
    
    return { trendAdjustment, liquidityDiscount }
  }

  /**
   * Calculates annual ownership costs
   */
  private async calculateOwnershipCosts(
    input: CollectiblesCalculationInput,
    productDetails: any
  ): Promise<{ 
    storageCosts: Decimal; 
    insuranceCosts: Decimal; 
    transactionCosts: Decimal;
    totalAnnualCosts: Decimal 
  }> {
    const baseValue = this.decimal(productDetails.currentValue || 0)
    
    // Storage costs (typically 0.5-2% of value annually)
    const storageCosts = baseValue.times(this.decimal(0.01))
    
    // Insurance costs (typically 0.1-0.5% of value annually)
    const insuranceCosts = baseValue.times(this.decimal(0.003))
    
    // Transaction costs for potential sale (typically 10-25%)
    const transactionCosts = baseValue.times(this.decimal(0.0)) // Not applied annually
    
    const totalAnnualCosts = storageCosts.plus(insuranceCosts)
    
    return { storageCosts, insuranceCosts, transactionCosts, totalAnnualCosts }
  }

  /**
   * Assesses various risks associated with the collectible
   */
  private async assessCollectiblesRisks(
    input: CollectiblesCalculationInput,
    productDetails: any,
    marketData: CollectiblesMarketData
  ): Promise<RiskAssessment> {
    return {
      authenticityRisk: productDetails.category === 'painting' ? 15 : 35,
      damageRisk: productDetails.condition === 'excellent' ? 10 : 25,
      theftRisk: productDetails.insuranceDetails > 50000000 ? 20 : 10,
      marketRisk: marketData.volatility * 100,
      liquidityRisk: 100 - marketData.liquidity,
      storageRisk: productDetails.location?.includes('Private') ? 15 : 30,
      legalRisk: 10, // Base legal risk for all collectibles
      overallRisk: 25 // Weighted average
    }
  }

  /**
   * Calculates rarity score based on uniqueness and availability
   */
  private async calculateRarityScore(
    input: CollectiblesCalculationInput,
    productDetails: any
  ): Promise<number> {
    let rarityScore = 50 // Base score
    
    // Artist significance
    if (productDetails.artist === 'Pablo Picasso') rarityScore += 20
    
    // Unique vs edition
    if (productDetails.rarity === 'unique') rarityScore += 25
    else if (productDetails.edition?.includes('1 of 1')) rarityScore += 25
    
    // Historical significance
    if (productDetails.yearCreated && productDetails.yearCreated < 1960) rarityScore += 10
    
    // Market supply
    rarityScore = Math.min(100, Math.max(0, rarityScore))
    
    return rarityScore
  }

  /**
   * Generates unique run ID for the calculation
   */
  protected override generateRunId(): string {
    return `collectibles_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
