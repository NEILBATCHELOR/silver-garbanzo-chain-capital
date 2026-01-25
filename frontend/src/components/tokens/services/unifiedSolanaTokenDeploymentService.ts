/**
 * Unified Solana Token Deployment Service
 * 
 * MIGRATION STATUS: ✅ USING MODERN SERVICES
 * Uses ModernSPLTokenDeploymentService for SPL tokens
 * Uses Token2022DeploymentService for Token-2022 (being migrated)
 * 
 * Manages SPL and Token-2022 deployments with automatic strategy selection
 * Follows Chain Capital's unified deployment pattern
 */

import {
  ModernSPLTokenDeploymentService,
  type ModernSPLTokenConfig,
  type ModernSPLDeploymentOptions
} from '@/services/wallet/solana/ModernSPLTokenDeploymentService';
import {
  Token2022DeploymentService,
  type Token2022Config,
  type Token2022DeploymentOptions
} from '@/services/wallet/solana/Token2022DeploymentService';
import { logActivity } from '@/infrastructure/activityLogger';
import { supabase } from '@/infrastructure/database/client';

// ============================================================================
// INTERFACES
// ============================================================================

export interface UnifiedSolanaDeploymentResult {
  success: boolean;
  tokenAddress?: string;
  transactionHash?: string;
  deploymentStrategy: 'SPL' | 'Token2022';
  networkUsed: string;
  tokenId?: string;
  extensionsEnabled?: string[];
  complexity?: {
    level: 'low' | 'medium' | 'high';
    requiresExtensions: boolean;
    extensionCount: number;
  };
  errors?: string[];
  warnings?: string[];
  deploymentTimeMs?: number;
}

// ============================================================================
// UNIFIED SERVICE
// ============================================================================

export class UnifiedSolanaTokenDeploymentService {
  private modernSPLService: ModernSPLTokenDeploymentService;
  private token2022Service: Token2022DeploymentService;

  constructor() {
    this.modernSPLService = new ModernSPLTokenDeploymentService();
    this.token2022Service = new Token2022DeploymentService();
  }

  /**
   * Deploy Solana token with automatic strategy selection
   * Chooses between SPL (simple) and Token-2022 (with extensions) based on config
   */
  async deploySolanaToken(
    tokenId: string,
    userId: string,
    projectId: string,
    network: 'mainnet-beta' | 'devnet' | 'testnet' = 'devnet',
    walletPrivateKey: string
  ): Promise<UnifiedSolanaDeploymentResult> {
    const startTime = Date.now();

    try {
      // Step 1: Get token configuration from database
      const tokenData = await this.getTokenConfiguration(tokenId);

      if (!tokenData) {
        return {
          success: false,
          deploymentStrategy: 'SPL',
          networkUsed: `solana-${network}`,
          errors: ['Token configuration not found'],
          warnings: []
        };
      }

      // Step 2: Analyze configuration complexity
      const complexity = this.analyzeComplexity(tokenData);

      // Step 3: Determine deployment strategy
      const strategy = complexity.requiresExtensions ? 'Token2022' : 'SPL';

      await logActivity({
        action: 'unified_solana_deployment_started',
        entity_type: 'token',
        entity_id: tokenId,
        details: {
          strategy,
          complexity,
          network
        }
      });

      // Step 4: Deploy based on strategy
      if (strategy === 'SPL') {
        return await this.deploySPL(tokenData, userId, projectId, network, walletPrivateKey, complexity);
      } else {
        return await this.deployToken2022(tokenData, userId, projectId, network, walletPrivateKey, complexity);
      }

    } catch (error) {
      const deploymentTimeMs = Date.now() - startTime;
      
      return {
        success: false,
        deploymentStrategy: 'SPL',
        networkUsed: `solana-${network}`,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        deploymentTimeMs
      };
    }
  }

  /**
   * Deploy SPL token using Modern service
   */
  private async deploySPL(
    tokenData: any,
    userId: string,
    projectId: string,
    network: 'mainnet-beta' | 'devnet' | 'testnet',
    walletPrivateKey: string,
    complexity: any
  ): Promise<UnifiedSolanaDeploymentResult> {
    const config: ModernSPLTokenConfig = {
      name: tokenData.name,
      symbol: tokenData.symbol,
      uri: tokenData.metadata?.uri || `https://arweave.net/${tokenData.symbol}.json`,
      decimals: tokenData.decimals || 9,
      initialSupply: BigInt(parseInt(tokenData.total_supply || '1000000')),
      mintAuthority: tokenData.metadata?.mint_authority || null,
      freezeAuthority: tokenData.metadata?.freeze_authority || null
    };

    const options: ModernSPLDeploymentOptions = {
      network,
      projectId,
      userId,
      walletPrivateKey
    };

    const result = await this.modernSPLService.deploySPLToken(
      config, 
      options,
      tokenData.id // Pass tokenId to update existing record
    );

    return {
      success: result.success,
      tokenAddress: result.tokenAddress,
      transactionHash: result.transactionHash,
      deploymentStrategy: 'SPL',
      networkUsed: `solana-${network}`,
      complexity,
      errors: result.errors,
      warnings: result.warnings
    };
  }

  /**
   * Deploy Token-2022 with extensions
   */
  private async deployToken2022(
    tokenData: any,
    userId: string,
    projectId: string,
    network: 'mainnet-beta' | 'devnet' | 'testnet',
    walletPrivateKey: string,
    complexity: any
  ): Promise<UnifiedSolanaDeploymentResult> {
    // DEBUG: Check what tokenData.id is
    console.log('[UnifiedService] deployToken2022 received tokenData:');
    console.log('[UnifiedService] tokenData.id:', tokenData.id);
    console.log('[UnifiedService] tokenData.address:', tokenData.address);
    console.log('[UnifiedService] Passing tokenData.id to Token2022DeploymentService');
    // Build extension configs
    const metadata = tokenData.metadata?.on_chain_metadata !== false
      ? {
          name: tokenData.name,
          symbol: tokenData.symbol,
          uri: tokenData.metadata?.uri || `https://arweave.net/${tokenData.symbol}.json`,
          additionalMetadata: this.parseAdditionalMetadata(tokenData.metadata?.additional_metadata)
        }
      : undefined;

    const transferFee = tokenData.metadata?.transfer_fee
      ? {
          feeBasisPoints: tokenData.metadata.transfer_fee.fee_basis_points || 50,
          maxFee: BigInt(tokenData.metadata.transfer_fee.max_fee || '5000'),
          transferFeeAuthority: tokenData.metadata.transfer_fee.transfer_fee_authority,
          withdrawWithheldAuthority: tokenData.metadata.transfer_fee.withdraw_withheld_authority
        }
      : undefined;

    const config: Token2022Config = {
      name: tokenData.name,
      symbol: tokenData.symbol,
      uri: tokenData.metadata?.uri || `https://arweave.net/${tokenData.symbol}.json`,
      decimals: tokenData.decimals || 9,
      initialSupply: parseInt(tokenData.total_supply || '1000000'),
      
      // Authorities
      mintAuthority: tokenData.metadata?.mint_authority || null,
      freezeAuthority: tokenData.metadata?.freeze_authority || null,
      updateAuthority: tokenData.metadata?.update_authority || null,
      
      // Extensions
      enableMetadata: !!metadata,
      enableTransferFee: !!transferFee,
      enableMintCloseAuthority: !!tokenData.metadata?.mint_close_authority,
      enableDefaultAccountState: tokenData.metadata?.default_account_state?.state,
      
      // Extension configs
      metadata,
      transferFee
    };

    const options: Token2022DeploymentOptions = {
      network,
      projectId,
      userId,
      walletPrivateKey
    };

    const result = await this.token2022Service.deployToken2022(
      config, 
      options,
      tokenData.id // Pass tokenId to update existing record
    );

    return {
      success: result.success,
      tokenAddress: result.tokenAddress,
      transactionHash: result.transactionHash,
      deploymentStrategy: 'Token2022',
      networkUsed: `solana-${network}`,
      extensionsEnabled: result.extensions,
      complexity,
      errors: result.errors,
      warnings: result.warnings,
      deploymentTimeMs: result.deploymentTimeMs
    };
  }

  /**
   * Get token configuration from database
   */
  private async getTokenConfiguration(tokenId: string): Promise<any | null> {
    console.log('[UnifiedService] getTokenConfiguration called with tokenId:', tokenId);
    
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (error) {
      console.error('Error fetching token configuration:', error);
      return null;
    }

    console.log('[UnifiedService] getTokenConfiguration returning:', data);
    console.log('[UnifiedService] data.id:', data?.id);
    console.log('[UnifiedService] data.address:', data?.address);
    
    return data;
  }

  /**
   * Analyze configuration complexity
   * Determines if Token-2022 extensions are needed
   */
  private analyzeComplexity(tokenData: any): {
    level: 'low' | 'medium' | 'high';
    requiresExtensions: boolean;
    extensionCount: number;
  } {
    let extensionCount = 0;
    
    // Check for features that require Token-2022
    if (tokenData.metadata?.transfer_fee) extensionCount++;
    if (tokenData.metadata?.transfer_hook) extensionCount++;
    if (tokenData.metadata?.interest_bearing) extensionCount++;
    if (tokenData.metadata?.non_transferable) extensionCount++;
    if (tokenData.metadata?.permanent_delegate) extensionCount++;
    if (tokenData.metadata?.on_chain_metadata) extensionCount++;
    if (tokenData.metadata?.mint_close_authority) extensionCount++;
    if (tokenData.metadata?.default_account_state) extensionCount++;

    const requiresExtensions = extensionCount > 0;
    const level = requiresExtensions 
      ? (extensionCount > 2 ? 'high' : 'medium')
      : 'low';

    return {
      level,
      requiresExtensions,
      extensionCount
    };
  }

  /**
   * Parse additional metadata from various formats
   */
  private parseAdditionalMetadata(metadata: any): Map<string, string> | undefined {
    if (!metadata) return undefined;

    const map = new Map<string, string>();

    if (Array.isArray(metadata)) {
      // Array of key-value pairs
      metadata.forEach(item => {
        if (item.key && item.value) {
          map.set(item.key, item.value);
        }
      });
    } else if (typeof metadata === 'object') {
      // Object format
      Object.entries(metadata).forEach(([key, value]) => {
        map.set(key, String(value));
      });
    }

    return map.size > 0 ? map : undefined;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const unifiedSolanaTokenDeploymentService = new UnifiedSolanaTokenDeploymentService();
