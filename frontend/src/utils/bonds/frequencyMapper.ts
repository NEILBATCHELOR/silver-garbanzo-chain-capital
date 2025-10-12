/**
 * Bond Coupon Frequency Mapper
 * 
 * Converts between database text values and numeric payment frequencies
 * Used for coupon schedule generation and bond calculations
 */

export type FrequencyText = 'annual' | 'semi-annual' | 'quarterly' | 'monthly'
export type FrequencyNumber = 1 | 2 | 4 | 12

/**
 * Convert text frequency to numeric value
 * @param textFrequency - Text representation (e.g., 'semi-annual')
 * @returns Numeric frequency (payments per year)
 */
export function convertFrequencyToNumber(textFrequency: string): FrequencyNumber {
  const normalized = textFrequency.toLowerCase().trim()
  
  const map: Record<string, FrequencyNumber> = {
    'annual': 1,
    'annually': 1,
    'yearly': 1,
    'semi-annual': 2,
    'semi-annually': 2,
    'semiannual': 2,
    'semiannually': 2,
    'bi-annual': 2,
    'quarterly': 4,
    'quarterly basis': 4,
    'monthly': 12,
    'monthly basis': 12,
  }
  
  return map[normalized] || 2 // Default to semi-annual
}

/**
 * Convert numeric frequency to text representation
 * @param numFrequency - Numeric frequency (1, 2, 4, or 12)
 * @returns Text representation
 */
export function convertNumberToFrequency(numFrequency: number): FrequencyText {
  const map: Record<number, FrequencyText> = {
    1: 'annual',
    2: 'semi-annual',
    4: 'quarterly',
    12: 'monthly',
  }
  
  return map[numFrequency] || 'semi-annual'
}

/**
 * Get human-readable frequency label
 * @param frequency - Text or numeric frequency
 * @returns Display label
 */
export function getFrequencyLabel(frequency: string | number): string {
  const labels: Record<string, string> = {
    '1': 'Annually',
    '2': 'Semi-Annually',
    '4': 'Quarterly',
    '12': 'Monthly',
    'annual': 'Annually',
    'semi-annual': 'Semi-Annually',
    'quarterly': 'Quarterly',
    'monthly': 'Monthly',
  }
  
  const key = typeof frequency === 'number' ? frequency.toString() : frequency.toLowerCase()
  return labels[key] || 'Semi-Annually'
}

/**
 * Validate frequency value
 * @param frequency - Text or numeric frequency
 * @returns true if valid
 */
export function isValidFrequency(frequency: string | number): boolean {
  if (typeof frequency === 'number') {
    return [1, 2, 4, 12].includes(frequency)
  }
  
  const validText = [
    'annual', 'annually', 'yearly',
    'semi-annual', 'semi-annually', 'semiannual', 'bi-annual',
    'quarterly',
    'monthly'
  ]
  
  return validText.includes(frequency.toLowerCase().trim())
}
