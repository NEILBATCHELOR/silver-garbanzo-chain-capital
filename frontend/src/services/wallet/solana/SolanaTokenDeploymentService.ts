/**
 * Solana Token Deployment Service (DELEGATING TO MODERN)
 * 
 * MIGRATION STATUS: ✅ DELEGATING TO MODERN
 * This service now delegates to ModernSPLTokenDeploymentService
 * Maintains backward compatibility while using modern @solana/kit internally
 * 
 * @deprecated Use ModernSPLTokenDeploymentService directly for new code
 */

import { 
  ModernSPLTokenDeploymentService,
  type ModernSPLTokenConfig,
  type ModernSPLDeploymentOptions,
  type ModernSPLDeploymentResult
} from './ModernSPLTokenDeploymentService';
import { logActivity } from '@/infrastructure/activityLogger';

// ============================================================================
// LEGACY INTERFACES (for backward compatibility)
// ============================================================================

export interface SolanaSPLTokenConfig {
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  initialSupply: number;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  updateAuthority?: string | null;
  isMutable?: boolean;
}

export interface SolanaTokenDeploymentOptions {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcUrl?: string;
  projectId: string;
  userId: string;
  walletPrivateKey: string;
}

export interface SolanaTokenDeploymentResult {
  success: boolean;
  tokenAddress?: string;
  mint?: string;
  transactionHash?: string;
  deploymentStrategy: 'SPL';
  networkUsed: string;
  errors?: string[];
  warnings?: string[];
  deploymentTimeMs?: number;
  tokenId?: string;
}

// ============================================================================
// DELEGATING SERVICE
// ============================================================================

export class SolanaTokenDeploymentService {
  private modernService: ModernSPLTokenDeploymentService;

  constructor() {
    this.modernService = new ModernSPLTokenDeploymentService();
  }

  /**
   * Deploy SPL token (delegates to modern implementation)
   * @deprecated Use ModernSPLTokenDeploymentService.deploySPLToken() directly
   */
  async deploySPLToken(
    config: SolanaSPLTokenConfig,
    options: SolanaTokenDeploymentOptions
  ): Promise<SolanaTokenDeploymentResult> {
    const startTime = Date.now();

    // Log deprecation warning
    console.warn(
      '[SolanaTokenDeploymentService] DEPRECATED: This service delegates to ModernSPLTokenDeploymentService. ' +
      'Please use ModernSPLTokenDeploymentService directly for new code.'
    );

    try {
      // Convert legacy config to modern config
      const modernConfig: ModernSPLTokenConfig = {
        name: config.name,
        symbol: config.symbol,
        uri: config.uri,
        decimals: config.decimals,
        initialSupply: BigInt(config.initialSupply),
        mintAuthority: config.mintAuthority,
        freezeAuthority: config.freezeAuthority
      };

      // Convert legacy options to modern options
      const modernOptions: ModernSPLDeploymentOptions = {
        network: options.network,
        rpcUrl: options.rpcUrl,
        projectId: options.projectId,
        userId: options.userId,
        walletPrivateKey: options.walletPrivateKey
      };

      // Call modern service
      const modernResult = await this.modernService.deploySPLToken(modernConfig, modernOptions);

      // Convert modern result back to legacy format
      const legacyResult: SolanaTokenDeploymentResult = {
        success: modernResult.success,
        tokenAddress: modernResult.tokenAddress,
        mint: modernResult.mint,
        transactionHash: modernResult.transactionHash,
        deploymentStrategy: 'SPL',
        networkUsed: `solana-${options.network}`,
        errors: modernResult.errors,
        warnings: [
          ...(modernResult.warnings || []),
          'Using legacy SolanaTokenDeploymentService - consider migrating to ModernSPLTokenDeploymentService'
        ],
        deploymentTimeMs: Date.now() - startTime,
        tokenId: modernResult.tokenAddress
      };

      return legacyResult;

    } catch (error) {
      await logActivity({
        action: 'solana_spl_deployment_failed',
        entity_type: 'token',
        entity_id: null,
        details: {
          error: error instanceof Error ? error.message : String(error),
          config: {
            name: config.name,
            symbol: config.symbol
          }
        }
      });

      return {
        success: false,
        deploymentStrategy: 'SPL',
        networkUsed: `solana-${options.network}`,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        deploymentTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Validate token configuration
   * @deprecated Use ModernSPLTokenDeploymentService.validateConfig() directly
   */
  validateConfig(config: SolanaSPLTokenConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Name validation
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Token name is required');
    }
    if (config.name && config.name.length > 32) {
      errors.push('Token name must be 32 characters or less');
    }

    // Symbol validation
    if (!config.symbol || config.symbol.trim().length === 0) {
      errors.push('Token symbol is required');
    }
    if (config.symbol && config.symbol.length > 10) {
      errors.push('Token symbol must be 10 characters or less');
    }

    // Decimals validation
    if (typeof config.decimals !== 'number' || config.decimals < 0 || config.decimals > 9) {
      errors.push('Decimals must be between 0 and 9');
    }

    // Initial supply validation
    if (typeof config.initialSupply !== 'number' || config.initialSupply < 0) {
      errors.push('Initial supply must be a positive number');
    }

    // URI validation
    if (!config.uri || config.uri.trim().length === 0) {
      errors.push('Metadata URI is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const solanaTokenDeploymentService = new SolanaTokenDeploymentService();
