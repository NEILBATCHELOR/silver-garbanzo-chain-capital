/**
 * ETF API Service
 * Handles communication with the backend ETF API
 * 
 * Base URL: http://localhost:3001/api/v1/nav/etf
 * Authentication: JWT Bearer token (from existing auth system)
 */

// Environment configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const ETF_API_BASE = `${BACKEND_URL}/api/v1/nav/etf`
const TOKEN_LINKS_API_BASE = `${BACKEND_URL}/api/v1/etf-token-links`

// Request timeout configuration
const DEFAULT_TIMEOUT = 10000 // 10 seconds
const CALCULATION_TIMEOUT = 30000 // 30 seconds for calculations

// Import types
import type {
  ETFProduct,
  ETFHolding,
  ETFNAVHistory,
  ETFWithLatestNAV,
  CryptoETFHoldingsSummary,
  ShareClassComparison,
  PremiumDiscountLatest,
  TrackingErrorAnalysis,
  CreateETFProductInput,
  CreateETFHoldingInput,
  CreateShareClassInput,
  BulkHoldingsImportInput,
  ETFCalculationInput,
  ETFCalculationResult,
  ETFTokenLinkInput
} from '@/types/nav/etf'

/**
 * API Response types
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    hasMore: boolean
    totalPages: number
  }
  timestamp: string
}

/**
 * ETF-specific error types
 */
export class ETFApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message)
    this.name = 'ETFApiError'
  }
}

/**
 * HTTP client wrapper with error handling
 */
class ETFHttpClient {
  private async request<T>(
    baseUrl: string,
    endpoint: string,
    options: RequestInit = {},
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          // TODO: Add JWT token from auth context
          // 'Authorization': `Bearer ${token}`,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ETFApiError(
          errorData.error?.message || `HTTP ${response.status}`,
          response.status,
          errorData
        )
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof ETFApiError) {
        throw error
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ETFApiError('Request timeout', 408)
        }
        throw new ETFApiError(error.message, 0)
      }
      
      throw new ETFApiError('Unknown error', 0)
    }
  }

  async get<T>(baseUrl: string, endpoint: string, timeout?: number): Promise<T> {
    return this.request<T>(baseUrl, endpoint, { method: 'GET' }, timeout)
  }

  async post<T>(baseUrl: string, endpoint: string, data: any, timeout?: number): Promise<T> {
    return this.request<T>(
      baseUrl,
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      timeout
    )
  }

  async put<T>(baseUrl: string, endpoint: string, data: any, timeout?: number): Promise<T> {
    return this.request<T>(
      baseUrl,
      endpoint,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      timeout
    )
  }

  async delete<T>(baseUrl: string, endpoint: string, timeout?: number): Promise<T> {
    return this.request<T>(baseUrl, endpoint, { method: 'DELETE' }, timeout)
  }
}

/**
 * Main ETF Service class
 */
export class ETFService {
  private client = new ETFHttpClient()

  // ========================================
  // NAV CALCULATION OPERATIONS
  // ========================================

  /**
   * Calculate NAV for an ETF
   * POST /api/v1/nav/etf/:etfId/calculate
   */
  async calculateNAV(
    etfId: string,
    asOfDate: Date,
    configOverrides?: Record<string, any>
  ): Promise<ApiResponse<ETFCalculationResult>> {
    return this.client.post<ApiResponse<ETFCalculationResult>>(
      ETF_API_BASE,
      `/${etfId}/calculate`,
      {
        asOfDate: asOfDate.toISOString(),
        configOverrides
      },
      CALCULATION_TIMEOUT
    )
  }

  /**
   * Get NAV history for an ETF
   * GET /api/v1/nav/etf/:etfId/nav-history
   */
  async getNAVHistory(
    etfId: string,
    params?: {
      dateFrom?: Date
      dateTo?: Date
      limit?: number
    }
  ): Promise<ApiResponse<ETFNAVHistory[]>> {
    const searchParams = new URLSearchParams()
    
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom.toISOString())
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo.toISOString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    
    const query = searchParams.toString()
    return this.client.get<ApiResponse<ETFNAVHistory[]>>(
      ETF_API_BASE,
      `/${etfId}/nav-history${query ? `?${query}` : ''}`
    )
  }

  /**
   * Analyze premium/discount for an ETF
   * POST /api/v1/nav/etf/:etfId/premium-discount
   */
  async analyzePremiumDiscount(
    etfId: string,
    params: {
      dateFrom: Date
      dateTo: Date
    }
  ): Promise<ApiResponse<PremiumDiscountLatest[]>> {
    return this.client.post<ApiResponse<PremiumDiscountLatest[]>>(
      ETF_API_BASE,
      `/${etfId}/premium-discount`,
      {
        dateFrom: params.dateFrom.toISOString(),
        dateTo: params.dateTo.toISOString()
      }
    )
  }

  /**
   * Get tracking error history for an ETF
   * GET /api/v1/nav/etf/:etfId/tracking-error
   */
  async getTrackingError(
    etfId: string,
    params?: {
      periodType?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'
      dateFrom?: Date
      dateTo?: Date
      limit?: number
    }
  ): Promise<ApiResponse<TrackingErrorAnalysis[]>> {
    const searchParams = new URLSearchParams()
    
    if (params?.periodType) searchParams.append('periodType', params.periodType)
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom.toISOString())
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo.toISOString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    
    const query = searchParams.toString()
    return this.client.get<ApiResponse<TrackingErrorAnalysis[]>>(
      ETF_API_BASE,
      `/${etfId}/tracking-error${query ? `?${query}` : ''}`
    )
  }

  // ========================================
  // ETF PRODUCT OPERATIONS
  // ========================================

  /**
   * Get all ETF products for a project
   * GET /api/v1/nav/etf/products
   */
  async getETFProducts(
    projectId: string,
    params?: {
      includeInactive?: boolean
      fundType?: string
    }
  ): Promise<ApiResponse<ETFWithLatestNAV[]>> {
    const searchParams = new URLSearchParams()
    searchParams.append('projectId', projectId)
    
    if (params?.includeInactive) searchParams.append('includeInactive', 'true')
    if (params?.fundType) searchParams.append('fundType', params.fundType)
    
    return this.client.get<ApiResponse<ETFWithLatestNAV[]>>(
      ETF_API_BASE,
      `/products?${searchParams.toString()}`
    )
  }

  /**
   * Get single ETF product by ID
   * GET /api/v1/nav/etf/products/:id
   */
  async getETFProduct(id: string): Promise<ApiResponse<ETFProduct>> {
    return this.client.get<ApiResponse<ETFProduct>>(
      ETF_API_BASE,
      `/products/${id}`
    )
  }

  /**
   * Create new ETF product
   * POST /api/v1/nav/etf/products
   */
  async createETFProduct(
    data: CreateETFProductInput
  ): Promise<ApiResponse<ETFProduct>> {
    return this.client.post<ApiResponse<ETFProduct>>(
      ETF_API_BASE,
      '/products',
      data
    )
  }

  /**
   * Update ETF product
   * PUT /api/v1/nav/etf/products/:id
   */
  async updateETFProduct(
    id: string,
    data: Partial<CreateETFProductInput>
  ): Promise<ApiResponse<ETFProduct>> {
    return this.client.put<ApiResponse<ETFProduct>>(
      ETF_API_BASE,
      `/products/${id}`,
      data
    )
  }

  /**
   * Delete ETF product
   * DELETE /api/v1/nav/etf/products/:id
   */
  async deleteETFProduct(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<ApiResponse<void>>(
      ETF_API_BASE,
      `/products/${id}`
    )
  }

  // ========================================
  // ETF HOLDINGS OPERATIONS
  // ========================================

  /**
   * Get holdings for an ETF
   * GET /api/v1/nav/etf/:etfId/holdings
   */
  async getHoldings(
    etfId: string,
    asOfDate?: Date
  ): Promise<ApiResponse<ETFHolding[]>> {
    const searchParams = new URLSearchParams()
    if (asOfDate) searchParams.append('asOfDate', asOfDate.toISOString())
    
    const query = searchParams.toString()
    return this.client.get<ApiResponse<ETFHolding[]>>(
      ETF_API_BASE,
      `/${etfId}/holdings${query ? `?${query}` : ''}`
    )
  }

  /**
   * Add holding to ETF
   * POST /api/v1/nav/etf/:etfId/holdings
   */
  async createHolding(
    etfId: string,
    data: CreateETFHoldingInput
  ): Promise<ApiResponse<ETFHolding>> {
    return this.client.post<ApiResponse<ETFHolding>>(
      ETF_API_BASE,
      `/${etfId}/holdings`,
      data
    )
  }

  /**
   * Update holding
   * PUT /api/v1/nav/etf/holdings/:id
   */
  async updateHolding(
    id: string,
    data: Partial<CreateETFHoldingInput>
  ): Promise<ApiResponse<ETFHolding>> {
    return this.client.put<ApiResponse<ETFHolding>>(
      ETF_API_BASE,
      `/holdings/${id}`,
      data
    )
  }

  /**
   * Delete holding
   * DELETE /api/v1/nav/etf/holdings/:id
   */
  async deleteHolding(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<ApiResponse<void>>(
      ETF_API_BASE,
      `/holdings/${id}`
    )
  }

  /**
   * Bulk import holdings
   * POST /api/v1/nav/etf/:etfId/holdings/bulk
   */
  async bulkImportHoldings(
    etfId: string,
    data: Omit<BulkHoldingsImportInput, 'fund_product_id'>
  ): Promise<ApiResponse<ETFHolding[]>> {
    return this.client.post<ApiResponse<ETFHolding[]>>(
      ETF_API_BASE,
      `/${etfId}/holdings/bulk`,
      data,
      60000 // 60 second timeout for bulk operations
    )
  }

  // ========================================
  // SHARE CLASS OPERATIONS
  // ========================================

  /**
   * Create share class
   * POST /api/v1/nav/etf/:parentId/share-classes
   */
  async createShareClass(
    parentId: string,
    data: Omit<CreateShareClassInput, 'parent_fund_id'>
  ): Promise<ApiResponse<ETFProduct>> {
    return this.client.post<ApiResponse<ETFProduct>>(
      ETF_API_BASE,
      `/${parentId}/share-classes`,
      data
    )
  }

  /**
   * Get share classes for a parent ETF
   * GET /api/v1/nav/etf/:parentId/share-classes
   */
  async getShareClasses(parentId: string): Promise<ApiResponse<ShareClassComparison[]>> {
    return this.client.get<ApiResponse<ShareClassComparison[]>>(
      ETF_API_BASE,
      `/${parentId}/share-classes`
    )
  }

  // ========================================
  // CRYPTO ETF OPERATIONS
  // ========================================

  /**
   * Get crypto holdings summary
   * GET /api/v1/nav/etf/:etfId/crypto-summary
   */
  async getCryptoHoldingsSummary(
    etfId: string
  ): Promise<ApiResponse<CryptoETFHoldingsSummary[]>> {
    return this.client.get<ApiResponse<CryptoETFHoldingsSummary[]>>(
      ETF_API_BASE,
      `/${etfId}/crypto-summary`
    )
  }

  // ========================================
  // TOKEN LINKING OPERATIONS
  // ========================================

  /**
   * Link token to ETF
   * POST /api/v1/etf-token-links
   */
  async linkToken(data: ETFTokenLinkInput): Promise<ApiResponse<any>> {
    return this.client.post<ApiResponse<any>>(
      TOKEN_LINKS_API_BASE,
      '',
      data
    )
  }

  /**
   * Unlink token from ETF
   * DELETE /api/v1/etf-token-links/:id
   */
  async unlinkToken(linkId: string): Promise<ApiResponse<void>> {
    return this.client.delete<ApiResponse<void>>(
      TOKEN_LINKS_API_BASE,
      `/${linkId}`
    )
  }

  /**
   * Get token links for ETF
   * GET /api/v1/etf-token-links/etf/:etfId
   */
  async getTokenLinks(etfId: string): Promise<ApiResponse<any[]>> {
    return this.client.get<ApiResponse<any[]>>(
      TOKEN_LINKS_API_BASE,
      `/etf/${etfId}`
    )
  }

  /**
   * Update rebase config for token link
   * PUT /api/v1/etf-token-links/:id/rebase
   */
  async updateRebaseConfig(
    linkId: string,
    config: {
      supports_rebase: boolean
      rebase_frequency?: string
    }
  ): Promise<ApiResponse<any>> {
    return this.client.put<ApiResponse<any>>(
      TOKEN_LINKS_API_BASE,
      `/${linkId}/rebase`,
      config
    )
  }
}

// Export singleton instance
export const etfService = new ETFService()

// Export for direct use
export default etfService
