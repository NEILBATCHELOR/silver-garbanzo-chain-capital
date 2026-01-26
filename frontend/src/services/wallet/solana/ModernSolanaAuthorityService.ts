/**
 * Modern Solana Authority Service
 * 
 * Handles authority management operations using modern @solana/kit
 * Following official Solana documentation:
 * - https://solana.com/docs/tokens/basics/set-authority#typescript
 * 
 * Use this when you need to:
 * - Change mint authority (who can mint tokens)
 * - Change freeze authority (who can freeze accounts)
 * - Revoke authorities permanently (set to null)
 * - Transfer authority to another address
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
  getSetAuthorityInstruction,
  AuthorityType
} from '@solana-program/token';

import {
  TOKEN_2022_PROGRAM_ADDRESS,
  getSetAuthorityInstruction as getToken2022SetAuthorityInstruction,
  AuthorityType as Token2022AuthorityType
} from '@solana-program/token-2022';

import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { logActivity } from '@/infrastructure/activityLogger';
import { address } from '@solana/kit';
import bs58 from 'bs58';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Authority types that can be modified
 */
export type SolanaAuthorityType = 
  | 'MintTokens'      // Authority to mint new tokens
  | 'FreezeAccount'   // Authority to freeze token accounts
  | 'AccountOwner'    // Authority over token account
  | 'CloseAccount';   // Authority to close accounts

export interface SetAuthorityConfig {
  mintAddress: string; // The mint to modify authority for
  authorityType: SolanaAuthorityType; // Which authority to change
  newAuthority: string | null; // New authority address (null = revoke permanently)
}

export interface SetAuthorityOptions {
  network: SolanaNetwork;
  rpcUrl?: string;
  currentAuthorityPrivateKey: string; // Private key of current authority
}

export interface SetAuthorityResult {
  success: boolean;
  signature?: string;
  mintAddress?: string;
  authorityType?: SolanaAuthorityType;
  newAuthority?: string | null;
  explorerUrl?: string;
  errors?: string[];
}

// ============================================================================
// MODERN SOLANA AUTHORITY SERVICE
// ============================================================================

export class ModernSolanaAuthorityService {
  /**
   * Change or revoke an authority on a mint
   * Following official Solana documentation pattern
   */
  async setAuthority(
    config: SetAuthorityConfig,
    options: SetAuthorityOptions
  ): Promise<SetAuthorityResult> {
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

      console.log('🔧 Token Program Detection (Set Authority):', {
        mint: config.mintAddress,
        program: isToken2022 ? 'Token-2022' : 'SPL Token',
        programAddress: tokenProgramAddress
      });

      const rpc = createSolanaRpc(rpcUrl);
      const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

      // Step 2: Create current authority signer
      const currentAuthority = await this.createSignerFromPrivateKey(options.currentAuthorityPrivateKey);

      await logActivity({
        action: 'solana_set_authority_started',
        entity_type: 'token',
        entity_id: config.mintAddress,
        details: {
          authorityType: config.authorityType,
          newAuthority: config.newAuthority || 'REVOKED',
          network: options.network,
          tokenProgram: isToken2022 ? 'Token-2022' : 'SPL Token'
        }
      });

      console.log('🎯 Set Authority Details:', {
        mintAddress: config.mintAddress,
        authorityType: config.authorityType,
        newAuthority: config.newAuthority || 'REVOKED (null)',
        network: options.network
      });

      // Step 3: Get latest blockhash
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      // Step 4: Build set authority instruction using correct program
      const setAuthorityInstruction = isToken2022
        ? getToken2022SetAuthorityInstruction({
            owned: address(config.mintAddress),
            owner: currentAuthority,
            authorityType: this.mapAuthorityType(config.authorityType, true),
            newAuthority: config.newAuthority ? address(config.newAuthority) : null
          })
        : getSetAuthorityInstruction({
            owned: address(config.mintAddress),
            owner: currentAuthority,
            authorityType: this.mapAuthorityType(config.authorityType, false),
            newAuthority: config.newAuthority ? address(config.newAuthority) : null
          });

      console.log('📝 Set Authority Instruction:', {
        programAddress: setAuthorityInstruction.programAddress,
        accounts: setAuthorityInstruction.accounts.length,
        authorityType: config.authorityType,
        revoked: config.newAuthority === null
      });

      // Step 5: Create, sign, and send transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(currentAuthority, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([setAuthorityInstruction], tx)
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
        action: 'solana_set_authority_completed',
        entity_type: 'token',
        entity_id: config.mintAddress,
        details: {
          signature,
          authorityType: config.authorityType,
          newAuthority: config.newAuthority || 'REVOKED',
          network: options.network
        }
      });

      return {
        success: true,
        signature,
        mintAddress: config.mintAddress,
        authorityType: config.authorityType,
        newAuthority: config.newAuthority,
        explorerUrl
      };

    } catch (error) {
      console.error('Set authority error:', error);

      await logActivity({
        action: 'solana_set_authority_failed',
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
   * Convenience method: Revoke mint authority permanently
   */
  async revokeMintAuthority(
    mintAddress: string,
    options: SetAuthorityOptions
  ): Promise<SetAuthorityResult> {
    return this.setAuthority(
      {
        mintAddress,
        authorityType: 'MintTokens',
        newAuthority: null
      },
      options
    );
  }

  /**
   * Convenience method: Revoke freeze authority permanently
   */
  async revokeFreezeAuthority(
    mintAddress: string,
    options: SetAuthorityOptions
  ): Promise<SetAuthorityResult> {
    return this.setAuthority(
      {
        mintAddress,
        authorityType: 'FreezeAccount',
        newAuthority: null
      },
      options
    );
  }

  /**
   * Convenience method: Transfer mint authority to new address
   */
  async transferMintAuthority(
    mintAddress: string,
    newAuthority: string,
    options: SetAuthorityOptions
  ): Promise<SetAuthorityResult> {
    return this.setAuthority(
      {
        mintAddress,
        authorityType: 'MintTokens',
        newAuthority
      },
      options
    );
  }

  /**
   * Convenience method: Transfer freeze authority to new address
   */
  async transferFreezeAuthority(
    mintAddress: string,
    newAuthority: string,
    options: SetAuthorityOptions
  ): Promise<SetAuthorityResult> {
    return this.setAuthority(
      {
        mintAddress,
        authorityType: 'FreezeAccount',
        newAuthority
      },
      options
    );
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Map our authority type string to the SPL Token enum
   */
  private mapAuthorityType(
    type: SolanaAuthorityType,
    isToken2022: false
  ): AuthorityType;
  
  /**
   * Map our authority type string to the Token-2022 enum
   */
  private mapAuthorityType(
    type: SolanaAuthorityType,
    isToken2022: true
  ): Token2022AuthorityType;
  
  /**
   * Map our authority type string to the correct enum for the token program
   */
  private mapAuthorityType(
    type: SolanaAuthorityType,
    isToken2022: boolean
  ): AuthorityType | Token2022AuthorityType {
    if (isToken2022) {
      const mapping: Record<SolanaAuthorityType, Token2022AuthorityType> = {
        'MintTokens': Token2022AuthorityType.MintTokens,
        'FreezeAccount': Token2022AuthorityType.FreezeAccount,
        'AccountOwner': Token2022AuthorityType.AccountOwner,
        'CloseAccount': Token2022AuthorityType.CloseAccount
      };
      return mapping[type];
    } else {
      const mapping: Record<SolanaAuthorityType, AuthorityType> = {
        'MintTokens': AuthorityType.MintTokens,
        'FreezeAccount': AuthorityType.FreezeAccount,
        'AccountOwner': AuthorityType.AccountOwner,
        'CloseAccount': AuthorityType.CloseAccount
      };
      return mapping[type];
    }
  }

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

export const modernSolanaAuthorityService = new ModernSolanaAuthorityService();
