/**
 * MMF Configuration Parameters
 * 
 * ALL regulatory thresholds, rating scores, and calculation parameters
 * ZERO HARDCODED VALUES in the model - everything configurable here
 * 
 * Can be overridden per calculation or loaded from database
 */

import { Decimal } from 'decimal.js'

export interface MMFCalculationConfig {
  // SEC Rule 2a-7 Compliance Thresholds
  compliance: ComplianceConfig
  
  // Credit Rating Scores (higher = better quality)
  creditRatings: CreditRatingScores
  
  // Stress Testing Parameters
  stressTesting: StressTestConfig
  
  // Imputation Defaults
  imputation: ImputationConfig
  
  // Trend Analysis Parameters
  trendAnalysis: TrendAnalysisConfig
  
  // Data Quality Assessment
  dataQuality: DataQualityConfig
  
  // Interest Rate Sensitivity
  interestRateSensitivity: InterestRateSensitivityConfig
}

export interface ComplianceConfig {
  // WAM (Weighted Average Maturity) limits by fund type
  wamLimits: {
    government: number      // days
    prime: number           // days
    retail: number          // days
    municipal: number       // days
    institutional: number   // days
    default: number         // days
  }
  
  // WAL (Weighted Average Life) limits by fund type
  walLimits: {
    government: number      // days
    prime: number           // days
    retail: number          // days
    municipal: number       // days
    institutional: number   // days
    default: number         // days
  }
  
  // Liquidity thresholds
  dailyLiquidMinimum: number    // percentage (e.g., 25)
  weeklyLiquidMinimum: number   // percentage (e.g., 50)
  
  // Breaking the buck threshold
  breakingBuckThreshold: Decimal  // e.g., 0.995
  
  // Concentration limits
  maxIssuerConcentration: number  // percentage (e.g., 5)
  maxSecondTierPercentage: number // percentage (e.g., 5 for prime MMFs)
  
  // Government MMF specific
  minGovernmentSecuritiesPercentage: number  // percentage (e.g., 99.5)
}

export interface CreditRatingScores {
  // Short-term ratings
  shortTerm: {
    'A-1+': number
    'A-1': number
    'A-2': number
    'A-3': number
    'P-1': number
    'P-2': number
    'P-3': number
    'F-1+': number
    'F-1': number
    'F-2': number
    'F-3': number
  }
  
  // Long-term ratings
  longTerm: {
    'AAA': number
    'AA+': number
    'AA': number
    'AA-': number
    'A+': number
    'A': number
    'A-': number
    'BBB+': number
    'BBB': number
    'BBB-': number
  }
  
  // Default score for unrated
  unrated: number
  
  // Tier 1 ratings (highest quality)
  tier1Ratings: string[]
  
  // Tier 2 ratings (second tier)
  tier2Ratings: string[]
}

export interface StressTestConfig {
  // Rate shock scenarios (in basis points)
  rateShockBps: number  // e.g., 100 for +100bps
  
  // Liquidity stress - redemption percentages to test
  redemptionTests: {
    low: number   // e.g., 10%
    high: number  // e.g., 20%
  }
  
  // Assumed daily redemption rate for buffer calculation
  stressedDailyRedemptionRate: number  // e.g., 0.02 (2%)
}

export interface ImputationConfig {
  // Default days to maturity when unable to calculate
  defaultDaysToMaturity: number  // e.g., 30
  
  // VRDN effective maturity cap (use reset date)
  vrdnMaxEffectiveMaturity: number  // e.g., 7 days
  
  // Duration adjustment factor for short-term securities
  durationAdjustmentFactor: number  // e.g., 0.95
}

export interface TrendAnalysisConfig {
  // Minimum days of history required for trend analysis
  minHistoryDays: number  // e.g., 7
  
  // Days to analyze for trends
  trendWindowDays: number  // e.g., 30
  
  // Minimum percentage change to be considered significant
  significantChangeThreshold: number  // e.g., 5%
}

export interface DataQualityConfig {
  // Scoring weights (must sum to 100)
  weights: {
    holdings: number         // e.g., 30 points
    navHistory: number       // e.g., 30 points
    liquidityData: number    // e.g., 20 points
    productData: number      // e.g., 20 points
  }
  
  // Minimum NAV history for full points
  minNavHistoryForFullPoints: number  // e.g., 30 days
  
  // Minimum NAV history for partial points
  minNavHistoryForPartialPoints: number  // e.g., 7 days
  
  // Penalty per imputation
  imputationPenalty: number  // e.g., 2 points
  maxImputationPenalty: number  // e.g., 10 points
  
  // Thresholds for quality ratings
  excellentThreshold: number  // e.g., 85
  goodThreshold: number       // e.g., 70
  fairThreshold: number       // e.g., 50
  // Below fair = poor
}

export interface InterestRateSensitivityConfig {
  // Duration adjustment factor for MMF (short-term) securities
  durationAdjustmentFactor: number  // e.g., 0.95
  
  // Convexity calculation method
  convexityMethod: 'simple' | 'advanced'  // 'simple' = Duration² + Duration
}

/**
 * DEFAULT CONFIGURATION
 * Based on SEC Rule 2a-7 and industry standards
 */
export const DEFAULT_MMF_CONFIG: MMFCalculationConfig = {
  compliance: {
    wamLimits: {
      government: 60,
      prime: 60,
      retail: 60,
      municipal: 60,
      institutional: 60,
      default: 60
    },
    walLimits: {
      government: 120,
      prime: 120,
      retail: 120,
      municipal: 120,
      institutional: 120,
      default: 120
    },
    dailyLiquidMinimum: 25,
    weeklyLiquidMinimum: 50,
    breakingBuckThreshold: new Decimal(0.995),
    maxIssuerConcentration: 5,
    maxSecondTierPercentage: 5,
    minGovernmentSecuritiesPercentage: 99.5
  },
  
  creditRatings: {
    shortTerm: {
      'A-1+': 100,
      'A-1': 95,
      'A-2': 90,
      'A-3': 85,
      'P-1': 100,
      'P-2': 90,
      'P-3': 80,
      'F-1+': 100,
      'F-1': 95,
      'F-2': 90,
      'F-3': 85
    },
    longTerm: {
      'AAA': 100,
      'AA+': 98,
      'AA': 96,
      'AA-': 94,
      'A+': 92,
      'A': 90,
      'A-': 88,
      'BBB+': 85,
      'BBB': 82,
      'BBB-': 80
    },
    unrated: 70,
    tier1Ratings: ['A-1+', 'A-1', 'P-1', 'F-1+', 'F-1', 'AAA', 'AA+', 'AA', 'AA-'],
    tier2Ratings: ['A-2', 'P-2', 'F-2', 'A+', 'A', 'A-']
  },
  
  stressTesting: {
    rateShockBps: 100,
    redemptionTests: {
      low: 10,
      high: 20
    },
    stressedDailyRedemptionRate: 0.02
  },
  
  imputation: {
    defaultDaysToMaturity: 30,
    vrdnMaxEffectiveMaturity: 7,
    durationAdjustmentFactor: 0.95
  },
  
  trendAnalysis: {
    minHistoryDays: 7,
    trendWindowDays: 30,
    significantChangeThreshold: 5
  },
  
  dataQuality: {
    weights: {
      holdings: 30,
      navHistory: 30,
      liquidityData: 20,
      productData: 20
    },
    minNavHistoryForFullPoints: 30,
    minNavHistoryForPartialPoints: 7,
    imputationPenalty: 2,
    maxImputationPenalty: 10,
    excellentThreshold: 85,
    goodThreshold: 70,
    fairThreshold: 50
  },
  
  interestRateSensitivity: {
    durationAdjustmentFactor: 0.95,
    convexityMethod: 'simple'
  }
}

/**
 * Configuration Builder
 * Allows partial overrides of default config
 */
export function buildMMFConfig(overrides?: Partial<MMFCalculationConfig>): MMFCalculationConfig {
  if (!overrides) return DEFAULT_MMF_CONFIG
  
  return {
    compliance: { ...DEFAULT_MMF_CONFIG.compliance, ...overrides.compliance },
    creditRatings: {
      shortTerm: { ...DEFAULT_MMF_CONFIG.creditRatings.shortTerm, ...overrides.creditRatings?.shortTerm },
      longTerm: { ...DEFAULT_MMF_CONFIG.creditRatings.longTerm, ...overrides.creditRatings?.longTerm },
      unrated: overrides.creditRatings?.unrated ?? DEFAULT_MMF_CONFIG.creditRatings.unrated,
      tier1Ratings: overrides.creditRatings?.tier1Ratings ?? DEFAULT_MMF_CONFIG.creditRatings.tier1Ratings,
      tier2Ratings: overrides.creditRatings?.tier2Ratings ?? DEFAULT_MMF_CONFIG.creditRatings.tier2Ratings
    },
    stressTesting: { ...DEFAULT_MMF_CONFIG.stressTesting, ...overrides.stressTesting },
    imputation: { ...DEFAULT_MMF_CONFIG.imputation, ...overrides.imputation },
    trendAnalysis: { ...DEFAULT_MMF_CONFIG.trendAnalysis, ...overrides.trendAnalysis },
    dataQuality: {
      weights: { ...DEFAULT_MMF_CONFIG.dataQuality.weights, ...overrides.dataQuality?.weights },
      minNavHistoryForFullPoints: overrides.dataQuality?.minNavHistoryForFullPoints ?? DEFAULT_MMF_CONFIG.dataQuality.minNavHistoryForFullPoints,
      minNavHistoryForPartialPoints: overrides.dataQuality?.minNavHistoryForPartialPoints ?? DEFAULT_MMF_CONFIG.dataQuality.minNavHistoryForPartialPoints,
      imputationPenalty: overrides.dataQuality?.imputationPenalty ?? DEFAULT_MMF_CONFIG.dataQuality.imputationPenalty,
      maxImputationPenalty: overrides.dataQuality?.maxImputationPenalty ?? DEFAULT_MMF_CONFIG.dataQuality.maxImputationPenalty,
      excellentThreshold: overrides.dataQuality?.excellentThreshold ?? DEFAULT_MMF_CONFIG.dataQuality.excellentThreshold,
      goodThreshold: overrides.dataQuality?.goodThreshold ?? DEFAULT_MMF_CONFIG.dataQuality.goodThreshold,
      fairThreshold: overrides.dataQuality?.fairThreshold ?? DEFAULT_MMF_CONFIG.dataQuality.fairThreshold
    },
    interestRateSensitivity: { ...DEFAULT_MMF_CONFIG.interestRateSensitivity, ...overrides.interestRateSensitivity }
  }
}
