/**
 * Core API Response Types
 * Common response structures used across all backend services
 */

/**
 * Standard API Response wrapper
 */
export interface ApiResponse<T = any> {
  data: T
  message?: string
  timestamp: string
}

/**
 * API Error Response structure
 */
export interface ApiErrorResponse {
  error: {
    message: string
    statusCode: number
    code?: string
    details?: string
    validation?: any[]
    timestamp: string
    requestId?: string
  }
}

/**
 * Paginated Response structure
 */
export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    hasMore: boolean
    totalPages: number
    nextPage?: number
    prevPage?: number
  }
  message?: string
  timestamp: string
}

/**
 * Pagination parameters for requests
 */
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

/**
 * Filtering parameters for requests
 */
export interface FilterParams {
  where?: Record<string, any>
  search?: string
  searchFields?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

/**
 * Query options combining pagination and filtering
 */
export interface QueryOptions extends PaginationParams, FilterParams {
  include?: Record<string, boolean | object>
  select?: Record<string, boolean>
}

/**
 * Service operation result
 */
export interface ServiceResult<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
  statusCode?: number
}

/**
 * Batch operation result
 */
export interface BatchResult<T = any> {
  successful: T[]
  failed: Array<{
    item: any
    error: string
    index: number
  }>
  summary: {
    total: number
    success: number
    failed: number
  }
}

/**
 * Paginated Result type alias for backward compatibility
 */
export type PaginatedResult<T> = PaginatedResponse<T>
