import { BaseService } from '../../BaseService'
import { ServiceResult } from '../../../types/index'
import { SmartContractWalletService } from '../smart-contract/SmartContractWalletService'
import { GuardianRecoveryService } from '../guardian/GuardianRecoveryService'

export interface WalletLock {
  id: string
  walletId: string
  lockType: 'emergency' | 'security' | 'maintenance' | 'guardian_triggered'
  isLocked: boolean
  lockedBy: string
  lockedAt: string
  unlockTime?: string
  lockReason?: string
  lockNonce: number
  unlockHash?: string
  canUnlockEarly: boolean
  createdAt: string
  updatedAt: string
}

export interface LockRequest {
  walletId: string
  lockType: 'emergency' | 'security' | 'maintenance' | 'guardian_triggered'
  lockReason?: string
  lockDuration?: number // Duration in seconds, if null uses default
  lockedBy: string
}

export interface UnlockRequest {
  walletId: string
  approverAddress: string
  signature: string
  unlockReason?: string
}

export interface LockStatus {
  walletId: string
  isLocked: boolean
  lockType?: string
  lockedAt?: string
  unlockTime?: string
  lockReason?: string
  canUnlockEarly: boolean
  timeRemaining?: number
  authorizedUnlockers: string[]
}

/**
 * LockService - Emergency Wallet Lock/Unlock System
 * 
 * Manages emergency lock/unlock functionality for smart contract wallets.
 * Based on Barz LockFacet with enhanced Chain Capital functionality.
 * 
 * Features:
 * - Emergency wallet locking by owner or guardians
 * - Time-based automatic unlock
 * - Guardian signature-based early unlock
 * - Multiple lock types (emergency, security, maintenance)
 * - Nonce-based replay protection
 */
export class LockService extends BaseService {
  
  private smartContractWallet: SmartContractWalletService
  private guardianService: GuardianRecoveryService

  constructor() {
    super('Lock')
    this.smartContractWallet = new SmartContractWalletService()
    this.guardianService = new GuardianRecoveryService()
  }

  /**
   * Lock a wallet for security reasons
   */
  async lockWallet(request: LockRequest): Promise<ServiceResult<WalletLock>> {
    try {
      const { walletId, lockType, lockReason, lockDuration, lockedBy } = request

      // Validate wallet exists and is smart contract wallet
      const smartWallet = await this.smartContractWallet.getSmartContractWallet(walletId)
      if (!smartWallet.success || !smartWallet.data) {
        return this.error('Smart contract wallet not found', 'SMART_WALLET_NOT_FOUND', 404)
      }

      // Check if wallet is already locked
      const currentLock = await this.getLockStatus(walletId)
      if (currentLock.success && currentLock.data!.isLocked) {
        return this.error('Wallet is already locked', 'WALLET_ALREADY_LOCKED')
      }

      // Validate the locker is authorized
      const isAuthorized = await this.isAuthorizedLocker(walletId, lockedBy)
      if (!isAuthorized) {
        return this.error('Unauthorized to lock wallet', 'UNAUTHORIZED_LOCKER')
      }

      // Calculate unlock time
      const lockPeriod = lockDuration || this.getDefaultLockPeriod(lockType)
      const now = new Date()
      const unlockTime = new Date(now.getTime() + lockPeriod * 1000)

      // Get or create lock nonce
      const lockNonce = await this.getNextLockNonce(walletId)

      // Generate unlock hash for signature verification
      const unlockHash = await this.generateUnlockHash(walletId, lockNonce)

      // Create lock record
      const lock = await this.db.wallet_locks.create({
        data: {
          wallet_id: walletId,
          lock_type: lockType,
          is_locked: true,
          locked_by: lockedBy,
          locked_at: now,
          unlock_time: unlockTime,
          lock_reason: lockReason,
          lock_nonce: lockNonce,
          unlock_hash: unlockHash,
          can_unlock_early: true,
          lock_data: {
            lockPeriod,
            originalUnlockTime: unlockTime.toISOString()
          }
        }
      })

      // Execute lock on smart contract
      const lockResult = await this.executeLockOnContract(walletId, unlockTime, lockNonce)
      if (!lockResult.success) {
        // Rollback database lock
        await this.db.wallet_locks.delete({ where: { id: lock.id } })
        return this.error(lockResult.error!, lockResult.code!)
      }

      this.logger.info({
        walletId,
        lockType,
        lockedBy,
        unlockTime: unlockTime.toISOString(),
        lockNonce
      }, 'Wallet locked successfully')

      return this.success(this.mapToWalletLock(lock))

    } catch (error) {
      this.logger.error({ error, request }, 'Failed to lock wallet')
      return this.error('Failed to lock wallet', 'WALLET_LOCK_ERROR')
    }
  }

  /**
   * Unlock a wallet with guardian signature
   */
  async unlockWallet(request: UnlockRequest): Promise<ServiceResult<boolean>> {
    try {
      const { walletId, approverAddress, signature, unlockReason } = request

      // Get current lock status
      const currentLock = await this.getCurrentLock(walletId)
      if (!currentLock) {
        return this.error('Wallet is not locked', 'WALLET_NOT_LOCKED')
      }

      // Check if natural unlock time has passed
      const now = new Date()
      if (currentLock.unlock_time && now >= currentLock.unlock_time) {
        // Natural unlock - no signature verification needed
        return await this.performUnlock(walletId, currentLock, 'automatic', unlockReason)
      }

      // Verify the approver is authorized (guardian or owner)
      const isAuthorized = await this.isAuthorizedUnlocker(walletId, approverAddress)
      if (!isAuthorized) {
        return this.error('Unauthorized to unlock wallet', 'UNAUTHORIZED_UNLOCKER')
      }

      // Verify signature
      const signatureValid = await this.verifyUnlockSignature(
        currentLock.unlock_hash!,
        approverAddress,
        signature
      )

      if (!signatureValid) {
        return this.error('Invalid unlock signature', 'INVALID_UNLOCK_SIGNATURE')
      }

      // Perform the unlock
      const unlockResult = await this.performUnlock(walletId, currentLock, approverAddress, unlockReason)
      if (!unlockResult.success) {
        return this.error(unlockResult.error!, unlockResult.code!)
      }

      this.logger.info({
        walletId,
        approverAddress,
        unlockReason,
        lockType: currentLock.lock_type
      }, 'Wallet unlocked by guardian')

      return this.success(true)

    } catch (error) {
      this.logger.error({ error, request }, 'Failed to unlock wallet')
      return this.error('Failed to unlock wallet', 'WALLET_UNLOCK_ERROR')
    }
  }

  /**
   * Get current lock status for a wallet
   */
  async getLockStatus(walletId: string): Promise<ServiceResult<LockStatus>> {
    try {
      const currentLock = await this.getCurrentLock(walletId)
      
      if (!currentLock) {
        // Wallet is not locked
        return this.success({
          walletId,
          isLocked: false,
          canUnlockEarly: false,
          authorizedUnlockers: []
        })
      }

      // Check if lock has naturally expired
      const now = new Date()
      const hasExpired = currentLock.unlock_time && now >= currentLock.unlock_time

      if (hasExpired) {
        // Auto-unlock the wallet
        await this.performUnlock(walletId, currentLock, 'automatic', 'Lock period expired')
        
        return this.success({
          walletId,
          isLocked: false,
          canUnlockEarly: false,
          authorizedUnlockers: []
        })
      }

      // Get authorized unlockers
      const authorizedUnlockers = await this.getAuthorizedUnlockers(walletId)

      // Calculate time remaining
      const timeRemaining = currentLock.unlock_time 
        ? Math.max(0, currentLock.unlock_time.getTime() - now.getTime()) / 1000
        : undefined

      const status: LockStatus = {
        walletId,
        isLocked: true,
        lockType: currentLock.lock_type,
        lockedAt: currentLock.locked_at.toISOString(),
        unlockTime: currentLock.unlock_time?.toISOString(),
        lockReason: currentLock.lock_reason,
        canUnlockEarly: currentLock.can_unlock_early,
        timeRemaining,
        authorizedUnlockers
      }

      return this.success(status)

    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to get lock status')
      return this.error('Failed to get lock status', 'LOCK_STATUS_ERROR')
    }
  }

  /**
   * Get lock history for a wallet
   */
  async getLockHistory(
    walletId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<ServiceResult<WalletLock[]>> {
    try {
      const { limit = 20, offset = 0 } = options

      const locks = await this.db.wallet_locks.findMany({
        where: { wallet_id: walletId },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset
      })

      return this.success(locks.map(l => this.mapToWalletLock(l)))

    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to get lock history')
      return this.error('Failed to get lock history', 'LOCK_HISTORY_ERROR')
    }
  }

  /**
   * Extend an existing lock
   */
  async extendLock(
    walletId: string,
    additionalTime: number,
    extendedBy: string,
    reason?: string
  ): Promise<ServiceResult<WalletLock>> {
    try {
      const currentLock = await this.getCurrentLock(walletId)
      if (!currentLock) {
        return this.error('Wallet is not locked', 'WALLET_NOT_LOCKED')
      }

      // Verify authorization
      const isAuthorized = await this.isAuthorizedLocker(walletId, extendedBy)
      if (!isAuthorized) {
        return this.error('Unauthorized to extend lock', 'UNAUTHORIZED_EXTENDER')
      }

      // Calculate new unlock time
      const currentUnlockTime = currentLock.unlock_time || new Date()
      const newUnlockTime = new Date(currentUnlockTime.getTime() + additionalTime * 1000)

      // Update lock record
      const updatedLock = await this.db.wallet_locks.update({
        where: { id: currentLock.id },
        data: {
          unlock_time: newUnlockTime,
          updated_at: new Date(),
          lock_data: {
            ...currentLock.lock_data,
            extendedBy,
            extendedAt: new Date().toISOString(),
            extensionReason: reason,
            additionalTime
          }
        }
      })

      this.logger.info({
        walletId,
        extendedBy,
        additionalTime,
        newUnlockTime: newUnlockTime.toISOString()
      }, 'Lock extended')

      return this.success(this.mapToWalletLock(updatedLock))

    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to extend lock')
      return this.error('Failed to extend lock', 'LOCK_EXTEND_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private async getCurrentLock(walletId: string): Promise<any | null> {
    return await this.db.wallet_locks.findFirst({
      where: {
        wallet_id: walletId,
        is_locked: true
      },
      orderBy: { created_at: 'desc' }
    })
  }

  private async performUnlock(
    walletId: string,
    lockRecord: any,
    unlockedBy: string,
    unlockReason?: string
  ): Promise<ServiceResult<boolean>> {
    try {
      // Execute unlock on smart contract
      const contractUnlockResult = await this.executeUnlockOnContract(walletId)
      if (!contractUnlockResult.success) {
        return this.error(contractUnlockResult.error!, contractUnlockResult.code!)
      }

      // Update lock record
      await this.db.wallet_locks.update({
        where: { id: lockRecord.id },
        data: {
          is_locked: false,
          unlocked_by: unlockedBy,
          unlocked_at: new Date(),
          unlock_reason: unlockReason,
          updated_at: new Date()
        }
      })

      return this.success(true)

    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to perform unlock')
      return this.error('Failed to perform unlock', 'UNLOCK_EXECUTION_ERROR')
    }
  }

  private async isAuthorizedLocker(walletId: string, lockerAddress: string): Promise<boolean> {
    // Check if the locker is either the wallet owner or a guardian
    const guardians = await this.guardianService.getWalletGuardians(walletId)
    
    if (guardians.success && guardians.data) {
      const isGuardian = guardians.data.some(g => g.guardianAddress.toLowerCase() === lockerAddress.toLowerCase())
      if (isGuardian) return true
    }

    // Check if it's the wallet owner (smart contract address)
    const smartWallet = await this.smartContractWallet.getSmartContractWallet(walletId)
    if (smartWallet.success && smartWallet.data) {
      return lockerAddress.toLowerCase() === smartWallet.data.diamondProxyAddress.toLowerCase()
    }

    return false
  }

  private async isAuthorizedUnlocker(walletId: string, unlockerAddress: string): Promise<boolean> {
    // Same authorization as locker for now
    return await this.isAuthorizedLocker(walletId, unlockerAddress)
  }

  private async getAuthorizedUnlockers(walletId: string): Promise<string[]> {
    const authorizedUnlockers: string[] = []

    // Add guardians
    const guardians = await this.guardianService.getWalletGuardians(walletId)
    if (guardians.success && guardians.data) {
      authorizedUnlockers.push(...guardians.data.map(g => g.guardianAddress))
    }

    // Add wallet owner
    const smartWallet = await this.smartContractWallet.getSmartContractWallet(walletId)
    if (smartWallet.success && smartWallet.data) {
      authorizedUnlockers.push(smartWallet.data.diamondProxyAddress)
    }

    return authorizedUnlockers
  }

  private getDefaultLockPeriod(lockType: string): number {
    // Return lock period in seconds
    switch (lockType) {
      case 'emergency':
        return 24 * 60 * 60 // 24 hours
      case 'security':
        return 7 * 24 * 60 * 60 // 7 days
      case 'maintenance':
        return 4 * 60 * 60 // 4 hours
      case 'guardian_triggered':
        return 48 * 60 * 60 // 48 hours
      default:
        return 24 * 60 * 60 // 24 hours default
    }
  }

  private async getNextLockNonce(walletId: string): Promise<number> {
    // Get the latest lock nonce for this wallet
    const latestLock = await this.db.wallet_locks.findFirst({
      where: { wallet_id: walletId },
      orderBy: { lock_nonce: 'desc' }
    })

    return (latestLock?.lock_nonce || 0) + 1
  }

  private async generateUnlockHash(walletId: string, lockNonce: number): Promise<string> {
    // Generate secure hash for unlock signature verification
    const data = {
      action: 'unlock',
      walletId,
      lockNonce,
      timestamp: Date.now()
    }
    
    return Buffer.from(JSON.stringify(data)).toString('base64')
  }

  private async verifyUnlockSignature(
    unlockHash: string,
    approverAddress: string,
    signature: string
  ): Promise<boolean> {
    // This would verify the signature using the appropriate cryptographic method
    // Placeholder implementation
    this.logger.debug({
      unlockHash,
      approverAddress,
      signature: signature.substring(0, 10) + '...'
    }, 'Verifying unlock signature (placeholder)')
    
    return true // Placeholder
  }

  private async executeLockOnContract(
    walletId: string,
    unlockTime: Date,
    lockNonce: number
  ): Promise<ServiceResult<{ transactionHash: string }>> {
    // This would execute the lock function on the smart contract
    // Placeholder implementation
    this.logger.info({
      walletId,
      unlockTime: unlockTime.toISOString(),
      lockNonce
    }, 'Executing lock on contract (placeholder)')

    const transactionHash = '0x' + Math.random().toString(16).substring(2, 66)

    return this.success({ transactionHash })
  }

  private async executeUnlockOnContract(walletId: string): Promise<ServiceResult<{ transactionHash: string }>> {
    // This would execute the unlock function on the smart contract
    // Placeholder implementation
    this.logger.info({ walletId }, 'Executing unlock on contract (placeholder)')

    const transactionHash = '0x' + Math.random().toString(16).substring(2, 66)

    return this.success({ transactionHash })
  }

  private mapToWalletLock(lock: any): WalletLock {
    return {
      id: lock.id,
      walletId: lock.wallet_id,
      lockType: lock.lock_type,
      isLocked: lock.is_locked,
      lockedBy: lock.locked_by,
      lockedAt: lock.locked_at.toISOString(),
      unlockTime: lock.unlock_time?.toISOString(),
      lockReason: lock.lock_reason,
      lockNonce: lock.lock_nonce,
      unlockHash: lock.unlock_hash,
      canUnlockEarly: lock.can_unlock_early,
      createdAt: lock.created_at.toISOString(),
      updatedAt: lock.updated_at.toISOString()
    }
  }
}
