/**
 * PSP External Accounts Types
 * Types for external fiat and crypto accounts
 */

export type ExternalAccountType = 'ach' | 'wire' | 'crypto' | 'plaid'

export type CurrencyType = 'fiat' | 'crypto'

export type AccountClassification = 'checking' | 'savings'

export type TransferMethod = 'ach' | 'wire'

export type AccountStatus = 'active' | 'inactive' | 'suspended'

export interface PspExternalAccount {
  id: string
  project_id: string
  warp_account_id: string | null
  account_type: ExternalAccountType
  currency_type: CurrencyType
  
  // Fiat account fields
  routing_number: string | null
  account_number_last4: string | null
  account_holder_name: string | null
  bank_name: string | null
  account_classification: AccountClassification | null
  transfer_method: TransferMethod | null
  
  // Crypto account fields
  network: string | null
  wallet_address: string | null
  
  // Common fields
  description: string
  status: AccountStatus
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface CreateAchAccountRequest {
  project_id: string
  routing_number: string
  account_number: string
  account_classification: AccountClassification
  account_holder_name: string
  description: string
}

export interface CreateWireAccountRequest {
  project_id: string
  routing_number: string
  account_number: string
  account_holder_name: string
  bank_name: string
  description: string
}

export interface CreateCryptoAccountRequest {
  project_id: string
  network: string
  wallet_address: string
  description: string
}

export interface CreatePlaidAccountRequest {
  project_id: string
  plaid_access_token: string
  plaid_account_id: string
  description: string
}

export interface ExternalAccountsListFilters {
  project_id?: string
  account_type?: ExternalAccountType
  currency_type?: CurrencyType
  status?: AccountStatus
  limit?: number
  offset?: number
}

export interface ExternalAccountsSummary {
  total_count: number
  by_type: Record<ExternalAccountType, number>
  by_currency: Record<CurrencyType, number>
  recent_accounts: PspExternalAccount[]
}
