import { BaseService } from '../../BaseService'
import { ServiceResult } from '../../../types/index'
import { ethers } from 'ethers'
import {
  UserOperation,
  UserOperationReceipt
} from './types'

/**
 * BundlerService - EIP-4337 Transaction Bundling Management
 * 
 * Handles bundler operations for efficient UserOperation submission:
 * - Bundle management and optimization
 * - Multiple bundler provider integration  
 * - Bundle status tracking and analytics
 * - Gas optimization across bundled operations
 */

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
}

export interface BundleOperation {
  id: string
  bundleHash: string
  bundlerAddress: string
  entryPointAddress: string
  chainId: number
  userOperations: string[] // Array of user operation hashes
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
  gasEfficiency: number // Percentage gas saved vs individual transactions
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

export class BundlerService extends BaseService {
  private bundlerConfigs: Map<string, BundlerConfiguration>
  private activeBundles: Map<string, BundleOperation>
  private provider: ethers.JsonRpcProvider

  constructor() {
    super('Bundler')
    
    this.provider = new ethers.JsonRpcProvider(
      process.env.BLOCKCHAIN_RPC_URL || 'https://ethereum.publicnode.com'
    )
    
    this.bundlerConfigs = new Map()
    this.activeBundles = new Map()
    
    // Initialize bundler configurations
    this.initializeBundlerConfigs()
  }

  /**
   * Create a new bundle with multiple UserOperations
   */
  async createBundle(
    userOps: UserOperation[],
    chainId: number,
    preferredBundler?: string
  ): Promise<ServiceResult<BundleOperation>> {
    try {
      // Select optimal bundler
      const bundlerConfig = await this.selectOptimalBundler(chainId, preferredBundler)
      if (!bundlerConfig) {
        return this.error('No active bundler available for chain', 'NO_BUNDLER_AVAILABLE')
      }

      // Validate bundle size
      if (userOps.length > bundlerConfig.maxBundleSize) {
        return this.error(`Bundle size exceeds maximum (${bundlerConfig.maxBundleSize})`, 'BUNDLE_SIZE_EXCEEDED')
      }

      // Calculate total gas and validate
      const totalGasLimit = this.calculateTotalGasLimit(userOps)
      const bundleHash = this.generateBundleHash(userOps, bundlerConfig.bundlerAddress)

      // Create bundle operation
      const bundle: BundleOperation = {
        id: ethers.id(bundleHash + Date.now().toString()),
        bundleHash,
        bundlerAddress: bundlerConfig.bundlerAddress,
        entryPointAddress: bundlerConfig.entryPointAddress,
        chainId,
        userOperations: userOps.map(op => ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(op)))),
        status: 'pending',
        bundleSize: userOps.length,
        totalGasLimit,
        createdAt: new Date()
      }

      // Store bundle in database using Prisma
      const stored = await this.storeBundleOperation(bundle)
      if (!stored.success) {
        return this.error('Failed to store bundle operation', 'BUNDLE_STORE_FAILED')
      }

      this.activeBundles.set(bundleHash, bundle)
      
      this.logInfo('Bundle created successfully', {
        bundleHash,
        userOpCount: userOps.length,
        bundlerAddress: bundlerConfig.bundlerAddress
      })

      return this.success(bundle)
      
    } catch (error) {
      this.logError('Failed to create bundle', error)
      return this.error('Bundle creation failed', 'BUNDLE_CREATE_FAILED')
    }
  }

  /**
   * Submit bundle to bundler for execution
   */
  async submitBundle(bundleHash: string): Promise<ServiceResult<string>> {
    try {
      const bundle = this.activeBundles.get(bundleHash)
      if (!bundle) {
        return this.error('Bundle not found', 'BUNDLE_NOT_FOUND')
      }

      const bundlerConfig = this.bundlerConfigs.get(bundle.bundlerAddress)
      if (!bundlerConfig) {
        return this.error('Bundler configuration not found', 'BUNDLER_CONFIG_NOT_FOUND')
      }

      // Submit to bundler via RPC
      const submissionResult = await this.submitToBundlerRPC(bundle, bundlerConfig)
      if (!submissionResult.success || !submissionResult.data) {
        await this.updateBundleStatus(bundleHash, 'failed', submissionResult.error)
        return submissionResult
      }

      // Update bundle status
      bundle.status = 'submitted'
      bundle.submittedAt = new Date()
      bundle.transactionHash = submissionResult.data

      await this.updateBundleStatus(bundleHash, 'submitted')
      
      this.logInfo('Bundle submitted successfully', {
        bundleHash,
        transactionHash: submissionResult.data
      })

      return this.success(submissionResult.data)
      
    } catch (error) {
      this.logError('Failed to submit bundle', error)
      return this.error('Bundle submission failed', 'BUNDLE_SUBMIT_FAILED')
    }
  }

  /**
   * Get bundle status and details
   */
  async getBundleStatus(bundleHash: string): Promise<ServiceResult<BundleStatus>> {
    try {
      // Check database for bundle using Prisma
      const bundle = await this.db.bundler_operations.findFirst({
        where: { bundle_hash: bundleHash }
      })

      if (!bundle) {
        return this.error('Bundle not found', 'BUNDLE_NOT_FOUND')
      }
      
      // Calculate gas efficiency if completed
      let gasEfficiency = 0
      if (bundle.status === 'included' && bundle.gas_used) {
        gasEfficiency = await this.calculateGasEfficiency(bundle)
      }

      const status: BundleStatus = {
        bundleHash,
        status: bundle.status as any,
        userOpCount: bundle.bundle_size,
        estimatedConfirmationTime: this.estimateConfirmationTime(bundle.chain_id),
        actualConfirmationTime: bundle.included_at && bundle.submitted_at ? 
          Math.floor((new Date(bundle.included_at).getTime() - new Date(bundle.submitted_at).getTime()) / 1000) : 
          undefined,
        gasEfficiency
      }

      return this.success(status)
      
    } catch (error) {
      this.logError('Failed to get bundle status', error)
      return this.error('Failed to get bundle status', 'BUNDLE_STATUS_FAILED')
    }
  }

  /**
   * Get bundler analytics and performance metrics
   */
  async getBundlerAnalytics(
    chainId?: number,
    timeRange?: { start: Date; end: Date }
  ): Promise<ServiceResult<BundleAnalytics>> {
    try {
      // Build where clause for filters
      const where: any = {}
      
      if (chainId) {
        where.chain_id = chainId
      }
      
      if (timeRange) {
        where.created_at = {
          gte: timeRange.start,
          lte: timeRange.end
        }
      }

      // Get bundle statistics using Prisma aggregation
      const [totalBundles, successfulBundles, bundleStats, bundlerPerformance] = await Promise.all([
        this.db.bundler_operations.count({ where }),
        
        this.db.bundler_operations.count({
          where: { ...where, status: 'included' }
        }),
        
        this.db.bundler_operations.aggregate({
          where,
          _avg: {
            bundle_size: true
          }
        }),
        
        this.db.bundler_operations.groupBy({
          by: ['bundler_address'],
          where,
          _count: {
            id: true
          },
          _sum: {
            bundle_size: true
          }
        })
      ])

      // Calculate confirmation times for bundles that were included
      const confirmedBundles = await this.db.bundler_operations.findMany({
        where: {
          ...where,
          status: 'included',
          submitted_at: { not: null },
          included_at: { not: null }
        },
        select: {
          submitted_at: true,
          included_at: true
        }
      })

      const confirmationTimes = confirmedBundles
        .filter(b => b.submitted_at && b.included_at)
        .map(b => (new Date(b.included_at!).getTime() - new Date(b.submitted_at!).getTime()) / 1000)

      const averageConfirmationTime = confirmationTimes.length > 0 
        ? confirmationTimes.reduce((sum: number, time: number) => sum + time, 0) / confirmationTimes.length 
        : 0

      // Get successful bundles per bundler for success rate calculation
      const successfulByBundler = await this.db.bundler_operations.groupBy({
        by: ['bundler_address'],
        where: { ...where, status: 'included' },
        _count: {
          id: true
        }
      })

      const successMap = new Map(
        successfulByBundler.map((item: any) => [item.bundler_address, item._count.id])
      )

      const analytics: BundleAnalytics = {
        totalBundles,
        successRate: totalBundles > 0 ? successfulBundles / totalBundles : 0,
        averageBundleSize: bundleStats._avg.bundle_size || 0,
        averageConfirmationTime,
        gasSavings: BigInt(0), // TODO: Implement gas savings calculation
        topBundlers: bundlerPerformance
          .sort((a: any, b: any) => Number(b._count.id) - Number(a._count.id))
          .slice(0, 5)
          .map((item: any) => ({
            bundlerAddress: item.bundler_address,
            bundleCount: Number(item._count.id),
            successRate: Number(item._count.id) > 0 ? Number(successMap.get(item.bundler_address) || 0) / Number(item._count.id) : 0
          }))
      }

      return this.success(analytics)
      
    } catch (error) {
      this.logError('Failed to get bundler analytics', error)
      return this.error('Failed to get bundler analytics', 'ANALYTICS_FAILED')
    }
  }

  // Private helper methods
  private async initializeBundlerConfigs(): Promise<void> {
    try {
      const configurations = await this.db.bundler_configurations.findMany({
        where: { is_active: true }
      })

      for (const row of configurations) {
        const config: BundlerConfiguration = {
          id: row.id,
          bundlerName: row.bundler_name,
          bundlerAddress: row.bundler_address,
          entryPointAddress: row.entry_point_address,
          chainId: row.chain_id,
          rpcUrl: row.rpc_url,
          maxBundleSize: row.max_bundle_size ?? 10,
          maxBundleWaitTime: row.max_bundle_wait_time ?? 5000,
          minPriorityFee: BigInt(row.min_priority_fee ?? 0),
          isActive: row.is_active ?? true,
          supportedEntryPoints: (row.supported_entry_points as string[]) || [],
          gasPriceMultiplier: parseFloat((row.gas_price_multiplier ?? 1).toString())
        }

        this.bundlerConfigs.set(config.bundlerAddress, config)
      }
      
      this.logInfo('Bundler configurations loaded', { count: this.bundlerConfigs.size })
      
    } catch (error) {
      this.logError('Failed to initialize bundler configurations', error)
    }
  }

  private async selectOptimalBundler(
    chainId: number, 
    preferred?: string
  ): Promise<BundlerConfiguration | null> {
    const availableBundlers = Array.from(this.bundlerConfigs.values())
      .filter(config => config.chainId === chainId && config.isActive)

    if (!availableBundlers.length) {
      return null
    }

    // If preferred bundler specified and available, use it
    if (preferred) {
      const preferredConfig = availableBundlers.find(config => 
        config.bundlerAddress === preferred || config.bundlerName === preferred
      )
      if (preferredConfig) {
        return preferredConfig
      }
    }

    // Otherwise select based on performance metrics
    // TODO: Implement performance-based selection
    return availableBundlers.length > 0 ? (availableBundlers[0] || null) : null
  }

  private calculateTotalGasLimit(userOps: UserOperation[]): bigint {
    return userOps.reduce((total, op) => {
      return total + 
        BigInt(op.callGasLimit) + 
        BigInt(op.verificationGasLimit) + 
        BigInt(op.preVerificationGas)
    }, BigInt(0))
  }

  private generateBundleHash(userOps: UserOperation[], bundlerAddress: string): string {
    const combinedData = userOps.map(op => JSON.stringify(op)).join('') + bundlerAddress + Date.now()
    return ethers.keccak256(ethers.toUtf8Bytes(combinedData))
  }

  private async storeBundleOperation(bundle: BundleOperation): Promise<ServiceResult<void>> {
    try {
      await this.db.bundler_operations.create({
        data: {
          id: bundle.id,
          bundle_hash: bundle.bundleHash,
          bundler_address: bundle.bundlerAddress,
          entry_point_address: bundle.entryPointAddress,
          chain_id: bundle.chainId,
          user_operations: bundle.userOperations as any,
          status: bundle.status,
          bundle_size: bundle.bundleSize,
          total_gas_limit: bundle.totalGasLimit,
          created_at: bundle.createdAt
        }
      })

      return this.success(undefined)
    } catch (error) {
      return this.error('Failed to store bundle operation', 'DB_STORE_FAILED')
    }
  }

  private async updateBundleStatus(
    bundleHash: string, 
    status: string, 
    failureReason?: string
  ): Promise<void> {
    try {
      const updateData: any = { status }

      if (status === 'submitted') {
        updateData.submitted_at = new Date()
      } else if (status === 'included') {
        updateData.included_at = new Date()
      }

      if (failureReason) {
        updateData.failure_reason = failureReason
      }

      await this.db.bundler_operations.updateMany({
        where: { bundle_hash: bundleHash },
        data: updateData
      })
    } catch (error) {
      this.logError('Failed to update bundle status', error)
    }
  }

  private async submitToBundlerRPC(
    bundle: BundleOperation, 
    config: BundlerConfiguration
  ): Promise<ServiceResult<string>> {
    // TODO: Implement actual bundler RPC submission
    // This would integrate with real bundler services like:
    // - Alchemy Bundler
    // - Pimlico Bundler  
    // - Biconomy Bundler
    // - Coinbase Bundler
    
    // For now, simulate successful submission
    const mockTxHash = ethers.keccak256(ethers.toUtf8Bytes(bundle.bundleHash + 'submitted'))
    return this.success(mockTxHash)
  }

  private async calculateGasEfficiency(bundle: any): Promise<number> {
    // TODO: Implement gas efficiency calculation
    // Compare bundled vs individual transaction costs
    return 15 // Mock 15% gas savings
  }

  private estimateConfirmationTime(chainId: number): number {
    // Estimate based on chain characteristics
    switch (chainId) {
      case 1: return 180 // Ethereum mainnet: ~3 minutes
      case 137: return 5 // Polygon: ~5 seconds
      case 42161: return 2 // Arbitrum: ~2 seconds
      case 10: return 2 // Optimism: ~2 seconds
      default: return 60 // Default: 1 minute
    }
  }
}
