/**
 * Unified ERC-4626 Deployment Service
 * 
 * Main entry point for ERC-4626 vault deployments with automatic strategy selection
 * Provides cost estimation, deployment recommendations, and optimization
 */

import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/activityLogger';
import { erc4626ConfigurationMapper } from './erc4626ConfigurationMapper';
import { enhancedERC4626DeploymentService, EnhancedERC4626DeploymentResult } from './enhancedERC4626DeploymentService';
import { foundryDeploymentService } from './foundryDeploymentService';
import { DeploymentStatus } from '@/types/deployment/TokenDeploymentTypes';

/**
 * Unified deployment options
 */
export interface UnifiedERC4626DeploymentOptions {
  useOptimization?: boolean; // Default: true
  forceStrategy?: 'basic' | 'enhanced' | 'chunked' | 'auto'; // Default: auto
  enableAnalytics?: boolean; // Default: true
  enableValidation?: boolean; // Default: true
  enableProgressTracking?: boolean; // Default: true for chunked
}

/**
 * Deployment recommendation
 */
export interface ERC4626DeploymentRecommendation {
  recommendedStrategy: 'basic' | 'enhanced' | 'chunked';
  reasoning: string[];
  features: {
    strategies: number;
    allocations: number;
    feeTiers: number;
    performanceMetrics: number;
    institutionalGrade: boolean;
    riskManagement: boolean;
    yieldOptimization: boolean;
  };
  estimatedCost: {
    basic: { gas: number; usd: string };
    enhanced: { gas: number; usd: string };
    chunked: { gas: number; usd: string };
  };
  complexity: {
    level: string;
    score: number;
    featureCount: number;
  };
  warnings: string[];
  gasOptimization: {
    basic: { gas: number; reliability: string };
    enhanced: { gas: number; reliability: string };
    chunked: { gas: number; reliability: string };
  };
}

/**
 * Unified deployment result
 */
export interface UnifiedERC4626DeploymentResult extends EnhancedERC4626DeploymentResult {
  recommendation?: ERC4626DeploymentRecommendation;
  validationResults?: {
    configurationValid: boolean;
    securityChecks: string[];
    complianceChecks: string[];
  };
  progressTracking?: {
    totalSteps: number;
    completedSteps: number;
    currentStep: string;
    estimatedTimeRemaining: number;
  };
}

/**
 * Unified ERC-4626 Deployment Service
 */
export class UnifiedERC4626DeploymentService {

  /**
   * Deploy ERC-4626 vault with automatic strategy selection
   */
  async deployERC4626Token(
    tokenId: string,
    userId: string,
    projectId: string,
    options: UnifiedERC4626DeploymentOptions = {}
  ): Promise<UnifiedERC4626DeploymentResult> {
    const {
      useOptimization = true,
      forceStrategy = 'auto',
      enableAnalytics = true,
      enableValidation = true,
      enableProgressTracking = true
    } = options;

    const startTime = Date.now();

    try {
      // Step 1: Get deployment recommendation
      const recommendation = await this.getDeploymentRecommendation(tokenId);
      
      // Step 2: Determine strategy
      let selectedStrategy: 'basic' | 'enhanced' | 'chunked';
      
      if (forceStrategy === 'auto') {
        selectedStrategy = useOptimization 
          ? recommendation.recommendedStrategy 
          : 'basic';
      } else {
        selectedStrategy = forceStrategy;
      }

      // Step 3: Validate configuration if enabled
      let validationResults;
      if (enableValidation) {
        validationResults = await this.validateConfiguration(tokenId, selectedStrategy);
        
        if (!validationResults.configurationValid) {
          return {
            success: false,
            deploymentStrategy: selectedStrategy,
            error: 'Configuration validation failed',
            recommendation,
            validationResults,
            deploymentTimeMs: Date.now() - startTime
          };
        }
      }

      // Step 4: Log deployment start
      if (enableAnalytics) {
        await logActivity({
          action: 'unified_erc4626_deployment_start',
          entity_type: 'token',
          entity_id: tokenId,
          details: {
            strategy: selectedStrategy,
            useOptimization,
            complexity: recommendation.complexity,
            userId,
            projectId
          }
        });
      }

      // Step 5: Execute deployment based on strategy
      let deploymentResult: EnhancedERC4626DeploymentResult;

      if (selectedStrategy === 'basic') {
        deploymentResult = await this.deployBasicVault(tokenId, userId, projectId);
      } else {
        // Use enhanced deployment service for enhanced and chunked strategies
        deploymentResult = await enhancedERC4626DeploymentService.deployERC4626Token(
          tokenId,
          userId,
          projectId,
          useOptimization
        );
      }

      // Step 6: Add unified result metadata
      const unifiedResult: UnifiedERC4626DeploymentResult = {
        ...deploymentResult,
        recommendation,
        validationResults,
        deploymentTimeMs: Date.now() - startTime
      };

      // Step 7: Progress tracking for chunked deployments
      if (enableProgressTracking && selectedStrategy === 'chunked' && deploymentResult.configurationTxs) {
        const completedSteps = deploymentResult.configurationTxs.filter(tx => tx.status === 'success').length;
        const totalSteps = deploymentResult.configurationTxs.length + 1; // +1 for base deployment
        
        unifiedResult.progressTracking = {
          totalSteps,
          completedSteps: completedSteps + 1, // +1 for completed base deployment
          currentStep: completedSteps === deploymentResult.configurationTxs.length 
            ? 'deployment_complete' 
            : 'configuring_features',
          estimatedTimeRemaining: 0
        };
      }

      // Step 8: Log completion
      if (enableAnalytics) {
        await logActivity({
          action: 'unified_erc4626_deployment_complete',
          entity_type: 'token',
          entity_id: tokenId,
          details: {
            success: unifiedResult.success,
            strategy: selectedStrategy,
            tokenAddress: unifiedResult.tokenAddress,
            gasOptimization: unifiedResult.gasOptimization,
            deploymentTime: unifiedResult.deploymentTimeMs,
            configurationChunks: unifiedResult.configurationTxs?.length || 0,
            userId,
            projectId
          }
        });
      }

      return unifiedResult;

    } catch (error) {
      const errorResult: UnifiedERC4626DeploymentResult = {
        success: false,
        deploymentStrategy: 'basic',
        error: error instanceof Error ? error.message : 'Unknown deployment error',
        deploymentTimeMs: Date.now() - startTime
      };

      if (enableAnalytics) {
        await logActivity({
          action: 'unified_erc4626_deployment_error',
          entity_type: 'token',
          entity_id: tokenId,
          details: {
            error: errorResult.error,
            userId,
            projectId,
            deploymentTime: errorResult.deploymentTimeMs
          }
        });
      }

      return errorResult;
    }
  }

  /**
   * Get deployment recommendation for a token
   */
  async getDeploymentRecommendation(tokenId: string): Promise<ERC4626DeploymentRecommendation> {
    try {
      // Get token configuration
      const { data: token, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
      
      if (error || !token) {
        throw new Error('Token not found');
      }

      // Analyze configuration complexity
      const configResult = erc4626ConfigurationMapper.mapTokenFormToEnhancedConfig(token);
      const complexity = configResult.complexity;

      // Count features
      const features = {
        strategies: (token.blocks as any)?.vaultStrategies?.length || 0,
        allocations: (token.blocks as any)?.assetAllocations?.length || 0,
        feeTiers: (token.blocks as any)?.feeTiers?.length || 0,
        performanceMetrics: (token.blocks as any)?.performanceMetrics?.length || 0,
        institutionalGrade: (token.blocks as any)?.institutionalGrade || false,
        riskManagement: (token.blocks as any)?.riskManagementEnabled || false,
        yieldOptimization: (token.blocks as any)?.yieldOptimizationEnabled || false
      };

      // Calculate costs (mock gas prices)
      const gasPrice = 30; // gwei
      const ethPrice = 2000; // USD
      const gweiToEth = 1e-9;
      
      const calculateUSD = (gas: number) => {
        const ethCost = gas * gasPrice * gweiToEth;
        return (ethCost * ethPrice).toFixed(2);
      };

      const estimatedCost = {
        basic: {
          gas: complexity.gasEstimate.basic,
          usd: calculateUSD(complexity.gasEstimate.basic)
        },
        enhanced: {
          gas: complexity.gasEstimate.enhanced,
          usd: calculateUSD(complexity.gasEstimate.enhanced)
        },
        chunked: {
          gas: complexity.gasEstimate.chunked,
          usd: calculateUSD(complexity.gasEstimate.chunked)
        }
      };

      // Gas optimization analysis
      const gasOptimization = {
        basic: {
          gas: complexity.gasEstimate.basic,
          reliability: '95% success rate for simple configurations'
        },
        enhanced: {
          gas: complexity.gasEstimate.enhanced,
          reliability: '99% success rate with single-transaction deployment'
        },
        chunked: {
          gas: complexity.gasEstimate.chunked,
          reliability: '99.5% success rate with progressive configuration'
        }
      };

      return {
        recommendedStrategy: complexity.recommendedStrategy as any,
        reasoning: complexity.reasoning,
        features,
        estimatedCost,
        complexity: {
          level: complexity.level,
          score: complexity.score,
          featureCount: complexity.featureCount
        },
        warnings: complexity.warnings,
        gasOptimization
      };

    } catch (error) {
      // Return safe defaults if analysis fails
      return {
        recommendedStrategy: 'basic',
        reasoning: ['Analysis failed, defaulting to basic deployment'],
        features: {
          strategies: 0,
          allocations: 0,
          feeTiers: 0,
          performanceMetrics: 0,
          institutionalGrade: false,
          riskManagement: false,
          yieldOptimization: false
        },
        estimatedCost: {
          basic: { gas: 2800000, usd: '168.00' },
          enhanced: { gas: 2800000, usd: '168.00' },
          chunked: { gas: 2800000, usd: '168.00' }
        },
        complexity: {
          level: 'low',
          score: 0,
          featureCount: 0
        },
        warnings: [`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        gasOptimization: {
          basic: { gas: 2800000, reliability: 'Standard reliability' },
          enhanced: { gas: 2800000, reliability: 'Standard reliability' },
          chunked: { gas: 2800000, reliability: 'Standard reliability' }
        }
      };
    }
  }

  /**
   * Validate configuration for deployment
   */
  private async validateConfiguration(
    tokenId: string,
    strategy: 'basic' | 'enhanced' | 'chunked'
  ): Promise<{
    configurationValid: boolean;
    securityChecks: string[];
    complianceChecks: string[];
  }> {
    
    try {
      const { data: token, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
      
      if (error || !token) {
        return {
          configurationValid: false,
          securityChecks: ['Token not found'],
          complianceChecks: []
        };
      }

      const securityChecks: string[] = [];
      const complianceChecks: string[] = [];

      // Security validations
      if (!(token.blocks as any)?.assetAddress || !/^0x[a-fA-F0-9]{40}$/.test((token.blocks as any)?.assetAddress)) {
        securityChecks.push('Invalid or missing asset address');
      }

      if ((token.blocks as any)?.leverageEnabled && (!(token.blocks as any)?.maxLeverage || parseFloat((token.blocks as any)?.maxLeverage) > 10)) {
        securityChecks.push('Leverage configuration may pose high risk');
      }

      if ((token.blocks as any)?.institutionalGrade && !(token.blocks as any)?.custodyIntegration) {
        securityChecks.push('Institutional grade vaults should have custody integration');
      }

      // Compliance validations
      if ((token.blocks as any)?.institutionalGrade) {
        if (!(token.blocks as any)?.kycRequired) {
          complianceChecks.push('Institutional vaults typically require KYC');
        }
        
        if (!(token.blocks as any)?.complianceReportingEnabled) {
          complianceChecks.push('Institutional vaults should enable compliance reporting');
        }
      }

      if ((token.blocks as any)?.crossChainYieldEnabled && !(token.blocks as any)?.auditTrailComprehensive) {
        complianceChecks.push('Cross-chain features require comprehensive audit trails');
      }

      // Strategy-specific validations
      if (strategy === 'chunked') {
        const totalFeatures = ((token.blocks as any)?.vaultStrategies?.length || 0) +
                            ((token.blocks as any)?.assetAllocations?.length || 0) +
                            ((token.blocks as any)?.feeTiers?.length || 0);
        
        if (totalFeatures < 5) {
          securityChecks.push('Chunked deployment may be overkill for simple configurations');
        }
      }

      return {
        configurationValid: securityChecks.length === 0,
        securityChecks,
        complianceChecks
      };

    } catch (error) {
      return {
        configurationValid: false,
        securityChecks: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        complianceChecks: []
      };
    }
  }

  /**
   * Deploy basic vault using foundry service
   */
  private async deployBasicVault(
    tokenId: string,
    userId: string,
    projectId: string
  ): Promise<EnhancedERC4626DeploymentResult> {
    
    try {
      // Get token configuration
      const { data: token, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
      
      if (error || !token) {
        return {
          success: false,
          deploymentStrategy: 'basic',
          error: 'Token not found'
        };
      }

      // Convert to basic foundry config
      const foundryConfig = {
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals || 18,
        asset: (token.blocks as any)?.assetAddress,
        managementFee: Math.round((parseFloat((token.blocks as any)?.managementFee || '2')) * 100), // Convert to basis points
        performanceFee: Math.round((parseFloat((token.blocks as any)?.performanceFee || '20')) * 100),
        depositLimit: (token.blocks as any)?.depositLimit || '0',
        minDeposit: (token.blocks as any)?.minDeposit || '0',
        depositsEnabled: (token.blocks as any)?.depositsEnabled ?? true,
        withdrawalsEnabled: (token.blocks as any)?.withdrawalsEnabled ?? true,
        transfersPaused: false,
        initialOwner: token.deployed_by || userId
      };

      // Deploy using foundry service
      const deploymentResult = await foundryDeploymentService.deployToken(
        {
          tokenType: 'ERC4626',
          config: foundryConfig,
          blockchain: 'ethereum',
          environment: 'testnet'
        },
        userId,
        userId // Using userId as keyId for now
      );

      if (deploymentResult.status === DeploymentStatus.SUCCESS) {
        return {
          success: true,
          tokenAddress: deploymentResult.tokenAddress,
          deploymentTx: deploymentResult.transactionHash,
          deploymentStrategy: 'basic',
          optimizationUsed: false
        };
      } else {
        return {
          success: false,
          deploymentStrategy: 'basic',
          error: deploymentResult.error || 'Basic deployment failed'
        };
      }

    } catch (error) {
      return {
        success: false,
        deploymentStrategy: 'basic',
        error: error instanceof Error ? error.message : 'Basic deployment failed'
      };
    }
  }

  /**
   * Get cost estimate for different deployment strategies
   */
  async getDeploymentCostEstimate(tokenId: string): Promise<{
    basic: { gas: number; usd: string; time: string };
    enhanced: { gas: number; usd: string; time: string };
    chunked: { gas: number; usd: string; time: string };
    recommended: 'basic' | 'enhanced' | 'chunked';
  }> {
    
    try {
      const recommendation = await this.getDeploymentRecommendation(tokenId);
      
      return {
        basic: {
          gas: recommendation.estimatedCost.basic.gas,
          usd: recommendation.estimatedCost.basic.usd,
          time: '2-5 minutes'
        },
        enhanced: {
          gas: recommendation.estimatedCost.enhanced.gas,
          usd: recommendation.estimatedCost.enhanced.usd,
          time: '3-8 minutes'
        },
        chunked: {
          gas: recommendation.estimatedCost.chunked.gas,
          usd: recommendation.estimatedCost.chunked.usd,
          time: '8-15 minutes'
        },
        recommended: recommendation.recommendedStrategy
      };

    } catch (error) {
      // Return safe defaults
      return {
        basic: { gas: 2800000, usd: '168.00', time: '2-5 minutes' },
        enhanced: { gas: 2800000, usd: '168.00', time: '3-8 minutes' },
        chunked: { gas: 2800000, usd: '168.00', time: '8-15 minutes' },
        recommended: 'basic'
      };
    }
  }

  /**
   * Validate deployment requirements before deployment
   */
  async validateDeploymentRequirements(tokenId: string): Promise<{
    canDeploy: boolean;
    requirements: {
      name: string;
      description: string;
      status: 'met' | 'missing' | 'warning';
      required: boolean;
    }[];
  }> {
    
    try {
      const { data: token, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
      
      if (error || !token) {
        return {
          canDeploy: false,
          requirements: [{
            name: 'Token Configuration',
            description: 'Valid token configuration is required',
            status: 'missing',
            required: true
          }]
        };
      }

      const requirements = [
        {
          name: 'Vault Name',
          description: 'A name for the vault token',
          status: (token.name && token.name.trim() !== '') ? 'met' : 'missing' as 'met' | 'missing',
          required: true
        },
        {
          name: 'Vault Symbol',
          description: 'A symbol for the vault token',
          status: (token.symbol && token.symbol.trim() !== '') ? 'met' : 'missing' as 'met' | 'missing',
          required: true
        },
        {
          name: 'Asset Address',
          description: 'Address of the underlying asset token',
          status: ((token.blocks as any)?.assetAddress && /^0x[a-fA-F0-9]{40}$/.test((token.blocks as any)?.assetAddress)) ? 'met' : 'missing' as 'met' | 'missing',
          required: true
        },
        {
          name: 'Fee Configuration',
          description: 'Management and performance fee settings',
          status: 'met' as 'met', // Always met since defaults are used
          required: false
        },
        {
          name: 'Deposit Limits',
          description: 'Minimum and maximum deposit configurations',
          status: 'met' as 'met', // Always met since defaults are used
          required: false
        },
        {
          name: 'Institutional Compliance',
          description: 'KYC and accredited investor requirements for institutional vaults',
          status: (token.blocks as any)?.institutionalGrade ? 
            ((token.blocks as any)?.kycRequired ? 'met' : 'warning') : 
            'met' as 'met' | 'warning',
          required: false
        }
      ];

      const canDeploy = requirements
        .filter(req => req.required)
        .every(req => req.status === 'met');

      return {
        canDeploy,
        requirements
      };

    } catch (error) {
      return {
        canDeploy: false,
        requirements: [{
          name: 'Validation Error',
          description: `Error validating requirements: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'missing',
          required: true
        }]
      };
    }
  }
}

// Export singleton instance
export const unifiedERC4626DeploymentService = new UnifiedERC4626DeploymentService();
