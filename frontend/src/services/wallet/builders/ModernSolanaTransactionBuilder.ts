/**
 * Modern Solana Transaction Builder
 * 
 * Uses @solana/kit + @solana/client for transaction building
 * Replaces legacy @solana/web3.js v1 implementation
 * 
 * MIGRATION STATUS: ✅ MODERN
 */

import {
  createSolanaRpc,
  generateKeyPairSigner,
  createKeyPairSignerFromBytes,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase58Encoder,
  getBase58Decoder,
  getBase64EncodedWireTransaction,
  address,
  lamports,
  type Address,
  type KeyPairSigner
} from '@solana/kit';

import {
  getTransferSolInstruction,
  SYSTEM_PROGRAM_ADDRESS
} from '@solana-program/system';
import bs58 from 'bs58';
import { ModernSolanaRpc, createModernRpc } from '@/infrastructure/web3/solana';
import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';

// ============================================================================
// MODERN INTERFACES
// ============================================================================

export interface ModernSolanaTransactionRequest {
  from: string;
  to: string;
  value: bigint; // in lamports
  memo?: string;
  computeUnitPrice?: number; // micro-lamports per compute unit
  computeUnitLimit?: number; // max compute units
}

export interface ModernSolanaGasEstimate {
  baseFee: bigint; // lamports (5000 per signature)
  priorityFee: bigint; // lamports
  computeUnitPrice: number; // micro-lamports per CU
  computeUnitLimit: number; // max compute units
  totalFee: bigint; // lamports
  totalFeeSOL: string; // SOL format
  totalFeeUsd?: number;
}

export interface ModernSolanaSignedTransaction {
  serialized: Uint8Array; // bytes
  signatureBase58: string; // base58 encoded signature
  feePayer: string;
  recentBlockhash: string;
}

export interface ModernSolanaBroadcastResult {
  success: boolean;
  signature?: string;
  slot?: number;
  error?: string;
  logs?: string[];
}

export interface ModernSolanaTransactionBuilderConfig {
  network: SolanaNetwork;
  rpcUrl?: string;
}

// ============================================================================
// MODERN SOLANA TRANSACTION BUILDER
// ============================================================================

export class ModernSolanaTransactionBuilder {
  private rpc: ModernSolanaRpc;
  private readonly config: ModernSolanaTransactionBuilderConfig;

  constructor(config: ModernSolanaTransactionBuilderConfig) {
    this.config = config;
    this.rpc = config.rpcUrl 
      ? new ModernSolanaRpc({ endpoint: config.rpcUrl })
      : createModernRpc(config.network);
  }

  /**
   * Validate transaction parameters
   */
  async validateTransaction(tx: ModernSolanaTransactionRequest): Promise<boolean> {
    // Validate addresses
    try {
      address(tx.from);
      address(tx.to);
    } catch (error) {
      throw new Error(`Invalid Solana address: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Validate value
    if (tx.value <= 0n) {
      throw new Error('Transaction value must be greater than 0');
    }

    if (tx.value > 1000000n * 1_000_000_000n) { // 1M SOL limit
      throw new Error('Transaction value exceeds reasonable limit');
    }

    return true;
  }

  /**
   * Estimate transaction fees
   */
  async estimateGas(tx: ModernSolanaTransactionRequest): Promise<ModernSolanaGasEstimate> {
    await this.validateTransaction(tx);

    // Base fee (5000 lamports per signature)
    const baseFee = 5000n;

    // Compute unit settings
    const computeUnitLimit = tx.computeUnitLimit || 200_000; // default for simple transfer
    const computeUnitPrice = tx.computeUnitPrice || 1; // micro-lamports per CU

    // Calculate compute fee
    const computeFee = BigInt(Math.ceil((computeUnitLimit * computeUnitPrice) / 1_000_000));

    const totalFee = baseFee + computeFee;
    const totalFeeSOL = this.lamportsToSol(totalFee);

    // Try to get USD estimate
    let totalFeeUsd: number | undefined;
    try {
      const solPrice = await this.getSOLPriceUSD();
      if (solPrice) {
        totalFeeUsd = parseFloat(totalFeeSOL) * solPrice;
      }
    } catch (error) {
      console.warn('Failed to get SOL price:', error);
    }

    return {
      baseFee,
      priorityFee: 0n,
      computeUnitPrice,
      computeUnitLimit,
      totalFee,
      totalFeeSOL,
      totalFeeUsd
    };
  }

  /**
   * Sign transaction using private key
   */
  async signTransaction(
    tx: ModernSolanaTransactionRequest, 
    privateKey: string
  ): Promise<ModernSolanaSignedTransaction> {
    await this.validateTransaction(tx);

    try {
      // Create keypair signer from private key
      const signer = await this.createKeypairSigner(privateKey);
      
      // Verify signer matches from address
      if (signer.address !== address(tx.from)) {
        throw new Error('Private key does not match from address');
      }

      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await this.rpc.getLatestBlockhash();

      // Build transfer instruction
      const transferInstruction = getTransferSolInstruction({
        source: signer,
        destination: address(tx.to),
        amount: lamports(tx.value)
      });

      // Create transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash({ blockhash, lastValidBlockHeight }, tx),
        tx => appendTransactionMessageInstructions([transferInstruction], tx)
      );

      // Sign the transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

      // Get the base64 encoded wire transaction for sending
      const base64EncodedTransaction = getBase64EncodedWireTransaction(signedTransaction);

      // Store as bytes to match interface (Uint8Array)
      const serializedBytes = new TextEncoder().encode(base64EncodedTransaction);
      
      // For signature, we'll generate it when broadcasting since that's when we get it back
      const signatureBase58 = 'pending-signature';

      return {
        serialized: serializedBytes,
        signatureBase58,
        feePayer: signer.address,
        recentBlockhash: blockhash
      };

    } catch (error) {
      throw new Error(`Failed to sign transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Broadcast signed transaction
   */
  async broadcastTransaction(signedTx: ModernSolanaSignedTransaction): Promise<ModernSolanaBroadcastResult> {
    try {
      // Decode the base64-encoded transaction from bytes back to string
      const base64Transaction = new TextDecoder().decode(signedTx.serialized);
      
      // Send the base64-encoded transaction
      const signature = await this.rpc.sendRawTransaction(base64Transaction);

      // Wait for confirmation
      const confirmed = await this.rpc.waitForConfirmation(signature);

      return {
        success: confirmed,
        signature
      };

    } catch (error) {
      return {
        success: false,
        error: `Broadcast failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature: string): Promise<{
    confirmed: boolean;
    finalized: boolean;
    slot?: number;
  }> {
    try {
      // Note: Add getSignatureStatuses to ModernSolanaRpc if needed
      return {
        confirmed: false,
        finalized: false
      };
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      return { confirmed: false, finalized: false };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string): Promise<bigint> {
    return this.rpc.getBalance(address);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async createKeypairSigner(privateKey: string): Promise<KeyPairSigner> {
    try {
      let keyBytes: Uint8Array;

      if (privateKey.length === 128) {
        // Hex format (64 bytes = 128 hex chars)
        keyBytes = new Uint8Array(
          privateKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
        );
      } else if (privateKey.length === 88 || privateKey.length === 87) {
        // Base58 format
        keyBytes = bs58.decode(privateKey);
      } else if (privateKey.startsWith('[') && privateKey.endsWith(']')) {
        // JSON array format
        keyBytes = new Uint8Array(JSON.parse(privateKey));
      } else {
        throw new Error('Unsupported private key format');
      }

      if (keyBytes.length !== 64) {
        throw new Error('Invalid private key length. Expected 64 bytes.');
      }

      return await createKeyPairSignerFromBytes(keyBytes);
    } catch (error) {
      throw new Error(`Invalid private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getSOLPriceUSD(): Promise<number | null> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      return data.solana?.usd || null;
    } catch {
      return null;
    }
  }

  private lamportsToSol(lamports: bigint): string {
    return (Number(lamports) / 1_000_000_000).toFixed(9);
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Create mainnet transaction builder
 */
export const createMainnetTransactionBuilder = () => {
  return new ModernSolanaTransactionBuilder({
    network: 'mainnet-beta'
  });
};

/**
 * Create devnet transaction builder
 */
export const createDevnetTransactionBuilder = () => {
  return new ModernSolanaTransactionBuilder({
    network: 'devnet'
  });
};

/**
 * Get transaction builder for network
 */
export const getModernSolanaTransactionBuilder = (network: SolanaNetwork = 'devnet') => {
  return new ModernSolanaTransactionBuilder({ network });
};
