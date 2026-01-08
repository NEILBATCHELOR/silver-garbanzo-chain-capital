/**
 * Internal Wallet Service
 * Unified service for managing ALL wallet types in the system
 * 
 * Handles:
 * 1. Project EOA Wallets (project_wallets table)
 * 2. User EOA Wallets (user_addresses table)
 * 3. Multi-Sig Wallets (multi_sig_wallets table)
 * 
 * Key Features:
 * - Dual storage support (direct encrypted + vault reference)
 * - Unified key decryption using WalletEncryptionClient
 * - Balance management across all wallet types using BalanceService
 */

import { supabase } from '@/infrastructure/database/client';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { BalanceService, type WalletBalance } from './balances/BalanceService';

// Wallet Type Interfaces with proper WalletBalance support
export interface ProjectWallet {
  id: string;
  projectId: string;
  projectWalletName: string | null; // Custom name for the wallet
  address: string;
  publicKey: string;
  // Network identification - one of these will be populated based on network type
  chainId: string | null; // For EVM networks - numeric chain ID as string
  nonEvmNetwork: string | null; // For non-EVM networks (e.g., 'solana', 'near')
  bitcoinNetworkType: string | null; // For Bitcoin networks (e.g., 'mainnet', 'testnet')
  balance?: WalletBalance; // Full balance object with network info
  createdAt: Date;
  updatedAt: Date;
  // Private storage references
  hasDirectKey: boolean;
  hasVaultKey: boolean;
  vaultId: string | null; // private_key_vault_id from database
}

export interface UserWallet {
  id: string;
  userId: string;
  blockchain: string;
  address: string;
  signingMethod: string;
  isActive: boolean;
  balance?: WalletBalance; // Full balance object with network info
  createdAt: Date;
  updatedAt: Date;
  // Private storage references
  hasDirectKey: boolean;
  hasVaultKey: boolean;
  vaultId: string | null; // key_vault_reference from database
  // User details
  userName?: string; // User's full name
  userEmail?: string; // User's email
  userRole?: string; // User's role name
}

export interface MultiSigWallet {
  id: string;
  name: string;
  blockchain: string;
  address: string;
  threshold: number;
  ownerCount: number;
  status: string;
  projectId: string | null;
  balance?: WalletBalance; // Full balance object with network info
  createdAt: Date;
  updatedAt: Date;
}

export interface AllWallets {
  projectWallets: ProjectWallet[];
  userWallets: UserWallet[];
  multiSigWallets: MultiSigWallet[];
}

export class InternalWalletService {
  private static instance: InternalWalletService;
  private balanceService: BalanceService;

  private constructor() {
    this.balanceService = BalanceService.getInstance();
  }

  static getInstance(): InternalWalletService {
    if (!InternalWalletService.instance) {
      InternalWalletService.instance = new InternalWalletService();
    }
    return InternalWalletService.instance;
  }

  /**
   * Map chain ID to balance service key
   * Copied from ProjectWalletList for consistency
   */
  private chainIdToBalanceKey(chainId: string | null): string {
    const chainIdToNetwork: Record<string, string> = {
      // Ethereum networks
      '1': 'ethereum',
      '11155111': 'sepolia',
      '17000': 'holesky',
      '560048': 'hoodi',

      // Polygon networks
      '137': 'polygon',
      '80002': 'amoy',

      // Arbitrum networks
      '42161': 'arbitrum',
      '421614': 'arbitrum-sepolia',

      // Avalanche networks
      '43114': 'avalanche',
      '43113': 'avalanche-testnet', // Fuji

      // Optimism networks
      '10': 'optimism',
      '11155420': 'optimism-sepolia',

      // Base networks
      '8453': 'base',
      '84532': 'base-sepolia',

      // BSC networks
      '56': 'bsc',
      '97': 'bsc-testnet',

      // zkSync networks
      '324': 'zksync',
      '300': 'zksync-sepolia',

      // Injective networks - Use Cosmos chain ID format (injective-888) and EVM chain IDs (1776/1439)
      'injective-888': 'injective-testnet',  // Injective Cosmos Testnet (inj1... addresses)
      '888': 'injective-testnet',            // Backward compatibility (legacy numeric format)
      '1439': 'injective-testnet',           // Injective EVM Testnet (0x... addresses)
      'injective-1': 'injective',            // Injective Cosmos Mainnet
      '1776': 'injective',                   // Injective EVM Mainnet (0x... addresses)
    };

    // Use chain_id if available
    if (chainId) {
      const chainIdStr = String(chainId);
      if (chainIdToNetwork[chainIdStr]) {
        return chainIdToNetwork[chainIdStr];
      }
    }

    // Fall back to ethereum if chain ID not recognized
    return 'ethereum';
  }

  /**
   * Fetch all wallets for a project (EOA + Multi-sig)
   */
  async fetchAllWalletsForProject(projectId: string): Promise<AllWallets> {
    try {
      const [projectWallets, multiSigWallets] = await Promise.all([
        this.fetchProjectEOAWallets(projectId),
        this.fetchMultiSigWallets(projectId)
      ]);

      return {
        projectWallets,
        userWallets: [], // User wallets fetched separately by userId
        multiSigWallets
      };
    } catch (error) {
      console.error('Failed to fetch all wallets:', error);
      throw error;
    }
  }

  /**
   * Fetch project EOA wallets
   */
  async fetchProjectEOAWallets(projectId: string): Promise<ProjectWallet[]> {
    try {
      const { data, error } = await supabase
        .from('project_wallets')
        .select(`
          id,
          project_id,
          project_wallet_name,
          wallet_address,
          public_key,
          chain_id,
          non_evm_network,
          bitcoin_network_type,
          private_key,
          private_key_vault_id,
          created_at,
          updated_at
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch project wallets: ${error.message}`);
      }

      return (data || []).map(wallet => ({
        id: wallet.id,
        projectId: wallet.project_id,
        projectWalletName: wallet.project_wallet_name,
        address: wallet.wallet_address,
        publicKey: wallet.public_key,
        chainId: wallet.chain_id,
        nonEvmNetwork: wallet.non_evm_network,
        bitcoinNetworkType: wallet.bitcoin_network_type,
        createdAt: new Date(wallet.created_at),
        updatedAt: new Date(wallet.updated_at),
        hasDirectKey: !!wallet.private_key,
        hasVaultKey: !!wallet.private_key_vault_id,
        vaultId: wallet.private_key_vault_id || null
      }));
    } catch (error) {
      console.error('Failed to fetch project EOA wallets:', error);
      throw error;
    }
  }

  /**
   * Fetch user EOA wallets
   */
  async fetchUserEOAWallets(userId: string, includeInactive: boolean = false): Promise<UserWallet[]> {
    try {
      let query = supabase
        .from('user_addresses')
        .select(`
          id,
          user_id,
          blockchain,
          address,
          signing_method,
          is_active,
          encrypted_private_key,
          key_vault_reference,
          created_at,
          updated_at
        `)
        .eq('user_id', userId);

      // Only filter by active if not including inactive
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch user wallets: ${error.message}`);
      }

      return (data || []).map(wallet => ({
        id: wallet.id,
        userId: wallet.user_id,
        blockchain: wallet.blockchain,
        address: wallet.address,
        signingMethod: wallet.signing_method,
        isActive: wallet.is_active,
        createdAt: new Date(wallet.created_at),
        updatedAt: new Date(wallet.updated_at),
        hasDirectKey: !!wallet.encrypted_private_key,
        hasVaultKey: !!wallet.key_vault_reference,
        vaultId: wallet.key_vault_reference || null
      }));
    } catch (error) {
      console.error('Failed to fetch user EOA wallets:', error);
      throw error;
    }
  }

  /**
   * Fetch ALL user EOA wallets (across all users) - for internal dashboard
   */
  async fetchAllUserEOAWallets(includeInactive: boolean = false): Promise<UserWallet[]> {
    try {
      // Step 1: Fetch user addresses
      let query = supabase
        .from('user_addresses')
        .select(`
          id,
          user_id,
          blockchain,
          address,
          signing_method,
          is_active,
          encrypted_private_key,
          key_vault_reference,
          created_at,
          updated_at
        `);

      // Only filter by active if not including inactive
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data: addresses, error: addressError } = await query.order('created_at', { ascending: false });

      if (addressError) {
        throw new Error(`Failed to fetch all user wallets: ${addressError.message}`);
      }

      if (!addresses || addresses.length === 0) {
        return [];
      }

      // Step 2: Get unique user IDs
      const userIds = [...new Set(addresses.map(a => a.user_id))];

      // Step 3: Fetch user details for all user IDs
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);

      if (userError) {
        console.error('Failed to fetch user details:', userError);
      }

      // Step 4: Fetch user roles
      const { data: userRoles, error: userRolesError } = await supabase
        .from('user_roles')
        .select('user_id, role_id')
        .in('user_id', userIds);

      if (userRolesError) {
        console.error('Failed to fetch user roles:', userRolesError);
      }

      // Step 5: Fetch role details if we have role IDs
      const roleIds = [...new Set((userRoles || []).map((ur: any) => ur.role_id))];
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('id, name')
        .in('id', roleIds);

      if (rolesError) {
        console.error('Failed to fetch roles:', rolesError);
      }

      // Step 6: Create lookup maps
      const userMap = new Map<string, { name: string; email: string }>(
        (users || []).map((u: any) => [u.id, { name: u.name, email: u.email }])
      );

      const roleMap = new Map<string, string>(
        (roles || []).map((r: any) => [r.id, r.name])
      );

      const userRoleMap = new Map<string, string>(
        (userRoles || []).map((ur: any) => [ur.user_id, roleMap.get(ur.role_id) || 'No Role'])
      );

      // Step 7: Combine the data
      return addresses.map(wallet => {
        const userDetails = userMap.get(wallet.user_id);
        const userRole = userRoleMap.get(wallet.user_id);
        return {
          id: wallet.id,
          userId: wallet.user_id,
          blockchain: wallet.blockchain,
          address: wallet.address,
          signingMethod: wallet.signing_method,
          isActive: wallet.is_active,
          createdAt: new Date(wallet.created_at),
          updatedAt: new Date(wallet.updated_at),
          hasDirectKey: !!wallet.encrypted_private_key,
          hasVaultKey: !!wallet.key_vault_reference,
          vaultId: wallet.key_vault_reference || null,
          userName: userDetails?.name,
          userEmail: userDetails?.email,
          userRole: userRole
        };
      });
    } catch (error) {
      console.error('Failed to fetch all user EOA wallets:', error);
      throw error;
    }
  }

  /**
   * Get total count of user wallets for a specific user (including inactive)
   */
  async getTotalUserWalletCount(userId?: string): Promise<number> {
    try {
      let query = supabase
        .from('user_addresses')
        .select('*', { count: 'exact', head: true });

      // If userId provided, filter by it
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Failed to count user wallets:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to count user wallets:', error);
      return 0;
    }
  }

  /**
   * Fetch multi-sig wallets
   */
  async fetchMultiSigWallets(projectId: string): Promise<MultiSigWallet[]> {
    try {
      const { data, error } = await supabase
        .from('multi_sig_wallets')
        .select(`
          id,
          name,
          blockchain,
          address,
          threshold,
          status,
          project_id,
          created_at,
          updated_at
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch multi-sig wallets: ${error.message}`);
      }

      // Fetch owner count for each wallet
      const walletsWithOwners = await Promise.all(
        (data || []).map(async (wallet) => {
          const { count, error: countError } = await supabase
            .from('multi_sig_wallet_owners')
            .select('*', { count: 'exact', head: true })
            .eq('wallet_id', wallet.id);

          if (countError) {
            console.error('Failed to count owners:', countError);
          }

          return {
            id: wallet.id,
            name: wallet.name,
            blockchain: wallet.blockchain,
            address: wallet.address,
            threshold: wallet.threshold,
            ownerCount: count || 0,
            status: wallet.status || 'active',
            projectId: wallet.project_id,
            createdAt: new Date(wallet.created_at),
            updatedAt: new Date(wallet.updated_at)
          };
        })
      );

      return walletsWithOwners;
    } catch (error) {
      console.error('Failed to fetch multi-sig wallets:', error);
      throw error;
    }
  }

  /**
   * Get decrypted private key for project wallet
   * Handles both direct storage and vault reference
   */
  async getProjectWalletPrivateKey(walletId: string): Promise<string> {
    try {
      // Fetch wallet with both storage methods
      const { data, error } = await supabase
        .from('project_wallets')
        .select('private_key, private_key_vault_id')
        .eq('id', walletId)
        .single();

      if (error || !data) {
        throw new Error('Project wallet not found');
      }

      // Method 1: Direct encrypted key
      if (data.private_key) {
        if (WalletEncryptionClient.isEncrypted(data.private_key)) {
          return await WalletEncryptionClient.decrypt(data.private_key);
        }
        // Legacy: Plain text key (should not happen in production)
        return data.private_key;
      }

      // Method 2: Vault reference
      if (data.private_key_vault_id) {
        const { data: vaultData, error: vaultError } = await supabase
          .from('key_vault_keys')
          .select('encrypted_key')
          .eq('id', data.private_key_vault_id)
          .single();

        if (vaultError || !vaultData) {
          throw new Error('Key not found in vault');
        }

        return await WalletEncryptionClient.decrypt(vaultData.encrypted_key);
      }

      throw new Error('No private key available for this wallet');
    } catch (error) {
      console.error('Failed to get project wallet private key:', error);
      throw error;
    }
  }

  /**
   * Get decrypted private key for user wallet
   * Handles both direct storage and vault reference
   * NOTE: user_addresses uses key_id for vault lookup (different from project_wallets)
   */
  async getUserWalletPrivateKey(userAddressId: string): Promise<string> {
    try {
      // Fetch user address with both storage methods
      const { data, error } = await supabase
        .from('user_addresses')
        .select('encrypted_private_key, key_vault_reference, signing_method')
        .eq('id', userAddressId)
        .single();

      if (error || !data) {
        throw new Error('User wallet not found');
      }

      if (data.signing_method !== 'private_key') {
        throw new Error(
          `Cannot retrieve private key for ${data.signing_method} signing method`
        );
      }

      // Method 1: Direct encrypted key
      if (data.encrypted_private_key) {
        if (WalletEncryptionClient.isEncrypted(data.encrypted_private_key)) {
          return await WalletEncryptionClient.decrypt(data.encrypted_private_key);
        }
        return data.encrypted_private_key;
      }

      // Method 2: Vault reference (uses key_id for lookup)
      if (data.key_vault_reference) {
        const { data: vaultData, error: vaultError } = await supabase
          .from('key_vault_keys')
          .select('encrypted_key')
          .eq('key_id', data.key_vault_reference) // NOTE: key_id, not id
          .single();

        if (vaultError || !vaultData) {
          throw new Error('Key not found in vault');
        }

        return await WalletEncryptionClient.decrypt(vaultData.encrypted_key);
      }

      throw new Error('No private key available for this user wallet');
    } catch (error) {
      console.error('Failed to get user wallet private key:', error);
      throw error;
    }
  }

  /**
   * Get decrypted private key for user wallet by blockchain address
   * Convenience method that accepts blockchain address instead of UUID
   */
  async getUserWalletPrivateKeyByAddress(blockchainAddress: string): Promise<string> {
    try {
      // First, look up the user_addresses record by blockchain address
      const { data, error } = await supabase
        .from('user_addresses')
        .select('id, encrypted_private_key, key_vault_reference, signing_method')
        .eq('address', blockchainAddress)
        .single();

      if (error || !data) {
        throw new Error(`User wallet not found for address ${blockchainAddress}`);
      }

      if (data.signing_method !== 'private_key') {
        throw new Error(
          `Cannot retrieve private key for ${data.signing_method} signing method`
        );
      }

      // Method 1: Direct encrypted key
      if (data.encrypted_private_key) {
        if (WalletEncryptionClient.isEncrypted(data.encrypted_private_key)) {
          return await WalletEncryptionClient.decrypt(data.encrypted_private_key);
        }
        return data.encrypted_private_key;
      }

      // Method 2: Vault reference (uses key_id for lookup)
      if (data.key_vault_reference) {
        const { data: vaultData, error: vaultError } = await supabase
          .from('key_vault_keys')
          .select('encrypted_key')
          .eq('key_id', data.key_vault_reference)
          .single();

        if (vaultError || !vaultData) {
          throw new Error('Key not found in vault');
        }

        return await WalletEncryptionClient.decrypt(vaultData.encrypted_key);
      }

      throw new Error('No private key available for this user wallet');
    } catch (error) {
      console.error('Failed to get user wallet private key by address:', error);
      throw error;
    }
  }

  /**
   * Refresh balances for all wallets in a project using BalanceService
   * RETURNS the updated wallets with balance data populated
   */
  async refreshAllBalances(projectId: string): Promise<AllWallets> {
    try {
      const allWallets = await this.fetchAllWalletsForProject(projectId);

      // Prepare wallets for balance fetching with proper network mapping
      const projectWalletsToFetch = allWallets.projectWallets.map(w => ({
        address: w.address.toLowerCase(),
        walletType: this.chainIdToBalanceKey(w.chainId)
      }));

      const multiSigWalletsToFetch = allWallets.multiSigWallets.map(w => ({
        address: w.address.toLowerCase(),
        walletType: w.blockchain.toLowerCase()
      }));

      const walletsToFetch = [...projectWalletsToFetch, ...multiSigWalletsToFetch];

      console.log(`🔄 Fetching balances for ${walletsToFetch.length} wallet(s)`);

      // Fetch all balances using the balance service
      const balances = await this.balanceService.fetchBalancesForWallets(walletsToFetch);

      // Create a map of address -> balance
      const balanceMap = new Map<string, WalletBalance>();
      balances.forEach(balance => {
        balanceMap.set(balance.address.toLowerCase(), balance);
      });

      // Update project wallets with balances
      allWallets.projectWallets.forEach(wallet => {
        wallet.balance = balanceMap.get(wallet.address.toLowerCase());
      });

      // Update multi-sig wallets with balances
      allWallets.multiSigWallets.forEach(wallet => {
        wallet.balance = balanceMap.get(wallet.address.toLowerCase());
      });

      console.log(`✅ Updated ${balances.length} wallet balance(s)`);

      // Return the updated wallets
      return allWallets;
    } catch (error) {
      console.error('Failed to refresh all balances:', error);
      throw error;
    }
  }

  /**
   * Refresh balances for user wallets (specific user)
   * Includes both active and inactive wallets
   */
  async refreshUserWalletBalances(userId: string, includeInactive: boolean = true): Promise<UserWallet[]> {
    try {
      const userWallets = await this.fetchUserEOAWallets(userId, includeInactive);

      // Prepare wallets for balance fetching
      const walletsToFetch = userWallets.map(w => ({
        address: w.address.toLowerCase(),
        walletType: w.blockchain.toLowerCase()
      }));

      console.log(`🔄 Fetching balances for ${walletsToFetch.length} user wallet(s)`);

      // Fetch all balances using the balance service
      const balances = await this.balanceService.fetchBalancesForWallets(walletsToFetch);

      // Create a map of address -> balance
      const balanceMap = new Map<string, WalletBalance>();
      balances.forEach(balance => {
        balanceMap.set(balance.address.toLowerCase(), balance);
      });

      // Update user wallets with balances
      userWallets.forEach(wallet => {
        wallet.balance = balanceMap.get(wallet.address.toLowerCase());
      });

      console.log(`✅ Updated ${balances.length} user wallet balance(s)`);

      return userWallets;
    } catch (error) {
      console.error('Failed to refresh user wallet balances:', error);
      throw error;
    }
  }

  /**
   * Refresh balances for ALL user wallets (across all users)
   * Includes both active and inactive wallets
   */
  async refreshAllUserWalletBalances(includeInactive: boolean = true): Promise<UserWallet[]> {
    try {
      const userWallets = await this.fetchAllUserEOAWallets(includeInactive);

      // Prepare wallets for balance fetching
      const walletsToFetch = userWallets.map(w => ({
        address: w.address.toLowerCase(),
        walletType: w.blockchain.toLowerCase()
      }));

      console.log(`🔄 Fetching balances for ${walletsToFetch.length} user wallet(s) across all users`);

      // Fetch all balances using the balance service
      const balances = await this.balanceService.fetchBalancesForWallets(walletsToFetch);

      // Create a map of address -> balance
      const balanceMap = new Map<string, WalletBalance>();
      balances.forEach(balance => {
        balanceMap.set(balance.address.toLowerCase(), balance);
      });

      // Update user wallets with balances
      userWallets.forEach(wallet => {
        wallet.balance = balanceMap.get(wallet.address.toLowerCase());
      });

      console.log(`✅ Updated ${balances.length} user wallet balance(s) across all users`);

      return userWallets;
    } catch (error) {
      console.error('Failed to refresh all user wallet balances:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const internalWalletService = InternalWalletService.getInstance();
