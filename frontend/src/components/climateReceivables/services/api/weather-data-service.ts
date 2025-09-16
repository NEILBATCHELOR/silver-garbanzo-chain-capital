import { WeatherData } from '../../types';
import { supabase } from '@/infrastructure/database/client';
import { EnhancedFreeWeatherService, WeatherAPIResponse } from './enhanced-free-weather-service';
import { mapboxGeocodingService } from '../../utils/mapbox-geocoding-service';

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
   * Get weather data for a location and date using FREE APIs ONLY (API-FIRST APPROACH)
   * @param location The location to get weather data for
   * @param date The date to get weather data for (defaults to today)
   * @param coordinates Optional latitude/longitude for more precise API calls
   * @param forceAPICall Force live API call instead of checking cache
   * @returns Weather data using free API hierarchy
   */
  public static async getWeatherData(
    location: string, 
    date: string = new Date().toISOString().split('T')[0],
    coordinates?: { latitude: number; longitude: number },
    forceAPICall: boolean = true  // Default to live API calls
  ): Promise<WeatherData> {
    try {
      console.log(`[BATCH] Getting LIVE weather data for ${location} on ${date} using FREE APIs`);
      
      // API-FIRST: Always try live API data for current weather requests
      const today = new Date().toISOString().split('T')[0];
      if (date === today && forceAPICall) {
        try {
          // Get coordinates if not provided
          if (!coordinates) {
            coordinates = await this.geocodeLocation(location);
          }
          
          // Fetch live weather data from APIs
          const freeApiData = await EnhancedFreeWeatherService.getCurrentWeather(
            coordinates.latitude, 
            coordinates.longitude, 
            location
          );
          
          // Convert to our WeatherData format and save to cache
          const weatherData = this.convertApiResponseToWeatherData(freeApiData, location, date);
          const savedData = await this.saveWeatherData(weatherData);
          console.log(`[BATCH] ✅ LIVE weather data from ${freeApiData.provider} for ${location}: ${weatherData.temperature}°C`);
          return savedData;
        } catch (apiError) {
          console.error(`[BATCH] Live API failed for ${location}, checking cache:`, apiError);
        }
      }
      
      // CACHE FALLBACK: Check database only if API fails or for historical dates
      if (!forceAPICall || date !== today) {
        const dbData = await this.getWeatherFromDatabase(location, date);
        
        if (dbData) {
          // For today's date, check if data is fresh enough
          if (date === today) {
            const updatedAt = new Date(dbData.updatedAt).getTime();
            const now = new Date().getTime();
            
            if (now - updatedAt <= this.CACHE_DURATION) {
              console.log(`[BATCH] Using cached weather data for ${location} (${Math.round((now - updatedAt) / (1000 * 60))} mins old)`);
              return dbData;
            }
          } else {
            // For historical dates, use database data if available
            console.log(`[BATCH] Using historical weather data from database for ${location} on ${date}`);
            return dbData;
          }
        }
      }
      
      // HISTORICAL API: For historical dates, try historical API
      if (date !== today) {
        try {
          if (!coordinates) {
            coordinates = await this.geocodeLocation(location);
          }
          
          const historicalData = await EnhancedFreeWeatherService.getHistoricalWeather(
            coordinates.latitude,
            coordinates.longitude,
            date
          );
          
          const weatherData = this.convertApiResponseToWeatherData(historicalData, location, date);
          const savedData = await this.saveWeatherData(weatherData);
          console.log(`[BATCH] ✅ Historical weather from ${historicalData.provider} for ${location} on ${date}`);
          return savedData;
        } catch (error) {
          console.log(`[BATCH] Historical API failed, using climatological average for ${location}`);
        }
      }
      
      // FINAL FALLBACK: Climatological average
      return this.getClimatologicalAverage(location, date);
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
   * Geocode location to coordinates for API calls using Mapbox (primary) with Open-Meteo fallback
   * @param location Location string to geocode
   * @returns Latitude and longitude coordinates
   */
  private static async geocodeLocation(location: string): Promise<{ latitude: number; longitude: number }> {
    console.log(`[BATCH] Geocoding location with enhanced service: ${location}`);
    
    try {
      // Check for problematic location patterns first
      const problematicPatterns = [
        /^[A-Z]{2,}\s*,\s*USA$/i, // State names like "TEXAS, USA"  
        /^[A-Z]{2,}\s*,\s*US$/i,  // State names like "TEXAS, US"
        /^[A-Z\s]+STATE$/i,       // Generic state references
      ];

      const isProblematicLocation = problematicPatterns.some(pattern => pattern.test(location.trim()));
      
      if (isProblematicLocation) {
        console.warn(`[BATCH] Skipping geocoding for overly broad location: ${location}`);
        throw new Error(`Location "${location}" is too broad for geocoding. Please provide a specific city.`);
      }
      
      // Try fallback coordinates first for known locations
      const fallbackCoordinates = this.getFallbackCoordinates(location);
      if (fallbackCoordinates) {
        console.log(`[BATCH] Using predefined coordinates for ${location}:`, fallbackCoordinates);
        return fallbackCoordinates;
      }

      // PRIMARY: Try Mapbox geocoding service if available
      if (mapboxGeocodingService.isConfigured()) {
        try {
          console.log(`[BATCH] Attempting Mapbox geocoding for: ${location}`);
          const mapboxResult = await mapboxGeocodingService.geocodeAddress(location);
          
          if (mapboxResult) {
            console.log(`[BATCH] ✅ Mapbox geocoding successful for ${location}:`, {
              latitude: mapboxResult.coordinates.latitude,
              longitude: mapboxResult.coordinates.longitude,
              formatted: mapboxResult.formatted_address
            });
            return {
              latitude: mapboxResult.coordinates.latitude,
              longitude: mapboxResult.coordinates.longitude
            };
          }
        } catch (mapboxError) {
          console.warn(`[BATCH] Mapbox geocoding failed for ${location}, trying Open-Meteo fallback:`, mapboxError);
        }
      } else {
        console.warn('[BATCH] Mapbox geocoding service not configured, using Open-Meteo');
      }
      
      // FALLBACK: Use Open-Meteo geocoding API if Mapbox fails or isn't configured
      let normalizedLocation = location;
      if (location.toLowerCase().includes('london, england')) {
        normalizedLocation = 'London, GB';
      } else if (location.toLowerCase() === 'london, gb') {
        normalizedLocation = 'London, United Kingdom';
      }
      
      console.log(`[BATCH] Normalized location for Open-Meteo: ${location} -> ${normalizedLocation}`);
      
      // Use Open-Meteo geocoding as fallback
      const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(normalizedLocation)}&count=1&language=en&format=json`;
      console.log(`[BATCH] Calling Open-Meteo geocoding API: ${geocodingUrl}`);
      
      const response = await fetch(geocodingUrl);
      
      if (!response.ok) {
        console.error(`[BATCH] Open-Meteo geocoding API HTTP error: ${response.status} ${response.statusText}`);
        throw new Error(`Open-Meteo geocoding API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[BATCH] Open-Meteo geocoding API response:`, data);
      
      if (data.results && data.results.length > 0) {
        console.log(`[BATCH] ✅ Open-Meteo geocoding successful for ${location} -> ${normalizedLocation}:`, {
          latitude: data.results[0].latitude,
          longitude: data.results[0].longitude,
          name: data.results[0].name,
          country: data.results[0].country
        });
        return {
          latitude: data.results[0].latitude,
          longitude: data.results[0].longitude
        };
      }
      
      console.warn(`[BATCH] No geocoding results found for ${normalizedLocation}`);
      throw new Error(`No coordinates found for location: ${location}`);
    } catch (error) {
      console.error(`[BATCH] Error geocoding location ${location}:`, error);
      
      // Final fallback attempt with different location format
      const finalFallback = this.getFallbackCoordinates(location);
      if (finalFallback) {
        console.log(`[BATCH] Using emergency fallback coordinates for ${location}:`, finalFallback);
        return finalFallback;
      }
      
      throw error;
    }
  }

  /**
   * Get fallback coordinates for common locations when geocoding fails
   */
  private static getFallbackCoordinates(location: string): { latitude: number; longitude: number } | null {
    const fallbacks: { [key: string]: { latitude: number; longitude: number } } = {
      // London variations
      'london, england': { latitude: 51.5074, longitude: -0.1278 },
      'london, gb': { latitude: 51.5074, longitude: -0.1278 },
      'london, uk': { latitude: 51.5074, longitude: -0.1278 },
      'london': { latitude: 51.5074, longitude: -0.1278 },
      'london, ontario, canada': { latitude: 42.9849, longitude: -81.2453 }, // London, ON, Canada
      'london, ontario': { latitude: 42.9849, longitude: -81.2453 },
      
      // US States - using capital cities or major cities
      'texas, usa': { latitude: 30.2672, longitude: -97.7431 }, // Austin
      'texas, us': { latitude: 30.2672, longitude: -97.7431 },
      'california, usa': { latitude: 34.0522, longitude: -118.2437 }, // Los Angeles
      'california, us': { latitude: 34.0522, longitude: -118.2437 },
      'florida, usa': { latitude: 25.7617, longitude: -80.1918 }, // Miami
      'florida, us': { latitude: 25.7617, longitude: -80.1918 },
      'new york, usa': { latitude: 40.7128, longitude: -74.0060 }, // NYC
      'new york, us': { latitude: 40.7128, longitude: -74.0060 },
      'illinois, usa': { latitude: 41.8781, longitude: -87.6298 }, // Chicago
      'illinois, us': { latitude: 41.8781, longitude: -87.6298 },
      
      // Major cities
      'new york': { latitude: 40.7128, longitude: -74.0060 },
      'new york city': { latitude: 40.7128, longitude: -74.0060 },
      'nyc': { latitude: 40.7128, longitude: -74.0060 },
      'los angeles': { latitude: 34.0522, longitude: -118.2437 },
      'chicago': { latitude: 41.8781, longitude: -87.6298 },
      'houston': { latitude: 29.7604, longitude: -95.3698 },
      'phoenix': { latitude: 33.4484, longitude: -112.0740 },
      'philadelphia': { latitude: 39.9526, longitude: -75.1652 },
      'san antonio': { latitude: 29.4241, longitude: -98.4936 },
      'san diego': { latitude: 32.7157, longitude: -117.1611 },
      'dallas': { latitude: 32.7767, longitude: -96.7970 },
      'san jose': { latitude: 37.3382, longitude: -121.8863 },
      'austin': { latitude: 30.2672, longitude: -97.7431 },
      'miami': { latitude: 25.7617, longitude: -80.1918 },
      
      // International
      'paris': { latitude: 48.8566, longitude: 2.3522 },
      'tokyo': { latitude: 35.6762, longitude: 139.6503 },
      'sydney': { latitude: -33.8688, longitude: 151.2093 },
      'berlin': { latitude: 52.5200, longitude: 13.4050 },
      'toronto': { latitude: 43.6532, longitude: -79.3832 },
    };
    
    const key = location.toLowerCase().trim();
    const coordinates = fallbacks[key];
    
    if (coordinates) {
      console.log(`[BATCH] Found fallback coordinates for "${location}" (key: "${key}"):`, coordinates);
    } else {
      console.log(`[BATCH] No fallback coordinates available for "${location}" (key: "${key}")`);
      console.log(`[BATCH] Available fallback keys:`, Object.keys(fallbacks).slice(0, 10), '...');
    }
    
    return coordinates || null;
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
   * Save weather data to the database (PUBLIC METHOD)
   * @param weatherData The weather data to save
   * @returns The saved weather data with database ID
   */
  public static async saveWeatherData(weatherData: WeatherData): Promise<WeatherData> {
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