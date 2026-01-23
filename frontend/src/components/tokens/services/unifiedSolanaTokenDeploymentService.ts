/**
 * Unified Solana Token Deployment Service
 * 
 * Manages SPL and Token-2022 deployments with automatic strategy selection
 * Follows Chain Capital's unified deployment pattern
 */

import { solanaTokenDeploymentService, SolanaSPLTokenConfig, SolanaTokenDeploymentOptions } from '@/services/wallet/solana';
import { solanaToken2022Service, SolanaToken2022Config, Token2022DeploymentOptions } from '@/services/wallet/solana/SolanaToken2022Service';
import { logActivity } from '@/infrastructure/activityLogger';
import { supabase } from '@/infrastructure/database/client';
import { PublicKey } from '@solana/web3.js';

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

export class UnifiedSolanaTokenDeploymentService {
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
        return await this.deploySPL(tokenData, userId, projectId, network, walletPrivateKey);
      } else {
        // Token-2022 deployment with extensions
        return await this.deployToken2022(tokenData, userId, projectId, network, walletPrivateKey);
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
   * Deploy SPL token
   */
  private async deploySPL(
    tokenData: any,
    userId: string,
    projectId: string,
    network: 'mainnet-beta' | 'devnet' | 'testnet',
    walletPrivateKey: string
  ): Promise<UnifiedSolanaDeploymentResult> {
    const config: SolanaSPLTokenConfig = {
      name: tokenData.name,
      symbol: tokenData.symbol,
      uri: tokenData.metadata?.uri || `https://arweave.net/${tokenData.symbol}.json`,
      decimals: tokenData.decimals || 9,
      initialSupply: parseInt(tokenData.total_supply || '1000000'),
      mintAuthority: tokenData.metadata?.mint_authority || null,
      freezeAuthority: tokenData.metadata?.freeze_authority || null,
      updateAuthority: tokenData.metadata?.update_authority || null,
      isMutable: tokenData.metadata?.is_mutable !== false
    };

    const options: SolanaTokenDeploymentOptions = {
      network,
      projectId,
      userId,
      walletPrivateKey
    };

    const result = await solanaTokenDeploymentService.deploySPLToken(config, options);

    return {
      ...result,
      deploymentStrategy: 'SPL'
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
    walletPrivateKey: string
  ): Promise<UnifiedSolanaDeploymentResult> {
    // Parse extensions from token metadata
    const extensions: any = {};

    // Metadata extension
    if (tokenData.metadata?.on_chain_metadata !== false) {
      extensions.metadata = {
        name: tokenData.name,
        symbol: tokenData.symbol,
        uri: tokenData.metadata?.uri || `https://arweave.net/${tokenData.symbol}.json`,
        additionalMetadata: tokenData.metadata?.additional_metadata || []
      };
    }

    // Transfer fee extension
    if (tokenData.metadata?.transfer_fee) {
      extensions.transferFee = {
        feeBasisPoints: tokenData.metadata.transfer_fee.fee_basis_points || 50,
        maxFee: BigInt(tokenData.metadata.transfer_fee.max_fee || '5000')
      };
    }

    // Transfer hook extension
    if (tokenData.metadata?.transfer_hook) {
      extensions.transferHook = {
        authority: new PublicKey(tokenData.metadata.transfer_hook.authority),
        programId: new PublicKey(tokenData.metadata.transfer_hook.program_id)
      };
    }

    // Mint close authority extension
    if (tokenData.metadata?.mint_close_authority) {
      extensions.mintCloseAuthority = {
        closeAuthority: new PublicKey(tokenData.metadata.mint_close_authority)
      };
    }

    // Non-transferable extension
    if (tokenData.metadata?.non_transferable === true) {
      extensions.nonTransferable = true;
    }

    // Permanent delegate extension
    if (tokenData.metadata?.permanent_delegate) {
      extensions.permanentDelegate = {
        delegate: new PublicKey(tokenData.metadata.permanent_delegate)
      };
    }

    // Interest-bearing extension
    if (tokenData.metadata?.interest_bearing) {
      extensions.interestBearing = {
        rateAuthority: new PublicKey(tokenData.metadata.interest_bearing.rate_authority),
        rate: tokenData.metadata.interest_bearing.rate || 10
      };
    }

    // Default account state extension
    if (tokenData.metadata?.default_account_state) {
      extensions.defaultAccountState = {
        state: tokenData.metadata.default_account_state.state || 'initialized'
      };
    }

    const config: SolanaToken2022Config = {
      name: tokenData.name,
      symbol: tokenData.symbol,
      decimals: tokenData.decimals || 9,
      initialSupply: parseInt(tokenData.total_supply || '1000000'),
      mintAuthority: tokenData.metadata?.mint_authority || null,
      freezeAuthority: tokenData.metadata?.freeze_authority || null,
      updateAuthority: tokenData.metadata?.update_authority || null,
      extensions
    };

    const options: Token2022DeploymentOptions = {
      network,
      projectId,
      userId,
      walletPrivateKey
    };

    const result = await solanaToken2022Service.deployToken2022(config, options);

    return {
      ...result,
      deploymentStrategy: 'Token2022'
    };
  }

  /**
   * Get token configuration from database
   */
  private async getTokenConfiguration(tokenId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (error) {
      console.error('Error fetching token configuration:', error);
      return null;
    }

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
}

// Export singleton instance
export const unifiedSolanaTokenDeploymentService = new UnifiedSolanaTokenDeploymentService();
