/**
 * DFNS Request Service
 * 
 * Handles HTTP request construction, headers, and response processing for DFNS API
 * Based on: https://docs.dfns.co/d/advanced-topics/authentication/request-headers
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsError, DfnsNetworkError, DfnsRateLimitError } from '../../types/dfns/errors';

export interface DfnsRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  data?: any;
  headers?: Record<string, string>;
  userActionToken?: string;
  timeout?: number;
  retries?: number;
}

export interface DfnsResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  requestId?: string;
  responseTime: number;
}

export interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  rateLimitHits: number;
  authFailures: number;
}

export class DfnsRequestService {
  private metrics: RequestMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    rateLimitHits: 0,
    authFailures: 0
  };

  constructor(private workingClient: WorkingDfnsClient) {}

  /**
   * Make a request to DFNS API with comprehensive error handling and metrics
   */
  async makeRequest<T = any>(options: DfnsRequestOptions): Promise<DfnsResponse<T>> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Prepare request headers according to DFNS spec
      const headers = this.prepareHeaders(options.headers, options.userActionToken);
      
      // Build full URL
      const baseUrl = this.workingClient.getConfig().baseUrl;
      const url = `${baseUrl}${options.endpoint}`;

      // Log request
      console.log(`🌐 DFNS API Request: ${options.method} ${options.endpoint}`, {
        hasUserAction: !!options.userActionToken,
        hasData: !!options.data,
        authMethod: this.workingClient.getAuthMethod()
      });

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: options.method,
        headers,
        signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined
      };

      // Add body for non-GET requests
      if (options.data && (options.method === 'POST' || options.method === 'PUT')) {
        fetchOptions.body = JSON.stringify(options.data);
      }

      // Make the request with retry logic
      const response = await this.makeRequestWithRetries(url, fetchOptions, options.retries || 0);
      
      // Check response status
      if (!response.ok) {
        await this.handleErrorResponse(response, options);
      }

      // Parse response
      const responseData = await this.parseResponse<T>(response);
      const responseTime = Date.now() - startTime;
      
      // Update metrics
      this.metrics.successfulRequests++;
      this.updateAverageResponseTime(responseTime);

      // Log success
      console.log(`✅ DFNS API Success: ${options.method} ${options.endpoint}`, {
        status: response.status,
        responseTime: `${responseTime}ms`
      });

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        requestId: response.headers.get('X-Request-ID') || undefined,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.metrics.failedRequests++;
      
      console.error(`❌ DFNS API Error: ${options.method} ${options.endpoint}`, {
        error: error instanceof Error ? error.message : error,
        responseTime: `${responseTime}ms`
      });

      // Re-throw with additional context
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsNetworkError(
        `Request failed: ${error}`,
        {
          method: options.method,
          endpoint: options.endpoint,
          hasUserAction: !!options.userActionToken,
          responseTime
        }
      );
    }
  }

  /**
   * Prepare request headers according to DFNS authentication requirements
   * https://docs.dfns.co/d/advanced-topics/authentication/request-headers
   */
  private prepareHeaders(customHeaders?: Record<string, string>, userActionToken?: string): Record<string, string> {
    const config = this.workingClient.getConfig();
    
    // Start with default headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add authentication header based on method
    const authMethod = this.workingClient.getAuthMethod();
    
    switch (authMethod) {
      case 'SERVICE_ACCOUNT_TOKEN':
        if (config.hasServiceAccountToken) {
          const token = process.env.VITE_DFNS_SERVICE_ACCOUNT_TOKEN;
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }
        break;
      
      case 'PAT':
        if (config.hasPATToken) {
          const token = process.env.VITE_DFNS_PERSONAL_ACCESS_TOKEN;
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }
        break;
      
      case 'SERVICE_ACCOUNT_KEY':
      case 'LEGACY_KEY':
        // Key-based auth headers are handled by WorkingDfnsClient
        // Don't add Authorization header for key-based auth
        break;
    }

    // Add User Action Signature header if provided
    if (userActionToken) {
      headers['X-DFNS-USERACTION'] = userActionToken;
    }

    // Add application ID if available
    if (config.appId) {
      headers['X-DFNS-APPID'] = config.appId;
    }

    // Add any custom headers
    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  }

  /**
   * Make request with retry logic for transient failures
   */
  private async makeRequestWithRetries(
    url: string, 
    options: RequestInit, 
    retries: number
  ): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`⏳ Retrying DFNS API request (attempt ${attempt + 1}/${retries + 1}) after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const response = await fetch(url, options);
        
        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return response;
        }
        
        // Don't retry on success
        if (response.ok) {
          return response;
        }
        
        // Retry on 5xx errors and 429 (rate limit)
        if (response.status >= 500 || response.status === 429) {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          if (response.status === 429) {
            this.metrics.rateLimitHits++;
            // For rate limits, wait longer
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter && attempt < retries) {
              const delay = parseInt(retryAfter) * 1000;
              console.log(`🚦 Rate limited, waiting ${delay}ms before retry`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
          continue;
        }
        
        return response;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on timeout or network errors if it's the last attempt
        if (attempt === retries) {
          break;
        }
      }
    }
    
    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Handle error responses with specific DFNS error types
   */
  private async handleErrorResponse(response: Response, options: DfnsRequestOptions): Promise<never> {
    let errorData: any = {};
    
    try {
      errorData = await response.json();
    } catch {
      // Response body is not JSON
      errorData = { message: response.statusText };
    }

    const authMethod = this.workingClient.getAuthMethod();
    
    // Handle specific status codes
    switch (response.status) {
      case 401:
        this.metrics.authFailures++;
        throw new DfnsError(
          `Authentication failed: ${errorData.message || 'Invalid or expired token'}`,
          'AUTHENTICATION_FAILED',
          {
            httpStatus: response.status,
            authMethod,
            endpoint: options.endpoint,
            suggestion: this.getAuthenticationSuggestion(authMethod)
          }
        );
      
      case 403:
        throw new DfnsError(
          `Access denied: ${errorData.message || 'Insufficient permissions'}`,
          'ACCESS_DENIED',
          {
            httpStatus: response.status,
            endpoint: options.endpoint,
            hasUserAction: !!options.userActionToken,
            suggestion: options.userActionToken 
              ? 'Check if your credentials have the required permissions'
              : 'This operation may require User Action Signing'
          }
        );
      
      case 429:
        this.metrics.rateLimitHits++;
        const retryAfter = response.headers.get('Retry-After');
        throw new DfnsRateLimitError(
          `Rate limit exceeded: ${errorData.message || 'Too many requests'}`,
          retryAfter ? parseInt(retryAfter) : undefined,
          {
            endpoint: options.endpoint
          }
        );
      
      default:
        throw new DfnsError(
          `API request failed: ${errorData.message || response.statusText}`,
          'API_REQUEST_FAILED',
          {
            httpStatus: response.status,
            endpoint: options.endpoint,
            errorData
          }
        );
    }
  }

  /**
   * Parse response data with error handling
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('Content-Type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (error) {
        throw new DfnsError(
          `Failed to parse JSON response: ${error}`,
          'RESPONSE_PARSE_FAILED'
        );
      }
    } else {
      // For non-JSON responses, return as text
      const text = await response.text();
      return text as unknown as T;
    }
  }

  /**
   * Get authentication suggestion based on method
   */
  private getAuthenticationSuggestion(method: string): string {
    switch (method) {
      case 'SERVICE_ACCOUNT_TOKEN':
        return 'Check VITE_DFNS_SERVICE_ACCOUNT_TOKEN environment variable';
      case 'PAT':
        return 'Check VITE_DFNS_PERSONAL_ACCESS_TOKEN environment variable';
      case 'SERVICE_ACCOUNT_KEY':
        return 'Check service account private key and credential ID';
      case 'LEGACY_KEY':
        return 'Check legacy private key and credential ID';
      default:
        return 'Verify your authentication credentials';
    }
  }

  /**
   * Update average response time metric
   */
  private updateAverageResponseTime(responseTime: number): void {
    const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1);
    this.metrics.averageResponseTime = (totalResponseTime + responseTime) / this.metrics.successfulRequests;
  }

  /**
   * Get request metrics
   */
  getMetrics(): RequestMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rateLimitHits: 0,
      authFailures: 0
    };
  }

  /**
   * Get success rate percentage
   */
  getSuccessRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;
  }
}
