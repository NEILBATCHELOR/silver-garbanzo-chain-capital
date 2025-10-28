/**
 * PSP Balances Service
 * Service for managing balance information
 */

import { BaseApiService } from '../base/BaseApiService'
import { ApiResponse } from '@/types/core/api'
import {
  PspBalance,
  BalancesSummary,
  BalanceListFilters,
  SyncBalancesRequest
} from '@/types/psp'

class PspBalancesService extends BaseApiService {
  constructor() {
    super('/api/psp')
  }

  /**
   * Get all balances for a project
   */
  async listBalances(filters?: BalanceListFilters): Promise<ApiResponse<PspBalance[]>> {
    return this.get<PspBalance[]>('/balances', filters)
  }

  /**
   * Get balances summary with USD values
   */
  async getBalancesSummary(projectId: string): Promise<ApiResponse<BalancesSummary>> {
    return this.get<BalancesSummary>('/balances/summary', { project_id: projectId })
  }

  /**
   * Get a specific balance by ID
   */
  async getBalance(id: string): Promise<ApiResponse<PspBalance>> {
    return this.get<PspBalance>(`/balances/${id}`)
  }

  /**
   * Sync balances with Warp
   */
  async syncBalances(data: SyncBalancesRequest): Promise<ApiResponse<PspBalance[]>> {
    return this.post<PspBalance[]>('/balances/sync', data)
  }

  /**
   * Get Warp wallets info
   */
  async getWallets(projectId: string): Promise<ApiResponse<any>> {
    return this.get<any>('/wallets', { project_id: projectId })
  }
}

export const pspBalancesService = new PspBalancesService()
