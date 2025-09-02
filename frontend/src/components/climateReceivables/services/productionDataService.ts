import { supabase } from '@/infrastructure/database/client';
import { 
  ProductionData, 
  InsertProductionData, 
  EnergyAsset, 
  WeatherData 
} from '../types';

/**
 * Enhanced service for handling production data CRUD operations with proper weather service integration
 */
export const productionDataService = {
  /**
   * Get all production data with optional filtering
   * @param assetId Optional asset ID to filter by
   * @param startDate Optional start date to filter by
   * @param endDate Optional end date to filter by
   */
  async getAll(
    assetId?: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<ProductionData[]> {
    let query = supabase
      .from('production_data')
      .select(`
        production_id,
        asset_id,
        production_date,
        output_mwh,
        weather_condition_id,
        created_at,
        updated_at,
        energy_assets!production_data_asset_id_fkey(
          asset_id,
          name,
          type,
          location,
          capacity
        ),
        weather_data!production_data_weather_condition_id_fkey(
          weather_id,
          location,
          date,
          sunlight_hours,
          wind_speed,
          temperature,
          created_at,
          updated_at
        )
      `);
    
    // Apply filters if provided
    if (assetId) {
      query = query.eq('asset_id', assetId);
    }
    
    if (startDate) {
      query = query.gte('production_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('production_date', endDate);
    }

    const { data, error } = await query.order('production_date', { ascending: false });

    if (error) {
      console.error('Error fetching production data:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return data.map(item => this.transformProductionDataResponse(item));
  },

  /**
   * Get a single production data record by ID with complete weather integration
   * @param id Production data ID
   */
  async getById(id: string): Promise<ProductionData | null> {
    const { data, error } = await supabase
      .from('production_data')
      .select(`
        production_id,
        asset_id,
        production_date,
        output_mwh,
        weather_condition_id,
        created_at,
        updated_at,
        energy_assets!production_data_asset_id_fkey(
          asset_id,
          name,
          type,
          location,
          capacity
        ),
        weather_data!production_data_weather_condition_id_fkey(
          weather_id,
          location,
          date,
          sunlight_hours,
          wind_speed,
          temperature,
          created_at,
          updated_at
        )
      `)
      .eq('production_id', id)
      .single();

    if (error) {
      console.error('Error fetching production data by ID:', error);
      throw error;
    }

    if (!data) return null;

    return this.transformProductionDataResponse(data);
  },

  /**
   * Create a new production data record with proper weather integration
   * @param productionData Production data to create
   */
  async create(productionData: InsertProductionData): Promise<ProductionData> {
    try {
      console.log('Creating production data with weather integration:', productionData);
      
      // Validate weather condition exists if weather_condition_id is provided
      if (productionData.weather_condition_id) {
        await this.validateWeatherCondition(productionData.weather_condition_id);
      }

      // Create the production data record
      const { data, error } = await supabase
        .from('production_data')
        .insert([productionData])
        .select()
        .single();

      if (error) {
        console.error('Error creating production data:', error);
        throw error;
      }

      console.log('Production data created successfully:', data.production_id);

      // Fetch the complete record with weather relationship
      const completeRecord = await this.getById(data.production_id);
      if (!completeRecord) {
        throw new Error('Failed to retrieve created production data');
      }

      console.log('Complete production data with weather integration:', completeRecord);
      return completeRecord;

    } catch (error) {
      console.error('Error in create method:', error);
      throw error;
    }
  },

  /**
   * Update an existing production data record with proper weather integration
   * @param id Production data ID
   * @param productionData Production data to update
   */
  async update(id: string, productionData: Partial<InsertProductionData>): Promise<ProductionData> {
    try {
      console.log('Updating production data with weather integration:', { id, productionData });

      // Validate weather condition exists if weather_condition_id is provided
      if (productionData.weather_condition_id) {
        await this.validateWeatherCondition(productionData.weather_condition_id);
      }

      // Update the production data record
      const { data, error } = await supabase
        .from('production_data')
        .update(productionData)
        .eq('production_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating production data:', error);
        throw error;
      }

      console.log('Production data updated successfully:', data.production_id);

      // Fetch the complete record with weather relationship
      const completeRecord = await this.getById(data.production_id);
      if (!completeRecord) {
        throw new Error('Failed to retrieve updated production data');
      }

      console.log('Complete updated production data with weather integration:', completeRecord);
      return completeRecord;

    } catch (error) {
      console.error('Error in update method:', error);
      throw error;
    }
  },

  /**
   * Delete a production data record with optional weather cleanup
   * @param id Production data ID
   * @param cleanupOrphanedWeather Whether to delete weather record if it's not used elsewhere
   */
  async delete(id: string, cleanupOrphanedWeather: boolean = false): Promise<void> {
    try {
      // Get the production data first to check for weather_condition_id
      const productionData = await this.getById(id);
      const weatherConditionId = productionData?.weatherConditionId;

      // Delete the production data record
      const { error } = await supabase
        .from('production_data')
        .delete()
        .eq('production_id', id);

      if (error) {
        console.error('Error deleting production data:', error);
        throw error;
      }

      // Optionally cleanup orphaned weather data
      if (cleanupOrphanedWeather && weatherConditionId) {
        await this.cleanupOrphanedWeatherData(weatherConditionId);
      }

      console.log('Production data deleted successfully:', id);

    } catch (error) {
      console.error('Error in delete method:', error);
      throw error;
    }
  },

  /**
   * Get production data summary by asset
   * Returns total production and average daily production by asset
   */
  async getProductionSummaryByAsset(): Promise<{ 
    assetId: string; 
    assetName: string; 
    totalProduction: number; 
    avgDailyProduction: number;
  }[]> {
    const { data, error } = await supabase
      .rpc('get_production_summary_by_asset');

    if (error) {
      console.error('Error fetching production summary:', error);
      throw error;
    }

    return data.map(item => ({
      assetId: item.asset_id,
      assetName: item.asset_name,
      totalProduction: item.total_production,
      avgDailyProduction: item.avg_daily_production
    }));
  },

  /**
   * Internal method to validate that a weather condition exists
   * @param weatherConditionId Weather condition ID to validate
   */
  async validateWeatherCondition(weatherConditionId: string): Promise<void> {
    console.log('Validating weather condition:', weatherConditionId);
    
    const { data, error } = await supabase
      .from('weather_data')
      .select('weather_id')
      .eq('weather_id', weatherConditionId)
      .single();

    if (error || !data) {
      console.error('Weather condition validation failed:', error);
      throw new Error(`Weather condition with ID ${weatherConditionId} does not exist`);
    }

    console.log('Weather condition validation successful:', weatherConditionId);
  },

  /**
   * Internal method to cleanup orphaned weather data
   * @param weatherConditionId Weather condition ID to potentially cleanup
   */
  async cleanupOrphanedWeatherData(weatherConditionId: string): Promise<void> {
    try {
      // Check if any other production data records reference this weather condition
      const { data, error } = await supabase
        .from('production_data')
        .select('production_id')
        .eq('weather_condition_id', weatherConditionId);

      if (error) {
        console.warn('Error checking for weather data references:', error);
        return;
      }

      // If no references found, delete the weather data
      if (!data || data.length === 0) {
        const { error: deleteError } = await supabase
          .from('weather_data')
          .delete()
          .eq('weather_id', weatherConditionId);

        if (deleteError) {
          console.warn('Error deleting orphaned weather data:', deleteError);
        } else {
          console.log('Orphaned weather data cleaned up:', weatherConditionId);
        }
      }
    } catch (error) {
      console.warn('Error in weather data cleanup:', error);
    }
  },

  /**
   * Internal method to transform database response to frontend ProductionData type
   * @param item Database response item
   */
  transformProductionDataResponse(item: any): ProductionData {
    return {
      productionId: item.production_id,
      assetId: item.asset_id,
      productionDate: item.production_date,
      outputMwh: item.output_mwh,
      weatherConditionId: item.weather_condition_id,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      asset: item.energy_assets ? {
        assetId: item.energy_assets.asset_id,
        name: item.energy_assets.name,
        type: item.energy_assets.type,
        location: item.energy_assets.location,
        capacity: item.energy_assets.capacity,
        ownerId: '', // This field isn't selected in the query
        createdAt: '', // These fields aren't selected in the query
        updatedAt: ''
      } as EnergyAsset : undefined,
      weatherData: item.weather_data ? {
        weatherId: item.weather_data.weather_id,
        location: item.weather_data.location,
        date: item.weather_data.date,
        sunlightHours: item.weather_data.sunlight_hours ? Number(item.weather_data.sunlight_hours) : undefined,
        windSpeed: item.weather_data.wind_speed ? Number(item.weather_data.wind_speed) : undefined,
        temperature: item.weather_data.temperature ? Number(item.weather_data.temperature) : undefined,
        createdAt: item.weather_data.created_at || '',
        updatedAt: item.weather_data.updated_at || ''
      } as WeatherData : undefined,
      // Add direct access to weather conditions for form integration
      weatherCondition: item.weather_data ? {
        sunlightHours: item.weather_data.sunlight_hours ? Number(item.weather_data.sunlight_hours) : undefined,
        windSpeed: item.weather_data.wind_speed ? Number(item.weather_data.wind_speed) : undefined,
        temperature: item.weather_data.temperature ? Number(item.weather_data.temperature) : undefined
      } : undefined
    };
  }
};