console.log('🚨🚨🚨 mmf-api.ts FILE LOADED')

/**
 * Money Market Fund (MMF) API Client
 * Type-safe API client for MMF operations
 * Mirrors backend routes (following Bonds pattern)
 */

import type {
  MMFProduct,
  MMFProductInput,
  MMFHolding,
  MMFHoldingInput,
  MMFNAVHistory,
  MMFLiquidityBucket,
  MMFCalculationParams,
  MMFNAVResult
} from '@/types/nav/mmf'

// API Configuration
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const MMF_BASE = `${API_BASE}/api/v1/nav/mmf`

// ==================== TYPES ====================

export interface MMFProductComplete extends MMFProduct {
  holdings?: MMFHolding[]
  nav_history?: MMFNAVHistory[]
  liquidity_buckets?: MMFLiquidityBucket[]
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

export interface MMFCalculation {
  id: string
  fund_product_id: string
  valuation_date: string | Date
  stable_nav: number
  shadow_nav: number
  wam: number
  wal: number
  daily_liquid_percentage: number
  weekly_liquid_percentage: number
  is_breaking_buck: boolean
  status?: string
  calculationMethod?: string
  confidenceLevel?: 'high' | 'medium' | 'low'
  breakdown?: Record<string, unknown>
  metadata?: Record<string, unknown>
  created_at: string | Date
  updated_at?: string | Date
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
      
      // Extract error message and details
      if (errorData.error) {
        const err = errorData.error
        
        if (err.formattedMessage) {
          errorMessage = err.formattedMessage
        } else if (err.message) {
          errorMessage = err.message
        }
        
        if (err.details && Array.isArray(err.details)) {
          detailedErrors = err.details
          
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
        errorMessage = JSON.stringify(errorData)
      }
    } catch (parseError) {
      console.error('Failed to parse error response:', parseError)
    }
    
    console.error('API Error:', {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      message: errorMessage,
      detailedErrors
    })
    
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

export const MMFAPI = {
  // ========== Product CRUD ==========
  
  /**
   * Create a new MMF product
   * POST /api/v1/nav/mmf/data
   */
  createProduct: async (data: MMFProductInput) => {
    const response = await fetchWithAuth(`${MMF_BASE}/data`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return handleResponse<{ success: boolean; data: MMFProduct }>(response)
  },
  
  /**
   * Get a single MMF product with all supporting data
   * GET /api/v1/nav/mmf/:fundId
   */
  getProduct: async (fundId: string) => {
    const response = await fetchWithAuth(`${MMF_BASE}/${fundId}`)
    return handleResponse<{ success: boolean; data: MMFProductComplete }>(response)
  },
  
  /**
   * List all MMFs for a project
   * GET /api/v1/nav/mmf?project_id={projectId}
   */
  listProducts: async (projectId: string) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}?project_id=${encodeURIComponent(projectId)}`
    )
    return handleResponse<{ success: boolean; data: MMFProduct[] }>(response)
  },
  
  /**
   * Update an MMF product
   * PUT /api/v1/nav/mmf/:fundId
   */
  updateProduct: async (fundId: string, data: Partial<MMFProductInput>) => {
    const response = await fetchWithAuth(`${MMF_BASE}/${fundId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
    return handleResponse<{ success: boolean; data: MMFProduct }>(response)
  },
  
  /**
   * Delete an MMF product
   * DELETE /api/v1/nav/mmf/:fundId
   */
  deleteProduct: async (fundId: string) => {
    const response = await fetchWithAuth(`${MMF_BASE}/${fundId}`, {
      method: 'DELETE'
    })
    return handleResponse<{ success: boolean }>(response)
  },
  
  // ========== Holdings Management ==========
  
  /**
   * Get holdings for an MMF
   * GET /api/v1/nav/mmf/:fundId/holdings
   */
  getHoldings: async (fundId: string) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/holdings`
    )
    return handleResponse<{ success: boolean; data: MMFHolding[]; count: number }>(response)
  },
  
  /**
   * Add holdings to an MMF
   * POST /api/v1/nav/mmf/:fundId/holdings
   */
  addHoldings: async (fundId: string, holdings: MMFHoldingInput[]) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/holdings`,
      {
        method: 'POST',
        body: JSON.stringify({ holdings })
      }
    )
    return handleResponse<{ success: boolean; count: number }>(response)
  },
  
  /**
   * Update a holding
   * PUT /api/v1/nav/mmf/:fundId/holdings/:holdingId
   */
  updateHolding: async (fundId: string, holdingId: string, data: Partial<MMFHoldingInput>) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/holdings/${holdingId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      }
    )
    return handleResponse<{ success: boolean; data: MMFHolding; message: string }>(response)
  },
  
  /**
   * Delete a holding
   * DELETE /api/v1/nav/mmf/:fundId/holdings/:holdingId
   */
  deleteHolding: async (fundId: string, holdingId: string) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/holdings/${holdingId}`,
      {
        method: 'DELETE'
      }
    )
    return handleResponse<{ success: boolean; message: string }>(response)
  },
  
  // ========== Liquidity Buckets ==========
  
  /**
   * Get liquidity buckets for an MMF
   * GET /api/v1/nav/mmf/:fundId/liquidity-buckets
   */
  getLiquidityBuckets: async (fundId: string, asOfDate?: Date) => {
    const params = asOfDate ? `?as_of_date=${asOfDate.toISOString()}` : ''
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/liquidity-buckets${params}`
    )
    return handleResponse<{ success: boolean; data: MMFLiquidityBucket[] }>(response)
  },
  
  // ========== NAV History ==========
  
  /**
   * Get NAV history for an MMF
   * GET /api/v1/nav/mmf/:fundId/history
   */
  getNAVHistory: async (fundId: string, from?: Date, to?: Date) => {
    const params = new URLSearchParams()
    if (from) params.append('from', from.toISOString())
    if (to) params.append('to', to.toISOString())
    const queryString = params.toString() ? `?${params.toString()}` : ''
    
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/history${queryString}`
    )
    return handleResponse<{ success: boolean; data: MMFNAVHistory[] }>(response)
  },
  
  /**
   * Get latest NAV for an MMF
   * GET /api/v1/nav/mmf/:fundId/latest
   */
  getLatestNAV: async (fundId: string) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/latest`
    )
    return handleResponse<{ success: boolean; data: MMFNAVHistory }>(response)
  },
  
  // ========== Bulk Operations ==========
  
  /**
   * Bulk upload MMF holdings via CSV
   * POST /api/v1/nav/mmf/:fundId/holdings/bulk
   */
  bulkUploadHoldings: async (fundId: string, data: { holdings: MMFHoldingInput[] }) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/holdings/bulk`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    )
    return handleResponse<BulkUploadResult>(response)
  },
  
  /**
   * Download holdings CSV template
   * GET /api/v1/nav/mmf/template/holdings
   */
  downloadHoldingsTemplate: async () => {
    const response = await fetchWithAuth(`${MMF_BASE}/template/holdings`)
    return await response.blob()
  },
  
  // ========== Calculations ==========
  
  /**
   * Validate MMF data comprehensively
   * POST /api/v1/nav/mmf/:fundId/validate
   */
  validateMMF: async (fundId: string) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/validate`,
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
          fundId: string
          fundName: string
          fundType: string
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
   * Calculate NAV for an MMF
   * POST /api/v1/nav/mmf/:fundId/calculate
   */
  calculateNAV: async (fundId: string, params: MMFCalculationParams) => {
    console.log('🔵 mmf-api.ts: calculateNAV called')
    console.log('  fundId:', fundId)
    console.log('  params:', params)
    
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/calculate`,
      {
        method: 'POST',
        body: JSON.stringify(params)
      }
    )
    
    console.log('🔵 mmf-api.ts: Got response, status:', response.status)
    
    const result = await handleResponse<{ success: boolean; data: MMFNAVResult }>(response)
    console.log('🔵 mmf-api.ts: Parsed result:', result)
    
    return result
  },
  
  /**
   * Batch calculate NAV for multiple MMFs
   * POST /api/v1/nav/mmf/batch-calculate
   */
  batchCalculate: async (
    fundIds: string[], 
    params: MMFCalculationParams
  ) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/batch-calculate`,
      {
        method: 'POST',
        body: JSON.stringify({ fundIds, params })
      }
    )
    return handleResponse<{ success: boolean; results: MMFNAVResult[] }>(response)
  },
  
  /**
   * Get calculation history for an MMF
   * GET /api/v1/nav/mmf/:fundId/calculations
   */
  getCalculationHistory: async (fundId: string) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/calculations`
    )
    return handleResponse<{ success: boolean; data: MMFCalculation[] }>(response)
  },

  // ========== Enhancement Features (Market Leader) ==========

  /**
   * ENHANCEMENT 1: Get asset allocation breakdown with typical comparisons
   * GET /api/v1/nav/mmf/:fundId/allocation-breakdown
   */
  getAllocationBreakdown: async (fundId: string) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/allocation-breakdown`
    )
    return handleResponse<{
      success: boolean
      data: Array<{
        assetClass: string
        totalValue: number
        percentage: number
        numberOfSecurities: number
        averageMaturityDays: number
        typicalRange?: { min: number; max: number; average: number }
        variance?: number | null
      }>
    }>(response)
  },

  /**
   * ENHANCEMENT 2: Get fund-type specific validation
   * GET /api/v1/nav/mmf/:fundId/fund-type-validation
   */
  getFundTypeValidation: async (fundId: string) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/fund-type-validation`
    )
    return handleResponse<{
      success: boolean
      data: {
        fundType: string
        specificRules: Array<{
          rule: string
          requirement: string
          actualValue: number | string
          isCompliant: boolean
          severity: 'critical' | 'warning'
        }>
        allRulesMet: boolean
        violations: string[]
      }
    }>(response)
  },

  /**
   * ENHANCEMENT 3: Get concentration risk analysis
   * GET /api/v1/nav/mmf/:fundId/concentration-risk
   */
  getConcentrationRisk: async (fundId: string) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/concentration-risk`
    )
    return handleResponse<{
      success: boolean
      data: {
        topIssuers: Array<{
          issuer: string
          exposure: number
          value: number
          securities: number
        }>
        alerts: Array<{
          issuer: string
          issuerId: string | null
          currentExposure: number
          limit: number
          exceedsLimit: boolean
          exceedBy: number
          severity: 'critical' | 'warning' | 'info'
          totalValue: number
          numberOfSecurities: number
          isAffiliated: boolean
          suggestedAction: string
          alternativeIssuers?: string[]
        }>
        totalExposedIssuers: number
        complianceStatus: 'compliant' | 'warning' | 'violation'
        recommendations: string[]
      }
    }>(response)
  },

  /**
   * ENHANCEMENT 4: Get fees and gates analysis
   * GET /api/v1/nav/mmf/:fundId/fees-gates-analysis
   */
  getFeesGatesAnalysis: async (fundId: string) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/fees-gates-analysis`
    )
    return handleResponse<{
      success: boolean
      data: {
        currentStatus: 'no_action' | 'discretionary_permitted' | 'mandatory_required'
        fee: {
          type: 'none' | 'discretionary' | 'mandatory'
          percentage: number
          reason: string
        }
        gate: {
          permitted: boolean
          note: string
        }
        boardNotificationRequired: boolean
        recommendations: string[]
      }
    }>(response)
  },

  /**
   * ENHANCEMENT 5: Analyze transaction impact
   * POST /api/v1/nav/mmf/:fundId/transaction-impact
   */
  analyzeTransactionImpact: async (fundId: string, transaction: {
    type: 'buy' | 'sell' | 'mature'
    holdingType: string
    issuerName: string
    quantity: number
    price: number
    maturityDate: Date
    isGovernmentSecurity: boolean
    isDailyLiquid: boolean
    isWeeklyLiquid: boolean
    creditRating: string
  }) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/transaction-impact`,
      {
        method: 'POST',
        body: JSON.stringify(transaction)
      }
    )
    return handleResponse<{
      success: boolean
      data: {
        transaction: {
          type: string
          security: string
          quantity: number
          price: number
          totalValue: number
        }
        preTransaction: {
          nav: number
          wam: number
          wal: number
          dailyLiquidPercentage: number
          weeklyLiquidPercentage: number
        }
        postTransaction: {
          nav: number
          wam: number
          wal: number
          dailyLiquidPercentage: number
          weeklyLiquidPercentage: number
        }
        impacts: {
          navChange: number
          wamChange: number
          walChange: number
          dailyLiquidChange: number
          weeklyLiquidChange: number
        }
        complianceCheck: {
          willBeCompliant: boolean
          violations: string[]
          warnings: string[]
        }
        concentrationCheck: {
          newIssuerExposure?: number
          exceedsLimit: boolean
          message: string
        }
        recommendation: 'approve' | 'review' | 'reject'
        recommendationReason: string
      }
    }>(response)
  },

  // ========== Token Links ==========
  
  /**
   * Get tokens linked to an MMF
   * GET /api/v1/nav/mmf/:fundId/token-links
   */
  getTokenLinks: async (fundId: string) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/token-links`
    )
    return handleResponse<{ 
      success: boolean; 
      data: Array<{
        id: string;
        name: string;
        symbol: string;
        product_id: string;
        ratio: number | null;
        parity: number | null;
        status: string;
        created_at: string;
        updated_at: string;
      }>; 
      count: number 
    }>(response)
  },

  /**
   * Create a token link for an MMF
   * POST /api/v1/nav/mmf/:fundId/token-links
   */
  createTokenLink: async (
    fundId: string,
    data: {
      tokenId: string;
      parityRatio: number;
      collateralizationPercentage: number;
    }
  ) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/token-links`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    )
    return handleResponse<{ 
      success: boolean; 
      data: any;
    }>(response)
  },

  /**
   * Update a token link for an MMF
   * PUT /api/v1/nav/mmf/:fundId/token-links/:tokenId
   */
  updateTokenLink: async (
    fundId: string,
    tokenId: string,
    data: {
      parityRatio?: number;
      collateralizationPercentage?: number;
    }
  ) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/token-links/${tokenId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      }
    )
    return handleResponse<{ 
      success: boolean; 
      data: any;
    }>(response)
  },

  /**
   * Delete a token link for an MMF
   * DELETE /api/v1/nav/mmf/:fundId/token-links/:tokenId
   */
  deleteTokenLink: async (
    fundId: string,
    tokenId: string
  ) => {
    const response = await fetchWithAuth(
      `${MMF_BASE}/${fundId}/token-links/${tokenId}`,
      {
        method: 'DELETE'
      }
    )
    return handleResponse<{ 
      success: boolean; 
      message: string;
    }>(response)
  }
}

export default MMFAPI
