/**
 * NAV Utilities
 * Formatting and utility functions for NAV calculations
 */

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number, 
  currency: string = 'USD', 
  options: Intl.NumberFormatOptions = {}
): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options
    }).format(amount)
  } catch (error) {
    // Fallback if currency is not supported
    return `${currency} ${amount.toFixed(2)}`
  }
}

/**
 * Format a number as percentage
 */
export function formatPercentage(
  value: number, 
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }).format(value / 100)
}

/**
 * Format a date string
 */
export function formatDate(
  dateString: string, 
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    }).format(date)
  } catch (error) {
    return dateString
  }
}

/**
 * Format a date and time string
 */
export function formatDateTime(
  dateString: string, 
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(date)
  } catch (error) {
    return dateString
  }
}

/**
 * Format a large number with abbreviations (K, M, B)
 */
export function formatNumber(
  value: number, 
  options: { 
    decimals?: number
    abbreviate?: boolean 
  } = {}
): string {
  const { decimals = 2, abbreviate = true } = options

  if (!abbreviate) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value)
  }

  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (abs >= 1e9) {
    return `${sign}${(abs / 1e9).toFixed(decimals)}B`
  } else if (abs >= 1e6) {
    return `${sign}${(abs / 1e6).toFixed(decimals)}M`
  } else if (abs >= 1e3) {
    return `${sign}${(abs / 1e3).toFixed(decimals)}K`
  }
  
  return `${sign}${abs.toFixed(decimals)}`
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) return 'just now'
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
    if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`
    if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`
    
    return formatDate(dateString)
  } catch (error) {
    return dateString
  }
}
