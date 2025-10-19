/**
 * Role Address Service
 * Manages blockchain addresses for roles in the multi-sig system
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
  signingMethod?: 'private_key' | 'hardware_wallet' | 'mpc';
  existingAddress?: string; // For hardware wallet or MPC
  existingPrivateKey?: string; // For importing existing key
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
   * Generate a new address for a role on a specific blockchain
   */
  async generateRoleAddress(
    params: CreateRoleAddressParams
  ): Promise<RoleAddress> {
    const { 
      roleId, 
      blockchain, 
      signingMethod = 'private_key',
      existingAddress,
      existingPrivateKey 
    } = params;

    try {
      let address: string;
      let encryptedPrivateKey: string | undefined;
      let keyVaultReference: string | undefined;

      if (signingMethod === 'private_key') {
        // Generate new wallet or use existing
        if (existingPrivateKey) {
          const wallet = new ethers.Wallet(existingPrivateKey);
          address = wallet.address;
          
          // Encrypt and store in KeyVault
          keyVaultReference = await keyVaultClient.storeKey(existingPrivateKey);
        } else if (existingAddress) {
          // Use existing address (key must be provided separately)
          address = existingAddress;
        } else {
          // Generate new wallet
          const wallet = ethers.Wallet.createRandom();
          address = wallet.address;
          
          // Encrypt and store in KeyVault
          keyVaultReference = await keyVaultClient.storeKey(wallet.privateKey);
        }
      } else {
        // Hardware wallet or MPC - must provide address
        if (!existingAddress) {
          throw new Error(`Address required for ${signingMethod} signing method`);
        }
        address = existingAddress;
      }

      // Store in database
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('role_addresses')
        .insert({
          role_id: roleId,
          blockchain,
          address,
          signing_method: signingMethod,
          key_vault_reference: keyVaultReference,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      return this.formatRoleAddress(data);

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
   * Get address for role on specific blockchain
   */
  async getRoleAddress(
    roleId: string,
    blockchain: string
  ): Promise<RoleAddress | null> {
    try {
      const { data, error } = await supabase
        .from('role_addresses')
        .select('*')
        .eq('role_id', roleId)
        .eq('blockchain', blockchain)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
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
    roleId: string,
    blockchain: string,
    updates: Partial<{
      address: string;
      signingMethod: 'private_key' | 'hardware_wallet' | 'mpc';
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
        .eq('role_id', roleId)
        .eq('blockchain', blockchain);

      if (error) throw error;

    } catch (error: any) {
      console.error('Failed to update role address:', error);
      throw new Error(`Failed to update role address: ${error.message}`);
    }
  }

  /**
   * Delete role address
   */
  async deleteRoleAddress(
    roleId: string,
    blockchain: string
  ): Promise<void> {
    try {
      // Get address first to clean up KeyVault
      const roleAddress = await this.getRoleAddress(roleId, blockchain);
      
      if (roleAddress?.keyVaultReference) {
        await keyVaultClient.deleteKey(roleAddress.keyVaultReference);
      }

      // Delete from database
      const { error } = await supabase
        .from('role_addresses')
        .delete()
        .eq('role_id', roleId)
        .eq('blockchain', blockchain);

      if (error) throw error;

    } catch (error: any) {
      console.error('Failed to delete role address:', error);
      throw new Error(`Failed to delete role address: ${error.message}`);
    }
  }

  /**
   * Get private key for role (requires permissions)
   */
  async getRolePrivateKey(
    roleId: string,
    blockchain: string
  ): Promise<string | null> {
    try {
      const roleAddress = await this.getRoleAddress(roleId, blockchain);
      
      if (!roleAddress?.keyVaultReference) {
        return null;
      }

      // Retrieve from KeyVault
      const keyResult = await keyVaultClient.getKey(roleAddress.keyVaultReference);

      // KeyResult can be string | KeyData, handle both cases
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
   * Sign message with role
   */
  async signWithRole(
    roleId: string,
    blockchain: string,
    message: string
  ): Promise<string> {
    try {
      const privateKey = await this.getRolePrivateKey(roleId, blockchain);
      
      if (!privateKey) {
        throw new Error('Private key not available for this role');
      }

      const wallet = new ethers.Wallet(privateKey);
      const signature = await wallet.signMessage(message);

      return signature;

    } catch (error: any) {
      console.error('Failed to sign with role:', error);
      throw new Error(`Failed to sign with role: ${error.message}`);
    }
  }

  /**
   * Export role address (for backup/migration)
   */
  async exportRoleAddress(
    roleId: string,
    blockchain: string,
    includePrivateKey: boolean = false
  ): Promise<{
    address: string;
    blockchain: string;
    signingMethod: string;
    privateKey?: string;
  }> {
    try {
      const roleAddress = await this.getRoleAddress(roleId, blockchain);
      
      if (!roleAddress) {
        throw new Error('Role address not found');
      }

      const exportData: any = {
        address: roleAddress.address,
        blockchain: roleAddress.blockchain,
        signingMethod: roleAddress.signingMethod
      };

      if (includePrivateKey && roleAddress.signingMethod === 'private_key') {
        const privateKey = await this.getRolePrivateKey(roleId, blockchain);
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
    privateKey?: string
  ): Promise<RoleAddress> {
    return this.generateRoleAddress({
      roleId,
      blockchain,
      signingMethod: privateKey ? 'private_key' : 'hardware_wallet',
      existingAddress: address,
      existingPrivateKey: privateKey
    });
  }

  /**
   * Helper: Format role address from database
   */
  private formatRoleAddress(data: any): RoleAddress {
    return {
      id: data.id,
      roleId: data.role_id,
      blockchain: data.blockchain,
      address: data.address,
      signingMethod: data.signing_method,
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
