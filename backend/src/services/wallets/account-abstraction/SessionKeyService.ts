import { BaseService } from '../../BaseService'
import { ServiceResult } from '../../../types/index'
import { ethers } from 'ethers'

/**
 * SessionKeyService - Session Key Management for Account Abstraction
 * 
 * Enables session keys for improved UX by allowing:
 * - Temporary spending permissions without main wallet approval
 * - Time-bound and amount-limited transactions
 * - Specific contract interaction permissions
 * - Automated transaction execution within limits
 */

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
    allowedDays?: number[] // 0-6 (Sunday-Saturday)
  }
  gasLimit?: bigint
  rateLimiting?: {
    maxTransactionsPerHour: number
    maxTransactionsPerDay: number
  }
}

export interface SessionKeyUsage {
  id: string
  sessionKeyId: string
  userOperationId: string
  amountSpent: bigint
  targetAddress: string
  functionSignature?: string
  createdAt: Date
}

export interface SessionKeyValidationResult {
  isValid: boolean
  canSpend: boolean
  remainingDailyLimit: bigint
  remainingTotalLimit: bigint
  errors: string[]
  warnings: string[]
}

export class SessionKeyService extends BaseService {
  private provider: ethers.JsonRpcProvider

  constructor() {
    super('SessionKey')
    
    this.provider = new ethers.JsonRpcProvider(
      process.env.BLOCKCHAIN_RPC_URL || 'https://ethereum.publicnode.com'
    )
  }

  /**
   * Create a new session key with specified permissions
   */
  async createSessionKey(
    walletId: string,
    permissions: SessionKeyPermissions,
    validityPeriod: { start: Date; end: Date },
    createdByUserId: string
  ): Promise<ServiceResult<SessionKey>> {
    try {
      // Generate new session key pair
      const sessionWallet = ethers.Wallet.createRandom()
      const sessionKeyAddress = sessionWallet.address
      const publicKey = sessionWallet.publicKey

      // Validate permissions
      const validationResult = this.validatePermissions(permissions)
      if (!validationResult.isValid) {
        return this.error('Invalid session key permissions', 'INVALID_PERMISSIONS', 400)
      }

      // Create session key object
      const sessionKeyData = {
        id: ethers.id(sessionKeyAddress + Date.now().toString()),
        wallet_id: walletId,
        session_key_address: sessionKeyAddress,
        public_key: publicKey,
        permissions: permissions as any,
        validity_start: validityPeriod.start,
        validity_end: validityPeriod.end,
        status: 'active',
        created_by_user_id: createdByUserId,
        spending_limit: permissions.maxSpendingAmount,
        daily_limit: permissions.dailySpendingLimit,
        allowed_targets: permissions.allowedContracts as any,
        allowed_functions: permissions.allowedFunctions as any,
        created_at: new Date(),
        usage_count: 0
      }

      // Store in database using Prisma
      const storedSessionKey = await this.db.session_keys.create({
        data: sessionKeyData
      })

      const sessionKey: SessionKey = this.mapRowToSessionKey(storedSessionKey)

      this.logInfo('Session key created successfully', {
        sessionKeyId: sessionKey.id,
        walletId,
        validityPeriod
      })

      return this.success(sessionKey)
      
    } catch (error) {
      this.logError('Failed to create session key', error)
      return this.error('Session key creation failed', 'SESSION_KEY_CREATE_FAILED')
    }
  }

  /**
   * Validate session key for transaction execution
   */
  async validateSessionKey(
    sessionKeyId: string,
    transactionAmount: bigint,
    targetAddress: string,
    functionSignature?: string
  ): Promise<ServiceResult<SessionKeyValidationResult>> {
    try {
      // Get session key from database
      const sessionKey = await this.getSessionKeyById(sessionKeyId)
      if (!sessionKey.success || !sessionKey.data) {
        return this.error('Session key not found', 'SESSION_KEY_NOT_FOUND')
      }

      const key = sessionKey.data
      const now = new Date()
      const errors: string[] = []
      const warnings: string[] = []

      // Check validity period
      if (now < key.validityStart || now > key.validityEnd) {
        errors.push('Session key is outside validity period')
      }

      // Check status
      if (key.status !== 'active') {
        errors.push(`Session key is ${key.status}`)
      }

      // Check allowed targets
      if (key.allowedTargets.length > 0 && !key.allowedTargets.includes(targetAddress.toLowerCase())) {
        errors.push('Target address not allowed')
      }

      // Check allowed functions
      if (functionSignature && key.allowedFunctions.length > 0) {
        const functionSelector = functionSignature.slice(0, 10)
        if (!key.allowedFunctions.includes(functionSelector)) {
          errors.push('Function not allowed')
        }
      }

      // Check spending limits
      const dailyUsage = await this.getDailyUsage(sessionKeyId)
      const remainingDailyLimit = key.dailyLimit ? key.dailyLimit - dailyUsage : BigInt(0)
      const remainingTotalLimit = key.spendingLimit ? key.spendingLimit - await this.getTotalUsage(sessionKeyId) : BigInt(0)

      if (key.dailyLimit && transactionAmount > remainingDailyLimit) {
        errors.push('Transaction exceeds daily spending limit')
      }

      if (key.spendingLimit && transactionAmount > remainingTotalLimit) {
        errors.push('Transaction exceeds total spending limit')
      }

      // Check rate limiting
      if (key.permissions.rateLimiting) {
        const rateLimitCheck = await this.checkRateLimiting(sessionKeyId, key.permissions.rateLimiting)
        if (!rateLimitCheck.allowed) {
          errors.push('Rate limit exceeded')
        }
      }

      const result: SessionKeyValidationResult = {
        isValid: errors.length === 0,
        canSpend: errors.length === 0,
        remainingDailyLimit,
        remainingTotalLimit,
        errors,
        warnings
      }

      return this.success(result)
      
    } catch (error) {
      this.logError('Failed to validate session key', error)
      return this.error('Session key validation failed', 'SESSION_KEY_VALIDATION_FAILED')
    }
  }

  /**
   * Record session key usage for spending tracking
   */
  async recordUsage(
    sessionKeyId: string,
    userOperationId: string,
    amountSpent: bigint,
    targetAddress: string,
    functionSignature?: string
  ): Promise<ServiceResult<void>> {
    try {
      const usageData = {
        id: ethers.id(sessionKeyId + userOperationId + Date.now().toString()),
        session_key_id: sessionKeyId,
        user_operation_id: userOperationId,
        amount_spent: amountSpent,
        target_address: targetAddress,
        function_signature: functionSignature,
        created_at: new Date()
      }

      // Store usage record using Prisma
      await this.db.session_key_usage.create({
        data: usageData
      })

      // Update session key usage count and last used timestamp
      await this.db.session_keys.update({
        where: { id: sessionKeyId },
        data: {
          usage_count: { increment: 1 },
          last_used_at: new Date()
        }
      })

      this.logInfo('Session key usage recorded', {
        sessionKeyId,
        userOperationId,
        amountSpent: amountSpent.toString()
      })

      return this.success(undefined)
      
    } catch (error) {
      this.logError('Failed to record session key usage', error)
      return this.error('Usage recording failed', 'USAGE_RECORD_FAILED')
    }
  }

  /**
   * Revoke session key
   */
  async revokeSessionKey(sessionKeyId: string, revokedBy: string): Promise<ServiceResult<void>> {
    try {
      await this.db.session_keys.updateMany({
        where: { 
          id: sessionKeyId,
          status: 'active'
        },
        data: {
          status: 'revoked',
          revoked_at: new Date()
        }
      })

      this.logInfo('Session key revoked', { sessionKeyId, revokedBy })
      return this.success(undefined)
      
    } catch (error) {
      this.logError('Failed to revoke session key', error)
      return this.error('Session key revocation failed', 'SESSION_KEY_REVOKE_FAILED')
    }
  }

  /**
   * Get session keys for a wallet
   */
  async getSessionKeysForWallet(walletId: string): Promise<ServiceResult<SessionKey[]>> {
    try {
      const sessionKeyRows = await this.db.session_keys.findMany({
        where: { wallet_id: walletId },
        orderBy: { created_at: 'desc' }
      })

      const sessionKeys = sessionKeyRows.map((row: any) => this.mapRowToSessionKey(row))
      return this.success(sessionKeys)
      
    } catch (error) {
      this.logError('Failed to get session keys', error)
      return this.error('Failed to get session keys', 'SESSION_KEYS_GET_FAILED')
    }
  }

  // Private helper methods
  private validatePermissions(permissions: SessionKeyPermissions): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (permissions.maxSpendingAmount <= 0) {
      errors.push('Maximum spending amount must be positive')
    }

    if (permissions.dailySpendingLimit <= 0) {
      errors.push('Daily spending limit must be positive')
    }

    if (permissions.dailySpendingLimit > permissions.maxSpendingAmount) {
      errors.push('Daily limit cannot exceed total spending limit')
    }

    if (permissions.allowedContracts.length === 0) {
      errors.push('At least one allowed contract must be specified')
    }

    // Validate Ethereum addresses
    for (const address of permissions.allowedContracts) {
      if (!ethers.isAddress(address)) {
        errors.push(`Invalid contract address: ${address}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private async getSessionKeyById(sessionKeyId: string): Promise<ServiceResult<SessionKey>> {
    try {
      const sessionKeyRow = await this.db.session_keys.findUnique({
        where: { id: sessionKeyId }
      })

      if (!sessionKeyRow) {
        return this.error('Session key not found', 'SESSION_KEY_NOT_FOUND')
      }

      const sessionKey = this.mapRowToSessionKey(sessionKeyRow)
      return this.success(sessionKey)
    } catch (error) {
      return this.error('Failed to get session key', 'DB_GET_FAILED')
    }
  }

  private async getDailyUsage(sessionKeyId: string): Promise<bigint> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const result = await this.db.session_key_usage.aggregate({
        where: {
          session_key_id: sessionKeyId,
          created_at: { gte: today }
        },
        _sum: {
          amount_spent: true
        }
      })

      return BigInt(result._sum.amount_spent || '0')
    } catch (error) {
      return BigInt(0)
    }
  }

  private async getTotalUsage(sessionKeyId: string): Promise<bigint> {
    try {
      const result = await this.db.session_key_usage.aggregate({
        where: { session_key_id: sessionKeyId },
        _sum: {
          amount_spent: true
        }
      })

      return BigInt(result._sum.amount_spent || '0')
    } catch (error) {
      return BigInt(0)
    }
  }

  private async checkRateLimiting(
    sessionKeyId: string, 
    rateLimiting: { maxTransactionsPerHour: number; maxTransactionsPerDay: number }
  ): Promise<{ allowed: boolean; hourlyCount: number; dailyCount: number }> {
    try {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const [hourlyCount, dailyCount] = await Promise.all([
        this.db.session_key_usage.count({
          where: {
            session_key_id: sessionKeyId,
            created_at: { gte: oneHourAgo }
          }
        }),
        this.db.session_key_usage.count({
          where: {
            session_key_id: sessionKeyId,
            created_at: { gte: oneDayAgo }
          }
        })
      ])

      const allowed = 
        hourlyCount < rateLimiting.maxTransactionsPerHour &&
        dailyCount < rateLimiting.maxTransactionsPerDay

      return { allowed, hourlyCount, dailyCount }
    } catch (error) {
      return { allowed: false, hourlyCount: 0, dailyCount: 0 }
    }
  }

  private mapRowToSessionKey(row: any): SessionKey {
    return {
      id: row.id,
      walletId: row.wallet_id,
      sessionKeyAddress: row.session_key_address,
      publicKey: row.public_key,
      permissions: row.permissions || {},
      validityStart: new Date(row.validity_start),
      validityEnd: new Date(row.validity_end),
      status: row.status,
      createdByUserId: row.created_by_user_id,
      spendingLimit: row.spending_limit ? BigInt(row.spending_limit) : undefined,
      dailyLimit: row.daily_limit ? BigInt(row.daily_limit) : undefined,
      allowedTargets: row.allowed_targets || [],
      allowedFunctions: row.allowed_functions || [],
      createdAt: new Date(row.created_at),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : undefined,
      usageCount: row.usage_count || 0
    }
  }

  /**
   * Clean up expired session keys
   */
  async cleanupExpiredSessionKeys(): Promise<ServiceResult<number>> {
    try {
      const result = await this.db.session_keys.updateMany({
        where: {
          status: 'active',
          validity_end: { lt: new Date() }
        },
        data: {
          status: 'expired'
        }
      })

      const expiredCount = result.count
      this.logInfo('Expired session keys cleaned up', { count: expiredCount })
      
      return this.success(expiredCount)
    } catch (error) {
      this.logError('Failed to cleanup expired session keys', error)
      return this.error('Cleanup failed', 'CLEANUP_FAILED')
    }
  }
}
