/**
 * Modern Solana Account Close Service
 * 
 * Handles closing of SPL token accounts using modern @solana/kit and @solana-program/token
 * Supports:
 * - Close empty token accounts
 * - Reclaim rent-exempt SOL
 * - Validation before closing
 * - Transaction confirmation
 * 
 * ARCHITECTURE: Modern @solana/kit + @solana-program/token
 * 
 * IMPORTANT: Token account MUST have zero balance before closing
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
  getCloseAccountInstruction,
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

export interface CloseAccountParams {
  mint: Address; // Token mint address
  owner: Address; // Account owner address
  destination: Address; // Destination for reclaimed SOL
}

export interface ModernCloseAccountOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  signerPrivateKey: string; // Base58 or hex encoded private key
  validateBalance?: boolean; // Check if account is empty before closing (default: true)
}

export interface CloseAccountResult {
  success: boolean;
  signature?: string;
  tokenAccount?: Address;
  reclaimedLamports?: bigint;
  explorerUrl?: string;
  confirmationTime?: number;
  errors?: string[];
  warnings?: string[];
}

// ============================================================================
// MODERN SOLANA ACCOUNT CLOSE SERVICE
// ============================================================================

export class ModernSolanaAccountCloseService {
  /**
   * Close an SPL token account and reclaim rent-exempt SOL
   * 
   * IMPORTANT: Account MUST have zero balance to close
   */
  async closeTokenAccount(
    params: CloseAccountParams,
    options: ModernCloseAccountOptions
  ): Promise<CloseAccountResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Validate inputs
      const validation = this.validateCloseAccountParams(params);
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

      // 3. Create signer from private key
      const signer = await this.createSignerFromPrivateKey(options.signerPrivateKey);

      // 4. Find token account address (ATA)
      const [tokenAccountAddress] = await findAssociatedTokenPda({
        owner: params.owner,
        mint: params.mint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS
      });

      // 5. Validate account balance if requested
      if (options.validateBalance !== false) {
        const balanceCheck = await this.validateAccountBalance(
          rpc,
          tokenAccountAddress
        );
        
        if (!balanceCheck.isZero) {
          return {
            success: false,
            tokenAccount: tokenAccountAddress,
            errors: [`Account has non-zero balance: ${balanceCheck.balance}. Cannot close account with tokens.`]
          };
        }
      }

      // 6. Get rent info (for reporting reclaimed amount)
      const accountInfo = await rpc.getRpc().getAccountInfo(tokenAccountAddress, { encoding: 'base64' }).send();
      const reclaimedLamports = accountInfo?.value?.lamports || 0n;

      // 7. Build close account instruction
      const closeInstruction = getCloseAccountInstruction({
        account: tokenAccountAddress,
        destination: params.destination,
        owner: signer
      });

      // 8. Get latest blockhash
      const { value: latestBlockhash } = await rpc.getRpc()
        .getLatestBlockhash({ commitment: 'confirmed' })
        .send();

      // 9. Build transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions([closeInstruction], tx)
      );

      // 10. Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

      // 11. Get signature for tracking
      const signature = getSignatureFromTransaction(signedTransaction);

      // 12. Encode and send transaction
      const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);
      await rpc.sendRawTransaction(encodedTransaction, {
        skipPreflight: false,
        maxRetries: 3
      });

      // 13. Wait for confirmation
      const confirmed = await rpc.waitForConfirmation(signature, 'confirmed', 30000);
      
      if (!confirmed) {
        return {
          success: false,
          signature,
          tokenAccount: tokenAccountAddress,
          errors: ['Transaction failed to confirm within timeout period']
        };
      }

      const confirmationTime = Date.now() - startTime;

      // 14. Build explorer URL
      const explorerUrl = this.buildExplorerUrl(signature, options.network);

      // 15. Log activity
      await this.logCloseActivity({
        signature,
        tokenAccount: tokenAccountAddress,
        mint: params.mint,
        owner: params.owner,
        destination: params.destination,
        reclaimedLamports,
        network: options.network
      });

      return {
        success: true,
        signature,
        tokenAccount: tokenAccountAddress,
        reclaimedLamports,
        explorerUrl,
        confirmationTime,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      const handledError = handleSolanaError.generic(error);
      
      return {
        success: false,
        errors: [handledError.message, ...errors]
      };
    }
  }

  /**
   * Close multiple token accounts in a single transaction
   * Useful for bulk cleanup operations
   */
  async closeMultipleAccounts(
    accountsParams: CloseAccountParams[],
    options: ModernCloseAccountOptions
  ): Promise<CloseAccountResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (accountsParams.length === 0) {
        return {
          success: false,
          errors: ['No accounts provided to close']
        };
      }

      // Limit to prevent transaction size issues
      if (accountsParams.length > 10) {
        warnings.push('Closing more than 10 accounts may exceed transaction size limits');
      }

      // Setup RPC
      const rpc = options.rpcUrl 
        ? createCustomRpc(options.rpcUrl)
        : createModernRpc(options.network);

      // Create signer
      const signer = await this.createSignerFromPrivateKey(options.signerPrivateKey);

      // Build close instructions for each account
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
          getCloseAccountInstruction({
            account: tokenAccountAddress,
            destination: params.destination,
            owner: signer
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
        tx => setTransactionMessageFeePayerSigner(signer, tx),
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
          errors: ['Bulk close transaction failed to confirm']
        };
      }

      const confirmationTime = Date.now() - startTime;
      const explorerUrl = this.buildExplorerUrl(signature, options.network);

      // Log activity
      await logActivity({
        action: 'solana_bulk_close_accounts',
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
        explorerUrl,
        confirmationTime,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      const handledError = handleSolanaError.generic(error);
      
      return {
        success: false,
        errors: [handledError.message, ...errors]
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate close account parameters
   */
  private validateCloseAccountParams(params: CloseAccountParams): {
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

    if (!params.destination) {
      errors.push('Destination address for reclaimed SOL is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Check if account has zero balance
   */
  private async validateAccountBalance(
    rpc: ModernSolanaRpc,
    tokenAccount: Address
  ): Promise<{ isZero: boolean; balance: string }> {
    try {
      const accountInfo = await rpc.getRpc()
        .getAccountInfo(tokenAccount, { encoding: 'base64' })
        .send();

      if (!accountInfo?.value) {
        // Account doesn't exist - safe to "close" (no-op)
        return { isZero: true, balance: '0' };
      }

      // Parse token account data
      // Token account structure: 165 bytes
      // Balance is at bytes 64-72 (8 bytes, little-endian u64)
      const data = accountInfo.value.data[0];
      const decodedData = Buffer.from(data, 'base64');
      
      if (decodedData.length < 72) {
        return { isZero: false, balance: 'unknown' };
      }

      const balance = decodedData.readBigUInt64LE(64);
      
      return {
        isZero: balance === 0n,
        balance: balance.toString()
      };

    } catch (error) {
      console.error('Failed to validate account balance:', error);
      // If we can't check, allow closing attempt
      return { isZero: true, balance: 'unknown' };
    }
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
   * Log close account activity
   */
  private async logCloseActivity(details: {
    signature: string;
    tokenAccount: Address;
    mint: Address;
    owner: Address;
    destination: Address;
    reclaimedLamports: bigint;
    network: SolanaNetwork;
  }): Promise<void> {
    try {
      await logActivity({
        action: 'solana_close_token_account',
        entity_type: 'wallet',
        details: {
          signature: details.signature,
          tokenAccount: details.tokenAccount.toString(),
          mint: details.mint.toString(),
          owner: details.owner.toString(),
          destination: details.destination.toString(),
          reclaimedLamports: details.reclaimedLamports.toString(),
          reclaimedSol: (Number(details.reclaimedLamports) / 1e9).toFixed(9),
          network: details.network,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log close account activity:', error);
      // Don't throw - logging failure shouldn't fail the operation
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const modernSolanaAccountCloseService = new ModernSolanaAccountCloseService();
