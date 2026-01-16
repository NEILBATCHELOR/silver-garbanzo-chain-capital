/**
 * NFT Validator
 * Validation logic for Non-Fungible Token operations
 */

import { NFTMintRequest, NFTOfferRequest } from '../../types/xrpl'

export class NFTValidator {
  /**
   * Validate NFT mint request
   */
  static validateMintRequest(data: Partial<NFTMintRequest>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Validate issuer address
    if (!data.issuerAddress) {
      errors.push('Issuer address is required')
    } else if (!this.isValidXRPLAddress(data.issuerAddress)) {
      errors.push('Invalid issuer XRPL address format')
    }

    // Validate URI if provided
    if (data.uri && data.uri.length > 512) {
      errors.push('URI cannot exceed 512 bytes')
    }

    // Validate transfer fee if provided
    if (data.transferFee !== undefined && data.transferFee !== null) {
      if (!Number.isInteger(data.transferFee) || data.transferFee < 0 || data.transferFee > 50000) {
        errors.push('Transfer fee must be an integer between 0 and 50000 (0-50%)')
      }
    }

    // Validate taxon if provided
    if (data.taxon !== undefined && data.taxon !== null) {
      if (!Number.isInteger(data.taxon) || data.taxon < 0) {
        errors.push('Taxon must be a non-negative integer')
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
   * Validate NFT offer request
   */
  static validateOfferRequest(data: Partial<NFTOfferRequest>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Validate NFT ID
    if (!data.nftId) {
      errors.push('NFT ID is required')
    } else if (!this.isValidNFTId(data.nftId)) {
      errors.push('Invalid NFT ID format')
    }

    // Validate offer type
    if (!data.offerType || !['sell', 'buy'].includes(data.offerType)) {
      errors.push('Offer type must be either "sell" or "buy"')
    }

    // Validate amount
    if (!data.amount) {
      errors.push('Amount is required')
    } else if (!this.isValidAmount(data.amount)) {
      errors.push('Invalid amount format')
    }

    // Validate sell offer specific fields
    if (data.offerType === 'sell') {
      if (data.destination && !this.isValidXRPLAddress(data.destination)) {
        errors.push('Invalid destination XRPL address format')
      }
    }

    // Validate buy offer specific fields
    if (data.offerType === 'buy') {
      if (!data.owner) {
        errors.push('Owner address is required for buy offers')
      } else if (!this.isValidXRPLAddress(data.owner)) {
        errors.push('Invalid owner XRPL address format')
      }
    }

    // Validate currency/issuer pair
    if (data.currencyCode) {
      if (!this.isValidCurrencyCode(data.currencyCode)) {
        errors.push('Invalid currency code format')
      }
      if (!data.issuerAddress) {
        errors.push('Issuer address is required when currency is specified')
      } else if (!this.isValidXRPLAddress(data.issuerAddress)) {
        errors.push('Invalid issuer XRPL address format')
      }
    }

    // Validate expiration if provided
    if (data.expiration !== undefined && data.expiration !== null) {
      if (!Number.isInteger(data.expiration) || data.expiration <= Math.floor(Date.now() / 1000)) {
        errors.push('Expiration must be a future Unix timestamp')
      }
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
   * Check if NFT ID is valid format
   */
  private static isValidNFTId(id: string): boolean {
    // NFT ID is 64 character hex string
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

  /**
   * Check if currency code is valid
   */
  private static isValidCurrencyCode(code: string): boolean {
    // Standard currency codes (3 characters) or hex-encoded (40 characters)
    return /^[A-Z0-9]{3}$/.test(code) || /^[0-9A-Fa-f]{40}$/.test(code)
  }
}
