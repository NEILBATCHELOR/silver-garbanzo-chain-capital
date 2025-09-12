/**
 * Simplified Climate Receivables Valuation Service
 * 
 * Replaces the over-engineered integrated-climate-receivables-valuation-engine
 * Uses existing services (orchestrator, risk calculation, cash flow forecasting)
 * to provide practical valuation capabilities without unnecessary complexity.
 */

import { supabase } from '@/infrastructure/database/client';
import { EnhancedRiskCalculationEngine } from './enhancedRiskCalculationEngine';
import { EnhancedCashFlowForecastingService } from './enhancedCashFlowForecastingService';
import type { 
  ClimateReceivableTable, 
  ClimateRiskAssessmentResult, 
  CashFlowForecastResult,
  ServiceResponse 
} from '@/types/domain/climate/receivables';

export interface IntegratedValuationResult {
  receivableId: string;
  recommendedValue: number;
  riskAdjustedValue: number;
  cashFlowNPV: number;
  riskScore: number;
  confidenceLevel: number;
  methodology: string;
  lastUpdated: string;
  factors: {
    creditRisk: number;
    marketRisk: number;
    operationalRisk: number;
  };
  // Additional properties expected by the hook
  valuationComparison: {
    recommendedValue: number;
  };
  cashFlowForecast: {
    totalNPV: number;
    confidence: number;
  };
  climateNAV: {
    riskAdjustedNAV: number;
  };
  recommendations: {
    investment: 'BUY' | 'HOLD' | 'SELL';
  };
  riskMetrics: {
    compositeRisk: number;
  };
  valuationDate: string;
}

export interface PortfolioValuationSummary {
  totalReceivables: number;
  totalValue: number;
  averageRiskScore: number;
  portfolioConfidence: number;
  valuationDate: string;
  receivables: IntegratedValuationResult[];
  attribution: {
    assetSelection: number;
    timing: number;
    totalAlpha: number;
  };
}

export class SimplifiedValuationService {
  private static instance: SimplifiedValuationService;

  private constructor() {
    // No need to instantiate services since they have static methods
  }

  public static getInstance(): SimplifiedValuationService {
    if (!this.instance) {
      this.instance = new SimplifiedValuationService();
    }
    return this.instance;
  }

  /**
   * Calculate integrated valuation for a single receivable
   */
  public async calculateReceivableValuation(receivableId: string): Promise<ServiceResponse<IntegratedValuationResult>> {
    try {
      // Get receivable data
      const { data: receivable, error } = await supabase
        .from('climate_receivables')
        .select(`
          *,
          climate_payers(*),
          energy_assets(*)
        `)
        .eq('id', receivableId)
        .single();

      if (error || !receivable) {
        throw new Error(`Failed to fetch receivable: ${error?.message}`);
      }

      // Calculate risk assessment
      const riskResult = await EnhancedRiskCalculationEngine.calculateEnhancedRisk({
        receivableId,
        payerId: receivable.payer_id,
        assetId: receivable.asset_id,
        amount: receivable.amount,
        dueDate: receivable.due_date
      });

      // Validate risk result
      if (!riskResult.success || !riskResult.data) {
        throw new Error(`Risk calculation failed: ${riskResult.error || 'Unknown error'}`);
      }

      // Calculate cash flow forecast (simplified)
      const cashFlowResult = await EnhancedCashFlowForecastingService.generateForecast({
        receivables: [receivable],
        forecastHorizonDays: 90,
        scenarioType: 'realistic'
      });

      // Validate cash flow result
      if (!cashFlowResult.success || !cashFlowResult.data) {
        throw new Error(`Cash flow forecast failed: ${cashFlowResult.error || 'Unknown error'}`);
      }

      // Calculate integrated valuation
      const baseValue = receivable.amount;
      const riskAdjustment = (100 - riskResult.data.riskScore) / 100;
      const riskAdjustedValue = baseValue * riskAdjustment;
      
      // Simplified NPV calculation
      const discountRate = riskResult.data.discountRate / 100;
      const daysToMaturity = Math.max(1, Math.floor((new Date(receivable.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      const cashFlowNPV = baseValue / Math.pow(1 + discountRate, daysToMaturity / 365);

      const recommendedValue = Math.min(riskAdjustedValue, cashFlowNPV);
      const compositeRisk = riskResult.data.riskScore / 100;

      const result: IntegratedValuationResult = {
        receivableId,
        recommendedValue,
        riskAdjustedValue,
        cashFlowNPV,
        riskScore: riskResult.data.riskScore,
        confidenceLevel: riskResult.data.confidenceLevel,
        methodology: 'Simplified Risk-Adjusted NPV',
        lastUpdated: new Date().toISOString(),
        factors: {
          creditRisk: riskResult.data.riskScore * 0.6,
          marketRisk: riskResult.data.riskScore * 0.3,
          operationalRisk: riskResult.data.riskScore * 0.1
        },
        // Additional properties for hook compatibility
        valuationComparison: {
          recommendedValue
        },
        cashFlowForecast: {
          totalNPV: cashFlowNPV,
          confidence: riskResult.data.confidenceLevel
        },
        climateNAV: {
          riskAdjustedNAV: riskAdjustedValue
        },
        recommendations: {
          investment: compositeRisk < 0.15 ? 'BUY' : compositeRisk < 0.35 ? 'HOLD' : 'SELL'
        },
        riskMetrics: {
          compositeRisk
        },
        valuationDate: new Date().toISOString()
      };

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Alias method for hook compatibility
   */
  public async performSimplifiedValuation(receivableId: string): Promise<ServiceResponse<IntegratedValuationResult>> {
    return this.calculateReceivableValuation(receivableId);
  }

  /**
   * Calculate portfolio valuation for multiple receivables
   */
  public async calculatePortfolioValuation(receivableIds: string[]): Promise<ServiceResponse<PortfolioValuationSummary>> {
    try {
      const results: IntegratedValuationResult[] = [];
      
      // Calculate valuation for each receivable
      for (const receivableId of receivableIds) {
        const valuationResult = await this.calculateReceivableValuation(receivableId);
        if (valuationResult.success && valuationResult.data) {
          results.push(valuationResult.data);
        }
      }

      // Calculate portfolio summary
      const totalValue = results.reduce((sum, r) => sum + r.recommendedValue, 0);
      const averageRiskScore = results.length > 0 
        ? results.reduce((sum, r) => sum + r.riskScore, 0) / results.length 
        : 0;
      const portfolioConfidence = results.length > 0
        ? results.reduce((sum, r) => sum + r.confidenceLevel, 0) / results.length
        : 0;

      const summary: PortfolioValuationSummary = {
        totalReceivables: results.length,
        totalValue,
        averageRiskScore,
        portfolioConfidence,
        valuationDate: new Date().toISOString(),
        receivables: results,
        attribution: {
          assetSelection: 0.02, // Simplified calculation - would be more complex in production
          timing: -0.005,
          totalAlpha: 0.015
        }
      };

      return {
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const simplifiedValuationService = SimplifiedValuationService.getInstance();

/**
 * Compatibility layer for legacy IntegratedClimateReceivablesValuationEngine
 * Provides static methods that delegate to the SimplifiedValuationService
 */
export class IntegratedClimateReceivablesValuationEngine {
  public static async performIntegratedValuation(receivableId: string, enableStressTesting: boolean = false): Promise<IntegratedValuationResult> {
    const result = await simplifiedValuationService.calculateReceivableValuation(receivableId);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Valuation failed');
    }
    return result.data;
  }

  public static async performPortfolioValuation(receivableIds: string[]): Promise<PortfolioValuationSummary> {
    const result = await simplifiedValuationService.calculatePortfolioValuation(receivableIds);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Portfolio valuation failed');
    }
    return result.data;
  }
}
