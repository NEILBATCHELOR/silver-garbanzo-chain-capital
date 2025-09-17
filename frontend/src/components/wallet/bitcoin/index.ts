/**
 * Bitcoin Wallet Components
 * 
 * Export all Bitcoin-specific wallet components and utilities
 * Handles UTXO management, transaction building, Lightning Network integration,
 * hardware wallet security, and comprehensive testing capabilities
 */

// Core Bitcoin Components
export { BitcoinTransactionBuilder } from './BitcoinTransactionBuilder'
export { UTXOManager } from './UTXOManager'

// Lightning Network Components
export { LightningInvoiceGenerator } from './LightningInvoiceGenerator'
export { LightningPaymentInterface } from './LightningPaymentInterface'
export { PaymentChannelManager } from './PaymentChannelManager'

// Security & Hardware Wallet Components
export { BitcoinHardwareWalletIntegration } from './BitcoinHardwareWalletIntegration'

// Testing & Validation Components
export { BitcoinTestingDashboard } from './BitcoinTestingDashboard'

// Re-export types if needed
export type * from './BitcoinTransactionBuilder'
export type * from './UTXOManager'
export type * from './LightningInvoiceGenerator'
export type * from './LightningPaymentInterface'
export type * from './PaymentChannelManager'
export type * from './BitcoinHardwareWalletIntegration'
export type * from './BitcoinTestingDashboard'
