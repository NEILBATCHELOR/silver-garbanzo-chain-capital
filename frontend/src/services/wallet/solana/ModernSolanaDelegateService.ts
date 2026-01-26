/**
 * Modern Solana Delegate Service
 * 
 * Handles approve and revoke delegate operations using modern @solana/kit
 * Following official Solana documentation:
 * - https://solana.com/docs/tokens/basics/approve-delegate#typescript
 * - https://solana.com/docs/tokens/basics/revoke-delegate#typescript
 * 
 * Use this when you need to:
 * - Allow another address to transfer/burn tokens on your behalf
 * - Grant spending limits to protocols (staking, lending, etc.)
 * - Revoke delegate permissions
 * 
 * ARCHITECTURE: Modern @solana/kit + @solana-program/token
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
  sendAndConfirmTransactionFactory,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  assertIsSendableTransaction,
  assertIsTransactionWithBlockhashLifetime,
  type Address,
  type KeyPairSigner
} from '@solana/kit';

import {
  TOKEN_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
  getApproveCheckedInstruction,
  getRevokeInstruction
} from '@solana-program/token';

import {
  TOKEN_2022_PROGRAM_ADDRESS,
  findAssociatedTokenPda as findToken2022AssociatedTokenPda,
  getApproveCheckedInstruction as getToken2022ApproveCheckedInstruction,
  getRevokeInstruction as getToken2022RevokeInstruction
} from '@solana-program/token-2022';

import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { logActivity } from '@/infrastructure/activityLogger';
import { address } from '@solana/kit';
import bs58 from 'bs58';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ApproveDelegateConfig {
  mintAddress: string; // The token mint address
  ownerAddress: string; // Token account owner (your wallet)
  delegateAddress: string; // Address to approve as delegate
  amount: bigint; // Amount delegate can transfer (in smallest units)
  decimals: number; // Token decimals (for ApproveChecked safety)
}

export interface ApproveDelegateOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  ownerPrivateKey: string; // Private key of token account owner
}

export interface ApproveDelegateResult {
  success: boolean;
  signature?: string;
  tokenAccount?: Address; // The token account that had delegate approved
  explorerUrl?: string;
  errors?: string[];
}

export interface RevokeDelegateConfig {
  mintAddress: string; // The token mint address
  ownerAddress: string; // Token account owner (your wallet)
}

export interface RevokeDelegateOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  ownerPrivateKey: string; // Private key of token account owner
}

export interface RevokeDelegateResult {
  success: boolean;
  signature?: string;
  tokenAccount?: Address; // The token account that had delegate revoked
  explorerUrl?: string;
  errors?: string[];
}

// ============================================================================
// MODERN SOLANA DELEGATE SERVICE
// ============================================================================

export class ModernSolanaDelegateService {
  /**
   * Approve a delegate to transfer/burn tokens on behalf of owner
   * Following official Solana documentation pattern
   */
  async approveDelegate(
    config: ApproveDelegateConfig,
    options: ApproveDelegateOptions
  ): Promise<ApproveDelegateResult> {
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

      // Detect token program
      const tokenProgramAddress = await this.detectTokenProgram(config.mintAddress, rpcUrl);
      const isToken2022 = tokenProgramAddress === TOKEN_2022_PROGRAM_ADDRESS;

      console.log('🔧 Token Program Detection (Approve):', {
        mint: config.mintAddress,
        program: isToken2022 ? 'Token-2022' : 'SPL Token',
        programAddress: tokenProgramAddress
      });

      const rpc = createSolanaRpc(rpcUrl);
      const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

      // Step 2: Create owner signer
      const owner = await this.createSignerFromPrivateKey(options.ownerPrivateKey);

      await logActivity({
        action: 'solana_approve_delegate_started',
        entity_type: 'token',
        entity_id: config.mintAddress,
        details: {
          delegateAddress: config.delegateAddress,
          amount: config.amount.toString(),
          network: options.network,
          tokenProgram: isToken2022 ? 'Token-2022' : 'SPL Token'
        }
      });

      // Step 3: Derive owner's Associated Token Account (ATA) using correct program
      const [tokenAccount] = isToken2022
        ? await findToken2022AssociatedTokenPda({
            owner: address(config.ownerAddress),
            mint: address(config.mintAddress),
            tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
          })
        : await findAssociatedTokenPda({
            owner: address(config.ownerAddress),
            mint: address(config.mintAddress),
            tokenProgram: TOKEN_PROGRAM_ADDRESS
          });

      console.log('🎯 Approve Delegate Details:', {
        mintAddress: config.mintAddress,
        ownerAddress: config.ownerAddress,
        delegateAddress: config.delegateAddress,
        tokenAccount,
        amount: config.amount.toString(),
        decimals: config.decimals,
        network: options.network
      });

      // Step 4: Get latest blockhash
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      // Step 5: Build approve instruction using correct program
      const approveInstruction = isToken2022
        ? getToken2022ApproveCheckedInstruction({
            source: tokenAccount,
            mint: address(config.mintAddress),
            delegate: address(config.delegateAddress),
            owner: owner,
            amount: config.amount,
            decimals: config.decimals
          })
        : getApproveCheckedInstruction({
            source: tokenAccount,
            mint: address(config.mintAddress),
            delegate: address(config.delegateAddress),
            owner: owner,
            amount: config.amount,
            decimals: config.decimals
          });

      console.log('📝 Approve Instruction:', {
        programAddress: approveInstruction.programAddress,
        accounts: approveInstruction.accounts.length
      });

      // Step 6: Create, sign, and send transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(owner, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([approveInstruction], tx)
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
        action: 'solana_approve_delegate_completed',
        entity_type: 'token',
        entity_id: config.mintAddress,
        details: {
          signature,
          delegateAddress: config.delegateAddress,
          tokenAccount,
          amount: config.amount.toString(),
          network: options.network
        }
      });

      return {
        success: true,
        signature,
        tokenAccount,
        explorerUrl
      };

    } catch (error) {
      console.error('Approve delegate error:', error);

      await logActivity({
        action: 'solana_approve_delegate_failed',
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

  /**
   * Revoke all delegate permissions from a token account
   * Following official Solana documentation pattern
   */
  async revokeDelegate(
    config: RevokeDelegateConfig,
    options: RevokeDelegateOptions
  ): Promise<RevokeDelegateResult> {
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

      // Detect token program
      const tokenProgramAddress = await this.detectTokenProgram(config.mintAddress, rpcUrl);
      const isToken2022 = tokenProgramAddress === TOKEN_2022_PROGRAM_ADDRESS;

      console.log('🔧 Token Program Detection (Revoke):', {
        mint: config.mintAddress,
        program: isToken2022 ? 'Token-2022' : 'SPL Token',
        programAddress: tokenProgramAddress
      });

      const rpc = createSolanaRpc(rpcUrl);
      const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

      // Step 2: Create owner signer
      const owner = await this.createSignerFromPrivateKey(options.ownerPrivateKey);

      await logActivity({
        action: 'solana_revoke_delegate_started',
        entity_type: 'token',
        entity_id: config.mintAddress,
        details: {
          ownerAddress: config.ownerAddress,
          network: options.network,
          tokenProgram: isToken2022 ? 'Token-2022' : 'SPL Token'
        }
      });

      // Step 3: Derive owner's Associated Token Account (ATA) using correct program
      const [tokenAccount] = isToken2022
        ? await findToken2022AssociatedTokenPda({
            owner: address(config.ownerAddress),
            mint: address(config.mintAddress),
            tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
          })
        : await findAssociatedTokenPda({
            owner: address(config.ownerAddress),
            mint: address(config.mintAddress),
            tokenProgram: TOKEN_PROGRAM_ADDRESS
          });

      console.log('🎯 Revoke Delegate Details:', {
        mintAddress: config.mintAddress,
        ownerAddress: config.ownerAddress,
        tokenAccount,
        network: options.network
      });

      // Step 4: Get latest blockhash
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      // Step 5: Build revoke instruction using correct program
      const revokeInstruction = isToken2022
        ? getToken2022RevokeInstruction({
            source: tokenAccount,
            owner: owner
          })
        : getRevokeInstruction({
            source: tokenAccount,
            owner: owner
          });

      console.log('📝 Revoke Instruction:', {
        programAddress: revokeInstruction.programAddress,
        accounts: revokeInstruction.accounts.length
      });

      // Step 6: Create, sign, and send transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(owner, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([revokeInstruction], tx)
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
        action: 'solana_revoke_delegate_completed',
        entity_type: 'token',
        entity_id: config.mintAddress,
        details: {
          signature,
          tokenAccount,
          network: options.network
        }
      });

      return {
        success: true,
        signature,
        tokenAccount,
        explorerUrl
      };

    } catch (error) {
      console.error('Revoke delegate error:', error);

      await logActivity({
        action: 'solana_revoke_delegate_failed',
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
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Detect which token program a mint uses by checking the account owner
   */
  private async detectTokenProgram(
    mintAddress: string,
    rpcUrl: string
  ): Promise<Address> {
    try {
      const rpc = createSolanaRpc(rpcUrl);

      const accountInfo = await rpc.getAccountInfo(address(mintAddress), { encoding: 'base64' }).send();

      if (!accountInfo.value) {
        throw new Error(`Mint account ${mintAddress} not found`);
      }

      const owner = accountInfo.value.owner;

      if (owner === TOKEN_2022_PROGRAM_ADDRESS) {
        return TOKEN_2022_PROGRAM_ADDRESS;
      }

      if (owner === TOKEN_PROGRAM_ADDRESS) {
        return TOKEN_PROGRAM_ADDRESS;
      }

      throw new Error(`Mint ${mintAddress} has unknown owner: ${owner}`);

    } catch (error) {
      console.error('Error detecting token program:', error);
      throw error;
    }
  }

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
   * Get Solana Explorer URL for transaction
   */
  private getExplorerUrl(signature: string, network: SolanaNetwork): string {
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

export const modernSolanaDelegateService = new ModernSolanaDelegateService();
