/**
 * PSP API Client
 * 
 * Frontend client for interacting with Chain Capital's PSP API.
 * Handles authentication, request/response transformation, error handling, and retry logic.
 */

import type {
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ApiKey,
  ApiKeyFilters,
  ApiKeyListResponse,
  RevokeApiKeyResponse,
  AddIpToWhitelistRequest,
  AddIpToWhitelistResponse,
  RemoveIpFromWhitelistResponse
} from '@/types/psp-auth'

/**
 * PSP API Client Configuration
 */
export interface PSPApiClientConfig {
  baseUrl: string
  apiKey: string
  environment: 'sandbox' | 'production'
  timeout?: number
  retries?: number
}

/**
 * PSP API Error
 */
export class PSPApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'PSPApiError'
  }
}

/**
 * PSP API Client
 */
export class PSPApiClient {
  private baseUrl: string
  private apiKey: string
  private environment: 'sandbox' | 'production'
  private timeout: number
  private retries: number

  constructor(config: PSPApiClientConfig) {
    this.baseUrl = config.baseUrl
    this.apiKey = config.apiKey
    this.environment = config.environment
    this.timeout = config.timeout || 30000 // 30 seconds default
    this.retries = config.retries || 3
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    method: string,
    path: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...options?.headers
    }

    const config: RequestInit = {
      method,
      headers,
      ...options
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data)
    }

    // Retry logic
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const response = await fetch(url, {
          ...config,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new PSPApiError(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorData.error || 'UNKNOWN_ERROR',
            errorData
          )
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return undefined as T
        }

        return await response.json() as T
      } catch (error) {
        lastError = error as Error

        // Don't retry for 4xx errors (except 429 rate limit)
        if (error instanceof PSPApiError) {
          if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
            throw error
          }
        }

        // Don't retry on last attempt
        if (attempt === this.retries) {
          break
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError || new Error('Request failed')
  }

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  /**
   * Create API Key
   * POST /api/psp/auth/api-keys
   */
  async createApiKey(data: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    return this.request<CreateApiKeyResponse>('POST', '/api/psp/auth/api-keys', data)
  }

  /**
   * List API Keys
   * GET /api/psp/auth/api-keys
   */
  async listApiKeys(filters: ApiKeyFilters): Promise<ApiKeyListResponse> {
    const params = new URLSearchParams()
    
    if (filters.projectId) params.append('projectId', filters.projectId)
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.status) params.append('status', filters.status)
    if (filters.environment) params.append('environment', filters.environment)

    return this.request<ApiKeyListResponse>('GET', `/api/psp/auth/api-keys?${params}`)
  }

  /**
   * Revoke API Key
   * DELETE /api/psp/auth/api-keys/{id}
   */
  async revokeApiKey(keyId: string): Promise<RevokeApiKeyResponse> {
    return this.request<RevokeApiKeyResponse>('DELETE', `/api/psp/auth/api-keys/${keyId}`)
  }

  /**
   * Add IP to Whitelist
   * POST /api/psp/auth/api-keys/{id}/ips
   */
  async addIpToWhitelist(
    keyId: string,
    data: AddIpToWhitelistRequest
  ): Promise<AddIpToWhitelistResponse> {
    return this.request<AddIpToWhitelistResponse>(
      'POST',
      `/api/psp/auth/api-keys/${keyId}/ips`,
      data
    )
  }

  /**
   * Remove IP from Whitelist
   * DELETE /api/psp/auth/api-keys/{id}/ips/{ip}
   */
  async removeIpFromWhitelist(
    keyId: string,
    ip: string
  ): Promise<RemoveIpFromWhitelistResponse> {
    return this.request<RemoveIpFromWhitelistResponse>(
      'DELETE',
      `/api/psp/auth/api-keys/${keyId}/ips/${ip}`
    )
  }

  // ============================================================================
  // WEBHOOKS ENDPOINTS (TO BE IMPLEMENTED)
  // ============================================================================

  // TODO: Add webhook endpoints

  // ============================================================================
  // IDENTITY ENDPOINTS (TO BE IMPLEMENTED)
  // ============================================================================

  // TODO: Add identity endpoints

  // ============================================================================
  // EXTERNAL ACCOUNTS ENDPOINTS (TO BE IMPLEMENTED)
  // ============================================================================

  // TODO: Add external account endpoints

  // ============================================================================
  // VIRTUAL ACCOUNTS ENDPOINTS (TO BE IMPLEMENTED)
  // ============================================================================

  // TODO: Add virtual account endpoints

  // ============================================================================
  // PAYMENTS ENDPOINTS (TO BE IMPLEMENTED)
  // ============================================================================

  // TODO: Add payment endpoints

  // ============================================================================
  // TRADES ENDPOINTS (TO BE IMPLEMENTED)
  // ============================================================================

  // TODO: Add trade endpoints

  // ============================================================================
  // BALANCES ENDPOINTS (TO BE IMPLEMENTED)
  // ============================================================================

  // TODO: Add balance endpoints

  // ============================================================================
  // SETTINGS ENDPOINTS (TO BE IMPLEMENTED)
  // ============================================================================

  // TODO: Add settings endpoints

  // ============================================================================
  // TRANSACTIONS ENDPOINTS (TO BE IMPLEMENTED)
  // ============================================================================

  // TODO: Add transaction endpoints
}

/**
 * Create PSP API Client instance
 */
export function createPSPApiClient(config: PSPApiClientConfig): PSPApiClient {
  return new PSPApiClient(config)
}

/**
 * Default PSP API Client for environment
 */
export function getDefaultPSPApiClient(
  apiKey: string,
  environment: 'sandbox' | 'production' = 'production'
): PSPApiClient {
  const baseUrl = environment === 'sandbox' 
    ? import.meta.env.VITE_PSP_SANDBOX_API_URL || 'http://localhost:3000'
    : import.meta.env.VITE_PSP_API_URL || 'http://localhost:3000'

  return new PSPApiClient({
    baseUrl,
    apiKey,
    environment
  })
}

export default PSPApiClient
