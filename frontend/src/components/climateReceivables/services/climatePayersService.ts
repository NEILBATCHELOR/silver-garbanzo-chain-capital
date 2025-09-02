import { supabase } from '@/infrastructure/database/client';
import { 
  ClimatePayer,
  ClimatePayerDB,
  InsertClimatePayer,
  dbToUiClimatePayer
} from '../types';

/**
 * Service for handling climate payers CRUD operations
 */
export const climatePayersService = {
  /**
   * Get all climate payers with optional filtering
   * @param creditRating Optional credit rating to filter by
   * @param minHealthScore Optional minimum financial health score to filter by
   * @param maxHealthScore Optional maximum financial health score to filter by
   */
  async getAll(
    creditRating?: string, 
    minHealthScore?: number,
    maxHealthScore?: number
  ): Promise<ClimatePayer[]> {
    let query = supabase
      .from('climate_payers')
      .select(`
        payer_id,
        name,
        credit_rating,
        financial_health_score,
        payment_history,
        created_at,
        updated_at
      `);
    
    // Apply filters if provided
    if (creditRating) {
      query = query.eq('credit_rating', creditRating);
    }
    
    if (minHealthScore !== undefined) {
      query = query.gte('financial_health_score', minHealthScore);
    }
    
    if (maxHealthScore !== undefined) {
      query = query.lte('financial_health_score', maxHealthScore);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error('Error fetching climate payers:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return data.map(dbToUiClimatePayer);
  },

  /**
   * Get a single climate payer by ID
   * @param id Climate payer ID
   */
  async getById(id: string): Promise<ClimatePayer | null> {
    const { data, error } = await supabase
      .from('climate_payers')
      .select(`
        payer_id,
        name,
        credit_rating,
        financial_health_score,
        payment_history,
        created_at,
        updated_at
      `)
      .eq('payer_id', id)
      .single();

    if (error) {
      console.error('Error fetching climate payer by ID:', error);
      throw error;
    }

    if (!data) return null;

    // Transform the data to match our frontend types
    return dbToUiClimatePayer(data);
  },

  /**
   * Create a new climate payer
   * @param payer Climate payer to create
   */
  async create(payer: InsertClimatePayer): Promise<ClimatePayer> {
    const { data, error } = await supabase
      .from('climate_payers')
      .insert([payer])
      .select()
      .single();

    if (error) {
      console.error('Error creating climate payer:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return dbToUiClimatePayer(data);
  },

  /**
   * Update an existing climate payer
   * @param id Climate payer ID
   * @param payer Climate payer data to update
   */
  async update(id: string, payer: Partial<InsertClimatePayer>): Promise<ClimatePayer> {
    const { data, error } = await supabase
      .from('climate_payers')
      .update(payer)
      .eq('payer_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating climate payer:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    return dbToUiClimatePayer(data);
  },

  /**
   * Delete a climate payer
   * @param id Climate payer ID
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('climate_payers')
      .delete()
      .eq('payer_id', id);

    if (error) {
      console.error('Error deleting climate payer:', error);
      throw error;
    }
  },

  /**
   * Get summary statistics for climate payers
   */
  async getPayersSummary(): Promise<{
    totalCount: number;
    averageHealthScore: number;
    countByCreditRating: Record<string, number>;
    countByHealthScore: { excellent: number; good: number; fair: number; poor: number };
  }> {
    const { data, error } = await supabase
      .from('climate_payers')
      .select('credit_rating, financial_health_score');

    if (error) {
      console.error('Error fetching payers summary:', error);
      throw error;
    }

    // Calculate summary statistics
    const totalCount = data.length;
    const averageHealthScore = totalCount > 0
      ? data.reduce((sum, item) => sum + (item.financial_health_score || 0), 0) / totalCount
      : 0;
    
    const countByCreditRating = data.reduce((counts, item) => {
      const rating = item.credit_rating || 'Unrated';
      counts[rating] = (counts[rating] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const countByHealthScore = data.reduce(
      (counts, item) => {
        const score = item.financial_health_score || 0;
        if (score >= 85) counts.excellent++;
        else if (score >= 70) counts.good++;
        else if (score >= 50) counts.fair++;
        else counts.poor++;
        return counts;
      },
      { excellent: 0, good: 0, fair: 0, poor: 0 }
    );

    return { totalCount, averageHealthScore, countByCreditRating, countByHealthScore };
  }
};
