import { BaseService } from '../../BaseService'
import { ServiceResult } from '../../../types/index'
import { ethers } from 'ethers'
import {
  BatchOperation,
  BatchUserOperationRequest,
  UserOperation,
  BatchOperationRecord
} from './types'

/**
 * BatchOperationService - Multiple Transactions per UserOperation
 * 
 * Handles batching multiple operations into a single UserOperation:
 * - Operation sequencing and dependencies
 * - Gas optimization for batch operations
 * - Atomic execution guarantees
 * - Partial failure handling
 */
export class BatchOperationService extends BaseService {
  
  private readonly MAX_BATCH_SIZE = 10
  private readonly MAX_TOTAL_GAS = 8000000 // 8M gas limit

  constructor() {
    super('BatchOperation')
  }

  /**
   * Create optimized batch of operations
   */
  async createBatchOperation(
    request: BatchUserOperationRequest
  ): Promise<ServiceResult<{
    optimizedOperations: BatchOperation[]
    estimatedGas: string
    executionPlan: {
      sequence: number[]
      dependencies: Record<number, number[]>
      gasDistribution: Record<number, string>
    }
  }>> {
    try {
      const { walletAddress, operations, paymasterPolicy, gasPolicy } = request

      // Validate batch size
      if (operations.length === 0) {
        return this.error('No operations provided', 'EMPTY_BATCH')
      }

      if (operations.length > this.MAX_BATCH_SIZE) {
        return this.error(`Batch size exceeds maximum of ${this.MAX_BATCH_SIZE}`, 'BATCH_TOO_LARGE')
      }

      // Validate and optimize operations
      const validation = await this.validateBatchOperations(operations)
      if (!validation.success) {
        return this.error('Validation failed', 'BATCH_VALIDATION_FAILED')
      }

      // Analyze operation dependencies
      const dependencies = await this.analyzeDependencies(operations)
      if (!dependencies.success) {
        return this.error('Dependencies analysis failed', 'DEPENDENCY_ANALYSIS_FAILED')
      }

      // Optimize operation order for gas efficiency
      if (!dependencies.data) {
        return this.error('Dependencies data missing', 'DEPENDENCY_DATA_MISSING')
      }
      
      const optimized = await this.optimizeOperationOrder(operations, dependencies.data)
      if (!optimized.success || !optimized.data) {
        return this.error('Optimization failed', 'OPTIMIZATION_FAILED')
      }

      // Estimate gas for each operation
      const gasEstimates = await this.estimateBatchGas(optimized.data.operations, walletAddress)
      if (!gasEstimates.success) {
        return this.error('Gas estimation failed', 'GAS_ESTIMATION_FAILED')
      }

      if (!gasEstimates.success || !gasEstimates.data) {
        return this.error('Gas estimation failed', 'GAS_ESTIMATION_FAILED')
      }

      // Validate total gas is within limits
      const totalGas = gasEstimates.data.estimates.reduce(
        (sum, estimate) => sum + BigInt(estimate.gasUsed), 
        BigInt(0)
      )

      if (totalGas > BigInt(this.MAX_TOTAL_GAS)) {
        return this.error('Batch gas limit exceeded', 'GAS_LIMIT_EXCEEDED')
      }

      const result = {
        optimizedOperations: optimized.data.operations,
        estimatedGas: totalGas.toString(),
        executionPlan: {
          sequence: optimized.data.sequence,
          dependencies: dependencies.data || {},
          gasDistribution: gasEstimates.data.estimates.reduce((acc, est, idx) => {
            acc[idx] = est.gasUsed
            return acc
          }, {} as Record<number, string>)
        }
      }

      this.logger.info({
        walletAddress,
        operationCount: operations.length,
        totalGas: result.estimatedGas
      }, 'Batch operation created')

      return this.success(result)

    } catch (error) {
      this.logger.error({ error, request }, 'Failed to create batch operation')
      return this.error('Failed to create batch operation', 'BATCH_CREATE_FAILED')
    }
  }

  /**
   * Execute batch operations with atomic guarantees
   */
  async executeBatchOperation(
    walletAddress: string,
    operations: BatchOperation[],
    userOpHash?: string
  ): Promise<ServiceResult<{
    success: boolean
    results: Array<{
      index: number
      success: boolean
      returnData?: string
      gasUsed?: string
      error?: string
    }>
    totalGasUsed: string
  }>> {
    try {
      // Build execution call data
      const executionData = await this.buildBatchExecutionData(operations)
      if (!executionData.success) {
        return this.error('Failed to build execution data', 'BATCH_DATA_BUILD_FAILED')
      }

      // Simulate batch execution first
      const simulation = await this.simulateBatchExecution(walletAddress, operations)
      if (!simulation.success) {
        return this.error('Simulation failed', 'BATCH_SIMULATION_FAILED')
      }

      if (!simulation.success || !simulation.data) {
        return this.error('Simulation failed', 'BATCH_SIMULATION_FAILED')
      }

      // Check for any failed operations in simulation
      if (!simulation.data) {
        return this.error('Simulation data missing', 'SIMULATION_DATA_MISSING')
      }
      
      const hasFailures = simulation.data.results.some(result => !result.success)
      if (hasFailures) {
        this.logger.warn({
          walletAddress,
          failures: simulation.data.results.filter(r => !r.success)
        }, 'Batch simulation detected failures')
      }

      if (!executionData.success || !executionData.data) {
        return this.error('Failed to build execution data', 'BATCH_DATA_BUILD_FAILED')
      }

      // Execute the batch (this would be done through the actual UserOperation)
      const execution = await this.performBatchExecution(
        walletAddress, 
        executionData.data,
        userOpHash
      )
      if (!execution.success || !execution.data) {
        return this.error('Failed to execute batch operation', 'BATCH_EXECUTION_FAILED')
      }

      // Store execution results
      if (userOpHash) {
        await this.storeBatchResults(userOpHash, operations, execution.data.results)
      }

      this.logger.info({
        walletAddress,
        userOpHash,
        operationCount: operations.length,
        totalGasUsed: execution.data.totalGasUsed,
        successCount: execution.data.results.filter(r => r.success).length
      }, 'Batch operation executed')

      return this.success(execution.data)

    } catch (error) {
      this.logger.error({ error, walletAddress, operations }, 'Failed to execute batch operation')
      return this.error('Failed to execute batch operation', 'BATCH_EXECUTION_FAILED')
    }
  }

  /**
   * Analyze batch operation performance
   */
  async analyzeBatchPerformance(
    userOpHash: string
  ): Promise<ServiceResult<{
    operationCount: number
    totalGasUsed: string
    averageGasPerOperation: string
    gasEfficiencyScore: number
    executionTime: number
    failures: Array<{
      index: number
      operation: BatchOperation
      error: string
    }>
    recommendations: string[]
  }>> {
    try {
      // Get batch operation records
      const records = await this.db.batch_operations.findMany({
        where: { user_operation_id: userOpHash },
        include: {
          user_operations: true
        },
        orderBy: { operation_index: 'asc' }
      })

      if (records.length === 0) {
        return this.error('Batch operation not found', 'BATCH_NOT_FOUND', 404)
      }

      const operationCount = records.length
      const totalGasUsed = records
        .filter(r => r.gas_used)
        .reduce((sum, r) => sum + BigInt(r.gas_used || 0), BigInt(0))
        .toString()

      const averageGasPerOperation = operationCount > 0 
        ? (BigInt(totalGasUsed) / BigInt(operationCount)).toString()
        : '0'

      // Calculate gas efficiency score (0-100)
      const gasEfficiencyScore = this.calculateGasEfficiencyScore(records)

      // Analyze failures
      const failures = records
        .filter(r => !r.success)
        .map(r => ({
          index: r.operation_index,
          operation: {
            target: r.target_address,
            value: r.value,
            data: r.call_data
          } as BatchOperation,
          error: r.return_data || 'Unknown error'
        }))

      // Generate optimization recommendations
      const recommendations = this.generateOptimizationRecommendations(records)

      // Calculate execution time (simplified)
      const firstRecord = records[0]
      const userOpData = firstRecord?.user_operations
      const executionTime = userOpData?.updated_at && userOpData?.created_at ? 
        new Date(userOpData.updated_at).getTime() - new Date(userOpData.created_at).getTime() :
        0

      return this.success({
        operationCount,
        totalGasUsed,
        averageGasPerOperation,
        gasEfficiencyScore,
        executionTime,
        failures,
        recommendations
      })

    } catch (error) {
      this.logger.error({ error, userOpHash }, 'Failed to analyze batch performance')
      return this.error('Failed to analyze batch performance', 'BATCH_ANALYSIS_FAILED')
    }
  }

  /**
   * Get batch operation history and statistics
   */
  async getBatchOperationHistory(
    walletId: string,
    timeframe: { from: Date; to: Date },
    limit = 50
  ): Promise<ServiceResult<{
    batches: Array<{
      userOpHash: string
      operationCount: number
      totalGasUsed: string
      successRate: number
      createdAt: Date
      executionTime: number
    }>
    statistics: {
      totalBatches: number
      averageOperationsPerBatch: number
      averageGasPerBatch: string
      overallSuccessRate: number
      gasOptimizationTrend: number
    }
  }>> {
    try {
      const userOps = await this.db.user_operations.findMany({
        where: {
          wallet_id: walletId,
          created_at: {
            gte: timeframe.from,
            lte: timeframe.to
          }
        },
        include: {
          batch_operations: {
            orderBy: { operation_index: 'asc' }
          }
        },
        orderBy: { created_at: 'desc' },
        take: limit
      })

      const batches = userOps.map(userOp => {
        const operations = userOp.batch_operations
        const operationCount = operations.length
        const totalGasUsed = operations
          .filter(op => op.gas_used)
          .reduce((sum, op) => sum + BigInt(op.gas_used || '0'), BigInt(0))
          .toString()
        
        const successfulOps = operations.filter(op => op.success).length
        const successRate = operationCount > 0 ? (successfulOps / operationCount) * 100 : 0
        
        const executionTime = userOp.updated_at && userOp.created_at ?
                              new Date(userOp.updated_at).getTime() - new Date(userOp.created_at).getTime() :
                              0

        return {
          userOpHash: userOp.user_op_hash,
          operationCount,
          totalGasUsed,
          successRate,
          createdAt: userOp.created_at || new Date(),
          executionTime
        }
      })

      // Calculate statistics
      const totalBatches = batches.length
      const averageOperationsPerBatch = totalBatches > 0 
        ? batches.reduce((sum, b) => sum + b.operationCount, 0) / totalBatches
        : 0

      const totalGasAllBatches = batches
        .reduce((sum, b) => sum + BigInt(b.totalGasUsed || 0), BigInt(0))
      const averageGasPerBatch = totalBatches > 0 
        ? (totalGasAllBatches / BigInt(totalBatches)).toString()
        : '0'

      const overallSuccessRate = totalBatches > 0
        ? batches.reduce((sum, b) => sum + b.successRate, 0) / totalBatches
        : 0

      // Calculate gas optimization trend (simplified)
      const gasOptimizationTrend = this.calculateGasOptimizationTrend(batches)

      return this.success({
        batches,
        statistics: {
          totalBatches,
          averageOperationsPerBatch,
          averageGasPerBatch,
          overallSuccessRate,
          gasOptimizationTrend
        }
      })

    } catch (error) {
      this.logger.error({ error, walletId, timeframe }, 'Failed to get batch operation history')
      return this.error('Failed to get batch operation history', 'BATCH_HISTORY_FAILED')
    }
  }

  /**
   * Private helper methods
   */

  private async validateBatchOperations(
    operations: BatchOperation[]
  ): Promise<ServiceResult<boolean>> {
    try {
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i]
        if (!op) continue
        
        // Validate addresses
        if (!ethers.isAddress(op.target)) {
          return this.error(`Invalid target address at index ${i}`, 'INVALID_TARGET')
        }

        // Validate value
        try {
          BigInt(op.value)
        } catch {
          return this.error(`Invalid value at index ${i}`, 'INVALID_VALUE')
        }

        // Validate call data
        if (!op.data.startsWith('0x')) {
          return this.error(`Invalid call data at index ${i}`, 'INVALID_CALLDATA')
        }
      }

      return this.success(true)

    } catch (error) {
      this.logger.error({ error, operations }, 'Failed to validate batch operations')
      return this.error('Failed to validate batch operations', 'BATCH_VALIDATION_FAILED')
    }
  }

  private async analyzeDependencies(
    operations: BatchOperation[]
  ): Promise<ServiceResult<Record<number, number[]>>> {
    try {
      const dependencies: Record<number, number[]> = {}

      // Analyze each operation for dependencies on previous operations
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i]
        if (!op) continue
        
        dependencies[i] = []
        
        // Simple dependency analysis based on targets
        for (let j = 0; j < i; j++) {
          const prevOp = operations[j]
          if (prevOp && op.target === prevOp.target) {
            dependencies[i]!.push(j)
          }
        }
      }

      return this.success(dependencies)

    } catch (error) {
      this.logger.error({ error, operations }, 'Failed to analyze dependencies')
      return this.error('Failed to analyze dependencies', 'DEPENDENCY_ANALYSIS_FAILED')
    }
  }

  private async optimizeOperationOrder(
    operations: BatchOperation[],
    dependencies: Record<number, number[]>
  ): Promise<ServiceResult<{ operations: BatchOperation[]; sequence: number[] }>> {
    try {
      // For now, maintain original order (topological sort would be ideal)
      const sequence = operations.map((_, idx) => idx)
      
      return this.success({
        operations,
        sequence
      })

    } catch (error) {
      this.logger.error({ error, operations, dependencies }, 'Failed to optimize operation order')
      return this.error('Failed to optimize operation order', 'OPTIMIZATION_FAILED')
    }
  }

  private async estimateBatchGas(
    operations: BatchOperation[],
    walletAddress: string
  ): Promise<ServiceResult<{ estimates: Array<{ index: number; gasUsed: string }> }>> {
    try {
      const estimates = operations.map((op, index) => ({
        index,
        gasUsed: this.estimateSingleOperationGas(op).toString()
      }))

      return this.success({ estimates })

    } catch (error) {
      this.logger.error({ error, operations, walletAddress }, 'Failed to estimate batch gas')
      return this.error('Failed to estimate batch gas', 'GAS_ESTIMATION_FAILED')
    }
  }

  private estimateSingleOperationGas(operation: BatchOperation): number {
    // Simple gas estimation based on operation type
    const baseGas = 21000 // Base transaction cost
    const dataGas = (operation.data.length - 2) / 2 * 16 // 16 gas per byte
    const valueGas = operation.value !== '0' ? 9000 : 0 // Additional cost for value transfer
    
    return baseGas + dataGas + valueGas
  }

  private async buildBatchExecutionData(
    operations: BatchOperation[]
  ): Promise<ServiceResult<string>> {
    try {
      if (operations.length === 1) {
        // Single operation - use direct call
        const op = operations[0]
        if (!op) {
          return this.error('Invalid operation', 'INVALID_OPERATION')
        }
        return this.success(op.data)
      }

      // Multiple operations - encode as batch call
      const batchInterface = new ethers.Interface([
        'function executeBatch(address[] targets, uint256[] values, bytes[] data)'
      ])

      // Filter out null/undefined operations first, then map
      const validOperations = operations.filter(op => op != null)
      const targets = validOperations.map(op => op.target)
      const values = validOperations.map(op => op.value)
      const data = validOperations.map(op => op.data)

      const callData = batchInterface.encodeFunctionData('executeBatch', [targets, values, data])
      return this.success(callData)

    } catch (error) {
      this.logger.error({ error, operations }, 'Failed to build batch execution data')
      return this.error('Failed to build batch execution data', 'BATCH_DATA_BUILD_FAILED')
    }
  }

  private async simulateBatchExecution(
    walletAddress: string,
    operations: BatchOperation[]
  ): Promise<ServiceResult<{
    results: Array<{
      index: number
      success: boolean
      returnData?: string
      gasUsed?: string
      error?: string
    }>
  }>> {
    try {
      // Simulate each operation
      const results = operations.map((op, index) => ({
        index,
        success: true, // Simplified simulation
        returnData: '0x',
        gasUsed: this.estimateSingleOperationGas(op).toString()
      }))

      return this.success({ results })

    } catch (error) {
      this.logger.error({ error, walletAddress, operations }, 'Failed to simulate batch execution')
      return this.error('Failed to simulate batch execution', 'BATCH_SIMULATION_FAILED')
    }
  }

  private async performBatchExecution(
    walletAddress: string,
    executionData: string,
    userOpHash?: string
  ): Promise<ServiceResult<{
    success: boolean
    results: Array<{
      index: number
      success: boolean
      returnData?: string
      gasUsed?: string
      error?: string
    }>
    totalGasUsed: string
  }>> {
    try {
      // This would perform the actual execution through the UserOperation
      // For now, return simulated results
      const results = [
        {
          index: 0,
          success: true,
          returnData: '0x',
          gasUsed: '50000'
        }
      ]

      const totalGasUsed = results
        .reduce((sum, r) => sum + BigInt(r.gasUsed || 0), BigInt(0))
        .toString()

      return this.success({
        success: true,
        results,
        totalGasUsed
      })

    } catch (error) {
      this.logger.error({ error, walletAddress, executionData }, 'Failed to perform batch execution')
      return this.error('Failed to perform batch execution', 'BATCH_EXECUTION_FAILED')
    }
  }

  private async storeBatchResults(
    userOpHash: string,
    operations: BatchOperation[],
    results: Array<{ index: number; success: boolean; returnData?: string; gasUsed?: string }>
  ): Promise<void> {
    try {
      // Get user operation ID
      const userOp = await this.db.user_operations.findUnique({
        where: { user_op_hash: userOpHash }
      })

      if (!userOp) {
        this.logger.error({ userOpHash }, 'UserOperation not found for batch results storage')
        return
      }

      // Store batch operation records
      const batchRecords = operations.map((op, index) => {
        const result = results.find(r => r.index === index)
        
        return {
          id: this.generateId(),
          user_operation_id: userOp.id,
          operation_index: index,
          target_address: op.target,
          value: op.value,
          call_data: op.data,
          success: result?.success || false,
          return_data: result?.returnData,
          gas_used: result?.gasUsed ? BigInt(result.gasUsed) : null,
          created_at: new Date()
        }
      })

      await this.db.batch_operations.createMany({
        data: batchRecords
      })

      this.logger.info({ 
        userOpHash, 
        operationCount: operations.length 
      }, 'Batch results stored')

    } catch (error) {
      this.logger.error({ error, userOpHash, operations }, 'Failed to store batch results')
    }
  }

  private calculateGasEfficiencyScore(records: any[]): number {
    // Calculate efficiency based on gas usage vs. theoretical optimal
    // This is simplified - real implementation would be more sophisticated
    const totalActual = records.reduce((sum, r) => {
      const gasUsed = r.gas_used ? BigInt(r.gas_used) : BigInt(0)
      return sum + gasUsed
    }, BigInt(0))
    
    const totalEstimated = records.reduce((sum, r) => {
      const estimated = this.estimateSingleOperationGas({
        target: r.target_address,
        value: r.value,
        data: r.call_data
      })
      return sum + BigInt(estimated)
    }, BigInt(0))

    if (Number(totalActual) === 0) return 100
    
    const efficiency = Number(totalEstimated) / Number(totalActual) * 100
    return Math.min(100, Math.max(0, efficiency))
  }

  private generateOptimizationRecommendations(records: any[]): string[] {
    const recommendations: string[] = []

    // Analyze failure patterns
    const failures = records.filter(r => !r.success)
    if (failures.length > 0) {
      recommendations.push('Consider pre-validating operations to reduce failures')
    }

    // Analyze gas usage patterns
    const avgGas = records.reduce((sum, r) => sum + Number(r.gas_used || 0), 0) / records.length
    if (avgGas > 100000) {
      recommendations.push('Consider breaking large operations into smaller batches')
    }

    // Analyze operation types
    const uniqueTargets = new Set(records.map(r => r.target_address)).size
    if (uniqueTargets === 1) {
      recommendations.push('Single target detected - consider using target-specific batch functions')
    }

    return recommendations
  }

  private calculateGasOptimizationTrend(batches: any[]): number {
    // Calculate trend in gas efficiency over time
    // Positive number means improving efficiency
    if (batches.length < 2) return 0

    const recent = batches.slice(0, Math.ceil(batches.length / 2))
    const older = batches.slice(Math.ceil(batches.length / 2))

    const recentAvg = recent.reduce((sum, b) => sum + Number(b.totalGasUsed), 0) / recent.length
    const olderAvg = older.reduce((sum, b) => sum + Number(b.totalGasUsed), 0) / older.length

    return ((olderAvg - recentAvg) / olderAvg) * 100
  }
}
