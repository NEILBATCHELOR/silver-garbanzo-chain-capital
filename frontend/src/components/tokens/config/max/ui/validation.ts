/**
 * Validation functions for token configuration forms
 */

/**
 * Validates a country code (ISO 3166-1 alpha-2)
 * @param code - 2-letter country code
 * @returns true if valid
 */
export const validateCountryCode = (code: string): boolean => {
  // Basic validation for 2-letter country codes
  if (!code || typeof code !== 'string') return false;
  
  // Should be exactly 2 letters
  if (code.length !== 2) return false;
  
  // Should contain only letters
  return /^[A-Z]{2}$/i.test(code);
};

/**
 * Validates an Ethereum address
 * @param address - Ethereum address string
 * @returns true if valid
 */
export const validateEthereumAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  
  // Basic Ethereum address validation
  // Should start with 0x and be 42 characters total
  if (!address.startsWith('0x') || address.length !== 42) return false;
  
  // Should contain only valid hex characters after 0x
  const hexPart = address.slice(2);
  return /^[a-fA-F0-9]{40}$/.test(hexPart);
};

/**
 * Common validation function type
 */
export type ValidationFunction = (value: string) => boolean;
