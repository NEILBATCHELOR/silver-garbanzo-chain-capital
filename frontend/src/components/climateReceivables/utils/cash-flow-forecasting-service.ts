import { 
  ClimateReceivable, 
  ClimateIncentive, 
  ClimateCashFlowProjection,
  IncentiveStatus
} from '../types';

/**
 * Cash Flow Forecasting service for predicting future cash flows
 * from receivables and incentives
 */
export class CashFlowForecastingService {
  /**
   * Generate cash flow projections for a set of receivables and incentives
   * @param receivables Array of receivables
   * @param incentives Array of incentives
   * @param startDate Starting date for the forecast
   * @param periodMonths Number of months to forecast
   * @returns Array of cash flow projections
   */
  public static generateForecast(
    receivables: ClimateReceivable[],
    incentives: ClimateIncentive[],
    startDate: Date = new Date(),
    periodMonths: number = 12
  ): ClimateCashFlowProjection[] {
    const projections: ClimateCashFlowProjection[] = [];
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + periodMonths);
    
    // Process receivables
    receivables.forEach(receivable => {
      const dueDate = new Date(receivable.dueDate);
      
      // Only include receivables due within the forecast period
      if (dueDate >= startDate && dueDate <= endDate) {
        // Apply risk-based adjustment to amount
        const adjustedAmount = this.applyRiskAdjustment(receivable);
        
        projections.push({
          projectionId: `proj-${projections.length + 1}`,
          projectionDate: receivable.dueDate,
          projectedAmount: adjustedAmount,
          sourceType: 'receivable',
          entityId: receivable.receivableId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });
    
    // Process incentives
    incentives.forEach(incentive => {
      // Skip incentives that have already been received
      if (incentive.status === IncentiveStatus.RECEIVED) {
        return;
      }
      
      // Use expected receipt date if available, otherwise estimate
      const receiptDate = incentive.expectedReceiptDate 
        ? new Date(incentive.expectedReceiptDate)
        : this.estimateIncentiveReceiptDate(incentive);
      
      // Only include incentives expected within the forecast period
      if (receiptDate >= startDate && receiptDate <= endDate) {
        // Apply status-based probability adjustment
        const adjustedAmount = this.applyIncentiveStatusAdjustment(incentive);
        
        projections.push({
          projectionId: `proj-${projections.length + 1}`,
          projectionDate: receiptDate.toISOString().split('T')[0],
          projectedAmount: adjustedAmount,
          sourceType: 'incentive',
          entityId: incentive.incentiveId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });
    
    // Sort projections by date
    return projections.sort((a, b) => 
      new Date(a.projectionDate).getTime() - new Date(b.projectionDate).getTime()
    );
  }
  
  /**
   * Apply risk adjustment to receivable amount based on risk score
   * @param receivable The receivable to adjust
   * @returns Adjusted amount
   */
  private static applyRiskAdjustment(receivable: ClimateReceivable): number {
    // If there's no risk score, return the full amount
    if (receivable.riskScore === undefined) {
      return receivable.amount;
    }
    
    // Convert risk score to a probability of payment (higher risk = lower probability)
    const paymentProbability = 1 - (receivable.riskScore / 100);
    
    // Apply the probability adjustment to the amount
    return receivable.amount * paymentProbability;
  }
  
  /**
   * Apply adjustment to incentive amount based on its status
   * @param incentive The incentive to adjust
   * @returns Adjusted amount
   */
  private static applyIncentiveStatusAdjustment(incentive: ClimateIncentive): number {
    // Probability factors based on status
    const probabilityFactors: Record<IncentiveStatus, number> = {
      [IncentiveStatus.APPLIED]: 0.7,    // 70% probability if just applied
      [IncentiveStatus.PENDING]: 0.8,    // 80% probability if pending
      [IncentiveStatus.APPROVED]: 0.95,  // 95% probability if approved
      [IncentiveStatus.RECEIVED]: 1.0,   // 100% if already received (though these are filtered out)
      [IncentiveStatus.REJECTED]: 0.0    // 0% if rejected
    };
    
    const factor = probabilityFactors[incentive.status] || 0.5;
    return incentive.amount * factor;
  }
  
  /**
   * Estimate a receipt date for an incentive if not explicitly provided
   * @param incentive The incentive to estimate for
   * @returns Estimated receipt date
   */
  private static estimateIncentiveReceiptDate(incentive: ClimateIncentive): Date {
    const now = new Date();
    
    // Default timeframes based on incentive status (in days)
    const defaultTimeframes: Record<IncentiveStatus, number> = {
      [IncentiveStatus.APPLIED]: 90,    // 3 months if just applied
      [IncentiveStatus.PENDING]: 60,    // 2 months if pending
      [IncentiveStatus.APPROVED]: 30,   // 1 month if approved
      [IncentiveStatus.RECEIVED]: 0,    // Already received
      [IncentiveStatus.REJECTED]: 0     // Never for rejected
    };
    
    const daysToAdd = defaultTimeframes[incentive.status] || 60;
    const estimatedDate = new Date(now);
    estimatedDate.setDate(estimatedDate.getDate() + daysToAdd);
    
    return estimatedDate;
  }
  
  /**
   * Aggregate projections by time period for reporting
   * @param projections Array of cash flow projections
   * @param periodType Period to aggregate by ('day', 'week', 'month', 'quarter')
   * @returns Aggregated projections
   */
  public static aggregateProjections(
    projections: ClimateCashFlowProjection[],
    periodType: 'day' | 'week' | 'month' | 'quarter' = 'month'
  ): Record<string, { receivables: number, incentives: number, total: number }> {
    const result: Record<string, { receivables: number, incentives: number, total: number }> = {};
    
    projections.forEach(projection => {
      const date = new Date(projection.projectionDate);
      let period: string;
      
      // Determine period key based on periodType
      switch (periodType) {
        case 'day':
          period = date.toISOString().split('T')[0];
          break;
        case 'week':
          // Get the week number (approximate)
          const weekNum = Math.ceil((date.getDate() + this.getFirstDayOfMonth(date).getDay()) / 7);
          period = `${date.getFullYear()}-${date.getMonth() + 1}-W${weekNum}`;
          break;
        case 'month':
          period = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
        case 'quarter':
          const quarter = Math.ceil((date.getMonth() + 1) / 3);
          period = `${date.getFullYear()}-Q${quarter}`;
          break;
      }
      
      // Initialize period if it doesn't exist
      if (!result[period]) {
        result[period] = { receivables: 0, incentives: 0, total: 0 };
      }
      
      // Add projection amount to appropriate category
      if (projection.sourceType === 'receivable') {
        result[period].receivables += projection.projectedAmount;
      } else if (projection.sourceType === 'incentive') {
        result[period].incentives += projection.projectedAmount;
      }
      
      // Update total
      result[period].total = result[period].receivables + result[period].incentives;
    });
    
    return result;
  }
  
  /**
   * Get the first day of the month for a given date
   * @param date The date to get the first day of the month for
   * @returns Date object set to the first day of the month
   */
  private static getFirstDayOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  
  /**
   * Format aggregated projections for chart display
   * @param aggregatedProjections The aggregated projections
   * @returns Chart-ready data object
   */
  public static formatForChart(
    aggregatedProjections: Record<string, { receivables: number, incentives: number, total: number }>
  ): { labels: string[], datasets: Array<{ label: string, data: number[], backgroundColor: string, borderColor: string }> } {
    const periods = Object.keys(aggregatedProjections).sort();
    
    // Format label display based on period type
    const labels = periods.map(period => {
      if (period.includes('-W')) {
        // Week format (YYYY-MM-WN)
        const [yearMonth, weekNum] = period.split('-W');
        const [year, month] = yearMonth.split('-');
        return `Week ${weekNum}, ${month}/${year}`;
      } else if (period.includes('-Q')) {
        // Quarter format (YYYY-QN)
        const [year, quarter] = period.split('-Q');
        return `Q${quarter} ${year}`;
      } else if (period.split('-').length === 2) {
        // Month format (YYYY-MM)
        const [year, month] = period.split('-');
        return `${month}/${year}`;
      }
      return period; // Day format or other
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Receivables',
          data: periods.map(period => aggregatedProjections[period].receivables),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgb(75, 192, 192)',
        },
        {
          label: 'Incentives',
          data: periods.map(period => aggregatedProjections[period].incentives),
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          borderColor: 'rgb(153, 102, 255)',
        }
      ]
    };
  }
}
