/**
 * PSP Identity Service
 * Service for managing KYB/KYC identity verification
 */

import { apiClient } from '@/utils/apiClient'
import type {
  PspIdentityCase,
  CreateIdentityCaseRequest,
  UpdatePersonRequest,
  UpdateBusinessRequest,
  IdentityCasesSummary
} from '@/types/psp/identity'

const BASE_PATH = '/api/psp/identity'

export const pspIdentityService = {
  /**
   * Create a new identity verification case
   */
  async createCase(data: CreateIdentityCaseRequest) {
    return apiClient.post<PspIdentityCase>(`${BASE_PATH}/cases`, data)
  },

  /**
   * Get a single identity case by ID
   */
  async getCase(caseId: string) {
    return apiClient.get<PspIdentityCase>(`${BASE_PATH}/cases/${caseId}`)
  },

  /**
   * List all identity cases for a project
   */
  async listCases(projectId: string) {
    return apiClient.get<PspIdentityCase[]>(`${BASE_PATH}/cases`, {
      params: { project_id: projectId }
    })
  },

  /**
   * Get cases summary
   */
  async getCasesSummary(projectId: string) {
    return apiClient.get<IdentityCasesSummary>(`${BASE_PATH}/cases/summary`, {
      params: { project_id: projectId }
    })
  },

  /**
   * Update person information
   */
  async updatePerson(caseId: string, personIndex: number, data: UpdatePersonRequest) {
    return apiClient.patch<PspIdentityCase>(
      `${BASE_PATH}/cases/${caseId}/persons/${personIndex}`,
      data
    )
  },

  /**
   * Update business information
   */
  async updateBusiness(caseId: string, data: UpdateBusinessRequest) {
    return apiClient.patch<PspIdentityCase>(
      `${BASE_PATH}/cases/${caseId}/business`,
      data
    )
  },

  /**
   * Deactivate identity case
   */
  async deactivateCase(caseId: string) {
    return apiClient.delete(`${BASE_PATH}/cases/${caseId}`)
  }
}
