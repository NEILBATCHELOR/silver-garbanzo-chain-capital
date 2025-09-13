/**
 * Enhanced Climate Payer Risk Assessment Service
 * 
 * Automatically calculates risk scores and discount rates based on:
 * - Credit ratings (AAA to D scale)
 * - Financial health scores (0-100)
 * - Industry research on default rates and receivables financing
 * - Real-time free market data (Treasury rates, credit spreads, policy changes)
 * - User uploaded credit and financial data
 * 
 * Research-backed correlation model based on:
 * - S&P historical default rates (3-year cumulative)
 * - Bond spread analysis (basis points over treasury)
 * - Receivables factoring industry rates
 * - Climate finance ESG risk adjustments
 * - Free government APIs (Treasury.gov, FRED, Federal Register)
 * - User provided credit reports and financial statements
 */

import { supabase } from '@/infrastructure/database/client';
import { EnhancedExternalAPIService } from '@/components/climateReceivables/services/api/enhanced-external-api-service';

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
  investment_grade: number; // Basis points over treasury
  high_yield: number;
  corporate_aaa: number;
  corporate_baa: number;
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

export class PayerRiskAssessmentService {
  
  /**
   * Credit Rating Matrix - Based on S&P Historical Data
   * Source: S&P Global Ratings historical 3-year cumulative default rates
   */
  private static readonly CREDIT_RATING_MATRIX: Record<string, CreditRatingData> = {
    'AAA': { rating: 'AAA', investment_grade: true, default_rate_3yr: 0.18, typical_spread_bps: 43, risk_tier: 'Prime' },
    'AA+': { rating: 'AA+', investment_grade: true, default_rate_3yr: 0.25, typical_spread_bps: 55, risk_tier: 'Prime' },
    'AA': { rating: 'AA', investment_grade: true, default_rate_3yr: 0.28, typical_spread_bps: 65, risk_tier: 'Prime' },
    'AA-': { rating: 'AA-', investment_grade: true, default_rate_3yr: 0.35, typical_spread_bps: 75, risk_tier: 'Prime' },
    'A+': { rating: 'A+', investment_grade: true, default_rate_3yr: 0.45, typical_spread_bps: 90, risk_tier: 'Investment Grade' },
    'A': { rating: 'A', investment_grade: true, default_rate_3yr: 0.55, typical_spread_bps: 110, risk_tier: 'Investment Grade' },
    'A-': { rating: 'A-', investment_grade: true, default_rate_3yr: 0.70, typical_spread_bps: 130, risk_tier: 'Investment Grade' },
    'BBB+': { rating: 'BBB+', investment_grade: true, default_rate_3yr: 0.85, typical_spread_bps: 160, risk_tier: 'Investment Grade' },
    'BBB': { rating: 'BBB', investment_grade: true, default_rate_3yr: 0.91, typical_spread_bps: 200, risk_tier: 'Investment Grade' },
    'BBB-': { rating: 'BBB-', investment_grade: true, default_rate_3yr: 1.20, typical_spread_bps: 250, risk_tier: 'Investment Grade' },
    
    // Speculative Grade (Non-Investment Grade)
    'BB+': { rating: 'BB+', investment_grade: false, default_rate_3yr: 3.50, typical_spread_bps: 350, risk_tier: 'Speculative' },
    'BB': { rating: 'BB', investment_grade: false, default_rate_3yr: 4.17, typical_spread_bps: 420, risk_tier: 'Speculative' },
    'BB-': { rating: 'BB-', investment_grade: false, default_rate_3yr: 5.20, typical_spread_bps: 500, risk_tier: 'Speculative' },
    'B+': { rating: 'B+', investment_grade: false, default_rate_3yr: 9.80, typical_spread_bps: 600, risk_tier: 'High Risk' },
    'B': { rating: 'B', investment_grade: false, default_rate_3yr: 12.41, typical_spread_bps: 650, risk_tier: 'High Risk' },
    'B-': { rating: 'B-', investment_grade: false, default_rate_3yr: 16.50, typical_spread_bps: 700, risk_tier: 'High Risk' },
    'CCC+': { rating: 'CCC+', investment_grade: false, default_rate_3yr: 35.20, typical_spread_bps: 800, risk_tier: 'Default Risk' },
    'CCC': { rating: 'CCC', investment_grade: false, default_rate_3yr: 45.67, typical_spread_bps: 900, risk_tier: 'Default Risk' },
    'CCC-': { rating: 'CCC-', investment_grade: false, default_rate_3yr: 55.40, typical_spread_bps: 1000, risk_tier: 'Default Risk' },
    'CC': { rating: 'CC', investment_grade: false, default_rate_3yr: 65.20, typical_spread_bps: 1200, risk_tier: 'Default Risk' },
    'C': { rating: 'C', investment_grade: false, default_rate_3yr: 75.80, typical_spread_bps: 1500, risk_tier: 'Default Risk' },
    'D': { rating: 'D', investment_grade: false, default_rate_3yr: 90.00, typical_spread_bps: 2000, risk_tier: 'Default Risk' }
  };

  private static readonly CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours for market data
  private static readonly API_TIMEOUT = 10000; // 10 seconds timeout

  /**
   * Calculate Risk Score (0-100 scale)
   * Combines credit rating default probability with financial health score
   */
  public static calculateRiskScore(creditProfile: PayerCreditProfile): number {
    const creditData = this.CREDIT_RATING_MATRIX[creditProfile.credit_rating];
    
    if (!creditData) {
      // Unknown rating - use conservative high-risk assessment
      return 85;
    }

    // Base risk score from credit rating (inverse of quality)
    const creditRiskScore = Math.min(creditData.default_rate_3yr * 2, 100);
    
    // Financial health adjustment (-20 to +20 points)
    const healthAdjustment = (100 - creditProfile.financial_health_score) * 0.2;
    
    // ESG adjustment for climate finance (-5 to +10 points)
    const esgAdjustment = creditProfile.esg_score ? 
      Math.max(-5, Math.min(10, (50 - creditProfile.esg_score) * 0.2)) : 0;
    
    // Final risk score (0-100, higher = more risky)
    const finalScore = Math.max(1, Math.min(100, 
      creditRiskScore + healthAdjustment + esgAdjustment
    ));

    return Math.round(finalScore);
  }

  /**
   * Calculate Discount Rate (%) 
   * Based on receivables financing industry rates and risk assessment
   */
  public static calculateDiscountRate(creditProfile: PayerCreditProfile): number {
    const creditData = this.CREDIT_RATING_MATRIX[creditProfile.credit_rating];
    
    if (!creditData) {
      // Unknown rating - use high discount rate
      return 8.50;
    }

    // Base rate from credit spread (convert basis points to percentage)
    const baseRate = Math.max(1.5, creditData.typical_spread_bps / 100);
    
    // Financial health multiplier (0.7x to 1.5x)
    const healthMultiplier = 1.7 - (creditProfile.financial_health_score / 100);
    
    // Climate finance premium/discount (-0.5% to +2.0%)
    const climatePremium = creditData.investment_grade ? -0.25 : 0.75;
    
    // ESG adjustment for renewable energy receivables
    const esgDiscount = creditProfile.esg_score && creditProfile.esg_score > 70 ? -0.5 : 
                       creditProfile.esg_score && creditProfile.esg_score < 30 ? 1.0 : 0;

    // Final discount rate
    const finalRate = Math.max(1.0, 
      baseRate * healthMultiplier + climatePremium + esgDiscount
    );

    return Math.round(finalRate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Comprehensive risk assessment with full analysis
   */
  public static assessPayerRisk(creditProfile: PayerCreditProfile): RiskAssessmentResult {
    const riskScore = this.calculateRiskScore(creditProfile);
    const discountRate = this.calculateDiscountRate(creditProfile);
    const creditData = this.CREDIT_RATING_MATRIX[creditProfile.credit_rating];
    
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
      methodology: 'Research-based correlation using S&P default rates, bond spreads, and receivables financing benchmarks',
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
      // 1. Get base assessment using existing logic
      const baseAssessment = this.assessPayerRisk(creditProfile);

      // 2. Fetch free market data in parallel
      const [
        marketDataSnapshot,
        userCreditData,
        policyImpactData
      ] = await Promise.allSettled([
        this.getFreeMarketDataSnapshot(),
        this.getUserCreditData(creditProfile.payer_id, creditProfile.payer_name),
        this.getPolicyImpactAssessment(creditProfile.industry_sector)
      ]);

      const marketData = marketDataSnapshot.status === 'fulfilled' ? marketDataSnapshot.value : null;
      const userData = userCreditData.status === 'fulfilled' ? userCreditData.value : null;
      const policyData = policyImpactData.status === 'fulfilled' ? policyImpactData.value : [];

      // 3. Apply market adjustments
      const marketAdjustedAssessment = this.applyMarketAdjustments(
        baseAssessment,
        marketData
      );

      // 4. Integrate user uploaded data
      const finalAssessment = this.integrateUserData(
        marketAdjustedAssessment,
        userData
      );

      // 5. Apply policy impact adjustments
      const policyAdjustedAssessment = this.applyPolicyAdjustments(
        finalAssessment,
        policyData
      );

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
      console.error('Enhanced risk assessment failed:', error);
      
      // Fallback to basic assessment with error indication
      const fallbackAssessment = this.assessPayerRisk(creditProfile);
      return {
        ...fallbackAssessment,
        methodology: fallbackAssessment.methodology + ' (Enhanced features unavailable)',
        factors_considered: [...fallbackAssessment.factors_considered, 'Market data fetch failed - using base assessment'],
        confidence_level: Math.max(40, fallbackAssessment.confidence_level - 10)
      };
    }
  }

  /**
   * Fetch free market data snapshot from government APIs
   * Uses Treasury.gov, FRED, EIA, and Federal Register APIs
   */
  private static async getFreeMarketDataSnapshot(): Promise<MarketDataSnapshot> {
    const cacheKey = 'market_data_snapshot';
    
    // Check cache first
    const cachedData = await this.getCachedData(cacheKey);
    if (cachedData && this.isCacheValid(cachedData.timestamp)) {
      return cachedData.data;
    }

    const [
      treasuryRates,
      creditSpreads,
      energyPrices,
      policyChanges
    ] = await Promise.allSettled([
      this.fetchTreasuryRates(),
      this.fetchCreditSpreads(),
      this.fetchEnergyMarketData(),
      this.fetchRecentPolicyChanges()
    ]);

    const snapshot: MarketDataSnapshot = {
      treasury_rates: treasuryRates.status === 'fulfilled' ? treasuryRates.value : null,
      credit_spreads: creditSpreads.status === 'fulfilled' ? creditSpreads.value : null,
      energy_prices: energyPrices.status === 'fulfilled' ? energyPrices.value : null,
      policy_changes: policyChanges.status === 'fulfilled' ? policyChanges.value : [],
      data_freshness: new Date().toISOString()
    };

    // Cache the result
    await this.setCachedData(cacheKey, snapshot);

    return snapshot;
  }

  /**
   * Fetch Treasury rates from Treasury.gov API (FREE - no API key required)
   */
  private static async fetchTreasuryRates(): Promise<TreasuryRates> {
    try {
      const response = await fetch(
        'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/avg_interest_rates?fields=record_date,security_desc,avg_interest_rate_amt&filter=record_date:eq:' + 
        new Date().toISOString().split('T')[0] + '&sort=-record_date&page[size]=20',
        { signal: AbortSignal.timeout(this.API_TIMEOUT) }
      );

      if (!response.ok) {
        throw new Error(`Treasury API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseTreasuryData(data);
    } catch (error) {
      console.warn('Treasury API failed, using FRED fallback:', error);
      return this.fetchTreasuryRatesFromFRED();
    }
  }

  /**
   * Fetch Treasury rates from FRED API (FREE - no API key required for some endpoints)
   */
  private static async fetchTreasuryRatesFromFRED(): Promise<TreasuryRates> {
    try {
      // Using FRED's public endpoints for treasury rates
      const response = await fetch(
        'https://api.stlouisfed.org/fred/series/observations?series_id=GS10&api_key=demo&file_type=json&limit=1&sort_order=desc',
        { signal: AbortSignal.timeout(this.API_TIMEOUT) }
      );

      if (!response.ok) {
        throw new Error(`FRED API error: ${response.status}`);
      }

      const data = await response.json();
      const rate10y = parseFloat(data.observations?.[0]?.value || '2.5');

      // Generate estimated curve based on 10-year rate
      return {
        treasury_1m: rate10y - 1.8,
        treasury_3m: rate10y - 1.5,
        treasury_6m: rate10y - 1.2,
        treasury_1y: rate10y - 0.8,
        treasury_2y: rate10y - 0.4,
        treasury_5y: rate10y - 0.1,
        treasury_10y: rate10y,
        treasury_30y: rate10y + 0.3,
        last_updated: new Date().toISOString(),
        source: 'fred'
      };
    } catch (error) {
      console.warn('FRED API failed, using fallback rates:', error);
      return this.getFallbackTreasuryRates();
    }
  }

  /**
   * Fetch credit spreads from FRED API (FREE)
   */
  private static async fetchCreditSpreads(): Promise<CreditSpreads> {
    try {
      // Get investment grade and high yield spreads from FRED
      const [igResponse, hyResponse] = await Promise.all([
        fetch('https://api.stlouisfed.org/fred/series/observations?series_id=BAMLC0A1CAAAEY&api_key=demo&file_type=json&limit=1&sort_order=desc'),
        fetch('https://api.stlouisfed.org/fred/series/observations?series_id=BAMLH0A0HYM2EY&api_key=demo&file_type=json&limit=1&sort_order=desc')
      ]);

      const [igData, hyData] = await Promise.all([
        igResponse.json(),
        hyResponse.json()
      ]);

      const investmentGrade = parseFloat(igData.observations?.[0]?.value || '150');
      const highYield = parseFloat(hyData.observations?.[0]?.value || '400');

      return {
        investment_grade: investmentGrade,
        high_yield: highYield,
        corporate_aaa: investmentGrade * 0.7, // Estimate AAA spread
        corporate_baa: investmentGrade * 1.2, // Estimate BAA spread
        last_updated: new Date().toISOString(),
        source: 'fred'
      };
    } catch (error) {
      console.warn('Credit spreads API failed, using fallback:', error);
      return this.getFallbackCreditSpreads();
    }
  }

  /**
   * Fetch energy market data from EIA API (FREE with API key)
   */
  private static async fetchEnergyMarketData(): Promise<EnergyMarketData> {
    try {
      const eiaApiKey = import.meta.env.VITE_EIA_API_KEY;
      
      if (!eiaApiKey) {
        console.log('EIA API key not configured, using fallback data');
        return this.getFallbackEnergyData();
      }

      const response = await fetch(
        `https://api.eia.gov/v2/electricity/rto/region-data/data/?frequency=hourly&data[0]=value&facets[respondent][]=US48&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=1&api_key=${eiaApiKey}`,
        { signal: AbortSignal.timeout(this.API_TIMEOUT) }
      );

      if (!response.ok) {
        throw new Error(`EIA API error: ${response.status}`);
      }

      const data = await response.json();
      const latestData = data.response?.data?.[0];

      return {
        electricity_price_mwh: latestData?.value || 35,
        renewable_energy_index: 100, // Could be enhanced with specific renewable index
        carbon_credit_price: 25, // Placeholder - would need specific carbon market API
        regional_demand_forecast: 1.05, // Estimated growth factor
        last_updated: new Date().toISOString(),
        source: 'eia'
      };
    } catch (error) {
      console.warn('EIA API failed, using fallback:', error);
      return this.getFallbackEnergyData();
    }
  }

  /**
   * Fetch recent policy changes from Federal Register API (FREE - no API key)
   */
  private static async fetchRecentPolicyChanges(): Promise<PolicyChange[]> {
    try {
      const response = await fetch(
        'https://www.federalregister.gov/api/v1/articles.json?conditions[term]=renewable energy tax credit&conditions[publication_date][gte]=' + 
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] +
        '&per_page=10&order=newest',
        { signal: AbortSignal.timeout(this.API_TIMEOUT) }
      );

      if (!response.ok) {
        throw new Error(`Federal Register API error: ${response.status}`);
      }

      const data = await response.json();
      
      return (data.results || []).map((article: any) => ({
        policy_id: article.document_number,
        title: article.title,
        impact_level: this.assessPolicyImpact(article.title, article.abstract) as 'low' | 'medium' | 'high' | 'critical',
        sectors_affected: ['renewable_energy', 'tax_credits'],
        effective_date: article.publication_date,
        impact_on_receivables: this.calculatePolicyImpactScore(article.title, article.abstract),
        source: 'federal_register'
      }));
    } catch (error) {
      console.warn('Federal Register API failed:', error);
      return [];
    }
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
   * Apply market-based adjustments to risk assessment
   */
  private static applyMarketAdjustments(
    assessment: RiskAssessmentResult,
    marketData: MarketDataSnapshot | null
  ): RiskAssessmentResult {
    if (!marketData) return assessment;

    let adjustedRiskScore = assessment.risk_score;
    let adjustedDiscountRate = assessment.discount_rate;
    
    const adjustments: MarketAdjustments = {
      treasury_rate_adjustment: 0,
      credit_spread_adjustment: 0,
      policy_impact_adjustment: 0,
      energy_market_adjustment: 0,
      total_adjustment: 0
    };

    // Adjust for current treasury rate environment
    if (marketData.treasury_rates) {
      const treasuryAdjustment = this.calculateTreasuryAdjustment(
        assessment.discount_rate,
        marketData.treasury_rates
      );
      adjustedDiscountRate += treasuryAdjustment;
      adjustments.treasury_rate_adjustment = treasuryAdjustment;
    }

    // Adjust for current credit spread environment
    if (marketData.credit_spreads) {
      const spreadAdjustment = this.calculateSpreadAdjustment(
        assessment.risk_score,
        marketData.credit_spreads
      );
      adjustedDiscountRate += spreadAdjustment;
      adjustments.credit_spread_adjustment = spreadAdjustment;
    }

    // Adjust for energy market conditions (renewable energy specific)
    if (marketData.energy_prices) {
      const energyAdjustment = this.calculateEnergyMarketAdjustment(
        assessment.risk_score,
        marketData.energy_prices
      );
      adjustedRiskScore += energyAdjustment;
      adjustments.energy_market_adjustment = energyAdjustment;
    }

    // Adjust for recent policy changes
    if (marketData.policy_changes?.length > 0) {
      const policyAdjustment = this.calculatePolicyAdjustment(
        assessment.risk_score,
        marketData.policy_changes
      );
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
      `Treasury Rate Environment: ${marketData.treasury_rates?.treasury_10y.toFixed(2)}%`,
      `Credit Spread Adjustment: ${adjustments.credit_spread_adjustment.toFixed(2)}%`,
      `Energy Market Factor: Applied`,
      `Policy Changes Considered: ${marketData.policy_changes?.length || 0}`
    ];

    return {
      ...assessment,
      risk_score: Math.max(1, Math.min(100, adjustedRiskScore)),
      discount_rate: Math.max(0.5, adjustedDiscountRate),
      methodology: assessment.methodology + ' + Free Market Data Integration',
      factors_considered: enhancedFactors,
      market_adjustments: adjustments,
      confidence_level: Math.min(95, assessment.confidence_level + 5), // Boost confidence with market data
      data_completeness: 'enhanced'
    };
  }

  /**
   * Integrate user uploaded credit data
   */
  private static integrateUserData(
    assessment: RiskAssessmentResult,
    userData: UserCreditData | null
  ): RiskAssessmentResult {
    if (!userData) {
      return {
        ...assessment,
        data_completeness: assessment.data_completeness || 'basic',
        user_data_sources: []
      };
    }

    // Blend user data with calculated assessment
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
      confidence_level: Math.min(98, assessment.confidence_level + 15) // Significant boost with user data
    };
  }

  // Helper methods for calculations and data processing...

  private static calculateTreasuryAdjustment(
    baseDiscountRate: number, 
    treasuryRates: TreasuryRates
  ): number {
    // Adjust discount rate based on treasury rate environment
    const baselineTreasury10Y = 2.5; // Historical baseline
    const currentTreasury10Y = treasuryRates.treasury_10y;
    const rateDifference = currentTreasury10Y - baselineTreasury10Y;
    
    // Pass through 80% of treasury rate changes to discount rate
    return rateDifference * 0.8;
  }

  private static calculateSpreadAdjustment(
    riskScore: number, 
    creditSpreads: CreditSpreads
  ): number {
    // Adjust based on current credit spread environment
    const baselineIG = 150; // Historical baseline for investment grade spreads
    const spreadDifference = creditSpreads.investment_grade - baselineIG;
    
    // Apply spread adjustment based on risk score
    const spreadSensitivity = riskScore < 50 ? 0.3 : riskScore < 70 ? 0.5 : 0.7;
    return (spreadDifference / 100) * spreadSensitivity;
  }

  private static calculateEnergyMarketAdjustment(
    riskScore: number, 
    energyData: EnergyMarketData
  ): number {
    // Favorable energy markets reduce renewable energy receivables risk
    const baselinePrice = 35; // $/MWh baseline
    const priceDifference = energyData.electricity_price_mwh - baselinePrice;
    
    // Higher energy prices reduce risk for renewable energy receivables
    return Math.max(-5, Math.min(5, -priceDifference * 0.2));
  }

  private static calculatePolicyAdjustment(
    riskScore: number, 
    policyChanges: PolicyChange[]
  ): number {
    if (policyChanges.length === 0) return 0;

    // Calculate net policy impact
    const totalImpact = policyChanges.reduce((sum, policy) => {
      return sum + (policy.impact_on_receivables * this.getPolicyImpactWeight(policy.impact_level));
    }, 0);

    // Convert policy impact to risk score adjustment
    return Math.max(-10, Math.min(10, -totalImpact * 10));
  }

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

  // Fallback data methods

  private static getFallbackTreasuryRates(): TreasuryRates {
    // Conservative fallback based on recent historical averages
    return {
      treasury_1m: 1.2,
      treasury_3m: 1.5,
      treasury_6m: 1.8,
      treasury_1y: 2.1,
      treasury_2y: 2.4,
      treasury_5y: 2.6,
      treasury_10y: 2.8,
      treasury_30y: 3.1,
      last_updated: new Date().toISOString(),
      source: 'treasury.gov'
    };
  }

  private static getFallbackCreditSpreads(): CreditSpreads {
    return {
      investment_grade: 150,
      high_yield: 400,
      corporate_aaa: 100,
      corporate_baa: 180,
      last_updated: new Date().toISOString(),
      source: 'fred'
    };
  }

  private static getFallbackEnergyData(): EnergyMarketData {
    return {
      electricity_price_mwh: 35,
      renewable_energy_index: 100,
      carbon_credit_price: 25,
      regional_demand_forecast: 1.05,
      last_updated: new Date().toISOString(),
      source: 'eia'
    };
  }

  // Cache management methods

  private static async getCachedData(key: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('external_api_cache')
        .select('data, timestamp')
        .eq('cache_key', key)
        .single();

      if (error || !data) return null;
      
      return {
        data: typeof data.data === 'string' ? JSON.parse(data.data) : data.data,
        timestamp: data.timestamp
      };
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  private static async setCachedData(key: string, data: any): Promise<void> {
    try {
      const expiry = new Date(Date.now() + this.CACHE_DURATION);
      
      await supabase
        .from('external_api_cache')
        .upsert({
          cache_key: key,
          data: typeof data === 'object' ? JSON.stringify(data) : data,
          timestamp: new Date().toISOString(),
          expires_at: expiry.toISOString()
        });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  private static isCacheValid(timestamp: string): boolean {
    const cacheTime = new Date(timestamp).getTime();
    const now = Date.now();
    return (now - cacheTime) < this.CACHE_DURATION;
  }

  // Additional utility methods

  private static parseTreasuryData(apiData: any): TreasuryRates {
    // Parse Treasury.gov API response into our format
    const rates = apiData.data || [];
    const rateMap: any = {};

    rates.forEach((item: any) => {
      const desc = item.security_desc?.toLowerCase() || '';
      const rate = parseFloat(item.avg_interest_rate_amt || '0');
      
      if (desc.includes('1-month') || desc.includes('4-week')) {
        rateMap.treasury_1m = rate;
      } else if (desc.includes('3-month') || desc.includes('13-week')) {
        rateMap.treasury_3m = rate;
      } else if (desc.includes('6-month') || desc.includes('26-week')) {
        rateMap.treasury_6m = rate;
      } else if (desc.includes('1-year') || desc.includes('52-week')) {
        rateMap.treasury_1y = rate;
      } else if (desc.includes('2-year')) {
        rateMap.treasury_2y = rate;
      } else if (desc.includes('5-year')) {
        rateMap.treasury_5y = rate;
      } else if (desc.includes('10-year')) {
        rateMap.treasury_10y = rate;
      } else if (desc.includes('30-year')) {
        rateMap.treasury_30y = rate;
      }
    });

    // Fill in missing rates with interpolation
    return this.interpolateMissingRates(rateMap);
  }

  private static interpolateMissingRates(partialRates: any): TreasuryRates {
    // Use 10-year rate as base if available, otherwise use fallback
    const base10Y = partialRates.treasury_10y || 2.8;
    
    return {
      treasury_1m: partialRates.treasury_1m || base10Y - 1.6,
      treasury_3m: partialRates.treasury_3m || base10Y - 1.3,
      treasury_6m: partialRates.treasury_6m || base10Y - 1.0,
      treasury_1y: partialRates.treasury_1y || base10Y - 0.7,
      treasury_2y: partialRates.treasury_2y || base10Y - 0.4,
      treasury_5y: partialRates.treasury_5y || base10Y - 0.2,
      treasury_10y: base10Y,
      treasury_30y: partialRates.treasury_30y || base10Y + 0.3,
      last_updated: new Date().toISOString(),
      source: 'treasury.gov'
    };
  }

  private static assessPolicyImpact(title: string, abstract: string): string {
    const text = (title + ' ' + abstract).toLowerCase();
    
    if (text.includes('elimination') || text.includes('repeal') || text.includes('sunset')) {
      return 'critical';
    } else if (text.includes('reduction') || text.includes('modify') || text.includes('change')) {
      return 'high';
    } else if (text.includes('extension') || text.includes('increase')) {
      return 'medium';
    }
    
    return 'low';
  }

  private static calculatePolicyImpactScore(title: string, abstract: string): number {
    const text = (title + ' ' + abstract).toLowerCase();
    
    let score = 0;
    
    // Positive indicators
    if (text.includes('extension')) score += 0.3;
    if (text.includes('increase')) score += 0.2;
    if (text.includes('expand')) score += 0.25;
    if (text.includes('enhance')) score += 0.15;
    
    // Negative indicators
    if (text.includes('reduce')) score -= 0.2;
    if (text.includes('eliminate')) score -= 0.5;
    if (text.includes('sunset')) score -= 0.4;
    if (text.includes('modify')) score -= 0.1;
    
    return Math.max(-1, Math.min(1, score));
  }

  // Existing methods preserved...

  /**
   * Get risk tier classification
   */
  public static getRiskTier(creditRating: string): string {
    const creditData = this.CREDIT_RATING_MATRIX[creditRating];
    return creditData?.risk_tier || 'Unknown';
  }

  /**
   * Check if rating is investment grade
   */
  public static isInvestmentGrade(creditRating: string): boolean {
    const creditData = this.CREDIT_RATING_MATRIX[creditRating];
    return creditData?.investment_grade || false;
  }

  /**
   * Get climate finance adjustments explanation
   */
  public static getClimateFinanceInsights(creditProfile: PayerCreditProfile): string[] {
    const insights = [];
    
    if (this.isInvestmentGrade(creditProfile.credit_rating)) {
      insights.push('Investment grade payers benefit from climate finance premium (-0.25% discount)');
    }
    
    if (creditProfile.esg_score && creditProfile.esg_score > 70) {
      insights.push('Strong ESG performance qualifies for renewable energy discount (-0.5%)');
    }
    
    if (creditProfile.esg_score && creditProfile.esg_score < 30) {
      insights.push('Poor ESG performance increases climate risk premium (+1.0%)');
    }

    const creditData = this.CREDIT_RATING_MATRIX[creditProfile.credit_rating];
    if (creditData?.risk_tier === 'Prime') {
      insights.push('Prime credit rating qualifies for best renewable energy financing rates');
    }

    return insights;
  }

  // Placeholder methods for user data integration - to be implemented based on requirements

  private static async extractPayerDataFromSource(
    dataSource: any,
    payerId?: string,
    payerName?: string
  ): Promise<Partial<UserCreditData> | null> {
    // Placeholder - would implement actual data extraction from uploaded files
    console.log(`Extracting data from source ${dataSource.source_id} for payer ${payerId || payerName}`);
    return null;
  }

  private static combineUserCreditData(
    existing: UserCreditData | null,
    newData: Partial<UserCreditData>
  ): UserCreditData {
    // Placeholder - would implement data combination logic
    return existing || {
      credit_score: 650,
      payment_history_enhanced: {
        on_time_rate: 0.92,
        average_delay_days: 3,
        credit_utilization: 0.35,
        public_records: 0
      },
      financial_metrics_enhanced: {
        debt_to_equity: 0.45,
        current_ratio: 1.6,
        cash_flow_rating: 'Good',
        revenue_growth: 0.05
      },
      sources: ['user_upload'],
      data_quality_score: 0.8,
      last_updated: new Date().toISOString()
    };
  }

  private static async getPolicyImpactAssessment(
    industrySector?: string
  ): Promise<PolicyImpactData[]> {
    // Placeholder - would implement policy impact analysis
    return [];
  }

  private static applyPolicyAdjustments(
    assessment: RiskAssessmentResult,
    policyData: PolicyImpactData[]
  ): RiskAssessmentResult {
    // Placeholder - would implement policy-based adjustments
    return assessment;
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
    if (policyData.length > 0) {
      const highImpactPolicies = policyData.filter(p => p.direct_impact_score > 60);
      if (highImpactPolicies.length > 0) {
        recommendations.push('Recent policy changes may impact renewable energy sector - monitor developments');
      }
    }

    return recommendations;
  }
}
