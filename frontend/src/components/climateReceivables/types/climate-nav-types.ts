/**
 * Climate NAV Valuation Types
 * Consolidates climate-specific terminology from NAV Pricing specification
 * with existing sophisticated business logic implementations
 */

// ============================================================================
// CORE CLIMATE VALUATION TERMINOLOGY
// ============================================================================

/**
 * LCOE (Levelized Cost of Energy) - Industry standard benchmarking
 */
export interface LCOEAnalysis {
  /** Calculated LCOE in $/MWh */
  calculatedLCOE: number;
  /** Industry benchmark LCOE for asset type */
  benchmarkLCOE: number;
  /** Competitiveness percentage vs benchmark */
  competitiveness: number;
  /** Cost advantage/disadvantage in $/MWh */
  costAdvantage: number;
  
  components: {
    /** Initial capital expenditure */
    capitalExpenditure: number;
    /** Annual operational expenses */
    operationalExpenses: number;
    /** Scheduled maintenance costs */
    maintenanceSchedule: MaintenanceCost[];
    /** Component replacement timeline */
    replacementCosts: ReplacementCost[];
    /** End-of-life salvage value */
    endOfLifeValue: number;
    /** Tax credits and incentives */
    taxCredits: TaxCreditStructure;
  };
}

export interface MaintenanceCost {
  year: number;
  cost: number;
  description: string;
  criticality: 'routine' | 'major' | 'overhaul';
}

export interface ReplacementCost {
  year: number;
  cost: number;
  component: string;
  impact: 'minimal' | 'moderate' | 'significant';
}

export interface TaxCreditStructure {
  /** Federal Investment Tax Credit percentage */
  federalITC: number;
  /** State tax credit percentage */
  stateTaxCredit: number;
  /** Depreciation method */
  depreciation: 'MACRS' | 'straight-line' | 'accelerated';
  /** Production Tax Credit if applicable */
  productionTaxCredit?: number;
}

/**
 * Capacity Factor - Actual vs theoretical output ratio
 */
export interface CapacityFactorAnalysis {
  /** Current capacity factor (0-1) */
  currentCapacityFactor: number;
  /** Industry average for asset type */
  industryAverage: number;
  /** Performance ranking vs peers */
  performanceRanking: 'excellent' | 'above-average' | 'average' | 'below-average' | 'poor';
  
  factors: {
    /** Seasonal variation patterns */
    seasonalFactors: number[];
    /** Weather impact on performance */
    weatherImpact: number;
    /** Equipment degradation over time */
    degradationRate: number;
    /** Operational availability */
    availabilityFactor: number;
  };
}

/**
 * PPA (Power Purchase Agreement) - Contract analysis
 */
export interface PPAAnalysis {
  contract: {
    type: 'fixed' | 'escalating' | 'indexed' | 'merchant';
    /** Base rate in $/MWh */
    baseRate: number;
    /** Annual escalation percentage */
    escalationRate: number;
    /** Contract term in years */
    contractTerm: number;
    /** Remaining contract years */
    remainingTerm: number;
  };
  
  counterparty: {
    /** Credit rating of offtaker */
    creditRating: string;
    /** Financial stability assessment */
    creditworthiness: 'excellent' | 'good' | 'fair' | 'poor';
    /** Payment history score */
    paymentHistoryScore: number;
  };
  
  risks: {
    /** Risk of generation curtailment */
    curtailmentRisk: number;
    /** Grid connection and transmission risk */
    transmissionRisk: number;
    /** Counterparty default risk */
    counterpartyRisk: number;
  };
  
  marketComparison: {
    /** Current market rate for comparable contracts */
    marketRate: number;
    /** Premium/discount vs market */
    premiumDiscount: number;
    /** Contract competitiveness assessment */
    competitiveness: 'premium' | 'market' | 'discount';
  };
}

/**
 * Carbon Credit Valuation - Environmental impact monetization
 */
export interface CarbonCreditValuation {
  credits: {
    /** Annual verified credits in tCO2e */
    verifiedCreditsAnnual: number;
    /** Total project lifetime credits */
    totalLifetimeCredits: number;
    /** Current market price per tonne */
    currentPrice: number;
    /** Projected price trajectory */
    priceProjection: number[];
  };
  
  verification: {
    /** Verification standard used */
    standard: 'VCS' | 'CDM' | 'Gold-Standard' | 'CAR' | 'ACR';
    /** Vintage year of credits */
    vintageYear: number;
    /** Permanence guarantee period */
    permanence: number;
    /** Leakage risk percentage */
    leakage: number;
  };
  
  additionality: AdditionalityAssessment;
  
  marketFactors: {
    /** Premium for high-quality credits */
    qualityPremium: number;
    /** Liquidity discount/premium */
    liquidityAdjustment: number;
    /** Voluntary vs compliance market price differential */
    marketSegmentAdjustment: number;
  };
}

/**
 * Additionality Assessment - Beyond business-as-usual requirements
 */
export interface AdditionalityAssessment {
  /** Overall additionality score (0-1) */
  overallScore: number;
  
  tests: {
    /** Financial additionality - needs carbon revenue to be viable */
    financial: {
      passed: boolean;
      evidence: string;
      confidenceLevel: number;
    };
    /** Regulatory additionality - beyond legal requirements */
    regulatory: {
      passed: boolean;
      evidence: string;
      confidenceLevel: number;
    };
    /** Common practice test - not industry standard */
    commonPractice: {
      passed: boolean;
      evidence: string;
      confidenceLevel: number;
    };
    /** Barrier analysis - overcomes implementation barriers */
    barriers: {
      passed: boolean;
      evidence: string;
      confidenceLevel: number;
    };
  };
  
  baseline: {
    /** Business-as-usual emissions scenario */
    baselineEmissions: number;
    /** Project emissions with implementation */
    projectEmissions: number;
    /** Net emissions reduction */
    netReduction: number;
  };
}

// ============================================================================
// INTEGRATED CLIMATE NAV CALCULATION
// ============================================================================

/**
 * Comprehensive Climate NAV Result
 */
export interface ClimateNAVResult {
  /** Asset identifier */
  assetId: string;
  /** Valuation date */
  valuationDate: string;
  /** Methodology used */
  methodology: 'DCF' | 'comparables' | 'cost' | 'hybrid';
  
  /** LCOE benchmarking analysis */
  lcoeAnalysis: LCOEAnalysis;
  /** Capacity factor performance analysis */
  capacityAnalysis: CapacityFactorAnalysis;
  /** PPA contract valuation */
  ppaAnalysis: PPAAnalysis;
  /** Carbon credit market valuation */
  carbonValuation: CarbonCreditValuation;
  
  valuation: {
    /** Base NAV before risk adjustments */
    baseNAV: number;
    /** Risk-adjusted NAV */
    riskAdjustedNAV: number;
    /** Confidence interval bounds */
    confidenceInterval: {
      low: number;   // P10
      high: number;  // P90
    };
  };
  
  riskAdjustments: {
    /** Technology-specific risk discount */
    technologyRisk: number;
    /** Regulatory/policy change risk */
    regulatoryRisk: number;
    /** Power market volatility risk */
    marketRisk: number;
    /** Operational performance risk */
    operationalRisk: number;
  };
  
  recommendations: {
    /** Investment recommendation */
    investment: 'BUY' | 'HOLD' | 'SELL';
    /** Target price range */
    targetPrice: {
      low: number;
      mid: number;
      high: number;
    };
    /** Key value drivers */
    valueDrivers: string[];
    /** Risk mitigation strategies */
    riskMitigation: string[];
  };
}

// ============================================================================
// INTEGRATION WITH EXISTING TYPES
// ============================================================================

/**
 * Enhanced Energy Asset with Climate NAV
 */
export interface ClimateNAVEnergyAsset {
  /** Base energy asset properties */
  assetId: string;
  name: string;
  type: 'solar' | 'wind' | 'hydro' | 'biomass' | 'geothermal';
  location: string;
  capacity: number;
  
  /** Climate-specific valuation metrics */
  climateNAV: ClimateNAVResult;
  
  /** Performance tracking */
  performance: {
    actualCapacityFactor: number;
    currentLCOE: number;
    lastValuation: string;
    nextRevaluation: string;
  };
}

/**
 * Climate Receivable with NAV Enhancement
 */
export interface ClimateNAVReceivable {
  /** Base receivable properties */
  receivableId: string;
  amount: number;
  dueDate: string;
  
  /** Enhanced climate valuation */
  climateValuation: {
    navBasedValue: number;
    discountFromNAV: number;
    discountReason: string;
    confidenceLevel: number;
  };
  
  /** Risk assessment integration */
  riskFactors: {
    productionRisk: number;
    creditRisk: number;
    policyRisk: number;
    climateRisk: number;
  };
}

// ============================================================================
// INDUSTRY BENCHMARKS AND CONSTANTS
// ============================================================================

/**
 * Industry LCOE Benchmarks ($/MWh) - 2024 data
 */
export const CLIMATE_INDUSTRY_BENCHMARKS = {
  lcoe: {
    solar: {
      utility: { min: 28, max: 41, average: 35 },
      distributed: { min: 84, max: 203, average: 144 },
      residential: { min: 137, max: 267, average: 202 }
    },
    wind: {
      onshore: { min: 26, max: 50, average: 38 },
      offshore: { min: 83, max: 140, average: 112 }
    },
    hydro: {
      large: { min: 44, max: 67, average: 56 },
      small: { min: 48, max: 142, average: 95 }
    }
  },
  
  capacityFactors: {
    solar: { min: 0.15, max: 0.25, average: 0.20 },
    wind: { min: 0.25, max: 0.45, average: 0.35 },
    hydro: { min: 0.40, max: 0.60, average: 0.50 }
  },
  
  carbonCredits: {
    VCS: { min: 15, max: 45, average: 30 },
    CDM: { min: 12, max: 35, average: 24 },
    'Gold-Standard': { min: 25, max: 55, average: 40 },
    CAR: { min: 20, max: 50, average: 35 }
  }
} as const;

/**
 * Climate Risk Thresholds
 */
export const CLIMATE_RISK_THRESHOLDS = {
  lcoeCompetitiveness: {
    excellent: 0.85,    // 15%+ better than benchmark
    good: 0.95,         // 5%+ better than benchmark
    market: 1.05,       // Within 5% of benchmark
    poor: 1.15          // 15%+ worse than benchmark
  },
  
  capacityFactor: {
    excellent: 1.15,    // 15%+ above industry average
    good: 1.05,         // 5%+ above industry average
    average: 0.95,      // Within 5% of industry average
    poor: 0.85          // 15%+ below industry average
  },
  
  additionalityScore: {
    high: 0.8,          // Strong additionality case
    medium: 0.6,        // Moderate additionality
    low: 0.4,           // Weak additionality
    questionable: 0.2   // Questionable additionality
  }
} as const;
