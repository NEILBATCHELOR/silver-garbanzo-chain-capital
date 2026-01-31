/**
 * XLS-89 MPT Metadata Standard - Asset Class Taxonomy
 * 
 * Types and constants for XRPL Multi-Purpose Token (MPT) asset classification
 * Based on XLS-89 metadata standard
 * 
 * @see https://github.com/XRPLF/XRPL-Standards
 * @see /docs/XLS-89_ASSET_TAXONOMY.md
 */

// ============================================
// ASSET CLASS TYPES
// ============================================

/**
 * Top-level asset classification
 */
export type AssetClass = 
  | 'rwa'      // Real World Assets (requires asset_subclass)
  | 'defi'     // Decentralized Finance
  | 'gaming'   // Gaming & Metaverse
  | 'utility'  // Utility Tokens
  | 'other';   // Other Categories
/**
 * Asset subclass for Real World Assets (RWA only)
 * Required when asset_class = 'rwa'
 */
export type AssetSubclass = 
  | 'stablecoin'      // Fiat-pegged tokens backed by reserves
  | 'commodity'       // Physical commodities (gold, silver, oil)
  | 'real_estate'     // Property ownership/claims
  | 'private_credit'  // Debt obligations from private entities
  | 'equity'          // Company ownership shares
  | 'treasury'        // Government debt instruments
  | 'other';          // Other RWA types

// ============================================
// DISPLAY METADATA
// ============================================

export interface AssetClassInfo {
  value: AssetClass;
  label: string;
  description: string;
  requiresSubclass: boolean;
}

export interface AssetSubclassInfo {
  value: AssetSubclass;
  label: string;
  description: string;
  examples?: string[];
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Asset Class options with display metadata
 */
export const ASSET_CLASSES: AssetClassInfo[] = [
  {
    value: 'rwa',
    label: 'Real World Assets',
    description: 'Tokens backed by or representing real-world assets',
    requiresSubclass: true
  },
  {
    value: 'defi',
    label: 'DeFi',
    description: 'Tokens used in decentralized finance protocols',
    requiresSubclass: false
  },
  {
    value: 'gaming',
    label: 'Gaming',
    description: 'Tokens used in games and virtual worlds',
    requiresSubclass: false
  },
  {
    value: 'utility',
    label: 'Utility',
    description: 'Tokens providing access to services or products',
    requiresSubclass: false
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Tokens that don\'t fit standard categories',
    requiresSubclass: false
  }
];

/**
 * Asset Subclass options for RWA (Real World Assets)
 */
export const ASSET_SUBCLASSES: AssetSubclassInfo[] = [
  {
    value: 'stablecoin',
    label: 'Stablecoin',
    description: 'Tokens pegged to stable value (typically fiat currencies)',
    examples: ['RLUSD', 'USDC', 'USDT']
  },
  {
    value: 'commodity',
    label: 'Commodity',
    description: 'Tokens representing physical commodities',
    examples: ['Gold', 'Silver', 'Oil', 'Agricultural products']
  },
  {
    value: 'real_estate',
    label: 'Real Estate',
    description: 'Tokens representing property ownership or claims',
    examples: ['Fractionalized properties', 'REIT tokens']
  },
  {
    value: 'private_credit',
    label: 'Private Credit',
    description: 'Debt obligations from private entities',
    examples: ['Loans', 'Invoices', 'Receivables']
  },
  {
    value: 'equity',
    label: 'Equity',
    description: 'Tokens representing company ownership shares',
    examples: ['Tokenized stock', 'Share certificates']
  },
  {
    value: 'treasury',
    label: 'Treasury',
    description: 'Government debt instruments',
    examples: ['Treasury bills', 'Bonds', 'Government securities']
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Experimental, hybrid, or emerging RWA types',
    examples: ['Carbon credits', 'Intellectual property']
  }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if asset class requires a subclass
 */
export function requiresSubclass(assetClass: AssetClass | null | undefined): boolean {
  if (!assetClass) return false;
  const classInfo = ASSET_CLASSES.find(c => c.value === assetClass);
  return classInfo?.requiresSubclass ?? false;
}

/**
 * Get asset class info by value
 */
export function getAssetClassInfo(assetClass: AssetClass): AssetClassInfo | undefined {
  return ASSET_CLASSES.find(c => c.value === assetClass);
}

/**
 * Get asset subclass info by value
 */
export function getAssetSubclassInfo(assetSubclass: AssetSubclass): AssetSubclassInfo | undefined {
  return ASSET_SUBCLASSES.find(s => s.value === assetSubclass);
}

/**
 * Validate asset class and subclass combination
 */
export function validateAssetClassification(
  assetClass: AssetClass | null,
  assetSubclass: AssetSubclass | null
): { valid: boolean; error?: string } {
  if (!assetClass) {
    return { valid: false, error: 'Asset class is required' };
  }

  if (!ASSET_CLASSES.find(c => c.value === assetClass)) {
    return { valid: false, error: 'Invalid asset class' };
  }

  if (assetClass === 'rwa' && !assetSubclass) {
    return { valid: false, error: 'Real World Assets require an asset subclass' };
  }

  if (assetClass !== 'rwa' && assetSubclass) {
    return { valid: false, error: 'Asset subclass is only valid for Real World Assets' };
  }

  if (assetClass === 'rwa' && assetSubclass) {
    if (!ASSET_SUBCLASSES.find(s => s.value === assetSubclass)) {
      return { valid: false, error: 'Invalid asset subclass' };
    }
  }

  return { valid: true };
}

/**
 * Get friendly display name for asset classification
 */
export function getAssetClassificationLabel(
  assetClass: AssetClass | null,
  assetSubclass?: AssetSubclass | null
): string {
  if (!assetClass) return 'Unknown';

  const classInfo = getAssetClassInfo(assetClass);
  if (!classInfo) return assetClass;

  if (assetClass === 'rwa' && assetSubclass) {
    const subclassInfo = getAssetSubclassInfo(assetSubclass);
    return subclassInfo ? `${classInfo.label} - ${subclassInfo.label}` : classInfo.label;
  }

  return classInfo.label;
}
