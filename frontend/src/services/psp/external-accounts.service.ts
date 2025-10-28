/**
 * PSP External Accounts Service
 * Service for managing external fiat and crypto accounts
 */

import { apiClient } from '@/utils/apiClient'
import type {
  PspExternalAccount,
  CreateAchAccountRequest,
  CreateWireAccountRequest,
  CreateCryptoAccountRequest,
  CreatePlaidAccountRequest,
  ExternalAccountsListFilters,
  ExternalAccountsSummary
} from '@/types/psp/external-accounts'

const BASE_PATH = '/api/psp/external-accounts'

export const pspExternalAccountsService = {
  /**
   * Create ACH account
   */
  async createAchAccount(data: CreateAchAccountRequest) {
    return apiClient.post<PspExternalAccount>(`${BASE_PATH}/ach`, data)
  },

  /**
   * Create Wire account
   */
  async createWireAccount(data: CreateWireAccountRequest) {
    return apiClient.post<PspExternalAccount>(`${BASE_PATH}/wire`, data)
  },

  /**
   * Create Crypto account
   */
  async createCryptoAccount(data: CreateCryptoAccountRequest) {
    return apiClient.post<PspExternalAccount>(`${BASE_PATH}/crypto`, data)
  },

  /**
   * Create Plaid account
   */
  async createPlaidAccount(data: CreatePlaidAccountRequest) {
    return apiClient.post<PspExternalAccount>(`${BASE_PATH}/plaid`, data)
  },

  /**
   * List fiat accounts
   */
  async listFiatAccounts(projectId: string) {
    return apiClient.get<PspExternalAccount[]>(`${BASE_PATH}/fiat`, {
      params: { project_id: projectId }
    })
  },

  /**
   * List crypto accounts
   */
  async listCryptoAccounts(projectId: string) {
    return apiClient.get<PspExternalAccount[]>(`${BASE_PATH}/crypto`, {
      params: { project_id: projectId }
    })
  },

  /**
   * List all external accounts with filters
   */
  async listAccounts(filters: ExternalAccountsListFilters) {
    return apiClient.get<PspExternalAccount[]>(BASE_PATH, {
      params: filters
    })
  },

  /**
   * Get accounts summary
   */
  async getAccountsSummary(projectId: string) {
    return apiClient.get<ExternalAccountsSummary>(`${BASE_PATH}/summary`, {
      params: { project_id: projectId }
    })
  },

  /**
   * Get single account
   */
  async getAccount(accountId: string) {
    return apiClient.get<PspExternalAccount>(`${BASE_PATH}/${accountId}`)
  },

  /**
   * Deactivate account
   */
  async deactivateAccount(accountId: string) {
    return apiClient.delete(`${BASE_PATH}/${accountId}`)
  }
}
