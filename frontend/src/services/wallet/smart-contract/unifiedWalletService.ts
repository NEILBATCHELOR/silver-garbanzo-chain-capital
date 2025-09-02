/**
 * Frontend service for UnifiedWalletInterface
 * Connects frontend components to backend smart contract wallet services
 */

import { supabase } from '@/infrastructure/database/client'

export interface UnifiedWallet {
  id: string
  investorId: string
  name: string
  walletType: 'traditional' | 'smart_contract' | 'hybrid'
  primaryAddress: string
  addresses: Record<string, string>
  blockchains: string[]
  status: string
  capabilities: WalletCapabilities
  smartContract?: {
    diamondProxyAddress: string
    implementationVersion: string
    facets: string[]
    isDeployed: boolean
  }
  security: {
    isMultiSigEnabled: boolean
    guardianCount: number
    currentSignatureScheme: 'secp256k1' | 'secp256r1' | 'both'
    hasWebAuthn: boolean
    isLocked: boolean
    hasRestrictions: boolean
  }
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
  canSendTransactions: boolean
  canReceiveTokens: boolean
  canSign: boolean
  supportsMultiSig: boolean
  supportsWebAuthn: boolean
  supportsAccountAbstraction: boolean
  supportsGuardianRecovery: boolean
  supportsSignatureMigration: boolean
  supportsRestrictions: boolean
  supportsEmergencyLock: boolean
  supportedBlockchains: string[]
  canAddBlockchains: boolean
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
 * Frontend service for unified wallet management
 */
export class UnifiedWalletService {
  private readonly baseUrl: string

  constructor() {
    // In production, this would be configured via environment variables
    this.baseUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3001'
  }

  /**
   * Get unified wallet with all capabilities
   */
  async getUnifiedWallet(walletId: string): Promise<UnifiedWallet | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`${this.baseUrl}/api/v1/wallets/unified/${walletId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get unified wallet: ${response.statusText}`)
      }

      const result = await response.json()
      return result.success ? result.data : null
    } catch (error) {
      console.error('Failed to get unified wallet:', error)
      return null
    }
  }

  /**
   * List all unified wallets for current user
   */
  async listUnifiedWallets(): Promise<UnifiedWallet[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`${this.baseUrl}/api/v1/wallets/unified`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to list unified wallets: ${response.statusText}`)
      }

      const result = await response.json()
      return result.success ? result.data : []
    } catch (error) {
      console.error('Failed to list unified wallets:', error)
      return []
    }
  }

  /**
   * Upgrade traditional wallet to smart contract wallet
   */
  async upgradeToSmartContract(request: WalletUpgradeRequest): Promise<UnifiedWallet | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`${this.baseUrl}/api/v1/wallets/unified/upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`Failed to upgrade wallet: ${response.statusText}`)
      }

      const result = await response.json()
      return result.success ? result.data : null
    } catch (error) {
      console.error('Failed to upgrade wallet:', error)
      return null
    }
  }

  /**
   * Send unified transaction
   */
  async sendUnifiedTransaction(request: UnifiedTransactionRequest): Promise<{ transactionHash: string } | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`${this.baseUrl}/api/v1/wallets/unified/transaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`Failed to send transaction: ${response.statusText}`)
      }

      const result = await response.json()
      return result.success ? result.data : null
    } catch (error) {
      console.error('Failed to send transaction:', error)
      return null
    }
  }

  /**
   * Enable WebAuthn for wallet
   */
  async enableWebAuthn(
    walletId: string,
    credential: {
      credentialId: string
      publicKey: string
      authenticatorData: string
    }
  ): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`${this.baseUrl}/api/v1/wallets/unified/${walletId}/webauthn`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credential),
      })

      if (!response.ok) {
        throw new Error(`Failed to enable WebAuthn: ${response.statusText}`)
      }

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to enable WebAuthn:', error)
      return false
    }
  }

  /**
   * Get wallet analytics
   */
  async getWalletAnalytics(walletId: string): Promise<any | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`${this.baseUrl}/api/v1/wallets/unified/${walletId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get analytics: ${response.statusText}`)
      }

      const result = await response.json()
      return result.success ? result.data : null
    } catch (error) {
      console.error('Failed to get wallet analytics:', error)
      return null
    }
  }
}

// Export singleton instance
export const unifiedWalletService = new UnifiedWalletService()
