import { supabase } from '@/infrastructure/database/client';
import { 
  ClimateReceivable, 
  ClimateIncentive, 
  EnergyAsset,
  ProductionData,
  WeatherData
} from '../../types';
import { WeatherDataService } from '../api/weather-data-service';
import { RiskAssessmentService } from './risk-assessment-service';

/**
 * Cash flow projection interface
 */
interface CashFlowProjection {
  projectionId: string;
  projectionDate: string;
  projectedAmount: number;
  sourceType: 'receivable' | 'incentive' | 'production_revenue' | 'rec_sales' | 'carbon_offsets';
  entityId: string;
  confidence: number;
  scenarios: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
  riskFactors: string[];
}

/**
 * Comprehensive cash flow forecast result
 */
interface CashFlowForecast {
  totalProjected: number;
  projectionPeriod: {
    startDate: string;
    endDate: string;
  };
  monthlyBreakdown: {
    month: string;
    receivables: number;
    incentives: number;
    productionRevenue: number;
    recSales: number;
    carbonOffsets: number;
    total: number;
    confidence: number;
  }[];
  scenarios: {
    optimistic: { total: number; breakdown: Record<string, number> };
    realistic: { total: number; breakdown: Record<string, number> };
    pessimistic: { total: number; breakdown: Record<string, number> };
  };
  keyRisks: string[];
  recommendations: string[];
}

/**
 * Production forecast result
 */
interface ProductionForecast {
  assetId: string;
  projectedOutput: number;
  projectedRevenue: number;
  confidence: number;
  weatherFactors: {
    averageSunlight?: number;
    averageWindSpeed?: number;
    averageTemperature?: number;
  };
  seasonalAdjustment: number;
}

/**
 * Service for comprehensive cash flow forecasting including receivables, incentives, and production revenue
 */
export class CashFlowForecastingService {
  private static readonly FORECAST_HORIZON_MONTHS = 12; // Default 12-month horizon
  private static readonly CONFIDENCE_THRESHOLD = 0.7; // Minimum confidence for reliable projections
  private static readonly SEASONAL_FACTORS = {
    // Monthly production factors (0-1) for renewable energy (Northern Hemisphere)
    solar: [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.1, 1.0, 0.9, 0.8, 0.6, 0.5],
    wind: [1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1],
    hydro: [0.8, 0.8, 0.9, 1.1, 1.2, 1.0, 0.8, 0.7, 0.7, 0.8, 0.9, 0.8]
  };

  /**
   * Generate comprehensive cash flow forecast
   * @param assetIds Optional array of asset IDs to include (defaults to all)
   * @param horizonMonths Forecast horizon in months (defaults to 12)
   * @param includeScenarios Whether to include scenario analysis
   * @returns Comprehensive cash flow forecast
   */
  public static async generateForecast(
    assetIds?: string[],
    horizonMonths: number = this.FORECAST_HORIZON_MONTHS,
    includeScenarios: boolean = true
  ): Promise<CashFlowForecast> {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + horizonMonths);

      // Get all relevant data
      const [receivables, incentives, assets] = await Promise.all([
        this.getActiveReceivables(assetIds),
        this.getExpectedIncentives(assetIds, startDate, endDate),
        this.getEnergyAssets(assetIds)
      ]);

      // Generate monthly projections
      const monthlyBreakdown = await this.generateMonthlyBreakdown(
        receivables,
        incentives,
        assets,
        startDate,
        endDate
      );

      // Calculate total projected amount
      const totalProjected = monthlyBreakdown.reduce((sum, month) => sum + month.total, 0);

      // Generate scenarios if requested
      let scenarios = {
        optimistic: { total: totalProjected, breakdown: {} as Record<string, number> },
        realistic: { total: totalProjected, breakdown: {} as Record<string, number> },
        pessimistic: { total: totalProjected, breakdown: {} as Record<string, number> }
      };

      if (includeScenarios) {
        scenarios = await this.generateScenarios(monthlyBreakdown);
      }

      // Identify key risks
      const keyRisks = await this.identifyKeyRisks(receivables, incentives, assets);

      // Generate recommendations
      const recommendations = this.generateRecommendations(monthlyBreakdown, keyRisks);

      // Save projections to database
      await this.saveProjections(monthlyBreakdown);

      return {
        totalProjected,
        projectionPeriod: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        monthlyBreakdown,
        scenarios,
        keyRisks,
        recommendations
      };
    } catch (error) {
      console.error('Error generating cash flow forecast:', error);
      throw error;
    }
  }

  /**
   * Forecast production revenue for energy assets
   * @param assetIds Array of asset IDs
   * @param forecastMonths Number of months to forecast
   * @returns Production forecast for each asset
   */
  public static async forecastProductionRevenue(
    assetIds: string[],
    forecastMonths: number = 12
  ): Promise<ProductionForecast[]> {
    try {
      const forecasts: ProductionForecast[] = [];

      for (const assetId of assetIds) {
        const forecast = await this.forecastAssetProduction(assetId, forecastMonths);
        forecasts.push(forecast);
      }

      return forecasts;
    } catch (error) {
      console.error('Error forecasting production revenue:', error);
      throw error;
    }
  }

  /**
   * Update cash flow projections based on new data
   * @param receivableId Optional specific receivable to update
   * @returns Updated projections
   */
  public static async updateProjections(receivableId?: string): Promise<void> {
    try {
      if (receivableId) {
        // Update projections for specific receivable
        await this.updateReceivableProjection(receivableId);
      } else {
        // Regenerate all projections
        const forecast = await this.generateForecast();
        console.log('Cash flow projections updated:', forecast.totalProjected);
      }
    } catch (error) {
      console.error('Error updating cash flow projections:', error);
      throw error;
    }
  }

  /**
   * Get active receivables for forecasting
   * @param assetIds Optional asset filter
   * @returns Array of active receivables
   */
  private static async getActiveReceivables(assetIds?: string[]): Promise<ClimateReceivable[]> {
    try {
      let query = supabase
        .from('climate_receivables')
        .select(`
          *,
          energy_assets!climate_receivables_asset_id_fkey(*),
          climate_payers!climate_receivables_payer_id_fkey(*)
        `)
        .gte('due_date', new Date().toISOString().split('T')[0]);

      if (assetIds && assetIds.length > 0) {
        query = query.in('asset_id', assetIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(item => ({
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
          ownerId: item.energy_assets.owner_id,
          createdAt: item.energy_assets.created_at,
          updatedAt: item.energy_assets.updated_at
        } : undefined,
        payer: item.climate_payers ? {
          payerId: item.climate_payers.payer_id,
          name: item.climate_payers.name,
          creditRating: item.climate_payers.credit_rating,
          financialHealthScore: item.climate_payers.financial_health_score,
          paymentHistory: item.climate_payers.payment_history,
          createdAt: item.climate_payers.created_at,
          updatedAt: item.climate_payers.updated_at
        } : undefined
      }));
    } catch (error) {
      console.error('Error getting active receivables:', error);
      return [];
    }
  }

  /**
   * Get expected incentives for forecast period
   * @param assetIds Optional asset filter
   * @param startDate Start of forecast period
   * @param endDate End of forecast period
   * @returns Array of expected incentives
   */
  private static async getExpectedIncentives(
    assetIds: string[] | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<ClimateIncentive[]> {
    try {
      let query = supabase
        .from('climate_incentives')
        .select('*')
        .gte('expected_receipt_date', startDate.toISOString().split('T')[0])
        .lte('expected_receipt_date', endDate.toISOString().split('T')[0])
        .in('status', ['applied', 'approved']);

      if (assetIds && assetIds.length > 0) {
        query = query.in('asset_id', assetIds);
      }

      const { data, error } = await query;
      if (error) throw error;

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
    } catch (error) {
      console.error('Error getting expected incentives:', error);
      return [];
    }
  }

  /**
   * Get energy assets for forecasting
   * @param assetIds Optional asset filter
   * @returns Array of energy assets
   */
  private static async getEnergyAssets(assetIds?: string[]): Promise<EnergyAsset[]> {
    try {
      let query = supabase
        .from('energy_assets')
        .select('*');

      if (assetIds && assetIds.length > 0) {
        query = query.in('asset_id', assetIds);
      }

      const { data, error } = await query;
      if (error) throw error;

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
    } catch (error) {
      console.error('Error getting energy assets:', error);
      return [];
    }
  }

  /**
   * Generate monthly breakdown of cash flows
   * @param receivables Active receivables
   * @param incentives Expected incentives
   * @param assets Energy assets
   * @param startDate Start of forecast period
   * @param endDate End of forecast period
   * @returns Monthly breakdown
   */
  private static async generateMonthlyBreakdown(
    receivables: ClimateReceivable[],
    incentives: ClimateIncentive[],
    assets: EnergyAsset[],
    startDate: Date,
    endDate: Date
  ): Promise<CashFlowForecast['monthlyBreakdown']> {
    const monthlyBreakdown: CashFlowForecast['monthlyBreakdown'] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const month = currentDate.toISOString().slice(0, 7); // YYYY-MM format
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Calculate receivables for this month
      const monthReceivables = receivables
        .filter(r => {
          const dueDate = new Date(r.dueDate);
          return dueDate >= monthStart && dueDate <= monthEnd;
        })
        .reduce((sum, r) => sum + r.amount, 0);

      // Calculate incentives for this month
      const monthIncentives = incentives
        .filter(i => {
          if (!i.expectedReceiptDate) return false;
          const receiptDate = new Date(i.expectedReceiptDate);
          return receiptDate >= monthStart && receiptDate <= monthEnd;
        })
        .reduce((sum, i) => sum + i.amount, 0);

      // Forecast production revenue for this month
      const productionRevenue = await this.forecastMonthlyProductionRevenue(
        assets,
        currentDate.getMonth()
      );

      // Estimate REC sales (simplified)
      const recSales = productionRevenue * 0.1; // Assume 10% of production revenue comes from RECs

      // Estimate carbon offset revenue (simplified)
      const carbonOffsets = productionRevenue * 0.05; // Assume 5% from carbon offsets

      const total = monthReceivables + monthIncentives + productionRevenue + recSales + carbonOffsets;

      // Calculate confidence based on data quality
      const confidence = this.calculateMonthlyConfidence(
        receivables.filter(r => {
          const dueDate = new Date(r.dueDate);
          return dueDate >= monthStart && dueDate <= monthEnd;
        }),
        incentives.filter(i => {
          if (!i.expectedReceiptDate) return false;
          const receiptDate = new Date(i.expectedReceiptDate);
          return receiptDate >= monthStart && receiptDate <= monthEnd;
        }),
        assets,
        currentDate
      );

      monthlyBreakdown.push({
        month,
        receivables: monthReceivables,
        incentives: monthIncentives,
        productionRevenue,
        recSales,
        carbonOffsets,
        total,
        confidence
      });

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return monthlyBreakdown;
  }

  /**
   * Forecast production revenue for a specific month
   * @param assets Energy assets
   * @param month Month number (0-11)
   * @returns Forecasted production revenue
   */
  private static async forecastMonthlyProductionRevenue(
    assets: EnergyAsset[],
    month: number
  ): Promise<number> {
    let totalRevenue = 0;

    for (const asset of assets) {
      // Get seasonal factor
      const seasonalFactors = this.SEASONAL_FACTORS[asset.type as keyof typeof this.SEASONAL_FACTORS] || 
                             this.SEASONAL_FACTORS.solar;
      const seasonalFactor = seasonalFactors[month] || 1.0;

      // Estimate base monthly production (capacity * hours in month * capacity factor)
      const hoursInMonth = new Date(new Date().getFullYear(), month + 1, 0).getDate() * 24;
      const capacityFactor = asset.type === 'solar' ? 0.2 : asset.type === 'wind' ? 0.35 : 0.4;
      const baseProduction = asset.capacity * hoursInMonth * capacityFactor * seasonalFactor;

      // Estimate revenue per MWh (simplified)
      const revenuePerMWh = 50; // $50/MWh average
      const assetRevenue = baseProduction * revenuePerMWh;

      totalRevenue += assetRevenue;
    }

    return totalRevenue;
  }

  /**
   * Calculate confidence level for monthly projections
   * @param receivables Receivables for the month
   * @param incentives Incentives for the month
   * @param assets Energy assets
   * @param date Month date
   * @returns Confidence level (0-1)
   */
  private static calculateMonthlyConfidence(
    receivables: ClimateReceivable[],
    incentives: ClimateIncentive[],
    assets: EnergyAsset[],
    date: Date
  ): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for near-term months
    const monthsOut = Math.abs(date.getMonth() - new Date().getMonth());
    confidence += Math.max(0, (12 - monthsOut) / 12 * 0.3);

    // Higher confidence if we have receivables with good credit ratings
    if (receivables.length > 0) {
      const avgCreditScore = receivables
        .filter(r => r.payer?.financialHealthScore)
        .reduce((sum, r) => sum + (r.payer!.financialHealthScore || 50), 0) / 
        Math.max(1, receivables.filter(r => r.payer?.financialHealthScore).length);
      confidence += (avgCreditScore / 100) * 0.2;
    }

    // Higher confidence for approved incentives
    const approvedIncentives = incentives.filter(i => i.status === 'approved').length;
    const totalIncentives = Math.max(1, incentives.length);
    confidence += (approvedIncentives / totalIncentives) * 0.2;

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate scenario analysis
   * @param monthlyBreakdown Base monthly projections
   * @returns Scenario analysis results
   */
  private static async generateScenarios(
    monthlyBreakdown: CashFlowForecast['monthlyBreakdown']
  ): Promise<CashFlowForecast['scenarios']> {
    const optimisticMultiplier = 1.2; // 20% better than realistic
    const pessimisticMultiplier = 0.8; // 20% worse than realistic

    const realistic = {
      total: monthlyBreakdown.reduce((sum, month) => sum + month.total, 0),
      breakdown: {
        receivables: monthlyBreakdown.reduce((sum, month) => sum + month.receivables, 0),
        incentives: monthlyBreakdown.reduce((sum, month) => sum + month.incentives, 0),
        productionRevenue: monthlyBreakdown.reduce((sum, month) => sum + month.productionRevenue, 0),
        recSales: monthlyBreakdown.reduce((sum, month) => sum + month.recSales, 0),
        carbonOffsets: monthlyBreakdown.reduce((sum, month) => sum + month.carbonOffsets, 0)
      }
    };

    const optimistic = {
      total: realistic.total * optimisticMultiplier,
      breakdown: Object.fromEntries(
        Object.entries(realistic.breakdown).map(([key, value]) => [key, value * optimisticMultiplier])
      )
    };

    const pessimistic = {
      total: realistic.total * pessimisticMultiplier,
      breakdown: Object.fromEntries(
        Object.entries(realistic.breakdown).map(([key, value]) => [key, value * pessimisticMultiplier])
      )
    };

    return { optimistic, realistic, pessimistic };
  }

  /**
   * Identify key risks affecting cash flow projections
   * @param receivables Active receivables
   * @param incentives Expected incentives
   * @param assets Energy assets
   * @returns Array of key risk descriptions
   */
  private static async identifyKeyRisks(
    receivables: ClimateReceivable[],
    incentives: ClimateIncentive[],
    assets: EnergyAsset[]
  ): Promise<string[]> {
    const risks: string[] = [];

    // Assess credit risks
    const highRiskReceivables = receivables.filter(r => (r.riskScore || 0) > 70);
    if (highRiskReceivables.length > 0) {
      risks.push(`${highRiskReceivables.length} receivables have high credit risk (score > 70)`);
    }

    // Assess incentive risks
    const pendingIncentives = incentives.filter(i => i.status === 'applied');
    if (pendingIncentives.length > 0) {
      const pendingAmount = pendingIncentives.reduce((sum, i) => sum + i.amount, 0);
      risks.push(`$${pendingAmount.toLocaleString()} in incentives still pending approval`);
    }

    // Assess production risks
    const weatherDependentAssets = assets.filter(a => a.type === 'solar' || a.type === 'wind');
    if (weatherDependentAssets.length > 0) {
      risks.push('Production revenue dependent on weather conditions for renewable assets');
    }

    // Assess concentration risks
    const payerCounts = receivables.reduce((acc, r) => {
      acc[r.payerId] = (acc[r.payerId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const maxConcentration = Math.max(...Object.values(payerCounts));
    if (maxConcentration > receivables.length * 0.3) {
      risks.push('High concentration risk: single payer represents >30% of receivables');
    }

    return risks;
  }

  /**
   * Generate recommendations based on forecast analysis
   * @param monthlyBreakdown Monthly projections
   * @param keyRisks Identified risks
   * @returns Array of recommendations
   */
  private static generateRecommendations(
    monthlyBreakdown: CashFlowForecast['monthlyBreakdown'],
    keyRisks: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Analyze cash flow patterns
    const monthlyTotals = monthlyBreakdown.map(m => m.total);
    const avgMonthly = monthlyTotals.reduce((sum, total) => sum + total, 0) / monthlyTotals.length;
    const variance = monthlyTotals.reduce((sum, total) => sum + Math.pow(total - avgMonthly, 2), 0) / monthlyTotals.length;
    const volatility = Math.sqrt(variance) / avgMonthly;

    if (volatility > 0.3) {
      recommendations.push('Consider smoothing cash flows through factoring high-volatility receivables');
    }

    // Low confidence months
    const lowConfidenceMonths = monthlyBreakdown.filter(m => m.confidence < this.CONFIDENCE_THRESHOLD);
    if (lowConfidenceMonths.length > 0) {
      recommendations.push(`Improve data quality for ${lowConfidenceMonths.length} months with low forecast confidence`);
    }

    // High incentive dependency
    const incentiveDependency = monthlyBreakdown.reduce((sum, m) => sum + m.incentives, 0) / 
                                monthlyBreakdown.reduce((sum, m) => sum + m.total, 0);
    if (incentiveDependency > 0.25) {
      recommendations.push('High dependency on incentives (>25%) - consider diversifying revenue sources');
    }

    // Risk-based recommendations
    if (keyRisks.some(risk => risk.includes('high credit risk'))) {
      recommendations.push('Consider credit insurance or collateral for high-risk receivables');
    }

    if (keyRisks.some(risk => risk.includes('weather conditions'))) {
      recommendations.push('Consider weather hedging or production insurance for weather-dependent assets');
    }

    return recommendations;
  }

  /**
   * Save cash flow projections to database
   * @param monthlyBreakdown Monthly projections to save
   */
  private static async saveProjections(
    monthlyBreakdown: CashFlowForecast['monthlyBreakdown']
  ): Promise<void> {
    try {
      // Clear existing projections for future dates
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('climate_cash_flow_projections')
        .delete()
        .gte('projection_date', today);

      // Insert new projections
      const projections = monthlyBreakdown.flatMap(month => [
        {
          projection_date: `${month.month}-15`, // Mid-month date
          projected_amount: month.receivables,
          source_type: 'receivable'
        },
        {
          projection_date: `${month.month}-15`,
          projected_amount: month.incentives,
          source_type: 'incentive'
        },
        {
          projection_date: `${month.month}-15`,
          projected_amount: month.productionRevenue,
          source_type: 'production_revenue'
        },
        {
          projection_date: `${month.month}-15`,
          projected_amount: month.recSales,
          source_type: 'rec_sales'
        },
        {
          projection_date: `${month.month}-15`,
          projected_amount: month.carbonOffsets,
          source_type: 'carbon_offsets'
        }
      ]);

      const { error } = await supabase
        .from('climate_cash_flow_projections')
        .insert(projections);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving cash flow projections:', error);
      throw error;
    }
  }

  /**
   * Forecast production for a specific asset
   * @param assetId Asset ID
   * @param forecastMonths Number of months to forecast
   * @returns Production forecast
   */
  private static async forecastAssetProduction(
    assetId: string,
    forecastMonths: number
  ): Promise<ProductionForecast> {
    try {
      // Get asset data
      const { data: asset, error: assetError } = await supabase
        .from('energy_assets')
        .select('*')
        .eq('asset_id', assetId)
        .single();

      if (assetError) throw assetError;

      // Get historical production data
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data: historicalData, error: histError } = await supabase
        .from('production_data')
        .select('*')
        .eq('asset_id', assetId)
        .gte('production_date', oneYearAgo.toISOString().split('T')[0])
        .order('production_date', { ascending: true });

      if (histError) throw histError;

      // Calculate base production metrics
      const avgMonthlyOutput = historicalData.length > 0 
        ? historicalData.reduce((sum, d) => sum + d.output_mwh, 0) / Math.max(1, historicalData.length) * 30
        : asset.capacity * 24 * 30 * 0.25; // Default capacity factor

      // Get weather forecast for asset location
      const weatherForecast = await WeatherDataService.getForecastWeather(asset.location, 7);
      
      // Calculate weather factors
      const weatherFactors = {
        averageSunlight: weatherForecast.reduce((sum, w) => sum + (w.sunlightHours || 0), 0) / weatherForecast.length,
        averageWindSpeed: weatherForecast.reduce((sum, w) => sum + (w.windSpeed || 0), 0) / weatherForecast.length,
        averageTemperature: weatherForecast.reduce((sum, w) => sum + (w.temperature || 0), 0) / weatherForecast.length
      };

      // Apply seasonal adjustment
      const currentMonth = new Date().getMonth();
      const seasonalFactors = this.SEASONAL_FACTORS[asset.type as keyof typeof this.SEASONAL_FACTORS] || 
                             this.SEASONAL_FACTORS.solar;
      const seasonalAdjustment = seasonalFactors[currentMonth] || 1.0;

      // Calculate projected output for forecast period
      const projectedOutput = avgMonthlyOutput * forecastMonths * seasonalAdjustment;

      // Estimate revenue (simplified)
      const revenuePerMWh = 50; // $50/MWh average
      const projectedRevenue = projectedOutput * revenuePerMWh;

      // Calculate confidence
      const confidence = historicalData.length > 12 ? 0.8 : 0.6; // Higher confidence with more data

      return {
        assetId,
        projectedOutput,
        projectedRevenue,
        confidence,
        weatherFactors,
        seasonalAdjustment
      };
    } catch (error) {
      console.error(`Error forecasting production for asset ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * Update projection for a specific receivable
   * @param receivableId Receivable ID
   */
  private static async updateReceivableProjection(receivableId: string): Promise<void> {
    try {
      // Get receivable data
      const { data: receivable, error } = await supabase
        .from('climate_receivables')
        .select('*')
        .eq('receivable_id', receivableId)
        .single();

      if (error) throw error;

      // Update or create projection
      const projectionData = {
        projection_date: receivable.due_date,
        projected_amount: receivable.amount,
        source_type: 'receivable' as const,
        entity_id: receivableId
      };

      // Upsert projection
      const { error: upsertError } = await supabase
        .from('climate_cash_flow_projections')
        .upsert(projectionData, {
          onConflict: 'projection_date,source_type,entity_id'
        });

      if (upsertError) throw upsertError;
    } catch (error) {
      console.error(`Error updating projection for receivable ${receivableId}:`, error);
      throw error;
    }
  }
}
