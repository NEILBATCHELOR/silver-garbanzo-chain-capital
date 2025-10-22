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
 * - Balance management across all wallet types
 */

import { supabase } from '@/infrastructure/database/client';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { BalanceService } from './balances/BalanceService';

// Wallet Type Interfaces
export interface ProjectWallet {
  id: string;
  projectId: string;
  walletType: string;
  address: string;
  publicKey: string;
  chainId: string | null;
  network: string | null;
  balance?: string;
  createdAt: Date;
  updatedAt: Date;
  // Private storage references
  hasDirectKey: boolean;
  hasVaultKey: boolean;
}

export interface UserWallet {
  id: string;
  userId: string;
  blockchain: string;
  address: string;
  signingMethod: string;
  isActive: boolean;
  balance?: string;
  contractRoles?: string[];
  createdAt: Date;
  updatedAt: Date;
  // Private storage references
  hasDirectKey: boolean;
  hasVaultKey: boolean;
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
  balance?: string;
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
          wallet_type,
          wallet_address,
          public_key,
          chain_id,
          net,
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
        walletType: wallet.wallet_type,
        address: wallet.wallet_address,
        publicKey: wallet.public_key,
        chainId: wallet.chain_id,
        network: wallet.net,
        createdAt: new Date(wallet.created_at),
        updatedAt: new Date(wallet.updated_at),
        hasDirectKey: !!wallet.private_key,
        hasVaultKey: !!wallet.private_key_vault_id
      }));
    } catch (error) {
      console.error('Failed to fetch project EOA wallets:', error);
      throw error;
    }
  }

  /**
   * Fetch user EOA wallets
   */
  async fetchUserEOAWallets(userId: string): Promise<UserWallet[]> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select(`
          id,
          user_id,
          blockchain,
          address,
          signing_method,
          is_active,
          contract_roles,
          encrypted_private_key,
          key_vault_reference,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

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
        contractRoles: wallet.contract_roles || [],
        createdAt: new Date(wallet.created_at),
        updatedAt: new Date(wallet.updated_at),
        hasDirectKey: !!wallet.encrypted_private_key,
        hasVaultKey: !!wallet.key_vault_reference
      }));
    } catch (error) {
      console.error('Failed to fetch user EOA wallets:', error);
      throw error;
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
   * Fetch balance for a wallet address
   */
  async fetchWalletBalance(
    address: string,
    blockchain: string
  ): Promise<string> {
    try {
      const walletBalance = await this.balanceService.fetchWalletBalance(address, blockchain);
      return walletBalance.nativeBalance;
    } catch (error) {
      console.error(`Failed to fetch balance for ${address}:`, error);
      return '0';
    }
  }

  /**
   * Refresh balances for all wallets in a project
   */
  async refreshAllBalances(projectId: string): Promise<void> {
    try {
      const allWallets = await this.fetchAllWalletsForProject(projectId);

      // Fetch balances for project wallets
      const projectBalancePromises = allWallets.projectWallets.map(async wallet => {
        wallet.balance = await this.fetchWalletBalance(
          wallet.address,
          wallet.network || wallet.chainId || 'ethereum'
        );
        return wallet;
      });

      // Fetch balances for multi-sig wallets
      const multiSigBalancePromises = allWallets.multiSigWallets.map(
        async wallet => {
          wallet.balance = await this.fetchWalletBalance(
            wallet.address,
            wallet.blockchain
          );
          return wallet;
        }
      );

      await Promise.all([
        ...projectBalancePromises,
        ...multiSigBalancePromises
      ]);
    } catch (error) {
      console.error('Failed to refresh all balances:', error);
      throw error;
    }
  }

  /**
   * Refresh balances for user wallets
   */
  async refreshUserWalletBalances(userId: string): Promise<UserWallet[]> {
    try {
      const userWallets = await this.fetchUserEOAWallets(userId);

      const balancePromises = userWallets.map(async wallet => {
        wallet.balance = await this.fetchWalletBalance(
          wallet.address,
          wallet.blockchain
        );
        return wallet;
      });

      return await Promise.all(balancePromises);
    } catch (error) {
      console.error('Failed to refresh user wallet balances:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const internalWalletService = InternalWalletService.getInstance();
