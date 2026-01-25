/**
 * Solana Mainnet Balance Service
 * Fetches real balances and SPL token data from Solana mainnet using @solana/kit
 */

import { address, createSolanaRpc } from '@solana/kit';
import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

// Solana address is a 44-character base58 string
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

interface SolanaTokenAccount {
  account: {
    data: {
      parsed: {
        info: {
          tokenAmount: {
            amount: string;
            decimals: number;
            uiAmount: number;
          };
          mint: string;
        };
      };
      program: string;
    };
  };
  pubkey: string;
}

export class SolanaBalanceService extends BaseChainBalanceService {
  private rpc: ReturnType<typeof createSolanaRpc>;

  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 101, // Solana mainnet
      chainName: 'Solana',
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      explorerUrl: 'https://explorer.solana.com',
      coingeckoId: 'solana',
      timeout: 15000,
      isEVM: false
    };
    super(config);
    
    // Initialize Solana RPC client using @solana/kit
    this.rpc = createSolanaRpc(this.config.rpcUrl!);
  }

  validateAddress(address: string): boolean {
    return SOLANA_ADDRESS_REGEX.test(address);
  }

  protected async fetchNativeBalance(addressString: string): Promise<string> {
    if (!this.config.rpcUrl) {
      throw new Error('Solana RPC provider not configured');
    }

    try {
      // Convert string address to Solana Address type
      const publicKey = address(addressString);
      
      // Get balance using @solana/kit (returns lamports)
      const balanceResponse = await this.rpc.getBalance(publicKey).send();
      
      // balanceResponse.value contains the balance in lamports
      const lamports = balanceResponse.value || 0n;
      
      // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
      const solBalance = Number(lamports) / 1000000000;
      
      console.log(`💰 Solana Mainnet Balance: ${solBalance.toFixed(9)} SOL (${lamports} lamports)`);
      
      return solBalance.toFixed(9);
    } catch (error: any) {
      console.warn(`⚠️ Solana balance fetch failed:`, error.message);
      throw error;
    }
  }

  protected async fetchTokenBalancesImpl(addressString: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    
    if (!this.config.rpcUrl) {
      return tokens;
    }

    try {
      // Convert string address to Solana Address type
      const publicKey = address(addressString);
      
      // Fetch BOTH SPL and Token-2022 tokens
      const SPL_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
      const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
      
      // Get SPL token accounts
      const splResponse = await this.makeRPCCall('getTokenAccountsByOwner', [
        addressString,
        { programId: SPL_TOKEN_PROGRAM },
        { encoding: 'jsonParsed' }
      ]);

      // Get Token-2022 accounts
      const token2022Response = await this.makeRPCCall('getTokenAccountsByOwner', [
        addressString,
        { programId: TOKEN_2022_PROGRAM },
        { encoding: 'jsonParsed' }
      ]);

      // Combine results
      const splAccounts: SolanaTokenAccount[] = splResponse.result?.value || [];
      const token2022Accounts: SolanaTokenAccount[] = token2022Response.result?.value || [];
      
      console.log(`🔍 Found ${splAccounts.length} SPL tokens and ${token2022Accounts.length} Token-2022 tokens`);

      // Process SPL tokens
      for (const tokenAccount of splAccounts) {
        try {
          const tokenInfo = tokenAccount.account.data.parsed.info;
          const tokenAmount = tokenInfo.tokenAmount;
          
          if (tokenAmount.uiAmount > 0.000001) {
            const tokenMetadata = await this.getTokenMetadata(tokenInfo.mint);
            const tokenPrice = tokenMetadata.symbol ? await this.getTokenPrice(tokenMetadata.symbol) : 0;
            
            tokens.push({
              symbol: tokenMetadata.symbol || 'Unknown',
              balance: tokenAmount.uiAmount.toString(),
              balanceRaw: tokenAmount.amount,
              valueUsd: tokenAmount.uiAmount * tokenPrice,
              decimals: tokenAmount.decimals,
              contractAddress: tokenInfo.mint,
              standard: 'SPL',
              tokenProgram: 'spl-token'
            });

            console.log(`🪙 SPL ${tokenMetadata.symbol}: ${tokenAmount.uiAmount} ($${(tokenAmount.uiAmount * tokenPrice).toFixed(2)})`);
          }
        } catch (tokenError: any) {
          console.warn(`⚠️ Failed to process SPL token:`, tokenError.message);
        }
      }
      
      // Process Token-2022 tokens
      for (const tokenAccount of token2022Accounts) {
        try {
          const tokenInfo = tokenAccount.account.data.parsed.info;
          const tokenAmount = tokenInfo.tokenAmount;
          
          if (tokenAmount.uiAmount > 0.000001) {
            const tokenMetadata = await this.getTokenMetadata(tokenInfo.mint);
            const tokenPrice = tokenMetadata.symbol ? await this.getTokenPrice(tokenMetadata.symbol) : 0;
            
            tokens.push({
              symbol: tokenMetadata.symbol || 'Unknown',
              balance: tokenAmount.uiAmount.toString(),
              balanceRaw: tokenAmount.amount,
              valueUsd: tokenAmount.uiAmount * tokenPrice,
              decimals: tokenAmount.decimals,
              contractAddress: tokenInfo.mint,
              standard: 'Token2022',
              tokenProgram: 'token-2022'
            });

            console.log(`🪙 Token-2022 ${tokenMetadata.symbol}: ${tokenAmount.uiAmount} ($${(tokenAmount.uiAmount * tokenPrice).toFixed(2)})`);
          }
        } catch (tokenError: any) {
          console.warn(`⚠️ Failed to process Token-2022 token:`, tokenError.message);
        }
      }
    } catch (error: any) {
      console.warn(`⚠️ SPL token enumeration failed:`, error.message);
    }

    return tokens;
  }

  private async makeRPCCall(method: string, params: any[]): Promise<any> {
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    };

    const response = await fetch(this.config.rpcUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private async getTokenMetadata(mint: string): Promise<{ symbol: string; name: string }> {
    // Common Solana SPL tokens
    const knownTokens: { [key: string]: { symbol: string; name: string } } = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin' },
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether' },
      'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt': { symbol: 'SRM', name: 'Serum' },
      'So11111111111111111111111111111111111111112': { symbol: 'WSOL', name: 'Wrapped SOL' },
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk' },
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', name: 'Marinade SOL' }
    };

    return knownTokens[mint] || { symbol: 'Unknown', name: 'Unknown Token' };
  }
}

export const solanaBalanceService = new SolanaBalanceService();
