/**
 * Frontend BundlerService - EIP-4337 Transaction Bundling Integration
 * 
 * Provides frontend interface to backend bundler operations:
 * - Bundle management and monitoring
 * - Bundler configuration retrieval
 * - Real-time bundle status tracking
 * - Analytics and performance metrics
 */

import { supabase } from '@/infrastructure/database/client'

// Types matching backend interfaces
export interface BundlerConfiguration {
  id: string
  bundlerName: string
  bundlerAddress: string
  entryPointAddress: string
  chainId: number
  rpcUrl: string
  maxBundleSize: number
  maxBundleWaitTime: number
  minPriorityFee: bigint
  isActive: boolean
  supportedEntryPoints: string[]
  gasPriceMultiplier: number
  successRate: number // Success rate as a percentage (0-100)
  createdAt: Date
  updatedAt: Date
}

export interface BundleOperation {
  id: string
  bundleHash: string
  bundlerAddress: string
  entryPointAddress: string
  chainId: number
  userOperations: string[]
  transactionHash?: string
  blockNumber?: bigint
  gasUsed?: bigint
  gasPrice?: bigint
  status: 'pending' | 'submitted' | 'included' | 'failed'
  bundleSize: number
  totalGasLimit: bigint
  createdAt: Date
  submittedAt?: Date
  includedAt?: Date
  failureReason?: string
}

export interface BundleStatus {
  bundleHash: string
  status: 'pending' | 'submitted' | 'included' | 'failed'
  userOpCount: number
  estimatedConfirmationTime?: number
  actualConfirmationTime?: number
  gasEfficiency: number
}

export interface BundleAnalytics {
  totalBundles: number
  successRate: number
  averageBundleSize: number
  averageConfirmationTime: number
  gasSavings: bigint
  topBundlers: Array<{
    bundlerAddress: string
    bundleCount: number
    successRate: number
  }>
}

export class BundlerService {
  private static instance: BundlerService
  private baseUrl: string

  private constructor() {
    this.baseUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3001'
  }

  static getInstance(): BundlerService {
    if (!BundlerService.instance) {
      BundlerService.instance = new BundlerService()
    }
    return BundlerService.instance
  }

  /**
   * Get all bundler configurations
   */
  async getBundlerConfigurations(): Promise<BundlerConfiguration[]> {
    try {
      const { data, error } = await supabase
        .from('bundler_configurations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching bundler configurations:', error)
        return []
      }

      return data.map((row: any) => ({
        id: row.id,
        bundlerName: row.bundler_name,
        bundlerAddress: row.bundler_address,
        entryPointAddress: row.entry_point_address,
        chainId: row.chain_id,
        rpcUrl: row.rpc_url,
        maxBundleSize: row.max_bundle_size || 10,
        maxBundleWaitTime: row.max_bundle_wait_time || 5000,
        minPriorityFee: BigInt(row.min_priority_fee || 0),
        isActive: row.is_active,
        supportedEntryPoints: row.supported_entry_points || [],
        gasPriceMultiplier: parseFloat(row.gas_price_multiplier || '1.0'),
        successRate: parseFloat(row.success_rate || 0),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at || row.created_at)
      }))
    } catch (error) {
      console.error('Failed to fetch bundler configurations:', error)
      return []
    }
  }

  /**
   * Get active bundle operations
   */
  async getActiveBundles(): Promise<BundleOperation[]> {
    try {
      const { data, error } = await supabase
        .from('bundler_operations')
        .select('*')
        .in('status', ['pending', 'submitted'])
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error fetching active bundles:', error)
        return []
      }

      return data.map((row: any) => ({
        id: row.id,
        bundleHash: row.bundle_hash,
        bundlerAddress: row.bundler_address,
        entryPointAddress: row.entry_point_address,
        chainId: row.chain_id,
        userOperations: row.user_operations || [],
        transactionHash: row.transaction_hash,
        blockNumber: row.block_number ? BigInt(row.block_number) : undefined,
        gasUsed: row.gas_used ? BigInt(row.gas_used) : undefined,
        gasPrice: row.gas_price ? BigInt(row.gas_price) : undefined,
        status: row.status,
        bundleSize: row.bundle_size,
        totalGasLimit: BigInt(row.total_gas_limit || 0),
        createdAt: new Date(row.created_at),
        submittedAt: row.submitted_at ? new Date(row.submitted_at) : undefined,
        includedAt: row.included_at ? new Date(row.included_at) : undefined,
        failureReason: row.failure_reason
      }))
    } catch (error) {
      console.error('Failed to fetch active bundles:', error)
      return []
    }
  }

  /**
   * Get bundle status by hash
   */
  async getBundleStatus(bundleHash: string): Promise<BundleStatus | null> {
    try {
      const { data, error } = await supabase
        .from('bundler_operations')
        .select('*')
        .eq('bundle_hash', bundleHash)
        .single()

      if (error) {
        console.error('Error fetching bundle status:', error)
        return null
      }

      // Calculate actual confirmation time if available
      let actualConfirmationTime: number | undefined
      if (data.submitted_at && data.included_at) {
        const submitted = new Date(data.submitted_at).getTime()
        const included = new Date(data.included_at).getTime()
        actualConfirmationTime = Math.floor((included - submitted) / 1000)
      }

      // Estimate confirmation time based on chain
      const estimatedConfirmationTime = this.estimateConfirmationTime(data.chain_id)

      return {
        bundleHash: data.bundle_hash,
        status: data.status,
        userOpCount: data.bundle_size,
        estimatedConfirmationTime,
        actualConfirmationTime,
        gasEfficiency: await this.calculateGasEfficiency(data)
      }
    } catch (error) {
      console.error('Failed to fetch bundle status:', error)
      return null
    }
  }

  /**
   * Get bundler analytics
   */
  async getBundlerAnalytics(
    chainId?: number,
    timeRange?: { start: Date; end: Date }
  ): Promise<BundleAnalytics> {
    try {
      let query = supabase.from('bundler_operations').select('*')

      if (chainId) {
        query = query.eq('chain_id', chainId)
      }

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString())
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching bundle analytics:', error)
        return this.getEmptyAnalytics()
      }

      const totalBundles = data.length
      const successfulBundles = data.filter(bundle => bundle.status === 'included').length
      const successRate = totalBundles > 0 ? successfulBundles / totalBundles : 0

      // Calculate average bundle size
      const averageBundleSize = totalBundles > 0 
        ? data.reduce((sum, bundle) => sum + bundle.bundle_size, 0) / totalBundles 
        : 0

      // Calculate average confirmation time for successful bundles
      const confirmedBundles = data.filter(bundle => 
        bundle.status === 'included' && bundle.submitted_at && bundle.included_at
      )
      const confirmationTimes = confirmedBundles.map(bundle => {
        const submitted = new Date(bundle.submitted_at).getTime()
        const included = new Date(bundle.included_at).getTime()
        return (included - submitted) / 1000
      })
      const averageConfirmationTime = confirmationTimes.length > 0
        ? confirmationTimes.reduce((sum, time) => sum + time, 0) / confirmationTimes.length
        : 0

      // Calculate top bundlers
      const bundlerCounts: Record<string, { count: number; successful: number }> = {}
      data.forEach(bundle => {
        const addr = bundle.bundler_address
        if (!bundlerCounts[addr]) {
          bundlerCounts[addr] = { count: 0, successful: 0 }
        }
        bundlerCounts[addr].count++
        if (bundle.status === 'included') {
          bundlerCounts[addr].successful++
        }
      })

      // Calculate total gas savings from successful bundles
      const gasEfficiencies = await Promise.all(
        data.filter(bundle => bundle.status === 'included').map(bundle => 
          this.calculateGasEfficiency(bundle)
        )
      )
      
      const totalSavingsPercentage = gasEfficiencies.length > 0
        ? gasEfficiencies.reduce((sum, efficiency) => sum + efficiency, 0) / gasEfficiencies.length
        : 0

      // Estimate total gas savings in wei 
      const estimatedTotalGasUsed = data
        .filter(bundle => bundle.gas_used)
        .reduce((sum, bundle) => sum + BigInt(bundle.gas_used), BigInt(0))
      
      const estimatedSavings = estimatedTotalGasUsed * BigInt(Math.floor(totalSavingsPercentage)) / BigInt(100)

      const topBundlers = Object.entries(bundlerCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 5)
        .map(([address, stats]) => ({
          bundlerAddress: address,
          bundleCount: stats.count,
          successRate: stats.count > 0 ? stats.successful / stats.count : 0
        }))

      return {
        totalBundles,
        successRate,
        averageBundleSize,
        averageConfirmationTime,
        gasSavings: estimatedSavings,
        topBundlers
      }
    } catch (error) {
      console.error('Failed to fetch bundler analytics:', error)
      return this.getEmptyAnalytics()
    }
  }

  /**
   * Refresh bundle status (call backend to sync with blockchain)
   */
  async refreshBundles(): Promise<void> {
    try {
      // Call backend API to refresh bundle statuses from blockchain
      await fetch(`${this.baseUrl}/api/bundler/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      console.log('Bundle statuses refreshed successfully')
    } catch (error) {
      console.error('Failed to refresh bundles:', error)
    }
  }

  // Private helper methods
  private estimateConfirmationTime(chainId: number): number {
    switch (chainId) {
      case 1: return 180 // Ethereum mainnet: ~3 minutes
      case 137: return 5 // Polygon: ~5 seconds
      case 42161: return 2 // Arbitrum: ~2 seconds
      case 10: return 2 // Optimism: ~2 seconds
      case 8453: return 2 // Base: ~2 seconds
      default: return 60 // Default: 1 minute
    }
  }

  private async calculateGasEfficiency(bundle: any): Promise<number> {
    // Calculate actual gas efficiency based on bundle data
    try {
      // Get individual transaction gas estimates from database for comparison
      const { data: userOperations } = await supabase
        .from('user_operations')
        .select('actual_gas_cost, estimated_gas_cost')
        .in('user_operation_hash', bundle.user_operations)

      if (!userOperations || userOperations.length === 0) {
        return 0
      }

      // Calculate total individual costs vs bundled cost
      const totalIndividualCost = userOperations.reduce((sum, op) => {
        return sum + (BigInt(op.estimated_gas_cost || 0))
      }, BigInt(0))

      const bundledCost = BigInt(bundle.gas_used || 0)

      if (totalIndividualCost === BigInt(0)) {
        return 0
      }

      // Calculate savings percentage
      const savings = totalIndividualCost - bundledCost
      const efficiency = Number(savings * BigInt(100) / totalIndividualCost)

      return Math.max(0, Math.min(100, efficiency))
    } catch (error) {
      console.error('Failed to calculate gas efficiency:', error)
      return 0
    }
  }

  private getEmptyAnalytics(): BundleAnalytics {
    return {
      totalBundles: 0,
      successRate: 0,
      averageBundleSize: 0,
      averageConfirmationTime: 0,
      gasSavings: BigInt(0),
      topBundlers: []
    }
  }
}

export const bundlerService = BundlerService.getInstance()
