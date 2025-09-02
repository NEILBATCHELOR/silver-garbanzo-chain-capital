import { WeatherData } from '../../types';
import { supabase } from '@/infrastructure/database/client';

/**
 * Enhanced service for managing weather data with support for manual weather input
 * This service properly handles production data workflow integration
 */
export class WeatherDataServiceEnhanced {
  private static readonly API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
  private static readonly BASE_URL = 'https://api.openweathermap.org/data/2.5';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Create or update weather data with manual input (primary method for production data forms)
   * @param location The location to associate with weather data
   * @param date The date for the weather data
   * @param manualData Manual weather data inputs
   * @returns Weather data record
   */
  public static async createManualWeatherData(
    location: string, 
    date: string,
    manualData: {
      sunlightHours?: number;
      windSpeed?: number;
      temperature?: number;
    }
  ): Promise<WeatherData> {
    try {
      console.log('Creating manual weather data for:', { location, date, manualData });

      // Check if weather data already exists for this location and date
      const existingData = await this.getWeatherFromDatabase(location, date);
      
      // Prepare weather data for database
      const weatherDbData = {
        location: location.trim(),
        date: date,
        sunlight_hours: manualData.sunlightHours || null,
        wind_speed: manualData.windSpeed || null,
        temperature: manualData.temperature || null,
      };

      let result;

      if (existingData) {
        // Update existing record with new manual data
        console.log('Updating existing weather data:', existingData.weatherId);
        const { data, error } = await supabase
          .from('weather_data')
          .update(weatherDbData)
          .eq('weather_id', existingData.weatherId)
          .select('*')
          .single();

        if (error) {
          console.error('Error updating weather data:', error);
          throw error;
        }
        result = data;
      } else {
        // Create new weather record
        console.log('Creating new weather data record');
        const { data, error } = await supabase
          .from('weather_data')
          .insert(weatherDbData)
          .select('*')
          .single();

        if (error) {
          console.error('Error creating weather data:', error);
          throw error;
        }
        result = data;
      }

      // Convert to frontend format
      const weatherData: WeatherData = {
        weatherId: result.weather_id,
        location: result.location,
        date: result.date,
        sunlightHours: result.sunlight_hours,
        windSpeed: result.wind_speed,
        temperature: result.temperature,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      };

      console.log('Manual weather data created/updated successfully:', weatherData.weatherId);
      return weatherData;

    } catch (error) {
      console.error('Error in createManualWeatherData:', error);
      throw new Error(`Failed to create manual weather data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get weather data with API fallback (enhanced version)
   * @param location The location to get weather data for
   * @param date The date to get weather data for
   * @returns Weather data
   */
  public static async getWeatherData(
    location: string, 
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<WeatherData> {
    try {
      console.log('Getting weather data for:', { location, date });

      // First, try to get data from the database
      const dbData = await this.getWeatherFromDatabase(location, date);
      
      if (dbData) {
        console.log('Found weather data in database:', dbData.weatherId);
        return dbData;
      }

      // If no database data and it's today, try to fetch from API (if API key is available)
      if (date === new Date().toISOString().split('T')[0] && this.API_KEY) {
        console.log('Attempting to fetch current weather from API');
        try {
          const apiData = await this.fetchWeatherFromAPI(location, date);
          return apiData;
        } catch (apiError) {
          console.warn('API fetch failed, using climatological estimate:', apiError);
        }
      }

      // Fall back to creating a placeholder record for manual entry
      console.log('Creating placeholder weather record for manual entry');
      return await this.createPlaceholderWeatherData(location, date);

    } catch (error) {
      console.error(`Error getting weather data for ${location} on ${date}:`, error);
      throw error;
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
        .eq('location', location.trim())
        .eq('date', date)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // "no rows returned" error
          return null;
        }
        console.error('Database error:', error);
        return null; // Don't throw, return null to try other methods
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
   * Create a placeholder weather data record for manual entry
   * @param location The location
   * @param date The date
   * @returns Placeholder weather data
   */
  private static async createPlaceholderWeatherData(
    location: string,
    date: string
  ): Promise<WeatherData> {
    const weatherDbData = {
      location: location.trim(),
      date: date,
      sunlight_hours: null,
      wind_speed: null,
      temperature: null,
    };

    const { data, error } = await supabase
      .from('weather_data')
      .insert(weatherDbData)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating placeholder weather data:', error);
      throw error;
    }

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
  }

  /**
   * Fetch weather data from OpenWeather API
   * @param location The location to get weather data for
   * @param date The date for the weather data
   * @returns Weather data
   */
  private static async fetchWeatherFromAPI(location: string, date: string): Promise<WeatherData> {
    try {
      const url = `${this.BASE_URL}/weather?q=${encodeURIComponent(location)}&units=metric&appid=${this.API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Convert API response to our WeatherData format
      const weatherData = {
        location: location.trim(),
        date: date,
        sunlight_hours: this.calculateSunlightHours(data.sys.sunrise, data.sys.sunset),
        wind_speed: data.wind.speed,
        temperature: data.main.temp,
      };

      // Save to database
      const { data: savedData, error } = await supabase
        .from('weather_data')
        .insert(weatherData)
        .select('*')
        .single();

      if (error) {
        console.error('Error saving API weather data:', error);
        throw error;
      }

      return {
        weatherId: savedData.weather_id,
        location: savedData.location,
        date: savedData.date,
        sunlightHours: savedData.sunlight_hours,
        windSpeed: savedData.wind_speed,
        temperature: savedData.temperature,
        createdAt: savedData.created_at,
        updatedAt: savedData.updated_at
      };
    } catch (error) {
      console.error(`Error fetching weather data from API for ${location}:`, error);
      throw error;
    }
  }

  /**
   * Calculate sunlight hours from sunrise and sunset timestamps
   * @param sunrise Sunrise timestamp in seconds
   * @param sunset Sunset timestamp in seconds
   * @returns Sunlight hours
   */
  private static calculateSunlightHours(sunrise: number, sunset: number): number {
    const sunriseDate = new Date(sunrise * 1000);
    const sunsetDate = new Date(sunset * 1000);
    const diffMs = sunsetDate.getTime() - sunriseDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return parseFloat(diffHours.toFixed(2));
  }

  /**
   * Delete weather data record
   * @param weatherId The weather ID to delete
   */
  public static async deleteWeatherData(weatherId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('weather_data')
        .delete()
        .eq('weather_id', weatherId);

      if (error) {
        console.error('Error deleting weather data:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteWeatherData:', error);
      throw error;
    }
  }

  /**
   * Get all weather data for a location
   * @param location The location to get weather data for
   * @returns Array of weather data
   */
  public static async getWeatherDataByLocation(location: string): Promise<WeatherData[]> {
    try {
      const { data, error } = await supabase
        .from('weather_data')
        .select('*')
        .eq('location', location.trim())
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching weather data by location:', error);
        throw error;
      }

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
      console.error('Error in getWeatherDataByLocation:', error);
      throw error;
    }
  }
}
