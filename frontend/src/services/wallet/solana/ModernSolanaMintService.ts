/**
 * Modern Solana Mint Service
 * 
 * Handles ONLY mint account creation using modern @solana/kit
 * Following official Solana documentation: https://solana.com/docs/tokens/basics/create-mint
 * 
 * Use this when you need to:
 * - Create a mint without minting tokens
 * - Create a mint for later use by protocols
 * - Separate mint creation from token deployment
 * 
 * ARCHITECTURE: Modern @solana/kit + @solana-program/token
 */

import {
  createKeyPairSignerFromBytes,
  generateKeyPairSigner,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  assertIsSendableTransaction,
  assertIsTransactionWithBlockhashLifetime,
  type Address,
  type KeyPairSigner
} from '@solana/kit';

import { getCreateAccountInstruction } from '@solana-program/system';
import {
  TOKEN_PROGRAM_ADDRESS,
  getMintSize,
  getInitializeMintInstruction
} from '@solana-program/token';

import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { logActivity } from '@/infrastructure/activityLogger';
import bs58 from 'bs58';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface MintCreationConfig {
  decimals: number; // Token decimals (0-9)
  mintAuthority?: Address | null; // null = no mint authority (fixed supply)
  freezeAuthority?: Address | null; // null = no freeze authority
}

export interface MintCreationOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  payerPrivateKey: string; // Base58 encoded private key
  generateMintKeypair?: boolean; // true = generate new, false = provide in config
  mintKeypair?: KeyPairSigner; // Provide specific mint keypair
}

export interface MintCreationResult {
  success: boolean;
  mintAddress?: Address;
  mintKeypair?: KeyPairSigner; // Return the mint keypair (useful for further operations)
  signature?: string;
  explorerUrl?: string;
  errors?: string[];
}

// ============================================================================
// MODERN SOLANA MINT SERVICE
// ============================================================================

export class ModernSolanaMintService {
  /**
   * Create a new SPL token mint account
   * Following official Solana documentation pattern
   */
  async createMint(
    config: MintCreationConfig,
    options: MintCreationOptions
  ): Promise<MintCreationResult> {
    try {
      // Step 1: Validate configuration
      const validation = this.validateMintConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Step 2: Get RPC URL for the network
      const rpcUrl = this.getRpcUrl(options.network, options.rpcUrl);
      const wsUrl = this.getWebSocketUrl(options.network);

      // Step 3: Create RPC connection and subscriptions (following official pattern)
      const rpc = createSolanaRpc(rpcUrl);
      const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

      // Step 4: Create signers
      const feePayer = await this.createSignerFromPrivateKey(options.payerPrivateKey);
      
      // Generate or use provided mint keypair
      const mint = options.mintKeypair || await generateKeyPairSigner();

      await logActivity({
        action: 'solana_mint_creation_started',
        entity_type: 'mint',
        entity_id: mint.address,
        details: {
          decimals: config.decimals,
          network: options.network
        }
      });

      // Step 5: Calculate space and rent
      // Get default mint account size (in bytes), no extensions enabled
      const space = BigInt(getMintSize());
      
      // Get minimum balance for rent exemption
      const rent = await rpc.getMinimumBalanceForRentExemption(space).send();

      // Step 6: Get latest blockhash to include in transaction
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      // Step 7: Build instructions (following official Solana docs order)
      // Instruction to create new account for mint (token program)
      // Invokes the system program
      const createAccountInstruction = getCreateAccountInstruction({
        payer: feePayer,
        newAccount: mint,
        lamports: rent,
        space,
        programAddress: TOKEN_PROGRAM_ADDRESS
      });

      // Instruction to initialize mint account data
      // Invokes the token program
      const initializeMintInstruction = getInitializeMintInstruction({
        mint: mint.address,
        decimals: config.decimals,
        mintAuthority: config.mintAuthority || feePayer.address,
        freezeAuthority: config.freezeAuthority === null 
          ? undefined 
          : (config.freezeAuthority || feePayer.address)
      });

      const instructions = [createAccountInstruction, initializeMintInstruction];

      // Step 8: Create transaction message (following official pattern)
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions(instructions, tx)
      );

      // Step 9: Sign transaction message with all required signers
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

      // Step 10: Assert transaction is sendable and has blockhash lifetime (required for type safety)
      assertIsSendableTransaction(signedTransaction);
      assertIsTransactionWithBlockhashLifetime(signedTransaction);

      // Step 11: Send and confirm transaction (using factory pattern from official docs)
      await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(
        signedTransaction,
        { commitment: 'confirmed' }
      );

      // Step 12: Get transaction signature
      const signature = getSignatureFromTransaction(signedTransaction);
      const explorerUrl = this.getExplorerUrl(signature, options.network);

      await logActivity({
        action: 'solana_mint_creation_completed',
        entity_type: 'mint',
        entity_id: mint.address,
        details: {
          mintAddress: mint.address,
          signature,
          network: options.network,
          decimals: config.decimals,
          mintAuthority: config.mintAuthority || feePayer.address,
          freezeAuthority: config.freezeAuthority
        }
      });

      return {
        success: true,
        mintAddress: mint.address,
        mintKeypair: mint, // Return for further operations
        signature,
        explorerUrl
      };

    } catch (error) {
      console.error('Mint creation error:', error);
      
      await logActivity({
        action: 'solana_mint_creation_failed',
        entity_type: 'mint',
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
   * Create a fixed-supply mint (no mint authority)
   */
  async createFixedSupplyMint(
    decimals: number,
    options: MintCreationOptions
  ): Promise<MintCreationResult> {
    return this.createMint(
      {
        decimals,
        mintAuthority: null, // No mint authority = fixed supply
        freezeAuthority: null
      },
      options
    );
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Create signer from private key (supports Base58 and hex)
   */
  private async createSignerFromPrivateKey(privateKey: string): Promise<KeyPairSigner> {
    try {
      let keyBytes: Uint8Array;

      if (privateKey.startsWith('0x')) {
        // Hex format
        const hex = privateKey.slice(2);
        keyBytes = new Uint8Array(
          hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
        );
      } else {
        // Base58 format
        keyBytes = bs58.decode(privateKey);
      }

      return await createKeyPairSignerFromBytes(keyBytes);

    } catch (error) {
      throw new Error('Invalid private key format. Expected Base58 or hex string.');
    }
  }

  /**
   * Validate mint configuration
   */
  private validateMintConfig(config: MintCreationConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate decimals
    if (config.decimals < 0 || config.decimals > 9) {
      errors.push('Decimals must be between 0 and 9');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get Solana Explorer URL for transaction
   */
  private getExplorerUrl(signature: string, network: SolanaNetwork): string {
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://explorer.solana.com/tx/${signature}${cluster}`;
  }

  /**
   * Get RPC URL for network
   */
  private getRpcUrl(network: SolanaNetwork, customUrl?: string): string {
    if (customUrl) return customUrl;

    const urls: Record<SolanaNetwork, string> = {
      'mainnet-beta': 'https://api.mainnet-beta.solana.com',
      'devnet': 'https://api.devnet.solana.com',
      'testnet': 'https://api.testnet.solana.com'
    };

    return urls[network];
  }

  /**
   * Get WebSocket URL for network
   */
  private getWebSocketUrl(network: SolanaNetwork): string {
    const urls: Record<SolanaNetwork, string> = {
      'mainnet-beta': 'wss://api.mainnet-beta.solana.com',
      'devnet': 'wss://api.devnet.solana.com',
      'testnet': 'wss://api.testnet.solana.com'
    };

    return urls[network];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const modernSolanaMintService = new ModernSolanaMintService();
