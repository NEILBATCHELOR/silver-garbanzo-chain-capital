/**
 * PSP Transaction History Service
 * 
 * Provides unified access to transaction history across payments and trades.
 * 
 * Features:
 * - Query transactions with filtering
 * - Pagination and sorting
 * - Transaction search
 * - Activity aggregation
 * - Export preparation (CSV format data)
 * 
 * Combines data from psp_payments and psp_trades tables for comprehensive
 * transaction history view.
 */

import { BaseService, ServiceResult } from '@/services/BaseService';
import { mapPaymentsToApiType, mapTradesToApiType } from '../utils/mappers';
import type {
  PSPPayment,
  PSPTrade,
  PaymentStatus,
  TradeStatus,
  PaymentType,
  PaymentRail
} from '@/types/psp';

export interface TransactionHistoryQuery {
  project_id: string;
  
  // Filtering
  type?: 'payment' | 'trade' | 'all';
  status?: PaymentStatus | TradeStatus;
  payment_type?: PaymentType;
  payment_rail?: PaymentRail;
  currency?: string;
  
  // Date range
  start_date?: Date;
  end_date?: Date;
  
  // Pagination
  page?: number;
  limit?: number;
  
  // Sorting
  sort_by?: 'created_at' | 'amount' | 'status';
  sort_order?: 'asc' | 'desc';
  
  // Search
  search_term?: string; // Searches memo, warp IDs, etc.
}

export interface UnifiedTransaction {
  id: string;
  type: 'payment' | 'trade';
  created_at: Date;
  updated_at: Date;
  status: string;
  amount: string;
  currency: string;
  
  // Payment-specific fields (null for trades)
  payment_type?: PaymentType;
  payment_rail?: PaymentRail;
  direction?: 'inbound' | 'outbound';
  memo?: string;
  
  // Trade-specific fields (null for payments)
  source_symbol?: string;
  destination_symbol?: string;
  exchange_rate?: string;
  
  // Common
  warp_id?: string;
  error_message?: string;
  metadata?: any;
}

export interface TransactionHistoryResult {
  transactions: UnifiedTransaction[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface TransactionSummary {
  total_transactions: number;
  total_payments: number;
  total_trades: number;
  total_volume: {
    [currency: string]: string;
  };
  status_breakdown: {
    [status: string]: number;
  };
  payment_rail_breakdown: {
    [rail: string]: number;
  };
}

export class TransactionHistoryService extends BaseService {
  constructor() {
    super('PSPTransactionHistory');
  }

  /**
   * Get transaction history with filtering and pagination
   */
  async getTransactionHistory(
    query: TransactionHistoryQuery
  ): Promise<ServiceResult<TransactionHistoryResult>> {
    try {
      const {
        project_id,
        type = 'all',
        page = 1,
        limit = 50,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = query;

      // Build where clauses
      const paymentWhere = this.buildPaymentWhereClause(query);
      const tradeWhere = this.buildTradeWhereClause(query);

      // Fetch payments if needed
      let payments: PSPPayment[] = [];
      if (type === 'payment' || type === 'all') {
        const dbPayments = await this.db.psp_payments.findMany({
          where: paymentWhere,
          orderBy: { [sort_by]: sort_order }
        });
        payments = mapPaymentsToApiType(dbPayments);
      }

      // Fetch trades if needed
      let trades: PSPTrade[] = [];
      if (type === 'trade' || type === 'all') {
        const dbTrades = await this.db.psp_trades.findMany({
          where: tradeWhere,
          orderBy: { [sort_by]: sort_order }
        });
        trades = mapTradesToApiType(dbTrades);
      }

      // Convert to unified format
      const unifiedTransactions = this.unifyTransactions(payments, trades);

      // Apply search filter if provided
      let filteredTransactions = unifiedTransactions;
      if (query.search_term) {
        filteredTransactions = this.applySearchFilter(
          unifiedTransactions,
          query.search_term
        );
      }

      // Sort unified transactions
      filteredTransactions.sort((a, b) => {
        const aValue = sort_by === 'amount' ? parseFloat(a.amount) : a[sort_by];
        const bValue = sort_by === 'amount' ? parseFloat(b.amount) : b[sort_by];
        
        if (sort_order === 'asc') {
          return aValue > bValue ? 1 : -1;
        }
        return aValue < bValue ? 1 : -1;
      });

      // Paginate
      const total_count = filteredTransactions.length;
      const total_pages = Math.ceil(total_count / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

      return this.success({
        transactions: paginatedTransactions,
        total_count,
        page,
        limit,
        total_pages
      });
    } catch (error) {
      return this.handleError('Failed to get transaction history', error);
    }
  }

  /**
   * Get a single transaction by ID
   * Searches both payments and trades
   */
  async getTransaction(
    transactionId: string,
    projectId: string
  ): Promise<ServiceResult<UnifiedTransaction | null>> {
    try {
      // Try to find as payment
      const dbPayment = await this.db.psp_payments.findFirst({
        where: {
          id: transactionId,
          project_id: projectId
        }
      });

      if (dbPayment) {
        const payments = mapPaymentsToApiType([dbPayment]);
        const payment = payments[0];
        if (!payment) {
          return this.error('Failed to map payment', 'MAPPING_ERROR', 500);
        }
        return this.success(this.paymentToUnified(payment));
      }

      // Try to find as trade
      const dbTrade = await this.db.psp_trades.findFirst({
        where: {
          id: transactionId,
          project_id: projectId
        }
      });

      if (dbTrade) {
        const trades = mapTradesToApiType([dbTrade]);
        const trade = trades[0];
        if (!trade) {
          return this.error('Failed to map trade', 'MAPPING_ERROR', 500);
        }
        return this.success(this.tradeToUnified(trade));
      }

      return this.success(null);
    } catch (error) {
      return this.handleError('Failed to get transaction', error);
    }
  }

  /**
   * Get transaction summary/statistics
   */
  async getTransactionSummary(
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<TransactionSummary>> {
    try {
      const dateFilter: any = { project_id: projectId };
      
      if (startDate || endDate) {
        dateFilter.created_at = {};
        if (startDate) dateFilter.created_at.gte = startDate;
        if (endDate) dateFilter.created_at.lte = endDate;
      }

      // Count payments
      const dbPayments = await this.db.psp_payments.findMany({
        where: dateFilter
      });
      const payments = mapPaymentsToApiType(dbPayments);

      // Count trades
      const dbTrades = await this.db.psp_trades.findMany({
        where: dateFilter
      });
      const trades = mapTradesToApiType(dbTrades);

      // Calculate summary
      const summary: TransactionSummary = {
        total_transactions: payments.length + trades.length,
        total_payments: payments.length,
        total_trades: trades.length,
        total_volume: {},
        status_breakdown: {},
        payment_rail_breakdown: {}
      };

      // Aggregate payment volumes
      payments.forEach(payment => {
        const currency = payment.currency;
        const amount = payment.amount;
        
        if (!summary.total_volume[currency]) {
          summary.total_volume[currency] = '0';
        }
        
        summary.total_volume[currency] = (
          parseFloat(summary.total_volume[currency]) + parseFloat(amount)
        ).toString();

        // Status breakdown
        summary.status_breakdown[payment.status] = 
          (summary.status_breakdown[payment.status] || 0) + 1;

        // Rail breakdown
        if (payment.payment_rail) {
          summary.payment_rail_breakdown[payment.payment_rail] = 
            (summary.payment_rail_breakdown[payment.payment_rail] || 0) + 1;
        }
      });

      // Aggregate trade volumes
      trades.forEach(trade => {
        const currency = trade.destination_symbol;
        const amount = trade.destination_amount || '0';
        
        if (!summary.total_volume[currency]) {
          summary.total_volume[currency] = '0';
        }
        
        summary.total_volume[currency] = (
          parseFloat(summary.total_volume[currency]) + parseFloat(amount)
        ).toString();

        // Status breakdown
        summary.status_breakdown[trade.status] = 
          (summary.status_breakdown[trade.status] || 0) + 1;
      });

      return this.success(summary);
    } catch (error) {
      return this.handleError('Failed to get transaction summary', error);
    }
  }

  /**
   * Get recent activity (last N transactions)
   */
  async getRecentActivity(
    projectId: string,
    limit: number = 20
  ): Promise<ServiceResult<UnifiedTransaction[]>> {
    try {
      const query: TransactionHistoryQuery = {
        project_id: projectId,
        type: 'all',
        limit,
        page: 1,
        sort_by: 'created_at',
        sort_order: 'desc'
      };

      const result = await this.getTransactionHistory(query);

      if (!result.success || !result.data) {
        return this.error(
          'Failed to get recent activity',
          'QUERY_FAILED',
          500
        );
      }

      return this.success(result.data.transactions);
    } catch (error) {
      return this.handleError('Failed to get recent activity', error);
    }
  }

  /**
   * Prepare transaction data for export (CSV format)
   */
  async prepareExportData(
    query: TransactionHistoryQuery
  ): Promise<ServiceResult<any[]>> {
    try {
      // Get all transactions (no pagination for export)
      const fullQuery = {
        ...query,
        page: 1,
        limit: 100000 // Large limit to get all
      };

      const result = await this.getTransactionHistory(fullQuery);

      if (!result.success || !result.data) {
        return this.error(
          'Failed to prepare export data',
          'QUERY_FAILED',
          500
        );
      }

      // Format for CSV
      const exportData = result.data.transactions.map(tx => ({
        'Transaction ID': tx.id,
        'Type': tx.type,
        'Date': tx.created_at.toISOString(),
        'Status': tx.status,
        'Amount': tx.amount,
        'Currency': tx.currency,
        'Payment Type': tx.payment_type || '',
        'Payment Rail': tx.payment_rail || '',
        'Direction': tx.direction || '',
        'Source': tx.source_symbol || '',
        'Destination': tx.destination_symbol || '',
        'Exchange Rate': tx.exchange_rate || '',
        'Memo': tx.memo || '',
        'Warp ID': tx.warp_id || '',
        'Error': tx.error_message || ''
      }));

      return this.success(exportData);
    } catch (error) {
      return this.handleError('Failed to prepare export data', error);
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Build WHERE clause for payments query
   */
  private buildPaymentWhereClause(query: TransactionHistoryQuery): any {
    const where: any = {
      project_id: query.project_id
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.payment_type) {
      where.payment_type = query.payment_type;
    }

    if (query.payment_rail) {
      where.payment_rail = query.payment_rail;
    }

    if (query.currency) {
      where.currency = query.currency;
    }

    if (query.start_date || query.end_date) {
      where.created_at = {};
      if (query.start_date) where.created_at.gte = query.start_date;
      if (query.end_date) where.created_at.lte = query.end_date;
    }

    return where;
  }

  /**
   * Build WHERE clause for trades query
   */
  private buildTradeWhereClause(query: TransactionHistoryQuery): any {
    const where: any = {
      project_id: query.project_id
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.currency) {
      where.OR = [
        { source_symbol: query.currency },
        { destination_symbol: query.currency }
      ];
    }

    if (query.start_date || query.end_date) {
      where.created_at = {};
      if (query.start_date) where.created_at.gte = query.start_date;
      if (query.end_date) where.created_at.lte = query.end_date;
    }

    return where;
  }

  /**
   * Convert payments and trades to unified format
   */
  private unifyTransactions(
    payments: PSPPayment[],
    trades: PSPTrade[]
  ): UnifiedTransaction[] {
    const unified: UnifiedTransaction[] = [];

    // Convert payments
    payments.forEach(payment => {
      unified.push(this.paymentToUnified(payment));
    });

    // Convert trades
    trades.forEach(trade => {
      unified.push(this.tradeToUnified(trade));
    });

    return unified;
  }

  /**
   * Convert payment to unified transaction
   */
  private paymentToUnified(payment: PSPPayment): UnifiedTransaction {
    return {
      id: payment.id,
      type: 'payment',
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      payment_type: payment.payment_type,
      payment_rail: payment.payment_rail || undefined,
      direction: payment.direction,
      memo: payment.memo || undefined,
      warp_id: payment.warp_payment_id || undefined,
      error_message: payment.error_message || undefined,
      metadata: payment.metadata
    };
  }

  /**
   * Convert trade to unified transaction
   */
  private tradeToUnified(trade: PSPTrade): UnifiedTransaction {
    return {
      id: trade.id,
      type: 'trade',
      created_at: trade.created_at,
      updated_at: trade.updated_at,
      status: trade.status,
      amount: trade.source_amount,
      currency: trade.source_symbol,
      source_symbol: trade.source_symbol,
      destination_symbol: trade.destination_symbol,
      exchange_rate: trade.exchange_rate || undefined,
      warp_id: trade.warp_trade_id || undefined,
      error_message: trade.error_message || undefined
    };
  }

  /**
   * Apply search filter to transactions
   */
  private applySearchFilter(
    transactions: UnifiedTransaction[],
    searchTerm: string
  ): UnifiedTransaction[] {
    const lowerSearch = searchTerm.toLowerCase();

    return transactions.filter(tx => {
      // Search in various fields
      const searchableText = [
        tx.id,
        tx.status,
        tx.currency,
        tx.memo,
        tx.warp_id,
        tx.payment_type,
        tx.payment_rail,
        tx.source_symbol,
        tx.destination_symbol
      ].filter(Boolean).join(' ').toLowerCase();

      return searchableText.includes(lowerSearch);
    });
  }
}

export default TransactionHistoryService;
