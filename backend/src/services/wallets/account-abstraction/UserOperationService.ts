import { BaseService } from '../../BaseService'
import { ServiceResult } from '../../../types/index'
import { ethers } from 'ethers'
import {
  UserOperation,
  UserOperationReceipt,
  UserOperationStatus,
  CreateUserOperationResponse,
  SendUserOperationResponse,
  UserOperationBuilder,
  UserOperationValidationResult,
  GasEstimate,
  BatchOperation,
  EntryPointConfig,
  UserOperationRecord,
  UserOperationAnalytics
} from './types'

/**
 * UserOperationService - EIP-4337 Account Abstraction Core
 * 
 * Handles UserOperation lifecycle:
 * - Building UserOperations from intents
 * - Gas estimation and optimization
 * - Signature aggregation
 * - EntryPoint submission
 * - Status monitoring and receipts
 */
export class UserOperationService extends BaseService {
  
  private entryPointConfig: EntryPointConfig
  private provider: ethers.JsonRpcProvider
  private entryPointContract: ethers.Contract

  constructor() {
    super('UserOperation')
    
    // Initialize EntryPoint configuration
    this.entryPointConfig = {
      address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // EIP-4337 EntryPoint v0.6
      version: '0.6.0',
      chainId: 1, // Ethereum mainnet - should be configurable
      supportedWalletFactories: [
        '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67', // Example factory
      ],
      supportedPaymasters: [
        '0x0000000000000000000000000000000000000000', // Example paymaster
      ]
    }

    // Initialize provider and contract
    this.provider = new ethers.JsonRpcProvider(
      process.env.BLOCKCHAIN_RPC_URL || 'https://ethereum.publicnode.com'
    )
    
    // EntryPoint ABI (simplified - core methods only)
    const entryPointABI = [
      'function handleOps(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature)[] ops, address beneficiary)',
      'function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature) userOp) view returns (bytes32)',
      'function getNonce(address sender, uint192 key) view returns (uint256)',
      'function simulateValidation(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature) userOp) returns (tuple(uint256 preOpGas, uint256 prefund, bool sigFailed, uint48 validAfter, uint48 validUntil, bytes paymasterContext) returnInfo)'
    ]

    this.entryPointContract = new ethers.Contract(
      this.entryPointConfig.address,
      entryPointABI,
      this.provider
    )
  }

  /**
   * Build UserOperation from batch operations
   */
  async buildUserOperation(
    request: UserOperationBuilder
  ): Promise<ServiceResult<CreateUserOperationResponse>> {
    try {
      const { walletAddress, operations, paymasterPolicy, gasPolicy, nonceKey = 0 } = request

      // Get nonce for the wallet
      const nonce = await this.getUserOperationNonce(walletAddress, nonceKey)
      if (!nonce.success || !nonce.data) {
        return this.error('Failed to get nonce', 'NONCE_FAILED')
      }

      // Build call data for batch operations
      const callData = await this.buildBatchCallData(operations)
      if (!callData.success) {
        return this.error('Failed to build call data', 'CALLDATA_BUILD_FAILED')
      }

      if (!callData.success || !callData.data) {
        return this.error('Failed to build call data', 'CALLDATA_BUILD_FAILED')
      }

      // Create base UserOperation
      const userOp: UserOperation = {
        sender: walletAddress,
        nonce: nonce.data,
        initCode: '0x', // Assuming wallet is already deployed
        callData: callData.data,
        callGasLimit: '0x0', // Will be estimated
        verificationGasLimit: '0x0', // Will be estimated
        preVerificationGas: '0x0', // Will be estimated
        maxFeePerGas: '0x0', // Will be set based on gas policy
        maxPriorityFeePerGas: '0x0', // Will be set based on gas policy
        paymasterAndData: '0x',
        signature: '0x' // Will be set during signing
      }

      // Estimate gas for the operation
      const gasEstimate = await this.estimateUserOperationGas(userOp)
      if (!gasEstimate.success) {
        return this.error('Failed to estimate gas', 'GAS_ESTIMATION_FAILED')
      }

      if (!gasEstimate.success || !gasEstimate.data) {
        return this.error('Failed to estimate gas', 'GAS_ESTIMATION_FAILED')
      }

      // Apply gas estimates
      userOp.callGasLimit = gasEstimate.data.callGasLimit
      userOp.verificationGasLimit = gasEstimate.data.verificationGasLimit
      userOp.preVerificationGas = gasEstimate.data.preVerificationGas

      // Set gas fees based on policy
      const gasFees = await this.calculateGasFees(gasPolicy)
      if (!gasFees.success || !gasFees.data) {
        return this.error('Failed to calculate gas fees', 'GAS_FEES_FAILED')
      }
      
      userOp.maxFeePerGas = gasFees.data.maxFeePerGas
      userOp.maxPriorityFeePerGas = gasFees.data.maxPriorityFeePerGas

      // Handle paymaster if policy specified
      let paymasterData
      if (paymasterPolicy && paymasterPolicy.type !== 'user_pays') {
        const paymasterResult = await this.getPaymasterData(userOp, paymasterPolicy)
        if (paymasterResult.success && paymasterResult.data) {
          userOp.paymasterAndData = paymasterResult.data.paymasterAndData
          paymasterData = paymasterResult.data
        }
      }

      // Generate UserOperation hash
      const userOpHash = await this.getUserOperationHash(userOp)
      if (!userOpHash.success || !userOpHash.data) {
        return this.error('Failed to get UserOperation hash', 'USEROP_HASH_FAILED')
      }

      this.logInfo('UserOperation built successfully', { 
        walletAddress, 
        userOpHash: userOpHash.data,
        operationsCount: operations.length 
      })

      return this.success({
        userOpHash: userOpHash.data,
        userOperation: userOp,
        gasEstimate: gasEstimate.data,
        paymasterData,
        validUntil: paymasterData?.validUntil
      })

    } catch (error) {
      this.logError('Failed to build UserOperation', { error, request })
      return this.error('Failed to build UserOperation', 'USEROP_BUILD_FAILED')
    }
  }

  /**
   * Submit UserOperation to mempool
   */
  async sendUserOperation(
    userOp: UserOperation,
    entryPointAddress?: string
  ): Promise<ServiceResult<SendUserOperationResponse>> {
    try {
      // Validate UserOperation before submission
      const validation = await this.validateUserOperation(userOp)
      if (!validation.success || !validation.data || !validation.data.valid) {
        return this.error('UserOperation validation failed', 'USEROP_INVALID')
      }

      // Store UserOperation in database
      const stored = await this.storeUserOperation(userOp)
      if (!stored.success || !stored.data) {
        return this.error('Failed to store UserOperation', 'USEROP_STORE_FAILED')
      }

      // Submit to EntryPoint contract (this would typically go through a bundler)
      const submission = await this.submitToEntryPoint(userOp)
      if (!submission.success || !submission.data) {
        // Update status to failed
        await this.updateUserOperationStatus(stored.data.user_op_hash, 'failed')
        return this.error('Failed to submit to EntryPoint', 'ENTRYPOINT_SUBMIT_FAILED')
      }

      this.logInfo('UserOperation submitted successfully', { 
        userOpHash: stored.data.user_op_hash,
        transactionHash: submission.data.transactionHash 
      })

      return this.success({
        userOpHash: stored.data.user_op_hash,
        status: 'submitted',
        transactionHash: submission.data.transactionHash,
        estimatedConfirmationTime: 15 // seconds
      })

    } catch (error) {
      this.logError('Failed to send UserOperation', { error, userOp })
      return this.error('Failed to send UserOperation', 'USEROP_SEND_FAILED')
    }
  }

  /**
   * Get UserOperation status and receipt
   */
  async getUserOperationStatus(
    userOpHash: string
  ): Promise<ServiceResult<UserOperationStatus>> {
    try {
      // Get from database
      const record = await this.db.user_operations.findUnique({
        where: { user_op_hash: userOpHash }
      })

      if (!record) {
        return this.error('UserOperation not found', 'USEROP_NOT_FOUND', 404)
      }

      // If still pending, check on-chain status
      if (record.status === 'pending' && record.transaction_hash) {
        const receipt = await this.provider.getTransactionReceipt(record.transaction_hash)
        if (receipt) {
          // Update status
          const newStatus = receipt.status === 1 ? 'included' : 'failed'
          await this.updateUserOperationStatus(userOpHash, newStatus, {
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            actualGasCost: (BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice || 0)).toString()
          })
          
          // Update the record - we'll update it in the database, not the object directly
          await this.updateUserOperationStatus(userOpHash, newStatus, {
            block_number: BigInt(receipt.blockNumber),
            gas_used: receipt.gasUsed.toString(),
            actual_gas_cost: (BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice || 0)).toString()
          })
        }
      }

      return this.success({
        userOpHash: record.user_op_hash,
        status: record.status as UserOperationStatus['status'],
        transactionHash: record.transaction_hash || undefined,
        blockNumber: record.block_number ? Number(record.block_number) : undefined,
        gasUsed: record.gas_used ? record.gas_used.toString() : undefined,
        actualGasCost: record.actual_gas_cost ? record.actual_gas_cost.toString() : undefined,
        reason: record.failure_reason || undefined,
        createdAt: record.created_at || new Date(),
        updatedAt: record.updated_at || new Date()
      })

    } catch (error) {
      this.logError('Failed to get UserOperation status', { error, userOpHash })
      return this.error('Failed to get UserOperation status', 'USEROP_STATUS_FAILED')
    }
  }

  /**
   * Get UserOperation receipt with detailed information
   */
  async getUserOperationReceipt(
    userOpHash: string
  ): Promise<ServiceResult<UserOperationReceipt>> {
    try {
      const status = await this.getUserOperationStatus(userOpHash)
      if (!status.success) {
        return this.error('Failed to get UserOperation status', 'USEROP_STATUS_FAILED')
      }

      if (!status.data?.transactionHash || status.data?.status !== 'included') {
        return this.error('UserOperation not included on-chain', 'USEROP_NOT_INCLUDED')
      }

      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(status.data.transactionHash)
      if (!receipt) {
        return this.error('Transaction receipt not found', 'RECEIPT_NOT_FOUND')
      }

      // Parse UserOperation events from receipt
      const userOpReceipt: UserOperationReceipt = {
        userOpHash,
        entryPoint: this.entryPointConfig.address,
        sender: '', // Would be parsed from logs
        nonce: '', // Would be parsed from logs
        paymaster: undefined, // Would be parsed from logs if present
        actualGasCost: status.data.actualGasCost || '0',
        actualGasUsed: status.data.gasUsed || '0',
        success: receipt.status === 1,
        reason: status.data.reason,
        receipt: {
          transactionHash: receipt.hash,
          transactionIndex: receipt.index,
          blockHash: receipt.blockHash,
          blockNumber: receipt.blockNumber,
          from: receipt.from,
          to: receipt.to || undefined,
          cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
          gasUsed: receipt.gasUsed.toString(),
          contractAddress: receipt.contractAddress || undefined,
          logs: [...receipt.logs],
          status: receipt.status || 0
        }
      }

      return this.success(userOpReceipt)

    } catch (error) {
      this.logError('Failed to get UserOperation receipt', { error, userOpHash })
      return this.error('Failed to get UserOperation receipt', 'USEROP_RECEIPT_FAILED')
    }
  }

  /**
   * Get UserOperation analytics for wallet
   */
  async getUserOperationAnalytics(
    walletId: string,
    timeframe: { from: Date; to: Date }
  ): Promise<ServiceResult<UserOperationAnalytics>> {
    try {
      const operations = await this.db.user_operations.findMany({
        where: {
          wallet_id: walletId,
          created_at: {
            gte: timeframe.from,
            lte: timeframe.to
          }
        },
        include: {
          batch_operations: true
        }
      })

      const totalOperations = operations.length
      const successfulOps = operations.filter(op => op.status === 'included').length
      const successRate = totalOperations > 0 ? (successfulOps / totalOperations) * 100 : 0

      const totalGasUsed = operations
        .filter(op => op.gas_used)
        .reduce((sum, op) => sum + BigInt(op.gas_used || '0'), BigInt(0))
      
      const averageGasUsed = totalOperations > 0 
        ? (totalGasUsed / BigInt(totalOperations)).toString()
        : '0'

      const totalGasSponsored = operations
        .filter(op => op.paymaster_and_data !== '0x')
        .reduce((sum, op) => sum + BigInt(op.actual_gas_cost || 0), BigInt(0))
        .toString()

      // Analyze operation types from call data
      const operationTypes: Record<string, number> = {}
      operations.forEach(op => {
        const type = this.categorizeOperation(op.call_data)
        operationTypes[type] = (operationTypes[type] || 0) + 1
      })

      return this.success({
        walletId,
        totalOperations,
        successRate,
        averageGasUsed,
        totalGasSponsored,
        operationTypes,
        timeframe
      })

    } catch (error) {
      this.logError('Failed to get UserOperation analytics', { error, walletId })
      return this.error('Failed to get UserOperation analytics', 'USEROP_ANALYTICS_FAILED')
    }
  }

  /**
   * Private helper methods
   */

  private async getUserOperationNonce(
    walletAddress: string, 
    nonceKey: number = 0
  ): Promise<ServiceResult<string>> {
    try {
            const entryPoint = this.entryPointContract
      if (!entryPoint) {
        return this.error('EntryPoint contract not initialized', 'CONTRACT_NOT_INITIALIZED')
      }
      
      const nonce = await entryPoint.getNonce!(walletAddress, nonceKey)
      return this.success(nonce.toString())
    } catch (error) {
      this.logError('Failed to get nonce', { error, walletAddress, nonceKey })
      return this.error('Failed to get nonce', 'NONCE_FAILED')
    }
  }

  private async buildBatchCallData(operations: BatchOperation[]): Promise<ServiceResult<string>> {
    try {
      if (operations.length === 0) {
        return this.error('No operations provided', 'NO_OPERATIONS')
      }

      // For single operation, use direct call
      if (operations.length === 1) {
        const op = operations[0]
        if (!op) {
          return this.error('Invalid operation', 'INVALID_OPERATION')
        }
        if (op.value !== '0' && op.data === '0x') {
          // Simple ETH transfer
          return this.success(op.data)
        }
        return this.success(op.data)
      }

      // For multiple operations, encode as batch call
      // This would typically use the wallet's batch execution function
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
      this.logError('Failed to build call data', { error, operations })
      return this.error('Failed to build call data', 'CALLDATA_BUILD_FAILED')
    }
  }

  private async estimateUserOperationGas(userOp: UserOperation): Promise<ServiceResult<GasEstimate>> {
    try {
      // Simulate the UserOperation to get gas estimates
      // This would typically use eth_estimateUserOperationGas RPC method
      
      // Placeholder implementation
      const estimate: GasEstimate = {
        callGasLimit: '0x30D40', // 200,000
        verificationGasLimit: '0x15F90', // 90,000
        preVerificationGas: '0x5208' // 21,000
      }

      return this.success(estimate)

    } catch (error) {
      this.logError('Failed to estimate gas', { error, userOp })
      return this.error('Failed to estimate gas', 'GAS_ESTIMATION_FAILED')
    }
  }

  private async calculateGasFees(gasPolicy?: any): Promise<ServiceResult<{ maxFeePerGas: string; maxPriorityFeePerGas: string }>> {
    try {
      // Get current gas prices
      const feeData = await this.provider.getFeeData()
      
      let maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || BigInt(20000000000) // 20 gwei
      let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || BigInt(1000000000) // 1 gwei

      // Apply gas policy multipliers
      if (gasPolicy?.priorityLevel) {
        const multipliers = {
          low: 0.8,
          medium: 1,
          high: 1.5,
          urgent: 2
        }
        const multiplier = multipliers[gasPolicy.priorityLevel as keyof typeof multipliers] || 1
        maxFeePerGas = BigInt(Math.floor(Number(maxFeePerGas) * multiplier))
        maxPriorityFeePerGas = BigInt(Math.floor(Number(maxPriorityFeePerGas) * multiplier))
      }

      return this.success({
        maxFeePerGas: '0x' + maxFeePerGas.toString(16),
        maxPriorityFeePerGas: '0x' + maxPriorityFeePerGas.toString(16)
      })

    } catch (error) {
      this.logError('Failed to calculate gas fees', { error, gasPolicy })
      return this.error('Failed to calculate gas fees', 'GAS_FEES_FAILED')
    }
  }

  private async getPaymasterData(userOp: UserOperation, policy: any): Promise<ServiceResult<any>> {
    try {
      // This would integrate with actual paymaster service
      // For now, return placeholder
      return this.success({
        paymasterAndData: '0x',
        validUntil: Math.floor(Date.now() / 1000) + 3600 // 1 hour
      })
    } catch (error) {
      this.logError('Failed to get paymaster data', { error, userOp, policy })
      return this.error('Failed to get paymaster data', 'PAYMASTER_FAILED')
    }
  }

  private async getUserOperationHash(userOp: UserOperation): Promise<ServiceResult<string>> {
    try {
      // Convert hex strings to BigInt for contract call
      const nonceBigInt = userOp.nonce.startsWith('0x') ? BigInt(userOp.nonce) : BigInt(userOp.nonce)
      const callGasLimitBigInt = userOp.callGasLimit.startsWith('0x') ? BigInt(userOp.callGasLimit) : BigInt(userOp.callGasLimit)
      const verificationGasLimitBigInt = userOp.verificationGasLimit.startsWith('0x') ? BigInt(userOp.verificationGasLimit) : BigInt(userOp.verificationGasLimit)
      const preVerificationGasBigInt = userOp.preVerificationGas.startsWith('0x') ? BigInt(userOp.preVerificationGas) : BigInt(userOp.preVerificationGas)
      const maxFeePerGasBigInt = userOp.maxFeePerGas.startsWith('0x') ? BigInt(userOp.maxFeePerGas) : BigInt(userOp.maxFeePerGas)
      const maxPriorityFeePerGasBigInt = userOp.maxPriorityFeePerGas.startsWith('0x') ? BigInt(userOp.maxPriorityFeePerGas) : BigInt(userOp.maxPriorityFeePerGas)

      const userOpStruct = {
        sender: userOp.sender,
        nonce: nonceBigInt,
        initCode: userOp.initCode,
        callData: userOp.callData,
        callGasLimit: callGasLimitBigInt,
        verificationGasLimit: verificationGasLimitBigInt,
        preVerificationGas: preVerificationGasBigInt,
        maxFeePerGas: maxFeePerGasBigInt,
        maxPriorityFeePerGas: maxPriorityFeePerGasBigInt,
        paymasterAndData: userOp.paymasterAndData,
        signature: userOp.signature
      }

            const entryPoint = this.entryPointContract
      if (!entryPoint) {
        return this.error('EntryPoint contract not initialized', 'CONTRACT_NOT_INITIALIZED')
      }
      
      const hash = await entryPoint.getUserOpHash!(userOpStruct)
      return this.success(hash)

    } catch (error) {
      this.logError('Failed to get UserOperation hash', { error, userOp })
      return this.error('Failed to get UserOperation hash', 'USEROP_HASH_FAILED')
    }
  }

  private async validateUserOperation(userOp: UserOperation): Promise<ServiceResult<UserOperationValidationResult>> {
    try {
      const errors: any[] = []
      const warnings: any[] = []

      // Basic validation
      if (!ethers.isAddress(userOp.sender)) {
        errors.push({ code: 'INVALID_SENDER', field: 'sender', message: 'Invalid sender address' })
      }

      if (userOp.signature === '0x') {
        errors.push({ code: 'MISSING_SIGNATURE', field: 'signature', message: 'Signature required' })
      }

      return this.success({
        valid: errors.length === 0,
        errors,
        warnings
      })

    } catch (error) {
      this.logError('Failed to validate UserOperation', { error, userOp })
      return this.error('Failed to validate UserOperation', 'USEROP_VALIDATION_FAILED')
    }
  }

  private async storeUserOperation(userOp: UserOperation): Promise<ServiceResult<UserOperationRecord>> {
    try {
      const userOpHash = await this.getUserOperationHash(userOp)
      if (!userOpHash.success || !userOpHash.data) {
        return this.error('Failed to get UserOperation hash', 'USEROP_HASH_FAILED')
      }

      // Convert hex strings to bigints for database storage
      const nonceBigInt = userOp.nonce.startsWith('0x') ? BigInt(userOp.nonce) : BigInt(userOp.nonce)
      const callGasLimitBigInt = userOp.callGasLimit.startsWith('0x') ? BigInt(userOp.callGasLimit) : BigInt(userOp.callGasLimit)
      const verificationGasLimitBigInt = userOp.verificationGasLimit.startsWith('0x') ? BigInt(userOp.verificationGasLimit) : BigInt(userOp.verificationGasLimit)
      const preVerificationGasBigInt = userOp.preVerificationGas.startsWith('0x') ? BigInt(userOp.preVerificationGas) : BigInt(userOp.preVerificationGas)
      const maxFeePerGasBigInt = userOp.maxFeePerGas.startsWith('0x') ? BigInt(userOp.maxFeePerGas) : BigInt(userOp.maxFeePerGas)
      const maxPriorityFeePerGasBigInt = userOp.maxPriorityFeePerGas.startsWith('0x') ? BigInt(userOp.maxPriorityFeePerGas) : BigInt(userOp.maxPriorityFeePerGas)

      const record = await this.db.user_operations.create({
        data: {
          id: this.generateId(),
          user_op_hash: userOpHash.data,
          wallet_id: userOp.sender, // This should be mapped properly
          sender_address: userOp.sender,
          nonce: nonceBigInt,
          init_code: userOp.initCode,
          call_data: userOp.callData,
          call_gas_limit: callGasLimitBigInt,
          verification_gas_limit: verificationGasLimitBigInt,
          pre_verification_gas: preVerificationGasBigInt,
          max_fee_per_gas: maxFeePerGasBigInt,
          max_priority_fee_per_gas: maxPriorityFeePerGasBigInt,
          paymaster_and_data: userOp.paymasterAndData || '0x',
          signature_data: userOp.signature,
          status: 'pending' as const,
          created_at: new Date(),
          updated_at: new Date()
        }
      })

      const userOpRecord: UserOperationRecord = {
        id: record.id,
        user_op_hash: record.user_op_hash,
        wallet_id: record.wallet_id,
        sender_address: record.sender_address,
        nonce: record.nonce.toString(),
        init_code: record.init_code || '0x',
        call_data: record.call_data,
        call_gas_limit: record.call_gas_limit.toString(),
        verification_gas_limit: record.verification_gas_limit.toString(),
        pre_verification_gas: record.pre_verification_gas.toString(),
        max_fee_per_gas: record.max_fee_per_gas.toString(),
        max_priority_fee_per_gas: record.max_priority_fee_per_gas.toString(),
        paymaster_and_data: record.paymaster_and_data || '0x',
        signature_data: record.signature_data,
        status: record.status as UserOperationRecord['status'],
        transaction_hash: record.transaction_hash || undefined,
        block_number: record.block_number ? Number(record.block_number) : undefined,
        gas_used: record.gas_used ? record.gas_used.toString() : undefined,
        actual_gas_cost: record.actual_gas_cost ? record.actual_gas_cost.toString() : undefined,
        failure_reason: record.failure_reason || undefined,
        created_at: record.created_at || new Date(),
        updated_at: record.updated_at || new Date()
      }
      
      return this.success(userOpRecord)

    } catch (error) {
      this.logError('Failed to store UserOperation', { error, userOp })
      return this.error('Failed to store UserOperation', 'USEROP_STORE_FAILED')
    }
  }

  private async submitToEntryPoint(userOp: UserOperation): Promise<ServiceResult<{ transactionHash: string }>> {
    try {
      // This would typically be submitted through a bundler
      // For now, return placeholder
      const txHash = '0x' + Buffer.from(this.generateId()).toString('hex').slice(0, 64)
      
      return this.success({
        transactionHash: txHash
      })

    } catch (error) {
      this.logError('Failed to submit to EntryPoint', { error, userOp })
      return this.error('Failed to submit to EntryPoint', 'ENTRYPOINT_SUBMIT_FAILED')
    }
  }

  private async updateUserOperationStatus(
    userOpHash: string, 
    status: string,
    updates?: any
  ): Promise<void> {
    try {
      await this.db.user_operations.update({
        where: { user_op_hash: userOpHash },
        data: {
          status,
          ...updates,
          updated_at: new Date()
        }
      })
    } catch (error) {
      this.logError('Failed to update UserOperation status', { error, userOpHash, status })
    }
  }

  private categorizeOperation(callData: string): string {
    // Simple categorization based on function selector
    if (callData.startsWith('0xa9059cbb')) return 'ERC20_Transfer'
    if (callData.startsWith('0x23b872dd')) return 'ERC20_TransferFrom'
    if (callData.startsWith('0x095ea7b3')) return 'ERC20_Approve'
    if (callData.startsWith('0x42842e0e')) return 'NFT_Transfer'
    if (callData === '0x') return 'ETH_Transfer'
    return 'Other'
  }
}
