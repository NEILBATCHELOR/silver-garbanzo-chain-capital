/**
 * PSP Authentication Types
 * Types for API key management and authentication
 */

export interface CreateApiKeyRequest {
  projectId: string
  description: string
  environment: 'sandbox' | 'production'
  expiresAt?: string
}

export interface CreateApiKeyResponse {
  id: string
  key: string // Only shown once during creation
  description: string
  environment: 'sandbox' | 'production'
  status: 'active' | 'suspended' | 'revoked'
  createdAt: string
  expiresAt?: string
}

export interface ApiKey {
  id: string
  projectId: string
  keyHash: string
  keyPreview: string // Masked version: "psp_live_abc...xyz"
  description: string
  environment: 'sandbox' | 'production'
  status: 'active' | 'suspended' | 'revoked'
  ipWhitelist: string[]
  lastUsedAt?: string
  createdAt: string
  updatedAt: string
  expiresAt?: string
}

export interface ApiKeyFilters {
  projectId: string
  page?: number
  limit?: number
  status?: 'active' | 'suspended' | 'revoked'
  environment?: 'sandbox' | 'production'
}

export interface ApiKeyListResponse {
  keys: ApiKey[]
  total: number
  page: number
  limit: number
}

export interface RevokeApiKeyResponse {
  id: string
  status: 'revoked'
  revokedAt: string
  message: string
}

export interface AddIpToWhitelistRequest {
  ip: string
  description?: string
}

export interface AddIpToWhitelistResponse {
  id: string
  ipWhitelist: string[]
  message: string
}

export interface RemoveIpFromWhitelistResponse {
  id: string
  ipWhitelist: string[]
  message: string
}

/**
 * API Key validation result - returned by validateApiKey service method
 */
export interface ApiKeyValidationResult {
  valid: boolean
  reason?: string
  projectId?: string
  keyId?: string
  environment?: 'sandbox' | 'production'
  ipWhitelist?: string[]
}

/**
 * Authenticated API key with decrypted Warp credentials
 * Returned after successful validation for internal use
 */
export interface ValidatedApiKey {
  id: string
  projectId: string
  environment: 'sandbox' | 'production'
  warpApiKey: string
}

/**
 * Request context with PSP authentication
 * Attached to request after successful authentication
 */
export interface PSPAuthContext {
  projectId: string
  apiKeyId: string
  environment: 'sandbox' | 'production'
  ipAddress: string
  warpApiKey: string  // Decrypted Warp API key for making Warp API calls
}

// Extend FastifyRequest to include PSP context
declare module 'fastify' {
  interface FastifyRequest {
    psp?: PSPAuthContext
  }
}
