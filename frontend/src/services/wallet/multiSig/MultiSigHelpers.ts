/**
 * Multi-Signature Wallet Shared Helpers
 * Shared utility functions for wallet and proposal services
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { ChainType } from '@/services/wallet/AddressUtils';
import { rpcManager } from '@/infrastructure/web3/rpc';
import { validateBlockchain } from '@/infrastructure/web3/utils/BlockchainValidator';
import { getChainId, getChainName, isValidChainId, CHAIN_IDS } from '@/infrastructure/web3/utils';
import type { ProjectWallet, MultiSigSignerOptions } from '@/types/domain/wallet';

// ============================================================================
// PROJECT WALLET METHODS
// ============================================================================

/**
 * Get project wallet for funding deployments
 * Uses any available wallet from project_wallets table
 */
export async function getProjectWallet(
  projectId: string,
  blockchain?: string
): Promise<ProjectWallet> {
  try {
    const query = supabase
      .from('project_wallets')
      .select('id, project_id, wallet_address, public_key, private_key, private_key_vault_id, mnemonic_vault_id, chain_id, non_evm_network')
      .eq('project_id', projectId);

    if (blockchain) {
      query.or(`non_evm_network.eq.${blockchain},chain_id.eq.${getChainIdString(blockchain)}`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false }) // ✅ FIX: Order by newest first
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error(
        `No wallet found for project ${projectId}${blockchain ? ` on ${blockchain}` : ''}`
      );
    }

    if (!data.private_key) {
      throw new Error(`Project wallet has no private key stored`);
    }

    return {
      id: data.id,
      projectId: data.project_id,
      walletAddress: data.wallet_address,
      publicKey: data.public_key,
      privateKey: data.private_key,
      privateKeyVaultId: data.private_key_vault_id,
      mnemonicVaultId: data.mnemonic_vault_id,
      chainId: data.chain_id,
      nonEvmNetwork: data.non_evm_network
    };
  } catch (error: any) {
    console.error('Failed to get project wallet:', error);
    throw new Error(`Failed to get project wallet: ${error.message}`);
  }
}

/**
 * Get project wallet by specific wallet ID
 */
export async function getProjectWalletById(walletId: string): Promise<ProjectWallet> {
  try {
    const { data, error } = await supabase
      .from('project_wallets')
      .select('id, project_id, wallet_address, public_key, private_key, private_key_vault_id, mnemonic_vault_id, chain_id, non_evm_network')
      .eq('id', walletId)
      .single();

    if (error) throw error;
    if (!data) {
      throw new Error(`No wallet found with ID ${walletId}`);
    }

    if (!data.private_key) {
      throw new Error(`Project wallet ${walletId} has no private key stored`);
    }

    return {
      id: data.id,
      projectId: data.project_id,
      walletAddress: data.wallet_address,
      publicKey: data.public_key,
      privateKey: data.private_key,
      privateKeyVaultId: data.private_key_vault_id,
      mnemonicVaultId: data.mnemonic_vault_id,
      chainId: data.chain_id,
      nonEvmNetwork: data.non_evm_network
    };
  } catch (error: any) {
    console.error('Failed to get project wallet by ID:', error);
    throw new Error(`Failed to get wallet by ID: ${error.message}`);
  }
}

/**
 * Get private key from project wallet using WalletEncryptionClient
 */
export async function getProjectWalletPrivateKey(projectWallet: ProjectWallet): Promise<string> {
  try {
    if (!projectWallet.privateKey) {
      throw new Error('No private key available for project wallet');
    }

    const isEncrypted = WalletEncryptionClient.isEncrypted(projectWallet.privateKey);
    
    if (isEncrypted) {
      console.log('Decrypting project wallet private key via WalletEncryptionClient');
      const decrypted = await WalletEncryptionClient.decrypt(projectWallet.privateKey);
      return decrypted;
    } else {
      console.log('Project wallet private key is not encrypted, using directly');
      return projectWallet.privateKey;
    }
  } catch (error: any) {
    console.error('Failed to get project wallet private key:', error);
    throw new Error(`Failed to get private key: ${error.message}`);
  }
}

// ============================================================================
// BLOCKCHAIN UTILITIES
// ============================================================================

/**
 * Map blockchain name to chain ID using centralized utility
 */
export function getChainIdString(blockchain: string): string {
  const chainId = getChainId(blockchain.toLowerCase());
  if (!chainId) {
    console.warn(`Unknown blockchain: ${blockchain}, defaulting to Ethereum`);
    return '1';
  }
  return chainId.toString();
}

/**
 * Normalize blockchain/network name using chainIds.ts as source of truth
 */
export function normalizeBlockchainName(
  networkOrChainName: string,
  chainId?: string
): string {
  const input = networkOrChainName.toLowerCase().trim();

  // Case 1: Already a valid chain name from CHAIN_IDS
  if (input in CHAIN_IDS) {
    return input;
  }

  // Case 2: Handle "mainnet"
  if (input === 'mainnet') {
    if (chainId) {
      const numericChainId = parseInt(chainId, 10);
      if (!isNaN(numericChainId)) {
        const name = getChainName(numericChainId);
        if (name) {
          console.log(`Resolved "mainnet" with chain ID ${chainId} → "${name}"`);
          return name;
        }
      }
    }
    console.warn(`"mainnet" without chainId, defaulting to "ethereum"`);
    return 'ethereum';
  }

  // Case 3: Input is numeric chain ID
  const numericChainId = parseInt(input, 10);
  if (!isNaN(numericChainId) && isValidChainId(numericChainId)) {
    const name = getChainName(numericChainId);
    if (name) {
      console.log(`Resolved chain ID ${input} → "${name}"`);
      return name;
    }
  }

  // Case 4: Common aliases
  const aliases: Record<string, string> = {
    'eth': 'ethereum',
    'matic': 'polygon',
    'arb': 'arbitrumOne',
    'op': 'optimism',
    'avax': 'avalanche',
    'bnb': 'bnb',
    'bsc': 'bnb'
  };
  if (input in aliases) {
    const resolved = aliases[input];
    console.log(`Resolved alias "${input}" → "${resolved}"`);
    return resolved;
  }

  // Case 5: No match - use as-is
  console.warn(`Unknown network name "${input}", using as-is`);
  return input;
}

/**
 * Get RPC URL from centralized RPC manager
 */
export function getRpcUrl(blockchain: string): string {
  const chain = validateBlockchain(blockchain);
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
  const isTestnetChain = ['holesky', 'hoodi', 'sepolia'].includes(chain);
  const networkType = isTestnetChain ? 'testnet' : (isDevelopment ? 'testnet' : 'mainnet');
  
  const rpcUrl = rpcManager.getRPCUrl(chain, networkType);
  if (!rpcUrl) {
    throw new Error(
      `No RPC URL configured for ${blockchain} (${networkType})`
    );
  }
  
  return rpcUrl;
}

/**
 * Get factory address for blockchain from environment
 */
export function getFactoryAddress(blockchain: string): string {
  const envVarMap: Record<string, string> = {
    ethereum: 'VITE_MULTISIG_FACTORY_ETHEREUM',
    holesky: 'VITE_MULTISIG_FACTORY_HOLESKY',
    hoodi: 'VITE_MULTISIG_FACTORY_HOODI',
    polygon: 'VITE_MULTISIG_FACTORY_POLYGON',
    arbitrum: 'VITE_MULTISIG_FACTORY_ARBITRUM',
  };
  
  const envVar = envVarMap[blockchain.toLowerCase()];
  if (!envVar) {
    throw new Error(`No factory configuration for blockchain: ${blockchain}`);
  }
  
  const address = import.meta.env[envVar];
  if (!address) {
    throw new Error(
      `No factory address configured for ${blockchain}. Please set ${envVar} in .env`
    );
  }
  
  return address;
}

// ============================================================================
// SIGNER UTILITIES
// ============================================================================

/**
 * Get signer for multi-sig operations
 * Uses project wallet with WalletEncryptionClient for secure key management
 */
export async function getSigner(
  provider: ethers.JsonRpcProvider,
  addressOrOptions?: string | MultiSigSignerOptions
): Promise<ethers.Signer> {
  try {
    let projectWallet: ProjectWallet;

    // Parse parameters - support both old string signature and new options object
    if (typeof addressOrOptions === 'string') {
      // Backward compatible: address provided as string
      const { data, error } = await supabase
        .from('project_wallets')
        .select('id, project_id, wallet_address, public_key, private_key, private_key_vault_id, mnemonic_vault_id, chain_id, non_evm_network')
        .eq('wallet_address', addressOrOptions)
        .single();
        
      if (error || !data) {
        throw new Error(`No project wallet found for address ${addressOrOptions}`);
      }
      
      projectWallet = {
        id: data.id,
        projectId: data.project_id,
        walletAddress: data.wallet_address,
        publicKey: data.public_key,
        privateKey: data.private_key,
        privateKeyVaultId: data.private_key_vault_id,
        mnemonicVaultId: data.mnemonic_vault_id,
        chainId: data.chain_id,
        nonEvmNetwork: data.non_evm_network
      };
      
    } else if (addressOrOptions?.walletAddress) {
      // New: specific wallet address provided
      const { data, error } = await supabase
        .from('project_wallets')
        .select('id, project_id, wallet_address, public_key, private_key, private_key_vault_id, mnemonic_vault_id, chain_id, non_evm_network')
        .eq('wallet_address', addressOrOptions.walletAddress)
        .single();
        
      if (error || !data) {
        throw new Error(`No project wallet found for address ${addressOrOptions.walletAddress}`);
      }
      
      projectWallet = {
        id: data.id,
        projectId: data.project_id,
        walletAddress: data.wallet_address,
        publicKey: data.public_key,
        privateKey: data.private_key,
        privateKeyVaultId: data.private_key_vault_id,
        mnemonicVaultId: data.mnemonic_vault_id,
        chainId: data.chain_id,
        nonEvmNetwork: data.non_evm_network
      };
      
    } else if (addressOrOptions?.projectId) {
      // New: project ID (and optionally blockchain) provided
      projectWallet = await getProjectWallet(
        addressOrOptions.projectId,
        addressOrOptions.blockchain
      );
      
    } else {
      throw new Error(
        'getSigner requires either:\n' +
        '- { projectId, blockchain } to use a project wallet\n' +
        '- { walletAddress } to use a specific wallet\n' +
        '- address string for backward compatibility'
      );
    }
    
    // Decrypt private key
    const privateKey = await getProjectWalletPrivateKey(projectWallet);
    
    // Create ethers.Wallet signer with provider
    const signer = new ethers.Wallet(privateKey, provider);
    
    console.log(`Created signer for address: ${signer.address}`);
    return signer;
    
  } catch (error: any) {
    console.error('Failed to get signer:', error);
    throw new Error(`Failed to get signer: ${error.message}`);
  }
}
