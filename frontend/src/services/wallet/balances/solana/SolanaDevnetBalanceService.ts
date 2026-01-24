/**
 * Solana Devnet Balance Service  
 * Fetches real balances and SPL token data from Solana devnet using @solana/kit
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

export class SolanaDevnetBalanceService extends BaseChainBalanceService {
  private rpc: ReturnType<typeof createSolanaRpc>;

  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 103, // Solana devnet
      chainName: 'Solana Devnet',
      name: 'Solana Devnet',
      symbol: 'SOL',
      decimals: 9,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
      explorerUrl: 'https://explorer.solana.com?cluster=devnet',
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
      throw new Error('Solana Devnet RPC provider not configured');
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
      
      console.log(`💰 Solana Devnet Balance: ${solBalance.toFixed(9)} SOL (${lamports} lamports)`);
      
      return solBalance.toFixed(9);
    } catch (error: any) {
      console.warn(`⚠️ Solana Devnet balance fetch failed:`, error.message);
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
      
      // Get all SPL token accounts for the address
      // Note: Using legacy RPC call for token accounts as @solana/kit may not have this yet
      const response = await this.makeRPCCall('getTokenAccountsByOwner', [
        addressString, // Use string for this legacy call
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
            // For devnet, tokens have no real value
            const tokenPrice = 0;
            
            tokens.push({
              symbol: tokenMetadata.symbol || 'Unknown',
              balance: tokenAmount.uiAmount.toString(),
              balanceRaw: tokenAmount.amount,
              valueUsd: tokenAmount.uiAmount * tokenPrice,
              decimals: tokenAmount.decimals,
              contractAddress: tokenInfo.mint,
              standard: 'SPL'
            });

            console.log(`🪙 ${tokenMetadata.symbol}: ${tokenAmount.uiAmount} (devnet)`);
          }
        } catch (tokenError: any) {
          console.warn(`⚠️ Failed to process devnet token:`, tokenError.message);
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
    // Common Solana devnet test tokens
    const knownTokens: { [key: string]: { symbol: string; name: string } } = {
      'So11111111111111111111111111111111111111112': { symbol: 'WSOL', name: 'Wrapped SOL' },
      // Add more devnet test tokens as needed
    };

    return knownTokens[mint] || { symbol: `TOKEN-${mint.slice(0, 8)}`, name: 'Devnet Token' };
  }
}

export const solanaDevnetBalanceService = new SolanaDevnetBalanceService();
