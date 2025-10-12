/**
 * Enhanced Climate Payer Risk Assessment Service (Database-Driven)
 * 
 * Calculates risk scores and discount rates using dynamic configuration from database.
 * All credit rating data, thresholds, and parameters are stored in system tables.
 * 
 * Features:
 * - Dynamic credit rating matrix from system_settings table
 * - Real-time market data integration without hardcoded fallbacks
 * - Database-driven risk calculation parameters
 * - Proper error handling with graceful fallback defaults
 * - Warns when database configuration is missing
 * 
 * Integrates with:
 * - Free government APIs (Treasury.gov, FRED, Federal Register)
 * - User uploaded credit and financial data
 * - External market data services
 */

import { supabase } from '@/infrastructure/database/client';
import { EnhancedExternalAPIService } from '@/components/climateReceivables/services/api/enhanced-external-api-service';

// Default credit rating configuration (used as fallback when database is not configured)
const DEFAULT_CREDIT_RATINGS: Record<string, CreditRatingData> = {
  'AAA': { rating: 'AAA', investment_grade: true, default_rate_3yr: 0.002, typical_spread_bps: 50, risk_tier: 'Prime' },
  'AA': { rating: 'AA', investment_grade: true, default_rate_3yr: 0.005, typical_spread_bps: 75, risk_tier: 'Prime' },
  'A': { rating: 'A', investment_grade: true, default_rate_3yr: 0.010, typical_spread_bps: 100, risk_tier: 'Investment Grade' },
  'BBB': { rating: 'BBB', investment_grade: true, default_rate_3yr: 0.025, typical_spread_bps: 150, risk_tier: 'Investment Grade' },
  'BB': { rating: 'BB', investment_grade: false, default_rate_3yr: 0.050, typical_spread_bps: 300, risk_tier: 'Speculative' },
  'B': { rating: 'B', investment_grade: false, default_rate_3yr: 0.100, typical_spread_bps: 500, risk_tier: 'Speculative' },
  'CCC': { rating: 'CCC', investment_grade: false, default_rate_3yr: 0.200, typical_spread_bps: 800, risk_tier: 'High Risk' },
  'CC': { rating: 'CC', investment_grade: false, default_rate_3yr: 0.350, typical_spread_bps: 1200, risk_tier: 'High Risk' },
  'C': { rating: 'C', investment_grade: false, default_rate_3yr: 0.500, typical_spread_bps: 1500, risk_tier: 'Default Risk' },
  'D': { rating: 'D', investment_grade: false, default_rate_3yr: 1.000, typical_spread_bps: 2000, risk_tier: 'Default Risk' }
};

const DEFAULT_PARAMETERS = {
  baseDiscountRate: 1.5,
  maxDiscountRate: 12.0,
  minDiscountRate: 1.0,
  climatePremium: 0.75,
  esgDiscountThreshold: 70,
  esgPremiumThreshold: 30,
  esgDiscountRate: 0.5,
  esgPremiumRate: 1.0,
  healthMultiplierMin: 0.7,
  healthMultiplierMax: 1.5
};

// Flag to track if we've already warned about missing configuration
let hasWarnedAboutMissingConfig = false;

export interface PayerCreditProfile {
  payer_id?: string;
  payer_name?: string;
  credit_rating: string;
  financial_health_score: number;
  payment_history?: any;
  industry_sector?: string;
  esg_score?: number;
}

export interface RiskAssessmentResult {
  risk_score: number;
  discount_rate: number;
  confidence_level: number;
  methodology: string;
  factors_considered: string[];
  manual_override_available: boolean;
  market_adjustments?: MarketAdjustments;
  data_completeness?: 'basic' | 'enhanced' | 'comprehensive';
  user_data_sources?: string[];
  data_quality_score?: number;
}

export interface EnhancedRiskAssessmentResult extends RiskAssessmentResult {
  market_data_snapshot?: MarketDataSnapshot;
  user_credit_data?: UserCreditData | null;
  policy_impact_assessment?: PolicyImpactData[];
  recommendations?: string[];
}

export interface MarketAdjustments {
  treasury_rate_adjustment: number;
  credit_spread_adjustment: number;
  policy_impact_adjustment: number;
  energy_market_adjustment: number;
  total_adjustment: number;
}

export interface MarketDataSnapshot {
  treasury_rates: TreasuryRates | null;
  credit_spreads: CreditSpreads | null;
  energy_prices: EnergyMarketData | null;
  policy_changes: PolicyChange[];
  data_freshness: string;
}

export interface TreasuryRates {
  treasury_1m: number;
  treasury_3m: number;
  treasury_6m: number;
  treasury_1y: number;
  treasury_2y: number;
  treasury_5y: number;
  treasury_10y: number;
  treasury_30y: number;
  last_updated: string;
  source: 'treasury.gov' | 'fred';
}

export interface CreditSpreads {
  // Investment Grade Spreads (AAA → BBB)
  corporate_aaa: number;      // BAMLC0A1CAAA - AAA Corporate spreads
  corporate_aa: number;       // BAMLC0A2CAA - AA Corporate spreads  
  corporate_a: number;        // BAMLC0A3CA - Single-A Corporate spreads
  corporate_bbb: number;      // BAMLC0A4CBBB - BBB Corporate spreads
  
  // High Yield Spreads (BB → CCC)
  high_yield_bb: number;      // BAMLH0A1HYBB - BB High Yield spreads
  high_yield_b: number;       // BAMLH0A2HYB - Single-B High Yield spreads
  high_yield_ccc: number;     // BAMLH0A3HYC - CCC & Lower High Yield spreads
  
  // Aggregate Indices (for backwards compatibility and broad analysis)
  investment_grade: number;   // BAMLC0A0CM - Broad Investment Grade aggregate
  high_yield: number;         // BAMLH0A0HYM2 - Broad High Yield aggregate
  
  last_updated: string;
  source: 'fred' | 'yahoo_finance';
}

export interface EnergyMarketData {
  electricity_price_mwh: number;
  renewable_energy_index: number;
  carbon_credit_price: number;
  regional_demand_forecast: number;
  last_updated: string;
  source: 'eia' | 'iex_cloud';
}

export interface PolicyChange {
  policy_id: string;
  title: string;
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  sectors_affected: string[];
  effective_date: string;
  impact_on_receivables: number; // -1 to 1 scale
  source: 'federal_register' | 'congress_gov';
}

export interface UserCreditData {
  credit_score: number;
  payment_history_enhanced: {
    on_time_rate: number;
    average_delay_days: number;
    credit_utilization: number;
    public_records: number;
  };
  financial_metrics_enhanced: {
    debt_to_equity: number;
    current_ratio: number;
    cash_flow_rating: string;
    revenue_growth: number;
  };
  sources: string[];
  data_quality_score: number; // 0.0 to 1.0
  last_updated: string;
}

export interface PolicyImpactData {
  policy_change: PolicyChange;
  direct_impact_score: number; // 0-100
  indirect_impact_score: number; // 0-100
  timeline_impact: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
}

export interface CreditRatingData {
  rating: string;
  investment_grade: boolean;
  default_rate_3yr: number; // Percentage
  typical_spread_bps: number; // Basis points over treasury
  risk_tier: 'Prime' | 'Investment Grade' | 'Speculative' | 'High Risk' | 'Default Risk';
}

export interface CreditRatingConfiguration {
  ratings: Record<string, CreditRatingData>;
  parameters: {
    baseDiscountRate: number;
    maxDiscountRate: number;
    minDiscountRate: number;
    climatePremium: number;
    esgDiscountThreshold: number;
    esgPremiumThreshold: number;
    esgDiscountRate: number;
    esgPremiumRate: number;
    healthMultiplierMin: number;
    healthMultiplierMax: number;
  };
}

export class PayerRiskAssessmentService {

  private static readonly CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours for market data
  private static readonly API_TIMEOUT = 10000; // 10 seconds timeout

  /**
   * Load dynamic credit rating configuration from database
   */
  private static async loadCreditRatingConfiguration(): Promise<CreditRatingConfiguration> {
    // Load credit rating matrix from system_settings
    const { data: ratingSettings, error: ratingError } = await supabase
      .from('system_settings')
      .select('key, value')
      .like('key', 'climate_credit_rating_%');

    if (ratingError) {
      throw new Error(`Failed to load credit rating configuration: ${ratingError.message}`);
    }

    // Load risk calculation parameters
    const { data: paramSettings, error: paramError } = await supabase
      .from('system_settings') 
      .select('key, value')
      .in('key', [
        'payer_risk_base_discount_rate',
        'payer_risk_max_discount_rate', 
        'payer_risk_min_discount_rate',
        'payer_risk_climate_premium',
        'payer_risk_esg_discount_threshold',
        'payer_risk_esg_premium_threshold',
        'payer_risk_esg_discount_rate',
        'payer_risk_esg_premium_rate',
        'payer_risk_health_multiplier_min',
        'payer_risk_health_multiplier_max'
      ]);

    if (paramError) {
      throw new Error(`Failed to load risk parameters: ${paramError.message}`);
    }

    // Convert settings to configuration object
    const settings = [...(ratingSettings || []), ...(paramSettings || [])].reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, string>);

    // Validate required rating data exists
    const requiredRatings = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D'];
    const missingRatings = requiredRatings.filter(rating => 
      !settings[`climate_credit_rating_${rating.toLowerCase()}_default_rate`] || 
      !settings[`climate_credit_rating_${rating.toLowerCase()}_spread_bps`]
    );

    // If missing configuration, use defaults and warn (only once)
    if (missingRatings.length > 0) {
      if (!hasWarnedAboutMissingConfig) {
        console.warn(
          `⚠️ Credit rating configuration missing for: ${missingRatings.join(', ')}.\n` +
          `Using default values. Please configure credit rating data in system_settings table for production use.\n` +
          `Required keys pattern: climate_credit_rating_{rating}_default_rate, climate_credit_rating_{rating}_spread_bps`
        );
        hasWarnedAboutMissingConfig = true;
      }
      
      // Return default configuration
      return { 
        ratings: DEFAULT_CREDIT_RATINGS, 
        parameters: DEFAULT_PARAMETERS 
      };
    }

    // Build ratings matrix
    const ratings: Record<string, CreditRatingData> = {};
    
    requiredRatings.forEach(rating => {
      const ratingKey = rating.toLowerCase();
      const defaultRate = parseFloat(settings[`climate_credit_rating_${ratingKey}_default_rate`] || '0');
      const spreadBps = parseFloat(settings[`climate_credit_rating_${ratingKey}_spread_bps`] || '0'); 
      const investmentGrade = settings[`climate_credit_rating_${ratingKey}_investment_grade`] === 'true';
      const riskTier = settings[`climate_credit_rating_${ratingKey}_risk_tier`] || 'Unknown';

      ratings[rating] = {
        rating,
        investment_grade: investmentGrade,
        default_rate_3yr: defaultRate,
        typical_spread_bps: spreadBps,
        risk_tier: riskTier as any
      };
    });

    // Build parameters object
    const parameters = {
      baseDiscountRate: parseFloat(settings.payer_risk_base_discount_rate || '1.5'),
      maxDiscountRate: parseFloat(settings.payer_risk_max_discount_rate || '12.0'),
      minDiscountRate: parseFloat(settings.payer_risk_min_discount_rate || '1.0'),
      climatePremium: parseFloat(settings.payer_risk_climate_premium || '0.75'),
      esgDiscountThreshold: parseFloat(settings.payer_risk_esg_discount_threshold || '70'),
      esgPremiumThreshold: parseFloat(settings.payer_risk_esg_premium_threshold || '30'),
      esgDiscountRate: parseFloat(settings.payer_risk_esg_discount_rate || '0.5'),
      esgPremiumRate: parseFloat(settings.payer_risk_esg_premium_rate || '1.0'),
      healthMultiplierMin: parseFloat(settings.payer_risk_health_multiplier_min || '0.7'),
      healthMultiplierMax: parseFloat(settings.payer_risk_health_multiplier_max || '1.5')
    };

    return { ratings, parameters };
  }

  /**
   * Calculate Risk Score (0-100 scale) using database configuration
   */
  public static async calculateRiskScore(creditProfile: PayerCreditProfile): Promise<number> {
    const config = await this.loadCreditRatingConfiguration();
    let creditData = config.ratings[creditProfile.credit_rating];
    
    // If rating not found, try to use default for 'BBB' as a moderate baseline
    if (!creditData) {
      console.warn(`Unknown credit rating: ${creditProfile.credit_rating}. Using BBB rating as fallback.`);
      creditData = config.ratings['BBB'] || DEFAULT_CREDIT_RATINGS['BBB'];
    }

    // Base risk score from credit rating (inverse of quality)
    const creditRiskScore = Math.min(creditData.default_rate_3yr * 2, 100);
    
    // Financial health adjustment (-20 to +20 points)
    const healthAdjustment = (100 - creditProfile.financial_health_score) * 0.2;
    
    // ESG adjustment for climate finance using configuration
    let esgAdjustment = 0;
    if (creditProfile.esg_score) {
      if (creditProfile.esg_score >= config.parameters.esgDiscountThreshold) {
        esgAdjustment = -5; // ESG discount
      } else if (creditProfile.esg_score <= config.parameters.esgPremiumThreshold) {
        esgAdjustment = 10; // ESG premium
      }
    }
    
    // Final risk score (0-100, higher = more risky)
    const finalScore = Math.max(1, Math.min(100, 
      creditRiskScore + healthAdjustment + esgAdjustment
    ));

    return Math.round(finalScore);
  }

  /**
   * Calculate Discount Rate (%) using database configuration
   */
  public static async calculateDiscountRate(creditProfile: PayerCreditProfile): Promise<number> {
    const config = await this.loadCreditRatingConfiguration();
    const creditData = config.ratings[creditProfile.credit_rating];
    
    if (!creditData) {
      throw new Error(`Unknown credit rating: ${creditProfile.credit_rating}. Please ensure this rating is configured in the system_settings table.`);
    }

    // Base rate from credit spread (convert basis points to percentage)
    const baseRate = Math.max(config.parameters.baseDiscountRate, creditData.typical_spread_bps / 100);
    
    // Financial health multiplier using configuration
    const healthMultiplier = config.parameters.healthMultiplierMax - 
      (creditProfile.financial_health_score / 100);
    
    // Climate finance premium/discount using configuration
    const climatePremium = creditData.investment_grade ? 
      -0.25 : config.parameters.climatePremium;
    
    // ESG adjustment using configuration parameters
    let esgAdjustment = 0;
    if (creditProfile.esg_score) {
      if (creditProfile.esg_score >= config.parameters.esgDiscountThreshold) {
        esgAdjustment = -config.parameters.esgDiscountRate;
      } else if (creditProfile.esg_score <= config.parameters.esgPremiumThreshold) {
        esgAdjustment = config.parameters.esgPremiumRate;
      }
    }

    // Final discount rate using configuration bounds
    const finalRate = Math.max(config.parameters.minDiscountRate, 
      Math.min(config.parameters.maxDiscountRate,
        baseRate * healthMultiplier + climatePremium + esgAdjustment
      )
    );

    return Math.round(finalRate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Comprehensive risk assessment with database-driven analysis
   */
  public static async assessPayerRisk(creditProfile: PayerCreditProfile): Promise<RiskAssessmentResult> {
    const config = await this.loadCreditRatingConfiguration();
    const riskScore = await this.calculateRiskScore(creditProfile);
    const discountRate = await this.calculateDiscountRate(creditProfile);
    const creditData = config.ratings[creditProfile.credit_rating];
    
    const factors = [
      `Credit Rating: ${creditProfile.credit_rating}`,
      `Financial Health Score: ${creditProfile.financial_health_score}/100`,
      creditData ? `Risk Tier: ${creditData.risk_tier}` : 'Risk Tier: Unknown',
      creditData ? `3-Year Default Rate: ${creditData.default_rate_3yr}%` : 'Default Rate: Unavailable'
    ];

    if (creditProfile.esg_score) {
      factors.push(`ESG Score: ${creditProfile.esg_score}/100`);
    }

    // Confidence level based on data availability
    let confidence = 85; // Base confidence
    if (!creditData) confidence -= 20;
    if (!creditProfile.financial_health_score) confidence -= 15;
    if (!creditProfile.payment_history) confidence -= 10;

    return {
      risk_score: riskScore,
      discount_rate: discountRate,
      confidence_level: Math.max(50, confidence),
      methodology: 'Database-driven risk model using configurable credit rating matrix and dynamic parameters',
      factors_considered: factors,
      manual_override_available: true,
      data_completeness: 'basic'
    };
  }

  /**
   * Enhanced risk assessment with real market data integration
   * Uses free government APIs and user uploaded data
   */
  public static async getEnhancedRiskAssessment(
    creditProfile: PayerCreditProfile
  ): Promise<EnhancedRiskAssessmentResult> {
    try {
      // 1. Get base assessment using database configuration
      const baseAssessment = await this.assessPayerRisk(creditProfile);

      // 2. Fetch market data from database cache (no fallbacks)
      const [
        marketDataSnapshot,
        userCreditData,
        policyImpactData
      ] = await Promise.allSettled([
        this.getMarketDataFromDatabase(),
        this.getUserCreditData(creditProfile.payer_id, creditProfile.payer_name),
        this.getPolicyImpactAssessment(creditProfile.industry_sector)
      ]);

      const marketData = marketDataSnapshot.status === 'fulfilled' ? marketDataSnapshot.value : null;
      const userData = userCreditData.status === 'fulfilled' ? userCreditData.value : null;
      const policyData = policyImpactData.status === 'fulfilled' ? policyImpactData.value : [];

      // 3. Apply market adjustments if data available
      const marketAdjustedAssessment = marketData ? 
        await this.applyMarketAdjustments(baseAssessment, marketData) :
        baseAssessment;

      // 4. Integrate user uploaded data if available
      const finalAssessment = userData ?
        this.integrateUserData(marketAdjustedAssessment, userData) :
        marketAdjustedAssessment;

      // 5. Apply policy impact adjustments if data available
      const policyAdjustedAssessment = policyData.length > 0 ?
        this.applyPolicyAdjustments(finalAssessment, policyData) :
        finalAssessment;

      // 6. Generate enhanced recommendations
      const recommendations = this.generateEnhancedRecommendations(
        policyAdjustedAssessment,
        marketData,
        userData,
        policyData
      );

      return {
        ...policyAdjustedAssessment,
        market_data_snapshot: marketData,
        user_credit_data: userData,
        policy_impact_assessment: policyData,
        recommendations
      };

    } catch (error) {
      throw new Error(`Enhanced risk assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get market data from database cache (no fallback data)
   */
  private static async getMarketDataFromDatabase(): Promise<MarketDataSnapshot> {
    // Fetch cached market data from climate_market_data_cache table
    const { data: treasuryData, error: treasuryError } = await supabase
      .from('climate_market_data_cache')
      .select('*')
      .eq('cache_type', 'treasury_rates')
      .order('cached_at', { ascending: false })
      .limit(1)
      .single();

    const { data: spreadsData, error: spreadsError } = await supabase
      .from('climate_market_data_cache')
      .select('*')
      .eq('cache_type', 'credit_spreads')
      .order('cached_at', { ascending: false })
      .limit(1)
      .single();

    const { data: energyData, error: energyError } = await supabase
      .from('climate_market_data_cache')
      .select('*')
      .eq('cache_type', 'energy_market')
      .order('cached_at', { ascending: false })
      .limit(1)
      .single();

    const { data: policyData, error: policyError } = await supabase
      .from('climate_market_data_cache')
      .select('*')
      .eq('cache_type', 'policy_changes')
      .order('cached_at', { ascending: false })
      .limit(1)
      .single();

    // Parse cached data or return null if not available
    const treasuryRates = (treasuryData && !treasuryError) ? 
      JSON.parse(treasuryData.cache_data) as TreasuryRates : null;
    
    const creditSpreads = (spreadsData && !spreadsError) ? 
      JSON.parse(spreadsData.cache_data) as CreditSpreads : null;
    
    const energyPrices = (energyData && !energyError) ? 
      JSON.parse(energyData.cache_data) as EnergyMarketData : null;

    const policyChanges = (policyData && !policyError) ? 
      JSON.parse(policyData.cache_data) as PolicyChange[] : [];

    if (!treasuryRates && !creditSpreads && !energyPrices) {
      throw new Error('Market data required for enhanced assessment. Please populate climate_market_data_cache table with treasury_rates, credit_spreads, and energy_market data.');
    }

    return {
      treasury_rates: treasuryRates,
      credit_spreads: creditSpreads,
      energy_prices: energyPrices,
      policy_changes: policyChanges,
      data_freshness: new Date().toISOString()
    };
  }

  /**
   * Get user uploaded credit data for specific payer
   */
  private static async getUserCreditData(
    payerId?: string,
    payerName?: string
  ): Promise<UserCreditData | null> {
    if (!payerId && !payerName) return null;

    try {
      // Search for user uploaded data sources for this payer
      const { data: dataSources, error } = await supabase
        .from('climate_user_data_sources')
        .select('*')
        .eq('is_active', true)
        .eq('processing_status', 'completed')
        .in('source_type', ['credit_report', 'financial_statement']);

      if (error || !dataSources?.length) return null;

      // Extract and combine data from all sources
      let combinedData: UserCreditData | null = null;
      
      for (const source of dataSources) {
        const extractedData = await this.extractPayerDataFromSource(source, payerId, payerName);
        if (extractedData) {
          combinedData = this.combineUserCreditData(combinedData, extractedData);
        }
      }

      return combinedData;
    } catch (error) {
      console.warn('User credit data fetch failed:', error);
      return null;
    }
  }

  /**
   * Apply market-based adjustments to risk assessment using database configuration
   */
  private static async applyMarketAdjustments(
    assessment: RiskAssessmentResult,
    marketData: MarketDataSnapshot
  ): Promise<RiskAssessmentResult> {
    // Load market adjustment parameters from database
    const { data: adjustmentSettings, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'market_adjustment_treasury_sensitivity',
        'market_adjustment_spread_sensitivity',
        'market_adjustment_energy_sensitivity',
        'market_adjustment_policy_sensitivity',
        'market_baseline_treasury_10y',
        'market_baseline_ig_spread',
        'market_baseline_energy_price'
      ]);

    if (error) {
      throw new Error(`Failed to load market adjustment parameters: ${error.message}`);
    }

    const settings = adjustmentSettings?.reduce((acc, item) => {
      acc[item.key] = parseFloat(item.value);
      return acc;
    }, {} as Record<string, number>) || {};

    let adjustedRiskScore = assessment.risk_score;
    let adjustedDiscountRate = assessment.discount_rate;
    
    const adjustments: MarketAdjustments = {
      treasury_rate_adjustment: 0,
      credit_spread_adjustment: 0,
      policy_impact_adjustment: 0,
      energy_market_adjustment: 0,
      total_adjustment: 0
    };

    // Apply treasury rate adjustments using database parameters
    if (marketData.treasury_rates) {
      const baselineTreasury = settings.market_baseline_treasury_10y || 2.5;
      const treasurySensitivity = settings.market_adjustment_treasury_sensitivity || 0.8;
      const rateDifference = marketData.treasury_rates.treasury_10y - baselineTreasury;
      const treasuryAdjustment = rateDifference * treasurySensitivity;
      
      adjustedDiscountRate += treasuryAdjustment;
      adjustments.treasury_rate_adjustment = treasuryAdjustment;
    }

    // Apply credit spread adjustments using database parameters
    if (marketData.credit_spreads) {
      const baselineSpread = settings.market_baseline_ig_spread || 150;
      const spreadSensitivity = settings.market_adjustment_spread_sensitivity || 0.5;
      const spreadDifference = marketData.credit_spreads.investment_grade - baselineSpread;
      const spreadAdjustment = (spreadDifference / 100) * spreadSensitivity;
      
      adjustedDiscountRate += spreadAdjustment;
      adjustments.credit_spread_adjustment = spreadAdjustment;
    }

    // Apply energy market adjustments using database parameters
    if (marketData.energy_prices) {
      const baselinePrice = settings.market_baseline_energy_price || 35;
      const energySensitivity = settings.market_adjustment_energy_sensitivity || 0.2;
      const priceDifference = marketData.energy_prices.electricity_price_mwh - baselinePrice;
      const energyAdjustment = -priceDifference * energySensitivity; // Negative because higher prices reduce risk
      
      adjustedRiskScore += energyAdjustment;
      adjustments.energy_market_adjustment = energyAdjustment;
    }

    // Apply policy adjustments using database parameters
    if (marketData.policy_changes?.length > 0) {
      const policySensitivity = settings.market_adjustment_policy_sensitivity || 10;
      const totalImpact = marketData.policy_changes.reduce((sum, policy) => {
        return sum + policy.impact_on_receivables * this.getPolicyImpactWeight(policy.impact_level);
      }, 0);
      const policyAdjustment = -totalImpact * policySensitivity; // Negative because positive policy impact reduces risk
      
      adjustedRiskScore += policyAdjustment;
      adjustments.policy_impact_adjustment = policyAdjustment;
    }

    adjustments.total_adjustment = 
      adjustments.treasury_rate_adjustment + 
      adjustments.credit_spread_adjustment + 
      adjustments.energy_market_adjustment + 
      adjustments.policy_impact_adjustment;

    const enhancedFactors = [
      ...assessment.factors_considered,
      `Treasury Rate Environment: ${marketData.treasury_rates?.treasury_10y.toFixed(2) || 'N/A'}%`,
      `Credit Spread Adjustment: ${adjustments.credit_spread_adjustment.toFixed(2)}%`,
      `Energy Market Factor: Applied`,
      `Policy Changes Considered: ${marketData.policy_changes?.length || 0}`
    ];

    return {
      ...assessment,
      risk_score: Math.max(1, Math.min(100, adjustedRiskScore)),
      discount_rate: Math.max(0.5, adjustedDiscountRate),
      methodology: assessment.methodology + ' + Database-Driven Market Integration',
      factors_considered: enhancedFactors,
      market_adjustments: adjustments,
      confidence_level: Math.min(95, assessment.confidence_level + 5),
      data_completeness: 'enhanced'
    };
  }

  /**
   * Integrate user uploaded credit data
   */
  private static integrateUserData(
    assessment: RiskAssessmentResult,
    userData: UserCreditData
  ): RiskAssessmentResult {
    // Blend user data with calculated assessment based on data quality
    const blendedScore = this.blendRiskScores(
      assessment.risk_score,
      this.convertCreditScoreToRisk(userData.credit_score),
      userData.data_quality_score
    );

    // Enhanced discount rate with user financial metrics
    const userFinancialAdjustment = this.calculateUserFinancialAdjustment(userData);

    const enhancedFactors = [
      ...assessment.factors_considered,
      `User Credit Score: ${userData.credit_score}`,
      `Enhanced Payment History: ${(userData.payment_history_enhanced.on_time_rate * 100).toFixed(1)}% on-time`,
      `User Financial Metrics: Applied`,
      `Data Quality Score: ${(userData.data_quality_score * 100).toFixed(1)}%`
    ];

    return {
      ...assessment,
      risk_score: blendedScore,
      discount_rate: assessment.discount_rate + userFinancialAdjustment,
      factors_considered: enhancedFactors,
      data_completeness: 'comprehensive',
      user_data_sources: userData.sources,
      data_quality_score: userData.data_quality_score,
      confidence_level: Math.min(98, assessment.confidence_level + 15)
    };
  }

  // Helper methods for calculations and data processing

  private static getPolicyImpactWeight(impactLevel: string): number {
    switch (impactLevel) {
      case 'critical': return 1.0;
      case 'high': return 0.7;
      case 'medium': return 0.4;
      case 'low': return 0.2;
      default: return 0.1;
    }
  }

  private static blendRiskScores(
    calculatedRisk: number, 
    userDataRisk: number, 
    dataQuality: number
  ): number {
    // Blend scores based on data quality (higher quality = more weight to user data)
    const userWeight = dataQuality;
    const calculatedWeight = 1 - dataQuality;
    
    return Math.round(
      (calculatedRisk * calculatedWeight) + (userDataRisk * userWeight)
    );
  }

  private static convertCreditScoreToRisk(creditScore: number): number {
    // Convert credit score (300-850) to risk score (0-100)
    // Higher credit score = lower risk score
    if (creditScore >= 800) return 10;
    if (creditScore >= 740) return 25;
    if (creditScore >= 670) return 45;
    if (creditScore >= 580) return 65;
    if (creditScore >= 500) return 80;
    return 95;
  }

  private static calculateUserFinancialAdjustment(userData: UserCreditData): number {
    const metrics = userData.financial_metrics_enhanced;
    let adjustment = 0;

    // Debt-to-equity ratio adjustment
    if (metrics.debt_to_equity < 0.3) adjustment -= 0.25;
    else if (metrics.debt_to_equity > 0.7) adjustment += 0.5;

    // Current ratio adjustment
    if (metrics.current_ratio > 2.0) adjustment -= 0.25;
    else if (metrics.current_ratio < 1.2) adjustment += 0.5;

    // Revenue growth adjustment
    if (metrics.revenue_growth > 0.1) adjustment -= 0.25;
    else if (metrics.revenue_growth < -0.05) adjustment += 0.5;

    return Math.max(-1.0, Math.min(2.0, adjustment));
  }

  /**
   * Get risk tier classification using database configuration
   */
  public static async getRiskTier(creditRating: string): Promise<string> {
    const config = await this.loadCreditRatingConfiguration();
    const creditData = config.ratings[creditRating];
    return creditData?.risk_tier || 'Unknown';
  }

  /**
   * Check if rating is investment grade using database configuration
   */
  public static async isInvestmentGrade(creditRating: string): Promise<boolean> {
    const config = await this.loadCreditRatingConfiguration();
    const creditData = config.ratings[creditRating];
    return creditData?.investment_grade || false;
  }

  /**
   * Get climate finance adjustments explanation using database configuration
   */
  public static async getClimateFinanceInsights(creditProfile: PayerCreditProfile): Promise<string[]> {
    const config = await this.loadCreditRatingConfiguration();
    const insights = [];
    
    if (await this.isInvestmentGrade(creditProfile.credit_rating)) {
      insights.push('Investment grade payers benefit from climate finance premium (-0.25% discount)');
    }
    
    if (creditProfile.esg_score && creditProfile.esg_score >= config.parameters.esgDiscountThreshold) {
      insights.push(`Strong ESG performance qualifies for renewable energy discount (-${config.parameters.esgDiscountRate}%)`);
    }
    
    if (creditProfile.esg_score && creditProfile.esg_score <= config.parameters.esgPremiumThreshold) {
      insights.push(`Poor ESG performance increases climate risk premium (+${config.parameters.esgPremiumRate}%)`);
    }

    const creditData = config.ratings[creditProfile.credit_rating];
    if (creditData?.risk_tier === 'Prime') {
      insights.push('Prime credit rating qualifies for best renewable energy financing rates');
    }

    return insights;
  }

  // Data extraction and processing methods (no hardcoded fallback data)

  private static async extractPayerDataFromSource(
    dataSource: any,
    payerId?: string,
    payerName?: string
  ): Promise<Partial<UserCreditData> | null> {
    // Real implementation would extract data from uploaded files
    // This method should not contain any hardcoded data
    console.log(`Extracting data from source ${dataSource.source_id} for payer ${payerId || payerName}`);
    
    try {
      // Implementation would parse actual uploaded credit reports and financial statements
      // Return null if no data can be extracted rather than mock data
      return null;
    } catch (error) {
      console.error('Data extraction failed:', error);
      return null;
    }
  }

  private static combineUserCreditData(
    existing: UserCreditData | null,
    newData: Partial<UserCreditData>
  ): UserCreditData {
    if (!existing) {
      // Return newData if it's complete, otherwise throw error
      if (!newData.credit_score || !newData.payment_history_enhanced) {
        throw new Error('Insufficient user credit data extracted from sources');
      }
      
      return newData as UserCreditData;
    }

    // Combine existing and new data, prioritizing newer/higher quality data
    return {
      ...existing,
      ...newData,
      sources: [...(existing.sources || []), ...(newData.sources || [])],
      data_quality_score: Math.max(existing.data_quality_score || 0, newData.data_quality_score || 0),
      last_updated: newData.last_updated || existing.last_updated || new Date().toISOString()
    };
  }

  private static async getPolicyImpactAssessment(
    industrySector?: string
  ): Promise<PolicyImpactData[]> {
    if (!industrySector) return [];

    try {
      // Get policy impact data from database
      const { data: policyData, error } = await supabase
        .from('climate_policy_impacts')
        .select('*')
        .contains('sectors_affected', [industrySector])
        .gte('effective_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('effective_date', { ascending: false });

      if (error || !policyData?.length) return [];

      return policyData.map(policy => ({
        policy_change: {
          policy_id: policy.policy_id,
          title: policy.title,
          impact_level: policy.impact_level,
          sectors_affected: policy.sectors_affected,
          effective_date: policy.effective_date,
          impact_on_receivables: policy.impact_on_receivables,
          source: 'database'
        },
        direct_impact_score: policy.direct_impact_score || 0,
        indirect_impact_score: policy.indirect_impact_score || 0,
        timeline_impact: policy.timeline_impact || 'medium_term'
      }));
    } catch (error) {
      console.error('Policy impact assessment failed:', error);
      return [];
    }
  }

  private static applyPolicyAdjustments(
    assessment: RiskAssessmentResult,
    policyData: PolicyImpactData[]
  ): RiskAssessmentResult {
    if (policyData.length === 0) return assessment;

    // Calculate policy-based risk adjustments
    const totalDirectImpact = policyData.reduce((sum, policy) => sum + policy.direct_impact_score, 0);
    const avgDirectImpact = totalDirectImpact / policyData.length;

    // Convert policy impact to risk score adjustment (0-100 impact scale to -10 to +10 risk adjustment)
    const riskAdjustment = (avgDirectImpact - 50) * 0.2; // 50 is neutral impact

    const enhancedFactors = [
      ...assessment.factors_considered,
      `Policy Impact Analysis: ${policyData.length} policies evaluated`,
      `Average Direct Impact: ${avgDirectImpact.toFixed(1)}/100`,
      `Policy Risk Adjustment: ${riskAdjustment.toFixed(2)} points`
    ];

    return {
      ...assessment,
      risk_score: Math.max(1, Math.min(100, assessment.risk_score + riskAdjustment)),
      factors_considered: enhancedFactors,
      confidence_level: Math.min(95, assessment.confidence_level + 3)
    };
  }

  private static generateEnhancedRecommendations(
    assessment: RiskAssessmentResult,
    marketData: MarketDataSnapshot | null,
    userData: UserCreditData | null,
    policyData: PolicyImpactData[]
  ): string[] {
    const recommendations: string[] = [];

    // Base recommendations based on risk score
    if (assessment.risk_score < 30) {
      recommendations.push('Excellent credit profile - proceed with premium terms and consider volume discounts');
    } else if (assessment.risk_score < 50) {
      recommendations.push('Good credit profile - standard commercial terms with regular monitoring');
    } else if (assessment.risk_score < 70) {
      recommendations.push('Moderate risk - consider enhanced monitoring and payment terms adjustment');
    } else {
      recommendations.push('High risk profile - require additional security and close monitoring');
    }

    // Market-based recommendations
    if (marketData?.credit_spreads && marketData.credit_spreads.investment_grade > 200) {
      recommendations.push('Current credit spreads elevated - consider locking in rates or credit insurance');
    }

    if (marketData?.energy_prices && marketData.energy_prices.electricity_price_mwh > 50) {
      recommendations.push('Favorable energy prices reduce renewable energy receivables risk');
    }

    // User data-based recommendations
    if (userData && userData.data_quality_score > 0.8) {
      recommendations.push('High-quality user data available - confidence in assessment increased');
    }

    // Policy-based recommendations
    const highImpactPolicies = policyData.filter(p => p.direct_impact_score > 60);
    if (highImpactPolicies.length > 0) {
      recommendations.push('Recent policy changes may impact renewable energy sector - monitor developments');
    }

    return recommendations;
  }
}
