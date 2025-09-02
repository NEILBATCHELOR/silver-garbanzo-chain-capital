/**
 * Token Project Wallet Integration Service
 * Handles automatic wallet creation and management for token deployments
 */

import { enhancedProjectWalletService, ProjectWalletResult, WalletGenerationParams } from '../project/project-wallet-service';
import { supabase } from '@/infrastructure/database/client';

export interface TokenWalletIntegrationResult {
  success: boolean;
  walletAddress: string;
  privateKey?: string;
  publicKey: string;
  network: string;
  isNewWallet: boolean;
  walletId?: string;
  error?: string;
}

export interface TokenWalletOptions {
  projectId: string;
  projectName?: string;
  projectType?: string;
  network: string;
  forceNew?: boolean;
  includePrivateKey?: boolean;
  includeMnemonic?: boolean;
}

/**
 * Network mapping for consistent wallet_type values
 */
const NETWORK_MAPPING: Record<string, string> = {
  'ethereum': 'ethereum',
  'polygon': 'polygon',
  'avalanche': 'avalanche', 
  'optimism': 'optimism',
  'base': 'base',
  'arbitrum': 'arbitrum',
  'binance': 'binance',
  'fantom': 'fantom'
};

/**
 * Get normalized network name for wallet_type
 */
function getNormalizedNetwork(network: string): string {
  const normalized = network.toLowerCase();
  return NETWORK_MAPPING[normalized] || normalized;
}

/**
 * Token Project Wallet Integration Service
 */
export const tokenProjectWalletIntegrationService = {
  /**
   * Get or create a project wallet for token deployment
   * @param options Wallet integration options
   * @returns Token wallet integration result
   */
  async getOrCreateWalletForDeployment(options: TokenWalletOptions): Promise<TokenWalletIntegrationResult> {
    const { 
      projectId, 
      network, 
      forceNew = false, 
      includePrivateKey = true, 
      includeMnemonic = true 
    } = options;
    
    const normalizedNetwork = getNormalizedNetwork(network);
    
    console.log(`[TokenWalletIntegration] Getting wallet for project: ${projectId}, network: ${normalizedNetwork}`);
    
    try {
      // First, try to find existing wallet if not forcing new
      if (!forceNew) {
        const existingWallet = await this.findExistingWallet(projectId, normalizedNetwork);
        if (existingWallet) {
          console.log(`[TokenWalletIntegration] Found existing wallet: ${existingWallet.walletAddress}`);
          return {
            success: true,
            walletAddress: existingWallet.walletAddress,
            privateKey: existingWallet.privateKey,
            publicKey: existingWallet.publicKey,
            network: normalizedNetwork,
            isNewWallet: false,
            walletId: existingWallet.walletId
          };
        }
      }
      
      // Generate new wallet if none exists or forced
      console.log(`[TokenWalletIntegration] Generating new wallet for network: ${normalizedNetwork}`);
      
      const walletParams: WalletGenerationParams = {
        projectId,
        projectName: options.projectName || 'Chain Capital Project',
        projectType: options.projectType || 'tokenization',
        network: normalizedNetwork,
        includePrivateKey,
        includeMnemonic
      };
      
      const walletResult = await enhancedProjectWalletService.generateWalletForProject(walletParams);
      
      if (!walletResult.success) {
        return {
          success: false,
          walletAddress: '',
          publicKey: '',
          network: normalizedNetwork,
          isNewWallet: false,
          error: walletResult.error || 'Failed to generate wallet'
        };
      }
      
      console.log(`[TokenWalletIntegration] Successfully generated wallet: ${walletResult.walletAddress}`);
      
      return {
        success: true,
        walletAddress: walletResult.walletAddress,
        privateKey: walletResult.privateKey,
        publicKey: walletResult.publicKey,
        network: normalizedNetwork,
        isNewWallet: true,
        walletId: walletResult.keyVaultId
      };
      
    } catch (error) {
      console.error('[TokenWalletIntegration] Error getting/creating wallet:', error);
      return {
        success: false,
        walletAddress: '',
        publicKey: '',
        network: normalizedNetwork,
        isNewWallet: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },
  
  /**
   * Find existing wallet for project and network
   * @param projectId Project ID
   * @param network Network name
   * @returns Existing wallet or null
   */
  async findExistingWallet(projectId: string, network: string): Promise<{
    walletId: string;
    walletAddress: string;
    publicKey: string;
    privateKey?: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('project_wallets')
        .select('id, wallet_address, public_key, private_key')
        .eq('project_id', projectId)
        .eq('wallet_type', network)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('[TokenWalletIntegration] Error finding existing wallet:', error);
        return null;
      }
      
      if (!data) {
        console.log(`[TokenWalletIntegration] No existing wallet found for project ${projectId}, network ${network}`);
        return null;
      }
      
      return {
        walletId: data.id,
        walletAddress: data.wallet_address,
        publicKey: data.public_key,
        privateKey: data.private_key || undefined
      };
    } catch (error) {
      console.error('[TokenWalletIntegration] Error in findExistingWallet:', error);
      return null;
    }
  },
  
  /**
   * Get all project wallets for display
   * @param projectId Project ID
   * @returns Array of project wallets
   */
  async getProjectWallets(projectId: string): Promise<Array<{
    id: string;
    walletType: string;
    walletAddress: string;
    publicKey: string;
    createdAt: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('project_wallets')
        .select('id, wallet_type, wallet_address, public_key, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[TokenWalletIntegration] Error fetching project wallets:', error);
        return [];
      }
      
      return data.map(wallet => ({
        id: wallet.id,
        walletType: wallet.wallet_type,
        walletAddress: wallet.wallet_address,
        publicKey: wallet.public_key,
        createdAt: wallet.created_at
      }));
    } catch (error) {
      console.error('[TokenWalletIntegration] Error in getProjectWallets:', error);
      return [];
    }
  },
  
  /**
   * Generate wallets for multiple networks
   * @param projectId Project ID
   * @param networks Array of network names
   * @param options Additional options
   * @returns Array of wallet results
   */
  async generateMultiNetworkWallets(
    projectId: string, 
    networks: string[],
    options: { 
      projectName?: string;
      projectType?: string;
      includePrivateKey?: boolean;
      includeMnemonic?: boolean;
    } = {}
  ): Promise<TokenWalletIntegrationResult[]> {
    const { 
      projectName = 'Chain Capital Project',
      projectType = 'tokenization',
      includePrivateKey = true,
      includeMnemonic = true
    } = options;
    
    console.log(`[TokenWalletIntegration] Generating wallets for networks: ${networks.join(', ')}`);
    
    const results: TokenWalletIntegrationResult[] = [];
    
    for (const network of networks) {
      try {
        const result = await this.getOrCreateWalletForDeployment({
          projectId,
          projectName,
          projectType,
          network,
          forceNew: true, // Force new for multi-generation
          includePrivateKey,
          includeMnemonic
        });
        
        results.push(result);
      } catch (error) {
        console.error(`[TokenWalletIntegration] Error generating wallet for ${network}:`, error);
        results.push({
          success: false,
          walletAddress: '',
          publicKey: '',
          network: getNormalizedNetwork(network),
          isNewWallet: false,
          error: error instanceof Error ? error.message : 'Failed to generate wallet'
        });
      }
    }
    
    console.log(`[TokenWalletIntegration] Generated ${results.length} wallets`);
    return results;
  },
  
  /**
   * Validate wallet for deployment
   * @param walletAddress Wallet address to validate
   * @param network Network name
   * @returns Validation result
   */
  async validateWalletForDeployment(walletAddress: string, network: string): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    try {
      // Basic address validation
      if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        return {
          isValid: false,
          error: 'Invalid wallet address format'
        };
      }
      
      // Check if wallet exists in project_wallets
      const { data, error } = await supabase
        .from('project_wallets')
        .select('id')
        .eq('wallet_address', walletAddress)
        .eq('wallet_type', getNormalizedNetwork(network))
        .maybeSingle();
      
      if (error) {
        console.warn('[TokenWalletIntegration] Error validating wallet:', error);
        // Still allow deployment even if database check fails
      }
      
      return {
        isValid: true
      };
    } catch (error) {
      console.error('[TokenWalletIntegration] Error in wallet validation:', error);
      return {
        isValid: false,
        error: 'Failed to validate wallet'
      };
    }
  }
};

export default tokenProjectWalletIntegrationService;