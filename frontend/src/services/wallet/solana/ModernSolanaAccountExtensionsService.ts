/**
 * Modern Solana Account Extensions Service
 * 
 * Handles Token-2022 account-level extensions using modern @solana/kit
 * Following official Solana documentation: https://solana.com/docs/tokens/extensions/
 * 
 * ACCOUNT-LEVEL EXTENSIONS (post-creation):
 * - MemoTransfer: Require memo with transfers (enable/disable)
 * 
 * ACCOUNT-LEVEL EXTENSIONS (creation-time):
 * - ImmutableOwner: Prevent ownership reassignment (handled in TokenAccountService)
 * 
 * Key Differences from Mint Extensions:
 * - These extensions apply to token ACCOUNTS, not mints
 * - MemoTransfer can be toggled on/off after account creation
 * - ImmutableOwner must be set during account creation
 * 
 * ARCHITECTURE: Modern @solana/kit + @solana-program/token-2022
 * MIGRATION STATUS: ✅ MODERN
 */

import {
  createKeyPairSignerFromBytes,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
  getBase64EncodedWireTransaction,
  address,
  type Address,
  type KeyPairSigner,
} from '@solana/kit';

import {
  TOKEN_2022_PROGRAM_ADDRESS,
  getEnableMemoTransfersInstruction,
  getDisableMemoTransfersInstruction,
} from '@solana-program/token-2022';

import { createModernRpc, createCustomRpc } from '@/infrastructure/web3/solana';
import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { handleSolanaError } from '@/infrastructure/web3/solana/ModernSolanaErrorHandler';
import { logActivity } from '@/infrastructure/activityLogger';
import bs58 from 'bs58';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Configuration for enabling MemoTransfer
 */
export interface EnableMemoTransferConfig {
  tokenAccount: Address; // The token account to enable memo transfers on
}

/**
 * Configuration for disabling MemoTransfer
 */
export interface DisableMemoTransferConfig {
  tokenAccount: Address; // The token account to disable memo transfers on
}

/**
 * Options for account extension operations
 */
export interface AccountExtensionOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  ownerPrivateKey: string; // Base58 encoded private key of account owner
}

/**
 * Result from account extension operations
 */
export interface AccountExtensionResult {
  success: boolean;
  signature?: string;
  explorerUrl?: string;
  errors?: string[];
}

/**
 * MemoTransfer status for an account
 */
export interface MemoTransferStatus {
  enabled: boolean;
  accountAddress: Address;
}

// ============================================================================
// MODERN SOLANA ACCOUNT EXTENSIONS SERVICE
// ============================================================================

export class ModernSolanaAccountExtensionsService {
  /**
   * Enable MemoTransfer on a token account
   * Following: https://solana.com/docs/tokens/extensions/memo-transfer
   * 
   * When enabled, all transfers to this account must include a memo instruction
   * 
   * Use cases:
   * - Compliance requirements (transaction notes)
   * - Payment tracking
   * - Regulatory compliance
   */
  async enableMemoTransfer(
    config: EnableMemoTransferConfig,
    options: AccountExtensionOptions
  ): Promise<AccountExtensionResult> {
    try {
      // Step 1: Validate configuration
      const validation = this.validateMemoTransferConfig(config);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      // Step 2: Create RPC connection
      const rpc = options.rpcUrl 
        ? createCustomRpc(options.rpcUrl)
        : createModernRpc(options.network);

      // Step 3: Create signer (account owner)
      const owner = await this.createSignerFromPrivateKey(options.ownerPrivateKey);

      await logActivity({
        action: 'solana_enable_memo_transfer_started',
        entity_type: 'token_account',
        entity_id: config.tokenAccount,
        details: {
          network: options.network
        }
      });

      // Step 4: Build enable memo transfer instruction
      const enableMemoInstruction = getEnableMemoTransfersInstruction({
        token: config.tokenAccount,
        owner: owner
      });

      // Step 5: Get latest blockhash
      const { value: latestBlockhash } = await rpc.getRpc().getLatestBlockhash().send();

      // Step 6: Create transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(owner, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([enableMemoInstruction], tx)
      );

      // Step 7: Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

      // Step 8: Send and confirm transaction
      const signature = getSignatureFromTransaction(signedTransaction);
      const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);

      await rpc.sendRawTransaction(encodedTransaction, { skipPreflight: false });
      
      // Wait for confirmation
      const confirmed = await rpc.waitForConfirmation(signature, 'confirmed');
      
      if (!confirmed) {
        throw new Error('Enable memo transfer transaction failed to confirm');
      }

      await logActivity({
        action: 'solana_enable_memo_transfer_completed',
        entity_type: 'token_account',
        entity_id: config.tokenAccount,
        details: {
          signature,
          network: options.network
        }
      });

      return {
        success: true,
        signature,
        explorerUrl: this.getExplorerUrl(signature, options.network)
      };

    } catch (error) {
      const solanaError = handleSolanaError.generic(error);
      
      await logActivity({
        action: 'solana_enable_memo_transfer_failed',
        entity_type: 'token_account',
        entity_id: config.tokenAccount,
        details: {
          error: solanaError.message,
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
   * Disable MemoTransfer on a token account
   * Following: https://solana.com/docs/tokens/extensions/memo-transfer
   * 
   * When disabled, transfers to this account no longer require a memo
   */
  async disableMemoTransfer(
    config: DisableMemoTransferConfig,
    options: AccountExtensionOptions
  ): Promise<AccountExtensionResult> {
    try {
      // Step 1: Validate configuration
      const validation = this.validateMemoTransferConfig(config);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      // Step 2: Create RPC connection
      const rpc = options.rpcUrl 
        ? createCustomRpc(options.rpcUrl)
        : createModernRpc(options.network);

      // Step 3: Create signer (account owner)
      const owner = await this.createSignerFromPrivateKey(options.ownerPrivateKey);

      await logActivity({
        action: 'solana_disable_memo_transfer_started',
        entity_type: 'token_account',
        entity_id: config.tokenAccount,
        details: {
          network: options.network
        }
      });

      // Step 4: Build disable memo transfer instruction
      const disableMemoInstruction = getDisableMemoTransfersInstruction({
        token: config.tokenAccount,
        owner: owner
      });

      // Step 5: Get latest blockhash
      const { value: latestBlockhash } = await rpc.getRpc().getLatestBlockhash().send();

      // Step 6: Create transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(owner, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([disableMemoInstruction], tx)
      );

      // Step 7: Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

      // Step 8: Send and confirm transaction
      const signature = getSignatureFromTransaction(signedTransaction);
      const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);

      await rpc.sendRawTransaction(encodedTransaction, { skipPreflight: false });
      
      // Wait for confirmation
      const confirmed = await rpc.waitForConfirmation(signature, 'confirmed');
      
      if (!confirmed) {
        throw new Error('Disable memo transfer transaction failed to confirm');
      }

      await logActivity({
        action: 'solana_disable_memo_transfer_completed',
        entity_type: 'token_account',
        entity_id: config.tokenAccount,
        details: {
          signature,
          network: options.network
        }
      });

      return {
        success: true,
        signature,
        explorerUrl: this.getExplorerUrl(signature, options.network)
      };

    } catch (error) {
      const solanaError = handleSolanaError.generic(error);
      
      await logActivity({
        action: 'solana_disable_memo_transfer_failed',
        entity_type: 'token_account',
        entity_id: config.tokenAccount,
        details: {
          error: solanaError.message,
          network: options.network
        }
      });

      return {
        success: false,
        errors: [solanaError.userMessage]
      };
    }
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  /**
   * Validate MemoTransfer configuration
   */
  private validateMemoTransferConfig(
    config: EnableMemoTransferConfig | DisableMemoTransferConfig
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate token account address
    if (!config.tokenAccount) {
      errors.push('Token account address is required');
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
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const modernSolanaAccountExtensionsService = new ModernSolanaAccountExtensionsService();
