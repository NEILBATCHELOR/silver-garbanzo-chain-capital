/**
 * Role Management Service
 * Manages role assignments to multi-sig wallets AND role-based ownership
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { rpcManager } from '@/infrastructure/web3/rpc';
import { validateBlockchain } from '@/infrastructure/web3/utils/BlockchainValidator';
import { abiManager, type ContractType } from '@/services/wallet/ABI';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

export interface RoleAssignment {
  id: string;
  multiSigWalletId: string;
  multiSigWalletAddress: string;
  contractAddress: string;
  contractType: ContractType;
  role: string;
  roleBytes32: string;
  blockchain: string;
  assignedAt: Date;
  transactionHash: string;
  status: 'pending' | 'assigned' | 'revoked';
}

export interface WalletRoleOwner {
  id: string;
  walletId: string;
  roleId: string;
  roleName: string;
  roleDescription: string;
  rolePriority: number;
  roleAddress?: string; // Address on wallet's blockchain
  addedAt: Date;
  addedBy?: string;
}

/**
 * Common role constants from OpenZeppelin AccessControl
 * 
 * DEFAULT_ADMIN_ROLE: The zero bytes32 value is the standard default admin role in OpenZeppelin.
 * This role has permission to grant and revoke all other roles.
 * 
 * Note: The role constant (bytes32 value) is fixed, but which wallet ADDRESS is assigned this role
 * should be determined by your project configuration (e.g., multi-sig wallet from project_wallets table).
 */
export const COMMON_ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  MINTER_ROLE: ethers.id('MINTER_ROLE'),
  PAUSER_ROLE: ethers.id('PAUSER_ROLE'),
  UPGRADER_ROLE: ethers.id('UPGRADER_ROLE'),
  POLICY_ADMIN_ROLE: ethers.id('POLICY_ADMIN_ROLE'),
  COMPLIANCE_OFFICER_ROLE: ethers.id('COMPLIANCE_OFFICER_ROLE'),
  APPROVER_ROLE: ethers.id('APPROVER_ROLE'),
  PROPOSER_ROLE: ethers.id('PROPOSER_ROLE'),
  EXECUTOR_ROLE: ethers.id('EXECUTOR_ROLE'),
} as const;

export class RoleManagementService {
  private static instance: RoleManagementService;

  private constructor() {}

  static getInstance(): RoleManagementService {
    if (!RoleManagementService.instance) {
      RoleManagementService.instance = new RoleManagementService();
    }
    return RoleManagementService.instance;
  }

  // ============================================================================
  // CONTRACT ROLE ASSIGNMENT METHODS (Existing)
  // ============================================================================

  /**
   * Grant role to multi-sig wallet
   */
  async grantRole(
    multiSigWalletAddress: string,
    contractAddress: string,
    roleName: string,
    blockchain: string
  ): Promise<string> {
    try {
      // Convert role name to bytes32
      const roleBytes32 = roleName === 'DEFAULT_ADMIN_ROLE' 
        ? COMMON_ROLES.DEFAULT_ADMIN_ROLE 
        : ethers.id(roleName);
      
      // Get provider and signer
      const rpcUrl = this.getRpcUrl(blockchain);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const signer = await this.getAdminSigner(provider);
      
      // Load contract ABI
      const contractAbi = await this.getContractAbi(contractAddress);
      const contract = new ethers.Contract(contractAddress, contractAbi, signer);
      
      // Grant role
      const tx = await contract.grantRole(roleBytes32, multiSigWalletAddress);
      const receipt = await tx.wait();
      
      // Get wallet ID from address
      const { data: walletData } = await supabase
        .from('multi_sig_wallets')
        .select('id, contract_type')
        .eq('address', multiSigWalletAddress)
        .eq('blockchain', blockchain)
        .single();
      
      // Store in database
      await supabase.from('contract_role_assignments').insert({
        multi_sig_wallet_id: walletData?.id,
        multi_sig_wallet_address: multiSigWalletAddress,
        contract_address: contractAddress,
        contract_type: await this.getContractType(contractAddress),
        role_name: roleName,
        role_bytes32: roleBytes32,
        transaction_hash: receipt.hash,
        status: 'assigned',
        blockchain
      });
      
      return receipt.hash;
      
    } catch (error: any) {
      console.error('Failed to grant role:', error);
      throw new Error(`Role grant failed: ${error.message}`);
    }
  }

  /**
   * Revoke role from multi-sig wallet
   */
  async revokeRole(
    multiSigWalletAddress: string,
    contractAddress: string,
    roleName: string,
    blockchain: string
  ): Promise<string> {
    try {
      const roleBytes32 = roleName === 'DEFAULT_ADMIN_ROLE'
        ? COMMON_ROLES.DEFAULT_ADMIN_ROLE
        : ethers.id(roleName);
      
      const rpcUrl = this.getRpcUrl(blockchain);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const signer = await this.getAdminSigner(provider);
      
      const contractAbi = await this.getContractAbi(contractAddress);
      const contract = new ethers.Contract(contractAddress, contractAbi, signer);
      
      const tx = await contract.revokeRole(roleBytes32, multiSigWalletAddress);
      const receipt = await tx.wait();
      
      await supabase
        .from('contract_role_assignments')
        .update({
          status: 'revoked',
          revoked_tx_hash: receipt.hash
        })
        .eq('multi_sig_wallet_address', multiSigWalletAddress)
        .eq('contract_address', contractAddress)
        .eq('role_name', roleName)
        .eq('blockchain', blockchain);
      
      return receipt.hash;
      
    } catch (error: any) {
      console.error('Failed to revoke role:', error);
      throw new Error(`Role revocation failed: ${error.message}`);
    }
  }

  /**
   * Check if multi-sig wallet has role
   */
  async hasRole(
    multiSigWalletAddress: string,
    contractAddress: string,
    roleName: string,
    blockchain: string
  ): Promise<boolean> {
    try {
      const roleBytes32 = roleName === 'DEFAULT_ADMIN_ROLE'
        ? COMMON_ROLES.DEFAULT_ADMIN_ROLE
        : ethers.id(roleName);
      
      const rpcUrl = this.getRpcUrl(blockchain);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      const contractAbi = await this.getContractAbi(contractAddress);
      const contract = new ethers.Contract(contractAddress, contractAbi, provider);
      
      return await contract.hasRole(roleBytes32, multiSigWalletAddress);
      
    } catch (error: any) {
      console.error('Failed to check role:', error);
      return false;
    }
  }

  /**
   * Get all roles for a multi-sig wallet
   */
  async getRolesForWallet(
    multiSigWalletAddress: string
  ): Promise<RoleAssignment[]> {
    try {
      const { data, error } = await supabase
        .from('contract_role_assignments')
        .select('*')
        .eq('multi_sig_wallet_address', multiSigWalletAddress)
        .eq('status', 'assigned');
      
      if (error) throw error;
      
      return (data || []).map(this.formatRoleAssignment);
      
    } catch (error) {
      console.error('Failed to get roles:', error);
      return [];
    }
  }

  // ============================================================================
  // ROLE-BASED OWNERSHIP METHODS (New)
  // ============================================================================

  /**
   * Add role as owner to multi-sig wallet
   */
  async addRoleOwner(
    walletId: string,
    roleId: string
  ): Promise<WalletRoleOwner> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('multi_sig_wallet_owners')
        .insert({
          wallet_id: walletId,
          role_id: roleId,
          added_by: user?.id
        })
        .select(`
          *,
          role:roles!inner(
            id,
            name,
            description,
            priority
          )
        `)
        .single();

      if (error) throw error;

      // Get wallet blockchain to fetch role address
      const { data: walletData } = await supabase
        .from('multi_sig_wallets')
        .select('blockchain')
        .eq('id', walletId)
        .single();

      if (walletData) {
        // Get role address for this blockchain
        const { data: roleAddressData } = await supabase
          .from('role_addresses')
          .select('address')
          .eq('role_id', roleId)
          .eq('blockchain', walletData.blockchain)
          .single();

        return {
          id: data.id,
          walletId: data.wallet_id,
          roleId: data.role_id,
          roleName: data.role.name,
          roleDescription: data.role.description,
          rolePriority: data.role.priority,
          roleAddress: roleAddressData?.address,
          addedAt: new Date(data.added_at),
          addedBy: data.added_by
        };
      }

      return this.formatWalletRoleOwner(data);

    } catch (error: any) {
      console.error('Failed to add role owner:', error);
      throw new Error(`Failed to add role owner: ${error.message}`);
    }
  }

  /**
   * Remove role from wallet owners
   */
  async removeRoleOwner(
    walletId: string,
    roleId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('multi_sig_wallet_owners')
        .delete()
        .eq('wallet_id', walletId)
        .eq('role_id', roleId);

      if (error) throw error;

    } catch (error: any) {
      console.error('Failed to remove role owner:', error);
      throw new Error(`Failed to remove role owner: ${error.message}`);
    }
  }

  /**
   * Get all role-based owners for a wallet
   */
  async getWalletRoleOwners(
    walletId: string
  ): Promise<WalletRoleOwner[]> {
    try {
      // Get wallet blockchain first
      const { data: walletData } = await supabase
        .from('multi_sig_wallets')
        .select('blockchain')
        .eq('id', walletId)
        .single();

      if (!walletData) {
        throw new Error('Wallet not found');
      }

      // Get role owners with role details and addresses
      const { data, error } = await supabase
        .from('multi_sig_wallet_owners')
        .select(`
          *,
          role:roles!inner(
            id,
            name,
            description,
            priority
          )
        `)
        .eq('wallet_id', walletId)
        .order('role(priority)', { ascending: false });

      if (error) throw error;

      // Fetch role addresses for the wallet's blockchain
      const roleIds = (data || []).map(d => d.role_id);
      const { data: addressData } = await supabase
        .from('role_addresses')
        .select('role_id, address')
        .in('role_id', roleIds)
        .eq('blockchain', walletData.blockchain);

      const addressMap = new Map(
        (addressData || []).map(a => [a.role_id, a.address])
      );

      return (data || []).map(d => ({
        id: d.id,
        walletId: d.wallet_id,
        roleId: d.role_id,
        roleName: d.role.name,
        roleDescription: d.role.description,
        rolePriority: d.role.priority,
        roleAddress: addressMap.get(d.role_id),
        addedAt: new Date(d.added_at),
        addedBy: d.added_by
      }));

    } catch (error: any) {
      console.error('Failed to get wallet role owners:', error);
      return [];
    }
  }

  /**
   * Get signing addresses for a wallet (from role owners)
   */
  async getWalletSigningAddresses(
    walletId: string
  ): Promise<string[]> {
    try {
      const owners = await this.getWalletRoleOwners(walletId);
      return owners
        .map(o => o.roleAddress)
        .filter((addr): addr is string => !!addr);

    } catch (error: any) {
      console.error('Failed to get signing addresses:', error);
      return [];
    }
  }

  /**
   * Update wallet to use role-based ownership
   */
  async convertToRoleBasedOwnership(
    walletId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('multi_sig_wallets')
        .update({
          ownership_type: 'role_based',
          migrated_to_roles: true,
          migration_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', walletId);

      if (error) throw error;

    } catch (error: any) {
      console.error('Failed to convert to role-based ownership:', error);
      throw new Error(`Failed to convert: ${error.message}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Helper: Format role assignment
   */
  private formatRoleAssignment(data: any): RoleAssignment {
    return {
      id: data.id,
      multiSigWalletId: data.multi_sig_wallet_id,
      multiSigWalletAddress: data.multi_sig_wallet_address,
      contractAddress: data.contract_address,
      contractType: data.contract_type,
      role: data.role_name,
      roleBytes32: data.role_bytes32,
      blockchain: data.blockchain,
      assignedAt: new Date(data.created_at),
      transactionHash: data.transaction_hash,
      status: data.status
    };
  }

  /**
   * Helper: Format wallet role owner
   */
  private formatWalletRoleOwner(data: any): WalletRoleOwner {
    return {
      id: data.id,
      walletId: data.wallet_id,
      roleId: data.role_id,
      roleName: data.role?.name || '',
      roleDescription: data.role?.description || '',
      rolePriority: data.role?.priority || 0,
      roleAddress: undefined,
      addedAt: new Date(data.added_at),
      addedBy: data.added_by
    };
  }

  /**
   * Helper: Get contract type from address
   */
  private async getContractType(contractAddress: string): Promise<string> {
    const { data } = await supabase
      .from('deployed_contracts')
      .select('contract_type')
      .eq('address', contractAddress)
      .single();
    
    return data?.contract_type || 'Unknown';
  }

  /**
   * Helper: Get contract ABI using centralized ABI Manager
   */
  private async getContractAbi(contractAddress: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('deployed_contracts')
      .select('contract_type')
      .eq('address', contractAddress)
      .single();
    
    if (error || !data) {
      throw new Error(
        `Contract ${contractAddress} not found in registry. ${error?.message || ''}`
      );
    }
    
    try {
      const abi = await abiManager.getABI(data.contract_type as ContractType);
      return abi;
    } catch (error: any) {
      throw new Error(
        `Failed to load ABI for contract type "${data.contract_type}": ${error.message}`
      );
    }
  }

  /**
   * Helper: Get RPC URL from centralized RPC manager
   */
  private getRpcUrl(blockchain: string): string {
    const chain = validateBlockchain(blockchain);
    
    const isDevelopment = import.meta.env.DEV || 
      (typeof window !== 'undefined' && window.location.hostname === 'localhost');
    const isTestnetChain = ['holesky', 'hoodi', 'sepolia'].includes(chain);
    const networkType = isTestnetChain ? 'testnet' : (isDevelopment ? 'testnet' : 'mainnet');
    
    const rpcUrl = rpcManager.getRPCUrl(chain, networkType);
    if (!rpcUrl) {
      throw new Error(
        `No RPC URL configured for ${blockchain} (${networkType}). Check .env.`
      );
    }
    
    return rpcUrl;
  }

  /**
   * Helper: Get admin signer
   */
  private async getAdminSigner(provider: ethers.JsonRpcProvider): Promise<ethers.Signer> {
    const privateKey = import.meta.env.VITE_ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Admin private key not configured in environment');
    }
    
    return new ethers.Wallet(privateKey, provider);
  }
}

export const roleManagementService = RoleManagementService.getInstance();
