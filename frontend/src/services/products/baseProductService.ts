/**
 * Base product service that provides common functionality for all product types
 */

import { supabase } from '@/infrastructure/database/client';
import { BaseProduct, AnyProduct } from '@/types/products';
import { ProjectType } from '@/types/projects/projectTypes';

export class BaseProductService<T extends BaseProduct> {
  protected tableName: string;
  protected productType: ProjectType;

  constructor(tableName: string, productType: ProjectType) {
    this.tableName = tableName;
    this.productType = productType;
  }

  /**
  * Creates a new product or updates an existing one if there's already a product for this project
  * @param product Product data
  * @returns Created or updated product
  */
async createProduct(product: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
  console.log(`BaseProductService.createProduct: Checking if product exists for project ${product.projectId} in table ${this.tableName}`);
  
  try {
  // Check if a product already exists for this project
  const { data: existingProducts, error: checkError } = await supabase
      .from(this.tableName)
      .select('id')
    .eq('project_id', product.projectId)
      .limit(1);
      
    if (checkError) {
      console.error(`Error checking for existing product: ${checkError.message}`);
      throw new Error(`Error checking for existing product: ${checkError.message}`);
    }
    
    // If product exists, update it instead of creating a new one
    if (existingProducts && existingProducts.length > 0) {
      console.log(`Product already exists for project ${product.projectId}, updating instead`);
      const existingId = existingProducts[0].id;
      return await this.updateProduct(existingId, product);
    }
    
    console.log(`Creating new product in table ${this.tableName}`);
    const snakeCaseProduct = this.toSnakeCase(product);
    console.log('Data to insert:', snakeCaseProduct);
    
    // Create new product
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(snakeCaseProduct)
      .select('*')
      .single();
      
    if (error) {
      console.error(`Failed to create ${this.productType} product: ${error.message}`);
      throw new Error(`Failed to create ${this.productType} product: ${error.message}`);
    }
    
    return this.toCamelCase(data) as T;
  } catch (error) {
    console.error(`Error in createProduct:`, error);
    throw error;
  }
}

  /**
   * Gets a product by ID
   * @param id Product ID
   * @returns Product data
   */
  async getProductById(id: string): Promise<T> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to get ${this.productType} product: ${error.message}`);
    }

    return this.toCamelCase(data) as T;
  }

  /**
   * Gets a product by project ID
   * @param projectId Project ID
   * @returns Product data
   */
  async getProductByProjectId(projectId: string): Promise<T | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get ${this.productType} product by project ID: ${error.message}`);
    }

    return data ? this.toCamelCase(data) as T : null;
  }

  /**
   * Updates a product
   * @param id Product ID
   * @param updates Product updates
   * @returns Updated product
   */
  async updateProduct(id: string, updates: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T> {
    console.log('BaseProductService.updateProduct:', id, this.tableName, updates);
    const snakeCaseUpdates = this.toSnakeCase(updates);
    console.log('SnakeCase updates:', snakeCaseUpdates);
    
    const { data, error } = await supabase
      .from(this.tableName)
      .update(snakeCaseUpdates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update ${this.productType} product: ${error.message}`);
    }

    return this.toCamelCase(data) as T;
  }

  /**
   * Deletes a product
   * @param id Product ID
   * @returns Success flag
   */
  async deleteProduct(id: string): Promise<boolean> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete ${this.productType} product: ${error.message}`);
    }

    return true;
  }

  /**
   * Transforms camelCase object to snake_case for database operations
   * @param obj Object with camelCase properties
   * @returns Object with snake_case properties
   */
  protected toSnakeCase(obj: any): any {
    if (!obj) return obj;
    
    const result: Record<string, any> = {};
    
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        result[snakeKey] = obj[key];
      }
    });
    
    return result;
  }

  /**
   * Transforms snake_case object to camelCase for TypeScript models
   * @param obj Object with snake_case properties
   * @returns Object with camelCase properties
   */
  protected toCamelCase(obj: any): any {
    if (!obj) return obj;
    
    const result: Record<string, any> = {};
    
    Object.keys(obj).forEach(key => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = obj[key];
    });
    
    return result;
  }
}
