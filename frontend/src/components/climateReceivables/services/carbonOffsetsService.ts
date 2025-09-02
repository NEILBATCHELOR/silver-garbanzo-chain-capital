import { supabase } from '@/infrastructure/database/client';
import { 
  CarbonOffset, 
  CarbonOffsetDB,
  CarbonOffsetType, 
  CarbonOffsetStatus,
  InsertCarbonOffset,
  dbToUiCarbonOffset 
} from '../types';

export interface CarbonOffsetFilters {
  projectId?: string;
  type?: CarbonOffsetType;
  status?: CarbonOffsetStatus;
  verificationStandard?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface CreateCarbonOffsetData {
  projectId: string;
  type: CarbonOffsetType;
  amount: number;
  pricePerTon: number;
  verificationStandard?: string;
  verificationDate?: string;
  expirationDate?: string;
  status: CarbonOffsetStatus;
}

export interface UpdateCarbonOffsetData extends Partial<CreateCarbonOffsetData> {
  offsetId: string;
}

export class CarbonOffsetsService {
  /**
   * Get all carbon offsets with optional filtering
   */
  static async getOffsets(filters: CarbonOffsetFilters = {}): Promise<CarbonOffset[]> {
    try {
      let query = supabase
        .from('carbon_offsets')
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
      if (filters.verificationStandard) {
        query = query.eq('verification_standard', filters.verificationStandard);
      }
      if (filters.minAmount !== undefined) {
        query = query.gte('amount', filters.minAmount);
      }
      if (filters.maxAmount !== undefined) {
        query = query.lte('amount', filters.maxAmount);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching carbon offsets:', error);
        throw new Error(`Failed to fetch carbon offsets: ${error.message}`);
      }

      return data?.map((item: CarbonOffsetDB) => dbToUiCarbonOffset(item)) || [];
    } catch (error) {
      console.error('CarbonOffsetsService.getOffsets error:', error);
      throw error;
    }
  }

  /**
   * Get carbon offset by ID
   */
  static async getOffsetById(offsetId: string): Promise<CarbonOffset | null> {
    try {
      const { data, error } = await supabase
        .from('carbon_offsets')
        .select('*')
        .eq('offset_id', offsetId)
        .single();

      if (error) {
        console.error('Error fetching carbon offset by ID:', error);
        throw new Error(`Failed to fetch carbon offset: ${error.message}`);
      }

      return data ? dbToUiCarbonOffset(data) : null;
    } catch (error) {
      console.error('CarbonOffsetsService.getOffsetById error:', error);
      throw error;
    }
  }

  /**
   * Create new carbon offset
   */
  static async createOffset(offsetData: CreateCarbonOffsetData): Promise<CarbonOffset> {
    try {
      // Calculate total value
      const totalValue = offsetData.amount * offsetData.pricePerTon;

      const insertData: InsertCarbonOffset = {
        project_id: offsetData.projectId,
        type: offsetData.type,
        amount: offsetData.amount,
        price_per_ton: offsetData.pricePerTon,
        total_value: totalValue,
        verification_standard: offsetData.verificationStandard,
        verification_date: offsetData.verificationDate,
        expiration_date: offsetData.expirationDate,
        status: offsetData.status,
      };

      const { data, error } = await supabase
        .from('carbon_offsets')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating carbon offset:', error);
        throw new Error(`Failed to create carbon offset: ${error.message}`);
      }

      return dbToUiCarbonOffset(data);
    } catch (error) {
      console.error('CarbonOffsetsService.createOffset error:', error);
      throw error;
    }
  }

  /**
   * Update carbon offset
   */
  static async updateOffset(updateData: UpdateCarbonOffsetData): Promise<CarbonOffset> {
    try {
      const { offsetId, ...updateFields } = updateData;

      // Convert camelCase to snake_case for database
      const dbUpdateData: Partial<CarbonOffsetDB> = {};
      
      if (updateFields.projectId !== undefined) dbUpdateData.project_id = updateFields.projectId;
      if (updateFields.type !== undefined) dbUpdateData.type = updateFields.type;
      if (updateFields.amount !== undefined) dbUpdateData.amount = updateFields.amount;
      if (updateFields.pricePerTon !== undefined) dbUpdateData.price_per_ton = updateFields.pricePerTon;
      if (updateFields.verificationStandard !== undefined) dbUpdateData.verification_standard = updateFields.verificationStandard;
      if (updateFields.verificationDate !== undefined) dbUpdateData.verification_date = updateFields.verificationDate;
      if (updateFields.expirationDate !== undefined) dbUpdateData.expiration_date = updateFields.expirationDate;
      if (updateFields.status !== undefined) dbUpdateData.status = updateFields.status;

      // Recalculate total value if amount or price changed
      if (updateFields.amount !== undefined || updateFields.pricePerTon !== undefined) {
        // Get current values if only one field is being updated
        if (updateFields.amount === undefined || updateFields.pricePerTon === undefined) {
          const current = await this.getOffsetById(offsetId);
          if (current) {
            const amount = updateFields.amount ?? current.amount;
            const pricePerTon = updateFields.pricePerTon ?? current.pricePerTon;
            dbUpdateData.total_value = amount * pricePerTon;
          }
        } else {
          dbUpdateData.total_value = updateFields.amount * updateFields.pricePerTon;
        }
      }

      const { data, error } = await supabase
        .from('carbon_offsets')
        .update(dbUpdateData)
        .eq('offset_id', offsetId)
        .select()
        .single();

      if (error) {
        console.error('Error updating carbon offset:', error);
        throw new Error(`Failed to update carbon offset: ${error.message}`);
      }

      return dbToUiCarbonOffset(data);
    } catch (error) {
      console.error('CarbonOffsetsService.updateOffset error:', error);
      throw error;
    }
  }

  /**
   * Delete carbon offset
   */
  static async deleteOffset(offsetId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('carbon_offsets')
        .delete()
        .eq('offset_id', offsetId);

      if (error) {
        console.error('Error deleting carbon offset:', error);
        throw new Error(`Failed to delete carbon offset: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('CarbonOffsetsService.deleteOffset error:', error);
      throw error;
    }
  }

  /**
   * Get carbon offsets summary statistics
   */
  static async getOffsetsSummary(projectId?: string): Promise<{
    totalCount: number;
    totalAmount: number;
    totalValue: number;
    byType: Record<CarbonOffsetType, { count: number; amount: number; value: number }>;
    byStatus: Record<CarbonOffsetStatus, number>;
    averagePricePerTon: number;
  }> {
    try {
      let query = supabase
        .from('carbon_offsets')
        .select('type, amount, total_value, price_per_ton, status');

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching carbon offsets summary:', error);
        throw new Error(`Failed to fetch summary: ${error.message}`);
      }

      const totalAmount = data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalValue = data?.reduce((sum, item) => sum + Number(item.total_value), 0) || 0;

      const summary = {
        totalCount: data?.length || 0,
        totalAmount,
        totalValue,
        byType: {} as Record<CarbonOffsetType, { count: number; amount: number; value: number }>,
        byStatus: {} as Record<CarbonOffsetStatus, number>,
        averagePricePerTon: totalAmount > 0 ? totalValue / totalAmount : 0,
      };

      // Initialize byType with all types
      Object.values(CarbonOffsetType).forEach(type => {
        summary.byType[type] = { count: 0, amount: 0, value: 0 };
      });

      // Initialize byStatus with all statuses
      Object.values(CarbonOffsetStatus).forEach(status => {
        summary.byStatus[status] = 0;
      });

      // Aggregate data
      data?.forEach(item => {
        summary.byType[item.type].count++;
        summary.byType[item.type].amount += Number(item.amount);
        summary.byType[item.type].value += Number(item.total_value);
        summary.byStatus[item.status]++;
      });

      return summary;
    } catch (error) {
      console.error('CarbonOffsetsService.getOffsetsSummary error:', error);
      throw error;
    }
  }
}
