/**
 * Wallet Restoration API Routes
 * 
 * SECURITY CRITICAL: These routes handle wallet restoration with private key encryption
 * Should be protected with proper authentication in production
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { WalletEncryptionService } from '../services/security/walletEncryptionService';
import { getSupabaseClient } from '../infrastructure/database/supabase';
import { v4 as uuidv4 } from 'uuid';

// Request/Response Schemas
const RestoreWalletRequestSchema = Type.Object({
  walletAddress: Type.String({ minLength: 1 }),
  publicKey: Type.String({ minLength: 1 }),
  privateKey: Type.String({ minLength: 1 }),
  mnemonic: Type.String({ minLength: 1 }),
  projectId: Type.String({ format: 'uuid' }),
  chainId: Type.String({ minLength: 1 }),
  walletType: Type.Optional(Type.String()),
  projectWalletName: Type.Optional(Type.String()),
  evmChainId: Type.Optional(Type.String())
});

const RestoreWalletResponseSchema = Type.Object({
  success: Type.Boolean(),
  walletId: Type.String({ format: 'uuid' }),
  privateKeyVaultId: Type.String({ format: 'uuid' }),
  mnemonicVaultId: Type.String({ format: 'uuid' }),
  walletAddress: Type.String(),
  message: Type.String()
});

const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
  details: Type.Optional(Type.Any())
});

export default async function walletRestorationRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/wallet/restore
   * Restore a wallet by encrypting its keys and storing in database
   */
  fastify.post('/api/wallet/restore', {
    schema: {
      tags: ['Wallet Restoration'],
      description: 'Restore a wallet with encrypted private keys',
      body: RestoreWalletRequestSchema,
      response: {
        200: RestoreWalletResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{
    Body: {
      walletAddress: string;
      publicKey: string;
      privateKey: string;
      mnemonic: string;
      projectId: string;
      chainId: string;
      walletType?: string;
      projectWalletName?: string;
      evmChainId?: string;
    }
  }>, reply: FastifyReply) => {
    try {
      const {
        walletAddress,
        publicKey,
        privateKey,
        mnemonic,
        projectId,
        chainId,
        walletType,
        projectWalletName,
        evmChainId
      } = request.body;

      fastify.log.info(`Starting wallet restoration for address: ${walletAddress}`);

      // Validate master password is configured
      if (!WalletEncryptionService.isMasterPasswordConfigured()) {
        return reply.code(500).send({
          error: 'ConfigurationError',
          message: 'Wallet encryption is not properly configured. WALLET_MASTER_PASSWORD is missing.'
        });
      }

      // Get Supabase client
      const supabase = getSupabaseClient();

      // Check if wallet already exists
      const { data: existingWallet, error: checkError } = await supabase
        .from('project_wallets')
        .select('id, wallet_address')
        .eq('wallet_address', walletAddress)
        .eq('project_id', projectId)
        .maybeSingle();

      if (checkError) {
        fastify.log.error({ err: checkError }, 'Error checking existing wallet');
        return reply.code(500).send({
          error: 'DatabaseError',
          message: 'Failed to check for existing wallet',
          details: checkError
        });
      }

      if (existingWallet) {
        return reply.code(400).send({
          error: 'WalletExists',
          message: `Wallet with address ${walletAddress} already exists for this project`,
          details: { existingWalletId: existingWallet.id }
        });
      }

      // Step 1: Encrypt private key and mnemonic
      fastify.log.info('Encrypting private key...');
      const encryptedPrivateKey = await WalletEncryptionService.encrypt(privateKey);
      
      fastify.log.info('Encrypting mnemonic...');
      const encryptedMnemonic = await WalletEncryptionService.encrypt(mnemonic);

      // Step 2: Generate UUIDs for the records
      const walletId = uuidv4();
      const privateKeyVaultId = uuidv4();
      const mnemonicVaultId = uuidv4();

      fastify.log.info(`Generated IDs - Wallet: ${walletId}, PrivateKey: ${privateKeyVaultId}, Mnemonic: ${mnemonicVaultId}`);

      // Step 3: Create project_wallets record with ENCRYPTED values in legacy columns
      const walletRecord = {
        id: walletId,
        project_id: projectId,
        wallet_address: walletAddress,
        public_key: publicKey,
        private_key: encryptedPrivateKey, // Store ENCRYPTED private key
        mnemonic: encryptedMnemonic, // Store ENCRYPTED mnemonic
        chain_id: chainId,
        wallet_type: walletType || 'ethereum',
        private_key_vault_id: null, // Set to NULL initially
        mnemonic_vault_id: null, // Set to NULL initially
        project_wallet_name: projectWalletName || null,
        evm_address: walletAddress,
        evm_chain_id: evmChainId || null
      };

      fastify.log.info('Inserting project wallet record (without vault IDs)...');
      const { error: walletError } = await supabase
        .from('project_wallets')
        .insert([walletRecord]);

      if (walletError) {
        fastify.log.error({ err: walletError }, 'Failed to insert project wallet');
        return reply.code(500).send({
          error: 'DatabaseError',
          message: 'Failed to create wallet record',
          details: walletError
        });
      }

      // Step 4: Create key_vault_keys records (now wallet exists so foreign key works)
      const keyVaultRecords = [
        {
          id: privateKeyVaultId,
          key_id: `project_${projectId}_${walletAddress}_private`,
          key_type: 'project_private_key',
          encrypted_key: encryptedPrivateKey,
          project_wallet_id: walletId,
          metadata: {
            network: walletType || 'ethereum',
            chain_id: chainId,
            project_id: projectId,
            wallet_address: walletAddress
          }
        },
        {
          id: mnemonicVaultId,
          key_id: `project_${projectId}_${walletAddress}_mnemonic`,
          key_type: 'project_mnemonic',
          encrypted_key: encryptedMnemonic,
          project_wallet_id: walletId,
          metadata: {
            network: walletType || 'ethereum',
            chain_id: chainId,
            project_id: projectId,
            wallet_address: walletAddress
          }
        }
      ];

      fastify.log.info('Inserting key vault records...');
      const { error: vaultError } = await supabase
        .from('key_vault_keys')
        .insert(keyVaultRecords);

      if (vaultError) {
        fastify.log.error({ err: vaultError }, 'Failed to insert key vault records');
        
        // Cleanup: Delete the wallet record we just created
        fastify.log.info('Cleaning up wallet record...');
        await supabase
          .from('project_wallets')
          .delete()
          .eq('id', walletId);

        return reply.code(500).send({
          error: 'DatabaseError',
          message: 'Failed to store encrypted keys',
          details: vaultError
        });
      }

      // Step 5: Update wallet record with vault IDs (complete the relationship)
      fastify.log.info('Updating wallet with vault IDs...');
      const { error: updateError } = await supabase
        .from('project_wallets')
        .update({
          private_key_vault_id: privateKeyVaultId,
          mnemonic_vault_id: mnemonicVaultId
        })
        .eq('id', walletId);

      if (updateError) {
        fastify.log.error({ err: updateError }, 'Failed to update wallet with vault IDs');
        
        // Cleanup: Delete both wallet and keys
        fastify.log.info('Cleaning up wallet and key records...');
        await supabase
          .from('key_vault_keys')
          .delete()
          .in('id', [privateKeyVaultId, mnemonicVaultId]);
        await supabase
          .from('project_wallets')
          .delete()
          .eq('id', walletId);

        return reply.code(500).send({
          error: 'DatabaseError',
          message: 'Failed to link vault IDs to wallet',
          details: updateError
        });
      }

      fastify.log.info(`✅ Wallet restored successfully: ${walletAddress}`);

      return reply.code(200).send({
        success: true,
        walletId,
        privateKeyVaultId,
        mnemonicVaultId,
        walletAddress,
        message: `Wallet ${walletAddress} has been successfully restored and encrypted`
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Wallet restoration failed');
      return reply.code(500).send({
        error: 'RestorationError',
        message: error instanceof Error ? error.message : 'Failed to restore wallet',
        details: error
      });
    }
  });

  /**
   * POST /api/wallet/verify-restoration
   * Verify that a restored wallet can be decrypted correctly
   */
  fastify.post('/api/wallet/verify-restoration', {
    schema: {
      tags: ['Wallet Restoration'],
      description: 'Verify that a restored wallet keys can be decrypted',
      body: Type.Object({
        walletId: Type.String({ format: 'uuid' })
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          walletAddress: Type.String(),
          privateKeyValid: Type.Boolean(),
          mnemonicValid: Type.Boolean(),
          message: Type.String()
        }),
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{
    Body: { walletId: string }
  }>, reply: FastifyReply) => {
    try {
      const { walletId } = request.body;

      fastify.log.info(`Verifying wallet restoration: ${walletId}`);

      const supabase = getSupabaseClient();

      // Get wallet record
      const { data: wallet, error: walletError } = await supabase
        .from('project_wallets')
        .select('*')
        .eq('id', walletId)
        .single();

      if (walletError || !wallet) {
        return reply.code(400).send({
          error: 'NotFound',
          message: 'Wallet not found',
          details: walletError
        });
      }

      // Get encrypted keys
      const { data: keys, error: keysError } = await supabase
        .from('key_vault_keys')
        .select('*')
        .in('id', [wallet.private_key_vault_id, wallet.mnemonic_vault_id]);

      if (keysError || !keys || keys.length !== 2) {
        return reply.code(500).send({
          error: 'DatabaseError',
          message: 'Failed to retrieve encrypted keys',
          details: keysError
        });
      }

      // Try to decrypt both keys
      let privateKeyValid = false;
      let mnemonicValid = false;

      for (const key of keys) {
        try {
          const decrypted = await WalletEncryptionService.decrypt(key.encrypted_key);
          
          if (key.key_type === 'project_private_key') {
            privateKeyValid = decrypted.startsWith('0x') && decrypted.length === 66;
          } else if (key.key_type === 'project_mnemonic') {
            mnemonicValid = decrypted.split(' ').length >= 12;
          }
        } catch (error) {
          fastify.log.error({ err: error, keyType: key.key_type }, 'Decryption failed');
        }
      }

      const success = privateKeyValid && mnemonicValid;

      return reply.code(200).send({
        success,
        walletAddress: wallet.wallet_address,
        privateKeyValid,
        mnemonicValid,
        message: success 
          ? 'Wallet restoration verified successfully'
          : 'Wallet restoration verification failed - keys could not be decrypted correctly'
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Verification failed');
      return reply.code(500).send({
        error: 'VerificationError',
        message: error instanceof Error ? error.message : 'Failed to verify wallet restoration',
        details: error
      });
    }
  });
}
