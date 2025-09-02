/**
 * Address Validation Utilities
 * Provides comprehensive Ethereum address validation and formatting
 */

/**
 * Check if a string is a valid Ethereum address
 */
export const isValidEthereumAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Basic format check: starts with 0x and is 42 characters long
  const basicFormatRegex = /^0x[a-fA-F0-9]{40}$/;
  return basicFormatRegex.test(address);
};

/**
 * Format an Ethereum address for display
 */
export const formatEthereumAddress = (address: string): string => {
  if (!address) return '';
  
  // Convert to lowercase for consistency
  const cleanAddress = address.toLowerCase();
  
  // If it doesn't start with 0x, add it
  if (!cleanAddress.startsWith('0x')) {
    return `0x${cleanAddress}`;
  }
  
  return cleanAddress;
};

/**
 * Get validation status and message for an Ethereum address
 */
export const validateEthereumAddress = (address: string): {
  isValid: boolean;
  message?: string;
  suggestion?: string;
} => {
  if (!address || address.trim() === '') {
    return {
      isValid: false,
      message: 'Address is required'
    };
  }
  
  const trimmedAddress = address.trim();
  
  // Check if it starts with 0x
  if (!trimmedAddress.startsWith('0x')) {
    return {
      isValid: false,
      message: 'Address must start with 0x',
      suggestion: `0x${trimmedAddress}`
    };
  }
  
  // Check if it's the right length
  if (trimmedAddress.length !== 42) {
    if (trimmedAddress.length < 42) {
      return {
        isValid: false,
        message: `Address is too short (${trimmedAddress.length}/42 characters)`
      };
    } else {
      return {
        isValid: false,
        message: `Address is too long (${trimmedAddress.length}/42 characters)`
      };
    }
  }
  
  // Check if it contains only valid hex characters
  const hexRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!hexRegex.test(trimmedAddress)) {
    return {
      isValid: false,
      message: 'Address contains invalid characters (only 0-9, a-f, A-F allowed)'
    };
  }
  
  return {
    isValid: true
  };
};

/**
 * Sanitize input for Ethereum address
 */
export const sanitizeAddressInput = (input: string): string => {
  if (!input) return '';
  
  // Remove any whitespace
  let sanitized = input.trim();
  
  // Convert to lowercase for consistency
  sanitized = sanitized.toLowerCase();
  
  // If it doesn't start with 0x and isn't empty, add 0x prefix
  if (sanitized && !sanitized.startsWith('0x')) {
    sanitized = `0x${sanitized}`;
  }
  
  // Remove any characters that aren't valid hex
  if (sanitized.startsWith('0x')) {
    const hexPart = sanitized.slice(2).replace(/[^a-f0-9]/g, '');
    // Limit to 40 characters (max Ethereum address length without 0x)
    sanitized = `0x${hexPart.slice(0, 40)}`;
  }
  
  return sanitized;
};

/**
 * Check if multiple addresses in an array are valid
 */
export const validateAddressArray = (addresses: string[]): {
  isValid: boolean;
  errors: { index: number; message: string }[];
} => {
  const errors: { index: number; message: string }[] = [];
  
  addresses.forEach((address, index) => {
    if (address && address.trim() !== '') {
      const validation = validateEthereumAddress(address);
      if (!validation.isValid) {
        errors.push({
          index,
          message: validation.message || 'Invalid address'
        });
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get a shortened display version of an address
 */
export const shortenAddress = (address: string, startChars: number = 6, endChars: number = 4): string => {
  if (!address || !isValidEthereumAddress(address)) {
    return address;
  }
  
  if (address.length <= startChars + endChars + 2) {
    return address;
  }
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};
