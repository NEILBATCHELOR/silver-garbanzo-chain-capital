import { supabase } from '@/infrastructure/database/client';
import { 
  RenewableEnergyCredit, 
  InsertRenewableEnergyCredit, 
  EnergyAsset, 
  RECMarketType,
  RECStatus
} from '../types';

/**
 * Service for handling Renewable Energy Credits (RECs) CRUD operations
 */
export const recsService = {
  /**
   * Get all RECs with optional filtering
   * @param assetId Optional asset ID to filter by
   * @param receivableId Optional receivable ID to filter by
   * @param marketType Optional market type to filter by
   * @param status Optional status to filter by
   * @param vintageYear Optional vintage year to filter by
   */
  async getAll(
    assetId?: string,
    receivableId?: string, 
    marketType?: RECMarketType,
    status?: RECStatus,
    vintageYear?: number
  ): Promise<RenewableEnergyCredit[]> {
    let query = supabase
      .from('renewable_energy_credits')
      .select(`
        rec_id,
        asset_id,
        receivable_id,
        quantity,
        vintage_year,
        market_type,
        price_per_rec,
        total_value,
        certification,
        status,
        created_at,
        updated_at,
        energy_assets!renewable_energy_credits_asset_id_fkey(
          asset_id,
          name,
          type,
          location,
          capacity
        ),
        climate_receivables!renewable_energy_credits_receivable_id_fkey(
          receivable_id,
          amount,
          due_date,
          risk_score,
          discount_rate
        )
      `);
    
    // Apply filters if provided
    if (assetId) {
      query = query.eq('asset_id', assetId);
    }

    if (receivableId) {
      query = query.eq('receivable_id', receivableId);
    }
    
    if (marketType) {
      query = query.eq('market_type', marketType);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (vintageYear) {
      query = query.eq('vintage_year', vintageYear);
    }

    const { data, error } = await query.order('vintage_year', { ascending: false });

    if (error) {
      console.error('Error fetching RECs:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return data.map(item => ({
      recId: item.rec_id,
      assetId: item.asset_id,
      receivableId: item.receivable_id,
      quantity: item.quantity,
      vintageYear: item.vintage_year,
      marketType: item.market_type as RECMarketType,
      pricePerRec: item.price_per_rec,
      totalValue: item.total_value,
      certification: item.certification,
      status: item.status as RECStatus,
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
      receivable: item.climate_receivables ? {
        receivableId: item.climate_receivables.receivable_id,
        assetId: null,
        payerId: null,
        amount: item.climate_receivables.amount,
        dueDate: item.climate_receivables.due_date,
        riskScore: item.climate_receivables.risk_score,
        discountRate: item.climate_receivables.discount_rate,
        createdAt: '',
        updatedAt: ''
      } : undefined
    }));
  },

  /**
   * Get a single REC by ID
   * @param id REC ID
   */
  async getById(id: string): Promise<RenewableEnergyCredit | null> {
    const { data, error } = await supabase
      .from('renewable_energy_credits')
      .select(`
        rec_id,
        asset_id,
        receivable_id,
        quantity,
        vintage_year,
        market_type,
        price_per_rec,
        total_value,
        certification,
        status,
        created_at,
        updated_at,
        energy_assets!renewable_energy_credits_asset_id_fkey(
          asset_id,
          name,
          type,
          location,
          capacity
        ),
        climate_receivables!renewable_energy_credits_receivable_id_fkey(
          receivable_id,
          amount,
          due_date,
          risk_score,
          discount_rate
        )
      `)
      .eq('rec_id', id)
      .single();

    if (error) {
      console.error('Error fetching REC by ID:', error);
      throw error;
    }

    if (!data) return null;

    // Transform the data to match our frontend types
    return {
      recId: data.rec_id,
      assetId: data.asset_id,
      receivableId: data.receivable_id,
      quantity: data.quantity,
      vintageYear: data.vintage_year,
      marketType: data.market_type as RECMarketType,
      pricePerRec: data.price_per_rec,
      totalValue: data.total_value,
      certification: data.certification,
      status: data.status as RECStatus,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      asset: data.energy_assets ? {
        assetId: data.energy_assets.asset_id,
        name: data.energy_assets.name,
        type: data.energy_assets.type,
        location: data.energy_assets.location,
        capacity: data.energy_assets.capacity,
        ownerId: '', // This field isn't selected in the query
        createdAt: '', // These fields aren't selected in the query
        updatedAt: ''
      } as EnergyAsset : undefined,
      receivable: data.climate_receivables ? {
        receivableId: data.climate_receivables.receivable_id,
        assetId: null,
        payerId: null,
        amount: data.climate_receivables.amount,
        dueDate: data.climate_receivables.due_date,
        riskScore: data.climate_receivables.risk_score,
        discountRate: data.climate_receivables.discount_rate,
        createdAt: '',
        updatedAt: ''
      } : undefined
    };
  },

  /**
   * Create a new REC
   * @param rec REC data to create
   */
  async create(rec: InsertRenewableEnergyCredit): Promise<RenewableEnergyCredit> {
    // Calculate total value if not provided
    if (!rec.total_value && rec.quantity && rec.price_per_rec) {
      rec.total_value = rec.quantity * rec.price_per_rec;
    }

    const { data, error } = await supabase
      .from('renewable_energy_credits')
      .insert([rec])
      .select()
      .single();

    if (error) {
      console.error('Error creating REC:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return {
      recId: data.rec_id,
      assetId: data.asset_id,
      receivableId: data.receivable_id,
      quantity: data.quantity,
      vintageYear: data.vintage_year,
      marketType: data.market_type as RECMarketType,
      pricePerRec: data.price_per_rec,
      totalValue: data.total_value,
      certification: data.certification,
      status: data.status as RECStatus,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  /**
   * Update an existing REC
   * @param id REC ID
   * @param rec REC data to update
   */
  async update(id: string, rec: Partial<InsertRenewableEnergyCredit>): Promise<RenewableEnergyCredit> {
    // Update total value if quantity or price has changed
    if ((rec.quantity || rec.price_per_rec) && !rec.total_value) {
      // Get current REC to calculate new total value
      const { data: currentRec } = await supabase
        .from('renewable_energy_credits')
        .select('quantity, price_per_rec')
        .eq('rec_id', id)
        .single();
      
      if (currentRec) {
        const quantity = rec.quantity || currentRec.quantity;
        const pricePerRec = rec.price_per_rec || currentRec.price_per_rec;
        rec.total_value = quantity * pricePerRec;
      }
    }

    const { data, error } = await supabase
      .from('renewable_energy_credits')
      .update(rec)
      .eq('rec_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating REC:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return {
      recId: data.rec_id,
      assetId: data.asset_id,
      receivableId: data.receivable_id,
      quantity: data.quantity,
      vintageYear: data.vintage_year,
      marketType: data.market_type as RECMarketType,
      pricePerRec: data.price_per_rec,
      totalValue: data.total_value,
      certification: data.certification,
      status: data.status as RECStatus,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  /**
   * Delete a REC
   * @param id REC ID
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('renewable_energy_credits')
      .delete()
      .eq('rec_id', id);

    if (error) {
      console.error('Error deleting REC:', error);
      throw error;
    }
  },

  /**
   * Get RECs summary by market type and status
   * Returns total value, quantity, and count grouped by market type and status
   */
  async getRECsSummary(): Promise<{ 
    marketType: RECMarketType; 
    status: RECStatus; 
    totalValue: number;
    totalQuantity: number;
    count: number;
  }[]> {
    const { data, error } = await supabase
      .from('renewable_energy_credits')
      .select('market_type, status, quantity, total_value');

    if (error) {
      console.error('Error fetching RECs summary:', error);
      throw error;
    }

    // Process data to create summary
    const summary = data.reduce((acc, item) => {
      const key = `${item.market_type}-${item.status}`;
      if (!acc[key]) {
        acc[key] = {
          marketType: item.market_type as RECMarketType,
          status: item.status as RECStatus,
          totalValue: 0,
          totalQuantity: 0,
          count: 0
        };
      }
      acc[key].totalValue += item.total_value;
      acc[key].totalQuantity += item.quantity;
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { marketType: RECMarketType; status: RECStatus; totalValue: number; totalQuantity: number; count: number; }>);

    return Object.values(summary);
  },

  /**
   * Get vintage year distribution
   * Returns count and total quantity by vintage year
   */
  async getVintageDistribution(): Promise<{
    vintageYear: number;
    count: number;
    totalQuantity: number;
  }[]> {
    const { data, error } = await supabase
      .from('renewable_energy_credits')
      .select('vintage_year, quantity');

    if (error) {
      console.error('Error fetching vintage distribution:', error);
      throw error;
    }

    // Process data to create distribution
    const distribution = (data as { vintage_year: number; quantity: number }[]).reduce((acc, item) => {
      const year = item.vintage_year;
      if (!acc[year]) {
        acc[year] = {
          vintageYear: year,
          count: 0,
          totalQuantity: 0
        };
      }
      acc[year].count += 1;
      acc[year].totalQuantity += item.quantity;
      return acc;
    }, {} as Record<number, { vintageYear: number; count: number; totalQuantity: number; }>);

    return Object.values(distribution).sort((a, b) => b.vintageYear - a.vintageYear);
  }
};