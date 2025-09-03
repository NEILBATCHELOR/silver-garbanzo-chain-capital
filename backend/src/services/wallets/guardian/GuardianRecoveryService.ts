import { BaseService } from '../../BaseService'
import { ServiceResult, PaginatedResponse } from '../../../types/index'

export interface Guardian {
  id: string
  walletId: string
  guardianAddress: string
  guardianName?: string
  status: 'pending_add' | 'active' | 'pending_remove'
  requestedAt: string
  confirmedAt?: string
  securityPeriodEnds?: string
}

export interface GuardianRecoveryProposal {
  id: string
  walletId: string
  proposerAddress: string
  newOwnerAddress: string
  newOwnerPublicKey: string
  requiredApprovals: number
  currentApprovals: number
  status: 'pending' | 'approved' | 'executed' | 'cancelled' | 'expired'
  expiresAt: string
  createdAt: string
}

export interface GuardianApproval {
  id: string
  proposalId: string
  guardianAddress: string
  signature: string
  approvedAt: string
}

export interface SecurityConfig {
  additionSecurityPeriod: number    // Hours
  removalSecurityPeriod: number     // Hours
  securityWindow: number            // Hours
  recoveryPeriod: number            // Hours
  majorityThreshold: number         // Percentage (e.g., 51 for 51%)
}

/**
 * GuardianRecoveryService - Social Recovery System
 * 
 * Implements time-delayed guardian recovery system based on Barz architecture.
 * Provides social recovery without seed phrases through trusted guardians.
 * 
 * Note: This service uses guardian_operations table for recovery proposals 
 * until recovery_proposals table is added to the schema.
 */
export class GuardianRecoveryService extends BaseService {
  
  private readonly DEFAULT_SECURITY_CONFIG: SecurityConfig = {
    additionSecurityPeriod: 48,      // 48 hours
    removalSecurityPeriod: 24,       // 24 hours  
    securityWindow: 168,             // 7 days
    recoveryPeriod: 72,              // 72 hours
    majorityThreshold: 51            // 51%
  }

  constructor() {
    super('GuardianRecovery')
  }

  /**
   * Add a guardian to a wallet
   */
  async addGuardian(
    walletId: string,
    guardianAddress: string,
    guardianName?: string
  ): Promise<ServiceResult<Guardian>> {
    try {
      // Validate guardian address
      const validation = await this.validateGuardianAddress(walletId, guardianAddress)
      if (!validation.success) {
        return this.error(validation.error!, validation.code!)
      }

      // Check if guardian already exists or is pending
      const existingGuardian = await this.db.wallet_guardians.findFirst({
        where: {
          wallet_id: walletId,
          guardian_address: guardianAddress,
          status: { in: ['active', 'pending_add'] }
        }
      })

      if (existingGuardian) {
        return this.error('Guardian already exists or is pending', 'GUARDIAN_ALREADY_EXISTS')
      }

      // Get security configuration
      const securityConfig = await this.getSecurityConfig(walletId)
      const securityPeriodEnds = new Date(
        Date.now() + securityConfig.additionSecurityPeriod * 60 * 60 * 1000
      )

      // Create guardian request - using existing schema columns only
      const guardian = await this.db.wallet_guardians.create({
        data: {
          wallet_id: walletId,
          guardian_address: guardianAddress,
          guardian_name: guardianName || null,
          status: 'pending_add',
          security_period_ends: securityPeriodEnds
        }
      })

      this.logInfo('Guardian addition requested', {
        walletId,
        guardianAddress,
        securityPeriodEnds
      })

      return this.success(this.mapToGuardian(guardian))

    } catch (error) {
      this.logError('Failed to add guardian', { error, walletId, guardianAddress })
      return this.error('Failed to add guardian', 'GUARDIAN_ADD_ERROR')
    }
  }

  /**
   * Confirm guardian addition after security period
   */
  async confirmGuardianAddition(
    walletId: string,
    guardianAddress: string
  ): Promise<ServiceResult<Guardian>> {
    try {
      const guardian = await this.db.wallet_guardians.findFirst({
        where: {
          wallet_id: walletId,
          guardian_address: guardianAddress,
          status: 'pending_add'
        }
      })

      if (!guardian) {
        return this.error('Pending guardian addition not found', 'NO_PENDING_ADDITION', 404)
      }

      // Check if security period has passed
      if (guardian.security_period_ends && new Date() < guardian.security_period_ends) {
        return this.error('Security period has not ended', 'SECURITY_PERIOD_ACTIVE')
      }

      // Check if within security window
      const securityConfig = await this.getSecurityConfig(walletId)
      const windowEnd = new Date(
        guardian.security_period_ends!.getTime() + 
        securityConfig.securityWindow * 60 * 60 * 1000
      )

      if (new Date() > windowEnd) {
        return this.error('Security window has expired', 'SECURITY_WINDOW_EXPIRED')
      }

      // Confirm guardian
      const confirmedGuardian = await this.db.wallet_guardians.update({
        where: { id: guardian.id },
        data: {
          status: 'active',
          confirmed_at: new Date(),
          security_period_ends: null
        }
      })

      this.logInfo('Guardian addition confirmed', { walletId, guardianAddress })

      return this.success(this.mapToGuardian(confirmedGuardian))

    } catch (error) {
      this.logError('Failed to confirm guardian addition', { error, walletId, guardianAddress })
      return this.error('Failed to confirm guardian addition', 'GUARDIAN_CONFIRM_ERROR')
    }
  }

  /**
   * Request removal of a guardian
   */
  async removeGuardian(
    walletId: string,
    guardianAddress: string
  ): Promise<ServiceResult<Guardian>> {
    try {
      const guardian = await this.db.wallet_guardians.findFirst({
        where: {
          wallet_id: walletId,
          guardian_address: guardianAddress,
          status: 'active'
        }
      })

      if (!guardian) {
        return this.error('Guardian not found', 'GUARDIAN_NOT_FOUND', 404)
      }

      // Get security configuration
      const securityConfig = await this.getSecurityConfig(walletId)
      const securityPeriodEnds = new Date(
        Date.now() + securityConfig.removalSecurityPeriod * 60 * 60 * 1000
      )

      // Update guardian status
      const updatedGuardian = await this.db.wallet_guardians.update({
        where: { id: guardian.id },
        data: {
          status: 'pending_remove',
          security_period_ends: securityPeriodEnds
        }
      })

      this.logInfo('Guardian removal requested', {
        walletId,
        guardianAddress,
        securityPeriodEnds
      })

      return this.success(this.mapToGuardian(updatedGuardian))

    } catch (error) {
      this.logError('Failed to remove guardian', { error, walletId, guardianAddress })
      return this.error('Failed to remove guardian', 'GUARDIAN_REMOVE_ERROR')
    }
  }

  /**
   * Confirm guardian removal after security period
   */
  async confirmGuardianRemoval(
    walletId: string,
    guardianAddress: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const guardian = await this.db.wallet_guardians.findFirst({
        where: {
          wallet_id: walletId,  
          guardian_address: guardianAddress,
          status: 'pending_remove'
        }
      })

      if (!guardian) {
        return this.error('Pending guardian removal not found', 'NO_PENDING_REMOVAL', 404)
      }

      // Check security period and window (same logic as addition)
      if (guardian.security_period_ends && new Date() < guardian.security_period_ends) {
        return this.error('Security period has not ended', 'SECURITY_PERIOD_ACTIVE')
      }

      const securityConfig = await this.getSecurityConfig(walletId)
      const windowEnd = new Date(
        guardian.security_period_ends!.getTime() + 
        securityConfig.securityWindow * 60 * 60 * 1000
      )

      if (new Date() > windowEnd) {
        return this.error('Security window has expired', 'SECURITY_WINDOW_EXPIRED')
      }

      // Remove guardian
      await this.db.wallet_guardians.delete({
        where: { id: guardian.id }
      })

      this.logInfo('Guardian removal confirmed', { walletId, guardianAddress })

      return this.success(true)

    } catch (error) {
      this.logError('Failed to confirm guardian removal', { error, walletId, guardianAddress })
      return this.error('Failed to confirm guardian removal', 'GUARDIAN_REMOVAL_CONFIRM_ERROR')
    }
  }

  /**
   * Initiate wallet recovery proposal - using guardian_operations table temporarily
   */
  async initiateRecovery(
    walletId: string,
    proposerAddress: string,
    newOwnerAddress: string,
    newOwnerPublicKey: string
  ): Promise<ServiceResult<{ operationId: string; status: string }>> {
    try {
      // Verify proposer is an active guardian
      const guardian = await this.db.wallet_guardians.findFirst({
        where: {
          wallet_id: walletId,
          guardian_address: proposerAddress,
          status: 'active'
        }
      })

      if (!guardian) {
        return this.error('Proposer is not an active guardian', 'NOT_GUARDIAN')
      }

      // Calculate required approvals (majority of guardians)
      const guardianCount = await this.db.wallet_guardians.count({
        where: {
          wallet_id: walletId,
          status: 'active'
        }
      })

      if (guardianCount === 0) {
        return this.error('No active guardians found', 'NO_GUARDIANS')
      }

      const securityConfig = await this.getSecurityConfig(walletId)
      const requiredApprovals = Math.ceil(guardianCount * securityConfig.majorityThreshold / 100)

      // Create recovery proposal using guardian_operations table
      const operationId = `recovery_${walletId}_${Date.now()}`
      const expiresAt = new Date(
        Date.now() + securityConfig.recoveryPeriod * 60 * 60 * 1000
      )

      const recoveryOperation = await this.db.guardian_operations.create({
        data: {
          operation_id: operationId,
          operation_type: 'wallet_recovery',
          operation_status: 'pending',
          guardian_wallet_id: walletId,
          operation_result: {
            proposer_address: proposerAddress,
            new_owner_address: newOwnerAddress,
            new_owner_public_key: newOwnerPublicKey,
            required_approvals: requiredApprovals,
            current_approvals: 1, // Proposer automatically approves
            expires_at: expiresAt.toISOString(),
            approvals: [
              {
                guardian_address: proposerAddress,
                signature: 'auto-approved',
                approved_at: new Date().toISOString()
              }
            ]
          }
        }
      })

      this.logInfo('Recovery proposal initiated', {
        walletId,
        operationId,
        proposerAddress,
        requiredApprovals
      })

      return this.success({
        operationId: recoveryOperation.operation_id!,
        status: 'pending'
      })

    } catch (error) {
      this.logError('Failed to initiate recovery', { error, walletId, proposerAddress })
      return this.error('Failed to initiate recovery', 'RECOVERY_INITIATE_ERROR')
    }
  }

  /**
   * Approve recovery proposal - using guardian_operations table
   */
  async approveRecovery(
    operationId: string,
    guardianAddress: string,
    signature: string
  ): Promise<ServiceResult<{ approved: boolean; currentApprovals: number; requiredApprovals: number }>> {
    try {
      // Get recovery operation
      const operation = await this.db.guardian_operations.findFirst({
        where: {
          operation_id: operationId,
          operation_type: 'wallet_recovery'
        }
      })

      if (!operation) {
        return this.error('Recovery operation not found', 'OPERATION_NOT_FOUND', 404)
      }

      if (operation.operation_status !== 'pending') {
        return this.error('Operation is not pending', 'OPERATION_NOT_PENDING')
      }

      const operationResult = operation.operation_result as any
      const expiresAt = new Date(operationResult.expires_at)
      
      if (new Date() > expiresAt) {
        return this.error('Recovery operation has expired', 'OPERATION_EXPIRED')
      }

      // Verify guardian is active
      const guardian = await this.db.wallet_guardians.findFirst({
        where: {
          wallet_id: operation.guardian_wallet_id!,
          guardian_address: guardianAddress,
          status: 'active'
        }
      })

      if (!guardian) {
        return this.error('Guardian is not active for this wallet', 'NOT_ACTIVE_GUARDIAN')
      }

      // Check if guardian already approved
      const existingApprovals = operationResult.approvals || []
      const alreadyApproved = existingApprovals.some((approval: any) => 
        approval.guardian_address === guardianAddress
      )

      if (alreadyApproved) {
        return this.error('Guardian has already approved', 'ALREADY_APPROVED')
      }

      // Add approval
      const newApproval = {
        guardian_address: guardianAddress,
        signature,
        approved_at: new Date().toISOString()
      }

      const updatedApprovals = [...existingApprovals, newApproval]
      const currentApprovals = updatedApprovals.length
      const approved = currentApprovals >= operationResult.required_approvals

      // Update operation
      await this.db.guardian_operations.update({
        where: { id: operation.id },
        data: {
          operation_status: approved ? 'approved' : 'pending',
          operation_result: {
            ...operationResult,
            current_approvals: currentApprovals,
            approvals: updatedApprovals
          }
        }
      })

      this.logInfo('Recovery proposal approval added', {
        operationId,
        guardianAddress,
        approved,
        currentApprovals,
        requiredApprovals: operationResult.required_approvals
      })

      return this.success({
        approved,
        currentApprovals,
        requiredApprovals: operationResult.required_approvals
      })

    } catch (error) {
      this.logError('Failed to approve recovery', { error, operationId, guardianAddress })
      return this.error('Failed to approve recovery', 'RECOVERY_APPROVE_ERROR')
    }
  }

  /**
   * Execute approved recovery proposal
   */
  async executeRecovery(operationId: string): Promise<ServiceResult<{ transactionHash: string }>> {
    try {
      const operation = await this.db.guardian_operations.findFirst({
        where: {
          operation_id: operationId,
          operation_type: 'wallet_recovery'
        }
      })

      if (!operation) {
        return this.error('Recovery operation not found', 'OPERATION_NOT_FOUND', 404)
      }

      if (operation.operation_status !== 'approved') {
        return this.error('Operation is not approved', 'OPERATION_NOT_APPROVED')
      }

      const operationResult = operation.operation_result as any
      const expiresAt = new Date(operationResult.expires_at)

      if (new Date() > expiresAt) {
        return this.error('Operation has expired', 'OPERATION_EXPIRED')
      }

      // Execute recovery on smart contract
      const executionResult = await this.executeRecoveryOnChain(
        operation.guardian_wallet_id!,
        operationResult.new_owner_address,
        operationResult.new_owner_public_key
      )

      if (!executionResult.success) {
        return this.error('Failed to execute recovery on chain', 'RECOVERY_EXECUTION_FAILED')
      }

      // Update operation status
      await this.db.guardian_operations.update({
        where: { id: operation.id },
        data: { 
          operation_status: 'completed',
          completed_at: new Date(),
          operation_result: {
            ...operationResult,
            transaction_hash: executionResult.data!.transactionHash,
            executed_at: new Date().toISOString()
          }
        }
      })

      this.logInfo('Recovery operation executed', {
        operationId,
        walletId: operation.guardian_wallet_id,
        transactionHash: executionResult.data!.transactionHash
      })

      return this.success({
        transactionHash: executionResult.data!.transactionHash
      })

    } catch (error) {
      this.logError('Failed to execute recovery', { error, operationId })
      return this.error('Failed to execute recovery', 'RECOVERY_EXECUTE_ERROR')
    }
  }

  /**
   * Get active guardians for a wallet
   */
  async getWalletGuardians(walletId: string): Promise<ServiceResult<Guardian[]>> {
    try {
      const guardians = await this.db.wallet_guardians.findMany({
        where: {
          wallet_id: walletId,
          status: 'active'
        },
        orderBy: { confirmed_at: 'asc' }
      })

      return this.success(guardians.map(g => this.mapToGuardian(g)))

    } catch (error) {
      this.logError('Failed to get wallet guardians', { error, walletId })
      return this.error('Failed to get wallet guardians', 'GUARDIAN_LIST_ERROR')
    }
  }

  /**
   * Get recovery operations for a wallet
   */
  async getRecoveryOperations(
    walletId: string,
    status?: string
  ): Promise<ServiceResult<any[]>> {
    try {
      const where: any = { 
        guardian_wallet_id: walletId,
        operation_type: 'wallet_recovery'
      }
      if (status) {
        where.operation_status = status
      }

      const operations = await this.db.guardian_operations.findMany({
        where,
        orderBy: { created_at: 'desc' }
      })

      return this.success(operations.map((op: any) => ({
        id: op.id,
        operationId: op.operation_id,
        walletId: op.guardian_wallet_id,
        status: op.operation_status,
        result: op.operation_result,
        createdAt: op.created_at,
        completedAt: op.completed_at
      })))

    } catch (error) {
      this.logError('Failed to get recovery operations', { error, walletId })
      return this.error('Failed to get recovery operations', 'OPERATION_LIST_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private async validateGuardianAddress(
    walletId: string,
    guardianAddress: string
  ): Promise<ServiceResult<boolean>> {
    // Validate address format
    if (!guardianAddress || !/^0x[a-fA-F0-9]{40}$/.test(guardianAddress)) {
      return this.error('Invalid guardian address format', 'INVALID_ADDRESS_FORMAT')
    }

    // Check if address is the wallet owner
    const wallet = await this.db.wallets.findUnique({
      where: { id: walletId }
    })

    if (!wallet) {
      return this.error('Wallet not found', 'WALLET_NOT_FOUND', 404)
    }

    // Prevent self-guardianship (simplified check) - handle null wallet_address
    if (wallet.wallet_address && guardianAddress.toLowerCase() === wallet.wallet_address.toLowerCase()) {
      return this.error('Owner cannot be guardian', 'OWNER_CANNOT_BE_GUARDIAN')
    }

    return this.success(true)
  }

  private async getSecurityConfig(walletId: string): Promise<SecurityConfig> {
    // In production, this would be configurable per wallet or organization
    // For now, return default configuration
    return this.DEFAULT_SECURITY_CONFIG
  }

  private async executeRecoveryOnChain(
    walletId: string,
    newOwnerAddress: string,
    newOwnerPublicKey: string
  ): Promise<ServiceResult<{ transactionHash: string }>> {
    // This would execute the recovery transaction on the smart contract
    // Placeholder implementation
    this.logInfo('Executing recovery on chain (placeholder)', {
      walletId,
      newOwnerAddress
    })

    return this.success({
      transactionHash: '0x' + Math.random().toString(16).substring(2, 66)
    })
  }

  private mapToGuardian(guardian: any): Guardian {
    return {
      id: guardian.id,
      walletId: guardian.wallet_id,
      guardianAddress: guardian.guardian_address,
      guardianName: guardian.guardian_name || undefined,
      status: guardian.status,
      requestedAt: guardian.requested_at?.toISOString() || guardian.created_at?.toISOString() || '',
      confirmedAt: guardian.confirmed_at?.toISOString(),
      securityPeriodEnds: guardian.security_period_ends?.toISOString()
    }
  }
}
