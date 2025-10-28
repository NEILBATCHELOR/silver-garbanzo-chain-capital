/**
 * PSP Payment Settings Service
 * Service for managing payment automation settings
 */

import { apiClient } from '@/utils/apiClient'
import type {
  PspPaymentSettings,
  UpdatePaymentSettingsRequest
} from '@/types/psp/settings'

const BASE_PATH = '/api/psp/settings'

export const pspSettingsService = {
  /**
   * Get payment settings for a project
   */
  async getSettings(projectId: string) {
    return apiClient.get<PspPaymentSettings>(`${BASE_PATH}`, {
      params: { project_id: projectId }
    })
  },

  /**
   * Update payment settings
   */
  async updateSettings(data: UpdatePaymentSettingsRequest) {
    return apiClient.put<PspPaymentSettings>(`${BASE_PATH}`, data)
  }
}
