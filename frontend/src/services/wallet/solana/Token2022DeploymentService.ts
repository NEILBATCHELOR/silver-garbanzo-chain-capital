/**
 * Solana Token-2022 Deployment Service - FULLY MODERN
 * 
 * MIGRATION STATUS: ✅ FULLY MIGRATED to @solana/kit
 * - Uses ModernSolanaRpc instead of legacy Connection
 * - Uses KeyPairSigner instead of legacy Keypair
 * - Uses Address type instead of PublicKey
 * - Uses modern transaction pipeline
 * - All extension logic using @solana-program/token-2022
 * 
 * Handles deployment of Token-2022 tokens with extensions
 * Based on official Solana documentation and examples
 */

import {
  generateKeyPairSigner,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  address,
  type Address,
  type KeyPairSigner
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
  getInitializeNonTransferableMintInstruction,
  getInitializeInterestBearingMintInstruction,
  getInitializePermanentDelegateInstruction,
  getInitializeMintCloseAuthorityInstruction,
  AccountState
} from '@solana-program/token-2022';
import { getCreateAccountInstruction } from '@solana-program/system';
import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/activityLogger';
import { ModernSolanaRpc, createModernRpc } from '@/infrastructure/web3/solana/ModernSolanaRpc';
import { 
  createSignerFromPrivateKey,
  toAddress
} from '@/infrastructure/web3/solana/ModernSolanaUtils';
import type { ModernInstruction } from '@/infrastructure/web3/solana/ModernSolanaTypes';

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

export interface InterestBearingConfig {
  rate: number; // Interest rate in basis points (e.g., 500 = 5.00% APY)
  rateAuthority?: string;
  initializationTimestamp?: bigint; // Unix timestamp when interest started accruing
  lastUpdateTimestamp?: bigint; // Last time the rate was updated
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
  permanentDelegate?: string | null; // Authority with unlimited delegate privileges
  
  // Extensions
  enableMetadata?: boolean;
  enableTransferFee?: boolean;
  enableMintCloseAuthority?: boolean;
  enableDefaultAccountState?: 'initialized' | 'frozen';
  enableNonTransferable?: boolean;
  enableInterestBearing?: boolean;
  enablePermanentDelegate?: boolean;
  enableCpiGuard?: boolean;
  
  // Extension configs
  metadata?: MetadataConfig;
  transferFee?: TransferFeeConfig;
  interestBearing?: InterestBearingConfig;
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
   * Deploy Token-2022 with extensions - FULLY MODERN
   * 
   * @param existingDatabaseTokenId - Optional existing database token UUID to update (instead of creating new)
   */
  async deployToken2022(
    config: Token2022Config,
    options: Token2022DeploymentOptions,
    existingDatabaseTokenId?: string  // RENAMED to be crystal clear this is the DATABASE UUID
  ): Promise<Token2022DeploymentResult> {
    const startTime = Date.now();
    
    // DEBUG: Log what existingDatabaseTokenId we received
    console.log('[Token2022] deployToken2022 called with existingDatabaseTokenId:', existingDatabaseTokenId);
    console.log('[Token2022] existingDatabaseTokenId type:', typeof existingDatabaseTokenId);
    console.log('[Token2022] existingDatabaseTokenId length:', existingDatabaseTokenId?.length);
    
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

      // Step 2: Setup RPC and signer (MODERN)
      const rpc = options.rpcUrl 
        ? new ModernSolanaRpc({ endpoint: options.rpcUrl })
        : createModernRpc(options.network);
      
      const payer = await createSignerFromPrivateKey(options.walletPrivateKey);

      // Step 3: Generate mint signer (MODERN)
      const mintSigner = await generateKeyPairSigner();
      const mintAddress = mintSigner.address;

      // Step 4: Build extensions
      const extensions = this.buildExtensions(config, payer.address, mintAddress);
      
      // Step 5: Calculate space and rent
      const { spaceWithoutMetadata, spaceWithMetadata } = this.calculateSpace(extensions);
      const lamports = await rpc.getRpc().getMinimumBalanceForRentExemption(spaceWithMetadata).send();

      // Step 6: Build instructions
      const instructions = await this.buildInstructions(
        config,
        payer,
        mintSigner,
        extensions,
        lamports,
        spaceWithoutMetadata
      );

      // Step 7: Create and send transaction (MODERN)
      const { value: latestBlockhash } = await rpc.getRpc().getLatestBlockhash().send();

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(payer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      );

      // Sign with all signers
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

      // Get signature for tracking
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
      // DEBUG: Log what we're about to pass
      console.log('[Token2022] About to save to database');
      console.log('[Token2022] solana mintAddress:', mintAddress);
      console.log('[Token2022] database existingDatabaseTokenId:', existingDatabaseTokenId);
      console.log('[Token2022] Passing existingTokenId:', existingDatabaseTokenId);
      
      // CRITICAL: existingDatabaseTokenId is the DATABASE UUID, mintAddress is the SOLANA address
      const savedDatabaseTokenId = await this.saveDeploymentToDatabase({
        projectId: options.projectId,
        userId: options.userId,
        deployerWalletAddress: payer.address, // Deployer wallet for reference only
        network: `solana-${options.network}`,
        contractAddress: mintAddress,  // This is the SOLANA MINT ADDRESS
        transactionHash: signature,
        config,
        extensions: this.getEnabledExtensions(config),
        deploymentData: this.buildDeploymentData(config, payer.address, mintAddress),
        existingTokenId: existingDatabaseTokenId // This is the DATABASE UUID
      });

      const deploymentTimeMs = Date.now() - startTime;

      await logActivity({
        action: 'token2022_deployment_completed',
        entity_type: 'token',
        entity_id: savedDatabaseTokenId,
        details: {
          tokenAddress: mintAddress,
          transactionHash: signature,
          extensions: this.getEnabledExtensions(config),
          deploymentTimeMs
        }
      });

      return {
        success: true,
        tokenAddress: mintAddress,
        mint: mintAddress,
        transactionHash: signature,
        deploymentStrategy: 'Token2022',
        networkUsed: `solana-${options.network}`,
        extensions: this.getEnabledExtensions(config),
        deploymentTimeMs,
        tokenId: savedDatabaseTokenId,  // Return the DATABASE UUID, not the mint address
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
   * Build all enabled extensions - Using modern Address types
   */
  private buildExtensions(
    config: Token2022Config,
    authorityAddress: Address,
    mintAddress: Address
  ): any[] {
    const extensions: any[] = [];

    // Metadata Pointer (required if metadata enabled)
    if (config.enableMetadata) {
      extensions.push(
        extension('MetadataPointer', {
          authority: authorityAddress,
          metadataAddress: mintAddress,
        })
      );
    }

    // Token Metadata
    if (config.enableMetadata && config.metadata) {
      const updateAuthority = config.updateAuthority 
        ? toAddress(config.updateAuthority)
        : authorityAddress;
        
      extensions.push(
        extension('TokenMetadata', {
          updateAuthority,
          mint: mintAddress,
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
      const transferFeeAuthority = feeConfig.transferFeeAuthority
        ? toAddress(feeConfig.transferFeeAuthority)
        : authorityAddress;
      const withdrawAuthority = feeConfig.withdrawWithheldAuthority
        ? toAddress(feeConfig.withdrawWithheldAuthority)
        : authorityAddress;
        
      extensions.push(
        extension('TransferFeeConfig', {
          transferFeeConfigAuthority: transferFeeAuthority,
          withdrawWithheldAuthority: withdrawAuthority,
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
          closeAuthority: authorityAddress,
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

    // Non-Transferable
    if (config.enableNonTransferable) {
      extensions.push(
        extension('NonTransferable', {})
      );
    }

    // Interest-Bearing
    if (config.enableInterestBearing && config.interestBearing) {
      const rateAuthority = config.interestBearing.rateAuthority
        ? toAddress(config.interestBearing.rateAuthority)
        : authorityAddress;
      
      const currentTimestamp = BigInt(Math.floor(new Date().getTime() / 1000));
      
      extensions.push(
        extension('InterestBearingConfig', {
          rateAuthority,
          initializationTimestamp: currentTimestamp,
          lastUpdateTimestamp: currentTimestamp,
          preUpdateAverageRate: config.interestBearing.rate,
          currentRate: config.interestBearing.rate,
        })
      );
    }

    // Permanent Delegate
    if (config.enablePermanentDelegate) {
      const delegate = config.permanentDelegate
        ? toAddress(config.permanentDelegate)
        : authorityAddress;
        
      extensions.push(
        extension('PermanentDelegate', {
          delegate,
        })
      );
    }

    // NOTE: CPI Guard is NOT a mint extension - it's a token account extension
    // CPI Guard must be enabled separately on individual token accounts after creation
    // See ModernSolanaCpiGuardService.ts for token account CPI Guard operations

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
   * Build all instructions in correct order - MODERN
   */
  private async buildInstructions(
    config: Token2022Config,
    payer: KeyPairSigner,
    mintSigner: KeyPairSigner,
    extensions: any[],
    lamports: bigint,
    space: bigint
  ): Promise<any[]> {
    const instructions: any[] = [];
    const mintAddress = mintSigner.address;

    // Parse authorities (MODERN - using Address type)
    const mintAuthority = config.mintAuthority 
      ? toAddress(config.mintAuthority)
      : payer.address;
    const freezeAuthority = config.freezeAuthority
      ? toAddress(config.freezeAuthority)
      : payer.address;

    // 1. Create Account
    instructions.push(
      getCreateAccountInstruction({
        payer,
        newAccount: mintSigner,
        lamports,
        space,
        programAddress: TOKEN_2022_PROGRAM_ADDRESS,
      })
    );

    // 2. Initialize Metadata Pointer (BEFORE initialize mint)
    if (config.enableMetadata) {
      instructions.push(
        getInitializeMetadataPointerInstruction({
          mint: mintAddress,
          authority: payer.address,
          metadataAddress: mintAddress,
        })
      );
    }

    // 3. Initialize Transfer Fee (BEFORE initialize mint)
    if (config.enableTransferFee && config.transferFee) {
      const feeConfig = config.transferFee;
      const transferFeeAuthority = feeConfig.transferFeeAuthority
        ? toAddress(feeConfig.transferFeeAuthority)
        : payer.address;
      const withdrawAuthority = feeConfig.withdrawWithheldAuthority
        ? toAddress(feeConfig.withdrawWithheldAuthority)
        : payer.address;
        
      instructions.push(
        getInitializeTransferFeeConfigInstruction({
          mint: mintAddress,
          transferFeeConfigAuthority: transferFeeAuthority,
          withdrawWithheldAuthority: withdrawAuthority,
          transferFeeBasisPoints: feeConfig.feeBasisPoints,
          maximumFee: feeConfig.maxFee,
        })
      );
    }

    // 4. Initialize Non-Transferable (BEFORE initialize mint)
    if (config.enableNonTransferable) {
      instructions.push(
        getInitializeNonTransferableMintInstruction({
          mint: mintAddress,
        })
      );
    }

    // 5. Initialize Interest-Bearing (BEFORE initialize mint)
    if (config.enableInterestBearing && config.interestBearing) {
      const rateAuthority = config.interestBearing.rateAuthority
        ? toAddress(config.interestBearing.rateAuthority)
        : payer.address;
      
      instructions.push(
        getInitializeInterestBearingMintInstruction({
          mint: mintAddress,
          rateAuthority,
          rate: config.interestBearing.rate,
        })
      );
    }

    // 5a. Initialize Permanent Delegate (BEFORE initialize mint)
    if (config.enablePermanentDelegate) {
      const delegate = config.permanentDelegate
        ? toAddress(config.permanentDelegate)
        : payer.address;
        
      instructions.push(
        getInitializePermanentDelegateInstruction({
          mint: mintAddress,
          delegate,
        })
      );
    }

    // 5b. Initialize Mint Close Authority (BEFORE initialize mint)
    if (config.enableMintCloseAuthority) {
      instructions.push(
        getInitializeMintCloseAuthorityInstruction({
          mint: mintAddress,
          closeAuthority: payer.address,
        })
      );
    }

    // 6. Initialize Mint
    instructions.push(
      getInitializeMintInstruction({
        mint: mintAddress,
        decimals: config.decimals,
        mintAuthority,
        freezeAuthority,
      })
    );

    // 7. Initialize Token Metadata (AFTER initialize mint)
    if (config.enableMetadata && config.metadata) {
      const updateAuthority = config.updateAuthority
        ? toAddress(config.updateAuthority)
        : payer.address;
        
      instructions.push(
        getInitializeTokenMetadataInstruction({
          metadata: mintAddress,
          updateAuthority,
          mint: mintAddress,
          mintAuthority: payer,  // Use the payer signer directly
          name: config.metadata.name,
          symbol: config.metadata.symbol,
          uri: config.metadata.uri,
        })
      );

      // 8. Add additional metadata fields (AFTER initialize token metadata)
      if (config.metadata.additionalMetadata) {
        for (const [key, value] of config.metadata.additionalMetadata.entries()) {
          instructions.push(
            getUpdateTokenMetadataFieldInstruction({
              metadata: mintAddress,
              updateAuthority: payer,  // Use the payer signer directly
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
   * 
   * IMPORTANT: If existingTokenId is provided, UPDATE that record instead of creating new
   * For Solana: deployed_by should be the contract_address (mint), not the wallet
   */
  private async saveDeploymentToDatabase(params: {
    projectId: string;
    userId: string;
    deployerWalletAddress: Address; // Wallet that deployed (stored in details only)
    network: string;
    contractAddress: string;
    transactionHash: string;
    config: Token2022Config;
    extensions: string[];
    deploymentData: any;
    existingTokenId?: string; // NEW: Optional existing token ID to update
  }): Promise<string> {
    // DEBUG: Log what we received
    console.log('[Token2022] saveDeploymentToDatabase received:');
    console.log('[Token2022] contractAddress:', params.contractAddress);
    console.log('[Token2022] existingTokenId:', params.existingTokenId);
    console.log('[Token2022] existingTokenId type:', typeof params.existingTokenId);
    
    let finalTokenId: string;

    if (params.existingTokenId) {
      // VALIDATION: Ensure existingTokenId is a UUID, not a Solana address
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(params.existingTokenId)) {
        throw new Error(
          `Invalid existingTokenId format: expected UUID but got "${params.existingTokenId}". ` +
          `This looks like a Solana address. Check that you're passing the database token ID, not the mint address.`
        );
      }

      // UPDATE EXISTING TOKEN
      console.log('[Token2022] ABOUT TO UPDATE TOKENS TABLE');
      console.log('[Token2022] Using .eq("id", params.existingTokenId)');
      console.log('[Token2022] params.existingTokenId VALUE:', params.existingTokenId);
      console.log('[Token2022] params.existingTokenId TYPE:', typeof params.existingTokenId);
      console.log('[Token2022] params.contractAddress VALUE:', params.contractAddress);
      console.log('[Token2022] ARE THEY THE SAME?', params.existingTokenId === params.contractAddress);
      
      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .update({
          // deployed_by should be userId (UUID), NOT the mint address
          // The mint address goes in the 'address' field
          status: 'DEPLOYED',
          address: params.contractAddress,
          deployment_status: 'deployed',
          deployment_timestamp: new Date().toISOString(),
          deployment_transaction: params.transactionHash,
          deployment_environment: params.network.replace('solana-', ''),
          updated_at: new Date().toISOString()
        })
        .eq('id', params.existingTokenId)
        .select()
        .single();
      
      console.log('[Token2022] UPDATE COMPLETE');
      console.log('[Token2022] tokenError:', tokenError);
      console.log('[Token2022] tokenData:', tokenData);

      if (tokenError || !tokenData) {
        throw new Error(`Failed to update token record: ${tokenError?.message || 'Unknown error'}`);
      }

      finalTokenId = tokenData.id;
    } else {
      // CREATE NEW TOKEN (fallback for backward compatibility)
      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .insert({
          project_id: params.projectId,
          name: params.config.name,
          symbol: params.config.symbol,
          standard: 'Token2022',
          blockchain: params.network,
          address: params.contractAddress,
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

      finalTokenId = tokenData.id;
    }

    // Then, create the deployment record
    const { data: deploymentData, error: deploymentError } = await supabase
      .from('token_deployments')
      .insert({
        token_id: finalTokenId,
        network: params.network,
        contract_address: params.contractAddress,
        transaction_hash: params.transactionHash,
        deployed_by: params.contractAddress, // For Solana: use mint address, not wallet
        status: 'DEPLOYED',
        deployment_data: params.deploymentData,
        deployment_strategy: 'Token2022',
        details: {
          type: 'Token2022',
          name: params.config.name,
          symbol: params.config.symbol,
          decimals: params.config.decimals,
          extensions: params.extensions,
          user_id: params.userId, // Store userId in details for reference
          deployer_wallet: params.deployerWalletAddress // Store deployer wallet in details
        },
        solana_token_type: 'Token2022',
        solana_extensions: params.extensions as any[]
      })
      .select()
      .single();

    if (deploymentError) {
      throw new Error(`Failed to create deployment record: ${deploymentError.message}`);
    }

    return finalTokenId;
  }

  /**
   * Build deployment data for database storage - Using modern Address
   */
  private buildDeploymentData(
    config: Token2022Config,
    authorityAddress: Address,
    mintAddress: Address
  ): any {
    const mintAuthority = config.mintAuthority 
      ? toAddress(config.mintAuthority)
      : authorityAddress;
    const freezeAuthority = config.freezeAuthority
      ? toAddress(config.freezeAuthority)
      : authorityAddress;
    const updateAuthority = config.updateAuthority
      ? toAddress(config.updateAuthority)
      : authorityAddress;
      
    return {
      solana_specific: {
        mint_authority: mintAuthority,
        freeze_authority: freezeAuthority,
        update_authority: updateAuthority,
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

    if (config.enableInterestBearing && config.interestBearing) {
      details.push({
        type: 'InterestBearing',
        data: {
          rate: config.interestBearing.rate,
          rateAuthority: config.interestBearing.rateAuthority,
          initializationTimestamp: config.interestBearing.initializationTimestamp?.toString() || Date.now().toString(),
          lastUpdateTimestamp: config.interestBearing.lastUpdateTimestamp?.toString() || Date.now().toString()
        }
      });
    }

    if (config.enablePermanentDelegate) {
      details.push({
        type: 'PermanentDelegate',
        data: {
          delegate: config.permanentDelegate || 'Default Authority'
        }
      });
    }

    return details;
  }

  // ===========================
  // INTEGRATED DEPLOYMENT WITH METADATA
  // ===========================

  /**
   * Deploy Token-2022 with pre-saved metadata
   * 
   * This is the RECOMMENDED flow for production deployments:
   * 
   * Flow:
   * 1. TokenMetadataService.saveMetadata() → metadata_id
   * 2. THIS METHOD → Deploy and link
   * 3. Automatically links metadata to deployed token
   * 
   * @param config - Token configuration
   * @param options - Deployment options
   * @param metadataId - The token_metadata.id from TokenMetadataService.saveMetadata()
   * 
   * @example
   * ```typescript
   * // Step 1: Save metadata
   * const metadataResult = await TokenMetadataService.saveMetadata({
   *   name: 'My Token',
   *   symbol: 'MTK',
   *   asset_class: 'structured_product',
   *   instrument_type: 'autocallable',
   *   metadata_uri: 'https://...',
   *   metadata_json: { ... }
   * });
   * 
   * // Step 2: Deploy with metadata reference
   * const deployResult = await token2022DeploymentService.deployToken2022WithMetadata(
   *   config,
   *   options,
   *   metadataResult.data!.id
   * );
   * ```
   */
  async deployToken2022WithMetadata(
    config: Token2022Config,
    options: Token2022DeploymentOptions,
    metadataId: string
  ): Promise<Token2022DeploymentResult> {
    try {
      // Step 1: Validate metadata exists
      const { TokenMetadataService } = await import('../../tokens/metadata/TokenMetadataService');
      const metadataCheck = await TokenMetadataService.getMetadata(metadataId);
      
      if (!metadataCheck.success || !metadataCheck.data) {
        return {
          success: false,
          deploymentStrategy: 'Token2022',
          networkUsed: `solana-${options.network}`,
          errors: [`Metadata record not found: ${metadataId}`],
          warnings: []
        };
      }

      // Step 2: Deploy token (creates token record in tokens table)
      const deployResult = await this.deployToken2022(config, options);
      
      if (!deployResult.success || !deployResult.tokenId) {
        return deployResult;
      }

      // Step 3: Link metadata to deployed token
      const linkResult = await TokenMetadataService.linkToDeployedToken(
        metadataId,
        deployResult.tokenId
      );

      if (!linkResult.success) {
        console.warn('Warning: Token deployed but metadata link failed:', linkResult.error);
        // Don't fail the deployment, just add a warning
        return {
          ...deployResult,
          warnings: [
            ...(deployResult.warnings || []),
            `Token deployed successfully but metadata link failed: ${linkResult.error}`
          ]
        };
      }

      // Success! Return deployment result with metadata link confirmation
      return {
        ...deployResult,
        warnings: [
          ...(deployResult.warnings || []),
          'Metadata successfully linked to deployed token'
        ]
      };

    } catch (error) {
      return {
        success: false,
        deploymentStrategy: 'Token2022',
        networkUsed: `solana-${options.network}`,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: []
      };
    }
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
      // Database enum: 'Metadata' not 'TokenMetadata'
      extensions.push('MetadataPointer', 'Metadata');
    }
    if (config.enableTransferFee) {
      // Database enum: 'TransferFee' not 'TransferFeeConfig'
      extensions.push('TransferFee');
    }
    if (config.enableMintCloseAuthority) {
      extensions.push('MintCloseAuthority');
    }
    if (config.enableDefaultAccountState) {
      extensions.push('DefaultAccountState');
    }
    if (config.enableNonTransferable) {
      extensions.push('NonTransferable');
    }
    if (config.enableInterestBearing) {
      extensions.push('InterestBearing');
    }
    if (config.enablePermanentDelegate) {
      extensions.push('PermanentDelegate');
    }
    if (config.enableCpiGuard) {
      extensions.push('CpiGuard');
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

    if (config.enableNonTransferable && config.enableTransferFee) {
      warnings.push('Conflicting extensions: NonTransferable and TransferFee cannot be used together');
    }

    if (config.enableNonTransferable) {
      warnings.push('Tokens will be permanently non-transferable (soulbound) - ensure this is intended');
    }

    if (config.enableInterestBearing && config.decimals === 0) {
      warnings.push('Interest-bearing tokens with 0 decimals may have limited precision for interest calculations');
    }

    if (config.enablePermanentDelegate) {
      warnings.push('Permanent delegate has unlimited authority to transfer or burn tokens from any account - use with caution');
    }

    return warnings;
  }

  /**
   * Get default RPC URL from .env ONLY
   */
  private getDefaultRpcUrl(network: 'mainnet-beta' | 'devnet' | 'testnet'): string {
    const networkMap: Record<string, 'mainnet' | 'devnet' | 'testnet'> = {
      'mainnet-beta': 'mainnet',
      'devnet': 'devnet',
      'testnet': 'testnet'
    };
    
    const { getRpcUrl } = require('@/infrastructure/web3/rpc/rpc-config');
    return getRpcUrl('solana', networkMap[network]);
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
