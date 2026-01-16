/**
 * XRPL Security Services
 * Multi-signature and key management functionality
 */

import { Client } from 'xrpl'
import { XRPLMultiSigService } from './XRPLMultiSigService'
import { XRPLMultiSigDatabaseService } from './XRPLMultiSigDatabaseService'
import { xrplWalletService, XRPLWalletService } from '../XRPLWalletService'

// Export types
export * from './types'

// Export classes for custom instantiation
export { XRPLMultiSigService } from './XRPLMultiSigService'
export { XRPLMultiSigDatabaseService } from './XRPLMultiSigDatabaseService'

// Re-export wallet service for convenience
export { XRPLWalletService, xrplWalletService }
export type { ProjectWallet, UserAddress, KeyVaultKey } from '../XRPLWalletService'

// Create singleton instances for convenience
// Note: Client will be initialized lazily or passed in when needed
let multiSigServiceInstance: XRPLMultiSigService | null = null
let databaseServiceInstance: XRPLMultiSigDatabaseService | null = null

/**
 * Get singleton instance of multi-sig service
 * Creates new client if needed
 */
export function getMultiSigService(client?: Client): XRPLMultiSigService {
  if (!multiSigServiceInstance || client) {
    if (!client) {
      // Create default testnet client
      client = new Client('wss://s.altnet.rippletest.net:51233')
    }
    multiSigServiceInstance = new XRPLMultiSigService(client)
  }
  return multiSigServiceInstance
}

/**
 * Get singleton instance of database service
 */
export function getMultiSigDatabaseService(): XRPLMultiSigDatabaseService {
  if (!databaseServiceInstance) {
    databaseServiceInstance = new XRPLMultiSigDatabaseService()
  }
  return databaseServiceInstance
}

// Export camelCase singleton getters for convenience
export const xrplMultiSigService = getMultiSigService()
export const xrplMultiSigDatabaseService = getMultiSigDatabaseService()
