/**
 * Modern Solana Token Burn Service
 * 
 * Handles SPL token burning using modern @solana/kit and @solana-program/token
 * Supports:
 * - Basic token burning from owned accounts
 * - Delegate burning (burn tokens on behalf of owner)
 * - Pre-burn validation
 * - Transaction confirmation
 * - Database activity logging
 * 
 * ARCHITECTURE: Modern @solana/kit + @solana-program/token
 * BASED ON: Official Solana documentation and working examples
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
  TOKEN_PROGRAM_ADDRESS,
  getBurnCheckedInstruction,
  findAssociatedTokenPda,
  fetchToken,
  fetchMint
} from '@solana-program/token';

import {
  TOKEN_2022_PROGRAM_ADDRESS,
  getBurnCheckedInstruction as getToken2022BurnCheckedInstruction,
  findAssociatedTokenPda as findToken2022AssociatedTokenPda,
  fetchToken as fetchToken2022Token,
  fetchMint as fetchToken2022Mint
} from '@solana-program/token-2022';

import { createModernRpc, createCustomRpc, type ModernSolanaRpc } from '@/infrastructure/web3/solana';
import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { handleSolanaError } from '@/infrastructure/web3/solana/ModernSolanaErrorHandler';
import { logActivity } from '@/infrastructure/activityLogger';
import bs58 from 'bs58';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface TokenBurnParams {
  mint: Address; // Token mint address
  owner: Address; // Token account owner address
  amount: bigint; // Amount to burn in smallest units (with decimals)
  decimals: number; // Token decimals
  memo?: string; // Optional burn memo
}

export interface ModernTokenBurnOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  signerPrivateKey: string; // Base58 or hex encoded private key
  checkBalance?: boolean; // Verify balance before burning (default: true)
}

export interface SolanaBurnResult {
  success: boolean;
  signature?: string;
  tokenAccount?: Address;
  balanceBefore?: bigint;
  balanceAfter?: bigint;
  amountBurned?: bigint;
  explorerUrl?: string;
  confirmationTime?: number;
  errors?: string[];
}

export interface BurnValidation {
  valid: boolean;
  errors: string[];
  currentBalance?: bigint;
  canBurn?: boolean;
}

// ============================================================================
// MODERN SOLANA TOKEN BURN SERVICE
// ============================================================================

export class ModernSolanaTokenBurnService {
  /**
   * Detect which token program a mint uses by checking the account owner
   * Returns TOKEN_2022_PROGRAM_ADDRESS or TOKEN_PROGRAM_ADDRESS
   * 
   * This is the RELIABLE method - checking the mint account's owner directly
   * (Same method used by ModernSolanaMintService)
   */
  private async detectTokenProgram(
    mintAddress: Address,
    rpc: ModernSolanaRpc
  ): Promise<Address> {
    try {
      // Get the mint account info to check its owner
      const accountInfo = await rpc.getRpc().getAccountInfo(mintAddress, { encoding: 'base64' }).send();
      
      if (!accountInfo.value) {
        throw new Error(`Mint account ${mintAddress} not found`);
      }
      
      const owner = accountInfo.value.owner;
      
      // Check if owner matches Token-2022 program
      if (owner === TOKEN_2022_PROGRAM_ADDRESS) {
        console.log('🎯 Detected Token-2022 mint (owner check):', mintAddress);
        return TOKEN_2022_PROGRAM_ADDRESS;
      }
      
      // Check if owner matches SPL Token program
      if (owner === TOKEN_PROGRAM_ADDRESS) {
        console.log('🎯 Detected SPL Token mint (owner check):', mintAddress);
        return TOKEN_PROGRAM_ADDRESS;
      }
      
      // Unknown token program
      throw new Error(`Mint ${mintAddress} has unknown owner: ${owner}`);
      
    } catch (error) {
      console.error('Error detecting token program:', error);
      throw error;
    }
  }

  /**
   * Burn SPL tokens from a wallet
   * Reduces token supply permanently
   */
  async burnTokens(
    params: TokenBurnParams,
    options: ModernTokenBurnOptions
  ): Promise<SolanaBurnResult> {
    const startTime = Date.now();

    try {
      // Step 1: Validation
      const validation = this.validateBurnParams(params);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Step 2: Setup RPC and signer
      const rpc = this.createRpc(options.network, options.rpcUrl);
      const signer = await this.createSigner(options.signerPrivateKey);

      // Step 2.5: Detect which token program the mint uses (SPL vs Token-2022)
      const tokenProgramAddress = await this.detectTokenProgram(params.mint, rpc);
      const isToken2022 = tokenProgramAddress === TOKEN_2022_PROGRAM_ADDRESS;

      console.log('🔧 Token Program Detection (Burn):', {
        mint: params.mint,
        program: isToken2022 ? 'Token-2022' : 'SPL Token',
        programAddress: tokenProgramAddress
      });

      // Step 3: Find token account (ATA) using correct program
      const [tokenAccount] = isToken2022
        ? await findToken2022AssociatedTokenPda({
            owner: params.owner,
            mint: params.mint,
            tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
          })
        : await findAssociatedTokenPda({
            owner: params.owner,
            mint: params.mint,
            tokenProgram: TOKEN_PROGRAM_ADDRESS
          });

      // Step 4: Check balance before burn (if enabled)
      let balanceBefore: bigint | undefined;
      if (options.checkBalance ?? true) {
        const accountInfo = isToken2022
          ? await fetchToken2022Token(rpc.getRpc(), tokenAccount)
          : await fetchToken(rpc.getRpc(), tokenAccount);
        balanceBefore = accountInfo.data.amount;

        // Verify sufficient balance
        if (balanceBefore < params.amount) {
          return {
            success: false,
            errors: [
              `Insufficient balance. Have ${balanceBefore}, need ${params.amount}`,
              'Current balance is less than burn amount'
            ],
            balanceBefore
          };
        }
      }

      // Step 5: Build burn instruction using correct program
      const burnInstruction = isToken2022
        ? getToken2022BurnCheckedInstruction({
            account: tokenAccount,
            mint: params.mint,
            authority: signer,
            amount: params.amount,
            decimals: params.decimals
          })
        : getBurnCheckedInstruction({
            account: tokenAccount,
            mint: params.mint,
            authority: signer,
            amount: params.amount,
            decimals: params.decimals
          });

      const instructions: Instruction[] = [burnInstruction];

      // Step 6: Build, sign, and send transaction
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

      // Step 7: Send transaction
      await rpc.sendRawTransaction(encodedTx, { skipPreflight: false });

      // Step 8: Wait for confirmation
      const confirmed = await rpc.waitForConfirmation(signature);

      if (!confirmed) {
        return {
          success: false,
          errors: ['Transaction failed to confirm']
        };
      }

      // Step 9: Check balance after burn
      let balanceAfter: bigint | undefined;
      try {
        const accountInfoAfter = isToken2022
          ? await fetchToken2022Token(rpc.getRpc(), tokenAccount)
          : await fetchToken(rpc.getRpc(), tokenAccount);
        balanceAfter = accountInfoAfter.data.amount;
      } catch (error) {
        // Account might not exist if all tokens were burned
        balanceAfter = 0n;
      }

      const confirmationTime = Date.now() - startTime;
      const explorerUrl = this.getExplorerUrl(signature, options.network);

      // Step 10: Log activity
      await logActivity({
        action: 'solana_token_burn',
        entity_type: 'token',
        details: {
          mint: params.mint,
          owner: params.owner,
          amount: params.amount.toString(),
          decimals: params.decimals,
          balanceBefore: balanceBefore?.toString(),
          balanceAfter: balanceAfter?.toString(),
          signature,
          network: options.network,
          confirmationTimeMs: confirmationTime
        }
      });

      return {
        success: true,
        signature,
        tokenAccount,
        balanceBefore,
        balanceAfter,
        amountBurned: params.amount,
        explorerUrl,
        confirmationTime
      };

    } catch (error) {
      console.error('Token burn error:', error);
      
      // Use error handler to create user-friendly error
      const solanaError = handleSolanaError.burn(error, options.network);
      
      return {
        success: false,
        errors: [solanaError.userMessage, solanaError.suggestedAction].filter(Boolean) as string[]
      };
    }
  }

  /**
   * Burn tokens as a delegate
   * Requires prior approval from token owner
   */
  async burnAsDelegate(
    params: TokenBurnParams,
    delegatePrivateKey: string,
    options: Omit<ModernTokenBurnOptions, 'signerPrivateKey'>
  ): Promise<SolanaBurnResult> {
    return this.burnTokens(params, {
      ...options,
      signerPrivateKey: delegatePrivateKey
    });
  }

  /**
   * Validate burn operation before executing
   * Checks balance and permissions
   */
  async validateBurn(
    params: TokenBurnParams,
    options: ModernTokenBurnOptions
  ): Promise<BurnValidation> {
    try {
      // Basic parameter validation
      const paramValidation = this.validateBurnParams(params);
      if (!paramValidation.valid) {
        return paramValidation;
      }

      // Setup RPC
      const rpc = this.createRpc(options.network, options.rpcUrl);

      // Detect token program
      const tokenProgramAddress = await this.detectTokenProgram(params.mint, rpc);
      const isToken2022 = tokenProgramAddress === TOKEN_2022_PROGRAM_ADDRESS;

      // Find token account using correct program
      const [tokenAccount] = isToken2022
        ? await findToken2022AssociatedTokenPda({
            owner: params.owner,
            mint: params.mint,
            tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
          })
        : await findAssociatedTokenPda({
            owner: params.owner,
            mint: params.mint,
            tokenProgram: TOKEN_PROGRAM_ADDRESS
          });

      // Check current balance using correct fetch function
      try {
        const accountInfo = isToken2022
          ? await fetchToken2022Token(rpc.getRpc(), tokenAccount)
          : await fetchToken(rpc.getRpc(), tokenAccount);
        const currentBalance = accountInfo.data.amount;

        // Verify sufficient balance
        const canBurn = currentBalance >= params.amount;

        if (!canBurn) {
          return {
            valid: false,
            errors: [
              `Insufficient balance to burn ${params.amount}`,
              `Current balance: ${currentBalance}`
            ],
            currentBalance,
            canBurn: false
          };
        }

        return {
          valid: true,
          errors: [],
          currentBalance,
          canBurn: true
        };

      } catch (error) {
        return {
          valid: false,
          errors: ['Token account does not exist or cannot be accessed'],
          currentBalance: 0n,
          canBurn: false
        };
      }

    } catch (error) {
      console.error('Burn validation error:', error);
      return {
        valid: false,
        errors: ['Failed to validate burn operation']
      };
    }
  }

  /**
   * Get current token balance
   * Automatically detects SPL Token vs Token-2022
   */
  async getTokenBalance(
    mint: Address,
    owner: Address,
    network: SolanaNetwork,
    rpcUrl?: string
  ): Promise<bigint> {
    try {
      const rpc = this.createRpc(network, rpcUrl);
      
      // Detect token program
      const tokenProgramAddress = await this.detectTokenProgram(mint, rpc);
      const isToken2022 = tokenProgramAddress === TOKEN_2022_PROGRAM_ADDRESS;
      
      // Find token account using correct program
      const [tokenAccount] = isToken2022
        ? await findToken2022AssociatedTokenPda({
            owner,
            mint,
            tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
          })
        : await findAssociatedTokenPda({
            owner,
            mint,
            tokenProgram: TOKEN_PROGRAM_ADDRESS
          });

      // Fetch balance using correct function
      const accountInfo = isToken2022
        ? await fetchToken2022Token(rpc.getRpc(), tokenAccount)
        : await fetchToken(rpc.getRpc(), tokenAccount);
      return accountInfo.data.amount;

    } catch (error) {
      console.error('Error fetching token balance:', error);
      return 0n;
    }
  }

  /**
   * Estimate burn transaction fee
   */
  async estimateBurnFee(
    network: SolanaNetwork,
    rpcUrl?: string
  ): Promise<bigint> {
    // Burn transaction is simple: 1 signature = ~5000 lamports
    // No account creation needed
    return lamports(5000n);
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
   * Get wallet address from private key
   */
  async getAddressFromPrivateKey(privateKey: string): Promise<Address> {
    const signer = await this.createSigner(privateKey);
    return signer.address;
  }

  /**
   * Validate burn parameters
   */
  private validateBurnParams(params: TokenBurnParams): BurnValidation {
    const errors: string[] = [];

    // Validate mint address
    if (!params.mint) {
      errors.push('Token mint address is required');
    }

    // Validate owner address
    if (!params.owner) {
      errors.push('Owner address is required');
    }

    // Validate amount
    if (params.amount <= 0n) {
      errors.push('Burn amount must be greater than 0');
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

export const modernSolanaTokenBurnService = new ModernSolanaTokenBurnService();
