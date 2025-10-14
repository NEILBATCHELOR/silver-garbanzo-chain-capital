/**
 * NAV API Service
 * Handles communication with the backend NAV calculation API
 * 
 * Base URL: http://localhost:3001/api/v1/nav
 * Authentication: JWT Bearer token (from existing auth system)
 */

// Environment configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const API_BASE = `${BACKEND_URL}/api/v1/nav`;

// Request timeout configuration
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const CALCULATION_TIMEOUT = 30000; // 30 seconds for calculations

// Import types
import { AssetType, CalculationStatus, ApprovalStatus } from '@/types/nav';

// Types for API requests and responses (based on backend OpenAPI spec)
export interface NavCurrentRequest {
  assetId?: string;
  productType?: AssetType;
  projectId?: string;
  asOf?: string; // ISO date string
}

export interface NavCalculationRequest {
  assetId?: string;
  productType?: AssetType;
  projectId?: string;
  valuationDate: string; // Required - ISO date string
  targetCurrency?: string; // Default 'USD'
  runManually?: boolean; // Default false
}

export interface NavRunsListRequest {
  page?: number; // Default 1
  limit?: number; // Default 20, max 100
  assetId?: string;
  productType?: AssetType;
  projectId?: string;
  status?: CalculationStatus;
  approvalStatus?: ApprovalStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'valuationDate' | 'calculatedAt' | 'navValue' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface NavCalculationResult {
  runId: string;
  assetId?: string;
  productType?: AssetType;
  projectId?: string;
  valuationDate: string;
  navValue: number;
  navPerShare?: number;
  totalAssets: number;
  totalLiabilities: number;
  netAssets: number;
  sharesOutstanding?: number;
  currency: string;
  calculatedAt: string;
  status: CalculationStatus;
  approvalStatus?: ApprovalStatus;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    totalPages: number;
  };
  timestamp: string;
}

// Domain-specific error types
export class NavApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'NavApiError';
  }
}

// HTTP client wrapper with error handling
class NavHttpClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          // TODO: Add JWT token from auth context
          // 'Authorization': `Bearer ${token}`,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new NavApiError(
          errorData.error?.message || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof NavApiError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new NavApiError('Request timeout', 408);
        }
        throw new NavApiError(error.message, 0);
      }
      
      throw new NavApiError('Unknown error', 0);
    }
  }

  async get<T>(endpoint: string, timeout?: number): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, timeout);
  }

  async post<T>(endpoint: string, data: any, timeout?: number): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      timeout
    );
  }

  async put<T>(endpoint: string, data: any, timeout?: number): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      timeout
    );
  }

  async delete<T>(endpoint: string, timeout?: number): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, timeout);
  }
}

// Main NAV service class
export class NavService {
  private client = new NavHttpClient();

  // Basic NAV operations matching backend API

  /**
   * Get current NAV for an asset, product type, or project
   * GET /current
   */
  async getCurrentNav(params: NavCurrentRequest): Promise<NavCalculationResult> {
    const searchParams = new URLSearchParams();
    
    if (params.assetId) searchParams.append('assetId', params.assetId);
    if (params.productType) searchParams.append('productType', params.productType);
    if (params.projectId) searchParams.append('projectId', params.projectId);
    if (params.asOf) searchParams.append('asOf', params.asOf);

    const endpoint = `/current${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.client.get<ApiResponse<NavCalculationResult>>(endpoint);
    
    if (!response.success || !response.data) {
      throw new NavApiError('Failed to get current NAV', 500);
    }
    
    return response.data;
  }

  /**
   * Create a new NAV calculation run
   * POST /runs
   */
  async createCalculation(request: NavCalculationRequest): Promise<NavCalculationResult> {
    const response = await this.client.post<ApiResponse<NavCalculationResult>>(
      '/runs',
      request,
      CALCULATION_TIMEOUT
    );
    
    if (!response.success || !response.data) {
      throw new NavApiError(response.error || 'Failed to create calculation', 500);
    }
    
    return response.data;
  }

  /**
   * Get NAV calculation runs with filtering and pagination
   * GET /runs
   */
  async getCalculationRuns(params: NavRunsListRequest = {}): Promise<{
    runs: NavCalculationResult[];
    pagination: PaginatedResponse<NavCalculationResult>['pagination'];
  }> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.assetId) searchParams.append('assetId', params.assetId);
    if (params.productType) searchParams.append('productType', params.productType);
    if (params.projectId) searchParams.append('projectId', params.projectId);
    if (params.status) searchParams.append('status', params.status);
    if (params.approvalStatus) searchParams.append('approvalStatus', params.approvalStatus);
    if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.append('dateTo', params.dateTo);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const endpoint = `/runs${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.client.get<PaginatedResponse<NavCalculationResult>>(endpoint);
    
    if (!response.success) {
      throw new NavApiError('Failed to get calculation runs', 500);
    }
    
    return {
      runs: response.data,
      pagination: response.pagination,
    };
  }

  /**
   * Get specific NAV calculation run details
   * GET /runs/:runId
   */
  async getCalculationById(runId: string): Promise<NavCalculationResult> {
    const response = await this.client.get<ApiResponse<NavCalculationResult>>(`/runs/${runId}`);
    
    if (!response.success || !response.data) {
      throw new NavApiError('Failed to get calculation details', 404);
    }
    
    return response.data;
  }

  /**
   * Get weighted NAV for a project
   * GET /projects/:projectId/weighted
   */
  async getProjectWeightedNav(projectId: string, params: { asOf?: string; currency?: string } = {}): Promise<NavCalculationResult> {
    const searchParams = new URLSearchParams();
    
    if (params.asOf) searchParams.append('asOf', params.asOf);
    if (params.currency) searchParams.append('currency', params.currency);

    const endpoint = `/projects/${projectId}/weighted${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.client.get<ApiResponse<NavCalculationResult>>(endpoint);
    
    if (!response.success || !response.data) {
      throw new NavApiError('Failed to get project weighted NAV', 500);
    }
    
    return response.data;
  }

  // Future methods for extended functionality (to be implemented as backend expands)

  /**
   * Get NAV overview/dashboard data
   */
  async getOverview(): Promise<any> {
    // TODO: Implement when backend provides overview endpoint
    throw new Error('Overview endpoint not yet implemented in backend');
  }

  /**
   * List available calculators
   */
  async listCalculators(): Promise<any[]> {
    // TODO: Implement when backend provides calculators list endpoint
    throw new Error('Calculators list endpoint not yet implemented in backend');
  }

  /**
   * Get calculator schema/configuration
   */
  async getCalculatorSchema(calculatorId: string): Promise<any> {
    // TODO: Implement when backend provides schema endpoint
    throw new Error('Calculator schema endpoint not yet implemented in backend');
  }

  /**
   * Create/save a valuation record
   */
  async createValuation(payload: any): Promise<any> {
    // TODO: Implement when backend provides valuations endpoint
    throw new Error('Valuations endpoint not yet implemented in backend');
  }

  /**
   * Get valuation history
   */
  async listValuations(params: any): Promise<any[]> {
    // TODO: Implement when backend provides valuations endpoint
    throw new Error('Valuations endpoint not yet implemented in backend');
  }

  /**
   * Delete a valuation record
   */
  async deleteValuation(id: string): Promise<boolean> {
    // TODO: Implement when backend provides valuations endpoint
    throw new Error('Valuations endpoint not yet implemented in backend');
  }

  /**
   * Get audit trail
   */
  async getAuditEvents(params: {
    page?: number
    limit?: number
    userId?: string
    action?: string
    entityType?: 'calculation' | 'valuation' | 'approval'
    entityId?: string
    dateFrom?: string
    dateTo?: string
    sortBy?: 'timestamp' | 'action' | 'userId'
    sortOrder?: 'asc' | 'desc'
  } = {}): Promise<PaginatedResponse<any>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.userId) searchParams.append('userId', params.userId);
    if (params.action) searchParams.append('action', params.action);
    if (params.entityType) searchParams.append('entityType', params.entityType);
    if (params.entityId) searchParams.append('entityId', params.entityId);
    if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.append('dateTo', params.dateTo);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const endpoint = `/audit${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.client.get<PaginatedResponse<any>>(endpoint);
    
    if (!response.success) {
      throw new NavApiError('Failed to get audit events', 500);
    }
    
    return response;
  }

  /**
   * Create manual NAV entry
   * POST /manual
   */
  async createManualNavEntry(request: {
    assetId: string
    productType: string
    valuationDate: string | Date
    navValue: number
    dataSource: string
    notes?: string
    confidenceLevel: 'high' | 'medium' | 'low'
    currency?: string
    projectId?: string
  }): Promise<NavCalculationResult> {
    const response = await this.client.post<ApiResponse<NavCalculationResult>>(
      '/manual',
      {
        ...request,
        valuationDate: typeof request.valuationDate === 'string' 
          ? request.valuationDate 
          : request.valuationDate.toISOString(),
        currency: request.currency || 'USD'
      }
    );
    
    if (!response.success || !response.data) {
      throw new NavApiError(response.error || 'Failed to create manual NAV entry', 500);
    }
    
    return response.data;
  }
}

// Export singleton instance
export const navService = new NavService();

// Export for dependency injection or testing
export default NavService;
