/**
 * Unified ERC20 Deployment Service
 * 
 * Automatically chooses between basic and enhanced ERC-20 deployment
 * based on configuration complexity and optimization requirements
 */

import { enhancedTokenDeploymentService } from './tokenDeploymentService';
import { enhancedERC20DeploymentService, EnhancedERC20Config } from './enhancedERC20DeploymentService';
import { erc20ConfigurationMapper } from './erc20ConfigurationMapper';
import { foundryDeploymentService } from './foundryDeploymentService';
import { TokenFormData } from '@/components/tokens/types';
import { logActivity } from '@/infrastructure/activityLogger';
import { DeploymentStatus } from '@/types/deployment/TokenDeploymentTypes';

export interface UnifiedERC20DeploymentResult {
  success: boolean;
  tokenAddress?: string;
  transactionHash?: string;
  deploymentStrategy: 'basic' | 'enhanced' | 'chunked';
  optimizationUsed: boolean;
  complexity?: {
    level: 'low' | 'medium' | 'high' | 'extreme';
    score: number;
    chunksRequired: number;
  };
  configurationTxs?: Array<{
    category: string;
    transactionHash: string;
    gasUsed: number;
    status: 'success' | 'failed';
  }>;
  totalGasUsed?: number;
  deploymentTimeMs?: number;
  gasSavingsEstimate?: number;
  errors?: string[];
  warnings?: string[];
}

export class UnifiedERC20DeploymentService {
  /**
   * Deploy ERC-20 token with automatic strategy selection
   */
  async deployERC20Token(
    tokenId: string,
    userId: string,
    projectId: string,
    optimizationEnabled: boolean = true
  ): Promise<UnifiedERC20DeploymentResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Get token configuration from database
      const tokenData = await this.getTokenConfiguration(tokenId);
      if (!tokenData) {
        return {
          success: false,
          deploymentStrategy: 'basic',
          optimizationUsed: false,
          errors: ['Token configuration not found'],
          warnings: []
        };
      }

      // Step 2: Analyze configuration complexity
      const mappingResult = erc20ConfigurationMapper.mapTokenFormToEnhancedConfig(tokenData);
      
      if (!mappingResult.success || !mappingResult.config) {
        return {
          success: false,
          deploymentStrategy: 'basic',
          optimizationUsed: false,
          complexity: mappingResult.complexity,
          errors: mappingResult.errors,
          warnings: mappingResult.warnings
        };
      }

      // Step 3: Determine deployment strategy
      const strategy = this.determineDeploymentStrategy(
        mappingResult.config,
        mappingResult.complexity,
        optimizationEnabled
      );

      await logActivity({
        action: 'unified_erc20_deployment_started',
        entity_type: 'token',
        entity_id: tokenId,
        details: {
          strategy,
          complexity: mappingResult.complexity,
          optimizationEnabled,
          configurationValid: mappingResult.success
        }
      });

      // Step 4: Execute deployment based on strategy
      let result: UnifiedERC20DeploymentResult;

      switch (strategy) {
        case 'basic':
          result = await this.executeBasicDeployment(tokenData, userId, projectId);
          break;
          
        case 'enhanced':
          result = await this.executeEnhancedDeployment(
            mappingResult.config,
            tokenId,
            userId,
            projectId
          );
          break;
          
        case 'chunked':
          result = await this.executeChunkedDeployment(
            mappingResult.config,
            tokenId,
            userId,
            projectId
          );
          break;
          
        default:
          throw new Error(`Unknown deployment strategy: ${strategy}`);
      }

      // Step 5: Add metadata to result
      result.complexity = mappingResult.complexity;
      result.warnings = [...(result.warnings || []), ...mappingResult.warnings];
      result.deploymentTimeMs = Date.now() - startTime;

      // Step 6: Log completion
      await logActivity({
        action: result.success ? 'unified_erc20_deployment_completed' : 'unified_erc20_deployment_failed',
        entity_type: 'token',
        entity_id: result.tokenAddress || tokenId,
        details: {
          result,
          strategy,
          deploymentTimeMs: result.deploymentTimeMs
        },
        status: result.success ? 'success' : 'error'
      });

      return result;

    } catch (error) {
      const errorResult: UnifiedERC20DeploymentResult = {
        success: false,
        deploymentStrategy: 'basic',
        optimizationUsed: false,
        deploymentTimeMs: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown deployment error'],
        warnings: []
      };

      await logActivity({
        action: 'unified_erc20_deployment_error',
        entity_type: 'token',
        entity_id: tokenId,
        details: {
          error: errorResult.errors?.[0],
          deploymentTimeMs: errorResult.deploymentTimeMs
        },
        status: 'error'
      });

      return errorResult;
    }
  }

  /**
   * Get deployment recommendations without deploying
   */
  async getDeploymentRecommendations(tokenId: string): Promise<{
    strategy: 'basic' | 'enhanced' | 'chunked';
    complexity: any;
    estimatedGasCost: number;
    estimatedTime: number;
    recommendations: string[];
    warnings: string[];
  }> {
    const tokenData = await this.getTokenConfiguration(tokenId);
    if (!tokenData) {
      throw new Error('Token configuration not found');
    }

    const mappingResult = erc20ConfigurationMapper.mapTokenFormToEnhancedConfig(tokenData);
    if (!mappingResult.success || !mappingResult.config) {
      throw new Error('Invalid token configuration');
    }

    const strategy = this.determineDeploymentStrategy(
      mappingResult.config,
      mappingResult.complexity,
      true
    );

    const recommendations = enhancedERC20DeploymentService.getDeploymentRecommendations(mappingResult.config);

    return {
      strategy,
      complexity: mappingResult.complexity,
      estimatedGasCost: recommendations.estimatedGasCost,
      estimatedTime: recommendations.estimatedTime,
      recommendations: recommendations.recommendations,
      warnings: mappingResult.warnings
    };
  }

  /**
   * Determine optimal deployment strategy
   */
  private determineDeploymentStrategy(
    config: EnhancedERC20Config,
    complexity: any,
    optimizationEnabled: boolean
  ): 'basic' | 'enhanced' | 'chunked' {
    // If optimization is disabled, use basic deployment
    if (!optimizationEnabled) {
      return 'basic';
    }

    // Check if configuration requires enhanced features
    const requiresEnhanced = this.requiresEnhancedFeatures(config);
    
    if (!requiresEnhanced) {
      return 'basic';
    }

    // Choose between enhanced and chunked based on complexity
    if (complexity.level === 'extreme' || complexity.chunksRequired > 7) {
      return 'chunked';
    } else if (complexity.level === 'high' || complexity.chunksRequired > 3) {
      return 'enhanced';
    } else {
      return 'enhanced';
    }
  }

  /**
   * Check if configuration requires enhanced features
   */
  private requiresEnhancedFeatures(config: EnhancedERC20Config): boolean {
    return !!(
      config.antiWhaleConfig?.enabled ||
      config.feeConfig ||
      config.tokenomicsConfig ||
      config.presaleConfig?.enabled ||
      config.vestingSchedules?.length ||
      config.governanceConfig?.enabled ||
      config.stakingConfig?.enabled ||
      config.complianceConfig ||
      config.roleAssignments
    );
  }

  /**
   * Execute basic ERC-20 deployment
   */
  private async executeBasicDeployment(
    tokenData: TokenFormData,
    userId: string,
    projectId: string
  ): Promise<UnifiedERC20DeploymentResult> {
    try {
      // Use existing enhanced token deployment service for basic deployment
      const result = await enhancedTokenDeploymentService.deployToken(
        tokenData.id || 'unknown',
        userId,
        projectId
      );

      return {
        success: result.status === 'SUCCESS',
        tokenAddress: result.tokenAddress,
        transactionHash: result.transactionHash,
        deploymentStrategy: 'basic',
        optimizationUsed: false,
        totalGasUsed: parseInt(result.gasUsed || '0'),
        errors: result.status === 'SUCCESS' ? [] : [result.error || 'Deployment failed'],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        deploymentStrategy: 'basic',
        optimizationUsed: false,
        errors: [error instanceof Error ? error.message : 'Basic deployment failed'],
        warnings: []
      };
    }
  }

  /**
   * Execute enhanced ERC-20 deployment (single transaction with all features)
   */
  private async executeEnhancedDeployment(
    config: EnhancedERC20Config,
    tokenId: string,
    userId: string,
    projectId: string
  ): Promise<UnifiedERC20DeploymentResult> {
    try {
      // Deploy enhanced contract with simplified configuration
      const simplifiedConfig = this.simplifyConfigurationForSingleTx(config);
      
      const deploymentParams = {
        tokenType: 'EnhancedERC20' as const,
        config: {
          ...simplifiedConfig,
          transfersPaused: false // Add missing required property
        },
        blockchain: 'polygon', // Default - should come from project settings
        environment: 'testnet' as 'mainnet' | 'testnet' // Fix type error
      };

      // Get deployment key (should come from user settings)
      const keyId = await this.getDeploymentKeyId(userId);
      
      const result = await foundryDeploymentService.deployToken(deploymentParams, userId, keyId);

      return {
        success: result.status === 'SUCCESS',
        tokenAddress: result.tokenAddress,
        transactionHash: result.transactionHash,
        deploymentStrategy: 'enhanced',
        optimizationUsed: true,
        totalGasUsed: 3500000, // Estimated for enhanced contract
        gasSavingsEstimate: 15000, // Estimate savings vs multiple transactions
        errors: result.status === 'SUCCESS' ? [] : [result.error || 'Enhanced deployment failed'],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        deploymentStrategy: 'enhanced',
        optimizationUsed: true,
        errors: [error instanceof Error ? error.message : 'Enhanced deployment failed'],
        warnings: []
      };
    }
  }

  /**
   * Execute chunked ERC-20 deployment (base + post-deployment configuration)
   */
  private async executeChunkedDeployment(
    config: EnhancedERC20Config,
    tokenId: string,
    userId: string,
    projectId: string
  ): Promise<UnifiedERC20DeploymentResult> {
    try {
      // Get deployment key (should come from user settings)
      const keyId = await this.getDeploymentKeyId(userId);
      
      const result = await enhancedERC20DeploymentService.deployEnhancedERC20(
        config,
        userId,
        keyId,
        'polygon', // Default - should come from project settings
        'testnet'  // Now properly typed
      );

      return {
        success: true,
        tokenAddress: result.tokenAddress,
        transactionHash: result.deploymentTx,
        deploymentStrategy: 'chunked',
        optimizationUsed: result.optimizationUsed,
        configurationTxs: result.configurationTxs,
        totalGasUsed: result.totalGasUsed,
        gasSavingsEstimate: result.gasSavingsEstimate,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        deploymentStrategy: 'chunked',
        optimizationUsed: true,
        errors: [error instanceof Error ? error.message : 'Chunked deployment failed'],
        warnings: []
      };
    }
  }

  /**
   * Get token configuration from database
   */
  private async getTokenConfiguration(tokenId: string): Promise<TokenFormData | null> {
    try {
      // This would query the database for token configuration
      // For now, return a mock configuration
      return {
        id: tokenId,
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        standard: 'ERC-20' as any,
        initialSupply: '1000000',
        isMintable: true,
        isBurnable: false,
        isPausable: false,
        erc20Properties: {
          id: tokenId,
          tokenId: tokenId,
          initialSupply: '1000000',
          isMintable: true,
          isBurnable: false,
          isPausable: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Failed to get token configuration:', error);
      return null;
    }
  }

  /**
   * Simplify configuration for single transaction deployment
   */
  private simplifyConfigurationForSingleTx(config: EnhancedERC20Config): any {
    return {
      ...config.baseConfig,
      // Include only features that can be set in constructor
      antiWhaleEnabled: config.antiWhaleConfig?.enabled ?? false,
      maxWalletAmount: config.antiWhaleConfig?.maxWalletAmount || '0',
      cooldownPeriod: config.antiWhaleConfig?.cooldownPeriod || 0,
      
      buyFeeEnabled: config.feeConfig?.buyFeeEnabled ?? false,
      sellFeeEnabled: config.feeConfig?.sellFeeEnabled ?? false,
      liquidityFeePercentage: config.feeConfig?.liquidityFeePercentage || 0,
      marketingFeePercentage: config.feeConfig?.marketingFeePercentage || 0,
      charityFeePercentage: config.feeConfig?.charityFeePercentage || 0,
      
      reflectionEnabled: config.tokenomicsConfig?.reflectionEnabled ?? false,
      reflectionPercentage: config.tokenomicsConfig?.reflectionPercentage || 0,
      deflationEnabled: config.tokenomicsConfig?.deflationEnabled ?? false,
      deflationRate: config.tokenomicsConfig?.deflationRate || 0,
      burnOnTransfer: config.tokenomicsConfig?.burnOnTransfer ?? false,
      burnPercentage: config.tokenomicsConfig?.burnPercentage || 0,
      
      blacklistEnabled: config.tradingConfig?.blacklistEnabled ?? false,
      tradingStartTime: config.tradingConfig?.tradingStartTime || 0,
      whitelistEnabled: config.tradingConfig?.whitelistEnabled ?? false,
      geographicRestrictionsEnabled: config.tradingConfig?.geographicRestrictionsEnabled ?? false,
      
      governanceEnabled: config.governanceConfig?.enabled ?? false,
      quorumPercentage: config.governanceConfig?.quorumPercentage || 0,
      proposalThreshold: config.governanceConfig?.proposalThreshold || '0',
      votingDelay: config.governanceConfig?.votingDelay || 1,
      votingPeriod: config.governanceConfig?.votingPeriod || 7,
      timelockDelay: config.governanceConfig?.timelockDelay || 2
    };
  }

  /**
   * Get deployment key ID for user
   */
  private async getDeploymentKeyId(userId: string): Promise<string> {
    // This would get the user's deployment key from the database
    // For now, return a default key ID
    return 'default-deployment-key';
  }

  /**
   * Get deployment cost estimate
   */
  async getDeploymentCostEstimate(tokenId: string): Promise<{
    basic: { gasCost: number; usdCost: number };
    enhanced: { gasCost: number; usdCost: number };
    chunked: { gasCost: number; usdCost: number };
    recommended: string;
  }> {
    const tokenData = await this.getTokenConfiguration(tokenId);
    if (!tokenData) {
      throw new Error('Token configuration not found');
    }

    const mappingResult = erc20ConfigurationMapper.mapTokenFormToEnhancedConfig(tokenData);
    if (!mappingResult.success || !mappingResult.config) {
      throw new Error('Invalid token configuration');
    }

    const gasPrice = 30; // 30 gwei
    const ethPrice = 3000; // $3000 per ETH

    const calculateUsd = (gasAmount: number) => {
      const ethCost = (gasAmount * gasPrice) / 1e9;
      return ethCost * ethPrice;
    };

    const basicGas = 2800000;
    const enhancedGas = 3500000;
    const chunkedGas = mappingResult.complexity.chunksRequired * 400000 + 2500000;

    const strategy = this.determineDeploymentStrategy(mappingResult.config, mappingResult.complexity, true);

    return {
      basic: {
        gasCost: basicGas,
        usdCost: calculateUsd(basicGas)
      },
      enhanced: {
        gasCost: enhancedGas,
        usdCost: calculateUsd(enhancedGas)
      },
      chunked: {
        gasCost: chunkedGas,
        usdCost: calculateUsd(chunkedGas)
      },
      recommended: strategy
    };
  }
}

// Export singleton instance
export const unifiedERC20DeploymentService = new UnifiedERC20DeploymentService();
