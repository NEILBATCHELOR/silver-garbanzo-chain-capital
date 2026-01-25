/**
 * Modern Solana Blockchain Query Service - SIMPLIFIED VERSION
 * 
 * CRITICAL: This service queries the BLOCKCHAIN, not the database.
 * All data comes from on-chain sources.
 * 
 * Features:
 * - Wallet balance queries (SOL + all tokens)
 * - Token holder discovery (via getTokenLargestAccounts)
 * - Transaction history (via Solana Explorer API)
 * - On-chain metadata fetching
 * - Supply verification
 */

import { createModernRpc } from '@/infrastructure/web3/solana/ModernSolanaRpc';
import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { address, type Address } from '@solana/kit';
import { 
  TOKEN_PROGRAM_ADDRESS,
  findAssociatedTokenPda
} from '@solana-program/token';
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022';

// ============================================================================
// TYPES
// ============================================================================

interface ParsedMintInfo {
  name?: string;
  symbol?: string;
  uri?: string;
  decimals?: number;
  supply?: string;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  extensions?: string[];
}

interface ParsedTokenAccountInfo {
  mint: string;
  tokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number | null;
  };
}

export interface WalletBalance {
  solBalance: bigint;
  solFormatted: string;
  tokens: TokenBalance[];
}

export interface TokenBalance {
  mint: string;
  balance: bigint;
  decimals: number;
  uiAmount: number;
  symbol?: string;
  name?: string;
  tokenProgram: 'spl-token' | 'token-2022'; // Detect which program owns this token
}

export interface TokenHolder {
  address: string;
  balance: bigint;
  decimals: number;
  uiAmount: number;
  percentage: number;
}

export interface TokenTransaction {
  signature: string;
  blockTime: bigint | null;
  slot: bigint;
  type: 'mint' | 'transfer' | 'burn' | 'unknown';
  from?: string;
  to?: string;
  amount?: bigint;
  status: 'success' | 'failed';
}

export interface OnChainMetadata {
  name: string;
  symbol: string;
  uri?: string;
  decimals: number;
  supply: bigint;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  extensions?: string[];
}

export interface TokenInstruction {
  signature: string;
  age: string;
  timestamp: number | null;
  instruction: string;
  program: string;
  result: 'success' | 'failed';
  slot: number;
}

// ============================================================================
// SERVICE
// ============================================================================

class ModernSolanaBlockchainQueryService {
  /**
   * Get complete wallet balance - SOL + ALL tokens
   */
  async getWalletBalance(
    walletAddress: string,
    network: SolanaNetwork
  ): Promise<WalletBalance> {
    const rpc = createModernRpc(network);
    const wallet = address(walletAddress);

    try {
      // 1. Get SOL balance
      const solBalanceResult = await rpc.getRpc().getBalance(wallet).send();
      const solBalance = BigInt(solBalanceResult.value);
      const solFormatted = (Number(solBalance) / 1e9).toFixed(4);

      // 2. Get ALL token accounts from BOTH SPL and Token-2022 programs
      const [splTokenAccounts, token2022Accounts] = await Promise.all([
        // Query SPL Token Program
        rpc.getRpc().getTokenAccountsByOwner(
          wallet,
          { programId: TOKEN_PROGRAM_ADDRESS },
          { encoding: 'jsonParsed' }
        ).send(),
        // Query Token-2022 Program
        rpc.getRpc().getTokenAccountsByOwner(
          wallet,
          { programId: TOKEN_2022_PROGRAM_ADDRESS },
          { encoding: 'jsonParsed' }
        ).send()
      ]);

      // 3. Merge results from both programs
      const allTokenAccounts = [
        ...splTokenAccounts.value,
        ...token2022Accounts.value
      ];

      // 4. Parse token balances
      const tokens: TokenBalance[] = [];

      for (const account of allTokenAccounts) {
        const accountData = account.account.data;
        
        // Detect program - check which program owns this token account
        // Token-2022 Program: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
        // SPL Token Program: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
        const programId = account.account.owner;
        const tokenProgram = programId === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
          ? 'token-2022'
          : 'spl-token';
        
        // Check if data is parsed
        if (accountData && typeof accountData !== 'string' && 'parsed' in accountData) {
          const parsedInfo = accountData.parsed?.info as ParsedTokenAccountInfo | undefined;
          if (parsedInfo && parsedInfo.tokenAmount) {
            tokens.push({
              mint: parsedInfo.mint,
              balance: BigInt(parsedInfo.tokenAmount.amount),
              decimals: parsedInfo.tokenAmount.decimals,
              uiAmount: parsedInfo.tokenAmount.uiAmount || 0,
              tokenProgram
            });
          }
        }
      }

      return {
        solBalance,
        solFormatted,
        tokens
      };
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      throw error;
    }
  }

  /**
   * Get token holders from blockchain using getTokenLargestAccounts
   * NOTE: This returns top holders, not ALL holders
   */
  async getTokenHolders(
    mintAddress: string,
    network: SolanaNetwork
  ): Promise<TokenHolder[]> {
    const rpc = createModernRpc(network);
    const mint = address(mintAddress);

    try {
      // Get mint info for decimals
      const mintInfo = await this.getOnChainMetadata(mintAddress, network);
      
      // Get largest token accounts
      const largestAccounts = await rpc.getRpc().getTokenLargestAccounts(mint).send();
      
      const holders: TokenHolder[] = [];
      const totalSupply = mintInfo.supply;

      for (const account of largestAccounts.value) {
        const balance = BigInt(account.amount);
        if (balance > 0) {
          const percentage = totalSupply > 0 
            ? (Number(balance) / Number(totalSupply)) * 100
            : 0;

          holders.push({
            address: account.address as string,
            balance,
            decimals: mintInfo.decimals,
            uiAmount: Number(balance) / Math.pow(10, mintInfo.decimals),
            percentage
          });
        }
      }

      return holders.sort((a, b) => Number(b.balance - a.balance));
    } catch (error) {
      console.error('Error fetching token holders:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for an address
   */
  async getTransactionHistory(
    addressStr: string,
    network: SolanaNetwork,
    limit: number = 100
  ): Promise<TokenTransaction[]> {
    const rpc = createModernRpc(network);
    const addr = address(addressStr);

    try {
      // Get transaction signatures
      const signatures = await rpc.getRpc().getSignaturesForAddress(
        addr,
        { limit }
      ).send();

      const transactions: TokenTransaction[] = [];

      // Process each signature
      for (const sigInfo of signatures) {
        transactions.push({
          signature: sigInfo.signature,
          blockTime: sigInfo.blockTime || null,
          slot: sigInfo.slot,
          type: 'unknown', // Would need to parse transaction to determine type
          status: sigInfo.err ? 'failed' : 'success'
        });
      }

      return transactions;
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  /**
   * Get on-chain metadata for a token
   * 
   * ENHANCED: Fetches actual metadata from:
   * - Token-2022: On-chain metadata extension
   * - SPL: Metaplex metadata
   */
  async getOnChainMetadata(
    mintAddress: string,
    network: SolanaNetwork
  ): Promise<OnChainMetadata> {
    const rpc = createModernRpc(network);
    const mint = address(mintAddress);

    try {
      // 1. Get basic mint account info with parsed data
      const accountInfo = await rpc.getRpc().getAccountInfo(
        mint,
        { encoding: 'jsonParsed' }
      ).send();

      if (!accountInfo.value) {
        throw new Error('Mint account not found');
      }

      // Check if data is parsed
      const accountData = accountInfo.value.data;
      if (!accountData || typeof accountData === 'string') {
        throw new Error('Failed to get parsed mint data');
      }

      const parsedData = ('parsed' in accountData ? accountData.parsed?.info : null) as ParsedMintInfo | null;
      
      if (!parsedData) {
        throw new Error('Failed to parse mint data');
      }

      // 2. Try to fetch REAL metadata from metadata services
      let name = 'Unknown Token';
      let symbol = 'UNKNOWN';
      let uri: string | undefined;

      try {
        // Try Token-2022 metadata first (modern approach)
        const { token2022MetadataService } = await import('./Token2022MetadataService');
        const token2022Result = await token2022MetadataService.fetchMetadata(
          mintAddress,
          network
        );

        if (token2022Result.success && token2022Result.metadata) {
          name = token2022Result.metadata.name;
          symbol = token2022Result.metadata.symbol;
          uri = token2022Result.metadata.uri;
        } else {
          // Try Metaplex metadata (SPL tokens)
          const { metaplexTokenMetadataService } = await import('./MetaplexTokenMetadataService');
          const metaplexResult = await metaplexTokenMetadataService.fetchMetadata(
            mintAddress,
            network
          );

          if (metaplexResult.success && metaplexResult.metadata) {
            name = metaplexResult.metadata.name;
            symbol = metaplexResult.metadata.symbol;
            uri = metaplexResult.metadata.uri;
          }
        }
      } catch (metadataError) {
        console.warn('Could not fetch metadata, using defaults:', metadataError);
        // Keep defaults: Unknown Token / UNKNOWN
      }

      return {
        name,
        symbol,
        uri,
        decimals: parsedData.decimals || 9,
        supply: BigInt(parsedData.supply || '0'),
        mintAuthority: parsedData.mintAuthority || null,
        freezeAuthority: parsedData.freezeAuthority || null,
        extensions: parsedData.extensions || []
      };
    } catch (error) {
      console.error('Error fetching on-chain metadata:', error);
      throw error;
    }
  }

  /**
   * Get token supply from blockchain
   */
  async getTokenSupply(
    mintAddress: string,
    network: SolanaNetwork
  ): Promise<{ supply: bigint; decimals: number; uiAmount: number }> {
    const rpc = createModernRpc(network);
    const mint = address(mintAddress);

    try {
      const supplyResult = await rpc.getRpc().getTokenSupply(mint).send();
      
      return {
        supply: BigInt(supplyResult.value.amount),
        decimals: supplyResult.value.decimals,
        uiAmount: supplyResult.value.uiAmount || 0
      };
    } catch (error) {
      console.error('Error fetching token supply:', error);
      throw error;
    }
  }

  /**
   * Get token instructions from blockchain
   * Similar to https://explorer.solana.com/address/[mint]/instructions
   */
  async getTokenInstructions(
    mintAddress: string,
    network: SolanaNetwork,
    limit: number = 50
  ): Promise<TokenInstruction[]> {
    const rpc = createModernRpc(network);
    const mint = address(mintAddress);

    try {
      // Get transaction signatures for this mint address
      const signatures = await rpc.getRpc().getSignaturesForAddress(
        mint,
        { limit }
      ).send();

      const instructions: TokenInstruction[] = [];

      // Process each signature to extract instructions
      for (const sigInfo of signatures) {
        const timestamp = sigInfo.blockTime ? Number(sigInfo.blockTime) : null;
        const age = timestamp ? this.formatAge(timestamp) : 'Unknown';

        // Get the transaction to parse instructions
        try {
          const tx = await rpc.getRpc().getTransaction(
            sigInfo.signature as any,
            { 
              encoding: 'jsonParsed',
              maxSupportedTransactionVersion: 0
            }
          ).send();

          if (tx?.meta && tx?.transaction) {
            // Parse instructions from the transaction
            const message = 'message' in tx.transaction ? tx.transaction.message : null;
            if (message && 'instructions' in message) {
              const txInstructions = message.instructions;

              for (const instruction of txInstructions) {
                // Check if instruction is parsed
                if ('parsed' in instruction && instruction.parsed) {
                  const parsed = instruction.parsed;
                  const program = instruction.program || 'Unknown Program';
                  const instructionType = typeof parsed === 'object' && 'type' in parsed
                    ? parsed.type
                    : 'Unknown Instruction';

                  instructions.push({
                    signature: sigInfo.signature,
                    age,
                    timestamp,
                    instruction: this.formatInstructionType(instructionType),
                    program: this.formatProgramName(program),
                    result: sigInfo.err ? 'failed' : 'success',
                    slot: Number(sigInfo.slot)
                  });
                } else if ('programId' in instruction) {
                  // Unparsed instruction
                  instructions.push({
                    signature: sigInfo.signature,
                    age,
                    timestamp,
                    instruction: 'Unknown Instruction',
                    program: 'Unknown Program',
                    result: sigInfo.err ? 'failed' : 'success',
                    slot: Number(sigInfo.slot)
                  });
                }
              }
            }
          }
        } catch (txError) {
          console.warn(`Failed to parse transaction ${sigInfo.signature}:`, txError);
          // Still add a basic entry
          instructions.push({
            signature: sigInfo.signature,
            age,
            timestamp,
            instruction: 'Unknown Instruction',
            program: 'Token Program',
            result: sigInfo.err ? 'failed' : 'success',
            slot: Number(sigInfo.slot)
          });
        }
      }

      return instructions;
    } catch (error) {
      console.error('Error fetching token instructions:', error);
      throw error;
    }
  }

  /**
   * Format age relative to now
   */
  private formatAge(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const secondsAgo = now - timestamp;

    if (secondsAgo < 60) {
      return `${secondsAgo} second${secondsAgo === 1 ? '' : 's'} ago`;
    } else if (secondsAgo < 3600) {
      const minutes = Math.floor(secondsAgo / 60);
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (secondsAgo < 86400) {
      const hours = Math.floor(secondsAgo / 3600);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
      const days = Math.floor(secondsAgo / 86400);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }
  }

  /**
   * Format instruction type to be more readable
   */
  private formatInstructionType(type: string): string {
    // Convert camelCase or snake_case to Title Case
    return type
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format program name
   */
  private formatProgramName(program: string): string {
    const programMap: Record<string, string> = {
      'spl-token': 'Token Program',
      'spl-token-2022': 'Token-2022 Program',
      'spl-associated-token-account': 'Associated Token Program',
      'system': 'System Program'
    };

    return programMap[program] || program;
  }
}

// Export the class and singleton instance
export { ModernSolanaBlockchainQueryService };
export const modernSolanaBlockchainQueryService = new ModernSolanaBlockchainQueryService();
export default modernSolanaBlockchainQueryService;
