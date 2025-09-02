/**
 * Product factory service for creating and managing products of any type
 */

import { BaseProductService } from './baseProductService';
import { 
  AnyProduct, 
  StructuredProduct, 
  EquityProduct,
  CommoditiesProduct,
  FundProduct,
  BondProduct,
  QuantitativeInvestmentStrategyProduct,
  PrivateEquityProduct,
  PrivateDebtProduct,
  RealEstateProduct,
  EnergyProduct,
  InfrastructureProduct,
  CollectiblesProduct,
  AssetBackedProduct,
  DigitalTokenizedFundProduct,
  StablecoinProduct,
  FiatBackedStablecoin,
  CryptoBackedStablecoin,
  CommodityBackedStablecoin,
  AlgorithmicStablecoin,
  RebasingStablecoin
} from '@/types/products';
import { ProjectType } from '@/types/projects/projectTypes';
import { supabase } from '@/infrastructure/database/client';

// Map of project types to their respective table names
const TABLE_NAMES: Record<ProjectType, string> = {
  [ProjectType.STRUCTURED_PRODUCTS]: 'structured_products',
  [ProjectType.EQUITY]: 'equity_products',
  [ProjectType.COMMODITIES]: 'commodities_products',
  [ProjectType.FUNDS_ETFS_ETPS]: 'fund_products',
  [ProjectType.BONDS]: 'bond_products',
  [ProjectType.QUANTITATIVE_INVESTMENT_STRATEGIES]: 'quantitative_investment_strategies_products',
  [ProjectType.PRIVATE_EQUITY]: 'private_equity_products',
  [ProjectType.PRIVATE_DEBT]: 'private_debt_products',
  [ProjectType.REAL_ESTATE]: 'real_estate_products',
  [ProjectType.ENERGY]: 'energy_products',
  [ProjectType.SOLAR_WIND_CLIMATE]: 'energy_products',
  [ProjectType.INFRASTRUCTURE]: 'infrastructure_products',
  [ProjectType.COLLECTIBLES]: 'collectibles_products',
  [ProjectType.RECEIVABLES]: 'asset_backed_products',
  [ProjectType.DIGITAL_TOKENISED_FUND]: 'digital_tokenized_fund_products',
  [ProjectType.FIAT_BACKED_STABLECOIN]: 'stablecoin_products',
  [ProjectType.CRYPTO_BACKED_STABLECOIN]: 'stablecoin_products',
  [ProjectType.COMMODITY_BACKED_STABLECOIN]: 'stablecoin_products',
  [ProjectType.ALGORITHMIC_STABLECOIN]: 'stablecoin_products',
  [ProjectType.REBASING_STABLECOIN]: 'stablecoin_products',
};

/**
 * Class for managing products of all types
 */
export class ProductFactoryService {
  /**
   * Creates a service for a specific product type
   * @param productType Type of product
   * @returns Service for the specific product type
   */
  static getServiceForType<T extends AnyProduct>(productType: ProjectType): BaseProductService<T> {
    const tableName = TABLE_NAMES[productType];
    if (!tableName) {
      throw new Error(`No table defined for product type: ${productType}`);
    }

    return new BaseProductService<T>(tableName, productType);
  }

  /**
   * Creates a product of any type
   * @param productType Type of product
   * @param productData Product data
   * @returns Created product
   */
  static async createProduct<T extends AnyProduct>(
    productType: ProjectType, 
    productData: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    const service = this.getServiceForType<T>(productType);
    return service.createProduct(productData);
  }

  /**
   * Gets a product by project ID and type
   * @param projectId Project ID
   * @param productType Type of product
   * @returns Product data
   */
  static async getProductForProject<T extends AnyProduct>(
    projectId: string, 
    productType: ProjectType
  ): Promise<T | null> {
    const service = this.getServiceForType<T>(productType);
    return service.getProductByProjectId(projectId);
  }

  /**
   * Updates a product
   * @param id Product ID
   * @param productType Type of product
   * @param updates Product updates
   * @returns Updated product
   */
  static async updateProduct<T extends AnyProduct>(
    id: string, 
    productType: ProjectType, 
    updates: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<T> {
    const service = this.getServiceForType<T>(productType);
    return service.updateProduct(id, updates);
  }

  /**
   * Deletes a product
   * @param id Product ID
   * @param productType Type of product
   * @returns Success flag
   */
  static async deleteProduct(id: string, productType: ProjectType): Promise<boolean> {
    const service = this.getServiceForType(productType);
    return service.deleteProduct(id);
  }

  /**
   * Checks if a product exists for a project
   * @param projectId Project ID
   * @returns Boolean indicating if product exists
   */
  static async hasProductForProject(projectId: string): Promise<boolean> {
    const projectResponse = await supabase
      .from('projects')
      .select('project_type')
      .eq('id', projectId)
      .single();

    if (projectResponse.error) {
      throw new Error(`Failed to get project type: ${projectResponse.error.message}`);
    }

    const productType = projectResponse.data.project_type as ProjectType;
    if (!productType) {
      return false;
    }

    const tableName = TABLE_NAMES[productType as ProjectType];
    if (!tableName) {
      return false;
    }

    const { count, error } = await supabase
      .from(tableName)
      .select('id', { count: 'exact' })
      .eq('project_id', projectId);

    if (error) {
      throw new Error(`Failed to check product existence: ${error.message}`);
    }

    return count !== null && count > 0;
  }

  /**
   * Gets all products for a project by checking all product tables
   * @param projectId Project ID
   * @returns Array of products with their types
   */
  static async getAllProductsForProject(projectId: string): Promise<Array<{type: ProjectType, product: AnyProduct}>> {
    const projectResponse = await supabase
      .from('projects')
      .select('project_type')
      .eq('id', projectId)
      .single();

    if (projectResponse.error) {
      throw new Error(`Failed to get project type: ${projectResponse.error.message}`);
    }

    const productType = projectResponse.data.project_type as ProjectType;
    if (!productType) {
      return [];
    }

    const tableName = TABLE_NAMES[productType];
    if (!tableName) {
      return [];
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      throw new Error(`Failed to get products: ${error.message}`);
    }

    // Convert snake_case to camelCase
    const service = this.getServiceForType(productType);
    const products = data.map(item => ({
      type: productType,
      product: service['toCamelCase'](item) as AnyProduct
    }));

    return products;
  }
}
