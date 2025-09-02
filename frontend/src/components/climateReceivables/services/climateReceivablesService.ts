import { supabase } from '@/infrastructure/database/client';
import { AutomatedRiskCalculationEngine } from './business-logic/automated-risk-calculation-engine';
import { 
  ClimateReceivable, 
  InsertClimateReceivable, 
  EnergyAsset,
  EnergyAssetType,
  ClimatePayer,
  ClimateIncentive,
  ClimateRiskFactor,
  ClimatePolicyImpact,
  dbToUiClimateReceivable,
  dbToUiEnergyAsset,
  dbToUiClimatePayer,
  dbToUiClimateIncentive,
  dbToUiClimateRiskFactor,
  dbToUiClimatePolicyImpact
} from '../types';

/**
 * Service for handling climate receivables CRUD operations
 */
export const climateReceivablesService = {
  /**
   * Get all climate receivables with optional filtering
   * @param assetId Optional asset ID to filter by
   * @param payerId Optional payer ID to filter by
   * @param minRiskScore Optional minimum risk score to filter by
   * @param maxRiskScore Optional maximum risk score to filter by
   * @param startDate Optional start date for due date to filter by
   * @param endDate Optional end date for due date to filter by
   */
  async getAll(
    assetId?: string, 
    payerId?: string,
    minRiskScore?: number,
    maxRiskScore?: number,
    startDate?: string, 
    endDate?: string
  ): Promise<ClimateReceivable[]> {
    let query = supabase
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
        updated_at,
        energy_assets(
          asset_id,
          name,
          type,
          location,
          capacity
        ),
        climate_payers(
          payer_id,
          name,
          credit_rating,
          financial_health_score
        ),
        climate_incentives(
          incentive_id,
          type,
          amount,
          status,
          expected_receipt_date
        ),
        climate_risk_factors(
          factor_id,
          production_risk,
          credit_risk,
          policy_risk
        ),
        climate_policy_impacts(
          impact_id,
          policy_id,
          impact_description
        )
      `);
    
    // Apply filters if provided
    if (assetId) {
      query = query.eq('asset_id', assetId);
    }
    
    if (payerId) {
      query = query.eq('payer_id', payerId);
    }
    
    if (minRiskScore !== undefined) {
      query = query.gte('risk_score', minRiskScore);
    }
    
    if (maxRiskScore !== undefined) {
      query = query.lte('risk_score', maxRiskScore);
    }
    
    if (startDate) {
      query = query.gte('due_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('due_date', endDate);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching climate receivables:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    const result: ClimateReceivable[] = data.map(item => ({
      receivableId: item.receivable_id,
      assetId: item.asset_id,
      payerId: item.payer_id,
      amount: item.amount,
      dueDate: item.due_date,
      riskScore: item.risk_score,
      discountRate: item.discount_rate,
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
      payer: item.climate_payers ? {
        payerId: item.climate_payers.payer_id,
        name: item.climate_payers.name,
        creditRating: item.climate_payers.credit_rating,
        financialHealthScore: item.climate_payers.financial_health_score,
        paymentHistory: null, // This field isn't selected in the query
        createdAt: '', // These fields aren't selected in the query
        updatedAt: ''
      } as ClimatePayer : undefined,
      incentives: Array.isArray(item.climate_incentives) ? item.climate_incentives.map(incentive => ({
        incentiveId: incentive.incentive_id,
        type: incentive.type,
        amount: incentive.amount,
        status: incentive.status,
        expectedReceiptDate: incentive.expected_receipt_date,
        assetId: '', // This field isn't selected in the query
        receivableId: item.receivable_id,
        createdAt: '', // These fields aren't selected in the query
        updatedAt: ''
      } as ClimateIncentive)) : [],
      riskFactors: Array.isArray(item.climate_risk_factors) ? item.climate_risk_factors.map(factor => ({
        factorId: factor.factor_id,
        receivableId: item.receivable_id,
        productionRisk: factor.production_risk,
        creditRisk: factor.credit_risk,
        policyRisk: factor.policy_risk,
        createdAt: '', // These fields aren't selected in the query
        updatedAt: ''
      } as ClimateRiskFactor)) : [],
      policyImpacts: Array.isArray(item.climate_policy_impacts) ? item.climate_policy_impacts.map(impact => ({
        impactId: impact.impact_id,
        policyId: impact.policy_id,
        receivableId: item.receivable_id,
        assetId: '', // This field isn't selected in the query
        impactDescription: impact.impact_description,
        createdAt: '', // These fields aren't selected in the query
        updatedAt: ''
      } as ClimatePolicyImpact)) : []
    }));
    
    return result;
  },

  /**
   * Get a single climate receivable by ID
   * @param id Climate receivable ID
   */
  async getById(id: string): Promise<ClimateReceivable | null> {
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
        updated_at,
        energy_assets(
          asset_id,
          name,
          type,
          location,
          capacity
        ),
        climate_payers(
          payer_id,
          name,
          credit_rating,
          financial_health_score
        ),
        climate_incentives(
          incentive_id,
          type,
          amount,
          status,
          expected_receipt_date
        ),
        climate_risk_factors(
          factor_id,
          production_risk,
          credit_risk,
          policy_risk
        ),
        climate_policy_impacts(
          impact_id,
          policy_id,
          impact_description
        )
      `)
      .eq('receivable_id', id)
      .single();

    if (error) {
      console.error('Error fetching climate receivable by ID:', error);
      throw error;
    }

    if (!data) return null;

    // Transform the data to match our frontend types
    return {
      ...dbToUiClimateReceivable(data),
      asset: data.energy_assets ? {
        assetId: data.energy_assets.asset_id,
        name: data.energy_assets.name,
        type: data.energy_assets.type as EnergyAssetType,
        location: data.energy_assets.location,
        capacity: data.energy_assets.capacity,
        ownerId: '', // This field isn't selected in the query
        createdAt: '', // These fields aren't selected in the query
        updatedAt: ''
      } : undefined,
      payer: data.climate_payers ? {
        payerId: data.climate_payers.payer_id,
        name: data.climate_payers.name,
        creditRating: data.climate_payers.credit_rating,
        financialHealthScore: data.climate_payers.financial_health_score,
        paymentHistory: null, // This field isn't selected in the query
        createdAt: '', // These fields aren't selected in the query
        updatedAt: ''
      } : undefined,
      incentives: Array.isArray(data.climate_incentives) ? data.climate_incentives.map(incentive => ({
        incentiveId: incentive.incentive_id,
        type: incentive.type,
        amount: incentive.amount,
        status: incentive.status,
        expectedReceiptDate: incentive.expected_receipt_date,
        assetId: '', // This field isn't selected in the query
        receivableId: data.receivable_id,
        createdAt: '', // These fields aren't selected in the query
        updatedAt: ''
      })) : [],
      riskFactors: Array.isArray(data.climate_risk_factors) ? data.climate_risk_factors.map(factor => ({
        factorId: factor.factor_id,
        receivableId: data.receivable_id,
        productionRisk: factor.production_risk,
        creditRisk: factor.credit_risk,
        policyRisk: factor.policy_risk,
        createdAt: '', // These fields aren't selected in the query
        updatedAt: ''
      })) : [],
      policyImpacts: Array.isArray(data.climate_policy_impacts) ? data.climate_policy_impacts.map(impact => ({
        impactId: impact.impact_id,
        policyId: impact.policy_id,
        receivableId: data.receivable_id,
        assetId: '', // This field isn't selected in the query
        impactDescription: impact.impact_description,
        createdAt: '', // These fields aren't selected in the query
        updatedAt: ''
      })) : []
    };
  },

  /**
   * Create a new climate receivable
   * @param receivable Climate receivable to create
   */
  async create(receivable: InsertClimateReceivable): Promise<ClimateReceivable> {
    const { data, error } = await supabase
      .from('climate_receivables')
      .insert([receivable])
      .select()
      .single();

    if (error) {
      console.error('Error creating climate receivable:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    const createdReceivable = dbToUiClimateReceivable(data);

    // Trigger advanced risk calculation in the background for new receivables
    // This runs asynchronously without blocking the creation response
    setTimeout(async () => {
      try {
        await AutomatedRiskCalculationEngine.performAutomatedRiskCalculation(
          createdReceivable.receivableId,
          false // Don't force recalculation for new receivables
        );
        console.log(`Advanced risk calculation completed for new receivable: ${createdReceivable.receivableId}`);
      } catch (error) {
        console.warn(`Background risk calculation failed for receivable ${createdReceivable.receivableId}:`, error);
      }
    }, 1000); // Delay 1 second to allow database to be consistent

    return createdReceivable;
  },

  /**
   * Update an existing climate receivable
   * @param id Climate receivable ID
   * @param receivable Climate receivable data to update
   */
  async update(id: string, receivable: Partial<InsertClimateReceivable>): Promise<ClimateReceivable> {
    const { data, error } = await supabase
      .from('climate_receivables')
      .update(receivable)
      .eq('receivable_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating climate receivable:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    // Transform the database response to our UI model
    return dbToUiClimateReceivable(data);
  },

  /**
   * Delete a climate receivable
   * @param id Climate receivable ID
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('climate_receivables')
      .delete()
      .eq('receivable_id', id);

    if (error) {
      console.error('Error deleting climate receivable:', error);
      throw error;
    }
  },

  /**
   * Get summary statistics for receivables
   * Returns total amount, average risk score, and count by risk level
   */
  async getReceivablesSummary(): Promise<{
    totalAmount: number;
    averageRiskScore: number;
    countByRiskLevel: { low: number; medium: number; high: number };
  }> {
    const { data, error } = await supabase
      .from('climate_receivables')
      .select('amount, risk_score');

    if (error) {
      console.error('Error fetching receivables summary:', error);
      throw error;
    }

    // Calculate summary statistics
    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    
    const averageRiskScore = data.length > 0
      ? data.reduce((sum, item) => sum + (item.risk_score || 0), 0) / data.length
      : 0;
    
    const countByRiskLevel = data.reduce(
      (counts, item) => {
        const score = item.risk_score || 0;
        if (score < 30) counts.low++;
        else if (score < 70) counts.medium++;
        else counts.high++;
        return counts;
      },
      { low: 0, medium: 0, high: 0 }
    );

    return { totalAmount, averageRiskScore, countByRiskLevel };
  }
};
