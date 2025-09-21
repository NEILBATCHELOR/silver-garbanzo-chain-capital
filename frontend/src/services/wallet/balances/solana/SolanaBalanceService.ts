/**
 * Solana Mainnet Balance Service
 * Fetches real balances and SPL token data from Solana mainnet
 */

import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

// Solana address is a 44-character base58 string
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

interface SolanaRPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: any[];
}

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
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 101, // Solana mainnet
      chainName: 'Solana',
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL,
      explorerUrl: 'https://explorer.solana.com',
      coingeckoId: 'solana',
      timeout: 15000,
      isEVM: false
    };
    super(config);
  }

  validateAddress(address: string): boolean {
    return SOLANA_ADDRESS_REGEX.test(address);
  }

  protected async fetchNativeBalance(address: string): Promise<string> {
    if (!this.config.rpcUrl) {
      throw new Error('Solana RPC provider not configured');
    }

    try {
      const response = await this.makeRPCCall('getBalance', [address]);
      
      if (response.error) {
        throw new Error(`RPC Error: ${response.error.message}`);
      }

      // Solana balance is returned in lamports (1 SOL = 1,000,000,000 lamports)
      const lamports = response.result?.value || 0;
      const solBalance = lamports / 1000000000;
      return solBalance.toFixed(9);
    } catch (error) {
      console.warn(`⚠️ Solana balance fetch failed:`, error.message);
      throw error;
    }
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    
    if (!this.config.rpcUrl) {
      return tokens;
    }

    try {
      // Get all SPL token accounts for the address
      const response = await this.makeRPCCall('getTokenAccountsByOwner', [
        address,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, // SPL Token program
        { encoding: 'jsonParsed' }
      ]);

      if (response.error) {
        console.warn(`⚠️ SPL token fetch failed:`, response.error.message);
        return tokens;
      }

      const tokenAccounts: SolanaTokenAccount[] = response.result?.value || [];

      for (const tokenAccount of tokenAccounts) {
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
              standard: 'SPL'
            });

            console.log(`🌅 ${tokenMetadata.symbol}: ${tokenAmount.uiAmount} ($${(tokenAmount.uiAmount * tokenPrice).toFixed(2)})`);
          }
        } catch (tokenError) {
          console.warn(`⚠️ Failed to process token:`, tokenError.message);
        }
      }
    } catch (error) {
      console.warn(`⚠️ SPL token enumeration failed:`, error.message);
    }

    return tokens;
  }

  private async makeRPCCall(method: string, params: any[]): Promise<any> {
    const request: SolanaRPCRequest = {
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
