/**
 * Role Address Service - Hybrid Model with JSONB
 * Manages blockchain addresses with optional per-contract-role permissions
 * 
 * HYBRID MODEL:
 * - Default: Empty contract_roles [] = inherits ALL roles from role_contracts
 * - Optional: Specify contract_roles = only those specific permissions
 * - Flexible: One address can have multiple contract roles
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { keyVaultClient } from '@/infrastructure/keyVault/KeyVaultClient';

export interface RoleAddress {
  id: string;
  roleId: string;
  blockchain: string;
  address: string;
  signingMethod: 'private_key' | 'hardware_wallet' | 'mpc';
  contractRoles: string[]; // Empty array = inherits all roles from role_contracts
  encryptedPrivateKey?: string;
  keyVaultReference?: string;
  derivationPath?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface CreateRoleAddressParams {
  roleId: string;
  blockchain: string;
  contractRoles?: string[]; // OPTIONAL: If not provided, defaults to [] (inherit all)
  signingMethod?: 'private_key' | 'hardware_wallet' | 'mpc';
  existingAddress?: string;
  existingPrivateKey?: string;
}

export class RoleAddressService {
  private static instance: RoleAddressService;

  private constructor() {}

  static getInstance(): RoleAddressService {
    if (!RoleAddressService.instance) {
      RoleAddressService.instance = new RoleAddressService();
    }
    return RoleAddressService.instance;
  }

  /**
   * Generate a new address for a role
   * HYBRID MODEL: 
   * - If contractRoles not specified: address inherits ALL roles from role_contracts
   * - If contractRoles specified: address only has those specific roles
   */
  async generateRoleAddress(
    params: CreateRoleAddressParams
  ): Promise<RoleAddress> {
    const { 
      roleId, 
      blockchain, 
      contractRoles = [], // Default to empty array (inherit all roles)
      signingMethod = 'private_key',
      existingAddress,
      existingPrivateKey 
    } = params;

    try {
      let address: string;
      let keyVaultReference: string | undefined;

      // Generate or use existing address
      if (signingMethod === 'private_key') {
        if (existingPrivateKey) {
          const wallet = new ethers.Wallet(existingPrivateKey);
          address = wallet.address;
          keyVaultReference = await keyVaultClient.storeKey(existingPrivateKey);
        } else if (existingAddress) {
          address = existingAddress;
        } else {
          // Generate new wallet
          const wallet = ethers.Wallet.createRandom();
          address = wallet.address;
          keyVaultReference = await keyVaultClient.storeKey(wallet.privateKey);
        }
      } else {
        // Hardware wallet or MPC - must provide address
        if (!existingAddress) {
          throw new Error(`Address required for ${signingMethod} signing method`);
        }
        address = existingAddress;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert address with contract_roles JSONB column
      const { data: addressData, error: addressError } = await supabase
        .from('role_addresses')
        .insert({
          role_id: roleId,
          blockchain,
          address,
          signing_method: signingMethod,
          contract_roles: contractRoles, // Store directly in JSONB column
          key_vault_reference: keyVaultReference,
          created_by: user?.id
        })
        .select()
        .single();

      if (addressError) throw addressError;

      return this.formatRoleAddress(addressData);

    } catch (error: any) {
      console.error('Failed to generate role address:', error);
      throw new Error(`Failed to generate role address: ${error.message}`);
    }
  }

  /**
   * Get all addresses for a role
   */
  async getRoleAddresses(roleId: string): Promise<RoleAddress[]> {
    try {
      const { data, error } = await supabase
        .from('role_addresses')
        .select('*')
        .eq('role_id', roleId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.formatRoleAddress);

    } catch (error: any) {
      console.error('Failed to get role addresses:', error);
      return [];
    }
  }

  /**
   * Get addresses for a specific contract role
   * Uses the SQL helper function we created
   */
  async getAddressesForContractRole(
    roleId: string,
    contractRole: string,
    blockchain?: string
  ): Promise<RoleAddress[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_addresses_for_contract_role', {
          p_role_id: roleId,
          p_contract_role: contractRole,
          p_blockchain: blockchain || null
        });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.address_id,
        roleId,
        blockchain: row.blockchain,
        address: row.address,
        signingMethod: row.signing_method,
        contractRoles: Array.isArray(row.contract_roles) ? row.contract_roles : [],
        createdAt: new Date(),
        updatedAt: new Date()
      }));

    } catch (error: any) {
      console.error('Failed to get addresses for contract role:', error);
      return [];
    }
  }

  /**
   * Add contract role permission to existing address
   * Updates the JSONB array
   */
  async addContractRoleToAddress(
    addressId: string,
    contractRole: string
  ): Promise<void> {
    try {
      // Get current address
      const address = await this.getRoleAddress(addressId);
      if (!address) throw new Error('Address not found');

      // Add role to array if not already present
      const currentRoles = address.contractRoles || [];
      if (currentRoles.includes(contractRole)) {
        return; // Already has this role
      }

      const updatedRoles = [...currentRoles, contractRole];

      const { error } = await supabase
        .from('role_addresses')
        .update({ 
          contract_roles: updatedRoles,
          updated_at: new Date().toISOString()
        })
        .eq('id', addressId);

      if (error) throw error;

    } catch (error: any) {
      console.error('Failed to add contract role to address:', error);
      throw new Error(`Failed to add contract role: ${error.message}`);
    }
  }

  /**
   * Remove contract role permission from address
   * Updates the JSONB array
   */
  async removeContractRoleFromAddress(
    addressId: string,
    contractRole: string
  ): Promise<void> {
    try {
      // Get current address
      const address = await this.getRoleAddress(addressId);
      if (!address) throw new Error('Address not found');

      // Remove role from array
      const updatedRoles = (address.contractRoles || []).filter(
        role => role !== contractRole
      );

      const { error } = await supabase
        .from('role_addresses')
        .update({ 
          contract_roles: updatedRoles,
          updated_at: new Date().toISOString()
        })
        .eq('id', addressId);

      if (error) throw error;

    } catch (error: any) {
      console.error('Failed to remove contract role from address:', error);
      throw new Error(`Failed to remove contract role: ${error.message}`);
    }
  }

  /**
   * Get effective contract roles for an address
   * Uses SQL helper function to resolve inherited roles
   */
  async getEffectiveRoles(addressId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_contract_roles_for_address', {
          p_address_id: addressId
        });

      if (error) throw error;

      return Array.isArray(data) ? data : [];

    } catch (error: any) {
      console.error('Failed to get effective roles:', error);
      return [];
    }
  }

  /**
   * Get address by ID
   */
  async getRoleAddress(addressId: string): Promise<RoleAddress | null> {
    try {
      const { data, error } = await supabase
        .from('role_addresses')
        .select('*')
        .eq('id', addressId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.formatRoleAddress(data);

    } catch (error: any) {
      console.error('Failed to get role address:', error);
      return null;
    }
  }

  /**
   * Update role address
   */
  async updateRoleAddress(
    addressId: string,
    updates: Partial<{
      address: string;
      signingMethod: 'private_key' | 'hardware_wallet' | 'mpc';
      contractRoles: string[];
      keyVaultReference: string;
    }>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('role_addresses')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', addressId);

      if (error) throw error;

    } catch (error: any) {
      console.error('Failed to update role address:', error);
      throw new Error(`Failed to update role address: ${error.message}`);
    }
  }

  /**
   * Delete role address
   */
  async deleteRoleAddress(addressId: string): Promise<void> {
    try {
      // Get address first to clean up KeyVault
      const roleAddress = await this.getRoleAddress(addressId);
      
      if (roleAddress?.keyVaultReference) {
        try {
          await keyVaultClient.deleteKey(roleAddress.keyVaultReference);
        } catch (keyError) {
          console.warn('Failed to delete key from KeyVault:', keyError);
        }
      }

      const { error } = await supabase
        .from('role_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

    } catch (error: any) {
      console.error('Failed to delete role address:', error);
      throw new Error(`Failed to delete role address: ${error.message}`);
    }
  }

  /**
   * Get private key for role address
   */
  async getRolePrivateKey(addressId: string): Promise<string | null> {
    try {
      const roleAddress = await this.getRoleAddress(addressId);
      
      if (!roleAddress?.keyVaultReference) {
        return null;
      }

      const keyResult = await keyVaultClient.getKey(roleAddress.keyVaultReference);

      if (typeof keyResult === 'string') {
        return keyResult;
      } else {
        return keyResult.privateKey;
      }

    } catch (error: any) {
      console.error('Failed to get role private key:', error);
      return null;
    }
  }

  /**
   * Sign message with role address
   */
  async signWithAddress(
    addressId: string,
    message: string
  ): Promise<string> {
    try {
      const privateKey = await this.getRolePrivateKey(addressId);
      
      if (!privateKey) {
        throw new Error('Private key not available for this address');
      }

      const wallet = new ethers.Wallet(privateKey);
      return await wallet.signMessage(message);

    } catch (error: any) {
      console.error('Failed to sign with address:', error);
      throw new Error(`Failed to sign with address: ${error.message}`);
    }
  }

  /**
   * Export role address
   */
  async exportRoleAddress(
    addressId: string,
    includePrivateKey: boolean = false
  ): Promise<{
    address: string;
    blockchain: string;
    signingMethod: string;
    contractRoles: string[];
    privateKey?: string;
  }> {
    try {
      const roleAddress = await this.getRoleAddress(addressId);
      
      if (!roleAddress) {
        throw new Error('Role address not found');
      }

      const exportData: any = {
        address: roleAddress.address,
        blockchain: roleAddress.blockchain,
        signingMethod: roleAddress.signingMethod,
        contractRoles: roleAddress.contractRoles
      };

      if (includePrivateKey && roleAddress.signingMethod === 'private_key') {
        const privateKey = await this.getRolePrivateKey(addressId);
        if (privateKey) {
          exportData.privateKey = privateKey;
        }
      }

      return exportData;

    } catch (error: any) {
      console.error('Failed to export role address:', error);
      throw new Error(`Failed to export role address: ${error.message}`);
    }
  }

  /**
   * Import role address
   */
  async importRoleAddress(
    roleId: string,
    blockchain: string,
    address: string,
    contractRoles?: string[],
    privateKey?: string
  ): Promise<RoleAddress> {
    return this.generateRoleAddress({
      roleId,
      blockchain,
      contractRoles,
      signingMethod: privateKey ? 'private_key' : 'hardware_wallet',
      existingAddress: address,
      existingPrivateKey: privateKey
    });
  }

  /**
   * Helper: Format role address from database
   */
  private formatRoleAddress(data: any): RoleAddress {
    let contractRoles: string[] = [];
    if (data.contract_roles) {
      if (typeof data.contract_roles === 'string') {
        try {
          contractRoles = JSON.parse(data.contract_roles);
        } catch {
          contractRoles = [];
        }
      } else if (Array.isArray(data.contract_roles)) {
        contractRoles = data.contract_roles;
      }
    }

    return {
      id: data.id,
      roleId: data.role_id,
      blockchain: data.blockchain,
      address: data.address,
      signingMethod: data.signing_method,
      contractRoles,
      encryptedPrivateKey: data.encrypted_private_key,
      keyVaultReference: data.key_vault_reference,
      derivationPath: data.derivation_path,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by
    };
  }
}

export const roleAddressService = RoleAddressService.getInstance();
