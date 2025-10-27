/**
 * Warp API Client
 * 
 * HTTP client for communicating with the Warp/Beam Payment API.
 * Handles authentication, request/response formatting, error handling,
 * and retry logic.
 * 
 * Base URL: https://api.getWarp.cash (production)
 * Sandbox URL: https://api2.dev.getWarp.cash (sandbox)
 * 
 * Authentication: Bearer token (encrypted Warp API key)
 * Content-Type: application/json
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' } 
    : undefined
});

export interface WarpApiConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface WarpApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class WarpApiClient {
  private readonly client: AxiosInstance;
  private readonly config: WarpApiConfig;
  private readonly baseURL: string;

  constructor(config: WarpApiConfig) {
    this.config = {
      timeout: 30000, // 30 seconds
      retries: 3,
      retryDelay: 1000, // 1 second
      ...config
    };

    // Determine base URL based on environment
    this.baseURL = this.config.environment === 'production'
      ? 'https://api.getWarp.cash'
      : 'https://api2.dev.getWarp.cash';

    // Create Axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug({
          method: config.method,
          url: config.url,
          data: config.data
        }, 'Warp API Request');
        return config;
      },
      (error) => {
        logger.error({ error }, 'Warp API Request Error');
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug({
          status: response.status,
          data: response.data
        }, 'Warp API Response');
        return response;
      },
      async (error: AxiosError) => {
        return this.handleResponseError(error);
      }
    );
  }

  /**
   * Handle response errors with retry logic
   */
  private async handleResponseError(error: AxiosError): Promise<any> {
    const config = error.config as AxiosRequestConfig & { retryCount?: number };
    
    if (!config) {
      return Promise.reject(error);
    }

    // Initialize retry count
    config.retryCount = config.retryCount || 0;

    // Check if we should retry
    const shouldRetry = 
      config.retryCount < (this.config.retries || 3) &&
      this.isRetryableError(error);

    if (shouldRetry) {
      config.retryCount += 1;

      // Calculate exponential backoff delay
      const delay = this.config.retryDelay! * Math.pow(2, config.retryCount - 1);

      logger.warn({
        attempt: config.retryCount,
        maxRetries: this.config.retries,
        delay,
        error: error.message
      }, 'Retrying Warp API request');

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry the request
      return this.client.request(config);
    }

    // Log the final error
    logger.error({
      url: config.url,
      method: config.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    }, 'Warp API Error');

    return Promise.reject(error);
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: AxiosError): boolean {
    if (!error.response) {
      // Network errors are retryable
      return true;
    }

    const status = error.response.status;

    // Retry on:
    // - 408 Request Timeout
    // - 429 Too Many Requests
    // - 500+ Server errors
    return status === 408 || status === 429 || status >= 500;
  }

  /**
   * Make a GET request to Warp API
   */
  async get<T = any>(path: string, params?: any): Promise<WarpApiResponse<T>> {
    try {
      const response = await this.client.get(path, { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Make a POST request to Warp API
   */
  async post<T = any>(path: string, data?: any, config?: AxiosRequestConfig): Promise<WarpApiResponse<T>> {
    try {
      const response = await this.client.post(path, data, config);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Make a PUT request to Warp API
   */
  async put<T = any>(path: string, data?: any): Promise<WarpApiResponse<T>> {
    try {
      const response = await this.client.put(path, data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Make a PATCH request to Warp API
   */
  async patch<T = any>(path: string, data?: any): Promise<WarpApiResponse<T>> {
    try {
      const response = await this.client.patch(path, data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Make a DELETE request to Warp API
   */
  async delete<T = any>(path: string): Promise<WarpApiResponse<T>> {
    try {
      const response = await this.client.delete(path);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Format error response
   */
  private formatError(error: any): WarpApiResponse {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      return {
        success: false,
        error: {
          code: axiosError.code || 'UNKNOWN_ERROR',
          message: axiosError.message,
          details: axiosError.response?.data
        }
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        details: error
      }
    };
  }

  // ==================== WEBHOOK MANAGEMENT ====================

  /**
   * Register a webhook endpoint with Warp
   */
  async registerWebhook(data: {
    authUsername: string;
    authPassword: string;
    callbackUrl: string;
  }): Promise<WarpApiResponse> {
    return this.post('/webhooks', data);
  }

  /**
   * Get registered webhook configuration
   */
  async getWebhook(): Promise<WarpApiResponse> {
    return this.get('/webhooks');
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(data: {
    authUsername: string;
    authPassword: string;
    callbackUrl: string;
  }): Promise<WarpApiResponse> {
    return this.put('/webhooks', data);
  }

  // ==================== IDENTITY (KYB/KYC) ====================

  /**
   * Create an identity verification case
   */
  async createIdentityCase(data: {
    business?: any;
    persons: any[];
  }): Promise<WarpApiResponse> {
    return this.post('/identity/cases', data);
  }

  /**
   * Get identity case status
   */
  async getIdentityCase(caseId: string): Promise<WarpApiResponse> {
    return this.get(`/identity/cases/${caseId}`);
  }

  /**
   * Deactivate an identity case
   */
  async deactivateIdentityCase(caseId: string): Promise<WarpApiResponse> {
    return this.delete(`/identity/cases/${caseId}`);
  }

  // ==================== EXTERNAL ACCOUNTS ====================

  /**
   * Create an external ACH account
   */
  async createExternalAchAccount(data: {
    routingNumber: string;
    accountNumber: string;
    accountType: 'checking' | 'savings';
    description: string;
  }): Promise<WarpApiResponse> {
    return this.post('/smb/externalAccounts/ach', data);
  }

  /**
   * Create an external Wire account
   */
  async createExternalWireAccount(data: {
    routingNumber: string;
    accountNumber: string;
    receiverName: string;
    receiverAddress: any;
    receiverBankName: string;
    receiverBankAddress: any;
    description: string;
  }): Promise<WarpApiResponse> {
    return this.post('/smb/externalAccounts/wire', data);
  }

  /**
   * Create an external crypto account
   */
  async createExternalCryptoAccount(data: {
    description: string;
    address: string;
    network: string;
  }): Promise<WarpApiResponse> {
    return this.post('/smb/externalAccounts/crypto', data);
  }

  /**
   * Get external fiat accounts
   */
  async getExternalFiatAccounts(): Promise<WarpApiResponse> {
    return this.get('/smb/externalAccounts/fiat');
  }

  /**
   * Get external crypto accounts
   */
  async getExternalCryptoAccounts(): Promise<WarpApiResponse> {
    return this.get('/smb/externalAccounts/crypto');
  }

  // ==================== VIRTUAL ACCOUNTS ====================

  /**
   * Create a virtual account
   */
  async createVirtualAccount(data: {
    accountId: string;
    name: string;
  }): Promise<WarpApiResponse> {
    return this.post('/smb/virtualAccounts', data);
  }

  // ==================== WALLETS & BALANCES ====================

  /**
   * Get wallets and deposit instructions
   */
  async getWallets(): Promise<WarpApiResponse> {
    return this.get('/smb/wallets');
  }

  /**
   * Get balances
   */
  async getBalances(virtualAccountId?: string): Promise<WarpApiResponse> {
    return this.get('/smb/balances', { virtualAccountId });
  }

  /**
   * Get market rates
   */
  async getMarketRates(): Promise<WarpApiResponse> {
    return this.get('/smb/market');
  }

  // ==================== PAYMENTS ====================

  /**
   * Create a fiat payment
   */
  async createFiatPayment(data: {
    source: {
      walletId: string;
      virtualAccountId?: string;
    };
    destination: {
      externalAccountId: string;
    };
    amount: string;
    memo?: string;
  }, idempotencyKey?: string): Promise<WarpApiResponse> {
    const config = idempotencyKey 
      ? { headers: { 'idempotency-key': idempotencyKey } }
      : undefined;
    
    return this.post('/smb/transactions/payments/fiat', data, config);
  }

  /**
   * Create a crypto payment
   */
  async createCryptoPayment(data: {
    source: {
      walletId: string;
      virtualAccountId?: string;
    };
    destination: {
      externalAccountId: string;
    };
    amount: string;
    asset: string;
    network: string;
  }, idempotencyKey?: string): Promise<WarpApiResponse> {
    const config = idempotencyKey 
      ? { headers: { 'idempotency-key': idempotencyKey } }
      : undefined;
    
    return this.post('/smb/transactions/payments/crypto', data, config);
  }

  // ==================== TRADES ====================

  /**
   * Create a trade (currency conversion)
   */
  async createTrade(data: {
    source: {
      symbol: string;
      network?: string;
      amount: string;
      virtualAccountId?: string;
    };
    destination: {
      symbol: string;
      network?: string;
    };
  }): Promise<WarpApiResponse> {
    return this.post('/smb/transactions/trades', data);
  }

  // ==================== TRANSACTIONS ====================

  /**
   * Get all transactions
   */
  async getTransactions(): Promise<WarpApiResponse> {
    return this.get('/smb/transactions');
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<WarpApiResponse> {
    return this.get(`/smb/transactions/${id}`);
  }

  // ==================== UTILITY ====================

  /**
   * Get bank details by routing number
   */
  async getBankDetails(routingNumber: string): Promise<WarpApiResponse> {
    return this.get('/utils/directory', { routingNumber });
  }

  /**
   * Get API client configuration
   */
  getConfig(): Readonly<WarpApiConfig> {
    return { ...this.config };
  }

  /**
   * Get base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }
}

export default WarpApiClient;
