/**
 * DFNS Error Types
 * 
 * Types for DFNS error handling and specific error cases
 */

// Base DFNS Error
export class DfnsError extends Error {
  code: string;
  details?: Record<string, any>;
  statusCode?: number;
  requestId?: string;

  constructor(
    message: string,
    code: string,
    details?: Record<string, any>,
    statusCode?: number,
    requestId?: string
  ) {
    super(message);
    this.name = 'DfnsError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

// Authentication Errors
export class DfnsAuthenticationError extends DfnsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', details, 401);
    this.name = 'DfnsAuthenticationError';
  }
}

// Authorization Errors
export class DfnsAuthorizationError extends DfnsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'AUTHORIZATION_ERROR', details, 403);
    this.name = 'DfnsAuthorizationError';
  }
}

// Validation Errors
export class DfnsValidationError extends DfnsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details, 400);
    this.name = 'DfnsValidationError';
  }
}

// Network Errors
export class DfnsNetworkError extends DfnsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'DfnsNetworkError';
  }
}

// Rate Limit Errors
export class DfnsRateLimitError extends DfnsError {
  retryAfter?: number;

  constructor(message: string, retryAfter?: number, details?: Record<string, any>) {
    super(message, 'RATE_LIMIT_ERROR', details, 429);
    this.name = 'DfnsRateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Wallet Errors
export class DfnsWalletError extends DfnsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'WALLET_ERROR', details);
    this.name = 'DfnsWalletError';
  }
}

// Transaction Errors
export class DfnsTransactionError extends DfnsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'TRANSACTION_ERROR', details);
    this.name = 'DfnsTransactionError';
  }
}

// Credential Errors
export class DfnsCredentialError extends DfnsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CREDENTIAL_ERROR', details);
    this.name = 'DfnsCredentialError';
  }
}

// Policy Errors
export class DfnsPolicyError extends DfnsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'POLICY_ERROR', details);
    this.name = 'DfnsPolicyError';
  }
}

// SDK Errors
export class DfnsSdkError extends DfnsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'SDK_ERROR', details);
    this.name = 'DfnsSdkError';
  }
}

// Webhook Errors
export class DfnsWebhookError extends DfnsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'WEBHOOK_ERROR', details);
    this.name = 'DfnsWebhookError';
  }
}

// Error Code Mapping
export const DFNS_ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'Invalid credentials provided',
  AUTH_TOKEN_EXPIRED: 'Authentication token has expired',
  AUTH_CHALLENGE_FAILED: 'Authentication challenge failed',
  AUTH_MFA_REQUIRED: 'Multi-factor authentication required',
  
  // Authorization
  AUTHZ_INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this operation',
  AUTHZ_POLICY_VIOLATION: 'Operation violates security policy',
  AUTHZ_APPROVAL_REQUIRED: 'Operation requires approval',
  
  // Validation
  VALIDATION_INVALID_ADDRESS: 'Invalid wallet address format',
  VALIDATION_INVALID_AMOUNT: 'Invalid transaction amount',
  VALIDATION_MISSING_FIELDS: 'Required fields are missing',
  
  // Wallet
  WALLET_NOT_FOUND: 'Wallet not found',
  WALLET_INSUFFICIENT_BALANCE: 'Insufficient wallet balance',
  WALLET_NETWORK_MISMATCH: 'Network mismatch for wallet operation',
  
  // Transaction
  TX_BROADCAST_FAILED: 'Failed to broadcast transaction',
  TX_CONFIRMATION_TIMEOUT: 'Transaction confirmation timeout',
  TX_INVALID_SIGNATURE: 'Invalid transaction signature',
  
  // Network
  NETWORK_TIMEOUT: 'Network request timeout',
  NETWORK_UNAVAILABLE: 'Network service unavailable',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'API rate limit exceeded',
  
  // General
  INTERNAL_ERROR: 'Internal server error',
  MAINTENANCE_MODE: 'Service is in maintenance mode'
} as const;

// Error Factory
export class DfnsErrorFactory {
  static fromApiResponse(response: {
    status: number;
    data?: {
      error?: {
        code: string;
        message: string;
        details?: Record<string, any>;
      };
    };
    headers?: Record<string, string>;
  }): DfnsError {
    const errorData = response.data?.error;
    const code = errorData?.code || 'UNKNOWN_ERROR';
    const message = errorData?.message || 'An unknown error occurred';
    const details = errorData?.details;

    switch (response.status) {
      case 401:
        return new DfnsAuthenticationError(message, details);
      case 403:
        return new DfnsAuthorizationError(message, details);
      case 400:
        return new DfnsValidationError(message, details);
      case 429:
        const retryAfter = response.headers?.['retry-after'] 
          ? parseInt(response.headers['retry-after']) 
          : undefined;
        return new DfnsRateLimitError(message, retryAfter, details);
      default:
        return new DfnsError(message, code, details, response.status);
    }
  }

  static fromNetworkError(error: Error): DfnsNetworkError {
    return new DfnsNetworkError(`Network error: ${error.message}`, {
      originalError: error.message
    });
  }
}
