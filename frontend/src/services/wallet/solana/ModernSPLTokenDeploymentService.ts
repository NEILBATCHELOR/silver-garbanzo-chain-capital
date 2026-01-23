/**
 * Modern SPL Token Deployment Service
 * 
 * Handles deployment of SPL tokens using modern @solana/kit and @solana-program/token
 * Follows Chain Capital's established patterns for token deployment
 * 
 * MIGRATION STATUS: ✅ MODERN
 * Uses: ModernSolanaRpc + @solana-program/token
 */

import {
  createSolanaRpc,
  generateKeyPairSigner,
  createKeyPairSignerFromBytes,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  getBase58Encoder,
  getBase58Decoder,
  address,
  lamports,
  type Address,
  type KeyPairSigner,
  type TransactionSigner
} from '@solana/kit';

import {
  TOKEN_PROGRAM_ADDRESS,
  getMintSize,
  getInitializeMintInstruction,
  getCreateAssociatedTokenIdempotentInstruction,
  getMintToCheckedInstruction,
  findAssociatedTokenPda,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS
} from '@solana-program/token';

import { getCreateAccountInstruction } from '@solana-program/system';
import { ModernSolanaRpc, createModernRpc } from '@/infrastructure/web3/solana';
import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/activityLogger';
import bs58 from 'bs58';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ModernSPLTokenConfig {
  name: string;
  symbol: string;
  uri: string; // Metadata URI
  decimals: number;
  initialSupply: bigint;
  mintAuthority?: string | null; // null = deployer retains authority
  freezeAuthority?: string | null;
}

export interface ModernSPLDeploymentOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  projectId: string;
  userId: string;
  walletPrivateKey: string; // Base58 encoded Solana private key
}

export interface ModernSPLDeploymentResult {
  success: boolean;
  tokenAddress?: string;
  mint?: string;
  transactionHash?: string;
  tokenAccountAddress?: string;
  deployedAt?: string;
  errors?: string[];
  warnings?: string[];
}

// ============================================================================
// MODERN SPL TOKEN DEPLOYMENT SERVICE
// ============================================================================

export class ModernSPLTokenDeploymentService {
  /**
   * Deploy SPL token using modern Solana SDK
   */
  async deploySPLToken(
    config: ModernSPLTokenConfig,
    options: ModernSPLDeploymentOptions
  ): Promise<ModernSPLDeploymentResult> {
    try {
      // Step 1: Validate configuration
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Step 2: Setup RPC and signer
      const rpc = options.rpcUrl 
        ? new ModernSolanaRpc({ endpoint: options.rpcUrl })
        : createModernRpc(options.network);

      const payer = await this.createSignerFromPrivateKey(options.walletPrivateKey);
      const mintKeypair = await generateKeyPairSigner();

      await logActivity({
        action: 'modern_spl_deployment_started',
        entity_type: 'token',
        entity_id: mintKeypair.address,
        details: {
          config,
          network: options.network
        }
      });

      // Step 3: Calculate space and rent
      const space = BigInt(getMintSize());
      const rent = await rpc.getRpc().getMinimumBalanceForRentExemption(space).send();

      // Step 4: Build transaction instructions
      const { value: latestBlockhash } = await rpc.getRpc().getLatestBlockhash().send();

      // Create base instructions array
      const instructions: any[] = [
        // Create mint account
        getCreateAccountInstruction({
          payer,
          newAccount: mintKeypair,
          lamports: rent,
          space,
          programAddress: TOKEN_PROGRAM_ADDRESS
        }),
        // Initialize mint
        getInitializeMintInstruction({
          mint: mintKeypair.address,
          decimals: config.decimals,
          mintAuthority: config.mintAuthority 
            ? address(config.mintAuthority) 
            : payer.address,
          freezeAuthority: config.freezeAuthority
            ? address(config.freezeAuthority)
            : (config.freezeAuthority === null ? undefined : payer.address)
        })
      ];

      // Step 5: Add token account and mint instructions if initialSupply > 0
      let tokenAccountAddress: Address | undefined;
      if (config.initialSupply > 0n) {
        // Derive associated token account address
        const [ataAddress] = await findAssociatedTokenPda({
          owner: payer.address,
          tokenProgram: TOKEN_PROGRAM_ADDRESS,
          mint: mintKeypair.address
        });
        tokenAccountAddress = ataAddress;

        instructions.push(
          // Create associated token account (idempotent - won't fail if exists)
          getCreateAssociatedTokenIdempotentInstruction({
            payer,
            ata: tokenAccountAddress,
            owner: payer.address,
            mint: mintKeypair.address
          }),
          // Mint initial supply using MintToChecked
          getMintToCheckedInstruction({
            mint: mintKeypair.address,
            token: tokenAccountAddress,
            mintAuthority: payer,
            amount: config.initialSupply,
            decimals: config.decimals
          })
        );
      }

      // Step 6: Create, sign and send transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(payer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      );

      // Sign the transaction with all embedded signers
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

      // Get signature for tracking (MODERN)
      const signature = getSignatureFromTransaction(signedTransaction);
      
      // Encode and send transaction (MODERN)
      const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);
      await rpc.sendRawTransaction(encodedTransaction, { skipPreflight: false });
      
      // Wait for confirmation (MODERN)
      const confirmed = await rpc.waitForConfirmation(signature, 'confirmed');
      if (!confirmed) {
        throw new Error('Transaction failed to confirm');
      }

      // Step 8: Save to database
      const tokenId = await this.saveSPLDeployment({
        mintAddress: mintKeypair.address,
        tokenAccountAddress,
        signature,
        config,
        options
      });

      await logActivity({
        action: 'modern_spl_deployment_completed',
        entity_type: 'token',
        entity_id: tokenId,
        details: {
          mintAddress: mintKeypair.address,
          signature,
          network: options.network
        }
      });

      return {
        success: true,
        tokenAddress: mintKeypair.address,
        mint: mintKeypair.address,
        transactionHash: signature,
        tokenAccountAddress,
        deployedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Modern SPL deployment error:', error);
      
      await logActivity({
        action: 'modern_spl_deployment_failed',
        entity_type: 'token',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          config,
          options
        }
      });

      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Create signer from private key (supports both base58 and hex)
   */
  private async createSignerFromPrivateKey(privateKey: string): Promise<TransactionSigner & KeyPairSigner> {
    try {
      // Try base58 first
      const decoded = bs58.decode(privateKey);
      return await createKeyPairSignerFromBytes(decoded);
    } catch {
      // Try hex if base58 fails
      const hexBuffer = Buffer.from(privateKey, 'hex');
      return await createKeyPairSignerFromBytes(new Uint8Array(hexBuffer));
    }
  }

  /**
   * Validate SPL token configuration
   */
  private validateConfig(config: ModernSPLTokenConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name || config.name.length === 0) {
      errors.push('Token name is required');
    }

    if (config.name && config.name.length > 32) {
      errors.push('Token name must be 32 characters or less');
    }

    if (!config.symbol || config.symbol.length === 0) {
      errors.push('Token symbol is required');
    }

    if (config.symbol && config.symbol.length > 10) {
      errors.push('Token symbol must be 10 characters or less');
    }

    if (!config.uri || config.uri.length === 0) {
      errors.push('Metadata URI is required');
    }

    if (config.decimals < 0 || config.decimals > 9) {
      errors.push('Decimals must be between 0 and 9');
    }

    if (config.initialSupply < 0n) {
      errors.push('Initial supply cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Save SPL deployment to database
   */
  private async saveSPLDeployment(params: {
    mintAddress: Address;
    tokenAccountAddress?: Address;
    signature: string;
    config: ModernSPLTokenConfig;
    options: ModernSPLDeploymentOptions;
  }): Promise<string> {
    const { mintAddress, tokenAccountAddress, signature, config, options } = params;

    // Step 1: Save to tokens table
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .insert({
        user_id: options.userId,
        project_id: options.projectId,
        name: config.name,
        symbol: config.symbol,
        standard: 'SPL',
        network: `solana-${options.network}`,
        contract_address: mintAddress,
        decimals: config.decimals,
        total_supply: config.initialSupply.toString(),
        metadata_uri: config.uri,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tokenError || !tokenData) {
      throw new Error(`Failed to save token: ${tokenError?.message || 'Unknown error'}`);
    }

    // Step 2: Save to token_deployments table
    const { error: deploymentError } = await supabase
      .from('token_deployments')
      .insert({
        token_id: tokenData.id,
        network: `solana-${options.network}`,
        contract_address: mintAddress,
        transaction_hash: signature,
        deployer_address: options.walletPrivateKey, // Store deployer address (should derive from key)
        solana_token_type: 'SPL',
        deployment_data: {
          solana_specific: {
            mint_authority: config.mintAuthority || null,
            freeze_authority: config.freezeAuthority || undefined,
            metadata_uri: config.uri,
            decimals: config.decimals,
            initial_supply: config.initialSupply.toString(),
            token_account_address: tokenAccountAddress
          }
        },
        deployed_at: new Date().toISOString()
      });

    if (deploymentError) {
      throw new Error(`Failed to save deployment: ${deploymentError.message}`);
    }

    return tokenData.id;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const modernSPLTokenDeploymentService = new ModernSPLTokenDeploymentService();


