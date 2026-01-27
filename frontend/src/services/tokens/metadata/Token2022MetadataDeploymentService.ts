/**
 * Token-2022 Metadata Deployment Service
 * 
 * Complete integration service that:
 * 1. Builds on-chain metadata using OnChainMetadataBuilder
 * 2. Converts metadata to Token2022DeploymentService format
 * 3. Deploys tokens with full metadata support
 * 4. Handles all asset classes per Chain Capital specification
 * 
 * This is the PRIMARY service for deploying tokens with metadata.
 * Do not use Token2022DeploymentService directly - use this instead.
 */

import { onChainMetadataBuilder } from './OnChainMetadataBuilder';
import { token2022DeploymentService, type Token2022Config, type Token2022DeploymentOptions } from '@/services/wallet/solana/Token2022DeploymentService';
import type {
  MetadataInput,
  OnChainMetadataResult,
  AutocallableInput,
  PrincipalProtectedNoteInput,
  ReverseConvertibleInput,
  CommonStockInput,
  PrivateEquityInput,
  CorporateBondInput,
  GovernmentBondInput,
  CommercialPaperInput,
  CreditLinkedNoteInput,
  MutualFundInput,
  ETFInput,
  ActivelyManagedCertificateInput,
  CommoditySpotInput,
  CommodityFuturesInput,
  TrackerCertificateInput,
  VentureCapitalFundInput,
  DirectLendingInput,
  CommercialRealEstateInput,
  REITInput,
  InfrastructureAssetInput,
  RenewableEnergyProjectInput,
  OilGasAssetInput,
  CollectibleInput,
  FiatBackedStablecoinInput,
  CryptoBackedStablecoinInput,
  AlgorithmicStablecoinInput,
  RebasingStablecoinInput,
  CommodityBackedStablecoinInput,
  CarbonCreditInput,
  RenewableEnergyCertificateInput,
  InvoiceReceivableInput,
  GenericInput
} from './OnChainMetadataTypes';
import { logActivity } from '@/infrastructure/activityLogger';

// ============================================================================
// DEPLOYMENT CONFIGURATION TYPES
// ============================================================================

/**
 * Complete deployment configuration for tokens with metadata
 * Extends base metadata input with deployment-specific settings
 */
export interface MetadataDeploymentConfig<T extends MetadataInput = MetadataInput> {
  // Asset-specific metadata
  metadata: T;
  
  // Token-2022 specific settings
  initialSupply: number;
  
  // Authorities (optional - defaults to deployer)
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  updateAuthority?: string | null;
  permanentDelegate?: string | null;
  
  // Extension toggles
  enableTransferFee?: boolean;
  enableMintCloseAuthority?: boolean;
  enableDefaultAccountState?: 'initialized' | 'frozen';
  enableNonTransferable?: boolean;
  enableInterestBearing?: boolean;
  enablePermanentDelegate?: boolean;
  enableCpiGuard?: boolean;
  
  // Extension configs (if enabled)
  transferFee?: {
    feeBasisPoints: number;
    maxFee: bigint;
    transferFeeAuthority?: string;
    withdrawWithheldAuthority?: string;
  };
  
  interestBearing?: {
    rate: number;
    rateAuthority?: string;
  };
  
  // Deployment options
  deploymentOptions: Token2022DeploymentOptions;
  
  // Optional: Existing database token ID to update (instead of creating new)
  existingDatabaseTokenId?: string;
}

/**
 * Comprehensive deployment result
 */
export interface MetadataDeploymentResult {
  success: boolean;
  
  // Token details
  tokenAddress?: string;
  mint?: string;
  transactionHash?: string;
  tokenId?: string; // Database token UUID
  
  // Metadata details
  metadataResult?: OnChainMetadataResult;
  metadataUri?: string;
  metadataSize?: number;
  
  // Deployment details
  deploymentStrategy: 'Token2022';
  networkUsed: string;
  extensions?: string[];
  
  // Validation
  errors?: string[];
  warnings?: string[];
  
  // Performance
  deploymentTimeMs?: number;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class Token2022MetadataDeploymentService {
  
  // ==========================================================================
  // PUBLIC API - GENERIC METADATA DEPLOYMENT
  // ==========================================================================
  
  /**
   * Deploy Token-2022 with on-chain metadata from any asset class
   * 
   * This is the RECOMMENDED way to deploy tokens with metadata.
   * Automatically handles metadata building and deployment.
   * 
   * @example
   * ```typescript
   * const result = await token2022MetadataDeploymentService.deployWithMetadata({
   *   metadata: {
   *     type: 'autocallable',
   *     name: 'Autocallable S&P 500 Note 2026',
   *     symbol: 'ACSPX26',
   *     // ... autocallable-specific fields
   *   },
   *   initialSupply: 1000000,
   *   enablePermanentDelegate: true,
   *   deploymentOptions: {
   *     network: 'devnet',
   *     projectId: '...',
   *     userId: '...',
   *     walletPrivateKey: '...'
   *   }
   * });
   * ```
   */
  async deployWithMetadata<T extends MetadataInput>(
    config: MetadataDeploymentConfig<T>
  ): Promise<MetadataDeploymentResult> {
    const startTime = Date.now();
    
    try {
      await logActivity({
        action: 'token2022_metadata_deployment_started',
        entity_type: 'token',
        entity_id: config.existingDatabaseTokenId || null,
        details: {
          assetClass: (config.metadata as any).assetClass || config.metadata.type,
          instrumentType: config.metadata.type,
          network: config.deploymentOptions.network,
          tokenName: config.metadata.name,
          symbol: config.metadata.symbol
        }
      });

      // Step 1: Build on-chain metadata
      const metadataResult = onChainMetadataBuilder.build(config.metadata);
      
      // Step 2: Validate metadata
      if (!metadataResult.validation.valid) {
        throw new Error(
          `Metadata validation failed: ${metadataResult.validation.errors.join(', ')}`
        );
      }
      
      // Step 3: Convert to Token2022Config
      const token2022Config = this.convertToToken2022Config(config, metadataResult);
      
      // Step 4: Deploy token
      const deploymentResult = await token2022DeploymentService.deployToken2022(
        token2022Config,
        config.deploymentOptions,
        config.existingDatabaseTokenId
      );
      
      if (!deploymentResult.success) {
        throw new Error(
          `Token deployment failed: ${deploymentResult.errors?.join(', ') || 'Unknown error'}`
        );
      }
      
      const deploymentTimeMs = Date.now() - startTime;
      
      await logActivity({
        action: 'token2022_metadata_deployment_completed',
        entity_type: 'token',
        entity_id: deploymentResult.tokenId || null,
        details: {
          tokenAddress: deploymentResult.tokenAddress,
          transactionHash: deploymentResult.transactionHash,
          metadataSize: metadataResult.validation.estimatedSize,
          extensions: deploymentResult.extensions,
          deploymentTimeMs
        }
      });
      
      return {
        success: true,
        tokenAddress: deploymentResult.tokenAddress,
        mint: deploymentResult.mint,
        transactionHash: deploymentResult.transactionHash,
        tokenId: deploymentResult.tokenId,
        metadataResult,
        metadataUri: metadataResult.uri,
        metadataSize: metadataResult.validation.estimatedSize,
        deploymentStrategy: 'Token2022',
        networkUsed: deploymentResult.networkUsed,
        extensions: deploymentResult.extensions,
        warnings: [
          ...(metadataResult.validation.warnings || []),
          ...(deploymentResult.warnings || [])
        ],
        deploymentTimeMs
      };
      
    } catch (error) {
      const deploymentTimeMs = Date.now() - startTime;
      
      await logActivity({
        action: 'token2022_metadata_deployment_failed',
        entity_type: 'token',
        entity_id: config.existingDatabaseTokenId || null,
        details: {
          error: error instanceof Error ? error.message : String(error),
          deploymentTimeMs
        }
      });
      
      return {
        success: false,
        deploymentStrategy: 'Token2022',
        networkUsed: `solana-${config.deploymentOptions.network}`,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        deploymentTimeMs
      };
    }
  }
  
  // ==========================================================================
  // ASSET-SPECIFIC DEPLOYMENT HELPERS
  // ==========================================================================
  
  /**
   * Deploy Autocallable structured product
   * 
   * @example
   * ```typescript
   * const result = await token2022MetadataDeploymentService.deployAutocallable({
   *   metadata: {
   *     type: 'autocallable',
   *     name: 'Autocallable S&P 500 Note 2026',
   *     symbol: 'ACSPX26',
   *     productSubtype: 'barrier',
   *     underlying: 'SPX',
   *     barrierLevel: 100,
   *     couponRate: 8.5,
   *     // ... other autocallable fields
   *   },
   *   initialSupply: 1000000,
   *   enablePermanentDelegate: true,
   *   permanentDelegate: keeperAuthority,
   *   deploymentOptions: { ... }
   * });
   * ```
   */
  async deployAutocallable(
    config: MetadataDeploymentConfig<AutocallableInput>
  ): Promise<MetadataDeploymentResult> {
    return this.deployWithMetadata(config);
  }
  
  /**
   * Deploy Principal Protected Note
   */
  async deployPrincipalProtectedNote(
    config: MetadataDeploymentConfig<PrincipalProtectedNoteInput>
  ): Promise<MetadataDeploymentResult> {
    return this.deployWithMetadata(config);
  }
  
  /**
   * Deploy Reverse Convertible
   */
  async deployReverseConvertible(
    config: MetadataDeploymentConfig<ReverseConvertibleInput>
  ): Promise<MetadataDeploymentResult> {
    return this.deployWithMetadata(config);
  }
  
  /**
   * Deploy Common Stock
   */
  async deployCommonStock(
    config: MetadataDeploymentConfig<CommonStockInput>
  ): Promise<MetadataDeploymentResult> {
    return this.deployWithMetadata(config);
  }
  
  /**
   * Deploy Private Equity
   */
  async deployPrivateEquity(
    config: MetadataDeploymentConfig<PrivateEquityInput>
  ): Promise<MetadataDeploymentResult> {
    return this.deployWithMetadata(config);
  }
  
  /**
   * Deploy Corporate Bond
   */
  async deployCorporateBond(
    config: MetadataDeploymentConfig<CorporateBondInput>
  ): Promise<MetadataDeploymentResult> {
    return this.deployWithMetadata(config);
  }
  
  /**
   * Deploy Government Bond
   */
  async deployGovernmentBond(
    config: MetadataDeploymentConfig<GovernmentBondInput>
  ): Promise<MetadataDeploymentResult> {
    return this.deployWithMetadata(config);
  }
  
  /**
   * Deploy Mutual Fund
   */
  async deployMutualFund(
    config: MetadataDeploymentConfig<MutualFundInput>
  ): Promise<MetadataDeploymentResult> {
    return this.deployWithMetadata(config);
  }
  
  /**
   * Deploy ETF
   */
  async deployETF(
    config: MetadataDeploymentConfig<ETFInput>
  ): Promise<MetadataDeploymentResult> {
    return this.deployWithMetadata(config);
  }
  
  /**
   * Deploy Stablecoin (any type)
   */
  async deployStablecoin(
    config: MetadataDeploymentConfig<
      | FiatBackedStablecoinInput
      | CryptoBackedStablecoinInput
      | AlgorithmicStablecoinInput
      | RebasingStablecoinInput
      | CommodityBackedStablecoinInput
    >
  ): Promise<MetadataDeploymentResult> {
    return this.deployWithMetadata(config);
  }
  
  /**
   * Deploy Carbon Credit
   */
  async deployCarbonCredit(
    config: MetadataDeploymentConfig<CarbonCreditInput>
  ): Promise<MetadataDeploymentResult> {
    return this.deployWithMetadata(config);
  }
  
  /**
   * Deploy Invoice Receivable
   */
  async deployInvoiceReceivable(
    config: MetadataDeploymentConfig<InvoiceReceivableInput>
  ): Promise<MetadataDeploymentResult> {
    return this.deployWithMetadata(config);
  }
  
  // ==========================================================================
  // METADATA CONVERSION
  // ==========================================================================
  
  /**
   * Convert MetadataDeploymentConfig + OnChainMetadataResult to Token2022Config
   */
  private convertToToken2022Config(
    config: MetadataDeploymentConfig,
    metadataResult: OnChainMetadataResult
  ): Token2022Config {
    return {
      name: metadataResult.name,
      symbol: metadataResult.symbol,
      uri: metadataResult.uri,
      decimals: config.metadata.decimals,
      initialSupply: config.initialSupply,
      
      // Authorities
      mintAuthority: config.mintAuthority,
      freezeAuthority: config.freezeAuthority,
      updateAuthority: config.updateAuthority,
      permanentDelegate: config.permanentDelegate,
      
      // Metadata extension (always enabled for this service)
      enableMetadata: true,
      metadata: {
        name: metadataResult.name,
        symbol: metadataResult.symbol,
        uri: metadataResult.uri,
        additionalMetadata: metadataResult.additionalMetadata
      },
      
      // Optional extensions
      enableTransferFee: config.enableTransferFee,
      enableMintCloseAuthority: config.enableMintCloseAuthority,
      enableDefaultAccountState: config.enableDefaultAccountState,
      enableNonTransferable: config.enableNonTransferable,
      enableInterestBearing: config.enableInterestBearing,
      enablePermanentDelegate: config.enablePermanentDelegate,
      enableCpiGuard: config.enableCpiGuard,
      
      // Extension configs
      transferFee: config.transferFee,
      interestBearing: config.interestBearing
    };
  }
  
  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================
  
  /**
   * Validate deployment config before attempting deployment
   */
  validateDeploymentConfig<T extends MetadataInput>(
    config: MetadataDeploymentConfig<T>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate metadata
    try {
      const metadataResult = onChainMetadataBuilder.build(config.metadata);
      if (!metadataResult.validation.valid) {
        errors.push(...metadataResult.validation.errors);
      }
    } catch (error) {
      errors.push(`Metadata build error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Validate initial supply
    if (config.initialSupply < 0) {
      errors.push('Initial supply cannot be negative');
    }
    
    // Validate extension compatibility
    if (config.enableNonTransferable && config.enableTransferFee) {
      errors.push('NonTransferable and TransferFee extensions are incompatible');
    }
    
    // Validate authorities format (if provided)
    if (config.mintAuthority && config.mintAuthority !== null) {
      if (!this.isValidSolanaAddress(config.mintAuthority)) {
        errors.push('Invalid mint authority address');
      }
    }
    
    if (config.freezeAuthority && config.freezeAuthority !== null) {
      if (!this.isValidSolanaAddress(config.freezeAuthority)) {
        errors.push('Invalid freeze authority address');
      }
    }
    
    if (config.updateAuthority && config.updateAuthority !== null) {
      if (!this.isValidSolanaAddress(config.updateAuthority)) {
        errors.push('Invalid update authority address');
      }
    }
    
    if (config.permanentDelegate && config.permanentDelegate !== null) {
      if (!this.isValidSolanaAddress(config.permanentDelegate)) {
        errors.push('Invalid permanent delegate address');
      }
    }
    
    // Validate deployment options
    if (!config.deploymentOptions.projectId) {
      errors.push('Project ID is required');
    }
    
    if (!config.deploymentOptions.userId) {
      errors.push('User ID is required');
    }
    
    if (!config.deploymentOptions.walletPrivateKey) {
      errors.push('Wallet private key is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Basic Solana address validation
   */
  private isValidSolanaAddress(address: string): boolean {
    // Basic check: Solana addresses are base58 encoded, 32-44 characters
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }
  
  /**
   * Get metadata size estimate before deployment
   */
  async estimateMetadataSize<T extends MetadataInput>(
    metadata: T
  ): Promise<{ size: number; valid: boolean; errors: string[]; warnings: string[] }> {
    try {
      const result = onChainMetadataBuilder.build(metadata);
      return {
        size: result.validation.estimatedSize,
        valid: result.validation.valid,
        errors: result.validation.errors,
        warnings: result.validation.warnings
      };
    } catch (error) {
      return {
        size: 0,
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: []
      };
    }
  }
  
  /**
   * Preview metadata before deployment (for UI display)
   */
  async previewMetadata<T extends MetadataInput>(
    metadata: T
  ): Promise<OnChainMetadataResult> {
    return onChainMetadataBuilder.build(metadata);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const token2022MetadataDeploymentService = new Token2022MetadataDeploymentService();
