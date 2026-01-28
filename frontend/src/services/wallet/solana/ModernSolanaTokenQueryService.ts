/**
 * Modern Solana Token Query Service
 * 
 * Fetches REAL-TIME on-chain data from Solana
 * - Current supply (actual minted amount)
 * - Token balances
 * - Transaction history
 * - Account information
 * 
 * ARCHITECTURE: Modern @solana/kit + @solana-program/token
 */

import {
  createSolanaRpc,
  address,
  type Address,
  type Rpc,
  type SolanaRpcApi
} from '@solana/kit';

import {
  fetchMint,
  fetchToken,
  TOKEN_PROGRAM_ADDRESS,
  findAssociatedTokenPda
} from '@solana-program/token';

import bs58 from 'bs58';
import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface TokenOnChainData {
  // Mint information
  mintAddress: string;
  supply: string; // Current circulating supply
  decimals: number;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  
  // Token metadata (from Token-2022 extension or Metaplex)
  name?: string;
  symbol?: string;
  uri?: string;
  extensions?: string[];
  
  // For display
  supplyFormatted: string; // With decimals applied
}

export interface TokenAccountData {
  address: string;
  owner: string;
  mint: string;
  balance: string; // Raw balance
  balanceFormatted: string; // With decimals
  delegateAddress: string | null;
  delegatedAmount: string;
  state: 'Uninitialized' | 'Initialized' | 'Frozen';
}

export interface TokenTransactionSignature {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: any | null;
}

// ============================================================================
// SERVICE
// ============================================================================

export class ModernSolanaTokenQueryService {
  /**
   * Get real-time mint data from blockchain
   */
  async getMintData(
    mintAddress: string,
    network: SolanaNetwork
  ): Promise<TokenOnChainData> {
    const rpc = this.createRpc(network);
    
    try {
      // Fetch mint account data
      const mintAccount = await fetchMint(rpc, address(mintAddress));
      
      if (!mintAccount.data) {
        throw new Error('Mint account not found');
      }

      const supply = mintAccount.data.supply.toString();
      const decimals = mintAccount.data.decimals;
      
      // Format supply with decimals
      const supplyFormatted = this.formatTokenAmount(supply, decimals);

      return {
        mintAddress,
        supply,
        decimals,
        mintAuthority: this.extractOptionAddress(mintAccount.data.mintAuthority),
        freezeAuthority: this.extractOptionAddress(mintAccount.data.freezeAuthority),
        supplyFormatted
      };
    } catch (error) {
      console.error('Error fetching mint data:', error);
      throw new Error(`Failed to fetch mint data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get token account balance for a specific wallet
   */
  async getTokenBalance(
    mintAddress: string,
    walletAddress: string,
    network: SolanaNetwork
  ): Promise<TokenAccountData> {
    const rpc = this.createRpc(network);
    
    try {
      // Derive ATA
      const [ataAddress] = await findAssociatedTokenPda({
        owner: address(walletAddress),
        mint: address(mintAddress),
        tokenProgram: TOKEN_PROGRAM_ADDRESS
      });

      // Fetch token account
      const tokenAccount = await fetchToken(rpc, ataAddress);
      
      if (!tokenAccount.data) {
        // Account doesn't exist yet - return zero balance
        return {
          address: ataAddress,
          owner: walletAddress,
          mint: mintAddress,
          balance: '0',
          balanceFormatted: '0',
          delegateAddress: null,
          delegatedAmount: '0',
          state: 'Uninitialized'
        };
      }

      const balance = tokenAccount.data.amount.toString();
      
      // Get decimals from mint
      const mintData = await this.getMintData(mintAddress, network);
      const balanceFormatted = this.formatTokenAmount(balance, mintData.decimals);

      return {
        address: ataAddress,
        owner: tokenAccount.data.owner,
        mint: tokenAccount.data.mint,
        balance,
        balanceFormatted,
        delegateAddress: this.extractOptionAddress(tokenAccount.data.delegate),
        delegatedAmount: tokenAccount.data.delegatedAmount.toString(),
        state: this.mapAccountState(tokenAccount.data.state)
      };
    } catch (error) {
      console.error('Error fetching token balance:', error);
      throw new Error(`Failed to fetch token balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction signatures for a token account
   */
  async getTokenTransactions(
    tokenAccountAddress: string,
    network: SolanaNetwork,
    limit: number = 50
  ): Promise<TokenTransactionSignature[]> {
    const rpc = this.createRpc(network);
    
    try {
      const signatures = await rpc
        .getSignaturesForAddress(address(tokenAccountAddress), {
          limit
        })
        .send();

      return signatures.map(sig => ({
        signature: sig.signature,
        slot: Number(sig.slot), // Convert bigint to number
        blockTime: sig.blockTime ? Number(sig.blockTime) : null,
        err: sig.err || null
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error(`Failed to fetch transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all token holders (expensive operation - use sparingly)
   * 
   * NOTE: This requires getProgramAccounts which is resource-intensive
   * Consider using a dedicated indexer for production
   * 
   * WARNING: This can return thousands of accounts and may timeout or be rate-limited
   * Use with caution and only on devnet/testnet or with dedicated RPC providers
   */
  async getAllHolders(
    mintAddress: string,
    network: SolanaNetwork
  ): Promise<TokenAccountData[]> {
    try {
      const rpc = this.createRpc(network);
      const mintAddr = address(mintAddress);

      console.warn('getAllHolders: This is an expensive operation. Consider using an indexer for production.');

      // Use getProgramAccounts with filters to get all token accounts for this mint
      const accountsResponse = await rpc.getProgramAccounts(
        TOKEN_PROGRAM_ADDRESS,
        {
          encoding: 'base64',
          filters: [
            {
              // Token account data is 165 bytes
              dataSize: 165n
            },
            {
              // Filter by mint address (bytes 0-32)
              // Convert Address to string for memcmp filter
              memcmp: {
                offset: 0n,
                bytes: String(mintAddr) as any,
                encoding: 'base58' as const
              }
            }
          ]
        }
      ).send();

      // Process accounts and filter out zero balances
      const holders: TokenAccountData[] = [];

      for (const { pubkey, account } of accountsResponse) {
        try {
          // Get the raw account data
          // In base64 encoding, data is a tuple [encodedString, 'base64']
          const dataString = Array.isArray(account.data) ? account.data[0] : account.data;
          
          // Decode token account data:
          // Bytes 0-32: mint
          // Bytes 32-64: owner  
          // Bytes 64-72: amount (little-endian u64)
          // Bytes 72-73: delegate option
          // Bytes 73-105: delegate (if present)
          // Bytes 105-113: state (initialized/frozen)
          // Bytes 113-121: isNative option + isNative amount
          // Bytes 121-153: delegated amount
          // Bytes 153-185: close authority option + close authority
          
          let buffer: Buffer;
          
          if (typeof dataString === 'string') {
            // Base64 encoded data
            buffer = Buffer.from(dataString, 'base64');
          } else if (Array.isArray(dataString)) {
            // Already a byte array
            buffer = Buffer.from(dataString);
          } else {
            console.warn(`Unexpected data format for account ${pubkey}`);
            continue;
          }
          
          if (buffer.length < 165) {
            console.warn(`Account ${pubkey} has incorrect size: ${buffer.length}`);
            continue;
          }
          
          // Extract owner (bytes 32-64)
          const ownerBytes = buffer.slice(32, 64);
          const owner = bs58.encode(ownerBytes);
          
          // Extract amount (bytes 64-72, little-endian)
          let amount = 0n;
          for (let i = 0; i < 8; i++) {
            amount += BigInt(buffer[64 + i]) << BigInt(i * 8);
          }
          
          // Skip zero balances
          if (amount === 0n) {
            continue;
          }
          
          // Extract state (byte 108)
          const stateValue = buffer[108];
          const state = stateValue === 0 ? 'Uninitialized' : 
                       stateValue === 1 ? 'Initialized' : 
                       'Frozen';
          
          holders.push({
            address: pubkey,
            owner,
            mint: mintAddress,
            balance: amount.toString(),
            balanceFormatted: '', // Will be formatted by caller if needed
            delegateAddress: null, // Could be extracted if needed
            delegatedAmount: '0',
            state
          });
        } catch (error) {
          console.error(`Error processing account ${pubkey}:`, error);
          // Continue processing other accounts
        }
      }

      console.log(`Found ${holders.length} token holders (excluding zero balances)`);
      return holders;

    } catch (error) {
      console.error('Error fetching all holders:', error);
      
      // If getProgramAccounts is not supported or fails, throw informative error
      if (error instanceof Error && error.message.includes('not supported')) {
        throw new Error(
          'getProgramAccounts is not supported by this RPC provider. ' +
          'Please use a dedicated RPC provider or indexer service for this operation.'
        );
      }
      
      throw new Error(`Failed to fetch token holders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private createRpc(network: SolanaNetwork): Rpc<SolanaRpcApi> {
    const url = this.getRpcUrl(network);
    return createSolanaRpc(url);
  }

  private getRpcUrl(network: SolanaNetwork): string {
    // Normalize network (remove 'solana-' prefix if present)
    const normalized = network.replace('solana-', '') as SolanaNetwork;
    
    const urls: Record<SolanaNetwork, string> = {
      'mainnet-beta': 'https://api.mainnet-beta.solana.com',
      'devnet': 'https://api.devnet.solana.com',
      'testnet': 'https://api.testnet.solana.com'
    };

    return urls[normalized] || urls.devnet;
  }

  private formatTokenAmount(amount: string, decimals: number): string {
    const num = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    
    const integerPart = num / divisor;
    const fractionalPart = num % divisor;
    
    if (fractionalPart === 0n) {
      return integerPart.toString();
    }
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');
    
    return `${integerPart}.${trimmedFractional}`;
  }

  private mapAccountState(state: number): 'Uninitialized' | 'Initialized' | 'Frozen' {
    switch (state) {
      case 0: return 'Uninitialized';
      case 1: return 'Initialized';
      case 2: return 'Frozen';
      default: return 'Uninitialized';
    }
  }

  /**
   * Extract address from Option<Address> type
   * Returns the address string or null if None
   */
  private extractOptionAddress(option: any): string | null {
    if (!option) return null;
    if (typeof option === 'string') return option;
    if (option.__option === 'None') return null;
    if (option.__option === 'Some') return option.value;
    // Fallback: might be a direct address
    return option.toString?.() || null;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const modernSolanaTokenQueryService = new ModernSolanaTokenQueryService();
