/**
 * PSP API Keys Types
 * Type definitions for PSP API key management
 */

export type ApiKeyEnvironment = 'sandbox' | 'production'
export type ApiKeyStatus = 'active' | 'suspended' | 'revoked'

export interface PspApiKey {
  id: string
  projectId: string
  description: string
  environment: ApiKeyEnvironment
  ipWhitelist: string[]
  status: ApiKeyStatus
  lastUsedAt: string | null
  createdAt: string | null
  expiresAt: string | null
}

export interface CreateApiKeyRequest {
  project_id: string
  description: string
  environment: ApiKeyEnvironment
  ipWhitelist?: string[]
  expiresAt?: string
  warpApiKey?: string
}

export interface CreateApiKeyResponse {
  id: string
  projectId: string
  apiKey: string  // Plain text API key (only returned once during creation)
  description: string
  environment: ApiKeyEnvironment
  ipWhitelist: string[]
  status: ApiKeyStatus
  lastUsedAt: string | null
  createdAt: string | null
  expiresAt: string | null
}

export interface UpdateApiKeyRequest {
  description?: string
  ipWhitelist?: string[]
  status?: ApiKeyStatus
  expiresAt?: string | null
}

export interface ApiKeyListFilters {
  environment?: ApiKeyEnvironment
  status?: ApiKeyStatus
  project_id?: string
}
