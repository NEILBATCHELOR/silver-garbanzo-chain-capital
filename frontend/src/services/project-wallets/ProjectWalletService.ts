/**
 * ProjectWalletService - Manages project wallet addresses dynamically
 * 
 * Fetches wallet addresses from project_wallets table to provide
 * dynamic role addresses for smart contract operations
 */

import { supabase } from '@/infrastructure/database/client';
import { Database } from '@/types/core/database';

export interface ProjectWallet {
  id: string;
  project_id: string;
  wallet_type: string;
  wallet_address: string;
  public_key?: string;
  private_key?: string;
  mnemonic?: string;
  key_vault_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RoleAddresses {
  admin?: string;
  minter?: string;
  burner?: string;
  blocker?: string;
  deployer?: string;
}

export interface DeploymentConfig {
  roleAddresses: RoleAddresses;
  gasConfig: {
    gasPrice?: string;
    gasLimit?: number;
  };
  contractAddresses: {
    policyEngine?: string;
    token?: string;
  };
  chainRpcUrl: string;
}

export class ProjectWalletService {
  private static instance: ProjectWalletService;

  private constructor() {}

  public static getInstance(): ProjectWalletService {
    if (!ProjectWalletService.instance) {
      ProjectWalletService.instance = new ProjectWalletService();
    }
    return ProjectWalletService.instance;
  }

  /**
   * Fetch all wallets for a specific project
   */
  async getProjectWallets(projectId: string): Promise<ProjectWallet[]> {
    const { data, error } = await supabase
      .from('project_wallets')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching project wallets:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get role addresses from project wallets based on wallet types
   */
  async getRoleAddresses(projectId: string): Promise<RoleAddresses> {
    const wallets = await this.getProjectWallets(projectId);
    
    const roleAddresses: RoleAddresses = {};

    // Map wallet types to role addresses
    wallets.forEach(wallet => {
      // Handle null/undefined wallet_type gracefully
      if (!wallet.wallet_type) {
        return;
      }
      
      const walletType = wallet.wallet_type.toLowerCase();
      
      // Map wallet types to roles based on common patterns
      if (walletType.includes('admin') || walletType.includes('owner')) {
        roleAddresses.admin = wallet.wallet_address;
      }
      if (walletType.includes('mint') || walletType.includes('treasury')) {
        roleAddresses.minter = wallet.wallet_address;
      }
      if (walletType.includes('burn')) {
        roleAddresses.burner = wallet.wallet_address;
      }
      if (walletType.includes('block') || walletType.includes('compliance')) {
        roleAddresses.blocker = wallet.wallet_address;
      }
      if (walletType.includes('deploy') || walletType.includes('operator')) {
        roleAddresses.deployer = wallet.wallet_address;
      }
    });

    // If specific roles are not found, use the first wallet as admin/deployer
    if (!roleAddresses.admin && wallets.length > 0) {
      roleAddresses.admin = wallets[0].wallet_address;
    }
    if (!roleAddresses.deployer && wallets.length > 0) {
      roleAddresses.deployer = wallets[0].wallet_address;
    }

    return roleAddresses;
  }

  /**
   * Get deployment configuration for a project and chain
   * Gas price and limit must be provided by the caller (typically from UI or estimator)
   */
  async getDeploymentConfig(
    projectId: string, 
    chain: string,
    gasPrice: string,
    gasLimit: number
  ): Promise<DeploymentConfig> {
    // Get role addresses from project wallets
    const roleAddresses = await this.getRoleAddresses(projectId);

    // Get chain-specific RPC URL
    const chainRpcUrl = this.getChainRpcUrl(chain);

    // Load saved contract addresses if they exist
    const contractAddresses = await this.getContractAddresses(projectId, chain);

    return {
      roleAddresses,
      gasConfig: {
        gasPrice,
        gasLimit
      },
      contractAddresses,
      chainRpcUrl
    };
  }

  /**
   * Get RPC URL for a specific chain
   */
  private getChainRpcUrl(chain: string): string {
    const chainUpperCase = chain.toUpperCase().replace(/-/g, '_');
    
    // Map common chain names to env variables
    const chainMappings: Record<string, string> = {
      'ETHEREUM': 'MAINNET',
      'ETH': 'MAINNET',
      'POLYGON': 'POLYGON',
      'OPTIMISM': 'OPTIMISM',
      'ARBITRUM': 'ARBITRUM',
      'BASE': 'BASE',
      'BSC': 'BSC',
      'BINANCE': 'BSC',
      'ZKSYNC': 'ZKSYNC',
      'AVALANCHE': 'AVALANCHE',
      'SEPOLIA': 'SEPOLIA',
      'HOLESKY': 'HOLESKY',
      'AMOY': 'AMOY',
      'OPTIMISM_SEPOLIA': 'OPTIMISM_SEPOLIA',
      'ARBITRUM_SEPOLIA': 'ARBITRUM_SEPOLIA',
      'BASE_SEPOLIA': 'BASE_SEPOLIA',
      'BSC_TESTNET': 'BSC_TESTNET',
      'ZKSYNC_SEPOLIA': 'ZKSYNC_SEPOLIA',
    };

    const envKey = chainMappings[chainUpperCase] || chainUpperCase;
    const rpcUrl = import.meta.env[`VITE_${envKey}_RPC_URL`];

    if (!rpcUrl) {
      console.warn(`No RPC URL found for chain: ${chain}`);
      // Fallback to Sepolia for testing
      return import.meta.env.VITE_SEPOLIA_RPC_URL || '';
    }

    return rpcUrl;
  }

  /**
   * Save deployed contract addresses
   */
  async saveContractAddresses(
    projectId: string,
    chain: string,
    addresses: {
      policyEngine?: string;
      token?: string;
    }
  ): Promise<void> {
    // Store in localStorage for now (can be moved to database)
    const key = `contract_addresses_${projectId}_${chain}`;
    const existing = localStorage.getItem(key);
    const current = existing ? JSON.parse(existing) : {};
    
    const updated = {
      ...current,
      ...addresses,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(key, JSON.stringify(updated));

    // TODO: Also save to database for persistence
    console.log('Contract addresses saved:', updated);
  }

  /**
   * Get saved contract addresses
   */
  async getContractAddresses(
    projectId: string,
    chain: string
  ): Promise<{ policyEngine?: string; token?: string }> {
    const key = `contract_addresses_${projectId}_${chain}`;
    const stored = localStorage.getItem(key);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        policyEngine: parsed.policyEngine,
        token: parsed.token
      };
    }

    return {};
  }

  /**
   * Get deployer private key for a project
   * SECURITY: Only use in development/testing environments
   */
  async getDeployerPrivateKey(projectId: string): Promise<string | null> {
    const wallets = await this.getProjectWallets(projectId);
    
    // Find deployer wallet - with null safety for wallet_type
    const deployerWallet = wallets.find(w => 
      w.wallet_type && (
        w.wallet_type.toLowerCase().includes('deploy') ||
        w.wallet_type.toLowerCase().includes('operator')
      )
    ) || wallets[0]; // Fallback to first wallet

    if (!deployerWallet?.private_key) {
      console.warn('No deployer private key found for project');
      return null;
    }

    return deployerWallet.private_key;
  }
}

// Export singleton instance
export const projectWalletService = ProjectWalletService.getInstance();
