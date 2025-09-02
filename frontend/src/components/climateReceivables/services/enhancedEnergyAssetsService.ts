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

// Global tracking for duplicate prevention across all instances
const globalProcessedAssets = new Set<string>();
const processingLocks = new Map<string, Promise<any>>();

/**
 * Enhanced service for handling energy assets CRUD operations with duplicate prevention
 */
export const enhancedEnergyAssetsService = {
  /**
   * Generate a unique key for an asset to check for duplicates
   */
  generateAssetKey(asset: InsertEnergyAsset): string {
    return `${asset.name.trim().toLowerCase()}|${asset.type}|${asset.location.trim().toLowerCase()}|${asset.capacity}`;
  },

  /**
   * Check if an asset already exists in the database
   */
  async checkAssetExists(asset: InsertEnergyAsset): Promise<EnergyAsset | null> {
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
      .eq('name', asset.name)
      .eq('type', asset.type)
      .eq('location', asset.location)
      .eq('capacity', asset.capacity)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking asset existence:', error);
      return null;
    }

    return data ? dbToUiEnergyAsset(data) : null;
  },

  /**
   * Create a single energy asset with duplicate prevention
   */
  async createSafe(asset: InsertEnergyAsset): Promise<EnergyAsset> {
    const assetKey = this.generateAssetKey(asset);
    
    // Check global tracking first
    if (globalProcessedAssets.has(assetKey)) {
      throw new Error(`Asset "${asset.name}" already processed in current session`);
    }

    // Check if there's already a processing lock for this asset
    if (processingLocks.has(assetKey)) {
      const existingResult = await processingLocks.get(assetKey);
      return existingResult;
    }

    // Create processing lock
    const processingPromise = this.performSafeCreate(asset, assetKey);
    processingLocks.set(assetKey, processingPromise);

    try {
      const result = await processingPromise;
      globalProcessedAssets.add(assetKey);
      return result;
    } finally {
      processingLocks.delete(assetKey);
    }
  },

  /**
   * Perform the actual safe creation with database checks
   */
  async performSafeCreate(asset: InsertEnergyAsset, assetKey: string): Promise<EnergyAsset> {
    // First check if asset already exists
    const existingAsset = await this.checkAssetExists(asset);
    if (existingAsset) {
      console.log(`Asset "${asset.name}" already exists, returning existing asset`);
      return existingAsset;
    }

    // Attempt to create new asset with conflict resolution
    try {
      const { data, error } = await supabase
        .from('energy_assets')
        .insert([asset])
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505' || error.message?.includes('duplicate key value')) {
          console.log(`Duplicate detected during insert for "${asset.name}", fetching existing asset`);
          const existingAsset = await this.checkAssetExists(asset);
          if (existingAsset) {
            return existingAsset;
          }
        }
        throw error;
      }

      return dbToUiEnergyAsset(data);
    } catch (error) {
      console.error('Error in performSafeCreate:', error);
      throw error;
    }
  },

  /**
   * Create multiple energy assets from bulk upload with enhanced duplicate prevention
   */
  async createBulkSafe(assets: InsertEnergyAsset[]): Promise<{
    created: EnergyAsset[];
    duplicates: EnergyAsset[];
    errors: Array<{ asset: InsertEnergyAsset; error: string }>;
  }> {
    const result = {
      created: [] as EnergyAsset[],
      duplicates: [] as EnergyAsset[],
      errors: [] as Array<{ asset: InsertEnergyAsset; error: string }>
    };

    // Filter out duplicates within the batch first
    const uniqueAssets = new Map<string, InsertEnergyAsset>();
    const batchDuplicates: InsertEnergyAsset[] = [];

    for (const asset of assets) {
      const assetKey = this.generateAssetKey(asset);
      
      if (uniqueAssets.has(assetKey)) {
        batchDuplicates.push(asset);
        console.log(`Duplicate within batch detected: "${asset.name}"`);
      } else {
        uniqueAssets.set(assetKey, asset);
      }
    }

    // Process unique assets one by one to avoid race conditions
    for (const asset of uniqueAssets.values()) {
      try {
        const existingAsset = await this.checkAssetExists(asset);
        
        if (existingAsset) {
          result.duplicates.push(existingAsset);
          console.log(`Asset "${asset.name}" already exists in database`);
        } else {
          const createdAsset = await this.createSafe(asset);
          result.created.push(createdAsset);
        }
      } catch (error) {
        console.error(`Error processing asset "${asset.name}":`, error);
        result.errors.push({
          asset,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Handle batch duplicates
    for (const duplicate of batchDuplicates) {
      try {
        const existingAsset = await this.checkAssetExists(duplicate);
        if (existingAsset) {
          result.duplicates.push(existingAsset);
        }
      } catch (error) {
        result.errors.push({
          asset: duplicate,
          error: `Batch duplicate: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    return result;
  },

  /**
   * Clear global tracking (call this after successful batch operations)
   */
  clearGlobalTracking(): void {
    globalProcessedAssets.clear();
    processingLocks.clear();
  },

  // All original methods from energyAssetsService
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

    return data.map(dbToUiEnergyAsset);
  },

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

    return dbToUiEnergyAsset(data);
  },

  // Use safe create method instead of direct create
  async create(asset: InsertEnergyAsset): Promise<EnergyAsset> {
    return this.createSafe(asset);
  },

  // Use safe bulk create method
  async createBulk(assets: InsertEnergyAsset[]): Promise<EnergyAsset[]> {
    const result = await this.createBulkSafe(assets);
    
    // Log summary
    console.log(`Bulk upload summary:`, {
      created: result.created.length,
      duplicates: result.duplicates.length,
      errors: result.errors.length
    });

    // Return all successfully processed assets (created + existing duplicates)
    return [...result.created, ...result.duplicates];
  },

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

    return dbToUiEnergyAsset(data);
  },

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

  validateCsvData(data: EnergyAssetCsvRow[]): EnergyAssetValidationError[] {
    const errors: EnergyAssetValidationError[] = [];

    data.forEach((row, index) => {
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

      if (row.type && !Object.values(EnergyAssetType).includes(row.type.toLowerCase() as EnergyAssetType)) {
        const validTypes = Object.values(EnergyAssetType).join(', ');
        errors.push({
          rowIndex: index,
          fieldName: 'type',
          errorMessage: `Invalid asset type: ${row.type}. Valid types are: ${validTypes}`,
        });
      }

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

      if (row.name && row.name.length > 255) {
        errors.push({
          rowIndex: index,
          fieldName: 'name',
          errorMessage: `Name is too long (max 255 characters): ${row.name.substring(0, 50)}...`,
        });
      }

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

  processCsvData(data: EnergyAssetCsvRow[]): InsertEnergyAsset[] {
    return data.map(row => ({
      name: row.name.trim(),
      type: row.type.toLowerCase() as EnergyAssetType,
      location: row.location.trim(),
      capacity: Number(row.capacity),
      owner_id: row.owner_id?.trim() || undefined
    }));
  },

  // Remaining methods (getProductionData, getReceivables, getAssetsSummary) stay the same
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

    return data.map(dbToUiClimateReceivable);
  },

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
