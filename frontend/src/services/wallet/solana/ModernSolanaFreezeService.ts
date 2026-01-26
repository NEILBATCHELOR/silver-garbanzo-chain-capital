/**
 * Modern Solana Freeze Service
 * 
 * Handles freezing and thawing of SPL token accounts using modern @solana/kit and @solana-program/token
 * Supports:
 * - Freeze token accounts (prevent transfers)
 * - Thaw frozen accounts (allow transfers)
 * - Check freeze status
 * - Transaction confirmation
 * 
 * ARCHITECTURE: Modern @solana/kit + @solana-program/token
 * 
 * IMPORTANT: Mint MUST have freeze authority enabled to use these operations
 * 
 * Use Cases:
 * - Compliance holds
 * - Security freezes
 * - Regulatory requirements
 * - NFT staking
 */

import {
  createSolanaRpc,
  createKeyPairSignerFromBytes,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  getBase58Decoder,
  address,
  lamports,
  type Address,
  type KeyPairSigner,
  type Instruction
} from '@solana/kit';

import type { Commitment } from '@solana/rpc-types';

import {
  TOKEN_PROGRAM_ADDRESS,
  getFreezeAccountInstruction,
  getThawAccountInstruction,
  findAssociatedTokenPda,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS
} from '@solana-program/token';

import { createModernRpc, createCustomRpc, type ModernSolanaRpc } from '@/infrastructure/web3/solana';
import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { handleSolanaError } from '@/infrastructure/web3/solana/ModernSolanaErrorHandler';
import { logActivity } from '@/infrastructure/activityLogger';
import bs58 from 'bs58';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface FreezeAccountParams {
  mint: Address; // Token mint address
  owner: Address; // Account owner address
}

export interface ModernFreezeOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  freezeAuthorityPrivateKey: string; // Base58 or hex encoded freeze authority private key
}

export interface FreezeAccountResult {
  success: boolean;
  signature?: string;
  tokenAccount?: Address;
  operation?: 'freeze' | 'thaw';
  explorerUrl?: string;
  confirmationTime?: number;
  errors?: string[];
  warnings?: string[];
}

export interface FreezeStatusResult {
  isFrozen: boolean;
  tokenAccount: Address;
  accountState?: 'uninitialized' | 'initialized' | 'frozen';
  error?: string;
}

// ============================================================================
// MODERN SOLANA FREEZE SERVICE
// ============================================================================

export class ModernSolanaFreezeService {
  /**
   * Freeze a token account to prevent transfers
   * 
   * IMPORTANT: Mint must have freeze authority enabled
   */
  async freezeAccount(
    params: FreezeAccountParams,
    options: ModernFreezeOptions
  ): Promise<FreezeAccountResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Validate inputs
      const validation = this.validateFreezeParams(params);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // 2. Setup RPC connection
      const rpc = options.rpcUrl 
        ? createCustomRpc(options.rpcUrl)
        : createModernRpc(options.network);

      // 3. Create freeze authority signer
      const freezeAuthority = await this.createSignerFromPrivateKey(options.freezeAuthorityPrivateKey);

      // 4. Find token account address (ATA)
      const [tokenAccountAddress] = await findAssociatedTokenPda({
        owner: params.owner,
        mint: params.mint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS
      });

      // 5. Check current freeze status
      const currentStatus = await this.checkFreezeStatus(rpc, tokenAccountAddress);
      if (currentStatus.isFrozen) {
        warnings.push('Account is already frozen');
      }

      // 6. Build freeze instruction
      const freezeInstruction = getFreezeAccountInstruction({
        account: tokenAccountAddress,
        mint: params.mint,
        owner: freezeAuthority.address
      });

      // 7. Get latest blockhash
      const { value: latestBlockhash } = await rpc.getRpc()
        .getLatestBlockhash({ commitment: 'confirmed' })
        .send();

      // 8. Build transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(freezeAuthority, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions([freezeInstruction], tx)
      );

      // 9. Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

      // 10. Get signature for tracking
      const signature = getSignatureFromTransaction(signedTransaction);

      // 11. Encode and send transaction
      const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);
      await rpc.sendRawTransaction(encodedTransaction, {
        skipPreflight: false,
        maxRetries: 3
      });

      // 12. Wait for confirmation
      const confirmed = await rpc.waitForConfirmation(signature, 'confirmed', 30000);
      
      if (!confirmed) {
        return {
          success: false,
          signature,
          tokenAccount: tokenAccountAddress,
          operation: 'freeze',
          errors: ['Freeze transaction failed to confirm within timeout period']
        };
      }

      const confirmationTime = Date.now() - startTime;

      // 13. Build explorer URL
      const explorerUrl = this.buildExplorerUrl(signature, options.network);

      // 14. Log activity
      await this.logFreezeActivity({
        signature,
        tokenAccount: tokenAccountAddress,
        mint: params.mint,
        owner: params.owner,
        operation: 'freeze',
        network: options.network
      });

      return {
        success: true,
        signature,
        tokenAccount: tokenAccountAddress,
        operation: 'freeze',
        explorerUrl,
        confirmationTime,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      const handledError = handleSolanaError.generic(error);
      
      return {
        success: false,
        operation: 'freeze',
        errors: [handledError.message, ...errors]
      };
    }
  }

  /**
   * Thaw a frozen token account to allow transfers
   * 
   * IMPORTANT: Account must be frozen first
   */
  async thawAccount(
    params: FreezeAccountParams,
    options: ModernFreezeOptions
  ): Promise<FreezeAccountResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Validate inputs
      const validation = this.validateFreezeParams(params);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // 2. Setup RPC connection
      const rpc = options.rpcUrl 
        ? createCustomRpc(options.rpcUrl)
        : createModernRpc(options.network);

      // 3. Create freeze authority signer
      const freezeAuthority = await this.createSignerFromPrivateKey(options.freezeAuthorityPrivateKey);

      // 4. Find token account address (ATA)
      const [tokenAccountAddress] = await findAssociatedTokenPda({
        owner: params.owner,
        mint: params.mint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS
      });

      // 5. Check current freeze status
      const currentStatus = await this.checkFreezeStatus(rpc, tokenAccountAddress);
      if (!currentStatus.isFrozen) {
        warnings.push('Account is not currently frozen');
      }

      // 6. Build thaw instruction
      const thawInstruction = getThawAccountInstruction({
        account: tokenAccountAddress,
        mint: params.mint,
        owner: freezeAuthority.address
      });

      // 7. Get latest blockhash
      const { value: latestBlockhash } = await rpc.getRpc()
        .getLatestBlockhash({ commitment: 'confirmed' })
        .send();

      // 8. Build transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(freezeAuthority, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions([thawInstruction], tx)
      );

      // 9. Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

      // 10. Get signature for tracking
      const signature = getSignatureFromTransaction(signedTransaction);

      // 11. Encode and send transaction
      const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);
      await rpc.sendRawTransaction(encodedTransaction, {
        skipPreflight: false,
        maxRetries: 3
      });

      // 12. Wait for confirmation
      const confirmed = await rpc.waitForConfirmation(signature, 'confirmed', 30000);
      
      if (!confirmed) {
        return {
          success: false,
          signature,
          tokenAccount: tokenAccountAddress,
          operation: 'thaw',
          errors: ['Thaw transaction failed to confirm within timeout period']
        };
      }

      const confirmationTime = Date.now() - startTime;

      // 13. Build explorer URL
      const explorerUrl = this.buildExplorerUrl(signature, options.network);

      // 14. Log activity
      await this.logFreezeActivity({
        signature,
        tokenAccount: tokenAccountAddress,
        mint: params.mint,
        owner: params.owner,
        operation: 'thaw',
        network: options.network
      });

      return {
        success: true,
        signature,
        tokenAccount: tokenAccountAddress,
        operation: 'thaw',
        explorerUrl,
        confirmationTime,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      const handledError = handleSolanaError.generic(error);
      
      return {
        success: false,
        operation: 'thaw',
        errors: [handledError.message, ...errors]
      };
    }
  }

  /**
   * Check if a token account is frozen
   */
  async checkFreezeStatus(
    rpc: ModernSolanaRpc,
    tokenAccount: Address
  ): Promise<FreezeStatusResult> {
    try {
      const accountInfo = await rpc.getRpc()
        .getAccountInfo(tokenAccount, { encoding: 'base64' })
        .send();

      if (!accountInfo?.value) {
        return {
          isFrozen: false,
          tokenAccount,
          error: 'Account does not exist'
        };
      }

      // Parse token account data
      // Token account structure: 165 bytes
      // State is at byte 108 (1 byte enum: 0=uninitialized, 1=initialized, 2=frozen)
      const data = accountInfo.value.data[0];
      const decodedData = Buffer.from(data, 'base64');
      
      if (decodedData.length < 109) {
        return {
          isFrozen: false,
          tokenAccount,
          error: 'Invalid token account data'
        };
      }

      const state = decodedData.readUInt8(108);
      const accountState = state === 0 ? 'uninitialized' : state === 1 ? 'initialized' : 'frozen';
      
      return {
        isFrozen: state === 2,
        tokenAccount,
        accountState
      };

    } catch (error) {
      console.error('Failed to check freeze status:', error);
      return {
        isFrozen: false,
        tokenAccount,
        error: 'Failed to fetch account data'
      };
    }
  }

  /**
   * Freeze multiple token accounts in a single transaction
   * Useful for bulk freeze operations
   */
  async freezeMultipleAccounts(
    accountsParams: FreezeAccountParams[],
    options: ModernFreezeOptions
  ): Promise<FreezeAccountResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (accountsParams.length === 0) {
        return {
          success: false,
          errors: ['No accounts provided to freeze']
        };
      }

      // Limit to prevent transaction size issues
      if (accountsParams.length > 10) {
        warnings.push('Freezing more than 10 accounts may exceed transaction size limits');
      }

      // Setup RPC
      const rpc = options.rpcUrl 
        ? createCustomRpc(options.rpcUrl)
        : createModernRpc(options.network);

      // Create freeze authority signer
      const freezeAuthority = await this.createSignerFromPrivateKey(options.freezeAuthorityPrivateKey);

      // Build freeze instructions for each account
      const instructions: Instruction[] = [];
      const tokenAccounts: Address[] = [];

      for (const params of accountsParams) {
        const [tokenAccountAddress] = await findAssociatedTokenPda({
          owner: params.owner,
          mint: params.mint,
          tokenProgram: TOKEN_PROGRAM_ADDRESS
        });

        tokenAccounts.push(tokenAccountAddress);

        instructions.push(
          getFreezeAccountInstruction({
            account: tokenAccountAddress,
            mint: params.mint,
            owner: freezeAuthority.address
          })
        );
      }

      // Get latest blockhash
      const { value: latestBlockhash } = await rpc.getRpc()
        .getLatestBlockhash({ commitment: 'confirmed' })
        .send();

      // Build transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(freezeAuthority, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      );

      // Sign and send
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
      const signature = getSignatureFromTransaction(signedTransaction);
      const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);

      await rpc.sendRawTransaction(encodedTransaction, {
        skipPreflight: false,
        maxRetries: 3
      });

      // Wait for confirmation
      const confirmed = await rpc.waitForConfirmation(signature, 'confirmed', 45000);
      
      if (!confirmed) {
        return {
          success: false,
          signature,
          operation: 'freeze',
          errors: ['Bulk freeze transaction failed to confirm']
        };
      }

      const confirmationTime = Date.now() - startTime;
      const explorerUrl = this.buildExplorerUrl(signature, options.network);

      // Log activity
      await logActivity({
        action: 'solana_bulk_freeze_accounts',
        entity_type: 'wallet',
        details: {
          signature,
          accountCount: accountsParams.length,
          tokenAccounts: tokenAccounts.map(a => a.toString()),
          network: options.network,
          confirmationTime
        }
      });

      return {
        success: true,
        signature,
        operation: 'freeze',
        explorerUrl,
        confirmationTime,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      const handledError = handleSolanaError.generic(error);
      
      return {
        success: false,
        operation: 'freeze',
        errors: [handledError.message, ...errors]
      };
    }
  }

  /**
   * Thaw multiple frozen accounts in a single transaction
   */
  async thawMultipleAccounts(
    accountsParams: FreezeAccountParams[],
    options: ModernFreezeOptions
  ): Promise<FreezeAccountResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (accountsParams.length === 0) {
        return {
          success: false,
          errors: ['No accounts provided to thaw']
        };
      }

      // Limit to prevent transaction size issues
      if (accountsParams.length > 10) {
        warnings.push('Thawing more than 10 accounts may exceed transaction size limits');
      }

      // Setup RPC
      const rpc = options.rpcUrl 
        ? createCustomRpc(options.rpcUrl)
        : createModernRpc(options.network);

      // Create freeze authority signer
      const freezeAuthority = await this.createSignerFromPrivateKey(options.freezeAuthorityPrivateKey);

      // Build thaw instructions for each account
      const instructions: Instruction[] = [];
      const tokenAccounts: Address[] = [];

      for (const params of accountsParams) {
        const [tokenAccountAddress] = await findAssociatedTokenPda({
          owner: params.owner,
          mint: params.mint,
          tokenProgram: TOKEN_PROGRAM_ADDRESS
        });

        tokenAccounts.push(tokenAccountAddress);

        instructions.push(
          getThawAccountInstruction({
            account: tokenAccountAddress,
            mint: params.mint,
            owner: freezeAuthority.address
          })
        );
      }

      // Get latest blockhash
      const { value: latestBlockhash } = await rpc.getRpc()
        .getLatestBlockhash({ commitment: 'confirmed' })
        .send();

      // Build transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(freezeAuthority, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      );

      // Sign and send
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
      const signature = getSignatureFromTransaction(signedTransaction);
      const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);

      await rpc.sendRawTransaction(encodedTransaction, {
        skipPreflight: false,
        maxRetries: 3
      });

      // Wait for confirmation
      const confirmed = await rpc.waitForConfirmation(signature, 'confirmed', 45000);
      
      if (!confirmed) {
        return {
          success: false,
          signature,
          operation: 'thaw',
          errors: ['Bulk thaw transaction failed to confirm']
        };
      }

      const confirmationTime = Date.now() - startTime;
      const explorerUrl = this.buildExplorerUrl(signature, options.network);

      // Log activity
      await logActivity({
        action: 'solana_bulk_thaw_accounts',
        entity_type: 'wallet',
        details: {
          signature,
          accountCount: accountsParams.length,
          tokenAccounts: tokenAccounts.map(a => a.toString()),
          network: options.network,
          confirmationTime
        }
      });

      return {
        success: true,
        signature,
        operation: 'thaw',
        explorerUrl,
        confirmationTime,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      const handledError = handleSolanaError.generic(error);
      
      return {
        success: false,
        operation: 'thaw',
        errors: [handledError.message, ...errors]
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate freeze/thaw parameters
   */
  private validateFreezeParams(params: FreezeAccountParams): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (!params.mint) {
      errors.push('Token mint address is required');
    }

    if (!params.owner) {
      errors.push('Account owner address is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Create KeyPairSigner from private key
   */
  private async createSignerFromPrivateKey(privateKey: string): Promise<KeyPairSigner> {
    try {
      // Try base58 first
      const secretKey = bs58.decode(privateKey);
      return await createKeyPairSignerFromBytes(secretKey);
    } catch {
      // Try hex if base58 fails
      const secretKey = Buffer.from(privateKey.replace('0x', ''), 'hex');
      return await createKeyPairSignerFromBytes(new Uint8Array(secretKey));
    }
  }

  /**
   * Build Solana Explorer URL
   */
  private buildExplorerUrl(signature: string, network: SolanaNetwork): string {
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://explorer.solana.com/tx/${signature}${cluster}`;
  }

  /**
   * Log freeze/thaw activity
   */
  private async logFreezeActivity(details: {
    signature: string;
    tokenAccount: Address;
    mint: Address;
    owner: Address;
    operation: 'freeze' | 'thaw';
    network: SolanaNetwork;
  }): Promise<void> {
    try {
      await logActivity({
        action: `solana_${details.operation}_account`,
        entity_type: 'wallet',
        details: {
          signature: details.signature,
          tokenAccount: details.tokenAccount.toString(),
          mint: details.mint.toString(),
          owner: details.owner.toString(),
          operation: details.operation,
          network: details.network,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error(`Failed to log ${details.operation} activity:`, error);
      // Don't throw - logging failure shouldn't fail the operation
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const modernSolanaFreezeService = new ModernSolanaFreezeService();
