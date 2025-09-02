import { supabase } from '@/infrastructure/database/client';
import { 
  EnergyAsset, 
  InsertEnergyAsset,
  ProductionData,
  ClimateReceivable,
  dbToUiEnergyAsset,
  dbToUiClimateReceivable,
  dbToUiProductionData,
  EnergyAssetType
} from '../types';

export interface EnergyAssetCsvRow {
  name: string;
  type: string;
  location: string;
  capacity: string;
  owner_id?: string;
}

export interface EnergyAssetValidationError {
  rowIndex: number;
  fieldName: string;
  errorMessage: string;
}

/**
 * Service for handling energy assets CRUD operations
 */
export const energyAssetsService = {
  /**
   * Get all energy assets with optional filtering
   * @param type Optional asset type to filter by
   * @param location Optional location to filter by
   */
  async getAll(type?: string, location?: string): Promise<EnergyAsset[]> {
    let query = supabase
      .from('energy_assets')
      .select(`
        asset_id,
        name,
        type,
        location,
        capacity,
        owner_id,
        created_at,
        updated_at
      `);
    
    // Apply filters if provided
    if (type) {
      query = query.eq('type', type);
    }
    
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching energy assets:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return data.map(dbToUiEnergyAsset);
  },

  /**
   * Get a single energy asset by ID
   * @param id Energy asset ID
   */
  async getById(id: string): Promise<EnergyAsset | null> {
    const { data, error } = await supabase
      .from('energy_assets')
      .select(`
        asset_id,
        name,
        type,
        location,
        capacity,
        owner_id,
        created_at,
        updated_at
      `)
      .eq('asset_id', id)
      .single();

    if (error) {
      console.error('Error fetching energy asset by ID:', error);
      throw error;
    }

    if (!data) return null;

    // Transform the data to match our frontend types
    return dbToUiEnergyAsset(data);
  },

  /**
   * Create a new energy asset
   * @param asset Energy asset to create
   */
  async create(asset: InsertEnergyAsset): Promise<EnergyAsset> {
    const { data, error } = await supabase
      .from('energy_assets')
      .insert([asset])
      .select()
      .single();

    if (error) {
      console.error('Error creating energy asset:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return dbToUiEnergyAsset(data);
  },

  /**
   * Create multiple energy assets from bulk upload
   * @param assets Array of energy assets to create
   */
  async createBulk(assets: InsertEnergyAsset[]): Promise<EnergyAsset[]> {
    const { data, error } = await supabase
      .from('energy_assets')
      .insert(assets)
      .select();

    if (error) {
      console.error('Error creating bulk energy assets:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return data.map(dbToUiEnergyAsset);
  },

  /**
   * Update an existing energy asset
   * @param id Energy asset ID
   * @param asset Energy asset data to update
   */
  async update(id: string, asset: Partial<InsertEnergyAsset>): Promise<EnergyAsset> {
    const updateData = {
      ...asset,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('energy_assets')
      .update(updateData)
      .eq('asset_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating energy asset:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return dbToUiEnergyAsset(data);
  },

  /**
   * Delete an energy asset
   * @param id Energy asset ID
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('energy_assets')
      .delete()
      .eq('asset_id', id);

    if (error) {
      console.error('Error deleting energy asset:', error);
      throw error;
    }
  },

  /**
   * Delete multiple energy assets
   * @param ids Array of energy asset IDs to delete
   */
  async deleteBulk(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('energy_assets')
      .delete()
      .in('asset_id', ids);

    if (error) {
      console.error('Error deleting bulk energy assets:', error);
      throw error;
    }
  },

  /**
   * Validate CSV data for energy assets
   * @param data Array of CSV row data
   */
  validateCsvData(data: EnergyAssetCsvRow[]): EnergyAssetValidationError[] {
    const errors: EnergyAssetValidationError[] = [];

    data.forEach((row, index) => {
      // Required fields validation
      const requiredFields: (keyof EnergyAssetCsvRow)[] = [
        'name', 'type', 'location', 'capacity'
      ];

      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push({
            rowIndex: index,
            fieldName: field,
            errorMessage: `Missing required field: ${field}`,
          });
        }
      });

      // Type validation
      if (row.type && !Object.values(EnergyAssetType).includes(row.type.toLowerCase() as EnergyAssetType)) {
        const validTypes = Object.values(EnergyAssetType).join(', ');
        errors.push({
          rowIndex: index,
          fieldName: 'type',
          errorMessage: `Invalid asset type: ${row.type}. Valid types are: ${validTypes}`,
        });
      }

      // Capacity validation (must be a positive number)
      if (row.capacity) {
        const capacity = Number(row.capacity);
        if (isNaN(capacity) || capacity <= 0) {
          errors.push({
            rowIndex: index,
            fieldName: 'capacity',
            errorMessage: `Capacity must be a positive number: ${row.capacity}`,
          });
        }
      }

      // Name length validation
      if (row.name && row.name.length > 255) {
        errors.push({
          rowIndex: index,
          fieldName: 'name',
          errorMessage: `Name is too long (max 255 characters): ${row.name.substring(0, 50)}...`,
        });
      }

      // Location length validation
      if (row.location && row.location.length > 255) {
        errors.push({
          rowIndex: index,
          fieldName: 'location',
          errorMessage: `Location is too long (max 255 characters): ${row.location.substring(0, 50)}...`,
        });
      }
    });

    return errors;
  },

  /**
   * Process CSV data and convert to InsertEnergyAsset format
   * @param data Array of CSV row data
   */
  processCsvData(data: EnergyAssetCsvRow[]): InsertEnergyAsset[] {
    return data.map(row => ({
      name: row.name.trim(),
      type: row.type.toLowerCase() as EnergyAssetType,
      location: row.location.trim(),
      capacity: Number(row.capacity),
      owner_id: row.owner_id?.trim() || undefined
    }));
  },

  /**
   * Get production data for an energy asset
   * @param assetId Energy asset ID
   * @param startDate Optional start date to filter by
   * @param endDate Optional end date to filter by
   */
  async getProductionData(
    assetId: string, 
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
        weather_data!production_data_weather_condition_id_fkey(
          weather_id,
          location,
          date,
          sunlight_hours,
          wind_speed,
          temperature
        )
      `)
      .eq('asset_id', assetId);
    
    if (startDate) {
      query = query.gte('production_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('production_date', endDate);
    }

    const { data, error } = await query.order('production_date', { ascending: false });

    if (error) {
      console.error('Error fetching production data for asset:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return data.map(item => ({
      ...dbToUiProductionData(item),
      weatherCondition: item.weather_data ? {
        weatherId: item.weather_data.weather_id,
        location: item.weather_data.location,
        date: item.weather_data.date,
        sunlightHours: item.weather_data.sunlight_hours,
        windSpeed: item.weather_data.wind_speed,
        temperature: item.weather_data.temperature,
        createdAt: '',
        updatedAt: ''
      } : undefined
    }));
  },

  /**
   * Get receivables for an energy asset
   * @param assetId Energy asset ID
   */
  async getReceivables(assetId: string): Promise<ClimateReceivable[]> {
    const { data, error } = await supabase
      .from('climate_receivables')
      .select(`
        receivable_id,
        asset_id,
        payer_id,
        amount,
        due_date,
        risk_score,
        discount_rate,
        created_at,
        updated_at
      `)
      .eq('asset_id', assetId)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching receivables for asset:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return data.map(dbToUiClimateReceivable);
  },

  /**
   * Get summary statistics for energy assets
   */
  async getAssetsSummary(): Promise<{
    totalCount: number;
    totalCapacity: number;
    countByType: Record<string, number>;
    averageCapacity: number;
  }> {
    const { data, error } = await supabase
      .from('energy_assets')
      .select('type, capacity');

    if (error) {
      console.error('Error fetching assets summary:', error);
      throw error;
    }

    // Calculate summary statistics
    const totalCount = data.length;
    const totalCapacity = data.reduce((sum, item) => sum + item.capacity, 0);
    const averageCapacity = totalCount > 0 ? totalCapacity / totalCount : 0;
    
    const countByType = data.reduce((counts, item) => {
      counts[item.type] = (counts[item.type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return { totalCount, totalCapacity, countByType, averageCapacity };
  }
};
