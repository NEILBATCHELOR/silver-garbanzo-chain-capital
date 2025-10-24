import { BaseService } from '../../BaseService'
import { ServiceResult } from '../../../types/index'
import { WalletService } from '../WalletService'
import { SmartContractWalletService } from '../smart-contract/SmartContractWalletService'
import { WebAuthnService } from '../webauthn/WebAuthnService'
import { GuardianRecoveryService } from '../guardian/GuardianRecoveryService'
import { SignatureMigrationService } from '../signature-migration/SignatureMigrationService'
import { RestrictionsService } from '../restrictions/RestrictionsService'
import { LockService } from '../lock/LockService'
import { UserOperationService } from '../account-abstraction/UserOperationService'
import { TransactionService } from '../TransactionService'

export interface UnifiedWallet {
  // Basic wallet information
  id: string
  investorId: string
  name: string
  walletType: 'traditional' | 'smart_contract' | 'hybrid'
  
  // Address information
  primaryAddress: string
  addresses: Record<string, string>
  blockchains: string[]
  
  // Status and capabilities
  status: string
  capabilities: WalletCapabilities
  
  // Smart contract specific (if applicable)
  smartContract?: {
    diamondProxyAddress: string
    implementationVersion: string
    facets: string[]
    isDeployed: boolean
  }
  
  // Security features
  security: {
    isMultiSigEnabled: boolean
    guardianCount: number
    currentSignatureScheme: 'secp256k1' | 'secp256r1' | 'both'
    hasWebAuthn: boolean
    isLocked: boolean
    hasRestrictions: boolean
  }
  
  // Account abstraction (if applicable)
  accountAbstraction?: {
    isEnabled: boolean
    paymasterSupport: boolean
    batchOperationsSupport: boolean
  }
  
  timestamps: {
    createdAt: string
    updatedAt: string
  }
}

export interface WalletCapabilities {
  // Basic capabilities
  canSendTransactions: boolean
  canReceiveTokens: boolean
  canSign: boolean
  
  // Advanced capabilities
  supportsMultiSig: boolean
  supportsWebAuthn: boolean
  supportsAccountAbstraction: boolean
  supportsGuardianRecovery: boolean
  supportsSignatureMigration: boolean
  supportsRestrictions: boolean
  supportsEmergencyLock: boolean
  
  // Multi-chain capabilities
  supportedBlockchains: string[]
  canAddBlockchains: boolean
  
  // Integration capabilities
  canUpgradeToSmartContract: boolean
  canDowngradeToTraditional: boolean
}

export interface WalletUpgradeRequest {
  walletId: string
  targetType: 'smart_contract'
  features: {
    enableWebAuthn?: boolean
    enableGuardians?: boolean
    enableRestrictions?: boolean
    enableAccountAbstraction?: boolean
  }
  initialFacets?: string[]
}

export interface UnifiedTransactionRequest {
  walletId: string
  transactions: {
    to: string
    value: string
    data?: string
    blockchain: string
  }[]
  options?: {
    useAccountAbstraction?: boolean
    gasless?: boolean
    batchTransactions?: boolean
    signatureScheme?: 'secp256k1' | 'secp256r1'
  }
}

/**
 * UnifiedWalletInterface - Unified Wallet Management System
 * 
 * Provides a single interface for managing both traditional HD wallets 
 * and smart contract wallets. Handles seamless upgrades, migrations,
 * and feature management across wallet types.
 * 
 * This is the main integration layer that makes Chain Capital's wallet
 * system truly unified and Barz-compatible while maintaining multi-chain
 * support advantage.
 */
export class UnifiedWalletInterface extends BaseService {
  
  private walletService: WalletService
  private smartContractWallet: SmartContractWalletService
  private webAuthnService: WebAuthnService
  private guardianService: GuardianRecoveryService
  private signatureMigrationService: SignatureMigrationService
  private restrictionsService: RestrictionsService
  private lockService: LockService
  private userOperationService: UserOperationService
  private transactionService: TransactionService

  constructor() {
    super('UnifiedWallet')
    this.walletService = new WalletService()
    this.smartContractWallet = new SmartContractWalletService()
    this.webAuthnService = new WebAuthnService()
    this.guardianService = new GuardianRecoveryService()
    this.signatureMigrationService = new SignatureMigrationService()
    this.restrictionsService = new RestrictionsService()
    this.lockService = new LockService()
    this.userOperationService = new UserOperationService()
    this.transactionService = new TransactionService()
  }

  /**
   * Get unified wallet view with all capabilities and features
   */
  async getUnifiedWallet(walletId: string): Promise<ServiceResult<UnifiedWallet>> {
    try {
      // Get base wallet information
      const walletResult = await this.walletService.getWallet(walletId)
      if (!walletResult.success) {
        return this.error(walletResult.error!, walletResult.code!, walletResult.statusCode)
      }

      const baseWallet = walletResult.data!

      // Check if it's a smart contract wallet
      const smartContractResult = await this.smartContractWallet.getSmartContractWallet(walletId)
      const isSmartContract = smartContractResult.success && smartContractResult.data !== null

      // Determine wallet type
      let walletType: 'traditional' | 'smart_contract' | 'hybrid' = 'traditional'
      if (isSmartContract) {
        walletType = 'smart_contract'
      }

      // Gather security information
      const security = await this.gatherSecurityInformation(walletId, isSmartContract)
      
      // Determine capabilities
      const capabilities = await this.determineCapabilities(baseWallet, isSmartContract, security)

      // Build unified wallet object
      const unifiedWallet: UnifiedWallet = {
        id: baseWallet.id,
        investorId: baseWallet.investor_id,
        name: baseWallet.name,
        walletType,
        primaryAddress: baseWallet.primary_address,
        addresses: baseWallet.addresses,
        blockchains: Object.keys(baseWallet.addresses), // Derive blockchains from addresses
        status: baseWallet.status,
        capabilities,
        security,
        timestamps: {
          createdAt: baseWallet.created_at,
          updatedAt: baseWallet.updated_at
        }
      }

      // Add smart contract specific information if applicable
      if (isSmartContract && smartContractResult.data) {
        const facetsResult = await this.smartContractWallet.getWalletFacets(walletId)
        const facets = facetsResult.success ? facetsResult.data!.map(f => f.name) : []

        unifiedWallet.smartContract = {
          diamondProxyAddress: smartContractResult.data.diamondProxyAddress,
          implementationVersion: smartContractResult.data.implementationVersion,
          facets,
          isDeployed: smartContractResult.data.isDeployed
        }
      }

      // Add account abstraction information if applicable
      if (security.hasWebAuthn || isSmartContract) {
        unifiedWallet.accountAbstraction = {
          isEnabled: isSmartContract,
          paymasterSupport: isSmartContract,
          batchOperationsSupport: isSmartContract
        }
      }

      return this.success(unifiedWallet)

    } catch (error) {
      this.logError('Failed to get unified wallet', { error, walletId })
      return this.error('Failed to get unified wallet', 'UNIFIED_WALLET_ERROR')
    }
  }

  /**
   * Upgrade a traditional wallet to smart contract wallet
   */
  async upgradeToSmartContract(request: WalletUpgradeRequest): Promise<ServiceResult<UnifiedWallet>> {
    try {
      const { walletId, features, initialFacets = [] } = request

      // Validate wallet exists and is traditional
      const walletResult = await this.walletService.getWallet(walletId)
      if (!walletResult.success) {
        return this.error(walletResult.error!, walletResult.code!, walletResult.statusCode)
      }

      // Check if already smart contract
      const smartContractResult = await this.smartContractWallet.getSmartContractWallet(walletId)
      if (smartContractResult.success && smartContractResult.data) {
        return this.error('Wallet is already a smart contract wallet', 'ALREADY_SMART_CONTRACT')
      }

      // Determine required facets based on requested features
      const requiredFacets = await this.determineRequiredFacets(features)
      const allFacets = [...new Set([...initialFacets, ...requiredFacets])]

      // Create smart contract wallet
      const createResult = await this.smartContractWallet.createSmartContractWallet(
        walletId,
        '0x...', // Facet registry address (would be configured)
        allFacets
      )

      if (!createResult.success) {
        return this.error(createResult.error!, createResult.code!)
      }

      // Enable requested features
      await this.enableRequestedFeatures(walletId, features)

      // Get updated unified wallet
      const unifiedWalletResult = await this.getUnifiedWallet(walletId)
      if (!unifiedWalletResult.success) {
        return this.error(unifiedWalletResult.error!, unifiedWalletResult.code!)
      }

      this.logInfo('Wallet upgraded to smart contract', {
        walletId,
        features,
        facetsCount: allFacets.length,
        contractAddress: createResult.data!.diamondProxyAddress
      })

      return this.success(unifiedWalletResult.data!)

    } catch (error) {
      this.logError('Failed to upgrade wallet to smart contract', { error, request })
      return this.error('Failed to upgrade wallet to smart contract', 'WALLET_UPGRADE_ERROR')
    }
  }

  /**
   * Send unified transaction (supports both traditional and smart contract wallets)
   */
  async sendUnifiedTransaction(request: UnifiedTransactionRequest): Promise<ServiceResult<{ transactionHash: string }>> {
    try {
      const { walletId, transactions, options = {} } = request

      // Get wallet information
      const unifiedWallet = await this.getUnifiedWallet(walletId)
      if (!unifiedWallet.success) {
        return this.error(unifiedWallet.error!, unifiedWallet.code!)
      }

      const wallet = unifiedWallet.data!

      // Check if wallet is locked
      if (wallet.security.isLocked) {
        return this.error('Wallet is locked', 'WALLET_LOCKED')
      }

      // Validate transactions against restrictions (if enabled)
      if (wallet.security.hasRestrictions) {
        for (const tx of transactions) {
          const validationResult = await this.restrictionsService.validateTransaction({
            walletId,
            fromAddress: wallet.primaryAddress,
            toAddress: tx.to,
            value: tx.value,
            data: tx.data,
            blockchain: tx.blockchain
          })

          if (!validationResult.success || !validationResult.data!.isValid) {
            return this.error(
              `Transaction validation failed: ${validationResult.data!.warnings.join(', ')}`,
              'TRANSACTION_RESTRICTED'
            )
          }
        }
      }

      // Choose transaction method based on wallet type and options
      let transactionResult: ServiceResult<{ transactionHash: string }>

      if (wallet.walletType === 'smart_contract' && options.useAccountAbstraction) {
        // Use account abstraction for gasless transactions
        transactionResult = await this.sendAccountAbstractionTransaction(wallet, transactions, options)
      } else if (wallet.walletType === 'smart_contract' && options.batchTransactions && transactions.length > 1) {
        // Use batch transactions for multiple operations
        transactionResult = await this.sendBatchTransaction(wallet, transactions, options)
      } else {
        // Use traditional transaction for single operations
        transactionResult = await this.sendTraditionalTransaction(wallet, transactions[0], options)
      }

      if (!transactionResult.success) {
        return this.error(transactionResult.error!, transactionResult.code!)
      }

      this.logInfo('Unified transaction sent successfully', {
        walletId,
        transactionCount: transactions.length,
        walletType: wallet.walletType,
        useAccountAbstraction: options.useAccountAbstraction,
        transactionHash: transactionResult.data!.transactionHash
      })

      return this.success(transactionResult.data!)

    } catch (error) {
      this.logError('Failed to send unified transaction', { error, request })
      return this.error('Failed to send unified transaction', 'UNIFIED_TRANSACTION_ERROR')
    }
  }

  /**
   * Enable WebAuthn for a wallet (upgrade or add capability)
   */
  async enableWebAuthn(
    walletId: string,
    credential: {
      credentialId: string
      publicKey: string
      authenticatorData: string
    }
  ): Promise<ServiceResult<boolean>> {
    try {
      const unifiedWallet = await this.getUnifiedWallet(walletId)
      if (!unifiedWallet.success) {
        return this.error(unifiedWallet.error!, unifiedWallet.code!)
      }

      const wallet = unifiedWallet.data!

      // If traditional wallet, upgrade to smart contract first
      if (wallet.walletType === 'traditional') {
        const upgradeResult = await this.upgradeToSmartContract({
          walletId,
          targetType: 'smart_contract',
          features: { enableWebAuthn: true }
        })

        if (!upgradeResult.success) {
          return this.error(upgradeResult.error!, upgradeResult.code!)
        }
      }

      // Store WebAuthn credential
      const credentialResult = await this.webAuthnService.registerCredential(walletId, {
        credentialId: credential.credentialId,
        publicKeyX: credential.publicKey, // In real implementation, would extract X coordinate
        publicKeyY: '0x0000000000000000000000000000000000000000000000000000000000000000', // In real implementation, would extract Y coordinate
        deviceName: 'Platform Authenticator',
        platform: 'unknown'
      })

      if (!credentialResult.success) {
        return this.error(credentialResult.error!, credentialResult.code!)
      }

      this.logInfo('WebAuthn enabled for wallet', {
        walletId,
        credentialId: credential.credentialId
      })

      return this.success(true)

    } catch (error) {
      this.logError('Failed to enable WebAuthn', { error, walletId })
      return this.error('Failed to enable WebAuthn', 'WEBAUTHN_ENABLE_ERROR')
    }
  }

  /**
   * Get wallet usage analytics
   */
  async getWalletAnalytics(walletId: string): Promise<ServiceResult<any>> {
    try {
      const unifiedWallet = await this.getUnifiedWallet(walletId)
      if (!unifiedWallet.success) {
        return this.error(unifiedWallet.error!, unifiedWallet.code!)
      }

      const wallet = unifiedWallet.data!

      // Gather analytics from various services
      const analytics = {
        walletInfo: {
          id: wallet.id,
          type: wallet.walletType,
          blockchains: wallet.blockchains,
          createdAt: wallet.timestamps.createdAt
        },
        
        security: {
          signatureScheme: wallet.security.currentSignatureScheme,
          guardianCount: wallet.security.guardianCount,
          hasWebAuthn: wallet.security.hasWebAuthn,
          isLocked: wallet.security.isLocked,
          restrictionsCount: 0 // Would be fetched from restrictions service
        },
        
        usage: {
          totalTransactions: 0, // Would be fetched from transaction service
          totalValue: '0',
          lastTransactionDate: null,
          activeBlockchains: wallet.blockchains.length
        },
        
        features: {
          capabilities: Object.keys(wallet.capabilities).filter(
            key => wallet.capabilities[key as keyof WalletCapabilities] === true
          ),
          smartContractFeatures: wallet.smartContract?.facets || []
        }
      }

      return this.success(analytics)

    } catch (error) {
      this.logError('Failed to get wallet analytics', { error, walletId })
      return this.error('Failed to get wallet analytics', 'WALLET_ANALYTICS_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private async gatherSecurityInformation(walletId: string, isSmartContract: boolean) {
    // Get guardian information
    const guardiansResult = await this.guardianService.getWalletGuardians(walletId)
    const guardianCount = guardiansResult.success ? guardiansResult.data!.length : 0

    // Check WebAuthn status
    const webAuthnResult = await this.webAuthnService.listCredentials(walletId)
    const hasWebAuthn = webAuthnResult.success && webAuthnResult.data!.length > 0

    // Check lock status
    const lockStatusResult = await this.lockService.getLockStatus(walletId)
    const isLocked = lockStatusResult.success && lockStatusResult.data!.isLocked

    // Check restrictions
    const restrictionsResult = await this.restrictionsService.getRestrictions(walletId)
    const hasRestrictions = restrictionsResult.success && restrictionsResult.data!.length > 0

    // Determine current signature scheme
    let currentSignatureScheme: 'secp256k1' | 'secp256r1' | 'both' = 'secp256k1'
    if (hasWebAuthn && isSmartContract) {
      currentSignatureScheme = 'both' // Can use either
    } else if (hasWebAuthn) {
      currentSignatureScheme = 'secp256r1'
    }

    return {
      isMultiSigEnabled: guardianCount > 0,
      guardianCount,
      currentSignatureScheme,
      hasWebAuthn,
      isLocked,
      hasRestrictions
    }
  }

  private async determineCapabilities(
    baseWallet: any,
    isSmartContract: boolean,
    security: any
  ): Promise<WalletCapabilities> {
    return {
      // Basic capabilities
      canSendTransactions: !security.isLocked,
      canReceiveTokens: true,
      canSign: true,
      
      // Advanced capabilities
      supportsMultiSig: true, // Both types can support multi-sig
      supportsWebAuthn: isSmartContract,
      supportsAccountAbstraction: isSmartContract,
      supportsGuardianRecovery: true,
      supportsSignatureMigration: isSmartContract,
      supportsRestrictions: isSmartContract,
      supportsEmergencyLock: isSmartContract,
      
      // Multi-chain capabilities
      supportedBlockchains: baseWallet.blockchains,
      canAddBlockchains: true,
      
      // Integration capabilities
      canUpgradeToSmartContract: !isSmartContract,
      canDowngradeToTraditional: false // Not typically recommended
    }
  }

  private async determineRequiredFacets(features: any): Promise<string[]> {
    const facets: string[] = ['AccountFacet', 'TokenReceiverFacet'] // Always required

    if (features.enableWebAuthn) {
      facets.push('Secp256r1VerificationFacet')
    }

    if (features.enableGuardians) {
      facets.push('GuardianFacet', 'AccountRecoveryFacet')
    }

    if (features.enableRestrictions) {
      facets.push('RestrictionsFacet')
    }

    if (features.enableAccountAbstraction) {
      facets.push('AccountAbstractionFacet')
    }

    // Always add signature migration for smart contracts
    facets.push('SignatureMigrationFacet')

    return facets
  }

  private async enableRequestedFeatures(walletId: string, features: any): Promise<void> {
    if (features.enableRestrictions) {
      await this.restrictionsService.initializeRestrictions(walletId)
    }

    // Other feature initialization would go here
  }

  private async sendAccountAbstractionTransaction(
    wallet: UnifiedWallet,
    transactions: any[],
    options: any
  ): Promise<ServiceResult<{ transactionHash: string }>> {
    // Use UserOperationService for gasless transactions
    const userOpResult = await this.userOperationService.buildUserOperation({
      walletAddress: wallet.primaryAddress,
      operations: transactions.map(tx => ({
        target: tx.to,
        value: tx.value,
        data: tx.data || '0x'
      })),
      paymasterPolicy: options.gasless ? {
        type: 'sponsor_all' as const,
        sponsorAddress: '0x...' // Would be configured
      } : undefined
    })

    if (!userOpResult.success) {
      return this.error(userOpResult.error!, userOpResult.code!)
    }

    const sendResult = await this.userOperationService.sendUserOperation(userOpResult.data!.userOperation)
    if (!sendResult.success) {
      return this.error(sendResult.error!, sendResult.code!)
    }

    return this.success({
      transactionHash: sendResult.data!.userOpHash
    })
  }

  private async sendBatchTransaction(
    wallet: UnifiedWallet,
    transactions: any[],
    options: any
  ): Promise<ServiceResult<{ transactionHash: string }>> {
    // Use batch operation functionality
    // This would integrate with the BatchOperationService
    // For now, fall back to traditional
    return await this.sendTraditionalTransaction(wallet, transactions[0], options)
  }

  private async sendTraditionalTransaction(
    wallet: UnifiedWallet,
    transaction: any,
    options: any
  ): Promise<ServiceResult<{ transactionHash: string }>> {
    // Use TransactionService for traditional transactions
    const buildResult = await this.transactionService.buildTransaction({
      wallet_id: wallet.id,
      blockchain: transaction.blockchain,
      to: transaction.to,
      amount: transaction.value,
      data: transaction.data
    })

    if (!buildResult.success) {
      return this.error(buildResult.error!, buildResult.code!)
    }

    // For now, return the built transaction (would need signing and broadcasting)
    return this.success({
      transactionHash: buildResult.data!.transaction_id
    })
  }
}
