/**
 * Simple Solana Token Transfer Service
 * 
 * Alternative implementation following the official Solana sample code pattern
 * Uses basic getTransferInstruction (unchecked) for direct, straightforward transfers
 * 
 * ARCHITECTURE: Modern @solana/kit + @solana-program/token
 * REFERENCE: https://solana.com/docs/tokens/basics/transfer-tokens#typescript
 */

import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createKeyPairSignerFromBytes,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  address,
  lamports,
  type Address,
  type KeyPairSigner
} from '@solana/kit';

import {
  TOKEN_PROGRAM_ADDRESS,
  getTransferInstruction,
  getCreateAssociatedTokenInstructionAsync,
  findAssociatedTokenPda,
  fetchToken
} from '@solana-program/token';

import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { logActivity } from '@/infrastructure/activityLogger';
import bs58 from 'bs58';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SimpleTransferParams {
  mint: Address; // Token mint address
  from: Address; // Source wallet address (owner)
  to: Address; // Destination wallet address
  amount: bigint; // Amount in smallest units (raw amount, not adjusted for decimals)
  memo?: string; // Optional transfer memo
}

export interface SimpleTransferOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  signerPrivateKey: string; // Base58 or hex encoded private key
}

export interface SimpleTransferResult {
  success: boolean;
  signature?: string;
  sourceATA?: Address;
  destinationATA?: Address;
  explorerUrl?: string;
  error?: string;
}

// ============================================================================
// SIMPLE SOLANA TOKEN TRANSFER SERVICE
// ============================================================================

/**
 * Simple Token Transfer Service
 * 
 * Follows the official Solana documentation pattern:
 * 1. Find/create sender ATA
 * 2. Find/create recipient ATA  
 * 3. Create transfer instruction
 * 4. Build, sign, and send transaction
 * 
 * Uses unchecked transfer instruction for simplicity
 */
export class SimpleSolanaTokenTransferService {
  /**
   * Transfer SPL tokens using the simple, direct approach
   * Based on: https://solana.com/docs/tokens/basics/transfer-tokens#typescript
   */
  async transferTokens(
    params: SimpleTransferParams,
    options: SimpleTransferOptions
  ): Promise<SimpleTransferResult> {
    try {
      console.log('🚀 Starting simple token transfer...');
      console.log(`   Mint: ${params.mint}`);
      console.log(`   From: ${params.from}`);
      console.log(`   To: ${params.to}`);
      console.log(`   Amount: ${params.amount}`);

      // Step 1: Create RPC connections (direct, not wrapped)
      const rpcUrl = this.getRpcUrl(options.network, options.rpcUrl);
      const wsUrl = this.getWsUrl(options.network, options.rpcUrl);
      
      const rpc = createSolanaRpc(rpcUrl);
      const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

      // Step 2: Create signer from private key
      const signer = await this.createSigner(options.signerPrivateKey);

      // Step 3: Derive the ATAs for sender and recipient
      const [senderATA] = await findAssociatedTokenPda({
        mint: params.mint,
        owner: params.from,
        tokenProgram: TOKEN_PROGRAM_ADDRESS
      });

      const [recipientATA] = await findAssociatedTokenPda({
        mint: params.mint,
        owner: params.to,
        tokenProgram: TOKEN_PROGRAM_ADDRESS
      });

      console.log(`   Sender ATA: ${senderATA}`);
      console.log(`   Recipient ATA: ${recipientATA}`);

      // Step 4: Create recipient ATA if needed (idempotent - won't fail if exists)
      const createRecipientAtaInstruction = await getCreateAssociatedTokenInstructionAsync({
        payer: signer,
        mint: params.mint,
        owner: params.to
      });

      // Step 5: Create transfer instruction (unchecked version)
      const transferInstruction = getTransferInstruction({
        source: senderATA,
        destination: recipientATA,
        authority: signer,
        amount: params.amount
      });

      // Step 6: Get latest blockhash
      const { value: latestBlockhash } = await rpc
        .getLatestBlockhash()
        .send();

      // Step 7: Build transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(
          [createRecipientAtaInstruction, transferInstruction],
          tx
        )
      );

      // Step 8: Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

      // Step 9: Get signature
      const signature = getSignatureFromTransaction(signedTransaction);
      console.log(`   Transaction Signature: ${signature}`);

      // Step 10: Send and confirm transaction
      const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ 
        rpc, 
        rpcSubscriptions 
      });

      // Type assertion: We know this has blockhash lifetime since we used setTransactionMessageLifetimeUsingBlockhash
      await sendAndConfirmTransaction(signedTransaction as any, {
        commitment: 'confirmed'
      });

      console.log('✅ Transfer successful!');

      const explorerUrl = this.getExplorerUrl(signature, options.network);

      // Log activity
      await logActivity({
        action: 'simple_solana_token_transfer',
        entity_type: 'token',
        details: {
          mint: params.mint,
          from: params.from,
          to: params.to,
          amount: params.amount.toString(),
          signature,
          network: options.network
        }
      });

      return {
        success: true,
        signature,
        sourceATA: senderATA,
        destinationATA: recipientATA,
        explorerUrl
      };

    } catch (error) {
      console.error('❌ Transfer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get token balance for an account
   */
  async getTokenBalance(
    mint: Address,
    owner: Address,
    network: SolanaNetwork,
    rpcUrl?: string
  ): Promise<bigint> {
    try {
      const url = this.getRpcUrl(network, rpcUrl);
      const rpc = createSolanaRpc(url);

      const [ata] = await findAssociatedTokenPda({
        owner,
        mint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS
      });

      const tokenAccount = await fetchToken(rpc, ata);
      return tokenAccount.data.amount;

    } catch (error) {
      console.error('Error fetching token balance:', error);
      return 0n;
    }
  }

  /**
   * Verify a transfer by checking balances before and after
   */
  async verifyTransfer(
    params: SimpleTransferParams,
    options: SimpleTransferOptions
  ): Promise<{
    verified: boolean;
    sourceBefore: bigint;
    sourceAfter: bigint;
    destBefore: bigint;
    destAfter: bigint;
  }> {
    const sourceBefore = await this.getTokenBalance(
      params.mint,
      params.from,
      options.network,
      options.rpcUrl
    );

    const destBefore = await this.getTokenBalance(
      params.mint,
      params.to,
      options.network,
      options.rpcUrl
    );

    const result = await this.transferTokens(params, options);

    if (!result.success) {
      return {
        verified: false,
        sourceBefore,
        sourceAfter: sourceBefore,
        destBefore,
        destAfter: destBefore
      };
    }

    // Wait a bit for confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const sourceAfter = await this.getTokenBalance(
      params.mint,
      params.from,
      options.network,
      options.rpcUrl
    );

    const destAfter = await this.getTokenBalance(
      params.mint,
      params.to,
      options.network,
      options.rpcUrl
    );

    const verified = 
      sourceAfter === sourceBefore - params.amount &&
      destAfter === destBefore + params.amount;

    return {
      verified,
      sourceBefore,
      sourceAfter,
      destBefore,
      destAfter
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get RPC URL for network
   */
  private getRpcUrl(network: SolanaNetwork, customUrl?: string): string {
    if (customUrl) {
      return customUrl;
    }

    switch (network) {
      case 'mainnet-beta':
        return 'https://api.mainnet-beta.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      case 'devnet':
        return 'https://api.devnet.solana.com';
      default:
        return 'http://localhost:8899';
    }
  }

  /**
   * Get WebSocket URL for network
   */
  private getWsUrl(network: SolanaNetwork, customUrl?: string): string {
    if (customUrl) {
      return customUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    }

    switch (network) {
      case 'mainnet-beta':
        return 'wss://api.mainnet-beta.solana.com';
      case 'testnet':
        return 'wss://api.testnet.solana.com';
      case 'devnet':
        return 'wss://api.devnet.solana.com';
      default:
        return 'ws://localhost:8900';
    }
  }

  /**
   * Create signer from private key
   * Supports both Base58 and hex formats
   */
  private async createSigner(privateKey: string): Promise<KeyPairSigner> {
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

export const simpleSolanaTokenTransferService = new SimpleSolanaTokenTransferService();
