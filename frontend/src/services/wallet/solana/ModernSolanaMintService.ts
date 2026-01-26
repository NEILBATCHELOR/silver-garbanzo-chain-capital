/**
 * Modern Solana Mint Service
 * 
 * Handles BOTH mint account creation AND minting tokens using modern @solana/kit
 * Following official Solana documentation: https://solana.com/docs/tokens/basics/create-mint
 * 
 * Use this when you need to:
 * - Create a mint without minting tokens (createMint)
 * - Create a mint for later use by protocols
 * - Separate mint creation from token deployment
 * - Mint additional tokens post-deployment (mintTokens)
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
  getInitializeMintInstruction,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getMintToCheckedInstruction,
  fetchMint
} from '@solana-program/token';

import {
  TOKEN_2022_PROGRAM_ADDRESS,
  getMintSize as getToken2022MintSize,
  findAssociatedTokenPda as findToken2022AssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction as getToken2022CreateAssociatedTokenIdempotentInstruction,
  getMintToCheckedInstruction as getToken2022MintToCheckedInstruction,
  fetchMint as fetchToken2022Mint
} from '@solana-program/token-2022';

import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { logActivity } from '@/infrastructure/activityLogger';
import { address } from '@solana/kit';
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
// POST-DEPLOYMENT MINTING INTERFACES
// ============================================================================

export interface MintTokensConfig {
  mintAddress: string; // The mint to mint from
  destinationAddress: string; // Recipient wallet address (NOT token account)
  amount: bigint; // Amount in smallest units (e.g., 1000000000 for 1 token with 9 decimals)
  decimals: number; // Token decimals (for MintToChecked safety)
}

export interface MintTokensOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  mintAuthorityPrivateKey: string; // Private key of mint authority
  createATAIfNeeded?: boolean; // Auto-create destination ATA (default: true)
}

export interface MintTokensResult {
  success: boolean;
  signature?: string;
  destinationATA?: Address; // The actual token account that received tokens
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
  // POST-DEPLOYMENT MINTING
  // ============================================================================

  /**
   * Detect which token program a mint uses by checking the account owner
   * Returns TOKEN_2022_PROGRAM_ADDRESS or TOKEN_PROGRAM_ADDRESS
   * 
   * This is the ONLY reliable way to detect the program - check the owner field
   */
  private async detectTokenProgram(
    mintAddress: string,
    rpcUrl: string
  ): Promise<Address> {
    try {
      const rpc = createSolanaRpc(rpcUrl);
      
      // Get the mint account info to check its owner
      const accountInfo = await rpc.getAccountInfo(address(mintAddress), { encoding: 'base64' }).send();
      
      if (!accountInfo.value) {
        throw new Error(`Mint account ${mintAddress} not found`);
      }
      
      const owner = accountInfo.value.owner;
      
      // Check if owner matches Token-2022 program
      if (owner === TOKEN_2022_PROGRAM_ADDRESS) {
        console.log('🎯 Detected Token-2022 mint (owner check):', mintAddress);
        return TOKEN_2022_PROGRAM_ADDRESS;
      }
      
      // Check if owner matches SPL Token program
      if (owner === TOKEN_PROGRAM_ADDRESS) {
        console.log('🎯 Detected SPL Token mint (owner check):', mintAddress);
        return TOKEN_PROGRAM_ADDRESS;
      }
      
      // Unknown token program
      throw new Error(`Mint ${mintAddress} has unknown owner: ${owner}`);
      
    } catch (error) {
      console.error('Error detecting token program:', error);
      throw error;
    }
  }

  /**
   * Mint additional tokens to a destination address (Scenario A: Mint to yourself or others)
   * 
   * This follows the same pattern as your successful transaction:
   * https://explorer.solana.com/tx/5gDbavAsN1QPuu6ZTv5v4TVQPQFi8sYHCRnQzmWreTMKTYEwmxFwA8BeJbywSmu6xXTuv8rXKVV3zyTpfsHEJnb4?cluster=devnet
   * 
   * Instructions executed:
   * 1. Create Associated Token Account (if needed)
   * 2. Mint tokens to that ATA
   */
  async mintTokens(
    config: MintTokensConfig,
    options: MintTokensOptions
  ): Promise<MintTokensResult> {
    try {
      // Step 1: Setup RPC
      const rpcUrl = this.getRpcUrl(options.network, options.rpcUrl);
      const wsUrl = this.getWebSocketUrl(options.network);
      
      // Validate URLs before creating connections
      if (!rpcUrl) {
        throw new Error(`Invalid network: ${options.network}. Expected 'devnet', 'testnet', or 'mainnet-beta'`);
      }
      if (!wsUrl) {
        throw new Error(`Could not determine WebSocket URL for network: ${options.network}`);
      }

      // Step 1.5: Detect which token program the mint uses (SPL vs Token-2022)
      const tokenProgramAddress = await this.detectTokenProgram(config.mintAddress, rpcUrl);
      const isToken2022 = tokenProgramAddress === TOKEN_2022_PROGRAM_ADDRESS;

      console.log('🔧 Token Program Detection:', {
        mint: config.mintAddress,
        program: isToken2022 ? 'Token-2022' : 'SPL Token',
        programAddress: tokenProgramAddress,
        TOKEN_PROGRAM_ADDRESS,
        TOKEN_2022_PROGRAM_ADDRESS,
        matches_SPL: tokenProgramAddress === TOKEN_PROGRAM_ADDRESS,
        matches_2022: tokenProgramAddress === TOKEN_2022_PROGRAM_ADDRESS
      });
      
      const rpc = createSolanaRpc(rpcUrl);
      const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

      // Step 2: Create mint authority signer
      const mintAuthority = await this.createSignerFromPrivateKey(options.mintAuthorityPrivateKey);

      await logActivity({
        action: 'solana_mint_tokens_started',
        entity_type: 'token',
        entity_id: config.mintAddress,
        details: {
          destinationAddress: config.destinationAddress,
          amount: config.amount.toString(),
          network: options.network,
          tokenProgram: isToken2022 ? 'Token-2022' : 'SPL Token'
        }
      });

      // Step 3: Derive destination Associated Token Account (ATA) using correct program
      const [destinationATA] = isToken2022
        ? await findToken2022AssociatedTokenPda({
            owner: address(config.destinationAddress),
            mint: address(config.mintAddress),
            tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
          })
        : await findAssociatedTokenPda({
            owner: address(config.destinationAddress),
            mint: address(config.mintAddress),
            tokenProgram: TOKEN_PROGRAM_ADDRESS
          });
      
      console.log('🎯 Mint Details:', {
        mintAddress: config.mintAddress,
        destinationWallet: config.destinationAddress,
        derivedATA: destinationATA,
        amount: config.amount.toString(),
        network: options.network,
        tokenProgram: isToken2022 ? 'Token-2022' : 'SPL Token'
      });

      // Step 4: Get latest blockhash
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      // Step 5: Build instructions using correct program
      const instructions = [];

      // Create ATA if it doesn't exist (idempotent - safe to always call)
      if (options.createATAIfNeeded !== false) {
        const createATAInstruction = isToken2022
          ? getToken2022CreateAssociatedTokenIdempotentInstruction({
              payer: mintAuthority,
              ata: destinationATA,
              owner: address(config.destinationAddress),
              mint: address(config.mintAddress),
              tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
            })
          : getCreateAssociatedTokenIdempotentInstruction({
              payer: mintAuthority,
              ata: destinationATA,
              owner: address(config.destinationAddress),
              mint: address(config.mintAddress),
              tokenProgram: TOKEN_PROGRAM_ADDRESS
            });
        
        console.log('📝 ATA Instruction:', {
          programAddress: createATAInstruction.programAddress,
          accounts: createATAInstruction.accounts.length
        });
        
        instructions.push(createATAInstruction);
      }

      // Mint tokens to the ATA using correct instruction
      // Note: Program address is embedded in the function from the respective package
      const mintToInstruction = isToken2022
        ? getToken2022MintToCheckedInstruction({
            mint: address(config.mintAddress),
            token: destinationATA,
            mintAuthority: mintAuthority,
            amount: config.amount,
            decimals: config.decimals
          })
        : getMintToCheckedInstruction({
            mint: address(config.mintAddress),
            token: destinationATA,
            mintAuthority: mintAuthority,
            amount: config.amount,
            decimals: config.decimals
          });

      console.log('📝 Mint Instruction:', {
        programAddress: mintToInstruction.programAddress,
        accounts: mintToInstruction.accounts.length,
        amount: config.amount.toString(),
        decimals: config.decimals
      });

      instructions.push(mintToInstruction);

      // Step 6: Create, sign, and send transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(mintAuthority, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions(instructions, tx)
      );

      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
      
      assertIsSendableTransaction(signedTransaction);
      assertIsTransactionWithBlockhashLifetime(signedTransaction);

      await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(
        signedTransaction,
        { commitment: 'confirmed' }
      );

      const signature = getSignatureFromTransaction(signedTransaction);
      const explorerUrl = this.getExplorerUrl(signature, options.network);

      await logActivity({
        action: 'solana_mint_tokens_completed',
        entity_type: 'token',
        entity_id: config.mintAddress,
        details: {
          signature,
          destinationAddress: config.destinationAddress,
          destinationATA: destinationATA,
          amount: config.amount.toString(),
          network: options.network
        }
      });

      return {
        success: true,
        signature,
        destinationATA,
        explorerUrl
      };

    } catch (error) {
      console.error('Mint tokens error:', error);
      
      await logActivity({
        action: 'solana_mint_tokens_failed',
        entity_type: 'token',
        entity_id: config.mintAddress,
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

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get the Associated Token Account (ATA) for a wallet and mint
   * This is what you need to know to see YOUR token balance!
   * Automatically detects if the mint is SPL Token or Token-2022
   * 
   * @param walletAddress - Your wallet address (e.g., 5YZb2nQ4BsQauH5wz92sSjciGs67o6GuuF3H1cLAZ2PA)
   * @param mintAddress - The token mint address (e.g., FtxA8oiouv1VjpD1iASWudvxyMXtCE3NtRSYFEjMscU5)
   * @param network - The network to check on ('devnet', 'testnet', 'mainnet-beta')
   * @returns The ATA address (e.g., BZgArohf8EsGyU9mnmXV4GbWL7RH7uFXEaczCQqxrhxE)
   */
  async getTokenAccountAddress(
    walletAddress: string,
    mintAddress: string,
    network: SolanaNetwork = 'devnet'
  ): Promise<Address> {
    // Detect which token program the mint uses
    const rpcUrl = this.getRpcUrl(network);
    const tokenProgramAddress = await this.detectTokenProgram(mintAddress, rpcUrl);
    const isToken2022 = tokenProgramAddress === TOKEN_2022_PROGRAM_ADDRESS;

    // Use the appropriate function for the detected program
    const [ataAddress] = isToken2022
      ? await findToken2022AssociatedTokenPda({
          owner: address(walletAddress),
          mint: address(mintAddress),
          tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
        })
      : await findAssociatedTokenPda({
          owner: address(walletAddress),
          mint: address(mintAddress),
          tokenProgram: TOKEN_PROGRAM_ADDRESS
        });
    
    return ataAddress;
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
    // Normalize network (remove 'solana-' prefix if present)
    const normalizedNetwork = network.replace('solana-', '') as SolanaNetwork;
    const cluster = normalizedNetwork === 'mainnet-beta' ? '' : `?cluster=${normalizedNetwork}`;
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
