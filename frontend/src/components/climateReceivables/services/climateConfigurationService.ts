/**
 * Climate Configuration Service
 * 
 * Handles CRUD operations for climate receivables risk calculation configuration
 * stored in the system_settings table. All parameters that drive risk assessment
 * are managed through this service.
 */

import { supabase } from '@/infrastructure/database/client';

export interface RiskWeights {
  creditRating: number;
  financialHealth: number;
  productionVariability: number;
  marketConditions: number;
  policyImpact: number;
}

export interface RiskThresholds {
  production: {
    low: number;
    medium: number;
    high: number;
  };
  market: {
    volatilityLow: number;
    volatilityMedium: number;
    volatilityHigh: number;
  };
  credit: {
    investmentGrade: number;
    speculativeGrade: number;
    highRisk: number;
  };
}

export interface RiskParameters {
  baseDiscountRate: number;
  maxDiscountRate: number;
  minDiscountRate: number;
  confidenceBase: number;
  confidenceRealTimeBonus: number;
}

export interface CreditRating {
  rating: string;
  defaultRate: number;
  spreadBps: number;
  investmentGrade: boolean;
  riskTier: 'Prime' | 'Investment Grade' | 'Speculative' | 'High Risk' | 'Default Risk';
}

export interface MarketDataConfig {
  baselineTreasury10Y: number;
  treasurySensitivity: number;
  baselineIGSpread: number;
  cacheRefreshMinutes: number;
  dataQualityThreshold: number;
}

export interface ForecastingParameters {
  seasonalFactors: Record<string, number>; // Monthly multipliers  
  growthRateDefault: number;
  forecastingWeights: {
    historical: number;
    seasonal: number;
    trend: number;
    market: number;
  };
}

export class ClimateConfigurationService {

  // =============================================================================
  // RISK WEIGHTS MANAGEMENT
  // =============================================================================

  /**
   * Get current risk calculation weights
   */
  static async getRiskWeights(): Promise<RiskWeights> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'climate_risk_weight_credit_rating',
        'climate_risk_weight_financial_health',
        'climate_risk_weight_production_variability',
        'climate_risk_weight_market_conditions',
        'climate_risk_weight_policy_impact'
      ]);

    if (error) throw error;

    const settings = this.parseSettings(data || []);
    
    return {
      creditRating: settings.climate_risk_weight_credit_rating || 0.35,
      financialHealth: settings.climate_risk_weight_financial_health || 0.25,
      productionVariability: settings.climate_risk_weight_production_variability || 0.20,
      marketConditions: settings.climate_risk_weight_market_conditions || 0.10,
      policyImpact: settings.climate_risk_weight_policy_impact || 0.10
    };
  }

  /**
   * Update risk calculation weights
   */
  static async updateRiskWeights(weights: RiskWeights): Promise<void> {
    // Validate weights sum to 1.0
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(total - 1.0) > 0.001) {
      throw new Error(`Risk weights must sum to 1.0, current sum: ${total.toFixed(3)}`);
    }

    const updates = [
      { key: 'climate_risk_weight_credit_rating', value: weights.creditRating.toString() },
      { key: 'climate_risk_weight_financial_health', value: weights.financialHealth.toString() },
      { key: 'climate_risk_weight_production_variability', value: weights.productionVariability.toString() },
      { key: 'climate_risk_weight_market_conditions', value: weights.marketConditions.toString() },
      { key: 'climate_risk_weight_policy_impact', value: weights.policyImpact.toString() }
    ];

    await this.bulkUpsertSettings(updates);
  }

  // =============================================================================
  // RISK THRESHOLDS MANAGEMENT  
  // =============================================================================

  /**
   * Get current risk thresholds
   */
  static async getRiskThresholds(): Promise<RiskThresholds> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'climate_production_threshold_low',
        'climate_production_threshold_medium',
        'climate_production_threshold_high',
        'climate_market_volatility_threshold_low',
        'climate_market_volatility_threshold_medium',
        'climate_market_volatility_threshold_high',
        'climate_credit_threshold_investment_grade',
        'climate_credit_threshold_speculative_grade',
        'climate_credit_threshold_high_risk'
      ]);

    if (error) throw error;

    const settings = this.parseSettings(data || []);

    return {
      production: {
        low: settings.climate_production_threshold_low || 0.1,
        medium: settings.climate_production_threshold_medium || 0.25,
        high: settings.climate_production_threshold_high || 0.50
      },
      market: {
        volatilityLow: settings.climate_market_volatility_threshold_low || 0.1,
        volatilityMedium: settings.climate_market_volatility_threshold_medium || 0.2,
        volatilityHigh: settings.climate_market_volatility_threshold_high || 0.35
      },
      credit: {
        investmentGrade: settings.climate_credit_threshold_investment_grade || 40,
        speculativeGrade: settings.climate_credit_threshold_speculative_grade || 65,
        highRisk: settings.climate_credit_threshold_high_risk || 85
      }
    };
  }

  /**
   * Update risk thresholds
   */
  static async updateRiskThresholds(thresholds: RiskThresholds): Promise<void> {
    const updates = [
      { key: 'climate_production_threshold_low', value: thresholds.production.low.toString() },
      { key: 'climate_production_threshold_medium', value: thresholds.production.medium.toString() },
      { key: 'climate_production_threshold_high', value: thresholds.production.high.toString() },
      { key: 'climate_market_volatility_threshold_low', value: thresholds.market.volatilityLow.toString() },
      { key: 'climate_market_volatility_threshold_medium', value: thresholds.market.volatilityMedium.toString() },
      { key: 'climate_market_volatility_threshold_high', value: thresholds.market.volatilityHigh.toString() },
      { key: 'climate_credit_threshold_investment_grade', value: thresholds.credit.investmentGrade.toString() },
      { key: 'climate_credit_threshold_speculative_grade', value: thresholds.credit.speculativeGrade.toString() },
      { key: 'climate_credit_threshold_high_risk', value: thresholds.credit.highRisk.toString() }
    ];

    await this.bulkUpsertSettings(updates);
  }

  // =============================================================================
  // RISK PARAMETERS MANAGEMENT
  // =============================================================================

  /**
   * Get risk calculation parameters
   */
  static async getRiskParameters(): Promise<RiskParameters> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'climate_discount_rate_base',
        'climate_discount_rate_max',
        'climate_discount_rate_min',
        'climate_confidence_base',
        'climate_confidence_realtime_bonus'
      ]);

    if (error) throw error;

    const settings = this.parseSettings(data || []);

    return {
      baseDiscountRate: settings.climate_discount_rate_base || 2.0,
      maxDiscountRate: settings.climate_discount_rate_max || 12.0,
      minDiscountRate: settings.climate_discount_rate_min || 1.0,
      confidenceBase: settings.climate_confidence_base || 80,
      confidenceRealTimeBonus: settings.climate_confidence_realtime_bonus || 15
    };
  }

  /**
   * Update risk parameters
   */
  static async updateRiskParameters(params: RiskParameters): Promise<void> {
    // Validate parameter ranges
    if (params.minDiscountRate >= params.maxDiscountRate) {
      throw new Error('Minimum discount rate must be less than maximum discount rate');
    }
    if (params.baseDiscountRate < params.minDiscountRate || params.baseDiscountRate > params.maxDiscountRate) {
      throw new Error('Base discount rate must be between min and max discount rates');
    }
    if (params.confidenceBase < 50 || params.confidenceBase > 95) {
      throw new Error('Confidence base must be between 50 and 95');
    }

    const updates = [
      { key: 'climate_discount_rate_base', value: params.baseDiscountRate.toString() },
      { key: 'climate_discount_rate_max', value: params.maxDiscountRate.toString() },
      { key: 'climate_discount_rate_min', value: params.minDiscountRate.toString() },
      { key: 'climate_confidence_base', value: params.confidenceBase.toString() },
      { key: 'climate_confidence_realtime_bonus', value: params.confidenceRealTimeBonus.toString() }
    ];

    await this.bulkUpsertSettings(updates);
  }

  // =============================================================================
  // CREDIT RATING MATRIX MANAGEMENT
  // =============================================================================

  /**
   * Get credit rating matrix configuration
   */
  static async getCreditRatingMatrix(): Promise<CreditRating[]> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .like('key', 'climate_credit_rating_%');

    if (error) throw error;

    // Parse credit rating settings
    const ratingData: Record<string, Partial<CreditRating>> = {};
    
    (data || []).forEach(setting => {
      const parts = setting.key.split('_');
      const rating = parts[3]; // e.g., 'aaa', 'aa_plus', etc.
      const field = parts[4]; // e.g., 'default_rate', 'spread_bps', etc.
      
      if (!ratingData[rating]) {
        ratingData[rating] = { rating: rating.toUpperCase().replace('_', '+') };
      }
      
      switch (field) {
        case 'default':
          if (parts[5] === 'rate') ratingData[rating].defaultRate = parseFloat(setting.value);
          break;
        case 'spread':
          if (parts[5] === 'bps') ratingData[rating].spreadBps = parseFloat(setting.value);
          break;
        case 'investment':
          if (parts[5] === 'grade') ratingData[rating].investmentGrade = setting.value === 'true';
          break;
        case 'risk':
          if (parts[5] === 'tier') ratingData[rating].riskTier = setting.value as any;
          break;
      }
    });

    // Return default ratings if none configured
    if (Object.keys(ratingData).length === 0) {
      return this.getDefaultCreditRatings();
    }

    return Object.values(ratingData).filter(r => r.rating && r.defaultRate !== undefined) as CreditRating[];
  }

  /**
   * Update credit rating configuration
   */
  static async updateCreditRating(rating: CreditRating): Promise<void> {
    const ratingKey = rating.rating.toLowerCase().replace('+', '_plus').replace('-', '_minus');
    
    const updates = [
      { key: `climate_credit_rating_${ratingKey}_default_rate`, value: rating.defaultRate.toString() },
      { key: `climate_credit_rating_${ratingKey}_spread_bps`, value: rating.spreadBps.toString() },
      { key: `climate_credit_rating_${ratingKey}_investment_grade`, value: rating.investmentGrade.toString() },
      { key: `climate_credit_rating_${ratingKey}_risk_tier`, value: rating.riskTier }
    ];

    await this.bulkUpsertSettings(updates);
  }

  /**
   * Bulk update credit rating matrix
   */
  static async updateCreditRatingMatrix(ratings: CreditRating[]): Promise<void> {
    const updates: Array<{ key: string; value: string }> = [];
    
    ratings.forEach(rating => {
      const ratingKey = rating.rating.toLowerCase().replace('+', '_plus').replace('-', '_minus');
      updates.push(
        { key: `climate_credit_rating_${ratingKey}_default_rate`, value: rating.defaultRate.toString() },
        { key: `climate_credit_rating_${ratingKey}_spread_bps`, value: rating.spreadBps.toString() },
        { key: `climate_credit_rating_${ratingKey}_investment_grade`, value: rating.investmentGrade.toString() },
        { key: `climate_credit_rating_${ratingKey}_risk_tier`, value: rating.riskTier }
      );
    });

    await this.bulkUpsertSettings(updates);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Parse system_settings data into key-value object
   */
  private static parseSettings(data: Array<{ key: string; value: string }>): Record<string, number> {
    return data.reduce((acc, item) => {
      acc[item.key] = parseFloat(item.value);
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Bulk upsert settings to database
   */
  private static async bulkUpsertSettings(updates: Array<{ key: string; value: string }>): Promise<void> {
    const { error } = await supabase
      .from('system_settings')
      .upsert(
        updates.map(update => ({
          key: update.key,
          value: update.value,
          created_at: new Date().toISOString()
        })),
        { onConflict: 'key' }
      );

    if (error) throw error;
  }

  /**
   * Get default credit ratings when none are configured
   */
  private static getDefaultCreditRatings(): CreditRating[] {
    return [
      { rating: 'AAA', defaultRate: 0.02, spreadBps: 80, investmentGrade: true, riskTier: 'Prime' },
      { rating: 'AA+', defaultRate: 0.03, spreadBps: 90, investmentGrade: true, riskTier: 'Prime' },
      { rating: 'AA', defaultRate: 0.04, spreadBps: 100, investmentGrade: true, riskTier: 'Investment Grade' },
      { rating: 'AA-', defaultRate: 0.05, spreadBps: 110, investmentGrade: true, riskTier: 'Investment Grade' },
      { rating: 'A+', defaultRate: 0.07, spreadBps: 130, investmentGrade: true, riskTier: 'Investment Grade' },
      { rating: 'A', defaultRate: 0.09, spreadBps: 150, investmentGrade: true, riskTier: 'Investment Grade' },
      { rating: 'A-', defaultRate: 0.12, spreadBps: 170, investmentGrade: true, riskTier: 'Investment Grade' },
      { rating: 'BBB+', defaultRate: 0.16, spreadBps: 200, investmentGrade: true, riskTier: 'Investment Grade' },
      { rating: 'BBB', defaultRate: 0.21, spreadBps: 240, investmentGrade: true, riskTier: 'Investment Grade' },
      { rating: 'BBB-', defaultRate: 0.27, spreadBps: 280, investmentGrade: true, riskTier: 'Investment Grade' },
      { rating: 'BB+', defaultRate: 0.45, spreadBps: 350, investmentGrade: false, riskTier: 'Speculative' },
      { rating: 'BB', defaultRate: 0.68, spreadBps: 420, investmentGrade: false, riskTier: 'Speculative' },
      { rating: 'BB-', defaultRate: 0.95, spreadBps: 500, investmentGrade: false, riskTier: 'Speculative' },
      { rating: 'B+', defaultRate: 1.35, spreadBps: 600, investmentGrade: false, riskTier: 'High Risk' },
      { rating: 'B', defaultRate: 1.85, spreadBps: 720, investmentGrade: false, riskTier: 'High Risk' },
      { rating: 'B-', defaultRate: 2.55, spreadBps: 850, investmentGrade: false, riskTier: 'High Risk' },
      { rating: 'CCC+', defaultRate: 4.20, spreadBps: 1100, investmentGrade: false, riskTier: 'High Risk' },
      { rating: 'CCC', defaultRate: 6.50, spreadBps: 1400, investmentGrade: false, riskTier: 'Default Risk' },
      { rating: 'CCC-', defaultRate: 9.80, spreadBps: 1800, investmentGrade: false, riskTier: 'Default Risk' },
      { rating: 'CC', defaultRate: 15.50, spreadBps: 2500, investmentGrade: false, riskTier: 'Default Risk' },
      { rating: 'C', defaultRate: 25.00, spreadBps: 3500, investmentGrade: false, riskTier: 'Default Risk' },
      { rating: 'D', defaultRate: 100.00, spreadBps: 5000, investmentGrade: false, riskTier: 'Default Risk' }
    ];
  }

  /**
   * Reset all configuration to defaults
   */
  static async resetToDefaults(): Promise<void> {
    // Delete all climate configuration settings
    const { error: deleteError } = await supabase
      .from('system_settings')
      .delete()
      .like('key', 'climate_%');

    if (deleteError) throw deleteError;

    // Set default values
    const defaultWeights: RiskWeights = {
      creditRating: 0.35,
      financialHealth: 0.25,
      productionVariability: 0.20,
      marketConditions: 0.10,
      policyImpact: 0.10
    };

    const defaultThresholds: RiskThresholds = {
      production: { low: 0.1, medium: 0.25, high: 0.50 },
      market: { volatilityLow: 0.1, volatilityMedium: 0.2, volatilityHigh: 0.35 },
      credit: { investmentGrade: 40, speculativeGrade: 65, highRisk: 85 }
    };

    const defaultParams: RiskParameters = {
      baseDiscountRate: 2.0,
      maxDiscountRate: 12.0,
      minDiscountRate: 1.0,
      confidenceBase: 80,
      confidenceRealTimeBonus: 15
    };

    await Promise.all([
      this.updateRiskWeights(defaultWeights),
      this.updateRiskThresholds(defaultThresholds),
      this.updateRiskParameters(defaultParams),
      this.updateCreditRatingMatrix(this.getDefaultCreditRatings())
    ]);
  }
}
