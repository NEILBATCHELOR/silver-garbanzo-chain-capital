/**
 * Modern Solana Token Transfer Service
 * 
 * Handles SPL token transfers using modern @solana/kit and @solana-program/token
 * Supports:
 * - Basic transfers between accounts
 * - Automatic ATA creation for destination
 * - Delegate transfers
 * - Fee estimation
 * - Transaction confirmation
 * 
 * ARCHITECTURE: Modern @solana/kit + @solana-program/token
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
  getTransferCheckedInstruction,
  getCreateAssociatedTokenIdempotentInstruction,
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

export interface TokenTransferParams {
  mint: Address; // Token mint address
  from: Address; // Source wallet address
  to: Address; // Destination wallet address
  amount: bigint; // Amount in smallest units (with decimals)
  decimals: number; // Token decimals
  memo?: string; // Optional transfer memo
}

export interface ModernTokenTransferOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  signerPrivateKey: string; // Base58 or hex encoded private key
  createDestinationATA?: boolean; // Auto-create destination ATA if not exists (default: true)
}

export interface SolanaTransferResult {
  success: boolean;
  signature?: string;
  sourceATA?: Address;
  destinationATA?: Address;
  explorerUrl?: string;
  confirmationTime?: number;
  errors?: string[];
}

export interface FeeEstimate {
  estimatedFee: bigint; // In lamports
  priorityFee?: bigint; // Optional priority fee
  totalFee: bigint; // Total fee including priority
}

// ============================================================================
// MODERN SOLANA TOKEN TRANSFER SERVICE
// ============================================================================

export class ModernSolanaTokenTransferService {
  /**
   * Transfer SPL tokens from one wallet to another
   * Automatically creates destination ATA if needed
   */
  async transferTokens(
    params: TokenTransferParams,
    options: ModernTokenTransferOptions
  ): Promise<SolanaTransferResult> {
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

      // Step 3: Find or create ATAs
      const { sourceATA, destinationATA, instructions } = await this.prepareATAs(
        params.mint,
        params.from,
        params.to,
        signer,
        rpc,
        options.createDestinationATA ?? true
      );

      // Step 4: Build transfer instruction
      const transferInstruction = getTransferCheckedInstruction({
        source: sourceATA,
        mint: params.mint,
        destination: destinationATA,
        authority: signer,
        amount: params.amount,
        decimals: params.decimals
      });

      instructions.push(transferInstruction);

      // Step 5: Build, sign, and send transaction
      const { value: latestBlockhash } = await rpc.getRpc()
        .getLatestBlockhash()
        .send();

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      );

      const signedTx = await signTransactionMessageWithSigners(transactionMessage);
      const signature = getSignatureFromTransaction(signedTx);
      const encodedTx = getBase64EncodedWireTransaction(signedTx);

      // Step 6: Send transaction
      await rpc.sendRawTransaction(encodedTx, { skipPreflight: false });

      // Step 7: Wait for confirmation
      const confirmed = await rpc.waitForConfirmation(signature);

      if (!confirmed) {
        return {
          success: false,
          errors: ['Transaction failed to confirm']
        };
      }

      const confirmationTime = Date.now() - startTime;
      const explorerUrl = this.getExplorerUrl(signature, options.network);

      // Step 8: Log activity
      await logActivity({
        action: 'solana_token_transfer',
        entity_type: 'token',
        details: {
          mint: params.mint,
          from: params.from,
          to: params.to,
          amount: params.amount.toString(),
          decimals: params.decimals,
          signature,
          network: options.network,
          confirmationTimeMs: confirmationTime
        }
      });

      return {
        success: true,
        signature,
        sourceATA,
        destinationATA,
        explorerUrl,
        confirmationTime
      };

    } catch (error) {
      console.error('Token transfer error:', error);
      
      // Use error handler to create user-friendly error
      const solanaError = handleSolanaError.transfer(error, options.network);
      
      return {
        success: false,
        errors: [solanaError.userMessage, solanaError.suggestedAction].filter(Boolean) as string[]
      };
    }
  }

  /**
   * Transfer tokens as a delegate
   * Used for staking, marketplace approvals, etc.
   */
  async transferAsDelegate(
    params: TokenTransferParams,
    delegatePrivateKey: string,
    options: Omit<ModernTokenTransferOptions, 'signerPrivateKey'>
  ): Promise<SolanaTransferResult> {
    return this.transferTokens(params, {
      ...options,
      signerPrivateKey: delegatePrivateKey
    });
  }

  /**
   * Estimate transfer fee
   */
  async estimateTransferFee(
    params: TokenTransferParams,
    options: ModernTokenTransferOptions
  ): Promise<FeeEstimate> {
    try {
      const rpc = this.createRpc(options.network, options.rpcUrl);
      
      // Base transaction fee (5000 lamports per signature)
      const baseFee = lamports(5000n);
      
      // Account creation fee if needed
      let accountCreationFee = lamports(0n);
      const [destATA] = await findAssociatedTokenPda({
        owner: params.to,
        mint: params.mint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS
      });

      // Check if destination ATA exists
      try {
        await rpc.getRpc().getAccountInfo(destATA).send();
      } catch {
        // ATA doesn't exist, need to create it (~0.00203928 SOL)
        accountCreationFee = lamports(2039280n);
      }

      const totalFee = baseFee + accountCreationFee;

      return {
        estimatedFee: baseFee,
        totalFee
      };

    } catch (error) {
      console.error('Fee estimation error:', error);
      
      // Return conservative estimate
      return {
        estimatedFee: lamports(5000n),
        totalFee: lamports(2044280n) // Assume ATA creation needed
      };
    }
  }

  /**
   * Get token account balance
   */
  async getTokenBalance(
    mint: Address,
    owner: Address,
    network: SolanaNetwork,
    rpcUrl?: string
  ): Promise<bigint> {
    try {
      const rpc = this.createRpc(network, rpcUrl);
      
      const [ata] = await findAssociatedTokenPda({
        owner,
        mint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS
      });

      const accountInfo = await rpc.getRpc().getAccountInfo(ata).send();
      
      if (!accountInfo.value) {
        return 0n;
      }

      // Decode token account data
      // First 64 bytes contain: mint (32), owner (32)
      // Next 8 bytes contain the amount
      const data = accountInfo.value.data;
      const amountBytes = data.slice(64, 72);
      
      // Convert little-endian bytes to bigint
      let amount = 0n;
      for (let i = 0; i < 8; i++) {
        amount += BigInt(amountBytes[i]) << BigInt(i * 8);
      }

      return amount;

    } catch (error) {
      console.error('Error fetching token balance:', error);
      return 0n;
    }
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
   * Prepare source and destination ATAs
   * Creates destination ATA if needed
   */
  private async prepareATAs(
    mint: Address,
    from: Address,
    to: Address,
    signer: KeyPairSigner,
    rpc: ModernSolanaRpc,
    createDestination: boolean
  ): Promise<{
    sourceATA: Address;
    destinationATA: Address;
    instructions: Instruction[];
  }> {
    const instructions: Instruction[] = [];

    // Find source ATA
    const [sourceATA] = await findAssociatedTokenPda({
      owner: from,
      mint,
      tokenProgram: TOKEN_PROGRAM_ADDRESS
    });

    // Find destination ATA
    const [destinationATA] = await findAssociatedTokenPda({
      owner: to,
      mint,
      tokenProgram: TOKEN_PROGRAM_ADDRESS
    });

    // Check if destination ATA exists
    if (createDestination) {
      // Create destination ATA if it doesn't exist (idempotent)
      const createATAInstruction = getCreateAssociatedTokenIdempotentInstruction({
        payer: signer,
        ata: destinationATA,
        owner: to,
        mint
      });

      instructions.push(createATAInstruction);
    }

    return {
      sourceATA,
      destinationATA,
      instructions
    };
  }

  /**
   * Get wallet address from private key
   */
  async getAddressFromPrivateKey(privateKey: string): Promise<Address> {
    const signer = await this.createSigner(privateKey);
    return signer.address;
  }

  /**
   * Create signer from private key (PUBLIC for address derivation)
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
  private validateTransferParams(params: TokenTransferParams): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate addresses
    if (!params.mint) {
      errors.push('Token mint address is required');
    }

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

    // Validate decimals
    if (params.decimals < 0 || params.decimals > 9) {
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
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const modernSolanaTokenTransferService = new ModernSolanaTokenTransferService();
