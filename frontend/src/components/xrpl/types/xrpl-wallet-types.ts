/**
 * XRPL Wallet Type Definitions
 * 
 * Defines the internal wallet representation used across XRPL components
 */

import type { ProjectWalletData } from '@/services/project/project-wallet-service'
import { Wallet as XRPLWallet } from 'xrpl'

/**
 * Selected XRPL Wallet
 * Internal representation of a selected wallet for XRPL operations
 */
export interface SelectedXRPLWallet {
  walletId: string
  address: string
  privateKey?: string // XRPL hex private key (NOT seed)
  publicKey?: string
  network: string
  isNativeXRPL?: boolean
}

/**
 * Convert ProjectWalletData to SelectedXRPLWallet
 * Handles mapping between database model and internal XRPL format
 * 
 * FOLLOWS SOLANA PATTERN: No validation, just pass decrypted key through
 * Database stores hex privateKey (NOT base58 seed)
 * Use with: new Wallet(publicKey, privateKey) NOT Wallet.fromSeed()
 */
export function convertToSelectedXRPLWallet(
  projectWallet: ProjectWalletData & { decryptedPrivateKey?: string }
): SelectedXRPLWallet | null {
  // Validate required fields
  if (!projectWallet.id || !projectWallet.wallet_address) {
    console.error('Invalid project wallet data:', projectWallet)
    return null
  }

  // Determine if this is a native XRPL wallet
  const isNativeXRPL = !!projectWallet.non_evm_network && 
                       (projectWallet.non_evm_network.toLowerCase().includes('xrpl') ||
                        projectWallet.non_evm_network.toLowerCase().includes('ripple'))

  // SOLANA PATTERN: Just pass through decrypted key, no validation
  // If wallets have balances, the keys are valid
  return {
    walletId: projectWallet.id,
    address: projectWallet.wallet_address,
    privateKey: projectWallet.decryptedPrivateKey,
    publicKey: projectWallet.public_key || undefined,
    network: projectWallet.net || 'testnet',
    isNativeXRPL
  }
}
