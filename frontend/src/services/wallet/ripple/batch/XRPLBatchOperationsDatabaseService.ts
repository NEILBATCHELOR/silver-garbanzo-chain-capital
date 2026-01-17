/**
 * XRPL Batch Operations Database Service
 * Manages batch transaction persistence
 */

import { supabase } from '@/infrastructure/database/client'
import {
  DBBatchTransaction,
  BatchTransactionResult,
  BatchExecutionStats
} from './types'

export class XRPLBatchOperationsDatabaseService {
  /**
   * Save batch transaction to database
   */
  async saveBatchTransaction(
    projectId: string,
    submitterAccount: string,
    result: BatchTransactionResult,
    allOrNothing: boolean
  ): Promise<DBBatchTransaction> {
    const { data, error } = await supabase
      .from('xrpl_batch_transactions')
      .insert({
        project_id: projectId,
        submitter_account: submitterAccount,
        batch_hash: result.hash,
        inner_transaction_count: result.innerTransactionHashes.length,
        all_or_nothing: allOrNothing,
        status: result.status,
        all_succeeded: result.allSucceeded,
        failed_count: result.failedTransactions.length,
        inner_transaction_hashes: result.innerTransactionHashes,
        ledger_index: result.ledgerIndex,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save batch transaction: ${error.message}`)
    }

    return {
      id: data.id,
      project_id: data.project_id,
      submitter_account: data.submitter_account,
      batch_hash: data.batch_hash,
      inner_transaction_count: data.inner_transaction_count,
      all_or_nothing: data.all_or_nothing,
      status: data.status,
      all_succeeded: data.all_succeeded,
      failed_count: data.failed_count,
      inner_transaction_hashes: data.inner_transaction_hashes,
      ledger_index: data.ledger_index,
      submitted_at: new Date(data.submitted_at),
      created_at: new Date(data.created_at)
    }
  }

  /**
   * Get batch transaction by hash
   */
  async getBatchTransaction(
    projectId: string,
    batchHash: string
  ): Promise<DBBatchTransaction | null> {
    const { data, error } = await supabase
      .from('xrpl_batch_transactions')
      .select('*')
      .eq('project_id', projectId)
      .eq('batch_hash', batchHash)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get batch transaction: ${error.message}`)
    }

    return {
      id: data.id,
      project_id: data.project_id,
      submitter_account: data.submitter_account,
      batch_hash: data.batch_hash,
      inner_transaction_count: data.inner_transaction_count,
      all_or_nothing: data.all_or_nothing,
      status: data.status,
      all_succeeded: data.all_succeeded,
      failed_count: data.failed_count,
      inner_transaction_hashes: data.inner_transaction_hashes,
      ledger_index: data.ledger_index,
      submitted_at: new Date(data.submitted_at),
      created_at: new Date(data.created_at)
    }
  }

  /**
   * Get batch transactions for project
   */
  async getBatchTransactions(
    projectId: string,
    limit: number = 50
  ): Promise<DBBatchTransaction[]> {
    const { data, error } = await supabase
      .from('xrpl_batch_transactions')
      .select('*')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get batch transactions: ${error.message}`)
    }

    return data.map(record => ({
      id: record.id,
      project_id: record.project_id,
      submitter_account: record.submitter_account,
      batch_hash: record.batch_hash,
      inner_transaction_count: record.inner_transaction_count,
      all_or_nothing: record.all_or_nothing,
      status: record.status,
      all_succeeded: record.all_succeeded,
      failed_count: record.failed_count,
      inner_transaction_hashes: record.inner_transaction_hashes,
      ledger_index: record.ledger_index,
      submitted_at: new Date(record.submitted_at),
      created_at: new Date(record.created_at)
    }))
  }

  /**
   * Get batch transactions by account
   */
  async getBatchTransactionsByAccount(
    projectId: string,
    accountAddress: string,
    limit: number = 50
  ): Promise<DBBatchTransaction[]> {
    const { data, error } = await supabase
      .from('xrpl_batch_transactions')
      .select('*')
      .eq('project_id', projectId)
      .eq('submitter_account', accountAddress)
      .order('submitted_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get batch transactions by account: ${error.message}`)
    }

    return data.map(record => ({
      id: record.id,
      project_id: record.project_id,
      submitter_account: record.submitter_account,
      batch_hash: record.batch_hash,
      inner_transaction_count: record.inner_transaction_count,
      all_or_nothing: record.all_or_nothing,
      status: record.status,
      all_succeeded: record.all_succeeded,
      failed_count: record.failed_count,
      inner_transaction_hashes: record.inner_transaction_hashes,
      ledger_index: record.ledger_index,
      submitted_at: new Date(record.submitted_at),
      created_at: new Date(record.created_at)
    }))
  }

  /**
   * Get batch execution statistics
   */
  async getBatchExecutionStats(
    projectId: string
  ): Promise<BatchExecutionStats> {
    const { data: batches, error } = await supabase
      .from('xrpl_batch_transactions')
      .select('all_succeeded, inner_transaction_count, submitted_at')
      .eq('project_id', projectId)

    if (error) {
      throw new Error(`Failed to get batch execution stats: ${error.message}`)
    }

    const totalBatches = batches.length
    const successfulBatches = batches.filter(b => b.all_succeeded).length
    const failedBatches = totalBatches - successfulBatches
    const averageInnerTransactions = batches.reduce(
      (sum, b) => sum + b.inner_transaction_count, 
      0
    ) / totalBatches || 0

    return {
      totalBatches,
      successfulBatches,
      failedBatches,
      averageInnerTransactions,
      averageExecutionTime: 0 // Would need timestamp comparison
    }
  }

  /**
   * Check if batch transaction exists
   */
  async batchExists(
    projectId: string,
    batchHash: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('xrpl_batch_transactions')
      .select('id')
      .eq('project_id', projectId)
      .eq('batch_hash', batchHash)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check batch existence: ${error.message}`)
    }

    return !!data
  }
}

export const xrplBatchOperationsDatabaseService = new XRPLBatchOperationsDatabaseService()
