import { supabase } from "@/infrastructure/database/client";
import { WalletGeneratorFactory } from "../wallet/generators/WalletGeneratorFactory";
import { WalletEncryptionClient } from "../security/walletEncryptionService";
import { WalletAuditService } from "../security/walletAuditService";
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';
import { getChainEnvironment, resolveChainAndEnvironment } from '@/config/chains';

export interface ProjectWalletResult {
  success: boolean;
  walletAddress: string;
  publicKey: string;
  privateKey?: string;
  mnemonic?: string;
  keyVaultId?: string;
  vaultStorageId?: string;
  network: string;
  chainId?: string | null;
  net?: string;
  error?: string;
}

export interface ProjectWalletData {
  id?: string;
  project_id: string;
  wallet_type: string;
  wallet_address: string;
  public_key: string;
  private_key?: string;
  mnemonic?: string;
  key_vault_id?: string;
  vault_storage_id?: string;
  chain_id?: string | null;
  net?: string;
}

export interface WalletGenerationParams {
  projectId: string;
  projectName: string;
  projectType: string;
  network?: string;
  networkEnvironment?: 'mainnet' | 'testnet' | 'devnet';
  chainId?: string | null;
  net?: string;
  includePrivateKey?: boolean;
  includeMnemonic?: boolean;
  userId?: string;
}

// Store of in-progress wallet generations to prevent duplicate operations
// Maps request IDs to wallets being generated
const inProgressGenerations = new Map<string, { address: string, requestId: string }>();

// Service for managing project wallets
export const projectWalletService = {
  /**
   * Get all wallets for a project
   * @param projectId The project ID
   * @returns The project wallets
   */
  async getProjectWallets(projectId: string): Promise<ProjectWalletData[]> {
    console.log(`[ProjectWalletService] Fetching wallets for project: ${projectId}`);
    
    const { data, error } = await supabase
      .from('project_wallets')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      console.error('[ProjectWalletService] Error fetching project wallets:', error);
      throw error;
    }

    console.log(`[ProjectWalletService] Found ${data?.length || 0} wallets for project: ${projectId}`);
    return data || [];
  },

  /**
   * Create a new wallet for a project
   * @param walletData The wallet data to create
   * @returns The created wallet
   */
  async createProjectWallet(walletData: ProjectWalletData, requestId?: string): Promise<ProjectWalletData> {
    console.log(`[ProjectWalletService] Attempting to create wallet for project: ${walletData.project_id}, network: ${walletData.wallet_type}`);

    // Check if a wallet with this address already exists
    const { data: existing, error: existingError } = await supabase
      .from('project_wallets')
      .select('id')
      .eq('wallet_address', walletData.wallet_address)
      .maybeSingle();

    if (existingError) {
      console.error('[ProjectWalletService] Error checking for existing wallet:', existingError);
      throw existingError;
    }

    if (existing) {
      console.warn(`[ProjectWalletService] Wallet with address ${walletData.wallet_address} already exists. Skipping creation.`);
      // Fetch the full wallet data to return it
      const { data: fullWallet, error: fetchError } = await supabase
        .from('project_wallets')
        .select('*')
        .eq('id', existing.id)
        .single();
      
      if (fetchError) {
        console.error('[ProjectWalletService] Error fetching existing wallet data:', fetchError);
        throw fetchError;
      }
      return fullWallet;
    }

    console.log(`[ProjectWalletService] Creating wallet for project: ${walletData.project_id}, network: ${walletData.wallet_type}, address: ${walletData.wallet_address}`);
    
    // If this is part of a wallet generation, check if it's a duplicate request
    if (requestId) {
      const inProgressWallet = Array.from(inProgressGenerations.values())
        .find(w => w.address === walletData.wallet_address && w.requestId !== requestId);
      
      if (inProgressWallet) {
        console.warn(`[ProjectWalletService] Duplicate creation detected for wallet: ${walletData.wallet_address}`);
        
        // Wait a bit to let the other request finish
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if the wallet was created by the other request
        const { data: existingWallet } = await supabase
          .from('project_wallets')
          .select('*')
          .eq('wallet_address', walletData.wallet_address)
          .maybeSingle();
          
        if (existingWallet) {
          console.log(`[ProjectWalletService] Using wallet created by another request: ${existingWallet.id}`);
          return existingWallet;
        }
      }
    }
    
    // Create the wallet in the database
    const { data, error } = await supabase
      .from('project_wallets')
      .insert(walletData)
      .select('*')
      .single();

    if (error) {
      console.error('[ProjectWalletService] Error creating project wallet:', error);
      throw error;
    }

    console.log(`[ProjectWalletService] Successfully created wallet: ${data?.id}`);
    return data;
  },

  /**
   * Update a project wallet
   * @param walletId The wallet ID
   * @param walletData The wallet data to update
   * @returns The updated wallet
   */
  async updateProjectWallet(walletId: string, walletData: Partial<ProjectWalletData>): Promise<ProjectWalletData> {
    console.log(`[ProjectWalletService] Updating wallet: ${walletId}`);
    
    const { data, error } = await supabase
      .from('project_wallets')
      .update(walletData)
      .eq('id', walletId)
      .select('*')
      .single();

    if (error) {
      console.error('[ProjectWalletService] Error updating project wallet:', error);
      throw error;
    }

    console.log(`[ProjectWalletService] Successfully updated wallet: ${walletId}`);
    return data;
  },

  /**
   * Delete a project wallet
   * @param walletId The wallet ID
   * @returns True if the wallet was deleted
   */
  async deleteProjectWallet(walletId: string): Promise<boolean> {
    console.log(`[ProjectWalletService] Deleting wallet: ${walletId}`);
    
    const { error } = await supabase
      .from('project_wallets')
      .delete()
      .eq('id', walletId);

    if (error) {
      console.error('[ProjectWalletService] Error deleting project wallet:', error);
      throw error;
    }

    console.log(`[ProjectWalletService] Successfully deleted wallet: ${walletId}`);
    return true;
  }
};

// Enhanced service that includes wallet generation functionality
export const enhancedProjectWalletService = {
  ...projectWalletService,

  /**
   * Generate a wallet for a project and save it to the database
   * @param params Wallet generation parameters
   * @returns The generated wallet result
   */
  async generateWalletForProject(params: WalletGenerationParams): Promise<ProjectWalletResult> {
    const { 
      projectId, 
      network = 'ethereum',
      networkEnvironment = 'testnet',
      chainId,
      net,
      includePrivateKey = true, 
      includeMnemonic = true 
    } = params;
    
    // Generate a unique request ID
    const requestId = `req-${uuidv4()}`;
    console.log(`[ProjectWalletService] Starting wallet generation for project: ${projectId}, network: ${network}, environment: ${net}, request ID: ${requestId}`);
    
    try {
      // Use provided chainId and net, or fall back to defaults
      let finalChainId = chainId;
      let finalNet = net;
      
      // If chainId or net not provided, try to get from chain config
      // First, resolve the network input to proper chain/environment pair
      if (!finalChainId || !finalNet) {
        const resolved = resolveChainAndEnvironment(network, networkEnvironment);
        if (!resolved) {
          throw new Error(`Unsupported network environment: ${network}${networkEnvironment ? ' ' + networkEnvironment : ''}`);
        }
        
        const envConfig = getChainEnvironment(resolved.chain, resolved.environment);
        if (!envConfig) {
          throw new Error(`Unsupported network environment: ${resolved.chain} ${resolved.environment}`);
        }
        
        console.log(`[ProjectWalletService] Resolved network '${network}' to chain '${resolved.chain}' environment '${resolved.environment}'`);
        finalChainId = finalChainId || envConfig.chainId;
        finalNet = finalNet || envConfig.net;
      }
      
      console.log(`[ProjectWalletService] Network identifiers - chain_id: ${finalChainId}, net: ${finalNet}`);
      
      // Create a key vault ID (simulated for now)
      const keyVaultId = `kv-${uuidv4()}`;
      
      // Generate a new wallet using the WalletGeneratorFactory for consistency
      console.log(`[ProjectWalletService] Generating wallet for network: ${network} using WalletGeneratorFactory`);
      
      const generator = WalletGeneratorFactory.getGenerator(network);
      const wallet = await generator.generateWallet();
      
      // For mnemonic generation, use ethers.js for all chains as a consistent approach
      let mnemonic: string | undefined;
      if (includeMnemonic) {
        const ethWallet = ethers.Wallet.createRandom();
        mnemonic = ethWallet.mnemonic?.phrase;
      }
      
      console.log(`[ProjectWalletService] Generated ${network} wallet: ${wallet.address}`);
      
      // Ensure we have the required properties from the generator
      const walletAddress = wallet.address;
      const publicKey = wallet.publicKey || wallet.address;
      const privateKey = wallet.privateKey;
      
      // Register this generation to prevent duplicates
      inProgressGenerations.set(requestId, { address: walletAddress, requestId });
      
      // Encrypt sensitive data before storing
      let encryptedPrivateKey: string | undefined;
      let encryptedMnemonic: string | undefined;
      
      if (includePrivateKey && privateKey) {
        try {
          encryptedPrivateKey = await WalletEncryptionClient.encrypt(privateKey);
          console.log(`[ProjectWalletService] Private key encrypted for wallet: ${walletAddress}`);
        } catch (error) {
          console.error('[ProjectWalletService] Failed to encrypt private key:', error);
          throw new Error('Failed to encrypt private key');
        }
      }
      
      if (includeMnemonic && mnemonic) {
        try {
          encryptedMnemonic = await WalletEncryptionClient.encrypt(mnemonic);
          console.log(`[ProjectWalletService] Mnemonic encrypted for wallet: ${walletAddress}`);
        } catch (error) {
          console.error('[ProjectWalletService] Failed to encrypt mnemonic:', error);
          throw new Error('Failed to encrypt mnemonic');
        }
      }
      
      // In a real implementation, we would store the private key in a secure vault
      // For now, we're storing it encrypted in the database
      const walletData: ProjectWalletData = {
        project_id: projectId,
        wallet_type: network,
        wallet_address: walletAddress,
        public_key: publicKey,
        key_vault_id: keyVaultId,
        chain_id: finalChainId,
        net: finalNet,
        // Store encrypted sensitive data
        private_key: encryptedPrivateKey,
        mnemonic: encryptedMnemonic,
      };

      console.log(`[ProjectWalletService] Saving wallet to database: ${walletAddress}, request ID: ${requestId}`);
      
      // Pass the request ID to track duplicates
      const savedWallet = await projectWalletService.createProjectWallet(walletData, requestId);
      console.log(`[ProjectWalletService] Wallet saved successfully: ${savedWallet.id}`);
      
      // Log wallet creation
      if (params.userId) {
        await WalletAuditService.logAccess({
          walletId: savedWallet.id,
          accessedBy: params.userId,
          action: 'create',
          success: true,
          metadata: {
            network,
            chainId: finalChainId,
            net: finalNet,
            hasPrivateKey: !!encryptedPrivateKey,
            hasMnemonic: !!encryptedMnemonic
          }
        });
      }
      
      // Return UNENCRYPTED data for immediate display
      // The encrypted versions are already stored in the database
      return {
        success: true,
        walletAddress: savedWallet.wallet_address,
        publicKey: savedWallet.public_key,
        privateKey: includePrivateKey ? privateKey : undefined,
        mnemonic: includeMnemonic ? mnemonic : undefined,
        keyVaultId: savedWallet.key_vault_id,
        vaultStorageId: savedWallet.vault_storage_id,
        network: savedWallet.wallet_type,
        chainId: savedWallet.chain_id,
        net: savedWallet.net,
      };
    } catch (error) {
      console.error('[ProjectWalletService] Error generating wallet for project:', error);
      return {
        success: false,
        walletAddress: '',
        publicKey: '',
        network,
        error: error instanceof Error ? error.message : 'Unknown error generating wallet'
      };
    } finally {
      // Clean up the tracking entry
      inProgressGenerations.delete(requestId);
      console.log(`[ProjectWalletService] Completed wallet generation operation: ${requestId}`);
    }
  },

  /**
   * Generate multiple wallets for different networks
   * @param params Base wallet generation parameters
   * @param networksWithEnvironments List of networks with their environments
   * @returns Array of wallet generation results
   */
  async generateMultiNetworkWallets(
    params: WalletGenerationParams,
    networksWithEnvironments: Array<{ network: string; environment: any }>
  ): Promise<ProjectWalletResult[]> {
    const { 
      projectId, 
      includePrivateKey = true, 
      includeMnemonic = true 
    } = params;
    console.log(`[ProjectWalletService] Starting multi-wallet generation for project: ${projectId}, networks: ${networksWithEnvironments.map(n => n.network).join(', ')}`);

    const walletPromises = networksWithEnvironments.map(async ({ network, environment }) => {
      const requestId = `req-${uuidv4()}`;
      try {
        const keyVaultId = `kv-${uuidv4()}`;
        
        // Use WalletGeneratorFactory consistently for all chains
        console.log(`[ProjectWalletService] Generating wallet for network: ${network} using WalletGeneratorFactory`);
        const generator = WalletGeneratorFactory.getGenerator(network);
        const wallet = await generator.generateWallet();
        
        // Generate mnemonic consistently for all chains
        let mnemonic: string | undefined;
        if (includeMnemonic) {
          const ethWallet = ethers.Wallet.createRandom();
          mnemonic = ethWallet.mnemonic?.phrase;
        }
        
        // Ensure we have the required properties from the generator
        const walletAddress = wallet.address;
        const publicKey = wallet.publicKey || wallet.address;
        const privateKey = wallet.privateKey;

        // Register this generation to prevent duplicates
        inProgressGenerations.set(requestId, { address: walletAddress, requestId });
        
        // Encrypt sensitive data before storing
        let encryptedPrivateKey: string | undefined;
        let encryptedMnemonic: string | undefined;
        
        if (includePrivateKey && privateKey) {
          try {
            encryptedPrivateKey = await WalletEncryptionClient.encrypt(privateKey);
          } catch (error) {
            console.error(`[ProjectWalletService] Failed to encrypt private key for ${network}:`, error);
            throw new Error('Failed to encrypt private key');
          }
        }
        
        if (includeMnemonic && mnemonic) {
          try {
            encryptedMnemonic = await WalletEncryptionClient.encrypt(mnemonic);
          } catch (error) {
            console.error(`[ProjectWalletService] Failed to encrypt mnemonic for ${network}:`, error);
            throw new Error('Failed to encrypt mnemonic');
          }
        }
        
        const walletData: ProjectWalletData = {
          project_id: projectId,
          wallet_type: network,
          wallet_address: walletAddress,
          public_key: publicKey,
          key_vault_id: keyVaultId,
          chain_id: environment.chainId,
          net: environment.net,
          // Store encrypted sensitive data
          private_key: encryptedPrivateKey,
          mnemonic: encryptedMnemonic,
        };

        const savedWallet = await projectWalletService.createProjectWallet(walletData, requestId);
        
        // Log wallet creation
        if (params.userId) {
          await WalletAuditService.logAccess({
            walletId: savedWallet.id,
            accessedBy: params.userId,
            action: 'create',
            success: true,
            metadata: {
              network,
              chainId: environment.chainId,
              net: environment.net,
              hasPrivateKey: !!encryptedPrivateKey,
              hasMnemonic: !!encryptedMnemonic
            }
          });
        }
        
        // Return UNENCRYPTED data for immediate display
        return {
          success: true,
          walletAddress: savedWallet.wallet_address,
          publicKey: savedWallet.public_key,
          privateKey: includePrivateKey ? privateKey : undefined,
          mnemonic: includeMnemonic ? mnemonic : undefined,
          keyVaultId: savedWallet.key_vault_id,
          vaultStorageId: savedWallet.vault_storage_id,
          network: savedWallet.wallet_type,
          chainId: savedWallet.chain_id,
          net: savedWallet.net,
        };
      } catch (error) {
        console.error(`[ProjectWalletService] Error generating ${network} wallet:`, error);
        return {
          success: false,
          walletAddress: '',
          publicKey: '',
          network,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      } finally {
        inProgressGenerations.delete(requestId);
      }
    });

    const results = await Promise.all(walletPromises);
    console.log(`[ProjectWalletService] Multi-wallet generation complete. Success: ${results.filter(r => r.success).length}/${results.length}`);
    return results;
  }
};

export default projectWalletService;