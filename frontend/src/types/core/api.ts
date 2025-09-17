/**
 * Standard API Response format
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  status?: number
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * Paginated API Response
 */
export interface PaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * API Error Response
 */
export interface ApiError {
  success: false
  error: string
  message?: string
  status?: number
  details?: Record<string, any>
}

/**
 * API Success Response
 */
export interface ApiSuccess<T = any> {
  success: true
  data: T
  message?: string
  status?: number
}

/**
 * Validation Error
 */
export interface ValidationError {
  field: string
  message: string
  code?: string
}

/**
 * API Request Configuration
 */
export interface ApiRequestConfig {
  headers?: Record<string, string>
  timeout?: number
  retry?: {
    attempts: number
    delay: number
  }
  cache?: boolean
  cacheDuration?: number
}

/**
 * API Client Configuration
 */
export interface ApiClientConfig {
  baseUrl: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
  defaultHeaders?: Record<string, string>
}

/**
 * Service Result - Standard format for service layer responses
 */
export interface ServiceResult<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string
  details?: Record<string, any>
}

/**
 * Service Error
 */
export interface ServiceError {
  success: false
  error: string
  code?: string
  message?: string
  details?: Record<string, any>
}

/**
 * Service Success
 */
export interface ServiceSuccess<T = any> {
  success: true
  data: T
  message?: string
}

/**
 * HTTP Status Codes
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503
}

/**
 * API Endpoint Configuration
 */
export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  authenticated?: boolean
  rateLimit?: {
    requests: number
    window: number // in seconds
  }
}

/**
 * Bulk Operation Result
 */
export interface BulkOperationResult<T = any> {
  success: boolean
  totalProcessed: number
  successful: number
  failed: number
  results: Array<{
    success: boolean
    data?: T
    error?: string
    index: number
  }>
}

/**
 * API Health Check Response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime: number
  timestamp: string
  services: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy'
    responseTime?: number
    lastCheck?: string
  }>
}
