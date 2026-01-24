/**
 * Modern Solana Error Handler
 * 
 * Comprehensive error handling and mapping for Solana operations
 * Converts technical errors into user-friendly messages with actionable suggestions
 * 
 * Features:
 * - Error categorization
 * - User-friendly messages
 * - Recovery suggestions
 * - Error codes for tracking
 */

import type { SolanaNetwork } from './ModernSolanaTypes';

// ============================================================================
// TYPES
// ============================================================================

export type ErrorCategory = 
  | 'network'
  | 'account'
  | 'transaction'
  | 'balance'
  | 'validation'
  | 'unknown';

export interface SolanaError {
  code: string;
  category: ErrorCategory;
  message: string; // Technical message
  userMessage: string; // User-friendly message
  recoverable: boolean;
  suggestedAction?: string;
  details?: Record<string, any>;
}

// ============================================================================
// ERROR CODES
// ============================================================================

export const ERROR_CODES = {
  // Network errors
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RPC_ERROR: 'RPC_ERROR',
  
  // Account errors
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  INVALID_ACCOUNT: 'INVALID_ACCOUNT',
  INVALID_OWNER: 'INVALID_OWNER',
  ACCOUNT_ALREADY_EXISTS: 'ACCOUNT_ALREADY_EXISTS',
  
  // Balance errors
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INSUFFICIENT_TOKEN_BALANCE: 'INSUFFICIENT_TOKEN_BALANCE',
  
  // Transaction errors
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  SIGNATURE_VERIFICATION_FAILED: 'SIGNATURE_VERIFICATION_FAILED',
  BLOCKHASH_NOT_FOUND: 'BLOCKHASH_NOT_FOUND',
  TRANSACTION_EXPIRED: 'TRANSACTION_EXPIRED',
  
  // Validation errors
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_DECIMALS: 'INVALID_DECIMALS',
  
  // Unknown
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

// ============================================================================
// MODERN SOLANA ERROR HANDLER
// ============================================================================

export class ModernSolanaErrorHandler {
  /**
   * Handle transfer-specific errors
   */
  static handleTransferError(error: any, network?: SolanaNetwork): SolanaError {
    const errorMsg = this.extractErrorMessage(error);

    // Insufficient funds for fees
    if (this.matchesPattern(errorMsg, [
      'insufficient funds',
      'insufficient lamports',
      'account does not have enough lamports'
    ])) {
      return {
        code: ERROR_CODES.INSUFFICIENT_FUNDS,
        category: 'balance',
        message: errorMsg,
        userMessage: 'Insufficient SOL for transaction fees',
        recoverable: true,
        suggestedAction: 'Add more SOL to your wallet to cover transaction fees (typically 0.000005 SOL)',
        details: { network }
      };
    }

    // Insufficient token balance
    if (this.matchesPattern(errorMsg, [
      'insufficient token balance',
      'transfer amount exceeds balance'
    ])) {
      return {
        code: ERROR_CODES.INSUFFICIENT_TOKEN_BALANCE,
        category: 'balance',
        message: errorMsg,
        userMessage: 'Insufficient token balance for transfer',
        recoverable: false,
        suggestedAction: 'Reduce the transfer amount or check your token balance'
      };
    }

    // Account not found
    if (this.matchesPattern(errorMsg, [
      'AccountNotFound',
      'could not find account',
      'account does not exist'
    ])) {
      return {
        code: ERROR_CODES.ACCOUNT_NOT_FOUND,
        category: 'account',
        message: errorMsg,
        userMessage: 'Token account not found',
        recoverable: true,
        suggestedAction: 'Token account will be created automatically (requires ~0.002 SOL)'
      };
    }

    // Invalid account owner
    if (this.matchesPattern(errorMsg, [
      'InvalidAccountOwner',
      'account not owned by program',
      'owner mismatch'
    ])) {
      return {
        code: ERROR_CODES.INVALID_OWNER,
        category: 'account',
        message: errorMsg,
        userMessage: 'You do not own this token account',
        recoverable: false,
        suggestedAction: 'Verify you are using the correct wallet and token address'
      };
    }

    // Network/RPC errors
    if (this.matchesPattern(errorMsg, [
      'timeout',
      'timed out',
      'network error',
      'failed to fetch'
    ])) {
      return {
        code: ERROR_CODES.NETWORK_TIMEOUT,
        category: 'network',
        message: errorMsg,
        userMessage: 'Network connection timeout',
        recoverable: true,
        suggestedAction: 'Check your internet connection and try again'
      };
    }

    // Blockhash expired
    if (this.matchesPattern(errorMsg, [
      'Blockhash not found',
      'blockhash expired',
      'block height exceeded'
    ])) {
      return {
        code: ERROR_CODES.TRANSACTION_EXPIRED,
        category: 'transaction',
        message: errorMsg,
        userMessage: 'Transaction expired',
        recoverable: true,
        suggestedAction: 'Try the transaction again - it will use a fresh blockhash'
      };
    }

    // Default transfer error
    return {
      code: ERROR_CODES.TRANSACTION_FAILED,
      category: 'transaction',
      message: errorMsg,
      userMessage: 'Transfer failed',
      recoverable: true,
      suggestedAction: 'Review transaction details and try again'
    };
  }

  /**
   * Handle burn-specific errors
   */
  static handleBurnError(error: any, network?: SolanaNetwork): SolanaError {
    const errorMsg = this.extractErrorMessage(error);

    // Insufficient token balance
    if (this.matchesPattern(errorMsg, [
      'insufficient token balance',
      'insufficient funds',
      'burn amount exceeds balance',
      'amount exceeds available balance'
    ])) {
      return {
        code: ERROR_CODES.INSUFFICIENT_TOKEN_BALANCE,
        category: 'balance',
        message: errorMsg,
        userMessage: 'Insufficient token balance to burn',
        recoverable: false,
        suggestedAction: 'Cannot burn more tokens than you own. Check your token balance.'
      };
    }

    // Token account not found
    if (this.matchesPattern(errorMsg, [
      'AccountNotFound',
      'could not find account',
      'account does not exist',
      'token account not found'
    ])) {
      return {
        code: ERROR_CODES.ACCOUNT_NOT_FOUND,
        category: 'account',
        message: errorMsg,
        userMessage: 'Token account not found',
        recoverable: false,
        suggestedAction: 'Token account does not exist or you do not own any tokens'
      };
    }

    // Invalid burn authority
    if (this.matchesPattern(errorMsg, [
      'InvalidAccountOwner',
      'account not owned by program',
      'owner mismatch',
      'invalid authority',
      'unauthorized'
    ])) {
      return {
        code: ERROR_CODES.INVALID_OWNER,
        category: 'account',
        message: errorMsg,
        userMessage: 'You do not have permission to burn these tokens',
        recoverable: false,
        suggestedAction: 'Only the token owner or approved delegate can burn tokens'
      };
    }

    // Insufficient SOL for transaction
    if (this.matchesPattern(errorMsg, [
      'insufficient funds for fee',
      'insufficient lamports'
    ])) {
      return {
        code: ERROR_CODES.INSUFFICIENT_FUNDS,
        category: 'balance',
        message: errorMsg,
        userMessage: 'Insufficient SOL for burn transaction fees',
        recoverable: true,
        suggestedAction: 'Add a small amount of SOL to cover transaction fees (~0.000005 SOL)',
        details: { network }
      };
    }

    // Fallback to transfer error handling for common errors
    return this.handleTransferError(error, network);
  }

  /**
   * Handle deployment-specific errors
   */
  static handleDeploymentError(error: any, network?: SolanaNetwork): SolanaError {
    const errorMsg = this.extractErrorMessage(error);

    // Insufficient funds for deployment
    if (this.matchesPattern(errorMsg, [
      'insufficient funds',
      'insufficient lamports'
    ])) {
      return {
        code: ERROR_CODES.INSUFFICIENT_FUNDS,
        category: 'balance',
        message: errorMsg,
        userMessage: 'Insufficient SOL for token deployment',
        recoverable: true,
        suggestedAction: 'Token deployment requires SOL for rent and fees. Add more SOL to your wallet.',
        details: { 
          network,
          estimatedCost: '~0.005 SOL for SPL token, ~0.01 SOL for Token-2022'
        }
      };
    }

    // Account already exists
    if (this.matchesPattern(errorMsg, [
      'account already in use',
      'account already exists'
    ])) {
      return {
        code: ERROR_CODES.ACCOUNT_ALREADY_EXISTS,
        category: 'account',
        message: errorMsg,
        userMessage: 'Token mint account already exists',
        recoverable: false,
        suggestedAction: 'Use a different mint keypair or check if token was already deployed'
      };
    }

    // Invalid extension configuration
    if (this.matchesPattern(errorMsg, [
      'invalid extension',
      'extension not supported',
      'incompatible extensions'
    ])) {
      return {
        code: 'INVALID_EXTENSION_CONFIG',
        category: 'validation',
        message: errorMsg,
        userMessage: 'Invalid token extension configuration',
        recoverable: true,
        suggestedAction: 'Review your extension selections for compatibility issues'
      };
    }

    return this.handleTransferError(error, network);
  }

  /**
   * Handle RPC/network errors
   */
  static handleRpcError(error: any): SolanaError {
    const errorMsg = this.extractErrorMessage(error);

    // RPC method errors
    if (this.matchesPattern(errorMsg, [
      'method not found',
      'invalid method'
    ])) {
      return {
        code: ERROR_CODES.RPC_ERROR,
        category: 'network',
        message: errorMsg,
        userMessage: 'RPC endpoint does not support this method',
        recoverable: false,
        suggestedAction: 'Try using a different RPC endpoint or upgrade your RPC provider'
      };
    }

    // Rate limiting
    if (this.matchesPattern(errorMsg, [
      'rate limit',
      'too many requests',
      '429'
    ])) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        category: 'network',
        message: errorMsg,
        userMessage: 'RPC rate limit exceeded',
        recoverable: true,
        suggestedAction: 'Wait a moment and try again, or use a different RPC endpoint'
      };
    }

    return {
      code: ERROR_CODES.NETWORK_ERROR,
      category: 'network',
      message: errorMsg,
      userMessage: 'Network request failed',
      recoverable: true,
      suggestedAction: 'Check network connection and RPC endpoint status'
    };
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(field: string, issue: string): SolanaError {
    const errorMap: Record<string, SolanaError> = {
      address: {
        code: ERROR_CODES.INVALID_ADDRESS,
        category: 'validation',
        message: `Invalid Solana address: ${issue}`,
        userMessage: 'Invalid Solana address format',
        recoverable: true,
        suggestedAction: 'Enter a valid Solana address (32-44 characters, base58 encoded)'
      },
      amount: {
        code: ERROR_CODES.INVALID_AMOUNT,
        category: 'validation',
        message: `Invalid amount: ${issue}`,
        userMessage: 'Invalid transfer amount',
        recoverable: true,
        suggestedAction: 'Amount must be a positive number'
      },
      decimals: {
        code: ERROR_CODES.INVALID_DECIMALS,
        category: 'validation',
        message: `Invalid decimals: ${issue}`,
        userMessage: 'Invalid token decimals',
        recoverable: true,
        suggestedAction: 'Decimals must be between 0 and 9'
      }
    };

    return errorMap[field] || {
      code: 'VALIDATION_ERROR',
      category: 'validation',
      message: issue,
      userMessage: `Invalid ${field}`,
      recoverable: true,
      suggestedAction: 'Please check your input and try again'
    };
  }

  /**
   * Generic error handler (fallback)
   */
  static handleGenericError(error: any): SolanaError {
    const errorMsg = this.extractErrorMessage(error);

    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      category: 'unknown',
      message: errorMsg,
      userMessage: 'An unexpected error occurred',
      recoverable: false,
      suggestedAction: 'Please try again or contact support if the issue persists',
      details: {
        originalError: errorMsg
      }
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Extract error message from various error formats
   */
  private static extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.error?.message) {
      return error.error.message;
    }

    if (error?.data?.message) {
      return error.data.message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  /**
   * Check if error message matches any pattern
   */
  private static matchesPattern(message: string, patterns: string[]): boolean {
    const lowerMsg = message.toLowerCase();
    return patterns.some(pattern => lowerMsg.includes(pattern.toLowerCase()));
  }

  /**
   * Format error for logging
   */
  static formatErrorForLogging(error: SolanaError): string {
    return `[${error.code}] ${error.category}: ${error.message}`;
  }

  /**
   * Format error for user display
   */
  static formatErrorForDisplay(error: SolanaError): string {
    let display = error.userMessage;
    
    if (error.suggestedAction) {
      display += `\n\n${error.suggestedAction}`;
    }

    return display;
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: SolanaError): boolean {
    return error.recoverable;
  }

  /**
   * Get error category
   */
  static getCategory(error: SolanaError): ErrorCategory {
    return error.category;
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Quick access error handlers
 */
export const handleSolanaError = {
  transfer: (error: any, network?: SolanaNetwork) =>
    ModernSolanaErrorHandler.handleTransferError(error, network),
  
  burn: (error: any, network?: SolanaNetwork) =>
    ModernSolanaErrorHandler.handleBurnError(error, network),
  
  deployment: (error: any, network?: SolanaNetwork) =>
    ModernSolanaErrorHandler.handleDeploymentError(error, network),
  
  rpc: (error: any) =>
    ModernSolanaErrorHandler.handleRpcError(error),
  
  validation: (field: string, issue: string) =>
    ModernSolanaErrorHandler.handleValidationError(field, issue),
  
  generic: (error: any) =>
    ModernSolanaErrorHandler.handleGenericError(error)
};

export default ModernSolanaErrorHandler;
