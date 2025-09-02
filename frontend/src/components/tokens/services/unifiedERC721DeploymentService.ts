/**
 * Unified ERC-721 Deployment Service
 * 
 * Main entry point for all ERC-721 NFT deployments with automatic strategy selection
 * Provides intelligent routing between basic, enhanced, and chunked deployment approaches
 */

import { enhancedERC721DeploymentService, ERC721DeploymentResult } from './enhancedERC721DeploymentService';
import { enhancedTokenDeploymentService } from './tokenDeploymentService';
import { erc721ConfigurationMapper } from './erc721ConfigurationMapper';
import { logActivity } from '@/infrastructure/activityLogger';
import { supabase } from '@/infrastructure/database/client';

export interface UnifiedERC721DeploymentOptions {
  useOptimization?: boolean;
  forceStrategy?: 'auto' | 'basic' | 'enhanced' | 'chunked';
  enableAnalytics?: boolean;
  maxRetries?: number;
}

export interface ERC721DeploymentRecommendation {
  recommendedStrategy: 'basic' | 'enhanced' | 'chunked';
  reasoning: string;
  complexity: {
    level: 'low' | 'medium' | 'high' | 'extreme';
    score: number;
    featureCount: number;
  };
  estimatedGasSavings: number;
  estimatedCost: {
    basic: string;
    enhanced: string;
    chunked: string;
  };
  warnings: string[];
}

export class UnifiedERC721DeploymentService {
  
  /**
   * Deploy ERC-721 token with automatic optimization
   */
  async deployERC721Token(
    tokenId: string,
    userId: string,
    projectId: string,
    options: UnifiedERC721DeploymentOptions = {}
  ): Promise<ERC721DeploymentResult> {
    
    const {
      useOptimization = true,
      forceStrategy = 'auto',
      enableAnalytics = true,
      maxRetries = 3
    } = options;

    try {
      // Get token data and project info
      const { tokenData, keyId, blockchain, environment } = await this.getDeploymentInfo(tokenId, projectId);
      
      // Analyze configuration and get recommendations
      const shouldUseOptimization = await this.shouldUseERC721Optimization(tokenId, useOptimization);
      
      let deploymentResult: ERC721DeploymentResult;
      
      if (shouldUseOptimization && forceStrategy !== 'basic') {
        // Use enhanced deployment service with automatic strategy selection
        deploymentResult = await enhancedERC721DeploymentService.deployERC721WithOptimization(
          tokenId,
          userId,
          keyId,
          blockchain,
          environment
        );
        
        // Add optimization metadata
        deploymentResult.gasOptimization = deploymentResult.gasOptimization || {
          estimatedSavings: 0,
          reliabilityImprovement: 'Enhanced deployment provides better reliability'
        };
        
      } else {
        // Fallback to basic deployment via existing service
        deploymentResult = await this.deployBasicERC721(tokenId, userId, projectId);
      }

      // Log deployment analytics if enabled
      if (enableAnalytics) {
        await this.logDeploymentAnalytics(tokenId, userId, deploymentResult);
      }

      // Update token record with deployment info
      await this.updateTokenDeploymentRecord(tokenId, deploymentResult);

      return deploymentResult;

    } catch (error) {
      console.error('Unified ERC-721 deployment failed:', error);
      
      await logActivity({
        action: 'unified_erc721_deployment_failed',
        entity_type: 'token',
        entity_id: tokenId,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          projectId,
          options
        },
        status: 'error'
      });

      // Return failed result instead of throwing
      return {
        success: false,
        tokenAddress: '',
        deploymentTx: '',
        totalGasUsed: 0,
        deploymentTimeMs: 0,
        deploymentStrategy: 'basic'
      };
    }
  }

  /**
   * Get deployment recommendations without deploying
   */
  async getDeploymentRecommendation(tokenId: string): Promise<ERC721DeploymentRecommendation> {
    try {
      const tokenData = await this.getTokenData(tokenId);
      
      // Map configuration and analyze complexity
      const mappingResult = erc721ConfigurationMapper.mapTokenFormToEnhancedConfig(tokenData);
      const recommendations = erc721ConfigurationMapper.getDeploymentRecommendations(mappingResult);
      
      // Get cost estimates
      const costEstimate = await enhancedERC721DeploymentService.getDeploymentCostEstimate(tokenId);
      
      return {
        recommendedStrategy: recommendations.strategy,
        reasoning: recommendations.reasoning,
        complexity: {
          level: mappingResult.complexity.level,
          score: mappingResult.complexity.score,
          featureCount: mappingResult.complexity.featureCount
        },
        estimatedGasSavings: recommendations.estimatedGasSavings,
        estimatedCost: {
          basic: `$${costEstimate.basic.usdCost}`,
          enhanced: `$${costEstimate.enhanced.usdCost}`,
          chunked: `$${costEstimate.chunked.usdCost}`
        },
        warnings: recommendations.warnings
      };
      
    } catch (error) {
      console.error('Error getting deployment recommendation:', error);
      
      return {
        recommendedStrategy: 'basic',
        reasoning: 'Unable to analyze configuration, using basic deployment',
        complexity: { level: 'low', score: 0, featureCount: 0 },
        estimatedGasSavings: 0,
        estimatedCost: { basic: '$0', enhanced: '$0', chunked: '$0' },
        warnings: ['Configuration analysis failed']
      };
    }
  }

  /**
   * Check if ERC-721 token should use optimization
   */
  private async shouldUseERC721Optimization(tokenId: string, useOptimization: boolean): Promise<boolean> {
    if (!useOptimization) return false;

    try {
      const tokenData = await this.getTokenData(tokenId);
      
      // Quick feature detection for ERC-721 advanced features
      const hasAdvancedFeatures = this.hasERC721AdvancedFeatures(tokenData);
      
      if (hasAdvancedFeatures) {
        // Deep analysis using configuration mapper
        const mappingResult = erc721ConfigurationMapper.mapTokenFormToEnhancedConfig(tokenData);
        
        // Use optimization if complexity is medium or higher
        return mappingResult.complexity.level !== 'low' || 
               mappingResult.complexity.featureCount > 3 ||
               mappingResult.complexity.requiresChunking;
      }
      
      return false;
      
    } catch (error) {
      console.warn('Error analyzing ERC-721 features, using basic deployment:', error);
      return false;
    }
  }

  /**
   * Quick detection of ERC-721 advanced features
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
   * Fallback to basic ERC-721 deployment
   */
  private async deployBasicERC721(
    tokenId: string,
    userId: string,
    projectId: string
  ): Promise<ERC721DeploymentResult> {
    
    // Use existing enhanced token deployment service
    const result = await enhancedTokenDeploymentService.deployToken(tokenId, userId, projectId);
    
    // Convert to ERC721DeploymentResult format
    return {
      success: result.status === 'SUCCESS',
      tokenAddress: result.tokenAddress || '',
      deploymentTx: result.transactionHash || '',
      totalGasUsed: 3000000, // Estimated basic deployment gas
      deploymentTimeMs: result.timestamp ? Date.now() - new Date(result.timestamp).getTime() : 0,
      deploymentStrategy: 'basic'
    };
  }

  /**
   * Get deployment information from database
   */
  private async getDeploymentInfo(tokenId: string, projectId: string) {
    // Get token data
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (tokenError) throw new Error(`Token not found: ${tokenError.message}`);

    // Get project data for deployment settings
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) throw new Error(`Project not found: ${projectError.message}`);

    return {
      tokenData,
      keyId: 'default', // Projects table doesn't have deployment_key_id
      blockchain: projectData.blockchain_network || 'polygon',
      environment: 'testnet' // Projects table doesn't have environment field
    };
  }

  /**
   * Get token data from database
   */
  private async getTokenData(tokenId: string): Promise<any> {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (error) throw new Error(`Token not found: ${error.message}`);
    return data;
  }

  /**
   * Log deployment analytics
   */
  private async logDeploymentAnalytics(
    tokenId: string,
    userId: string,
    result: ERC721DeploymentResult
  ): Promise<void> {
    await logActivity({
      action: 'erc721_deployment_analytics',
      entity_type: 'token',
      entity_id: result.tokenAddress,
      details: {
        tokenId,
        userId,
        strategy: result.deploymentStrategy,
        complexity: result.complexity?.level,
        totalGasUsed: result.totalGasUsed,
        deploymentTimeMs: result.deploymentTimeMs,
        featuresEnabled: result.complexity?.featureCount || 0,
        chunksUsed: result.configurationTxs?.length || 0,
        gasOptimization: result.gasOptimization,
        success: result.success
      }
    });
  }

  /**
   * Update token deployment record
   */
  private async updateTokenDeploymentRecord(
    tokenId: string,
    result: ERC721DeploymentResult
  ): Promise<void> {
    if (!result.success) return;

    const { error } = await supabase
      .from('tokens')
      .update({
        address: result.tokenAddress,
        deployment_transaction: result.deploymentTx,
        deployment_status: 'deployed',
        deployment_timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenId);

    if (error) {
      console.error('Failed to update token deployment record:', error);
    }
  }

  /**
   * Get deployment history for analytics
   */
  async getDeploymentHistory(
    userId?: string,
    limit: number = 10
  ): Promise<Array<{
    tokenId: string;
    tokenName: string;
    strategy: string;
    gasUsed: number;
    deploymentTime: number;
    success: boolean;
    deployedAt: string;
  }>> {
    
    let query = supabase
      .from('tokens')
      .select(`
        id,
        name,
        deployment_status,
        deployment_timestamp,
        deployment_transaction
      `)
      .eq('standard', 'ERC-721')
      .not('address', 'is', null)
      .order('deployment_timestamp', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('deployed_by', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching deployment history:', error);
      return [];
    }

    return (data || []).map(item => ({
      tokenId: item.id,
      tokenName: item.name,
      strategy: 'basic', // Default since we don't store strategy
      gasUsed: 0, // Not stored currently
      deploymentTime: 0, // Could be calculated if we store more timing data
      success: item.deployment_status === 'deployed',
      deployedAt: item.deployment_timestamp
    }));
  }

  /**
   * Get deployment statistics
   */
  async getDeploymentStatistics(): Promise<{
    total: number;
    byStrategy: Record<string, number>;
    avgGasUsed: Record<string, number>;
    successRate: number;
  }> {
    
    const { data, error } = await supabase
      .from('tokens')
      .select('deployment_status')
      .eq('standard', 'ERC-721')
      .not('address', 'is', null);

    if (error) {
      console.error('Error fetching deployment statistics:', error);
      return {
        total: 0,
        byStrategy: {},
        avgGasUsed: {},
        successRate: 0
      };
    }

    const deployments = data || [];
    const total = deployments.length;
    const successful = deployments.filter(d => d.deployment_status === 'deployed').length;
    
    // Since we don't store strategy and gas info, provide basic stats
    const byStrategy: Record<string, number> = {
      basic: total // All deployments are considered basic for now
    };
    
    const avgGasUsed: Record<string, number> = {
      basic: 3000000 // Estimated basic deployment gas
    };

    return {
      total,
      byStrategy,
      avgGasUsed,
      successRate: total > 0 ? successful / total : 0
    };
  }
}

// Export singleton instance
export const unifiedERC721DeploymentService = new UnifiedERC721DeploymentService();
