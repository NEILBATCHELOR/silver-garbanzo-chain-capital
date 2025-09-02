/**
 * Utility functions for formatting data in a consistent way
 */

/**
 * Format a number as currency with the specified currency symbol
 * @param value Number to format
 * @param currency Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(value?: number | null, currency = 'USD'): string {
  if (value === undefined || value === null) return 'N/A';
  
  // Get currency symbol
  const symbol = getCurrencySymbol(currency);
  
  // Format number with commas
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
  
  return `${symbol}${formattedNumber}`;
}

/**
 * Get the currency symbol for a currency code
 * @param currencyCode ISO currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'CHF',
    CNY: '¥',
    INR: '₹',
    // Add more as needed
  };
  
  return symbols[currencyCode] || currencyCode;
}

/**
 * Format a date string to a readable format
 * @param dateString Date string to format
 * @param options Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(dateString?: string, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  
  // Default options if not provided
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  return new Intl.DateTimeFormat('en-US', options || defaultOptions).format(date);
}

/**
 * Format a number as a percentage
 * @param value Number to format as percentage
 * @param decimalPlaces Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercent(value?: number | null, decimalPlaces = 2): string {
  if (value === undefined || value === null) return 'N/A';
  
  return `${value.toFixed(decimalPlaces)}%`;
}

/**
 * Format a number with thousands separators
 * @param value Number to format
 * @param decimalPlaces Number of decimal places
 * @returns Formatted number string
 */
export function formatNumber(value?: number | null, decimalPlaces = 0): string {
  if (value === undefined || value === null) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(value);
}

/**
 * Format a boolean value as Yes/No
 * @param value Boolean value
 * @returns 'Yes' or 'No'
 */
export function formatBoolean(value?: boolean | null): string {
  if (value === undefined || value === null) return 'N/A';
  
  return value ? 'Yes' : 'No';
}

/**
 * Format an array as a comma-separated string
 * @param array Array to format
 * @returns Comma-separated string
 */
export function formatArray(array?: any[]): string {
  if (!array || array.length === 0) return 'N/A';
  
  return array.join(', ');
}
