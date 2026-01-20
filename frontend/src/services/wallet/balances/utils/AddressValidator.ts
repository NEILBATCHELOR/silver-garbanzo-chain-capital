/**
 * Address Validator Utility
 * Detects wallet address formats and determines compatible blockchain chains
 */

export type ChainCategory = 'evm' | 'bitcoin' | 'solana' | 'aptos' | 'sui' | 'near' | 'injective' | 'ripple' | 'unknown';

export interface AddressValidationResult {
  isValid: boolean;
  category: ChainCategory;
  compatibleChains: string[];
}

/**
 * Detect address format and determine compatible chains
 */
export function detectAddressFormat(address: string): AddressValidationResult {
  if (!address || typeof address !== 'string') {
    return { isValid: false, category: 'unknown', compatibleChains: [] };
  }

  // Normalize address: trim whitespace and handle case sensitivity appropriately
  const trimmedAddress = address.trim();
  
  console.log(`🔍 Address format detection for: "${trimmedAddress}"`);


  // EVM addresses (0x + 40 hex characters)
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
    console.log(`✅ Detected EVM address: ${trimmedAddress.slice(0, 20)}...`);
    return {
      isValid: true,
      category: 'evm',
      compatibleChains: [
        'ethereum', 'sepolia', 'holesky',
        'polygon', 'amoy',
        'optimism', 'optimism-sepolia',
        'arbitrum', 'arbitrum-sepolia',
        'base', 'base-sepolia',
        'bsc', 'bsc-testnet',
        'zksync', 'zksync-sepolia',
        'avalanche', 'avalanche-testnet',
        'xrpl-evm', 'xrpl-evm-testnet'
      ]
    };
  }

  // Bitcoin addresses (P2PKH: 1, P2SH: 3, Bech32: bc1, Testnet: tb1, m, n, 2)
  if (/^(1|3|bc1|tb1|m|n|2)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(trimmedAddress)) {
    const isTestnet = /^(tb1|m|n|2)/.test(trimmedAddress);
    return {
      isValid: true,
      category: 'bitcoin',
      compatibleChains: isTestnet ? ['bitcoin-testnet'] : ['bitcoin']
    };
  }

  // Solana addresses (32-44 base58 characters)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmedAddress)) {
    return {
      isValid: true,
      category: 'solana',
      compatibleChains: ['solana', 'solana-devnet', 'solana-testnet']
    };
  }

  // Aptos addresses (0x + 1-64 hex characters)
  if (/^0x[a-fA-F0-9]{1,64}$/.test(trimmedAddress) && trimmedAddress.length <= 66) {
    return {
      isValid: true,
      category: 'aptos',
      compatibleChains: ['aptos', 'aptos-testnet']
    };
  }

  // Sui addresses (0x + 64 hex characters)
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmedAddress)) {
    return {
      isValid: true,
      category: 'sui',
      compatibleChains: ['sui', 'sui-testnet']
    };
  }

  // NEAR addresses (account_id.near or implicit accounts)
  if (/^[a-z0-9_-]{2,64}(\.near|\.testnet)?$/.test(trimmedAddress) || /^[a-f0-9]{64}$/.test(trimmedAddress)) {
    const isTestnet = trimmedAddress.endsWith('.testnet');
    return {
      isValid: true,
      category: 'near',
      compatibleChains: isTestnet ? ['near-testnet'] : ['near']
    };
  }

  // Injective addresses (inj1 for mainnet, inj1 for testnet - flexible length 39-59 chars total)
  // Examples: inj1rnmz5myv403g6nwukceeldh0sw92fq5cd4z0pv (43 chars total)
  if (/^inj1[a-z0-9]{38,58}$/.test(trimmedAddress.toLowerCase())) {
    console.log(`✅ Detected Injective address: ${trimmedAddress.slice(0, 20)}...`);
    return {
      isValid: true,
      category: 'injective',
      compatibleChains: ['injective', 'injective-testnet']
    };
  }

  // Ripple/XRP addresses (r followed by 25-34 base58 characters)
  if (/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(trimmedAddress)) {
    return {
      isValid: true,
      category: 'ripple',
      compatibleChains: ['ripple', 'ripple-testnet']
    };
  }

  console.log(`❌ Unknown address format: ${trimmedAddress.slice(0, 30)}...`);
  return { isValid: false, category: 'unknown', compatibleChains: [] };
}

/**
 * Get chain category from chain name
 */
export function getChainCategory(chainName: string): ChainCategory {
  const normalized = chainName.toLowerCase();
  
  if (normalized.includes('ethereum') || normalized.includes('polygon') || 
      normalized.includes('optimism') || normalized.includes('arbitrum') ||
      normalized.includes('base') || normalized.includes('bsc') || 
      normalized.includes('zksync') || normalized.includes('avalanche') ||
      normalized.includes('sepolia') || normalized.includes('holesky') || normalized.includes('amoy') ||
      normalized.includes('xrpl-evm') || normalized.includes('xrplevm')) {
    return 'evm';
  }
  
  if (normalized.includes('bitcoin') || normalized.includes('btc')) {
    return 'bitcoin';
  }
  
  if (normalized.includes('solana') || normalized.includes('sol')) {
    return 'solana';
  }
  
  if (normalized.includes('aptos') || normalized.includes('apt')) {
    return 'aptos';
  }
  
  if (normalized.includes('sui')) {
    return 'sui';
  }
  
  if (normalized.includes('near')) {
    return 'near';
  }
  
  if (normalized.includes('injective') || normalized.includes('inj')) {
    return 'injective';
  }
  
  if (normalized.includes('ripple') || normalized.includes('xrp')) {
    return 'ripple';
  }
  
  return 'unknown';
}

/**
 * Check if an address is compatible with a specific chain
 */
export function isAddressCompatibleWithChain(address: string, chainName: string): boolean {
  const addressInfo = detectAddressFormat(address);
  const chainCategory = getChainCategory(chainName);
  
  const isCompatible = addressInfo.category === chainCategory;
  
  console.log(`🔍 Compatibility check:`, {
    address: address.slice(0, 15) + '...',
    chainName,
    addressCategory: addressInfo.category,
    chainCategory,
    isCompatible
  });
  
  return isCompatible;
}

/**
 * Filter services to only compatible ones for the given address
 */
export function getCompatibleServices(address: string, allServices: Record<string, any>): Record<string, any> {
  const addressInfo = detectAddressFormat(address);
  
  if (!addressInfo.isValid) {
    return {};
  }
  
  const compatibleServices: Record<string, any> = {};
  
  Object.entries(allServices).forEach(([key, service]) => {
    const chainCategory = getChainCategory(key);
    if (chainCategory === addressInfo.category) {
      compatibleServices[key] = service;
    }
  });
  
  return compatibleServices;
}
