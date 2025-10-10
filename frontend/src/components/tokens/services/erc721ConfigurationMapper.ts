/**
 * ERC721 Configuration Mapper
 * 
 * Maps UI configuration data to enhanced ERC721 contract parameters
 */

export interface ERC721ConfigurationResult {
  coreConfig: {
    name: string;
    symbol: string;
    baseURI: string;
    contractURI: string;
    maxSupply: number;
    transfersPaused: boolean;
    mintingEnabled: boolean;
    burningEnabled: boolean;
    publicMinting: boolean;
    initialOwner: string;
  };
  metadataConfig: {
    metadataStorage: string;
    uriStorage: string;
    updatableURIs: boolean;
    dynamicMetadata: boolean;
    metadataFrozen: boolean;
    provenanceHash: string;
  };
  supplyConfig: {
    reservedTokens: number;
    mintingMethod: string;
    autoIncrementIds: boolean;
    supplyValidation: boolean;
    adminMintEnabled: boolean;
    maxMintsPerTx: number;
    maxMintsPerWallet: number;
    mintPhasesEnabled: boolean;
    totalSupplyCap: number;
  };
  royaltyConfig: {
    hasRoyalty: boolean;
    royaltyPercentage: number;
    royaltyReceiver: string;
    creatorEarningsEnabled: boolean;
    creatorEarningsPercentage: number;
    creatorEarningsAddress: string;
    operatorFilterEnabled: boolean;
    customOperatorFilterAddress: string;
  };
  salesConfig: {
    publicSaleEnabled: boolean;
    publicSalePrice: string;
    publicSaleStartTime: number;
    publicSaleEndTime: number;
    whitelistSaleEnabled: boolean;
    whitelistSalePrice: string;
    whitelistSaleStartTime: number;
    whitelistSaleEndTime: number;
    dutchAuctionEnabled: boolean;
    dutchAuctionStartPrice: string;
    dutchAuctionEndPrice: string;
    dutchAuctionDuration: number;
    whitelistMerkleRoot: string;
  };
  revealConfig: {
    revealable: boolean;
    preRevealURI: string;
    placeholderImageURI: string;
    revealBatchSize: number;
    autoReveal: boolean;
    revealDelay: number;
    revealStartTime: number;
    isRevealed: boolean;
  };
  advancedConfig: {
    utilityEnabled: boolean;
    utilityType: string;
    stakingEnabled: boolean;
    stakingRewardsTokenAddress: string;
    stakingRewardsRate: number;
    breedingEnabled: boolean;
    evolutionEnabled: boolean;
    fractionalOwnership: boolean;
    soulbound: boolean;
    transferLocked: boolean;
  };
  geographicConfig: {
    useGeographicRestrictions: boolean;
    restrictedCountries: string[];
    whitelistAddresses: string[];
  };
  complexity: {
    level: 'low' | 'medium' | 'high' | 'extreme';
    score: number;
    featureCount: number;
    requiresChunking: boolean;
    estimatedGas: number;
    chunks: Array<{
      category: string;
      items: string[];
      estimatedGas: number;
    }>;
  };
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface ERC721DeploymentRecommendations {
  strategy: 'basic' | 'enhanced' | 'chunked';
  reasoning: string;
  estimatedGasSavings: number;
  warnings: string[];
}

export class ERC721ConfigurationMapper {
  
  /**
   * Map token form data to enhanced ERC721 configuration
   */
  mapTokenFormToEnhancedConfig(
    tokenData: any,
    deployerAddress?: string
  ): ERC721ConfigurationResult {
    
    const blocks = tokenData.blocks || {};
    const props = tokenData.erc721Properties || {};
    
    // Core configuration
    const coreConfig = {
      name: tokenData.name || 'Unnamed Token',
      symbol: tokenData.symbol || 'UNK',
      baseURI: props.base_uri || blocks.baseURI || '',
      contractURI: props.contract_uri || blocks.contractURI || '',
      maxSupply: props.max_supply || blocks.maxSupply || 0,
      transfersPaused: props.transfers_paused || blocks.transfersPaused || false,
      mintingEnabled: props.minting_enabled || blocks.mintingEnabled || true,
      burningEnabled: props.burning_enabled || blocks.burningEnabled || false,
      publicMinting: props.public_minting || blocks.publicMinting || false,
      initialOwner: deployerAddress || tokenData.deployed_by || ''
    };

    // Metadata configuration
    const metadataConfig = {
      metadataStorage: props.metadata_storage || 'ipfs',
      uriStorage: props.uri_storage || 'tokenId',
      updatableURIs: props.updatable_uris || false,
      dynamicMetadata: props.enable_dynamic_metadata || false,
      metadataFrozen: props.metadata_frozen || false,
      provenanceHash: props.provenance_hash || ''
    };

    // Supply configuration
    const supplyConfig = {
      reservedTokens: props.reserved_tokens || 0,
      mintingMethod: props.minting_method || 'open',
      autoIncrementIds: props.auto_increment_ids !== false,
      supplyValidation: props.supply_validation !== false,
      adminMintEnabled: props.admin_mint_enabled !== false,
      maxMintsPerTx: props.max_mints_per_tx || 0,
      maxMintsPerWallet: props.max_mints_per_wallet || 0,
      mintPhasesEnabled: props.mint_phases_enabled || false,
      totalSupplyCap: props.total_supply_cap || 0
    };

    // Royalty configuration
    // ✅ FIX #4: Removed 'default_address' fallback - use deployerAddress or empty string
    const royaltyConfig = {
      hasRoyalty: props.has_royalty || false,
      royaltyPercentage: props.royalty_percentage || 0,
      royaltyReceiver: props.royalty_receiver || deployerAddress || '',
      creatorEarningsEnabled: props.creator_earnings_enabled || false,
      creatorEarningsPercentage: props.creator_earnings_percentage || 0,
      creatorEarningsAddress: props.creator_earnings_address || deployerAddress || '',
      operatorFilterEnabled: props.operator_filter_enabled || false,
      customOperatorFilterAddress: props.custom_operator_filter_address || ''
    };

    // Sales configuration
    const salesConfig = {
      publicSaleEnabled: props.public_sale_enabled || false,
      publicSalePrice: props.public_sale_price || '0',
      publicSaleStartTime: this.parseTimestamp(props.public_sale_start_time),
      publicSaleEndTime: this.parseTimestamp(props.public_sale_end_time),
      whitelistSaleEnabled: props.whitelist_sale_enabled || false,
      whitelistSalePrice: props.whitelist_sale_price || '0',
      whitelistSaleStartTime: this.parseTimestamp(props.whitelist_sale_start_time),
      whitelistSaleEndTime: this.parseTimestamp(props.whitelist_sale_end_time),
      dutchAuctionEnabled: props.dutch_auction_enabled || false,
      dutchAuctionStartPrice: props.dutch_auction_start_price || '0',
      dutchAuctionEndPrice: props.dutch_auction_end_price || '0',
      dutchAuctionDuration: (props.dutch_auction_duration || 0) * 3600, // Convert hours to seconds
      whitelistMerkleRoot: props.whitelist_merkle_root || '0x0000000000000000000000000000000000000000000000000000000000000000'
    };

    // Reveal configuration
    const revealConfig = {
      revealable: props.revealable || false,
      preRevealURI: props.pre_reveal_uri || '',
      placeholderImageURI: props.placeholder_image_uri || '',
      revealBatchSize: props.reveal_batch_size || 0,
      autoReveal: props.auto_reveal || false,
      revealDelay: (props.reveal_delay || 0) * 3600, // Convert hours to seconds
      revealStartTime: 0, // Will be set during deployment
      isRevealed: false
    };

    // Advanced configuration
    const advancedConfig = {
      utilityEnabled: props.utility_enabled || false,
      utilityType: props.utility_type || '',
      stakingEnabled: props.staking_enabled || false,
      stakingRewardsTokenAddress: props.staking_rewards_token_address || '',
      stakingRewardsRate: props.staking_rewards_rate || 0,
      breedingEnabled: props.breeding_enabled || false,
      evolutionEnabled: props.evolution_enabled || false,
      fractionalOwnership: props.fractional_ownership || false,
      soulbound: props.soulbound || false,
      transferLocked: props.transfer_locked || false
    };

    // Geographic configuration
    const geographicConfig = {
      useGeographicRestrictions: props.use_geographic_restrictions || false,
      restrictedCountries: props.restricted_countries || [],
      whitelistAddresses: props.whitelist_addresses || []
    };

    // Analyze complexity
    const complexity = this.analyzeComplexity({
      coreConfig,
      metadataConfig,
      supplyConfig,
      royaltyConfig,
      salesConfig,
      revealConfig,
      advancedConfig,
      geographicConfig
    });

    // Validate configuration
    const validation = this.validateConfiguration({
      coreConfig,
      metadataConfig,
      supplyConfig,
      royaltyConfig,
      salesConfig,
      revealConfig,
      advancedConfig,
      geographicConfig
    });

    return {
      coreConfig,
      metadataConfig,
      supplyConfig,
      royaltyConfig,
      salesConfig,
      revealConfig,
      advancedConfig,
      geographicConfig,
      complexity,
      validation
    };
  }

  /**
   * Analyze configuration complexity
   */
  private analyzeComplexity(config: any): ERC721ConfigurationResult['complexity'] {
    let score = 0;
    let featureCount = 0;
    const chunks: Array<{ category: string; items: string[]; estimatedGas: number }> = [];

    // Core features (always present)
    score += 10;

    // Royalty features
    if (config.royaltyConfig.hasRoyalty) {
      score += 5;
      featureCount++;
      chunks.push({
        category: 'royalties',
        items: ['royalty_percentage', 'royalty_receiver'],
        estimatedGas: 100000
      });
    }

    // Sales features
    if (config.salesConfig.publicSaleEnabled || config.salesConfig.whitelistSaleEnabled || config.salesConfig.dutchAuctionEnabled) {
      score += 8;
      featureCount++;
      chunks.push({
        category: 'sales',
        items: ['sales_configuration'],
        estimatedGas: 150000
      });
    }

    // Reveal mechanism
    if (config.revealConfig.revealable) {
      score += 6;
      featureCount++;
      chunks.push({
        category: 'reveal',
        items: ['reveal_mechanism'],
        estimatedGas: 80000
      });
    }

    // Advanced features
    if (config.advancedConfig.stakingEnabled || config.advancedConfig.breedingEnabled || config.advancedConfig.utilityEnabled) {
      score += 10;
      featureCount++;
      if (config.advancedConfig.stakingEnabled) {
        chunks.push({
          category: 'staking',
          items: ['staking_system'],
          estimatedGas: 200000
        });
      }
      if (config.advancedConfig.breedingEnabled) {
        chunks.push({
          category: 'breeding',
          items: ['breeding_system'],
          estimatedGas: 180000
        });
      }
    }

    // Geographic restrictions
    if (config.geographicConfig.useGeographicRestrictions) {
      score += 7;
      featureCount++;
      chunks.push({
        category: 'geographic',
        items: ['geographic_restrictions'],
        estimatedGas: 120000
      });
    }

    // Transfer restrictions
    if (config.advancedConfig.soulbound || config.advancedConfig.transferLocked) {
      score += 4;
      featureCount++;
    }

    // Metadata complexity
    if (config.metadataConfig.updatableURIs || config.metadataConfig.dynamicMetadata) {
      score += 3;
      featureCount++;
    }

    // Supply complexity
    if (config.supplyConfig.mintPhasesEnabled || config.supplyConfig.maxMintsPerWallet > 0) {
      score += 5;
      featureCount++;
    }

    // Determine complexity level
    let level: 'low' | 'medium' | 'high' | 'extreme';
    if (score < 20) level = 'low';
    else if (score < 40) level = 'medium';
    else if (score < 70) level = 'high';
    else level = 'extreme';

    // Determine if chunking is required
    const requiresChunking = level === 'high' || level === 'extreme' || chunks.length > 3;

    // Estimate total gas usage
    const baseGas = 3000000; // Base deployment gas
    const configGas = chunks.reduce((sum, chunk) => sum + chunk.estimatedGas, 0);
    const estimatedGas = baseGas + configGas;

    return {
      level,
      score,
      featureCount,
      requiresChunking,
      estimatedGas,
      chunks
    };
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(config: any): ERC721ConfigurationResult['validation'] {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Core validation
    if (!config.coreConfig.name) {
      errors.push('Token name is required');
    }
    if (!config.coreConfig.symbol) {
      errors.push('Token symbol is required');
    }

    // Royalty validation
    // ✅ FIX #4: Updated validation - check for empty string instead of 'default_address'
    if (config.royaltyConfig.hasRoyalty) {
      if (config.royaltyConfig.royaltyPercentage < 0 || config.royaltyConfig.royaltyPercentage > 10000) {
        errors.push('Royalty percentage must be between 0 and 10000 basis points (0-100%)');
      }
      if (!config.royaltyConfig.royaltyReceiver) {
        warnings.push('Royalty receiver address should be specified');
      }
    }

    // Sales validation
    if (config.salesConfig.publicSaleEnabled) {
      if (!config.salesConfig.publicSalePrice || config.salesConfig.publicSalePrice === '0') {
        warnings.push('Public sale price is set to 0 (free minting)');
      }
    }

    // Supply validation
    if (config.coreConfig.maxSupply > 0 && config.supplyConfig.reservedTokens > config.coreConfig.maxSupply) {
      errors.push('Reserved tokens cannot exceed max supply');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get deployment recommendations
   */
  getDeploymentRecommendations(config: ERC721ConfigurationResult): ERC721DeploymentRecommendations {
    const { complexity } = config;
    
    let strategy: 'basic' | 'enhanced' | 'chunked';
    let reasoning: string;
    let estimatedGasSavings: number;
    const warnings: string[] = [];

    if (complexity.level === 'low' && complexity.featureCount <= 2) {
      strategy = 'basic';
      reasoning = 'Simple NFT collection with minimal features can use basic deployment';
      estimatedGasSavings = 0;
    } else if (complexity.level === 'medium' || complexity.featureCount <= 5) {
      strategy = 'enhanced';
      reasoning = 'Moderate complexity benefits from enhanced deployment with optimized gas usage';
      estimatedGasSavings = Math.floor(complexity.estimatedGas * 0.15); // 15% savings
    } else {
      strategy = 'chunked';
      reasoning = 'Complex configuration requires chunked deployment for reliability and gas optimization';
      estimatedGasSavings = Math.floor(complexity.estimatedGas * 0.35); // 35% savings
      
      if (complexity.level === 'extreme') {
        warnings.push('Extremely complex configuration may require multiple transactions');
      }
    }

    if (complexity.requiresChunking && strategy !== 'chunked') {
      strategy = 'chunked';
      reasoning = 'Configuration complexity requires chunked deployment';
    }

    return {
      strategy,
      reasoning,
      estimatedGasSavings,
      warnings
    };
  }

  /**
   * Parse timestamp string to Unix timestamp
   */
  private parseTimestamp(dateTimeString?: string): number {
    if (!dateTimeString) return 0;
    try {
      return Math.floor(new Date(dateTimeString).getTime() / 1000);
    } catch {
      return 0;
    }
  }
}

// Export singleton instance
export const erc721ConfigurationMapper = new ERC721ConfigurationMapper();
