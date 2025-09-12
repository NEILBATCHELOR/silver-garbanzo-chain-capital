/**
 * Enhanced Free Weather API Service
 * 
 * Integrates multiple free weather APIs with fallback hierarchy:
 * 1. Open-Meteo (free, no API key) - Primary
 * 2. NOAA Weather.gov (free, no API key) - US locations
 * 3. WeatherAPI.com (free tier 1M calls/month) - International backup
 * 
 * Replaces paid OpenWeather API dependency with cost-effective alternatives
 */

import { WeatherData } from '../../types';
import { supabase } from '@/infrastructure/database/client';

export interface FreeWeatherConfig {
  enableCache: boolean;
  cacheHours: number;
  fallbackToDatabase: boolean;
  logApiCalls: boolean;
}

export interface WeatherAPIResponse {
  temperature: number;
  humidity: number;
  sunlightHours: number;
  windSpeed: number;
  precipitationMm: number;
  cloudCover: number;
  provider: 'open-meteo' | 'noaa' | 'weatherapi' | 'database';
  fetchedAt: string;
}

export class EnhancedFreeWeatherService {
  private static readonly OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';
  private static readonly NOAA_BASE = 'https://api.weather.gov';
  private static readonly WEATHER_API_KEY = import.meta.env.VITE_WEATHERAPI_KEY; // Optional free tier
  private static readonly WEATHER_API_BASE = 'https://api.weatherapi.com/v1';
  
  private static config: FreeWeatherConfig = {
    enableCache: true,
    cacheHours: 6, // Cache for 6 hours
    fallbackToDatabase: true,
    logApiCalls: true
  };

  /**
   * Get current weather data with free API fallback hierarchy
   */
  public static async getCurrentWeather(
    latitude: number, 
    longitude: number,
    location?: string
  ): Promise<WeatherAPIResponse> {
    const cacheKey = `weather_${latitude}_${longitude}`;
    
    // Check cache first if enabled
    if (this.config.enableCache) {
      const cachedData = await this.getCachedWeather(cacheKey);
      if (cachedData) return cachedData;
    }
    
    // Try APIs in priority order
    try {
      // Priority 1: Open-Meteo (Free, no API key required)
      const openMeteoData = await this.fetchFromOpenMeteo(latitude, longitude);
      await this.cacheWeatherData(cacheKey, openMeteoData);
      return openMeteoData;
    } catch (error) {
      this.log(`Open-Meteo failed: ${error}`);
    }

    try {
      // Priority 2: NOAA (Free, US locations only)
      const noaaData = await this.fetchFromNOAA(latitude, longitude);
      await this.cacheWeatherData(cacheKey, noaaData);
      return noaaData;
    } catch (error) {
      this.log(`NOAA failed: ${error}`);
    }

    try {
      // Priority 3: WeatherAPI.com (Free tier, requires key)
      if (this.WEATHER_API_KEY) {
        const weatherApiData = await this.fetchFromWeatherAPI(latitude, longitude);
        await this.cacheWeatherData(cacheKey, weatherApiData);
        return weatherApiData;
      }
    } catch (error) {
      this.log(`WeatherAPI failed: ${error}`);
    }

    // Final fallback: Database historical average
    if (this.config.fallbackToDatabase && location) {
      return this.getDatabaseFallback(location);
    }

    throw new Error('All weather APIs failed and no fallback available');
  }

  /**
   * Get weather forecast using Open-Meteo (supports 16-day forecasts)
   */
  public static async getWeatherForecast(
    latitude: number, 
    longitude: number, 
    days: number = 7
  ): Promise<WeatherAPIResponse[]> {
    try {
      const forecastDays = Math.min(days, 16); // Open-Meteo supports up to 16 days
      
      const response = await fetch(
        `${this.OPEN_METEO_BASE}/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m,precipitation_sum,wind_speed_10m_max,sunshine_duration,cloud_cover&forecast_days=${forecastDays}&timezone=auto`
      );

      if (!response.ok) {
        throw new Error(`Open-Meteo forecast API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseOpenMeteoForecast(data);
    } catch (error) {
      this.log(`Weather forecast failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get historical weather data using Open-Meteo Historical API
   */
  public static async getHistoricalWeather(
    latitude: number, 
    longitude: number, 
    date: string
  ): Promise<WeatherAPIResponse> {
    try {
      const response = await fetch(
        `${this.OPEN_METEO_BASE}/historical?latitude=${latitude}&longitude=${longitude}&start_date=${date}&end_date=${date}&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m,precipitation_sum,wind_speed_10m_max,sunshine_duration,cloud_cover&timezone=auto`
      );

      if (!response.ok) {
        throw new Error(`Open-Meteo historical API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseOpenMeteoHistorical(data, date);
    } catch (error) {
      this.log(`Historical weather failed: ${error}`);
      throw error;
    }
  }

  // Private API implementation methods

  private static async fetchFromOpenMeteo(lat: number, lon: number): Promise<WeatherAPIResponse> {
    const response = await fetch(
      `${this.OPEN_METEO_BASE}/current?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,cloud_cover&hourly=sunshine_duration&timezone=auto`
    );

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      temperature: data.current.temperature_2m || 20,
      humidity: data.current.relative_humidity_2m || 60,
      sunlightHours: this.calculateDailySunshine(data.hourly?.sunshine_duration || []),
      windSpeed: data.current.wind_speed_10m || 5,
      precipitationMm: data.current.precipitation || 0,
      cloudCover: data.current.cloud_cover || 50,
      provider: 'open-meteo',
      fetchedAt: new Date().toISOString()
    };
  }

  private static async fetchFromNOAA(lat: number, lon: number): Promise<WeatherAPIResponse> {
    // NOAA API requires finding the grid point first
    const pointResponse = await fetch(`${this.NOAA_BASE}/points/${lat},${lon}`);
    
    if (!pointResponse.ok) {
      throw new Error(`NOAA points API error: ${pointResponse.status}`);
    }

    const pointData = await pointResponse.json();
    const forecastUrl = pointData.properties.forecast;
    
    const forecastResponse = await fetch(forecastUrl);
    if (!forecastResponse.ok) {
      throw new Error(`NOAA forecast API error: ${forecastResponse.status}`);
    }

    const forecastData = await forecastResponse.json();
    const currentPeriod = forecastData.properties.periods[0];
    
    return {
      temperature: this.parseFahrenheitToCelsius(currentPeriod.temperature),
      humidity: 60, // NOAA doesn't provide humidity in basic forecast
      sunlightHours: this.estimateSunlightFromDescription(currentPeriod.shortForecast),
      windSpeed: this.parseWindSpeed(currentPeriod.windSpeed),
      precipitationMm: this.estimatePrecipitation(currentPeriod.shortForecast),
      cloudCover: this.estimateCloudCover(currentPeriod.shortForecast),
      provider: 'noaa',
      fetchedAt: new Date().toISOString()
    };
  }

  private static async fetchFromWeatherAPI(lat: number, lon: number): Promise<WeatherAPIResponse> {
    const response = await fetch(
      `${this.WEATHER_API_BASE}/current.json?key=${this.WEATHER_API_KEY}&q=${lat},${lon}&aqi=no`
    );

    if (!response.ok) {
      throw new Error(`WeatherAPI error: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current;
    
    return {
      temperature: current.temp_c,
      humidity: current.humidity,
      sunlightHours: this.calculateSunlightFromUV(current.uv),
      windSpeed: current.wind_kph / 3.6, // Convert to m/s
      precipitationMm: current.precip_mm,
      cloudCover: current.cloud,
      provider: 'weatherapi',
      fetchedAt: new Date().toISOString()
    };
  }

  // Utility methods

  private static calculateDailySunshine(hourlyData: number[]): number {
    if (!hourlyData || hourlyData.length === 0) return 8;
    const totalSeconds = hourlyData.reduce((sum, seconds) => sum + (seconds || 0), 0);
    return Math.round(totalSeconds / 3600 * 10) / 10; // Convert to hours
  }

  private static parseFahrenheitToCelsius(fahrenheit: number): number {
    return Math.round((fahrenheit - 32) * 5 / 9 * 10) / 10;
  }

  private static parseWindSpeed(windSpeedStr: string): number {
    const match = windSpeedStr.match(/(\d+)/);
    return match ? parseInt(match[1]) * 0.44704 : 5; // Convert mph to m/s
  }

  private static estimateSunlightFromDescription(description: string): number {
    const desc = description.toLowerCase();
    if (desc.includes('sunny') || desc.includes('clear')) return 10;
    if (desc.includes('partly')) return 7;
    if (desc.includes('cloudy') || desc.includes('overcast')) return 3;
    return 6;
  }

  private static estimatePrecipitation(description: string): number {
    const desc = description.toLowerCase();
    if (desc.includes('rain') || desc.includes('shower')) return 2;
    if (desc.includes('storm')) return 10;
    if (desc.includes('snow')) return 5;
    return 0;
  }

  private static estimateCloudCover(description: string): number {
    const desc = description.toLowerCase();
    if (desc.includes('clear') || desc.includes('sunny')) return 10;
    if (desc.includes('partly')) return 50;
    if (desc.includes('cloudy') || desc.includes('overcast')) return 90;
    return 50;
  }

  private static calculateSunlightFromUV(uvIndex: number): number {
    // Rough estimation: UV index to sunlight hours
    return Math.min(uvIndex * 1.5, 12);
  }

  private static parseOpenMeteoForecast(data: any): WeatherAPIResponse[] {
    const dailyData = data.daily;
    const forecasts: WeatherAPIResponse[] = [];

    for (let i = 0; i < dailyData.time.length; i++) {
      forecasts.push({
        temperature: (dailyData.temperature_2m_max[i] + dailyData.temperature_2m_min[i]) / 2,
        humidity: dailyData.relative_humidity_2m[i] || 60,
        sunlightHours: (dailyData.sunshine_duration[i] || 0) / 3600,
        windSpeed: dailyData.wind_speed_10m_max[i] || 5,
        precipitationMm: dailyData.precipitation_sum[i] || 0,
        cloudCover: dailyData.cloud_cover[i] || 50,
        provider: 'open-meteo',
        fetchedAt: new Date().toISOString()
      });
    }

    return forecasts;
  }

  private static parseOpenMeteoHistorical(data: any, date: string): WeatherAPIResponse {
    const dailyData = data.daily;
    const index = 0; // Single day request

    return {
      temperature: (dailyData.temperature_2m_max[index] + dailyData.temperature_2m_min[index]) / 2,
      humidity: dailyData.relative_humidity_2m[index] || 60,
      sunlightHours: (dailyData.sunshine_duration[index] || 0) / 3600,
      windSpeed: dailyData.wind_speed_10m_max[index] || 5,
      precipitationMm: dailyData.precipitation_sum[index] || 0,
      cloudCover: dailyData.cloud_cover[index] || 50,
      provider: 'open-meteo',
      fetchedAt: new Date().toISOString()
    };
  }

  // Caching methods

  private static async getCachedWeather(cacheKey: string): Promise<WeatherAPIResponse | null> {
    try {
      const { data, error } = await supabase
        .from('weather_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error || !data) return null;
      return JSON.parse(data.weather_data);
    } catch {
      return null;
    }
  }

  private static async cacheWeatherData(cacheKey: string, weatherData: WeatherAPIResponse): Promise<void> {
    if (!this.config.enableCache) return;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.config.cacheHours);

    await supabase
      .from('weather_cache')
      .upsert({
        cache_key: cacheKey,
        weather_data: JSON.stringify(weatherData),
        expires_at: expiresAt.toISOString()
      });
  }

  private static async getDatabaseFallback(location: string): Promise<WeatherAPIResponse> {
    // Use historical averages from database as last resort
    const { data, error } = await supabase
      .from('weather_historical_averages')
      .select('*')
      .eq('location', location)
      .single();

    if (error || !data) {
      // Ultimate fallback - reasonable defaults
      return {
        temperature: 20,
        humidity: 65,
        sunlightHours: 8,
        windSpeed: 3,
        precipitationMm: 0,
        cloudCover: 40,
        provider: 'database',
        fetchedAt: new Date().toISOString()
      };
    }

    return {
      temperature: data.avg_temperature,
      humidity: data.avg_humidity,
      sunlightHours: data.avg_sunlight_hours,
      windSpeed: data.avg_wind_speed,
      precipitationMm: data.avg_precipitation,
      cloudCover: data.avg_cloud_cover,
      provider: 'database',
      fetchedAt: new Date().toISOString()
    };
  }

  private static log(message: string): void {
    if (this.config.logApiCalls) {
      console.log(`[FreeWeatherService] ${message}`);
    }
  }

  /**
   * Update service configuration
   */
  public static updateConfig(newConfig: Partial<FreeWeatherConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
