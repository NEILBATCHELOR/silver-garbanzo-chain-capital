/**
 * Product Type Utilities
 * Maps AssetType enums to database product table names and provides utility functions
 * for product type resolution and validation.
 */

import { AssetType } from './types'

// ==================== PRODUCT TABLE MAPPING ====================

/**
 * Maps AssetType enum values to their corresponding database product table names
 */
export const ASSET_TYPE_TO_TABLE_MAP: Record<AssetType, string> = {
  [AssetType.EQUITY]: 'equity_products',
  [AssetType.BONDS]: 'bond_products',
  [AssetType.COMMODITIES]: 'commodities_products',
  [AssetType.MMF]: 'fund_products', // Money Market Funds use fund_products
  [AssetType.COMPOSITE_FUNDS]: 'fund_products', // Composite funds use fund_products
  [AssetType.STRUCTURED_PRODUCTS]: 'structured_products',
  [AssetType.QUANT_STRATEGIES]: 'quantitative_investment_strategies_products',
  [AssetType.PRIVATE_EQUITY]: 'private_equity_products',
  [AssetType.PRIVATE_DEBT]: 'private_debt_products',
  [AssetType.REAL_ESTATE]: 'real_estate_products',
  [AssetType.ENERGY]: 'energy_products',
  [AssetType.INFRASTRUCTURE]: 'infrastructure_products',
  [AssetType.COLLECTIBLES]: 'collectibles_products',
  [AssetType.ASSET_BACKED]: 'asset_backed_products',
  [AssetType.INVOICE_RECEIVABLES]: 'invoices', // Invoices table for receivables
  [AssetType.CLIMATE_RECEIVABLES]: 'climate_receivables',
  [AssetType.DIGITAL_TOKENIZED_FUNDS]: 'digital_tokenized_fund_products',
  [AssetType.STABLECOIN_FIAT_BACKED]: 'stablecoin_products',
  [AssetType.STABLECOIN_CRYPTO_BACKED]: 'stablecoin_products',
  [AssetType.STABLECOIN_COMMODITY_BACKED]: 'stablecoin_products',
  [AssetType.STABLECOIN_ALGORITHMIC]: 'stablecoin_products',
} as const

/**
 * Reverse mapping: product table name to AssetType array
 * Some tables support multiple asset types
 */
export const TABLE_TO_ASSET_TYPES_MAP: Record<string, AssetType[]> = {
  'fund_products': [AssetType.MMF, AssetType.COMPOSITE_FUNDS],
  'bond_products': [AssetType.BONDS],
  'equity_products': [AssetType.EQUITY],
  'commodities_products': [AssetType.COMMODITIES],
  'structured_products': [AssetType.STRUCTURED_PRODUCTS],
  'quantitative_investment_strategies_products': [AssetType.QUANT_STRATEGIES],
  'private_equity_products': [AssetType.PRIVATE_EQUITY],
  'private_debt_products': [AssetType.PRIVATE_DEBT],
  'real_estate_products': [AssetType.REAL_ESTATE],
  'energy_products': [AssetType.ENERGY],
  'infrastructure_products': [AssetType.INFRASTRUCTURE],
  'collectibles_products': [AssetType.COLLECTIBLES],
  'asset_backed_products': [AssetType.ASSET_BACKED],
  'invoices': [AssetType.INVOICE_RECEIVABLES],
  'climate_receivables': [AssetType.CLIMATE_RECEIVABLES],
  'digital_tokenized_fund_products': [AssetType.DIGITAL_TOKENIZED_FUNDS],
  'stablecoin_products': [
    AssetType.STABLECOIN_FIAT_BACKED,
    AssetType.STABLECOIN_CRYPTO_BACKED,
    AssetType.STABLECOIN_COMMODITY_BACKED,
    AssetType.STABLECOIN_ALGORITHMIC,
  ],
} as const

// ==================== UTILITY FUNCTIONS ====================

/**
 * Gets the database table name for a given asset type
 */
export function getProductTableName(assetType: AssetType): string {
  const tableName = ASSET_TYPE_TO_TABLE_MAP[assetType]
  if (!tableName) {
    throw new Error(`No product table mapping found for asset type: ${assetType}`)
  }
  return tableName
}

/**
 * Gets all asset types supported by a given product table
 */
export function getAssetTypesForTable(tableName: string): AssetType[] {
  const assetTypes = TABLE_TO_ASSET_TYPES_MAP[tableName]
  if (!assetTypes) {
    throw new Error(`No asset type mapping found for table: ${tableName}`)
  }
  return [...assetTypes] // Return a copy to prevent mutation
}

/**
 * Determines asset type from product table name and optional product-specific data
 * For tables that support multiple asset types, additional logic may be needed
 */
export function resolveAssetTypeFromTable(tableName: string, productData?: any): AssetType {
  const supportedTypes = getAssetTypesForTable(tableName)
  
  if (supportedTypes.length === 1) {
    return supportedTypes[0]!
  }
  
  // Handle tables with multiple asset types
  switch (tableName) {
    case 'fund_products':
      // Distinguish between MMF and COMPOSITE_FUNDS based on fund_type field
      const fundType = productData?.fund_type?.toLowerCase()
      if (fundType === 'money_market' || fundType === 'mmf') {
        return AssetType.MMF
      }
      return AssetType.COMPOSITE_FUNDS
      
    case 'stablecoin_products':
      // Determine stablecoin type from collateral_type_enum (verified field)
      const backingType = productData?.collateral_type_enum?.toLowerCase() || 
                         productData?.collateral_type?.toLowerCase()
      if (backingType === 'fiat' || backingType === 'fiat_backed') {
        return AssetType.STABLECOIN_FIAT_BACKED
      }
      if (backingType === 'crypto' || backingType === 'crypto_backed') {
        return AssetType.STABLECOIN_CRYPTO_BACKED
      }
      if (backingType === 'commodity' || backingType === 'commodity_backed') {
        return AssetType.STABLECOIN_COMMODITY_BACKED
      }
      if (backingType === 'algorithmic') {
        return AssetType.STABLECOIN_ALGORITHMIC
      }
      // Default to fiat-backed if unclear
      return AssetType.STABLECOIN_FIAT_BACKED
      
    default:
      // For unknown multi-type tables, return the first supported type
      if (supportedTypes.length === 0) {
        throw new Error(`No asset types found for table: ${tableName}`)
      }
      return supportedTypes[0]!
  }
}

/**
 * Validates if an asset type is supported by the system
 */
export function isAssetTypeSupported(assetType: string): assetType is AssetType {
  return Object.values(AssetType).includes(assetType as AssetType)
}

/**
 * Gets all supported asset types
 */
export function getAllSupportedAssetTypes(): AssetType[] {
  return Object.values(AssetType)
}

/**
 * Gets all product table names
 */
export function getAllProductTableNames(): string[] {
  return Object.keys(TABLE_TO_ASSET_TYPES_MAP)
}

/**
 * Checks if a product table name is valid
 */
export function isValidProductTableName(tableName: string): boolean {
  return tableName in TABLE_TO_ASSET_TYPES_MAP
}

/**
 * Gets asset type-specific configuration
 * Useful for different calculation rules or validation thresholds
 */
export function getAssetTypeConfig(assetType: AssetType) {
  // Configuration that varies by asset type
  const configs: Partial<Record<AssetType, {
    maxDailyNavChange: number
    requiresMarkToMarket: boolean
    supportsFractionalShares: boolean
    defaultCurrency: string
  }>> = {
    [AssetType.MMF]: {
      maxDailyNavChange: 0.005, // 0.5% for MMFs (more strict)
      requiresMarkToMarket: true,
      supportsFractionalShares: true,
      defaultCurrency: 'USD',
    },
    [AssetType.EQUITY]: {
      maxDailyNavChange: 0.05, // 5% for equities
      requiresMarkToMarket: true,
      supportsFractionalShares: true,
      defaultCurrency: 'USD',
    },
    [AssetType.BONDS]: {
      maxDailyNavChange: 0.02, // 2% for bonds
      requiresMarkToMarket: true,
      supportsFractionalShares: true,
      defaultCurrency: 'USD',
    },
    [AssetType.STABLECOIN_FIAT_BACKED]: {
      maxDailyNavChange: 0.001, // 0.1% for stablecoins (very strict)
      requiresMarkToMarket: false,
      supportsFractionalShares: true,
      defaultCurrency: 'USD',
    },
    [AssetType.PRIVATE_EQUITY]: {
      maxDailyNavChange: 0.1, // 10% for private equity (less liquid)
      requiresMarkToMarket: false,
      supportsFractionalShares: false,
      defaultCurrency: 'USD',
    },
    [AssetType.REAL_ESTATE]: {
      maxDailyNavChange: 0.05, // 5% for real estate
      requiresMarkToMarket: false,
      supportsFractionalShares: false,
      defaultCurrency: 'USD',
    },
  }
  
  // Default config for asset types not explicitly configured
  const defaultConfig = {
    maxDailyNavChange: 0.05, // 5% default
    requiresMarkToMarket: true,
    supportsFractionalShares: true,
    defaultCurrency: 'USD',
  }
  
  return configs[assetType] || defaultConfig
}

// ==================== VALIDATION HELPERS ====================

/**
 * Product type validation result
 */
export interface ProductTypeValidationResult {
  isValid: boolean
  assetType?: AssetType
  tableName?: string
  errors: string[]
}

/**
 * Validates product type information and resolves asset type
 */
export function validateAndResolveProductType(input: {
  assetType?: string
  productType?: string
  tableName?: string
  productData?: any
}): ProductTypeValidationResult {
  const errors: string[] = []
  let resolvedAssetType: AssetType | undefined
  let resolvedTableName: string | undefined
  
  // Case 1: AssetType provided directly
  if (input.assetType) {
    if (!isAssetTypeSupported(input.assetType)) {
      errors.push(`Unsupported asset type: ${input.assetType}`)
    } else {
      resolvedAssetType = input.assetType as AssetType
      resolvedTableName = getProductTableName(resolvedAssetType)
    }
  }
  
  // Case 2: Product type string needs to be mapped to AssetType
  else if (input.productType) {
    // Try to find matching asset type (case-insensitive)
    const normalizedProductType = input.productType.toLowerCase().replace(/[_\s-]/g, '_')
    const matchingAssetType = getAllSupportedAssetTypes().find(type => 
      type.toLowerCase().replace(/[_\s-]/g, '_') === normalizedProductType
    )
    
    if (matchingAssetType) {
      resolvedAssetType = matchingAssetType
      resolvedTableName = getProductTableName(resolvedAssetType)
    } else {
      errors.push(`Could not map product type '${input.productType}' to a known asset type`)
    }
  }
  
  // Case 3: Table name provided, need to resolve asset type
  else if (input.tableName) {
    if (!isValidProductTableName(input.tableName)) {
      errors.push(`Unknown product table: ${input.tableName}`)
    } else {
      resolvedTableName = input.tableName
      try {
        resolvedAssetType = resolveAssetTypeFromTable(input.tableName, input.productData)
      } catch (error) {
        errors.push(`Could not resolve asset type from table ${input.tableName}: ${error}`)
      }
    }
  } 
  
  else {
    errors.push('Must provide assetType, productType, or tableName for validation')
  }
  
  return {
    isValid: errors.length === 0,
    assetType: resolvedAssetType,
    tableName: resolvedTableName,
    errors,
  }
}
