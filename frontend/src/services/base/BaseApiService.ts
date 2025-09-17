import { ApiResponse } from '../../types/core/api'

export abstract class BaseApiService {
  protected baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token
  }

  /**
   * Get current authentication token
   */
  getToken(): string | null {
    return this.token
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = null
  }

  /**
   * GET request
   */
  protected async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`, this.getApiBaseUrl())
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    return this.makeRequest<T>(url.toString(), {
      method: 'GET',
      headers: this.getHeaders()
    })
  }

  /**
   * POST request
   */
  protected async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    })
  }

  /**
   * PUT request
   */
  protected async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    })
  }

  /**
   * DELETE request
   */
  protected async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    })
  }

  /**
   * PATCH request
   */
  protected async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    })
  }

  /**
   * Make HTTP request with error handling
   */
  private async makeRequest<T>(url: string, options: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error')
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorBody}`,
          status: response.status
        }
      }

      const contentType = response.headers.get('content-type')
      let data: T

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text() as unknown as T
      }

      return {
        success: true,
        data,
        status: response.status
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        status: 0
      }
    }
  }

  /**
   * Get default headers including authentication
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/json'
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    return headers
  }

  /**
   * Get API base URL from environment
   */
  private getApiBaseUrl(): string {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  }

  /**
   * Handle service errors consistently
   */
  protected handleError<T>(message: string, error: any): ApiResponse<T> {
    console.error(message, error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      status: 500
    }
  }

  /**
   * Transform pagination response
   */
  protected transformPaginatedResponse<T>(response: any): ApiResponse<{
    data: T[]
    pagination: {
      page: number
      pageSize: number
      total: number
      totalPages: number
    }
  }> {
    if (!response.success || !response.data) {
      return response
    }

    return {
      ...response,
      data: {
        data: response.data.items || response.data.data || [],
        pagination: {
          page: response.data.page || 1,
          pageSize: response.data.pageSize || 10,
          total: response.data.total || 0,
          totalPages: response.data.totalPages || 0
        }
      }
    }
  }

  /**
   * Build query string from parameters
   */
  protected buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)))
        } else {
          searchParams.append(key, String(value))
        }
      }
    })

    return searchParams.toString()
  }
}
