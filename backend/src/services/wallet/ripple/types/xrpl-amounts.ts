/**
 * XRPL Amount Type Definitions
 * 
 * XRPL uses two different types for amounts:
 * - String: For XRP (drops)
 * - Object: For issued currencies
 */

/**
 * XRP Amount - represented as string in drops
 */
export type XRPAmount = string

/**
 * Issued Currency Amount
 */
export interface IssuedCurrencyAmount {
  currency: string
  issuer: string
  value: string
}

/**
 * Generic XRPL Amount - can be XRP or issued currency
 */
export type Amount = XRPAmount | IssuedCurrencyAmount

/**
 * Asset descriptor for AMM/DEX operations
 * This matches the format expected by XRPL SDK
 */
export interface AssetDescriptor {
  currency: string
  issuer?: string // Optional for XRP, required for issued currencies
}

/**
 * Helper to convert AssetDescriptor to Amount
 */
export function assetToAmount(asset: AssetDescriptor, value: string): Amount {
  if (asset.currency === 'XRP') {
    // For XRP, just return the value as drops
    return value
  } else {
    // For issued currency, return object with issuer
    return {
      currency: asset.currency,
      issuer: asset.issuer!,
      value
    }
  }
}

/**
 * Helper to check if amount is XRP
 */
export function isXRP(amount: Amount): amount is XRPAmount {
  return typeof amount === 'string'
}

/**
 * Helper to check if amount is issued currency
 */
export function isIssuedCurrency(amount: Amount): amount is IssuedCurrencyAmount {
  return typeof amount === 'object'
}

/**
 * Helper to extract currency from amount
 */
export function getCurrency(amount: Amount): string {
  if (isXRP(amount)) {
    return 'XRP'
  }
  return amount.currency
}

/**
 * Helper to extract issuer from amount
 */
export function getIssuer(amount: Amount): string | undefined {
  if (isIssuedCurrency(amount)) {
    return amount.issuer
  }
  return undefined
}

/**
 * Helper to extract value from amount
 */
export function getValue(amount: Amount): string {
  if (isXRP(amount)) {
    return amount
  }
  return amount.value
}
