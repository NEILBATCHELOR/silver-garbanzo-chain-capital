/**
 * Unified ERC-3525 Deployment Service
 * 
 * Provides automatic strategy selection and optimization for ERC-3525 semi-fungible tokens
 * Similar to other unified deployment services but specialized for ERC-3525 advanced features
 */

import { enhancedERC3525DeploymentService, type ERC3525DeploymentOptions, type ERC3525DeploymentResult } from './enhancedERC3525DeploymentService';
import { erc3525ConfigurationMapper, type ComplexityAnalysis } from './erc3525ConfigurationMapper';
import { foundryDeploymentService } from './foundryDeploymentService';
import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/activityLogger';

export interface UnifiedERC3525DeploymentOptions {
  useOptimization?: boolean; // Default: true
  forceStrategy?: 'basic' | 'enhanced' | 'chunked' | 'auto'; // Default: auto
  enableAnalytics?: boolean; // Default: true
  enableValidation?: boolean; // Default: true
  enableProgressTracking?: boolean; // Default: true
}

export interface UnifiedERC3525DeploymentResult extends ERC3525DeploymentResult {
  optimizationUsed: boolean;
  recommendationFollowed: boolean;
  alternativeStrategies?: {
    basic: { estimatedCost: number; estimatedTime: number };
    enhanced: { estimatedCost: number; estimatedTime: number };
    chunked: { estimatedCost: number; estimatedTime: number };
  };
}

/**
 * Unified ERC-3525 Deployment Service
 * Automatic strategy selection and optimization for semi-fungible tokens
 */
export class UnifiedERC3525DeploymentService {
  
  /**
   * Deploy ERC-3525 token with automatic optimization and strategy selection
   */
  async deployERC3525Token(
    tokenId: string,
    userId: string,
    projectId: string,
    options: UnifiedERC3525DeploymentOptions = {}
  ): Promise<UnifiedERC3525DeploymentResult> {
    const {
      useOptimization = true,
      forceStrategy = 'auto',
      enableAnalytics = true,
      enableValidation = true,
      enableProgressTracking = true
    } = options;

    try {
      // Step 1: Get deployment recommendations
      const recommendations = await this.getDeploymentRecommendations(tokenId);
      
      // Step 2: Determine final strategy
      const finalStrategy = forceStrategy === 'auto' 
        ? (useOptimization ? recommendations.recommendedStrategy : 'basic')
        : forceStrategy;

      const recommendationFollowed = forceStrategy === 'auto' && useOptimization;

      // Step 3: Get blockchain and environment info
      const { data: token } = await supabase
        .from('tokens')
        .select('blockchain, deployment_environment, deployed_by')
        .eq('id', tokenId)
        .single();

      const blockchain = token?.blockchain || 'polygon';
      const environment = (token?.deployment_environment || 'testnet') as 'mainnet' | 'testnet';
      const keyId = token?.deployed_by || userId;

      // Step 4: Log deployment start
      if (enableAnalytics) {
        await this.logUnifiedDeploymentStart(tokenId, finalStrategy, recommendations.complexity);
      }

      // Step 5: Execute deployment
      const deploymentOptions: ERC3525DeploymentOptions = {
        forceStrategy: finalStrategy,
        enableValidation,
        enableProgressTracking,
        chunkDelay: 2000,
        maxRetries: 3
      };

      const deploymentResult = await enhancedERC3525DeploymentService.deployERC3525Token(
        tokenId,
        userId,
        keyId,
        blockchain,
        environment,
        deploymentOptions
      );

      // Step 6: Prepare unified result
      const unifiedResult: UnifiedERC3525DeploymentResult = {
        ...deploymentResult,
        optimizationUsed: useOptimization && finalStrategy !== 'basic',
        recommendationFollowed,
        alternativeStrategies: this.calculateAlternativeStrategies(recommendations.complexity)
      };

      // Step 7: Log completion
      if (enableAnalytics) {
        await this.logUnifiedDeploymentCompletion(tokenId, unifiedResult);
      }

      return unifiedResult;

    } catch (error) {
      console.error('Unified ERC3525 deployment failed:', error);
      
      const failedResult: UnifiedERC3525DeploymentResult = {
        success: false,
        deploymentStrategy: forceStrategy === 'auto' ? 'basic' : forceStrategy as any,
        optimizationUsed: false,
        recommendationFollowed: false,
        errors: [error instanceof Error ? error.message : 'Unknown deployment error']
      };

      if (enableAnalytics) {
        await this.logUnifiedDeploymentCompletion(tokenId, failedResult);
      }

      return failedResult;
    }
  }

  /**
   * Get deployment recommendations for a token without deploying
   */
  async getDeploymentRecommendations(tokenId: string): Promise<{
    recommendedStrategy: 'basic' | 'enhanced' | 'chunked';
    reasoning: string[];
    complexity: ComplexityAnalysis;
    warnings: string[];
    estimatedCost: {
      basic: number;
      enhanced: number;
      chunked: number;
      recommended: string;
    };
    estimatedTime: {
      basic: number; // minutes
      enhanced: number;
      chunked: number;
      recommended: string;
    };
    features: {
      slots: number;
      allocations: number;
      paymentSchedules: number;
      valueAdjustments: number;
      advancedFeatures: string[];
    };
  }> {
    try {
      const recommendations = await enhancedERC3525DeploymentService.getDeploymentRecommendations(tokenId);
      
      // Calculate estimated deployment times (in minutes)
      const estimatedTime = {
        basic: 2 + (recommendations.complexity.score * 0.01),
        enhanced: 5 + (recommendations.complexity.score * 0.015),
        chunked: 8 + (recommendations.complexity.estimatedChunks * 2),
        recommended: ''
      };
      
      estimatedTime.recommended = recommendations.recommendedStrategy;

      // Get features info
      const { data: token } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();

      const { data: properties } = await supabase
        .from('token_erc3525_properties')
        .select('*')
        .eq('token_id', tokenId)
        .single();

      const features = {
        slots: (token as any)?.slots?.length || 0,
        allocations: (token as any)?.allocations?.length || 0,
        paymentSchedules: (token as any)?.payment_schedules?.length || 0,
        valueAdjustments: (token as any)?.value_adjustments?.length || 0,
        advancedFeatures: this.extractAdvancedFeatures(properties)
      };

      return {
        ...recommendations,
        estimatedCost: {
          ...recommendations.estimatedCost,
          recommended: recommendations.recommendedStrategy
        },
        estimatedTime,
        features
      };

    } catch (error) {
      throw new Error(`Failed to get deployment recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze token complexity without deploying
   */
  async analyzeTokenComplexity(tokenId: string): Promise<{
    complexity: ComplexityAnalysis;
    shouldUseOptimization: boolean;
    recommendations: string[];
  }> {
    try {
      // Get token data
      const { data: token } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();

      const { data: properties } = await supabase
        .from('token_erc3525_properties')
        .select('*')
        .eq('token_id', tokenId)
        .single();

      // Prepare token form and analyze
      const tokenForm = this.prepareTokenForm(token, properties);
      const mappingResult = erc3525ConfigurationMapper.mapTokenFormToEnhancedConfig(tokenForm);

      if (!mappingResult.success) {
        throw new Error('Failed to analyze token configuration');
      }

      const complexity = mappingResult.complexity;
      const shouldUseOptimization = complexity.level !== 'low' || complexity.requiresChunking;

      const recommendations = [
        `Complexity level: ${complexity.level}`,
        `Feature count: ${complexity.featureCount}`,
        `Estimated chunks: ${complexity.estimatedChunks}`,
        ...complexity.reasons
      ];

      if (shouldUseOptimization) {
        recommendations.push('Optimization recommended for this configuration');
      }

      return {
        complexity,
        shouldUseOptimization,
        recommendations
      };

    } catch (error) {
      throw new Error(`Failed to analyze complexity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if token has advanced ERC-3525 features
   */
  async hasAdvancedFeatures(tokenId: string): Promise<{
    hasAdvanced: boolean;
    features: string[];
    reason: string;
  }> {
    try {
      const analysis = await this.analyzeTokenComplexity(tokenId);
      
      const hasAdvanced = analysis.complexity.level !== 'low' || 
                         analysis.complexity.featureCount > 3 ||
                         analysis.complexity.requiresChunking;

      const features = analysis.recommendations.filter(r => 
        r.includes('enabled') || r.includes('configured') || r.includes('features')
      );

      let reason = 'Standard ERC-3525 configuration';
      if (hasAdvanced) {
        reason = `Advanced features detected: ${analysis.complexity.level} complexity with ${analysis.complexity.featureCount} features`;
      }

      return {
        hasAdvanced,
        features,
        reason
      };

    } catch (error) {
      return {
        hasAdvanced: false,
        features: [],
        reason: 'Analysis failed - assuming basic configuration'
      };
    }
  }

  /**
   * Get cost estimation for different strategies
   */
  async getCostEstimation(tokenId: string): Promise<{
    basic: { gasCost: number; usdCost: number; reliability: string };
    enhanced: { gasCost: number; usdCost: number; reliability: string };
    chunked: { gasCost: number; usdCost: number; reliability: string };
    recommended: string;
    savings: {
      enhancedVsBasic: number;
      chunkedVsBasic: number;
      chunkedVsEnhanced: number;
    };
  }> {
    try {
      const recommendations = await this.getDeploymentRecommendations(tokenId);
      
      // Convert gas to USD (approximate)
      const gasPrice = 30; // gwei
      const ethPrice = 2500; // USD
      const gasToUsd = (gas: number) => (gas * gasPrice * ethPrice) / 1e18;

      const estimation = {
        basic: {
          gasCost: recommendations.estimatedCost.basic,
          usdCost: gasToUsd(recommendations.estimatedCost.basic),
          reliability: '95%'
        },
        enhanced: {
          gasCost: recommendations.estimatedCost.enhanced,
          usdCost: gasToUsd(recommendations.estimatedCost.enhanced),
          reliability: '98%'
        },
        chunked: {
          gasCost: recommendations.estimatedCost.chunked,
          usdCost: gasToUsd(recommendations.estimatedCost.chunked),
          reliability: '99.5%'
        },
        recommended: recommendations.recommendedStrategy,
        savings: {
          enhancedVsBasic: recommendations.estimatedCost.basic - recommendations.estimatedCost.enhanced,
          chunkedVsBasic: recommendations.estimatedCost.basic - recommendations.estimatedCost.chunked,
          chunkedVsEnhanced: recommendations.estimatedCost.enhanced - recommendations.estimatedCost.chunked
        }
      };

      return estimation;

    } catch (error) {
      throw new Error(`Failed to estimate costs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate token configuration before deployment
   */
  async validateConfiguration(tokenId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    try {
      // Get token data
      const { data: token } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();

      const { data: properties } = await supabase
        .from('token_erc3525_properties')
        .select('*')
        .eq('token_id', tokenId)
        .single();

      // Prepare and validate configuration
      const tokenForm = this.prepareTokenForm(token, properties);
      const mappingResult = erc3525ConfigurationMapper.mapTokenFormToEnhancedConfig(tokenForm);

      const recommendations = [];
      
      if (mappingResult.complexity.level === 'high' || mappingResult.complexity.level === 'extreme') {
        recommendations.push('Consider chunked deployment for better reliability');
      }
      
      if (mappingResult.complexity.featureCount > 10) {
        recommendations.push('Large number of features - ensure all are necessary');
      }

      const slotsCount = (token as any)?.slots?.length || 0;
      const allocationsCount = (token as any)?.allocations?.length || 0;
      
      if (slotsCount > 20) {
        recommendations.push('Large number of slots may increase deployment time');
      }
      
      if (allocationsCount > 50) {
        recommendations.push('Large number of allocations may require chunked deployment');
      }

      return {
        valid: mappingResult.success,
        errors: mappingResult.errors || [],
        warnings: mappingResult.warnings || [],
        recommendations
      };

    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        warnings: [],
        recommendations: []
      };
    }
  }

  /**
   * Prepare token form data from database records
   */
  private prepareTokenForm(token: any, properties: any): any {
    return {
      name: token?.name || '',
      symbol: token?.symbol || '',
      description: token?.description || '',
      valueDecimals: properties?.value_decimals || 18,
      
      // Extract properties
      ...(properties && typeof properties === 'object' ? properties : {}),
      
      // Related data
      slots: (token as any)?.slots || [],
      allocations: (token as any)?.allocations || [],
      paymentSchedules: (token as any)?.payment_schedules || [],
      valueAdjustments: (token as any)?.value_adjustments || [],
      slotConfigs: (token as any)?.slot_configs || []
    };
  }

  /**
   * Extract advanced features from properties
   */
  private extractAdvancedFeatures(properties: any): string[] {
    if (!properties) return [];

    const features: string[] = [];
    
    // Check boolean features
    const booleanFeatures = [
      'yieldFarmingEnabled', 'flashLoanEnabled', 'slotVotingEnabled',
      'regulatoryComplianceEnabled', 'kycRequired', 'multiSignatureRequired',
      'institutionalCustodySupport', 'slotMarketplaceEnabled'
    ];

    booleanFeatures.forEach(feature => {
      if (properties[feature] === true) {
        features.push(feature);
      }
    });

    // Check complex features
    if (properties.financialInstrumentType) {
      features.push(`financialInstrument:${properties.financialInstrumentType}`);
    }
    
    if (properties.derivativeType) {
      features.push(`derivative:${properties.derivativeType}`);
    }
    
    if (properties.valueComputationMethod) {
      features.push('valueComputation');
    }

    return features;
  }

  /**
   * Calculate alternative strategies performance
   */
  private calculateAlternativeStrategies(complexity: ComplexityAnalysis) {
    const baseGas = 2500000;
    const complexityMultiplier = complexity.score * 100;

    return {
      basic: {
        estimatedCost: baseGas + complexityMultiplier,
        estimatedTime: 2 // minutes
      },
      enhanced: {
        estimatedCost: baseGas * 1.2 + (complexityMultiplier * 0.8),
        estimatedTime: 5
      },
      chunked: {
        estimatedCost: baseGas * 1.4 + (complexityMultiplier * 0.6),
        estimatedTime: 8 + (complexity.estimatedChunks * 2)
      }
    };
  }

  /**
   * Log unified deployment start
   */
  private async logUnifiedDeploymentStart(
    tokenId: string,
    strategy: string,
    complexity: ComplexityAnalysis
  ): Promise<void> {
    await logActivity({
      action: 'unified_erc3525_deployment_started',
      entity_type: 'token',
      entity_id: tokenId,
      details: {
        service: 'unifiedERC3525DeploymentService',
        strategy,
        complexity: {
          level: complexity.level,
          score: complexity.score,
          featureCount: complexity.featureCount,
          requiresChunking: complexity.requiresChunking,
          estimatedChunks: complexity.estimatedChunks,
          reasons: complexity.reasons
        },
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log unified deployment completion
   */
  private async logUnifiedDeploymentCompletion(
    tokenId: string,
    result: UnifiedERC3525DeploymentResult
  ): Promise<void> {
    await logActivity({
      action: 'unified_erc3525_deployment_completed',
      entity_type: 'token',
      entity_id: result.tokenAddress || tokenId,
      details: {
        service: 'unifiedERC3525DeploymentService',
        success: result.success,
        strategy: result.deploymentStrategy,
        optimizationUsed: result.optimizationUsed,
        recommendationFollowed: result.recommendationFollowed,
        deploymentTimeMs: result.deploymentTimeMs,
        slotsDeployed: result.slotsDeployed,
        allocationsDeployed: result.allocationsDeployed,
        advancedFeaturesEnabled: result.advancedFeaturesEnabled,
        gasOptimization: result.gasOptimization,
        configurationTxs: result.configurationTxs?.length || 0,
        errors: result.errors,
        warnings: result.warnings,
        timestamp: new Date().toISOString()
      },
      status: result.success ? 'completed' : 'error'
    });
  }
}

// Export singleton instance
export const unifiedERC3525DeploymentService = new UnifiedERC3525DeploymentService();
