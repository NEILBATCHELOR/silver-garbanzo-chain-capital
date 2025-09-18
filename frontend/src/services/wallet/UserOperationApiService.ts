import { BaseApiService } from '../base/BaseApiService'
import { ApiResponse } from '../../types/core/api'

export interface BatchOperation {
  target: string
  value: string
  data: string
  description?: string
}

export interface UserOperationPaymaster {
  type: 'user_pays' | 'sponsored' | 'token_paymaster'
  tokenAddress?: string
  maxFeeAmount?: string
  sponsorId?: string
}

export interface GasPolicy {
  priorityLevel: 'low' | 'medium' | 'high' | 'urgent'
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
}

export interface UserOperationRequest {
  walletAddress: string
  operations: BatchOperation[]
  paymasterPolicy: UserOperationPaymaster
  gasPolicy: GasPolicy
  nonceKey?: number
}

export interface GasEstimate {
  callGasLimit: string
  verificationGasLimit: string
  preVerificationGas: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
}

export interface UserOperationPreview {
  userOpHash: string
  gasEstimate: GasEstimate
  totalGasCost: string
  paymasterData?: any
  validUntil?: number
}

export interface UserOperationStatus {
  userOpHash: string
  status: 'pending' | 'submitted' | 'included' | 'failed'
  transactionHash?: string
  blockNumber?: number
  gasUsed?: string
  actualGasCost?: string
  reason?: string
  createdAt: Date
  updatedAt: Date
}

export interface UserOperationSubmission {
  userOpHash: string
  walletAddress: string
  signature?: string
}

export interface UserOperationAnalytics {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  totalGasUsed: bigint
  averageGasUsed: bigint
  gasSavings: bigint
  paymasterUsage: {
    sponsored: number
    userPaid: number
    tokenBased: number
  }
  dailyBreakdown: Array<{
    date: string
    operations: number
    gasUsed: bigint
    successRate: number
  }>
}

export class UserOperationApiService extends BaseApiService {
  constructor() {
    super('/api/wallet/user-operations')
  }

  /**
   * Build UserOperation from batch operations
   */
  async buildUserOperation(request: UserOperationRequest): Promise<ApiResponse<UserOperationPreview>> {
    try {
      return await this.post('/build', request)
    } catch (error) {
      return this.handleError('Failed to build UserOperation', error)
    }
  }

  /**
   * Submit UserOperation to bundler
   */
  async submitUserOperation(submission: UserOperationSubmission): Promise<ApiResponse<UserOperationStatus>> {
    try {
      const response = await this.post<UserOperationStatus>('/submit', submission)
      
      // Transform response dates
      if (response.success && response.data) {
        response.data = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt)
        }
      }

      return response
    } catch (error) {
      return this.handleError('Failed to submit UserOperation', error)
    }
  }

  /**
   * Get UserOperation status
   */
  async getUserOperationStatus(userOpHash: string): Promise<ApiResponse<UserOperationStatus>> {
    try {
      const response = await this.get<UserOperationStatus>(`/${userOpHash}/status`)
      
      // Transform response dates
      if (response.success && response.data) {
        response.data = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt)
        }
      }

      return response
    } catch (error) {
      return this.handleError('Failed to get UserOperation status', error)
    }
  }

  /**
   * Get gas price recommendations
   */
  async getGasRecommendations(chainId: number): Promise<ApiResponse<{
    slow: GasEstimate
    medium: GasEstimate
    fast: GasEstimate
    urgent: GasEstimate
  }>> {
    try {
      return await this.get('/gas-recommendations', { chainId })
    } catch (error) {
      return this.handleError('Failed to get gas recommendations', error)
    }
  }

  /**
   * Estimate UserOperation gas costs
   */
  async estimateGas(request: UserOperationRequest): Promise<ApiResponse<GasEstimate>> {
    try {
      return await this.post('/estimate-gas', request)
    } catch (error) {
      return this.handleError('Failed to estimate gas', error)
    }
  }

  /**
   * Get UserOperation history for wallet
   */
  async getUserOperationHistory(
    walletAddress: string,
    options?: {
      limit?: number
      offset?: number
      status?: UserOperationStatus['status']
      fromDate?: Date
      toDate?: Date
    }
  ): Promise<ApiResponse<{
    operations: UserOperationStatus[]
    totalCount: number
  }>> {
    try {
      const params: any = { walletAddress }
      
      if (options) {
        if (options.limit) params.limit = options.limit
        if (options.offset) params.offset = options.offset
        if (options.status) params.status = options.status
        if (options.fromDate) params.fromDate = options.fromDate.toISOString()
        if (options.toDate) params.toDate = options.toDate.toISOString()
      }

      const response = await this.get<{
        operations: UserOperationStatus[]
        totalCount: number
      }>('/history', params)
      
      // Transform response dates
      if (response.success && response.data) {
        response.data.operations = response.data.operations.map((op: any) => ({
          ...op,
          createdAt: new Date(op.createdAt),
          updatedAt: new Date(op.updatedAt)
        }))
      }

      return response
    } catch (error) {
      return this.handleError('Failed to get UserOperation history', error)
    }
  }

  /**
   * Cancel pending UserOperation
   */
  async cancelUserOperation(userOpHash: string): Promise<ApiResponse<UserOperationStatus>> {
    try {
      const response = await this.post<UserOperationStatus>(`/${userOpHash}/cancel`, {})
      
      // Transform response dates
      if (response.success && response.data) {
        response.data = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt)
        }
      }

      return response
    } catch (error) {
      return this.handleError('Failed to cancel UserOperation', error)
    }
  }

  /**
   * Get UserOperation analytics
   */
  async getUserOperationAnalytics(
    walletAddress: string,
    timeframe: { from: Date; to: Date }
  ): Promise<ApiResponse<UserOperationAnalytics>> {
    try {
      const params = {
        walletAddress,
        from: timeframe.from.toISOString(),
        to: timeframe.to.toISOString()
      }

      const response = await this.get('/analytics', params)

      // Transform bigint fields
      if (response.success && response.data) {
        const data = response.data as any;
        response.data = {
          totalOperations: data.totalOperations,
          successfulOperations: data.successfulOperations,
          failedOperations: data.failedOperations,
          totalGasUsed: BigInt(data.totalGasUsed),
          averageGasUsed: BigInt(data.averageGasUsed),
          gasSavings: BigInt(data.gasSavings),
          paymasterUsage: data.paymasterUsage,
          dailyBreakdown: data.dailyBreakdown.map((day: any) => ({
            date: day.date,
            operations: day.operations,
            gasUsed: BigInt(day.gasUsed),
            successRate: day.successRate
          }))
        }
      }

      return response as ApiResponse<UserOperationAnalytics>
    } catch (error) {
      return this.handleError('Failed to get UserOperation analytics', error)
    }
  }

  /**
   * Validate UserOperation before submission
   */
  async validateUserOperation(request: UserOperationRequest): Promise<ApiResponse<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    estimatedCost: string
  }>> {
    try {
      return await this.post('/validate', request)
    } catch (error) {
      return this.handleError('Failed to validate UserOperation', error)
    }
  }

  /**
   * Get supported entry points for chain
   */
  async getSupportedEntryPoints(chainId: number): Promise<ApiResponse<string[]>> {
    try {
      return await this.get('/entry-points', { chainId })
    } catch (error) {
      return this.handleError('Failed to get supported entry points', error)
    }
  }

  /**
   * Simulate UserOperation execution
   */
  async simulateUserOperation(request: UserOperationRequest): Promise<ApiResponse<{
    success: boolean
    gasUsed: string
    returnData?: string
    error?: string
  }>> {
    try {
      return await this.post('/simulate', request)
    } catch (error) {
      return this.handleError('Failed to simulate UserOperation', error)
    }
  }
}

export const userOperationApiService = new UserOperationApiService()
