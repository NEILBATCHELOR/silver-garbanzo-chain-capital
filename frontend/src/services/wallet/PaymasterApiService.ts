import { BaseApiService } from '../base/BaseApiService'
import { ApiResponse } from '../../types/core/api'

export interface PaymasterPolicy {
  id: string
  policyName: string
  paymasterAddress: string
  chainId: number
  policyType: 'whitelist' | 'rate_limit' | 'spending_limit' | 'token_based' | 'time_based'
  policyConfig: Record<string, any>
  isActive: boolean
  dailyLimit?: bigint
  monthlyLimit?: bigint
  whitelistedAddresses: string[]
  blacklistedAddresses: string[]
  allowedFunctions: string[]
  timeRestrictions?: {
    startHour?: number
    endHour?: number
    allowedDays?: number[]
  }
  createdAt: Date
  updatedAt: Date
}

export interface PaymasterConfiguration {
  paymasterAddress: string
  paymasterName: string
  chainId: number
  isActive: boolean
  totalSponsored: bigint
  dailyBudget: bigint
  remainingBudget: bigint
  successRate: number
  policies: PaymasterPolicy[]
}

export interface CreatePaymasterPolicyRequest {
  policyName: string
  paymasterAddress: string
  chainId: number
  policyType: PaymasterPolicy['policyType']
  policyConfig: Record<string, any>
  dailyLimit?: bigint
  monthlyLimit?: bigint
  whitelistedAddresses?: string[]
  blacklistedAddresses?: string[]
  allowedFunctions?: string[]
  timeRestrictions?: {
    startHour?: number
    endHour?: number
    allowedDays?: number[]
  }
}

export interface PaymasterSponsorshipAnalytics {
  totalOperations: number
  totalGasSponsored: string
  totalCostSponsored: string
  paymasterBreakdown: Record<string, {
    operations: number
    gasSponsored: string
    costSponsored: string
  }>
  topSponsors: Array<{
    address: string
    operations: number
    gasSponsored: string
  }>
}

export interface PaymasterData {
  paymaster: string
  paymasterVerificationGasLimit: string
  paymasterPostOpGasLimit: string
  paymasterData: string
}

export interface UserOperation {
  sender: string
  nonce: string
  initCode?: string
  callData: string
  callGasLimit: string
  verificationGasLimit: string
  preVerificationGas: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  paymasterAndData?: string
  signature?: string
}

export class PaymasterApiService extends BaseApiService {
  constructor() {
    super('/api/wallet/paymaster')
  }

  /**
   * Get all paymaster configurations
   */
  async getPaymasterConfigurations(): Promise<ApiResponse<PaymasterConfiguration[]>> {
    try {
      const response = await this.get<PaymasterConfiguration[]>('/')
      
      // Transform bigint fields and dates
      if (response.success && response.data) {
        response.data = response.data.map((config: any) => ({
          ...config,
          totalSponsored: BigInt(config.totalSponsored),
          dailyBudget: BigInt(config.dailyBudget),
          remainingBudget: BigInt(config.remainingBudget),
          policies: config.policies.map((policy: any) => ({
            ...policy,
            dailyLimit: policy.dailyLimit ? BigInt(policy.dailyLimit) : undefined,
            monthlyLimit: policy.monthlyLimit ? BigInt(policy.monthlyLimit) : undefined,
            createdAt: new Date(policy.createdAt),
            updatedAt: new Date(policy.updatedAt)
          }))
        }))
      }

      return response
    } catch (error) {
      return this.handleError('Failed to get paymaster configurations', error)
    }
  }

  /**
   * Get paymaster data for UserOperation sponsorship
   */
  async getPaymasterData(
    userOp: UserOperation,
    policyId?: string
  ): Promise<ApiResponse<PaymasterData & { validUntil: number }>> {
    try {
      const requestData = {
        userOperation: userOp,
        policyId
      }

      return await this.post('/get-paymaster-data', requestData)
    } catch (error) {
      return this.handleError('Failed to get paymaster data', error)
    }
  }

  /**
   * Create a new paymaster policy
   */
  async createPolicy(request: CreatePaymasterPolicyRequest): Promise<ApiResponse<PaymasterPolicy>> {
    try {
      // Transform bigint fields to strings for API
      const requestData = {
        ...request,
        dailyLimit: request.dailyLimit?.toString(),
        monthlyLimit: request.monthlyLimit?.toString()
      }

      const response = await this.post<PaymasterPolicy>('/policies', requestData)
      
      // Transform response
      if (response.success && response.data) {
        response.data = {
          ...response.data,
          dailyLimit: response.data.dailyLimit ? BigInt(response.data.dailyLimit) : undefined,
          monthlyLimit: response.data.monthlyLimit ? BigInt(response.data.monthlyLimit) : undefined,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt)
        }
      }

      return response
    } catch (error) {
      return this.handleError('Failed to create paymaster policy', error)
    }
  }

  /**
   * Update a paymaster policy
   */
  async updatePolicy(
    policyId: string, 
    updates: Partial<CreatePaymasterPolicyRequest>
  ): Promise<ApiResponse<PaymasterPolicy>> {
    try {
      // Transform bigint fields to strings for API
      const requestData = {
        ...updates,
        dailyLimit: updates.dailyLimit?.toString(),
        monthlyLimit: updates.monthlyLimit?.toString()
      }

      const response = await this.put<PaymasterPolicy>(`/policies/${policyId}`, requestData)
      
      // Transform response
      if (response.success && response.data) {
        response.data = {
          ...response.data,
          dailyLimit: response.data.dailyLimit ? BigInt(response.data.dailyLimit) : undefined,
          monthlyLimit: response.data.monthlyLimit ? BigInt(response.data.monthlyLimit) : undefined,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt)
        }
      }

      return response
    } catch (error) {
      return this.handleError('Failed to update paymaster policy', error)
    }
  }

  /**
   * Delete a paymaster policy
   */
  async deletePolicy(policyId: string): Promise<ApiResponse<void>> {
    try {
      return await this.delete(`/policies/${policyId}`)
    } catch (error) {
      return this.handleError('Failed to delete paymaster policy', error)
    }
  }

  /**
   * Toggle policy active status
   */
  async togglePolicy(policyId: string, isActive: boolean): Promise<ApiResponse<PaymasterPolicy>> {
    try {
      const response = await this.patch<PaymasterPolicy>(`/policies/${policyId}/toggle`, { isActive })
      
      // Transform response
      if (response.success && response.data) {
        response.data = {
          ...response.data,
          dailyLimit: response.data.dailyLimit ? BigInt(response.data.dailyLimit) : undefined,
          monthlyLimit: response.data.monthlyLimit ? BigInt(response.data.monthlyLimit) : undefined,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt)
        }
      }

      return response
    } catch (error) {
      return this.handleError('Failed to toggle paymaster policy', error)
    }
  }

  /**
   * Get sponsorship analytics
   */
  async getSponsorshipAnalytics(
    timeframe: { from: Date; to: Date },
    filters?: {
      paymasterAddress?: string
      sponsorAddress?: string
      walletAddress?: string
    }
  ): Promise<ApiResponse<PaymasterSponsorshipAnalytics>> {
    try {
      const params = {
        from: timeframe.from.toISOString(),
        to: timeframe.to.toISOString(),
        ...filters
      }

      return await this.get('/analytics', params)
    } catch (error) {
      return this.handleError('Failed to get sponsorship analytics', error)
    }
  }

  /**
   * Validate paymaster policy
   */
  async validatePolicy(
    userOp: UserOperation,
    policyId: string
  ): Promise<ApiResponse<{ approved: boolean; reason?: string; estimatedCost?: string }>> {
    try {
      const requestData = {
        userOperation: userOp,
        policyId
      }

      return await this.post('/validate-policy', requestData)
    } catch (error) {
      return this.handleError('Failed to validate policy', error)
    }
  }

  /**
   * Get policy usage statistics
   */
  async getPolicyUsage(
    policyId: string,
    timeframe?: { from: Date; to: Date }
  ): Promise<ApiResponse<{
    totalOperations: number
    approvedOperations: number
    rejectedOperations: number
    totalGasSponsored: bigint
    avgGasPerOperation: bigint
    dailyBreakdown: Array<{
      date: string
      operations: number
      gasSponsored: bigint
    }>
  }>> {
    try {
      const params = timeframe ? {
        from: timeframe.from.toISOString(),
        to: timeframe.to.toISOString()
      } : {}

      const response = await this.get(`/policies/${policyId}/usage`, params)

      // Transform bigint fields
      if (response.success && response.data) {
        const data = response.data as any;
        response.data = {
          totalOperations: data.totalOperations,
          approvedOperations: data.approvedOperations,
          rejectedOperations: data.rejectedOperations,
          totalGasSponsored: BigInt(data.totalGasSponsored),
          avgGasPerOperation: BigInt(data.avgGasPerOperation),
          dailyBreakdown: data.dailyBreakdown.map((day: any) => ({
            date: day.date,
            operations: day.operations,
            gasSponsored: BigInt(day.gasSponsored)
          }))
        }
      }

      return response as ApiResponse<{
        totalOperations: number
        approvedOperations: number
        rejectedOperations: number
        totalGasSponsored: bigint
        avgGasPerOperation: bigint
        dailyBreakdown: Array<{
          date: string
          operations: number
          gasSponsored: bigint
        }>
      }>
    } catch (error) {
      return this.handleError('Failed to get policy usage', error)
    }
  }

  /**
   * Configure paymaster settings
   */
  async configurePaymaster(
    paymasterAddress: string,
    config: {
      paymasterName?: string
      isActive?: boolean
      dailyBudget?: bigint
      successRateThreshold?: number
    }
  ): Promise<ApiResponse<PaymasterConfiguration>> {
    try {
      const requestData = {
        ...config,
        dailyBudget: config.dailyBudget?.toString()
      }

      const response = await this.put<PaymasterConfiguration>(
        `/configure/${paymasterAddress}`, 
        requestData
      )
      
      // Transform response
      if (response.success && response.data) {
        response.data = {
          ...response.data,
          totalSponsored: BigInt(response.data.totalSponsored),
          dailyBudget: BigInt(response.data.dailyBudget),
          remainingBudget: BigInt(response.data.remainingBudget),
          policies: response.data.policies.map(policy => ({
            ...policy,
            dailyLimit: policy.dailyLimit ? BigInt(policy.dailyLimit) : undefined,
            monthlyLimit: policy.monthlyLimit ? BigInt(policy.monthlyLimit) : undefined,
            createdAt: new Date(policy.createdAt),
            updatedAt: new Date(policy.updatedAt)
          }))
        }
      }

      return response
    } catch (error) {
      return this.handleError('Failed to configure paymaster', error)
    }
  }
}

export const paymasterApiService = new PaymasterApiService()
