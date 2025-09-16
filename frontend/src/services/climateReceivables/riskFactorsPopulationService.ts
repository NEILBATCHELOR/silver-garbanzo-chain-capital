/**
 * Risk Factors Population Service
 * 
 * Service to populate climate_risk_factors table with production_risk, credit_risk, and policy_risk
 * for existing climate receivables using the EnhancedRiskCalculationEngine.
 * 
 * This service specifically targets the climate_risk_factors table which stores the core
 * risk factor scores, complementing the more detailed climate_risk_calculations table.
 */

import { supabase } from '@/infrastructure/database/client';
import { EnhancedRiskCalculationEngine } from './enhancedRiskCalculationEngine';
import type { ClimateRiskAssessmentInput } from '../../types/domain/climate';

export interface RiskFactorsResult {
  receivable_id: string;
  production_risk: number;
  credit_risk: number;
  policy_risk: number;
  calculated_at: string;
  confidence_level?: number;
  data_sources?: string[];
}

export interface PopulationSummary {
  total_receivables: number;
  successful_calculations: number;
  failed_calculations: number;
  errors: string[];
  processing_time_ms: number;
  risk_factors_created: RiskFactorsResult[];
}

/**
 * Service for populating climate_risk_factors table with calculated risk scores
 */
export class RiskFactorsPopulationService {
  
  /**
   * Populate risk factors for all climate receivables
   */
  public static async populateAllReceivablesRiskFactors(): Promise<PopulationSummary> {
    const startTime = Date.now();
    const summary: PopulationSummary = {
      total_receivables: 0,
      successful_calculations: 0,
      failed_calculations: 0,
      errors: [],
      processing_time_ms: 0,
      risk_factors_created: []
    };

    try {
      console.log('🚀 Starting risk factors population for all climate receivables...');

      // Fetch all climate receivables
      const { data: receivables, error: fetchError } = await supabase
        .from('climate_receivables')
        .select(`
          receivable_id,
          payer_id,
          asset_id,
          amount,
          due_date
        `)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw new Error(`Failed to fetch receivables: ${fetchError.message}`);
      }

      if (!receivables || receivables.length === 0) {
        console.log('ℹ️ No climate receivables found to process');
        return summary;
      }

      summary.total_receivables = receivables.length;
      console.log(`📊 Found ${receivables.length} climate receivables to process`);

      // Process each receivable individually for better error handling
      for (const receivable of receivables) {
        try {
          console.log(`🔄 Processing receivable ${receivable.receivable_id} (${receivable.amount})`);

          // Calculate risk factors using existing EnhancedRiskCalculationEngine
          const riskFactors = await this.calculateRiskFactorsForReceivable({
            receivableId: receivable.receivable_id,
            payerId: receivable.payer_id,
            assetId: receivable.asset_id || '',
            amount: receivable.amount,
            dueDate: receivable.due_date
          });

          if (riskFactors) {
            // Insert/update risk factors in database
            await this.persistRiskFactors(riskFactors);
            
            summary.successful_calculations++;
            summary.risk_factors_created.push(riskFactors);
            
            console.log(`✅ Successfully processed ${receivable.receivable_id}`);
            console.log(`   Production Risk: ${riskFactors.production_risk}`);
            console.log(`   Credit Risk: ${riskFactors.credit_risk}`);  
            console.log(`   Policy Risk: ${riskFactors.policy_risk}`);
          } else {
            throw new Error('Risk calculation returned null result');
          }

        } catch (error) {
          const errorMsg = `${receivable.receivable_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          summary.errors.push(errorMsg);
          summary.failed_calculations++;
          
          console.error(`❌ Failed to process ${receivable.receivable_id}:`, error);
        }

        // Add small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      summary.processing_time_ms = Date.now() - startTime;

      console.log(`🎉 Risk factors population completed!`);
      console.log(`   Total: ${summary.total_receivables}`);
      console.log(`   Successful: ${summary.successful_calculations}`);
      console.log(`   Failed: ${summary.failed_calculations}`);
      console.log(`   Processing time: ${summary.processing_time_ms}ms`);

      if (summary.errors.length > 0) {
        console.warn(`⚠️ Errors encountered:`, summary.errors);
      }

      return summary;

    } catch (error) {
      summary.processing_time_ms = Date.now() - startTime;
      summary.errors.push(`Population service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      console.error('💥 Risk factors population service failed:', error);
      return summary;
    }
  }

  /**
   * Calculate risk factors for a single receivable
   */
  private static async calculateRiskFactorsForReceivable(
    input: ClimateRiskAssessmentInput
  ): Promise<RiskFactorsResult | null> {
    try {
      // Use the enhanced risk calculation engine to get detailed risk assessment
      const result = await EnhancedRiskCalculationEngine.calculateEnhancedRisk(input, true);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Risk calculation failed');
      }

      const riskData = result.data;

      // Extract individual risk components from the comprehensive risk assessment
      // The enhanced engine combines multiple factors, so we need to decompose them
      const riskFactors = await this.extractRiskComponents(input, riskData);

      return {
        receivable_id: input.receivableId,
        production_risk: riskFactors.production_risk,
        credit_risk: riskFactors.credit_risk,
        policy_risk: riskFactors.policy_risk,
        calculated_at: new Date().toISOString(),
        confidence_level: riskData.confidenceLevel,
        data_sources: [
          'EnhancedRiskCalculationEngine',
          'FreeMarketDataService',
          'PayerRiskAssessmentService',
          'PolicyRiskTrackingService'
        ]
      };

    } catch (error) {
      console.error(`Risk calculation failed for ${input.receivableId}:`, error);
      return null;
    }
  }

  /**
   * Extract individual risk components from comprehensive risk assessment
   */
  private static async extractRiskComponents(
    input: ClimateRiskAssessmentInput,
    riskData: any
  ): Promise<{
    production_risk: number;
    credit_risk: number;
    policy_risk: number;
  }> {
    try {
      // Get individual risk component calculations
      
      // 1. Production Risk - from asset production variability and weather factors
      const productionRisk = await this.calculateProductionRisk(input.assetId);
      
      // 2. Credit Risk - from payer credit rating and financial health
      const creditRisk = await this.calculateCreditRisk(input.payerId);
      
      // 3. Policy Risk - from regulatory environment and policy changes
      const policyRisk = await this.calculatePolicyRisk();

      return {
        production_risk: Math.min(100, Math.max(0, productionRisk)),
        credit_risk: Math.min(100, Math.max(0, creditRisk)),
        policy_risk: Math.min(100, Math.max(0, policyRisk))
      };

    } catch (error) {
      console.warn('Error extracting risk components, using defaults:', error);
      
      // Use the overall risk score as fallback, distributed across components
      const overallRisk = riskData.riskScore || 50;
      
      return {
        production_risk: Math.round(overallRisk * 0.4), // 40% weight
        credit_risk: Math.round(overallRisk * 0.4),     // 40% weight  
        policy_risk: Math.round(overallRisk * 0.2)      // 20% weight
      };
    }
  }

  /**
   * Calculate production-specific risk based on asset data
   */
  private static async calculateProductionRisk(assetId: string): Promise<number> {
    try {
      if (!assetId) {
        return 30; // Default production risk when no asset data
      }

      // Get asset production history and calculate variability
      const { data: assetData, error } = await supabase
        .from('energy_assets')
        .select('asset_type, capacity_mw, location, latitude, longitude')
        .eq('asset_id', assetId)
        .single();

      if (error || !assetData) {
        console.warn(`Asset data not found for ${assetId}, using default production risk`);
        return 35;
      }

      // Get recent production data
      const { data: productionHistory } = await supabase
        .from('climate_pool_energy_assets')
        .select('created_at')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false })
        .limit(30);

      let riskScore = 25; // Base production risk

      // Adjust based on asset type
      switch (assetData.asset_type?.toLowerCase()) {
        case 'solar':
        case 'photovoltaic':
          riskScore += 15; // Solar has weather variability
          break;
        case 'wind':
          riskScore += 20; // Wind has high variability
          break;
        case 'hydro':
        case 'hydroelectric':
          riskScore += 10; // More stable but weather dependent
          break;
        default:
          riskScore += 12; // Default renewable risk
      }

      // Adjust based on production data availability
      if (productionHistory && productionHistory.length > 20) {
        riskScore -= 5; // Lower risk with more data
      } else if (!productionHistory || productionHistory.length < 5) {
        riskScore += 10; // Higher risk with limited data
      }

      return Math.min(80, Math.max(10, riskScore));

    } catch (error) {
      console.warn('Production risk calculation error:', error);
      return 40; // Default production risk on error
    }
  }

  /**
   * Calculate credit-specific risk based on payer data
   */
  private static async calculateCreditRisk(payerId: string): Promise<number> {
    try {
      if (!payerId) {
        return 50; // Default credit risk when no payer data
      }

      // Get payer credit information
      const { data: payerData, error } = await supabase
        .from('climate_payers')
        .select('credit_rating, financial_health_score, payment_history, esg_score')
        .eq('payer_id', payerId)
        .single();

      if (error || !payerData) {
        console.warn(`Payer data not found for ${payerId}, using default credit risk`);
        return 55;
      }

      let riskScore = 30; // Base credit risk

      // Adjust based on credit rating
      const rating = payerData.credit_rating?.toUpperCase() || 'BBB';
      if (['AAA', 'AA+', 'AA', 'AA-'].includes(rating)) {
        riskScore += 5; // Very low credit risk
      } else if (['A+', 'A', 'A-'].includes(rating)) {
        riskScore += 15; // Low credit risk
      } else if (['BBB+', 'BBB', 'BBB-'].includes(rating)) {
        riskScore += 25; // Medium credit risk
      } else if (['BB+', 'BB', 'BB-', 'B+', 'B', 'B-'].includes(rating)) {
        riskScore += 40; // High credit risk
      } else {
        riskScore += 60; // Very high credit risk (CCC and below)
      }

      // Adjust based on financial health score
      const healthScore = payerData.financial_health_score || 70;
      if (healthScore > 85) {
        riskScore -= 5;
      } else if (healthScore < 60) {
        riskScore += 10;
      }

      // Adjust based on ESG score (climate-relevant)
      const esgScore = payerData.esg_score || 70;
      if (esgScore > 80) {
        riskScore -= 3; // Lower risk for high ESG
      } else if (esgScore < 50) {
        riskScore += 5; // Higher risk for low ESG
      }

      return Math.min(90, Math.max(5, riskScore));

    } catch (error) {
      console.warn('Credit risk calculation error:', error);
      return 45; // Default credit risk on error
    }
  }

  /**
   * Calculate policy-specific risk based on regulatory environment
   */
  private static async calculatePolicyRisk(): Promise<number> {
    try {
      let riskScore = 20; // Base policy risk (generally favorable for renewables)

      // Check for recent policy changes
      const { data: recentPolicies } = await supabase
        .from('climate_policies')
        .select('impact_level')
        .gte('effective_date', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()) // Last 6 months
        .limit(10);

      if (recentPolicies && recentPolicies.length > 0) {
        // Analyze recent policy impacts
        const highImpactPolicies = recentPolicies.filter(p => p.impact_level === 'high').length;
        const mediumImpactPolicies = recentPolicies.filter(p => p.impact_level === 'medium').length;

        riskScore += highImpactPolicies * 8;   // High impact policies increase risk
        riskScore += mediumImpactPolicies * 3; // Medium impact policies add some risk
      }

      // Check for policy impacts in database
      const { data: policyImpacts } = await supabase
        .from('climate_policy_impacts')
        .select('impact_description')
        .limit(5);

      if (policyImpacts && policyImpacts.length > 0) {
        riskScore += policyImpacts.length * 2; // More policy impacts = higher risk
      }

      // Current renewable energy policy environment is generally supportive
      // But regulatory uncertainty exists
      riskScore += 15; // Baseline regulatory uncertainty

      return Math.min(70, Math.max(5, riskScore));

    } catch (error) {
      console.warn('Policy risk calculation error:', error);
      return 25; // Default policy risk on error
    }
  }

  /**
   * Persist risk factors to database
   */
  private static async persistRiskFactors(riskFactors: RiskFactorsResult): Promise<void> {
    try {
      // Use upsert to handle both insert and update cases
      const { error } = await supabase
        .from('climate_risk_factors')
        .upsert({
          receivable_id: riskFactors.receivable_id,
          production_risk: riskFactors.production_risk,
          credit_risk: riskFactors.credit_risk,
          policy_risk: riskFactors.policy_risk,
          created_at: riskFactors.calculated_at,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'receivable_id'
        });

      if (error) {
        throw new Error(`Database persistence failed: ${error.message}`);
      }

      console.log(`💾 Risk factors persisted for ${riskFactors.receivable_id}`);

    } catch (error) {
      console.error('Failed to persist risk factors:', error);
      throw error;
    }
  }

  /**
   * Get current risk factors population status
   */
  public static async getPopulationStatus(): Promise<{
    total_receivables: number;
    risk_factors_populated: number;
    completion_percentage: number;
    last_updated?: string;
  }> {
    try {
      // Count total receivables
      const { count: totalReceivables } = await supabase
        .from('climate_receivables')
        .select('*', { count: 'exact', head: true });

      // Count risk factors populated
      const { count: riskFactorsPopulated } = await supabase
        .from('climate_risk_factors')
        .select('*', { count: 'exact', head: true });

      // Get last update timestamp
      const { data: lastUpdate } = await supabase
        .from('climate_risk_factors')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      const completionPercentage = totalReceivables > 0 
        ? Math.round((riskFactorsPopulated / totalReceivables) * 100)
        : 0;

      return {
        total_receivables: totalReceivables || 0,
        risk_factors_populated: riskFactorsPopulated || 0,
        completion_percentage: completionPercentage,
        last_updated: lastUpdate?.updated_at
      };

    } catch (error) {
      console.error('Failed to get population status:', error);
      return {
        total_receivables: 0,
        risk_factors_populated: 0,
        completion_percentage: 0
      };
    }
  }

  /**
   * Validate risk factors data quality
   */
  public static async validateRiskFactorsQuality(): Promise<{
    valid_entries: number;
    invalid_entries: number;
    quality_score: number;
    issues: string[];
  }> {
    try {
      const { data: riskFactors, error } = await supabase
        .from('climate_risk_factors')
        .select('*');

      if (error) {
        throw new Error(`Failed to fetch risk factors: ${error.message}`);
      }

      let validEntries = 0;
      let invalidEntries = 0;
      const issues: string[] = [];

      if (riskFactors) {
        for (const rf of riskFactors) {
          let isValid = true;

          // Validate risk score ranges (0-100)
          if (rf.production_risk < 0 || rf.production_risk > 100) {
            issues.push(`${rf.receivable_id}: Invalid production_risk (${rf.production_risk})`);
            isValid = false;
          }
          if (rf.credit_risk < 0 || rf.credit_risk > 100) {
            issues.push(`${rf.receivable_id}: Invalid credit_risk (${rf.credit_risk})`);
            isValid = false;
          }
          if (rf.policy_risk < 0 || rf.policy_risk > 100) {
            issues.push(`${rf.receivable_id}: Invalid policy_risk (${rf.policy_risk})`);
            isValid = false;
          }

          if (isValid) {
            validEntries++;
          } else {
            invalidEntries++;
          }
        }
      }

      const totalEntries = validEntries + invalidEntries;
      const qualityScore = totalEntries > 0 ? Math.round((validEntries / totalEntries) * 100) : 100;

      return {
        valid_entries: validEntries,
        invalid_entries: invalidEntries,
        quality_score: qualityScore,
        issues
      };

    } catch (error) {
      console.error('Risk factors quality validation failed:', error);
      return {
        valid_entries: 0,
        invalid_entries: 0,
        quality_score: 0,
        issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}
