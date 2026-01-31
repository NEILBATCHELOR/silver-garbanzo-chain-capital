/**
 * MPT Amount Parser Utility
 * 
 * Parses user-friendly amount inputs like:
 * - "100k" → 100000
 * - "10M" → 10000000
 * - "1B" → 1000000000
 * - "1.5M" → 1500000
 * - "2.5k" → 2500
 * 
 * CRITICAL: Handles shorthand notation before converting to raw amounts
 */

/**
 * Parse amount with shorthand notation (k, M, B, T)
 * @param input - User input string (e.g., "100k", "1.5M", "1000")
 * @returns Numeric value as string
 * 
 * Examples:
 * - parseAmountShorthand("100k") → "100000"
 * - parseAmountShorthand("10M") → "10000000"
 * - parseAmountShorthand("1.5B") → "1500000000"
 * - parseAmountShorthand("1000") → "1000"
 */
export function parseAmountShorthand(input: string): string {
  if (!input || typeof input !== 'string') {
    return '0';
  }

  // Remove whitespace and convert to uppercase
  const cleaned = input.trim().toUpperCase();
  
  // If it's just a number, return it
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return cleaned;
  }

  // Define multipliers
  const multipliers: Record<string, number> = {
    'K': 1_000,              // thousand
    'M': 1_000_000,          // million
    'B': 1_000_000_000,      // billion
    'T': 1_000_000_000_000   // trillion
  };

  // Match pattern: optional digits, optional decimal, optional digits, required suffix
  const match = cleaned.match(/^(\d+\.?\d*|\.\d+)([KMBT])$/);
  
  if (!match) {
    // Try to parse as regular number, or return 0 if invalid
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? '0' : Math.floor(parsed).toString();
  }

  const [, numStr, suffix] = match;
  const num = parseFloat(numStr);
  const multiplier = multipliers[suffix];

  if (isNaN(num) || !multiplier) {
    return '0';
  }

  // Calculate final value
  const result = num * multiplier;
  
  // Return as integer string (no decimals in final output)
  return Math.floor(result).toString();
}

/**
 * Format number with shorthand notation for display
 * @param value - Numeric value as string or number
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with suffix
 * 
 * Examples:
 * - formatWithShorthand(100000) → "100k"
 * - formatWithShorthand(1500000, 1) → "1.5M"
 * - formatWithShorthand(2500000000) → "2.5B"
 */
export function formatWithShorthand(value: string | number, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num) || num === 0) {
    return '0';
  }

  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 1_000_000_000_000) {
    return `${sign}${(abs / 1_000_000_000_000).toFixed(decimals)}T`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(decimals)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(decimals)}k`;
  }
  
  return num.toString();
}

/**
 * Validate amount input (supports shorthand)
 * @param input - User input string
 * @returns Validation result with parsed value
 */
export function validateAmountInput(input: string): {
  valid: boolean;
  value: string;
  error?: string;
} {
  try {
    const parsed = parseAmountShorthand(input);
    const num = BigInt(parsed);
    
    // Check if within valid MPT range (0 to 2^63-1)
    const MAX_MPT_AMOUNT = BigInt('9223372036854775807');
    
    if (num < 0n) {
      return {
        valid: false,
        value: '0',
        error: 'Amount cannot be negative'
      };
    }
    
    if (num > MAX_MPT_AMOUNT) {
      return {
        valid: false,
        value: '0',
        error: 'Amount exceeds maximum allowed (2^63-1)'
      };
    }
    
    return {
      valid: true,
      value: parsed
    };
  } catch (error) {
    return {
      valid: false,
      value: '0',
      error: 'Invalid amount format'
    };
  }
}

/**
 * Get suggestions for amount input
 * @param assetScale - Asset scale for context
 * @returns Array of example inputs
 */
export function getAmountInputExamples(assetScale: number): string[] {
  return [
    '100',
    '1k',
    '10k',
    '100k',
    '1M',
    '10M',
    '100M',
    '1B'
  ];
}
