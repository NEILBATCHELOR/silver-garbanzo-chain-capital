import { BaseService } from '../BaseService'
import { ServiceResult } from '../../types/api'
import {
  BlockchainNetwork,
  TransactionPriority,
  TransactionFeeEstimate,
  TRANSACTION_CONFIG
} from './types'
import { ethers } from 'ethers'
import { Connection } from '@solana/web3.js'

/**
 * Fee estimation service for multi-chain transactions
 * Provides dynamic fee calculation based on network conditions and priority levels
 */
export class FeeEstimationService extends BaseService {
  private providers: Map<BlockchainNetwork, any> = new Map()
  private feeCache: Map<string, { estimate: TransactionFeeEstimate; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 30000 // 30 seconds

  constructor() {
    super('FeeEstimation')
    this.initializeProviders()
  }

  /**
   * Initialize blockchain providers for fee estimation
   */
  private initializeProviders(): void {
    try {
      // Ethereum family providers - using correct env var names from .env
      if (process.env.VITE_MAINNET_RPC_URL) {
        this.providers.set('ethereum', new ethers.JsonRpcProvider(process.env.VITE_MAINNET_RPC_URL))
      }
      if (process.env.VITE_POLYGON_RPC_URL) {
        this.providers.set('polygon', new ethers.JsonRpcProvider(process.env.VITE_POLYGON_RPC_URL))
      }
      if (process.env.VITE_ARBITRUM_RPC_URL) {
        this.providers.set('arbitrum', new ethers.JsonRpcProvider(process.env.VITE_ARBITRUM_RPC_URL))
      }
      if (process.env.VITE_OPTIMISM_RPC_URL) {
        this.providers.set('optimism', new ethers.JsonRpcProvider(process.env.VITE_OPTIMISM_RPC_URL))
      }
      if (process.env.VITE_AVALANCHE_RPC_URL) {
        this.providers.set('avalanche', new ethers.JsonRpcProvider(process.env.VITE_AVALANCHE_RPC_URL))
      }

      // Solana provider
      if (process.env.VITE_SOLANA_RPC_URL) {
        this.providers.set('solana', new Connection(process.env.VITE_SOLANA_RPC_URL, 'confirmed'))
      }

      this.logger.info('Fee estimation providers initialized', {
        ethereum: !!process.env.VITE_MAINNET_RPC_URL,
        polygon: !!process.env.VITE_POLYGON_RPC_URL,
        arbitrum: !!process.env.VITE_ARBITRUM_RPC_URL,
        optimism: !!process.env.VITE_OPTIMISM_RPC_URL,
        avalanche: !!process.env.VITE_AVALANCHE_RPC_URL,
        solana: !!process.env.VITE_SOLANA_RPC_URL
      })

    } catch (error) {
      this.logger.warn('Failed to initialize some fee estimation providers:', error)
    }
  }

  /**
   * Estimate transaction fees for any supported blockchain
   */
  async estimateFee(params: {
    blockchain: BlockchainNetwork
    gasUsed?: string
    priority?: TransactionPriority
    to?: string
    amount?: string
    data?: string
  }): Promise<TransactionFeeEstimate> {
    try {
      this.logger.info('Estimating fees', { 
        blockchain: params.blockchain,
        priority: params.priority || 'medium'
      })

      // Check cache first
      const cacheKey = `${params.blockchain}_${params.priority || 'medium'}_${params.gasUsed || 'default'}`
      const cached = this.feeCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        this.logger.debug('Returning cached fee estimate', { blockchain: params.blockchain })
        return cached.estimate
      }

      let estimate: TransactionFeeEstimate

      switch (params.blockchain) {
        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          estimate = await this.estimateEVMFee(params)
          break

        case 'solana':
          estimate = await this.estimateSolanaFee(params)
          break

        case 'bitcoin':
          estimate = await this.estimateBitcoinFee(params)
          break

        case 'near':
          estimate = await this.estimateNearFee(params)
          break

        default:
          // Fallback to basic estimate
          estimate = this.getBasicFeeEstimate(params.blockchain, params.gasUsed || '21000')
      }

      // Cache the result
      this.feeCache.set(cacheKey, {
        estimate,
        timestamp: Date.now()
      })

      this.logger.info('Fee estimation completed', {
        blockchain: params.blockchain,
        lowFee: estimate.low.fee,
        mediumFee: estimate.medium.fee,
        highFee: estimate.high.fee
      })

      return estimate

    } catch (error) {
      this.logger.error('Failed to estimate fees:', error)
      
      // Return fallback estimate on error
      return this.getBasicFeeEstimate(params.blockchain, params.gasUsed || '21000')
    }
  }

  /**
   * Estimate fees for EVM-compatible blockchains
   */
  private async estimateEVMFee(params: {
    blockchain: BlockchainNetwork
    gasUsed?: string
    priority?: TransactionPriority
    to?: string
    amount?: string
    data?: string
  }): Promise<TransactionFeeEstimate> {
    const provider = this.providers.get(params.blockchain)
    if (!provider) {
      return this.getBasicFeeEstimate(params.blockchain, params.gasUsed || '21000')
    }

    try {
      // Get current fee data
      const feeData = await provider.getFeeData()
      
      // Estimate gas limit if not provided
      let gasLimit = BigInt(params.gasUsed || '21000')
      if (params.to && params.amount && !params.gasUsed) {
        try {
          const gasEstimate = await provider.estimateGas({
            to: params.to,
            value: ethers.parseEther(params.amount),
            data: params.data || '0x'
          })
          gasLimit = gasEstimate
        } catch (error) {
          this.logger.warn('Failed to estimate gas, using default', error)
        }
      }

      // Handle EIP-1559 (Type 2) transactions
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        return this.calculateEIP1559Fees(
          gasLimit,
          feeData.maxFeePerGas,
          feeData.maxPriorityFeePerGas,
          params.blockchain
        )
      }

      // Handle legacy (Type 0) transactions
      if (feeData.gasPrice) {
        return this.calculateLegacyFees(
          gasLimit,
          feeData.gasPrice,
          params.blockchain
        )
      }

      // Fallback if no fee data available
      return this.getBasicFeeEstimate(params.blockchain, gasLimit.toString())

    } catch (error) {
      this.logger.error('Failed to estimate EVM fees:', error)
      return this.getBasicFeeEstimate(params.blockchain, params.gasUsed || '21000')
    }
  }

  /**
   * Calculate EIP-1559 transaction fees
   */
  private calculateEIP1559Fees(
    gasLimit: bigint,
    maxFeePerGas: bigint,
    maxPriorityFeePerGas: bigint,
    blockchain: BlockchainNetwork
  ): TransactionFeeEstimate {
    const baseFee = maxFeePerGas - maxPriorityFeePerGas

    // Calculate fees for different priority levels
    const lowPriorityFee = maxPriorityFeePerGas * BigInt(50) / BigInt(100) // 50% of current
    const mediumPriorityFee = maxPriorityFeePerGas
    const highPriorityFee = maxPriorityFeePerGas * BigInt(150) / BigInt(100) // 150% of current
    
    const lowMaxFee = baseFee + lowPriorityFee
    const mediumMaxFee = baseFee + mediumPriorityFee
    const highMaxFee = baseFee + highPriorityFee

    return {
      low: {
        fee: ethers.formatEther(lowMaxFee * gasLimit),
        time: this.getEstimatedConfirmationTime(blockchain, 'low')
      },
      medium: {
        fee: ethers.formatEther(mediumMaxFee * gasLimit),
        time: this.getEstimatedConfirmationTime(blockchain, 'medium')
      },
      high: {
        fee: ethers.formatEther(highMaxFee * gasLimit),
        time: this.getEstimatedConfirmationTime(blockchain, 'high')
      },
      gasLimit: gasLimit.toString(),
      baseFee: ethers.formatUnits(baseFee, 'gwei'),
      priorityFee: ethers.formatUnits(maxPriorityFeePerGas, 'gwei'),
      maxFee: ethers.formatUnits(maxFeePerGas, 'gwei')
    }
  }

  /**
   * Calculate legacy transaction fees
   */
  private calculateLegacyFees(
    gasLimit: bigint,
    gasPrice: bigint,
    blockchain: BlockchainNetwork
  ): TransactionFeeEstimate {
    // Apply priority multipliers
    const lowGasPrice = gasPrice * BigInt(80) / BigInt(100) // 80% of current
    const mediumGasPrice = gasPrice
    const highGasPrice = gasPrice * BigInt(130) / BigInt(100) // 130% of current

    return {
      low: {
        fee: ethers.formatEther(lowGasPrice * gasLimit),
        time: this.getEstimatedConfirmationTime(blockchain, 'low')
      },
      medium: {
        fee: ethers.formatEther(mediumGasPrice * gasLimit),
        time: this.getEstimatedConfirmationTime(blockchain, 'medium')
      },
      high: {
        fee: ethers.formatEther(highGasPrice * gasLimit),
        time: this.getEstimatedConfirmationTime(blockchain, 'high')
      },
      gasLimit: gasLimit.toString(),
      gasPrice: ethers.formatUnits(gasPrice, 'gwei')
    }
  }

  /**
   * Estimate Solana transaction fees
   */
  private async estimateSolanaFee(params: {
    blockchain: BlockchainNetwork
    gasUsed?: string
    priority?: TransactionPriority
  }): Promise<TransactionFeeEstimate> {
    const connection = this.providers.get('solana') as Connection
    
    if (!connection) {
      return this.getBasicSolanaFeeEstimate()
    }

    try {
      // Get recent fees from the network
      const recentPrioritizationFees = await connection.getRecentPrioritizationFees()
      
      // Calculate average fee
      const avgFee = recentPrioritizationFees.length > 0
        ? recentPrioritizationFees.reduce((sum, fee) => sum + fee.prioritizationFee, 0) / recentPrioritizationFees.length
        : 5000 // Default 5000 lamports

      // Base transaction fee in lamports
      const baseFee = 5000 // Standard Solana transaction fee
      const priorityFee = Math.max(avgFee, 1000) // Minimum 1000 lamports priority fee

      return {
        low: {
          fee: ((baseFee + priorityFee * 0.5) / 1e9).toString(), // Convert to SOL
          time: 30 // ~30 seconds
        },
        medium: {
          fee: ((baseFee + priorityFee) / 1e9).toString(),
          time: 15 // ~15 seconds
        },
        high: {
          fee: ((baseFee + priorityFee * 2) / 1e9).toString(),
          time: 5 // ~5 seconds
        },
        gasLimit: '1',
        baseFee: (baseFee / 1e9).toString(),
        priorityFee: (priorityFee / 1e9).toString()
      }

    } catch (error) {
      this.logger.error('Failed to get Solana fees from network:', error)
      return this.getBasicSolanaFeeEstimate()
    }
  }

  /**
   * Estimate Bitcoin transaction fees
   */
  private async estimateBitcoinFee(params: {
    blockchain: BlockchainNetwork
    gasUsed?: string
    priority?: TransactionPriority
  }): Promise<TransactionFeeEstimate> {
    try {
      // In a real implementation, you would call a Bitcoin fee estimation API
      // For now, we'll use approximate values based on typical Bitcoin fees
      
      const txSize = parseInt(params.gasUsed || '250') // Typical Bitcoin tx size in bytes
      
      // Sat/byte rates (these would come from a fee estimation API)
      const lowSatPerByte = 1
      const mediumSatPerByte = 5
      const highSatPerByte = 10

      const lowFee = (txSize * lowSatPerByte) / 1e8 // Convert to BTC
      const mediumFee = (txSize * mediumSatPerByte) / 1e8
      const highFee = (txSize * highSatPerByte) / 1e8

      return {
        low: {
          fee: lowFee.toString(),
          time: 3600 // ~1 hour
        },
        medium: {
          fee: mediumFee.toString(),
          time: 1800 // ~30 minutes
        },
        high: {
          fee: highFee.toString(),
          time: 600 // ~10 minutes
        },
        gasLimit: txSize.toString(),
        gasPrice: `${mediumSatPerByte} sat/byte`
      }

    } catch (error) {
      this.logger.error('Failed to estimate Bitcoin fees:', error)
      return this.getBasicBitcoinFeeEstimate()
    }
  }

  /**
   * Estimate NEAR transaction fees
   */
  private async estimateNearFee(params: {
    blockchain: BlockchainNetwork
    gasUsed?: string
    priority?: TransactionPriority
  }): Promise<TransactionFeeEstimate> {
    // NEAR has predictable, low fees
    const baseFee = 0.00001 // ~0.00001 NEAR for simple transfers
    
    return {
      low: {
        fee: baseFee.toString(),
        time: 3 // ~3 seconds
      },
      medium: {
        fee: baseFee.toString(),
        time: 2 // ~2 seconds
      },
      high: {
        fee: baseFee.toString(),
        time: 1 // ~1 second
      },
      gasLimit: '1',
      baseFee: baseFee.toString()
    }
  }

  /**
   * Get basic fee estimate for unsupported networks or fallback
   */
  private getBasicFeeEstimate(blockchain: BlockchainNetwork, gasUsed: string): TransactionFeeEstimate {
    // Fallback estimates based on typical network characteristics
    const estimates = {
      ethereum: { low: '0.001', medium: '0.002', high: '0.004', times: [300, 180, 60] },
      polygon: { low: '0.0001', medium: '0.0002', high: '0.0004', times: [30, 15, 5] },
      arbitrum: { low: '0.0001', medium: '0.0002', high: '0.0004', times: [5, 3, 1] },
      optimism: { low: '0.0001', medium: '0.0002', high: '0.0004', times: [5, 3, 1] },
      avalanche: { low: '0.001', medium: '0.002', high: '0.003', times: [3, 2, 1] },
      solana: { low: '0.000005', medium: '0.00001', high: '0.00002', times: [30, 15, 5] },
      bitcoin: { low: '0.0001', medium: '0.0005', high: '0.001', times: [3600, 1800, 600] },
      near: { low: '0.00001', medium: '0.00001', high: '0.00001', times: [3, 2, 1] }
    }

    const estimate = estimates[blockchain] || estimates.ethereum

    return {
      low: {
        fee: estimate.low,
        time: estimate.times[0] || 60 // Default 60 seconds if undefined
      },
      medium: {
        fee: estimate.medium,
        time: estimate.times[1] || 120 // Default 120 seconds if undefined
      },
      high: {
        fee: estimate.high,
        time: estimate.times[2] || 300 // Default 300 seconds if undefined
      },
      gasLimit: gasUsed
    }
  }

  /**
   * Get basic Solana fee estimate
   */
  private getBasicSolanaFeeEstimate(): TransactionFeeEstimate {
    return {
      low: {
        fee: '0.000005', // 5000 lamports in SOL
        time: 30
      },
      medium: {
        fee: '0.00001', // 10000 lamports in SOL
        time: 15
      },
      high: {
        fee: '0.00002', // 20000 lamports in SOL
        time: 5
      },
      gasLimit: '1',
      baseFee: '0.000005'
    }
  }

  /**
   * Get basic Bitcoin fee estimate
   */
  private getBasicBitcoinFeeEstimate(): TransactionFeeEstimate {
    return {
      low: {
        fee: '0.0001',
        time: 3600
      },
      medium: {
        fee: '0.0005',
        time: 1800
      },
      high: {
        fee: '0.001',
        time: 600
      },
      gasLimit: '250',
      gasPrice: '5 sat/byte'
    }
  }

  /**
   * Get estimated confirmation time based on blockchain and priority
   */
  private getEstimatedConfirmationTime(blockchain: BlockchainNetwork, priority: TransactionPriority): number {
    const baseTimes = {
      ethereum: { low: 300, medium: 180, high: 60, urgent: 30 },
      polygon: { low: 30, medium: 15, high: 5, urgent: 2 },
      arbitrum: { low: 5, medium: 3, high: 1, urgent: 1 },
      optimism: { low: 5, medium: 3, high: 1, urgent: 1 },
      avalanche: { low: 3, medium: 2, high: 1, urgent: 1 },
      solana: { low: 30, medium: 15, high: 5, urgent: 2 },
      bitcoin: { low: 3600, medium: 1800, high: 600, urgent: 300 },
      near: { low: 3, medium: 2, high: 1, urgent: 1 }
    }

    // Ensure we always return a number, never undefined
    const chainTimes = baseTimes[blockchain] || baseTimes.ethereum
    return chainTimes[priority] || chainTimes.medium || 60
  }

  /**
   * Clear fee cache (useful for testing or forced refresh)
   */
  clearFeeCache(): void {
    this.feeCache.clear()
    this.logger.info('Fee cache cleared')
  }

  /**
   * Get current fee cache size
   */
  getFeeCacheSize(): number {
    return this.feeCache.size
  }
}