/**
 * Solana Token-2022 Deployment Service
 * 
 * Handles deployment of Token-2022 tokens with extensions
 * Uses native @solana-program/token-2022 library
 * Based on official Solana documentation and examples
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createSolanaRpc,
  generateKeyPairSigner,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  Address
} from '@solana/kit';
import {
  extension,
  getMintSize,
  TOKEN_2022_PROGRAM_ADDRESS,
  getInitializeMetadataPointerInstruction,
  getInitializeMintInstruction,
  getInitializeTokenMetadataInstruction,
  getUpdateTokenMetadataFieldInstruction,
  tokenMetadataField,
  getInitializeTransferFeeConfigInstruction,
  AccountState
} from '@solana-program/token-2022';
import { getCreateAccountInstruction } from '@solana-program/system';
import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/activityLogger';
import bs58 from 'bs58';

// ===========================
// Types
// ===========================

export interface MetadataConfig {
  name: string;
  symbol: string;
  uri: string;
  additionalMetadata?: Map<string, string>;
}

export interface TransferFeeConfig {
  feeBasisPoints: number; // 0-10000 (0-100%)
  maxFee: bigint;
  transferFeeAuthority?: string;
  withdrawWithheldAuthority?: string;
}

export interface Token2022Config {
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  initialSupply: number;
  
  // Authorities
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  updateAuthority?: string | null;
  
  // Extensions
  enableMetadata?: boolean;
  enableTransferFee?: boolean;
  enableMintCloseAuthority?: boolean;
  enableDefaultAccountState?: 'initialized' | 'frozen';
  
  // Extension configs
  metadata?: MetadataConfig;
  transferFee?: TransferFeeConfig;
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
  extensions?: string[];
  errors?: string[];
  warnings?: string[];
  deploymentTimeMs?: number;
  tokenId?: string;
}

// ===========================
// Service Class
// ===========================

export class Token2022DeploymentService {
  /**
   * Deploy Token-2022 with extensions
   */
  async deployToken2022(
    config: Token2022Config,
    options: Token2022DeploymentOptions
  ): Promise<Token2022DeploymentResult> {
    const startTime = Date.now();
    
    try {
      await logActivity({
        action: 'token2022_deployment_started',
        entity_type: 'token',
        entity_id: null,
        details: {
          network: options.network,
          tokenName: config.name,
          symbol: config.symbol,
          extensions: this.getEnabledExtensions(config)
        }
      });

      // Step 1: Validate config
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Step 2: Setup connection and keypair
      const rpcUrl = options.rpcUrl || this.getDefaultRpcUrl(options.network);
      const connection = new Connection(rpcUrl, 'confirmed');
      const payer = this.getKeypairFromPrivateKey(options.walletPrivateKey);

      // Step 3: Generate mint keypair
      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey;

      // Step 4: Build extensions
      const extensions = this.buildExtensions(config, payer.publicKey, mint);
      
      // Step 5: Calculate space and rent
      const { spaceWithoutMetadata, spaceWithMetadata } = this.calculateSpace(extensions);
      const lamports = await connection.getMinimumBalanceForRentExemption(Number(spaceWithMetadata));

      // Step 6: Build instructions
      const instructions = await this.buildInstructions(
        config,
        payer,
        mintKeypair,
        extensions,
        lamports,
        Number(spaceWithoutMetadata)
      );

      // Step 7: Create and send transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        new Transaction().add(...instructions),
        [payer, mintKeypair],
        { commitment: 'confirmed' }
      );

      // Step 8: Save to database
      const tokenId = await this.saveDeploymentToDatabase({
        projectId: options.projectId,
        userId: options.userId,
        network: `solana-${options.network}`,
        contractAddress: mint.toBase58(),
        transactionHash: signature,
        config,
        extensions: this.getEnabledExtensions(config),
        deploymentData: this.buildDeploymentData(config, payer.publicKey, mint)
      });

      const deploymentTimeMs = Date.now() - startTime;

      await logActivity({
        action: 'token2022_deployment_completed',
        entity_type: 'token',
        entity_id: tokenId,
        details: {
          tokenAddress: mint.toBase58(),
          transactionHash: signature,
          extensions: this.getEnabledExtensions(config),
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
        extensions: this.getEnabledExtensions(config),
        deploymentTimeMs,
        tokenId,
        warnings: this.getDeploymentWarnings(config)
      };

    } catch (error) {
      const deploymentTimeMs = Date.now() - startTime;
      
      await logActivity({
        action: 'token2022_deployment_failed',
        entity_type: 'token',
        entity_id: null,
        details: {
          error: error instanceof Error ? error.message : String(error),
          extensions: this.getEnabledExtensions(config),
          deploymentTimeMs
        }
      });

      return {
        success: false,
        deploymentStrategy: 'Token2022',
        networkUsed: `solana-${options.network}`,
        extensions: this.getEnabledExtensions(config),
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        deploymentTimeMs
      };
    }
  }

  // ===========================
  // Extension Builders
  // ===========================

  /**
   * Build all enabled extensions
   */
  private buildExtensions(
    config: Token2022Config,
    authorityPubKey: PublicKey,
    mint: PublicKey
  ): any[] {
    const extensions: any[] = [];

    // Metadata Pointer (required if metadata enabled)
    if (config.enableMetadata) {
      extensions.push(
        extension('MetadataPointer', {
          authority: authorityPubKey.toBase58() as Address,
          metadataAddress: mint.toBase58() as Address,
        })
      );
    }

    // Token Metadata
    if (config.enableMetadata && config.metadata) {
      extensions.push(
        extension('TokenMetadata', {
          updateAuthority: (config.updateAuthority 
            ? new PublicKey(config.updateAuthority) 
            : authorityPubKey
          ).toBase58() as Address,
          mint: mint.toBase58() as Address,
          name: config.metadata.name,
          symbol: config.metadata.symbol,
          uri: config.metadata.uri,
          additionalMetadata: config.metadata.additionalMetadata || new Map(),
        })
      );
    }

    // Transfer Fee
    if (config.enableTransferFee && config.transferFee) {
      const feeConfig = config.transferFee;
      extensions.push(
        extension('TransferFeeConfig', {
          transferFeeConfigAuthority: (feeConfig.transferFeeAuthority 
            ? new PublicKey(feeConfig.transferFeeAuthority)
            : authorityPubKey
          ).toBase58() as Address,
          withdrawWithheldAuthority: (feeConfig.withdrawWithheldAuthority
            ? new PublicKey(feeConfig.withdrawWithheldAuthority)
            : authorityPubKey
          ).toBase58() as Address,
          withheldAmount: BigInt(0),
          olderTransferFee: {
            epoch: BigInt(0),
            transferFeeBasisPoints: feeConfig.feeBasisPoints,
            maximumFee: feeConfig.maxFee,
          },
          newerTransferFee: {
            epoch: BigInt(0),
            transferFeeBasisPoints: feeConfig.feeBasisPoints,
            maximumFee: feeConfig.maxFee,
          },
        })
      );
    }

    // Mint Close Authority
    if (config.enableMintCloseAuthority) {
      extensions.push(
        extension('MintCloseAuthority', {
          closeAuthority: authorityPubKey.toBase58() as Address,
        })
      );
    }

    // Default Account State
    if (config.enableDefaultAccountState) {
      extensions.push(
        extension('DefaultAccountState', {
          state: config.enableDefaultAccountState === 'frozen' 
            ? AccountState.Frozen
            : AccountState.Initialized,
        })
      );
    }

    return extensions;
  }

  /**
   * Calculate mint space with and without metadata
   */
  private calculateSpace(extensions: any[]): {
    spaceWithoutMetadata: bigint;
    spaceWithMetadata: bigint;
  } {
    // Metadata extension must be added AFTER mint initialization
    // So we calculate space without it first
    const extensionsWithoutMetadata = extensions.filter(
      ext => ext.__kind !== 'TokenMetadata'
    );

    const spaceWithoutMetadata = BigInt(getMintSize(extensionsWithoutMetadata));
    const spaceWithMetadata = BigInt(getMintSize(extensions));

    return { spaceWithoutMetadata, spaceWithMetadata };
  }

  /**
   * Build all instructions in correct order
   */
  private async buildInstructions(
    config: Token2022Config,
    payer: Keypair,
    mintKeypair: Keypair,
    extensions: any[],
    lamports: number,
    space: number
  ): Promise<any[]> {
    const instructions: any[] = [];
    const mint = mintKeypair.publicKey;

    // Parse authorities
    const mintAuthority = config.mintAuthority 
      ? new PublicKey(config.mintAuthority)
      : payer.publicKey;
    const freezeAuthority = config.freezeAuthority
      ? new PublicKey(config.freezeAuthority)
      : payer.publicKey;

    // 1. Create Account
    instructions.push(
      getCreateAccountInstruction({
        payer: { address: payer.publicKey.toBase58() as Address } as any,
        newAccount: { address: mint.toBase58() as Address } as any,
        lamports: BigInt(lamports),
        space: BigInt(space),
        programAddress: TOKEN_2022_PROGRAM_ADDRESS,
      })
    );

    // 2. Initialize Metadata Pointer (BEFORE initialize mint)
    if (config.enableMetadata) {
      instructions.push(
        getInitializeMetadataPointerInstruction({
          mint: mint.toBase58() as Address,
          authority: payer.publicKey.toBase58() as Address,
          metadataAddress: mint.toBase58() as Address,
        })
      );
    }

    // 3. Initialize Transfer Fee (BEFORE initialize mint)
    if (config.enableTransferFee && config.transferFee) {
      const feeConfig = config.transferFee;
      instructions.push(
        getInitializeTransferFeeConfigInstruction({
          mint: mint.toBase58() as Address,
          transferFeeConfigAuthority: (feeConfig.transferFeeAuthority
            ? new PublicKey(feeConfig.transferFeeAuthority)
            : payer.publicKey
          ).toBase58() as Address,
          withdrawWithheldAuthority: (feeConfig.withdrawWithheldAuthority
            ? new PublicKey(feeConfig.withdrawWithheldAuthority)
            : payer.publicKey
          ).toBase58() as Address,
          transferFeeBasisPoints: feeConfig.feeBasisPoints,
          maximumFee: feeConfig.maxFee,
        })
      );
    }

    // 4. Initialize Mint
    instructions.push(
      getInitializeMintInstruction({
        mint: mint.toBase58() as Address,
        decimals: config.decimals,
        mintAuthority: mintAuthority.toBase58() as Address,
        freezeAuthority: freezeAuthority.toBase58() as Address,
      })
    );

    // 5. Initialize Token Metadata (AFTER initialize mint)
    if (config.enableMetadata && config.metadata) {
      instructions.push(
        getInitializeTokenMetadataInstruction({
          metadata: mint.toBase58() as Address,
          updateAuthority: (config.updateAuthority
            ? new PublicKey(config.updateAuthority)
            : payer.publicKey
          ).toBase58() as Address,
          mint: mint.toBase58() as Address,
          mintAuthority: { address: mintAuthority.toBase58() as Address } as any,
          name: config.metadata.name,
          symbol: config.metadata.symbol,
          uri: config.metadata.uri,
        })
      );

      // 6. Add additional metadata fields (AFTER initialize token metadata)
      if (config.metadata.additionalMetadata) {
        for (const [key, value] of config.metadata.additionalMetadata.entries()) {
          instructions.push(
            getUpdateTokenMetadataFieldInstruction({
              metadata: mint.toBase58() as Address,
              updateAuthority: { address: payer.publicKey.toBase58() as Address } as any,
              field: tokenMetadataField('Key', [key]),
              value: value,
            })
          );
        }
      }
    }

    return instructions;
  }

  // ===========================
  // Database Integration
  // ===========================

  /**
   * Save deployment to database
   */
  private async saveDeploymentToDatabase(params: {
    projectId: string;
    userId: string;
    network: string;
    contractAddress: string;
    transactionHash: string;
    config: Token2022Config;
    extensions: string[];
    deploymentData: any;
  }): Promise<string> {
    // First, create the token record
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
          uri: params.config.uri,
          decimals: params.config.decimals,
          extensions: params.extensions
        }
      })
      .select()
      .single();

    if (tokenError) {
      throw new Error(`Failed to create token record: ${tokenError.message}`);
    }

    // Then, create the deployment record
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
        solana_extensions: params.extensions as any[]
      })
      .select()
      .single();

    if (deploymentError) {
      throw new Error(`Failed to create deployment record: ${deploymentError.message}`);
    }

    return tokenData.id;
  }

  /**
   * Build deployment data for database storage
   */
  private buildDeploymentData(
    config: Token2022Config,
    authorityPubKey: PublicKey,
    mint: PublicKey
  ): any {
    return {
      solana_specific: {
        mint_authority: (config.mintAuthority 
          ? new PublicKey(config.mintAuthority)
          : authorityPubKey
        ).toBase58(),
        freeze_authority: (config.freezeAuthority
          ? new PublicKey(config.freezeAuthority)
          : authorityPubKey
        ).toBase58(),
        update_authority: (config.updateAuthority
          ? new PublicKey(config.updateAuthority)
          : authorityPubKey
        ).toBase58(),
        metadata_uri: config.uri,
        decimals: config.decimals,
        initial_supply: config.initialSupply,
        extensions: this.getExtensionDetails(config)
      }
    };
  }

  /**
   * Get extension details for storage
   */
  private getExtensionDetails(config: Token2022Config): any[] {
    const details: any[] = [];

    if (config.enableMetadata && config.metadata) {
      details.push({
        type: 'Metadata',
        data: {
          name: config.metadata.name,
          symbol: config.metadata.symbol,
          uri: config.metadata.uri,
          additionalMetadata: config.metadata.additionalMetadata 
            ? Object.fromEntries(config.metadata.additionalMetadata)
            : {}
        }
      });
    }

    if (config.enableTransferFee && config.transferFee) {
      details.push({
        type: 'TransferFee',
        data: {
          feeBasisPoints: config.transferFee.feeBasisPoints,
          maxFee: config.transferFee.maxFee.toString(),
          transferFeeAuthority: config.transferFee.transferFeeAuthority,
          withdrawWithheldAuthority: config.transferFee.withdrawWithheldAuthority
        }
      });
    }

    if (config.enableMintCloseAuthority) {
      details.push({
        type: 'MintCloseAuthority',
        data: {}
      });
    }

    if (config.enableDefaultAccountState) {
      details.push({
        type: 'DefaultAccountState',
        data: {
          state: config.enableDefaultAccountState
        }
      });
    }

    return details;
  }

  // ===========================
  // Utility Methods
  // ===========================

  /**
   * Get list of enabled extensions
   */
  private getEnabledExtensions(config: Token2022Config): string[] {
    const extensions: string[] = [];

    if (config.enableMetadata) {
      extensions.push('MetadataPointer', 'TokenMetadata');
    }
    if (config.enableTransferFee) {
      extensions.push('TransferFeeConfig');
    }
    if (config.enableMintCloseAuthority) {
      extensions.push('MintCloseAuthority');
    }
    if (config.enableDefaultAccountState) {
      extensions.push('DefaultAccountState');
    }

    return extensions;
  }

  /**
   * Get deployment warnings based on config
   */
  private getDeploymentWarnings(config: Token2022Config): string[] {
    const warnings: string[] = [];

    if (config.enableTransferFee && config.transferFee) {
      if (config.transferFee.feeBasisPoints > 1000) {
        warnings.push(`Transfer fee of ${config.transferFee.feeBasisPoints / 100}% is quite high`);
      }
    }

    if (config.enableDefaultAccountState === 'frozen') {
      warnings.push('Default account state is frozen - new token accounts will require unfreezing');
    }

    if (!config.enableMetadata) {
      warnings.push('No on-chain metadata - token may not display properly in wallets');
    }

    return warnings;
  }

  /**
   * Convert private key to Keypair
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
   * Get default RPC URL
   */
  private getDefaultRpcUrl(network: 'mainnet-beta' | 'devnet' | 'testnet'): string {
    const rpcUrls = {
      'mainnet-beta': process.env.VITE_SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'devnet': process.env.VITE_SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
      'testnet': process.env.VITE_SOLANA_TESTNET_RPC_URL || 'https://api.testnet.solana.com'
    };

    return rpcUrls[network];
  }

  // ===========================
  // Validation
  // ===========================

  /**
   * Validate Token-2022 configuration
   */
  validateConfig(config: Token2022Config): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Token name is required');
    }

    if (!config.symbol || config.symbol.trim().length === 0) {
      errors.push('Token symbol is required');
    }

    if (config.symbol && config.symbol.length > 10) {
      errors.push('Token symbol must be 10 characters or less');
    }

    if (!config.uri || config.uri.trim().length === 0) {
      errors.push('Metadata URI is required');
    }

    if (config.decimals < 0 || config.decimals > 18) {
      errors.push('Decimals must be between 0 and 18');
    }

    if (config.initialSupply < 0) {
      errors.push('Initial supply cannot be negative');
    }

    // Extension-specific validation
    if (config.enableMetadata && !config.metadata) {
      errors.push('Metadata config required when metadata extension is enabled');
    }

    if (config.enableTransferFee && !config.transferFee) {
      errors.push('Transfer fee config required when transfer fee extension is enabled');
    }

    if (config.enableTransferFee && config.transferFee) {
      if (config.transferFee.feeBasisPoints < 0 || config.transferFee.feeBasisPoints > 10000) {
        errors.push('Transfer fee basis points must be between 0 and 10000 (0-100%)');
      }

      if (config.transferFee.maxFee <= BigInt(0)) {
        errors.push('Maximum transfer fee must be greater than 0');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate extension compatibility
   */
  validateExtensionCompatibility(extensions: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for required dependencies
    if (extensions.includes('TokenMetadata') && !extensions.includes('MetadataPointer')) {
      errors.push('TokenMetadata requires MetadataPointer extension');
    }

    // Check for incompatible combinations
    // (None currently, but framework for future)

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const token2022DeploymentService = new Token2022DeploymentService();
