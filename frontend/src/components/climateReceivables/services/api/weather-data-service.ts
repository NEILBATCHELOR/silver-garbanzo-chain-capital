import { WeatherData } from '../../types';
import { supabase } from '@/infrastructure/database/client';
import { EnhancedFreeWeatherService, WeatherAPIResponse } from './enhanced-free-weather-service';

/**
 * Enhanced Weather Data Service using Free APIs
 * 
 * Priority hierarchy:
 * 1. Open-Meteo (free, no API key) - Primary
 * 2. NOAA Weather.gov (free, no API key) - US locations
 * 3. WeatherAPI.com (free tier 1M calls/month) - International backup
 * 
 * Replaces paid OpenWeather API with cost-effective free alternatives
 */
export class WeatherDataService {
  private static readonly CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds (reduced for free APIs)

  /**
   * Get weather data for a location and date using FREE APIs ONLY
   * @param location The location to get weather data for
   * @param date The date to get weather data for (defaults to today)
   * @param coordinates Optional latitude/longitude for more precise API calls
   * @returns Weather data using free API hierarchy
   */
  public static async getWeatherData(
    location: string, 
    date: string = new Date().toISOString().split('T')[0],
    coordinates?: { latitude: number; longitude: number }
  ): Promise<WeatherData> {
    try {
      console.log(`[BATCH] Getting weather data for ${location} on ${date} using FREE APIs`);
      
      // First, try to get data from the database
      const dbData = await this.getWeatherFromDatabase(location, date);
      
      // If we have fresh data in the database, return it
      if (dbData) {
        // Check if the data is current (for today's date only)
        if (date === new Date().toISOString().split('T')[0]) {
          const updatedAt = new Date(dbData.updatedAt).getTime();
          const now = new Date().getTime();
          
          // If data is fresh, return it
          if (now - updatedAt <= this.CACHE_DURATION) {
            console.log(`[BATCH] Using cached weather data for ${location}`);
            return dbData;
          }
        } else {
          // For historical dates, always use the database first
          console.log(`[BATCH] Using historical weather data from database for ${location}`);
          return dbData;
        }
      }
      
      // If coordinates not provided, try to geocode the location
      if (!coordinates) {
        coordinates = await this.geocodeLocation(location);
      }
      
      // If we don't have data in the database or it's stale, fetch from FREE APIs
      if (date === new Date().toISOString().split('T')[0]) {
        // For today's date, use current weather API
        const freeApiData = await EnhancedFreeWeatherService.getCurrentWeather(
          coordinates.latitude, 
          coordinates.longitude, 
          location
        );
        
        // Convert to our WeatherData format and save
        const weatherData = this.convertApiResponseToWeatherData(freeApiData, location, date);
        const savedData = await this.saveWeatherData(weatherData);
        console.log(`[BATCH] Fetched current weather from ${freeApiData.provider} for ${location}`);
        return savedData;
      } else {
        // For historical dates, try historical API first, then climatological average
        try {
          const historicalData = await EnhancedFreeWeatherService.getHistoricalWeather(
            coordinates.latitude,
            coordinates.longitude,
            date
          );
          
          const weatherData = this.convertApiResponseToWeatherData(historicalData, location, date);
          const savedData = await this.saveWeatherData(weatherData);
          console.log(`[BATCH] Fetched historical weather from ${historicalData.provider} for ${location} on ${date}`);
          return savedData;
        } catch (error) {
          console.log(`[BATCH] Historical data unavailable, using climatological average for ${location}`);
          return this.getClimatologicalAverage(location, date);
        }
      }
    } catch (error) {
      console.error(`[BATCH] Error getting weather data for ${location} on ${date}:`, error);
      // Fallback to climatological average
      return this.getClimatologicalAverage(location, date);
    }
  }

  /**
   * Get forecast weather data using FREE APIs ONLY
   * @param location The location to get weather data for
   * @param days Number of days to forecast (max 16 with Open-Meteo)
   * @param coordinates Optional latitude/longitude for more precise API calls
   * @returns Array of weather data for each day
   */
  public static async getForecastWeather(
    location: string, 
    days: number = 5,
    coordinates?: { latitude: number; longitude: number }
  ): Promise<WeatherData[]> {
    try {
      console.log(`[BATCH] Getting ${days}-day forecast for ${location} using FREE APIs`);
      
      // Limit days to maximum of 16 (Open-Meteo limitation)
      const forecastDays = Math.min(days, 16);
      
      // Get coordinates if not provided
      if (!coordinates) {
        coordinates = await this.geocodeLocation(location);
      }
      
      // Use Enhanced Free Weather Service for forecast
      const freeApiForecast = await EnhancedFreeWeatherService.getWeatherForecast(
        coordinates.latitude,
        coordinates.longitude,
        forecastDays
      );
      
      // Convert to our WeatherData format and save to database
      const forecasts: WeatherData[] = [];
      const startDate = new Date();
      
      for (let i = 0; i < freeApiForecast.length; i++) {
        const forecastDate = new Date(startDate);
        forecastDate.setDate(forecastDate.getDate() + i);
        const dateString = forecastDate.toISOString().split('T')[0];
        
        const weatherData = this.convertApiResponseToWeatherData(
          freeApiForecast[i], 
          location, 
          dateString
        );
        
        // Save to database for future use
        const savedData = await this.saveWeatherData(weatherData);
        forecasts.push(savedData);
      }
      
      console.log(`[BATCH] Fetched ${forecasts.length}-day forecast using free APIs for ${location}`);
      return forecasts;
    } catch (error) {
      console.error(`[BATCH] Error getting forecast weather data for ${location}:`, error);
      
      // Fallback to historical averages
      const forecasts: WeatherData[] = [];
      const startDate = new Date();
      
      for (let i = 0; i < Math.min(days, 7); i++) {
        const forecastDate = new Date(startDate);
        forecastDate.setDate(forecastDate.getDate() + i);
        const dateString = forecastDate.toISOString().split('T')[0];
        
        try {
          const fallbackData = await this.getClimatologicalAverage(location, dateString);
          forecasts.push(fallbackData);
        } catch (fallbackError) {
          console.error(`Error getting fallback data for ${dateString}:`, fallbackError);
        }
      }
      
      return forecasts;
    }
  }

  /**
   * Get weather data from the database
   * @param location The location to get weather data for
   * @param date The date to get weather data for
   * @returns Weather data if found, null otherwise
   */
  private static async getWeatherFromDatabase(
    location: string,
    date: string
  ): Promise<WeatherData | null> {
    try {
      const { data, error } = await supabase
        .from('weather_data')
        .select('*')
        .eq('location', location)
        .eq('date', date)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // "no rows returned" error
          return null;
        }
        throw error;
      }
      
      if (!data) {
        return null;
      }
      
      // Convert to our WeatherData format
      return {
        weatherId: data.weather_id,
        location: data.location,
        date: data.date,
        sunlightHours: data.sunlight_hours,
        windSpeed: data.wind_speed,
        temperature: data.temperature,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error(`Error getting weather data from database for ${location} on ${date}:`, error);
      return null;
    }
  }

  /**
   * Geocode location to coordinates for API calls
   * @param location Location string to geocode
   * @returns Latitude and longitude coordinates
   */
  private static async geocodeLocation(location: string): Promise<{ latitude: number; longitude: number }> {
    try {
      // Simple geocoding using Open-Meteo's geocoding API (free)
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return {
          latitude: data.results[0].latitude,
          longitude: data.results[0].longitude
        };
      }
      
      throw new Error(`No coordinates found for location: ${location}`);
    } catch (error) {
      console.error(`Error geocoding location ${location}:`, error);
      // Fallback coordinates (approximately US center)
      return { latitude: 39.8283, longitude: -98.5795 };
    }
  }

  /**
   * Convert WeatherAPIResponse to WeatherData format
   * @param apiResponse Response from free weather API
   * @param location Location string
   * @param date Date string
   * @returns WeatherData in our format
   */
  private static convertApiResponseToWeatherData(
    apiResponse: WeatherAPIResponse,
    location: string,
    date: string
  ): WeatherData {
    return {
      weatherId: '', // Will be assigned when saved to database
      location: location,
      date: date,
      sunlightHours: apiResponse.sunlightHours,
      windSpeed: apiResponse.windSpeed,
      temperature: apiResponse.temperature,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }



  /**
   * Save weather data to the database
   * @param weatherData The weather data to save
   * @returns The saved weather data with database ID
   */
  private static async saveWeatherData(weatherData: WeatherData): Promise<WeatherData> {
    try {
      // Convert to database format
      const dbData = {
        location: weatherData.location,
        date: weatherData.date,
        sunlight_hours: weatherData.sunlightHours,
        wind_speed: weatherData.windSpeed,
        temperature: weatherData.temperature
      };
      
      // Check if we already have data for this location and date
      const { data: existingData, error: checkError } = await supabase
        .from('weather_data')
        .select('weather_id')
        .eq('location', weatherData.location)
        .eq('date', weatherData.date)
        .single();
      
      let result;
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingData) {
        // Update existing record
        const { data, error } = await supabase
          .from('weather_data')
          .update(dbData)
          .eq('weather_id', existingData.weather_id)
          .select('*')
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('weather_data')
          .insert(dbData)
          .select('*')
          .single();
        
        if (error) throw error;
        result = data;
      }
      
      // Return updated WeatherData
      return {
        weatherId: result.weather_id,
        location: result.location,
        date: result.date,
        sunlightHours: result.sunlight_hours,
        windSpeed: result.wind_speed,
        temperature: result.temperature,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      };
    } catch (error) {
      console.error('Error saving weather data to database:', error);
      throw error;
    }
  }

  /**
   * Get climatological average for a location and date (ENHANCED FALLBACK)
   * @param location The location to get climate data for
   * @param date The date to get climate data for
   * @returns Estimated weather data based on climatological averages
   */
  private static async getClimatologicalAverage(location: string, date: string): Promise<WeatherData> {
    try {
      console.log(`[BATCH] Using climatological average for ${location} on ${date}`);
      
      // Check if we have historical averages in database first
      const { data: historicalAvg } = await supabase
        .from('weather_historical_averages')
        .select('*')
        .eq('location', location)
        .single();

      if (historicalAvg) {
        return {
          weatherId: '', // Will be assigned when saved to database
          location: location,
          date: date,
          sunlightHours: historicalAvg.avg_sunlight_hours,
          windSpeed: historicalAvg.avg_wind_speed,
          temperature: historicalAvg.avg_temperature,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      // Fallback to seasonal approximation if no historical data
      const month = new Date(date).getMonth(); // 0-11
      
      // Enhanced seasonal approximations with location-based adjustments
      let tempEstimate = 20; // Default moderate temperature
      let sunlightEstimate = 12; // Default equinox hours
      let windSpeedEstimate = 5; // Default moderate wind
      
      // Basic latitude estimation for temperature adjustment
      const isNorthernLocation = !location.toLowerCase().includes('australia') && 
                                !location.toLowerCase().includes('south africa') &&
                                !location.toLowerCase().includes('argentina');
      
      // Northern hemisphere seasonal adjustments
      if (isNorthernLocation) {
        if (month >= 11 || month <= 1) { // Winter
          tempEstimate = 5;
          sunlightEstimate = 9;
          windSpeedEstimate = 7;
        } else if (month >= 2 && month <= 4) { // Spring
          tempEstimate = 15;
          sunlightEstimate = 12;
          windSpeedEstimate = 6;
        } else if (month >= 5 && month <= 7) { // Summer
          tempEstimate = 25;
          sunlightEstimate = 15;
          windSpeedEstimate = 4;
        } else if (month >= 8 && month <= 10) { // Fall
          tempEstimate = 15;
          sunlightEstimate = 11;
          windSpeedEstimate = 5;
        }
      } else {
        // Southern hemisphere (reversed seasons)
        if (month >= 5 && month <= 7) { // Winter
          tempEstimate = 10;
          sunlightEstimate = 9;
          windSpeedEstimate = 7;
        } else if (month >= 8 && month <= 10) { // Spring
          tempEstimate = 18;
          sunlightEstimate = 12;
          windSpeedEstimate = 6;
        } else if (month >= 11 || month <= 1) { // Summer
          tempEstimate = 28;
          sunlightEstimate = 15;
          windSpeedEstimate = 4;
        } else if (month >= 2 && month <= 4) { // Fall
          tempEstimate = 18;
          sunlightEstimate = 11;
          windSpeedEstimate = 5;
        }
      }
      
      // Create and return estimated weather data
      const weatherData: WeatherData = {
        weatherId: '', // Will be assigned when saved to database
        location: location,
        date: date,
        sunlightHours: sunlightEstimate,
        windSpeed: windSpeedEstimate,
        temperature: tempEstimate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to database for future use
      const savedData = await this.saveWeatherData(weatherData);
      return savedData;
    } catch (error) {
      console.error('[BATCH] Error generating climatological average:', error);
      throw error;
    }
  }
}