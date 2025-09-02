import { WeatherData } from '../../types';
import { supabase } from '@/infrastructure/database/client';

/**
 * Service for managing weather data, primarily using the database
 * and falling back to OpenWeather API when necessary
 */
export class WeatherDataService {
  private static readonly API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
  private static readonly BASE_URL = 'https://api.openweathermap.org/data/2.5';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Get weather data for a location and date, prioritizing database records
   * @param location The location to get weather data for
   * @param date The date to get weather data for (defaults to today)
   * @returns Weather data
   */
  public static async getWeatherData(
    location: string, 
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<WeatherData> {
    try {
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
            return dbData;
          }
          // Otherwise, refresh from API for today's data
        } else {
          // For historical dates, always use the database
          return dbData;
        }
      }
      
      // If we don't have data in the database or it's stale, try to fetch from API
      // For today's date
      if (date === new Date().toISOString().split('T')[0]) {
        const apiData = await this.fetchWeatherFromAPI(location);
        return apiData;
      } 
      // For historical dates, use historical approximation
      else {
        const historicalData = await this.getClimatologicalAverage(location, date);
        return historicalData;
      }
    } catch (error) {
      console.error(`Error getting weather data for ${location} on ${date}:`, error);
      throw error;
    }
  }

  /**
   * Get forecast weather data for future dates
   * @param location The location to get weather data for
   * @param days Number of days to forecast (max 7)
   * @returns Array of weather data for each day
   */
  public static async getForecastWeather(
    location: string, 
    days: number = 5
  ): Promise<WeatherData[]> {
    try {
      // Limit days to maximum of 7 (API limitation)
      const forecastDays = Math.min(days, 7);
      
      // Get the date range for the forecast
      const startDate = new Date();
      const forecastDates: string[] = [];
      
      for (let i = 0; i < forecastDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        forecastDates.push(date.toISOString().split('T')[0]);
      }
      
      // Check if we already have forecast data in the database
      const existingForecasts: WeatherData[] = [];
      const datesNeeded: string[] = [];
      
      for (const date of forecastDates) {
        const dbData = await this.getWeatherFromDatabase(location, date);
        if (dbData) {
          existingForecasts.push(dbData);
        } else {
          datesNeeded.push(date);
        }
      }
      
      // If we have all the data we need, return it
      if (datesNeeded.length === 0) {
        return existingForecasts.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      }
      
      // Otherwise, fetch missing data from API
      const apiForecasts = await this.fetchForecastFromAPI(location, forecastDays);
      
      // Filter to only include dates we need
      const filteredApiForecasts = apiForecasts.filter(forecast => 
        datesNeeded.includes(forecast.date)
      );
      
      // Combine existing and new forecasts
      const allForecasts = [...existingForecasts, ...filteredApiForecasts];
      
      // Sort by date
      return allForecasts.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } catch (error) {
      console.error(`Error getting forecast weather data for ${location}:`, error);
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
   * Fetch current weather data from OpenWeather API
   * @param location The location to get weather data for
   * @returns Weather data
   */
  private static async fetchWeatherFromAPI(location: string): Promise<WeatherData> {
    try {
      const url = `${this.BASE_URL}/weather?q=${encodeURIComponent(location)}&units=metric&appid=${this.API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Convert API response to our WeatherData format
      const weatherData: WeatherData = {
        weatherId: '', // Will be assigned when saved to database
        location: location,
        date: new Date().toISOString().split('T')[0],
        sunlightHours: this.calculateSunlightHours(data.sys.sunrise, data.sys.sunset),
        windSpeed: data.wind.speed,
        temperature: data.main.temp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to database
      const savedData = await this.saveWeatherData(weatherData);
      return savedData;
    } catch (error) {
      console.error(`Error fetching weather data from API for ${location}:`, error);
      throw error;
    }
  }

  /**
   * Fetch forecast weather data from OpenWeather API
   * @param location The location to get weather data for
   * @param days Number of days to forecast
   * @returns Array of weather data for each day
   */
  private static async fetchForecastFromAPI(
    location: string, 
    days: number
  ): Promise<WeatherData[]> {
    try {
      // Fetch from API
      const url = `${this.BASE_URL}/forecast?q=${encodeURIComponent(location)}&units=metric&cnt=${days * 8}&appid=${this.API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Process forecast data (OpenWeather returns data in 3-hour increments)
      const forecasts: WeatherData[] = [];
      const dailyData: Record<string, { temps: number[], winds: number[], sunriseTime?: number, sunsetTime?: number }> = {};
      
      // Group data by day
      data.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000).toISOString().split('T')[0];
        
        if (!dailyData[date]) {
          dailyData[date] = { temps: [], winds: [] };
        }
        
        dailyData[date].temps.push(item.main.temp);
        dailyData[date].winds.push(item.wind.speed);
      });
      
      // Get sunrise/sunset data from the first day (used for approximation)
      if (data.city && data.city.sunrise && data.city.sunset) {
        const firstDay = Object.keys(dailyData)[0];
        dailyData[firstDay].sunriseTime = data.city.sunrise;
        dailyData[firstDay].sunsetTime = data.city.sunset;
      }
      
      // Convert to our WeatherData format
      for (const [date, dayData] of Object.entries(dailyData)) {
        const avgTemp = dayData.temps.reduce((sum, temp) => sum + temp, 0) / dayData.temps.length;
        const avgWind = dayData.winds.reduce((sum, wind) => sum + wind, 0) / dayData.winds.length;
        
        let sunlightHours = 12; // Default fallback
        if (dayData.sunriseTime && dayData.sunsetTime) {
          sunlightHours = this.calculateSunlightHours(dayData.sunriseTime, dayData.sunsetTime);
        }
        
        const weatherData: WeatherData = {
          weatherId: '', // Will be assigned when saved to database
          location: location,
          date: date,
          sunlightHours: sunlightHours,
          windSpeed: avgWind,
          temperature: avgTemp,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Save to database
        const savedData = await this.saveWeatherData(weatherData);
        forecasts.push(savedData);
      }
      
      return forecasts;
    } catch (error) {
      console.error(`Error fetching forecast from API for ${location}:`, error);
      throw error;
    }
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
   * Get climatological average for a location and date (for historical data)
   * @param location The location to get climate data for
   * @param date The date to get climate data for
   * @returns Estimated weather data based on climatological averages
   */
  private static async getClimatologicalAverage(location: string, date: string): Promise<WeatherData> {
    try {
      // In a real implementation, this would query a climate database
      // For this example, we'll use a simple approximation based on the month
      const month = new Date(date).getMonth(); // 0-11
      
      // Seasonal approximations (very simplified)
      let tempEstimate = 20; // Default moderate temperature
      let sunlightEstimate = 12; // Default equinox hours
      let windSpeedEstimate = 5; // Default moderate wind
      
      // Northern hemisphere seasonal adjustments (reversed for southern hemisphere)
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
      
      // Save to database
      const savedData = await this.saveWeatherData(weatherData);
      return savedData;
    } catch (error) {
      console.error('Error generating climatological average:', error);
      throw error;
    }
  }
}