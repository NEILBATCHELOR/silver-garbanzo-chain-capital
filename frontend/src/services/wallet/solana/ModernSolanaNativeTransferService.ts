/**
 * Modern Solana Native (SOL) Transfer Service
 * 
 * Handles native SOL transfers using modern @solana/kit
 * Supports:
 * - Basic SOL transfers
 * - Batch transfers
 * - Fee estimation
 * - Transaction confirmation
 * 
 * ARCHITECTURE: Modern @solana/kit + @solana-program/system
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
  address,
  lamports,
  type Address,
  type KeyPairSigner,
  type Instruction
} from '@solana/kit';

import type { Commitment } from '@solana/rpc-types';

import {
  getTransferSolInstruction
} from '@solana-program/system';

import { createModernRpc, createCustomRpc, type ModernSolanaRpc } from '@/infrastructure/web3/solana';
import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { handleSolanaError } from '@/infrastructure/web3/solana/ModernSolanaErrorHandler';
import { logActivity } from '@/infrastructure/activityLogger';
import bs58 from 'bs58';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SolTransferParams {
  from: Address; // Source wallet address
  to: Address; // Destination wallet address
  amount: bigint; // Amount in lamports (1 SOL = 1_000_000_000 lamports)
  memo?: string; // Optional transfer memo
}

export interface BatchSolTransferParams {
  from: Address;
  recipients: Array<{
    to: Address;
    amount: bigint;
  }>;
  memo?: string;
}

export interface ModernSolTransferOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  signerPrivateKey: string; // Base58 or hex encoded private key
}

export interface SolTransferResult {
  success: boolean;
  signature?: string;
  explorerUrl?: string;
  confirmationTime?: number;
  errors?: string[];
}

export interface BatchSolTransferResult {
  success: boolean;
  totalSent: number;
  successfulTransfers: Array<{
    recipient: Address;
    amount: bigint;
    signature: string;
  }>;
  failedTransfers: Array<{
    recipient: Address;
    amount: bigint;
    error: string;
  }>;
}

export interface SolFeeEstimate {
  estimatedFee: bigint; // In lamports
  priorityFee?: bigint; // Optional priority fee
  totalFee: bigint; // Total fee including priority
}

// ============================================================================
// MODERN SOLANA NATIVE TRANSFER SERVICE
// ============================================================================

export class ModernSolanaNativeTransferService {
  /**
   * Transfer native SOL from one wallet to another
   */
  async transferSol(
    params: SolTransferParams,
    options: ModernSolTransferOptions
  ): Promise<SolTransferResult> {
    const startTime = Date.now();

    try {
      // Step 1: Validation
      const validation = this.validateTransferParams(params);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Step 2: Setup RPC and signer
      const rpc = this.createRpc(options.network, options.rpcUrl);
      const signer = await this.createSigner(options.signerPrivateKey);

      // Step 3: Build transfer instruction
      const transferInstruction = getTransferSolInstruction({
        source: signer,
        destination: params.to,
        amount: params.amount
      });

      // Step 4: Build, sign, and send transaction
      const { value: latestBlockhash } = await rpc.getRpc()
        .getLatestBlockhash()
        .send();

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions([transferInstruction], tx)
      );

      const signedTx = await signTransactionMessageWithSigners(transactionMessage);
      const signature = getSignatureFromTransaction(signedTx);
      const encodedTx = getBase64EncodedWireTransaction(signedTx);

      // Step 5: Send transaction
      await rpc.sendRawTransaction(encodedTx, { skipPreflight: false });

      // Step 6: Wait for confirmation
      const confirmed = await rpc.waitForConfirmation(signature);

      if (!confirmed) {
        return {
          success: false,
          errors: ['Transaction failed to confirm']
        };
      }

      const confirmationTime = Date.now() - startTime;
      const explorerUrl = this.getExplorerUrl(signature, options.network);

      // Step 7: Log activity
      await logActivity({
        action: 'solana_sol_transfer',
        entity_type: 'wallet',
        details: {
          from: params.from,
          to: params.to,
          amount: params.amount.toString(),
          signature,
          network: options.network,
          confirmationTimeMs: confirmationTime
        }
      });

      return {
        success: true,
        signature,
        explorerUrl,
        confirmationTime
      };

    } catch (error) {
      console.error('SOL transfer error:', error);
      
      // Use error handler to create user-friendly error
      const solanaError = handleSolanaError.transfer(error, options.network);
      
      return {
        success: false,
        errors: [solanaError.userMessage, solanaError.suggestedAction].filter(Boolean) as string[]
      };
    }
  }

  /**
   * Batch transfer SOL to multiple recipients
   * Executes transfers sequentially to ensure reliability
   */
  async batchTransferSol(
    params: BatchSolTransferParams,
    options: ModernSolTransferOptions
  ): Promise<BatchSolTransferResult> {
    const results: BatchSolTransferResult = {
      success: false,
      totalSent: 0,
      successfulTransfers: [],
      failedTransfers: []
    };

    for (const recipient of params.recipients) {
      try {
        const transferResult = await this.transferSol(
          {
            from: params.from,
            to: recipient.to,
            amount: recipient.amount,
            memo: params.memo
          },
          options
        );

        if (transferResult.success && transferResult.signature) {
          results.successfulTransfers.push({
            recipient: recipient.to,
            amount: recipient.amount,
            signature: transferResult.signature
          });
          results.totalSent++;
        } else {
          results.failedTransfers.push({
            recipient: recipient.to,
            amount: recipient.amount,
            error: transferResult.errors?.join(', ') || 'Unknown error'
          });
        }
      } catch (error) {
        results.failedTransfers.push({
          recipient: recipient.to,
          amount: recipient.amount,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    results.success = results.successfulTransfers.length > 0;

    // Log batch activity
    await logActivity({
      action: 'solana_sol_batch_transfer',
      entity_type: 'wallet',
      details: {
        from: params.from,
        totalRecipients: params.recipients.length,
        successfulTransfers: results.successfulTransfers.length,
        failedTransfers: results.failedTransfers.length,
        network: options.network
      }
    });

    return results;
  }

  /**
   * Estimate SOL transfer fee
   */
  async estimateTransferFee(
    options: Pick<ModernSolTransferOptions, 'network' | 'rpcUrl'>
  ): Promise<SolFeeEstimate> {
    try {
      // Base transaction fee (5000 lamports per signature)
      const baseFee = lamports(5000n);
      
      return {
        estimatedFee: baseFee,
        totalFee: baseFee
      };

    } catch (error) {
      console.error('Fee estimation error:', error);
      
      // Return conservative estimate
      return {
        estimatedFee: lamports(5000n),
        totalFee: lamports(5000n)
      };
    }
  }

  /**
   * Get SOL balance for an address
   */
  async getSolBalance(
    address: Address,
    network: SolanaNetwork,
    rpcUrl?: string
  ): Promise<bigint> {
    try {
      const rpc = this.createRpc(network, rpcUrl);
      const balance = await rpc.getBalance(address);
      return balance;
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      return 0n;
    }
  }

  /**
   * Convert SOL to lamports
   */
  solToLamports(sol: number): bigint {
    return BigInt(Math.floor(sol * 1_000_000_000));
  }

  /**
   * Convert lamports to SOL
   */
  lamportsToSol(lamports: bigint): number {
    return Number(lamports) / 1_000_000_000;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Create RPC instance with optional custom URL
   */
  private createRpc(network: SolanaNetwork, customUrl?: string): ModernSolanaRpc {
    if (customUrl) {
      return createCustomRpc(customUrl);
    }
    return createModernRpc(network);
  }

  /**
   * Create signer from private key
   * Supports both Base58 and hex formats
   */
  async createSigner(privateKey: string): Promise<KeyPairSigner> {
    try {
      let keyBytes: Uint8Array;

      if (privateKey.startsWith('0x')) {
        // Hex format
        const hex = privateKey.slice(2);
        keyBytes = new Uint8Array(
          hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
        );
      } else {
        // Assume Base58 format
        keyBytes = bs58.decode(privateKey);
      }

      return await createKeyPairSignerFromBytes(keyBytes);

    } catch (error) {
      throw new Error('Invalid private key format. Expected Base58 or hex string.');
    }
  }

  /**
   * Validate transfer parameters
   */
  private validateTransferParams(params: SolTransferParams): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate addresses
    if (!params.from) {
      errors.push('Source address is required');
    }

    if (!params.to) {
      errors.push('Destination address is required');
    }

    // Validate amount
    if (params.amount <= 0n) {
      errors.push('Transfer amount must be greater than 0');
    }

    // Ensure amount is not too small (dust limit)
    const minAmount = lamports(890n); // Rent-exempt minimum for empty account
    if (params.amount < minAmount) {
      errors.push(`Transfer amount must be at least ${this.lamportsToSol(minAmount)} SOL`);
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
   * Get wallet address from private key
   */
  async getAddressFromPrivateKey(privateKey: string): Promise<Address> {
    const signer = await this.createSigner(privateKey);
    return signer.address;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const modernSolanaNativeTransferService = new ModernSolanaNativeTransferService();
