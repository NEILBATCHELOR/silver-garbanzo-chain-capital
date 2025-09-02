import { supabase } from '@/infrastructure/database/client';
import { EnhancedExternalAPIService } from '../api/enhanced-external-api-service';
import { 
  ClimateReceivable, 
  EnergyAsset, 
  ClimatePayer,
  RiskLevel
} from '../../types';

/**
 * Automated risk calculation result
 */
interface AutomatedRiskResult {
  receivableId: string;
  calculatedAt: string;
  riskComponents: {
    productionRisk: {
      score: number;
      factors: string[];
      confidence: number;
      lastWeatherUpdate: string;
    };
    creditRisk: {
      score: number;
      factors: string[];
      confidence: number;
      lastCreditUpdate: string;
    };
    policyRisk: {
      score: number;
      factors: string[];
      confidence: number;
      lastPolicyUpdate: string;
    };
  };
  compositeRisk: {
    score: number;
    level: RiskLevel;
    confidence: number;
  };
  discountRate: {
    calculated: number;
    previous: number;
    change: number;
    reason: string;
  };
  recommendations: string[];
  alerts: {
    level: 'info' | 'warning' | 'critical';
    message: string;
    action: string;
  }[];
  nextReviewDate: string;
}

/**
 * Risk factor weight configuration
 */
interface RiskWeightConfig {
  productionRisk: number;
  creditRisk: number;
  policyRisk: number;
  seasonalAdjustment: number;
  marketVolatilityAdjustment: number;
}

/**
 * Automated risk calculation schedule
 */
interface RiskCalculationSchedule {
  receivableId: string;
  lastCalculated: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  nextDue: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  automatedTriggers: {
    weatherChange: boolean;
    creditRatingChange: boolean;
    policyAlert: boolean;
    marketEvent: boolean;
  };
}

/**
 * Automated Risk Calculation Engine
 * Continuously monitors and calculates risk scores with real-time data integration
 */
export class AutomatedRiskCalculationEngine {
  private static readonly DEFAULT_WEIGHTS: RiskWeightConfig = {
    productionRisk: 0.4,
    creditRisk: 0.4,
    policyRisk: 0.2,
    seasonalAdjustment: 0.05,
    marketVolatilityAdjustment: 0.03
  };

  private static readonly RISK_THRESHOLDS = {
    low: 30,
    medium: 70,
    high: 90
  };

  private static readonly CALCULATION_FREQUENCIES = {
    high_risk: 'daily' as const,
    medium_risk: 'weekly' as const,
    low_risk: 'monthly' as const
  };

  private static readonly ALERT_THRESHOLDS = {
    score_change: 15, // Alert if risk score changes by more than 15 points
    discount_rate_change: 0.005, // Alert if discount rate changes by more than 0.5%
    confidence_drop: 20 // Alert if confidence drops by more than 20%
  };

  /**
   * Initialize automated risk calculation for all receivables
   * @returns Number of receivables scheduled for automated calculation
   */
  public static async initializeAutomatedCalculation(): Promise<number> {
    try {
      console.log('Initializing automated risk calculation engine...');

      // Get all active receivables
      const receivables = await this.getAllActiveReceivables();
      let scheduledCount = 0;

      for (const receivable of receivables) {
        try {
          // Calculate initial risk if not already done
          await this.performAutomatedRiskCalculation(receivable.receivableId);
          
          // Set up calculation schedule
          await this.runScheduledCalculations();
          
          scheduledCount++;
        } catch (error) {
          console.error(`Failed to initialize risk calculation for receivable ${receivable.receivableId}:`, error);
        }
      }

      console.log(`Automated risk calculation initialized for ${scheduledCount} receivables`);
      return scheduledCount;
    } catch (error) {
      console.error('Failed to initialize automated risk calculation:', error);
      return 0;
    }
  }

  /**
   * Perform automated risk calculation for a specific receivable
   * @param receivableId Receivable ID to calculate
   * @param forceRecalculation Force recalculation even if recently calculated
   * @returns Automated risk calculation result
   */
  public static async performAutomatedRiskCalculation(
    receivableId: string,
    forceRecalculation: boolean = false
  ): Promise<AutomatedRiskResult> {
    try {
      console.log(`Starting automated risk calculation for receivable: ${receivableId}`);

      // Get receivable with related data
      const receivable = await this.getReceivableWithRelations(receivableId);
      if (!receivable) {
        throw new Error(`Receivable ${receivableId} not found`);
      }

      // Check if calculation is needed
      if (!forceRecalculation && !(await this.isCalculationNeeded(receivableId))) {
        console.log(`Risk calculation not needed for receivable ${receivableId}`);
        const lastCalculation = await this.getLastCalculationResult(receivableId);
        if (!lastCalculation) {
          // No previous calculation exists, proceed with new calculation
          console.log(`No previous calculation found for receivable ${receivableId}, performing initial calculation`);
        } else {
          return lastCalculation;
        }
      }

      // Get previous calculation for comparison (null for new receivables)
      const previousCalculation = await this.getLastCalculationResult(receivableId);
      
      if (previousCalculation) {
        console.log(`Performing comparative risk calculation for receivable ${receivableId}`);
      } else {
        console.log(`Performing initial risk calculation for receivable ${receivableId}`);
      }

      // Calculate production risk with real-time weather data
      const productionRiskResult = await this.calculateAutomatedProductionRisk(receivable);

      // Calculate credit risk with real-time credit data
      const creditRiskResult = await this.calculateAutomatedCreditRisk(receivable);

      // Calculate policy risk with real-time regulatory data
      const policyRiskResult = await this.calculateAutomatedPolicyRisk(receivable);

      // Calculate composite risk with dynamic weighting
      const compositeRisk = await this.calculateCompositeRisk(
        productionRiskResult,
        creditRiskResult,
        policyRiskResult,
        receivable
      );

      // Calculate dynamic discount rate
      const discountRate = await this.calculateDynamicDiscountRate(
        compositeRisk,
        receivable,
        previousCalculation
      );

      // Generate recommendations
      const recommendations = this.generateAutomatedRecommendations(
        productionRiskResult,
        creditRiskResult,
        policyRiskResult,
        compositeRisk,
        discountRate
      );

      // Generate alerts
      const alerts = this.generateRiskAlerts(
        compositeRisk,
        discountRate,
        previousCalculation,
        productionRiskResult,
        creditRiskResult,
        policyRiskResult
      );

      // Build result
      const result: AutomatedRiskResult = {
        receivableId,
        calculatedAt: new Date().toISOString(),
        riskComponents: {
          productionRisk: productionRiskResult,
          creditRisk: creditRiskResult,
          policyRisk: policyRiskResult
        },
        compositeRisk,
        discountRate,
        recommendations,
        alerts,
        nextReviewDate: this.calculateNextReviewDate(compositeRisk.level)
      };

      // Save calculation result
      await this.saveCalculationResult(result);

      // Update receivable with new risk scores
      await this.updateReceivableRiskScores(receivableId, result);

      // Schedule next calculation
      await this.updateCalculationSchedule(receivableId, result);

      console.log(`Automated risk calculation completed for receivable: ${receivableId}`);
      return result;

    } catch (error) {
      console.error(`Automated risk calculation failed for receivable ${receivableId}:`, error);
      throw error;
    }
  }

  /**
   * Run automated risk calculations for all due receivables
   * @returns Summary of calculations performed
   */
  public static async runScheduledCalculations(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    alerts: number;
  }> {
    try {
      console.log('Running scheduled risk calculations...');

      // Get receivables due for calculation
      const dueReceivables = await this.getReceivablesDueForCalculation();
      
      let successful = 0;
      let failed = 0;
      let totalAlerts = 0;

      for (const receivableId of dueReceivables) {
        try {
          const result = await this.performAutomatedRiskCalculation(receivableId);
          successful++;
          totalAlerts += result.alerts.length;
        } catch (error) {
          console.error(`Scheduled calculation failed for receivable ${receivableId}:`, error);
          failed++;
        }
      }

      // Process event-driven calculations
      const eventDrivenReceivables = await this.getEventTriggeredReceivables();
      
      for (const receivableId of eventDrivenReceivables) {
        try {
          const result = await this.performAutomatedRiskCalculation(receivableId, true);
          successful++;
          totalAlerts += result.alerts.length;
        } catch (error) {
          console.error(`Event-driven calculation failed for receivable ${receivableId}:`, error);
          failed++;
        }
      }

      const summary = {
        processed: dueReceivables.length + eventDrivenReceivables.length,
        successful,
        failed,
        alerts: totalAlerts
      };

      console.log('Scheduled risk calculations completed:', summary);
      return summary;

    } catch (error) {
      console.error('Failed to run scheduled calculations:', error);
      return { processed: 0, successful: 0, failed: 0, alerts: 0 };
    }
  }

  /**
   * Calculate automated production risk with real-time weather integration
   */
  private static async calculateAutomatedProductionRisk(
    receivable: ClimateReceivable
  ): Promise<{
    score: number;
    factors: string[];
    confidence: number;
    lastWeatherUpdate: string;
  }> {
    try {
      const asset = receivable.asset;
      if (!asset) {
        return {
          score: 50,
          factors: ['Asset data not available'],
          confidence: 0.3,
          lastWeatherUpdate: new Date().toISOString()
        };
      }

      let riskScore = 10; // Base production risk
      const factors: string[] = [];
      let confidence = 0.8;

      // Get real-time weather data
      const weatherData = await EnhancedExternalAPIService.getEnhancedWeatherData(
        asset.location,
        7
      );

      // Analyze current weather conditions
      if (asset.type === 'solar') {
        const avgSunlight = weatherData.current.sunlightHours;
        if (avgSunlight < 6) {
          riskScore += 25;
          factors.push(`Low sunlight hours: ${avgSunlight.toFixed(1)}h/day`);
        } else if (avgSunlight < 8) {
          riskScore += 15;
          factors.push(`Moderate sunlight: ${avgSunlight.toFixed(1)}h/day`);
        }

        const cloudCover = weatherData.current.cloudCover;
        if (cloudCover > 70) {
          riskScore += 20;
          factors.push(`High cloud cover: ${cloudCover}%`);
        } else if (cloudCover > 50) {
          riskScore += 10;
          factors.push(`Moderate cloud cover: ${cloudCover}%`);
        }
      } else if (asset.type === 'wind') {
        const windSpeed = weatherData.current.windSpeed;
        if (windSpeed < 5) {
          riskScore += 30;
          factors.push(`Low wind speed: ${windSpeed.toFixed(1)} km/h`);
        } else if (windSpeed < 8) {
          riskScore += 15;
          factors.push(`Moderate wind speed: ${windSpeed.toFixed(1)} km/h`);
        }

        // Check for extreme weather
        if (windSpeed > 50) {
          riskScore += 25;
          factors.push(`High wind speed risk: ${windSpeed.toFixed(1)} km/h`);
        }
      }

      // Analyze forecast trends
      const forecastRisk = this.analyzeForecastTrends(weatherData.forecast, asset.type);
      riskScore += forecastRisk.score;
      factors.push(...forecastRisk.factors);

      // Get historical production performance
      const historicalPerformance = await this.getHistoricalProductionPerformance(asset.assetId);
      if (historicalPerformance) {
        if (historicalPerformance.variability > 0.3) {
          riskScore += 15;
          factors.push(`High production variability: ${(historicalPerformance.variability * 100).toFixed(1)}%`);
        }

        confidence = Math.min(confidence, historicalPerformance.dataQuality);
      }

      // Seasonal adjustments
      const seasonalRisk = this.calculateSeasonalProductionRisk(asset.type, new Date().getMonth());
      riskScore += seasonalRisk;
      if (seasonalRisk > 20) factors.push(`High seasonal risk factor: ${seasonalRisk.toFixed(1)}%`);

      return {
        score: Math.min(riskScore, 100),
        factors,
        confidence,
        lastWeatherUpdate: new Date().toISOString()
      };

    } catch (error) {
      console.error('Production risk calculation failed:', error);
      return {
        score: 75, // High risk due to calculation failure
        factors: ['Production risk calculation failed'],
        confidence: 0.2,
        lastWeatherUpdate: new Date().toISOString()
      };
    }
  }

  /**
   * Calculate automated credit risk with real-time credit data
   */
  private static async calculateAutomatedCreditRisk(
    receivable: ClimateReceivable
  ): Promise<{
    score: number;
    factors: string[];
    confidence: number;
    lastCreditUpdate: string;
  }> {
    try {
      const payer = receivable.payer;
      if (!payer) {
        return {
          score: 50,
          factors: ['Payer data not available'],
          confidence: 0.3,
          lastCreditUpdate: new Date().toISOString()
        };
      }

      let riskScore = 10; // Base credit risk
      const factors: string[] = [];
      let confidence = 0.7;

      // Get real-time credit rating
      const creditData = await EnhancedExternalAPIService.getEnhancedCreditRating(
        payer.name,
        payer.payerId
      );

      // Analyze credit rating
      if (creditData.creditScore < 40) {
        riskScore += 40;
        factors.push(`Very low credit score: ${creditData.creditScore}`);
      } else if (creditData.creditScore < 60) {
        riskScore += 25;
        factors.push(`Low credit score: ${creditData.creditScore}`);
      } else if (creditData.creditScore < 80) {
        riskScore += 10;
        factors.push(`Moderate credit score: ${creditData.creditScore}`);
      }

      // Analyze payment history
      if (creditData.paymentHistory.onTimeRate < 0.8) {
        riskScore += 20;
        factors.push(`Poor payment history: ${(creditData.paymentHistory.onTimeRate * 100).toFixed(1)}% on-time`);
      } else if (creditData.paymentHistory.onTimeRate < 0.9) {
        riskScore += 10;
        factors.push(`Moderate payment history: ${(creditData.paymentHistory.onTimeRate * 100).toFixed(1)}% on-time`);
      }

      // Analyze outlook
      if (creditData.outlook === 'Negative') {
        riskScore += 15;
        factors.push('Negative credit outlook');
      } else if (creditData.outlook === 'Developing') {
        riskScore += 10;
        factors.push('Developing credit outlook');
      }

      // Check for default events
      if (creditData.paymentHistory.defaultEvents > 0) {
        riskScore += 25;
        factors.push(`${creditData.paymentHistory.defaultEvents} default events`);
      }

      // Analyze financial metrics
      if (creditData.financialMetrics.debtToEquity && creditData.financialMetrics.debtToEquity > 2.0) {
        riskScore += 15;
        factors.push(`High debt-to-equity ratio: ${creditData.financialMetrics.debtToEquity.toFixed(2)}`);
      }

      confidence = 0.9; // High confidence for real credit data

      return {
        score: Math.min(riskScore, 100),
        factors,
        confidence,
        lastCreditUpdate: creditData.lastUpdated
      };

    } catch (error) {
      console.error('Credit risk calculation failed:', error);
      return {
        score: 60, // Medium-high risk due to calculation failure
        factors: ['Credit risk calculation failed'],
        confidence: 0.3,
        lastCreditUpdate: new Date().toISOString()
      };
    }
  }

  /**
   * Calculate automated policy risk with real-time regulatory data
   */
  private static async calculateAutomatedPolicyRisk(
    receivable: ClimateReceivable
  ): Promise<{
    score: number;
    factors: string[];
    confidence: number;
    lastPolicyUpdate: string;
  }> {
    try {
      let riskScore = 10; // Base policy risk
      const factors: string[] = [];
      let confidence = 0.8;

      // Get relevant keywords based on asset type
      const keywords = this.getRelevantPolicyKeywords(receivable.asset?.type);

      // Get real-time regulatory news
      const regulatoryNews = await EnhancedExternalAPIService.getEnhancedRegulatoryNews(
        keywords,
        [receivable.asset?.type || 'renewable_energy'],
        '30d'
      );

      // Analyze regulatory news impact
      for (const article of regulatoryNews.articles) {
        switch (article.impactLevel) {
          case 'critical':
            riskScore += 25;
            factors.push(`Critical policy change: ${article.title.substring(0, 60)}...`);
            break;
          case 'high':
            riskScore += 15;
            factors.push(`High impact policy: ${article.title.substring(0, 60)}...`);
            break;
          case 'medium':
            riskScore += 5;
            factors.push(`Medium impact policy: ${article.title.substring(0, 60)}...`);
            break;
        }
      }

      // Check for asset type specific risks
      if (receivable.asset?.type === 'solar') {
        // Solar ITC phase-down risk
        const currentYear = new Date().getFullYear();
        if (currentYear >= 2024) {
          riskScore += 15;
          factors.push('Solar ITC step-down phase');
        }
      } else if (receivable.asset?.type === 'wind') {
        // PTC expiration risk
        riskScore += 20;
        factors.push('Wind PTC expiration uncertainty');
      }

      // Check recent policy impacts from database
      const recentPolicyImpacts = await this.getRecentPolicyImpacts(receivable.receivableId);
      riskScore += recentPolicyImpacts.score;
      factors.push(...recentPolicyImpacts.factors);

      return {
        score: Math.min(riskScore, 100),
        factors,
        confidence,
        lastPolicyUpdate: new Date().toISOString()
      };

    } catch (error) {
      console.error('Policy risk calculation failed:', error);
      return {
        score: 40, // Medium risk due to calculation failure
        factors: ['Policy risk calculation failed'],
        confidence: 0.4,
        lastPolicyUpdate: new Date().toISOString()
      };
    }
  }

  /**
   * Calculate composite risk with dynamic weighting
   */
  private static async calculateCompositeRisk(
    productionRisk: any,
    creditRisk: any,
    policyRisk: any,
    receivable: ClimateReceivable
  ): Promise<{
    score: number;
    level: RiskLevel;
    confidence: number;
  }> {
    // Get dynamic weights based on current market conditions
    const weights = await this.getDynamicRiskWeights(receivable);

    // Calculate weighted composite score
    const compositeScore = (
      productionRisk.score * weights.productionRisk +
      creditRisk.score * weights.creditRisk +
      policyRisk.score * weights.policyRisk
    );

    // Apply market volatility and seasonal adjustments
    const adjustedScore = compositeScore + 
      (weights.seasonalAdjustment * 100) + 
      (weights.marketVolatilityAdjustment * 100);

    // Calculate composite confidence
    const confidence = (
      productionRisk.confidence * weights.productionRisk +
      creditRisk.confidence * weights.creditRisk +
      policyRisk.confidence * weights.policyRisk
    );

    // Determine risk level
    let level: RiskLevel;
    if (adjustedScore < this.RISK_THRESHOLDS.low) {
      level = RiskLevel.LOW;
    } else if (adjustedScore < this.RISK_THRESHOLDS.medium) {
      level = RiskLevel.MEDIUM;
    } else {
      level = RiskLevel.HIGH;
    }

    return {
      score: Math.min(Math.round(adjustedScore), 100),
      level,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  /**
   * Calculate dynamic discount rate based on risk and market conditions
   */
  private static async calculateDynamicDiscountRate(
    compositeRisk: any,
    receivable: ClimateReceivable,
    previousCalculation: AutomatedRiskResult | null
  ): Promise<{
    calculated: number;
    previous: number;
    change: number;
    reason: string;
  }> {
    // Base discount rates by risk level
    const baseRates = {
      [RiskLevel.LOW]: 0.02,
      [RiskLevel.MEDIUM]: 0.035,
      [RiskLevel.HIGH]: 0.05
    };

    let discountRate = baseRates[compositeRisk.level];

    // Apply fine-tuning based on exact risk score
    const riskAdjustment = (compositeRisk.score / 100) * 0.015;
    discountRate += riskAdjustment;

    // Apply market conditions adjustment
    const marketAdjustment = await this.getMarketConditionsAdjustment(receivable);
    discountRate += marketAdjustment;

    // Apply confidence adjustment (lower confidence = higher rate)
    const confidenceAdjustment = (1 - compositeRisk.confidence) * 0.01;
    discountRate += confidenceAdjustment;

    const previousRate = previousCalculation?.discountRate.calculated || receivable.discountRate || 0.035;
    const change = discountRate - previousRate;

    // Generate reason for rate change
    let reason = `Risk level: ${compositeRisk.level}`;
    if (Math.abs(change) > 0.005) {
      if (change > 0) {
        reason += `, Rate increased due to higher risk (${(change * 100).toFixed(2)}%)`;
      } else {
        reason += `, Rate decreased due to lower risk (${Math.abs(change * 100).toFixed(2)}%)`;
      }
    }

    return {
      calculated: Math.round(discountRate * 10000) / 10000, // Round to 4 decimal places
      previous: previousRate,
      change,
      reason
    };
  }

  // Helper methods continue in next part...

  private static async getAllActiveReceivables(): Promise<ClimateReceivable[]> {
    try {
      const { data, error } = await supabase
        .from('climate_receivables')
        .select(`
          *,
          energy_assets!inner(*),
          climate_payers!inner(*)
        `)
        .not('amount', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        receivableId: item.receivable_id,
        assetId: item.asset_id,
        payerId: item.payer_id,
        amount: item.amount,
        dueDate: item.due_date,
        riskScore: item.risk_score,
        discountRate: item.discount_rate,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        asset: {
          assetId: item.energy_assets.asset_id,
          name: item.energy_assets.name,
          type: item.energy_assets.type,
          location: item.energy_assets.location,
          capacity: item.energy_assets.capacity,
          ownerId: item.energy_assets.owner_id,
          createdAt: item.energy_assets.created_at,
          updatedAt: item.energy_assets.updated_at
        },
        payer: {
          payerId: item.climate_payers.payer_id,
          name: item.climate_payers.name,
          creditRating: item.climate_payers.credit_rating,
          financialHealthScore: item.climate_payers.financial_health_score,
          paymentHistory: item.climate_payers.payment_history,
          createdAt: item.climate_payers.created_at,
          updatedAt: item.climate_payers.updated_at
        }
      }));
    } catch (error) {
      console.error('Error fetching active receivables:', error);
      return [];
    }
  }

  private static async getReceivableWithRelations(receivableId: string): Promise<ClimateReceivable | null> {
    try {
      const { data, error } = await supabase
        .from('climate_receivables')
        .select(`
          *,
          energy_assets!inner(*),
          climate_payers!inner(*),
          climate_risk_factors(*)
        `)
        .eq('receivable_id', receivableId)
        .single();

      if (error) throw error;

      return {
        receivableId: data.receivable_id,
        assetId: data.asset_id,
        payerId: data.payer_id,
        amount: data.amount,
        dueDate: data.due_date,
        riskScore: data.risk_score,
        discountRate: data.discount_rate,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        asset: {
          assetId: data.energy_assets.asset_id,
          name: data.energy_assets.name,
          type: data.energy_assets.type,
          location: data.energy_assets.location,
          capacity: data.energy_assets.capacity,
          ownerId: data.energy_assets.owner_id,
          createdAt: data.energy_assets.created_at,
          updatedAt: data.energy_assets.updated_at
        },
        payer: {
          payerId: data.climate_payers.payer_id,
          name: data.climate_payers.name,
          creditRating: data.climate_payers.credit_rating,
          financialHealthScore: data.climate_payers.financial_health_score,
          paymentHistory: data.climate_payers.payment_history,
          createdAt: data.climate_payers.created_at,
          updatedAt: data.climate_payers.updated_at
        }
      };
    } catch (error) {
      console.error('Error fetching receivable with relations:', error);
      return null;
    }
  }

  private static async isCalculationNeeded(receivableId: string): Promise<boolean> {
    try {
      // Check last calculation time
      const { data: lastCalc, error } = await supabase
        .from('climate_risk_calculations')
        .select('calculated_at, next_review_date')
        .eq('receivable_id', receivableId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking last calculation:', error);
        return true; // Default to needing calculation
      }

      if (!lastCalc) {
        return true; // No previous calculation exists
      }

      const now = new Date();
      const nextReviewDate = new Date(lastCalc.next_review_date);

      // Check if scheduled review is due
      if (now >= nextReviewDate) {
        return true;
      }

      // Check for external trigger events (weather alerts, credit rating changes, policy updates)
      const hasWeatherAlert = await this.hasRecentWeatherAlert(receivableId);
      const hasCreditAlert = await this.hasRecentCreditAlert(receivableId);
      const hasPolicyAlert = await this.hasRecentPolicyAlert(receivableId);

      return hasWeatherAlert || hasCreditAlert || hasPolicyAlert;
    } catch (error) {
      console.error('Error checking if calculation needed:', error);
      return true; // Default to needing calculation on error
    }
  }

  private static async hasRecentWeatherAlert(receivableId: string): Promise<boolean> {
    // Check for significant weather events in last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    try {
      const { data, error } = await supabase
        .from('weather_alerts')
        .select('alert_id')
        .eq('receivable_id', receivableId)
        .gte('created_at', yesterday.toISOString())
        .limit(1);

      return !error && data && data.length > 0;
    } catch (error) {
      console.error('Error checking weather alerts:', error);
      return false;
    }
  }

  private static async hasRecentCreditAlert(receivableId: string): Promise<boolean> {
    // Check for credit rating changes in last week
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    try {
      const { data, error } = await supabase
        .from('credit_alerts')
        .select('alert_id')
        .eq('receivable_id', receivableId)
        .gte('created_at', lastWeek.toISOString())
        .limit(1);

      return !error && data && data.length > 0;
    } catch (error) {
      console.error('Error checking credit alerts:', error);
      return false;
    }
  }

  private static async hasRecentPolicyAlert(receivableId: string): Promise<boolean> {
    // Check for policy changes in last 30 days
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    try {
      const { data, error } = await supabase
        .from('policy_alerts')
        .select('alert_id')
        .eq('receivable_id', receivableId)
        .gte('created_at', lastMonth.toISOString())
        .limit(1);

      return !error && data && data.length > 0;
    } catch (error) {
      console.error('Error checking policy alerts:', error);
      return false;
    }
  }

  private static async getLastCalculationResult(receivableId: string): Promise<AutomatedRiskResult | null> {
    try {
      const { data, error } = await supabase
        .from('climate_risk_calculations')
        .select('*')
        .eq('receivable_id', receivableId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No previous calculation found - this is normal for new receivables
          return null;
        }
        throw error;
      }

      return {
        receivableId: data.receivable_id,
        calculatedAt: data.calculated_at,
        riskComponents: {
          productionRisk: {
            score: data.production_risk_score,
            factors: data.production_risk_factors || [],
            confidence: data.production_risk_confidence,
            lastWeatherUpdate: data.last_weather_update
          },
          creditRisk: {
            score: data.credit_risk_score,
            factors: data.credit_risk_factors || [],
            confidence: data.credit_risk_confidence,
            lastCreditUpdate: data.last_credit_update
          },
          policyRisk: {
            score: data.policy_risk_score,
            factors: data.policy_risk_factors || [],
            confidence: data.policy_risk_confidence,
            lastPolicyUpdate: data.last_policy_update
          }
        },
        compositeRisk: {
          score: data.composite_risk_score,
          level: data.composite_risk_level as RiskLevel,
          confidence: data.composite_risk_confidence
        },
        discountRate: {
          calculated: data.discount_rate_calculated,
          previous: data.discount_rate_previous,
          change: data.discount_rate_change,
          reason: data.discount_rate_reason
        },
        recommendations: data.recommendations || [],
        alerts: data.alerts || [],
        nextReviewDate: data.next_review_date
      };
    } catch (error) {
      console.error('Error getting last calculation result:', error);
      throw error;
    }
  }

  private static generateAutomatedRecommendations(
    productionRisk: any,
    creditRisk: any,
    policyRisk: any,
    compositeRisk: any,
    discountRate: any
  ): string[] {
    const recommendations: string[] = [];

    // Risk level based recommendations
    if (compositeRisk.level === RiskLevel.HIGH) {
      recommendations.push('URGENT: Consider factoring this receivable immediately');
      recommendations.push('Implement daily monitoring of payer financial status');
      recommendations.push('Consider requiring additional collateral or guarantees');
    } else if (compositeRisk.level === RiskLevel.MEDIUM) {
      recommendations.push('Monitor receivable closely with weekly reviews');
      recommendations.push('Consider hedging strategies for weather-related risks');
      recommendations.push('Evaluate early payment incentives');
    } else {
      recommendations.push('Standard monitoring protocols are sufficient');
      recommendations.push('Consider offering extended payment terms');
    }

    // Production risk specific recommendations
    if (productionRisk.score > 60) {
      recommendations.push('Weather risk elevated - consider production insurance');
      recommendations.push('Review weather hedging products for this asset');
    }

    // Credit risk specific recommendations
    if (creditRisk.score > 70) {
      recommendations.push('Payer credit risk high - request updated financial statements');
      recommendations.push('Consider credit insurance for this receivable');
    }

    // Policy risk specific recommendations
    if (policyRisk.score > 50) {
      recommendations.push('Monitor regulatory developments affecting this asset type');
      recommendations.push('Consider accelerating collection timeline due to policy uncertainty');
    }

    // Discount rate change recommendations
    if (discountRate.change > 0.01) {
      recommendations.push('Significant rate increase - evaluate factoring vs holding');
    } else if (discountRate.change < -0.005) {
      recommendations.push('Rate decreased - favorable time to hold receivable');
    }

    return recommendations;
  }

  private static generateRiskAlerts(
    compositeRisk: any,
    discountRate: any,
    previousCalculation: any,
    productionRisk: any,
    creditRisk: any,
    policyRisk: any
  ): any[] {
    const alerts: any[] = [];

    if (previousCalculation) {
      // Check for significant risk score changes
      const riskScoreChange = compositeRisk.score - previousCalculation.compositeRisk.score;
      
      if (riskScoreChange > this.ALERT_THRESHOLDS.score_change) {
        alerts.push({
          level: 'critical',
          message: `Risk score increased by ${riskScoreChange.toFixed(1)} points`,
          action: 'Review receivable immediately and consider immediate factoring'
        });
      } else if (riskScoreChange > 10) {
        alerts.push({
          level: 'warning',
          message: `Risk score increased by ${riskScoreChange.toFixed(1)} points`,
          action: 'Monitor closely and review collection strategy'
        });
      }

      // Check for discount rate changes
      if (Math.abs(discountRate.change) > this.ALERT_THRESHOLDS.discount_rate_change) {
        const direction = discountRate.change > 0 ? 'increased' : 'decreased';
        alerts.push({
          level: discountRate.change > 0.01 ? 'warning' : 'info',
          message: `Discount rate ${direction} by ${Math.abs(discountRate.change * 100).toFixed(2)}%`,
          action: `Evaluate impact on receivable value and factoring strategy`
        });
      }

      // Check for confidence drops
      const confidenceChange = compositeRisk.confidence - previousCalculation.compositeRisk.confidence;
      if (confidenceChange < -this.ALERT_THRESHOLDS.confidence_drop / 100) {
        alerts.push({
          level: 'warning',
          message: `Risk assessment confidence dropped by ${Math.abs(confidenceChange * 100).toFixed(1)}%`,
          action: 'Verify data sources and consider manual review'
        });
      }
    }

    // Level-based alerts
    if (compositeRisk.level === RiskLevel.HIGH && compositeRisk.score > 85) {
      alerts.push({
        level: 'critical',
        message: 'Very high risk receivable detected',
        action: 'Consider immediate factoring or additional security measures'
      });
    }

    // Component-specific alerts
    if (productionRisk.score > 80) {
      alerts.push({
        level: 'warning',
        message: 'High production risk due to weather conditions',
        action: 'Monitor weather forecasts and consider production hedging'
      });
    }

    if (creditRisk.score > 75) {
      alerts.push({
        level: 'warning',
        message: 'Elevated credit risk for payer',
        action: 'Request updated financial information and consider credit insurance'
      });
    }

    if (policyRisk.score > 70) {
      alerts.push({
        level: 'warning',
        message: 'High policy risk due to regulatory changes',
        action: 'Monitor regulatory developments and consider policy hedging'
      });
    }

    return alerts;
  }

  private static calculateNextReviewDate(riskLevel: RiskLevel): string {
    const now = new Date();
    const days = riskLevel === RiskLevel.HIGH ? 1 : riskLevel === RiskLevel.MEDIUM ? 7 : 30;
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  private static async saveCalculationResult(result: AutomatedRiskResult): Promise<void> {
    try {
      const { error } = await supabase
        .from('climate_risk_calculations')
        .insert([{
          receivable_id: result.receivableId,
          calculated_at: result.calculatedAt,
          production_risk_score: result.riskComponents.productionRisk.score,
          production_risk_factors: result.riskComponents.productionRisk.factors,
          production_risk_confidence: result.riskComponents.productionRisk.confidence,
          last_weather_update: result.riskComponents.productionRisk.lastWeatherUpdate,
          credit_risk_score: result.riskComponents.creditRisk.score,
          credit_risk_factors: result.riskComponents.creditRisk.factors,
          credit_risk_confidence: result.riskComponents.creditRisk.confidence,
          last_credit_update: result.riskComponents.creditRisk.lastCreditUpdate,
          policy_risk_score: result.riskComponents.policyRisk.score,
          policy_risk_factors: result.riskComponents.policyRisk.factors,
          policy_risk_confidence: result.riskComponents.policyRisk.confidence,
          last_policy_update: result.riskComponents.policyRisk.lastPolicyUpdate,
          composite_risk_score: result.compositeRisk.score,
          composite_risk_level: result.compositeRisk.level,
          composite_risk_confidence: result.compositeRisk.confidence,
          discount_rate_calculated: result.discountRate.calculated,
          discount_rate_previous: result.discountRate.previous,
          discount_rate_change: result.discountRate.change,
          discount_rate_reason: result.discountRate.reason,
          recommendations: result.recommendations,
          alerts: result.alerts,
          next_review_date: result.nextReviewDate
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving calculation result:', error);
      throw error;
    }
  }

  private static async updateReceivableRiskScores(receivableId: string, result: AutomatedRiskResult): Promise<void> {
    try {
      // Update main receivable table
      const { error: receivableError } = await supabase
        .from('climate_receivables')
        .update({
          risk_score: result.compositeRisk.score,
          discount_rate: result.discountRate.calculated,
          updated_at: new Date().toISOString()
        })
        .eq('receivable_id', receivableId);

      if (receivableError) throw receivableError;

      // Update or insert risk factors
      const { error: riskFactorsError } = await supabase
        .from('climate_risk_factors')
        .upsert([{
          receivable_id: receivableId,
          production_risk: result.riskComponents.productionRisk.score,
          credit_risk: result.riskComponents.creditRisk.score,
          policy_risk: result.riskComponents.policyRisk.score
        }], {
          onConflict: 'receivable_id'
        });

      if (riskFactorsError) throw riskFactorsError;
    } catch (error) {
      console.error('Error updating receivable risk scores:', error);
      throw error;
    }
  }

  private static async updateCalculationSchedule(receivableId: string, result: AutomatedRiskResult): Promise<void> {
    try {
      const frequency = this.CALCULATION_FREQUENCIES[result.compositeRisk.level];
      
      const { error } = await supabase
        .from('climate_risk_calculation_schedule')
        .upsert([{
          receivable_id: receivableId,
          last_calculated: result.calculatedAt,
          frequency,
          next_due: result.nextReviewDate,
          priority: result.compositeRisk.level
        }], {
          onConflict: 'receivable_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating calculation schedule:', error);
      throw error;
    }
  }

  private static async getMarketConditionsAdjustment(receivable: ClimateReceivable): Promise<number> {
    try {
      // Get market volatility indicators
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Check for recent market events affecting renewable energy sector
      const { data: marketEvents, error } = await supabase
        .from('market_events')
        .select('impact_level, event_type')
        .gte('event_date', thirtyDaysAgo.toISOString())
        .in('affected_sectors', ['renewable_energy', receivable.asset?.type || 'renewable_energy']);

      if (error) {
        console.warn('Could not fetch market events, using default adjustment');
        return 0.002; // Default small positive adjustment
      }

      let adjustment = 0;

      // Apply adjustments based on market events
      marketEvents?.forEach(event => {
        switch (event.impact_level) {
          case 'critical':
            adjustment += 0.01; // 1% increase
            break;
          case 'high':
            adjustment += 0.005; // 0.5% increase
            break;
          case 'medium':
            adjustment += 0.002; // 0.2% increase
            break;
        }
      });

      // Cap the adjustment at 2%
      return Math.min(adjustment, 0.02);
    } catch (error) {
      console.error('Error calculating market conditions adjustment:', error);
      return 0.002; // Default small adjustment
    }
  }

  private static async getReceivablesDueForCalculation(): Promise<string[]> {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('climate_risk_calculation_schedule')
        .select('receivable_id')
        .lte('next_due', now);

      if (error) throw error;

      return data?.map(item => item.receivable_id) || [];
    } catch (error) {
      console.error('Error getting receivables due for calculation:', error);
      return [];
    }
  }

  private static async getEventTriggeredReceivables(): Promise<string[]> {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('external_event_triggers')
        .select('receivable_id')
        .gte('triggered_at', yesterday)
        .eq('processed', false);

      if (error) throw error;

      return data?.map(item => item.receivable_id) || [];
    } catch (error) {
      console.error('Error getting event triggered receivables:', error);
      return [];
    }
  }

  private static getRelevantPolicyKeywords(assetType?: string): string[] {
    const baseKeywords = ['renewable energy', 'tax credit', 'investment tax credit'];
    
    if (assetType === 'solar') {
      return [...baseKeywords, 'solar', 'ITC', 'solar investment tax credit'];
    } else if (assetType === 'wind') {
      return [...baseKeywords, 'wind', 'PTC', 'production tax credit'];
    } else if (assetType === 'hydro') {
      return [...baseKeywords, 'hydroelectric', 'hydropower'];
    }
    
    return baseKeywords;
  }

  private static async getRecentPolicyImpacts(receivableId: string): Promise<{ score: number; factors: string[] }> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('climate_policy_impacts')
        .select(`
          impact_description,
          climate_policies!inner(impact_level)
        `)
        .eq('receivable_id', receivableId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      let score = 0;
      const factors: string[] = [];

      data?.forEach(impact => {
        const policy = impact.climate_policies;
        if (policy) {
          switch (policy.impact_level) {
            case 'critical':
              score += 30;
              break;
            case 'high':
              score += 20;
              break;
            case 'medium':
              score += 10;
              break;
            case 'low':
              score += 5;
              break;
          }
          factors.push(impact.impact_description || 'Policy impact detected');
        }
      });

      return { score: Math.min(score, 50), factors };
    } catch (error) {
      console.error('Error getting recent policy impacts:', error);
      return { score: 0, factors: [] };
    }
  }
  // Missing methods - stubs for compilation
  private static analyzeForecastTrends(forecast: any, assetType: string): any {
    return { score: 0, factors: [] };
  }

  private static async getHistoricalProductionPerformance(assetId: string): Promise<any> {
    return null;
  }

  private static calculateSeasonalProductionRisk(asset: any, historicalData: any): number {
    return 0;
  }

  private static getDynamicRiskWeights(receivable?: any): any {
    return { production: 0.3, credit: 0.4, policy: 0.3 };
  }

  // Additional helper methods would continue here...
}
