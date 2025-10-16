/**
 * Product Link Validation Service
 * 
 * Maps product_type to product tables and validates product_id existence
 * Supports all 15 product tables in the system
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Product type to table name mapping
export const PRODUCT_TYPE_TO_TABLE: Record<string, string> = {
  'asset_backed': 'asset_backed_products',
  'bond': 'bond_products',
  'collectible': 'collectibles_products',
  'commodity': 'commodities_products',
  'digital_tokenized_fund': 'digital_tokenized_fund_products',
  'energy': 'energy_products',
  'equity': 'equity_products',
  'fund': 'fund_products',
  'mmf': 'fund_products',  // MMFs are a subset of fund_products
  'infrastructure': 'infrastructure_products',
  'private_debt': 'private_debt_products',
  'private_equity': 'private_equity_products',
  'quant_strategy': 'quantitative_investment_strategies_products',
  'real_estate': 'real_estate_products',
  'stablecoin': 'stablecoin_products',
  'structured_product': 'structured_products'
}

// Table name to product type mapping (reverse)
export const TABLE_TO_PRODUCT_TYPE: Record<string, string> = Object.entries(PRODUCT_TYPE_TO_TABLE)
  .reduce((acc, [type, table]) => {
    if (!acc[table]) {
      acc[table] = type
    }
    return acc
  }, {} as Record<string, string>)

export interface ProductValidationResult {
  isValid: boolean
  exists: boolean
  tableName?: string
  error?: string
  productData?: any
}

/**
 * Validate that a product exists in the correct table
 */
export async function validateProductLink(
  supabase: SupabaseClient,
  productId: string,
  productType: string
): Promise<ProductValidationResult> {
  // Check if product_type is valid
  const tableName = PRODUCT_TYPE_TO_TABLE[productType]
  
  if (!tableName) {
    return {
      isValid: false,
      exists: false,
      error: `Invalid product_type: ${productType}. Must be one of: ${Object.keys(PRODUCT_TYPE_TO_TABLE).join(', ')}`
    }
  }

  // Check if product exists in the specified table
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .eq('id', productId)
      .single()

    if (error || !data) {
      return {
        isValid: false,
        exists: false,
        tableName,
        error: `Product ${productId} not found in ${tableName}`
      }
    }

    return {
      isValid: true,
      exists: true,
      tableName,
      productData: data
    }
  } catch (error) {
    return {
      isValid: false,
      exists: false,
      tableName,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    }
  }
}

/**
 * Get the table name for a product type
 */
export function getTableNameForProductType(productType: string): string | null {
  return PRODUCT_TYPE_TO_TABLE[productType] || null
}

/**
 * Get the product type for a table name
 */
export function getProductTypeForTable(tableName: string): string | null {
  return TABLE_TO_PRODUCT_TYPE[tableName] || null
}

/**
 * Check if a product type is valid
 */
export function isValidProductType(productType: string): boolean {
  return productType in PRODUCT_TYPE_TO_TABLE
}

/**
 * Get all valid product types
 */
export function getAllProductTypes(): string[] {
  return Object.keys(PRODUCT_TYPE_TO_TABLE)
}

/**
 * Get all product table names
 */
export function getAllProductTables(): string[] {
  return Array.from(new Set(Object.values(PRODUCT_TYPE_TO_TABLE)))
}
