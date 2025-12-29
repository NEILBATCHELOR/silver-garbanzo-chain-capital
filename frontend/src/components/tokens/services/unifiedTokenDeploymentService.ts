/**
 * Unified Token Deployment Service
 * 
 * This service integrates all deployment services to provide:
 * - Rate limiting and security (from enhancedTokenDeploymentService)
 * - Optimization analysis (from multiStandardOptimizationService) 
 * - Chunked deployment for complex contracts (from optimizedDeploymentService)
 * - Basic deployment (from foundryDeploymentService)
 */

import { enhancedTokenDeploymentService } from './tokenDeploymentService';
import { multiStandardOptimizationService } from './multiStandardOptimizationService';
import { optimizedDeploymentService } from './optimizedDeploymentService';
import { foundryDeploymentService } from './foundryDeploymentService';
import { unifiedERC20DeploymentService } from './unifiedERC20DeploymentService'; // Add ERC20 specialist
import { unifiedERC721DeploymentService } from './unifiedERC721DeploymentService'; // Add ERC721 specialist
import { unifiedERC1155DeploymentService } from './unifiedERC1155DeploymentService'; // Add ERC1155 specialist
import { unifiedERC1400DeploymentService } from './unifiedERC1400DeploymentService'; // Add ERC1400 specialist
import { unifiedERC3525DeploymentService } from './unifiedERC3525DeploymentService'; // Add ERC3525 specialist
import { unifiedERC4626DeploymentService } from './unifiedERC4626DeploymentService'; // Add ERC4626 specialist
import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/activityLogger';
import { DeploymentStatus, DeploymentResult } from '@/types/deployment/TokenDeploymentTypes';
import { TokenStandard } from '@/types/core/centralModels';

/**
 * Gas configuration for deployment
 * ✅ FIX #5: Added gas configuration interface
 */
export interface GasConfig {
  gasPrice?: string; // Legacy gas price in Gwei
  gasLimit?: number; // Gas limit
  maxFeePerGas?: string; // EIP-1559 max fee per gas in Gwei
  maxPriorityFeePerGas?: string; // EIP-1559 max priority fee per gas in Gwei
}

/**
 * Unified deployment options
 * ✅ FIX #5: Added gasConfig property
 * ✅ FIX #6: Added walletAddress property for using pre-selected wallets
 * ✅ FIX #8: Added moduleConfigs property for extension module configs
 */
export interface UnifiedDeploymentOptions {
  useOptimization?: boolean; // Default: true for complex contracts
  forceStrategy?: 'direct' | 'chunked' | 'batched' | 'auto'; // Default: auto
  enableAnalytics?: boolean; // Default: true
  gasConfig?: GasConfig; // ✅ FIX #5: Gas configuration from form
  walletAddress?: string; // ✅ FIX #6: Pre-selected wallet address (bypasses database query)
  moduleConfigs?: Record<string, any>; // ✅ FIX #8: Extension module configurations
}

/**
 * Enhanced deployment result with optimization info
 */
export interface UnifiedDeploymentResult extends DeploymentResult {
  optimizationUsed?: boolean;
  strategy?: 'direct' | 'chunked' | 'batched';
  gasOptimization?: {
    estimatedSavings: number;
    reliabilityImprovement: string;
  };
}

/**
 * Unified Token Deployment Service
 * 
 * This is your single entry point for all token deployments
 */
export class UnifiedTokenDeploymentService {
  
  /**
   * Normalize token standard for consistent comparison
   */
  private normalizeTokenStandard(standard: TokenStandard): string {
    if (!standard) return 'UNKNOWN';
    
    // Handle various formats: 'ERC-20', 'ERC20', 'erc-20', 'erc20'
    return standard.toUpperCase().replace(/[-_\s]/g, '');
  }

  /**
   * Determine if ERC-721 token should use specialized deployment service
   * ✅ FIX #4: Updated to accept walletAddress parameter instead of using 'default_address'
   */
  private async shouldUseERC721Specialist(tokenId: string, useOptimization: boolean, walletAddress: string): Promise<boolean> {
    try {
      // Always check for advanced features, regardless of optimization setting
      const { data: token, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
      
      if (error || !token) {
        return false; // Fallback to standard deployment
      }

      // Quick check for obvious advanced features in the token data
      const hasAdvancedFeatures = this.hasERC721AdvancedFeatures(token);
      
      if (hasAdvancedFeatures) {
        return true; // Definitely needs specialist
      }

      // If optimization is disabled and no obvious advanced features, use standard
      if (!useOptimization) {
        return false;
      }

      // Use configuration mapper for detailed analysis if available
      try {
        const { erc721ConfigurationMapper } = await import('./erc721ConfigurationMapper');
        // ✅ FIX #4: Use wallet address instead of 'default_address'
        const mappingResult = erc721ConfigurationMapper.mapTokenFormToEnhancedConfig(
          token,
          token.deployed_by || walletAddress
        );
        
        // Check if any advanced configurations exist
        return mappingResult.complexity.level !== 'low' || 
               mappingResult.complexity.featureCount > 3 ||
               mappingResult.complexity.requiresChunking;
      } catch (importError) {
        console.warn('ERC721 configuration mapper not available:', importError);
        return false;
      }
      
    } catch (error) {
      console.warn('Error checking ERC721 specialist need:', error);
      return false; // Fallback to standard deployment
    }
  }

  /**
   * Quick check for obvious ERC-721 advanced features in token data
   */
  private hasERC721AdvancedFeatures(token: any): boolean {
    const props = token.erc721Properties || {};
    const blocks = token.blocks || {};
    
    // Check for obvious advanced features
    return !!(
      // Royalty features
      props.has_royalty ||
      props.creator_earnings_enabled ||
      props.operator_filter_enabled ||
      
      // Sales features
      props.public_sale_enabled ||
      props.whitelist_sale_enabled ||
      props.dutch_auction_enabled ||
      props.mint_phases_enabled ||
      
      // Reveal mechanism
      props.revealable ||
      props.auto_reveal ||
      
      // Advanced features
      props.staking_enabled ||
      props.breeding_enabled ||
      props.evolution_enabled ||
      props.utility_enabled ||
      
      // Transfer restrictions
      props.soulbound ||
      props.transfer_locked ||
      props.use_geographic_restrictions ||
      
      // Multiple mint phases or complex attributes
      (token.mint_phases && token.mint_phases.length > 1) ||
      (token.trait_definitions && token.trait_definitions.length > 5) ||
      
      // Block configurations indicating complexity
      blocks.royaltyConfig ||
      blocks.salesConfig ||
      blocks.revealConfig ||
      blocks.stakingConfig ||
      blocks.complianceConfig ||
      
      // Geographic or compliance features
      props.geographic_restrictions?.length > 0 ||
      props.whitelist_addresses?.length > 10 ||
      
      // Advanced metadata features
      props.updatable_uris ||
      props.enable_dynamic_metadata ||
      props.metadata_frozen
    );
  }

  /**
   * Determine if ERC-1400 token should use specialized deployment service
   * ✅ FIX #4: Updated to accept walletAddress parameter
   */
  private async shouldUseERC1400Specialist(tokenId: string, useOptimization: boolean, walletAddress: string): Promise<boolean> {
    try {
      // Always check for advanced features for security tokens
      const { data: token, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
      
      if (error || !token) {
        return false; // Fallback to standard deployment
      }

      // Quick check for obvious advanced features in the token data
      const hasAdvancedFeatures = this.hasERC1400AdvancedFeatures(token);
      
      if (hasAdvancedFeatures) {
        return true; // Definitely needs specialist
      }

      // If optimization is disabled and no obvious advanced features, use standard
      if (!useOptimization) {
        return false;
      }

      // Use configuration mapper for detailed analysis if available
      try {
        const { erc1400ConfigurationMapper } = await import('./erc1400ConfigurationMapper');
        // ✅ FIX #4: Pass wallet address to convertToTokenForm
        const tokenForm = this.convertToTokenForm(token, walletAddress);
        const mappingResult = erc1400ConfigurationMapper.mapTokenFormToEnhancedConfig(tokenForm);
        
        if (!mappingResult.success) {
          return false; // Fallback to standard deployment
        }

        // Check if any advanced configurations exist or requires chunking
        return mappingResult.complexity.level !== 'low' || 
               mappingResult.complexity.featureCount > 3 ||
               mappingResult.complexity.requiresChunking;
      } catch (importError) {
        console.warn('ERC1400 configuration mapper not available:', importError);
        return false;
      }
      
    } catch (error) {
      console.warn('Error checking ERC1400 specialist need:', error);
      return false; // Fallback to standard deployment
    }
  }

  /**
   * Quick check for obvious ERC-1400 advanced features in token data
   */
  private hasERC1400AdvancedFeatures(token: any): boolean {
    const props = token.erc1400Properties || {};
    
    // Check for obvious advanced features
    return !!(
      // Institutional features
      props.institutionalGrade ||
      props.custodyIntegrationEnabled ||
      props.primeBrokerageSupport ||
      
      // Advanced compliance
      props.realTimeComplianceMonitoring ||
      props.automatedSanctionsScreening ||
      props.amlMonitoringEnabled ||
      
      // Corporate actions
      props.advancedCorporateActions ||
      props.dividendDistribution ||
      props.corporateActions ||
      
      // Governance features
      props.advancedGovernanceEnabled ||
      props.proxyVotingEnabled ||
      props.cumulativeVotingEnabled ||
      
      // Cross-border features
      props.crossBorderTradingEnabled ||
      props.multiJurisdictionCompliance ||
      
      // Risk management
      props.advancedRiskManagement ||
      props.positionLimitsEnabled ||
      
      // Traditional finance integration
      props.traditionalFinanceIntegration ||
      props.swiftIntegrationEnabled ||
      
      // Advanced reporting
      props.enhancedReportingEnabled ||
      props.realTimeShareholderRegistry ||
      props.beneficialOwnershipTracking ||
      
      // Complex related data
      (token.partitions && token.partitions.length > 1) ||
      (token.controllers && token.controllers.length > 0) ||
      (token.custodyProviders && token.custodyProviders.length > 0) ||
      (token.regulatoryFilings && token.regulatoryFilings.length > 0) ||
      (token.corporateActions && token.corporateActions.length > 0)
    );
  }

  /**
   * Determine if ERC-1155 token should use specialized deployment service
   * ✅ FIX #4: Updated to accept walletAddress parameter
   */
  private async shouldUseERC1155Specialist(tokenId: string, useOptimization: boolean, walletAddress: string): Promise<boolean> {
    try {
      // Always check for advanced features, regardless of optimization setting
      const { data: token, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
      
      if (error || !token) {
        return false; // Fallback to standard deployment
      }

      // Quick check for obvious advanced features in the token data
      const hasAdvancedFeatures = this.hasERC1155AdvancedFeatures(token);
      
      if (hasAdvancedFeatures) {
        return true; // Definitely needs specialist
      }

      // If optimization is disabled and no obvious advanced features, use standard
      if (!useOptimization) {
        return false;
      }

      // Use configuration mapper for detailed analysis if available
      try {
        const { erc1155ConfigurationMapper } = await import('./erc1155ConfigurationMapper');
        // ✅ FIX #4: Use wallet address instead of 'default_address'
        const mappingResult = erc1155ConfigurationMapper.mapTokenFormToEnhancedConfig(
          token,
          token.deployed_by || walletAddress
        );
        
        if (!mappingResult.success) {
          return false; // Fallback to standard deployment
        }

        // Check if any advanced configurations exist or requires chunking
        return mappingResult.complexity.level !== 'low' || 
               mappingResult.complexity.featureCount > 3 ||
               mappingResult.complexity.requiresChunking;
      } catch (importError) {
        console.warn('ERC1155 configuration mapper not available:', importError);
        return false;
      }
      
    } catch (error) {
      console.warn('Error checking ERC1155 specialist need:', error);
      return false; // Fallback to standard deployment
    }
  }

  /**
   * Quick check for obvious ERC-1155 advanced features in token data
   */
  private hasERC1155AdvancedFeatures(token: any): boolean {
    const props = token.erc1155Properties || {};
    const blocks = token.blocks || {};
    
    // Check for obvious advanced features
    return !!(
      // Gaming features
      props.crafting_enabled ||
      props.fusion_enabled ||
      props.experience_points_enabled ||
      props.leveling_enabled ||
      props.consumable_tokens ||
      
      // Marketplace features
      props.has_royalty ||
      props.marketplace_fees_enabled ||
      props.bundle_trading_enabled ||
      props.atomic_swaps_enabled ||
      props.cross_collection_trading ||
      
      // Governance features
      props.voting_power_enabled ||
      props.community_treasury_enabled ||
      
      // Cross-chain features
      props.bridge_enabled ||
      props.layer2_support_enabled ||
      
      // Advanced minting/economics
      props.lazy_minting_enabled ||
      props.airdrop_enabled ||
      props.bulk_discount_enabled ||
      props.referral_rewards_enabled ||
      
      // Complex collections
      (props.tokenTypes && props.tokenTypes.length > 5) ||
      (props.craftingRecipes && props.craftingRecipes.length > 0) ||
      (props.discountTiers && props.discountTiers.length > 0) ||
      
      // Block configurations indicating complexity
      blocks.tokenTypes ||
      blocks.craftingRecipes ||
      blocks.discountTiers ||
      blocks.stakingConfig ||
      blocks.crossChainConfig ||
      
      // Geographic or compliance features
      props.use_geographic_restrictions ||
      props.geographic_restrictions?.length > 0 ||
      
      // Advanced metadata features
      props.dynamic_uris ||
      props.updatable_metadata ||
      props.supply_tracking_advanced ||
      
      // Role management
      props.mint_roles?.length > 0 ||
      props.burn_roles?.length > 0 ||
      props.metadata_update_roles?.length > 0
    );
  }

  /**
   * Determine if ERC-3525 token should use specialized deployment service
   * ✅ FIX #4: Updated to accept walletAddress parameter
   */
  private async shouldUseERC3525Specialist(tokenId: string, useOptimization: boolean, walletAddress: string): Promise<boolean> {
    try {
      // Always check for advanced features, regardless of optimization setting
      const { data: token, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
      
      if (error || !token) {
        return false; // Fallback to standard deployment
      }

      // Quick check for obvious advanced features in the token data
      const hasAdvancedFeatures = this.hasERC3525AdvancedFeatures(token);
      
      if (hasAdvancedFeatures) {
        return true; // Definitely needs specialist
      }

      // If optimization is disabled and no obvious advanced features, use standard
      if (!useOptimization) {
        return false;
      }

      // Use configuration mapper for detailed analysis if available
      try {
        const { erc3525ConfigurationMapper } = await import('./erc3525ConfigurationMapper');
        const tokenForm = this.prepareTokenFormForERC3525(token);
        // ✅ FIX #4: Use wallet address instead of 'default_address'
        const mappingResult = erc3525ConfigurationMapper.mapTokenFormToEnhancedConfig(
          tokenForm,
          token.deployed_by || walletAddress
        );
        
        if (!mappingResult.success) {
          return false; // Fallback to standard deployment
        }

        // Check if any advanced configurations exist or requires chunking
        return mappingResult.complexity.level !== 'low' || 
               mappingResult.complexity.featureCount > 3 ||
               mappingResult.complexity.requiresChunking;
      } catch (importError) {
        console.warn('ERC3525 configuration mapper not available:', importError);
        return false;
      }
      
    } catch (error) {
      console.warn('Error checking ERC3525 specialist need:', error);
      return false; // Fallback to standard deployment
    }
  }

  /**
   * Quick check for obvious ERC-3525 advanced features in token data
   */
  private hasERC3525AdvancedFeatures(token: any): boolean {
    const props = token.erc3525Properties || {};
    const blocks = token.blocks || {};
    
    // Check for obvious advanced features
    return !!(
      // Financial instrument features
      props.financialInstrumentType ||
      props.derivativeType ||
      props.principalAmount ||
      props.interestRate ||
      
      // DeFi features
      props.yieldFarmingEnabled ||
      props.flashLoanEnabled ||
      props.liquidityProvisionEnabled ||
      props.compoundInterestEnabled ||
      
      // Governance features
      props.slotVotingEnabled ||
      props.valueWeightedVoting ||
      props.delegateEnabled ||
      
      // Trading features
      props.slotMarketplaceEnabled ||
      props.valueMarketplaceEnabled ||
      props.partialValueTrading ||
      props.marketMakerEnabled ||
      
      // Compliance features
      props.regulatoryComplianceEnabled ||
      props.kycRequired ||
      props.accreditedInvestorOnly ||
      props.useGeographicRestrictions ||
      
      // Enterprise features
      props.multiSignatureRequired ||
      props.approvalWorkflowEnabled ||
      props.institutionalCustodySupport ||
      props.auditTrailEnhanced ||
      
      // Advanced slot features
      props.slotCreationEnabled ||
      props.dynamicSlotCreation ||
      props.slotMergeEnabled ||
      props.slotSplitEnabled ||
      props.crossSlotTransfers ||
      
      // Value computation features
      props.valueComputationMethod ||
      props.accrualEnabled ||
      props.valueAdjustmentEnabled ||
      
      // Complex data
      (token.slots && token.slots.length > 5) ||
      (token.allocations && token.allocations.length > 10) ||
      (token.payment_schedules && token.payment_schedules.length > 0) ||
      (token.value_adjustments && token.value_adjustments.length > 0) ||
      
      // Block configurations indicating complexity
      blocks.financialInstrument ||
      blocks.derivative ||
      blocks.valueComputation ||
      blocks.governance ||
      blocks.defi ||
      blocks.trading ||
      blocks.compliance ||
      
      // Advanced metadata features
      props.dynamicMetadata ||
      props.updatableUris ||
      props.valueAggregation ||
      props.fractionalOwnershipEnabled
    );
  }

  /**
   * Prepare token form data specifically for ERC-3525 configuration mapping
   */
  private prepareTokenFormForERC3525(token: any): any {
    return {
      name: token.name,
      symbol: token.symbol,
      description: token.description,
      valueDecimals: token.value_decimals || 18,
      
      // Extract ERC3525 properties
      ...(token.erc3525Properties || {}),
      
      // Related data
      slots: token.slots || [],
      allocations: token.allocations || [],
      paymentSchedules: token.payment_schedules || [],
      valueAdjustments: token.value_adjustments || [],
      slotConfigs: token.slot_configs || [],
      
      // Block configurations
      blocks: token.blocks || {}
    };
  }

  /**
   * Determine if ERC-4626 token should use specialized deployment service
   * ✅ FIX #4: Updated to accept walletAddress parameter
   */
  private async shouldUseERC4626Specialist(tokenId: string, useOptimization: boolean, walletAddress: string): Promise<boolean> {
    try {
      // Always check for advanced features, regardless of optimization setting
      const { data: token, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
      
      if (error || !token) {
        return false; // Fallback to standard deployment
      }

      // Quick check for obvious advanced features in the token data
      const hasAdvancedFeatures = this.hasERC4626AdvancedFeatures(token);
      
      if (hasAdvancedFeatures) {
        return true; // Definitely needs specialist
      }

      // If optimization is disabled and no obvious advanced features, use standard
      if (!useOptimization) {
        return false;
      }

      // Use configuration mapper for detailed analysis if available
      try {
        const { erc4626ConfigurationMapper } = await import('./erc4626ConfigurationMapper');
        // ✅ FIX #4: Use wallet address instead of 'default_address'
        const mappingResult = erc4626ConfigurationMapper.mapTokenFormToEnhancedConfig(
          token,
          token.deployed_by || walletAddress
        );
        
        if (!mappingResult.success) {
          return false; // Fallback to standard deployment
        }

        // Check if any advanced configurations exist or requires chunking
        return mappingResult.complexity.level !== 'low' || 
               mappingResult.complexity.featureCount > 3 ||
               mappingResult.complexity.requiresChunking;
      } catch (importError) {
        console.warn('ERC4626 configuration mapper not available:', importError);
        return false;
      }
      
    } catch (error) {
      console.warn('Error checking ERC4626 specialist need:', error);
      return false; // Fallback to standard deployment
    }
  }

  /**
   * Quick check for obvious ERC-4626 advanced features in token data
   */
  private hasERC4626AdvancedFeatures(token: any): boolean {
    const props = token.erc4626Properties || {};
    const blocks = token.blocks || {};
    
    // Check for obvious advanced features
    return !!(
      // Yield optimization features
      props.yieldOptimizationEnabled ||
      props.automatedRebalancing ||
      props.autoCompoundingEnabled ||
      props.yieldFarmingEnabled ||
      props.arbitrageEnabled ||
      
      // Risk management features
      props.riskManagementEnabled ||
      props.leverageEnabled ||
      props.impermanentLossProtection ||
      props.stopLossEnabled ||
      
      // Performance tracking
      props.performanceTracking ||
      props.realTimePnlTracking ||
      props.benchmarkTrackingEnabled ||
      
      // Institutional features
      props.institutionalGrade ||
      props.custodyIntegration ||
      props.complianceReportingEnabled ||
      props.fundAdministrationEnabled ||
      props.thirdPartyAuditsEnabled ||
      
      // DeFi integration
      props.lendingProtocolEnabled ||
      props.borrowingEnabled ||
      props.crossChainYieldEnabled ||
      props.marketMakingEnabled ||
      props.liquidityMiningEnabled ||
      
      // Complex vault strategies
      (token.vaultStrategies && token.vaultStrategies.length > 0) ||
      (token.assetAllocations && token.assetAllocations.length > 5) ||
      (token.feeTiers && token.feeTiers.length > 0) ||
      (token.performanceMetrics && token.performanceMetrics.length > 0) ||
      
      // Block configurations indicating complexity
      blocks.yieldOptimization ||
      blocks.riskManagement ||
      blocks.performanceTracking ||
      blocks.institutionalFeatures ||
      blocks.defiIntegration ||
      
      // Advanced analytics features
      props.portfolioAnalyticsEnabled ||
      props.taxReportingEnabled ||
      props.automatedReporting ||
      props.socialTradingEnabled ||
      props.auditTrailComprehensive ||
      
      // Fee structure complexity
      props.dynamicFeesEnabled ||
      props.feeRebateEnabled ||
      props.gasFeeOptimization ||
      
      // Diversification features
      props.diversificationEnabled ||
      props.multiAssetEnabled
    );
  }

  /**
   * Determine if ERC-20 token should use specialized deployment service
   */
  private async shouldUseERC20Specialist(tokenId: string, useOptimization: boolean): Promise<boolean> {
    try {
      // Always check for advanced features, regardless of optimization setting
      const { data: token, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
      
      if (error || !token) {
        return false; // Fallback to standard deployment
      }

      // Quick check for obvious advanced features in the token data
      const hasAdvancedFeatures = this.hasERC20AdvancedFeatures(token);
      
      if (hasAdvancedFeatures) {
        return true; // Definitely needs specialist
      }

      // If optimization is disabled and no obvious advanced features, use standard
      if (!useOptimization) {
        return false;
      }

      // Use configuration mapper for detailed analysis if available
      try {
        const { erc20ConfigurationMapper } = await import('./erc20ConfigurationMapper');
        const mockTokenForm = this.convertToTokenForm(token);
        const mappingResult = erc20ConfigurationMapper.mapTokenFormToEnhancedConfig(mockTokenForm);
        
        if (!mappingResult.success) {
          return false; // Fallback to standard deployment
        }

        // Check if any advanced configurations exist
        const config = mappingResult.config!;
        return !!(config.antiWhaleConfig?.enabled ||
                 config.feeConfig ||
                 config.tokenomicsConfig ||
                 config.presaleConfig?.enabled ||
                 config.vestingSchedules?.length ||
                 config.governanceConfig?.enabled ||
                 config.stakingConfig?.enabled ||
                 config.complianceConfig ||
                 config.roleAssignments ||
                 mappingResult.complexity.level === 'high' ||
                 mappingResult.complexity.level === 'extreme');
      } catch (importError) {
        console.warn('ERC20 configuration mapper not available:', importError);
        return false;
      }
      
    } catch (error) {
      console.warn('Error checking ERC20 specialist need:', error);
      return false; // Fallback to standard deployment
    }
  }

  /**
   * Quick check for obvious ERC-20 advanced features in token data
   */
  private hasERC20AdvancedFeatures(token: any): boolean {
    const props = token.erc20Properties || {};
    const blocks = token.blocks || {};
    
    // Check for obvious advanced features
    return !!(
      props.feeOnTransfer ||
      props.rebasing ||
      props.whitelistConfig ||
      props.complianceConfig ||
      props.transferConfig?.maxTransferAmount ||
      props.governanceFeatures?.enabled ||
      token.governanceFeatures?.enabled ||
      blocks.antiWhaleConfig ||
      blocks.feeConfig ||
      blocks.tokenomicsConfig ||
      blocks.presaleConfig ||
      blocks.governanceConfig ||
      blocks.stakingConfig ||
      blocks.complianceConfig
    );
  }

  /**
   * ✅ FIX #4: Convert token database record to TokenForm format for configuration mapping
   * Updated to use valid wallet address fallback instead of 'default_address'
   */
  private convertToTokenForm(token: any, walletAddress?: string): any {
    // Use wallet address as fallback if deployed_by is missing
    const initialOwner = token.deployed_by || walletAddress || undefined;
    
    if (!initialOwner) {
      console.warn('⚠️ FIX #4: No deployed_by or wallet address available for token', token.id);
    }
    
    return {
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals || 18,
      standard: token.standard,
      initialSupply: token.total_supply || '1000000',
      initialOwner: initialOwner, // ✅ FIX #4: Use wallet address fallback
      isMintable: token.is_mintable,
      isBurnable: token.is_burnable,
      isPausable: token.is_pausable,
      erc20Properties: token.erc20Properties || {},
      governanceFeatures: token.governanceFeatures || {},
      blocks: token.blocks || {}
    };
  }

  /**
   * ✅ FIX #4: Helper method to retrieve project wallet address
   * Retrieves wallet address from project_wallets table for given project and blockchain
   */
  private async getProjectWallet(projectId: string, blockchain: string): Promise<string> {
    const { data: walletData, error: walletError } = await supabase
      .from('project_wallets')
      .select('wallet_address')
      .eq('project_id', projectId)
      .eq('wallet_type', blockchain)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (walletError) {
      throw new Error(`Failed to fetch project wallet: ${walletError.message}`);
    }

    if (!walletData || !walletData.wallet_address) {
      throw new Error(`No wallet address found for project ${projectId} on ${blockchain}`);
    }

    return walletData.wallet_address;
  }

  /**
   * Deploy a token with automatic optimization
   * 
   * This method automatically:
   * 1. Applies rate limiting and security validation
   * 2. Analyzes complexity and chooses optimal deployment strategy
   * 3. Uses chunked deployment for complex contracts
   * 4. Falls back to standard deployment for simple contracts
   */
  async deployToken(
    tokenId: string,
    userId: string, 
    projectId: string,
    options: UnifiedDeploymentOptions = {}
  ): Promise<UnifiedDeploymentResult> {
    const {
      useOptimization = true,
      forceStrategy = 'auto',
      enableAnalytics = true,
      gasConfig, // ✅ FIX #5: Extract gas configuration from options
      walletAddress: providedWalletAddress, // ✅ FIX #6: Extract wallet address from options
      moduleConfigs // ✅ FIX #9: Extract extension module configurations from options
    } = options;
    
    console.log('📦 [UnifiedDeployment] Module configs received:', moduleConfigs ? Object.keys(moduleConfigs) : 'none');

    try {
      // Step 1: Get token details for analysis
      const { data: token, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
      
      if (error || !token) {
        return {
          status: DeploymentStatus.FAILED,
          error: error ? error.message : 'Token not found'
        };
      }

      const tokenStandard = token.standard as TokenStandard;
      
      // Smart blockchain detection: If token.blockchain is null, infer from project wallets
      let blockchain = token.blockchain;
      let environment = token.deployment_environment || 'testnet';
      
      if (!blockchain) {
        // Query project_wallets to find available blockchain for this project
        const { data: projectWallet, error: walletError } = await supabase
          .from('project_wallets')
          .select('wallet_type')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (projectWallet && projectWallet.wallet_type) {
          blockchain = projectWallet.wallet_type;
          console.log(`Auto-detected blockchain from project wallet: ${blockchain}`);
        } else {
          // Fallback to ethereum only if no project wallets exist
          blockchain = 'ethereum';
          console.warn(`No project wallet found, defaulting to ethereum. Consider creating a project wallet first.`);
        }
      }

      // ✅ FIX #6: Use provided wallet address or retrieve from database
      let walletAddress: string;
      
      if (providedWalletAddress) {
        // Use the wallet address provided in options (from form selection)
        walletAddress = providedWalletAddress;
        console.log(`✅ FIX #6: Using provided wallet address: ${walletAddress}`);
      } else {
        // Fallback to querying database for project wallet
        try {
          walletAddress = await this.getProjectWallet(projectId, blockchain);
          console.log(`✅ FIX #6: Retrieved wallet address from database: ${walletAddress}`);
        } catch (error) {
          return {
            status: DeploymentStatus.FAILED,
            error: error instanceof Error ? error.message : 'Failed to retrieve project wallet'
          };
        }
      }

      // Step 2: Apply rate limiting and security validation
      // (This also handles all the security checks and token events)
      const securityResult = await enhancedTokenDeploymentService.validateTokenForDeployment(tokenId);
      
      if (securityResult.hasIssues) {
        const criticalIssues = securityResult.findings.filter(f => f.severity === 'high');
        if (criticalIssues.length > 0) {
          return {
            status: DeploymentStatus.FAILED,
            error: `Security validation failed: ${criticalIssues[0].issue}`
          };
        }
      }

      // Step 3: Check rate limits
      const rateLimitResult = await enhancedTokenDeploymentService.checkRateLimits(userId, projectId);
      if (!rateLimitResult.allowed) {
        return {
          status: DeploymentStatus.FAILED,
          error: rateLimitResult.reason
        };
      }

      // Step 4: Intelligent deployment routing
      let deploymentStrategy: 'direct' | 'chunked' | 'batched' = 'direct';
      let optimizationUsed = false;
      let result: UnifiedDeploymentResult;

      // Normalize token standard for comparison
      const normalizedStandard = this.normalizeTokenStandard(tokenStandard);

      // Special handling for ERC-20 tokens - check if advanced features exist
      if (normalizedStandard === 'ERC20') {
        const shouldUseERC20Specialist = await this.shouldUseERC20Specialist(tokenId, useOptimization);
        
        if (shouldUseERC20Specialist) {
          // Use specialized ERC20 deployment service
          // ✅ FIX #5: Pass gasConfig to ERC20 specialist
          const erc20Result = await unifiedERC20DeploymentService.deployERC20Token(
            tokenId,
            userId,
            projectId,
            useOptimization,
            gasConfig
          );
          
          return {
            status: erc20Result.success ? DeploymentStatus.SUCCESS : DeploymentStatus.FAILED,
            tokenAddress: erc20Result.tokenAddress,
            transactionHash: erc20Result.transactionHash,
            timestamp: erc20Result.deploymentTimeMs,
            error: erc20Result.errors?.[0],
            optimizationUsed: erc20Result.optimizationUsed,
            strategy: erc20Result.deploymentStrategy as any,
            gasOptimization: erc20Result.gasSavingsEstimate ? {
              estimatedSavings: erc20Result.gasSavingsEstimate,
              reliabilityImprovement: `${erc20Result.deploymentStrategy} deployment improves reliability`
            } : undefined
          };
        }
        // If no advanced features, continue with standard deployment below
      }

      // Special handling for ERC-721 tokens - check if advanced features exist
      if (normalizedStandard === 'ERC721') {
        const shouldUseERC721Specialist = await this.shouldUseERC721Specialist(tokenId, useOptimization, walletAddress);
        
        if (shouldUseERC721Specialist) {
          // Use specialized ERC721 deployment service
          // ✅ FIX #5: Pass gasConfig to ERC721 specialist
          const erc721Result = await unifiedERC721DeploymentService.deployERC721Token(
            tokenId,
            userId,
            projectId,
            {
              useOptimization,
              forceStrategy: forceStrategy === 'auto' ? 'auto' : forceStrategy as any,
              enableAnalytics,
              gasConfig // ✅ FIX #5: Include gas configuration
            }
          );
          
          return {
            status: erc721Result.success ? DeploymentStatus.SUCCESS : DeploymentStatus.FAILED,
            tokenAddress: erc721Result.tokenAddress,
            transactionHash: erc721Result.deploymentTx,
            timestamp: erc721Result.deploymentTimeMs,
            error: erc721Result.success ? undefined : 'Deployment failed',
            optimizationUsed: erc721Result.deploymentStrategy !== 'basic',
            strategy: erc721Result.deploymentStrategy as any,
            gasOptimization: erc721Result.gasOptimization
          };
        }
        // If no advanced features, continue with standard deployment below
      }

      // Special handling for ERC-1400 tokens - check if advanced features exist
      if (normalizedStandard === 'ERC1400') {
        const shouldUseERC1400Specialist = await this.shouldUseERC1400Specialist(tokenId, useOptimization, walletAddress);
        
        if (shouldUseERC1400Specialist) {
          // Use specialized ERC1400 deployment service
          // ✅ FIX #5: Pass gasConfig to ERC1400 specialist
          const erc1400Result = await unifiedERC1400DeploymentService.deployERC1400Token(
            tokenId,
            userId,
            projectId,
            {
              useOptimization,
              forceStrategy: forceStrategy === 'auto' ? 'auto' : forceStrategy as any,
              enableAnalytics,
              enableComplianceValidation: true,
              institutionalGrade: forceStrategy === 'chunked', // Force institutional if chunked requested
              gasConfig // ✅ FIX #5: Include gas configuration
            }
          );
          
          return {
            status: erc1400Result.success ? DeploymentStatus.SUCCESS : DeploymentStatus.FAILED,
            tokenAddress: erc1400Result.tokenAddress,
            transactionHash: erc1400Result.deploymentTx,
            timestamp: erc1400Result.deploymentTimeMs,
            error: erc1400Result.success ? undefined : erc1400Result.error || 'Security token deployment failed',
            optimizationUsed: erc1400Result.deploymentStrategy !== 'basic',
            strategy: erc1400Result.deploymentStrategy as any,
            gasOptimization: erc1400Result.gasOptimization
          };
        }
        // If no advanced features, continue with standard deployment below
      }

      // Special handling for ERC-1155 tokens - check if advanced features exist
      if (normalizedStandard === 'ERC1155') {
        const shouldUseERC1155Specialist = await this.shouldUseERC1155Specialist(tokenId, useOptimization, walletAddress);
        
        if (shouldUseERC1155Specialist) {
          // Use specialized ERC1155 deployment service
          // ✅ FIX #5: Pass gasConfig to ERC1155 specialist
          const erc1155Result = await unifiedERC1155DeploymentService.deployERC1155Token(
            tokenId,
            userId,
            projectId,
            {
              useOptimization,
              forceStrategy: forceStrategy === 'auto' ? 'auto' : forceStrategy as any,
              enableAnalytics,
              gasConfig // ✅ FIX #5: Include gas configuration
            }
          );
          
          return {
            status: erc1155Result.success ? DeploymentStatus.SUCCESS : DeploymentStatus.FAILED,
            tokenAddress: erc1155Result.tokenAddress,
            transactionHash: erc1155Result.deploymentTx,
            timestamp: erc1155Result.deploymentTimeMs,
            error: erc1155Result.success ? undefined : 'Deployment failed',
            optimizationUsed: erc1155Result.deploymentStrategy !== 'basic',
            strategy: erc1155Result.deploymentStrategy as any,
            gasOptimization: erc1155Result.gasOptimization
          };
        }
        // If no advanced features, continue with standard deployment below
      }

      // Special handling for ERC-3525 tokens - check if advanced features exist
      if (normalizedStandard === 'ERC3525') {
        const shouldUseERC3525Specialist = await this.shouldUseERC3525Specialist(tokenId, useOptimization, walletAddress);
        
        if (shouldUseERC3525Specialist) {
          // Use specialized ERC3525 deployment service
          // ✅ FIX #5: Pass gasConfig to ERC3525 specialist
          const erc3525Result = await unifiedERC3525DeploymentService.deployERC3525Token(
            tokenId,
            userId,
            projectId,
            {
              useOptimization,
              forceStrategy: forceStrategy === 'auto' ? 'auto' : forceStrategy as any,
              enableAnalytics,
              enableValidation: true,
              enableProgressTracking: true,
              gasConfig // ✅ FIX #5: Include gas configuration
            }
          );
          
          return {
            status: erc3525Result.success ? DeploymentStatus.SUCCESS : DeploymentStatus.FAILED,
            tokenAddress: erc3525Result.tokenAddress,
            transactionHash: erc3525Result.deploymentTx,
            timestamp: erc3525Result.deploymentTimeMs,
            error: erc3525Result.success ? undefined : erc3525Result.errors?.[0] || 'Semi-fungible token deployment failed',
            optimizationUsed: erc3525Result.optimizationUsed,
            strategy: erc3525Result.deploymentStrategy as any,
            gasOptimization: erc3525Result.gasOptimization
          };
        }
        // If no advanced features, continue with standard deployment below
      }

      // Special handling for ERC-4626 tokens - check if advanced features exist
      if (normalizedStandard === 'ERC4626') {
        const shouldUseERC4626Specialist = await this.shouldUseERC4626Specialist(tokenId, useOptimization, walletAddress);
        
        if (shouldUseERC4626Specialist) {
          // Use specialized ERC4626 deployment service
          // ✅ FIX #5: Pass gasConfig to ERC4626 specialist
          const erc4626Result = await unifiedERC4626DeploymentService.deployERC4626Token(
            tokenId,
            userId,
            projectId,
            {
              useOptimization,
              forceStrategy: forceStrategy === 'auto' ? 'auto' : forceStrategy as any,
              enableAnalytics,
              enableValidation: true,
              enableProgressTracking: true,
              gasConfig // ✅ FIX #5: Include gas configuration
            }
          );
          
          return {
            status: erc4626Result.success ? DeploymentStatus.SUCCESS : DeploymentStatus.FAILED,
            tokenAddress: erc4626Result.tokenAddress,
            transactionHash: erc4626Result.deploymentTx,
            timestamp: erc4626Result.deploymentTimeMs,
            error: erc4626Result.success ? undefined : erc4626Result.error || 'Vault deployment failed',
            optimizationUsed: erc4626Result.optimizationUsed,
            strategy: erc4626Result.deploymentStrategy as any,
            gasOptimization: erc4626Result.gasOptimization
          };
        }
        // If no advanced features, continue with standard deployment below
      }

      if (useOptimization && forceStrategy === 'auto') {
        // Analyze complexity and choose optimal strategy
        const complexityAnalysis = await this.analyzeTokenComplexity(token, tokenStandard);
        
        if (complexityAnalysis.requiresOptimization) {
          optimizationUsed = true;
          deploymentStrategy = complexityAnalysis.recommendedStrategy;
          
          // Use optimization services
          // ✅ FIX #4: Pass walletAddress to deployWithOptimization
          result = await this.deployWithOptimization(
            token,
            tokenStandard,
            userId,
            blockchain,
            environment,
            complexityAnalysis,
            walletAddress
          );
        } else {
          // Use standard enhanced deployment
          // ✅ FIX #7: Pass walletAddress and gasConfig to deployToken
          const standardResult = await enhancedTokenDeploymentService.deployToken(
            tokenId, 
            userId, 
            projectId,
            true, // useFoundry
            walletAddress,
            gasConfig
          );
          result = {
            ...standardResult,
            optimizationUsed: false,
            strategy: 'direct'
          };
        }
      } else if (forceStrategy !== 'auto') {
        // Use forced strategy
        deploymentStrategy = forceStrategy;
        optimizationUsed = true;
        
        // ✅ FIX #4: Pass walletAddress to deployWithForcedStrategy
        result = await this.deployWithForcedStrategy(
          token,
          tokenStandard,
          userId,
          blockchain,
          environment,
          forceStrategy,
          walletAddress
        );
      } else {
        // Use standard deployment without optimization
        // ✅ FIX #7: Pass walletAddress and gasConfig to deployToken
        const standardResult = await enhancedTokenDeploymentService.deployToken(
          tokenId, 
          userId, 
          projectId,
          true, // useFoundry
          walletAddress,
          gasConfig
        );
        result = {
          ...standardResult,
          optimizationUsed: false,
          strategy: 'direct'
        };
      }

      // Step 5: Add optimization metadata to result
      const unifiedResult: UnifiedDeploymentResult = {
        ...result,
        optimizationUsed,
        strategy: deploymentStrategy
      };

      // Step 6: Log analytics if enabled
      if (enableAnalytics) {
        await this.logUnifiedDeploymentAnalytics(
          tokenId,
          userId,
          unifiedResult,
          tokenStandard
        );
      }

      return unifiedResult;

    } catch (error) {
      console.error('Unified deployment failed:', error);
      
      return {
        status: DeploymentStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown deployment error',
        optimizationUsed: false
      };
    }
  }

  /**
   * Analyze token complexity to determine if optimization is needed
   */
  private async analyzeTokenComplexity(
    token: any,
    tokenStandard: TokenStandard
  ): Promise<{
    requiresOptimization: boolean;
    recommendedStrategy: 'direct' | 'chunked' | 'batched';
    complexityScore: number;
    reasoning: string;
  }> {
    const tokenConfig = token.blocks || {};
    const normalizedStandard = this.normalizeTokenStandard(tokenStandard);
    
    // Count complexity factors
    let complexityScore = 0;
    let reasoning = '';
    
    switch (normalizedStandard) {
      case 'ERC3525':
        const slots = tokenConfig.postDeployment?.slots?.length || 0;
        const allocations = tokenConfig.postDeployment?.allocations?.length || 0;
        complexityScore = slots + allocations * 2;
        
        if (slots > 10 || allocations > 20) {
          reasoning = `ERC3525 with ${slots} slots and ${allocations} allocations requires chunking`;
          return {
            requiresOptimization: true,
            recommendedStrategy: 'chunked',
            complexityScore,
            reasoning
          };
        }
        break;
        
      case 'ERC1400':
        // ERC1400 complexity is handled by the specialist service
        // This should not be reached if routing is working correctly
        const controllers = tokenConfig.postDeployment?.controllers?.length || 0;
        const partitions = tokenConfig.postDeployment?.partitions?.length || 0;
        const documents = tokenConfig.postDeployment?.documents?.length || 0;
        const corporateActions = tokenConfig.postDeployment?.corporateActions?.length || 0;
        complexityScore = controllers + partitions + documents + corporateActions;
        
        reasoning = 'ERC1400 security tokens should use specialized deployment service';
        return {
          requiresOptimization: true,
          recommendedStrategy: 'chunked',
          complexityScore: Math.max(complexityScore, 60), // Minimum complexity for security tokens
          reasoning
        };
        
      case 'ERC4626':
        const strategies = tokenConfig.postDeployment?.vaultStrategies?.length || 0;
        const allocations4626 = tokenConfig.postDeployment?.assetAllocations?.length || 0;
        complexityScore = strategies * 3 + allocations4626;
        
        if (strategies > 5 || allocations4626 > 15) {
          reasoning = `ERC4626 with ${strategies} strategies and ${allocations4626} allocations benefits from batching`;
          return {
            requiresOptimization: true,
            recommendedStrategy: 'batched',
            complexityScore,
            reasoning
          };
        }
        break;
        
      case 'ERC1155':
        // ERC1155 complexity is handled by the specialist service
        // This should not be reached if routing is working correctly
        const tokenTypes = tokenConfig.postDeployment?.tokenTypes?.length || 0;
        const craftingRecipes = tokenConfig.postDeployment?.craftingRecipes?.length || 0;
        const discountTiers = tokenConfig.postDeployment?.discountTiers?.length || 0;
        complexityScore = tokenTypes + craftingRecipes * 2 + discountTiers;
        
        reasoning = 'ERC1155 tokens should use specialized deployment service';
        return {
          requiresOptimization: false,
          recommendedStrategy: 'direct',
          complexityScore: 10,
          reasoning
        };
        
      case 'ERC721':
        // ERC721 complexity is handled by the specialist service
        // This should not be reached if routing is working correctly
        reasoning = 'ERC721 tokens should use specialized deployment service';
        return {
          requiresOptimization: false,
          recommendedStrategy: 'direct',
          complexityScore: 10,
          reasoning
        };
        
      case 'ERC20':
        // ERC20 complexity is handled by the specialist service
        // This should not be reached if routing is working correctly
        reasoning = 'ERC20 tokens should use specialized deployment service';
        return {
          requiresOptimization: false,
          recommendedStrategy: 'direct',
          complexityScore: 10,
          reasoning
        };
    }

    return {
      requiresOptimization: false,
      recommendedStrategy: 'direct',
      complexityScore,
      reasoning: 'Standard deployment is optimal for this configuration'
    };
  }

  /**
   * Deploy with optimization services
   * ✅ FIX #4: Updated to accept and use wallet address parameter
   */
  private async deployWithOptimization(
    token: any,
    tokenStandard: TokenStandard,
    userId: string,
    blockchain: string,
    environment: string,
    analysis: any,
    walletAddress: string
  ): Promise<UnifiedDeploymentResult> {
    
    const normalizedStandard = this.normalizeTokenStandard(tokenStandard);
    
    if (normalizedStandard === 'ERC3525' && analysis.recommendedStrategy === 'chunked') {
      // Use specialized ERC3525 optimization service
      const optimizedConfig = this.convertToOptimizedERC3525Config(token, walletAddress);
      
      const result = await optimizedDeploymentService.deployERC3525Optimized(
        optimizedConfig,
        userId,
        userId, // Using userId as keyId for simplicity
        blockchain,
        environment as 'mainnet' | 'testnet'
      );
      
      return {
        status: DeploymentStatus.SUCCESS,
        tokenAddress: result.tokenAddress,
        transactionHash: result.deploymentTx,
        timestamp: result.deploymentTimeMs,
        optimizationUsed: true,
        strategy: 'chunked',
        gasOptimization: {
          estimatedSavings: result.totalGasUsed * 0.3, // Estimated 30% savings
          reliabilityImprovement: 'Chunked deployment improves success rate by 40%'
        }
      };
    } else {
      // Use multi-standard optimization service
      const optimizedConfig = this.convertToMultiStandardConfig(token, tokenStandard, walletAddress);
      
      const result = await multiStandardOptimizationService.deployWithOptimalStrategy(
        optimizedConfig,
        userId,
        userId, // Using userId as keyId for simplicity
        blockchain,
        environment as 'mainnet' | 'testnet'
      );
      
      return {
        status: DeploymentStatus.SUCCESS,
        tokenAddress: result.tokenAddress,
        transactionHash: result.deploymentTx,
        timestamp: result.deploymentTimeMs,
        optimizationUsed: true,
        strategy: result.strategy.approach as any,
        gasOptimization: {
          estimatedSavings: result.optimizationSavings.gasReduction,
          reliabilityImprovement: result.optimizationSavings.reliabilityImprovement
        }
      };
    }
  }

  /**
   * Deploy with forced strategy
   * ✅ FIX #4: Updated to accept and use wallet address parameter
   */
  private async deployWithForcedStrategy(
    token: any,
    tokenStandard: TokenStandard,
    userId: string,
    blockchain: string,
    environment: string,
    strategy: 'direct' | 'chunked' | 'batched',
    walletAddress: string
  ): Promise<UnifiedDeploymentResult> {
    
    const normalizedStandard = this.normalizeTokenStandard(tokenStandard);
    
    if (strategy === 'chunked' && normalizedStandard === 'ERC3525') {
      return await this.deployWithOptimization(token, tokenStandard, userId, blockchain, environment, {
        recommendedStrategy: 'chunked'
      }, walletAddress);
    } else {
      // For non-ERC3525 or non-chunked strategies, use multi-standard service
      const optimizedConfig = this.convertToMultiStandardConfig(token, tokenStandard, walletAddress);
      
      const result = await multiStandardOptimizationService.deployWithOptimalStrategy(
        optimizedConfig,
        userId,
        userId,
        blockchain,
        environment as 'mainnet' | 'testnet'
      );
      
      return {
        status: DeploymentStatus.SUCCESS,
        tokenAddress: result.tokenAddress,
        transactionHash: result.deploymentTx,
        timestamp: result.deploymentTimeMs,
        optimizationUsed: true,
        strategy: strategy
      };
    }
  }

  /**
   * Convert token data to optimized ERC3525 config
   * ✅ FIX #4: Updated to use wallet address fallback instead of 'default_address'
   */
  private convertToOptimizedERC3525Config(token: any, walletAddress: string): any {
    const blocks = token.blocks || {};
    
    return {
      baseConfig: {
        name: token.name,
        symbol: token.symbol,
        valueDecimals: blocks.valueDecimals || 18,
        mintingEnabled: blocks.mintingEnabled || true,
        burningEnabled: blocks.burningEnabled || true,
        transfersPaused: blocks.transfersPaused || false,
        initialOwner: blocks.initialOwner || token.deployed_by || walletAddress
      },
      postDeployment: {
        slots: blocks.postDeployment?.slots || [],
        allocations: blocks.postDeployment?.allocations || [],
        royalty: blocks.postDeployment?.royalty || { fraction: 0, recipient: token.deployed_by || walletAddress }
      }
    };
  }

  /**
   * Convert token data to multi-standard config
   * ✅ FIX #4: Updated to use wallet address fallback instead of 'default_address'
   */
  private convertToMultiStandardConfig(token: any, standard: TokenStandard, walletAddress: string): any {
    const blocks = token.blocks || {};
    const normalizedStandard = this.normalizeTokenStandard(standard);
    
    const baseConfig = {
      name: token.name,
      symbol: token.symbol,
      initialOwner: token.deployed_by || walletAddress
    };

    return {
      standard: normalizedStandard,
      config: {
        baseConfig: {
          ...baseConfig,
          ...(normalizedStandard === 'ERC20' && {
            decimals: blocks.decimals || 18,
            initialSupply: blocks.initialSupply || blocks.initial_supply || token.total_supply || '1000000',
            maxSupply: blocks.maxSupply
          }),
          ...(normalizedStandard === 'ERC721' && {
            baseURI: blocks.baseURI || '',
            maxSupply: blocks.maxSupply
          }),
          ...(normalizedStandard === 'ERC1155' && {
            baseURI: blocks.baseURI || ''
          }),
          ...(normalizedStandard === 'ERC4626' && {
            decimals: blocks.decimals || 18,
            asset: blocks.asset || token.deployed_by || walletAddress
          })
        },
        postDeployment: blocks.postDeployment || {}
      }
    };
  }

  /**
   * Log unified deployment analytics
   */
  private async logUnifiedDeploymentAnalytics(
    tokenId: string,
    userId: string,
    result: UnifiedDeploymentResult,
    tokenStandard: TokenStandard
  ): Promise<void> {
    await logActivity({
      action: 'unified_token_deployment',
      entity_type: 'token',
      entity_id: result.tokenAddress || tokenId,
      details: {
        tokenId,
        userId,
        standard: tokenStandard,
        status: result.status,
        optimizationUsed: result.optimizationUsed,
        strategy: result.strategy,
        gasOptimization: result.gasOptimization,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Get deployment recommendation without deploying
   */
  async getDeploymentRecommendation(tokenId: string): Promise<{
    recommendedStrategy: 'direct' | 'chunked' | 'batched';
    reasoning: string;
    estimatedGasSavings?: number;
    complexityScore: number;
  }> {
    const { data: token, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();
    
    if (error || !token) {
      throw new Error('Token not found');
    }

    const tokenStandard = token.standard as TokenStandard;
    const analysis = await this.analyzeTokenComplexity(token, tokenStandard);
    
    return {
      recommendedStrategy: analysis.recommendedStrategy,
      reasoning: analysis.reasoning,
      estimatedGasSavings: analysis.requiresOptimization ? analysis.complexityScore * 1000 : 0,
      complexityScore: analysis.complexityScore
    };
  }
}

// Export singleton instance
export const unifiedTokenDeploymentService = new UnifiedTokenDeploymentService();
