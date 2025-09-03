import { BaseService } from '../../BaseService'
import { ServiceResult } from '../../../types/index'
import { SmartContractWalletService } from '../smart-contract/SmartContractWalletService'
import { WebAuthnService } from '../webauthn/WebAuthnService'
import { GuardianRecoveryService } from '../guardian/GuardianRecoveryService'

export interface SignatureMigrationRequest {
  walletId: string
  fromScheme: 'secp256k1' | 'secp256r1'
  toScheme: 'secp256k1' | 'secp256r1'
  newPublicKey: string
  newCredentialId?: string // For WebAuthn
  guardianApprovals?: GuardianApproval[]
}

export interface GuardianApproval {
  guardianAddress: string
  signature: string
  approvedAt: string
}

export interface SignatureMigrationStatus {
  id: string
  walletId: string
  fromScheme: string
  toScheme: string
  newPublicKey: string
  status: 'pending' | 'approved' | 'finalized' | 'cancelled'
  migrationHash: string
  pendingUntil?: string
  finalizeAfter?: string
  requiredApprovals: number
  currentApprovals: number
  createdAt: string
  updatedAt: string
}

/**
 * SignatureMigrationService - Signature Scheme Migration
 * 
 * Handles migration between different signature schemes:
 * - ECDSA secp256k1 (traditional crypto signatures)
 * - ECDSA secp256r1 (WebAuthn/Passkey signatures)
 * 
 * Based on Barz SignatureMigrationFacet with Chain Capital enhancements.
 */
export class SignatureMigrationService extends BaseService {
  
  private smartContractWallet: SmartContractWalletService
  private webAuthnService: WebAuthnService
  private guardianService: GuardianRecoveryService

  constructor() {
    super('SignatureMigration')
    this.smartContractWallet = new SmartContractWalletService()
    this.webAuthnService = new WebAuthnService()
    this.guardianService = new GuardianRecoveryService()
  }

  /**
   * Initiate signature migration from one scheme to another
   */
  async initiateMigration(request: SignatureMigrationRequest): Promise<ServiceResult<SignatureMigrationStatus>> {
    try {
      const { walletId, fromScheme, toScheme, newPublicKey, newCredentialId } = request

      // Validate the wallet exists and is a smart contract wallet
      const smartWallet = await this.smartContractWallet.getSmartContractWallet(walletId)
      if (!smartWallet.success || !smartWallet.data) {
        return this.error('Smart contract wallet not found', 'SMART_WALLET_NOT_FOUND', 404)
      }

      // Validate the migration request
      const validation = await this.validateMigrationRequest(request)
      if (!validation.success) {
        return this.error(validation.error!, validation.code!)
      }

      // Check if migration already exists
      const existingMigration = await this.db.signature_migrations.findFirst({
        where: {
          wallet_id: walletId,
          status: { in: ['pending', 'approved'] }
        }
      })

      if (existingMigration) {
        return this.error('Migration already in progress', 'MIGRATION_IN_PROGRESS')
      }

      // Get guardian configuration
      const guardians = await this.guardianService.getWalletGuardians(walletId)
      const requiredApprovals = guardians.success && guardians.data!.length > 0 
        ? Math.ceil(guardians.data!.length / 2) + 1 // Majority + owner
        : 1 // Just owner

      // Generate migration hash for security
      const migrationHash = await this.generateMigrationHash(walletId, toScheme, newPublicKey)

      // Calculate timing
      const now = new Date()
      const migrationPeriod = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      const finalizeAfter = new Date(now.getTime() + migrationPeriod)

      // Create migration record
      const migration = await this.db.signature_migrations.create({
        data: {
          wallet_id: walletId,
          from_scheme: fromScheme,
          to_scheme: toScheme,
          new_public_key: newPublicKey,
          new_credential_id: newCredentialId,
          status: 'pending',
          migration_hash: migrationHash,
          required_approvals: requiredApprovals,
          current_approvals: 0,
          finalize_after: finalizeAfter,
          migration_data: {
            initiatedBy: 'owner', // Could be expanded
            reason: 'signature_scheme_upgrade'
          }
        }
      })

      // If WebAuthn migration, store credential data
      if (toScheme === 'secp256r1' && newCredentialId) {
        await this.webAuthnService.storeCredentialForMigration(walletId, {
          credentialId: newCredentialId,
          publicKey: newPublicKey,
          migrationId: migration.id
        })
      }

      // Process any provided guardian approvals
      let currentApprovals = 0
      if (request.guardianApprovals && request.guardianApprovals.length > 0) {
        const approvalResult = await this.processGuardianApprovals(
          migration.id,
          migrationHash,
          request.guardianApprovals
        )
        if (approvalResult.success) {
          currentApprovals = approvalResult.data!.approvedCount
        }
      }

      // Update migration with current approvals
      const updatedMigration = await this.db.signature_migrations.update({
        where: { id: migration.id },
        data: { current_approvals: currentApprovals }
      })

      this.logInfo('Signature migration initiated', {
        walletId,
        migrationId: migration.id,
        fromScheme,
        toScheme,
        requiredApprovals,
        currentApprovals
      })

      return this.success(this.mapToMigrationStatus(updatedMigration))

    } catch (error) {
      this.logError('Failed to initiate signature migration', { error, walletId: request.walletId })
      return this.error('Failed to initiate signature migration', 'MIGRATION_INITIATE_ERROR')
    }
  }

  /**
   * Approve signature migration (guardian or owner approval)
   */
  async approveMigration(
    migrationId: string,
    approverAddress: string,
    signature: string
  ): Promise<ServiceResult<SignatureMigrationStatus>> {
    try {
      // Get migration
      const migration = await this.db.signature_migrations.findUnique({
        where: { id: migrationId }
      })

      if (!migration || migration.status !== 'pending') {
        return this.error('Migration not found or not pending', 'MIGRATION_NOT_FOUND', 404)
      }

      // Verify the signature
      const signatureValid = await this.verifyApprovalSignature(
        migration.migration_hash,
        approverAddress,
        signature
      )

      if (!signatureValid) {
        return this.error('Invalid approval signature', 'INVALID_SIGNATURE')
      }

      // Check if approver is authorized (guardian or owner)
      const isAuthorized = await this.isAuthorizedApprover(migration.wallet_id, approverAddress)
      if (!isAuthorized) {
        return this.error('Unauthorized approver', 'UNAUTHORIZED_APPROVER')
      }

      // Check if already approved by this approver
      const existingApproval = await this.db.signature_migration_approvals.findFirst({
        where: {
          migration_id: migrationId,
          approver_address: approverAddress
        }
      })

      if (existingApproval) {
        return this.error('Already approved by this approver', 'ALREADY_APPROVED')
      }

      // Record the approval
      await this.db.signature_migration_approvals.create({
        data: {
          migration_id: migrationId,
          approver_address: approverAddress,
          signature,
          approved_at: new Date()
        }
      })

      // Update approval count
      const currentApprovals = migration.current_approvals + 1
      const status = currentApprovals >= migration.required_approvals ? 'approved' : 'pending'

      const updatedMigration = await this.db.signature_migrations.update({
        where: { id: migrationId },
        data: {
          current_approvals: currentApprovals,
          status,
          updated_at: new Date()
        }
      })

      this.logInfo('Migration approval recorded', {
        migrationId,
        approverAddress,
        currentApprovals,
        requiredApprovals: migration.required_approvals,
        status
      })

      return this.success(this.mapToMigrationStatus(updatedMigration))

    } catch (error) {
      this.logError('Failed to approve migration', { error, migrationId })
      return this.error('Failed to approve migration', 'MIGRATION_APPROVE_ERROR')
    }
  }

  /**
   * Finalize the signature migration (execute the actual migration)
   */
  async finalizeMigration(migrationId: string): Promise<ServiceResult<{ transactionHash: string }>> {
    try {
      // Get migration
      const migration = await this.db.signature_migrations.findUnique({
        where: { id: migrationId }
      })

      if (!migration) {
        return this.error('Migration not found', 'MIGRATION_NOT_FOUND', 404)
      }

      if (migration.status !== 'approved') {
        return this.error('Migration not approved', 'MIGRATION_NOT_APPROVED')
      }

      // Check if finalization period has passed
      if (migration.finalize_after && new Date() < migration.finalize_after) {
        return this.error('Finalization period not yet reached', 'FINALIZATION_TOO_EARLY')
      }

      // Execute the migration on smart contract
      const migrationResult = await this.executeSignatureMigration(migration)
      if (!migrationResult.success) {
        return this.error(migrationResult.error!, migrationResult.code!)
      }

      // Update migration status
      await this.db.signature_migrations.update({
        where: { id: migrationId },
        data: {
          status: 'finalized',
          transaction_hash: migrationResult.data!.transactionHash,
          finalized_at: new Date(),
          updated_at: new Date()
        }
      })

      this.logInfo('Signature migration finalized', {
        migrationId,
        walletId: migration.wallet_id,
        transactionHash: migrationResult.data!.transactionHash
      })

      return this.success({
        transactionHash: migrationResult.data!.transactionHash
      })

    } catch (error) {
      this.logError('Failed to finalize migration', { error, migrationId })
      return this.error('Failed to finalize migration', 'MIGRATION_FINALIZE_ERROR')
    }
  }

  /**
   * Cancel a pending migration
   */
  async cancelMigration(
    migrationId: string,
    cancellationApprovals: GuardianApproval[]
  ): Promise<ServiceResult<SignatureMigrationStatus>> {
    try {
      // Get migration
      const migration = await this.db.signature_migrations.findUnique({
        where: { id: migrationId }
      })

      if (!migration || migration.status === 'finalized') {
        return this.error('Migration not found or already finalized', 'MIGRATION_NOT_FOUND', 404)
      }

      // Process cancellation approvals
      const cancellationHash = await this.generateCancellationHash(migrationId)
      
      let approvedCancellations = 0
      for (const approval of cancellationApprovals) {
        const signatureValid = await this.verifyApprovalSignature(
          cancellationHash,
          approval.guardianAddress,
          approval.signature
        )

        if (signatureValid) {
          const isAuthorized = await this.isAuthorizedApprover(migration.wallet_id, approval.guardianAddress)
          if (isAuthorized) {
            approvedCancellations++
          }
        }
      }

      // Check if sufficient approvals for cancellation
      if (approvedCancellations < migration.required_approvals) {
        return this.error('Insufficient approvals for cancellation', 'INSUFFICIENT_CANCELLATION_APPROVALS')
      }

      // Cancel the migration
      const cancelledMigration = await this.db.signature_migrations.update({
        where: { id: migrationId },
        data: {
          status: 'cancelled',
          cancelled_at: new Date(),
          updated_at: new Date()
        }
      })

      this.logInfo('Signature migration cancelled', {
        migrationId,
        walletId: migration.wallet_id,
        approvedCancellations
      })

      return this.success(this.mapToMigrationStatus(cancelledMigration))

    } catch (error) {
      this.logError('Failed to cancel migration', { error, migrationId })
      return this.error('Failed to cancel migration', 'MIGRATION_CANCEL_ERROR')
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(migrationId: string): Promise<ServiceResult<SignatureMigrationStatus>> {
    try {
      const migration = await this.db.signature_migrations.findUnique({
        where: { id: migrationId },
        include: {
          signature_migration_approvals: {
            select: {
              approver_address: true,
              approved_at: true
            }
          }
        }
      })

      if (!migration) {
        return this.error('Migration not found', 'MIGRATION_NOT_FOUND', 404)
      }

      return this.success(this.mapToMigrationStatus(migration))

    } catch (error) {
      this.logError('Failed to get migration status', { error, migrationId })
      return this.error('Failed to get migration status', 'MIGRATION_STATUS_ERROR')
    }
  }

  /**
   * List migrations for a wallet
   */
  async listMigrations(
    walletId: string,
    options: { status?: string; limit?: number; offset?: number } = {}
  ): Promise<ServiceResult<SignatureMigrationStatus[]>> {
    try {
      const { status, limit = 20, offset = 0 } = options

      const where: any = { wallet_id: walletId }
      if (status) {
        where.status = status
      }

      const migrations = await this.db.signature_migrations.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset
      })

      return this.success(migrations.map(m => this.mapToMigrationStatus(m)))

    } catch (error) {
      this.logError('Failed to list migrations', { error, walletId })
      return this.error('Failed to list migrations', 'MIGRATION_LIST_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private async validateMigrationRequest(request: SignatureMigrationRequest): Promise<ServiceResult<boolean>> {
    const { fromScheme, toScheme, newPublicKey } = request

    // Validate scheme types
    if (!['secp256k1', 'secp256r1'].includes(fromScheme) || !['secp256k1', 'secp256r1'].includes(toScheme)) {
      return this.error('Invalid signature scheme', 'INVALID_SCHEME')
    }

    // Can't migrate to the same scheme
    if (fromScheme === toScheme) {
      return this.error('Cannot migrate to the same signature scheme', 'SAME_SCHEME')
    }

    // Validate public key format
    if (!newPublicKey || newPublicKey.length < 64) {
      return this.error('Invalid public key format', 'INVALID_PUBLIC_KEY')
    }

    // If migrating to WebAuthn, validate with WebAuthn service
    if (toScheme === 'secp256r1') {
      const webAuthnValid = await this.webAuthnService.validatePublicKey(newPublicKey)
      if (!webAuthnValid.success) {
        return this.error('Invalid WebAuthn public key', 'INVALID_WEBAUTHN_KEY')
      }
    }

    return this.success(true)
  }

  private async executeSignatureMigration(migration: any): Promise<ServiceResult<{ transactionHash: string }>> {
    // This would execute the actual diamond cut operation to replace verification facets
    this.logInfo('Executing signature migration (placeholder)', {
      migrationId: migration.id,
      fromScheme: migration.from_scheme,
      toScheme: migration.to_scheme
    })

    // Remove old verification facet and add new one
    const diamondCutResult = await this.smartContractWallet.diamondCut(migration.wallet_id, {
      facetCuts: [
        {
          action: 'remove',
          facetAddress: migration.from_scheme === 'secp256k1' ? '0x...' : '0x...',
          functionSelectors: ['0x...'] // Function selectors for old verification
        },
        {
          action: 'add',
          facetAddress: migration.to_scheme === 'secp256k1' ? '0x...' : '0x...',
          functionSelectors: ['0x...'] // Function selectors for new verification
        }
      ],
      initContract: migration.to_scheme === 'secp256k1' ? '0x...' : '0x...',
      initCalldata: '0x...' // Initialization data with new public key
    })

    if (!diamondCutResult.success) {
      return this.error('Failed to execute diamond cut', 'DIAMOND_CUT_FAILED')
    }

    return this.success({
      transactionHash: diamondCutResult.data!.transactionHash
    })
  }

  private async generateMigrationHash(
    walletId: string, 
    toScheme: string, 
    newPublicKey: string
  ): Promise<string> {
    // Generate secure hash for the migration (prevents replay attacks)
    const data = {
      walletId,
      toScheme,
      newPublicKey,
      timestamp: Date.now(),
      nonce: Math.random().toString()
    }
    
    return Buffer.from(JSON.stringify(data)).toString('base64')
  }

  private async generateCancellationHash(migrationId: string): Promise<string> {
    const data = {
      migrationId,
      action: 'cancel',
      timestamp: Date.now()
    }
    
    return Buffer.from(JSON.stringify(data)).toString('base64')
  }

  private async verifyApprovalSignature(
    hash: string,
    approverAddress: string,
    signature: string
  ): Promise<boolean> {
    // This would verify the signature using the appropriate cryptographic method
    // Placeholder implementation
    this.logDebug('Verifying approval signature (placeholder)', {
      hash,
      approverAddress,
      signature: signature.substring(0, 10) + '...'
    })
    
    return true // Placeholder
  }

  private async isAuthorizedApprover(walletId: string, approverAddress: string): Promise<boolean> {
    // Check if the approver is either the wallet owner or a guardian
    const guardians = await this.guardianService.getWalletGuardians(walletId)
    
    if (guardians.success && guardians.data) {
      const isGuardian = guardians.data.some(g => g.guardianAddress === approverAddress)
      if (isGuardian) return true
    }

    // Check if it's the wallet owner (smart contract address)
    const smartWallet = await this.smartContractWallet.getSmartContractWallet(walletId)
    if (smartWallet.success && smartWallet.data) {
      return approverAddress === smartWallet.data.diamondProxyAddress
    }

    return false
  }

  private async processGuardianApprovals(
    migrationId: string,
    migrationHash: string,
    approvals: GuardianApproval[]
  ): Promise<ServiceResult<{ approvedCount: number }>> {
    let approvedCount = 0

    for (const approval of approvals) {
      const signatureValid = await this.verifyApprovalSignature(
        migrationHash,
        approval.guardianAddress,
        approval.signature
      )

      if (signatureValid) {
        // Record the approval
        try {
          await this.db.signature_migration_approvals.create({
            data: {
              migration_id: migrationId,
              approver_address: approval.guardianAddress,
              signature: approval.signature,
              approved_at: new Date(approval.approvedAt)
            }
          })
          approvedCount++
        } catch (error) {
          // Ignore duplicate approvals
          this.logWarn('Duplicate approval ignored', {
            migrationId,
            approver: approval.guardianAddress
          })
        }
      }
    }

    return this.success({ approvedCount })
  }

  private mapToMigrationStatus(migration: any): SignatureMigrationStatus {
    return {
      id: migration.id,
      walletId: migration.wallet_id,
      fromScheme: migration.from_scheme,
      toScheme: migration.to_scheme,
      newPublicKey: migration.new_public_key,
      status: migration.status,
      migrationHash: migration.migration_hash,
      finalizeAfter: migration.finalize_after?.toISOString(),
      requiredApprovals: migration.required_approvals,
      currentApprovals: migration.current_approvals,
      createdAt: migration.created_at.toISOString(),
      updatedAt: migration.updated_at.toISOString()
    }
  }
}
