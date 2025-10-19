/**
 * Blockchain Validation Utility
 * 
 * Provides type-safe validation and conversion of blockchain strings
 * to SupportedChain types. Eliminates the need for manual chainMap
 * declarations throughout the codebase.
 * 
 * @module BlockchainValidator
 */

import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

// ============================================================================
// SUPPORTED CHAINS DEFINITION
// ============================================================================

/**
 * Array of all supported blockchain names
 * Automatically derived from the SupportedChain type
 */
const SUPPORTED_CHAINS: readonly SupportedChain[] = [
  'ethereum',
  'sepolia',
  'holesky',
  'hoodi',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'bitcoin',
  'solana',
  'near',
  'ripple',
  'stellar',
  'sui',
  'aptos',
  'injective'
] as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a string is a valid SupportedChain
 * 
 * @param blockchain - The blockchain string to validate
 * @returns boolean - True if the string is a valid SupportedChain
 * 
 * @example
 * ```typescript
 * if (isSupportedChain('ethereum')) {
 *   // TypeScript knows blockchain is SupportedChain here
 *   const url = rpcManager.getRPCUrl(blockchain);
 * }
 * ```
 */
export function isSupportedChain(blockchain: string): blockchain is SupportedChain {
  return (SUPPORTED_CHAINS as readonly string[]).includes(blockchain.toLowerCase());
}

/**
 * Validate and convert a blockchain string to SupportedChain type
 * Throws an error if the blockchain is not supported
 * 
 * @param blockchain - The blockchain string to validate
 * @returns SupportedChain - The validated blockchain type
 * @throws Error if blockchain is not supported
 * 
 * @example
 * ```typescript
 * try {
 *   const chain = validateBlockchain('ethereum');
 *   const url = rpcManager.getRPCUrl(chain);
 * } catch (error) {
 *   console.error('Invalid blockchain:', error.message);
 * }
 * ```
 */
export function validateBlockchain(blockchain: string): SupportedChain {
  const normalized = blockchain.toLowerCase();
  
  if (isSupportedChain(normalized)) {
    return normalized;
  }
  
  throw new Error(
    `Unsupported blockchain: ${blockchain}. ` +
    `Supported chains: ${SUPPORTED_CHAINS.join(', ')}`
  );
}

/**
 * Validate and convert a blockchain string to SupportedChain type
 * Returns null if the blockchain is not supported (non-throwing version)
 * 
 * @param blockchain - The blockchain string to validate
 * @returns SupportedChain | null - The validated blockchain type or null
 * 
 * @example
 * ```typescript
 * const chain = validateBlockchainSafe('ethereum');
 * if (chain) {
 *   const url = rpcManager.getRPCUrl(chain);
 * } else {
 *   console.error('Invalid blockchain');
 * }
 * ```
 */
export function validateBlockchainSafe(blockchain: string): SupportedChain | null {
  try {
    return validateBlockchain(blockchain);
  } catch {
    return null;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all supported blockchain names
 * 
 * @returns readonly SupportedChain[] - Array of all supported chains
 * 
 * @example
 * ```typescript
 * const chains = getSupportedChains();
 * console.log(`We support ${chains.length} blockchains`);
 * ```
 */
export function getSupportedChains(): readonly SupportedChain[] {
  return SUPPORTED_CHAINS;
}

/**
 * Check if multiple blockchains are all supported
 * 
 * @param blockchains - Array of blockchain strings to validate
 * @returns boolean - True if all blockchains are supported
 * 
 * @example
 * ```typescript
 * if (areAllSupported(['ethereum', 'polygon', 'arbitrum'])) {
 *   console.log('All chains are supported!');
 * }
 * ```
 */
export function areAllSupported(blockchains: string[]): boolean {
  return blockchains.every(isSupportedChain);
}

/**
 * Filter an array to only include supported blockchains
 * 
 * @param blockchains - Array of blockchain strings
 * @returns SupportedChain[] - Array of only supported chains
 * 
 * @example
 * ```typescript
 * const input = ['ethereum', 'invalid', 'polygon'];
 * const valid = filterSupported(input);
 * // Returns: ['ethereum', 'polygon']
 * ```
 */
export function filterSupported(blockchains: string[]): SupportedChain[] {
  return blockchains.filter(isSupportedChain);
}

/**
 * Get a user-friendly error message for an unsupported blockchain
 * 
 * @param blockchain - The unsupported blockchain string
 * @returns string - Error message with suggestions
 * 
 * @example
 * ```typescript
 * const error = getUnsupportedError('ethreum'); // typo
 * console.error(error);
 * // "Blockchain 'ethreum' is not supported. Did you mean 'ethereum'?"
 * ```
 */
export function getUnsupportedError(blockchain: string): string {
  // Simple Levenshtein distance for suggestions
  const normalized = blockchain.toLowerCase();
  const suggestions = SUPPORTED_CHAINS
    .map(chain => ({
      chain,
      distance: levenshteinDistance(normalized, chain)
    }))
    .filter(({ distance }) => distance <= 3)
    .sort((a, b) => a.distance - b.distance)
    .map(({ chain }) => chain);

  if (suggestions.length > 0) {
    return (
      `Blockchain '${blockchain}' is not supported. ` +
      `Did you mean '${suggestions[0]}'?`
    );
  }

  return (
    `Blockchain '${blockchain}' is not supported. ` +
    `Supported chains: ${SUPPORTED_CHAINS.join(', ')}`
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 * Used for suggesting similar blockchain names
 * 
 * @param a - First string
 * @param b - Second string
 * @returns number - Edit distance
 * @private
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// ============================================================================
// BLOCKCHAIN CATEGORIES
// ============================================================================

/**
 * Categorize blockchains by type
 */
export const BLOCKCHAIN_CATEGORIES = {
  evm: [
    'ethereum',
    'sepolia',
    'holesky',
    'hoodi',
    'polygon',
    'arbitrum',
    'optimism',
    'base',
    'avalanche'
  ] as const,
  nonEvm: [
    'bitcoin',
    'solana',
    'near',
    'ripple',
    'stellar',
    'sui',
    'aptos',
    'injective'
  ] as const
} as const;

/**
 * Check if a blockchain is EVM-compatible
 * 
 * @param blockchain - The blockchain to check
 * @returns boolean - True if EVM-compatible
 * 
 * @example
 * ```typescript
 * if (isEVMChain('ethereum')) {
 *   // Use ethers.js
 * } else {
 *   // Use chain-specific SDK
 * }
 * ```
 */
export function isEVMChain(blockchain: string): boolean {
  return (BLOCKCHAIN_CATEGORIES.evm as readonly string[]).includes(
    blockchain.toLowerCase()
  );
}

/**
 * Get the category of a blockchain
 * 
 * @param blockchain - The blockchain to categorize
 * @returns 'evm' | 'non-evm' | 'unknown'
 * 
 * @example
 * ```typescript
 * const category = getBlockchainCategory('ethereum');
 * // Returns: 'evm'
 * ```
 */
export function getBlockchainCategory(
  blockchain: string
): 'evm' | 'non-evm' | 'unknown' {
  const normalized = blockchain.toLowerCase();
  
  if ((BLOCKCHAIN_CATEGORIES.evm as readonly string[]).includes(normalized)) {
    return 'evm';
  }
  
  if ((BLOCKCHAIN_CATEGORIES.nonEvm as readonly string[]).includes(normalized)) {
    return 'non-evm';
  }
  
  return 'unknown';
}
