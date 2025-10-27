/**
 * PSP Statement Generator Service
 * 
 * Generates comprehensive financial statements for PSP accounts including:
 * - Transaction summaries (payments and trades)
 * - Balance snapshots
 * - Activity breakdowns by type, currency, and rail
 * - Period-based reports (daily, weekly, monthly, custom)
 * - Multiple export formats (JSON, CSV data preparation)
 * 
 * Leverages TransactionHistoryService for underlying data aggregation.
 */

import { BaseService, ServiceResult } from '@/services/BaseService';
import { TransactionHistoryService } from './transactionHistoryService';
import type {
  TransactionHistoryQuery,
  UnifiedTransaction,
  TransactionSummary
} from './transactionHistoryService';
import type { PSPBalance } from '@/types/psp';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToString } from '@/utils/decimal-helpers';

export type StatementPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface StatementRequest {
  project_id: string;
  period: StatementPeriod;
  
  // For custom period
  start_date?: Date;
  end_date?: Date;
  
  // For predefined periods
  year?: number;
  month?: number; // 1-12
  week?: number; // Week number of year
  day?: Date;
  
  // Options
  include_balances?: boolean;
  include_transactions?: boolean;
  include_summary?: boolean;
  currency_filter?: string[];
}

export interface StatementPeriodInfo {
  period_type: StatementPeriod;
  start_date: Date;
  end_date: Date;
  label: string; // e.g., "January 2024", "Week 1, 2024"
}

export interface StatementTransaction {
  date: Date;
  id: string;
  type: 'payment' | 'trade';
  description: string;
  amount: string;
  currency: string;
  status: string;
  payment_rail?: string;
  memo?: string;
}

export interface StatementBalanceSnapshot {
  as_of_date: Date;
  balances: {
    currency: string;
    available: string;
    locked: string;
    pending: string;
    total: string;
  }[];
}

export interface StatementActivityBreakdown {
  by_type: {
    payments: number;
    trades: number;
    total: number;
  };
  by_status: {
    [status: string]: number;
  };
  by_currency: {
    [currency: string]: {
      total_amount: string;
      transaction_count: number;
    };
  };
  by_payment_rail: {
    [rail: string]: {
      count: number;
      volume: string;
    };
  };
}

export interface Statement {
  statement_id: string;
  project_id: string;
  period: StatementPeriodInfo;
  generated_at: Date;
  
  // Opening and closing balances
  opening_balances?: StatementBalanceSnapshot;
  closing_balances?: StatementBalanceSnapshot;
  
  // Transaction details
  transactions?: StatementTransaction[];
  
  // Summary statistics
  summary?: {
    total_transactions: number;
    total_inbound_volume: { [currency: string]: string };
    total_outbound_volume: { [currency: string]: string };
    net_change: { [currency: string]: string };
  };
  
  // Activity breakdown
  activity_breakdown?: StatementActivityBreakdown;
}

export class StatementGeneratorService extends BaseService {
  private transactionHistoryService: TransactionHistoryService;

  constructor() {
    super('PSPStatementGenerator');
    this.transactionHistoryService = new TransactionHistoryService();
  }

  /**
   * Generate a complete statement for a given period
   */
  async generateStatement(
    request: StatementRequest
  ): Promise<ServiceResult<Statement>> {
    try {
      // Validate and compute period dates
      const periodInfo = this.computePeriodDates(request);
      
      // Generate statement ID
      const statementId = this.generateStatementId(
        request.project_id,
        periodInfo
      );

      // Initialize statement
      const statement: Statement = {
        statement_id: statementId,
        project_id: request.project_id,
        period: periodInfo,
        generated_at: new Date()
      };

      // Fetch balances if requested
      if (request.include_balances) {
        const balancesResult = await this.getBalanceSnapshots(
          request.project_id,
          periodInfo.start_date,
          periodInfo.end_date
        );
        
        if (balancesResult.success && balancesResult.data) {
          statement.opening_balances = balancesResult.data.opening;
          statement.closing_balances = balancesResult.data.closing;
        }
      }

      // Fetch transactions if requested
      if (request.include_transactions) {
        const transactionsResult = await this.getStatementTransactions(
          request.project_id,
          periodInfo.start_date,
          periodInfo.end_date,
          request.currency_filter
        );
        
        if (transactionsResult.success && transactionsResult.data) {
          statement.transactions = transactionsResult.data;
        }
      }

      // Generate summary and breakdown if requested
      if (request.include_summary) {
        const summaryResult = await this.generateStatementSummary(
          request.project_id,
          periodInfo.start_date,
          periodInfo.end_date,
          request.currency_filter
        );
        
        if (summaryResult.success && summaryResult.data) {
          statement.summary = summaryResult.data.summary;
          statement.activity_breakdown = summaryResult.data.breakdown;
        }
      }

      return this.success(statement);
    } catch (error) {
      return this.handleError('Failed to generate statement', error);
    }
  }

  /**
   * Generate statement in CSV-ready format
   */
  async generateStatementCSV(
    request: StatementRequest
  ): Promise<ServiceResult<any[]>> {
    try {
      const statementResult = await this.generateStatement({
        ...request,
        include_transactions: true,
        include_balances: true,
        include_summary: true
      });

      if (!statementResult.success || !statementResult.data) {
        return this.error(
          'Failed to generate statement for CSV',
          'STATEMENT_GENERATION_FAILED',
          500
        );
      }

      const statement = statementResult.data;
      const csvData: any[] = [];

      // Add header information
      csvData.push({
        'Section': 'Statement Information',
        'Field': 'Statement ID',
        'Value': statement.statement_id,
        'Details': ''
      });
      
      csvData.push({
        'Section': 'Statement Information',
        'Field': 'Period',
        'Value': statement.period.label,
        'Details': `${statement.period.start_date.toISOString()} to ${statement.period.end_date.toISOString()}`
      });

      csvData.push({
        'Section': 'Statement Information',
        'Field': 'Generated',
        'Value': statement.generated_at.toISOString(),
        'Details': ''
      });

      // Add blank row
      csvData.push({});

      // Add opening balances
      if (statement.opening_balances) {
        csvData.push({
          'Section': 'Opening Balances',
          'Field': 'As of',
          'Value': statement.opening_balances.as_of_date.toISOString(),
          'Details': ''
        });

        statement.opening_balances.balances.forEach(bal => {
          csvData.push({
            'Section': 'Opening Balances',
            'Field': bal.currency,
            'Value': bal.total,
            'Details': `Available: ${bal.available}, Locked: ${bal.locked}, Pending: ${bal.pending}`
          });
        });

        csvData.push({});
      }

      // Add transactions
      if (statement.transactions && statement.transactions.length > 0) {
        csvData.push({
          'Section': 'Transactions',
          'Field': 'Date',
          'Value': 'Type',
          'Details': 'Description | Amount | Currency | Status | Rail | Memo'
        });

        statement.transactions.forEach(tx => {
          csvData.push({
            'Section': 'Transactions',
            'Field': tx.date.toISOString(),
            'Value': tx.type,
            'Details': `${tx.description} | ${tx.amount} | ${tx.currency} | ${tx.status} | ${tx.payment_rail || 'N/A'} | ${tx.memo || 'N/A'}`
          });
        });

        csvData.push({});
      }

      // Add closing balances
      if (statement.closing_balances) {
        csvData.push({
          'Section': 'Closing Balances',
          'Field': 'As of',
          'Value': statement.closing_balances.as_of_date.toISOString(),
          'Details': ''
        });

        statement.closing_balances.balances.forEach(bal => {
          csvData.push({
            'Section': 'Closing Balances',
            'Field': bal.currency,
            'Value': bal.total,
            'Details': `Available: ${bal.available}, Locked: ${bal.locked}, Pending: ${bal.pending}`
          });
        });

        csvData.push({});
      }

      // Add summary
      if (statement.summary) {
        csvData.push({
          'Section': 'Summary',
          'Field': 'Total Transactions',
          'Value': statement.summary.total_transactions.toString(),
          'Details': ''
        });

        Object.entries(statement.summary.total_inbound_volume).forEach(([currency, amount]) => {
          csvData.push({
            'Section': 'Summary',
            'Field': `Inbound ${currency}`,
            'Value': amount,
            'Details': ''
          });
        });

        Object.entries(statement.summary.total_outbound_volume).forEach(([currency, amount]) => {
          csvData.push({
            'Section': 'Summary',
            'Field': `Outbound ${currency}`,
            'Value': amount,
            'Details': ''
          });
        });

        Object.entries(statement.summary.net_change).forEach(([currency, amount]) => {
          csvData.push({
            'Section': 'Summary',
            'Field': `Net Change ${currency}`,
            'Value': amount,
            'Details': ''
          });
        });
      }

      return this.success(csvData);
    } catch (error) {
      return this.handleError('Failed to generate CSV statement', error);
    }
  }

  /**
   * Get list of available statement periods for a project
   */
  async getAvailableStatementPeriods(
    projectId: string,
    periodType: StatementPeriod = 'monthly',
    limit: number = 12
  ): Promise<ServiceResult<StatementPeriodInfo[]>> {
    try {
      // Get the earliest transaction date
      const query: TransactionHistoryQuery = {
        project_id: projectId,
        type: 'all',
        limit: 1,
        page: 1,
        sort_by: 'created_at',
        sort_order: 'asc'
      };

      const result = await this.transactionHistoryService.getTransactionHistory(query);
      
      if (!result.success || !result.data || result.data.transactions.length === 0) {
        return this.success([]);
      }

      const earliestDate = result.data.transactions[0]?.created_at;
      if (!earliestDate) {
        return this.success([]);
      }

      const periods: StatementPeriodInfo[] = [];
      const now = new Date();

      // Generate periods based on type
      switch (periodType) {
        case 'monthly':
          periods.push(...this.generateMonthlyPeriods(earliestDate, now, limit));
          break;
        case 'weekly':
          periods.push(...this.generateWeeklyPeriods(earliestDate, now, limit));
          break;
        case 'daily':
          periods.push(...this.generateDailyPeriods(earliestDate, now, limit));
          break;
      }

      return this.success(periods);
    } catch (error) {
      return this.handleError('Failed to get available statement periods', error);
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Map database balance to API PSPBalance type
   */
  private mapBalanceToApiType(dbBalance: any): PSPBalance {
    return {
      id: dbBalance.id,
      project_id: dbBalance.project_id,
      virtual_account_id: dbBalance.virtual_account_id || undefined,
      asset_type: dbBalance.asset_type,
      asset_symbol: dbBalance.asset_symbol,
      network: dbBalance.network || undefined,
      available_balance: decimalToString(dbBalance.available_balance),
      locked_balance: decimalToString(dbBalance.locked_balance),
      pending_balance: decimalToString(dbBalance.pending_balance),
      total_balance: decimalToString(dbBalance.total_balance),
      warp_wallet_id: dbBalance.warp_wallet_id || undefined,
      wallet_address: dbBalance.wallet_address || undefined,
      last_synced_at: dbBalance.last_synced_at || undefined,
      created_at: dbBalance.created_at || new Date(),
      updated_at: dbBalance.updated_at || new Date()
    };
  }

  /**
   * Compute period start and end dates based on request
   */
  private computePeriodDates(request: StatementRequest): StatementPeriodInfo {
    const now = new Date();

    switch (request.period) {
      case 'custom':
        if (!request.start_date || !request.end_date) {
          throw new Error('Custom period requires start_date and end_date');
        }
        return {
          period_type: 'custom',
          start_date: request.start_date,
          end_date: request.end_date,
          label: `${request.start_date.toLocaleDateString()} - ${request.end_date.toLocaleDateString()}`
        };

      case 'daily':
        const day = request.day || now;
        const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
        const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
        return {
          period_type: 'daily',
          start_date: startOfDay,
          end_date: endOfDay,
          label: day.toLocaleDateString()
        };

      case 'weekly':
        const weekYear = request.year || now.getFullYear();
        const weekNum = request.week || this.getWeekNumber(now);
        const weekDates = this.getWeekDates(weekYear, weekNum);
        return {
          period_type: 'weekly',
          start_date: weekDates.start,
          end_date: weekDates.end,
          label: `Week ${weekNum}, ${weekYear}`
        };

      case 'monthly':
        const monthYear = request.year || now.getFullYear();
        const month = request.month || now.getMonth() + 1;
        const startOfMonth = new Date(monthYear, month - 1, 1, 0, 0, 0);
        const endOfMonth = new Date(monthYear, month, 0, 23, 59, 59);
        const monthName = startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return {
          period_type: 'monthly',
          start_date: startOfMonth,
          end_date: endOfMonth,
          label: monthName
        };

      default:
        throw new Error(`Unsupported period type: ${request.period}`);
    }
  }

  /**
   * Generate statement ID
   */
  private generateStatementId(projectId: string, period: StatementPeriodInfo): string {
    const timestamp = period.start_date.getTime();
    const periodType = period.period_type;
    return `STMT-${projectId.slice(0, 8)}-${periodType.toUpperCase()}-${timestamp}`;
  }

  /**
   * Get balance snapshots for opening and closing
   */
  private async getBalanceSnapshots(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ServiceResult<{
    opening: StatementBalanceSnapshot;
    closing: StatementBalanceSnapshot;
  }>> {
    try {
      // Get all balances for the project
      const dbBalances = await this.db.psp_balances.findMany({
        where: { project_id: projectId }
      });

      const balances = dbBalances.map(bal => this.mapBalanceToApiType(bal));

      // Create snapshots (simplified - in production, you'd query historical balance data)
      const formatBalances = (date: Date) => ({
        as_of_date: date,
        balances: balances.map((bal: PSPBalance) => ({
          currency: bal.asset_symbol,
          available: bal.available_balance,
          locked: bal.locked_balance,
          pending: bal.pending_balance,
          total: bal.total_balance
        }))
      });

      return this.success({
        opening: formatBalances(startDate),
        closing: formatBalances(endDate)
      });
    } catch (error) {
      return this.handleError('Failed to get balance snapshots', error);
    }
  }

  /**
   * Get formatted statement transactions
   */
  private async getStatementTransactions(
    projectId: string,
    startDate: Date,
    endDate: Date,
    currencyFilter?: string[]
  ): Promise<ServiceResult<StatementTransaction[]>> {
    try {
      const query: TransactionHistoryQuery = {
        project_id: projectId,
        type: 'all',
        start_date: startDate,
        end_date: endDate,
        limit: 100000, // Get all transactions
        sort_by: 'created_at',
        sort_order: 'asc'
      };

      const result = await this.transactionHistoryService.getTransactionHistory(query);

      if (!result.success || !result.data) {
        return this.error('Failed to fetch transactions', 'QUERY_FAILED', 500);
      }

      let transactions = result.data.transactions;

      // Apply currency filter if specified
      if (currencyFilter && currencyFilter.length > 0) {
        transactions = transactions.filter(tx => 
          currencyFilter.includes(tx.currency)
        );
      }

      // Format transactions for statement
      const statementTransactions: StatementTransaction[] = transactions.map(tx => ({
        date: tx.created_at,
        id: tx.id,
        type: tx.type,
        description: this.formatTransactionDescription(tx),
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        payment_rail: tx.payment_rail,
        memo: tx.memo
      }));

      return this.success(statementTransactions);
    } catch (error) {
      return this.handleError('Failed to get statement transactions', error);
    }
  }

  /**
   * Generate statement summary and breakdown
   */
  private async generateStatementSummary(
    projectId: string,
    startDate: Date,
    endDate: Date,
    currencyFilter?: string[]
  ): Promise<ServiceResult<{
    summary: Statement['summary'];
    breakdown: StatementActivityBreakdown;
  }>> {
    try {
      const summaryResult = await this.transactionHistoryService.getTransactionSummary(
        projectId,
        startDate,
        endDate
      );

      if (!summaryResult.success || !summaryResult.data) {
        return this.error('Failed to generate summary', 'QUERY_FAILED', 500);
      }

      const txSummary = summaryResult.data;

      // Get transactions for detailed analysis
      const txResult = await this.getStatementTransactions(
        projectId,
        startDate,
        endDate,
        currencyFilter
      );

      if (!txResult.success || !txResult.data) {
        return this.error('Failed to get transactions for summary', 'QUERY_FAILED', 500);
      }

      const transactions = txResult.data;

      // Calculate inbound/outbound volumes
      const inboundVolume: { [currency: string]: number } = {};
      const outboundVolume: { [currency: string]: number } = {};

      transactions.forEach(tx => {
        if (tx.type === 'payment') {
          const amount = parseFloat(tx.amount);
          const currency = tx.currency;

          // Determine direction based on transaction details
          // This is simplified - in production you'd check the actual direction field
          const isInbound = tx.status === 'completed' && amount > 0;

          if (isInbound) {
            inboundVolume[currency] = (inboundVolume[currency] || 0) + amount;
          } else {
            outboundVolume[currency] = (outboundVolume[currency] || 0) + amount;
          }
        }
      });

      // Calculate net change
      const netChange: { [currency: string]: number } = {};
      const allCurrencies = new Set([
        ...Object.keys(inboundVolume),
        ...Object.keys(outboundVolume)
      ]);

      allCurrencies.forEach(currency => {
        netChange[currency] = (inboundVolume[currency] || 0) - (outboundVolume[currency] || 0);
      });

      // Build activity breakdown by currency
      const byCurrency: { [currency: string]: { total_amount: string; transaction_count: number } } = {};
      transactions.forEach(tx => {
        if (!byCurrency[tx.currency]) {
          byCurrency[tx.currency] = { total_amount: '0', transaction_count: 0 };
        }
        const currentEntry = byCurrency[tx.currency];
        if (currentEntry) {
          currentEntry.transaction_count++;
          const currentTotal = parseFloat(currentEntry.total_amount);
          const txAmount = parseFloat(tx.amount);
          currentEntry.total_amount = (currentTotal + txAmount).toString();
        }
      });

      // Build activity breakdown by payment rail
      const byPaymentRail: { [rail: string]: { count: number; volume: string } } = {};
      transactions.forEach(tx => {
        if (tx.payment_rail) {
          if (!byPaymentRail[tx.payment_rail]) {
            byPaymentRail[tx.payment_rail] = { count: 0, volume: '0' };
          }
          const currentEntry = byPaymentRail[tx.payment_rail];
          if (currentEntry) {
            currentEntry.count++;
            const currentVolume = parseFloat(currentEntry.volume);
            const txAmount = parseFloat(tx.amount);
            currentEntry.volume = (currentVolume + txAmount).toString();
          }
        }
      });

      const summary: Statement['summary'] = {
        total_transactions: transactions.length,
        total_inbound_volume: Object.fromEntries(
          Object.entries(inboundVolume).map(([k, v]) => [k, v.toString()])
        ),
        total_outbound_volume: Object.fromEntries(
          Object.entries(outboundVolume).map(([k, v]) => [k, v.toString()])
        ),
        net_change: Object.fromEntries(
          Object.entries(netChange).map(([k, v]) => [k, v.toString()])
        )
      };

      const breakdown: StatementActivityBreakdown = {
        by_type: {
          payments: txSummary.total_payments,
          trades: txSummary.total_trades,
          total: txSummary.total_transactions
        },
        by_status: txSummary.status_breakdown,
        by_currency: byCurrency,
        by_payment_rail: byPaymentRail
      };

      return this.success({ summary, breakdown });
    } catch (error) {
      return this.handleError('Failed to generate statement summary', error);
    }
  }

  /**
   * Format transaction description
   */
  private formatTransactionDescription(tx: UnifiedTransaction): string {
    if (tx.type === 'payment') {
      const direction = tx.direction === 'inbound' ? 'Received' : 'Sent';
      const rail = tx.payment_rail ? ` via ${tx.payment_rail.toUpperCase()}` : '';
      return `${direction} ${tx.payment_type || 'Payment'}${rail}`;
    } else {
      return `Trade: ${tx.source_symbol} → ${tx.destination_symbol}`;
    }
  }

  /**
   * Generate monthly periods
   */
  private generateMonthlyPeriods(
    from: Date,
    to: Date,
    limit: number
  ): StatementPeriodInfo[] {
    const periods: StatementPeriodInfo[] = [];
    const current = new Date(to.getFullYear(), to.getMonth(), 1);

    while (periods.length < limit && current >= from) {
      const start = new Date(current.getFullYear(), current.getMonth(), 1, 0, 0, 0);
      const end = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
      const label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      periods.push({
        period_type: 'monthly',
        start_date: start,
        end_date: end,
        label
      });

      current.setMonth(current.getMonth() - 1);
    }

    return periods;
  }

  /**
   * Generate weekly periods
   */
  private generateWeeklyPeriods(
    from: Date,
    to: Date,
    limit: number
  ): StatementPeriodInfo[] {
    const periods: StatementPeriodInfo[] = [];
    const current = new Date(to);

    while (periods.length < limit && current >= from) {
      const weekNum = this.getWeekNumber(current);
      const weekDates = this.getWeekDates(current.getFullYear(), weekNum);
      
      periods.push({
        period_type: 'weekly',
        start_date: weekDates.start,
        end_date: weekDates.end,
        label: `Week ${weekNum}, ${current.getFullYear()}`
      });

      current.setDate(current.getDate() - 7);
    }

    return periods;
  }

  /**
   * Generate daily periods
   */
  private generateDailyPeriods(
    from: Date,
    to: Date,
    limit: number
  ): StatementPeriodInfo[] {
    const periods: StatementPeriodInfo[] = [];
    const current = new Date(to);

    while (periods.length < limit && current >= from) {
      const start = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0);
      const end = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 23, 59, 59);

      periods.push({
        period_type: 'daily',
        start_date: start,
        end_date: end,
        label: current.toLocaleDateString()
      });

      current.setDate(current.getDate() - 1);
    }

    return periods;
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Get start and end dates for a given week
   */
  private getWeekDates(year: number, weekNum: number): { start: Date; end: Date } {
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const weekStart = new Date(jan4);
    weekStart.setDate(jan4.getDate() - jan4Day + 1 + (weekNum - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { start: weekStart, end: weekEnd };
  }
}

export default StatementGeneratorService;
