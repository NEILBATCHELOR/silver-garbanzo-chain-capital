/**
 * User Address Service
 * Manages blockchain addresses for users to be multi-sig wallet owners
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { keyVaultClient } from '@/infrastructure/keyVault/KeyVaultClient';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { ContractRoleType } from '@/services/user/contractRoles';

export interface UserAddress {
  id: string;
  userId: string;
  blockchain: string;
  address: string;
  signingMethod: 'private_key' | 'hardware_wallet' | 'mpc';
  keyVaultReference: string | null;
  encryptedPrivateKey: string | null;
  contractRoles?: ContractRoleType[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateAddressParams {
  userId: string;
  blockchain: string;
  contractRoles?: ContractRoleType[];
  signingMethod?: 'private_key' | 'hardware_wallet' | 'mpc';
}

export interface ImportAddressParams {
  userId: string;
  blockchain: string;
  address: string;
  privateKey?: string;
  signingMethod?: 'private_key' | 'hardware_wallet' | 'mpc';
}

export class UserAddressService {
  private static instance: UserAddressService;

  private constructor() {}

  static getInstance(): UserAddressService {
    if (!UserAddressService.instance) {
      UserAddressService.instance = new UserAddressService();
    }
    return UserAddressService.instance;
  }

  /**
   * Generate a new blockchain address for a user
   */
  async generateAddress(params: GenerateAddressParams): Promise<UserAddress> {
    console.log('🚀 UserAddressService.generateAddress() called with params:', params);
    
    try {
      const { userId, blockchain, contractRoles, signingMethod = 'private_key' } = params;

      console.log('📋 Checking for existing addresses...');
      // For per-permission addresses, allow multiple addresses per blockchain
      // Only check for duplicates if no contractRoles specified (legacy behavior)
      if (!contractRoles || contractRoles.length === 0) {
        const existing = await this.getUserAddress(userId, blockchain);
        if (existing) {
          console.error('❌ User already has an address for this blockchain');
          throw new Error(`User already has an address for ${blockchain}`);
        }
        console.log('✅ No existing address found');
      } else {
        console.log('ℹ️ Skipping duplicate check (per-permission address)');
      }

      let address: string;
      let encryptedPrivateKey: string | null = null;
      let keyVaultReference: string | null = null;

      if (signingMethod === 'private_key') {
        console.log('🔐 Generating new wallet...');
        // Generate new wallet
        const wallet = ethers.Wallet.createRandom();
        address = wallet.address;
        console.log('✅ Wallet generated:', address);

        // Create key vault reference
        const suffix = contractRoles && contractRoles.length > 0 
          ? `_${contractRoles[0]}` 
          : '';
        keyVaultReference = `user_${userId}_${blockchain}${suffix}`;
        console.log('📝 Key vault reference:', keyVaultReference);
        
        // Encrypt private key
        console.log('🔒 Encrypting private key...');
        try {
          encryptedPrivateKey = await WalletEncryptionClient.encrypt(wallet.privateKey);
          console.log('✅ Private key encrypted successfully');
        } catch (encryptError) {
          console.error('❌ Failed to encrypt private key:', encryptError);
          throw new Error(`Encryption failed: ${encryptError instanceof Error ? encryptError.message : 'Unknown error'}`);
        }

        // ✅ Store encrypted key in key_vault_keys table with matching reference
        console.log('💾 Storing in key_vault_keys table...');
        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          
          if (authError) {
            console.warn('⚠️ Could not get authenticated user:', authError);
          }
          
          const { data: keyVaultData, error: keyVaultError } = await supabase
            .from('key_vault_keys')
            .insert({
              key_id: keyVaultReference,
              encrypted_key: encryptedPrivateKey,
              key_type: 'private_key',
              metadata: {
                user_id: userId,
                blockchain,
                contract_roles: contractRoles || [],
                address
              },
              created_by: user?.id
            })
            .select()
            .single();
          
          if (keyVaultError) {
            console.error('❌ Failed to insert into key_vault_keys:', keyVaultError);
            console.error('❌ Error details:', JSON.stringify(keyVaultError, null, 2));
          } else {
            console.log('✅ Successfully stored in key_vault_keys:', keyVaultData);
          }
        } catch (keyVaultError: any) {
          console.error('❌ Exception storing in key_vault_keys:', keyVaultError);
          console.error('❌ Error stack:', keyVaultError.stack);
          // Continue - user_addresses has the encrypted key as fallback
        }
      } else {
        console.error('❌ Unsupported signing method:', signingMethod);
        throw new Error(`Signing method '${signingMethod}' not yet implemented`);
      }

      // Store in database
      console.log('💾 Storing in user_addresses table...');
      const { data, error } = await supabase
        .from('user_addresses')
        .insert({
          user_id: userId,
          blockchain,
          address,
          signing_method: signingMethod,
          key_vault_reference: keyVaultReference,
          encrypted_private_key: encryptedPrivateKey,
          contract_roles: contractRoles || [],
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to insert into user_addresses:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to store address: ${error.message}`);
      }

      console.log('✅ Successfully stored in user_addresses:', data);
      console.log('✅ UserAddressService.generateAddress() completed successfully');

      return this.formatUserAddress(data);
    } catch (error) {
      console.error('❌ FATAL ERROR in generateAddress():', error);
      console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Import an existing address for a user
   */
  async importAddress(params: ImportAddressParams): Promise<UserAddress> {
    try {
      const {
        userId,
        blockchain,
        address,
        privateKey,
        signingMethod = 'private_key'
      } = params;

      // Check if address already exists
      const { data: existingAddress } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('blockchain', blockchain)
        .eq('address', address)
        .single();

      if (existingAddress) {
        throw new Error('Address already exists in the system');
      }

      let encryptedPrivateKey: string | null = null;
      let keyVaultReference: string | null = null;

      if (signingMethod === 'private_key' && privateKey) {
        // Create key vault reference
        keyVaultReference = `user_${userId}_${blockchain}`;
        
        // Encrypt private key
        encryptedPrivateKey = await WalletEncryptionClient.encrypt(privateKey);

        // ✅ NEW: Store encrypted key in key_vault_keys table with matching reference
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          await supabase
            .from('key_vault_keys')
            .insert({
              key_id: keyVaultReference,  // Use same ID as reference
              encrypted_key: encryptedPrivateKey,
              key_type: 'private_key',
              metadata: {
                user_id: userId,
                blockchain,
                address,
                imported: true
              },
              created_by: user?.id
            });
          
          console.log(`✅ Stored imported key in key_vault_keys with reference: ${keyVaultReference}`);
        } catch (keyVaultError: any) {
          console.error('Failed to store in key_vault_keys (non-blocking):', keyVaultError);
          // Continue - user_addresses has the encrypted key as fallback
        }
      }

      // Store in database
      const { data, error } = await supabase
        .from('user_addresses')
        .insert({
          user_id: userId,
          blockchain,
          address,
          signing_method: signingMethod,
          key_vault_reference: keyVaultReference,
          encrypted_private_key: encryptedPrivateKey,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to import address: ${error.message}`);
      }

      return this.formatUserAddress(data);
    } catch (error) {
      console.error('Failed to import user address:', error);
      throw error;
    }
  }

  /**
   * Get all addresses for a user
   */
  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch user addresses: ${error.message}`);
      }

      return (data || []).map(this.formatUserAddress);
    } catch (error) {
      console.error('Failed to get user addresses:', error);
      throw error;
    }
  }

  /**
   * Get user's address for a specific blockchain
   */
  async getUserAddress(
    userId: string,
    blockchain: string
  ): Promise<UserAddress | null> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('blockchain', blockchain)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found
        throw new Error(`Failed to fetch user address: ${error.message}`);
      }

      return data ? this.formatUserAddress(data) : null;
    } catch (error) {
      console.error('Failed to get user address:', error);
      throw error;
    }
  }

  /**
   * Get user's address by address string
   */
  async getUserByAddress(
    blockchain: string,
    address: string
  ): Promise<UserAddress | null> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('blockchain', blockchain)
        .eq('address', address)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch address: ${error.message}`);
      }

      return data ? this.formatUserAddress(data) : null;
    } catch (error) {
      console.error('Failed to get user by address:', error);
      throw error;
    }
  }

  /**
   * Get decrypted private key for user's address
   */
  async getUserPrivateKey(userId: string, blockchain: string): Promise<string> {
    try {
      const address = await this.getUserAddress(userId, blockchain);
      if (!address) {
        throw new Error('User address not found');
      }

      if (address.signingMethod !== 'private_key') {
        throw new Error(`Cannot retrieve private key for ${address.signingMethod} signing method`);
      }

      if (!address.encryptedPrivateKey) {
        throw new Error('Encrypted private key not found');
      }

      // Decrypt the private key
      const privateKey = await WalletEncryptionClient.decrypt(address.encryptedPrivateKey);
      return privateKey;
    } catch (error) {
      console.error('Failed to get user private key:', error);
      throw error;
    }
  }

  /**
   * Sign a message with user's address
   */
  async signMessage(
    userId: string,
    blockchain: string,
    message: string
  ): Promise<string> {
    try {
      const privateKey = await this.getUserPrivateKey(userId, blockchain);
      const wallet = new ethers.Wallet(privateKey);
      const signature = await wallet.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  /**
   * Get addresses for multiple users on a specific blockchain
   */
  async getUsersWithAddresses(
    userIds: string[],
    blockchain: string
  ): Promise<Array<{ userId: string; address: string | null }>> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('user_id, address')
        .in('user_id', userIds)
        .eq('blockchain', blockchain)
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to fetch user addresses: ${error.message}`);
      }

      // Create map of userId to address
      const addressMap = new Map<string, string>();
      (data || []).forEach(row => {
        addressMap.set(row.user_id, row.address);
      });

      // Return all userIds with their addresses (null if not found)
      return userIds.map(userId => ({
        userId,
        address: addressMap.get(userId) || null
      }));
    } catch (error) {
      console.error('Failed to get users with addresses:', error);
      throw error;
    }
  }

  /**
   * Deactivate (soft delete) a user address
   */
  async deactivateAddress(userId: string, blockchain: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_addresses')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('blockchain', blockchain);

      if (error) {
        throw new Error(`Failed to deactivate address: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to deactivate address:', error);
      throw error;
    }
  }

  /**
   * Permanently delete a user address and its private key
   */
  async deleteAddress(userId: string, blockchain: string): Promise<void> {
    try {
      // Get address to retrieve keyVaultReference
      const address = await this.getUserAddress(userId, blockchain);
      if (!address) {
        throw new Error('Address not found');
      }

      // ✅ Delete from key_vault_keys table if reference exists
      if (address.keyVaultReference) {
        try {
          await supabase
            .from('key_vault_keys')
            .delete()
            .eq('key_id', address.keyVaultReference);
          
          console.log(`✅ Deleted key from key_vault_keys: ${address.keyVaultReference}`);
        } catch (keyVaultError: any) {
          console.error('Failed to delete from key_vault_keys (non-blocking):', keyVaultError);
          // Continue - will still delete from user_addresses
        }
      }

      // Delete from user_addresses database
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('user_id', userId)
        .eq('blockchain', blockchain);

      if (error) {
        throw new Error(`Failed to delete address: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to delete address:', error);
      throw error;
    }
  }

  /**
   * Format database row to UserAddress interface
   */
  private formatUserAddress(data: any): UserAddress {
    return {
      id: data.id,
      userId: data.user_id,
      blockchain: data.blockchain,
      address: data.address,
      signingMethod: data.signing_method,
      keyVaultReference: data.key_vault_reference,
      encryptedPrivateKey: data.encrypted_private_key,
      contractRoles: data.contract_roles || [],
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

export const userAddressService = UserAddressService.getInstance();
