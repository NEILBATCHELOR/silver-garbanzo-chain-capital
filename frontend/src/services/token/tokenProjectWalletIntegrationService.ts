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
  environment?: 'mainnet' | 'testnet'; // ✅ FIX #9: Add environment parameter
  forceNew?: boolean;
  includePrivateKey?: boolean;
  includeMnemonic?: boolean;
}

/**
 * Network mapping for consistent wallet_type values
 * ✅ FIX #9: Comprehensive network normalization with ALL supported chains
 * Maps from user-friendly names to standardized network identifiers
 */
const NETWORK_MAPPING: Record<string, string> = {
  // Ethereum variants (mainnet)
  'ethereum': 'ethereum',
  'eth': 'ethereum',
  'ethnet': 'ethereum',
  'etherum': 'ethereum', // Common misspelling
  
  // Ethereum testnets
  'sepolia': 'ethereum',
  'holesky': 'ethereum',
  'hoodi': 'ethereum', // ✅ FIX #9: Add hoodi testnet support
  'goerli': 'ethereum', // Deprecated but still included for compatibility
  
  // Layer 2 Networks - Arbitrum
  'arbitrum': 'arbitrum',
  'arb': 'arbitrum',
  'arbnet': 'arbitrum',
  'arbitrumone': 'arbitrum',
  'arbitrumnova': 'arbitrum',
  'arbitrumsepolia': 'arbitrum',
  
  // Layer 2 Networks - Base
  'base': 'base',
  'basename': 'base',
  'basenet': 'base',
  'basesepolia': 'base',
  
  // Layer 2 Networks - Optimism
  'optimism': 'optimism',
  'op': 'optimism',
  'opnet': 'optimism',
  'optimismsepolia': 'optimism',
  
  // Layer 2 Networks - Blast
  'blast': 'blast',
  'blastsepolia': 'blast',
  
  // Layer 2 Networks - Scroll
  'scroll': 'scroll',
  'scrollsepolia': 'scroll',
  
  // Layer 2 Networks - zkSync
  'zksync': 'zksync',
  'zksyncsepolia': 'zksync',
  
  // Layer 2 Networks - Polygon zkEVM
  'polygonzkevm': 'polygonzkevm',
  'polygonzkevmcardona': 'polygonzkevm',
  
  // Layer 2 Networks - Linea
  'linea': 'linea',
  'lineasepolia': 'linea',
  
  // Layer 2 Networks - Mantle
  'mantle': 'mantle',
  'mantlesepolia': 'mantle',
  
  // Layer 2 Networks - Taiko
  'taiko': 'taiko',
  'taikohekla': 'taiko',
  
  // Layer 2 Networks - Sonic
  'sonic': 'sonic',
  'sonictestnet': 'sonic',
  
  // Layer 2 Networks - Unichain
  'unichain': 'unichain',
  'unichainsepolia': 'unichain',
  
  // Layer 2 Networks - Abstract
  'abstract': 'abstract',
  'abstractsepolia': 'abstract',
  
  // Layer 2 Networks - Fraxtal
  'fraxtal': 'fraxtal',
  'fraxtaltestnet': 'fraxtal',
  
  // Layer 2 Networks - Swellchain
  'swellchain': 'swellchain',
  'swellchaintestnet': 'swellchain',
  
  // Polygon variants
  'polygon': 'polygon',
  'matic': 'polygon',
  'poly': 'polygon',
  'polygonmatic': 'polygon',
  'polygonamoy': 'polygon', // ✅ FIX #9: Add Amoy testnet support
  
  // BNB Chain variants
  'binance': 'binance',
  'bsc': 'binance',
  'bnb': 'binance',
  'binancesmartchain': 'binance',
  'bnbchain': 'binance',
  'bnbtestnet': 'binance',
  'opbnb': 'binance',
  'opbnbtestnet': 'binance',
  
  // Avalanche variants
  'avalanche': 'avalanche',
  'avax': 'avalanche',
  'avax-c': 'avalanche',
  'avax-x': 'avalanche',
  'avalanchefuji': 'avalanche',
  
  // Other Major Networks
  'gnosis': 'gnosis',
  'celo': 'celo',
  'celoalfajores': 'celo',
  'moonbeam': 'moonbeam',
  'moonriver': 'moonbeam',
  'moonbasealpha': 'moonbeam',
  'berachain': 'berachain',
  'berachainbepolia': 'berachain',
  'sei': 'sei',
  'seitestnet': 'sei',
  'injective': 'injective',
  'injectivetestnet': 'injective',
  'katana': 'katana',
  'world': 'world',
  'worldsepolia': 'world',
  'sophon': 'sophon',
  'sophonsepolia': 'sophon',
  'monad': 'monad',
  
  // Other Networks
  'bittorrent': 'bittorrent',
  'bittorrenttestnet': 'bittorrent',
  'xdc': 'xdc',
  'xdcapothem': 'xdc',
  'hyperevm': 'hyperevm',
  'apechain': 'apechain',
  'apechaincurtis': 'apechain',
  'memecore': 'memecore',
  
  // Fantom variants
  'fantom': 'fantom',
  'ftm': 'fantom',
  'fantomopera': 'fantom',
  
  // Deprecated Networks
  'cronos': 'cronos'
};

/**
 * Get normalized network name for wallet_type
 * ✅ FIX #6: Enhanced with validation and error handling
 */
function getNormalizedNetwork(network: string): string {
  if (!network) {
    throw new Error('Network parameter is required');
  }
  
  const normalized = network.toLowerCase().trim();
  const mappedNetwork = NETWORK_MAPPING[normalized];
  
  if (!mappedNetwork) {
    // Provide helpful error message with supported networks
    const supportedNetworks = Array.from(new Set(Object.values(NETWORK_MAPPING))).join(', ');
    throw new Error(
      `Unsupported network: "${network}". Supported networks: ${supportedNetworks}`
    );
  }
  
  console.log(`✅ FIX #6: Network normalization - Input: "${network}" → Output: "${mappedNetwork}"`);
  return mappedNetwork;
}

/**
 * Token Project Wallet Integration Service
 */
export const tokenProjectWalletIntegrationService = {
  /**
   * Get or create a project wallet for token deployment
   * ✅ FIX #8: Pass chain_id to findExistingWallet for accurate filtering
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
    
    // ✅ FIX #9: Intelligently determine environment based on network name or use provided environment
    const { deploymentEnhancementService } = await import('@/components/tokens/services/deploymentEnhancementService');
    const { NetworkEnvironment } = await import('@/infrastructure/web3/ProviderManager');
    
    // Detect environment from network name if not explicitly provided
    let detectedEnvironment: typeof NetworkEnvironment.MAINNET | typeof NetworkEnvironment.TESTNET;
    
    if (options.environment) {
      // Use provided environment
      detectedEnvironment = options.environment === 'mainnet' ? NetworkEnvironment.MAINNET : NetworkEnvironment.TESTNET;
    } else {
      // Auto-detect based on network name
      const testnetKeywords = ['testnet', 'sepolia', 'holesky', 'hoodi', 'goerli', 'amoy', 'fuji', 'bepolia', 'curtis'];
      const isTestnet = testnetKeywords.some(keyword => network.toLowerCase().includes(keyword));
      detectedEnvironment = isTestnet ? NetworkEnvironment.TESTNET : NetworkEnvironment.MAINNET;
    }
    
    const chainId = deploymentEnhancementService.getChainId(normalizedNetwork, detectedEnvironment);
    
    console.log(`[TokenWalletIntegration] Getting wallet for project: ${projectId}, network: ${normalizedNetwork}, environment: ${detectedEnvironment === NetworkEnvironment.MAINNET ? 'mainnet' : 'testnet'}, chain_id: ${chainId}`);
    
    try {
      // First, try to find existing wallet if not forcing new
      if (!forceNew) {
        const existingWallet = await this.findExistingWallet(projectId, normalizedNetwork, chainId);
        if (existingWallet) {
          console.log(`✅ FIX #8: Found existing wallet by chain_id ${chainId}: ${existingWallet.walletAddress}`);
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
      console.log(`[TokenWalletIntegration] Generating new wallet for network: ${normalizedNetwork}, chain_id: ${chainId}`);
      
      const walletParams: WalletGenerationParams = {
        projectId,
        projectName: options.projectName || 'Chain Capital Project',
        projectType: options.projectType || 'tokenization',
        network: normalizedNetwork,
        chainId: chainId.toString(), // ✅ FIX #8: Pass chain_id to wallet generation
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
      
      console.log(`✅ FIX #8: Successfully generated wallet with chain_id ${chainId}: ${walletResult.walletAddress}`);
      
      return {
        success: true,
        walletAddress: walletResult.walletAddress,
        privateKey: walletResult.privateKey,
        publicKey: walletResult.publicKey,
        network: normalizedNetwork,
        isNewWallet: true,
        walletId: walletResult.privateKeyVaultId
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
   * ✅ FIX #10: Properly decrypt private key from key_vault_keys table
   * @param projectId Project ID
   * @param network Network name
   * @param chainId Optional chain ID for more precise filtering
   * @returns Existing wallet or null with DECRYPTED private key
   */
  async findExistingWallet(
    projectId: string, 
    network: string, 
    chainId?: string | number
  ): Promise<{
    walletId: string;
    walletAddress: string;
    publicKey: string;
    privateKey?: string;
  } | null> {
    try {
      const { WalletEncryptionClient } = await import('../security/walletEncryptionService');
      
      // ✅ FIX #7: Priority 1 - Search by chain_id (most reliable)
      if (chainId !== undefined && chainId !== null) {
        const { data: chainData, error: chainError } = await supabase
          .from('project_wallets')
          .select('id, wallet_address, public_key, private_key_vault_id, private_key, chain_id')
          .eq('project_id', projectId)
          .eq('chain_id', chainId.toString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (chainError) {
          console.error('[TokenWalletIntegration] Error finding wallet by chain_id:', chainError);
        } else if (chainData) {
          console.log(`✅ FIX #7: Found existing wallet by chain_id ${chainId}: ${chainData.wallet_address}`);
          
          // ✅ FIX #10: Decrypt private key from key_vault_keys
          let decryptedPrivateKey: string | undefined = undefined;
          
          if (chainData.private_key_vault_id) {
            try {
              // Query key_vault_keys to get encrypted private key
              const { data: vaultData, error: vaultError } = await supabase
                .from('key_vault_keys')
                .select('encrypted_key')
                .eq('id', chainData.private_key_vault_id)
                .single();
              
              if (vaultError) {
                console.error('[TokenWalletIntegration] Error fetching encrypted key from vault:', vaultError);
              } else if (vaultData?.encrypted_key) {
                // Decrypt the private key using backend API
                console.log('[TokenWalletIntegration] Decrypting private key from vault...');
                decryptedPrivateKey = await WalletEncryptionClient.decrypt(vaultData.encrypted_key);
                console.log('[TokenWalletIntegration] ✅ Private key decrypted successfully');
              }
            } catch (decryptError) {
              console.error('[TokenWalletIntegration] Failed to decrypt private key:', decryptError);
              // Fall back to legacy private_key column if decryption fails
              if (chainData.private_key) {
                console.warn('[TokenWalletIntegration] Falling back to legacy private_key column');
                decryptedPrivateKey = chainData.private_key;
              }
            }
          } else if (chainData.private_key) {
            // Legacy: try to use private_key column directly (might be encrypted or plain)
            console.warn('[TokenWalletIntegration] No vault ID, using legacy private_key column');
            
            // Check if it's encrypted JSON format
            if (WalletEncryptionClient.isEncrypted(chainData.private_key)) {
              try {
                decryptedPrivateKey = await WalletEncryptionClient.decrypt(chainData.private_key);
                console.log('[TokenWalletIntegration] ✅ Legacy private key decrypted');
              } catch (err) {
                console.error('[TokenWalletIntegration] Failed to decrypt legacy private key:', err);
              }
            } else {
              // Assume it's plain text (very old legacy)
              decryptedPrivateKey = chainData.private_key;
            }
          }
          
          return {
            walletId: chainData.id,
            walletAddress: chainData.wallet_address,
            publicKey: chainData.public_key,
            privateKey: decryptedPrivateKey
          };
        }
      }
      
      // ✅ FIX #7: Priority 2 - Fallback to wallet_type (for legacy wallets)
      const { data, error } = await supabase
        .from('project_wallets')
        .select('id, wallet_address, public_key, private_key_vault_id, private_key, wallet_type')
        .eq('project_id', projectId)
        .eq('wallet_type', network)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('[TokenWalletIntegration] Error finding wallet by wallet_type:', error);
        return null;
      }
      
      if (!data) {
        console.log(`[TokenWalletIntegration] No existing wallet found for project ${projectId}, network ${network}, chain_id ${chainId}`);
        return null;
      }
      
      console.log(`✅ FIX #7: Found existing wallet by wallet_type ${network}: ${data.wallet_address}`);
      
      // ✅ FIX #10: Decrypt private key from key_vault_keys
      let decryptedPrivateKey: string | undefined = undefined;
      
      if (data.private_key_vault_id) {
        try {
          // Query key_vault_keys to get encrypted private key
          const { data: vaultData, error: vaultError } = await supabase
            .from('key_vault_keys')
            .select('encrypted_key')
            .eq('id', data.private_key_vault_id)
            .single();
          
          if (vaultError) {
            console.error('[TokenWalletIntegration] Error fetching encrypted key from vault:', vaultError);
          } else if (vaultData?.encrypted_key) {
            // Decrypt the private key using backend API
            console.log('[TokenWalletIntegration] Decrypting private key from vault...');
            decryptedPrivateKey = await WalletEncryptionClient.decrypt(vaultData.encrypted_key);
            console.log('[TokenWalletIntegration] ✅ Private key decrypted successfully');
          }
        } catch (decryptError) {
          console.error('[TokenWalletIntegration] Failed to decrypt private key:', decryptError);
          // Fall back to legacy private_key column if decryption fails
          if (data.private_key) {
            console.warn('[TokenWalletIntegration] Falling back to legacy private_key column');
            decryptedPrivateKey = data.private_key;
          }
        }
      } else if (data.private_key) {
        // Legacy: try to use private_key column directly (might be encrypted or plain)
        console.warn('[TokenWalletIntegration] No vault ID, using legacy private_key column');
        
        // Check if it's encrypted JSON format
        if (WalletEncryptionClient.isEncrypted(data.private_key)) {
          try {
            decryptedPrivateKey = await WalletEncryptionClient.decrypt(data.private_key);
            console.log('[TokenWalletIntegration] ✅ Legacy private key decrypted');
          } catch (err) {
            console.error('[TokenWalletIntegration] Failed to decrypt legacy private key:', err);
          }
        } else {
          // Assume it's plain text (very old legacy)
          decryptedPrivateKey = data.private_key;
        }
      }
      
      return {
        walletId: data.id,
        walletAddress: data.wallet_address,
        publicKey: data.public_key,
        privateKey: decryptedPrivateKey
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