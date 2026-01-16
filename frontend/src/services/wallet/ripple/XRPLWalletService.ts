/**
 * XRPL Wallet Service
 * Handles retrieval and decryption of XRPL wallets from database
 * Supports both project wallets and user wallets (signers)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Wallet } from 'xrpl'

export interface ProjectWallet {
  id: string
  project_id: string
  wallet_address: string
  public_key: string
  private_key: string | null
  mnemonic: string | null
  chain_id: string | null
  non_evm_network: string | null
  wallet_type: string | null
}

export interface UserAddress {
  id: string
  user_id: string
  blockchain: string
  address: string
  encrypted_private_key: string | null
  key_vault_reference: string | null
  signing_method: string | null
  is_active: boolean
}

export interface KeyVaultKey {
  id: string
  key_id: string
  encrypted_key: string
  key_type: string
  metadata: any
  created_by: string | null
  project_wallet_id: string | null
  wallet_id: string | null
  investor_id: string | null
  user_id: string | null
}

export class XRPLWalletService {
  private supabase: SupabaseClient
  private backendUrl: string

  constructor(supabaseUrl?: string, supabaseKey?: string, backendUrl?: string) {
    this.supabase = createClient(
      supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '',
      supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    )
    this.backendUrl = backendUrl || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
  }

  /**
   * Get XRPL wallet for signing (handles all sources)
   * Priority: user_addresses > key_vault_keys > project_wallets
   */
  async getSignerWallet(
    walletAddress: string,
    userId?: string
  ): Promise<Wallet> {
    // 1. Try user_addresses first (for multi-sig signers)
    if (userId) {
      try {
        return await this.getWalletFromUserAddress(userId, walletAddress)
      } catch (error) {
        console.log('[XRPLWalletService] Not found in user_addresses, trying other sources')
      }
    }

    // 2. Try key_vault_keys by address
    try {
      return await this.getWalletFromKeyVault(walletAddress)
    } catch (error) {
      console.log('[XRPLWalletService] Not found in key_vault_keys, trying project_wallets')
    }

    // 3. Fallback to project_wallets
    try {
      return await this.getWalletFromProjectWallets(walletAddress)
    } catch (error) {
      throw new Error(`Wallet not found for address ${walletAddress}`)
    }
  }

  /**
   * Get wallet from user_addresses table
   */
  private async getWalletFromUserAddress(
    userId: string,
    walletAddress: string
  ): Promise<Wallet> {
    const { data, error } = await this.supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('address', walletAddress)
      .eq('blockchain', 'ripple')
      .eq('is_active', true)
      .single()

    if (error || !data) {
      throw new Error('Wallet not found in user_addresses')
    }

    const userAddress = data as UserAddress

    // Try encrypted_private_key first
    if (userAddress.encrypted_private_key) {
      const decryptedKey = await this.decryptPrivateKey(userAddress.encrypted_private_key)
      return Wallet.fromSeed(decryptedKey)
    }

    // Try key_vault_reference
    if (userAddress.key_vault_reference) {
      return await this.getWalletFromKeyVault(userAddress.key_vault_reference)
    }

    throw new Error('No private key found in user address')
  }

  /**
   * Get wallet from key_vault_keys table
   */
  private async getWalletFromKeyVault(
    keyIdOrAddress: string
  ): Promise<Wallet> {
    const { data, error } = await this.supabase
      .from('key_vault_keys')
      .select('*')
      .or(`key_id.eq.${keyIdOrAddress},metadata->>address.eq.${keyIdOrAddress}`)
      .in('key_type', ['ripple_seed', 'xrpl_seed', 'private_key'])
      .single()

    if (error || !data) {
      throw new Error('Wallet not found in key_vault_keys')
    }

    const keyVaultKey = data as KeyVaultKey

    // Decrypt the key
    const decryptedKey = await this.decryptPrivateKey(keyVaultKey.encrypted_key)

    // Create wallet based on key type
    if (keyVaultKey.key_type.includes('mnemonic')) {
      return Wallet.fromMnemonic(decryptedKey)
    } else {
      return Wallet.fromSeed(decryptedKey)
    }
  }

  /**
   * Get wallet from project_wallets table
   */
  private async getWalletFromProjectWallets(
    walletAddress: string
  ): Promise<Wallet> {
    const { data, error } = await this.supabase
      .from('project_wallets')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('non_evm_network', 'ripple')
      .single()

    if (error || !data) {
      throw new Error('Wallet not found in project_wallets')
    }

    return this.createWalletFromData(data as ProjectWallet)
  }

  /**
   * Get XRPL wallet by project ID and wallet address
   * (Legacy method - kept for backward compatibility)
   */
  async getWalletByAddress(
    projectId: string,
    walletAddress: string
  ): Promise<Wallet> {
    const { data, error } = await this.supabase
      .from('project_wallets')
      .select('*')
      .eq('project_id', projectId)
      .eq('wallet_address', walletAddress)
      .eq('non_evm_network', 'ripple')
      .single()

    if (error || !data) {
      throw new Error(`Wallet not found for project ${projectId}`)
    }

    return this.createWalletFromData(data as ProjectWallet)
  }

  /**
   * Get XRPL wallet by wallet ID
   */
  async getWalletById(walletId: string): Promise<Wallet> {
    const { data, error } = await this.supabase
      .from('project_wallets')
      .select('*')
      .eq('id', walletId)
      .eq('non_evm_network', 'ripple')
      .single()

    if (error || !data) {
      throw new Error('Wallet not found')
    }

    return this.createWalletFromData(data as ProjectWallet)
  }

  /**
   * Get all XRPL wallets for a project
   */
  async getProjectWallets(projectId: string): Promise<ProjectWallet[]> {
    const { data, error } = await this.supabase
      .from('project_wallets')
      .select('*')
      .eq('project_id', projectId)
      .eq('non_evm_network', 'ripple')

    if (error) {
      throw new Error(`Failed to get project wallets: ${error.message}`)
    }

    return data as ProjectWallet[]
  }

  /**
   * Get user's XRPL addresses
   */
  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    const { data, error } = await this.supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('blockchain', 'ripple')
      .eq('is_active', true)

    if (error) {
      throw new Error(`Failed to get user addresses: ${error.message}`)
    }

    return data as UserAddress[]
  }

  /**
   * Create XRPL Wallet instance from database wallet data
   */
  private async createWalletFromData(walletData: ProjectWallet): Promise<Wallet> {
    // Decrypt private key if it exists
    if (walletData.private_key) {
      try {
        const decryptedKey = await this.decryptPrivateKey(walletData.private_key)
        return Wallet.fromSeed(decryptedKey)
      } catch (error) {
        console.error('[XRPLWalletService] Failed to decrypt private key:', error)
        throw new Error('Failed to decrypt wallet private key')
      }
    }

    // If mnemonic exists, use that
    if (walletData.mnemonic) {
      try {
        const decryptedMnemonic = await this.decryptPrivateKey(walletData.mnemonic)
        return Wallet.fromMnemonic(decryptedMnemonic)
      } catch (error) {
        console.error('[XRPLWalletService] Failed to decrypt mnemonic:', error)
        throw new Error('Failed to decrypt wallet mnemonic')
      }
    }

    throw new Error('Wallet has no private key or mnemonic')
  }

  /**
   * Decrypt private key using backend encryption service
   */
  private async decryptPrivateKey(encryptedKey: string): Promise<string> {
    try {
      const response = await fetch(`${this.backendUrl}/api/wallet/decrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ encrypted: encryptedKey })
      })

      if (!response.ok) {
        throw new Error(`Decryption failed: ${response.statusText}`)
      }

      const { plaintext } = await response.json()
      return plaintext
    } catch (error) {
      throw new Error(`Failed to decrypt private key: ${(error as Error).message}`)
    }
  }

  /**
   * Validate that a wallet address exists and belongs to the project
   */
  async validateWallet(projectId: string, walletAddress: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('project_wallets')
      .select('id')
      .eq('project_id', projectId)
      .eq('wallet_address', walletAddress)
      .eq('non_evm_network', 'ripple')
      .single()

    return !error && !!data
  }
}

// Export singleton instance
export const xrplWalletService = new XRPLWalletService()
