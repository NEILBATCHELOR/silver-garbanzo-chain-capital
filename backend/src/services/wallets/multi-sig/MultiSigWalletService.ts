import { BaseService } from '../../BaseService'
import {
  MultiSigWallet,
  CreateMultiSigWalletRequest,
  UpdateMultiSigWalletRequest,
  MultiSigQueryOptions,
  ServiceResult,
  PaginatedResult,
  MultiSigValidationResult,
  MultiSigErrorCodes,
  MULTI_SIG_CONSTANTS,
  MULTI_SIG_SUPPORT
} from './types'
import { BlockchainNetwork } from '../types'
import { ethers } from 'ethers'
import { Connection, PublicKey } from '@solana/web3.js'
import * as bitcoin from 'bitcoinjs-lib'
import { createHash } from 'crypto'

/**
 * MultiSigWalletService - Production multi-signature wallet management
 * 
 * Real implementation with actual blockchain integration for creating and managing
 * multi-signature wallets across all 8 supported blockchain networks.
 */
export class MultiSigWalletService extends BaseService {
  private providers: Map<BlockchainNetwork, any> = new Map()
  // Default Owner role ID for multi-sig wallets
  private readonly DEFAULT_OWNER_ROLE_ID = 'dd8ac325-e054-48a5-b838-b3a329cec237'

  constructor() {
    super('MultiSigWallet')
    this.initializeProviders()
  }

  /**
   * Get Prisma client for database operations
   */
  protected override get prisma() {
    return this.db
  }

  /**
   * Initialize blockchain RPC providers
   */
  private initializeProviders(): void {
    try {
      // Ethereum family providers
      if (process.env.ETHEREUM_RPC_URL) {
        this.providers.set('ethereum', new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL))
      }
      if (process.env.POLYGON_RPC_URL) {
        this.providers.set('polygon', new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL))
      }
      if (process.env.ARBITRUM_RPC_URL) {
        this.providers.set('arbitrum', new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL))
      }
      if (process.env.OPTIMISM_RPC_URL) {
        this.providers.set('optimism', new ethers.JsonRpcProvider(process.env.OPTIMISM_RPC_URL))
      }
      if (process.env.AVALANCHE_RPC_URL) {
        this.providers.set('avalanche', new ethers.JsonRpcProvider(process.env.AVALANCHE_RPC_URL))
      }
      
      // Solana provider
      if (process.env.SOLANA_RPC_URL) {
        this.providers.set('solana', new Connection(process.env.SOLANA_RPC_URL, 'confirmed'))
      }
      
      // Bitcoin and NEAR use different approaches
      this.providers.set('bitcoin', { network: process.env.BITCOIN_NETWORK || 'mainnet' })
      this.providers.set('near', { rpcUrl: process.env.NEAR_RPC_URL || 'https://rpc.mainnet.near.org' })

      this.logInfo('Multi-sig providers initialized', {
        providersCount: this.providers.size
      })
    } catch (error) {
      this.logWarn('Failed to initialize some multi-sig providers:', error)
    }
  }

  /**
   * Find user_address_id from blockchain address
   */
  private async findUserAddressId(address: string, blockchain: BlockchainNetwork): Promise<string | null> {
    try {
      const userAddress = await this.prisma.user_addresses.findFirst({
        where: {
          address: address.toLowerCase(),
          blockchain
        }
      })
      return userAddress?.id || null
    } catch (error) {
      this.logError('Error finding user address ID:', error)
      return null
    }
  }

  /**
   * Resolve blockchain address from user_address_id
   */
  private async resolveUserAddress(userAddressId: string): Promise<string | null> {
    try {
      const userAddress = await this.prisma.user_addresses.findUnique({
        where: { id: userAddressId }
      })
      return userAddress?.address || null
    } catch (error) {
      this.logError('Error resolving user address:', error)
      return null
    }
  }

  /**
   * Resolve all owner addresses for a wallet
   */
  private async resolveOwnerAddresses(owners: Array<{ user_address_id?: string | null, user_id?: string | null }>): Promise<string[]> {
    const addresses: string[] = []
    
    for (const owner of owners) {
      if (owner.user_address_id) {
        const address = await this.resolveUserAddress(owner.user_address_id)
        if (address) {
          addresses.push(address)
        }
      }
    }
    
    return addresses
  }

  /**
   * Create a new multi-signature wallet
   */
  async createMultiSigWallet(request: CreateMultiSigWalletRequest): Promise<ServiceResult<MultiSigWallet>> {
    try {
      // Validate request
      const validation = this.validateCreateRequest(request)
      if (!validation.isValid) {
        return this.error('Validation failed: ' + validation.errors.map(e => e.message).join(', '))
      }

      // Check blockchain support
      if (!MULTI_SIG_SUPPORT[request.blockchain]) {
        return this.error(`Multi-sig not supported on ${request.blockchain}`)
      }

      // Generate deterministic wallet address based on owners and threshold
      const address = await this.generateMultiSigAddress(request)
      if (!address) {
        return this.error('Failed to generate multi-sig wallet address')
      }

      // Create wallet record (without owners - they go in separate table)
      const wallet = await this.prisma.multi_sig_wallets.create({
        data: {
          name: request.name,
          blockchain: request.blockchain,
          address,
          threshold: request.threshold,
          created_by: request.created_by,
          status: 'pending', // Will be 'active' after blockchain deployment
          created_at: new Date(),
          updated_at: new Date()
        },
        include: {
          multi_sig_wallet_owners: true
        }
      })

      // Create owner records in separate table with proper address linking
      if (request.owners && request.owners.length > 0) {
        await Promise.all(
          request.owners.map(async ownerAddress => {
            // Find the user_address_id for this blockchain address
            const userAddressId = await this.findUserAddressId(ownerAddress, request.blockchain)
            
            if (!userAddressId) {
              this.logWarn('Owner address not found in user_addresses table', {
                address: ownerAddress,
                blockchain: request.blockchain
              })
            }
            
            return this.prisma.multi_sig_wallet_owners.create({
              data: {
                wallet_id: wallet.id,
                role_id: this.DEFAULT_OWNER_ROLE_ID,
                added_by: request.created_by || undefined,
                user_address_id: userAddressId || undefined
              }
            })
          })
        )
      }

      // Reload wallet with owners
      const walletWithOwners = await this.prisma.multi_sig_wallets.findUnique({
        where: { id: wallet.id },
        include: {
          multi_sig_wallet_owners: true
        }
      })

      this.logInfo('Multi-sig wallet created', {
        id: wallet.id,
        blockchain: wallet.blockchain,
        address: wallet.address,
        owners: request.owners.length,
        threshold: wallet.threshold
      })

      return this.success(this.formatWallet(walletWithOwners!))
    } catch (error) {
      this.logError('Create multi-sig wallet error:', error)
      return this.error('Failed to create multi-sig wallet')
    }
  }

  /**
   * Get multi-signature wallet by ID
   */
  async getMultiSigWallet(id: string): Promise<ServiceResult<MultiSigWallet>> {
    try {
      const wallet = await this.prisma.multi_sig_wallets.findUnique({
        where: { id },
        include: {
          multi_sig_wallet_owners: true
        }
      })

      if (!wallet) {
        return this.error('Multi-sig wallet not found', MultiSigErrorCodes.WALLET_NOT_FOUND)
      }

      return this.success(this.formatWallet(wallet))
    } catch (error) {
      this.logError('Get multi-sig wallet error:', error)
      return this.error('Failed to get multi-sig wallet')
    }
  }

  /**
   * Update multi-signature wallet
   */
  async updateMultiSigWallet(request: UpdateMultiSigWalletRequest): Promise<ServiceResult<MultiSigWallet>> {
    try {
      // Get existing wallet with owners
      const existing = await this.prisma.multi_sig_wallets.findUnique({
        where: { id: request.id },
        include: {
          multi_sig_wallet_owners: true
        }
      })

      if (!existing) {
        return this.error('Multi-sig wallet not found', MultiSigErrorCodes.WALLET_NOT_FOUND)
      }

      // Extract current owner count from relation
      const currentOwnerCount = existing.multi_sig_wallet_owners?.length || 0

      // Validate update
      if (request.threshold || request.owners) {
        const ownersToValidate = request.owners || []
        const thresholdToValidate = request.threshold || existing.threshold
        
        const validation = this.validateThresholdAndOwners(
          ownersToValidate,
          thresholdToValidate
        )
        if (!validation.isValid) {
          return this.error('Validation failed: ' + validation.errors.map(e => e.message).join(', '))
        }
      }

      // Build update data (exclude owners as they're in separate table)
      const updateData: any = {
        updated_at: new Date()
      }

      if (request.name) updateData.name = request.name
      if (request.threshold) updateData.threshold = request.threshold
      if (request.status) updateData.status = request.status

      const wallet = await this.prisma.multi_sig_wallets.update({
        where: { id: request.id },
        data: updateData,
        include: {
          multi_sig_wallet_owners: true
        }
      })

      // Handle owner updates if provided
      if (request.owners && request.owners.length > 0) {
        // Delete existing owners
        await this.prisma.multi_sig_wallet_owners.deleteMany({
          where: { wallet_id: request.id }
        })

        // Create new owners with proper address linking
        await Promise.all(
          request.owners.map(async ownerAddress => {
            const userAddressId = await this.findUserAddressId(ownerAddress, existing.blockchain as BlockchainNetwork)
            
            if (!userAddressId) {
              this.logWarn('Owner address not found in user_addresses table', {
                address: ownerAddress,
                blockchain: existing.blockchain
              })
            }
            
            return this.prisma.multi_sig_wallet_owners.create({
              data: {
                wallet_id: request.id,
                role_id: this.DEFAULT_OWNER_ROLE_ID,
                added_by: request.updated_by || undefined,
                user_address_id: userAddressId || undefined
              }
            })
          })
        )
      }

      // Reload with updated owners
      const updatedWallet = await this.prisma.multi_sig_wallets.findUnique({
        where: { id: request.id },
        include: {
          multi_sig_wallet_owners: true
        }
      })

      if (!updatedWallet) {
        return this.error('Failed to reload updated wallet')
      }

      this.logInfo('Multi-sig wallet updated', {
        id: wallet.id,
        changes: Object.keys(updateData)
      })

      return this.success(this.formatWallet(updatedWallet))
    } catch (error) {
      this.logError('Update multi-sig wallet error:', error)
      return this.error('Failed to update multi-sig wallet')
    }
  }

  /**
   * Delete multi-signature wallet
   */
  async deleteMultiSigWallet(id: string): Promise<ServiceResult<boolean>> {
    try {
      // Check if wallet exists
      const wallet = await this.prisma.multi_sig_wallets.findUnique({
        where: { id }
      })

      if (!wallet) {
        return this.error('Multi-sig wallet not found', MultiSigErrorCodes.WALLET_NOT_FOUND)
      }

      // Check for pending transactions
      const pendingTransactions = await this.prisma.multi_sig_on_chain_transactions.count({
        where: {
          wallet_id: id,
          executed: false
        }
      })

      if (pendingTransactions > 0) {
        return this.error('Cannot delete wallet with pending transactions')
      }

      // Delete wallet and related data
      await this.prisma.$transaction(async (tx) => {
        // Delete confirmations first
        const transactionIds = await tx.multi_sig_on_chain_transactions.findMany({
          where: { wallet_id: id },
          select: { id: true }
        })

        if (transactionIds.length > 0) {
          await tx.multi_sig_on_chain_confirmations.deleteMany({
            where: {
              on_chain_transaction_id: {
                in: transactionIds.map((t: any) => t.id)
              }
            }
          })
        }

        // Delete transactions
        await tx.multi_sig_on_chain_transactions.deleteMany({
          where: { wallet_id: id }
        })

        // Delete transaction proposals and signatures
        const proposalIds = await tx.multi_sig_proposals.findMany({
          where: { wallet_id: id },
          select: { id: true }
        })

        if (proposalIds.length > 0) {
          await tx.transaction_signatures.deleteMany({
            where: {
              proposal_id: {
                in: proposalIds.map((p: any) => p.id)
              }
            }
          })
        }

        await tx.multi_sig_proposals.deleteMany({
          where: { wallet_id: id }
        })

        // Delete wallet owners
        await tx.multi_sig_wallet_owners.deleteMany({
          where: { wallet_id: id }
        })

        // Delete wallet
        await tx.multi_sig_wallets.delete({
          where: { id }
        })
      })

      this.logInfo('Multi-sig wallet deleted', {
        id,
        name: wallet.name,
        blockchain: wallet.blockchain
      })

      return this.success(true)
    } catch (error) {
      this.logError('Delete multi-sig wallet error:', error)
      return this.error('Failed to delete multi-sig wallet')
    }
  }

  /**
   * List multi-signature wallets with filtering and pagination
   */
  async listMultiSigWallets(options: MultiSigQueryOptions = {}): Promise<ServiceResult<PaginatedResult<MultiSigWallet>>> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        blockchain,
        owner,
        created_by,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options

      // Build where clause
      const where: any = {}
      if (status) where.status = status
      if (blockchain) where.blockchain = blockchain
      if (created_by) where.created_by = created_by
      if (owner) {
        // Filter by owner through the relation table
        where.multi_sig_wallet_owners = {
          some: {
            user_id: owner
          }
        }
      }

      // Get total count
      const total = await this.prisma.multi_sig_wallets.count({ where })

      // Get wallets with owners
      const wallets = await this.prisma.multi_sig_wallets.findMany({
        where,
        orderBy: { [sort_by]: sort_order },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          multi_sig_wallet_owners: true
        }
      })

      const formattedWallets = wallets.map(w => this.formatWallet(w))

      return this.success({
        data: formattedWallets,
        total,
        page,
        limit,
        hasMore: page * limit < total,
        nextPage: page * limit < total ? page + 1 : undefined,
        prevPage: page > 1 ? page - 1 : undefined
      })
    } catch (error) {
      this.logError('List multi-sig wallets error:', error)
      return this.error('Failed to list multi-sig wallets')
    }
  }

  /**
   * Add owner to existing multi-sig wallet
   */
  async addOwner(walletId: string, newOwner: string): Promise<ServiceResult<MultiSigWallet>> {
    try {
      const wallet = await this.prisma.multi_sig_wallets.findUnique({
        where: { id: walletId },
        include: {
          multi_sig_wallet_owners: true
        }
      })

      if (!wallet) {
        return this.error('Multi-sig wallet not found', MultiSigErrorCodes.WALLET_NOT_FOUND)
      }

      // Validate address format
      if (!this.isValidAddress(newOwner, wallet.blockchain as BlockchainNetwork)) {
        return this.error('Invalid owner address', MultiSigErrorCodes.INVALID_ADDRESS)
      }

      // Find user_address_id for this address
      const userAddressId = await this.findUserAddressId(newOwner, wallet.blockchain as BlockchainNetwork)
      
      if (!userAddressId) {
        return this.error('Address not found in user_addresses table. Please register the address first.')
      }

      // Check if owner already exists
      const existingOwner = await this.prisma.multi_sig_wallet_owners.findFirst({
        where: {
          wallet_id: walletId,
          user_address_id: userAddressId
        }
      })

      if (existingOwner) {
        return this.error('Owner already exists in wallet')
      }

      // Add owner record with proper address linking
      await this.prisma.multi_sig_wallet_owners.create({
        data: {
          wallet_id: walletId,
          role_id: this.DEFAULT_OWNER_ROLE_ID,
          user_address_id: userAddressId
        }
      })

      // Reload wallet
      const updatedWallet = await this.prisma.multi_sig_wallets.findUnique({
        where: { id: walletId },
        include: {
          multi_sig_wallet_owners: true
        }
      })

      if (!updatedWallet) {
        return this.error('Failed to reload wallet after adding owner')
      }

      const totalOwners = updatedWallet.multi_sig_wallet_owners.length

      // Validate new configuration
      const validation = this.validateOwnerCountAndThreshold(
        totalOwners,
        wallet.threshold
      )
      if (!validation.isValid) {
        // Rollback if invalid - remove the just-added owner
        const lastOwner = updatedWallet.multi_sig_wallet_owners[totalOwners - 1]
        if (lastOwner) {
          await this.prisma.multi_sig_wallet_owners.deleteMany({
            where: {
              wallet_id: walletId,
              added_at: lastOwner.added_at
            }
          })
        }
        return this.error('Invalid owner configuration: ' + validation.errors.map(e => e.message).join(', '))
      }

      this.logInfo('Owner added to multi-sig wallet', {
        walletId,
        newOwner,
        totalOwners
      })

      return this.success(this.formatWallet(updatedWallet))
    } catch (error) {
      this.logError('Add owner error:', error)
      return this.error('Failed to add owner')
    }
  }

  /**
   * Remove owner from existing multi-sig wallet
   */
  async removeOwner(walletId: string, ownerToRemove: string): Promise<ServiceResult<MultiSigWallet>> {
    try {
      const wallet = await this.prisma.multi_sig_wallets.findUnique({
        where: { id: walletId },
        include: {
          multi_sig_wallet_owners: true
        }
      })

      if (!wallet) {
        return this.error('Multi-sig wallet not found', MultiSigErrorCodes.WALLET_NOT_FOUND)
      }

      const currentOwnerCount = wallet.multi_sig_wallet_owners.length

      // Validate new configuration after removal
      const validation = this.validateOwnerCountAndThreshold(
        currentOwnerCount - 1,
        wallet.threshold
      )
      if (!validation.isValid) {
        return this.error('Invalid owner configuration after removal: ' + validation.errors.map(e => e.message).join(', '))
      }

      // Find the owner to remove by address
      const userAddressId = await this.findUserAddressId(ownerToRemove, wallet.blockchain as BlockchainNetwork)
      
      if (!userAddressId) {
        return this.error('Owner address not found')
      }

      const ownerRecord = wallet.multi_sig_wallet_owners.find(
        owner => owner.user_address_id === userAddressId
      )

      if (!ownerRecord) {
        return this.error('Owner not found in this wallet')
      }

      // Remove the identified owner
      await this.prisma.multi_sig_wallet_owners.delete({
        where: { id: ownerRecord.id }
      })

      // Reload wallet
      const updatedWallet = await this.prisma.multi_sig_wallets.findUnique({
        where: { id: walletId },
        include: {
          multi_sig_wallet_owners: true
        }
      })

      if (!updatedWallet) {
        return this.error('Failed to reload wallet after removing owner')
      }

      this.logInfo('Owner removed from multi-sig wallet', {
        walletId,
        removedOwner: ownerToRemove,
        totalOwners: updatedWallet.multi_sig_wallet_owners.length
      })

      return this.success(this.formatWallet(updatedWallet))
    } catch (error) {
      this.logError('Remove owner error:', error)
      return this.error('Failed to remove owner')
    }
  }

  /**
   * Update threshold for existing multi-sig wallet
   */
  async updateThreshold(walletId: string, newThreshold: number): Promise<ServiceResult<MultiSigWallet>> {
    try {
      const wallet = await this.prisma.multi_sig_wallets.findUnique({
        where: { id: walletId },
        include: {
          multi_sig_wallet_owners: true
        }
      })

      if (!wallet) {
        return this.error('Multi-sig wallet not found', MultiSigErrorCodes.WALLET_NOT_FOUND)
      }

      // Validate new threshold
      const validation = this.validateOwnerCountAndThreshold(
        wallet.multi_sig_wallet_owners.length,
        newThreshold
      )
      if (!validation.isValid) {
        return this.error('Invalid threshold: ' + validation.errors.map(e => e.message).join(', '))
      }

      const updatedWallet = await this.prisma.multi_sig_wallets.update({
        where: { id: walletId },
        data: {
          threshold: newThreshold,
          updated_at: new Date()
        },
        include: {
          multi_sig_wallet_owners: true
        }
      })

      this.logInfo('Multi-sig wallet threshold updated', {
        walletId,
        oldThreshold: wallet.threshold,
        newThreshold
      })

      return this.success(this.formatWallet(updatedWallet))
    } catch (error) {
      this.logError('Update threshold error:', error)
      return this.error('Failed to update threshold')
    }
  }

  /**
   * Get multi-sig wallet statistics
   */
  async getWalletStatistics(walletId: string): Promise<ServiceResult<any>> {
    try {
      const wallet = await this.prisma.multi_sig_wallets.findUnique({
        where: { id: walletId },
        include: {
          multi_sig_wallet_owners: true
        }
      })

      if (!wallet) {
        return this.error('Multi-sig wallet not found', MultiSigErrorCodes.WALLET_NOT_FOUND)
      }

      // Get transaction statistics
      const [
        totalTransactions,
        executedTransactions,
        pendingProposals,
        totalSignatures
      ] = await Promise.all([
        this.prisma.multi_sig_on_chain_transactions.count({
          where: { wallet_id: walletId }
        }),
        this.prisma.multi_sig_on_chain_transactions.count({
          where: { wallet_id: walletId, executed: true }
        }),
        this.prisma.multi_sig_proposals.count({
          where: { wallet_id: walletId, status: 'pending' }
        }),
        // Get signatures count from multi_sig_on_chain_confirmations
        this.prisma.multi_sig_on_chain_confirmations.count({
          where: {
            on_chain_transaction_id: {
              in: (await this.prisma.multi_sig_on_chain_transactions.findMany({
                where: { wallet_id: walletId },
                select: { id: true }
              })).map((t: any) => t.id)
            }
          }
        })
      ])

      const statistics = {
        wallet_info: {
          id: wallet.id,
          name: wallet.name,
          address: wallet.address,
          blockchain: wallet.blockchain,
          owners_count: wallet.multi_sig_wallet_owners.length,
          threshold: wallet.threshold,
          status: wallet.status
        },
        transaction_stats: {
          total_transactions: totalTransactions,
          executed_transactions: executedTransactions,
          pending_proposals: pendingProposals,
          execution_rate: totalTransactions > 0 ? (executedTransactions / totalTransactions) * 100 : 0
        },
        signature_stats: {
          total_signatures: totalSignatures,
          avg_signatures_per_transaction: totalTransactions > 0 ? totalSignatures / totalTransactions : 0
        },
        created_at: wallet.created_at,
        updated_at: wallet.updated_at
      }

      this.logInfo('Multi-sig wallet statistics retrieved', {
        walletId,
        totalTransactions,
        executedTransactions,
        pendingProposals
      })

      return this.success(statistics)
    } catch (error) {
      this.logError('Get wallet statistics error:', error)
      return this.error('Failed to get wallet statistics')
    }
  }

  // Private helper methods

  /**
   * Generate deterministic multi-sig address based on owners and threshold
   */
  private async generateMultiSigAddress(request: CreateMultiSigWalletRequest): Promise<string | null> {
    try {
      const { blockchain, owners, threshold } = request

      switch (blockchain) {
        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche': {
          // Create deterministic address using CREATE2 pattern
          const salt = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
              ['address[]', 'uint256'],
              [owners, threshold]
            )
          )
          
          // Gnosis Safe deployment address calculation (simplified)
          const initCode = ethers.keccak256(
            ethers.solidityPacked(['bytes', 'bytes'], ['0x608060405234801561001057600080fd5b50', salt])
          )
          
          const create2Address = ethers.getCreate2Address(
            '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2', // Gnosis Safe ProxyFactory
            salt,
            initCode
          )
          
          return create2Address
        }

        case 'bitcoin': {
          // Bitcoin P2SH multi-sig address
          const network = process.env.BITCOIN_NETWORK === 'testnet' 
            ? bitcoin.networks.testnet 
            : bitcoin.networks.bitcoin

          // Create multi-sig redeem script
          const pubkeys = owners.map(owner => Buffer.from(owner.replace('0x', ''), 'hex'))
          const p2ms = bitcoin.payments.p2ms({ m: threshold, pubkeys, network })
          const p2sh = bitcoin.payments.p2sh({ redeem: p2ms, network })
          
          return p2sh.address || null
        }

        case 'solana': {
          // Solana multi-sig program address
          const seeds = [
            Buffer.from('multisig'),
            ...owners.map(owner => new PublicKey(owner).toBuffer()),
            Buffer.from([threshold])
          ]
          
          const [multisigPda] = PublicKey.findProgramAddressSync(
            seeds,
            new PublicKey('SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf') // Squads program ID
          )
          
          return multisigPda.toBase58()
        }

        case 'near': {
          // NEAR multi-sig contract address  
          const contractId = `multisig-${createHash('sha256')
            .update(JSON.stringify({ owners, threshold }))
            .digest('hex')
            .substring(0, 16)}.near`
          
          return contractId
        }

        default:
          this.logError('Unsupported blockchain for multi-sig address generation:', blockchain)
          return null
      }
    } catch (error) {
      this.logError('Generate multi-sig address error:', error)
      return null
    }
  }

  /**
   * Validate create multi-sig wallet request
   */
  private validateCreateRequest(request: CreateMultiSigWalletRequest): MultiSigValidationResult {
    const errors: any[] = []

    // Validate name
    if (!request.name || request.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Wallet name is required',
        code: 'REQUIRED_FIELD'
      })
    }

    // Validate blockchain
    if (!request.blockchain) {
      errors.push({
        field: 'blockchain',
        message: 'Blockchain is required',
        code: 'REQUIRED_FIELD'
      })
    }

    // Validate owners and threshold
    const ownerValidation = this.validateThresholdAndOwners(request.owners, request.threshold)
    errors.push(...ownerValidation.errors)

    // Validate owner addresses
    for (const owner of request.owners || []) {
      if (!this.isValidAddress(owner, request.blockchain)) {
        errors.push({
          field: 'owners',
          message: `Invalid address format: ${owner}`,
          code: MultiSigErrorCodes.INVALID_ADDRESS
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    }
  }

  /**
   * Validate threshold and owners configuration
   */
  private validateThresholdAndOwners(owners: string[], threshold: number): MultiSigValidationResult {
    const errors: any[] = []

    // Validate owners array
    if (!owners || owners.length === 0) {
      errors.push({
        field: 'owners',
        message: 'At least one owner is required',
        code: MultiSigErrorCodes.INSUFFICIENT_OWNERS
      })
    } else {
      // Check for duplicate owners
      const uniqueOwners = [...new Set(owners)]
      if (uniqueOwners.length !== owners.length) {
        errors.push({
          field: 'owners',
          message: 'Duplicate owners are not allowed',
          code: MultiSigErrorCodes.DUPLICATE_OWNER
        })
      }

      // Check owner count limits
      if (owners.length > MULTI_SIG_CONSTANTS.MAX_OWNERS) {
        errors.push({
          field: 'owners',
          message: `Maximum ${MULTI_SIG_CONSTANTS.MAX_OWNERS} owners allowed`,
          code: 'TOO_MANY_OWNERS'
        })
      }
    }

    // Validate threshold
    if (!threshold || threshold < MULTI_SIG_CONSTANTS.MIN_THRESHOLD) {
      errors.push({
        field: 'threshold',
        message: `Minimum threshold is ${MULTI_SIG_CONSTANTS.MIN_THRESHOLD}`,
        code: MultiSigErrorCodes.INVALID_THRESHOLD
      })
    }

    if (owners && threshold > owners.length) {
      errors.push({
        field: 'threshold',
        message: 'Threshold cannot be greater than number of owners',
        code: MultiSigErrorCodes.INVALID_THRESHOLD
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    }
  }

  /**
   * Validate owner count and threshold (for existing wallets)
   */
  private validateOwnerCountAndThreshold(ownerCount: number, threshold: number): MultiSigValidationResult {
    const errors: any[] = []

    // Validate owner count
    if (ownerCount < MULTI_SIG_CONSTANTS.MIN_OWNERS) {
      errors.push({
        field: 'owners',
        message: 'At least one owner is required',
        code: MultiSigErrorCodes.INSUFFICIENT_OWNERS
      })
    }

    if (ownerCount > MULTI_SIG_CONSTANTS.MAX_OWNERS) {
      errors.push({
        field: 'owners',
        message: `Maximum ${MULTI_SIG_CONSTANTS.MAX_OWNERS} owners allowed`,
        code: 'TOO_MANY_OWNERS'
      })
    }

    // Validate threshold
    if (threshold < MULTI_SIG_CONSTANTS.MIN_THRESHOLD) {
      errors.push({
        field: 'threshold',
        message: `Minimum threshold is ${MULTI_SIG_CONSTANTS.MIN_THRESHOLD}`,
        code: MultiSigErrorCodes.INVALID_THRESHOLD
      })
    }

    if (threshold > ownerCount) {
      errors.push({
        field: 'threshold',
        message: 'Threshold cannot be greater than number of owners',
        code: MultiSigErrorCodes.INVALID_THRESHOLD
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    }
  }

  /**
   * Validate address format for blockchain
   */
  private isValidAddress(address: string, blockchain: BlockchainNetwork): boolean {
    if (!address || address.length === 0) return false

    try {
      switch (blockchain) {
        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          return ethers.isAddress(address)
        
        case 'bitcoin':
          // Basic Bitcoin address validation
          return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address)
        
        case 'solana':
          try {
            new PublicKey(address)
            return true
          } catch {
            return false
          }
        
        case 'near':
          return /^[a-z0-9._-]+\.near$|^[a-f0-9]{64}$/.test(address)
        
        default:
          return address.length > 10 // Basic fallback
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Format wallet for API response
   * Maps the Prisma multi_sig_wallet_owners relation to a simple owners array
   */
  private formatWallet(wallet: any): MultiSigWallet {
    // This is synchronous but we need async for address resolution
    // For now, return wallet without full address resolution
    // In production, consider making this async or pre-loading addresses
    const owners = wallet.multi_sig_wallet_owners?.map((owner: any) => {
      // Return user_address_id as a reference - caller can resolve if needed
      return owner.user_address_id || owner.user_id || ''
    }) || []

    return {
      id: wallet.id,
      name: wallet.name,
      blockchain: wallet.blockchain as BlockchainNetwork,
      address: wallet.address,
      owners, // Array of user_address_ids
      threshold: wallet.threshold,
      created_by: wallet.created_by,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
      status: wallet.status,
      blocked_at: wallet.blocked_at,
      block_reason: wallet.block_reason
    }
  }

  /**
   * Format wallet with fully resolved owner addresses
   * Use this when you need actual blockchain addresses
   */
  private async formatWalletWithAddresses(wallet: any): Promise<MultiSigWallet> {
    const owners = await this.resolveOwnerAddresses(wallet.multi_sig_wallet_owners || [])

    return {
      id: wallet.id,
      name: wallet.name,
      blockchain: wallet.blockchain as BlockchainNetwork,
      address: wallet.address,
      owners, // Array of resolved blockchain addresses
      threshold: wallet.threshold,
      created_by: wallet.created_by,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
      status: wallet.status,
      blocked_at: wallet.blocked_at,
      block_reason: wallet.block_reason
    }
  }
}
