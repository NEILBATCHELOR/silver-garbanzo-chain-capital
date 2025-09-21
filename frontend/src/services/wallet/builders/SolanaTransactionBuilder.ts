/**
 * Solana Transaction Builder
 * Real Solana transaction building using @solana/web3.js
 * Supports Solana mainnet and devnet with real transaction creation
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  TransactionSignature,
  SendOptions,
  ConfirmOptions,
  Commitment,
  BlockhashWithExpiryBlockHeight,
  VersionedTransaction,
  TransactionMessage,
  AddressLookupTableAccount
} from '@solana/web3.js';
import bs58 from 'bs58';
import { rpcManager } from '../../../infrastructure/web3/rpc/RPCConnectionManager';
import type { SupportedChain, NetworkType } from '../../../infrastructure/web3/adapters/IBlockchainAdapter';
import { ChainType } from '../AddressUtils';
import { addressUtils } from '../AddressUtils';

// ============================================================================
// SOLANA-SPECIFIC INTERFACES
// ============================================================================

export interface SolanaTransactionRequest {
  from: string;
  to: string;
  value: number; // in lamports (1 SOL = 1e9 lamports)
  memo?: string;
  recentBlockhash?: string;
  computeUnitPrice?: number; // micro-lamports per compute unit
  computeUnitLimit?: number; // max compute units
  priorityFee?: number; // additional fee in lamports
}

export interface SolanaGasEstimate {
  baseFee: number; // lamports
  priorityFee: number; // lamports
  computeUnitPrice: number; // micro-lamports per CU
  computeUnitLimit: number; // max compute units
  totalFee: number; // lamports
  totalFeeSOL: string; // SOL format
  totalFeeUsd?: number;
}

export interface SolanaSignedTransaction {
  transaction: Transaction | VersionedTransaction;
  serialized: string;
  signature?: string;
  signatures: string[];
  feePayer: string;
  recentBlockhash: string;
}

export interface SolanaBroadcastResult {
  success: boolean;
  signature?: string;
  confirmations?: number;
  slot?: number;
  error?: string;
  logs?: string[];
}

export interface SolanaTransactionBuilderConfig {
  chainId: number;
  chainName: string;
  networkType: 'mainnet' | 'devnet';
  rpcUrl?: string;
  wsUrl?: string;
  symbol: string;
  decimals: number;
  commitment?: Commitment;
  timeout?: number;
  confirmOptions?: ConfirmOptions;
}

// ============================================================================
// SOLANA TRANSACTION BUILDER
// ============================================================================

export class SolanaTransactionBuilder {
  private connection: Connection | null = null;
  private readonly config: SolanaTransactionBuilderConfig;
  private readonly commitment: Commitment;

  constructor(config: SolanaTransactionBuilderConfig) {
    this.config = config;
    this.commitment = config.commitment || 'confirmed';
    this.initializeConnection();
  }

  private initializeConnection(): void {
    const rpcUrl = this.getRpcUrl();
    if (rpcUrl) {
      this.connection = new Connection(rpcUrl, {
        commitment: this.commitment,
        wsEndpoint: this.config.wsUrl,
      });
    }
  }

  /**
   * Validate Solana transaction parameters
   */
  async validateTransaction(tx: SolanaTransactionRequest): Promise<boolean> {
    // Validate addresses using AddressUtils
    const fromValid = addressUtils.validateAddress(tx.from, ChainType.SOLANA, this.config.networkType);
    const toValid = addressUtils.validateAddress(tx.to, ChainType.SOLANA, this.config.networkType);
    
    if (!fromValid.isValid) {
      throw new Error(`Invalid from address: ${fromValid.error}`);
    }
    
    if (!toValid.isValid) {
      throw new Error(`Invalid to address: ${toValid.error}`);
    }

    // Validate value
    if (tx.value <= 0) {
      throw new Error('Transaction value must be greater than 0');
    }

    if (tx.value > 1000000 * LAMPORTS_PER_SOL) {
      throw new Error('Transaction value exceeds reasonable limit');
    }

    // Validate public keys can be created
    try {
      new PublicKey(tx.from);
      new PublicKey(tx.to);
    } catch (error) {
      throw new Error(`Invalid Solana address format: ${error.message}`);
    }

    return true;
  }

  /**
   * Estimate Solana transaction fees
   */
  async estimateGas(tx: SolanaTransactionRequest): Promise<SolanaGasEstimate> {
    if (!this.connection) {
      throw new Error(`${this.config.chainName} connection not initialized`);
    }

    await this.validateTransaction(tx);

    try {
      // Get recent blockhash for fee calculation
      const { blockhash } = await this.connection.getLatestBlockhash(this.commitment);

      // Create a sample transaction to estimate fees
      const fromPubkey = new PublicKey(tx.from);
      const toPubkey = new PublicKey(tx.to);

      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPubkey,
      });

      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: tx.value,
        })
      );

      // Add memo if provided
      if (tx.memo) {
        const memoInstruction = {
          keys: [],
          programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
          data: Buffer.from(tx.memo, 'utf8'),
        };
        transaction.add(memoInstruction);
      }

      // Get base fee (5000 lamports per signature)
      const baseFee = 5000;

      // Get priority fee (if specified or estimate)
      const priorityFee = tx.priorityFee || 0;

      // Compute unit settings
      const computeUnitLimit = tx.computeUnitLimit || 200000; // default for simple transfer
      const computeUnitPrice = tx.computeUnitPrice || 1; // micro-lamports per CU

      // Total fee calculation
      const computeFee = Math.ceil((computeUnitLimit * computeUnitPrice) / 1000000); // convert micro-lamports to lamports
      const totalFee = baseFee + priorityFee + computeFee;
      const totalFeeSOL = (totalFee / LAMPORTS_PER_SOL).toFixed(9);

      // Get USD estimate (optional)
      let totalFeeUsd: number | undefined;
      try {
        const solPrice = await this.getSOLPriceUSD();
        if (solPrice) {
          totalFeeUsd = parseFloat(totalFeeSOL) * solPrice;
        }
      } catch (error) {
        console.warn('Failed to get SOL price for USD estimation:', error);
      }

      return {
        baseFee,
        priorityFee,
        computeUnitPrice,
        computeUnitLimit,
        totalFee,
        totalFeeSOL,
        totalFeeUsd
      };

    } catch (error) {
      throw new Error(`Solana gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Sign Solana transaction using private key
   */
  async signTransaction(tx: SolanaTransactionRequest, privateKey: string): Promise<SolanaSignedTransaction> {
    if (!this.connection) {
      throw new Error(`${this.config.chainName} connection not initialized`);
    }

    await this.validateTransaction(tx);

    try {
      // Create keypair from private key
      const keypair = this.createKeypair(privateKey);
      
      // Verify keypair matches from address
      if (keypair.publicKey.toString() !== tx.from) {
        throw new Error('Private key does not match from address');
      }

      // Get recent blockhash
      const recentBlockhash = tx.recentBlockhash || (await this.connection.getLatestBlockhash(this.commitment)).blockhash;

      const fromPubkey = keypair.publicKey;
      const toPubkey = new PublicKey(tx.to);

      // Create transaction
      const transaction = new Transaction({
        recentBlockhash,
        feePayer: fromPubkey,
      });

      // Add compute budget instructions if specified
      if (tx.computeUnitLimit) {
        const computeBudgetProgram = new PublicKey('ComputeBudget111111111111111111111111111111');
        transaction.add({
          keys: [],
          programId: computeBudgetProgram,
          data: Buffer.from([2, ...new Uint8Array(new Uint32Array([tx.computeUnitLimit]).buffer)]),
        });
      }

      if (tx.computeUnitPrice) {
        const computeBudgetProgram = new PublicKey('ComputeBudget111111111111111111111111111111');
        transaction.add({
          keys: [],
          programId: computeBudgetProgram,
          data: Buffer.from([3, ...new Uint8Array(new BigUint64Array([BigInt(tx.computeUnitPrice)]).buffer)]),
        });
      }

      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: tx.value,
        })
      );

      // Add memo if provided
      if (tx.memo) {
        const memoInstruction = {
          keys: [],
          programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
          data: Buffer.from(tx.memo, 'utf8'),
        };
        transaction.add(memoInstruction);
      }

      // Sign transaction
      transaction.sign(keypair);

      // Serialize transaction
      const serialized = transaction.serialize().toString('base64');
      const signatures = transaction.signatures.map(sig => sig.signature ? bs58.encode(sig.signature) : '');

      return {
        transaction,
        serialized,
        signature: signatures[0],
        signatures,
        feePayer: fromPubkey.toString(),
        recentBlockhash
      };

    } catch (error) {
      throw new Error(`Solana transaction signing failed: ${error.message}`);
    }
  }

  /**
   * Broadcast Solana transaction
   */
  async broadcastTransaction(signedTx: SolanaSignedTransaction): Promise<SolanaBroadcastResult> {
    if (!this.connection) {
      throw new Error(`${this.config.chainName} connection not initialized`);
    }

    try {
      const sendOptions: SendOptions = {
        skipPreflight: false,
        preflightCommitment: this.commitment,
        maxRetries: 3,
      };

      const signature = await this.connection.sendRawTransaction(
        Buffer.from(signedTx.serialized, 'base64'),
        sendOptions
      );

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash: signedTx.recentBlockhash,
        lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight,
      }, this.commitment);

      if (confirmation.value.err) {
        return {
          success: false,
          signature,
          error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        };
      }

      // Get transaction details for additional info
      // Convert Commitment to Finality (getTransaction only accepts 'confirmed' | 'finalized')
      const finality: 'confirmed' | 'finalized' = this.commitment === 'processed' ? 'confirmed' : this.commitment as 'confirmed' | 'finalized';
      const txDetails = await this.connection.getTransaction(signature, {
        commitment: finality,
        maxSupportedTransactionVersion: 0,
      });

      return {
        success: true,
        signature,
        slot: txDetails?.slot,
        confirmations: 1, // Solana doesn't use confirmations like Bitcoin/Ethereum
        logs: txDetails?.meta?.logMessages,
      };

    } catch (error) {
      return {
        success: false,
        error: `Solana broadcast failed: ${error.message}`
      };
    }
  }

  /**
   * Get transaction status and confirmation
   */
  async getTransactionStatus(signature: string): Promise<{
    confirmed: boolean;
    finalized: boolean;
    slot?: number;
    confirmations?: number;
    logs?: string[];
  }> {
    if (!this.connection) {
      throw new Error('Connection not initialized');
    }

    try {
      const status = await this.connection.getSignatureStatus(signature);
      
      if (!status.value) {
        return { confirmed: false, finalized: false };
      }

      const confirmed = status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized';
      const finalized = status.value.confirmationStatus === 'finalized';

      // Get transaction details if confirmed
      let logs: string[] | undefined;
      if (confirmed) {
        const txDetails = await this.connection.getTransaction(signature);
        logs = txDetails?.meta?.logMessages;
      }

      return {
        confirmed,
        finalized,
        slot: status.value.slot,
        confirmations: confirmed ? 1 : 0,
        logs
      };

    } catch (error) {
      console.error(`Failed to get transaction status for ${signature}:`, error);
      return { confirmed: false, finalized: false };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string): Promise<number> {
    if (!this.connection) {
      throw new Error('Connection not initialized');
    }

    try {
      const publicKey = new PublicKey(address);
      return await this.connection.getBalance(publicKey, this.commitment);
    } catch (error) {
      console.error(`Failed to get balance for ${address}:`, error);
      return 0;
    }
  }

  /**
   * Get account info including token accounts
   */
  async getAccountInfo(address: string): Promise<any> {
    if (!this.connection) {
      throw new Error('Connection not initialized');
    }

    try {
      const publicKey = new PublicKey(address);
      return await this.connection.getAccountInfo(publicKey, this.commitment);
    } catch (error) {
      console.error(`Failed to get account info for ${address}:`, error);
      return null;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private createKeypair(privateKey: string): Keypair {
    try {
      // Handle different private key formats
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

      return Keypair.fromSecretKey(keyBytes);

    } catch (error) {
      throw new Error(`Invalid Solana private key: ${error.message}`);
    }
  }

  private async getSOLPriceUSD(): Promise<number | null> {
    try {
      // In production, integrate with your price feed service
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      return data.solana?.usd || null;
    } catch {
      return null;
    }
  }

  private getRpcUrl(): string | null {
    try {
      const provider = rpcManager.getOptimalProvider(
        'solana' as SupportedChain,
        this.config.networkType as NetworkType
      );
      return provider?.config.url || this.config.rpcUrl || null;
    } catch {
      return this.config.rpcUrl || null;
    }
  }
}

// ============================================================================
// CHAIN-SPECIFIC SOLANA BUILDERS
// ============================================================================

export const SolanaMainnetTransactionBuilder = () => {
  return new SolanaTransactionBuilder({
    chainId: 101,
    chainName: 'Solana',
    networkType: 'mainnet',
    rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL,
    wsUrl: import.meta.env.VITE_SOLANA_RPC_URL?.replace('https://', 'wss://'),
    symbol: 'SOL',
    decimals: 9,
    commitment: 'confirmed',
    timeout: 30000,
    confirmOptions: {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    }
  });
};

export const SolanaDevnetTransactionBuilder = () => {
  return new SolanaTransactionBuilder({
    chainId: 103,
    chainName: 'Solana Devnet',
    networkType: 'devnet',
    rpcUrl: import.meta.env.VITE_SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
    wsUrl: 'wss://api.devnet.solana.com',
    symbol: 'SOL',
    decimals: 9,
    commitment: 'confirmed',
    timeout: 30000,
    confirmOptions: {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    }
  });
};

// Export convenience function
export const getSolanaTransactionBuilder = (networkType: 'mainnet' | 'devnet' = 'mainnet') => {
  return networkType === 'mainnet' ? SolanaMainnetTransactionBuilder() : SolanaDevnetTransactionBuilder();
};
