/**
 * ERC1155 Configuration Mapper
 * 
 * Transforms UI form data from max configuration into enhanced contract deployment parameters
 * Handles all 69+ fields from token_erc1155_properties plus related tables
 */

import { ethers } from 'ethers';

export interface ERC1155FormData {
  // Base configuration
  base_uri?: string;
  metadata_storage?: string;
  has_royalty?: boolean;
  royalty_percentage?: string;
  royalty_receiver?: string;
  is_burnable?: boolean;
  is_pausable?: boolean;
  access_control?: string;
  updatable_uris?: boolean;
  supply_tracking?: boolean;
  enable_approval_for_all?: boolean;
  batch_minting_enabled?: boolean;
  container_enabled?: boolean;
  use_geographic_restrictions?: boolean;
  default_restriction_policy?: string;
  dynamic_uris?: boolean;
  updatable_metadata?: boolean;
  supply_tracking_advanced?: boolean;
  max_supply_per_type?: string;
  burning_enabled?: boolean;
  mint_roles?: string[];
  burn_roles?: string[];
  metadata_update_roles?: string[];

  // Pricing configuration
  pricing_model?: string;
  base_price?: string;
  bulk_discount_enabled?: boolean;
  referral_rewards_enabled?: boolean;
  referral_percentage?: string;
  lazy_minting_enabled?: boolean;
  airdrop_enabled?: boolean;
  airdrop_snapshot_block?: number;
  claim_period_enabled?: boolean;
  claim_start_time?: string;
  claim_end_time?: string;
  marketplace_fees_enabled?: boolean;
  marketplace_fee_percentage?: string;
  marketplace_fee_recipient?: string;
  bundle_trading_enabled?: boolean;
  atomic_swaps_enabled?: boolean;
  cross_collection_trading?: boolean;

  // Gaming configuration
  crafting_enabled?: boolean;
  fusion_enabled?: boolean;
  experience_points_enabled?: boolean;
  leveling_enabled?: boolean;
  consumable_tokens?: boolean;
  voting_power_enabled?: boolean;
  voting_weight_per_token?: any;
  community_treasury_enabled?: boolean;
  treasury_percentage?: string;
  proposal_creation_threshold?: string;
  bridge_enabled?: boolean;
  bridgeable_token_types?: string[];
  wrapped_versions?: any;
  layer2_support_enabled?: boolean;
  supported_layer2_networks?: string[];

  // Related table data
  tokenTypes?: any[];
  discountTiers?: any[];
  craftingRecipes?: any[];
  typeConfigs?: any[];
  uriMappings?: any[];
  geographic_restrictions?: string[];
}

export interface EnhancedERC1155Config {
  // Base contract configuration
  tokenConfig: {
    name: string;
    symbol: string;
    baseURI: string;
    batchMintingEnabled: boolean;
    dynamicUris: boolean;
    updatableMetadata: boolean;
    geographicRestrictionsEnabled: boolean;
    initialOwner: string;
  };

  // Royalty configuration
  royaltyConfig: {
    enabled: boolean;
    percentage: number; // Basis points
    receiver: string;
  };

  // Pricing configuration
  pricingConfig: {
    model: number; // 0=FIXED, 1=DYNAMIC, 2=AUCTION, 3=BONDING_CURVE, 4=FREE
    basePrice: string;
    bulkDiscountEnabled: boolean;
    referralRewardsEnabled: boolean;
    referralPercentage: number;
  };

  // Marketplace configuration
  marketplaceConfig: {
    feesEnabled: boolean;
    feePercentage: number;
    feeRecipient: string;
    bundleTradingEnabled: boolean;
    atomicSwapsEnabled: boolean;
    crossCollectionTradingEnabled: boolean;
  };

  // Governance configuration
  governanceConfig: {
    votingPowerEnabled: boolean;
    communityTreasuryEnabled: boolean;
    treasuryPercentage: number;
    proposalThreshold: string;
  };

  // Post-deployment configuration
  postDeployment: {
    tokenTypes: TokenTypeData[];
    craftingRecipes: CraftingRecipeData[];
    discountTiers: DiscountTierData[];
    stakingConfig?: StakingConfigData;
    crossChainConfig?: CrossChainConfigData;
    roleAssignments?: RoleAssignmentData[];
    geographicRestrictions?: string[];
    claimPeriod?: ClaimPeriodData;
  };
}

export interface TokenTypeData {
  maxSupply: string;
  mintPrice: string;
  uri: string;
  transferrable: boolean;
  burnable: boolean;
  consumable: boolean;
  experiencePoints: string;
  requiredLevel: string;
}

export interface CraftingRecipeData {
  name: string;
  inputTokenTypes: string[];
  inputAmounts: string[];
  outputTokenType: string;
  outputQuantity: string;
  successRate: string; // Basis points
  cooldownPeriod: string;
  requiredLevel: string;
}

export interface DiscountTierData {
  tierId: string;
  minQuantity: string;
  maxQuantity: string;
  discountPercentage: string; // Basis points
}

export interface StakingConfigData {
  enabled: boolean;
  rewardRate: string;
  minimumStakePeriod: string;
  tokenMultipliers: { tokenType: string; multiplier: string }[];
}

export interface CrossChainConfigData {
  bridgeEnabled: boolean;
  layer2SupportEnabled: boolean;
  bridgeableTokenTypes: string[];
  supportedNetworks: string[];
}

export interface RoleAssignmentData {
  role: string; // MINTER_ROLE, BURNER_ROLE, etc.
  addresses: string[];
}

export interface ClaimPeriodData {
  startTime: string;
  endTime: string;
  snapshotBlock: string;
}

export interface ComplexityAnalysis {
  level: 'low' | 'medium' | 'high' | 'extreme';
  score: number;
  featureCount: number;
  requiresChunking: boolean;
  reasoning: string;
  chunks: string[];
}

export interface ConfigurationMappingResult {
  success: boolean;
  config?: EnhancedERC1155Config;
  complexity: ComplexityAnalysis;
  warnings: string[];
  errors: string[];
}

export class ERC1155ConfigurationMapper {
  
  /**
   * Map UI form data to enhanced contract configuration
   */
  mapTokenFormToEnhancedConfig(
    tokenForm: any,
    deployerAddress: string
  ): ConfigurationMappingResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Extract ERC1155 properties from the form
      const erc1155Props = this.extractERC1155Properties(tokenForm);
      
      // Basic validation
      const validation = this.validateConfiguration(erc1155Props);
      warnings.push(...validation.warnings);
      errors.push(...validation.errors);

      if (errors.length > 0) {
        return {
          success: false,
          complexity: this.analyzeComplexity(erc1155Props),
          warnings,
          errors
        };
      }

      // Build enhanced configuration
      const config: EnhancedERC1155Config = {
        tokenConfig: this.buildTokenConfig(tokenForm, erc1155Props, deployerAddress),
        royaltyConfig: this.buildRoyaltyConfig(erc1155Props),
        pricingConfig: this.buildPricingConfig(erc1155Props),
        marketplaceConfig: this.buildMarketplaceConfig(erc1155Props),
        governanceConfig: this.buildGovernanceConfig(erc1155Props),
        postDeployment: this.buildPostDeploymentConfig(erc1155Props)
      };

      const complexity = this.analyzeComplexity(erc1155Props);

      return {
        success: true,
        config,
        complexity,
        warnings,
        errors: []
      };

    } catch (error) {
      console.error('ERC1155 configuration mapping error:', error);
      return {
        success: false,
        complexity: { level: 'low', score: 0, featureCount: 0, requiresChunking: false, reasoning: 'Mapping failed', chunks: [] },
        warnings,
        errors: [`Configuration mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Extract ERC1155 properties from form data
   */
  private extractERC1155Properties(tokenForm: any): ERC1155FormData {
    const props = tokenForm.erc1155Properties || {};
    const blocks = tokenForm.blocks || {};
    
    return {
      // Base properties
      base_uri: props.base_uri || tokenForm.baseURI || '',
      metadata_storage: props.metadata_storage || 'ipfs',
      has_royalty: props.has_royalty || false,
      royalty_percentage: props.royalty_percentage || '0',
      royalty_receiver: props.royalty_receiver || '',
      is_burnable: props.is_burnable || false,
      is_pausable: props.is_pausable || false,
      access_control: props.access_control || 'ownable',
      updatable_uris: props.updatable_uris || false,
      supply_tracking: props.supply_tracking || true,
      enable_approval_for_all: props.enable_approval_for_all ?? true,
      batch_minting_enabled: props.batch_minting_enabled || false,
      container_enabled: props.container_enabled || false,
      use_geographic_restrictions: props.use_geographic_restrictions || false,
      default_restriction_policy: props.default_restriction_policy || 'allowed',
      dynamic_uris: props.dynamic_uris || false,
      updatable_metadata: props.updatable_metadata || false,
      supply_tracking_advanced: props.supply_tracking_advanced || false,
      max_supply_per_type: props.max_supply_per_type || '',
      burning_enabled: props.burning_enabled || false,
      mint_roles: props.mint_roles || [],
      burn_roles: props.burn_roles || [],
      metadata_update_roles: props.metadata_update_roles || [],

      // Pricing properties
      pricing_model: props.pricing_model || 'fixed',
      base_price: props.base_price || '0',
      bulk_discount_enabled: props.bulk_discount_enabled || false,
      referral_rewards_enabled: props.referral_rewards_enabled || false,
      referral_percentage: props.referral_percentage || '0',
      lazy_minting_enabled: props.lazy_minting_enabled || false,
      airdrop_enabled: props.airdrop_enabled || false,
      airdrop_snapshot_block: props.airdrop_snapshot_block || 0,
      claim_period_enabled: props.claim_period_enabled || false,
      claim_start_time: props.claim_start_time || '',
      claim_end_time: props.claim_end_time || '',
      marketplace_fees_enabled: props.marketplace_fees_enabled || false,
      marketplace_fee_percentage: props.marketplace_fee_percentage || '0',
      marketplace_fee_recipient: props.marketplace_fee_recipient || '',
      bundle_trading_enabled: props.bundle_trading_enabled || false,
      atomic_swaps_enabled: props.atomic_swaps_enabled || false,
      cross_collection_trading: props.cross_collection_trading || false,

      // Gaming properties
      crafting_enabled: props.crafting_enabled || false,
      fusion_enabled: props.fusion_enabled || false,
      experience_points_enabled: props.experience_points_enabled || false,
      leveling_enabled: props.leveling_enabled || false,
      consumable_tokens: props.consumable_tokens || false,
      voting_power_enabled: props.voting_power_enabled || false,
      voting_weight_per_token: props.voting_weight_per_token || {},
      community_treasury_enabled: props.community_treasury_enabled || false,
      treasury_percentage: props.treasury_percentage || '0',
      proposal_creation_threshold: props.proposal_creation_threshold || '100',
      bridge_enabled: props.bridge_enabled || false,
      bridgeable_token_types: props.bridgeable_token_types || [],
      wrapped_versions: props.wrapped_versions || {},
      layer2_support_enabled: props.layer2_support_enabled || false,
      supported_layer2_networks: props.supported_layer2_networks || [],

      // Related data
      tokenTypes: blocks.tokenTypes || props.tokenTypes || [],
      discountTiers: blocks.discountTiers || props.discountTiers || [],
      craftingRecipes: blocks.craftingRecipes || props.craftingRecipes || [],
      typeConfigs: blocks.typeConfigs || props.typeConfigs || [],
      uriMappings: blocks.uriMappings || props.uriMappings || [],
      geographic_restrictions: props.geographic_restrictions || []
    };
  }

  /**
   * Build token configuration
   */
  private buildTokenConfig(tokenForm: any, props: ERC1155FormData, deployerAddress: string) {
    return {
      name: tokenForm.name || '',
      symbol: tokenForm.symbol || '',
      baseURI: props.base_uri || '',
      batchMintingEnabled: props.batch_minting_enabled || false,
      dynamicUris: props.dynamic_uris || false,
      updatableMetadata: props.updatable_metadata || false,
      geographicRestrictionsEnabled: props.use_geographic_restrictions || false,
      initialOwner: deployerAddress
    };
  }

  /**
   * Build royalty configuration
   */
  private buildRoyaltyConfig(props: ERC1155FormData) {
    const percentage = props.has_royalty ? 
      Math.min(Math.max(parseInt(props.royalty_percentage || '0') * 100, 0), 10000) : 0;

    return {
      enabled: props.has_royalty || false,
      percentage,
      receiver: props.royalty_receiver || ethers.ZeroAddress
    };
  }

  /**
   * Build pricing configuration
   */
  private buildPricingConfig(props: ERC1155FormData) {
    const pricingModelMap: Record<string, number> = {
      'fixed': 0,
      'dynamic': 1,
      'auction': 2,
      'bonding_curve': 3,
      'free': 4
    };

    const referralPercentage = props.referral_rewards_enabled ? 
      Math.min(Math.max(parseInt(props.referral_percentage || '0') * 100, 0), 10000) : 0;

    return {
      model: pricingModelMap[props.pricing_model || 'fixed'] || 0,
      basePrice: ethers.parseEther(props.base_price || '0').toString(),
      bulkDiscountEnabled: props.bulk_discount_enabled || false,
      referralRewardsEnabled: props.referral_rewards_enabled || false,
      referralPercentage
    };
  }

  /**
   * Build marketplace configuration
   */
  private buildMarketplaceConfig(props: ERC1155FormData) {
    const feePercentage = props.marketplace_fees_enabled ? 
      Math.min(Math.max(parseInt(props.marketplace_fee_percentage || '0') * 100, 0), 10000) : 0;

    return {
      feesEnabled: props.marketplace_fees_enabled || false,
      feePercentage,
      feeRecipient: props.marketplace_fee_recipient || ethers.ZeroAddress,
      bundleTradingEnabled: props.bundle_trading_enabled || false,
      atomicSwapsEnabled: props.atomic_swaps_enabled || false,
      crossCollectionTradingEnabled: props.cross_collection_trading || false
    };
  }

  /**
   * Build governance configuration
   */
  private buildGovernanceConfig(props: ERC1155FormData) {
    const treasuryPercentage = props.community_treasury_enabled ? 
      Math.min(Math.max(parseInt(props.treasury_percentage || '0') * 100, 0), 10000) : 0;

    return {
      votingPowerEnabled: props.voting_power_enabled || false,
      communityTreasuryEnabled: props.community_treasury_enabled || false,
      treasuryPercentage,
      proposalThreshold: props.proposal_creation_threshold || '100'
    };
  }

  /**
   * Build post-deployment configuration
   */
  private buildPostDeploymentConfig(props: ERC1155FormData) {
    return {
      tokenTypes: this.buildTokenTypesData(props.tokenTypes || []),
      craftingRecipes: this.buildCraftingRecipesData(props.craftingRecipes || []),
      discountTiers: this.buildDiscountTiersData(props.discountTiers || []),
      stakingConfig: this.buildStakingConfig(props),
      crossChainConfig: this.buildCrossChainConfig(props),
      roleAssignments: this.buildRoleAssignments(props),
      geographicRestrictions: props.geographic_restrictions || [],
      claimPeriod: this.buildClaimPeriod(props)
    };
  }

  /**
   * Build token types data
   */
  private buildTokenTypesData(tokenTypes: any[]): TokenTypeData[] {
    return tokenTypes.map(type => ({
      maxSupply: type.max_supply || type.maxSupply || '0',
      mintPrice: ethers.parseEther(type.mint_price || type.mintPrice || '0').toString(),
      uri: type.uri || type.metadata_uri || '',
      transferrable: type.transferrable ?? true,
      burnable: type.burnable ?? false,
      consumable: type.consumable ?? false,
      experiencePoints: type.experience_points || type.experiencePoints || '0',
      requiredLevel: type.required_level || type.requiredLevel || '1'
    }));
  }

  /**
   * Build crafting recipes data
   */
  private buildCraftingRecipesData(recipes: any[]): CraftingRecipeData[] {
    return recipes.map(recipe => {
      let inputTokenTypes: string[] = [];
      let inputAmounts: string[] = [];

      // Parse input tokens (could be object or array format)
      if (typeof recipe.input_tokens === 'object' && recipe.input_tokens !== null) {
        if (Array.isArray(recipe.input_tokens)) {
          // Array format
          recipe.input_tokens.forEach((input: any) => {
            inputTokenTypes.push(input.token_type || input.tokenType || '1');
            inputAmounts.push(input.amount || '1');
          });
        } else {
          // Object format: { "tokenType": amount }
          Object.entries(recipe.input_tokens).forEach(([tokenType, amount]) => {
            inputTokenTypes.push(tokenType);
            inputAmounts.push(String(amount));
          });
        }
      }

      return {
        name: recipe.recipe_name || recipe.name || '',
        inputTokenTypes,
        inputAmounts,
        outputTokenType: recipe.output_token_type_id || recipe.outputTokenType || '1',
        outputQuantity: recipe.output_quantity || recipe.outputQuantity || '1',
        successRate: String((recipe.success_rate || 100) * 100), // Convert to basis points
        cooldownPeriod: recipe.cooldown_period || recipe.cooldownPeriod || '0',
        requiredLevel: recipe.required_level || recipe.requiredLevel || '1'
      };
    });
  }

  /**
   * Build discount tiers data
   */
  private buildDiscountTiersData(tiers: any[]): DiscountTierData[] {
    return tiers.map((tier, index) => ({
      tierId: tier.id || String(index + 1),
      minQuantity: tier.min_quantity || tier.minQuantity || '1',
      maxQuantity: tier.max_quantity || tier.maxQuantity || '0',
      discountPercentage: String((parseFloat(tier.discount_percentage || tier.discountPercentage || '0')) * 100) // Convert to basis points
    }));
  }

  /**
   * Build staking configuration
   */
  private buildStakingConfig(props: ERC1155FormData): StakingConfigData | undefined {
    // Check if any staking-related features are enabled
    const hasStakingFeatures = props.voting_power_enabled || 
                              props.experience_points_enabled ||
                              props.leveling_enabled;

    if (!hasStakingFeatures) return undefined;

    return {
      enabled: hasStakingFeatures,
      rewardRate: '100', // Default reward rate
      minimumStakePeriod: '86400', // 1 day default
      tokenMultipliers: Object.entries(props.voting_weight_per_token || {}).map(([tokenType, weight]) => ({
        tokenType,
        multiplier: String(weight)
      }))
    };
  }

  /**
   * Build cross-chain configuration
   */
  private buildCrossChainConfig(props: ERC1155FormData): CrossChainConfigData | undefined {
    if (!props.bridge_enabled && !props.layer2_support_enabled) return undefined;

    return {
      bridgeEnabled: props.bridge_enabled || false,
      layer2SupportEnabled: props.layer2_support_enabled || false,
      bridgeableTokenTypes: props.bridgeable_token_types || [],
      supportedNetworks: props.supported_layer2_networks || []
    };
  }

  /**
   * Build role assignments
   */
  private buildRoleAssignments(props: ERC1155FormData): RoleAssignmentData[] {
    const assignments: RoleAssignmentData[] = [];

    if (props.mint_roles && props.mint_roles.length > 0) {
      assignments.push({
        role: 'MINTER_ROLE',
        addresses: props.mint_roles
      });
    }

    if (props.burn_roles && props.burn_roles.length > 0) {
      assignments.push({
        role: 'BURNER_ROLE',
        addresses: props.burn_roles
      });
    }

    if (props.metadata_update_roles && props.metadata_update_roles.length > 0) {
      assignments.push({
        role: 'METADATA_ROLE',
        addresses: props.metadata_update_roles
      });
    }

    return assignments;
  }

  /**
   * Build claim period configuration
   */
  private buildClaimPeriod(props: ERC1155FormData): ClaimPeriodData | undefined {
    if (!props.claim_period_enabled) return undefined;

    return {
      startTime: props.claim_start_time ? String(Math.floor(new Date(props.claim_start_time).getTime() / 1000)) : '0',
      endTime: props.claim_end_time ? String(Math.floor(new Date(props.claim_end_time).getTime() / 1000)) : '0',
      snapshotBlock: String(props.airdrop_snapshot_block || 0)
    };
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(props: ERC1155FormData): { warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Royalty validation
    if (props.has_royalty) {
      if (!props.royalty_receiver || !ethers.isAddress(props.royalty_receiver)) {
        errors.push('Valid royalty receiver address is required when royalties are enabled');
      }
      
      const royaltyPercentage = parseFloat(props.royalty_percentage || '0');
      if (royaltyPercentage < 0 || royaltyPercentage > 100) {
        errors.push('Royalty percentage must be between 0 and 100');
      }
    }

    // Marketplace validation
    if (props.marketplace_fees_enabled) {
      if (!props.marketplace_fee_recipient || !ethers.isAddress(props.marketplace_fee_recipient)) {
        errors.push('Valid marketplace fee recipient address is required when marketplace fees are enabled');
      }
    }

    // Pricing validation
    if (props.pricing_model !== 'free') {
      const basePrice = parseFloat(props.base_price || '0');
      if (basePrice <= 0) {
        warnings.push('Base price should be greater than 0 for non-free pricing models');
      }
    }

    // Token types validation
    if (!props.tokenTypes || props.tokenTypes.length === 0) {
      warnings.push('At least one token type should be defined for full functionality');
    }

    // Crafting validation
    if (props.crafting_enabled && (!props.craftingRecipes || props.craftingRecipes.length === 0)) {
      warnings.push('Crafting is enabled but no recipes are defined');
    }

    // Geographic restrictions validation
    if (props.use_geographic_restrictions && (!props.geographic_restrictions || props.geographic_restrictions.length === 0)) {
      warnings.push('Geographic restrictions are enabled but no restricted countries are defined');
    }

    // Address validation for roles
    const validateAddresses = (addresses: string[] | undefined, fieldName: string) => {
      if (addresses && addresses.length > 0) {
        for (const address of addresses) {
          if (!ethers.isAddress(address)) {
            errors.push(`Invalid address in ${fieldName}: ${address}`);
          }
        }
      }
    };

    validateAddresses(props.mint_roles, 'mint roles');
    validateAddresses(props.burn_roles, 'burn roles');
    validateAddresses(props.metadata_update_roles, 'metadata update roles');

    return { warnings, errors };
  }

  /**
   * Analyze configuration complexity
   */
  private analyzeComplexity(props: ERC1155FormData): ComplexityAnalysis {
    let score = 0;
    let featureCount = 0;
    const chunks: string[] = [];

    // Base features (5 points each)
    if (props.has_royalty) { score += 5; featureCount++; chunks.push('royalty_config'); }
    if (props.batch_minting_enabled) { score += 5; featureCount++; chunks.push('batch_minting'); }
    if (props.dynamic_uris) { score += 5; featureCount++; chunks.push('dynamic_uris'); }
    if (props.supply_tracking_advanced) { score += 5; featureCount++; chunks.push('supply_tracking'); }

    // Gaming features (8 points each)
    if (props.crafting_enabled) { score += 8; featureCount++; chunks.push('crafting_system'); }
    if (props.experience_points_enabled) { score += 8; featureCount++; chunks.push('experience_system'); }
    if (props.leveling_enabled) { score += 8; featureCount++; chunks.push('leveling_system'); }
    if (props.fusion_enabled) { score += 8; featureCount++; chunks.push('fusion_system'); }

    // Governance features (10 points each)
    if (props.voting_power_enabled) { score += 10; featureCount++; chunks.push('governance_voting'); }
    if (props.community_treasury_enabled) { score += 10; featureCount++; chunks.push('community_treasury'); }

    // Marketplace features (6 points each)
    if (props.marketplace_fees_enabled) { score += 6; featureCount++; chunks.push('marketplace_fees'); }
    if (props.bundle_trading_enabled) { score += 6; featureCount++; chunks.push('bundle_trading'); }
    if (props.atomic_swaps_enabled) { score += 6; featureCount++; chunks.push('atomic_swaps'); }

    // Cross-chain features (12 points each)
    if (props.bridge_enabled) { score += 12; featureCount++; chunks.push('cross_chain_bridge'); }
    if (props.layer2_support_enabled) { score += 12; featureCount++; chunks.push('layer2_support'); }

    // Complex collections (weight by count)
    const tokenTypeCount = props.tokenTypes?.length || 0;
    const recipeCount = props.craftingRecipes?.length || 0;
    const discountTierCount = props.discountTiers?.length || 0;

    score += Math.min(tokenTypeCount * 2, 20); // Max 20 points for token types
    score += Math.min(recipeCount * 3, 30); // Max 30 points for recipes
    score += Math.min(discountTierCount * 1, 10); // Max 10 points for discount tiers

    if (tokenTypeCount > 10) { chunks.push('token_types_batch'); }
    if (recipeCount > 5) { chunks.push('crafting_recipes_batch'); }
    if (discountTierCount > 5) { chunks.push('discount_tiers_batch'); }

    // Geographic restrictions
    if (props.use_geographic_restrictions) {
      score += 4;
      featureCount++;
      chunks.push('geographic_restrictions');
    }

    // Role management
    const totalRoles = (props.mint_roles?.length || 0) + 
                      (props.burn_roles?.length || 0) + 
                      (props.metadata_update_roles?.length || 0);
    if (totalRoles > 0) {
      score += Math.min(totalRoles, 10);
      chunks.push('role_assignments');
    }

    // Determine complexity level
    let level: 'low' | 'medium' | 'high' | 'extreme';
    let reasoning: string;
    let requiresChunking = false;

    if (score < 30) {
      level = 'low';
      reasoning = 'Simple configuration with basic features';
    } else if (score < 70) {
      level = 'medium';
      reasoning = 'Moderate complexity with several advanced features';
      requiresChunking = featureCount > 5;
    } else if (score < 120) {
      level = 'high';
      reasoning = 'High complexity with gaming, governance, or cross-chain features';
      requiresChunking = true;
    } else {
      level = 'extreme';
      reasoning = 'Extremely complex configuration with multiple advanced gaming, DeFi, and cross-chain features';
      requiresChunking = true;
    }

    return {
      level,
      score,
      featureCount,
      requiresChunking,
      reasoning,
      chunks: requiresChunking ? chunks : []
    };
  }
}

// Export singleton instance
export const erc1155ConfigurationMapper = new ERC1155ConfigurationMapper();
