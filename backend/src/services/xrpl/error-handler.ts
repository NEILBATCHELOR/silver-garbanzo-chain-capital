/**
 * XRPL Error Handler Service
 * 
 * Centralized error handling for all XRPL operations
 * Provides user-friendly messages and proper logging
 */

import { FastifyReply } from 'fastify'

export enum XRPLErrorCode {
  // Transaction Errors
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  SEQUENCE_ERROR = 'SEQUENCE_ERROR',
  
  // AMM Errors
  AMM_POOL_NOT_FOUND = 'AMM_POOL_NOT_FOUND',
  AMM_INSUFFICIENT_LIQUIDITY = 'AMM_INSUFFICIENT_LIQUIDITY',
  AMM_INVALID_ASSET_PAIR = 'AMM_INVALID_ASSET_PAIR',
  
  // DEX Errors
  DEX_ORDER_NOT_FOUND = 'DEX_ORDER_NOT_FOUND',
  DEX_INSUFFICIENT_BALANCE = 'DEX_INSUFFICIENT_BALANCE',
  DEX_INVALID_PRICE = 'DEX_INVALID_PRICE',
  
  // Multi-sig Errors
  MULTISIG_INSUFFICIENT_SIGNATURES = 'MULTISIG_INSUFFICIENT_SIGNATURES',
  MULTISIG_INVALID_SIGNER = 'MULTISIG_INVALID_SIGNER',
  MULTISIG_QUORUM_NOT_MET = 'MULTISIG_QUORUM_NOT_MET',
  MULTISIG_INVALID_QUORUM = 'MULTISIG_INVALID_QUORUM',
  MULTISIG_UNAUTHORIZED = 'MULTISIG_UNAUTHORIZED',
  MULTISIG_ACCOUNT_NOT_FOUND = 'MULTISIG_ACCOUNT_NOT_FOUND',
  MULTISIG_PROPOSAL_NOT_FOUND = 'MULTISIG_PROPOSAL_NOT_FOUND',
  MULTISIG_ALREADY_SIGNED = 'MULTISIG_ALREADY_SIGNED',
  MULTISIG_PROPOSAL_EXPIRED = 'MULTISIG_PROPOSAL_EXPIRED',
  
  // NFT Errors
  NFT_MINT_FAILED = 'NFT_MINT_FAILED',
  NFT_BURN_FAILED = 'NFT_BURN_FAILED',
  NFT_NOT_FOUND = 'NFT_NOT_FOUND',
  OFFER_CREATION_FAILED = 'OFFER_CREATION_FAILED',
  OFFER_ACCEPT_FAILED = 'OFFER_ACCEPT_FAILED',
  OFFER_CANCEL_FAILED = 'OFFER_CANCEL_FAILED',
  OFFER_NOT_FOUND = 'OFFER_NOT_FOUND',
  
  // Identity Errors
  DID_NOT_FOUND = 'DID_NOT_FOUND',
  DID_ALREADY_EXISTS = 'DID_ALREADY_EXISTS',
  DID_UNAUTHORIZED = 'DID_UNAUTHORIZED',
  CREDENTIAL_NOT_FOUND = 'CREDENTIAL_NOT_FOUND',
  CREDENTIAL_EXPIRED = 'CREDENTIAL_EXPIRED',
  CREDENTIAL_REVOKED = 'CREDENTIAL_REVOKED',
  
  // Compliance Errors
  ACCOUNT_FROZEN = 'ACCOUNT_FROZEN',
  DEPOSIT_NOT_AUTHORIZED = 'DEPOSIT_NOT_AUTHORIZED',
  BLACKLISTED_ACCOUNT = 'BLACKLISTED_ACCOUNT',
  FREEZE_NO_FREEZE_CONFIRMATION_REQUIRED = 'FREEZE_NO_FREEZE_CONFIRMATION_REQUIRED',
  
  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  RPC_ERROR = 'RPC_ERROR',
  
  // Validation Errors
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_CURRENCY = 'INVALID_CURRENCY',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  
  // General Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  NOT_FOUND = 'NOT_FOUND',
  OPERATION_FAILED = 'OPERATION_FAILED',
  QUERY_FAILED = 'QUERY_FAILED'
}

export interface XRPLErrorResponse {
  success: false
  error: {
    code: XRPLErrorCode
    message: string
    details?: any
    timestamp: string
    requestId?: string
  }
}

export class XRPLError extends Error {
  constructor(
    public code: XRPLErrorCode,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'XRPLError'
  }
}

export class XRPLErrorHandler {
  /**
   * Handle XRPL-specific errors
   */
  static handleError(
    error: any,
    reply: FastifyReply,
    requestId?: string
  ): void {
    // Log error
    console.error('[XRPL Error]', {
      code: error.code || 'UNKNOWN',
      message: error.message,
      details: error.details,
      stack: error.stack,
      requestId
    })

    // Determine status code
    const statusCode = this.getStatusCode(error)

    // Format error response
    const response: XRPLErrorResponse = {
      success: false,
      error: {
        code: error.code || XRPLErrorCode.INTERNAL_ERROR,
        message: this.getUserFriendlyMessage(error),
        details: this.sanitizeErrorDetails(error.details),
        timestamp: new Date().toISOString(),
        requestId
      }
    }

    reply.status(statusCode).send(response)
  }

  /**
   * Get HTTP status code for error
   */
  private static getStatusCode(error: any): number {
    if (error instanceof XRPLError) {
      switch (error.code) {
        case XRPLErrorCode.UNAUTHORIZED:
          return 401
        case XRPLErrorCode.FORBIDDEN:
        case XRPLErrorCode.ACCOUNT_FROZEN:
        case XRPLErrorCode.DEPOSIT_NOT_AUTHORIZED:
        case XRPLErrorCode.BLACKLISTED_ACCOUNT:
          return 403
        case XRPLErrorCode.AMM_POOL_NOT_FOUND:
        case XRPLErrorCode.DEX_ORDER_NOT_FOUND:
        case XRPLErrorCode.DID_NOT_FOUND:
        case XRPLErrorCode.RECORD_NOT_FOUND:
        case XRPLErrorCode.NOT_FOUND:
        case XRPLErrorCode.NFT_NOT_FOUND:
        case XRPLErrorCode.OFFER_NOT_FOUND:
          return 404
        case XRPLErrorCode.DID_ALREADY_EXISTS:
        case XRPLErrorCode.DUPLICATE_RECORD:
          return 409
        case XRPLErrorCode.INVALID_ADDRESS:
        case XRPLErrorCode.INVALID_AMOUNT:
        case XRPLErrorCode.INVALID_CURRENCY:
        case XRPLErrorCode.VALIDATION_ERROR:
        case XRPLErrorCode.AMM_INVALID_ASSET_PAIR:
        case XRPLErrorCode.DEX_INVALID_PRICE:
          return 400
        case XRPLErrorCode.NOT_IMPLEMENTED:
          return 501
        default:
          return 500
      }
    }

    // Default to 500 for unknown errors
    return 500
  }

  /**
   * Get user-friendly error message
   */
  private static getUserFriendlyMessage(error: any): string {
    if (error instanceof XRPLError) {
      return error.message
    }

    // Parse XRPL SDK errors
    if (error.message) {
      if (error.message.includes('tecUNFUNDED_PAYMENT')) {
        return 'Insufficient funds to complete this transaction'
      }
      if (error.message.includes('tecNO_DST')) {
        return 'Destination account does not exist'
      }
      if (error.message.includes('tefPAST_SEQ')) {
        return 'Transaction sequence number is too old'
      }
      if (error.message.includes('terRETRY')) {
        return 'Transaction can be retried'
      }
      if (error.message.includes('telINSUF_FEE_P')) {
        return 'Insufficient fee for transaction'
      }
    }

    return 'An unexpected error occurred'
  }

  /**
   * Sanitize error details (remove sensitive information)
   */
  private static sanitizeErrorDetails(details: any): any {
    if (!details) return undefined

    // Remove sensitive fields
    const sanitized = { ...details }
    const sensitiveFields = ['privateKey', 'secret', 'mnemonic', 'seed', 'password']
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    })

    return sanitized
  }

  /**
   * Parse XRPL transaction result codes
   */
  static parseTransactionResult(resultCode: string): XRPLError | null {
    // Success codes
    if (resultCode === 'tesSUCCESS') {
      return null
    }

    // Transaction errors (tec codes - transaction failed but fee was consumed)
    if (resultCode.startsWith('tec')) {
      switch (resultCode) {
        case 'tecUNFUNDED_PAYMENT':
          return new XRPLError(
            XRPLErrorCode.INSUFFICIENT_FUNDS,
            'Insufficient funds to complete payment'
          )
        case 'tecNO_DST':
          return new XRPLError(
            XRPLErrorCode.VALIDATION_ERROR,
            'Destination account does not exist'
          )
        case 'tecNO_AUTH':
          return new XRPLError(
            XRPLErrorCode.DEPOSIT_NOT_AUTHORIZED,
            'Payment requires authorization from recipient'
          )
        case 'tecFROZEN':
          return new XRPLError(
            XRPLErrorCode.ACCOUNT_FROZEN,
            'Account or trust line is frozen'
          )
        default:
          return new XRPLError(
            XRPLErrorCode.TRANSACTION_FAILED,
            `Transaction failed with code: ${resultCode}`
          )
      }
    }

    // Local errors (tel codes - transaction was not applied)
    if (resultCode.startsWith('tel')) {
      return new XRPLError(
        XRPLErrorCode.TRANSACTION_FAILED,
        `Transaction error: ${resultCode}`,
        { resultCode }
      )
    }

    // Malformed transaction (tem codes)
    if (resultCode.startsWith('tem')) {
      return new XRPLError(
        XRPLErrorCode.VALIDATION_ERROR,
        `Invalid transaction format: ${resultCode}`,
        { resultCode }
      )
    }

    // Failure (tef codes - transaction failed)
    if (resultCode.startsWith('tef')) {
      return new XRPLError(
        XRPLErrorCode.TRANSACTION_FAILED,
        `Transaction failed: ${resultCode}`,
        { resultCode }
      )
    }

    // Retry (ter codes - transaction should be retried)
    if (resultCode.startsWith('ter')) {
      return new XRPLError(
        XRPLErrorCode.TRANSACTION_FAILED,
        `Transaction should be retried: ${resultCode}`,
        { resultCode, retryable: true }
      )
    }

    // Unknown error code
    return new XRPLError(
      XRPLErrorCode.TRANSACTION_FAILED,
      `Unknown transaction result: ${resultCode}`,
      { resultCode }
    )
  }

  /**
   * Wrap async route handler with error handling
   */
  static asyncHandler(handler: Function) {
    return async (request: any, reply: FastifyReply) => {
      try {
        await handler(request, reply)
      } catch (error) {
        this.handleError(error, reply, request.id)
      }
    }
  }

  /**
   * Validate XRPL address
   */
  static validateAddress(address: string): void {
    const addressRegex = /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/
    if (!addressRegex.test(address)) {
      throw new XRPLError(
        XRPLErrorCode.INVALID_ADDRESS,
        `Invalid XRPL address: ${address}`
      )
    }
  }

  /**
   * Validate amount
   */
  static validateAmount(amount: string | number): void {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new XRPLError(
        XRPLErrorCode.INVALID_AMOUNT,
        `Invalid amount: ${amount}`
      )
    }
  }

  /**
   * Validate currency code
   */
  static validateCurrency(currency: string): void {
    // Standard currency codes (3 chars) or hex currency codes (40 chars)
    const standardRegex = /^[A-Z]{3}$/
    const hexRegex = /^[0-9A-F]{40}$/i
    
    if (!standardRegex.test(currency) && !hexRegex.test(currency)) {
      throw new XRPLError(
        XRPLErrorCode.INVALID_CURRENCY,
        `Invalid currency code: ${currency}`
      )
    }
  }
}

// Export convenience function
export const handleXRPLError = XRPLErrorHandler.handleError.bind(XRPLErrorHandler)
export const asyncHandler = XRPLErrorHandler.asyncHandler.bind(XRPLErrorHandler)
