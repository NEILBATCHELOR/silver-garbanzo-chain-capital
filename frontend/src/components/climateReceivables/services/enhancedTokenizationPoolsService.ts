import { supabase } from '@/infrastructure/database/client';
import { 
  ClimateTokenizationPool, 
  InsertClimateTokenizationPool, 
  ClimateReceivable,
  ClimateInvestorPool,
  RiskLevel
} from '../types';

/**
 * Enhanced Tokenization Pools Service with Missing Table Detection
 * 
 * This service has been updated to handle missing junction tables gracefully
 * until database migration is applied. See: /scripts/fix-tokenization-pools-missing-tables.sql
 * 
 * CRITICAL FIX: August 26, 2025 - Addresses console errors:
 * - relation "climate_pool_energy_assets" does not exist
 * - relation "climate_pool_recs" does not exist  
 * - relation "climate_pool_incentives" does not exist
 */
export const enhancedTokenizationPoolsService = {
  /**
   * Check if specific table exists in the database
   * @param tableName Name of the table to check
   */
  async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      // If no error or error is not "relation does not exist", table exists
      return !error || error.code !== '42P01';
    } catch {
      // If query fails entirely, assume table doesn't exist
      return false;
    }
  },

  /**
   * Check if project_id column exists in climate_tokenization_pools table
   * This is a temporary method until the database migration is applied
   */
  async hasProjectIdColumn(): Promise<boolean> {
    try {
      // Try to query the column to see if it exists
      const { error } = await supabase
        .from('climate_tokenization_pools')
        .select('project_id')
        .limit(1);

      // If no error, column exists
      return !error || error.code !== '42703';
    } catch {
      // If query fails, assume column doesn't exist
      return false;
    }
  },

  /**
   * Get all tokenization pools with optional filtering
   * @param riskProfile Optional risk profile to filter by
   * @param projectId Optional project ID to filter by
   */
  async getAll(
    riskProfile?: RiskLevel,
    projectId?: string
  ): Promise<ClimateTokenizationPool[]> {
    // Check if project_id column exists
    const hasProjectId = await this.hasProjectIdColumn();
    
    // Build select query conditionally based on column existence
    const selectFields = hasProjectId 
      ? `pool_id, name, total_value, risk_profile, project_id, created_at, updated_at`
      : `pool_id, name, total_value, risk_profile, created_at, updated_at`;

    let query = supabase
      .from('climate_tokenization_pools')
      .select(selectFields);
    
    // Apply filters if provided
    if (riskProfile) {
      query = query.eq('risk_profile', riskProfile);
    }
    
    // Only apply project filter if column exists and projectId is provided
    if (projectId && hasProjectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tokenization pools:', error);
      // If it's a column not found error, log helpful message
      if (error.code === '42703') {
        console.warn('⚠️ Missing project_id column. Please run database migration: /scripts/fix-tokenization-pools-missing-tables.sql');
      }
      throw error;
    }

    // Transform the data to match our frontend types
    return data.map(item => ({
      poolId: item.pool_id,
      name: item.name,
      totalValue: item.total_value,
      riskProfile: item.risk_profile as RiskLevel,
      projectId: hasProjectId ? item.project_id : null, // Handle missing column gracefully
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  },

  /**
   * Get a single tokenization pool by ID
   * @param id Pool ID
   */
  async getById(id: string): Promise<ClimateTokenizationPool | null> {
    // Check if project_id column exists
    const hasProjectId = await this.hasProjectIdColumn();
    
    // Build select query conditionally based on column existence
    const selectFields = hasProjectId 
      ? `pool_id, name, total_value, risk_profile, project_id, created_at, updated_at`
      : `pool_id, name, total_value, risk_profile, created_at, updated_at`;

    const { data, error } = await supabase
      .from('climate_tokenization_pools')
      .select(selectFields)
      .eq('pool_id', id)
      .single();

    if (error) {
      console.error('Error fetching tokenization pool by ID:', error);
      if (error.code === '42703') {
        console.warn('⚠️ Missing project_id column. Please run database migration: /scripts/fix-tokenization-pools-missing-tables.sql');
      }
      throw error;
    }

    if (!data) return null;

    // Transform the data to match our frontend types
    return {
      poolId: data.pool_id,
      name: data.name,
      totalValue: data.total_value,
      riskProfile: data.risk_profile as RiskLevel,
      projectId: hasProjectId ? data.project_id : null, // Handle missing column gracefully
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  /**
   * Create a new tokenization pool
   * @param pool Pool data to create
   */
  async create(pool: InsertClimateTokenizationPool): Promise<ClimateTokenizationPool> {
    // Check if project_id column exists
    const hasProjectId = await this.hasProjectIdColumn();
    
    // Remove project_id from pool data if column doesn't exist
    const poolData = hasProjectId ? pool : { ...pool };
    if (!hasProjectId && 'project_id' in poolData) {
      delete poolData.project_id;
      console.warn('⚠️ project_id field ignored - database column missing. Please run migration: /scripts/fix-tokenization-pools-missing-tables.sql');
    }

    const { data, error } = await supabase
      .from('climate_tokenization_pools')
      .insert([poolData])
      .select()
      .single();

    if (error) {
      console.error('Error creating tokenization pool:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return {
      poolId: data.pool_id,
      name: data.name,
      totalValue: data.total_value,
      riskProfile: data.risk_profile as RiskLevel,
      projectId: hasProjectId ? data.project_id : null, // Handle missing column gracefully
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  /**
   * Update an existing tokenization pool
   * @param id Pool ID
   * @param pool Pool data to update
   */
  async update(id: string, pool: Partial<InsertClimateTokenizationPool>): Promise<ClimateTokenizationPool> {
    // Check if project_id column exists
    const hasProjectId = await this.hasProjectIdColumn();
    
    // Remove project_id from pool data if column doesn't exist
    const poolData = hasProjectId ? pool : { ...pool };
    if (!hasProjectId && 'project_id' in poolData) {
      delete poolData.project_id;
      console.warn('⚠️ project_id field ignored - database column missing. Please run migration: /scripts/fix-tokenization-pools-missing-tables.sql');
    }

    const { data, error } = await supabase
      .from('climate_tokenization_pools')
      .update(poolData)
      .eq('pool_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tokenization pool:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return {
      poolId: data.pool_id,
      name: data.name,
      totalValue: data.total_value,
      riskProfile: data.risk_profile as RiskLevel,
      projectId: hasProjectId ? data.project_id : null, // Handle missing column gracefully
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  /**
   * Delete a tokenization pool
   * @param id Pool ID
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('climate_tokenization_pools')
      .delete()
      .eq('pool_id', id);

    if (error) {
      console.error('Error deleting tokenization pool:', error);
      throw error;
    }
  },

  /**
   * Get receivables in a pool
   * @param poolId Pool ID
   */
  async getPoolReceivables(poolId: string): Promise<ClimateReceivable[]> {
    const { data, error } = await supabase
      .from('climate_pool_receivables')
      .select(`
        pool_id,
        receivable_id,
        climate_receivables!climate_pool_receivables_receivable_id_fkey(
          receivable_id,
          asset_id,
          payer_id,
          amount,
          due_date,
          risk_score,
          discount_rate,
          created_at,
          updated_at
        )
      `)
      .eq('pool_id', poolId);

    if (error) {
      console.error('Error fetching pool receivables:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return data.map(item => ({
      receivableId: item.climate_receivables.receivable_id,
      assetId: item.climate_receivables.asset_id,
      payerId: item.climate_receivables.payer_id,
      amount: item.climate_receivables.amount,
      dueDate: item.climate_receivables.due_date,
      riskScore: item.climate_receivables.risk_score,
      discountRate: item.climate_receivables.discount_rate,
      createdAt: item.climate_receivables.created_at,
      updatedAt: item.climate_receivables.updated_at
    }));
  },

  /**
   * Get investors in a pool
   * @param poolId Pool ID
   */
  async getPoolInvestors(poolId: string): Promise<ClimateInvestorPool[]> {
    const { data, error } = await supabase
      .from('climate_investor_pools')
      .select(`
        investor_id,
        pool_id,
        investment_amount,
        created_at,
        updated_at
      `)
      .eq('pool_id', poolId);

    if (error) {
      console.error('Error fetching pool investors:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return data.map(item => ({
      investorId: item.investor_id,
      poolId: item.pool_id,
      investmentAmount: item.investment_amount,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  },

  /**
   * Add a receivable to a pool
   * @param poolId Pool ID
   * @param receivableId Receivable ID
   */
  async addReceivableToPool(poolId: string, receivableId: string): Promise<void> {
    const { error } = await supabase
      .from('climate_pool_receivables')
      .insert([{ pool_id: poolId, receivable_id: receivableId }]);

    if (error) {
      console.error('Error adding receivable to pool:', error);
      throw error;
    }

    // Update the pool's total value
    await this.updatePoolTotalValue(poolId);
  },

  /**
   * Remove a receivable from a pool
   * @param poolId Pool ID
   * @param receivableId Receivable ID
   */
  async removeReceivableFromPool(poolId: string, receivableId: string): Promise<void> {
    const { error } = await supabase
      .from('climate_pool_receivables')
      .delete()
      .eq('pool_id', poolId)
      .eq('receivable_id', receivableId);

    if (error) {
      console.error('Error removing receivable from pool:', error);
      throw error;
    }

    // Update the pool's total value
    await this.updatePoolTotalValue(poolId);
  },

  /**
   * Add an investor to a pool
   * @param poolId Pool ID
   * @param investorId Investor ID
   * @param investmentAmount Investment amount
   */
  async addInvestorToPool(poolId: string, investorId: string, investmentAmount: number): Promise<void> {
    const { error } = await supabase
      .from('climate_investor_pools')
      .insert([{ 
        pool_id: poolId, 
        investor_id: investorId,
        investment_amount: investmentAmount 
      }]);

    if (error) {
      console.error('Error adding investor to pool:', error);
      throw error;
    }
  },

  /**
   * Remove an investor from a pool
   * @param poolId Pool ID
   * @param investorId Investor ID
   */
  async removeInvestorFromPool(poolId: string, investorId: string): Promise<void> {
    const { error } = await supabase
      .from('climate_investor_pools')
      .delete()
      .eq('pool_id', poolId)
      .eq('investor_id', investorId);

    if (error) {
      console.error('Error removing investor from pool:', error);
      throw error;
    }
  },

  /**
   * Update a pool's total value based on its receivables
   * @param poolId Pool ID
   */
  async updatePoolTotalValue(poolId: string): Promise<void> {
    // Get all receivables in the pool
    const receivables = await this.getPoolReceivables(poolId);
    
    // Calculate the total value
    const totalValue = receivables.reduce((sum, receivable) => sum + receivable.amount, 0);
    
    // Update the pool
    await this.update(poolId, { total_value: totalValue });
  },

  /**
   * Get pool summary statistics
   * Returns total value and count by risk profile
   */
  async getPoolsSummary(): Promise<{ 
    riskProfile: RiskLevel; 
    totalValue: number; 
    count: number;
  }[]> {
    const { data, error } = await supabase
      .from('climate_tokenization_pools')
      .select('risk_profile, total_value');

    if (error) {
      console.error('Error fetching pools summary:', error);
      throw error;
    }

    // Process data to create summary
    const summary = data.reduce((acc, item) => {
      const riskProfile = item.risk_profile as RiskLevel;
      if (!acc[riskProfile]) {
        acc[riskProfile] = {
          riskProfile,
          totalValue: 0,
          count: 0
        };
      }
      acc[riskProfile].totalValue += item.total_value;
      acc[riskProfile].count += 1;
      return acc;
    }, {} as Record<string, { riskProfile: RiskLevel; totalValue: number; count: number; }>);

    return Object.values(summary);
  },

  /**
   * Get available receivables (not in any pool)
   */
  async getAvailableReceivables(): Promise<ClimateReceivable[]> {
    // First, get all receivables that are already in pools
    const { data: poolReceivables, error: poolError } = await supabase
      .from('climate_pool_receivables')
      .select('receivable_id');

    if (poolError) {
      console.error('Error fetching pool receivables:', poolError);
      throw poolError;
    }

    // Extract receivable IDs that are already in pools
    const poolReceivableIds = poolReceivables.map(item => item.receivable_id);

    // Get receivables that are not in any pool
    const query = supabase
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
      `);

    // If there are receivables in pools, exclude them
    if (poolReceivableIds.length > 0) {
      query.not('receivable_id', 'in', poolReceivableIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching available receivables:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return data.map(item => ({
      receivableId: item.receivable_id,
      assetId: item.asset_id,
      payerId: item.payer_id,
      amount: item.amount,
      dueDate: item.due_date,
      riskScore: item.risk_score,
      discountRate: item.discount_rate,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  },

  // Energy Assets Management
  /**
   * Get energy assets in a pool (Enhanced with missing table detection)
   * @param poolId Pool ID
   */
  async getPoolEnergyAssets(poolId: string) {
    // Check if junction table exists
    const tableExists = await this.checkTableExists('climate_pool_energy_assets');
    
    if (!tableExists) {
      console.warn('⚠️ climate_pool_energy_assets table missing. Please run database migration: /scripts/fix-tokenization-pools-missing-tables.sql');
      return []; // Return empty array instead of crashing
    }

    const { data, error } = await supabase
      .from('climate_pool_energy_assets')
      .select(`
        pool_id,
        asset_id,
        energy_assets!climate_pool_energy_assets_asset_id_fkey(
          asset_id,
          name,
          type,
          location,
          capacity,
          owner_id,
          created_at,
          updated_at
        )
      `)
      .eq('pool_id', poolId);

    if (error) {
      console.error('Error fetching pool energy assets:', error);
      throw error;
    }

    return data.map(item => ({
      assetId: item.energy_assets.asset_id,
      name: item.energy_assets.name,
      type: item.energy_assets.type,
      location: item.energy_assets.location,
      capacity: item.energy_assets.capacity,
      ownerId: item.energy_assets.owner_id,
      createdAt: item.energy_assets.created_at,
      updatedAt: item.energy_assets.updated_at
    }));
  },

  /**
   * Add an energy asset to a pool (Enhanced with missing table detection)
   * @param poolId Pool ID
   * @param assetId Energy Asset ID
   */
  async addEnergyAssetToPool(poolId: string, assetId: string): Promise<void> {
    // Check if junction table exists
    const tableExists = await this.checkTableExists('climate_pool_energy_assets');
    
    if (!tableExists) {
      console.warn('⚠️ climate_pool_energy_assets table missing. Please run database migration: /scripts/fix-tokenization-pools-missing-tables.sql');
      throw new Error('climate_pool_energy_assets table does not exist. Please run database migration.');
    }

    const { error } = await supabase
      .from('climate_pool_energy_assets')
      .insert([{ pool_id: poolId, asset_id: assetId }]);

    if (error) {
      console.error('Error adding energy asset to pool:', error);
      throw error;
    }
  },

  /**
   * Remove an energy asset from a pool (Enhanced with missing table detection)
   * @param poolId Pool ID
   * @param assetId Energy Asset ID
   */
  async removeEnergyAssetFromPool(poolId: string, assetId: string): Promise<void> {
    // Check if junction table exists
    const tableExists = await this.checkTableExists('climate_pool_energy_assets');
    
    if (!tableExists) {
      console.warn('⚠️ climate_pool_energy_assets table missing. Please run database migration: /scripts/fix-tokenization-pools-missing-tables.sql');
      throw new Error('climate_pool_energy_assets table does not exist. Please run database migration.');
    }

    const { error } = await supabase
      .from('climate_pool_energy_assets')
      .delete()
      .eq('pool_id', poolId)
      .eq('asset_id', assetId);

    if (error) {
      console.error('Error removing energy asset from pool:', error);
      throw error;
    }
  },

  /**
   * Get available energy assets (not in any pool) (Enhanced with missing table detection)
   */
  async getAvailableEnergyAssets() {
    // Check if junction table exists
    const tableExists = await this.checkTableExists('climate_pool_energy_assets');
    
    if (!tableExists) {
      console.warn('⚠️ climate_pool_energy_assets table missing. Returning all energy assets. Please run database migration: /scripts/fix-tokenization-pools-missing-tables.sql');
      
      // Return all energy assets when junction table doesn't exist
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
        `);

      if (error) {
        console.error('Error fetching energy assets:', error);
        throw error;
      }

      return data.map(item => ({
        assetId: item.asset_id,
        name: item.name,
        type: item.type,
        location: item.location,
        capacity: item.capacity,
        ownerId: item.owner_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    }

    // First, get all assets that are already in pools
    const { data: poolAssets, error: poolError } = await supabase
      .from('climate_pool_energy_assets')
      .select('asset_id');

    if (poolError) {
      console.error('Error fetching pool energy assets:', poolError);
      throw poolError;
    }

    // Extract asset IDs that are already in pools
    const poolAssetIds = poolAssets.map(item => item.asset_id);

    // Get assets that are not in any pool
    const query = supabase
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

    // If there are assets in pools, exclude them
    if (poolAssetIds.length > 0) {
      query.not('asset_id', 'in', poolAssetIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching available energy assets:', error);
      throw error;
    }

    return data.map(item => ({
      assetId: item.asset_id,
      name: item.name,
      type: item.type,
      location: item.location,
      capacity: item.capacity,
      ownerId: item.owner_id,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  },

  // RECs Management
  /**
   * Get RECs in a pool (Enhanced with missing table detection)
   * @param poolId Pool ID
   */
  async getPoolRECs(poolId: string) {
    // Check if junction table exists
    const tableExists = await this.checkTableExists('climate_pool_recs');
    
    if (!tableExists) {
      console.warn('⚠️ climate_pool_recs table missing. Please run database migration: /scripts/fix-tokenization-pools-missing-tables.sql');
      return []; // Return empty array instead of crashing
    }

    const { data, error } = await supabase
      .from('climate_pool_recs')
      .select(`
        pool_id,
        rec_id,
        renewable_energy_credits!climate_pool_recs_rec_id_fkey(
          rec_id,
          asset_id,
          quantity,
          vintage_year,
          market_type,
          price_per_rec,
          total_value,
          certification,
          status,
          created_at,
          updated_at
        )
      `)
      .eq('pool_id', poolId);

    if (error) {
      console.error('Error fetching pool RECs:', error);
      throw error;
    }

    return data.map(item => ({
      recId: item.renewable_energy_credits.rec_id,
      assetId: item.renewable_energy_credits.asset_id,
      quantity: item.renewable_energy_credits.quantity,
      vintageYear: item.renewable_energy_credits.vintage_year,
      marketType: item.renewable_energy_credits.market_type,
      pricePerRec: item.renewable_energy_credits.price_per_rec,
      totalValue: item.renewable_energy_credits.total_value,
      certification: item.renewable_energy_credits.certification,
      status: item.renewable_energy_credits.status,
      createdAt: item.renewable_energy_credits.created_at,
      updatedAt: item.renewable_energy_credits.updated_at
    }));
  },

  /**
   * Add a REC to a pool (Enhanced with missing table detection)
   * @param poolId Pool ID
   * @param recId REC ID
   */
  async addRECToPool(poolId: string, recId: string): Promise<void> {
    // Check if junction table exists
    const tableExists = await this.checkTableExists('climate_pool_recs');
    
    if (!tableExists) {
      console.warn('⚠️ climate_pool_recs table missing. Please run database migration: /scripts/fix-tokenization-pools-missing-tables.sql');
      throw new Error('climate_pool_recs table does not exist. Please run database migration.');
    }

    const { error } = await supabase
      .from('climate_pool_recs')
      .insert([{ pool_id: poolId, rec_id: recId }]);

    if (error) {
      console.error('Error adding REC to pool:', error);
      throw error;
    }
  },

  /**
   * Remove a REC from a pool (Enhanced with missing table detection)
   * @param poolId Pool ID
   * @param recId REC ID
   */
  async removeRECFromPool(poolId: string, recId: string): Promise<void> {
    // Check if junction table exists
    const tableExists = await this.checkTableExists('climate_pool_recs');
    
    if (!tableExists) {
      console.warn('⚠️ climate_pool_recs table missing. Please run database migration: /scripts/fix-tokenization-pools-missing-tables.sql');
      throw new Error('climate_pool_recs table does not exist. Please run database migration.');
    }

    const { error } = await supabase
      .from('climate_pool_recs')
      .delete()
      .eq('pool_id', poolId)
      .eq('rec_id', recId);

    if (error) {
      console.error('Error removing REC from pool:', error);
      throw error;
    }
  },

  /**
   * Get available RECs (not in any pool) (Enhanced with missing table detection)
   */
  async getAvailableRECs() {
    // Check if junction table exists
    const tableExists = await this.checkTableExists('climate_pool_recs');
    
    if (!tableExists) {
      console.warn('⚠️ climate_pool_recs table missing. Returning all available RECs. Please run database migration: /scripts/fix-tokenization-pools-missing-tables.sql');
      
      // Return all available RECs when junction table doesn't exist
      const { data, error } = await supabase
        .from('renewable_energy_credits')
        .select(`
          rec_id,
          asset_id,
          quantity,
          vintage_year,
          market_type,
          price_per_rec,
          total_value,
          certification,
          status,
          created_at,
          updated_at
        `)
        .eq('status', 'available'); // Only show available RECs

      if (error) {
        console.error('Error fetching available RECs:', error);
        throw error;
      }

      return data.map(item => ({
        recId: item.rec_id,
        assetId: item.asset_id,
        quantity: item.quantity,
        vintageYear: item.vintage_year,
        marketType: item.market_type,
        pricePerRec: item.price_per_rec,
        totalValue: item.total_value,
        certification: item.certification,
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    }

    // First, get all RECs that are already in pools
    const { data: poolRECs, error: poolError } = await supabase
      .from('climate_pool_recs')
      .select('rec_id');

    if (poolError) {
      console.error('Error fetching pool RECs:', poolError);
      throw poolError;
    }

    // Extract REC IDs that are already in pools
    const poolRECIds = poolRECs.map(item => item.rec_id);

    // Get RECs that are not in any pool and are available
    const query = supabase
      .from('renewable_energy_credits')
      .select(`
        rec_id,
        asset_id,
        quantity,
        vintage_year,
        market_type,
        price_per_rec,
        total_value,
        certification,
        status,
        created_at,
        updated_at
      `)
      .eq('status', 'available'); // Only show available RECs

    // If there are RECs in pools, exclude them
    if (poolRECIds.length > 0) {
      query.not('rec_id', 'in', poolRECIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching available RECs:', error);
      throw error;
    }

    return data.map(item => ({
      recId: item.rec_id,
      assetId: item.asset_id,
      quantity: item.quantity,
      vintageYear: item.vintage_year,
      marketType: item.market_type,
      pricePerRec: item.price_per_rec,
      totalValue: item.total_value,
      certification: item.certification,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  },

  // Incentives Management
  /**
   * Get incentives in a pool (Enhanced with missing table detection)
   * @param poolId Pool ID
   */
  async getPoolIncentives(poolId: string) {
    // Check if junction table exists
    const tableExists = await this.checkTableExists('climate_pool_incentives');
    
    if (!tableExists) {
      console.warn('⚠️ climate_pool_incentives table missing. Please run database migration: /scripts/fix-tokenization-pools-missing-tables.sql');
      return []; // Return empty array instead of crashing
    }

    const { data, error } = await supabase
      .from('climate_pool_incentives')
      .select(`
        pool_id,
        incentive_id,
        climate_incentives!climate_pool_incentives_incentive_id_fkey(
          incentive_id,
          type,
          amount,
          status,
          asset_id,
          receivable_id,
          expected_receipt_date,
          created_at,
          updated_at
        )
      `)
      .eq('pool_id', poolId);

    if (error) {
      console.error('Error fetching pool incentives:', error);
      throw error;
    }

    return data.map(item => ({
      incentiveId: item.climate_incentives.incentive_id,
      type: item.climate_incentives.type,
      amount: item.climate_incentives.amount,
      status: item.climate_incentives.status,
      assetId: item.climate_incentives.asset_id,
      receivableId: item.climate_incentives.receivable_id,
      expectedReceiptDate: item.climate_incentives.expected_receipt_date,
      createdAt: item.climate_incentives.created_at,
      updatedAt: item.climate_incentives.updated_at
    }));
  },

  /**
   * Add an incentive to a pool (Enhanced with missing table detection)
   * @param poolId Pool ID
   * @param incentiveId Incentive ID
   */
  async addIncentiveToPool(poolId: string, incentiveId: string): Promise<void> {
    // Check if junction table exists
    const tableExists = await this.checkTableExists('climate_pool_incentives');
    
    if (!tableExists) {
      console.warn('⚠️ climate_pool_incentives table missing. Please run database migration: /scripts/fix-tokenization-pools-missing-tables.sql');
      throw new Error('climate_pool_incentives table does not exist. Please run database migration.');
    }

    const { error } = await supabase
      .from('climate_pool_incentives')
      .insert([{ pool_id: poolId, incentive_id: incentiveId }]);

    if (error) {
      console.error('Error adding incentive to pool:', error);
      throw error;
    }
  },

  /**
   * Remove an incentive from a pool (Enhanced with missing table detection)
   * @param poolId Pool ID
   * @param incentiveId Incentive ID
   */
  async removeIncentiveFromPool(poolId: string, incentiveId: string): Promise<void> {
    // Check if junction table exists
    const tableExists = await this.checkTableExists('climate_pool_incentives');
    
    if (!tableExists) {
      console.warn('⚠️ climate_pool_incentives table missing. Please run database migration: /scripts/fix-tokenization-pools-missing-tables.sql');
      throw new Error('climate_pool_incentives table does not exist. Please run database migration.');
    }

    const { error } = await supabase
      .from('climate_pool_incentives')
      .delete()
      .eq('pool_id', poolId)
      .eq('incentive_id', incentiveId);

    if (error) {
      console.error('Error removing incentive from pool:', error);
      throw error;
    }
  },

  /**
   * Get available incentives (not in any pool) (Enhanced with missing table detection)
   */
  async getAvailableIncentives() {
    // Check if junction table exists
    const tableExists = await this.checkTableExists('climate_pool_incentives');
    
    if (!tableExists) {
      console.warn('⚠️ climate_pool_incentives table missing. Returning all climate incentives. Please run database migration: /scripts/fix-tokenization-pools-missing-tables.sql');
      
      // Return all incentives when junction table doesn't exist
      const { data, error } = await supabase
        .from('climate_incentives')
        .select(`
          incentive_id,
          type,
          amount,
          status,
          asset_id,
          receivable_id,
          expected_receipt_date,
          created_at,
          updated_at
        `);

      if (error) {
        console.error('Error fetching climate incentives:', error);
        throw error;
      }

      return data.map(item => ({
        incentiveId: item.incentive_id,
        type: item.type,
        amount: item.amount,
        status: item.status,
        assetId: item.asset_id,
        receivableId: item.receivable_id,
        expectedReceiptDate: item.expected_receipt_date,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    }

    // First, get all incentives that are already in pools
    const { data: poolIncentives, error: poolError } = await supabase
      .from('climate_pool_incentives')
      .select('incentive_id');

    if (poolError) {
      console.error('Error fetching pool incentives:', poolError);
      throw poolError;
    }

    // Extract incentive IDs that are already in pools
    const poolIncentiveIds = poolIncentives.map(item => item.incentive_id);

    // Get incentives that are not in any pool
    const query = supabase
      .from('climate_incentives')
      .select(`
        incentive_id,
        type,
        amount,
        status,
        asset_id,
        receivable_id,
        expected_receipt_date,
        created_at,
        updated_at
      `);

    // If there are incentives in pools, exclude them
    if (poolIncentiveIds.length > 0) {
      query.not('incentive_id', 'in', poolIncentiveIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching available incentives:', error);
      throw error;
    }

    return data.map(item => ({
      incentiveId: item.incentive_id,
      type: item.type,
      amount: item.amount,
      status: item.status,
      assetId: item.asset_id,
      receivableId: item.receivable_id,
      expectedReceiptDate: item.expected_receipt_date,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  }
};

// Export for backward compatibility
export const tokenizationPoolsService = enhancedTokenizationPoolsService;
