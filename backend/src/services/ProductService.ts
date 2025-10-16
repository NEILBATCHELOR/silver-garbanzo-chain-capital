/**
 * Product Service - Helper for unified products table
 * Handles creating/updating products entries for all product types
 */

import { SupabaseClient } from '@supabase/supabase-js'

export type ProductType = 
  | 'bond'
  | 'fund'
  | 'mmf'
  | 'equity'
  | 'commodity'
  | 'structured_product'
  | 'quantitative_strategy'
  | 'private_equity'
  | 'private_debt'
  | 'real_estate'
  | 'energy'
  | 'infrastructure'
  | 'collectible'
  | 'asset_backed'
  | 'stablecoin'
  | 'digital_tokenised_fund'

export interface Product {
  id: string
  project_id: string
  product_type: ProductType
  product_name: string
  product_status: string
  created_at: Date
  updated_at: Date
}

export class ProductService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get or create a product entry
   * This ensures the unified products table has an entry for any specialized product
   */
  async getOrCreateProduct(
    productId: string,
    productType: ProductType,
    projectId: string,
    productName: string
  ): Promise<{ success: boolean; data?: Product; error?: string }> {
    try {
      // Check if product already exists
      const { data: existing, error: fetchError } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (existing) {
        return { success: true, data: existing }
      }

      // Create new product entry
      const { data: created, error: createError } = await this.supabase
        .from('products')
        .insert({
          id: productId,
          project_id: projectId,
          product_type: productType,
          product_name: productName,
          product_status: 'active'
        })
        .select()
        .single()

      if (createError) {
        return { success: false, error: createError.message }
      }

      return { success: true, data: created }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(
    productId: string
  ): Promise<{ success: boolean; data?: Product; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Verify product exists and get its type
   */
  async verifyProductType(
    productId: string,
    expectedType: ProductType
  ): Promise<{ success: boolean; valid: boolean; actualType?: ProductType; error?: string }> {
    try {
      const result = await this.getProduct(productId)
      
      if (!result.success || !result.data) {
        return { success: false, valid: false, error: result.error || 'Product not found' }
      }

      return {
        success: true,
        valid: result.data.product_type === expectedType,
        actualType: result.data.product_type as ProductType
      }
    } catch (error) {
      return {
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
