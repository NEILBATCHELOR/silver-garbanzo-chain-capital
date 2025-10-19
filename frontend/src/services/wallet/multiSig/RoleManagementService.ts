/**
 * Role Management Service
 * Manages role assignments to multi-sig wallets
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

  public static getInstance(): RoleManagementService {
    if (!RoleManagementService.instance) {
      RoleManagementService.instance = new RoleManagementService();
    }
    return RoleManagementService.instance;
  }

  /**
   * Grant role to multi-sig wallet
   */
  async grantRole(
    multiSigWalletAddress: string,
    contractAddress: string,
    roleName: string,
    blockchain: string = 'ethereum'
  ): Promise<string> {
    try {
      // Convert role name to bytes32
      const roleBytes32 = roleName === 'DEFAULT_ADMIN_ROLE' 
        ? COMMON_ROLES.DEFAULT_ADMIN_ROLE
        : ethers.id(roleName);
      
      // Get provider and signer
      const provider = new ethers.JsonRpcProvider(this.getRpcUrl(blockchain));
      const signer = await this.getAdminSigner(provider);
      
      // Load contract ABI
      const contractAbi = await this.getContractAbi(contractAddress);
      const contract = new ethers.Contract(contractAddress, contractAbi, signer);
      
      // Grant role
      const tx = await contract.grantRole(roleBytes32, multiSigWalletAddress);
      const receipt = await tx.wait();
      
      // Store in database
      await supabase.from('contract_role_assignments').insert({
        multi_sig_wallet_address: multiSigWalletAddress,
        contract_address: contractAddress,
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
    blockchain: string = 'ethereum'
  ): Promise<string> {
    try {
      const roleBytes32 = roleName === 'DEFAULT_ADMIN_ROLE'
        ? COMMON_ROLES.DEFAULT_ADMIN_ROLE
        : ethers.id(roleName);
      
      const provider = new ethers.JsonRpcProvider(this.getRpcUrl(blockchain));
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
        .eq('role_name', roleName);
      
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
    blockchain: string = 'ethereum'
  ): Promise<boolean> {
    try {
      const roleBytes32 = roleName === 'DEFAULT_ADMIN_ROLE'
        ? COMMON_ROLES.DEFAULT_ADMIN_ROLE
        : ethers.id(roleName);
      
      const provider = new ethers.JsonRpcProvider(this.getRpcUrl(blockchain));
      
      const contractAbi = await this.getContractAbi(contractAddress);
      const contract = new ethers.Contract(contractAddress, contractAbi, provider);
      
      return await contract.hasRole(roleBytes32, multiSigWalletAddress);
      
    } catch (error) {
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
      
      return data.map(this.formatRoleAssignment);
      
    } catch (error) {
      console.error('Failed to get roles:', error);
      return [];
    }
  }

  /**
   * Get all role assignments for a contract
   */
  async getRolesForContract(
    contractAddress: string
  ): Promise<RoleAssignment[]> {
    try {
      const { data, error } = await supabase
        .from('contract_role_assignments')
        .select('*')
        .eq('contract_address', contractAddress)
        .eq('status', 'assigned');
      
      if (error) throw error;
      
      return data.map(this.formatRoleAssignment);
      
    } catch (error) {
      console.error('Failed to get roles:', error);
      return [];
    }
  }

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
   * Helper: Get contract ABI using centralized ABI Manager
   * 
   * Uses ABIManager for single source of truth instead of maintaining
   * a separate ABI mapping in this service
   */
  private async getContractAbi(contractAddress: string): Promise<any[]> {
    // Query database to find contract type
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
    
    // Use centralized ABI Manager to get ABI
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
   * 
   * Uses BlockchainValidator for type-safe blockchain validation
   * instead of maintaining a separate chainMap
   */
  private getRpcUrl(blockchain: string): string {
    // Validate and convert blockchain string to SupportedChain type
    // This will throw a helpful error if the blockchain is not supported
    const chain = validateBlockchain(blockchain);
    
    // Determine network type (testnet for development, mainnet for production)
    const isDevelopment = import.meta.env.DEV || (typeof window !== 'undefined' && window.location.hostname === 'localhost');
    const isTestnetChain = ['holesky', 'hoodi', 'sepolia'].includes(chain);
    const networkType = isTestnetChain ? 'testnet' : (isDevelopment ? 'testnet' : 'mainnet');
    
    // Get RPC URL from manager
    const rpcUrl = rpcManager.getRPCUrl(chain, networkType);
    if (!rpcUrl) {
      throw new Error(
        `No RPC URL configured for ${blockchain} (${networkType}). Please check your .env configuration.`
      );
    }
    
    return rpcUrl;
  }

  /**
   * Helper: Get admin signer (requires admin private key)
   */
  private async getAdminSigner(provider: ethers.JsonRpcProvider): Promise<ethers.Signer> {
    // Get admin private key from environment
    const privateKey = import.meta.env.VITE_ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Admin private key not configured in environment');
    }
    
    return new ethers.Wallet(privateKey, provider);
  }
}

export const roleManagementService = RoleManagementService.getInstance();
