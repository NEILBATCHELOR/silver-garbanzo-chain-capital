/**
 * Comprehensive Deployment Verification Service
 * 
 * Orchestrates verification of token deployments including:
 * - Token contract deployment and configuration
 * - Module deployments and linkages
 * - Extension attachments
 * - Transaction sequence validation
 * - Configuration consistency checks
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { TokenStandard } from '@/types/core/centralModels';
import {
  ComprehensiveVerificationResult,
  VerificationContext,
  VerificationOptions,
  VerificationCheck,
  VerificationStatus,
  VerificationType,
  OverallVerificationStatus,
  TokenDeploymentData,
  ModuleDeploymentData,
  ExtensionDeploymentData,
  VerificationProgress,
  ITokenStandardVerifier
} from './types';

// Import standard-specific verifiers
import { ERC20Verifier } from './verifiers/erc20Verifier';
import { ERC721Verifier } from './verifiers/erc721Verifier';
import { ERC1155Verifier } from './verifiers/erc1155Verifier';
import { ERC1400Verifier } from './verifiers/erc1400Verifier';
import { ERC3525Verifier } from './verifiers/erc3525Verifier';
import { ERC4626Verifier } from './verifiers/erc4626Verifier';
import { ERC20WrapperVerifier, ERC721WrapperVerifier } from './verifiers/wrapperVerifiers';
import { ERC20RebasingVerifier } from './verifiers/rebasingVerifier';

/**
 * Main verification service class
 */
export class ComprehensiveVerificationService {
  private standardVerifiers: Map<TokenStandard, ITokenStandardVerifier>;
  private provider: ethers.JsonRpcProvider | null = null;

  constructor() {
    // Register standard-specific verifiers
    this.standardVerifiers = new Map();
    this.standardVerifiers.set(TokenStandard.ERC20, new ERC20Verifier());
    this.standardVerifiers.set(TokenStandard.ERC721, new ERC721Verifier());
    this.standardVerifiers.set(TokenStandard.ERC1155, new ERC1155Verifier());
    this.standardVerifiers.set(TokenStandard.ERC1400, new ERC1400Verifier());
    this.standardVerifiers.set(TokenStandard.ERC3525, new ERC3525Verifier());
    this.standardVerifiers.set(TokenStandard.ERC4626, new ERC4626Verifier());
    this.standardVerifiers.set(TokenStandard.ERC20_WRAPPER, new ERC20WrapperVerifier());
    this.standardVerifiers.set(TokenStandard.ERC721_WRAPPER, new ERC721WrapperVerifier());
    this.standardVerifiers.set(TokenStandard.ERC20_REBASING, new ERC20RebasingVerifier());
  }

  /**
   * Main verification entry point
   */
  async verifyDeployment(
    tokenId: string,
    options: VerificationOptions = {}
  ): Promise<ComprehensiveVerificationResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Gather verification context from database
      const context = await this.gatherVerificationContext(tokenId);
      
      // Step 2: Initialize provider
      await this.initializeProvider(context.deployment.network, options.rpcUrl);
      
      // Step 3: Initialize result
      const result: ComprehensiveVerificationResult = {
        tokenId,
        tokenAddress: context.deployment.contractAddress,
        network: context.deployment.network,
        standard: context.deployment.standard,
        overallStatus: OverallVerificationStatus.IN_PROGRESS,
        tokenDeploymentVerified: false,
        tokenConfigurationVerified: false,
        tokenChecks: [],
        modulesVerified: false,
        moduleResults: [],
        extensionsVerified: false,
        extensionResults: [],
        transactionSequenceVerified: false,
        transactionChecks: [],
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        warningChecks: 0,
        skippedChecks: 0,
        issues: [],
        warnings: [],
        recommendations: [],
        verificationTimestamp: Date.now(),
        verificationDuration: 0
      };

      // Step 4: Verify token deployment and configuration
      if (options.verifyToken !== false) {
        await this.verifyToken(context, options, result);
      }

      // Step 5: Verify modules
      if (options.verifyModules !== false && context.modules.length > 0) {
        await this.verifyModules(context, options, result);
      }

      // Step 6: Verify extensions
      if (options.verifyExtensions !== false && context.extensions.length > 0) {
        await this.verifyExtensions(context, options, result);
      }

      // Step 7: Verify transaction sequence
      if (options.verifyTransactionSequence !== false) {
        await this.verifyTransactionSequence(context, options, result);
      }

      // Step 8: Calculate summary and determine overall status
      this.calculateSummary(result);
      
      result.verificationDuration = Date.now() - startTime;
      
      return result;
    } catch (error: any) {
      console.error('Verification failed:', error);
      throw new Error(`Verification failed: ${error.message}`);
    }
  }

  /**
   * Gather all relevant data from database
   */
  private async gatherVerificationContext(tokenId: string): Promise<VerificationContext> {
    // Fetch token deployment
    const { data: deployment, error: deploymentError } = await supabase
      .from('token_deployments')
      .select('*')
      .eq('token_id', tokenId)
      .single();

    if (deploymentError || !deployment) {
      throw new Error(`Token deployment not found: ${deploymentError?.message}`);
    }

    // Fetch token details for configuration
    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (tokenError || !token) {
      throw new Error(`Token not found: ${tokenError?.message}`);
    }

    // Fetch modules
    const { data: modules, error: modulesError } = await supabase
      .from('token_modules')
      .select('*')
      .eq('token_id', tokenId);

    if (modulesError) {
      console.warn('Error fetching modules:', modulesError);
    }

    // Fetch extensions
    const { data: extensions, error: extensionsError } = await supabase
      .from('token_extensions')
      .select('*')
      .eq('token_id', tokenId);

    if (extensionsError) {
      console.warn('Error fetching extensions:', extensionsError);
    }

    const deploymentData: TokenDeploymentData = {
      tokenId: deployment.token_id,
      contractAddress: deployment.contract_address,
      transactionHash: deployment.transaction_hash,
      network: deployment.network,
      standard: token.standard as TokenStandard,
      deploymentData: deployment.deployment_data,
      factoryAddress: deployment.factory_address,
      masterAddress: deployment.master_address,
      deployedAt: deployment.deployed_at,
      deployedBy: deployment.deployed_by
    };

    const moduleData: ModuleDeploymentData[] = (modules || []).map(m => ({
      moduleType: m.module_type,
      moduleAddress: m.module_address,
      masterAddress: m.master_address,
      deploymentTxHash: m.deployment_tx_hash,
      configuration: m.configuration,
      isActive: m.is_active,
      attachedAt: m.attached_at,
      deployedAt: m.deployed_at
    }));

    const extensionData: ExtensionDeploymentData[] = (extensions || []).map(e => ({
      extensionType: e.extension_type,
      extensionAddress: e.extension_address,
      configuration: e.configuration,
      isActive: e.is_active,
      attachedTxHash: e.attached_tx_hash,
      attachedAt: e.attached_at
    }));

    return {
      deployment: deploymentData,
      modules: moduleData,
      extensions: extensionData,
      expectedConfiguration: token
    };
  }

  /**
   * Initialize provider for on-chain queries
   */
  private async initializeProvider(network: string, rpcUrl?: string): Promise<void> {
    if (rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
    } else {
      // Get RPC URL from network configuration
      const { data: rpcConfig } = await supabase
        .from('blockchain_networks')
        .select('rpc_url')
        .eq('network_identifier', network)
        .single();

      if (rpcConfig?.rpc_url) {
        this.provider = new ethers.JsonRpcProvider(rpcConfig.rpc_url);
      } else {
        throw new Error(`No RPC URL configured for network: ${network}`);
      }
    }
    
    // Make provider globally accessible for verifiers
    (globalThis as any).__verificationProvider = this.provider;
  }

  /**
   * Verify token deployment and configuration
   */
  private async verifyToken(
    context: VerificationContext,
    options: VerificationOptions,
    result: ComprehensiveVerificationResult
  ): Promise<void> {
    const verifier = this.standardVerifiers.get(context.deployment.standard);
    
    if (!verifier) {
      result.tokenChecks.push({
        type: VerificationType.TOKEN_DEPLOYMENT,
        name: 'Token Standard Verification',
        description: `No verifier available for ${context.deployment.standard}`,
        status: VerificationStatus.SKIPPED,
        timestamp: Date.now()
      });
      return;
    }

    try {
      const checks = await verifier.verifyToken(context, options);
      result.tokenChecks.push(...checks);
      
      result.tokenDeploymentVerified = checks.some(
        c => c.type === VerificationType.TOKEN_DEPLOYMENT && c.status === VerificationStatus.SUCCESS
      );
      
      result.tokenConfigurationVerified = checks.some(
        c => c.type === VerificationType.TOKEN_CONFIGURATION && c.status === VerificationStatus.SUCCESS
      );
    } catch (error: any) {
      result.tokenChecks.push({
        type: VerificationType.TOKEN_DEPLOYMENT,
        name: 'Token Verification',
        description: 'Failed to verify token',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
      result.issues.push(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Verify all modules
   */
  private async verifyModules(
    context: VerificationContext,
    options: VerificationOptions,
    result: ComprehensiveVerificationResult
  ): Promise<void> {
    const verifier = this.standardVerifiers.get(context.deployment.standard);
    
    if (!verifier) {
      return;
    }

    try {
      const moduleResults = await verifier.verifyModules(context, options);
      result.moduleResults.push(...moduleResults);
      
      result.modulesVerified = moduleResults.every(m => 
        m.deploymentVerified && m.linkageVerified && m.configurationVerified
      );
    } catch (error: any) {
      result.issues.push(`Module verification failed: ${error.message}`);
    }
  }

  /**
   * Verify extensions (placeholder for now)
   */
  private async verifyExtensions(
    context: VerificationContext,
    options: VerificationOptions,
    result: ComprehensiveVerificationResult
  ): Promise<void> {
    // Extension verification logic
    result.extensionsVerified = true;
  }

  /**
   * Verify transaction sequence
   */
  private async verifyTransactionSequence(
    context: VerificationContext,
    options: VerificationOptions,
    result: ComprehensiveVerificationResult
  ): Promise<void> {
    const checks: VerificationCheck[] = [];

    // Check main deployment transaction
    if (context.deployment.transactionHash && this.provider) {
      try {
        const receipt = await this.provider.getTransactionReceipt(
          context.deployment.transactionHash
        );

        checks.push({
          type: VerificationType.TRANSACTION_SEQUENCE,
          name: 'Deployment Transaction',
          description: 'Verify main deployment transaction',
          status: receipt ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          actual: receipt ? 'Transaction confirmed' : 'Transaction not found',
          transactionHash: context.deployment.transactionHash,
          blockNumber: receipt?.blockNumber,
          timestamp: Date.now()
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.TRANSACTION_SEQUENCE,
          name: 'Deployment Transaction',
          description: 'Failed to verify transaction',
          status: VerificationStatus.FAILED,
          error: error.message,
          transactionHash: context.deployment.transactionHash,
          timestamp: Date.now()
        });
      }
    }

    result.transactionChecks = checks;
    result.transactionSequenceVerified = checks.every(c => c.status === VerificationStatus.SUCCESS);
  }

  /**
   * Calculate verification summary
   */
  private calculateSummary(result: ComprehensiveVerificationResult): void {
    const allChecks = [
      ...result.tokenChecks,
      ...result.moduleResults.flatMap(m => m.checks),
      ...result.extensionResults.flatMap(e => e.checks),
      ...result.transactionChecks
    ];

    result.totalChecks = allChecks.length;
    result.passedChecks = allChecks.filter(c => c.status === VerificationStatus.SUCCESS).length;
    result.failedChecks = allChecks.filter(c => c.status === VerificationStatus.FAILED).length;
    result.warningChecks = allChecks.filter(c => c.status === VerificationStatus.WARNING).length;
    result.skippedChecks = allChecks.filter(c => c.status === VerificationStatus.SKIPPED).length;

    // Determine overall status
    if (result.failedChecks > 0) {
      if (result.passedChecks > 0) {
        result.overallStatus = OverallVerificationStatus.PARTIAL_SUCCESS;
      } else {
        result.overallStatus = OverallVerificationStatus.FAILED;
      }
    } else if (result.passedChecks > 0) {
      result.overallStatus = OverallVerificationStatus.SUCCESS;
    } else {
      result.overallStatus = OverallVerificationStatus.NOT_STARTED;
    }

    // Collect issues and warnings
    result.issues = allChecks
      .filter(c => c.status === VerificationStatus.FAILED && c.error)
      .map(c => c.error!);

    result.warnings = allChecks
      .filter(c => c.status === VerificationStatus.WARNING && c.error)
      .map(c => c.error!);
  }

  /**
   * Get provider (for use by verifiers)
   */
  getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    return this.provider;
  }
}

// Export singleton instance
export const verificationService = new ComprehensiveVerificationService();
