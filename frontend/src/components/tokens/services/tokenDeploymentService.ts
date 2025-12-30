/**
 * Enhanced Token Deployment Service
 * 
 * Provides an enhanced API for token deployment with rate limiting, security validation,
 * and Foundry integration for modern smart contract deployment
 */

import { foundryDeploymentService } from './foundryDeploymentService';
import { supabase } from '@/infrastructure/database/client';
import { TokenDeploymentParams } from '@/components/tokens/interfaces/TokenInterfaces';
import { validateTokenConfiguration, checkTokenSecurityVulnerabilities } from '../utils/tokenConfigValidator';
import { mapTokenToFoundryConfig, validateFoundryConfig, tokenStandardToFoundryType } from '../utils/foundryConfigMapper';
import { TokenStandard } from '@/types/core/centralModels';
import { NetworkEnvironment } from '@/infrastructure/web3/ProviderManager';
import { DeploymentStatus, DeploymentResult } from '@/types/deployment/TokenDeploymentTypes';

// Rate limit configuration
// Note: Set higher limits for development, adjust for production
const RATE_LIMIT = {
  MAX_DEPLOYMENTS_PER_HOUR: 20,  // Increased from 5 for development
  MAX_DEPLOYMENTS_PER_DAY: 50    // Increased from 20 for development
};

// Deployment strategy configuration
const DEPLOYMENT_STRATEGY = {
  USE_FOUNDRY_FOR_NEW_DEPLOYMENTS: true,
  FALLBACK_TO_LEGACY: true,
  SUPPORTED_FOUNDRY_STANDARDS: ['ERC-20', 'ERC-721', 'ERC-1155', 'ERC-4626', 'ERC-3525']
};

/**
 * Interface for security validation result
 */
export interface SecurityValidationResult {
  hasIssues: boolean;
  findings: Array<{
    severity: 'high' | 'medium' | 'low';
    issue: string;
    recommendation: string;
  }>;
}

/**
 * Enhanced token deployment service with Foundry integration
 */
export const enhancedTokenDeploymentService = {
  /**
   * Deploy a token with enhanced validation and rate limiting
   * @param tokenId ID of the token to deploy
   * @param userId ID of the user deploying the token
   * @param projectId ID of the project
   * @param useFoundry Whether to use Foundry contracts (optional, defaults to auto-detect)
   * @param walletAddress Optional wallet address to use for deployment (overrides project wallet lookup)
   * @param gasConfig Optional gas configuration for the deployment
   * @returns Promise with deployment result
   */
  async deployToken(
    tokenId: string,
    userId: string,
    projectId: string,
    useFoundry?: boolean,
    walletAddress?: string,
    gasConfig?: any
  ): Promise<DeploymentResult> {
    try {
      // Check rate limits before proceeding
      const rateLimitResult = await this.checkRateLimits(userId, projectId);
      
      if (!rateLimitResult.allowed) {
        return {
          status: DeploymentStatus.FAILED,
          error: rateLimitResult.reason
        };
      }
      
      // Get token details from the database
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
      
      // Parse token configuration from blocks
      const tokenConfig = token.blocks || {};
      const tokenStandard = token.standard as TokenStandard;
      
      // Normalize configuration: Ensure required fields are set from token record or blocks
      // Name and Symbol - use token record if not in blocks
      if (!tokenConfig.name) {
        tokenConfig.name = token.name;
      }
      if (!tokenConfig.symbol) {
        tokenConfig.symbol = token.symbol;
      }
      // Decimals - default to 18 if not specified
      if (tokenConfig.decimals === undefined && tokenStandard === 'ERC-20') {
        tokenConfig.decimals = token.decimals || 18;
      }
      // InitialSupply - Priority: blocks.initialSupply > blocks.initial_supply > token.total_supply
      if (!tokenConfig.initialSupply) {
        tokenConfig.initialSupply = tokenConfig.initial_supply || token.total_supply || '0';
      }
      
      // Validate token configuration
      const validationResult = validateTokenConfiguration(tokenConfig, tokenStandard);
      
      if (!validationResult.success) {
        const errorMessages = validationResult.errors?.map(err => `${err.path}: ${err.message}`).join(', ');
        return {
          status: DeploymentStatus.FAILED,
          error: `Invalid token configuration: ${errorMessages}`
        };
      }
      
      // Record deployment attempt for rate limiting
      await this.recordDeploymentAttempt(userId, projectId, tokenId);
      
      // Get deployment parameters from the token
      const blockchain = token.blockchain || 'ethereum';
      const environment = token.deployment_environment as NetworkEnvironment || NetworkEnvironment.TESTNET;
      const deploymentEnv = environment === NetworkEnvironment.MAINNET ? 'mainnet' : 'testnet';
      
      // Determine deployment strategy
      const shouldUseFoundry = useFoundry ?? this.shouldUseFoundryDeployment(tokenStandard);
      
      // Create token event for deployment start
      await supabase.from('token_events').insert({
        token_id: tokenId,
        event_type: 'deployment',
        severity: 'info',
        message: `Starting ${shouldUseFoundry ? 'Foundry' : 'legacy'} deployment of ${token.name} token to ${blockchain} ${environment}`,
        data: {
          tokenId,
          projectId,
          standard: tokenStandard,
          deploymentStrategy: shouldUseFoundry ? 'foundry' : 'legacy',
          timestamp: new Date().toISOString()
        }
      });
      
      let result: DeploymentResult;
      
      if (shouldUseFoundry) {
        // Use Foundry deployment
        result = await this.deployWithFoundry(
          token, 
          tokenStandard, 
          blockchain, 
          deploymentEnv, 
          userId,
          walletAddress,  // Pass wallet address
          gasConfig       // Pass gas config
        );
      } else {
        // Use legacy deployment
        result = await this.deployWithLegacy(projectId, tokenId, blockchain, environment, userId);
      }
      
      // Update token record with deployment information if successful
      if (result.status === DeploymentStatus.SUCCESS) {
        await supabase
          .from('tokens')
          .update({
            address: result.tokenAddress,
            blockchain: blockchain,
            deployment_status: DeploymentStatus.SUCCESS,
            deployment_timestamp: new Date().toISOString(),
            deployment_transaction: result.transactionHash,
            deployment_environment: environment,
            deployment_strategy: shouldUseFoundry ? 'foundry' : 'legacy'
          })
          .eq('id', tokenId);
      }
      
      // Create token event for deployment result
      await supabase.from('token_events').insert({
        token_id: tokenId,
        event_type: 'deployment',
        severity: result.status === DeploymentStatus.SUCCESS ? 'info' : 'high',
        message: result.status === DeploymentStatus.SUCCESS 
          ? `Successfully deployed ${token.name} token to ${blockchain} ${environment}` 
          : `Failed to deploy ${token.name} token: ${result.error}`,
        data: {
          tokenId,
          projectId,
          standard: tokenStandard,
          status: result.status,
          address: result.tokenAddress,
          transactionHash: result.transactionHash,
          deploymentStrategy: shouldUseFoundry ? 'foundry' : 'legacy',
          timestamp: new Date().toISOString()
        }
      });

      // ✅ FIX: Complete the rate limit record
      await this.completeDeploymentAttempt(
        userId, 
        projectId, 
        tokenId, 
        result.status === DeploymentStatus.SUCCESS ? 'success' : 'failed'
      );
      
      return result;
    } catch (error) {
      console.error('Error in enhanced token deployment service:', error);
      
      // ✅ FIX: Mark rate limit record as failed on exception
      await this.completeDeploymentAttempt(userId, projectId, tokenId, 'failed');
      
      return {
        status: DeploymentStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error during token deployment'
      };
    }
  },

  /**
   * Deploy token using Foundry contracts
   * @param walletAddress Optional wallet address (if not provided, fetches from project_wallets)
   * @param gasConfig Optional gas configuration
   */
  async deployWithFoundry(
    token: any,
    tokenStandard: TokenStandard,
    blockchain: string,
    environment: 'mainnet' | 'testnet',
    userId: string,
    walletAddress?: string,
    gasConfig?: any
  ): Promise<DeploymentResult> {
    // 🔍 DEBUG: Log gasConfig at entry
    console.log(`🎯 [deployWithFoundry ENTRY] gasConfig received:`, gasConfig);
    console.log(`🎯 [deployWithFoundry ENTRY] maxFeePerGas:`, gasConfig?.maxFeePerGas);
    console.log(`🎯 [deployWithFoundry ENTRY] maxPriorityFeePerGas:`, gasConfig?.maxPriorityFeePerGas);
    
    try {
      // Ensure we have a projectId
      if (!token.project_id) {
        throw new Error('Token must be associated with a project for Foundry deployment');
      }
      
      let deploymentWalletAddress: string;
      
      // Use provided wallet address or fetch from project_wallets
      if (walletAddress) {
        console.log(`✅ FIX #6: Using provided wallet address: ${walletAddress}`);
        deploymentWalletAddress = walletAddress;
      } else {
        console.log(`Fetching wallet address from project_wallets for project: ${token.project_id}`);
        // Get the project wallet address to use as initialOwner
        const { data: walletData, error: walletError } = await supabase
          .from('project_wallets')
          .select('wallet_address')
          .eq('project_id', token.project_id)
          .eq('wallet_type', blockchain)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (walletError) {
          throw new Error(`Failed to fetch project wallet: ${walletError.message}`);
        }
        
        if (!walletData || !walletData.wallet_address) {
          throw new Error(`No wallet address found for project ${token.project_id} on ${blockchain}`);
        }
        
        deploymentWalletAddress = walletData.wallet_address;
        console.log(`✅ Found wallet address from database: ${deploymentWalletAddress}`);
      }
      
      // Map legacy token configuration to Foundry configuration using wallet address
      const foundryConfig = mapTokenToFoundryConfig(token, tokenStandard, deploymentWalletAddress);
      const foundryType = tokenStandardToFoundryType(tokenStandard);
      
      // Validate Foundry configuration
      const validation = validateFoundryConfig(foundryConfig, foundryType);
      if (!validation.valid) {
        throw new Error(`Invalid Foundry configuration: ${validation.errors.join(', ')}`);
      }
      
      // Create deployment parameters
      const deploymentParams = {
        tokenId: token.id, // Use the existing token ID
        projectId: token.project_id || '', // Use the token's project ID
        tokenType: foundryType as any,
        config: foundryConfig,
        blockchain,
        environment,
        gasConfig  // ✅ FIX #5: Pass gas config to deployment params
      };
      
      // 🔍 DEBUG: Log deploymentParams.gasConfig before calling foundryDeploymentService
      console.log(`🎯 [deployWithFoundry] deploymentParams.gasConfig before foundry call:`, deploymentParams.gasConfig);
      console.log(`🎯 [deployWithFoundry] maxFeePerGas:`, deploymentParams.gasConfig?.maxFeePerGas);
      console.log(`🎯 [deployWithFoundry] maxPriorityFeePerGas:`, deploymentParams.gasConfig?.maxPriorityFeePerGas);
      
      // Deploy using Foundry service with wallet address
      return await foundryDeploymentService.deployToken(
        deploymentParams, 
        userId,
        token.project_id,  // Pass projectId
        deploymentWalletAddress  // ✅ FIX #6: Pass wallet address directly
      );
    } catch (error) {
      console.error('Foundry deployment failed:', error);
      
      // If Foundry deployment fails and fallback is enabled, try legacy deployment
      if (DEPLOYMENT_STRATEGY.FALLBACK_TO_LEGACY) {
        console.log('Falling back to legacy deployment...');
        const environment = blockchain === 'mainnet' ? NetworkEnvironment.MAINNET : NetworkEnvironment.TESTNET;
        return await this.deployWithLegacy(token.project_id || '', token.id, blockchain, environment, userId);
      }
      
      throw error;
    }
  },

  /**
   * Deploy token using legacy deployment service
   */
  async deployWithLegacy(
    projectId: string,
    tokenId: string,
    blockchain: string,
    environment: NetworkEnvironment,
    userId: string
  ): Promise<DeploymentResult> {
    // Legacy deployment service is no longer available
    // All deployments should use Foundry
    throw new Error('Legacy deployment service is no longer available. Please use Foundry deployment.');
  },

  /**
   * Determine if Foundry deployment should be used for a token standard
   */
  shouldUseFoundryDeployment(tokenStandard: TokenStandard): boolean {
    return DEPLOYMENT_STRATEGY.USE_FOUNDRY_FOR_NEW_DEPLOYMENTS &&
           DEPLOYMENT_STRATEGY.SUPPORTED_FOUNDRY_STANDARDS.includes(tokenStandard);
  },
  
  /**
   * Check if a token is ready for deployment by validating its configuration
   * @param tokenId ID of the token to validate
   * @returns Validation result with security findings
   */
  async validateTokenForDeployment(tokenId: string): Promise<SecurityValidationResult> {
    try {
      // Get token details from the database
      const { data: token, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();
      
      if (error || !token) {
        throw new Error(error ? error.message : 'Token not found');
      }
      
      // Parse token configuration from blocks
      const tokenConfig = token.blocks || {};
      const tokenStandard = token.standard as TokenStandard;
      
      // Normalize configuration: Ensure required fields are set from token record or blocks
      // Name and Symbol - use token record if not in blocks
      if (!tokenConfig.name) {
        tokenConfig.name = token.name;
      }
      if (!tokenConfig.symbol) {
        tokenConfig.symbol = token.symbol;
      }
      // Decimals - default to 18 if not specified
      if (tokenConfig.decimals === undefined && tokenStandard === 'ERC-20') {
        tokenConfig.decimals = token.decimals || 18;
      }
      // InitialSupply - Priority: blocks.initialSupply > blocks.initial_supply > token.total_supply
      if (!tokenConfig.initialSupply) {
        tokenConfig.initialSupply = tokenConfig.initial_supply || token.total_supply || '0';
      }
      
      // Validate token configuration
      const validationResult = validateTokenConfiguration(tokenConfig, tokenStandard);
      
      if (!validationResult.success) {
        // Return security findings with validation errors
        return {
          hasIssues: true,
          findings: validationResult.errors?.map(err => ({
            severity: 'high',
            issue: `Invalid configuration: ${err.path}`,
            recommendation: err.message
          })) || []
        };
      }
      
      // Check for security vulnerabilities
      const securityCheck = checkTokenSecurityVulnerabilities(tokenConfig, tokenStandard);
      
      // If using Foundry, also validate Foundry configuration
      const shouldUseFoundry = this.shouldUseFoundryDeployment(tokenStandard);
      if (shouldUseFoundry) {
        try {
          const foundryConfig = mapTokenToFoundryConfig(token, tokenStandard, 'temp-address');
          const foundryType = tokenStandardToFoundryType(tokenStandard);
          const foundryValidation = validateFoundryConfig(foundryConfig, foundryType);
          
          if (!foundryValidation.valid) {
            securityCheck.findings.push(...foundryValidation.errors.map(error => ({
              severity: 'medium' as const,
              issue: 'Foundry configuration issue',
              recommendation: error
            })));
          }
        } catch (foundryError) {
          securityCheck.findings.push({
            severity: 'medium',
            issue: 'Foundry mapping error',
            recommendation: foundryError instanceof Error ? foundryError.message : 'Unknown Foundry mapping error'
          });
        }
      }
      
      return {
        hasIssues: securityCheck.hasVulnerabilities || securityCheck.findings.length > 0,
        findings: securityCheck.findings
      };
    } catch (error) {
      console.error('Error validating token for deployment:', error);
      
      return {
        hasIssues: true,
        findings: [{
          severity: 'high',
          issue: 'Validation error',
          recommendation: error instanceof Error ? error.message : 'An unknown error occurred during validation'
        }]
      };
    }
  },
  
  /**
   * Check rate limits for token deployments
   * @param userId User ID
   * @param projectId Project ID
   * @returns Whether deployment is allowed
   */
  async checkRateLimits(userId: string, projectId: string): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  }> {
    try {
      // Get hourly deployment count
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);
      
      const { count: hourlyCount, error: hourlyError } = await supabase
        .from('deployment_rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .gte('started_at', hourAgo.toISOString());
      
      if (hourlyError) {
        console.error('Error checking hourly rate limit:', hourlyError);
        return { allowed: true }; // Fail open
      }
      
      if ((hourlyCount || 0) >= RATE_LIMIT.MAX_DEPLOYMENTS_PER_HOUR) {
        return {
          allowed: false,
          reason: `You have reached the limit of ${RATE_LIMIT.MAX_DEPLOYMENTS_PER_HOUR} deployments per hour`,
          retryAfter: 3600 // 1 hour in seconds
        };
      }
      
      // Get daily deployment count
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      
      const { count: dailyCount, error: dailyError } = await supabase
        .from('deployment_rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .gte('started_at', dayAgo.toISOString());
      
      if (dailyError) {
        console.error('Error checking daily rate limit:', dailyError);
        return { allowed: true }; // Fail open
      }
      
      if ((dailyCount || 0) >= RATE_LIMIT.MAX_DEPLOYMENTS_PER_DAY) {
        return {
          allowed: false,
          reason: `You have reached the limit of ${RATE_LIMIT.MAX_DEPLOYMENTS_PER_DAY} deployments per day`,
          retryAfter: 86400 // 24 hours in seconds
        };
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('Error checking rate limits:', error);
      return { allowed: true }; // Fail open
    }
  },
  
  /**
   * Record a deployment attempt for rate limiting
   * @param userId User ID
   * @param projectId Project ID
   * @param tokenId Token ID
   */
  async recordDeploymentAttempt(userId: string, projectId: string, tokenId: string): Promise<void> {
    try {
      await supabase.from('deployment_rate_limits').insert({
        user_id: userId,
        project_id: projectId,
        token_id: tokenId,
        started_at: new Date().toISOString(),
        status: 'started'
      });
    } catch (error) {
      console.error('Error recording deployment attempt:', error);
    }
  },

  /**
   * Complete a deployment rate limit record
   * @param userId User ID
   * @param projectId Project ID
   * @param tokenId Token ID
   * @param status Final status ('success' or 'failed')
   */
  async completeDeploymentAttempt(
    userId: string, 
    projectId: string, 
    tokenId: string, 
    status: 'success' | 'failed'
  ): Promise<void> {
    try {
      // Update the most recent 'started' record for this deployment
      await supabase
        .from('deployment_rate_limits')
        .update({
          status,
          completed_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .eq('token_id', tokenId)
        .eq('status', 'started')
        .order('started_at', { ascending: false })
        .limit(1);
      
      console.log(`✅ Rate limit record completed: ${status}`);
    } catch (error) {
      console.error('Error completing deployment rate limit record:', error);
    }
  },
  
  /**
   * Verify a token contract on the blockchain
   * @param tokenId ID of the token to verify
   * @param contractAddress Address of the deployed contract
   * @param userId ID of the user initiating verification
   * @returns Verification result
   */
  async verifyTokenContract(
    tokenId: string,
    contractAddress: string,
    userId: string
  ): Promise<{ success: boolean; message: string; verificationId?: string }> {
    try {
      // Get token details for blockchain and environment
      let blockchain = 'ethereum';
      let environment = NetworkEnvironment.TESTNET;
      let deploymentStrategy = 'legacy';
      
      try {
        // Try to get deployment details from database
        const { data, error } = await supabase
          .from('tokens')
          .select('*')
          .eq('id', tokenId)
          .single();
          
        if (error) {
          console.warn('Error fetching token data:', error);
          // Continue with defaults
        } else if (data) {
          // Extract values if data exists
          blockchain = data.blockchain || blockchain;
          environment = (data.deployment_environment as NetworkEnvironment) || environment;
          
          // Check if metadata contains deployment strategy information
          if (data.metadata && typeof data.metadata === 'object') {
            deploymentStrategy = (data.metadata as any).deployment_strategy || deploymentStrategy;
          }
        }
      } catch (dbError) {
        console.warn('Database error when fetching token:', dbError);
        // Continue with defaults
      }
      
      // Create token event for verification start
      await supabase.from('token_events').insert({
        token_id: tokenId,
        event_type: 'verification',
        severity: 'info',
        message: `Starting verification of ${deploymentStrategy} contract at ${contractAddress}`,
        data: {
          tokenId,
          contractAddress,
          deploymentStrategy,
          timestamp: new Date().toISOString()
        }
      });
      
      let result: { success: boolean; message: string; verificationId?: string };
      
      if (deploymentStrategy === 'foundry') {
        // Use Foundry verification service
        const envString = environment === NetworkEnvironment.MAINNET ? 'mainnet' : 'testnet';
        result = await foundryDeploymentService.verifyContract(contractAddress, blockchain, envString, 'unknown');
      } else {
        // Legacy verification service is no longer available
        result = {
          success: false,
          message: 'Legacy verification service is no longer available. Please use Foundry deployment.'
        };
      }
      
      // Create token event for verification result
      await supabase.from('token_events').insert({
        token_id: tokenId,
        event_type: 'verification',
        severity: result.success ? 'info' : 'medium',
        message: result.success 
          ? `Successfully submitted verification for contract at ${contractAddress}` 
          : `Failed to verify contract at ${contractAddress}: ${result.message}`,
        data: {
          tokenId,
          contractAddress,
          success: result.success,
          verificationId: result.verificationId,
          deploymentStrategy,
          timestamp: new Date().toISOString()
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error verifying token contract:', error);
      
      // Create token event for verification error
      await supabase.from('token_events').insert({
        token_id: tokenId,
        event_type: 'verification',
        severity: 'high',
        message: `Error during contract verification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          tokenId,
          contractAddress,
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during contract verification'
      };
    }
  },

  /**
   * Configure deployment strategy settings
   */
  configureDeploymentStrategy: {
    setUseFoundry: (enabled: boolean) => {
      DEPLOYMENT_STRATEGY.USE_FOUNDRY_FOR_NEW_DEPLOYMENTS = enabled;
    },
    
    setFallbackToLegacy: (enabled: boolean) => {
      DEPLOYMENT_STRATEGY.FALLBACK_TO_LEGACY = enabled;
    },
    
    addSupportedFoundryStandard: (standard: string) => {
      if (!DEPLOYMENT_STRATEGY.SUPPORTED_FOUNDRY_STANDARDS.includes(standard)) {
        DEPLOYMENT_STRATEGY.SUPPORTED_FOUNDRY_STANDARDS.push(standard);
      }
    },
    
    getConfiguration: () => ({ ...DEPLOYMENT_STRATEGY })
  }
};

export default enhancedTokenDeploymentService;

// Also export the legacy service for backward compatibility
export { enhancedTokenDeploymentService as tokenDeploymentService };
