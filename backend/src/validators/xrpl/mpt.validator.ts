/**
 * MPT Validator
 * Validation logic for Multi-Purpose Token operations
 */

import { 
  MPTIssuanceRequest, 
  MPTAuthorizationRequest, 
  MPTTransferRequest 
} from '../../types/xrpl'

export class MPTValidator {
  /**
   * Validate MPT issuance creation request
   */
  static validateIssuanceRequest(data: Partial<MPTIssuanceRequest>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Validate project ID
    if (!data.projectId) {
      errors.push('Project ID is required')
    }

    // Validate issuer address
    if (!data.issuerAddress) {
      errors.push('Issuer address is required')
    } else if (!this.isValidXRPLAddress(data.issuerAddress)) {
      errors.push('Invalid XRPL address format')
    }

    // Validate asset scale
    if (data.assetScale === undefined || data.assetScale === null) {
      errors.push('Asset scale is required')
    } else if (!Number.isInteger(data.assetScale) || data.assetScale < 0 || data.assetScale > 15) {
      errors.push('Asset scale must be an integer between 0 and 15')
    }

    // Validate transfer fee if provided
    if (data.transferFee !== undefined && data.transferFee !== null) {
      if (!Number.isInteger(data.transferFee) || data.transferFee < 0 || data.transferFee > 50000) {
        errors.push('Transfer fee must be an integer between 0 and 50000 (0-50%)')
      }
    }

    // Validate metadata
    if (!data.metadata) {
      errors.push('Metadata is required')
    } else {
      if (!data.metadata.ticker || data.metadata.ticker.length < 1 || data.metadata.ticker.length > 10) {
        errors.push('Ticker must be between 1 and 10 characters')
      }
      if (!data.metadata.name || data.metadata.name.length < 1) {
        errors.push('Token name is required')
      }
      if (!data.metadata.desc || data.metadata.desc.length < 1) {
        errors.push('Token description is required')
      }
      
      // Validate metadata size (must be under 1024 bytes when encoded)
      const metadataStr = JSON.stringify(data.metadata)
      if (Buffer.from(metadataStr).length > 1024) {
        errors.push('Metadata exceeds 1024 byte limit')
      }
    }

    // Validate flags
    if (!data.flags) {
      errors.push('Flags object is required')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate MPT authorization request
   */
  static validateAuthorizationRequest(data: Partial<MPTAuthorizationRequest>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!data.holderAddress) {
      errors.push('Holder address is required')
    } else if (!this.isValidXRPLAddress(data.holderAddress)) {
      errors.push('Invalid holder XRPL address format')
    }

    if (!data.mptIssuanceId) {
      errors.push('MPT Issuance ID is required')
    } else if (!this.isValidMPTIssuanceId(data.mptIssuanceId)) {
      errors.push('Invalid MPT Issuance ID format')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate MPT transfer request
   */
  static validateTransferRequest(data: Partial<MPTTransferRequest>): {
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

    if (!data.mptIssuanceId) {
      errors.push('MPT Issuance ID is required')
    } else if (!this.isValidMPTIssuanceId(data.mptIssuanceId)) {
      errors.push('Invalid MPT Issuance ID format')
    }

    if (!data.amount) {
      errors.push('Amount is required')
    } else if (!this.isValidAmount(data.amount)) {
      errors.push('Invalid amount format')
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
   * Check if MPT Issuance ID is valid format
   */
  private static isValidMPTIssuanceId(id: string): boolean {
    // MPT Issuance ID is 64 character hex string
    return /^[0-9A-Fa-f]{64}$/.test(id)
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
}
