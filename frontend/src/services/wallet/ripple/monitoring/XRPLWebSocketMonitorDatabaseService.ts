/**
 * XRPL WebSocket Monitoring Database Service
 * Persists monitored transaction data
 */

import { supabase } from '@/infrastructure/database/client'
import {
  TransactionStreamMessage,
  DBMonitoredTransaction,
  MonitoringStats
} from './types'

export class XRPLWebSocketMonitorDatabaseService {
  /**
   * Save monitored transaction to database
   */
  async saveMonitoredTransaction(
    projectId: string,
    accountAddress: string,
    tx: TransactionStreamMessage
  ): Promise<DBMonitoredTransaction> {
    const amount = tx.transaction.Amount
    const amountString = typeof amount === 'string' 
      ? amount 
      : amount?.value || null

    const currency = typeof amount === 'string'
      ? 'XRP'
      : amount?.currency || null

    const { data, error } = await supabase
      .from('xrpl_monitored_transactions')
      .insert({
        project_id: projectId,
        account_address: accountAddress,
        transaction_hash: tx.transaction.hash || '',
        transaction_type: tx.transaction.TransactionType,
        destination_address: tx.transaction.Destination || null,
        amount: amountString,
        currency: currency,
        status: tx.meta.TransactionResult,
        validated: tx.validated,
        ledger_index: tx.ledger_index || null,
        transaction_data: tx.transaction,
        metadata: tx.meta,
        detected_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save monitored transaction: ${error.message}`)
    }

    return {
      id: data.id,
      project_id: data.project_id,
      account_address: data.account_address,
      transaction_hash: data.transaction_hash,
      transaction_type: data.transaction_type,
      destination_address: data.destination_address,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      validated: data.validated,
      ledger_index: data.ledger_index,
      detected_at: new Date(data.detected_at),
      created_at: new Date(data.created_at)
    }
  }

  /**
   * Get monitored transactions for account
   */
  async getMonitoredTransactions(
    projectId: string,
    accountAddress: string,
    limit: number = 100
  ): Promise<DBMonitoredTransaction[]> {
    const { data, error } = await supabase
      .from('xrpl_monitored_transactions')
      .select('*')
      .eq('project_id', projectId)
      .eq('account_address', accountAddress)
      .order('detected_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get monitored transactions: ${error.message}`)
    }

    return data.map(record => ({
      id: record.id,
      project_id: record.project_id,
      account_address: record.account_address,
      transaction_hash: record.transaction_hash,
      transaction_type: record.transaction_type,
      destination_address: record.destination_address,
      amount: record.amount,
      currency: record.currency,
      status: record.status,
      validated: record.validated,
      ledger_index: record.ledger_index,
      detected_at: new Date(record.detected_at),
      created_at: new Date(record.created_at)
    }))
  }

  /**
   * Get recent transactions across all monitored accounts
   */
  async getRecentTransactions(
    projectId: string,
    limit: number = 50
  ): Promise<DBMonitoredTransaction[]> {
    const { data, error } = await supabase
      .from('xrpl_monitored_transactions')
      .select('*')
      .eq('project_id', projectId)
      .order('detected_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get recent transactions: ${error.message}`)
    }

    return data.map(record => ({
      id: record.id,
      project_id: record.project_id,
      account_address: record.account_address,
      transaction_hash: record.transaction_hash,
      transaction_type: record.transaction_type,
      destination_address: record.destination_address,
      amount: record.amount,
      currency: record.currency,
      status: record.status,
      validated: record.validated,
      ledger_index: record.ledger_index,
      detected_at: new Date(record.detected_at),
      created_at: new Date(record.created_at)
    }))
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStats(
    projectId: string
  ): Promise<MonitoringStats> {
    const { data: transactions, error } = await supabase
      .from('xrpl_monitored_transactions')
      .select('validated, status, account_address, detected_at')
      .eq('project_id', projectId)

    if (error) {
      throw new Error(`Failed to get monitoring stats: ${error.message}`)
    }

    const totalTransactions = transactions.length
    const validatedTransactions = transactions.filter(t => t.validated).length
    const failedTransactions = transactions.filter(t => t.status !== 'tesSUCCESS').length

    // Calculate average confirmation time (simplified)
    const averageConfirmationTime = 0 // Would need to compare timestamps

    // Find most active account
    const accountCounts = new Map<string, number>()
    transactions.forEach(t => {
      accountCounts.set(t.account_address, (accountCounts.get(t.account_address) || 0) + 1)
    })
    
    const mostActiveAccount = Array.from(accountCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || ''

    return {
      totalTransactions,
      validatedTransactions,
      failedTransactions,
      averageConfirmationTime,
      mostActiveAccount
    }
  }

  /**
   * Check if transaction already monitored
   */
  async isTransactionMonitored(
    projectId: string,
    transactionHash: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('xrpl_monitored_transactions')
      .select('id')
      .eq('project_id', projectId)
      .eq('transaction_hash', transactionHash)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw new Error(`Failed to check transaction: ${error.message}`)
    }

    return !!data
  }
}

export const xrplWebSocketMonitorDatabaseService = new XRPLWebSocketMonitorDatabaseService()
