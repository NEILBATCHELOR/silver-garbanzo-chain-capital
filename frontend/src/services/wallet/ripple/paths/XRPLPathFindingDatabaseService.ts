/**
 * XRPL Path Finding Database Service
 * Manages path finding history and analytics
 */

import { supabase } from '@/infrastructure/database/client'
import {
  DBPathFindRecord,
  PathFindRequest,
  EnhancedPathAlternative
} from './types'

export class XRPLPathFindingDatabaseService {
  /**
   * Save path finding search to database
   */
  async savePathSearch(
    projectId: string,
    request: PathFindRequest,
    bestPath: EnhancedPathAlternative
  ): Promise<DBPathFindRecord> {
    const destAmount = typeof request.destinationAmount === 'string'
      ? request.destinationAmount
      : request.destinationAmount.value

    const destCurrency = typeof request.destinationAmount === 'string'
      ? 'XRP'
      : request.destinationAmount.currency

    const destIssuer = typeof request.destinationAmount === 'string'
      ? null
      : request.destinationAmount.issuer || null

    const { data, error } = await supabase
      .from('xrpl_path_searches')
      .insert({
        project_id: projectId,
        source_account: request.sourceAccount,
        destination_account: request.destinationAccount,
        source_currency: 'XRP', // Default, could be enhanced
        source_issuer: null,
        destination_currency: destCurrency,
        destination_issuer: destIssuer,
        destination_amount: destAmount,
        best_path: bestPath.paths_computed,
        effective_rate: bestPath.effectiveExchangeRate,
        total_cost: bestPath.totalCost,
        path_length: bestPath.pathLength,
        intermediary_count: bestPath.intermediaryCount,
        quality_score: bestPath.quality,
        searched_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save path search: ${error.message}`)
    }

    return {
      id: data.id,
      project_id: data.project_id,
      source_account: data.source_account,
      destination_account: data.destination_account,
      source_currency: data.source_currency,
      source_issuer: data.source_issuer,
      destination_currency: data.destination_currency,
      destination_issuer: data.destination_issuer,
      destination_amount: data.destination_amount,
      best_path: data.best_path,
      effective_rate: data.effective_rate,
      total_cost: data.total_cost,
      path_length: data.path_length,
      searched_at: new Date(data.searched_at),
      created_at: new Date(data.created_at)
    }
  }

  /**
   * Get path search history for project
   */
  async getPathSearchHistory(
    projectId: string,
    limit: number = 50
  ): Promise<DBPathFindRecord[]> {
    const { data, error } = await supabase
      .from('xrpl_path_searches')
      .select('*')
      .eq('project_id', projectId)
      .order('searched_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get path search history: ${error.message}`)
    }

    return data.map(record => ({
      id: record.id,
      project_id: record.project_id,
      source_account: record.source_account,
      destination_account: record.destination_account,
      source_currency: record.source_currency,
      source_issuer: record.source_issuer,
      destination_currency: record.destination_currency,
      destination_issuer: record.destination_issuer,
      destination_amount: record.destination_amount,
      best_path: record.best_path,
      effective_rate: record.effective_rate,
      total_cost: record.total_cost,
      path_length: record.path_length,
      searched_at: new Date(record.searched_at),
      created_at: new Date(record.created_at)
    }))
  }

  /**
   * Get frequently used paths between accounts
   */
  async getFrequentPaths(
    projectId: string,
    sourceAccount: string,
    destinationAccount: string,
    limit: number = 10
  ): Promise<DBPathFindRecord[]> {
    const { data, error } = await supabase
      .from('xrpl_path_searches')
      .select('*')
      .eq('project_id', projectId)
      .eq('source_account', sourceAccount)
      .eq('destination_account', destinationAccount)
      .order('searched_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get frequent paths: ${error.message}`)
    }

    return data.map(record => ({
      id: record.id,
      project_id: record.project_id,
      source_account: record.source_account,
      destination_account: record.destination_account,
      source_currency: record.source_currency,
      source_issuer: record.source_issuer,
      destination_currency: record.destination_currency,
      destination_issuer: record.destination_issuer,
      destination_amount: record.destination_amount,
      best_path: record.best_path,
      effective_rate: record.effective_rate,
      total_cost: record.total_cost,
      path_length: record.path_length,
      searched_at: new Date(record.searched_at),
      created_at: new Date(record.created_at)
    }))
  }

  /**
   * Get path analytics for project
   */
  async getPathAnalytics(projectId: string): Promise<{
    totalSearches: number
    averagePathLength: number
    averageEffectiveRate: number
    mostUsedCurrencyPairs: Array<{
      sourceCurrency: string
      destinationCurrency: string
      count: number
    }>
  }> {
    const { data: searches, error } = await supabase
      .from('xrpl_path_searches')
      .select('path_length, effective_rate, source_currency, destination_currency')
      .eq('project_id', projectId)

    if (error) {
      throw new Error(`Failed to get path analytics: ${error.message}`)
    }

    const totalSearches = searches.length
    const averagePathLength = searches.reduce((sum, s) => sum + s.path_length, 0) / totalSearches || 0
    const averageEffectiveRate = searches.reduce((sum, s) => sum + s.effective_rate, 0) / totalSearches || 0

    // Count currency pairs
    const pairCounts = new Map<string, number>()
    searches.forEach(s => {
      const key = `${s.source_currency}-${s.destination_currency}`
      pairCounts.set(key, (pairCounts.get(key) || 0) + 1)
    })

    const mostUsedCurrencyPairs = Array.from(pairCounts.entries())
      .map(([pair, count]) => {
        const [sourceCurrency, destinationCurrency] = pair.split('-')
        return { sourceCurrency, destinationCurrency, count }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalSearches,
      averagePathLength,
      averageEffectiveRate,
      mostUsedCurrencyPairs
    }
  }
}

export const xrplPathFindingDatabaseService = new XRPLPathFindingDatabaseService()
