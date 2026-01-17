/**
 * XRPL Path Finding Service
 * Based on official XRPL code sample: paths
 * 
 * Finds optimal payment paths for cross-currency transactions
 * Reference: https://xrpl.org/paths.html
 */

import { Client, Payment, Amount } from 'xrpl'
import {
  PathFindRequest,
  PathFindResult,
  PaymentPath,
  PathAlternative,
  EnhancedPathAlternative,
  PathSelectionCriteria
} from './types'

export class XRPLPathFindingService {
  constructor(private client: Client) {}

  /**
   * Find payment paths using ripple_path_find
   * Based on official XRPL code sample
   */
  async findPaths(request: PathFindRequest): Promise<PathFindResult> {
    const ripplePathFindRequest = {
      command: 'ripple_path_find' as const,
      source_account: request.sourceAccount,
      destination_account: request.destinationAccount,
      destination_amount: request.destinationAmount,
      source_currencies: request.sourceCurrencies || [{ currency: 'XRP' }],
      send_max: request.sendMax
    }

    const response = await this.client.request(ripplePathFindRequest)
    
    return {
      alternatives: response.result.alternatives || [],
      destination_account: response.result.destination_account,
      destination_currencies: response.result.destination_currencies,
      source_account: response.result.source_account,
      full_reply: response.result.full_reply
    }
  }

  /**
   * Find and analyze best paths with enhanced metrics
   */
  async findBestPaths(
    request: PathFindRequest,
    criteria?: PathSelectionCriteria
  ): Promise<EnhancedPathAlternative[]> {
    const result = await this.findPaths(request)
    
    // Enhance each alternative with calculated metrics
    const enhanced = result.alternatives.map(alt => 
      this.enhancePathAlternative(alt, request.destinationAmount)
    )

    // Apply selection criteria and sort
    return this.filterAndSortPaths(enhanced, criteria)
  }

  /**
   * Get single best path based on criteria
   */
  async getBestPath(
    request: PathFindRequest,
    criteria?: PathSelectionCriteria
  ): Promise<EnhancedPathAlternative | null> {
    const paths = await this.findBestPaths(request, criteria)
    return paths.length > 0 ? paths[0] : null
  }

  /**
   * Create payment transaction with optimal path
   */
  async createPaymentWithPaths(
    sourceAccount: string,
    destinationAccount: string,
    destinationAmount: Amount,
    sourceCurrencies?: any[]
  ): Promise<Payment> {
    const request: PathFindRequest = {
      sourceAccount,
      destinationAccount,
      destinationAmount,
      sourceCurrencies
    }

    const bestPath = await this.getBestPath(request)
    
    if (!bestPath) {
      throw new Error('No payment path found')
    }

    return {
      TransactionType: 'Payment',
      Account: sourceAccount,
      Destination: destinationAccount,
      Amount: destinationAmount,
      Paths: bestPath.paths_computed
    }
  }

  /**
   * Enhance path alternative with calculated metrics
   */
  private enhancePathAlternative(
    alternative: PathAlternative,
    destinationAmount: Amount
  ): EnhancedPathAlternative {
    const sourceAmount = alternative.source_amount
    const destAmount = typeof destinationAmount === 'string' 
      ? destinationAmount 
      : destinationAmount.value

    // Calculate exchange rate
    const effectiveExchangeRate = this.calculateExchangeRate(
      sourceAmount,
      destAmount
    )

    // Calculate total cost
    const totalCost = typeof sourceAmount === 'string'
      ? sourceAmount
      : sourceAmount.value

    // Count path steps and intermediaries
    const pathLength = alternative.paths_computed.length
    const intermediaryCount = this.countIntermediaries(alternative.paths_computed)

    // Calculate quality score (0-100)
    const quality = this.calculatePathQuality(
      pathLength,
      intermediaryCount,
      effectiveExchangeRate
    )

    return {
      ...alternative,
      effectiveExchangeRate,
      totalCost,
      pathLength,
      intermediaryCount,
      quality
    }
  }

  /**
   * Calculate effective exchange rate
   */
  private calculateExchangeRate(
    sourceAmount: Amount,
    destinationAmount: string
  ): number {
    const source = typeof sourceAmount === 'string'
      ? parseFloat(sourceAmount)
      : parseFloat(sourceAmount.value)
    
    const dest = parseFloat(destinationAmount)
    
    return source / dest
  }

  /**
   * Count intermediary accounts in path
   */
  private countIntermediaries(paths: PaymentPath[]): number {
    let count = 0
    for (const path of paths) {
      for (const step of path) {
        if (step.account) {
          count++
        }
      }
    }
    return count
  }

  /**
   * Calculate path quality score (0-100)
   * Higher is better
   */
  private calculatePathQuality(
    pathLength: number,
    intermediaryCount: number,
    exchangeRate: number
  ): number {
    // Shorter paths are better (max 50 points)
    const pathScore = Math.max(0, 50 - (pathLength * 10))
    
    // Fewer intermediaries are better (max 30 points)
    const intermediaryScore = Math.max(0, 30 - (intermediaryCount * 5))
    
    // Better exchange rate is better (max 20 points)
    const rateScore = Math.min(20, exchangeRate * 10)
    
    return pathScore + intermediaryScore + rateScore
  }

  /**
   * Filter and sort paths based on criteria
   */
  private filterAndSortPaths(
    paths: EnhancedPathAlternative[],
    criteria?: PathSelectionCriteria
  ): EnhancedPathAlternative[] {
    let filtered = [...paths]

    if (criteria) {
      // Apply filters
      if (criteria.maxPathLength !== undefined) {
        filtered = filtered.filter(p => p.pathLength <= criteria.maxPathLength!)
      }
      if (criteria.maxIntermediaries !== undefined) {
        filtered = filtered.filter(p => p.intermediaryCount <= criteria.maxIntermediaries!)
      }
      if (criteria.minimumQuality !== undefined) {
        filtered = filtered.filter(p => p.quality >= criteria.minimumQuality!)
      }

      // Sort based on priorities
      if (criteria.prioritizeShortestPath) {
        filtered.sort((a, b) => a.pathLength - b.pathLength)
      } else if (criteria.prioritizeCheapestPath) {
        filtered.sort((a, b) => 
          parseFloat(a.totalCost) - parseFloat(b.totalCost)
        )
      } else {
        // Default: sort by quality score
        filtered.sort((a, b) => b.quality - a.quality)
      }
    } else {
      // Default: sort by quality
      filtered.sort((a, b) => b.quality - a.quality)
    }

    return filtered
  }

  /**
   * Estimate total path cost including fees
   */
  async estimatePathCost(
    request: PathFindRequest
  ): Promise<{
    minimumCost: string
    maximumCost: string
    averageCost: string
    bestPath: EnhancedPathAlternative | null
  }> {
    const paths = await this.findBestPaths(request)
    
    if (paths.length === 0) {
      return {
        minimumCost: '0',
        maximumCost: '0',
        averageCost: '0',
        bestPath: null
      }
    }

    const costs = paths.map(p => parseFloat(p.totalCost))
    const minimumCost = Math.min(...costs).toString()
    const maximumCost = Math.max(...costs).toString()
    const averageCost = (costs.reduce((a, b) => a + b, 0) / costs.length).toString()

    return {
      minimumCost,
      maximumCost,
      averageCost,
      bestPath: paths[0]
    }
  }
}

export const createPathFindingService = (client: Client) => 
  new XRPLPathFindingService(client)
