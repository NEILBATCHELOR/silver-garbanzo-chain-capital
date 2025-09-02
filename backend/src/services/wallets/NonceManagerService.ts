import { BaseService } from '../BaseService'
import { ServiceResult } from '../../types/api'
import {
  BlockchainNetwork,
  NonceInfo
} from './types'
import { ethers } from 'ethers'
import { Connection } from '@solana/web3.js'

/**
 * Nonce management service for preventing double-spending
 * Handles nonce reservation, confirmation, and cleanup across multiple blockchains
 */
export class NonceManagerService extends BaseService {
  private providers: Map<BlockchainNetwork, any> = new Map()
  private nonceCache: Map<string, NonceInfo> = new Map()
  private reservedNonces: Map<string, Set<number>> = new Map()
  private readonly NONCE_EXPIRY_MS = 300000 // 5 minutes

  constructor() {
    super('NonceManager')
    this.initializeProviders()
    this.startCleanupInterval()
  }

  /**
   * Initialize blockchain providers for nonce queries
   */
  private initializeProviders(): void {
    try {
      // Ethereum family providers (account-based blockchains with nonces)
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

      // Note: Solana, Bitcoin, and NEAR don't use account nonces like Ethereum
      // They have different anti-double-spending mechanisms

    } catch (error) {
      this.logger.warn('Failed to initialize some nonce manager providers:', error)
    }
  }

  /**
   * Reserve a nonce for a transaction
   */
  async reserveNonce(
    walletId: string, 
    blockchain: BlockchainNetwork,
    specificNonce?: number
  ): Promise<ServiceResult<{ nonce: number; expires_at: string }>> {
    try {
      this.logger.info('Reserving nonce', { walletId, blockchain, specificNonce })

      // Check if blockchain uses nonces
      if (!this.blockchainUsesNonces(blockchain)) {
        // For UTXO and other non-nonce blockchains, return a placeholder
        return this.success({
          nonce: 0,
          expires_at: new Date(Date.now() + this.NONCE_EXPIRY_MS).toISOString()
        })
      }

      const cacheKey = `${walletId}_${blockchain}`
      
      // Get current nonce info
      const nonceInfo = await this.getNonceInfo(walletId, blockchain)
      if (!nonceInfo.success) {
        return this.error(nonceInfo.error || 'Failed to get nonce info', nonceInfo.code || 'NONCE_INFO_FAILED')
      }

      const currentInfo = nonceInfo.data!
      let nonce: number

      if (specificNonce !== undefined) {
        // Use specific nonce if provided
        nonce = specificNonce
        
        // Validate that the specific nonce is valid
        if (nonce < currentInfo.current_nonce) {
          return this.error('Cannot use nonce lower than current nonce', 'INVALID_NONCE')
        }
        
        // Check if nonce is already reserved
        const reservedSet = this.reservedNonces.get(cacheKey) || new Set()
        if (reservedSet.has(nonce)) {
          return this.error('Nonce already reserved', 'NONCE_ALREADY_RESERVED')
        }
      } else {
        // Find next available nonce
        nonce = await this.findNextAvailableNonce(walletId, blockchain, currentInfo)
      }

      // Reserve the nonce
      const reservedSet = this.reservedNonces.get(cacheKey) || new Set()
      reservedSet.add(nonce)
      this.reservedNonces.set(cacheKey, reservedSet)

      // Update cache
      const updatedInfo: NonceInfo = {
        ...currentInfo,
        pending_nonce: Math.max(currentInfo.pending_nonce, nonce + 1),
        last_updated: new Date().toISOString()
      }
      this.nonceCache.set(cacheKey, updatedInfo)

      // Store reservation in database
      await this.storeNonceReservation(walletId, blockchain, nonce)

      const expiresAt = new Date(Date.now() + this.NONCE_EXPIRY_MS).toISOString()

      this.logger.info('Nonce reserved successfully', { 
        walletId, 
        blockchain, 
        nonce,
        expiresAt
      })

      return this.success({ nonce, expires_at: expiresAt })

    } catch (error) {
      this.logger.error('Failed to reserve nonce:', error)
      return this.error('Failed to reserve nonce', 'NONCE_RESERVATION_FAILED')
    }
  }

  /**
   * Confirm that a nonce has been used (transaction broadcast successfully)
   */
  async confirmNonce(
    walletId: string,
    blockchain: BlockchainNetwork,
    nonce: number
  ): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('Confirming nonce usage', { walletId, blockchain, nonce })

      // Check if blockchain uses nonces
      if (!this.blockchainUsesNonces(blockchain)) {
        return this.success(true)
      }

      const cacheKey = `${walletId}_${blockchain}`

      // Remove from reserved nonces
      const reservedSet = this.reservedNonces.get(cacheKey)
      if (reservedSet) {
        reservedSet.delete(nonce)
        if (reservedSet.size === 0) {
          this.reservedNonces.delete(cacheKey)
        } else {
          this.reservedNonces.set(cacheKey, reservedSet)
        }
      }

      // Update nonce info
      const nonceInfo = this.nonceCache.get(cacheKey)
      if (nonceInfo) {
        const updatedInfo: NonceInfo = {
          ...nonceInfo,
          current_nonce: Math.max(nonceInfo.current_nonce, nonce + 1),
          last_updated: new Date().toISOString()
        }
        this.nonceCache.set(cacheKey, updatedInfo)
      }

      // Remove reservation from database
      await this.removeNonceReservation(walletId, blockchain, nonce)

      this.logger.info('Nonce confirmed successfully', { walletId, blockchain, nonce })

      return this.success(true)

    } catch (error) {
      this.logger.error('Failed to confirm nonce:', error)
      return this.error('Failed to confirm nonce', 'NONCE_CONFIRMATION_FAILED')
    }
  }

  /**
   * Release a reserved nonce (transaction cancelled or failed)
   */
  async releaseNonce(
    walletId: string,
    blockchain: BlockchainNetwork,
    nonce: number
  ): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('Releasing nonce', { walletId, blockchain, nonce })

      // Check if blockchain uses nonces
      if (!this.blockchainUsesNonces(blockchain)) {
        return this.success(true)
      }

      const cacheKey = `${walletId}_${blockchain}`

      // Remove from reserved nonces
      const reservedSet = this.reservedNonces.get(cacheKey)
      if (reservedSet) {
        reservedSet.delete(nonce)
        if (reservedSet.size === 0) {
          this.reservedNonces.delete(cacheKey)
        } else {
          this.reservedNonces.set(cacheKey, reservedSet)
        }
      }

      // Remove reservation from database
      await this.removeNonceReservation(walletId, blockchain, nonce)

      this.logger.info('Nonce released successfully', { walletId, blockchain, nonce })

      return this.success(true)

    } catch (error) {
      this.logger.error('Failed to release nonce:', error)
      return this.error('Failed to release nonce', 'NONCE_RELEASE_FAILED')
    }
  }

  /**
   * Get current nonce information for a wallet
   */
  async getNonceInfo(walletId: string, blockchain: BlockchainNetwork): Promise<ServiceResult<NonceInfo>> {
    try {
      this.logger.debug('Getting nonce info', { walletId, blockchain })

      // Check if blockchain uses nonces
      if (!this.blockchainUsesNonces(blockchain)) {
        const info: NonceInfo = {
          wallet_id: walletId,
          blockchain,
          current_nonce: 0,
          pending_nonce: 0,
          last_updated: new Date().toISOString()
        }
        return this.success(info)
      }

      const cacheKey = `${walletId}_${blockchain}`

      // Check cache first
      const cached = this.nonceCache.get(cacheKey)
      if (cached && this.isCacheValid(cached)) {
        return this.success(cached)
      }

      // Get wallet address
      const walletAddress = await this.getWalletAddress(walletId, blockchain)
      if (!walletAddress) {
        return this.error('Wallet address not found', 'WALLET_ADDRESS_NOT_FOUND')
      }

      // Get on-chain nonce
      const onChainNonce = await this.getOnChainNonce(blockchain, walletAddress)
      
      // Calculate pending nonce (considering reserved nonces)
      const reservedSet = this.reservedNonces.get(cacheKey) || new Set()
      const maxReserved = reservedSet.size > 0 ? Math.max(...Array.from(reservedSet)) : onChainNonce - 1
      const pendingNonce = Math.max(onChainNonce, maxReserved + 1)

      const nonceInfo: NonceInfo = {
        wallet_id: walletId,
        blockchain,
        current_nonce: onChainNonce,
        pending_nonce: pendingNonce,
        last_updated: new Date().toISOString()
      }

      // Cache the result
      this.nonceCache.set(cacheKey, nonceInfo)

      return this.success(nonceInfo)

    } catch (error) {
      this.logger.error('Failed to get nonce info:', error)
      return this.error('Failed to get nonce info', 'NONCE_INFO_FAILED')
    }
  }

  /**
   * Find the next available nonce for a wallet
   */
  private async findNextAvailableNonce(
    walletId: string,
    blockchain: BlockchainNetwork,
    currentInfo: NonceInfo
  ): Promise<number> {
    const cacheKey = `${walletId}_${blockchain}`
    const reservedSet = this.reservedNonces.get(cacheKey) || new Set()

    let nonce = currentInfo.current_nonce
    
    // Find first non-reserved nonce
    while (reservedSet.has(nonce)) {
      nonce++
    }

    return nonce
  }

  /**
   * Get on-chain nonce for an address
   */
  private async getOnChainNonce(blockchain: BlockchainNetwork, address: string): Promise<number> {
    const provider = this.providers.get(blockchain)
    if (!provider) {
      throw new Error(`No provider configured for ${blockchain}`)
    }

    switch (blockchain) {
      case 'ethereum':
      case 'polygon':
      case 'arbitrum':
      case 'optimism':
      case 'avalanche':
        return await provider.getTransactionCount(address, 'pending')

      default:
        // For non-nonce blockchains, return 0
        return 0
    }
  }

  /**
   * Get wallet address for a specific blockchain
   */
  private async getWalletAddress(walletId: string, blockchain: BlockchainNetwork): Promise<string | null> {
    try {
      // This would typically query the database or wallet service
      // For now, we'll return a placeholder
      return `0x${'0'.repeat(40)}` // Placeholder address
    } catch (error) {
      this.logger.error('Failed to get wallet address:', error)
      return null
    }
  }

  /**
   * Check if blockchain uses account nonces
   */
  private blockchainUsesNonces(blockchain: BlockchainNetwork): boolean {
    const nonceBlockchains: BlockchainNetwork[] = [
      'ethereum',
      'polygon', 
      'arbitrum',
      'optimism',
      'avalanche'
    ]
    
    return nonceBlockchains.includes(blockchain)
  }

  /**
   * Check if cached nonce info is still valid
   */
  private isCacheValid(nonceInfo: NonceInfo): boolean {
    const age = Date.now() - new Date(nonceInfo.last_updated).getTime()
    return age < 30000 // 30 seconds
  }

  /**
   * Store nonce reservation in database
   */
  private async storeNonceReservation(
    walletId: string,
    blockchain: BlockchainNetwork,
    nonce: number
  ): Promise<void> {
    try {
      // Store in nonce_reservations table
      this.logger.debug('Storing nonce reservation', { walletId, blockchain, nonce })
      
      // Implementation would depend on your database schema
      // Example:
      // await this.db.nonce_reservations.create({
      //   data: {
      //     wallet_id: walletId,
      //     blockchain,
      //     nonce,
      //     reserved_at: new Date(),
      //     expires_at: new Date(Date.now() + this.NONCE_EXPIRY_MS)
      //   }
      // })
      
    } catch (error) {
      this.logger.error('Failed to store nonce reservation:', error)
    }
  }

  /**
   * Remove nonce reservation from database
   */
  private async removeNonceReservation(
    walletId: string,
    blockchain: BlockchainNetwork,
    nonce: number
  ): Promise<void> {
    try {
      // Remove from nonce_reservations table
      this.logger.debug('Removing nonce reservation', { walletId, blockchain, nonce })
      
      // Implementation would depend on your database schema
      // Example:
      // await this.db.nonce_reservations.deleteMany({
      //   where: {
      //     wallet_id: walletId,
      //     blockchain,
      //     nonce
      //   }
      // })
      
    } catch (error) {
      this.logger.error('Failed to remove nonce reservation:', error)
    }
  }

  /**
   * Start cleanup interval to remove expired reservations
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredReservations()
    }, 60000) // Run every minute
  }

  /**
   * Clean up expired nonce reservations
   */
  private async cleanupExpiredReservations(): Promise<void> {
    try {
      this.logger.debug('Cleaning up expired nonce reservations')

      // Clean up expired database reservations
      // Implementation would depend on your database schema
      // Example:
      // await this.db.nonce_reservations.deleteMany({
      //   where: {
      //     expires_at: {
      //       lt: new Date()
      //     }
      //   }
      // })

      // Clean up memory cache
      // For simplicity, we'll clear all reservations older than expiry time
      // In practice, you'd track individual expiry times
      const expiredKeys = Array.from(this.reservedNonces.keys()).filter(key => {
        // This is a simplified check - in practice you'd track individual nonce expiry times
        return false
      })

      expiredKeys.forEach(key => {
        this.reservedNonces.delete(key)
      })

      if (expiredKeys.length > 0) {
        this.logger.info('Cleaned up expired nonce reservations', { count: expiredKeys.length })
      }

    } catch (error) {
      this.logger.error('Failed to cleanup expired reservations:', error)
    }
  }

  /**
   * Get all reserved nonces for a wallet (for debugging)
   */
  getReservedNonces(walletId: string, blockchain: BlockchainNetwork): number[] {
    const cacheKey = `${walletId}_${blockchain}`
    const reservedSet = this.reservedNonces.get(cacheKey)
    return reservedSet ? Array.from(reservedSet).sort((a, b) => a - b) : []
  }

  /**
   * Clear all nonce cache (for testing)
   */
  clearCache(): void {
    this.nonceCache.clear()
    this.reservedNonces.clear()
    this.logger.info('Nonce cache cleared')
  }
}