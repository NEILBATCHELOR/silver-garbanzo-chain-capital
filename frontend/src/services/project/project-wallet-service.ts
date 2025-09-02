import { supabase } from "@/infrastructure/database/client";
import { WalletGeneratorFactory } from "../wallet/generators/WalletGeneratorFactory";
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';

export interface ProjectWalletResult {
  success: boolean;
  walletAddress: string;
  publicKey: string;
  privateKey?: string;
  mnemonic?: string;
  keyVaultId?: string;
  vaultStorageId?: string;
  network: string;
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
}

export interface WalletGenerationParams {
  projectId: string;
  projectName: string;
  projectType: string;
  network?: string;
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
      includePrivateKey = true, 
      includeMnemonic = true 
    } = params;
    
    // Generate a unique request ID
    const requestId = `req-${uuidv4()}`;
    console.log(`[ProjectWalletService] Starting wallet generation for project: ${projectId}, network: ${network}, request ID: ${requestId}`);
    
    try {
      // Create a key vault ID (simulated for now)
      const keyVaultId = `kv-${uuidv4()}`;
      
      // Generate a new wallet with mnemonic
      console.log(`[ProjectWalletService] Generating wallet for network: ${network}`);
      
      // For Ethereum and EVM-compatible chains, use ethers.js
      let wallet: any;
      let mnemonic: string | undefined;
      
      if (['ethereum', 'polygon', 'avalanche', 'optimism', 'base', 'arbitrum'].includes(network.toLowerCase())) {
        const ethWallet = ethers.Wallet.createRandom();
        wallet = {
          address: ethWallet.address,
          privateKey: ethWallet.privateKey,
          publicKey: ethWallet.address // In ethers.js v6, we use the address as public key
        };
        
        // Get the mnemonic if required
        if (includeMnemonic && ethWallet.mnemonic) {
          mnemonic = ethWallet.mnemonic.phrase;
        }
        
        console.log(`[ProjectWalletService] Generated Ethereum-compatible wallet: ${wallet.address}`);
      } else {
        // For other chains, use the generator factory
        const generator = WalletGeneratorFactory.getGenerator(network);
        wallet = await generator.generateWallet();
        
        // For non-ETH chains, we'll need to implement specific mnemonic generation
        if (includeMnemonic) {
          // Generate a BIP39 mnemonic for chains that don't natively provide one
          const ethWallet = ethers.Wallet.createRandom();
          mnemonic = ethWallet.mnemonic?.phrase;
        }
        
        console.log(`[ProjectWalletService] Generated ${network} wallet: ${wallet.address}`);
      }
      
      // Register this generation to prevent duplicates
      inProgressGenerations.set(requestId, { address: wallet.address, requestId });
      
      // In a real implementation, we would store the private key in a secure vault
      // For now, we're just storing it in the database for demonstration purposes
      const walletData: ProjectWalletData = {
        project_id: projectId,
        wallet_type: network,
        wallet_address: wallet.address,
        public_key: wallet.publicKey || wallet.address,
        key_vault_id: keyVaultId,
        // Only include sensitive data if requested
        ...(includePrivateKey && { private_key: wallet.privateKey }),
        ...(includeMnemonic && mnemonic && { mnemonic }),
      };

      console.log(`[ProjectWalletService] Saving wallet to database: ${wallet.address}, request ID: ${requestId}`);
      
      // Pass the request ID to track duplicates
      const savedWallet = await projectWalletService.createProjectWallet(walletData, requestId);
      console.log(`[ProjectWalletService] Wallet saved successfully: ${savedWallet.id}`);
      
      return {
        success: true,
        walletAddress: savedWallet.wallet_address,
        publicKey: savedWallet.public_key,
        privateKey: savedWallet.private_key,
        mnemonic: savedWallet.mnemonic,
        keyVaultId: savedWallet.key_vault_id,
        vaultStorageId: savedWallet.vault_storage_id,
        network: savedWallet.wallet_type
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
   * @param networks List of networks to generate wallets for
   * @returns Array of wallet generation results
   */
  async generateMultiNetworkWallets(
    params: WalletGenerationParams,
    networks: string[]
  ): Promise<ProjectWalletResult[]> {
    const { projectId, includePrivateKey = true, includeMnemonic = true } = params;
    console.log(`[ProjectWalletService] Starting multi-wallet generation for project: ${projectId}, networks: ${networks.join(', ')}`);

    const walletPromises = networks.map(async (network) => {
      const requestId = `req-${uuidv4()}`;
      try {
        const keyVaultId = `kv-${uuidv4()}`;
        let wallet: any;
        let mnemonic: string | undefined;

        if (['ethereum', 'polygon', 'avalanche', 'optimism', 'base', 'arbitrum'].includes(network.toLowerCase())) {
          const ethWallet = ethers.Wallet.createRandom();
          wallet = {
            address: ethWallet.address,
            privateKey: ethWallet.privateKey,
            publicKey: ethWallet.publicKey,
          };
          if (includeMnemonic && ethWallet.mnemonic) {
            mnemonic = ethWallet.mnemonic.phrase;
          }
        } else {
          const generator = WalletGeneratorFactory.getGenerator(network);
          wallet = await generator.generateWallet();
          if (includeMnemonic) {
            const ethWallet = ethers.Wallet.createRandom();
            mnemonic = ethWallet.mnemonic?.phrase;
          }
        }

        inProgressGenerations.set(requestId, { address: wallet.address, requestId });

        const walletData: ProjectWalletData = {
          project_id: projectId,
          wallet_type: network,
          wallet_address: wallet.address,
          public_key: wallet.publicKey || wallet.address,
          key_vault_id: keyVaultId,
          ...(includePrivateKey && { private_key: wallet.privateKey }),
          ...(includeMnemonic && mnemonic && { mnemonic }),
        };

        const savedWallet = await projectWalletService.createProjectWallet(walletData, requestId);
        
        return {
          success: true,
          walletAddress: savedWallet.wallet_address,
          publicKey: savedWallet.public_key,
          privateKey: savedWallet.private_key,
          mnemonic: savedWallet.mnemonic,
          keyVaultId: savedWallet.key_vault_id,
          vaultStorageId: savedWallet.vault_storage_id,
          network: savedWallet.wallet_type,
        };
      } catch (error) {
        console.error(`[ProjectWalletService] Error generating wallet for network ${network}:`, error);
        return {
          success: false,
          walletAddress: '',
          publicKey: '',
          network,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        inProgressGenerations.delete(requestId);
      }
    });

    const results = await Promise.all(walletPromises);
    console.log(`[ProjectWalletService] Completed generating ${results.length} wallets`);
    return results;
  }
};

export default projectWalletService;