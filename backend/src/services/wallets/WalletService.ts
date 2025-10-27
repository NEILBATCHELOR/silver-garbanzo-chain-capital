import { BaseService } from '../BaseService'
import { HDWalletService } from './HDWalletService'
import { KeyManagementService } from './KeyManagementService'
import { ServiceResult, PaginatedResponse } from '../../types/index'
import { 
  CreateWalletRequest, 
  WalletResponse, 
  WalletBalance,
  WalletStatistics,
  WalletType,
  BlockchainNetwork,
  WalletStatus
} from './types'

export class WalletService extends BaseService {
  private hdWalletService: HDWalletService
  private keyManagementService: KeyManagementService

  constructor() {
    super('Wallet')
    this.hdWalletService = new HDWalletService()
    this.keyManagementService = new KeyManagementService()
  }

  /**
   * Create a new HD wallet for a specific chain
   */
  async createWallet(request: CreateWalletRequest): Promise<ServiceResult<WalletResponse>> {
    try {
      const { investor_id, project_id, chain_id, name } = request

      // Validate input
      const validation = this.validateCreateWalletRequest(request)
      if (!validation.isValid) {
        return this.error(validation.errors.join(', '), 'VALIDATION_ERROR', 400)
      }

      // Generate HD wallet
      const hdWalletResult = await this.hdWalletService.generateHDWallet()
      if (!hdWalletResult.success) {
        return this.error('Failed to generate HD wallet', 'HD_WALLET_FAILED')
      }

      const hdWallet = hdWalletResult.data!

      // Create master key for address derivation
      const masterKeyResult = await this.hdWalletService.createMasterKeyFromEncryptedSeed(hdWallet.encryptedSeed)
      if (!masterKeyResult.success) {
        return this.error('Failed to create master key', 'MASTER_KEY_FAILED')
      }

      const masterKey = masterKeyResult.data!

      // For now, derive Ethereum address (can be extended for other chains)
      const blockchain: BlockchainNetwork = 'ethereum'
      const addressResult = await this.hdWalletService.deriveAddress(masterKey, blockchain)
      if (!addressResult.success) {
        return this.error('Failed to derive address', 'ADDRESS_DERIVATION_FAILED')
      }

      const address = addressResult.data!
      const addresses = { [blockchain]: address }
      
      const wallet = await this.db.wallets.create({
        data: {
          investor_id,
          project_id,
          wallet_type: 'hd_wallet', // HD wallet type
          blockchain,
          wallet_address: address,
          status: 'active',
          guardian_policy: {},
          signatories: []
        }
      })

      // Store HD wallet keys securely
      const keyStorageResult = await this.keyManagementService.storeWalletKeys({
        walletId: wallet.id,
        encryptedSeed: hdWallet.encryptedSeed,
        masterPublicKey: hdWallet.masterPublicKey,
        addresses,
        derivationPaths: hdWallet.derivationPaths
      })

      if (!keyStorageResult.success) {
        // Rollback wallet creation if key storage fails
        await this.db.wallets.delete({ where: { id: wallet.id } })
        return this.error('Failed to store wallet keys', 'KEY_STORAGE_FAILED')
      }

      const response: WalletResponse = {
        id: wallet.id,
        investor_id: wallet.investor_id,
        name: name || `Wallet ${wallet.id.slice(0, 8)}`,
        primary_address: address,
        addresses,
        chain_id,
        chain_name: 'Ethereum Mainnet', // TODO: Get from chainIds utility
        is_testnet: false, // TODO: Get from chainIds utility
        status: wallet.status,
        is_multi_sig_enabled: wallet.is_multi_sig_enabled,
        guardian_policy: wallet.guardian_policy,
        created_at: wallet.created_at.toISOString(),
        updated_at: wallet.updated_at.toISOString()
      }

      this.logInfo('Wallet created successfully', { walletId: wallet.id, investorId: investor_id })
      return this.success(response)

    } catch (error) {
      this.logError('Failed to create wallet', { error, request })
      return this.error('Failed to create wallet', 'WALLET_CREATION_FAILED')
    }
  }

  /**
   * Get wallet by ID with all addresses and metadata
   */
  async getWallet(walletId: string): Promise<ServiceResult<WalletResponse>> {
    try {
      const wallet = await this.db.wallets.findUnique({
        where: { id: walletId },
        include: {
          investors: {
            select: { investor_id: true, name: true }
          }
        }
      })

      if (!wallet) {
        return this.error('Wallet not found', 'NOT_FOUND', 404)
      }

      // Get HD wallet addresses from key management
      const addresses = await this.keyManagementService.getWalletAddresses(walletId)
      if (!addresses) {
        this.logWarn('No stored addresses found for wallet', { walletId })
      }

      const response: WalletResponse = {
        id: wallet.id,
        investor_id: wallet.investor_id,
        name: this.generateWalletName(wallet),
        primary_address: wallet.wallet_address || '',
        addresses: addresses || { [wallet.blockchain]: wallet.wallet_address || '' },
        chain_id: '1', // TODO: Store chain_id in database and retrieve it
        chain_name: 'Ethereum Mainnet', // TODO: Get from chainIds utility
        is_testnet: false, // TODO: Get from chainIds utility
        status: wallet.status,
        is_multi_sig_enabled: wallet.is_multi_sig_enabled,
        guardian_policy: wallet.guardian_policy,
        created_at: wallet.created_at.toISOString(),
        updated_at: wallet.updated_at.toISOString()
      }

      return this.success(response)

    } catch (error) {
      this.logError('Failed to get wallet', { error, walletId })
      return this.error('Failed to retrieve wallet', 'WALLET_RETRIEVAL_FAILED')
    }
  }

  /**
   * List wallets for an investor with pagination and filtering
   */
  async listWallets(
    investorId: string,
    options: { 
      page?: number
      limit?: number
      chain_id?: string
      status?: WalletStatus
    } = {}
  ): Promise<ServiceResult<PaginatedResponse<WalletResponse>>> {
    try {
      const { page = 1, limit = 20, chain_id, status } = options
      const offset = (page - 1) * limit

      const where: any = {
        investor_id: investorId
      }

      if (chain_id) {
        where.chain_id = chain_id
      }

      if (status) {
        where.status = status
      }

      const [wallets, total] = await Promise.all([
        this.db.wallets.findMany({
          where,
          include: {
            investors: {
              select: { investor_id: true, name: true }
            }
          },
          skip: offset,
          take: limit,
          orderBy: { created_at: 'desc' }
        }),
        this.db.wallets.count({ where })
      ])

      const walletsWithAddresses = await Promise.all(
        wallets.map(async (wallet) => {
          const addresses = await this.keyManagementService.getWalletAddresses(wallet.id)
          
          return {
            id: wallet.id,
            investor_id: wallet.investor_id,
            name: this.generateWalletName(wallet),
            primary_address: wallet.wallet_address || '',
            addresses: addresses || { [wallet.blockchain]: wallet.wallet_address || '' },
            chain_id: '1', // TODO: Get from database
            chain_name: 'Ethereum Mainnet', // TODO: Get from chainIds utility
            is_testnet: false, // TODO: Get from chainIds utility
            status: wallet.status,
            is_multi_sig_enabled: wallet.is_multi_sig_enabled,
            created_at: wallet.created_at.toISOString(),
            updated_at: wallet.updated_at.toISOString()
          }
        })
      )

      return this.success(this.paginatedResponse(walletsWithAddresses, total, page, limit))

    } catch (error) {
      this.logError('Failed to list wallets', { error, investorId, options })
      return this.error('Failed to list wallets', 'WALLET_LIST_FAILED')
    }
  }

  /**
   * Update wallet information
   */
  async updateWallet(
    walletId: string, 
    updates: {
      status?: WalletStatus
      guardian_policy?: any
      signatories?: any[]
    }
  ): Promise<ServiceResult<WalletResponse>> {
    try {
      const wallet = await this.db.wallets.update({
        where: { id: walletId },
        data: {
          ...updates,
          updated_at: new Date()
        },
        include: {
          investors: {
            select: { investor_id: true, name: true }
          }
        }
      })

      const addresses = await this.keyManagementService.getWalletAddresses(walletId)

      const response: WalletResponse = {
        id: wallet.id,
        investor_id: wallet.investor_id,
        name: this.generateWalletName(wallet),
        primary_address: wallet.wallet_address || '',
        addresses: addresses || { [wallet.blockchain]: wallet.wallet_address || '' },
        chain_id: '1', // TODO: Get from database
        chain_name: 'Ethereum Mainnet', // TODO: Get from chainIds utility
        is_testnet: false, // TODO: Get from chainIds utility
        status: wallet.status,
        is_multi_sig_enabled: wallet.is_multi_sig_enabled,
        guardian_policy: wallet.guardian_policy,
        created_at: wallet.created_at.toISOString(),
        updated_at: wallet.updated_at.toISOString()
      }

      this.logInfo('Wallet updated successfully', { walletId, updates })
      return this.success(response)

    } catch (error) {
      this.logError('Failed to update wallet', { error, walletId, updates })
      
      if ((error as any).code === 'P2025') {
        return this.error('Wallet not found', 'NOT_FOUND', 404)
      }
      
      return this.error('Failed to update wallet', 'WALLET_UPDATE_FAILED')
    }
  }

  /**
   * Delete wallet (soft delete - mark as archived)
   */
  async deleteWallet(walletId: string): Promise<ServiceResult<boolean>> {
    try {
      // Soft delete by updating status
      await this.db.wallets.update({
        where: { id: walletId },
        data: {
          status: 'archived',
          updated_at: new Date()
        }
      })

      this.logInfo('Wallet archived successfully', { walletId })
      return this.success(true)

    } catch (error) {
      this.logError('Failed to delete wallet', { error, walletId })
      
      if ((error as any).code === 'P2025') {
        return this.error('Wallet not found', 'NOT_FOUND', 404)
      }
      
      return this.error('Failed to delete wallet', 'WALLET_DELETE_FAILED')
    }
  }

  /**
   * Add blockchain support to existing wallet
   */
  async addBlockchainSupport(
    walletId: string, 
    blockchain: BlockchainNetwork
  ): Promise<ServiceResult<WalletResponse>> {
    try {
      // Get existing wallet
      const wallet = await this.db.wallets.findUnique({
        where: { id: walletId }
      })

      if (!wallet) {
        return this.error('Wallet not found', 'NOT_FOUND', 404)
      }

      // Get stored keys
      const keyData = await this.keyManagementService.getWalletKeys(walletId)
      if (!keyData) {
        return this.error('Wallet keys not found', 'KEYS_NOT_FOUND', 404)
      }

      // Create master key
      const masterKeyResult = await this.hdWalletService.createMasterKeyFromEncryptedSeed(keyData.encrypted_seed)
      if (!masterKeyResult.success) {
        return this.error('Failed to create master key', 'MASTER_KEY_FAILED')
      }

      // Derive new address for the blockchain
      const addressResult = await this.hdWalletService.deriveAddress(masterKeyResult.data!, blockchain)
      if (!addressResult.success) {
        return this.error('Failed to derive address', 'ADDRESS_DERIVATION_FAILED')
      }

      // Update stored addresses
      const newAddresses = { [blockchain]: addressResult.data! }
      const updateResult = await this.keyManagementService.updateWalletAddresses(walletId, newAddresses)
      if (!updateResult.success) {
        return this.error('Failed to update addresses', 'ADDRESS_UPDATE_FAILED')
      }

      // Return updated wallet
      return await this.getWallet(walletId)

    } catch (error) {
      this.logError('Failed to add blockchain support', { error, walletId, blockchain })
      return this.error('Failed to add blockchain support', 'BLOCKCHAIN_ADD_FAILED')
    }
  }

  /**
   * Get wallet balance across all chains (placeholder implementation)
   */
  async getWalletBalance(walletId: string): Promise<ServiceResult<WalletBalance>> {
    try {
      const walletResult = await this.getWallet(walletId)
      if (!walletResult.success) {
        return this.error(walletResult.error || 'Wallet not found', walletResult.code || 'NOT_FOUND', walletResult.statusCode)
      }

      const wallet = walletResult.data!
      const balances: Record<string, any> = {}
      
      // Get balances for each blockchain address
      // This would integrate with blockchain RPC providers or services like Moralis, Alchemy
      for (const [blockchain, address] of Object.entries(wallet.addresses)) {
        balances[blockchain] = {
          address,
          native_balance: "0", // Would be fetched from RPC
          tokens: [] // Would be fetched from token contracts/APIs
        }
      }

      const walletBalance: WalletBalance = {
        wallet_id: walletId,
        balances,
        total_usd_value: "0", // Would be calculated from prices
        last_updated: new Date().toISOString()
      }

      return this.success(walletBalance)

    } catch (error) {
      this.logError('Failed to get wallet balance', { error, walletId })
      return this.error('Failed to get wallet balance', 'BALANCE_RETRIEVAL_FAILED')
    }
  }

  /**
   * Get wallet statistics for analytics
   */
  async getWalletStatistics(): Promise<ServiceResult<WalletStatistics>> {
    try {
      const [totalWallets, activeWallets, multiSigWallets] = await Promise.all([
        this.db.wallets.count(),
        this.db.wallets.count({ where: { status: 'active' } }),
        this.db.wallets.count({ where: { is_multi_sig_enabled: true } })
      ])

      // Get blockchain distribution
      const blockchainStats = await this.db.wallets.groupBy({
        by: ['blockchain'],
        _count: {
          id: true
        }
      })

      const blockchainDistribution: Record<string, number> = {}
      blockchainStats.forEach(stat => {
        blockchainDistribution[stat.blockchain] = stat._count.id
      })

      const statistics: WalletStatistics = {
        total_wallets: totalWallets,
        active_wallets: activeWallets,
        total_value_usd: "0", // Would be calculated from balances
        transaction_count: 0, // Would be fetched from transaction service
        multi_sig_wallets: multiSigWallets,
        blockchain_distribution: blockchainDistribution
      }

      return this.success(statistics)

    } catch (error) {
      this.logError('Failed to get wallet statistics', { error })
      return this.error('Failed to get wallet statistics', 'STATISTICS_FAILED')
    }
  }

  /**
   * Private helper methods
   */

  private validateCreateWalletRequest(request: CreateWalletRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!request.investor_id) {
      errors.push('Investor ID is required')
    }

    if (!request.chain_id) {
      errors.push('Chain ID is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private generateWalletName(wallet: any): string {
    const investorName = wallet.investors?.name || 'Unknown'
    return `${investorName} Wallet`
  }
}
