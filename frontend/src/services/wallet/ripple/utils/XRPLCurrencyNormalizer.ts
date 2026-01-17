/**
 * XRPL Currency Code Normalization Service
 * Based on official XRPL code sample: normalize-currency-codes
 * 
 * Converts currency codes from either:
 * - Standard 3-character format (e.g., "USD")
 * - Non-standard 40-character hexadecimal format
 * Into human-readable strings
 * 
 * Reference: https://xrpl.org/currency-formats.html
 * Original authors: Ali (XUMM), nixer89
 */

/**
 * Normalize XRPL currency code to human-readable format
 * 
 * @param currencyCode - Currency code in standard or hex format
 * @param maxLength - Maximum length for decoded hex strings (default: 20)
 * @returns Normalized currency code string
 */
export function normalizeCurrencyCode(
  currencyCode: string | undefined | null, 
  maxLength: number = 20
): string {
  if (!currencyCode) return ''

  // Standard 3-character currency code
  if (currencyCode.length === 3 && currencyCode.trim().toLowerCase() !== 'xrp') {
    return currencyCode.trim()
  }

  // Hexadecimal currency code (40 characters)
  if (currencyCode.match(/^[a-fA-F0-9]{40}$/) && !isNaN(parseInt(currencyCode, 16))) {
    const hex = currencyCode.toString().replace(/(00)+$/g, '')
    
    // Old demurrage code (starts with '01')
    // https://xrpl.org/demurrage.html
    if (hex.startsWith('01')) {
      return convertDemurrageToUTF8(currencyCode)
    }
    
    // XLS-16d NFT Metadata using XLS-15d Concise Transaction Identifier
    // https://github.com/XRPLF/XRPL-Standards/discussions/37
    if (hex.startsWith('02')) {
      const xlf15d = Buffer.from(hex, 'hex')
        .slice(8)
        .toString('utf-8')
        .slice(0, maxLength)
        .trim()
      
      if (xlf15d.match(/[a-zA-Z0-9]{3,}/) && xlf15d.toLowerCase() !== 'xrp') {
        return xlf15d
      }
    }
    
    // Standard ASCII or UTF-8 encoded alphanumeric code
    const decodedHex = Buffer.from(hex, 'hex')
      .toString('utf-8')
      .slice(0, maxLength)
      .trim()
    
    if (decodedHex.match(/[a-zA-Z0-9]{3,}/) && decodedHex.toLowerCase() !== 'xrp') {
      return decodedHex
    }
  }

  return ''
}

/**
 * Convert demurrage currency code to UTF-8 with interest rate
 * 
 * @param demurrageCode - Hex-encoded demurrage code
 * @returns Formatted currency code with annual interest rate
 */
function convertDemurrageToUTF8(demurrageCode: string): string {
  const bytes = Buffer.from(demurrageCode, 'hex')
  
  // Extract 3-character currency code
  const code = String.fromCharCode(bytes[1]) + 
               String.fromCharCode(bytes[2]) + 
               String.fromCharCode(bytes[3])
  
  // Extract interest parameters
  const interestStart = (bytes[4] << 24) + (bytes[5] << 16) + (bytes[6] << 8) + bytes[7]
  const interestPeriod = bytes.readDoubleBE(8)
  
  // Calculate annual interest rate
  // XRP Ledger uses fixed 31536000 seconds per year (no leap adjustments)
  const yearSeconds = 31536000
  const interestAfterYear = Math.pow(
    Math.E, 
    (interestStart + yearSeconds - interestStart) / interestPeriod
  )
  const interest = (interestAfterYear * 100) - 100

  return `${code} (${interest.toFixed(1)}% pa)`
}

/**
 * Check if currency code is XRP
 */
export function isXRP(currencyCode: string | undefined | null): boolean {
  if (!currencyCode) return false
  return currencyCode.toLowerCase() === 'xrp' || currencyCode === '0000000000000000000000000000000000000000'
}

/**
 * Format currency amount with normalized code
 */
export function formatCurrencyAmount(
  amount: string | number,
  currencyCode: string,
  decimals: number = 6
): string {
  const normalized = normalizeCurrencyCode(currencyCode)
  const formattedAmount = typeof amount === 'string' 
    ? parseFloat(amount).toFixed(decimals)
    : amount.toFixed(decimals)
  
  return `${formattedAmount} ${normalized}`
}

/**
 * Validate currency code format
 */
export function isValidCurrencyCode(currencyCode: string): boolean {
  // Standard 3-character code
  if (currencyCode.length === 3) {
    return /^[A-Z0-9]{3}$/.test(currencyCode)
  }
  
  // Hex code (40 characters)
  if (currencyCode.length === 40) {
    return /^[a-fA-F0-9]{40}$/.test(currencyCode)
  }
  
  return false
}

/**
 * Convert standard currency code to hex format
 */
export function currencyCodeToHex(currencyCode: string): string {
  if (currencyCode.length !== 3) {
    throw new Error('Currency code must be exactly 3 characters')
  }
  
  // Pad to 40 characters (20 bytes)
  return currencyCode.padEnd(20, '\0').split('').map(c => 
    c.charCodeAt(0).toString(16).padStart(2, '0')
  ).join('').toUpperCase()
}

export const currencyNormalizer = {
  normalize: normalizeCurrencyCode,
  isXRP,
  formatAmount: formatCurrencyAmount,
  isValid: isValidCurrencyCode,
  toHex: currencyCodeToHex
}
