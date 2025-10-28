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

class PspApiKeysService extends BaseApiService {
  constructor() {
    super('/api/psp')
  }

  /**
   * Get all API keys for a project
   */
  async listApiKeys(filters?: ApiKeyListFilters): Promise<ApiResponse<PspApiKey[]>> {
    return this.get<PspApiKey[]>('/api-keys', filters)
  }

  /**
   * Get a specific API key by ID
   */
  async getApiKey(id: string): Promise<ApiResponse<PspApiKey>> {
    return this.get<PspApiKey>(`/api-keys/${id}`)
  }

  /**
   * Create a new API key
   */
  async createApiKey(data: CreateApiKeyRequest): Promise<ApiResponse<CreateApiKeyResponse>> {
    return this.post<CreateApiKeyResponse>('/api-keys', data)
  }

  /**
   * Update an existing API key
   */
  async updateApiKey(id: string, data: UpdateApiKeyRequest): Promise<ApiResponse<PspApiKey>> {
    return this.put<PspApiKey>(`/api-keys/${id}`, data)
  }

  /**
   * Delete/revoke an API key
   */
  async revokeApiKey(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api-keys/${id}`)
  }

  /**
   * Add IP address to whitelist
   */
  async addIpToWhitelist(id: string, ipAddress: string): Promise<ApiResponse<PspApiKey>> {
    return this.post<PspApiKey>(`/api-keys/${id}/ips`, { ip_address: ipAddress })
  }

  /**
   * Remove IP address from whitelist
   */
  async removeIpFromWhitelist(id: string, ipAddress: string): Promise<ApiResponse<PspApiKey>> {
    return this.delete<PspApiKey>(`/api-keys/${id}/ips/${encodeURIComponent(ipAddress)}`)
  }
}

export const pspApiKeysService = new PspApiKeysService()
