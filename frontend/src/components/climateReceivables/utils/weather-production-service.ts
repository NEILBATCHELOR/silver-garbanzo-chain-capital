import { WeatherData, ProductionData, EnergyAsset, EnergyAssetType } from '../types';

/**
 * Service for analyzing and predicting the correlation between
 * weather conditions and energy production
 */
export class WeatherProductionService {
  /**
   * Calculate the correlation between weather factors and production output
   * @param asset The energy asset
   * @param productionData Array of production data
   * @param weatherData Array of weather data
   * @returns Correlation coefficients for relevant weather factors
   */
  public static calculateCorrelations(
    asset: EnergyAsset,
    productionData: ProductionData[],
    weatherData: WeatherData[]
  ): Record<string, number> {
    // Match production data with corresponding weather data
    const matchedData = this.matchProductionWithWeather(productionData, weatherData);
    
    if (matchedData.length < 2) {
      return { error: 1 }; // Not enough data points for correlation
    }
    
    // Determine which weather factors to correlate based on asset type
    const weatherFactors = this.getRelevantWeatherFactors(asset.type);
    
    // Calculate correlation for each factor
    const correlations: Record<string, number> = {};
    
    weatherFactors.forEach(factor => {
      // Extract data points for the factor and production
      const factorValues = matchedData.map(item => item.weather[factor as keyof WeatherData] as number);
      const outputValues = matchedData.map(item => item.production.outputMwh);
      
      // Check if we have valid numerical data for this factor
      const validData = factorValues.every(val => val !== undefined && !isNaN(val));
      
      if (validData) {
        correlations[factor] = this.pearsonCorrelation(factorValues, outputValues);
      } else {
        correlations[factor] = 0; // No correlation if data is missing
      }
    });
    
    return correlations;
  }
  
  /**
   * Predict production output based on weather forecast
   * @param asset The energy asset
   * @param weatherForecast Forecasted weather conditions
   * @param historicalProduction Historical production data
   * @param historicalWeather Historical weather data
   * @returns Predicted output in MWh
   */
  public static predictProduction(
    asset: EnergyAsset,
    weatherForecast: WeatherData,
    historicalProduction: ProductionData[],
    historicalWeather: WeatherData[]
  ): number {
    // Match historical data
    const matchedData = this.matchProductionWithWeather(historicalProduction, historicalWeather);
    
    if (matchedData.length < 5) {
      // Not enough data for reliable prediction, use capacity-based estimate
      return this.estimateFromCapacity(asset, weatherForecast);
    }
    
    // Calculate correlations to determine which factors have the strongest relationship
    const correlations = this.calculateCorrelations(asset, historicalProduction, historicalWeather);
    
    // Get the most significant weather factors
    const weatherFactors = this.getRelevantWeatherFactors(asset.type);
    const significantFactors = weatherFactors
      .filter(factor => Math.abs(correlations[factor] || 0) > 0.3) // Only use factors with meaningful correlation
      .sort((a, b) => Math.abs(correlations[b] || 0) - Math.abs(correlations[a] || 0)); // Sort by correlation strength
    
    if (significantFactors.length === 0) {
      // No significant correlations found, use capacity-based estimate
      return this.estimateFromCapacity(asset, weatherForecast);
    }
    
    // Build a simple regression model based on the most significant factor
    const primaryFactor = significantFactors[0];
    
    // Extract data for regression
    const xValues = matchedData.map(item => item.weather[primaryFactor as keyof WeatherData] as number);
    const yValues = matchedData.map(item => item.production.outputMwh);
    
    // Calculate simple linear regression coefficients (y = mx + b)
    const n = xValues.length;
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const b = (sumY - m * sumX) / n;
    
    // Predict using the regression model
    const forecastValue = weatherForecast[primaryFactor as keyof WeatherData] as number;
    let predictedOutput = m * forecastValue + b;
    
    // Apply constraints based on asset capacity
    const maxOutput = asset.capacity * 24; // Maximum daily output in MWh
    predictedOutput = Math.max(0, Math.min(predictedOutput, maxOutput));
    
    return parseFloat(predictedOutput.toFixed(2));
  }
  
  /**
   * Match production data with corresponding weather data
   * @param productionData Array of production data
   * @param weatherData Array of weather data
   * @returns Array of matched data points
   */
  private static matchProductionWithWeather(
    productionData: ProductionData[],
    weatherData: WeatherData[]
  ): Array<{ production: ProductionData, weather: WeatherData }> {
    const weatherByDate: Record<string, WeatherData> = {};
    
    // Index weather data by date
    weatherData.forEach(weather => {
      weatherByDate[weather.date] = weather;
    });
    
    // Match production with weather
    return productionData
      .filter(production => weatherByDate[production.productionDate] !== undefined)
      .map(production => ({
        production,
        weather: weatherByDate[production.productionDate]
      }));
  }
  
  /**
   * Get relevant weather factors based on asset type
   * @param assetType The type of energy asset
   * @returns Array of relevant weather factor names
   */
  private static getRelevantWeatherFactors(assetType: EnergyAssetType): string[] {
    switch (assetType) {
      case EnergyAssetType.SOLAR:
        return ['sunlightHours', 'temperature'];
      case EnergyAssetType.WIND:
        return ['windSpeed', 'temperature'];
      case EnergyAssetType.HYDRO:
        return ['temperature']; // Simplified - would typically include precipitation/water flow
      default:
        return ['temperature']; // Default factor for other types
    }
  }
  
  /**
   * Calculate Pearson correlation coefficient between two datasets
   * @param x First dataset
   * @param y Second dataset
   * @returns Correlation coefficient (-1 to 1)
   */
  private static pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    
    // Calculate means
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate sums of squares
    let ssX = 0;
    let ssY = 0;
    let ssXY = 0;
    
    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      
      ssX += diffX * diffX;
      ssY += diffY * diffY;
      ssXY += diffX * diffY;
    }
    
    // Calculate correlation coefficient
    const correlation = ssXY / (Math.sqrt(ssX) * Math.sqrt(ssY));
    
    // Handle NaN cases (e.g., if there's no variation in one dataset)
    return isNaN(correlation) ? 0 : parseFloat(correlation.toFixed(4));
  }
  
  /**
   * Estimate production based on asset capacity and basic weather factors
   * @param asset The energy asset
   * @param weather Weather conditions
   * @returns Estimated output in MWh
   */
  private static estimateFromCapacity(
    asset: EnergyAsset,
    weather: WeatherData
  ): number {
    // Capacity factor estimates based on asset type and minimal weather data
    let capacityFactor = 0.3; // Default capacity factor
    
    switch (asset.type) {
      case EnergyAssetType.SOLAR:
        // Solar output is primarily dependent on sunlight hours
        if (weather.sunlightHours !== undefined) {
          // Assume typical day has 12 hours of potential sunlight
          const normalizedSunlight = Math.min(weather.sunlightHours / 12, 1);
          capacityFactor = 0.25 * normalizedSunlight;
        }
        break;
      
      case EnergyAssetType.WIND:
        // Wind output is primarily dependent on wind speed
        if (weather.windSpeed !== undefined) {
          // Simple model: 0 at 0 m/s, max at 15 m/s, decreasing after 25 m/s
          if (weather.windSpeed < 3) {
            capacityFactor = 0;
          } else if (weather.windSpeed < 15) {
            capacityFactor = 0.35 * (weather.windSpeed - 3) / 12;
          } else if (weather.windSpeed < 25) {
            capacityFactor = 0.35;
          } else {
            capacityFactor = 0.35 * Math.max(0, (30 - weather.windSpeed) / 5);
          }
        }
        break;
      
      case EnergyAssetType.HYDRO:
        // Simplified hydro model - typically has high capacity factor
        capacityFactor = 0.5;
        break;
      
      default:
        capacityFactor = 0.3;
    }
    
    // Calculate daily output based on capacity and factor
    const dailyOutput = asset.capacity * 24 * capacityFactor;
    
    return parseFloat(dailyOutput.toFixed(2));
  }
}
