/**
 * Redemption Analytics Service
 * Provides metrics, reporting, and performance analytics
 */

import { supabase } from '@/infrastructure/supabaseClient';

export interface RedemptionMetrics {
  // Volume metrics
  totalRedemptions: number;
  totalVolume: string; // Token amount
  totalSettlementValue: string; // USDC/USDT value
  
  // Status distribution
  statusDistribution: {
    pending: number;
    validated: number;
    approved: number;
    processing: number;
    completed: number;
    failed: number;
  };
  
  // Performance metrics
  averageProcessingTime: number; // seconds
  medianProcessingTime: number; // seconds
  p95ProcessingTime: number; // seconds
  
  // Success rates
  approvalRate: number; // percentage
  settlementSuccessRate: number; // percentage
  completionRate: number; // percentage
  
  // Operational metrics
  pendingApprovals: number;
  pendingTransfers: number;
  failedTransactions: number;
  
  // Cost metrics
  totalGasCost: string;
  averageGasCost: string;
  
  // Time period
  periodStart: Date;
  periodEnd: Date;
}

export interface TimeSeriesData {
  date: string;
  redemptions: number;
  volume: string;
  completed: number;
  failed: number;
}

export interface PerformanceBreakdown {
  stage: string;
  averageTime: number; // seconds
  minTime: number;
  maxTime: number;
  count: number;
}

export class RedemptionAnalytics {
  /**
   * Get overall redemption metrics for a time period
   */
  async getMetrics(
    startDate: Date,
    endDate: Date,
    projectId?: string
  ): Promise<RedemptionMetrics> {
    let query = supabase
      .from('redemption_requests')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: redemptions } = await query;

    if (!redemptions || redemptions.length === 0) {
      return this.getEmptyMetrics(startDate, endDate);
    }

    // Calculate volume metrics
    const totalVolume = redemptions
      .reduce((sum, r) => sum + parseFloat(r.token_amount || '0'), 0)
      .toString();
    
    const totalSettlementValue = redemptions
      .reduce((sum, r) => {
        const amount = parseFloat(r.token_amount || '0');
        const rate = parseFloat(r.conversion_rate || '1');
        return sum + (amount * rate);
      }, 0)
      .toString();

    // Calculate status distribution
    const statusDistribution = {
      pending: redemptions.filter(r => r.status === 'pending').length,
      validated: redemptions.filter(r => r.status === 'validated').length,
      approved: redemptions.filter(r => r.status === 'approved').length,
      processing: redemptions.filter(r => r.status === 'processing').length,
      completed: redemptions.filter(r => r.status === 'completed').length,
      failed: redemptions.filter(r => r.status === 'failed').length
    };

    // Calculate processing times (completed redemptions only)
    const completedRedemptions = redemptions.filter(r => r.status === 'completed');
    const processingTimes = completedRedemptions.map(r => {
      const created = new Date(r.created_at).getTime();
      const updated = new Date(r.updated_at).getTime();
      return (updated - created) / 1000; // Convert to seconds
    }).sort((a, b) => a - b);

    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length
      : 0;

    const medianProcessingTime = processingTimes.length > 0
      ? processingTimes[Math.floor(processingTimes.length / 2)]
      : 0;

    const p95ProcessingTime = processingTimes.length > 0
      ? processingTimes[Math.floor(processingTimes.length * 0.95)]
      : 0;

    // Calculate success rates
    const total = redemptions.length;
    const approved = statusDistribution.approved + statusDistribution.processing + statusDistribution.completed;
    const approvalRate = total > 0 ? (approved / total) * 100 : 0;
    const settlementSuccessRate = total > 0 ? (statusDistribution.completed / total) * 100 : 0;
    const completionRate = settlementSuccessRate;

    // Operational metrics
    const pendingApprovals = statusDistribution.validated;
    const pendingTransfers = statusDistribution.approved;
    const failedTransactions = statusDistribution.failed;

    // Get gas costs
    const { data: transfers } = await supabase
      .from('transfer_operations')
      .select('gas_estimate')
      .in('redemption_id', redemptions.map(r => r.id));

    const totalGas = transfers?.reduce((sum, t) => sum + parseFloat(t.gas_estimate || '0'), 0) || 0;
    const averageGas = transfers && transfers.length > 0 ? totalGas / transfers.length : 0;

    return {
      totalRedemptions: total,
      totalVolume,
      totalSettlementValue,
      statusDistribution,
      averageProcessingTime,
      medianProcessingTime,
      p95ProcessingTime,
      approvalRate,
      settlementSuccessRate,
      completionRate,
      pendingApprovals,
      pendingTransfers,
      failedTransactions,
      totalGasCost: totalGas.toString(),
      averageGasCost: averageGas.toString(),
      periodStart: startDate,
      periodEnd: endDate
    };
  }

  /**
   * Get time series data for charts
   */
  async getTimeSeriesData(
    startDate: Date,
    endDate: Date,
    projectId?: string
  ): Promise<TimeSeriesData[]> {
    let query = supabase
      .from('redemption_requests')
      .select('created_at, token_amount, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: redemptions } = await query;

    if (!redemptions || redemptions.length === 0) {
      return [];
    }

    // Group by date
    const dataByDate = new Map<string, {
      redemptions: number;
      volume: number;
      completed: number;
      failed: number;
    }>();

    redemptions.forEach(r => {
      const date = new Date(r.created_at).toISOString().split('T')[0];
      const existing = dataByDate.get(date) || { redemptions: 0, volume: 0, completed: 0, failed: 0 };
      
      existing.redemptions++;
      existing.volume += parseFloat(r.token_amount || '0');
      if (r.status === 'completed') existing.completed++;
      if (r.status === 'failed') existing.failed++;
      
      dataByDate.set(date, existing);
    });

    // Convert to array
    return Array.from(dataByDate.entries()).map(([date, data]) => ({
      date,
      redemptions: data.redemptions,
      volume: data.volume.toString(),
      completed: data.completed,
      failed: data.failed
    }));
  }

  /**
   * Get performance breakdown by stage
   */
  async getPerformanceBreakdown(
    startDate: Date,
    endDate: Date,
    projectId?: string
  ): Promise<PerformanceBreakdown[]> {
    // This would require more detailed tracking in the database
    // For now, return estimated breakdown
    return [
      { stage: 'Request Validation', averageTime: 30, minTime: 10, maxTime: 120, count: 0 },
      { stage: 'Rules Evaluation', averageTime: 45, minTime: 15, maxTime: 180, count: 0 },
      { stage: 'Approval Process', averageTime: 7200, minTime: 300, maxTime: 86400, count: 0 },
      { stage: 'Token Transfer', averageTime: 300, minTime: 60, maxTime: 1800, count: 0 },
      { stage: 'Settlement', averageTime: 240, minTime: 60, maxTime: 900, count: 0 }
    ];
  }

  /**
   * Get empty metrics structure
   */
  private getEmptyMetrics(startDate: Date, endDate: Date): RedemptionMetrics {
    return {
      totalRedemptions: 0,
      totalVolume: '0',
      totalSettlementValue: '0',
      statusDistribution: {
        pending: 0,
        validated: 0,
        approved: 0,
        processing: 0,
        completed: 0,
        failed: 0
      },
      averageProcessingTime: 0,
      medianProcessingTime: 0,
      p95ProcessingTime: 0,
      approvalRate: 0,
      settlementSuccessRate: 0,
      completionRate: 0,
      pendingApprovals: 0,
      pendingTransfers: 0,
      failedTransactions: 0,
      totalGasCost: '0',
      averageGasCost: '0',
      periodStart: startDate,
      periodEnd: endDate
    };
  }
}

// Export singleton instance
export const redemptionAnalytics = new RedemptionAnalytics();
