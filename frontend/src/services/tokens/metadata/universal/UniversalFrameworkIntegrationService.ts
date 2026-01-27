/**
 * Universal Framework Integration Service
 * Bridges Universal Structured Product Framework with Token-2022 deployment
 * 
 * Integrates with:
 * - Token2022DeploymentService (token minting)
 * - Token2022MetadataDeploymentService (metadata deployment)
 * - UniversalMetadataBuilder (metadata construction)
 * 
 * Supports both:
 * - Enumeration approach (existing specific forms)
 * - Universal framework approach (composable products)
 */

import { Token2022DeploymentService } from '@/services/wallet/solana/Token2022DeploymentService';
import { Token2022MetadataDeploymentService } from '@/services/tokens/metadata/Token2022MetadataDeploymentService';
import { universalMetadataBuilder } from '@/services/tokens/metadata/universal/UniversalMetadataBuilder';
import type { 
  UniversalStructuredProductMetadata 
} from '@/services/tokens/metadata/universal/UniversalStructuredProductTypes';
import type { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export interface UniversalProductDeploymentConfig {
  // Token identification (required)
  name: string;
  symbol: string;
  
  // Product Metadata
  metadata: UniversalStructuredProductMetadata;
  
  // Token Configuration
  decimals: number;
  initialSupply: number;
  
  // Metadata URI (optional - if not provided, will be generated)
  metadataUri?: string;
  
  // Authorities
  mintAuthority?: string;
  freezeAuthority?: string;
  keeperAuthority: string; // Required for autocallable features
  
  // Network
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  
  // Project Context
  projectId: string;
  userId: string;
  
  // Wallet
  walletKeypair: Keypair;
  
  // Extensions
  enablePermanentDelegate?: boolean;
  enableDefaultAccountState?: boolean;
  defaultAccountState?: 'frozen' | 'initialized';
}

export interface UniversalProductDeploymentResult {
  // Token Details
  mint: string;
  decimals: number;
  tokenAddress?: string;
  
  // Metadata
  metadataUri: string;
  
  // Transaction
  transactionHash?: string;
  tokenId?: string;
  
  // Product Configuration
  productCategory: string;
  components: {
    barriers: boolean;
    coupons: boolean;
    callable: boolean;
    putable: boolean;
    capitalProtection: boolean;
    participation: boolean;
  };
  
  // Deployment Info
  deployedAt: Date;
  network: string;
}

export class UniversalFrameworkIntegrationService {
  private token2022Service: Token2022DeploymentService;
  private metadataService: Token2022MetadataDeploymentService;
  private metadataBuilder = universalMetadataBuilder;

  constructor() {
    this.token2022Service = new Token2022DeploymentService();
    this.metadataService = new Token2022MetadataDeploymentService();
  }

  /**
   * Deploy a structured product using the universal framework
   */
  async deployStructuredProduct(
    config: UniversalProductDeploymentConfig
  ): Promise<UniversalProductDeploymentResult> {
    try {
      // 1. Convert metadata to builder input format
      const builderInput = this.convertToBuilderInput(config);
      
      // 2. Build on-chain metadata using the builder
      const metadataResult = this.metadataBuilder.buildStructuredProduct(builderInput);
      
      // 3. Use provided metadata URI or the one from metadata result
      const metadataUri = config.metadataUri || metadataResult.uri;

      // 4. Deploy Token-2022 with metadata extension
      const deployResult = await this.token2022Service.deployToken2022({
        name: config.name,
        symbol: config.symbol,
        uri: metadataUri,
        decimals: config.decimals,
        initialSupply: config.initialSupply,
        
        enableMetadata: true,
        metadata: {
          name: config.name,
          symbol: config.symbol,
          uri: metadataUri,
          additionalMetadata: metadataResult.additionalMetadata
        },
        
        enablePermanentDelegate: config.enablePermanentDelegate ?? true,
        permanentDelegate: config.keeperAuthority,
        
        enableDefaultAccountState: config.defaultAccountState,
      }, {
        network: config.network,
        projectId: config.projectId,
        userId: config.userId,
        walletPrivateKey: bs58.encode(config.walletKeypair.secretKey)
      });

      // 5. Extract component configuration
      const components = {
        barriers: !!config.metadata.barriers,
        coupons: !!config.metadata.coupons,
        callable: !!config.metadata.callableFeature,
        putable: !!config.metadata.putableFeature,
        capitalProtection: !!config.metadata.capitalProtection,
        participation: !!config.metadata.participation
      };

      // 6. Return deployment result
      return {
        mint: deployResult.mint || deployResult.tokenAddress || '',
        decimals: config.decimals,
        tokenAddress: deployResult.tokenAddress,
        metadataUri,
        transactionHash: deployResult.transactionHash,
        tokenId: deployResult.tokenId,
        productCategory: config.metadata.productCategory,
        components,
        deployedAt: new Date(),
        network: config.network
      };
    } catch (error) {
      console.error('Universal product deployment failed:', error);
      throw new Error(`Failed to deploy structured product: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Convert deployment config to builder input format
   */
  private convertToBuilderInput(
    config: UniversalProductDeploymentConfig
  ): import('./UniversalStructuredProductTypes').UniversalStructuredProductInput {
    return {
      type: 'universal_structured_product',
      name: config.name,
      symbol: config.symbol,
      uri: config.metadataUri || `https://arweave.net/placeholder-${Date.now()}`,
      decimals: config.decimals,
      
      // Universal fields - using defaults if not in metadata
      issuer: config.metadata.assetClass, // Will be overridden if metadata has better value
      jurisdiction: 'US',
      issueDate: new Date().toISOString(),
      maturityDate: undefined,
      currency: 'USD',
      
      // Product classification
      productCategory: config.metadata.productCategory,
      productSubtype: config.metadata.productSubtype,
      
      // Components from metadata
      underlyings: config.metadata.underlyings,
      underlyingBasket: config.metadata.underlyingBasket,
      payoffStructure: config.metadata.payoffStructure,
      barriers: config.metadata.barriers,
      coupons: config.metadata.coupons,
      callableFeature: config.metadata.callableFeature,
      putableFeature: config.metadata.putableFeature,
      participation: config.metadata.participation,
      capitalProtection: config.metadata.capitalProtection,
      observation: config.metadata.observation,
      settlement: config.metadata.settlement,
      riskMetrics: config.metadata.riskMetrics,
      oracles: config.metadata.oracles,
      
      // Optional URIs
      prospectusUri: undefined,
      termSheetUri: undefined
    };
  }

  /**
   * Validate product configuration before deployment
   */
  validateProductConfiguration(
    name: string,
    symbol: string,
    metadata: UniversalStructuredProductMetadata
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!name || name.length === 0) {
      errors.push('Product name is required');
    }
    if (!symbol || symbol.length === 0) {
      errors.push('Product symbol is required');
    }
    if (!metadata.underlyings || metadata.underlyings.length === 0) {
      errors.push('At least one underlying asset is required');
    }
    if (!metadata.settlement || !metadata.settlement.redemptionVault) {
      errors.push('Redemption vault address is required');
    }

    // Validate underlyings
    metadata.underlyings.forEach((underlying, index) => {
      if (!underlying.identifier) {
        errors.push(`Underlying #${index + 1}: Identifier is required`);
      }
      if (!underlying.oracleAddress) {
        errors.push(`Underlying #${index + 1}: Oracle address is required`);
      }
    });

    // Validate barriers (if present)
    if (metadata.barriers && metadata.barriers.barriers) {
      metadata.barriers.barriers.forEach((barrier, index) => {
        if (!barrier.level) {
          errors.push(`Barrier #${index + 1}: Level is required`);
        }
      });
    }

    // Validate coupons (if present)
    if (metadata.coupons && metadata.coupons.coupons) {
      metadata.coupons.coupons.forEach((coupon, index) => {
        if (!coupon.rate) {
          errors.push(`Coupon #${index + 1}: Rate is required`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get on-chain metadata size estimate
   */
  getMetadataSizeEstimate(
    name: string,
    symbol: string,
    metadata: UniversalStructuredProductMetadata
  ): number {
    // Convert to builder input format
    const builderInput = this.convertToBuilderInput({
      name,
      symbol,
      metadata,
      decimals: 9, // Default, doesn't affect size calculation
      initialSupply: 0,
      keeperAuthority: 'placeholder',
      network: 'devnet',
      projectId: 'placeholder',
      userId: 'placeholder',
      walletKeypair: {} as any // Not used for size calculation
    });
    
    // Build metadata
    const result = this.metadataBuilder.buildStructuredProduct(builderInput);
    
    // Calculate size from additionalMetadata
    let totalSize = 0;
    result.additionalMetadata.forEach((value, key) => {
      totalSize += key.length + value.length;
    });
    
    return totalSize;
  }
}

export const universalFrameworkIntegrationService = new UniversalFrameworkIntegrationService();
