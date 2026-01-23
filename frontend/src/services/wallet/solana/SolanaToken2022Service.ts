/**
 * Solana Token-2022 Deployment Service
 * 
 * Handles deployment of Token-2022 tokens with extensions using native @solana/spl-token
 * Supports: Metadata, Transfer Fee, Transfer Hook, Mint Close Authority, and more
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  TransactionInstruction
} from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMintLen,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  ExtensionType,
  createInitializeMintCloseAuthorityInstruction,
  createInitializeTransferFeeConfigInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeNonTransferableMintInstruction,
  createInitializePermanentDelegateInstruction,
  getMint,
  getTransferFeeConfig,
  createEnableCpiGuardInstruction,
  createInitializeInterestBearingMintInstruction
} from '@solana/spl-token';
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  TokenMetadata
} from '@solana/spl-token-metadata';
import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/activityLogger';
import bs58 from 'bs58';

export interface Token2022Extensions {
  // Metadata Extension
  metadata?: {
    name: string;
    symbol: string;
    uri: string;
    additionalMetadata?: Array<[string, string]>;
  };
  
  // Transfer Fee Extension
  transferFee?: {
    feeBasisPoints: number; // e.g., 50 = 0.5%
    maxFee: bigint; // Maximum fee amount
  };
  
  // Transfer Hook Extension
  transferHook?: {
    authority: PublicKey;
    programId: PublicKey;
  };
  
  // Mint Close Authority Extension
  mintCloseAuthority?: {
    closeAuthority: PublicKey;
  };
  
  // Non-Transferable Extension
  nonTransferable?: boolean;
  
  // Permanent Delegate Extension
  permanentDelegate?: {
    delegate: PublicKey;
  };
  
  // CPI Guard Extension (account-level)
  cpiGuard?: boolean;
  
  // Interest-Bearing Extension
  interestBearing?: {
    rateAuthority: PublicKey;
    rate: number; // Basis points
  };
  
  // Default Account State Extension
  defaultAccountState?: {
    state: 'initialized' | 'frozen';
  };
}

export interface SolanaToken2022Config {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  updateAuthority?: string | null;
  extensions: Token2022Extensions;
}

export interface Token2022DeploymentOptions {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcUrl?: string;
  projectId: string;
  userId: string;
  walletPrivateKey: string;
}

export interface Token2022DeploymentResult {
  success: boolean;
  tokenAddress?: string;
  mint?: string;
  transactionHash?: string;
  deploymentStrategy: 'Token2022';
  networkUsed: string;
  extensionsEnabled?: string[];
  errors?: string[];
  warnings?: string[];
  deploymentTimeMs?: number;
  tokenId?: string;
}

export class SolanaToken2022Service {
  /**
   * Deploy Token-2022 with extensions
   */
  async deployToken2022(
    config: SolanaToken2022Config,
    options: Token2022DeploymentOptions
  ): Promise<Token2022DeploymentResult> {
    const startTime = Date.now();
    const enabledExtensions: string[] = [];
    
    try {
      await logActivity({
        action: 'solana_token2022_deployment_started',
        entity_type: 'token',
        entity_id: null,
        details: {
          network: options.network,
          tokenName: config.name,
          symbol: config.symbol,
          extensions: Object.keys(config.extensions)
        }
      });

      // Step 1: Setup connection and keypair
      const rpcUrl = options.rpcUrl || this.getDefaultRpcUrl(options.network);
      const connection = new Connection(rpcUrl, 'confirmed');
      const payer = this.getKeypairFromPrivateKey(options.walletPrivateKey);

      // Step 2: Generate mint keypair
      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey;

      // Step 3: Parse authorities
      const mintAuthority = config.mintAuthority 
        ? new PublicKey(config.mintAuthority) 
        : payer.publicKey;
      const freezeAuthority = config.freezeAuthority 
        ? new PublicKey(config.freezeAuthority) 
        : payer.publicKey;
      const updateAuthority = config.updateAuthority 
        ? new PublicKey(config.updateAuthority) 
        : payer.publicKey;

      // Step 4: Determine which extensions are being used
      const extensions: ExtensionType[] = [];
      
      if (config.extensions.metadata) {
        extensions.push(ExtensionType.MetadataPointer);
        enabledExtensions.push('Metadata');
      }
      if (config.extensions.transferFee) {
        extensions.push(ExtensionType.TransferFeeConfig);
        enabledExtensions.push('TransferFee');
      }
      if (config.extensions.transferHook) {
        extensions.push(ExtensionType.TransferHook);
        enabledExtensions.push('TransferHook');
      }
      if (config.extensions.mintCloseAuthority) {
        extensions.push(ExtensionType.MintCloseAuthority);
        enabledExtensions.push('MintCloseAuthority');
      }
      if (config.extensions.nonTransferable) {
        extensions.push(ExtensionType.NonTransferable);
        enabledExtensions.push('NonTransferable');
      }
      if (config.extensions.permanentDelegate) {
        extensions.push(ExtensionType.PermanentDelegate);
        enabledExtensions.push('PermanentDelegate');
      }
      if (config.extensions.interestBearing) {
        extensions.push(ExtensionType.InterestBearingConfig);
        enabledExtensions.push('InterestBearing');
      }
      if (config.extensions.defaultAccountState) {
        extensions.push(ExtensionType.DefaultAccountState);
        enabledExtensions.push('DefaultAccountState');
      }

      // Step 5: Calculate space and rent
      const mintLen = getMintLen(extensions);
      let mintSpace = mintLen;
      
      // Add space for metadata if needed
      if (config.extensions.metadata) {
        const metadata: TokenMetadata = {
          updateAuthority,
          mint,
          name: config.extensions.metadata.name,
          symbol: config.extensions.metadata.symbol,
          uri: config.extensions.metadata.uri,
          additionalMetadata: config.extensions.metadata.additionalMetadata || []
        };
        const metadataLen = pack(metadata).length;
        mintSpace += metadataLen + 4; // 4 bytes for type and length
      }

      const lamports = await connection.getMinimumBalanceForRentExemption(mintSpace);

      // Step 6: Build transaction instructions
      const instructions: TransactionInstruction[] = [];

      // Create mint account
      instructions.push(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );

      // Initialize Mint Close Authority Extension
      if (config.extensions.mintCloseAuthority) {
        instructions.push(
          createInitializeMintCloseAuthorityInstruction(
            mint,
            config.extensions.mintCloseAuthority.closeAuthority,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Initialize Transfer Fee Extension
      if (config.extensions.transferFee) {
        instructions.push(
          createInitializeTransferFeeConfigInstruction(
            mint,
            payer.publicKey, // transferFeeConfigAuthority
            payer.publicKey, // withdrawWithheldAuthority
            config.extensions.transferFee.feeBasisPoints,
            config.extensions.transferFee.maxFee,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Initialize Metadata Pointer Extension
      if (config.extensions.metadata) {
        instructions.push(
          createInitializeMetadataPointerInstruction(
            mint,
            updateAuthority,
            mint, // metadata account = mint itself
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Initialize Non-Transferable Extension
      if (config.extensions.nonTransferable) {
        instructions.push(
          createInitializeNonTransferableMintInstruction(
            mint,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Initialize Permanent Delegate Extension
      if (config.extensions.permanentDelegate) {
        instructions.push(
          createInitializePermanentDelegateInstruction(
            mint,
            config.extensions.permanentDelegate.delegate,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Initialize Interest-Bearing Extension
      if (config.extensions.interestBearing) {
        instructions.push(
          createInitializeInterestBearingMintInstruction(
            mint,
            config.extensions.interestBearing.rateAuthority,
            config.extensions.interestBearing.rate,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Initialize Mint
      instructions.push(
        createInitializeMintInstruction(
          mint,
          config.decimals,
          mintAuthority,
          freezeAuthority,
          TOKEN_2022_PROGRAM_ID
        )
      );

      // Initialize Metadata (after mint is initialized)
      if (config.extensions.metadata) {
        const metadata: TokenMetadata = {
          updateAuthority,
          mint,
          name: config.extensions.metadata.name,
          symbol: config.extensions.metadata.symbol,
          uri: config.extensions.metadata.uri,
          additionalMetadata: config.extensions.metadata.additionalMetadata || []
        };

        instructions.push(
          createInitializeInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            metadata: mint,
            updateAuthority,
            mint,
            mintAuthority,
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
          })
        );

        // Add custom metadata fields
        if (metadata.additionalMetadata.length > 0) {
          for (const [key, value] of metadata.additionalMetadata) {
            instructions.push(
              createUpdateFieldInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mint,
                updateAuthority,
                field: key,
                value,
              })
            );
          }
        }
      }

      // Step 7: Create associated token account and mint initial supply
      if (config.initialSupply > 0 && !config.extensions.nonTransferable) {
        const associatedTokenAddress = await getAssociatedTokenAddress(
          mint,
          payer.publicKey,
          false,
          TOKEN_2022_PROGRAM_ID
        );

        instructions.push(
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            associatedTokenAddress,
            payer.publicKey,
            mint,
            TOKEN_2022_PROGRAM_ID
          ),
          createMintToInstruction(
            mint,
            associatedTokenAddress,
            mintAuthority,
            BigInt(config.initialSupply) * BigInt(10 ** config.decimals),
            [],
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Step 8: Send and confirm transaction
      const transaction = new Transaction().add(...instructions);
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, mintKeypair],
        { commitment: 'confirmed' }
      );

      // Step 9: Save deployment to database
      const tokenId = await this.saveDeploymentToDatabase({
        projectId: options.projectId,
        userId: options.userId,
        network: `solana-${options.network}`,
        contractAddress: mint.toBase58(),
        transactionHash: signature,
        config,
        extensions: enabledExtensions,
        deploymentData: {
          solana_specific: {
            mint_authority: mintAuthority.toBase58(),
            freeze_authority: freezeAuthority.toBase58(),
            update_authority: updateAuthority.toBase58(),
            decimals: config.decimals,
            initial_supply: config.initialSupply,
            extensions: config.extensions
          }
        }
      });

      const deploymentTimeMs = Date.now() - startTime;

      await logActivity({
        action: 'solana_token2022_deployment_completed',
        entity_type: 'token',
        entity_id: tokenId,
        details: {
          tokenAddress: mint.toBase58(),
          transactionHash: signature,
          extensionsEnabled: enabledExtensions,
          deploymentTimeMs
        }
      });

      return {
        success: true,
        tokenAddress: mint.toBase58(),
        mint: mint.toBase58(),
        transactionHash: signature,
        deploymentStrategy: 'Token2022',
        networkUsed: `solana-${options.network}`,
        extensionsEnabled: enabledExtensions,
        deploymentTimeMs,
        tokenId,
        warnings: []
      };

    } catch (error) {
      const deploymentTimeMs = Date.now() - startTime;
      
      await logActivity({
        action: 'solana_token2022_deployment_failed',
        entity_type: 'token',
        entity_id: null,
        details: {
          error: error instanceof Error ? error.message : String(error),
          deploymentTimeMs,
          extensions: Object.keys(config.extensions)
        }
      });

      return {
        success: false,
        deploymentStrategy: 'Token2022',
        networkUsed: `solana-${options.network}`,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        deploymentTimeMs,
        extensionsEnabled: []
      };
    }
  }

  /**
   * Save deployment to database
   */
  private async saveDeploymentToDatabase(params: {
    projectId: string;
    userId: string;
    network: string;
    contractAddress: string;
    transactionHash: string;
    config: SolanaToken2022Config;
    extensions: string[];
    deploymentData: any;
  }): Promise<string> {
    // Create token record
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .insert({
        project_id: params.projectId,
        name: params.config.name,
        symbol: params.config.symbol,
        standard: 'Token2022',
        network: params.network,
        contract_address: params.contractAddress,
        total_supply: params.config.initialSupply.toString(),
        decimals: params.config.decimals,
        metadata: {
          extensions: params.extensions,
          ...params.config.extensions
        }
      })
      .select()
      .single();

    if (tokenError) {
      throw new Error(`Failed to create token record: ${tokenError.message}`);
    }

    // Create deployment record
    const { data: deploymentData, error: deploymentError } = await supabase
      .from('token_deployments')
      .insert({
        token_id: tokenData.id,
        network: params.network,
        contract_address: params.contractAddress,
        transaction_hash: params.transactionHash,
        deployed_by: params.userId,
        status: 'DEPLOYED',
        deployment_data: params.deploymentData,
        deployment_strategy: 'Token2022',
        details: {
          type: 'Token2022',
          name: params.config.name,
          symbol: params.config.symbol,
          decimals: params.config.decimals,
          extensions: params.extensions
        },
        solana_token_type: 'Token2022',
        solana_extensions: params.extensions as any
      })
      .select()
      .single();

    if (deploymentError) {
      throw new Error(`Failed to create deployment record: ${deploymentError.message}`);
    }

    return tokenData.id;
  }

  /**
   * Convert base58 private key to Keypair
   */
  private getKeypairFromPrivateKey(privateKey: string): Keypair {
    try {
      let secretKey: Uint8Array;
      
      if (privateKey.length === 128) {
        secretKey = new Uint8Array(Buffer.from(privateKey, 'hex'));
      } else {
        secretKey = bs58.decode(privateKey);
      }

      return Keypair.fromSecretKey(secretKey);
    } catch (error) {
      throw new Error(`Invalid Solana private key format: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get default RPC URL for network
   */
  private getDefaultRpcUrl(network: 'mainnet-beta' | 'devnet' | 'testnet'): string {
    const rpcUrls = {
      'mainnet-beta': process.env.VITE_SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'devnet': process.env.VITE_SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
      'testnet': process.env.VITE_SOLANA_TESTNET_RPC_URL || 'https://api.testnet.solana.com'
    };

    return rpcUrls[network];
  }

  /**
   * Validate Token2022 configuration
   */
  validateConfig(config: SolanaToken2022Config): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push('Token name is required');
    }

    if (!config.symbol || config.symbol.trim().length === 0) {
      errors.push('Token symbol is required');
    }

    if (config.decimals < 0 || config.decimals > 18) {
      errors.push('Decimals must be between 0 and 18');
    }

    if (config.initialSupply < 0) {
      errors.push('Initial supply cannot be negative');
    }

    // Non-transferable tokens cannot have initial supply > 1
    if (config.extensions.nonTransferable && config.initialSupply > 1) {
      errors.push('Non-transferable tokens can have maximum initial supply of 1');
    }

    // Validate transfer fee if present
    if (config.extensions.transferFee) {
      if (config.extensions.transferFee.feeBasisPoints < 0 || config.extensions.transferFee.feeBasisPoints > 10000) {
        errors.push('Transfer fee basis points must be between 0 and 10000 (0-100%)');
      }
      if (config.extensions.transferFee.maxFee < 0n) {
        errors.push('Max transfer fee cannot be negative');
      }
    }

    // Validate metadata if present
    if (config.extensions.metadata) {
      if (!config.extensions.metadata.name || config.extensions.metadata.name.trim().length === 0) {
        errors.push('Metadata name is required');
      }
      if (!config.extensions.metadata.symbol || config.extensions.metadata.symbol.trim().length === 0) {
        errors.push('Metadata symbol is required');
      }
      if (!config.extensions.metadata.uri || config.extensions.metadata.uri.trim().length === 0) {
        errors.push('Metadata URI is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const solanaToken2022Service = new SolanaToken2022Service();
