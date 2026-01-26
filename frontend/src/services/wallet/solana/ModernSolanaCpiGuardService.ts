/**
 * Modern Solana CPI Guard Service
 * 
 * Handles CPI Guard operations on TOKEN ACCOUNTS (not mints) using modern @solana/kit
 * Following official Solana documentation: https://solana.com/docs/tokens/extensions/cpi-guard
 * 
 * IMPORTANT: CPI Guard is a TOKEN ACCOUNT extension, NOT a mint extension.
 * It must be enabled on individual token accounts AFTER they are created.
 * 
 * What CPI Guard does:
 * - Prevents unauthorized Cross-Program Invocations (CPI) that could drain user funds
 * - When enabled, transfers/burns via CPI must go through a delegate
 * - Close account via CPI can only return lamports to owner
 * - Approve and SetAuthority operations are restricted
 * 
 * ARCHITECTURE: Modern @solana/kit + @solana-program/token-2022
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
  getEnableCpiGuardInstruction,
  getDisableCpiGuardInstruction,
  fetchToken,
  TOKEN_2022_PROGRAM_ADDRESS
} from '@solana-program/token-2022';

import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { logActivity } from '@/infrastructure/activityLogger';
import { address } from '@solana/kit';
import bs58 from 'bs58';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CpiGuardOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  accountOwnerPrivateKey: string; // Private key of the token account owner
  projectId?: string; // Optional project context for logging
  userId?: string; // Optional user context for logging
}

export interface CpiGuardResult {
  success: boolean;
  signature?: string;
  accountAddress?: Address;
  cpiGuardEnabled?: boolean;
  explorerUrl?: string;
  errors?: string[];
}

export interface CpiGuardStatusResult {
  success: boolean;
  accountAddress: Address;
  cpiGuardEnabled: boolean;
  cpiGuardExists: boolean; // Whether the extension is present at all
  errors?: string[];
}

// ============================================================================
// MODERN SOLANA CPI GUARD SERVICE
// ============================================================================

export class ModernSolanaCpiGuardService {
  /**
   * Enable CPI Guard on a token account
   * 
   * @param tokenAccountAddress - The token account address to protect
   * @param options - Network and signer options
   * @returns Result with transaction signature
   */
  async enableCpiGuard(
    tokenAccountAddress: string,
    options: CpiGuardOptions
  ): Promise<CpiGuardResult> {
    try {
      // Step 1: Setup RPC
      const rpcUrl = this.getRpcUrl(options.network, options.rpcUrl);
      const wsUrl = this.getWebSocketUrl(options.network);
      
      const rpc = createSolanaRpc(rpcUrl);
      const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

      // Step 2: Create account owner signer
      const accountOwner = await this.createSignerFromPrivateKey(options.accountOwnerPrivateKey);
      
      const tokenAddress = address(tokenAccountAddress);

      await logActivity({
        action: 'solana_enable_cpi_guard_started',
        entity_type: 'token_account',
        entity_id: tokenAccountAddress,
        details: {
          network: options.network,
          accountOwner: accountOwner.address,
          projectId: options.projectId,
          userId: options.userId
        }
      });

      // Step 3: Get latest blockhash
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      // Step 4: Build enable CPI Guard instruction
      // Following official Solana docs: https://solana.com/docs/tokens/extensions/cpi-guard
      const enableInstruction = getEnableCpiGuardInstruction({
        token: tokenAddress,
        owner: accountOwner
      });

      console.log('📝 Enable CPI Guard Instruction:', {
        programAddress: enableInstruction.programAddress,
        accounts: enableInstruction.accounts.length,
        tokenAccount: tokenAccountAddress,
        owner: accountOwner.address
      });

      // Step 5: Create, sign, and send transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(accountOwner, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([enableInstruction], tx)
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
        action: 'solana_enable_cpi_guard_completed',
        entity_type: 'token_account',
        entity_id: tokenAccountAddress,
        details: {
          signature,
          network: options.network,
          accountOwner: accountOwner.address,
          projectId: options.projectId,
          userId: options.userId
        }
      });

      return {
        success: true,
        signature,
        accountAddress: tokenAddress,
        cpiGuardEnabled: true,
        explorerUrl
      };

    } catch (error) {
      console.error('Enable CPI Guard error:', error);
      
      await logActivity({
        action: 'solana_enable_cpi_guard_failed',
        entity_type: 'token_account',
        entity_id: tokenAccountAddress,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          network: options.network,
          projectId: options.projectId,
          userId: options.userId
        }
      });

      return {
        success: false,
        accountAddress: address(tokenAccountAddress),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Disable CPI Guard on a token account
   * 
   * @param tokenAccountAddress - The token account address to unprotect
   * @param options - Network and signer options
   * @returns Result with transaction signature
   */
  async disableCpiGuard(
    tokenAccountAddress: string,
    options: CpiGuardOptions
  ): Promise<CpiGuardResult> {
    try {
      // Step 1: Setup RPC
      const rpcUrl = this.getRpcUrl(options.network, options.rpcUrl);
      const wsUrl = this.getWebSocketUrl(options.network);
      
      const rpc = createSolanaRpc(rpcUrl);
      const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

      // Step 2: Create account owner signer
      const accountOwner = await this.createSignerFromPrivateKey(options.accountOwnerPrivateKey);
      
      const tokenAddress = address(tokenAccountAddress);

      await logActivity({
        action: 'solana_disable_cpi_guard_started',
        entity_type: 'token_account',
        entity_id: tokenAccountAddress,
        details: {
          network: options.network,
          accountOwner: accountOwner.address,
          projectId: options.projectId,
          userId: options.userId
        }
      });

      // Step 3: Get latest blockhash
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      // Step 4: Build disable CPI Guard instruction
      const disableInstruction = getDisableCpiGuardInstruction({
        token: tokenAddress,
        owner: accountOwner
      });

      console.log('📝 Disable CPI Guard Instruction:', {
        programAddress: disableInstruction.programAddress,
        accounts: disableInstruction.accounts.length,
        tokenAccount: tokenAccountAddress,
        owner: accountOwner.address
      });

      // Step 5: Create, sign, and send transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(accountOwner, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([disableInstruction], tx)
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
        action: 'solana_disable_cpi_guard_completed',
        entity_type: 'token_account',
        entity_id: tokenAccountAddress,
        details: {
          signature,
          network: options.network,
          accountOwner: accountOwner.address,
          projectId: options.projectId,
          userId: options.userId
        }
      });

      return {
        success: true,
        signature,
        accountAddress: tokenAddress,
        cpiGuardEnabled: false,
        explorerUrl
      };

    } catch (error) {
      console.error('Disable CPI Guard error:', error);
      
      await logActivity({
        action: 'solana_disable_cpi_guard_failed',
        entity_type: 'token_account',
        entity_id: tokenAccountAddress,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          network: options.network,
          projectId: options.projectId,
          userId: options.userId
        }
      });

      return {
        success: false,
        accountAddress: address(tokenAccountAddress),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Check if CPI Guard is enabled on a token account
   * 
   * @param tokenAccountAddress - The token account address to check
   * @param network - The network to check on
   * @param rpcUrl - Optional custom RPC URL
   * @returns Status result indicating if CPI Guard is enabled
   */
  async getCpiGuardStatus(
    tokenAccountAddress: string,
    network: SolanaNetwork = 'devnet',
    rpcUrl?: string
  ): Promise<CpiGuardStatusResult> {
    try {
      const rpc = createSolanaRpc(this.getRpcUrl(network, rpcUrl));
      const tokenAddress = address(tokenAccountAddress);

      // Fetch the token account data
      const tokenAccount = await fetchToken(rpc, tokenAddress);

      // Check if CPI Guard extension exists and is enabled
      let cpiGuardEnabled = false;
      let cpiGuardExists = false;

      // Safely unwrap Option<Extension[]> type - check if it's Some and has value
      const extensionsOption = tokenAccount.data.extensions;
      if (extensionsOption && typeof extensionsOption === 'object' && '__option' in extensionsOption) {
        // It's an Option type
        if (extensionsOption.__option === 'Some' && 'value' in extensionsOption) {
          const extensions = extensionsOption.value;
          for (const ext of extensions) {
            if (ext.__kind === 'CpiGuard') {
              cpiGuardExists = true;
              cpiGuardEnabled = ext.lockCpi === true;
              break;
            }
          }
        }
      } else if (Array.isArray(extensionsOption)) {
        // It's already an array
        for (const ext of extensionsOption) {
          if (ext.__kind === 'CpiGuard') {
            cpiGuardExists = true;
            cpiGuardEnabled = ext.lockCpi === true;
            break;
          }
        }
      }

      console.log('🔍 CPI Guard Status:', {
        tokenAccount: tokenAccountAddress,
        cpiGuardExists,
        cpiGuardEnabled,
        network
      });

      return {
        success: true,
        accountAddress: tokenAddress,
        cpiGuardEnabled,
        cpiGuardExists
      };

    } catch (error) {
      console.error('Get CPI Guard status error:', error);
      
      return {
        success: false,
        accountAddress: address(tokenAccountAddress),
        cpiGuardEnabled: false,
        cpiGuardExists: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

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
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
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

export const modernSolanaCpiGuardService = new ModernSolanaCpiGuardService();
