/**
 * Bonds API Client
 * Type-safe API client for bond operations
 * Mirrors backend routes exactly (Phase 6 API)
 */

import type {
  BondProduct,
  BondProductInput,
  CouponPaymentInput,
  MarketPriceInput,
  CallPutScheduleInputData,
  BondCalculationParams
} from '@/types/nav/bonds'

// API Configuration
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const BONDS_BASE = `${API_BASE}/api/v1/nav/bonds`

// ==================== TYPES ====================

export interface BondProductComplete extends BondProduct {
  coupon_payments?: unknown[]
  market_prices?: unknown[]
  call_put_schedules?: unknown[]
  credit_ratings?: unknown[]
  covenants?: unknown[]
  amortization_schedule?: unknown[]
  sinking_fund?: unknown[]
  events?: unknown[]
}

export interface BulkUploadResult {
  success: boolean
  totalRows: number
  successCount: number
  failureCount: number
  errors: Array<{
    row: number
    field: string
    message: string
    value: unknown
  }>
}

export interface NAVResult {
  bondId: string
  asOfDate: Date
  netAssetValue: number
  calculationMethod: string
  confidenceLevel: 'high' | 'medium' | 'low'
  priorNAV?: number
  breakdown?: {
    cleanPrice?: number
    accruedInterest?: number
    totalValue?: number
    ytm?: number
    duration?: number
    convexity?: number
  }
  metadata: {
    calculatedAt: Date
    calculationDate: Date
    dataSourcesUsed: string[]
    dataSources?: Array<{ source: string; timestamp: Date }>
    assumptions?: Record<string, unknown>
  }
  riskMetrics?: {
    duration?: number
    modifiedDuration?: number
    convexity?: number
    dv01?: number
    spreadDuration?: number
  }
}

export interface NAVCalculation {
  id: string
  bond_product_id: string
  as_of_date: Date
  netAssetValue: number
  calculationMethod: string
  confidenceLevel: 'high' | 'medium' | 'low'
  breakdown?: Record<string, unknown>
  metadata?: Record<string, unknown>
  calculatedAt: Date
  created_at: Date
}

// ==================== HELPER FUNCTIONS ====================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`
    }))
    throw new Error(error.message || error.error || 'API request failed')
  }
  return response.json()
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  })
}

// ==================== API METHODS ====================

export const BondsAPI = {
  // ========== Product CRUD ==========
  
  /**
   * Create a new bond product
   * POST /api/v1/nav/bonds/data
   */
  createProduct: async (data: BondProductInput) => {
    const response = await fetchWithAuth(`${BONDS_BASE}/data`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return handleResponse<{ success: boolean; data: BondProduct }>(response)
  },
  
  /**
   * Get a single bond product with all supporting data
   * GET /api/v1/nav/bonds/:bondId
   */
  getProduct: async (bondId: string) => {
    const response = await fetchWithAuth(`${BONDS_BASE}/${bondId}`)
    return handleResponse<{ success: boolean; data: BondProductComplete }>(response)
  },
  
  /**
   * List all bonds for a project
   * GET /api/v1/nav/bonds?project_id={projectId}
   */
  listProducts: async (projectId: string) => {
    const response = await fetchWithAuth(
      `${BONDS_BASE}?project_id=${encodeURIComponent(projectId)}`
    )
    return handleResponse<{ success: boolean; data: BondProduct[] }>(response)
  },
  
  /**
   * Update a bond product
   * PUT /api/v1/nav/bonds/:bondId
   */
  updateProduct: async (bondId: string, data: Partial<BondProductInput>) => {
    const response = await fetchWithAuth(`${BONDS_BASE}/${bondId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
    return handleResponse<{ success: boolean; data: BondProduct }>(response)
  },
  
  /**
   * Delete a bond product
   * DELETE /api/v1/nav/bonds/:bondId
   */
  deleteProduct: async (bondId: string) => {
    const response = await fetchWithAuth(`${BONDS_BASE}/${bondId}`, {
      method: 'DELETE'
    })
    return handleResponse<{ success: boolean }>(response)
  },
  
  // ========== Supporting Data ==========
  
  /**
   * Add coupon payments to a bond
   * POST /api/v1/nav/bonds/:bondId/coupon-payments
   */
  addCouponPayments: async (bondId: string, payments: CouponPaymentInput[]) => {
    const response = await fetchWithAuth(
      `${BONDS_BASE}/${bondId}/coupon-payments`,
      {
        method: 'POST',
        body: JSON.stringify({ payments })
      }
    )
    return handleResponse<{ success: boolean; count: number }>(response)
  },
  
  /**
   * Add market prices to a bond
   * POST /api/v1/nav/bonds/:bondId/market-prices
   */
  addMarketPrices: async (bondId: string, prices: MarketPriceInput[]) => {
    const response = await fetchWithAuth(
      `${BONDS_BASE}/${bondId}/market-prices`,
      {
        method: 'POST',
        body: JSON.stringify({ prices })
      }
    )
    return handleResponse<{ success: boolean; count: number }>(response)
  },
  
  /**
   * Add call/put schedule to a bond
   * POST /api/v1/nav/bonds/:bondId/call-put-schedule
   */
  addCallPutSchedule: async (
    bondId: string, 
    schedules: CallPutScheduleInputData[]
  ) => {
    const response = await fetchWithAuth(
      `${BONDS_BASE}/${bondId}/call-put-schedule`,
      {
        method: 'POST',
        body: JSON.stringify({ schedules })
      }
    )
    return handleResponse<{ success: boolean; count: number }>(response)
  },
  
  // ========== Bulk Operations ==========
  
  /**
   * Bulk upload bonds via CSV
   * POST /api/v1/nav/bonds/bulk
   */
  bulkUpload: async (data: { bonds: BondProductInput[] }) => {
    const response = await fetchWithAuth(`${BONDS_BASE}/bulk`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return handleResponse<BulkUploadResult>(response)
  },
  
  /**
   * Download CSV template
   * GET /api/v1/nav/bonds/template
   */
  downloadTemplate: async () => {
    const response = await fetchWithAuth(`${BONDS_BASE}/template`)
    return await response.blob()
  },
  
  // ========== Calculations ==========
  
  /**
   * Calculate NAV for a bond
   * POST /api/v1/nav/bonds/:bondId/calculate
   */
  calculateNAV: async (bondId: string, params: BondCalculationParams) => {
    const response = await fetchWithAuth(
      `${BONDS_BASE}/${bondId}/calculate`,
      {
        method: 'POST',
        body: JSON.stringify(params)
      }
    )
    return handleResponse<{ success: boolean; data: NAVResult }>(response)
  },
  
  /**
   * Batch calculate NAV for multiple bonds
   * POST /api/v1/nav/bonds/batch-calculate
   */
  batchCalculate: async (
    bondIds: string[], 
    params: BondCalculationParams
  ) => {
    const response = await fetchWithAuth(
      `${BONDS_BASE}/batch-calculate`,
      {
        method: 'POST',
        body: JSON.stringify({ bondIds, params })
      }
    )
    return handleResponse<{ success: boolean; results: NAVResult[] }>(response)
  },
  
  /**
   * Get calculation history for a bond
   * GET /api/v1/nav/bonds/:bondId/history
   */
  getCalculationHistory: async (bondId: string) => {
    const response = await fetchWithAuth(
      `${BONDS_BASE}/${bondId}/history`
    )
    return handleResponse<{ success: boolean; data: NAVCalculation[] }>(response)
  }
}

export default BondsAPI
