import { supabase } from '@/infrastructure/database/client';
import type {
  SimplifiedProject,
  ProjectWithProducts,
  StructuredProduct,
  EquityProduct,
  BondProduct,
  FundProduct,
  RealEstateProduct,
  EnergyProduct,
  StablecoinProduct,
  DigitalTokenisedFund,
  ProductUnion
} from '@/types/products';

// ========================================
// LEGACY PROJECT INTERFACE
// ========================================
// This matches the old projects table structure
export interface LegacyProject {
  id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  project_type?: string;
  
  // Fields that moved to product tables
  token_symbol?: string;
  target_raise?: number;
  authorized_shares?: number;
  share_price?: number;
  company_valuation?: number;
  legal_entity?: string;
  jurisdiction?: string;
  tax_id?: string;
  status?: string;
  is_primary?: boolean;
  investment_status?: string;
  estimated_yield_percentage?: number;
  duration?: any;
  subscription_start_date?: Date;
  subscription_end_date?: Date;
  transaction_start_date?: Date;
  maturity_date?: Date;
  currency?: string;
  minimum_investment?: number;
  total_notional?: number;
  
  // Structured products fields
  barrier_level?: number;
  payoff_structure?: string;
  capital_protection_level?: number;
  underlying_assets?: string[];
  
  // Equity fields  
  voting_rights?: string;
  dividend_policy?: string;
  dilution_protection?: string[];
  exit_strategy?: string;
  
  // Bond fields
  credit_rating?: string;
  coupon_frequency?: string;
  callable_features?: boolean;
  call_date?: Date;
  call_price?: number;
  security_collateral?: string;
  
  // Fund fields
  fund_vintage_year?: number;
  investment_stage?: string;
  sector_focus?: string[];
  geographic_focus?: string[];
  
  // Real estate fields
  property_type?: string;
  geographic_location?: string;
  development_stage?: string;
  environmental_certifications?: string[];
  
  // Energy fields
  project_capacity_mw?: number;
  power_purchase_agreements?: string;
  regulatory_approvals?: string[];
  carbon_offset_potential?: number;
  
  // Digital asset fields
  blockchain_network?: string;
  smart_contract_address?: string;
  collateral_type?: string;
  redemption_mechanism?: string;
  
  // Add any other legacy fields as needed
  [key: string]: any;
}

// ========================================
// PROJECT COMPATIBILITY BRIDGE
// ========================================
export class ProjectCompatibilityBridge {
  
  /**
   * Get a project in the old format for backward compatibility
   * This combines the simplified project with all its products
   */
  async getLegacyProject(projectId: string): Promise<LegacyProject | null> {
    try {
      // Get the simplified project from new table structure
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !projectData) {
        return null;
      }

      // Get all products for this project
      const products = await this.getAllProjectProducts(projectId);

      // Convert to legacy format
      return this.convertToLegacyFormat(projectData, products);
      
    } catch (error) {
      console.error('Error getting legacy project:', error);
      return null;
    }
  }

  /**
   * Get all projects in legacy format for lists/tables
   */
  async getLegacyProjects(filters: {
    organizationId?: string;
    projectType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ data: LegacyProject[]; total: number }> {
    try {
      let query = supabase
        .from('projects')
        .select('*', { count: 'exact' });

      if (filters.organizationId) {
        query = query.eq('organization_id', filters.organizationId);
      }

      if (filters.projectType) {
        query = query.eq('project_type', filters.projectType);
      }

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: projectsData, error, count } = await query;

      if (error) throw error;

      // Convert all projects to legacy format
      const legacyProjects: LegacyProject[] = [];
      
      for (const project of projectsData || []) {
        const products = await this.getAllProjectProducts(project.id);
        const legacyProject = this.convertToLegacyFormat(project, products);
        legacyProjects.push(legacyProject);
      }

      return {
        data: legacyProjects,
        total: count || 0
      };

    } catch (error) {
      console.error('Error getting legacy projects:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * Create a project using legacy format
   * This will create the simplified project and appropriate products
   */
  async createLegacyProject(legacyProject: Partial<LegacyProject>): Promise<LegacyProject> {
    try {
      // Create the simplified project first
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: legacyProject.name!,
          description: legacyProject.description,
          project_type: legacyProject.project_type,
          organization_id: null, // Will need to be set based on context
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create appropriate product entries based on the legacy data
      await this.createProductsFromLegacyData(projectData.id, legacyProject);

      // Return the created project in legacy format
      return await this.getLegacyProject(projectData.id) as LegacyProject;

    } catch (error) {
      console.error('Error creating legacy project:', error);
      throw error;
    }
  }

  /**
   * Update a project using legacy format
   */
  async updateLegacyProject(projectId: string, updates: Partial<LegacyProject>): Promise<LegacyProject> {
    try {
      // Update the base project
      const projectUpdates: any = {};
      if (updates.name !== undefined) projectUpdates.name = updates.name;
      if (updates.description !== undefined) projectUpdates.description = updates.description;
      if (updates.project_type !== undefined) projectUpdates.project_type = updates.project_type;
      projectUpdates.updated_at = new Date().toISOString();

      if (Object.keys(projectUpdates).length > 1) { // More than just updated_at
        await supabase
          .from('projects')
          .update(projectUpdates)
          .eq('id', projectId);
      }

      // Update products based on legacy field updates
      await this.updateProductsFromLegacyData(projectId, updates);

      // Return updated project in legacy format
      return await this.getLegacyProject(projectId) as LegacyProject;

    } catch (error) {
      console.error('Error updating legacy project:', error);
      throw error;
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private async getAllProjectProducts(projectId: string): Promise<ProductUnion[]> {
    const products: ProductUnion[] = [];

    try {
      // Get products from all product tables
      const productTables = [
        'structured_products',
        'equity_products', 
        'commodities_products',
        'fund_products',
        'bond_products',
        'quantitative_strategies',
        'private_equity_products',
        'private_debt_products',
        'real_estate_products',
        'energy_products',
        'infrastructure_products',
        'collectibles_products',
        'asset_backed_products',
        'digital_tokenised_funds',
        'stablecoin_products'
      ];

      for (const table of productTables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('project_id', projectId);

          if (!error && data && data.length > 0) {
            // Convert database fields to camelCase
            const convertedProducts = data.map(item => this.convertDatabaseProductToModel(item));
            products.push(...convertedProducts);
          }
        } catch (tableError) {
          console.warn(`Failed to query ${table}:`, tableError);
          // Continue with other tables
        }
      }

    } catch (error) {
      console.error('Error getting all project products:', error);
    }

    return products;
  }

  private convertToLegacyFormat(project: any, products: ProductUnion[]): LegacyProject {
    const legacy: LegacyProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      created_at: new Date(project.created_at),
      updated_at: new Date(project.updated_at),
      project_type: project.project_type
    };

    // Map products back to legacy fields
    products.forEach(product => {
      if (this.isStructuredProduct(product)) {
        const sp = product as StructuredProduct;
        if (sp.payoffStructure) legacy.payoff_structure = sp.payoffStructure;
        if (sp.barrierLevel) legacy.barrier_level = sp.barrierLevel;
        if (sp.protectionLevel) legacy.capital_protection_level = sp.protectionLevel;
        if (sp.underlyingAssets) legacy.underlying_assets = typeof sp.underlyingAssets === 'string' ? [sp.underlyingAssets] : sp.underlyingAssets;
        if (sp.currency) legacy.currency = sp.currency;
        if (sp.maturityDate) legacy.maturity_date = new Date(sp.maturityDate);
      }

      if (this.isEquityProduct(product)) {
        const ep = product as EquityProduct;
        if (ep.tickerSymbol) legacy.token_symbol = ep.tickerSymbol;
        if (ep.authorizedShares) legacy.authorized_shares = ep.authorizedShares;
        if (ep.marketCapitalization) legacy.company_valuation = ep.marketCapitalization;
        if (ep.votingRights) legacy.voting_rights = ep.votingRights;
        if (ep.dividendPolicy) legacy.dividend_policy = ep.dividendPolicy;
        if (ep.dilutionProtection) legacy.dilution_protection = typeof ep.dilutionProtection === 'string' ? [ep.dilutionProtection] : ep.dilutionProtection;
        if (ep.exitStrategy) legacy.exit_strategy = ep.exitStrategy;
      }

      if (this.isBondProduct(product)) {
        const bp = product as BondProduct;
        if (bp.creditRating) legacy.credit_rating = bp.creditRating;
        if (bp.couponFrequency) legacy.coupon_frequency = bp.couponFrequency;
        if (bp.callableFeatures) legacy.callable_features = typeof bp.callableFeatures === 'string' ? bp.callableFeatures === 'true' : bp.callableFeatures;
        if (bp.callDate) legacy.call_date = new Date(bp.callDate);
        if (bp.callPrice) legacy.call_price = bp.callPrice;
        if (bp.securityCollateral) legacy.security_collateral = bp.securityCollateral;
        if (bp.couponRate) legacy.estimated_yield_percentage = bp.couponRate;
        if (bp.faceValue) legacy.target_raise = bp.faceValue;
      }

      if (this.isFundProduct(product)) {
        const fp = product as FundProduct;
        if (fp.fundTicker) legacy.token_symbol = fp.fundTicker;
        if (fp.assetsUnderManagement) legacy.target_raise = fp.assetsUnderManagement;
        if (fp.fundVintageYear) legacy.fund_vintage_year = typeof fp.fundVintageYear === 'string' ? parseInt(fp.fundVintageYear) : fp.fundVintageYear;
        if (fp.investmentStage) legacy.investment_stage = fp.investmentStage;
        if (fp.sectorFocus) legacy.sector_focus = typeof fp.sectorFocus === 'string' ? [fp.sectorFocus] : Array.isArray(fp.sectorFocus) ? fp.sectorFocus : [];
        if (fp.geographicFocus) legacy.geographic_focus = typeof fp.geographicFocus === 'string' ? [fp.geographicFocus] : Array.isArray(fp.geographicFocus) ? fp.geographicFocus : [];
      }

      if (this.isRealEstateProduct(product)) {
        const rep = product as RealEstateProduct;
        if (rep.propertyType) legacy.property_type = rep.propertyType;
        if (rep.geographicLocation) legacy.geographic_location = rep.geographicLocation;
        if (rep.developmentStage) legacy.development_stage = rep.developmentStage;
        if (rep.environmentalCertifications) legacy.environmental_certifications = typeof rep.environmentalCertifications === 'string' ? [rep.environmentalCertifications] : rep.environmentalCertifications;
      }

      if (this.isEnergyProduct(product)) {
        const enp = product as EnergyProduct;
        if (enp.projectCapacityMw) legacy.project_capacity_mw = enp.projectCapacityMw;
        if (enp.powerPurchaseAgreements) legacy.power_purchase_agreements = enp.powerPurchaseAgreements;
        if (enp.regulatoryApprovals) legacy.regulatory_approvals = typeof enp.regulatoryApprovals === 'string' ? [enp.regulatoryApprovals] : enp.regulatoryApprovals;
        if (enp.carbonOffsetPotential) legacy.carbon_offset_potential = typeof enp.carbonOffsetPotential === 'string' ? parseFloat(enp.carbonOffsetPotential) : enp.carbonOffsetPotential;
      }

      if (this.isStablecoinProduct(product)) {
        const scp = product as StablecoinProduct;
        if (scp.assetSymbol) legacy.token_symbol = scp.assetSymbol;
        if (scp.blockchainNetwork) legacy.blockchain_network = scp.blockchainNetwork;
        if (scp.smartContractAddress) legacy.smart_contract_address = scp.smartContractAddress;
        if (scp.collateralType) legacy.collateral_type = scp.collateralType;
        if (scp.redemptionMechanism) legacy.redemption_mechanism = scp.redemptionMechanism;
      }

      if (this.isDigitalTokenisedFund(product)) {
        const dtf = product as DigitalTokenisedFund;
        if (dtf.assetSymbol) legacy.token_symbol = dtf.assetSymbol;
        if (dtf.blockchainNetwork) legacy.blockchain_network = dtf.blockchainNetwork;
        if (dtf.smartContractAddress) legacy.smart_contract_address = dtf.smartContractAddress;
      }

      // Set common fields from any product
      if (!legacy.status && (product as any).status) {
        legacy.status = (product as any).status;
      }
    });

    return legacy;
  }

  private async createProductsFromLegacyData(projectId: string, legacyData: Partial<LegacyProject>): Promise<void> {
    // Determine product type and create appropriate product entry
    const productType = this.determineProductTypeFromLegacy(legacyData);

    switch (productType) {
      case 'structured_product':
        await this.createStructuredProduct(projectId, legacyData);
        break;
      case 'equity':
        await this.createEquityProduct(projectId, legacyData);
        break;
      case 'bond':
        await this.createBondProduct(projectId, legacyData);
        break;
      case 'fund':
        await this.createFundProduct(projectId, legacyData);
        break;
      case 'real_estate':
        await this.createRealEstateProduct(projectId, legacyData);
        break;
      case 'energy':
        await this.createEnergyProduct(projectId, legacyData);
        break;
      case 'stablecoin':
        await this.createStablecoinProduct(projectId, legacyData);
        break;
      case 'digital_tokenised_fund':
        await this.createDigitalTokenisedFund(projectId, legacyData);
        break;
      default:
        // Create a generic structured product as fallback
        await this.createStructuredProduct(projectId, legacyData);
    }
  }

  private async updateProductsFromLegacyData(projectId: string, updates: Partial<LegacyProject>): Promise<void> {
    // This would update existing products based on legacy field changes
    // For now, we'll implement a simple version that recreates products
    // In a full implementation, this would be more sophisticated
    
    // Get existing products and update them appropriately
    const products = await this.getAllProjectProducts(projectId);
    
    // Update products based on the legacy updates
    // This is a simplified implementation
    for (const product of products) {
      await this.updateProductFromLegacyData(product, updates);
    }
  }

  // Product creation methods (simplified implementations)
  private async createStructuredProduct(projectId: string, legacyData: Partial<LegacyProject>): Promise<void> {
    const productData = {
      project_id: projectId,
      payoff_structure: legacyData.payoff_structure,
      barrier_level: legacyData.barrier_level,
      protection_level: legacyData.capital_protection_level,
      underlying_assets: legacyData.underlying_assets,
      currency: legacyData.currency,
      maturity_date: legacyData.maturity_date?.toISOString(),
      status: legacyData.status || 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await supabase.from('structured_products').insert(productData);
  }

  private async createEquityProduct(projectId: string, legacyData: Partial<LegacyProject>): Promise<void> {
    const productData = {
      project_id: projectId,
      ticker_symbol: legacyData.token_symbol,
      authorized_shares: legacyData.authorized_shares,
      market_capitalization: legacyData.company_valuation,
      voting_rights: legacyData.voting_rights,
      dividend_policy: legacyData.dividend_policy,
      dilution_protection: legacyData.dilution_protection,
      exit_strategy: legacyData.exit_strategy,
      currency: legacyData.currency,
      status: legacyData.status || 'Listed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await supabase.from('equity_products').insert(productData);
  }

  // Add other product creation methods...
  private async createBondProduct(projectId: string, legacyData: Partial<LegacyProject>): Promise<void> {
    // Implementation for bond products
  }

  private async createFundProduct(projectId: string, legacyData: Partial<LegacyProject>): Promise<void> {
    // Implementation for fund products  
  }

  private async createRealEstateProduct(projectId: string, legacyData: Partial<LegacyProject>): Promise<void> {
    // Implementation for real estate products
  }

  private async createEnergyProduct(projectId: string, legacyData: Partial<LegacyProject>): Promise<void> {
    // Implementation for energy products
  }

  private async createStablecoinProduct(projectId: string, legacyData: Partial<LegacyProject>): Promise<void> {
    // Implementation for stablecoin products
  }

  private async createDigitalTokenisedFund(projectId: string, legacyData: Partial<LegacyProject>): Promise<void> {
    // Implementation for digital tokenised funds
  }

  private async updateProductFromLegacyData(product: ProductUnion, updates: Partial<LegacyProject>): Promise<void> {
    // Update individual products based on legacy field changes
    // Implementation depends on product type
  }

  // Type guard methods
  private isStructuredProduct(product: ProductUnion): boolean {
    return 'payoffStructure' in product || 'barrierLevel' in product;
  }

  private isEquityProduct(product: ProductUnion): boolean {
    return 'tickerSymbol' in product || 'authorizedShares' in product;
  }

  private isBondProduct(product: ProductUnion): boolean {
    return 'bondIsinCusip' in product || 'couponRate' in product;
  }

  private isFundProduct(product: ProductUnion): boolean {
    return 'fundTicker' in product || 'netAssetValue' in product;
  }

  private isRealEstateProduct(product: ProductUnion): boolean {
    return 'propertyId' in product || 'propertyType' in product;
  }

  private isEnergyProduct(product: ProductUnion): boolean {
    return 'projectCapacityMw' in product || 'carbonOffsetPotential' in product;
  }

  private isStablecoinProduct(product: ProductUnion): boolean {
    return 'pegValue' in product || 'collateralType' in product;
  }

  private isDigitalTokenisedFund(product: ProductUnion): boolean {
    return 'nav' in product || 'managementFee' in product;
  }

  private determineProductTypeFromLegacy(legacyData: Partial<LegacyProject>): string {
    // Determine product type based on which fields are present
    if (legacyData.barrier_level || legacyData.payoff_structure) return 'structured_product';
    if (legacyData.authorized_shares || legacyData.voting_rights) return 'equity';
    if (legacyData.credit_rating || legacyData.coupon_frequency) return 'bond';
    if (legacyData.fund_vintage_year || legacyData.investment_stage) return 'fund';
    if (legacyData.property_type) return 'real_estate';
    if (legacyData.project_capacity_mw) return 'energy';
    if (legacyData.collateral_type || legacyData.redemption_mechanism) return 'stablecoin';
    if (legacyData.blockchain_network && !legacyData.collateral_type) return 'digital_tokenised_fund';
    
    return legacyData.project_type || 'structured_product';
  }

  private convertDatabaseProductToModel(dbProduct: any): ProductUnion {
    // Convert snake_case database fields to camelCase model fields
    const result: any = {
      id: dbProduct.id,
      projectId: dbProduct.project_id,
      createdAt: new Date(dbProduct.created_at),
      updatedAt: new Date(dbProduct.updated_at)
    };

    // Convert all other fields from snake_case to camelCase
    Object.keys(dbProduct).forEach(key => {
      if (!['id', 'project_id', 'created_at', 'updated_at'].includes(key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = dbProduct[key];
      }
    });

    return result as ProductUnion;
  }
}

// Export singleton instance
export const projectCompatibilityBridge = new ProjectCompatibilityBridge();
