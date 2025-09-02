import { supabase } from '@/infrastructure/database/client';
import { 
  ClimateReceivable, 
  ClimateRiskFactor, 
  EnergyAsset, 
  ClimatePayer,
  ProductionData,
  WeatherData,
  RiskLevel
} from '../../types';
import { WeatherDataService } from '../api/weather-data-service';

/**
 * Risk factor weights for calculating composite risk scores
 */
interface RiskWeights {
  productionRisk: number;
  creditRisk: number;
  policyRisk: number;
}

/**
 * Risk assessment result with detailed breakdown
 */
interface RiskAssessmentResult {
  compositeRiskScore: number;
  riskLevel: RiskLevel;
  discountRate: number;
  breakdown: {
    productionRisk: number;
    creditRisk: number;
    policyRisk: number;
  };
  confidence: number;
  recommendations: string[];
}

/**
 * Historical production analysis result
 */
interface ProductionAnalysis {
  averageOutput: number;
  outputVariability: number;
  weatherCorrelation: number;
  seasonalPattern: { month: number; averageOutput: number }[];
  riskScore: number;
}

/**
 * Credit assessment result for payers
 */
interface CreditAssessmentResult {
  creditScore: number;
  riskLevel: RiskLevel;
  paymentHistory: {
    onTimePaymentRate: number;
    averageDelayDays: number;
    defaultRate: number;
  };
  financialStability: number;
  riskScore: number;
}

/**
 * Service for assessing and calculating risk scores for climate receivables
 */
export class RiskAssessmentService {
  // Default risk weights (can be customized per assessment)
  private static readonly DEFAULT_WEIGHTS: RiskWeights = {
    productionRisk: 0.4,
    creditRisk: 0.4,
    policyRisk: 0.2
  };

  // Risk level thresholds
  private static readonly RISK_THRESHOLDS = {
    low: 30,
    medium: 70
  };

  // Base discount rates by risk level
  private static readonly BASE_DISCOUNT_RATES = {
    low: 0.02,    // 2%
    medium: 0.035, // 3.5%
    high: 0.05    // 5%
  };

  /**
   * Perform comprehensive risk assessment for a climate receivable
   * @param receivableId Climate receivable ID
   * @param customWeights Optional custom risk weights
   * @returns Detailed risk assessment result
   */
  public static async assessReceivableRisk(
    receivableId: string,
    customWeights?: Partial<RiskWeights>
  ): Promise<RiskAssessmentResult> {
    try {
      // Get receivable with related entities
      const receivable = await this.getReceivableWithRelations(receivableId);
      if (!receivable) {
        throw new Error('Receivable not found');
      }

      // Use custom weights or defaults
      const weights = { ...this.DEFAULT_WEIGHTS, ...customWeights };

      // Calculate individual risk components
      const productionRisk = await this.calculateProductionRisk(receivable.asset!);
      const creditRisk = await this.calculateCreditRisk(receivable.payer!);
      const policyRisk = await this.calculatePolicyRisk(receivable);

      // Calculate composite risk score
      const compositeRiskScore = (
        productionRisk * weights.productionRisk +
        creditRisk * weights.creditRisk +
        policyRisk * weights.policyRisk
      );

      // Determine risk level
      const riskLevel = this.determineRiskLevel(compositeRiskScore);

      // Calculate discount rate based on risk
      const discountRate = this.calculateDiscountRate(compositeRiskScore, riskLevel);

      // Calculate confidence based on data availability
      const confidence = this.calculateConfidence(receivable);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        compositeRiskScore,
        { productionRisk, creditRisk, policyRisk },
        receivable
      );

      // Save risk factors to database
      await this.saveRiskFactors(receivableId, {
        productionRisk,
        creditRisk,
        policyRisk
      });

      // Update receivable with new risk score and discount rate
      await this.updateReceivableRisk(receivableId, compositeRiskScore, discountRate);

      return {
        compositeRiskScore: Math.round(compositeRiskScore),
        riskLevel,
        discountRate,
        breakdown: {
          productionRisk: Math.round(productionRisk),
          creditRisk: Math.round(creditRisk),
          policyRisk: Math.round(policyRisk)
        },
        confidence: Math.round(confidence * 100),
        recommendations
      };
    } catch (error) {
      console.error('Error assessing receivable risk:', error);
      throw error;
    }
  }

  /**
   * Calculate production risk based on weather patterns and historical output
   * @param asset Energy asset to assess
   * @returns Production risk score (0-100)
   */
  public static async calculateProductionRisk(asset: EnergyAsset): Promise<number> {
    try {
      // Get historical production data for the asset
      const analysis = await this.analyzeHistoricalProduction(asset.assetId);
      
      // Get weather forecast for the asset location
      const forecastWeather = await WeatherDataService.getForecastWeather(asset.location, 7);
      
      // Calculate base risk from production variability
      let riskScore = analysis.riskScore;

      // Adjust based on asset type and weather forecast
      if (asset.type === 'solar') {
        const avgSunlight = forecastWeather.reduce((sum, w) => sum + (w.sunlightHours || 0), 0) / forecastWeather.length;
        // Lower sunlight = higher risk
        if (avgSunlight < 8) riskScore += 20;
        else if (avgSunlight < 10) riskScore += 10;
      } else if (asset.type === 'wind') {
        const avgWindSpeed = forecastWeather.reduce((sum, w) => sum + (w.windSpeed || 0), 0) / forecastWeather.length;
        // Lower wind speed = higher risk
        if (avgWindSpeed < 5) riskScore += 25;
        else if (avgWindSpeed < 8) riskScore += 15;
      }

      // Consider seasonal patterns
      const currentMonth = new Date().getMonth();
      const seasonalOutput = analysis.seasonalPattern.find(p => p.month === currentMonth);
      if (seasonalOutput && seasonalOutput.averageOutput < analysis.averageOutput * 0.8) {
        riskScore += 15; // In low-production season
      }

      return Math.min(riskScore, 100);
    } catch (error) {
      console.error('Error calculating production risk:', error);
      // Return high risk if we can't assess
      return 75;
    }
  }

  /**
   * Calculate credit risk based on payer financial health and payment history
   * @param payer Climate payer to assess
   * @returns Credit risk score (0-100)
   */
  public static async calculateCreditRisk(payer: ClimatePayer): Promise<number> {
    try {
      // Get credit assessment for the payer
      const creditAssessment = await this.assessPayerCredit(payer.payerId);
      
      return creditAssessment.riskScore;
    } catch (error) {
      console.error('Error calculating credit risk:', error);
      // Return medium risk if we can't assess
      return 50;
    }
  }

  /**
   * Calculate policy risk based on regulatory environment and recent changes
   * @param receivable Climate receivable to assess
   * @returns Policy risk score (0-100)
   */
  public static async calculatePolicyRisk(receivable: ClimateReceivable): Promise<number> {
    try {
      // Get policy impacts for this receivable
      const { data: policyImpacts, error } = await supabase
        .from('climate_policy_impacts')
        .select(`
          *,
          climate_policies!climate_policy_impacts_policy_id_fkey(
            name,
            impact_level,
            effective_date
          )
        `)
        .or(`receivable_id.eq.${receivable.receivableId},asset_id.eq.${receivable.assetId}`);

      if (error) throw error;

      let riskScore = 10; // Base policy risk

      if (policyImpacts && policyImpacts.length > 0) {
        for (const impact of policyImpacts) {
          const policy = impact.climate_policies;
          if (policy) {
            // Assess impact level
            switch (policy.impact_level) {
              case 'high':
                riskScore += 30;
                break;
              case 'medium':
                riskScore += 15;
                break;
              case 'low':
                riskScore += 5;
                break;
            }

            // Recent policy changes are riskier
            const effectiveDate = new Date(policy.effective_date);
            const daysSinceEffective = (Date.now() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceEffective < 90) {
              riskScore += 10; // Recent policy change
            }
          }
        }
      }

      // Check for asset type specific policy risks
      if (receivable.asset) {
        switch (receivable.asset.type) {
          case 'solar':
            // Solar ITC phase-down risk
            riskScore += 15;
            break;
          case 'wind':
            // PTC expiration risk
            riskScore += 20;
            break;
          default:
            riskScore += 10;
        }
      }

      return Math.min(riskScore, 100);
    } catch (error) {
      console.error('Error calculating policy risk:', error);
      // Return medium risk if we can't assess
      return 40;
    }
  }

  /**
   * Analyze historical production data for an asset
   * @param assetId Energy asset ID
   * @returns Production analysis result
   */
  private static async analyzeHistoricalProduction(assetId: string): Promise<ProductionAnalysis> {
    try {
      // Get 12 months of production data
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data: productionData, error } = await supabase
        .from('production_data')
        .select('*')
        .eq('asset_id', assetId)
        .gte('production_date', oneYearAgo.toISOString().split('T')[0])
        .order('production_date', { ascending: true });

      if (error) throw error;

      if (!productionData || productionData.length === 0) {
        // No historical data - return high risk assessment
        return {
          averageOutput: 0,
          outputVariability: 100,
          weatherCorrelation: 0,
          seasonalPattern: [],
          riskScore: 80
        };
      }

      // Calculate average output
      const averageOutput = productionData.reduce((sum, d) => sum + d.output_mwh, 0) / productionData.length;

      // Calculate output variability (coefficient of variation)
      const variance = productionData.reduce((sum, d) => sum + Math.pow(d.output_mwh - averageOutput, 2), 0) / productionData.length;
      const standardDeviation = Math.sqrt(variance);
      const outputVariability = (standardDeviation / averageOutput) * 100;

      // Calculate seasonal patterns
      const monthlyData: Record<number, number[]> = {};
      productionData.forEach(d => {
        const month = new Date(d.production_date).getMonth();
        if (!monthlyData[month]) monthlyData[month] = [];
        monthlyData[month].push(d.output_mwh);
      });

      const seasonalPattern = Object.entries(monthlyData).map(([month, outputs]) => ({
        month: parseInt(month),
        averageOutput: outputs.reduce((sum, o) => sum + o, 0) / outputs.length
      }));

      // Simple weather correlation estimation (would need weather data for accurate calculation)
      const weatherCorrelation = 0.7; // Placeholder

      // Calculate risk score based on variability
      let riskScore = Math.min(outputVariability, 50); // Cap at 50 for variability

      // Add risk for low production
      if (averageOutput < 50) { // Assuming MW capacity
        riskScore += 20;
      } else if (averageOutput < 100) {
        riskScore += 10;
      }

      return {
        averageOutput,
        outputVariability,
        weatherCorrelation,
        seasonalPattern,
        riskScore: Math.min(riskScore, 100)
      };
    } catch (error) {
      console.error('Error analyzing historical production:', error);
      throw error;
    }
  }

  /**
   * Assess payer creditworthiness
   * @param payerId Payer ID
   * @returns Credit assessment result
   */
  private static async assessPayerCredit(payerId: string): Promise<CreditAssessmentResult> {
    try {
      // Get payer data
      const { data: payer, error } = await supabase
        .from('climate_payers')
        .select('*')
        .eq('payer_id', payerId)
        .single();

      if (error) throw error;

      let creditScore = 50; // Default medium score

      // Assess based on credit rating if available
      if (payer.credit_rating) {
        const rating = payer.credit_rating.toLowerCase();
        if (rating.includes('aaa') || rating.includes('aa')) {
          creditScore = 95;
        } else if (rating.includes('a')) {
          creditScore = 80;
        } else if (rating.includes('bbb')) {
          creditScore = 65;
        } else if (rating.includes('bb')) {
          creditScore = 45;
        } else if (rating.includes('b')) {
          creditScore = 30;
        } else {
          creditScore = 15;
        }
      }

      // Adjust based on financial health score
      if (payer.financial_health_score !== null) {
        creditScore = (creditScore + payer.financial_health_score) / 2;
      }

      // Determine risk level
      const riskLevel = creditScore > 70 ? RiskLevel.LOW : 
                       creditScore > 40 ? RiskLevel.MEDIUM : RiskLevel.HIGH;

      // Analyze payment history (simplified - would need more complex analysis in real implementation)
      const paymentHistory = {
        onTimePaymentRate: Math.max(0.6, creditScore / 100),
        averageDelayDays: Math.max(0, 30 - (creditScore / 3)),
        defaultRate: Math.max(0, (100 - creditScore) / 1000)
      };

      // Calculate risk score (inverse of credit score)
      const riskScore = Math.max(0, 100 - creditScore);

      return {
        creditScore,
        riskLevel,
        paymentHistory,
        financialStability: creditScore,
        riskScore
      };
    } catch (error) {
      console.error('Error assessing payer credit:', error);
      throw error;
    }
  }

  /**
   * Get receivable with all related data
   * @param receivableId Receivable ID
   * @returns Complete receivable data
   */
  private static async getReceivableWithRelations(receivableId: string): Promise<ClimateReceivable | null> {
    try {
      const { data, error } = await supabase
        .from('climate_receivables')
        .select(`
          *,
          energy_assets!climate_receivables_asset_id_fkey(*),
          climate_payers!climate_receivables_payer_id_fkey(*)
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
        asset: data.energy_assets ? {
          assetId: data.energy_assets.asset_id,
          name: data.energy_assets.name,
          type: data.energy_assets.type,
          location: data.energy_assets.location,
          capacity: data.energy_assets.capacity,
          ownerId: data.energy_assets.owner_id,
          createdAt: data.energy_assets.created_at,
          updatedAt: data.energy_assets.updated_at
        } : undefined,
        payer: data.climate_payers ? {
          payerId: data.climate_payers.payer_id,
          name: data.climate_payers.name,
          creditRating: data.climate_payers.credit_rating,
          financialHealthScore: data.climate_payers.financial_health_score,
          paymentHistory: data.climate_payers.payment_history,
          createdAt: data.climate_payers.created_at,
          updatedAt: data.climate_payers.updated_at
        } : undefined
      };
    } catch (error) {
      console.error('Error getting receivable with relations:', error);
      return null;
    }
  }

  /**
   * Determine risk level from composite score
   * @param score Risk score (0-100)
   * @returns Risk level
   */
  private static determineRiskLevel(score: number): RiskLevel {
    if (score < this.RISK_THRESHOLDS.low) return RiskLevel.LOW;
    if (score < this.RISK_THRESHOLDS.medium) return RiskLevel.MEDIUM;
    return RiskLevel.HIGH;
  }

  /**
   * Calculate discount rate based on risk score and level
   * @param score Risk score
   * @param level Risk level
   * @returns Discount rate as decimal
   */
  private static calculateDiscountRate(score: number, level: RiskLevel): number {
    const baseRate = this.BASE_DISCOUNT_RATES[level];
    
    // Fine-tune based on exact score within the level
    let adjustment = 0;
    
    switch (level) {
      case RiskLevel.LOW:
        adjustment = (score / this.RISK_THRESHOLDS.low) * 0.005; // Up to 0.5% adjustment
        break;
      case RiskLevel.MEDIUM:
        adjustment = ((score - this.RISK_THRESHOLDS.low) / (this.RISK_THRESHOLDS.medium - this.RISK_THRESHOLDS.low)) * 0.01; // Up to 1% adjustment
        break;
      case RiskLevel.HIGH:
        adjustment = ((score - this.RISK_THRESHOLDS.medium) / (100 - this.RISK_THRESHOLDS.medium)) * 0.015; // Up to 1.5% adjustment
        break;
    }
    
    return Math.round((baseRate + adjustment) * 10000) / 10000; // Round to 4 decimal places
  }

  /**
   * Calculate confidence level based on data availability
   * @param receivable Receivable to assess
   * @returns Confidence as decimal (0-1)
   */
  private static calculateConfidence(receivable: ClimateReceivable): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence if we have asset data
    if (receivable.asset) confidence += 0.2;

    // Higher confidence if we have payer data
    if (receivable.payer) confidence += 0.2;

    // Higher confidence if payer has credit rating
    if (receivable.payer?.creditRating) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate risk mitigation recommendations
   * @param compositeScore Overall risk score
   * @param breakdown Risk breakdown
   * @param receivable Receivable data
   * @returns Array of recommendations
   */
  private static generateRecommendations(
    compositeScore: number,
    breakdown: { productionRisk: number; creditRisk: number; policyRisk: number },
    receivable: ClimateReceivable
  ): string[] {
    const recommendations: string[] = [];

    // Overall risk recommendations
    if (compositeScore > 70) {
      recommendations.push('Consider requiring additional collateral or guarantees');
      recommendations.push('Implement enhanced monitoring and reporting requirements');
    } else if (compositeScore > 40) {
      recommendations.push('Monitor regularly for changes in risk factors');
    }

    // Production risk recommendations
    if (breakdown.productionRisk > 60) {
      recommendations.push('Consider weather hedging or insurance for production volatility');
      if (receivable.asset?.type === 'solar') {
        recommendations.push('Monitor weather forecasts and adjust cash flow projections accordingly');
      } else if (receivable.asset?.type === 'wind') {
        recommendations.push('Evaluate wind patterns and consider seasonal adjustments');
      }
    }

    // Credit risk recommendations
    if (breakdown.creditRisk > 60) {
      recommendations.push('Request recent financial statements from payer');
      recommendations.push('Consider credit insurance or third-party guarantees');
      if (breakdown.creditRisk > 80) {
        recommendations.push('Require monthly payment monitoring and reporting');
      }
    }

    // Policy risk recommendations
    if (breakdown.policyRisk > 50) {
      recommendations.push('Monitor regulatory developments that could affect payment terms');
      recommendations.push('Consider diversifying across different regulatory jurisdictions');
    }

    return recommendations;
  }

  /**
   * Save risk factors to database
   * @param receivableId Receivable ID
   * @param factors Risk factors
   */
  private static async saveRiskFactors(
    receivableId: string,
    factors: { productionRisk: number; creditRisk: number; policyRisk: number }
  ): Promise<void> {
    try {
      // Check if risk factors already exist
      const { data: existing, error: checkError } = await supabase
        .from('climate_risk_factors')
        .select('factor_id')
        .eq('receivable_id', receivableId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      const riskData = {
        receivable_id: receivableId,
        production_risk: factors.productionRisk,
        credit_risk: factors.creditRisk,
        policy_risk: factors.policyRisk
      };

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('climate_risk_factors')
          .update(riskData)
          .eq('factor_id', existing.factor_id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('climate_risk_factors')
          .insert([riskData]);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving risk factors:', error);
      throw error;
    }
  }

  /**
   * Update receivable with calculated risk score and discount rate
   * @param receivableId Receivable ID
   * @param riskScore Risk score
   * @param discountRate Discount rate
   */
  private static async updateReceivableRisk(
    receivableId: string,
    riskScore: number,
    discountRate: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('climate_receivables')
        .update({
          risk_score: Math.round(riskScore),
          discount_rate: discountRate
        })
        .eq('receivable_id', receivableId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating receivable risk:', error);
      throw error;
    }
  }

  /**
   * Batch assess multiple receivables
   * @param receivableIds Array of receivable IDs
   * @param customWeights Optional custom risk weights
   * @returns Array of risk assessment results
   */
  public static async batchAssessRisk(
    receivableIds: string[],
    customWeights?: Partial<RiskWeights>
  ): Promise<(RiskAssessmentResult & { receivableId: string })[]> {
    const results: (RiskAssessmentResult & { receivableId: string })[] = [];

    for (const receivableId of receivableIds) {
      try {
        const result = await this.assessReceivableRisk(receivableId, customWeights);
        results.push({ ...result, receivableId });
      } catch (error) {
        console.error(`Error assessing risk for receivable ${receivableId}:`, error);
        // Continue with other receivables
      }
    }

    return results;
  }
}
