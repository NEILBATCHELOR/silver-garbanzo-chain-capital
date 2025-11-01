/**
 * PSP Webhooks Service
 * API service for webhook management and event handling
 */

import { BaseApiService } from '../base/BaseApiService'
import { ApiResponse } from '@/types/core/api'
import { supabase } from '@/infrastructure/database/client'
import type {
  PspWebhook,
  PspWebhookEvent,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookWithEvents
} from '@/types/psp/webhooks'

class PspWebhooksService extends BaseApiService {
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
   * Get all webhooks for a project
   */
  async getWebhooks(projectId: string): Promise<ApiResponse<PspWebhook[]>> {
    await this.ensureAuthenticated()
    return this.get<PspWebhook[]>(`/webhooks?project_id=${projectId}`)
  }

  /**
   * Get a specific webhook by ID with recent events
   */
  async getWebhook(id: string): Promise<ApiResponse<WebhookWithEvents>> {
    await this.ensureAuthenticated()
    return this.get<WebhookWithEvents>(`/webhooks/${id}`)
  }

  /**
   * Create a new webhook
   */
  async createWebhook(
    projectId: string,
    data: CreateWebhookRequest
  ): Promise<ApiResponse<PspWebhook>> {
    await this.ensureAuthenticated()
    return this.post<PspWebhook>('/webhooks', {
      project_id: projectId,
      ...data
    })
  }

  /**
   * Update a webhook
   */
  async updateWebhook(
    id: string,
    data: UpdateWebhookRequest
  ): Promise<ApiResponse<PspWebhook>> {
    await this.ensureAuthenticated()
    return this.put<PspWebhook>(`/webhooks/${id}`, data)
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(id: string): Promise<ApiResponse<void>> {
    await this.ensureAuthenticated()
    return this.delete<void>(`/webhooks/${id}`)
  }

  /**
   * Test a webhook by triggering a test event
   */
  async testWebhook(id: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    await this.ensureAuthenticated()
    return this.post<{ success: boolean; message: string }>(
      `/webhooks/${id}/test`,
      {}
    )
  }

  /**
   * Get webhook events with optional filters
   */
  async getWebhookEvents(params: {
    project_id: string
    webhook_id?: string
    event_name?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<ApiResponse<{ events: PspWebhookEvent[]; total: number }>> {
    await this.ensureAuthenticated()
    
    const queryParams = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value)
        }
        return acc
      }, {} as Record<string, string>)
    )

    return this.get<{ events: PspWebhookEvent[]; total: number }>(
      `/webhooks/events?${queryParams.toString()}`
    )
  }

  /**
   * Retry a failed webhook event
   */
  async retryEvent(eventId: string): Promise<ApiResponse<PspWebhookEvent>> {
    await this.ensureAuthenticated()
    return this.post<PspWebhookEvent>(`/webhooks/events/${eventId}/retry`, {})
  }
}

export const pspWebhooksService = new PspWebhooksService()
