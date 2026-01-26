/**
 * Modern Solana Token Account Service
 * 
 * Handles token account creation using modern @solana/kit and @solana-program/token
 * Following official Solana documentation: https://solana.com/docs/tokens/basics/create-token-account
 * 
 * Supports:
 * - Regular token account creation (2 instructions)
 * - Associated Token Account (ATA) creation (1 instruction)
 * - Idempotent ATA creation (won't fail if exists)
 * - Account info queries
 * - Account validation
 * 
 * ARCHITECTURE: Modern @solana/kit + @solana-program/token
 * MIGRATION STATUS: ✅ MODERN
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
  getBase64EncodedWireTransaction,
  lamports,
  address,
  type Address,
  type KeyPairSigner,
  type Instruction
} from '@solana/kit';

import { getCreateAccountInstruction } from '@solana-program/system';
import {
  TOKEN_PROGRAM_ADDRESS,
  getTokenSize,
  getInitializeAccount2Instruction,
  getCreateAssociatedTokenInstructionAsync,
  getCreateAssociatedTokenIdempotentInstruction,
  findAssociatedTokenPda,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS
} from '@solana-program/token';

import {
  TOKEN_2022_PROGRAM_ADDRESS,
  extension,
  getInitializeImmutableOwnerInstruction,
} from '@solana-program/token-2022';

import { createModernRpc, createCustomRpc, type ModernSolanaRpc } from '@/infrastructure/web3/solana';
import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { handleSolanaError } from '@/infrastructure/web3/solana/ModernSolanaErrorHandler';
import { logActivity } from '@/infrastructure/activityLogger';
import bs58 from 'bs58';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Configuration for creating a regular token account
 */
export interface TokenAccountConfig {
  mint: Address; // Token mint address
  owner: Address; // Account owner who can transfer tokens
  generateAccountKeypair?: boolean; // true = generate new, false = provide keypair
  accountKeypair?: KeyPairSigner; // Provide specific account keypair
  enableImmutableOwner?: boolean; // Enable ImmutableOwner extension (Token-2022 only)
  useToken2022?: boolean; // Use Token-2022 program (required for extensions)
}

/**
 * Configuration for creating an Associated Token Account (ATA)
 */
export interface ATAConfig {
  mint: Address; // Token mint address
  owner: Address; // Account owner
  tokenProgram?: Address; // Default: TOKEN_PROGRAM_ADDRESS
}

/**
 * Options for token account creation
 */
export interface TokenAccountOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  payerPrivateKey: string; // Base58 encoded private key for fee payer
}

/**
 * Result from token account creation
 */
export interface TokenAccountResult {
  success: boolean;
  accountAddress?: Address;
  accountKeypair?: KeyPairSigner; // Returned for regular token accounts
  signature?: string;
  explorerUrl?: string;
  isAssociated?: boolean; // true if ATA, false if regular account
  accountExists?: boolean; // true if account already existed (for idempotent)
  errors?: string[];
}

/**
 * Token account info query result
 */
export interface TokenAccountInfo {
  exists: boolean;
  address: Address;
  mint?: Address;
  owner?: Address;
  amount?: bigint;
  delegate?: Address | null;
  delegatedAmount?: bigint;
  isNative?: boolean;
  rentEpoch?: bigint;
}
// ============================================================================
// MODERN SOLANA TOKEN ACCOUNT SERVICE
// ============================================================================

export class ModernSolanaTokenAccountService {
  /**
   * Create a regular token account (2 instructions method)
   * Following: https://solana.com/docs/tokens/basics/create-token-account#how-to-create-a-token-account
   * 
   * Use this when you need:
   * - Multiple token accounts for same wallet/mint
   * - Specific keypair for token account
   * - Custom token account addresses
   */
  async createTokenAccount(
    config: TokenAccountConfig,
    options: TokenAccountOptions
  ): Promise<TokenAccountResult> {
    try {
      // Step 1: Validate configuration
      const validation = this.validateTokenAccountConfig(config);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      // Step 2: Create RPC connection
      const rpc = options.rpcUrl 
        ? createCustomRpc(options.rpcUrl)
        : createModernRpc(options.network);

      // Step 3: Create signers
      const feePayer = await this.createSignerFromPrivateKey(options.payerPrivateKey);
      
      // Generate or use provided token account keypair
      const tokenAccount = config.accountKeypair || await generateKeyPairSigner();

      await logActivity({
        action: 'solana_token_account_creation_started',
        entity_type: 'token_account',
        entity_id: tokenAccount.address,
        details: {
          mint: config.mint,
          owner: config.owner,
          network: options.network,
          enableImmutableOwner: config.enableImmutableOwner || false,
          useToken2022: config.useToken2022 || false
        }
      });

      // Step 4: Determine token program and account size
      const tokenProgram = config.useToken2022 ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS;
      
      // Calculate space with extensions if needed
      let tokenAccountSpace: bigint;
      
      if (config.useToken2022 && config.enableImmutableOwner) {
        // ImmutableOwner extension for Token-2022
        const immutableOwnerExtension = extension('ImmutableOwner', {});
        const { getTokenSize: getToken2022Size } = await import('@solana-program/token-2022');
        tokenAccountSpace = BigInt(getToken2022Size([immutableOwnerExtension]));
      } else {
        tokenAccountSpace = BigInt(getTokenSize());
      }

      const tokenAccountRent = await rpc.getRpc()
        .getMinimumBalanceForRentExemption(tokenAccountSpace)
        .send();

      // Step 5: Build instructions
      const instructions: Instruction[] = [];
      
      // Instruction to create new account for token account (token program)
      // Invokes the system program
      const createTokenAccountInstruction = getCreateAccountInstruction({
        payer: feePayer,
        newAccount: tokenAccount,
        lamports: tokenAccountRent,
        space: tokenAccountSpace,
        programAddress: tokenProgram
      });
      instructions.push(createTokenAccountInstruction);

      // If ImmutableOwner extension is enabled, add initialization instruction BEFORE account initialization
      if (config.useToken2022 && config.enableImmutableOwner) {
        const initImmutableOwnerInstruction = getInitializeImmutableOwnerInstruction({
          account: tokenAccount.address
        });
        instructions.push(initImmutableOwnerInstruction);
      }

      // Instruction to initialize token account data
      // Invokes the token program
      const initializeTokenAccountInstruction = getInitializeAccount2Instruction({
        account: tokenAccount.address,
        mint: config.mint,
        owner: config.owner
      });
      instructions.push(initializeTokenAccountInstruction);

      // Step 6: Get latest blockhash
      const { value: latestBlockhash } = await rpc.getRpc().getLatestBlockhash().send();

      // Step 7: Create transaction message for token account creation
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions(instructions, tx)
      );

      // Step 8: Sign transaction with required signers (fee payer and token account keypair)
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

      // Step 9: Send and confirm transaction
      const signature = getSignatureFromTransaction(signedTransaction);
      const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);

      await rpc.sendRawTransaction(encodedTransaction, { skipPreflight: false });
      
      // Wait for confirmation
      const confirmed = await rpc.waitForConfirmation(signature, 'confirmed');
      
      if (!confirmed) {
        throw new Error('Token account creation transaction failed to confirm');
      }

      await logActivity({
        action: 'solana_token_account_created',
        entity_type: 'token_account',
        entity_id: tokenAccount.address,
        details: {
          signature,
          mint: config.mint,
          owner: config.owner,
          network: options.network,
          enableImmutableOwner: config.enableImmutableOwner || false,
          useToken2022: config.useToken2022 || false
        }
      });

      return {
        success: true,
        accountAddress: tokenAccount.address,
        accountKeypair: tokenAccount,
        signature,
        explorerUrl: this.getExplorerUrl(signature, options.network),
        isAssociated: false,
        accountExists: false
      };

    } catch (error) {
      const solanaError = handleSolanaError.generic(error);
      
      await logActivity({
        action: 'solana_token_account_creation_failed',
        entity_type: 'token_account',
        details: {
          error: solanaError.message,
          mint: config.mint,
          owner: config.owner,
          network: options.network
        }
      });

      return {
        success: false,
        errors: [solanaError.userMessage]
      };
    }
  }
  /**
   * Create an Associated Token Account (ATA)
   * Following: https://solana.com/docs/tokens/basics/create-token-account#how-to-create-an-associated-token-account
   * 
   * Use this for:
   * - Default token account for a wallet
   * - Deterministic account addresses
   * - Standard wallet-to-wallet transfers
   * 
   * Note: Fails if account already exists (use createATAIdempotent for safer creation)
   */
  async createAssociatedTokenAccount(
    config: ATAConfig,
    options: TokenAccountOptions
  ): Promise<TokenAccountResult> {
    try {
      // Step 1: Validate configuration
      const validation = this.validateATAConfig(config);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      // Step 2: Create RPC connection
      const rpc = options.rpcUrl 
        ? createCustomRpc(options.rpcUrl)
        : createModernRpc(options.network);

      // Step 3: Create signer
      const feePayer = await this.createSignerFromPrivateKey(options.payerPrivateKey);

      // Step 4: Derive the ATA address
      const tokenProgram = config.tokenProgram || TOKEN_PROGRAM_ADDRESS;
      const [associatedTokenAddress] = await findAssociatedTokenPda({
        mint: config.mint,
        owner: config.owner,
        tokenProgram
      });

      await logActivity({
        action: 'solana_ata_creation_started',
        entity_type: 'token_account',
        entity_id: associatedTokenAddress,
        details: {
          mint: config.mint,
          owner: config.owner,
          network: options.network
        }
      });

      // Step 5: Create instruction to create the associated token account
      const createAtaInstruction = await getCreateAssociatedTokenInstructionAsync({
        payer: feePayer,
        mint: config.mint,
        owner: config.owner,
        tokenProgram
      });

      // Step 6: Get latest blockhash for the transaction
      const { value: latestBlockhash } = await rpc.getRpc().getLatestBlockhash().send();

      // Step 7: Create transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([createAtaInstruction], tx)
      );

      // Step 8: Sign transaction with required signers
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

      // Step 9: Send and confirm transaction
      const signature = getSignatureFromTransaction(signedTransaction);
      const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);

      await rpc.sendRawTransaction(encodedTransaction, { skipPreflight: false });
      
      // Wait for confirmation
      const confirmed = await rpc.waitForConfirmation(signature, 'confirmed');
      
      if (!confirmed) {
        throw new Error('ATA creation transaction failed to confirm');
      }

      await logActivity({
        action: 'solana_ata_created',
        entity_type: 'token_account',
        entity_id: associatedTokenAddress,
        details: {
          signature,
          mint: config.mint,
          owner: config.owner,
          network: options.network
        }
      });

      return {
        success: true,
        accountAddress: associatedTokenAddress,
        signature,
        explorerUrl: this.getExplorerUrl(signature, options.network),
        isAssociated: true,
        accountExists: false
      };

    } catch (error) {
      const solanaError = handleSolanaError.generic(error);
      
      await logActivity({
        action: 'solana_ata_creation_failed',
        entity_type: 'token_account',
        details: {
          error: solanaError.message,
          mint: config.mint,
          owner: config.owner,
          network: options.network
        }
      });

      return {
        success: false,
        errors: [solanaError.userMessage]
      };
    }
  }
  /**
   * Create an Associated Token Account (ATA) - Idempotent Version
   * Won't fail if account already exists
   * 
   * RECOMMENDED for most use cases
   * 
   * Use this when:
   * - You're not sure if account exists
   * - You want safer account creation
   * - You're creating accounts in transfers
   */
  async createATAIdempotent(
    config: ATAConfig,
    options: TokenAccountOptions
  ): Promise<TokenAccountResult> {
    try {
      // Step 1: Validate configuration
      const validation = this.validateATAConfig(config);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      // Step 2: Create RPC connection
      const rpc = options.rpcUrl 
        ? createCustomRpc(options.rpcUrl)
        : createModernRpc(options.network);

      // Step 3: Create signer
      const feePayer = await this.createSignerFromPrivateKey(options.payerPrivateKey);

      // Step 4: Derive the ATA address
      const tokenProgram = config.tokenProgram || TOKEN_PROGRAM_ADDRESS;
      const [associatedTokenAddress] = await findAssociatedTokenPda({
        mint: config.mint,
        owner: config.owner,
        tokenProgram
      });

      // Check if account already exists
      const accountExists = await this.checkAccountExists(associatedTokenAddress, rpc);

      await logActivity({
        action: 'solana_ata_idempotent_creation_started',
        entity_type: 'token_account',
        entity_id: associatedTokenAddress,
        details: {
          mint: config.mint,
          owner: config.owner,
          accountExists,
          network: options.network
        }
      });

      // Step 5: Create idempotent instruction
      // This instruction will succeed even if account exists
      const createAtaInstruction = getCreateAssociatedTokenIdempotentInstruction({
        payer: feePayer,
        ata: associatedTokenAddress,
        owner: config.owner,
        mint: config.mint,
        tokenProgram
      });

      // Step 6: Get latest blockhash for the transaction
      const { value: latestBlockhash } = await rpc.getRpc().getLatestBlockhash().send();

      // Step 7: Create transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([createAtaInstruction], tx)
      );

      // Step 8: Sign transaction with required signers
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

      // Step 9: Send and confirm transaction
      const signature = getSignatureFromTransaction(signedTransaction);
      const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);

      await rpc.sendRawTransaction(encodedTransaction, { skipPreflight: false });
      
      // Wait for confirmation
      const confirmed = await rpc.waitForConfirmation(signature, 'confirmed');
      
      if (!confirmed) {
        throw new Error('ATA idempotent creation transaction failed to confirm');
      }

      await logActivity({
        action: 'solana_ata_idempotent_created',
        entity_type: 'token_account',
        entity_id: associatedTokenAddress,
        details: {
          signature,
          mint: config.mint,
          owner: config.owner,
          accountExists,
          network: options.network
        }
      });

      return {
        success: true,
        accountAddress: associatedTokenAddress,
        signature,
        explorerUrl: this.getExplorerUrl(signature, options.network),
        isAssociated: true,
        accountExists
      };

    } catch (error) {
      const solanaError = handleSolanaError.generic(error);
      
      await logActivity({
        action: 'solana_ata_idempotent_creation_failed',
        entity_type: 'token_account',
        details: {
          error: solanaError.message,
          mint: config.mint,
          owner: config.owner,
          network: options.network
        }
      });

      return {
        success: false,
        errors: [solanaError.message]
      };
    }
  }
  /**
   * Find the ATA address for a given mint and owner
   * Doesn't create the account, just derives the address
   */
  async findATAAddress(
    mint: Address,
    owner: Address,
    tokenProgram?: Address
  ): Promise<Address> {
    const program = tokenProgram || TOKEN_PROGRAM_ADDRESS;
    const [ataAddress] = await findAssociatedTokenPda({
      mint,
      owner,
      tokenProgram: program
    });
    return ataAddress;
  }

  /**
   * Check if a token account exists
   */
  async checkAccountExists(
    accountAddress: Address,
    rpc: ModernSolanaRpc
  ): Promise<boolean> {
    try {
      const accountInfo = await rpc.getRpc().getAccountInfo(accountAddress).send();
      return accountInfo.value !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get token account information
   * Returns detailed account info if exists
   */
  async getAccountInfo(
    accountAddress: Address,
    network: SolanaNetwork,
    rpcUrl?: string
  ): Promise<TokenAccountInfo> {
    try {
      const rpc = rpcUrl ? createCustomRpc(rpcUrl) : createModernRpc(network);
      
      const accountInfo = await rpc.getRpc().getAccountInfo(accountAddress, {
        encoding: 'base64'
      }).send();

      if (!accountInfo.value) {
        return {
          exists: false,
          address: accountAddress
        };
      }

      // Decode token account data
      // Token account layout: https://github.com/solana-program/token/blob/main/program/src/state.rs
      const data = accountInfo.value.data;
      
      return {
        exists: true,
        address: accountAddress,
        // Note: Full account parsing requires decoding the binary data
        // For now, we return basic info
      };

    } catch (error) {
      return {
        exists: false,
        address: accountAddress
      };
    }
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  /**
   * Validate token account configuration
   */
  private validateTokenAccountConfig(config: TokenAccountConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate mint address
    if (!config.mint) {
      errors.push('Mint address is required');
    }

    // Validate owner address
    if (!config.owner) {
      errors.push('Owner address is required');
    }

    // Validate keypair requirement
    if (!config.generateAccountKeypair && !config.accountKeypair) {
      errors.push('Either generateAccountKeypair must be true or accountKeypair must be provided');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate ATA configuration
   */
  private validateATAConfig(config: ATAConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate mint address
    if (!config.mint) {
      errors.push('Mint address is required');
    }

    // Validate owner address
    if (!config.owner) {
      errors.push('Owner address is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Create KeyPairSigner from private key
   * Supports both base58 and hex encoding
   */
  private async createSignerFromPrivateKey(privateKey: string): Promise<KeyPairSigner> {
    try {
      // Try base58 first (Solana standard)
      const decodedKey = bs58.decode(privateKey);
      return await createKeyPairSignerFromBytes(decodedKey);
    } catch {
      // Try hex if base58 fails
      try {
        const hexKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
        const decodedKey = Buffer.from(hexKey, 'hex');
        return await createKeyPairSignerFromBytes(new Uint8Array(decodedKey));
      } catch (error) {
        throw new Error('Invalid private key format. Expected base58 or hex encoded key.');
      }
    }
  }

  /**
   * Get Solana Explorer URL for transaction
   */
  private getExplorerUrl(signature: string, network: SolanaNetwork): string {
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://explorer.solana.com/tx/${signature}${cluster}`;
  }

  /**
   * Get Solana Explorer URL for account
   */
  private getAccountExplorerUrl(address: Address, network: SolanaNetwork): string {
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://explorer.solana.com/address/${address}${cluster}`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const modernSolanaTokenAccountService = new ModernSolanaTokenAccountService();
