/**
 * Modern SPL Token Deployment Service
 * 
 * Handles deployment of SPL tokens using modern @solana/kit and @solana-program/token
 * Follows Chain Capital's established patterns for token deployment
 * 
 * MIGRATION STATUS: ✅ MODERN
 * Uses: ModernSolanaRpc + @solana-program/token
 * 
 * CONFIRMATION STRATEGY: Polling-based (no WebSocket required)
 * Why: Alchemy and many RPC providers don't support WebSocket subscriptions via simple URL conversion.
 * We use getSignatureStatuses polling instead of WebSocket slot notifications for reliability.
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
import { metaplexTokenMetadataService } from './MetaplexTokenMetadataService';
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
   * 
   * @param tokenId - Optional existing token ID to update (instead of creating new)
   */
  async deploySPLToken(
    config: ModernSPLTokenConfig,
    options: ModernSPLDeploymentOptions,
    tokenId?: string
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
      
      // Encode and send transaction
      const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);
      await rpc.sendRawTransaction(encodedTransaction, { 
        skipPreflight: false 
      });

      // Wait for confirmation using polling (no WebSocket required)
      const confirmed = await rpc.waitForConfirmation(signature, 'confirmed', 60);
      
      if (!confirmed) {
        throw new Error('Transaction failed to confirm within 30 seconds');
      }

      // Step 7: Wait for FINALIZED confirmation before creating metadata
      // This ensures the mint account data is fully propagated across the network
      // and available for the Metaplex program to read
      const finalized = await rpc.waitForConfirmation(signature, 'finalized', 90);
      
      if (!finalized) {
        console.warn('Mint creation finalized confirmation timeout - proceeding with metadata creation anyway');
        // Wait extra time if finalization times out
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        // Wait 2 seconds to ensure RPC node has the latest state
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Step 8: Create Metaplex Metadata (name, symbol, URI) with retry logic
      const warnings: string[] = [];
      let metadataSignature: string | undefined;
      
      // Retry metadata creation up to 3 times if it fails due to blockhash expiry
      let metadataAttempts = 0;
      const maxMetadataAttempts = 3;
      let metadataSuccess = false;
      
      while (metadataAttempts < maxMetadataAttempts && !metadataSuccess) {
        metadataAttempts++;
        
        try {
          if (metadataAttempts > 1) {
            console.log(`Metadata creation attempt ${metadataAttempts}/${maxMetadataAttempts}`);
            // Wait before retry to allow network to settle
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          const metadataResult = await metaplexTokenMetadataService.addMetadata(
            {
              name: config.name,
              symbol: config.symbol,
              uri: config.uri,
              sellerFeeBasisPoints: 0 // No royalties for SPL tokens
            },
            {
              network: options.network,
              mintAddress: mintKeypair.address,
              payerPrivateKey: options.walletPrivateKey,
              isMutable: true // Allow metadata updates
            }
          );

          if (metadataResult.success) {
            metadataSignature = metadataResult.signature;
            metadataSuccess = true;
            
            // Check if metadata already existed (special marker)
            const alreadyExisted = metadataResult.signature === 'METADATA_ALREADY_EXISTS';
            
            if (alreadyExisted) {
              console.log('ℹ️ Metadata already exists on-chain - using existing metadata');
              warnings.push('Metadata already existed on-chain - linked to existing metadata account');
            }
            
            await logActivity({
              action: 'spl_metadata_created',
              entity_type: 'token',
              entity_id: mintKeypair.address,
              details: {
                signature: metadataResult.signature,
                metadataPDA: metadataResult.metadataPDA,
                attempts: metadataAttempts,
                alreadyExisted
              }
            });
          } else {
            const errorMsg = metadataResult.error || 'Unknown error';
            
            // Check if this is the "account already initialized" error
            const isAlreadyInitialized = 
              errorMsg.includes('Expected account to be uninitialized') ||
              errorMsg.includes('0xc7');
            
            // Check if this is a retryable error (blockhash expiry)
            const isRetryable = errorMsg.includes('block height exceeded') || 
                              errorMsg.includes('blockhash') ||
                              errorMsg.includes('expired');
            
            if (isAlreadyInitialized) {
              // This shouldn't happen now with our fix, but handle it gracefully
              warnings.push(
                'Metadata account state mismatch detected - this may indicate a previous partial deployment. ' +
                'The token was created successfully. Please verify metadata on-chain.'
              );
              console.warn('⚠️ Metadata account already initialized:', errorMsg);
              break; // Don't retry for this error
            } else if (isRetryable && metadataAttempts < maxMetadataAttempts) {
              console.warn(`Retryable metadata error (attempt ${metadataAttempts}): ${errorMsg}`);
              continue; // Retry
            } else {
              // Non-retryable error or max attempts reached
              warnings.push(`Metadata creation failed after ${metadataAttempts} attempts: ${errorMsg}`);
              console.warn('Metadata creation failed:', errorMsg);
              break;
            }
          }
        } catch (metadataError) {
          const errorMsg = metadataError instanceof Error ? metadataError.message : 'Unknown error';
          
          // Check if this is a retryable error
          const isRetryable = errorMsg.includes('block height exceeded') || 
                            errorMsg.includes('blockhash') ||
                            errorMsg.includes('expired');
          
          if (isRetryable && metadataAttempts < maxMetadataAttempts) {
            console.warn(`Retryable metadata error (attempt ${metadataAttempts}): ${errorMsg}`);
            continue; // Retry
          } else {
            // Non-retryable error or max attempts reached
            warnings.push(`Metadata creation error after ${metadataAttempts} attempts: ${errorMsg}`);
            console.error('Metadata creation error:', metadataError);
            break;
          }
        }
      }

      // Step 9: Save to database
      const savedTokenId = await this.saveSPLDeployment({
        mintAddress: mintKeypair.address,
        tokenAccountAddress,
        signature,
        config,
        options,
        tokenId, // Pass the tokenId to update existing record
        deployerWalletAddress: payer.address // Deployer wallet for reference
      });

      await logActivity({
        action: 'modern_spl_deployment_completed',
        entity_type: 'token',
        entity_id: savedTokenId,
        details: {
          mintAddress: mintKeypair.address,
          signature,
          metadataSignature,
          network: options.network
        }
      });

      return {
        success: true,
        tokenAddress: mintKeypair.address,
        mint: mintKeypair.address,
        transactionHash: signature,
        tokenAccountAddress,
        deployedAt: new Date().toISOString(),
        warnings: warnings.length > 0 ? warnings : undefined
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
   * 
   * IMPORTANT: This method receives a tokenId from the unified service
   * We MUST update the existing token record, NOT create a new one
   * 
   * Database fields:
   * - deployed_by: UUID of user who deployed the token
   * - address: Solana mint address (the token's on-chain identifier)
   * - deployerWalletAddress: Stored in deployment_data for reference
   */
  private async saveSPLDeployment(params: {
    mintAddress: Address;
    tokenAccountAddress?: Address;
    signature: string;
    config: ModernSPLTokenConfig;
    options: ModernSPLDeploymentOptions;
    tokenId?: string; // Existing token ID to update
    deployerWalletAddress: Address; // Wallet that deployed (stored in details only)
  }): Promise<string> {
    const { mintAddress, tokenAccountAddress, signature, config, options, tokenId, deployerWalletAddress } = params;

    // If tokenId is provided, UPDATE existing record. Otherwise CREATE new one.
    let finalTokenId: string;
    
    if (tokenId) {
      // UPDATE EXISTING TOKEN
      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .update({
          deployed_by: options.userId, // User ID who deployed the token
          status: 'DEPLOYED',
          address: mintAddress, // Solana mint address
          deployment_status: 'deployed',
          deployment_timestamp: new Date().toISOString(),
          deployment_transaction: signature,
          deployment_environment: options.network,
          updated_at: new Date().toISOString()
        })
        .eq('id', tokenId)
        .select()
        .single();

      if (tokenError || !tokenData) {
        throw new Error(`Failed to update token: ${tokenError?.message || 'Unknown error'}`);
      }
      
      finalTokenId = tokenData.id;
    } else {
      // CREATE NEW TOKEN (fallback for backward compatibility)
      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .insert({
          deployed_by: options.userId, // User ID who deployed the token
          project_id: options.projectId,
          name: config.name,
          symbol: config.symbol,
          standard: 'SPL',
          status: 'DEPLOYED',
          blockchain: `solana-${options.network}`,
          address: mintAddress, // Solana mint address
          decimals: config.decimals,
          total_supply: config.initialSupply.toString(),
          blocks: {
            // Minimal blocks config for Solana SPL tokens
            name: config.name,
            symbol: config.symbol,
            initial_supply: config.initialSupply.toString(),
            token_type: 'spl',
            is_mintable: false,
            is_burnable: false,
            is_pausable: false
          },
          metadata: {
            uri: config.uri
          },
          deployment_status: 'deployed',
          deployment_timestamp: new Date().toISOString(),
          deployment_transaction: signature,
          deployment_environment: options.network,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (tokenError || !tokenData) {
        throw new Error(`Failed to save token: ${tokenError?.message || 'Unknown error'}`);
      }
      
      finalTokenId = tokenData.id;
    }

    // Step 2: Save to token_deployments table
    const { error: deploymentError } = await supabase
      .from('token_deployments')
      .insert({
        token_id: finalTokenId,
        network: `solana-${options.network}`,
        contract_address: mintAddress,
        transaction_hash: signature,
        deployed_by: mintAddress, // For Solana: use mint address, not wallet
        status: 'success',
        deployed_at: new Date().toISOString(),
        solana_token_type: 'SPL',
        details: {
          deployment_type: 'modern_spl',
          token_type: 'SPL',
          network: options.network,
          user_id: options.userId, // Store userId in details for reference
          deployer_wallet: deployerWalletAddress // Store deployer wallet in details
        },
        deployment_data: {
          solana_specific: {
            mint_authority: config.mintAuthority || null,
            freeze_authority: config.freezeAuthority || undefined,
            metadata_uri: config.uri,
            decimals: config.decimals,
            initial_supply: config.initialSupply.toString(),
            token_account_address: tokenAccountAddress
          }
        }
      });

    if (deploymentError) {
      throw new Error(`Failed to save deployment: ${deploymentError.message}`);
    }

    return finalTokenId;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const modernSPLTokenDeploymentService = new ModernSPLTokenDeploymentService();


