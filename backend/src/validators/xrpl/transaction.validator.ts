/**
 * Transaction Validator
 * Validation logic for XRPL transaction operations
 */

import {
  PaymentChannelCreateRequest,
  PaymentChannelClaimRequest,
  EscrowCreateRequest,
  EscrowFinishRequest,
  CheckCreateRequest,
  CheckCashRequest
} from '../../types/xrpl'

export class TransactionValidator {
  /**
   * Validate payment channel creation request
   */
  static validateChannelCreateRequest(data: Partial<PaymentChannelCreateRequest>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!data.sourceAddress) {
      errors.push('Source address is required')
    } else if (!this.isValidXRPLAddress(data.sourceAddress)) {
      errors.push('Invalid source XRPL address format')
    }

    if (!data.destinationAddress) {
      errors.push('Destination address is required')
    } else if (!this.isValidXRPLAddress(data.destinationAddress)) {
      errors.push('Invalid destination XRPL address format')
    }

    if (data.sourceAddress && data.destinationAddress && 
        data.sourceAddress === data.destinationAddress) {
      errors.push('Source and destination addresses must be different')
    }

    if (!data.amount) {
      errors.push('Amount is required')
    } else if (!this.isValidXRPAmount(data.amount)) {
      errors.push('Invalid XRP amount format')
    }

    if (!data.settleDelay && data.settleDelay !== 0) {
      errors.push('Settle delay is required')
    } else if (!Number.isInteger(data.settleDelay) || data.settleDelay < 0) {
      errors.push('Settle delay must be a non-negative integer')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate payment channel claim request
   */
  static validateChannelClaimRequest(data: Partial<PaymentChannelClaimRequest>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!data.channelId) {
      errors.push('Channel ID is required')
    } else if (!this.isValidHex(data.channelId, 64)) {
      errors.push('Invalid channel ID format')
    }

    if (!data.destinationAddress) {
      errors.push('Destination address is required')
    } else if (!this.isValidXRPLAddress(data.destinationAddress)) {
      errors.push('Invalid destination XRPL address format')
    }

    if (!data.amount) {
      errors.push('Amount is required')
    } else if (!this.isValidXRPAmount(data.amount)) {
      errors.push('Invalid XRP amount format')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate escrow creation request
   */
  static validateEscrowCreateRequest(data: Partial<EscrowCreateRequest>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!data.senderAddress) {
      errors.push('Sender address is required')
    } else if (!this.isValidXRPLAddress(data.senderAddress)) {
      errors.push('Invalid sender XRPL address format')
    }

    if (!data.destinationAddress) {
      errors.push('Destination address is required')
    } else if (!this.isValidXRPLAddress(data.destinationAddress)) {
      errors.push('Invalid destination XRPL address format')
    }

    if (data.senderAddress && data.destinationAddress && 
        data.senderAddress === data.destinationAddress) {
      errors.push('Sender and destination addresses must be different')
    }

    if (!data.amount) {
      errors.push('Amount is required')
    } else if (!this.isValidXRPAmount(data.amount)) {
      errors.push('Invalid XRP amount format')
    }

    // Must have either finishAfter or condition
    if (!data.finishAfter && !data.condition) {
      errors.push('Either finishAfter or condition must be provided')
    }

    // Validate time constraints
    if (data.finishAfter && data.cancelAfter && data.finishAfter >= data.cancelAfter) {
      errors.push('finishAfter must be before cancelAfter')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate escrow finish request
   */
  static validateEscrowFinishRequest(data: Partial<EscrowFinishRequest>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!data.ownerAddress) {
      errors.push('Owner address is required')
    } else if (!this.isValidXRPLAddress(data.ownerAddress)) {
      errors.push('Invalid owner XRPL address format')
    }

    if (data.sequence === undefined || data.sequence === null) {
      errors.push('Sequence is required')
    } else if (!Number.isInteger(data.sequence) || data.sequence < 0) {
      errors.push('Sequence must be a non-negative integer')
    }

    // If condition exists, fulfillment is required
    if (data.condition && !data.fulfillment) {
      errors.push('Fulfillment is required when condition is present')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate check creation request
   */
  static validateCheckCreateRequest(data: Partial<CheckCreateRequest>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!data.senderAddress) {
      errors.push('Sender address is required')
    } else if (!this.isValidXRPLAddress(data.senderAddress)) {
      errors.push('Invalid sender XRPL address format')
    }

    if (!data.destinationAddress) {
      errors.push('Destination address is required')
    } else if (!this.isValidXRPLAddress(data.destinationAddress)) {
      errors.push('Invalid destination XRPL address format')
    }

    if (data.senderAddress && data.destinationAddress && 
        data.senderAddress === data.destinationAddress) {
      errors.push('Sender and destination addresses must be different')
    }

    if (!data.sendMax) {
      errors.push('SendMax amount is required')
    } else if (!this.isValidAmount(data.sendMax)) {
      errors.push('Invalid sendMax amount format')
    }

    // Validate currency/issuer pair if provided
    if (data.currencyCode) {
      if (!this.isValidCurrencyCode(data.currencyCode)) {
        errors.push('Invalid currency code format')
      }
      if (!data.issuerAddress) {
        errors.push('Issuer is required when currency is specified')
      } else if (!this.isValidXRPLAddress(data.issuerAddress)) {
        errors.push('Invalid issuer XRPL address format')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate check cash request
   */
  static validateCheckCashRequest(data: Partial<CheckCashRequest>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!data.checkId) {
      errors.push('Check ID is required')
    } else if (!this.isValidHex(data.checkId, 64)) {
      errors.push('Invalid check ID format')
    }

    // Must have either amount or deliverMin
    if (!data.amount && !data.deliverMin) {
      errors.push('Either amount or deliverMin must be provided')
    }

    if (data.amount && !this.isValidAmount(data.amount)) {
      errors.push('Invalid amount format')
    }

    if (data.deliverMin && !this.isValidAmount(data.deliverMin)) {
      errors.push('Invalid deliverMin format')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if address is valid XRPL format
   */
  private static isValidXRPLAddress(address: string): boolean {
    return /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)
  }

  /**
   * Check if hex string is valid with specific length
   */
  private static isValidHex(value: string, length?: number): boolean {
    const hexPattern = length ? new RegExp(`^[0-9A-Fa-f]{${length}}$`) : /^[0-9A-Fa-f]+$/
    return hexPattern.test(value)
  }

  /**
   * Check if amount is valid XRP amount (drops)
   */
  private static isValidXRPAmount(amount: string): boolean {
    try {
      const num = parseInt(amount, 10)
      return !isNaN(num) && num > 0 && num <= 1e17 && amount === num.toString()
    } catch {
      return false
    }
  }

  /**
   * Check if amount is valid
   */
  private static isValidAmount(amount: string): boolean {
    try {
      const num = parseFloat(amount)
      return !isNaN(num) && num > 0 && isFinite(num)
    } catch {
      return false
    }
  }

  /**
   * Check if currency code is valid
   */
  private static isValidCurrencyCode(code: string): boolean {
    // Standard currency codes (3 characters) or hex-encoded (40 characters)
    return /^[A-Z0-9]{3}$/.test(code) || /^[0-9A-Fa-f]{40}$/.test(code)
  }
}
