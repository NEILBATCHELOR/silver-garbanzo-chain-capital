/**
 * PSP API Keys Service
 * Service for managing PSP API keys
 */

import { BaseApiService } from '../base/BaseApiService'
import { ApiResponse } from '@/types/core/api'
import {
  PspApiKey,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateApiKeyRequest,
  ApiKeyListFilters
} from '@/types/psp'
import { supabase } from '@/infrastructure/database/client'

class PspApiKeysService extends BaseApiService {
  constructor() {
    super('/api/psp')
  }

  /**
   * Get JWT token from Supabase auth session
   */
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  /**
   * Ensure authentication token is set before making requests
   */
  private async ensureAuthenticated(): Promise<void> {
    const token = await this.getAuthToken()
    if (token) {
      this.setToken(token)
    }
  }

  /**
   * Get all API keys for a project
   */
  async listApiKeys(filters?: ApiKeyListFilters): Promise<ApiResponse<PspApiKey[]>> {
    await this.ensureAuthenticated()
    return this.get<PspApiKey[]>('/api-keys', filters)
  }

  /**
   * Get a specific API key by ID
   */
  async getApiKey(id: string): Promise<ApiResponse<PspApiKey>> {
    await this.ensureAuthenticated()
    return this.get<PspApiKey>(`/api-keys/${id}`)
  }

  /**
   * Create a new API key
   */
  async createApiKey(projectId: string, data: Omit<CreateApiKeyRequest, 'project_id'>): Promise<ApiResponse<CreateApiKeyResponse>> {
    await this.ensureAuthenticated()
    return this.post<CreateApiKeyResponse>(`/api-keys?project_id=${projectId}`, data)
  }

  /**
   * Update an existing API key
   */
  async updateApiKey(id: string, data: UpdateApiKeyRequest): Promise<ApiResponse<PspApiKey>> {
    await this.ensureAuthenticated()
    return this.put<PspApiKey>(`/api-keys/${id}`, data)
  }

  /**
   * Delete/revoke an API key
   */
  async revokeApiKey(id: string): Promise<ApiResponse<void>> {
    await this.ensureAuthenticated()
    return this.delete<void>(`/api-keys/${id}`)
  }

  /**
   * Add IP address to whitelist
   */
  async addIpToWhitelist(id: string, ipAddress: string): Promise<ApiResponse<PspApiKey>> {
    await this.ensureAuthenticated()
    return this.post<PspApiKey>(`/api-keys/${id}/ips`, { ip_address: ipAddress })
  }

  /**
   * Remove IP address from whitelist
   */
  async removeIpFromWhitelist(id: string, ipAddress: string): Promise<ApiResponse<PspApiKey>> {
    await this.ensureAuthenticated()
    return this.delete<PspApiKey>(`/api-keys/${id}/ips/${encodeURIComponent(ipAddress)}`)
  }
}

export const pspApiKeysService = new PspApiKeysService()
