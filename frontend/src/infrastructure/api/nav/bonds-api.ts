console.log('🚨🚨🚨 bonds-api.ts FILE LOADED')

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
  marketComparison?: {
    accountingValue: number      // Amortized cost (book value)
    marketValue: number           // Current market price
    unrealizedGainLoss: number    // Difference
    marketPriceDate: Date         // When market price was observed
    marketYTM: number             // Market yield
    accountingYTM: number         // Effective interest rate
    yieldSpread: number           // Difference in yields
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
  riskMetrics?: {
    duration?: number
    modified_duration?: number
    macaulay_duration?: number
    convexity?: number
    dv01?: number
    spreadDuration?: number
    option_adjusted_duration?: number
  }
  calculatedAt: Date
  created_at: Date
}

// ==================== HELPER FUNCTIONS ====================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    let detailedErrors: any[] = []
    
    try {
      const errorData = await response.json()
      
      console.log('=== API ERROR RESPONSE ===')
      console.log('Status:', response.status)
      console.log('Error Data:', JSON.stringify(errorData, null, 2))
      
      // Extract error message and details from various possible structures
      if (errorData.error) {
        const err = errorData.error
        
        // Use the formatted message if available (from enhanced validator)
        if (err.formattedMessage) {
          errorMessage = err.formattedMessage
        } else if (err.message) {
          errorMessage = err.message
        }
        
        // Preserve detailed errors for UI display
        if (err.details && Array.isArray(err.details)) {
          detailedErrors = err.details
          
          // If no formatted message, create one from details
          if (!err.formattedMessage && detailedErrors.length > 0) {
            errorMessage = detailedErrors.map((detail: any) => {
              const parts = [
                `❌ ${detail.field || 'Unknown'}: ${detail.message || 'Error'}`,
                detail.fix ? `💡 FIX: ${detail.fix}` : '',
                detail.table ? `📊 TABLE: ${detail.table}` : ''
              ].filter(Boolean)
              
              return parts.join('\n')
            }).join('\n\n')
          }
        }
      } else if (errorData.message) {
        errorMessage = errorData.message
      } else if (errorData.details) {
        errorMessage = typeof errorData.details === 'string'
          ? errorData.details
          : JSON.stringify(errorData.details)
      } else {
        // If no standard error field, stringify the entire error object
        errorMessage = JSON.stringify(errorData)
      }
    } catch (parseError) {
      // If JSON parsing fails, use the status text
      console.error('Failed to parse error response:', parseError)
    }
    
    console.error('API Error:', {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      message: errorMessage,
      detailedErrors
    })
    
    // Create error with additional context
    const error: any = new Error(errorMessage)
    error.status = response.status
    error.details = detailedErrors
    
    throw error
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
   * Delete a coupon payment
   * DELETE /api/v1/nav/bonds/:bondId/coupon-payments/:paymentId
   */
  deleteCouponPayment: async (bondId: string, paymentId: string) => {
    const response = await fetchWithAuth(
      `${BONDS_BASE}/${bondId}/coupon-payments/${paymentId}`,
      {
        method: 'DELETE'
      }
    )
    return handleResponse<{ success: boolean; message: string }>(response)
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
   * Validate bond data comprehensively
   * Returns ALL validation errors with fix instructions
   * POST /api/v1/nav/bonds/:bondId/validate
   */
  validateBond: async (bondId: string) => {
    const response = await fetchWithAuth(
      `${BONDS_BASE}/${bondId}/validate`,
      {
        method: 'POST'
      }
    )
    return handleResponse<{ 
      success: boolean
      validation: {
        isValid: boolean
        errors: Array<{
          severity: 'error' | 'warning' | 'info'
          field: string
          rule: string
          message: string
          value: any
          fix: string
          table: string
          context?: Record<string, any>
        }>
        warnings: Array<{
          field: string
          issue: string
          recommendation: string
          table: string
          impact?: string
        }>
        info: string[]
        summary: {
          bondId: string
          bondName: string
          accountingTreatment: string
          totalErrors: number
          totalWarnings: number
          criticalIssues: number
          canCalculate: boolean
          missingTables: string[]
        }
      }
    }>(response)
  },
  
  /**
   * Calculate NAV for a bond
   * POST /api/v1/nav/bonds/:bondId/calculate
   */
  calculateNAV: async (bondId: string, params: BondCalculationParams) => {
    console.log('🔵 bonds-api.ts: calculateNAV called')
    console.log('  bondId:', bondId)
    console.log('  params:', params)
    
    const response = await fetchWithAuth(
      `${BONDS_BASE}/${bondId}/calculate`,
      {
        method: 'POST',
        body: JSON.stringify(params)
      }
    )
    
    console.log('🔵 bonds-api.ts: Got response, status:', response.status)
    
    // Get raw response text first
    const clonedResponse = response.clone()
    const rawText = await clonedResponse.text()
    console.log('🔵 bonds-api.ts: Raw response text:', rawText)
    console.log('🔵 bonds-api.ts: Raw response length:', rawText.length)
    
    const result = await handleResponse<{ success: boolean; data: NAVResult }>(response)
    console.log('🔵 bonds-api.ts: Parsed result:', result)
    console.log('🔵 bonds-api.ts: result.data:', result.data)
    console.log('🔵 bonds-api.ts: result.data type:', typeof result.data)
    console.log('🔵 bonds-api.ts: result.data keys:', result.data ? Object.keys(result.data) : 'null/undefined')
    console.log('🔵 bonds-api.ts: result.data.netAssetValue:', result.data?.netAssetValue)
    
    return result
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
