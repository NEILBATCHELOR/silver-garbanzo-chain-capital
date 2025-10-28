/**
 * PSP API Keys Types
 * Type definitions for PSP API key management
 */

export type ApiKeyEnvironment = 'sandbox' | 'production'
export type ApiKeyStatus = 'active' | 'suspended' | 'revoked'

export interface PspApiKey {
  id: string
  project_id: string
  key_description: string
  key_hash: string
  warp_api_key_vault_id: string | null
  environment: ApiKeyEnvironment
  ip_whitelist: string[] | null
  status: ApiKeyStatus
  last_used_at: string | null
  usage_count: number
  created_by: string | null
  created_at: string
  updated_at: string
  expires_at: string | null
}

export interface CreateApiKeyRequest {
  project_id: string
  key_description: string
  environment: ApiKeyEnvironment
  ip_whitelist?: string[]
  expires_at?: string
  warp_api_key?: string
}

export interface CreateApiKeyResponse {
  api_key: PspApiKey
  plain_text_key: string
}

export interface UpdateApiKeyRequest {
  key_description?: string
  ip_whitelist?: string[]
  status?: ApiKeyStatus
  expires_at?: string | null
}

export interface ApiKeyListFilters {
  environment?: ApiKeyEnvironment
  status?: ApiKeyStatus
  project_id?: string
}
