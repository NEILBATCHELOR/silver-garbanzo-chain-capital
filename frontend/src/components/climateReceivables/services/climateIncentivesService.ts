import { supabase } from '@/infrastructure/database/client';
import { 
  ClimateIncentive, 
  ClimateIncentiveDB,
  IncentiveType, 
  IncentiveStatus,
  InsertClimateIncentive,
  dbToUiClimateIncentive 
} from '../types';

export interface ClimateIncentiveFilters {
  projectId?: string;
  type?: IncentiveType;
  status?: IncentiveStatus;
  assetId?: string;
  receivableId?: string;
}

export interface CreateClimateIncentiveData {
  type: IncentiveType;
  amount: number;
  status: IncentiveStatus;
  projectId?: string;
  assetId?: string;
  receivableId?: string;
  expectedReceiptDate?: string;
}

export interface UpdateClimateIncentiveData extends Partial<CreateClimateIncentiveData> {
  incentiveId: string;
}

export class ClimateIncentivesService {
  /**
   * Get all climate incentives with optional project filtering
   */
  static async getIncentives(filters: ClimateIncentiveFilters = {}): Promise<ClimateIncentive[]> {
    try {
      let query = supabase
        .from('climate_incentives')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.assetId) {
        query = query.eq('asset_id', filters.assetId);
      }
      if (filters.receivableId) {
        query = query.eq('receivable_id', filters.receivableId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching climate incentives:', error);
        throw new Error(`Failed to fetch incentives: ${error.message}`);
      }

      return data?.map((item: ClimateIncentiveDB) => dbToUiClimateIncentive(item)) || [];
    } catch (error) {
      console.error('ClimateIncentivesService.getIncentives error:', error);
      throw error;
    }
  }

  /**
   * Get climate incentive by ID
   */
  static async getIncentiveById(incentiveId: string): Promise<ClimateIncentive | null> {
    try {
      const { data, error } = await supabase
        .from('climate_incentives')
        .select('*')
        .eq('incentive_id', incentiveId)
        .single();

      if (error) {
        console.error('Error fetching climate incentive by ID:', error);
        throw new Error(`Failed to fetch incentive: ${error.message}`);
      }

      return data ? dbToUiClimateIncentive(data) : null;
    } catch (error) {
      console.error('ClimateIncentivesService.getIncentiveById error:', error);
      throw error;
    }
  }

  /**
   * Create new climate incentive
   */
  static async createIncentive(incentiveData: CreateClimateIncentiveData): Promise<ClimateIncentive> {
    try {
      // Calculate total value if amount represents price per ton
      const insertData: InsertClimateIncentive = {
        type: incentiveData.type,
        amount: incentiveData.amount,
        status: incentiveData.status,
        asset_id: incentiveData.assetId,
        receivable_id: incentiveData.receivableId,
        expected_receipt_date: incentiveData.expectedReceiptDate,
      };

      // Add project_id if provided
      const finalData = incentiveData.projectId 
        ? { ...insertData, project_id: incentiveData.projectId }
        : insertData;

      const { data, error } = await supabase
        .from('climate_incentives')
        .insert(finalData)
        .select()
        .single();

      if (error) {
        console.error('Error creating climate incentive:', error);
        throw new Error(`Failed to create incentive: ${error.message}`);
      }

      return dbToUiClimateIncentive(data);
    } catch (error) {
      console.error('ClimateIncentivesService.createIncentive error:', error);
      throw error;
    }
  }

  /**
   * Update climate incentive
   */
  static async updateIncentive(updateData: UpdateClimateIncentiveData): Promise<ClimateIncentive> {
    try {
      const { incentiveId, ...updateFields } = updateData;

      // Convert camelCase to snake_case for database
      const dbUpdateData: Partial<ClimateIncentiveDB> = {};
      
      if (updateFields.type !== undefined) dbUpdateData.type = updateFields.type;
      if (updateFields.amount !== undefined) dbUpdateData.amount = updateFields.amount;
      if (updateFields.status !== undefined) dbUpdateData.status = updateFields.status;
      if (updateFields.assetId !== undefined) dbUpdateData.asset_id = updateFields.assetId;
      if (updateFields.receivableId !== undefined) dbUpdateData.receivable_id = updateFields.receivableId;
      if (updateFields.expectedReceiptDate !== undefined) dbUpdateData.expected_receipt_date = updateFields.expectedReceiptDate;

      // Add project_id if provided
      if (updateFields.projectId !== undefined) {
        (dbUpdateData as any).project_id = updateFields.projectId;
      }

      const { data, error } = await supabase
        .from('climate_incentives')
        .update(dbUpdateData)
        .eq('incentive_id', incentiveId)
        .select()
        .single();

      if (error) {
        console.error('Error updating climate incentive:', error);
        throw new Error(`Failed to update incentive: ${error.message}`);
      }

      return dbToUiClimateIncentive(data);
    } catch (error) {
      console.error('ClimateIncentivesService.updateIncentive error:', error);
      throw error;
    }
  }

  /**
   * Delete climate incentive
   */
  static async deleteIncentive(incentiveId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('climate_incentives')
        .delete()
        .eq('incentive_id', incentiveId);

      if (error) {
        console.error('Error deleting climate incentive:', error);
        throw new Error(`Failed to delete incentive: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('ClimateIncentivesService.deleteIncentive error:', error);
      throw error;
    }
  }

  /**
   * Get incentives summary statistics
   */
  static async getIncentivesSummary(projectId?: string): Promise<{
    totalCount: number;
    totalAmount: number;
    byType: Record<IncentiveType, { count: number; amount: number }>;
    byStatus: Record<IncentiveStatus, number>;
  }> {
    try {
      let query = supabase
        .from('climate_incentives')
        .select('type, amount, status');

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching incentives summary:', error);
        throw new Error(`Failed to fetch summary: ${error.message}`);
      }

      const summary = {
        totalCount: data?.length || 0,
        totalAmount: data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0,
        byType: {} as Record<IncentiveType, { count: number; amount: number }>,
        byStatus: {} as Record<IncentiveStatus, number>,
      };

      // Initialize byType with all types
      Object.values(IncentiveType).forEach(type => {
        summary.byType[type] = { count: 0, amount: 0 };
      });

      // Initialize byStatus with all statuses
      Object.values(IncentiveStatus).forEach(status => {
        summary.byStatus[status] = 0;
      });

      // Aggregate data
      data?.forEach(item => {
        summary.byType[item.type].count++;
        summary.byType[item.type].amount += Number(item.amount);
        summary.byStatus[item.status]++;
      });

      return summary;
    } catch (error) {
      console.error('ClimateIncentivesService.getIncentivesSummary error:', error);
      throw error;
    }
  }
}
