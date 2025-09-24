/**
 * CommoditiesCalculatorIntegration - Enhanced integration with financial models
 * 
 * This file demonstrates how to properly integrate CommodityModels and FuturesCurveModels
 * with the CommoditiesCalculator for institutional-grade NAV calculation
 */

import { Decimal } from 'decimal.js'
import { commodityModels } from '../models/CommodityModels'
import { futuresCurveModels } from '../models/market/FuturesCurveModels'
import { 
  FuturesContract, 
  TermStructureParams, 
  CurveAnalysisResult,
  CalendarSpread
} from '../models/market/FuturesCurveModels'
import {
  SeasonalityParams as CommoditySeasonalityParams,
  MeanReversionParams as CommodityMeanReversionParams,
  JumpDiffusionParams as CommodityJumpDiffusionParams
} from '../models/CommodityModels'
import {
  CommodityCalculationInput,
  CommodityPriceData
} from './CommoditiesCalculator'

/**
 * Enhanced price data fetching using futures curve models
 */
export async function fetchEnhancedCommodityPriceData(
  input: CommodityCalculationInput,
  productDetails: any,
  historicalPrices?: number[]
): Promise<CommodityPriceData> {
  const instrumentKey = `${productDetails.exchange}_${productDetails.commodityId}_${productDetails.gradeQuality}`
  
  // Get spot price (from database or market data service)
  const spotPrice = new Decimal(productDetails.currentPrice || 75.00) // Example
  const storageRate = new Decimal(productDetails.storageDeliveryCosts || 2.50).div(100) // Convert to rate
  const riskFreeRate = new Decimal(0.045) // 4.5% risk-free rate
  
  // Create futures contracts array for analysis
  const contracts: FuturesContract[] = []
  const deliveryMonths = productDetails.deliveryMonths || ['2024-03', '2024-06', '2024-09', '2024-12']
  
  for (let i = 0; i < deliveryMonths.length; i++) {
    const month = deliveryMonths[i]
    const maturityDate = new Date(month + '-15') // Mid-month delivery
    
    // Calculate theoretical futures price using commodity models
    const futuresCurveResult = commodityModels.calculateFuturesCurve({
      spotPrice,
      storageRate,
      convenienceYield: new Decimal(0.03), // Initial estimate
      riskFreeRate,
      timeToMaturity: new Decimal(i + 1).div(4) // Quarterly contracts
    })
    
    contracts.push({
      contractMonth: month!,
      maturityDate,
      price: futuresCurveResult.futuresPrice,
      openInterest: new Decimal(100000 * (4 - i)), // Decreasing open interest
      volume: new Decimal(50000 * (4 - i)),
      settlementType: productDetails.commodityType === 'energy' ? 'physical' : 'cash'
    })
  }
  
  // Analyze term structure using FuturesCurveModels
  const termStructureAnalysis = futuresCurveModels.analyzeTermStructure({
    spotPrice,
    contracts,
    storageRate,
    riskFreeRate,
    dividendYield: undefined // Not applicable for commodities
  })
  
  // Apply mean reversion model if historical prices available
  let adjustedSpotPrice = spotPrice
  if (historicalPrices && historicalPrices.length > 10) {
    const meanPrice = historicalPrices.reduce((sum, p) => sum + p, 0) / historicalPrices.length
    const volatility = calculateHistoricalVolatility(historicalPrices)
    
    const meanReversionResult = commodityModels.meanReversionModel({
      currentPrice: spotPrice,
      longTermMean: new Decimal(meanPrice),
      meanReversionSpeed: new Decimal(0.5), // Kappa
      volatility: new Decimal(volatility),
      timeHorizon: new Decimal(0.25) // 3 months
    })
    
    adjustedSpotPrice = meanReversionResult
  }
  
  // Apply seasonality adjustments
  const seasonalAdjustment = commodityModels.applySeasonalityAdjustment({
    basePrice: adjustedSpotPrice,
    month: new Date().getMonth() + 1,
    commodity: mapCommodityTypeToSeasonal(productDetails.commodityType)
  })
  
  // Calculate convenience yield from futures curve
  const convenienceYieldResult = commodityModels.calculateConvenienceYield(
    adjustedSpotPrice,
    contracts[0]?.price || adjustedSpotPrice,
    storageRate,
    riskFreeRate,
    new Decimal(0.25) // 3 months to first contract
  )
  
  // Prepare comprehensive price data
  return {
    price: seasonalAdjustment.toNumber(),
    spotPrice: adjustedSpotPrice.toNumber(),
    futuresPrice: contracts[0]?.price.toNumber() || adjustedSpotPrice.toNumber(),
    currency: productDetails.currency || 'USD',
    source: 'integrated_models',
    asOf: input.valuationDate,
    contangoBackwardation: termStructureAnalysis.averageBasis.toNumber(),
    volatility: calculateImpliedVolatility(termStructureAnalysis),
    exchange: productDetails.exchange,
    deliveryMonth: contracts[0]?.contractMonth || '',
    openInterest: contracts[0]?.openInterest.toNumber() || 0,
    volume: contracts[0]?.volume.toNumber() || 0,
    storageRate: storageRate.toNumber(),
    carryingCosts: productDetails.storageDeliveryCosts || 0,
    convenienceYield: convenienceYieldResult.convenienceYield.toNumber(),
    qualityPremiumDiscount: 0 // Will be set by quality adjustment
  }
}

/**
 * Calculate comprehensive commodity value using all models
 */
export function calculateComprehensiveCommodityValue(
  input: CommodityCalculationInput,
  priceData: CommodityPriceData,
  productDetails: any
): Decimal {
  const quantity = new Decimal(input.quantity || 1000)
  const spotPrice = new Decimal(priceData.spotPrice)
  
  // Use CommodityModels for comprehensive valuation
  const valuationResult = commodityModels.calculateComprehensiveValue(
    spotPrice,
    quantity,
    {
      futuresPosition: input.contractExpirationDate ? {
        price: new Decimal(priceData.futuresPrice),
        quantity: quantity,
        maturity: new Decimal(
          (input.contractExpirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365)
        )
      } : undefined,
      storageRate: new Decimal(priceData.storageRate),
      convenienceYield: new Decimal(priceData.convenienceYield),
      riskFreeRate: new Decimal(0.045),
      seasonalAdjustment: {
        basePrice: spotPrice,
        month: new Date().getMonth() + 1,
        commodity: mapCommodityTypeToSeasonal(productDetails.commodityType)
      },
      meanReversion: input.historicalPrices ? {
        currentPrice: spotPrice,
        longTermMean: new Decimal(
          input.historicalPrices.reduce((sum, p) => sum + p, 0) / input.historicalPrices.length
        ),
        meanReversionSpeed: new Decimal(0.5),
        volatility: new Decimal(priceData.volatility),
        timeHorizon: new Decimal(0.25)
      } : undefined
    }
  )
  
  return valuationResult.totalValue
}

/**
 * Calculate optimal roll strategy using futures curve models
 */
export function calculateOptimalRollStrategy(
  contracts: FuturesContract[],
  spotPrice: Decimal,
  storageRate: Decimal
): {
  optimalContract: string
  rollDate: Date
  rollCost: Decimal
  hedgeRatio: Decimal
} {
  const termStructureAnalysis = futuresCurveModels.analyzeTermStructure({
    spotPrice,
    contracts,
    storageRate,
    riskFreeRate: new Decimal(0.045),
    dividendYield: undefined
  })
  
  const rollStrategy = termStructureAnalysis.optimalRollStrategy
  
  // Calculate calendar spreads for roll analysis
  if (contracts.length >= 2) {
    const calendarSpread = futuresCurveModels.calculateCalendarSpread(
      contracts[0]!,
      contracts[1]!,
      spotPrice
    )
    
    // Adjust roll cost based on spread volatility
    const adjustedRollCost = rollStrategy.expectedRollCost
      .times(new Decimal(1).plus(calendarSpread.spreadVolatility))
    
    return {
      optimalContract: rollStrategy.optimalContract,
      rollDate: rollStrategy.rollDate,
      rollCost: adjustedRollCost,
      hedgeRatio: rollStrategy.hedgeRatio
    }
  }
  
  return {
    optimalContract: contracts[0]?.contractMonth || '',
    rollDate: new Date(),
    rollCost: new Decimal(0),
    hedgeRatio: new Decimal(1)
  }
}

/**
 * Apply jump-diffusion model for volatile commodities
 */
export function applyJumpDiffusionPricing(
  currentPrice: Decimal,
  commodityType: string,
  timeHorizon: Decimal
): Decimal {
  // Energy commodities have higher jump risk
  const jumpParams = getJumpParameters(commodityType)
  
  const jumpDiffusionPrice = commodityModels.jumpDiffusionModel({
    currentPrice,
    drift: new Decimal(0.02), // 2% annual drift
    diffusionVol: new Decimal(jumpParams.baseVol),
    jumpIntensity: new Decimal(jumpParams.intensity),
    jumpMean: new Decimal(jumpParams.mean),
    jumpVol: new Decimal(jumpParams.vol),
    time: timeHorizon
  })
  
  return jumpDiffusionPrice
}

/**
 * Calculate commodity VaR using models
 */
export function calculateCommodityVaR(
  portfolioValue: Decimal,
  priceData: CommodityPriceData,
  confidenceLevel: Decimal = new Decimal(0.95),
  timeHorizon: Decimal = new Decimal(1)
): Decimal {
  return commodityModels.calculateCommodityVaR(
    portfolioValue,
    new Decimal(priceData.volatility),
    confidenceLevel,
    timeHorizon
  )
}

// ==================== HELPER FUNCTIONS ====================

function calculateHistoricalVolatility(prices: number[]): number {
  if (prices.length < 2) return 0.3 // Default 30% volatility
  
  const returns: number[] = []
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1]!
    if (prev !== 0) {
      returns.push(Math.log(prices[i]! / prev))
    }
  }
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
  const dailyVol = Math.sqrt(variance)
  
  // Annualize
  return dailyVol * Math.sqrt(252)
}

function calculateImpliedVolatility(termStructure: CurveAnalysisResult): number {
  // Extract average implied volatility from term structure
  const vols = termStructure.volatilityTermStructure
  if (vols.length === 0) return 0.3 // Default
  
  const avgVol = vols.reduce((sum, v) => sum.plus(v), new Decimal(0))
    .div(vols.length)
  
  return avgVol.toNumber()
}

function mapCommodityTypeToSeasonal(commodityType: string): 
  'natural_gas' | 'heating_oil' | 'gasoline' | 'corn' | 'wheat' | 'other' {
  const mapping: Record<string, any> = {
    'energy_gas': 'natural_gas',
    'energy_oil': 'heating_oil',
    'energy_gasoline': 'gasoline',
    'agricultural_corn': 'corn',
    'agricultural_wheat': 'wheat'
  }
  
  return mapping[commodityType] || 'other'
}

function getJumpParameters(commodityType: string): {
  baseVol: number
  intensity: number
  mean: number
  vol: number
} {
  const params: Record<string, any> = {
    energy: {
      baseVol: 0.35,
      intensity: 3, // 3 jumps per year expected
      mean: 0,
      vol: 0.15
    },
    metals: {
      baseVol: 0.25,
      intensity: 1, // 1 jump per year
      mean: 0,
      vol: 0.10
    },
    agricultural: {
      baseVol: 0.30,
      intensity: 2, // 2 jumps per year (weather events)
      mean: -0.02, // Negative bias for crop failures
      vol: 0.20
    }
  }
  
  return params[commodityType] || params.energy
}

/**
 * Detect seasonal patterns in historical data
 */
export function detectSeasonalPatterns(
  historicalData: Array<{
    date: Date
    price: number
  }>,
  commodityType: string
): CommoditySeasonalityParams | undefined {
  if (historicalData.length < 12) return undefined
  
  // Group by month
  const monthlyAverages = new Map<number, number[]>()
  
  for (const data of historicalData) {
    const month = data.date.getMonth() + 1
    if (!monthlyAverages.has(month)) {
      monthlyAverages.set(month, [])
    }
    monthlyAverages.get(month)!.push(data.price)
  }
  
  // Find month with highest average price
  let maxMonth = 1
  let maxAvg = 0
  
  for (const [month, prices] of monthlyAverages) {
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length
    if (avg > maxAvg) {
      maxAvg = avg
      maxMonth = month
    }
  }
  
  // Return seasonality params for peak month
  return {
    basePrice: new Decimal(maxAvg),
    month: maxMonth,
    commodity: mapCommodityTypeToSeasonal(commodityType)
  }
}

export default {
  fetchEnhancedCommodityPriceData,
  calculateComprehensiveCommodityValue,
  calculateOptimalRollStrategy,
  applyJumpDiffusionPricing,
  calculateCommodityVaR,
  detectSeasonalPatterns
}