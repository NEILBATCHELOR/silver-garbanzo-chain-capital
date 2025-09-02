import { supabase } from '@/infrastructure/database/client';
import { 
  ClimateIncentive, 
  InsertClimateIncentive, 
  EnergyAsset, 
  ClimateReceivable,
  IncentiveType,
  IncentiveStatus
} from '../types';

/**
 * Service for handling incentives CRUD operations
 */
export const incentivesService = {
  /**
   * Get all incentives with optional filtering
   * @param assetId Optional asset ID to filter by
   * @param receivableId Optional receivable ID to filter by
   * @param type Optional incentive type to filter by
   * @param status Optional status to filter by
   */
  async getAll(
    assetId?: string, 
    receivableId?: string,
    type?: IncentiveType,
    status?: IncentiveStatus
  ): Promise<ClimateIncentive[]> {
    let query = supabase
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
        updated_at,
        energy_assets!climate_incentives_asset_id_fkey(
          asset_id,
          name,
          type,
          location,
          capacity
        ),
        climate_receivables!climate_incentives_receivable_id_fkey(
          receivable_id,
          asset_id,
          payer_id,
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

    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('expected_receipt_date', { ascending: true });

    if (error) {
      console.error('Error fetching incentives:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return data.map(item => ({
      incentiveId: item.incentive_id,
      type: item.type as IncentiveType,
      amount: item.amount,
      status: item.status as IncentiveStatus,
      assetId: item.asset_id,
      receivableId: item.receivable_id,
      expectedReceiptDate: item.expected_receipt_date,
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
        assetId: item.climate_receivables.asset_id,
        payerId: item.climate_receivables.payer_id,
        amount: item.climate_receivables.amount,
        dueDate: item.climate_receivables.due_date,
        riskScore: item.climate_receivables.risk_score,
        discountRate: item.climate_receivables.discount_rate,
        createdAt: '', // These fields aren't selected in the query
        updatedAt: ''
      } as ClimateReceivable : undefined
    }));
  },

  /**
   * Get a single incentive by ID
   * @param id Incentive ID
   */
  async getById(id: string): Promise<ClimateIncentive | null> {
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
        updated_at,
        energy_assets!climate_incentives_asset_id_fkey(
          asset_id,
          name,
          type,
          location,
          capacity
        ),
        climate_receivables!climate_incentives_receivable_id_fkey(
          receivable_id,
          asset_id,
          payer_id,
          amount,
          due_date,
          risk_score,
          discount_rate
        )
      `)
      .eq('incentive_id', id)
      .single();

    if (error) {
      console.error('Error fetching incentive by ID:', error);
      throw error;
    }

    if (!data) return null;

    // Transform the data to match our frontend types
    return {
      incentiveId: data.incentive_id,
      type: data.type as IncentiveType,
      amount: data.amount,
      status: data.status as IncentiveStatus,
      assetId: data.asset_id,
      receivableId: data.receivable_id,
      expectedReceiptDate: data.expected_receipt_date,
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
        assetId: data.climate_receivables.asset_id,
        payerId: data.climate_receivables.payer_id,
        amount: data.climate_receivables.amount,
        dueDate: data.climate_receivables.due_date,
        riskScore: data.climate_receivables.risk_score,
        discountRate: data.climate_receivables.discount_rate,
        createdAt: '', // These fields aren't selected in the query
        updatedAt: ''
      } as ClimateReceivable : undefined
    };
  },

  /**
   * Create a new incentive
   * @param incentive Incentive data to create
   */
  async create(incentive: InsertClimateIncentive): Promise<ClimateIncentive> {
    const { data, error } = await supabase
      .from('climate_incentives')
      .insert([incentive])
      .select()
      .single();

    if (error) {
      console.error('Error creating incentive:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return {
      incentiveId: data.incentive_id,
      type: data.type as IncentiveType,
      amount: data.amount,
      status: data.status as IncentiveStatus,
      assetId: data.asset_id,
      receivableId: data.receivable_id,
      expectedReceiptDate: data.expected_receipt_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  /**
   * Update an existing incentive
   * @param id Incentive ID
   * @param incentive Incentive data to update
   */
  async update(id: string, incentive: Partial<InsertClimateIncentive>): Promise<ClimateIncentive> {
    const { data, error } = await supabase
      .from('climate_incentives')
      .update(incentive)
      .eq('incentive_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating incentive:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return {
      incentiveId: data.incentive_id,
      type: data.type as IncentiveType,
      amount: data.amount,
      status: data.status as IncentiveStatus,
      assetId: data.asset_id,
      receivableId: data.receivable_id,
      expectedReceiptDate: data.expected_receipt_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  /**
   * Delete an incentive
   * @param id Incentive ID
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('climate_incentives')
      .delete()
      .eq('incentive_id', id);

    if (error) {
      console.error('Error deleting incentive:', error);
      throw error;
    }
  },

  /**
   * Get incentives summary by type and status
   * Returns total amount and count grouped by type and status
   */
  async getIncentivesSummary(): Promise<{ 
    type: IncentiveType; 
    status: IncentiveStatus; 
    totalAmount: number; 
    count: number;
  }[]> {
    const { data, error } = await supabase
      .from('climate_incentives')
      .select('type, status, amount');

    if (error) {
      console.error('Error fetching incentives summary:', error);
      throw error;
    }

    // Process data to create summary
    const summary = data.reduce((acc, item) => {
      const key = `${item.type}-${item.status}`;
      if (!acc[key]) {
        acc[key] = {
          type: item.type as IncentiveType,
          status: item.status as IncentiveStatus,
          totalAmount: 0,
          count: 0
        };
      }
      acc[key].totalAmount += item.amount;
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { type: IncentiveType; status: IncentiveStatus; totalAmount: number; count: number; }>);

    return Object.values(summary);
  }
};