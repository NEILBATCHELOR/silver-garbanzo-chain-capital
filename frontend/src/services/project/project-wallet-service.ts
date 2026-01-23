import { supabase } from "@/infrastructure/database/client";
import { WalletGeneratorFactory } from "../wallet/generators/WalletGeneratorFactory";
import { InjectiveWalletGenerator } from "../wallet/generators/InjectiveWalletGenerator";
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
  privateKeyVaultId?: string;
  mnemonicVaultId?: string;
  network: string;
  chainId?: string | null;
  nonEvmNetwork?: string | null;
  error?: string;
}

export interface ProjectWalletData {
  id?: string;
  project_id: string;
  wallet_address: string;
  public_key: string;
  wallet_type?: string; // ✅ FIX #9: Add wallet_type field for backward compatibility
  evm_address?: string | null; // EVM address for Injective wallets
  evm_chain_id?: string | null; // EVM chain ID for Injective (1776 mainnet, 1439 testnet)
  private_key?: string;
  mnemonic?: string;
  private_key_vault_id?: string;
  mnemonic_vault_id?: string;
  chain_id?: string | null;
  non_evm_network?: string | null;
  bitcoin_network_type?: string | null;
  net?: string | null; // Network environment (mainnet/testnet/devnet)
  project_wallet_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WalletGenerationParams {
  projectId: string;
  projectName: string;
  projectType: string;
  network?: string;
  networkEnvironment?: 'mainnet' | 'testnet' | 'devnet';
  chainId?: string | null;
  nonEvmNetwork?: string | null;
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
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }); // ✅ FIX: Order by newest first

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
    const networkInfo = walletData.chain_id || walletData.non_evm_network || 'unknown';
    console.log(`[ProjectWalletService] Attempting to create wallet for project: ${walletData.project_id}, network: ${networkInfo}`);

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

    console.log(`[ProjectWalletService] Creating wallet for project: ${walletData.project_id}, network: ${networkInfo}, address: ${walletData.wallet_address}`);

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
      nonEvmNetwork,
      includePrivateKey = true,
      includeMnemonic = true
    } = params;

    // Generate a unique request ID
    const requestId = `req-${uuidv4()}`;
    const environmentType = networkEnvironment === 'mainnet' ? 'mainnet' : 'testnet';
    console.log(`[ProjectWalletService] Starting wallet generation for project: ${projectId}, network: ${network}, environment: ${environmentType}, request ID: ${requestId}`);

    try {
      // Use provided chainId and nonEvmNetwork, or fall back to chain config
      let finalChainId = chainId;
      let finalNonEvmNetwork = nonEvmNetwork;

      // CRITICAL FIX: Set non_evm_network for ALL non-EVM blockchains
      const nonEvmNetworks = ['solana', 'solana-devnet', 'solana-testnet', 'ripple', 'ripple-testnet', 'bitcoin', 'bitcoin-testnet'];
      
      if (nonEvmNetworks.some(net => network.toLowerCase().includes(net.split('-')[0]))) {
        // Extract base network name (e.g., 'solana' from 'solana-devnet')
        const baseNetwork = network.toLowerCase().split('-')[0];
        finalNonEvmNetwork = baseNetwork;
        
        console.log(`[ProjectWalletService] Non-EVM network detected - setting non_evm_network to '${finalNonEvmNetwork}'`);
      }

      // Special handling for Injective - use Cosmos chain ID format
      if (network === 'injective' || network === 'injective-testnet') {
        // Use official Cosmos chain ID format ('injective-888' for testnet, 'injective-1' for mainnet)
        finalChainId = networkEnvironment === 'mainnet' ? 'injective-1' : 'injective-888';
        finalNonEvmNetwork = 'injective';
        console.log(`[ProjectWalletService] Injective wallet - using Cosmos chain ID '${finalChainId}' and non_evm_network 'injective'`);
      } else if (!finalChainId && !finalNonEvmNetwork) {
        // If chainId not provided and this is an EVM network, get from chain config
        const envConfig = getChainEnvironment(network, environmentType);
        if (!envConfig) {
          throw new Error(`Unsupported network environment: ${network} ${environmentType}`);
        }

        console.log(`[ProjectWalletService] Resolved network '${network}' to chain ID '${envConfig.chainId}'`);
        finalChainId = envConfig.chainId;
      }

      console.log(`[ProjectWalletService] Network identifiers - chain_id: ${finalChainId}, non_evm_network: ${finalNonEvmNetwork}`);

      // Generate a new wallet using the WalletGeneratorFactory for consistency
      console.log(`[ProjectWalletService] Generating wallet for network: ${network} using WalletGeneratorFactory`);

      const generator = WalletGeneratorFactory.getGenerator(network);
      
      // CRITICAL FIX: Generate wallet WITH mnemonic from the generator itself
      // Don't create a separate random mnemonic - use the one from the wallet!
      const wallet = await generator.generateWallet({
        includePrivateKey: true,
        includeMnemonic: includeMnemonic
      });

      console.log(`[ProjectWalletService] Generated ${network} wallet: ${wallet.address}`);

      // Ensure we have the required properties from the generator
      const walletAddress = wallet.address;
      const publicKey = wallet.publicKey || wallet.address;
      let privateKey = wallet.privateKey;
      let mnemonic = wallet.mnemonic; // ✅ FIX: Use mnemonic FROM the generator, not a random one!

      // CRITICAL FIX: For Injective wallets, derive EVM-compatible private key from mnemonic
      // The Injective private key cannot be used with ethers.js for contract deployment
      // We need the EVM private key derived from the same mnemonic using BIP44 path m/44'/60'/0'/0/0
      if ((network === 'injective' || network === 'injective-testnet') && mnemonic) {
        try {
          console.log(`[ProjectWalletService] Deriving EVM private key for Injective wallet from mnemonic`);
          privateKey = InjectiveWalletGenerator.getEvmPrivateKey(mnemonic);
          console.log(`[ProjectWalletService] ✓ EVM private key derived successfully (length: ${privateKey?.length})`);
        } catch (error) {
          console.error('[ProjectWalletService] Failed to derive EVM private key from mnemonic:', error);
          throw new Error('Failed to derive EVM private key for Injective wallet');
        }
      }

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

      // Derive EVM address and chain ID for Injective wallets BEFORE creating vault keys
      let evmAddress: string | null = null;
      let evmChainId: string | null = null;
      if (network === 'injective' || network === 'injective-testnet') {
        try {
          evmAddress = InjectiveWalletGenerator.getEvmAddress(walletAddress);
          // EVM compatibility chain IDs: 1776 (mainnet), 1439 (testnet)
          evmChainId = networkEnvironment === 'mainnet' ? '1776' : '1439';
          console.log(`[ProjectWalletService] Derived EVM address for Injective wallet: ${evmAddress}, EVM chain ID: ${evmChainId}`);
        } catch (error) {
          console.error('[ProjectWalletService] Failed to derive EVM address:', error);
        }
      }

      // PHASE 2: Dual-Write Implementation
      // Create key_vault_keys records FIRST (for proper FK)
      let privateKeyVaultId: string | undefined;
      let mnemonicVaultId: string | undefined;

      if (encryptedPrivateKey) {
        const { data: privateKeyRecord, error: pkError } = await supabase
          .from('key_vault_keys')
          .insert({
            key_id: `project_${projectId}_${walletAddress}_private`,
            encrypted_key: encryptedPrivateKey,
            key_type: 'project_private_key',
            metadata: {
              project_id: projectId,
              wallet_address: walletAddress,
              network: network,
              chain_id: finalChainId,
              non_evm_network: finalNonEvmNetwork,
              // For Injective, also store EVM chain ID and EVM address
              ...(network === 'injective' || network === 'injective-testnet' ? {
                evm_chain_id: evmChainId,
                evm_address: evmAddress
              } : {})
            },
            created_by: params.userId || null
          })
          .select('id')
          .single();

        if (pkError) {
          console.error('[ProjectWalletService] Failed to create private key vault record:', pkError);
          throw new Error('Failed to create private key vault record');
        }

        privateKeyVaultId = privateKeyRecord.id;
        console.log(`[ProjectWalletService] Created private_key vault record: ${privateKeyVaultId}`);
      }

      if (encryptedMnemonic) {
        const { data: mnemonicRecord, error: mnError } = await supabase
          .from('key_vault_keys')
          .insert({
            key_id: `project_${projectId}_${walletAddress}_mnemonic`,
            encrypted_key: encryptedMnemonic,
            key_type: 'project_mnemonic',
            metadata: {
              project_id: projectId,
              wallet_address: walletAddress,
              network: network,
              chain_id: finalChainId,
              non_evm_network: finalNonEvmNetwork,
              // For Injective, also store EVM chain ID and EVM address
              ...(network === 'injective' || network === 'injective-testnet' ? {
                evm_chain_id: evmChainId,
                evm_address: evmAddress
              } : {})
            },
            created_by: params.userId || null
          })
          .select('id')
          .single();

        if (mnError) {
          console.error('[ProjectWalletService] Failed to create mnemonic vault record:', mnError);
          throw new Error('Failed to create mnemonic vault record');
        }

        mnemonicVaultId = mnemonicRecord.id;
        console.log(`[ProjectWalletService] Created mnemonic vault record: ${mnemonicVaultId}`);
      }

      // CRITICAL: Wait for database to commit vault key records before proceeding
      // This prevents race conditions where project_wallet is created before vault keys are fully committed
      if (privateKeyVaultId || mnemonicVaultId) {
        console.log(`[ProjectWalletService] Waiting for vault key records to be committed...`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Create project_wallets record with dual FK references
      // - private_key_vault_id → key_vault_keys(project_private_key)
      // - mnemonic_vault_id → key_vault_keys(project_mnemonic)
      // - Encrypted copies in private_key and mnemonic columns (backward compatibility)
      const walletData: ProjectWalletData = {
        project_id: projectId,
        wallet_address: walletAddress,
        public_key: publicKey,
        wallet_type: network, // ✅ FIX #9: Set wallet_type for backward compatibility and filtering
        evm_address: evmAddress, // Store EVM address for Injective wallets
        evm_chain_id: evmChainId, // Store EVM chain ID (1776 mainnet, 1439 testnet)
        private_key_vault_id: privateKeyVaultId, // FK to private key record
        mnemonic_vault_id: mnemonicVaultId, // FK to mnemonic record
        chain_id: finalChainId,
        non_evm_network: finalNonEvmNetwork,
        net: networkEnvironment, // ✅ FIX: Store network environment (mainnet/testnet/devnet)
        // Store encrypted data for backward compatibility
        private_key: encryptedPrivateKey,
        mnemonic: encryptedMnemonic,
      };

      console.log(`[ProjectWalletService] Saving wallet to database: ${walletAddress}, wallet_type: ${network}, chain_id: ${finalChainId}, request ID: ${requestId}`);

      // Pass the request ID to track duplicates
      const savedWallet = await projectWalletService.createProjectWallet(walletData, requestId);
      console.log(`[ProjectWalletService] Wallet saved successfully: ${savedWallet.id}`);

      // CRITICAL: Wait for database to commit project_wallet record before updating vault keys
      // This prevents race conditions and ensures proper ordering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update key_vault_keys with project_wallet_id reference (bidirectional link)
      // IMPORTANT: We only update the project_wallet_id column, metadata is preserved
      if (privateKeyVaultId) {
        console.log(`[ProjectWalletService] Updating private key vault record with project_wallet_id: ${savedWallet.id}`);

        // First verify the metadata still exists
        const { data: pkVaultCheck, error: pkCheckError } = await supabase
          .from('key_vault_keys')
          .select('metadata')
          .eq('id', privateKeyVaultId)
          .single();

        if (pkCheckError) {
          console.error('[ProjectWalletService] Failed to verify private key vault metadata:', pkCheckError);
        } else {
          console.log(`[ProjectWalletService] Private key vault metadata verified:`, JSON.stringify(pkVaultCheck.metadata));

          // Check if EVM address is in metadata for Injective wallets
          if ((network === 'injective' || network === 'injective-testnet') && pkVaultCheck.metadata) {
            if (!pkVaultCheck.metadata.evm_address) {
              console.warn(`[ProjectWalletService] WARNING: Private key vault metadata missing evm_address!`);
            } else {
              console.log(`[ProjectWalletService] ✓ Private key vault has evm_address: ${pkVaultCheck.metadata.evm_address}`);
            }
          }
        }

        // Now update with project_wallet_id
        const { error: updatePkError } = await supabase
          .from('key_vault_keys')
          .update({ project_wallet_id: savedWallet.id })
          .eq('id', privateKeyVaultId);

        if (updatePkError) {
          console.error('[ProjectWalletService] Failed to update private key vault record with project_wallet_id:', updatePkError);
          // Non-fatal - record still created
        } else {
          console.log(`[ProjectWalletService] ✓ Updated private_key vault record with project_wallet_id`);

          // Verify metadata was preserved after update
          const { data: pkVaultVerify } = await supabase
            .from('key_vault_keys')
            .select('metadata')
            .eq('id', privateKeyVaultId)
            .single();

          if (pkVaultVerify && (network === 'injective' || network === 'injective-testnet')) {
            if (!pkVaultVerify.metadata?.evm_address) {
              console.error(`[ProjectWalletService] ERROR: Metadata lost evm_address after update!`);
            } else {
              console.log(`[ProjectWalletService] ✓ Metadata preserved after update, evm_address: ${pkVaultVerify.metadata.evm_address}`);
            }
          }
        }
      }

      if (mnemonicVaultId) {
        console.log(`[ProjectWalletService] Updating mnemonic vault record with project_wallet_id: ${savedWallet.id}`);

        // First verify the metadata still exists
        const { data: mnVaultCheck, error: mnCheckError } = await supabase
          .from('key_vault_keys')
          .select('metadata')
          .eq('id', mnemonicVaultId)
          .single();

        if (mnCheckError) {
          console.error('[ProjectWalletService] Failed to verify mnemonic vault metadata:', mnCheckError);
        } else {
          console.log(`[ProjectWalletService] Mnemonic vault metadata verified:`, JSON.stringify(mnVaultCheck.metadata));

          // Check if EVM address is in metadata for Injective wallets
          if ((network === 'injective' || network === 'injective-testnet') && mnVaultCheck.metadata) {
            if (!mnVaultCheck.metadata.evm_address) {
              console.warn(`[ProjectWalletService] WARNING: Mnemonic vault metadata missing evm_address!`);
            } else {
              console.log(`[ProjectWalletService] ✓ Mnemonic vault has evm_address: ${mnVaultCheck.metadata.evm_address}`);
            }
          }
        }

        // Now update with project_wallet_id
        const { error: updateMnError } = await supabase
          .from('key_vault_keys')
          .update({ project_wallet_id: savedWallet.id })
          .eq('id', mnemonicVaultId);

        if (updateMnError) {
          console.error('[ProjectWalletService] Failed to update mnemonic vault record with project_wallet_id:', updateMnError);
          // Non-fatal - record still created
        } else {
          console.log(`[ProjectWalletService] ✓ Updated mnemonic vault record with project_wallet_id`);

          // Verify metadata was preserved after update
          const { data: mnVaultVerify } = await supabase
            .from('key_vault_keys')
            .select('metadata')
            .eq('id', mnemonicVaultId)
            .single();

          if (mnVaultVerify && (network === 'injective' || network === 'injective-testnet')) {
            if (!mnVaultVerify.metadata?.evm_address) {
              console.error(`[ProjectWalletService] ERROR: Metadata lost evm_address after update!`);
            } else {
              console.log(`[ProjectWalletService] ✓ Metadata preserved after update, evm_address: ${mnVaultVerify.metadata.evm_address}`);
            }
          }
        }
      }

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
            nonEvmNetwork: finalNonEvmNetwork,
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
        privateKeyVaultId: privateKeyVaultId,
        mnemonicVaultId: mnemonicVaultId,
        network,
        chainId: savedWallet.chain_id,
        nonEvmNetwork: savedWallet.non_evm_network,
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

        // PHASE 2: Dual-Write Implementation
        // Create key_vault_keys records FIRST (for proper FK)
        let privateKeyVaultId: string | undefined;
        let mnemonicVaultId: string | undefined;

        // Determine chain IDs for metadata - use Cosmos chain ID format for Injective
        const metadataChainId = (network === 'injective' || network === 'injective-testnet')
          ? (environment.name === 'mainnet' ? 'injective-1' : 'injective-888')
          : environment.chainId;
        const metadataNonEvmNetwork = (network === 'injective' || network === 'injective-testnet')
          ? 'injective'
          : environment.net;
        const metadataEvmChainId = (network === 'injective' || network === 'injective-testnet')
          ? (environment.name === 'mainnet' ? '1776' : '1439')
          : undefined;

        if (encryptedPrivateKey) {
          const { data: privateKeyRecord, error: pkError } = await supabase
            .from('key_vault_keys')
            .insert({
              key_id: `project_${projectId}_${walletAddress}_private`,
              encrypted_key: encryptedPrivateKey,
              key_type: 'project_private_key',
              metadata: {
                project_id: projectId,
                wallet_address: walletAddress,
                network: network,
                chain_id: metadataChainId,
                non_evm_network: metadataNonEvmNetwork,
                // For Injective, also store EVM chain ID for EVM compatibility
                ...(metadataEvmChainId ? { evm_chain_id: metadataEvmChainId } : {})
              },
              created_by: params.userId || null
            })
            .select('id')
            .single();

          if (pkError) {
            console.error(`[ProjectWalletService] Failed to create private key vault record for ${network}:`, pkError);
            throw new Error('Failed to create private key vault record');
          }

          privateKeyVaultId = privateKeyRecord.id;
          console.log(`[ProjectWalletService] Created private_key vault record for ${network}: ${privateKeyVaultId}`);
        }

        if (encryptedMnemonic) {
          const { data: mnemonicRecord, error: mnError } = await supabase
            .from('key_vault_keys')
            .insert({
              key_id: `project_${projectId}_${walletAddress}_mnemonic`,
              encrypted_key: encryptedMnemonic,
              key_type: 'project_mnemonic',
              metadata: {
                project_id: projectId,
                wallet_address: walletAddress,
                network: network,
                chain_id: metadataChainId,
                non_evm_network: metadataNonEvmNetwork,
                // For Injective, also store EVM chain ID for EVM compatibility
                ...(metadataEvmChainId ? { evm_chain_id: metadataEvmChainId } : {})
              },
              created_by: params.userId || null
            })
            .select('id')
            .single();

          if (mnError) {
            console.error(`[ProjectWalletService] Failed to create mnemonic vault record for ${network}:`, mnError);
            throw new Error('Failed to create mnemonic vault record');
          }

          mnemonicVaultId = mnemonicRecord.id;
          console.log(`[ProjectWalletService] Created mnemonic vault record for ${network}: ${mnemonicVaultId}`);
        }

        // Derive EVM address and chain ID for Injective wallets
        let evmAddress: string | null = null;
        let evmChainId: string | null = null;
        if (network === 'injective' || network === 'injective-testnet') {
          try {
            evmAddress = InjectiveWalletGenerator.getEvmAddress(walletAddress);
            // EVM compatibility chain IDs: 1776 (mainnet), 1439 (testnet)
            evmChainId = environment.name === 'mainnet' ? '1776' : '1439';
            console.log(`[ProjectWalletService] Derived EVM address for ${network} wallet: ${evmAddress}, EVM chain ID: ${evmChainId}`);
          } catch (error) {
            console.error(`[ProjectWalletService] Failed to derive EVM address for ${network}:`, error);
          }
        }

        // Special handling for Injective chain IDs
        let finalChainId: string | null = environment.chainId;
        let finalNonEvmNetwork: string | null = environment.net;

        if (network === 'injective' || network === 'injective-testnet') {
          // Use official Cosmos chain ID format ('injective-888' for testnet, 'injective-1' for mainnet)
          finalChainId = environment.name === 'mainnet' ? 'injective-1' : 'injective-888';
          finalNonEvmNetwork = 'injective';
          console.log(`[ProjectWalletService] Injective wallet - using Cosmos chain ID '${finalChainId}' and non_evm_network 'injective'`);
        }

        const walletData: ProjectWalletData = {
          project_id: projectId,
          wallet_address: walletAddress,
          public_key: publicKey,
          evm_address: evmAddress, // Store EVM address for Injective wallets
          evm_chain_id: evmChainId, // Store EVM chain ID (1776 mainnet, 1439 testnet)
          private_key_vault_id: privateKeyVaultId, // FK to private key record
          mnemonic_vault_id: mnemonicVaultId, // FK to mnemonic record
          chain_id: finalChainId,
          non_evm_network: finalNonEvmNetwork,
          // Store encrypted data for backward compatibility
          private_key: encryptedPrivateKey,
          mnemonic: encryptedMnemonic,
        };

        const savedWallet = await projectWalletService.createProjectWallet(walletData, requestId);

        // Update key_vault_keys with project_wallet_id reference (bidirectional link)
        if (privateKeyVaultId) {
          const { error: updatePkError } = await supabase
            .from('key_vault_keys')
            .update({ project_wallet_id: savedWallet.id })
            .eq('id', privateKeyVaultId);

          if (updatePkError) {
            console.error(`[ProjectWalletService] Failed to update private key vault record with project_wallet_id for ${network}:`, updatePkError);
          }
        }

        if (mnemonicVaultId) {
          const { error: updateMnError } = await supabase
            .from('key_vault_keys')
            .update({ project_wallet_id: savedWallet.id })
            .eq('id', mnemonicVaultId);

          if (updateMnError) {
            console.error(`[ProjectWalletService] Failed to update mnemonic vault record with project_wallet_id for ${network}:`, updateMnError);
          }
        }

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
              nonEvmNetwork: environment.net,
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
          network,
          chainId: savedWallet.chain_id,
          nonEvmNetwork: savedWallet.non_evm_network,
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