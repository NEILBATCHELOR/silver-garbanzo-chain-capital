/**
 * PSP Trades Service
 * Service for managing currency trades
 */

import { BaseApiService } from '../base/BaseApiService'
import { ApiResponse } from '@/types/core/api'
import {
  PspTrade,
  TradesSummary,
  TradeListFilters,
  CreateTradeRequest,
  MarketRate
} from '@/types/psp'

class PspTradesService extends BaseApiService {
  constructor() {
    super('/api/psp')
  }

  /**
   * Get all trades for a project
   */
  async listTrades(filters?: TradeListFilters): Promise<ApiResponse<PspTrade[]>> {
    return this.get<PspTrade[]>('/trades', filters)
  }

  /**
   * Get trades summary
   */
  async getTradesSummary(projectId: string): Promise<ApiResponse<TradesSummary>> {
    return this.get<TradesSummary>('/trades/summary', { project_id: projectId })
  }

  /**
   * Get a specific trade by ID
   */
  async getTrade(id: string): Promise<ApiResponse<PspTrade>> {
    return this.get<PspTrade>(`/trades/${id}`)
  }

  /**
   * Create a new trade
   */
  async createTrade(data: CreateTradeRequest): Promise<ApiResponse<PspTrade>> {
    return this.post<PspTrade>('/trades', data)
  }

  /**
   * Get market rates
   */
  async getMarketRates(): Promise<ApiResponse<MarketRate[]>> {
    return this.get<MarketRate[]>('/market-rates')
  }
}

export const pspTradesService = new PspTradesService()
