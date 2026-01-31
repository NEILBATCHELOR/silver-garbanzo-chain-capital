/**
 * MPT Amount Utilities
 * 
 * CRITICAL: MPT amounts use AssetScale for decimal places
 * 
 * AssetScale determines decimal precision:
 * - AssetScale = 0: No decimals (whole numbers only)
 * - AssetScale = 2: 2 decimals (like USD cents: 100 = $1.00)
 * - AssetScale = 6: 6 decimals (standard for crypto: 1000000 = 1.0)
 * 
 * Formula: display_value = raw_value / (10 ^ assetScale)
 * 
 * Examples with AssetScale=6:
 * - Raw: 1000000     → Display: 1.0
 * - Raw: 100000000   → Display: 100.0
 * - Raw: 1000000000  → Display: 1000.0
 * - Raw: 1e9         → Display: 1000.0 (1 billion raw = 1 thousand tokens)
 * - Raw: 1e12        → Display: 1000000.0 (1 trillion raw = 1 million tokens)
 */

/**
 * Convert raw MPT amount to display value
 * @param rawAmount - Raw amount as stored on ledger
 * @param assetScale - Number of decimal places (0-19)
 * @returns Display value as string
 * 
 * Example: convertToDisplayValue("100000000", 6) → "100.000000"
 */
export function convertToDisplayValue(
  rawAmount: string | number,
  assetScale: number
): string {
  const raw = BigInt(rawAmount);
  const divisor = BigInt(10 ** assetScale);
  
  const wholePart = raw / divisor;
  const fractionalPart = raw % divisor;
  
  // Pad fractional part with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(assetScale, '0');
  
  if (assetScale === 0) {
    return wholePart.toString();
  }
  
  return `${wholePart}.${fractionalStr}`;
}

/**
 * Convert display value to raw MPT amount
 * @param displayValue - Display value (e.g., "100.5")
 * @param assetScale - Number of decimal places (0-19)
 * @returns Raw amount as string
 * 
 * Example: convertToRawAmount("100.5", 6) → "100500000"
 */
export function convertToRawAmount(
  displayValue: string | number,
  assetScale: number
): string {
  const valueStr = displayValue.toString();
  const [wholePart = '0', fractionalPart = ''] = valueStr.split('.');
  
  // Pad or trim fractional part to match assetScale
  const paddedFractional = fractionalPart.padEnd(assetScale, '0').slice(0, assetScale);
  
  const rawValue = BigInt(wholePart) * BigInt(10 ** assetScale) + BigInt(paddedFractional || '0');
  
  return rawValue.toString();
}

/**
 * Format MPT amount for display with proper decimals
 * @param rawAmount - Raw amount as stored on ledger
 * @param assetScale - Number of decimal places
 * @param decimals - Number of decimals to show (default: assetScale)
 * @returns Formatted display string
 * 
 * Example: formatMPTAmount("100000000", 6, 2) → "100.00"
 */
export function formatMPTAmount(
  rawAmount: string | number,
  assetScale: number,
  decimals?: number
): string {
  const displayValue = convertToDisplayValue(rawAmount, assetScale);
  const [wholePart, fractionalPart] = displayValue.split('.');
  
  if (decimals === undefined || decimals === assetScale) {
    return displayValue;
  }
  
  if (decimals === 0) {
    return wholePart;
  }
  
  const trimmedFractional = (fractionalPart || '').slice(0, decimals).padEnd(decimals, '0');
  return `${wholePart}.${trimmedFractional}`;
}

/**
 * Get human-readable supply info
 * @param rawAmount - Raw amount
 * @param assetScale - Asset scale
 * @returns Object with both raw and display values
 */
export function getMPTSupplyInfo(
  rawAmount: string | number,
  assetScale: number
): {
  raw: string;
  display: string;
  formatted: string;
  assetScale: number;
} {
  const raw = rawAmount.toString();
  const display = convertToDisplayValue(raw, assetScale);
  const formatted = formatMPTAmount(raw, assetScale, 2);
  
  return {
    raw,
    display,
    formatted,
    assetScale
  };
}

/**
 * Validate MPT amount is within valid range
 * Max: 2^63-1 = 9,223,372,036,854,775,807
 */
export function isValidMPTAmount(amount: string | number): boolean {
  try {
    const value = BigInt(amount);
    const MAX_MPT_AMOUNT = BigInt('9223372036854775807'); // 2^63-1
    
    return value >= 0n && value <= MAX_MPT_AMOUNT;
  } catch {
    return false;
  }
}

/**
 * Get supply examples for documentation
 */
export function getSupplyExamples(assetScale: number): Array<{
  description: string;
  raw: string;
  display: string;
}> {
  const examples = [
    { description: '1 token', multiplier: 1 },
    { description: '100 tokens', multiplier: 100 },
    { description: '1,000 tokens', multiplier: 1000 },
    { description: '1 million tokens', multiplier: 1000000 },
    { description: '1 billion tokens', multiplier: 1000000000 },
  ];
  
  return examples.map(({ description, multiplier }) => {
    const raw = convertToRawAmount(multiplier.toString(), assetScale);
    const display = convertToDisplayValue(raw, assetScale);
    
    return {
      description,
      raw,
      display
    };
  });
}
