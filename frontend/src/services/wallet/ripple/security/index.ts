/**
 * XRPL Security Services
 * Multi-signature and key management functionality
 */

import { Client } from 'xrpl'
import { XRPLMultiSigService } from './XRPLMultiSigService'
import { XRPLMultiSigDatabaseService } from './XRPLMultiSigDatabaseService'
import { XRPLKeyRotationService } from './XRPLKeyRotationService'
import { XRPLKeyRotationDatabaseService } from './XRPLKeyRotationDatabaseService'
import { xrplWalletService, XRPLWalletService } from '../XRPLWalletService'

// Export types
export * from './types'
export * from './key-rotation-types'

// Export classes for custom instantiation
export { XRPLMultiSigService } from './XRPLMultiSigService'
export { XRPLMultiSigDatabaseService } from './XRPLMultiSigDatabaseService'
export { XRPLKeyRotationService } from './XRPLKeyRotationService'
export { XRPLKeyRotationDatabaseService } from './XRPLKeyRotationDatabaseService'

// Re-export wallet service for convenience
export { XRPLWalletService, xrplWalletService }
export type { ProjectWallet, UserAddress, KeyVaultKey } from '../XRPLWalletService'

// Create singleton instances for convenience
let multiSigServiceInstance: XRPLMultiSigService | null = null
let databaseServiceInstance: XRPLMultiSigDatabaseService | null = null
let keyRotationServiceInstance: XRPLKeyRotationService | null = null
let keyRotationDatabaseServiceInstance: XRPLKeyRotationDatabaseService | null = null

/**
 * Get singleton instance of multi-sig service
 */
export function getMultiSigService(client?: Client): XRPLMultiSigService {
  if (!multiSigServiceInstance || client) {
    if (!client) {
      client = new Client('wss://s.altnet.rippletest.net:51233')
    }
    multiSigServiceInstance = new XRPLMultiSigService(client)
  }
  return multiSigServiceInstance
}

/**
 * Get singleton instance of multi-sig database service
 */
export function getMultiSigDatabaseService(): XRPLMultiSigDatabaseService {
  if (!databaseServiceInstance) {
    databaseServiceInstance = new XRPLMultiSigDatabaseService()
  }
  return databaseServiceInstance
}

/**
 * Get singleton instance of key rotation service
 */
export function getKeyRotationService(client?: Client): XRPLKeyRotationService {
  if (!keyRotationServiceInstance || client) {
    if (!client) {
      client = new Client('wss://s.altnet.rippletest.net:51233')
    }
    keyRotationServiceInstance = new XRPLKeyRotationService(client)
  }
  return keyRotationServiceInstance
}

/**
 * Get singleton instance of key rotation database service
 */
export function getKeyRotationDatabaseService(): XRPLKeyRotationDatabaseService {
  if (!keyRotationDatabaseServiceInstance) {
    keyRotationDatabaseServiceInstance = new XRPLKeyRotationDatabaseService()
  }
  return keyRotationDatabaseServiceInstance
}

// Export camelCase singleton getters for convenience
export const xrplMultiSigService = getMultiSigService()
export const xrplMultiSigDatabaseService = getMultiSigDatabaseService()
export const xrplKeyRotationService = getKeyRotationService()
export const xrplKeyRotationDatabaseService = getKeyRotationDatabaseService()
