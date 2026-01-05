/**
 * Trade Finance - Transaction History Routes
 * API routes for user transaction history with comprehensive filtering
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

interface GetUserHistoryParams {
  Params: {
    walletAddress: string
  }
  Querystring: {
    project_id: string
    limit?: number
    offset?: number
    transaction_type?: string // 'supply' | 'withdraw' | 'borrow' | 'repay' | 'liquidate'
    commodity_type?: string
    start_date?: string // ISO date
    end_date?: string // ISO date
    sort_order?: 'asc' | 'desc'
  }
}

interface ExportHistoryParams {
  Params: {
    walletAddress: string
  }
  Querystring: {
    project_id: string
    format?: 'csv' | 'json'
    start_date?: string
    end_date?: string
  }
}

interface GetTransactionDetailsParams {
  Params: {
    transactionId: string
  }
  Querystring: {
    project_id: string
  }
}

export async function historyRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/trade-finance/history/:walletAddress
   * Get comprehensive transaction history for a user with filtering
   */
  fastify.get<GetUserHistoryParams>(
    '/api/trade-finance/history/:walletAddress',
    async (
      request: FastifyRequest<GetUserHistoryParams>,
      reply: FastifyReply
    ) => {
      try {
        const { walletAddress } = request.params
        const {
          project_id,
          limit = 50,
          offset = 0,
          transaction_type,
          commodity_type,
          start_date,
          end_date,
          sort_order = 'desc'
        } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Build query
        let query = fastify.supabase
          .from('trade_finance_reserve_transactions')
          .select('*')
          .eq('project_id', project_id)
          .eq('wallet_address', walletAddress.toLowerCase())
          .order('created_at', { ascending: sort_order === 'asc' })
          .range(offset, offset + limit - 1)

        // Apply filters
        if (transaction_type) {
          query = query.eq('transaction_type', transaction_type)
        }

        if (commodity_type) {
          query = query.eq('commodity_type', commodity_type.toLowerCase())
        }

        if (start_date) {
          query = query.gte('created_at', start_date)
        }

        if (end_date) {
          query = query.lte('created_at', end_date)
        }

        const { data: transactions, error } = await query

        if (error) {
          throw new Error('Failed to fetch transaction history: ' + error.message)
        }

        // Get total count for pagination
        let countQuery = fastify.supabase
          .from('trade_finance_reserve_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project_id)
          .eq('wallet_address', walletAddress.toLowerCase())

        if (transaction_type) {
          countQuery = countQuery.eq('transaction_type', transaction_type)
        }
        if (commodity_type) {
          countQuery = countQuery.eq('commodity_type', commodity_type.toLowerCase())
        }
        if (start_date) {
          countQuery = countQuery.gte('created_at', start_date)
        }
        if (end_date) {
          countQuery = countQuery.lte('created_at', end_date)
        }

        const { count } = await countQuery

        // Format transactions
        const formattedTransactions = transactions?.map(tx => ({
          id: tx.id,
          type: tx.transaction_type,
          commodityType: tx.commodity_type,
          amount: tx.amount,
          valueUSD: tx.value_usd,
          timestamp: tx.created_at,
          txHash: tx.transaction_hash,
          status: tx.status || 'completed',
          blockNumber: tx.block_number,
          gasUsed: tx.gas_used,
          gasPriceGwei: tx.gas_price_gwei
        })) || []

        return reply.send({
          data: {
            transactions: formattedTransactions,
            pagination: {
              total: count || 0,
              limit,
              offset,
              hasMore: (count || 0) > offset + limit
            }
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch transaction history'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/history/:walletAddress/summary
   * Get transaction summary statistics for a user
   */
  fastify.get<GetUserHistoryParams>(
    '/api/trade-finance/history/:walletAddress/summary',
    async (
      request: FastifyRequest<GetUserHistoryParams>,
      reply: FastifyReply
    ) => {
      try {
        const { walletAddress } = request.params
        const { project_id, start_date, end_date } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Build base query
        let query = fastify.supabase
          .from('trade_finance_reserve_transactions')
          .select('transaction_type, value_usd, created_at')
          .eq('project_id', project_id)
          .eq('wallet_address', walletAddress.toLowerCase())

        if (start_date) {
          query = query.gte('created_at', start_date)
        }
        if (end_date) {
          query = query.lte('created_at', end_date)
        }

        const { data: transactions, error } = await query

        if (error) {
          throw new Error('Failed to fetch transaction summary: ' + error.message)
        }

        // Calculate statistics
        const summary = {
          totalTransactions: transactions?.length || 0,
          byType: {
            supply: 0,
            withdraw: 0,
            borrow: 0,
            repay: 0,
            liquidate: 0
          },
          volumeByType: {
            supply: 0,
            withdraw: 0,
            borrow: 0,
            repay: 0,
            liquidate: 0
          },
          totalVolume: 0,
          averageTransactionSize: 0,
          firstTransaction: null as string | null,
          lastTransaction: null as string | null
        }

        transactions?.forEach(tx => {
          const type = tx.transaction_type as keyof typeof summary.byType
          if (type && summary.byType[type] !== undefined) {
            summary.byType[type]++
            summary.volumeByType[type] += tx.value_usd || 0
          }
          summary.totalVolume += tx.value_usd || 0
        })

        if (transactions && transactions.length > 0) {
          summary.averageTransactionSize = summary.totalVolume / transactions.length
          summary.firstTransaction = transactions[transactions.length - 1]?.created_at || null
          summary.lastTransaction = transactions[0]?.created_at || null
        }

        return reply.send({ data: summary })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch transaction summary'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/history/:walletAddress/export
   * Export transaction history as CSV or JSON
   */
  fastify.get<ExportHistoryParams>(
    '/api/trade-finance/history/:walletAddress/export',
    async (
      request: FastifyRequest<ExportHistoryParams>,
      reply: FastifyReply
    ) => {
      try {
        const { walletAddress } = request.params
        const { project_id, format = 'csv', start_date, end_date } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Fetch all transactions (no pagination for export)
        let query = fastify.supabase
          .from('trade_finance_reserve_transactions')
          .select('*')
          .eq('project_id', project_id)
          .eq('wallet_address', walletAddress.toLowerCase())
          .order('created_at', { ascending: false })

        if (start_date) {
          query = query.gte('created_at', start_date)
        }
        if (end_date) {
          query = query.lte('created_at', end_date)
        }

        const { data: transactions, error } = await query

        if (error) {
          throw new Error('Failed to export transactions: ' + error.message)
        }

        if (format === 'csv') {
          // Generate CSV
          const headers = ['Date', 'Type', 'Commodity', 'Amount', 'Value (USD)', 'Tx Hash', 'Status']
          const rows = transactions?.map(tx => [
            new Date(tx.created_at).toISOString(),
            tx.transaction_type,
            tx.commodity_type,
            tx.amount,
            tx.value_usd,
            tx.transaction_hash || '',
            tx.status || 'completed'
          ]) || []

          const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
          ].join('\n')

          reply.header('Content-Type', 'text/csv')
          reply.header('Content-Disposition', `attachment; filename="transactions-${walletAddress}-${Date.now()}.csv"`)
          return reply.send(csv)
        } else {
          // Return JSON
          reply.header('Content-Type', 'application/json')
          reply.header('Content-Disposition', `attachment; filename="transactions-${walletAddress}-${Date.now()}.json"`)
          return reply.send({
            exportedAt: new Date().toISOString(),
            walletAddress,
            projectId: project_id,
            transactions: transactions?.map(tx => ({
              date: tx.created_at,
              type: tx.transaction_type,
              commodity: tx.commodity_type,
              amount: tx.amount,
              valueUSD: tx.value_usd,
              txHash: tx.transaction_hash,
              status: tx.status || 'completed'
            }))
          })
        }
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to export transactions'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/history/transaction/:transactionId
   * Get detailed information about a specific transaction
   */
  fastify.get<GetTransactionDetailsParams>(
    '/api/trade-finance/history/transaction/:transactionId',
    async (
      request: FastifyRequest<GetTransactionDetailsParams>,
      reply: FastifyReply
    ) => {
      try {
        const { transactionId } = request.params
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        const { data: transaction, error } = await fastify.supabase
          .from('trade_finance_reserve_transactions')
          .select('*')
          .eq('id', transactionId)
          .eq('project_id', project_id)
          .single()

        if (error || !transaction) {
          return reply.status(404).send({
            error: { message: 'Transaction not found' }
          })
        }

        return reply.send({
          data: {
            id: transaction.id,
            type: transaction.transaction_type,
            walletAddress: transaction.wallet_address,
            commodityType: transaction.commodity_type,
            amount: transaction.amount,
            valueUSD: transaction.value_usd,
            timestamp: transaction.created_at,
            txHash: transaction.transaction_hash,
            status: transaction.status || 'completed',
            blockNumber: transaction.block_number,
            gasUsed: transaction.gas_used,
            gasPriceGwei: transaction.gas_price_gwei,
            metadata: transaction.metadata || {}
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch transaction details'
          }
        })
      }
    }
  )
}
