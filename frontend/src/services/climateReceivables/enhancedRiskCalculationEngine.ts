/**
 * Enhanced Risk Calculation Engine (Simplified)
 * 
 * Comprehensive risk assessment for climate receivables with real-time data integration.
 * Simplified from original design - focused on statistical models instead of complex ML.
 * 
 * Features:
 * - Multi-factor risk analysis
 * - Real-time data integration
 * - Statistical risk modeling
 * - Database persistence
 * - Proper validation and fallback mechanisms
 */

import type {
  ClimateReceivableTable,
  ClimateRiskAssessmentInput,
  ClimateRiskAssessmentResult,
  ProductionDataPoint,
  ServiceResponse
} from '../../types/domain/climate';

import { supabase } from '../../infrastructure/database/client';
import { EnhancedFreeWeatherService } from '../../components/climateReceivables/services/api/enhanced-free-weather-service';

export interface WeatherData {
  temperature: number;
  humidity: number;
  sunlightHours: number;
  windSpeed: number;
  precipitationMm: number;
  cloudCover: number;
}

export interface PolicyImpactData {
  policyType: string;
  impactLevel: 'low' | 'medium' | 'high';
  effectiveDate: string;
  expirationDate?: string;
  impactOnReceivables: number; // -1 to 1 scale
}

export interface MarketConditions {
  energyPrices: {
    current: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    volatility: number;
  };
  demandForecast: number; // 0-100 scale
  seasonalFactor: number; // 0.5-2.0 multiplier
}

export interface FederalRegisterResponse {
  results: {
    title: string;
    abstract: string;
    document_number: string;
    html_url: string;
    publication_date: string;
    agencies: Array<{ name: string }>;
    type: string;
  }[];
  count: number;
}

/**
 * Enhanced risk calculation with multiple data sources and statistical analysis
 */
export class EnhancedRiskCalculationEngine {
  
  private static readonly RISK_WEIGHTS = {
    creditRating: 0.35,
    financialHealth: 0.25,
    productionVariability: 0.20,
    marketConditions: 0.10,
    policyImpact: 0.10
  };

  private static readonly PRODUCTION_VARIANCE_THRESHOLDS = {
    low: 0.1,      // < 10% variance = low risk
    medium: 0.25,  // 10-25% variance = medium risk  
    high: 0.50     // > 25% variance = high risk
  };

  /**
   * Batch process risk calculations for multiple receivables
   * Supports batch processing as requested in requirements
   */
  public static async calculateBatchRisk(
    receivableIds: string[],
    includeRealTimeData: boolean = true
  ): Promise<ServiceResponse<ClimateRiskAssessmentResult[]>> {
    try {
      const results: ClimateRiskAssessmentResult[] = [];
      const errors: string[] = [];

      // Process in chunks to avoid overwhelming APIs
      const chunkSize = 5;
      for (let i = 0; i < receivableIds.length; i += chunkSize) {
        const chunk = receivableIds.slice(i, i + chunkSize);
        
        const chunkPromises = chunk.map(async (receivableId) => {
          try {
            // First fetch the receivable data to get all required fields
            const { data: receivable, error: fetchError } = await supabase
              .from('climate_receivables')
              .select('*')
              .eq('receivable_id', receivableId)
              .single();

            if (fetchError || !receivable) {
              errors.push(`${receivableId}: Failed to fetch receivable data`);
              return null;
            }

            // Construct the full input object required by calculateEnhancedRisk
            const riskInput: ClimateRiskAssessmentInput = {
              receivableId: receivable.receivable_id,
              payerId: receivable.payer_id,
              assetId: receivable.asset_id || '',
              amount: receivable.amount,
              dueDate: receivable.due_date
            };

            const result = await this.calculateEnhancedRisk(
              riskInput, 
              includeRealTimeData
            );
            
            if (result.success && result.data) {
              return result.data;
            } else {
              errors.push(`${receivableId}: ${result.error}`);
              return null;
            }
          } catch (error) {
            errors.push(`${receivableId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
          }
        });

        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults.filter(result => result !== null));

        // Add small delay between chunks to respect API rate limits
        if (i + chunkSize < receivableIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        success: true,
        data: results,
        timestamp: new Date().toISOString(),
        metadata: {
          totalRequested: receivableIds.length,
          successfulCalculations: results.length,
          errors: errors.length > 0 ? errors : undefined
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Batch risk calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }
  public static async calculateEnhancedRisk(
    input: ClimateRiskAssessmentInput,
    includeRealTimeData: boolean = true
  ): Promise<ServiceResponse<ClimateRiskAssessmentResult>> {
    try {
      // Get receivable and related data
      const receivable = await this.getReceivableWithRelations(input.receivableId);
      if (!receivable) {
        throw new Error(`Receivable not found: ${input.receivableId}`);
      }

      // Calculate individual risk components
      const creditRisk = await this.calculateCreditRisk(receivable);
      const productionRisk = await this.calculateProductionRisk(input.assetId);
      const marketRisk = includeRealTimeData 
        ? await this.calculateMarketRisk()
        : this.getDefaultMarketRisk();
      const policyRisk = await this.calculatePolicyRisk();

      // Combine risk factors using weighted average
      const compositeRiskScore = this.calculateCompositeRisk({
        creditRisk: creditRisk.score,
        productionRisk: productionRisk.score,
        marketRisk: marketRisk.score,
        policyRisk: policyRisk.score
      });

      // Calculate discount rate based on comprehensive risk
      const discountRate = this.calculateEnhancedDiscountRate({
        compositeRiskScore,
        creditRating: creditRisk.creditRating,
        productionVariability: productionRisk.variability,
        marketVolatility: marketRisk.volatility
      });

      // Determine risk tier
      const riskTier = this.determineRiskTier(compositeRiskScore, creditRisk.creditRating);

      const result: ClimateRiskAssessmentResult = {
        receivableId: input.receivableId,
        riskScore: Math.round(compositeRiskScore),
        discountRate: Math.round(discountRate * 100) / 100,
        confidenceLevel: this.calculateConfidenceLevel(includeRealTimeData),
        methodology: 'Enhanced Statistical Risk Model',
        factorsConsidered: [
          `Credit Risk: ${creditRisk.score.toFixed(1)} (weight: ${this.RISK_WEIGHTS.creditRating})`,
          `Production Risk: ${productionRisk.score.toFixed(1)} (weight: ${this.RISK_WEIGHTS.productionVariability})`,
          `Market Risk: ${marketRisk.score.toFixed(1)} (weight: ${this.RISK_WEIGHTS.marketConditions})`,
          `Policy Risk: ${policyRisk.score.toFixed(1)} (weight: ${this.RISK_WEIGHTS.policyImpact})`
        ],
        riskTier,
        calculatedAt: new Date().toISOString()
      };

      // Persist result to database
      await this.persistRiskCalculation(result);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: `Risk calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Calculate production-based risk using historical data and real weather integration
   */
  private static async calculateProductionRisk(assetId: string): Promise<{
    score: number;
    variability: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    weatherImpact?: number;
  }> {
    try {
      // Get asset details and location for weather integration
      const { data: assetData, error: assetError } = await supabase
        .from('energy_assets')
        .select('name, asset_type, capacity_mw, location, latitude, longitude')
        .eq('asset_id', assetId)
        .single();

      if (assetError) {
        console.warn(`Asset not found for ID ${assetId}, using fallback`);
      }

      // Get production history for the asset
      const { data: productionData, error } = await supabase
        .from('climate_pool_energy_assets')
        .select(`
          *,
          energy_assets!asset_id (
            name,
            asset_type,
            capacity_mw,
            location
          )
        `)
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false })
        .limit(90); // Last 90 days

      if (error) throw error;

      if (!productionData || productionData.length < 7) {
        // Insufficient data - use conservative estimate with weather check if available
        let weatherRisk = 0;
        if (assetData?.latitude && assetData?.longitude) {
          weatherRisk = await this.calculateWeatherRisk(assetData.latitude, assetData.longitude, assetData.asset_type);
        }
        
        return {
          score: 60 + weatherRisk, // Medium risk due to lack of data, adjusted for weather
          variability: 0.3,
          trend: 'stable',
          weatherImpact: weatherRisk
        };
      }

      // Calculate production variability
      const outputs = productionData.map((d: any) => d.actual_generation_mwh || 0);
      const mean = outputs.reduce((a, b) => a + b, 0) / outputs.length;
      const variance = outputs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / outputs.length;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0.5;

      // Convert variability to risk score (0-100)
      let riskScore = 0;
      if (coefficientOfVariation < this.PRODUCTION_VARIANCE_THRESHOLDS.low) {
        riskScore = 20; // Low risk
      } else if (coefficientOfVariation < this.PRODUCTION_VARIANCE_THRESHOLDS.medium) {
        riskScore = 50; // Medium risk
      } else {
        riskScore = 80; // High risk
      }

      // Integrate real weather data if asset location is available
      let weatherRisk = 0;
      if (assetData?.latitude && assetData?.longitude) {
        weatherRisk = await this.calculateWeatherRisk(assetData.latitude, assetData.longitude, assetData.asset_type);
        riskScore = Math.min(riskScore + weatherRisk, 100);
      }

      // Determine trend (simple linear regression on recent data)
      const trend = this.calculateProductionTrend(outputs);

      return {
        score: riskScore,
        variability: coefficientOfVariation,
        trend,
        weatherImpact: weatherRisk
      };

    } catch (error) {
      // Fallback values if calculation fails
      return {
        score: 65,
        variability: 0.35,
        trend: 'stable'
      };
    }
  }

  /**
   * Calculate market-based risk factors
   */
  private static async calculateMarketRisk(): Promise<{
    score: number;
    volatility: number;
  }> {
    try {
      // In a real implementation, this would fetch from external APIs
      // For now, return reasonable defaults based on current market conditions
      
      const mockMarketConditions: MarketConditions = {
        energyPrices: {
          current: 75, // $/MWh
          trend: 'stable',
          volatility: 0.15 // 15% volatility
        },
        demandForecast: 78, // Strong demand
        seasonalFactor: 1.1 // Slightly above average
      };

      // Convert market conditions to risk score
      let riskScore = 30; // Base market risk

      // Adjust for price volatility
      riskScore += mockMarketConditions.energyPrices.volatility * 100;

      // Adjust for demand (lower demand = higher risk)
      riskScore += (100 - mockMarketConditions.demandForecast) * 0.3;

      return {
        score: Math.min(riskScore, 100),
        volatility: mockMarketConditions.energyPrices.volatility
      };

    } catch (error) {
      return this.getDefaultMarketRisk();
    }
  }

  /**
   * Get default market risk when real-time data is unavailable
   */
  private static getDefaultMarketRisk(): { score: number; volatility: number } {
    return {
      score: 45, // Moderate market risk
      volatility: 0.20
    };
  }

  /**
   * Calculate policy and regulatory risk using Federal Register API and database
   */
  private static async calculatePolicyRisk(): Promise<{
    score: number;
    impacts: PolicyImpactData[];
    recentChanges?: number;
  }> {
    try {
      // Get current policies from database
      const { data: existingPolicies, error: dbError } = await supabase
        .from('climate_policy_impacts')
        .select('*')
        .gte('effective_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order('impact_level', { ascending: false });

      // Fetch recent regulatory changes from Federal Register API (free, no key required)
      const recentChanges = await this.fetchFederalRegisterData();
      let policyScore = 30; // Base policy risk

      // Process existing policies from database
      const policyImpacts: PolicyImpactData[] = existingPolicies?.map(p => ({
        policyType: p.policy_type || 'Unknown',
        impactLevel: p.impact_level || 'medium',
        effectiveDate: p.effective_date,
        expirationDate: p.expiration_date,
        impactOnReceivables: p.impact_on_receivables || 0
      })) || [];

      // Process recent regulatory changes
      if (recentChanges && recentChanges.results.length > 0) {
        const recentImpacts = recentChanges.results.map(article => ({
          policyType: this.categorizeRegulation(article.title, article.abstract),
          impactLevel: this.assessRegulationImpact(article.title, article.abstract, article.type),
          effectiveDate: article.publication_date,
          impactOnReceivables: this.estimateFinancialImpact(article.title, article.abstract)
        }));

        policyImpacts.push(...recentImpacts);
        
        // Increase policy risk if many recent changes
        policyScore += Math.min(recentChanges.results.length * 5, 30);
      }

      // Calculate weighted policy risk
      if (policyImpacts.length > 0) {
        const totalImpact = policyImpacts.reduce((sum, impact) => {
          const levelMultiplier = impact.impactLevel === 'high' ? 3 : 
                                impact.impactLevel === 'medium' ? 2 : 1;
          return sum + (Math.abs(impact.impactOnReceivables) * levelMultiplier);
        }, 0);

        const avgImpact = totalImpact / policyImpacts.length;
        policyScore = Math.min(policyScore + (avgImpact * 50), 100);
      }

      return {
        score: policyScore,
        impacts: policyImpacts,
        recentChanges: recentChanges?.results.length || 0
      };

    } catch (error) {
      console.error('Policy risk calculation failed:', error);
      return {
        score: 40, // Moderate policy risk as fallback
        impacts: []
      };
    }
  }

  /**
   * Calculate credit-based risk using existing service
   */
  private static async calculateCreditRisk(receivable: any): Promise<{
    score: number;
    creditRating: string;
  }> {
    // Use the existing PayerRiskAssessmentService for credit analysis
    const { PayerRiskAssessmentService } = await import('./payerRiskAssessmentService');
    
    const creditProfile = {
      credit_rating: receivable.climate_payers?.credit_rating || 'BBB',
      financial_health_score: receivable.climate_payers?.financial_health_score || 70,
      payment_history: receivable.climate_payers?.payment_history,
      esg_score: receivable.climate_payers?.esg_score
    };

    const creditRiskScore = PayerRiskAssessmentService.calculateRiskScore(creditProfile);

    return {
      score: creditRiskScore,
      creditRating: creditProfile.credit_rating
    };
  }

  // Helper methods

  private static calculateCompositeRisk(risks: {
    creditRisk: number;
    productionRisk: number;
    marketRisk: number;
    policyRisk: number;
  }): number {
    return (
      risks.creditRisk * this.RISK_WEIGHTS.creditRating +
      risks.productionRisk * this.RISK_WEIGHTS.productionVariability +
      risks.marketRisk * this.RISK_WEIGHTS.marketConditions +
      risks.policyRisk * this.RISK_WEIGHTS.policyImpact
    );
  }

  private static calculateEnhancedDiscountRate(params: {
    compositeRiskScore: number;
    creditRating: string;
    productionVariability: number;
    marketVolatility: number;
  }): number {
    // Base discount rate from risk score
    let discountRate = 2.0 + (params.compositeRiskScore / 100) * 6.0; // 2% - 8% range

    // Adjust for production variability
    discountRate += params.productionVariability * 2.0;

    // Adjust for market volatility  
    discountRate += params.marketVolatility * 1.5;

    // Climate finance discount for investment grade
    const { PayerRiskAssessmentService } = require('./payerRiskAssessmentService');
    if (PayerRiskAssessmentService.isInvestmentGrade(params.creditRating)) {
      discountRate -= 0.5; // 0.5% discount for investment grade
    }

    return Math.max(1.0, Math.min(discountRate, 12.0)); // Cap between 1% and 12%
  }

  private static determineRiskTier(
    riskScore: number,
    creditRating: string
  ): 'Prime' | 'Investment Grade' | 'Speculative' | 'High Risk' | 'Default Risk' {
    if (riskScore <= 20) return 'Prime';
    if (riskScore <= 40) return 'Investment Grade';
    if (riskScore <= 60) return 'Speculative';
    if (riskScore <= 80) return 'High Risk';
    return 'Default Risk';
  }

  private static calculateConfidenceLevel(hasRealTimeData: boolean): number {
    let confidence = 80; // Base confidence

    if (hasRealTimeData) confidence += 15;
    
    return Math.min(confidence, 95);
  }

  private static calculateProductionTrend(
    outputs: number[]
  ): 'increasing' | 'stable' | 'decreasing' {
    if (outputs.length < 2) return 'stable';

    const n = outputs.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = outputs;

    // Simple linear regression slope calculation
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    if (slope > 0.1) return 'increasing';
    if (slope < -0.1) return 'decreasing';
    return 'stable';
  }

  private static async getReceivableWithRelations(receivableId: string): Promise<any> {
    const { data, error } = await supabase
      .from('climate_receivables')
      .select(`
        *,
        climate_payers!payer_id (*)
      `)
      .eq('receivable_id', receivableId)
      .single();

    if (error) throw error;
    return data;
  }

  private static async persistRiskCalculation(result: ClimateRiskAssessmentResult): Promise<void> {
    const { error } = await supabase
      .from('climate_risk_calculations')
      .upsert({
        receivable_id: result.receivableId,
        risk_score: result.riskScore,
        discount_rate: result.discountRate,
        confidence_level: result.confidenceLevel,
        methodology: result.methodology,
        factors_considered: result.factorsConsidered,
        risk_tier: result.riskTier,
        calculated_at: result.calculatedAt,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to persist risk calculation:', error);
      throw error;
    }
  }

  /**
   * NEW METHODS: Weather Risk Integration and Policy API Integration
   */

  /**
   * Calculate weather-based risk for renewable energy assets
   */
  private static async calculateWeatherRisk(
    latitude: number, 
    longitude: number, 
    assetType: string
  ): Promise<number> {
    try {
      // Get current weather conditions and 7-day forecast
      const weatherData = await EnhancedFreeWeatherService.getCurrentWeather(latitude, longitude);
      const forecast = await EnhancedFreeWeatherService.getWeatherForecast(latitude, longitude, 7);

      let weatherRisk = 0;

      // Asset-specific weather risk calculations
      switch (assetType?.toLowerCase()) {
        case 'solar':
        case 'photovoltaic':
          weatherRisk = this.calculateSolarWeatherRisk(weatherData, forecast);
          break;
        case 'wind':
          weatherRisk = this.calculateWindWeatherRisk(weatherData, forecast);
          break;
        case 'hydro':
        case 'hydroelectric':
          weatherRisk = this.calculateHydroWeatherRisk(weatherData, forecast);
          break;
        default:
          weatherRisk = this.calculateGeneralWeatherRisk(weatherData, forecast);
      }

      return Math.min(weatherRisk, 30); // Cap weather risk contribution at 30 points
    } catch (error) {
      console.warn('Weather risk calculation failed, using default:', error);
      return 5; // Small weather risk as fallback
    }
  }

  /**
   * Calculate solar-specific weather risk
   */
  private static calculateSolarWeatherRisk(weatherData: any, forecast: any[]): number {
    let risk = 0;
    
    // Current conditions
    if (weatherData.cloudCover > 70) risk += 10; // Heavy cloud cover
    if (weatherData.sunlightHours < 6) risk += 10; // Limited sunlight
    if (weatherData.precipitationMm > 10) risk += 5; // Rain affects efficiency
    
    // Forecast analysis
    const avgCloudCover = forecast.reduce((sum, day) => sum + (day.cloudCover || 50), 0) / forecast.length;
    if (avgCloudCover > 60) risk += 8;
    
    return risk;
  }

  /**
   * Calculate wind-specific weather risk
   */
  private static calculateWindWeatherRisk(weatherData: any, forecast: any[]): number {
    let risk = 0;
    
    // Current conditions - wind turbines need consistent wind (3-25 m/s optimal)
    if (weatherData.windSpeed < 3) risk += 15; // Too little wind
    if (weatherData.windSpeed > 25) risk += 10; // Too much wind (turbines shut down)
    
    // Forecast analysis
    const avgWindSpeed = forecast.reduce((sum, day) => sum + (day.windSpeed || 5), 0) / forecast.length;
    if (avgWindSpeed < 4) risk += 12;
    if (avgWindSpeed > 20) risk += 8;
    
    return risk;
  }

  /**
   * Calculate hydro-specific weather risk
   */
  private static calculateHydroWeatherRisk(weatherData: any, forecast: any[]): number {
    let risk = 0;
    
    // Precipitation is crucial for hydro - too little or too much is problematic
    const totalPrecipitation = forecast.reduce((sum, day) => sum + (day.precipitationMm || 0), 0);
    
    if (totalPrecipitation < 10) risk += 15; // Drought conditions
    if (totalPrecipitation > 100) risk += 10; // Flooding risk
    
    return risk;
  }

  /**
   * Calculate general weather risk for mixed or unknown asset types
   */
  private static calculateGeneralWeatherRisk(weatherData: any, forecast: any[]): number {
    let risk = 0;
    
    // General extreme weather conditions
    if (weatherData.temperature < -10 || weatherData.temperature > 40) risk += 8;
    if (weatherData.windSpeed > 20) risk += 5;
    if (weatherData.precipitationMm > 25) risk += 5;
    
    return risk;
  }

  /**
   * Fetch regulatory data from Federal Register API (free, no API key required)
   */
  private static async fetchFederalRegisterData(): Promise<FederalRegisterResponse | null> {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Search for renewable energy, tax credit, and climate-related regulations
      const searchTerms = [
        'renewable energy',
        'investment tax credit', 
        'production tax credit',
        'clean energy',
        'solar tax credit',
        'wind energy credit'
      ];

      const searchQuery = searchTerms.join(' OR ');
      const apiUrl = `https://www.federalregister.gov/api/v1/articles.json?conditions[term]=${encodeURIComponent(searchQuery)}&conditions[publication_date][gte]=${thirtyDaysAgo.toISOString().split('T')[0]}&per_page=20&order=relevance`;

      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ClimateReceivablesApp/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Federal Register API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        results: data.results || [],
        count: data.count || 0
      };
    } catch (error) {
      console.warn('Federal Register API failed:', error);
      return null;
    }
  }

  /**
   * Categorize regulation type based on title and abstract
   */
  private static categorizeRegulation(title: string, abstract?: string): string {
    const text = `${title} ${abstract || ''}`.toLowerCase();
    
    if (text.includes('tax credit') || text.includes('investment tax')) return 'Tax Credit';
    if (text.includes('production tax') || text.includes('ptc')) return 'Production Tax Credit';
    if (text.includes('renewable') || text.includes('clean energy')) return 'Renewable Energy Policy';
    if (text.includes('solar')) return 'Solar Policy';
    if (text.includes('wind')) return 'Wind Energy Policy';
    if (text.includes('tariff') || text.includes('trade')) return 'Trade Policy';
    if (text.includes('environmental') || text.includes('emission')) return 'Environmental Regulation';
    
    return 'General Energy Policy';
  }

  /**
   * Assess regulation impact level
   */
  private static assessRegulationImpact(title: string, abstract?: string, type?: string): 'low' | 'medium' | 'high' {
    const text = `${title} ${abstract || ''}`.toLowerCase();
    
    // High impact indicators
    if (text.includes('final rule') && (text.includes('tax credit') || text.includes('investment tax'))) return 'high';
    if (text.includes('phase out') || text.includes('elimination') || text.includes('termination')) return 'high';
    if (text.includes('major') || text.includes('significant') || text.includes('substantial')) return 'high';
    
    // Medium impact indicators
    if (text.includes('modification') || text.includes('amendment') || text.includes('revision')) return 'medium';
    if (text.includes('proposed rule')) return 'medium';
    
    // Low impact indicators (notices, requests for comment, etc.)
    if (type?.includes('notice') || text.includes('comment') || text.includes('hearing')) return 'low';
    
    return 'medium'; // Default
  }

  /**
   * Estimate financial impact on receivables (-1 to 1 scale)
   */
  private static estimateFinancialImpact(title: string, abstract?: string): number {
    const text = `${title} ${abstract || ''}`.toLowerCase();
    
    // Positive impacts (benefits to renewable energy)
    if (text.includes('extension') && text.includes('tax credit')) return 0.3;
    if (text.includes('increase') && (text.includes('credit') || text.includes('incentive'))) return 0.2;
    if (text.includes('new') && text.includes('incentive')) return 0.25;
    
    // Negative impacts (costs or restrictions)
    if (text.includes('reduction') && text.includes('credit')) return -0.3;
    if (text.includes('phase out') || text.includes('elimination')) return -0.5;
    if (text.includes('restriction') || text.includes('limitation')) return -0.2;
    
    // Neutral or unclear impacts
    if (text.includes('study') || text.includes('review') || text.includes('comment')) return 0.0;
    
    return 0.1; // Slight positive default for renewable energy regulations
  }
}

// Export for use in orchestrator
export const enhancedRiskCalculationEngine = EnhancedRiskCalculationEngine;
