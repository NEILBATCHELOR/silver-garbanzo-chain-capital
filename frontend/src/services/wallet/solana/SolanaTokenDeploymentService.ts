/**
 * Solana Token Deployment Service
 * 
 * Handles deployment of SPL tokens using @solana/spl-token
 * Follows Chain Capital's established patterns for token deployment
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMintLen,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/activityLogger';
import bs58 from 'bs58';

export interface SolanaSPLTokenConfig {
  name: string;
  symbol: string;
  uri: string; // Metadata URI
  decimals: number;
  initialSupply: number;
  mintAuthority?: string | null; // null = deployer retains authority
  freezeAuthority?: string | null;
  updateAuthority?: string | null;
  isMutable?: boolean;
}

export interface SolanaTokenDeploymentOptions {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcUrl?: string;
  projectId: string;
  userId: string;
  walletPrivateKey: string; // Base58 encoded Solana private key
}

export interface SolanaTokenDeploymentResult {
  success: boolean;
  tokenAddress?: string;
  mint?: string;
  transactionHash?: string;
  deploymentStrategy: 'SPL';
  networkUsed: string;
  errors?: string[];
  warnings?: string[];
  deploymentTimeMs?: number;
  tokenId?: string; // DB record ID
}

export class SolanaTokenDeploymentService {
  /**
   * Deploy SPL token on Solana
   */
  async deploySPLToken(
    config: SolanaSPLTokenConfig,
    options: SolanaTokenDeploymentOptions
  ): Promise<SolanaTokenDeploymentResult> {
    const startTime = Date.now();
    
    try {
      await logActivity({
        action: 'solana_spl_deployment_started',
        entity_type: 'token',
        entity_id: null,
        details: {
          network: options.network,
          tokenName: config.name,
          symbol: config.symbol,
          decimals: config.decimals
        }
      });

      // Step 1: Setup connection and keypair
      const rpcUrl = options.rpcUrl || this.getDefaultRpcUrl(options.network);
      const connection = new Connection(rpcUrl, 'confirmed');
      const payer = this.getKeypairFromPrivateKey(options.walletPrivateKey);

      // Step 2: Generate mint keypair
      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey;

      // Step 3: Parse authorities (use payer if not specified)
      const mintAuthority = config.mintAuthority 
        ? new PublicKey(config.mintAuthority) 
        : payer.publicKey;
      const freezeAuthority = config.freezeAuthority 
        ? new PublicKey(config.freezeAuthority) 
        : payer.publicKey;

      // Step 4: Calculate rent and create mint account
      const mintLen = getMintLen([]);
      const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint,
          space: mintLen,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mint,
          config.decimals,
          mintAuthority,
          freezeAuthority,
          TOKEN_PROGRAM_ID
        )
      );

      // Step 5: If initial supply > 0, create ATA and mint tokens
      if (config.initialSupply > 0) {
        const associatedTokenAddress = await getAssociatedTokenAddress(
          mint,
          payer.publicKey
        );

        transaction.add(
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            associatedTokenAddress,
            payer.publicKey,
            mint
          ),
          createMintToInstruction(
            mint,
            associatedTokenAddress,
            mintAuthority,
            BigInt(config.initialSupply) * BigInt(10 ** config.decimals)
          )
        );
      }

      // Step 6: Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, mintKeypair],
        { commitment: 'confirmed' }
      );

      // Step 7: Store deployment in database
      const tokenId = await this.saveDeploymentToDatabase({
        projectId: options.projectId,
        userId: options.userId,
        network: `solana-${options.network}`,
        contractAddress: mint.toBase58(),
        transactionHash: signature,
        config: config,
        deploymentData: {
          solana_specific: {
            mint_authority: mintAuthority.toBase58(),
            freeze_authority: freezeAuthority.toBase58(),
            update_authority: config.updateAuthority || payer.publicKey.toBase58(),
            metadata_uri: config.uri,
            decimals: config.decimals,
            initial_supply: config.initialSupply
          }
        }
      });

      const deploymentTimeMs = Date.now() - startTime;

      await logActivity({
        action: 'solana_spl_deployment_completed',
        entity_type: 'token',
        entity_id: tokenId,
        details: {
          tokenAddress: mint.toBase58(),
          transactionHash: signature,
          deploymentTimeMs
        }
      });

      return {
        success: true,
        tokenAddress: mint.toBase58(),
        mint: mint.toBase58(),
        transactionHash: signature,
        deploymentStrategy: 'SPL',
        networkUsed: `solana-${options.network}`,
        deploymentTimeMs,
        tokenId,
        warnings: []
      };

    } catch (error) {
      const deploymentTimeMs = Date.now() - startTime;
      
      await logActivity({
        action: 'solana_spl_deployment_failed',
        entity_type: 'token',
        entity_id: null,
        details: {
          error: error instanceof Error ? error.message : String(error),
          deploymentTimeMs
        }
      });

      return {
        success: false,
        deploymentStrategy: 'SPL',
        networkUsed: `solana-${options.network}`,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        deploymentTimeMs
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
    config: SolanaSPLTokenConfig;
    deploymentData: any;
  }): Promise<string> {
    // First, create the token record
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .insert({
        project_id: params.projectId,
        name: params.config.name,
        symbol: params.config.symbol,
        standard: 'SPL',
        network: params.network,
        contract_address: params.contractAddress,
        total_supply: params.config.initialSupply.toString(),
        decimals: params.config.decimals,
        metadata: {
          uri: params.config.uri,
          decimals: params.config.decimals
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
        deployment_strategy: 'SPL',
        details: {
          type: 'SPL',
          name: params.config.name,
          symbol: params.config.symbol,
          decimals: params.config.decimals
        },
        solana_token_type: 'SPL'
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
      // Support both base58 and hex formats
      let secretKey: Uint8Array;
      
      if (privateKey.length === 128) {
        // Hex format (64 bytes = 128 hex chars)
        secretKey = new Uint8Array(Buffer.from(privateKey, 'hex'));
      } else {
        // Base58 format (Solana standard)
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
   * Validate SPL token configuration
   */
  validateConfig(config: SolanaSPLTokenConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

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

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const solanaTokenDeploymentService = new SolanaTokenDeploymentService();
