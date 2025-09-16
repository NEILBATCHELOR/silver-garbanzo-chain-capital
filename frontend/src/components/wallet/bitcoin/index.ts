/**
 * Bitcoin Wallet Components
 * 
 * Export all Bitcoin-specific wallet components and utilities
 * Handles UTXO management, transaction building, and Lightning Network integration
 */

export { BitcoinTransactionBuilder } from './BitcoinTransactionBuilder'
export { UTXOManager } from './UTXOManager'

// Re-export types if needed
export type * from './BitcoinTransactionBuilder'
export type * from './UTXOManager'
