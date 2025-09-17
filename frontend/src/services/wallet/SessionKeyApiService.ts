import { BaseApiService } from '../base/BaseApiService'
import { ApiResponse } from '../../types/core/api'

export interface SessionKey {
  id: string
  walletId: string
  sessionKeyAddress: string
  publicKey: string
  permissions: SessionKeyPermissions
  validityStart: Date
  validityEnd: Date
  status: 'active' | 'revoked' | 'expired'
  createdByUserId: string
  spendingLimit?: bigint
  dailyLimit?: bigint
  allowedTargets: string[]
  allowedFunctions: string[]
  createdAt: Date
  lastUsedAt?: Date
  revokedAt?: Date
  usageCount: number
}

export interface SessionKeyPermissions {
  maxSpendingAmount: bigint
  dailySpendingLimit: bigint
  allowedContracts: string[]
  allowedFunctions: string[]
  timeRestrictions?: {
    startHour?: number
    endHour?: number
    allowedDays?: number[]
  }
  gasLimit?: bigint
  rateLimiting?: {
    maxTransactionsPerHour: number
    maxTransactionsPerDay: number
  }
}

export interface CreateSessionKeyRequest {
  walletId: string
  permissions: SessionKeyPermissions
  validityPeriod: { start: Date; end: Date }
}

export interface SessionKeyValidationResult {
  isValid: boolean
  canSpend: boolean
  remainingDailyLimit: bigint
  remainingTotalLimit: bigint
  errors: string[]
  warnings: string[]
}

export class SessionKeyApiService extends BaseApiService {
  constructor() {
    super('/api/wallet/session-keys')
  }

  /**
   * Get all session keys for a wallet
   */
  async getSessionKeysForWallet(walletId: string): Promise<ApiResponse<SessionKey[]>> {
    try {
      const response = await this.get<SessionKey[]>(`/wallet/${walletId}`)
      
      // Transform bigint fields from strings
      if (response.success && response.data) {
        response.data = response.data.map(key => ({
          ...key,
          validityStart: new Date(key.validityStart),
          validityEnd: new Date(key.validityEnd),
          createdAt: new Date(key.createdAt),
          lastUsedAt: key.lastUsedAt ? new Date(key.lastUsedAt) : undefined,
          revokedAt: key.revokedAt ? new Date(key.revokedAt) : undefined,
          spendingLimit: key.spendingLimit ? BigInt(key.spendingLimit) : undefined,
          dailyLimit: key.dailyLimit ? BigInt(key.dailyLimit) : undefined,
          permissions: {
            ...key.permissions,
            maxSpendingAmount: BigInt(key.permissions.maxSpendingAmount),
            dailySpendingLimit: BigInt(key.permissions.dailySpendingLimit),
            gasLimit: key.permissions.gasLimit ? BigInt(key.permissions.gasLimit) : undefined
          }
        }))
      }

      return response
    } catch (error) {
      return this.handleError('Failed to get session keys', error)
    }
  }

  /**
   * Create a new session key
   */
  async createSessionKey(request: CreateSessionKeyRequest): Promise<ApiResponse<SessionKey>> {
    try {
      // Transform bigint fields to strings for API
      const requestData = {
        ...request,
        permissions: {
          ...request.permissions,
          maxSpendingAmount: request.permissions.maxSpendingAmount.toString(),
          dailySpendingLimit: request.permissions.dailySpendingLimit.toString(),
          gasLimit: request.permissions.gasLimit?.toString()
        }
      }

      const response = await this.post<SessionKey>('/', requestData)
      
      // Transform response dates and bigints
      if (response.success && response.data) {
        response.data = {
          ...response.data,
          validityStart: new Date(response.data.validityStart),
          validityEnd: new Date(response.data.validityEnd),
          createdAt: new Date(response.data.createdAt),
          spendingLimit: response.data.spendingLimit ? BigInt(response.data.spendingLimit) : undefined,
          dailyLimit: response.data.dailyLimit ? BigInt(response.data.dailyLimit) : undefined,
          permissions: {
            ...response.data.permissions,
            maxSpendingAmount: BigInt(response.data.permissions.maxSpendingAmount),
            dailySpendingLimit: BigInt(response.data.permissions.dailySpendingLimit),
            gasLimit: response.data.permissions.gasLimit ? BigInt(response.data.permissions.gasLimit) : undefined
          }
        }
      }

      return response
    } catch (error) {
      return this.handleError('Failed to create session key', error)
    }
  }

  /**
   * Validate session key for transaction
   */
  async validateSessionKey(
    sessionKeyId: string,
    transactionAmount: bigint,
    targetAddress: string,
    functionSignature?: string
  ): Promise<ApiResponse<SessionKeyValidationResult>> {
    try {
      const requestData = {
        transactionAmount: transactionAmount.toString(),
        targetAddress,
        functionSignature
      }

      const response = await this.post<SessionKeyValidationResult>(
        `/${sessionKeyId}/validate`,
        requestData
      )

      // Transform bigint fields
      if (response.success && response.data) {
        response.data = {
          ...response.data,
          remainingDailyLimit: BigInt(response.data.remainingDailyLimit),
          remainingTotalLimit: BigInt(response.data.remainingTotalLimit)
        }
      }

      return response
    } catch (error) {
      return this.handleError('Failed to validate session key', error)
    }
  }

  /**
   * Revoke session key
   */
  async revokeSessionKey(sessionKeyId: string): Promise<ApiResponse<void>> {
    try {
      return await this.post(`/${sessionKeyId}/revoke`, {})
    } catch (error) {
      return this.handleError('Failed to revoke session key', error)
    }
  }

  /**
   * Get session key usage analytics
   */
  async getSessionKeyUsage(
    sessionKeyId: string,
    timeframe?: { from: Date; to: Date }
  ): Promise<ApiResponse<{
    totalTransactions: number
    totalAmountSpent: bigint
    dailyBreakdown: Array<{
      date: string
      transactions: number
      amountSpent: bigint
    }>
  }>> {
    try {
      const params = timeframe ? {
        from: timeframe.from.toISOString(),
        to: timeframe.to.toISOString()
      } : {}

      const response = await this.get(`/${sessionKeyId}/usage`, params)

      // Transform bigint fields
      if (response.success && response.data) {
        const data = response.data as any;
        const transformedData = {
          totalTransactions: data.totalTransactions,
          totalAmountSpent: BigInt(data.totalAmountSpent),
          dailyBreakdown: data.dailyBreakdown.map((day: any) => ({
            date: day.date,
            transactions: day.transactions,
            amountSpent: BigInt(day.amountSpent)
          }))
        };
        
        return {
          ...response,
          data: transformedData
        } as ApiResponse<{
          totalTransactions: number;
          totalAmountSpent: bigint;
          dailyBreakdown: Array<{
            date: string;
            transactions: number;
            amountSpent: bigint;
          }>;
        }>;
      }

      return response as ApiResponse<{
        totalTransactions: number;
        totalAmountSpent: bigint;
        dailyBreakdown: Array<{
          date: string;
          transactions: number;
          amountSpent: bigint;
        }>;
      }>;
    } catch (error) {
      return this.handleError('Failed to get session key usage', error)
    }
  }

  /**
   * Clean up expired session keys
   */
  async cleanupExpiredKeys(): Promise<ApiResponse<{ expiredCount: number }>> {
    try {
      return await this.post('/cleanup-expired', {})
    } catch (error) {
      return this.handleError('Failed to cleanup expired keys', error)
    }
  }
}

export const sessionKeyApiService = new SessionKeyApiService()
