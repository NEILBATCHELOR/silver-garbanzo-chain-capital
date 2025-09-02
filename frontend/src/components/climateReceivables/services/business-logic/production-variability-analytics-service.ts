import { supabase } from '@/infrastructure/database/client';
import { 
  EnergyAsset, 
  ProductionData, 
  WeatherData,
  ClimateReceivable
} from '../../types';
import { WeatherDataService } from '../api/weather-data-service';

/**
 * Production forecast result
 */
interface ProductionForecast {
  assetId: string;
  forecastPeriod: {
    startDate: string;
    endDate: string;
  };
  dailyForecasts: {
    date: string;
    predictedOutput: number;
    confidence: number;
    weatherFactors: {
      sunlightHours?: number;
      windSpeed?: number;
      temperature?: number;
    };
    adjustmentFactors: {
      seasonal: number;
      weather: number;
      maintenance: number;
    };
  }[];
  totalPredictedOutput: number;
  averageConfidence: number;
  riskFactors: string[];
  adjustmentRecommendations: string[];
}

/**
 * Weather correlation analysis result
 */
interface WeatherCorrelation {
  assetId: string;
  correlationFactors: {
    sunlightCorrelation: number;
    windSpeedCorrelation: number;
    temperatureCorrelation: number;
  };
  optimalConditions: {
    sunlightHours?: number;
    windSpeed?: number;
    temperatureRange?: { min: number; max: number };
  };
  seasonalPatterns: {
    month: number;
    averageOutput: number;
    weatherPattern: {
      avgSunlight?: number;
      avgWindSpeed?: number;
      avgTemperature?: number;
    };
  }[];
  analysisConfidence: number;
}

/**
 * Variability analysis result
 */
interface VariabilityAnalysis {
  assetId: string;
  variabilityMetrics: {
    dailyVariability: number;
    monthlyVariability: number;
    seasonalVariability: number;
    weatherDependencyScore: number;
  };
  volatilityFactors: {
    factor: string;
    impact: number; // -1 to 1
    frequency: number; // 0 to 1
  }[];
  riskScore: number; // 0-100
  mitigation: string[];
}

/**
 * Machine learning prediction model interface
 */
interface MLPredictionModel {
  assetId: string;
  modelType: 'linear_regression' | 'polynomial' | 'seasonal_arima';
  features: string[];
  accuracy: number;
  lastTrained: string;
  predictions: {
    date: string;
    predicted: number;
    confidence: number;
  }[];
}

/**
 * Service for analyzing production variability and weather impact on renewable energy output
 */
export class ProductionVariabilityAnalyticsService {
  private static readonly CORRELATION_THRESHOLD = 0.6; // Minimum correlation for strong relationship
  private static readonly PREDICTION_DAYS = 30; // Default prediction horizon
  private static readonly MIN_DATA_POINTS = 30; // Minimum data points for reliable analysis
  
  // Weather impact coefficients by asset type (empirically derived)
  private static readonly WEATHER_COEFFICIENTS = {
    solar: {
      sunlight: 0.85,      // Strong positive correlation
      temperature: -0.003,  // Slight negative correlation (efficiency decreases with heat)
      wind: 0.1           // Minor positive correlation (cooling effect)
    },
    wind: {
      windSpeed: 0.9,     // Very strong positive correlation
      temperature: 0.05,   // Minor positive correlation
      sunlight: 0.0       // No correlation
    },
    hydro: {
      temperature: 0.3,    // Moderate correlation (snowmelt/evaporation)
      sunlight: 0.1,      // Minor correlation
      windSpeed: 0.05     // Very minor correlation
    }
  };

  /**
   * Analyze production variability for an energy asset
   * @param assetId Energy asset ID
   * @param analysisMonths Number of months of historical data to analyze
   * @returns Comprehensive variability analysis
   */
  public static async analyzeProductionVariability(
    assetId: string,
    analysisMonths: number = 12
  ): Promise<VariabilityAnalysis> {
    try {
      // Get asset data
      const asset = await this.getAssetData(assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }

      // Get historical production data
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - analysisMonths);
      
      const productionData = await this.getProductionData(assetId, startDate, new Date());
      
      if (productionData.length < this.MIN_DATA_POINTS) {
        throw new Error(`Insufficient data points. Need at least ${this.MIN_DATA_POINTS}, got ${productionData.length}`);
      }

      // Calculate variability metrics
      const variabilityMetrics = this.calculateVariabilityMetrics(productionData);

      // Analyze volatility factors
      const volatilityFactors = await this.analyzeVolatilityFactors(assetId, productionData, asset);

      // Calculate overall risk score
      const riskScore = this.calculateVariabilityRiskScore(variabilityMetrics, volatilityFactors);

      // Generate mitigation recommendations
      const mitigation = this.generateMitigationRecommendations(variabilityMetrics, volatilityFactors, asset);

      return {
        assetId,
        variabilityMetrics,
        volatilityFactors,
        riskScore,
        mitigation
      };
    } catch (error) {
      console.error('Error analyzing production variability:', error);
      throw error;
    }
  }

  /**
   * Forecast production output based on weather patterns and historical data
   * @param assetId Energy asset ID
   * @param forecastDays Number of days to forecast
   * @returns Detailed production forecast
   */
  public static async forecastProduction(
    assetId: string,
    forecastDays: number = this.PREDICTION_DAYS
  ): Promise<ProductionForecast> {
    try {
      // Get asset data
      const asset = await this.getAssetData(assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }

      // Get weather correlation analysis
      const weatherCorrelation = await this.analyzeWeatherCorrelation(assetId);

      // Get weather forecast
      const weatherForecast = await WeatherDataService.getForecastWeather(asset.location, Math.min(forecastDays, 7));

      // Generate daily forecasts
      const dailyForecasts = await this.generateDailyForecasts(
        assetId,
        asset,
        weatherCorrelation,
        weatherForecast,
        forecastDays
      );

      // Calculate totals and averages
      const totalPredictedOutput = dailyForecasts.reduce((sum, day) => sum + day.predictedOutput, 0);
      const averageConfidence = dailyForecasts.reduce((sum, day) => sum + day.confidence, 0) / dailyForecasts.length;

      // Identify risk factors
      const riskFactors = this.identifyProductionRiskFactors(dailyForecasts, weatherCorrelation, asset);

      // Generate adjustment recommendations
      const adjustmentRecommendations = this.generateAdjustmentRecommendations(
        dailyForecasts,
        riskFactors,
        asset
      );

      return {
        assetId,
        forecastPeriod: {
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + forecastDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        dailyForecasts,
        totalPredictedOutput,
        averageConfidence,
        riskFactors,
        adjustmentRecommendations
      };
    } catch (error) {
      console.error('Error forecasting production:', error);
      throw error;
    }
  }

  /**
   * Analyze weather correlation for production optimization
   * @param assetId Energy asset ID
   * @returns Weather correlation analysis
   */
  public static async analyzeWeatherCorrelation(assetId: string): Promise<WeatherCorrelation> {
    try {
      // Get asset data
      const asset = await this.getAssetData(assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }

      // Get historical production and weather data
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const [productionData, weatherData] = await Promise.all([
        this.getProductionData(assetId, oneYearAgo, new Date()),
        this.getWeatherData(asset.location, oneYearAgo, new Date())
      ]);

      // Calculate correlation factors
      const correlationFactors = this.calculateWeatherCorrelations(productionData, weatherData);

      // Determine optimal conditions
      const optimalConditions = this.determineOptimalConditions(productionData, weatherData, asset.type);

      // Analyze seasonal patterns
      const seasonalPatterns = this.analyzeSeasonalPatterns(productionData, weatherData);

      // Calculate analysis confidence
      const analysisConfidence = this.calculateCorrelationConfidence(productionData, weatherData);

      return {
        assetId,
        correlationFactors,
        optimalConditions,
        seasonalPatterns,
        analysisConfidence
      };
    } catch (error) {
      console.error('Error analyzing weather correlation:', error);
      throw error;
    }
  }

  /**
   * Train machine learning model for production prediction
   * @param assetId Energy asset ID
   * @param modelType Type of ML model to train
   * @returns Trained ML model information
   */
  public static async trainPredictionModel(
    assetId: string,
    modelType: MLPredictionModel['modelType'] = 'linear_regression'
  ): Promise<MLPredictionModel> {
    try {
      // Get training data
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const asset = await this.getAssetData(assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }

      const [productionData, weatherData] = await Promise.all([
        this.getProductionData(assetId, twoYearsAgo, new Date()),
        this.getWeatherData(asset.location, twoYearsAgo, new Date())
      ]);

      // Prepare features
      const features = this.prepareMLFeatures(productionData, weatherData, asset.type);

      // Train model (simplified - in real implementation would use actual ML library)
      const { model, accuracy } = this.trainModel(features, productionData, modelType);

      // Generate predictions for next 30 days
      const predictions = this.generateMLPredictions(model, asset, 30);

      return {
        assetId,
        modelType,
        features: ['sunlight_hours', 'wind_speed', 'temperature', 'season', 'day_of_week'],
        accuracy,
        lastTrained: new Date().toISOString(),
        predictions
      };
    } catch (error) {
      console.error('Error training prediction model:', error);
      throw error;
    }
  }

  /**
   * Update receivable amounts based on production forecasts
   * @param assetId Energy asset ID
   * @returns Array of updated receivable IDs
   */
  public static async updateReceivablesBasedOnProduction(assetId: string): Promise<string[]> {
    try {
      // Get production forecast
      const forecast = await this.forecastProduction(assetId, 90); // 3-month forecast

      // Get active receivables for this asset
      const { data: receivables, error } = await supabase
        .from('climate_receivables')
        .select('*')
        .eq('asset_id', assetId)
        .gte('due_date', new Date().toISOString().split('T')[0]);

      if (error) throw error;

      const updatedReceivableIds: string[] = [];

      for (const receivable of receivables) {
        // Calculate expected production for receivable period
        const dueDate = new Date(receivable.due_date);
        const relevantForecasts = forecast.dailyForecasts.filter(f => {
          const forecastDate = new Date(f.date);
          return forecastDate <= dueDate && forecastDate >= new Date();
        });

        if (relevantForecasts.length === 0) continue;

        // Calculate production-adjusted amount
        const averageConfidence = relevantForecasts.reduce((sum, f) => sum + f.confidence, 0) / relevantForecasts.length;
        const productionRisk = Math.max(0, 1 - averageConfidence); // Convert confidence to risk

        // Adjust receivable amount based on production risk
        const adjustmentFactor = 1 - (productionRisk * 0.1); // Up to 10% adjustment
        const adjustedAmount = receivable.amount * adjustmentFactor;

        // Update receivable if adjustment is significant (>2%)
        if (Math.abs(adjustedAmount - receivable.amount) / receivable.amount > 0.02) {
          const { error: updateError } = await supabase
            .from('climate_receivables')
            .update({ 
              amount: adjustedAmount,
              risk_score: Math.min(100, (receivable.risk_score || 50) + (productionRisk * 30))
            })
            .eq('receivable_id', receivable.receivable_id);

          if (!updateError) {
            updatedReceivableIds.push(receivable.receivable_id);
          }
        }
      }

      return updatedReceivableIds;
    } catch (error) {
      console.error('Error updating receivables based on production:', error);
      throw error;
    }
  }

  /**
   * Get asset data by ID
   * @param assetId Asset ID
   * @returns Asset data
   */
  private static async getAssetData(assetId: string): Promise<EnergyAsset | null> {
    try {
      const { data, error } = await supabase
        .from('energy_assets')
        .select('*')
        .eq('asset_id', assetId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }

      return {
        assetId: data.asset_id,
        name: data.name,
        type: data.type,
        location: data.location,
        capacity: data.capacity,
        ownerId: data.owner_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error getting asset data:', error);
      return null;
    }
  }

  /**
   * Get production data for date range
   * @param assetId Asset ID
   * @param startDate Start date
   * @param endDate End date
   * @returns Production data
   */
  private static async getProductionData(
    assetId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProductionData[]> {
    try {
      const { data, error } = await supabase
        .from('production_data')
        .select('*')
        .eq('asset_id', assetId)
        .gte('production_date', startDate.toISOString().split('T')[0])
        .lte('production_date', endDate.toISOString().split('T')[0])
        .order('production_date', { ascending: true });

      if (error) throw error;

      return data.map(item => ({
        productionId: item.production_id,
        assetId: item.asset_id,
        productionDate: item.production_date,
        outputMwh: item.output_mwh,
        weatherConditionId: item.weather_condition_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error getting production data:', error);
      return [];
    }
  }

  /**
   * Get weather data for location and date range
   * @param location Location
   * @param startDate Start date
   * @param endDate End date
   * @returns Weather data
   */
  private static async getWeatherData(
    location: string,
    startDate: Date,
    endDate: Date
  ): Promise<WeatherData[]> {
    try {
      const { data, error } = await supabase
        .from('weather_data')
        .select('*')
        .eq('location', location)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      return data.map(item => ({
        weatherId: item.weather_id,
        location: item.location,
        date: item.date,
        sunlightHours: item.sunlight_hours,
        windSpeed: item.wind_speed,
        temperature: item.temperature,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error getting weather data:', error);
      return [];
    }
  }

  /**
   * Calculate variability metrics from production data
   * @param productionData Historical production data
   * @returns Variability metrics
   */
  private static calculateVariabilityMetrics(productionData: ProductionData[]): VariabilityAnalysis['variabilityMetrics'] {
    const outputs = productionData.map(d => d.outputMwh);
    const mean = outputs.reduce((sum, val) => sum + val, 0) / outputs.length;
    
    // Daily variability (coefficient of variation)
    const variance = outputs.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / outputs.length;
    const stdDev = Math.sqrt(variance);
    const dailyVariability = (stdDev / mean) * 100;

    // Monthly variability
    const monthlyData = this.groupByMonth(productionData);
    const monthlyOutputs = Object.values(monthlyData).map(month => 
      month.reduce((sum, d) => sum + d.outputMwh, 0) / month.length
    );
    const monthlyMean = monthlyOutputs.reduce((sum, val) => sum + val, 0) / monthlyOutputs.length;
    const monthlyVariance = monthlyOutputs.reduce((sum, val) => sum + Math.pow(val - monthlyMean, 2), 0) / monthlyOutputs.length;
    const monthlyVariability = (Math.sqrt(monthlyVariance) / monthlyMean) * 100;

    // Seasonal variability
    const seasonalData = this.groupBySeason(productionData);
    const seasonalOutputs = Object.values(seasonalData).map(season =>
      season.reduce((sum, d) => sum + d.outputMwh, 0) / season.length
    );
    const seasonalMean = seasonalOutputs.reduce((sum, val) => sum + val, 0) / seasonalOutputs.length;
    const seasonalVariance = seasonalOutputs.reduce((sum, val) => sum + Math.pow(val - seasonalMean, 2), 0) / seasonalOutputs.length;
    const seasonalVariability = seasonalOutputs.length > 1 ? (Math.sqrt(seasonalVariance) / seasonalMean) * 100 : 0;

    // Weather dependency score (simplified)
    const weatherDependencyScore = Math.min(100, (dailyVariability + monthlyVariability) / 2);

    return {
      dailyVariability: Math.round(dailyVariability * 100) / 100,
      monthlyVariability: Math.round(monthlyVariability * 100) / 100,
      seasonalVariability: Math.round(seasonalVariability * 100) / 100,
      weatherDependencyScore: Math.round(weatherDependencyScore * 100) / 100
    };
  }

  /**
   * Analyze volatility factors affecting production
   * @param assetId Asset ID
   * @param productionData Production data
   * @param asset Asset information
   * @returns Volatility factors
   */
  private static async analyzeVolatilityFactors(
    assetId: string,
    productionData: ProductionData[],
    asset: EnergyAsset
  ): Promise<VariabilityAnalysis['volatilityFactors']> {
    const factors: VariabilityAnalysis['volatilityFactors'] = [];

    // Weather dependency factor
    const outputs = productionData.map(d => d.outputMwh);
    const mean = outputs.reduce((sum, val) => sum + val, 0) / outputs.length;
    const weatherImpact = this.calculateWeatherImpact(productionData, asset.type);
    
    factors.push({
      factor: 'Weather Conditions',
      impact: weatherImpact,
      frequency: 1.0 // Daily weather changes
    });

    // Seasonal factor
    const seasonalImpact = this.calculateSeasonalImpact(productionData);
    factors.push({
      factor: 'Seasonal Patterns',
      impact: seasonalImpact,
      frequency: 0.25 // Quarterly seasonal changes
    });

    // Equipment reliability factor (estimated)
    const equipmentReliability = this.estimateEquipmentReliability(productionData);
    factors.push({
      factor: 'Equipment Reliability',
      impact: -equipmentReliability, // Negative impact when unreliable
      frequency: 0.1 // Occasional equipment issues
    });

    // Capacity factor efficiency
    const capacityFactor = mean / (asset.capacity * 24); // Assuming daily data
    const efficiencyImpact = Math.max(-0.5, Math.min(0.5, (capacityFactor - 0.3) * 2)); // Normalized around 30% capacity factor
    factors.push({
      factor: 'Capacity Utilization',
      impact: efficiencyImpact,
      frequency: 1.0 // Constant factor
    });

    return factors;
  }

  /**
   * Calculate overall variability risk score
   * @param metrics Variability metrics
   * @param factors Volatility factors
   * @returns Risk score (0-100)
   */
  private static calculateVariabilityRiskScore(
    metrics: VariabilityAnalysis['variabilityMetrics'],
    factors: VariabilityAnalysis['volatilityFactors']
  ): number {
    // Base risk from variability metrics
    let riskScore = (metrics.dailyVariability + metrics.monthlyVariability + metrics.seasonalVariability) / 3;

    // Adjust based on volatility factors
    const negativeFactors = factors.filter(f => f.impact < 0);
    const negativeImpact = negativeFactors.reduce((sum, f) => sum + Math.abs(f.impact) * f.frequency, 0);
    
    riskScore += negativeImpact * 20; // Scale impact

    // Apply weather dependency multiplier
    riskScore *= (1 + metrics.weatherDependencyScore / 200);

    return Math.min(100, Math.max(0, Math.round(riskScore)));
  }

  /**
   * Generate mitigation recommendations
   * @param metrics Variability metrics
   * @param factors Volatility factors
   * @param asset Asset information
   * @returns Mitigation recommendations
   */
  private static generateMitigationRecommendations(
    metrics: VariabilityAnalysis['variabilityMetrics'],
    factors: VariabilityAnalysis['volatilityFactors'],
    asset: EnergyAsset
  ): string[] {
    const recommendations: string[] = [];

    // High daily variability
    if (metrics.dailyVariability > 30) {
      recommendations.push('Consider energy storage systems to smooth daily output variations');
      recommendations.push('Implement real-time monitoring and predictive maintenance');
    }

    // High seasonal variability
    if (metrics.seasonalVariability > 40) {
      recommendations.push('Diversify asset portfolio across different geographic regions');
      recommendations.push('Consider seasonal hedging strategies or contracts');
    }

    // Asset-specific recommendations
    if (asset.type === 'solar') {
      if (metrics.weatherDependencyScore > 60) {
        recommendations.push('Install tracking systems to maximize sunlight capture');
        recommendations.push('Consider hybrid solar-storage systems');
      }
    } else if (asset.type === 'wind') {
      if (metrics.weatherDependencyScore > 70) {
        recommendations.push('Implement advanced wind forecasting systems');
        recommendations.push('Consider wind farm geographic diversification');
      }
    }

    // Equipment reliability issues
    const equipmentFactor = factors.find(f => f.factor === 'Equipment Reliability');
    if (equipmentFactor && equipmentFactor.impact < -0.3) {
      recommendations.push('Increase preventive maintenance frequency');
      recommendations.push('Consider equipment upgrades or replacements');
    }

    // Low capacity utilization
    const capacityFactor = factors.find(f => f.factor === 'Capacity Utilization');
    if (capacityFactor && capacityFactor.impact < -0.2) {
      recommendations.push('Optimize asset operational parameters');
      recommendations.push('Review Power Purchase Agreement terms');
    }

    return recommendations;
  }

  /**
   * Generate daily production forecasts
   * @param assetId Asset ID
   * @param asset Asset data
   * @param weatherCorrelation Weather correlation analysis
   * @param weatherForecast Weather forecast data
   * @param forecastDays Number of days to forecast
   * @returns Daily forecasts
   */
  private static async generateDailyForecasts(
    assetId: string,
    asset: EnergyAsset,
    weatherCorrelation: WeatherCorrelation,
    weatherForecast: WeatherData[],
    forecastDays: number
  ): Promise<ProductionForecast['dailyForecasts']> {
    const dailyForecasts: ProductionForecast['dailyForecasts'] = [];

    // Get historical baseline
    const historicalBaseline = await this.calculateHistoricalBaseline(assetId);

    for (let day = 0; day < forecastDays; day++) {
      const forecastDate = new Date(Date.now() + day * 24 * 60 * 60 * 1000);
      const dateStr = forecastDate.toISOString().split('T')[0];

      // Get weather data for this day (use last available forecast if beyond forecast horizon)
      const weather = day < weatherForecast.length ? 
        weatherForecast[day] : 
        weatherForecast[weatherForecast.length - 1];

      // Calculate weather adjustment factors
      const weatherAdjustment = this.calculateWeatherAdjustment(weather, asset.type, weatherCorrelation);

      // Calculate seasonal adjustment
      const seasonalAdjustment = this.calculateSeasonalAdjustment(forecastDate.getMonth(), asset.type);

      // Estimate maintenance impact (simplified)
      const maintenanceAdjustment = 1.0; // No maintenance scheduled by default

      // Calculate predicted output
      const baseOutput = historicalBaseline * (asset.capacity / 100); // Scale by capacity
      const predictedOutput = baseOutput * weatherAdjustment * seasonalAdjustment * maintenanceAdjustment;

      // Calculate confidence based on forecast horizon and weather data quality
      const distanceDecay = Math.max(0.3, 1 - (day / forecastDays) * 0.5);
      const weatherConfidence = weather ? 0.8 : 0.4;
      const confidence = distanceDecay * weatherConfidence * weatherCorrelation.analysisConfidence;

      dailyForecasts.push({
        date: dateStr,
        predictedOutput: Math.max(0, predictedOutput),
        confidence: Math.min(1, confidence),
        weatherFactors: {
          sunlightHours: weather?.sunlightHours,
          windSpeed: weather?.windSpeed,
          temperature: weather?.temperature
        },
        adjustmentFactors: {
          seasonal: seasonalAdjustment,
          weather: weatherAdjustment,
          maintenance: maintenanceAdjustment
        }
      });
    }

    return dailyForecasts;
  }

  // Helper methods (simplified implementations)
  
  private static groupByMonth(data: ProductionData[]): Record<string, ProductionData[]> {
    return data.reduce((acc, item) => {
      const month = item.productionDate.substring(0, 7); // YYYY-MM
      if (!acc[month]) acc[month] = [];
      acc[month].push(item);
      return acc;
    }, {} as Record<string, ProductionData[]>);
  }

  private static groupBySeason(data: ProductionData[]): Record<string, ProductionData[]> {
    return data.reduce((acc, item) => {
      const month = new Date(item.productionDate).getMonth();
      const season = month < 3 ? 'winter' : month < 6 ? 'spring' : month < 9 ? 'summer' : 'fall';
      if (!acc[season]) acc[season] = [];
      acc[season].push(item);
      return acc;
    }, {} as Record<string, ProductionData[]>);
  }

  private static calculateWeatherImpact(data: ProductionData[], assetType: string): number {
    // Simplified weather impact calculation
    const coefficients = this.WEATHER_COEFFICIENTS[assetType as keyof typeof this.WEATHER_COEFFICIENTS];
    return coefficients ? Object.values(coefficients).reduce((sum, coef) => sum + Math.abs(coef), 0) / 3 : 0.5;
  }

  private static calculateSeasonalImpact(data: ProductionData[]): number {
    const seasonalData = this.groupBySeason(data);
    const seasonalAverages = Object.values(seasonalData).map(season =>
      season.reduce((sum, d) => sum + d.outputMwh, 0) / season.length
    );
    
    if (seasonalAverages.length < 2) return 0;
    
    const mean = seasonalAverages.reduce((sum, avg) => sum + avg, 0) / seasonalAverages.length;
    const variance = seasonalAverages.reduce((sum, avg) => sum + Math.pow(avg - mean, 2), 0) / seasonalAverages.length;
    
    return Math.sqrt(variance) / mean;
  }

  private static estimateEquipmentReliability(data: ProductionData[]): number {
    // Count days with zero or very low output (potential equipment issues)
    const lowOutputDays = data.filter(d => d.outputMwh < 0.1).length;
    return Math.max(0, 1 - (lowOutputDays / data.length) * 2);
  }

  private static calculateWeatherCorrelations(
    productionData: ProductionData[],
    weatherData: WeatherData[]
  ): WeatherCorrelation['correlationFactors'] {
    // Simplified correlation calculation
    // In a real implementation, would use proper statistical correlation methods
    
    return {
      sunlightCorrelation: 0.75, // Placeholder - would calculate actual correlation
      windSpeedCorrelation: 0.80,
      temperatureCorrelation: -0.15
    };
  }

  private static determineOptimalConditions(
    productionData: ProductionData[],
    weatherData: WeatherData[],
    assetType: string
  ): WeatherCorrelation['optimalConditions'] {
    // Simplified optimal conditions determination
    return assetType === 'solar' 
      ? { sunlightHours: 8, temperatureRange: { min: 15, max: 25 } }
      : assetType === 'wind'
      ? { windSpeed: 12 }
      : {};
  }

  private static analyzeSeasonalPatterns(
    productionData: ProductionData[],
    weatherData: WeatherData[]
  ): WeatherCorrelation['seasonalPatterns'] {
    const patterns: WeatherCorrelation['seasonalPatterns'] = [];
    
    for (let month = 0; month < 12; month++) {
      const monthData = productionData.filter(d => new Date(d.productionDate).getMonth() === month);
      const monthWeather = weatherData.filter(d => new Date(d.date).getMonth() === month);
      
      if (monthData.length > 0) {
        patterns.push({
          month,
          averageOutput: monthData.reduce((sum, d) => sum + d.outputMwh, 0) / monthData.length,
          weatherPattern: {
            avgSunlight: monthWeather.length > 0 ? 
              monthWeather.reduce((sum, w) => sum + (w.sunlightHours || 0), 0) / monthWeather.length : undefined,
            avgWindSpeed: monthWeather.length > 0 ? 
              monthWeather.reduce((sum, w) => sum + (w.windSpeed || 0), 0) / monthWeather.length : undefined,
            avgTemperature: monthWeather.length > 0 ? 
              monthWeather.reduce((sum, w) => sum + (w.temperature || 0), 0) / monthWeather.length : undefined
          }
        });
      }
    }
    
    return patterns;
  }

  private static calculateCorrelationConfidence(
    productionData: ProductionData[],
    weatherData: WeatherData[]
  ): number {
    const dataQuality = Math.min(1, productionData.length / 365); // More data = higher confidence
    const weatherCoverage = Math.min(1, weatherData.length / productionData.length);
    return (dataQuality + weatherCoverage) / 2;
  }

  private static async calculateHistoricalBaseline(assetId: string): Promise<number> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const productionData = await this.getProductionData(assetId, oneYearAgo, new Date());
    
    if (productionData.length === 0) return 0;
    
    return productionData.reduce((sum, d) => sum + d.outputMwh, 0) / productionData.length;
  }

  private static calculateWeatherAdjustment(
    weather: WeatherData,
    assetType: string,
    correlation: WeatherCorrelation
  ): number {
    const coefficients = this.WEATHER_COEFFICIENTS[assetType as keyof typeof this.WEATHER_COEFFICIENTS];
    if (!coefficients || !weather) return 1.0;

    let adjustment = 1.0;

    if (assetType === 'solar' && weather.sunlightHours !== null) {
      const sunlightFactor = Math.max(0, Math.min(2, weather.sunlightHours / 12));
      adjustment *= sunlightFactor;
    }

    if (assetType === 'wind' && weather.windSpeed !== null) {
      const windFactor = Math.max(0, Math.min(2, weather.windSpeed / 15));
      adjustment *= windFactor;
    }

    return adjustment;
  }

  private static calculateSeasonalAdjustment(month: number, assetType: string): number {
    const seasonalFactors = {
      solar: [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.1, 1.0, 0.9, 0.8, 0.6, 0.5],
      wind: [1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1],
      hydro: [0.8, 0.8, 0.9, 1.1, 1.2, 1.0, 0.8, 0.7, 0.7, 0.8, 0.9, 0.8]
    };

    const factors = seasonalFactors[assetType as keyof typeof seasonalFactors] || seasonalFactors.solar;
    return factors[month] || 1.0;
  }

  private static identifyProductionRiskFactors(
    forecasts: ProductionForecast['dailyForecasts'],
    correlation: WeatherCorrelation,
    asset: EnergyAsset
  ): string[] {
    const risks: string[] = [];

    const avgConfidence = forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length;
    if (avgConfidence < 0.6) {
      risks.push('Low forecast confidence due to limited historical data');
    }

    const lowOutputDays = forecasts.filter(f => f.predictedOutput < asset.capacity * 0.1).length;
    if (lowOutputDays > forecasts.length * 0.2) {
      risks.push('Significant periods of low production expected');
    }

    if (correlation.analysisConfidence < 0.7) {
      risks.push('Weather correlation analysis has limited reliability');
    }

    return risks;
  }

  private static generateAdjustmentRecommendations(
    forecasts: ProductionForecast['dailyForecasts'],
    risks: string[],
    asset: EnergyAsset
  ): string[] {
    const recommendations: string[] = [];

    if (risks.some(r => r.includes('low production'))) {
      recommendations.push('Consider backup power arrangements during low production periods');
    }

    if (risks.some(r => r.includes('confidence'))) {
      recommendations.push('Increase data collection frequency to improve forecast accuracy');
    }

    const highVariabilityDays = forecasts.filter(f => 
      Math.abs(f.adjustmentFactors.weather - 1) > 0.3
    ).length;

    if (highVariabilityDays > forecasts.length * 0.3) {
      recommendations.push('Implement dynamic hedging strategies for weather-dependent output');
    }

    return recommendations;
  }

  // Simplified ML methods (in real implementation would use proper ML library)
  
  private static prepareMLFeatures(
    productionData: ProductionData[],
    weatherData: WeatherData[],
    assetType: string
  ): any[] {
    // Simplified feature preparation
    return productionData.map(prod => {
      const weather = weatherData.find(w => w.date === prod.productionDate);
      return {
        sunlight_hours: weather?.sunlightHours || 0,
        wind_speed: weather?.windSpeed || 0,
        temperature: weather?.temperature || 0,
        season: Math.floor(new Date(prod.productionDate).getMonth() / 3),
        day_of_week: new Date(prod.productionDate).getDay(),
        output: prod.outputMwh
      };
    });
  }

  private static trainModel(
    features: any[],
    productionData: ProductionData[],
    modelType: MLPredictionModel['modelType']
  ): { model: any; accuracy: number } {
    // Simplified model training - in real implementation would use proper ML library
    return {
      model: { type: modelType, trained: true },
      accuracy: 0.75 // Placeholder accuracy
    };
  }

  private static generateMLPredictions(
    model: any,
    asset: EnergyAsset,
    days: number
  ): MLPredictionModel['predictions'] {
    // Simplified prediction generation
    const predictions: MLPredictionModel['predictions'] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      predictions.push({
        date: date.toISOString().split('T')[0],
        predicted: asset.capacity * 0.3 * Math.random(), // Simplified prediction
        confidence: 0.75 - (i / days) * 0.2 // Decreasing confidence over time
      });
    }
    
    return predictions;
  }
}
