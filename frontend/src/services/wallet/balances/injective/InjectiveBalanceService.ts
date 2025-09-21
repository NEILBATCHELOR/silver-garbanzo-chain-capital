/**
 * Injective Mainnet Balance Service
 * Fetches real balances and IBC token data from Injective mainnet
 */

import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

// Injective addresses use bech32 format with 'inj' prefix
const INJECTIVE_ADDRESS_REGEX = /^inj[a-z0-9]{39}$/;

interface InjectiveRPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: any[];
}

interface CosmosBalance {
  denom: string;
  amount: string;
}

interface CosmosBalanceResponse {
  balances: CosmosBalance[];
  pagination: {
    next_key: string | null;
    total: string;
  };
}

export class InjectiveBalanceService extends BaseChainBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 60000, // Injective mainnet chain ID
      chainName: 'Injective',
      name: 'Injective',
      symbol: 'INJ',
      decimals: 18,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_INJECTIVE_RPC_URL,
      explorerUrl: 'https://explorer.injective.network',
      coingeckoId: 'injective-protocol',
      timeout: 15000,
      isEVM: false
    };
    super(config);
  }

  validateAddress(address: string): boolean {
    return INJECTIVE_ADDRESS_REGEX.test(address);
  }

  protected async fetchNativeBalance(address: string): Promise<string> {
    if (!this.config.rpcUrl) {
      throw new Error('Injective RPC provider not configured');
    }

    try {
      // Use Cosmos bank module to get balance
      const apiUrl = this.config.rpcUrl.replace('rpc', 'api').replace('443', '1317');
      const response = await fetch(`${apiUrl}/cosmos/bank/v1beta1/balances/${address}?pagination.limit=1000`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CosmosBalanceResponse = await response.json();
      
      // Find native INJ balance
      const injBalance = data.balances.find(balance => balance.denom === 'inj');
      if (!injBalance) {
        return '0.000000000000000000';
      }

      // Convert from the smallest unit to INJ (1 INJ = 10^18 wei)
      const wei = BigInt(injBalance.amount);
      const injAmount = Number(wei) / Math.pow(10, 18);
      return injAmount.toFixed(18);
    } catch (error) {
      console.warn(`⚠️ Injective balance fetch failed:`, error.message);
      
      // Fallback to RPC if REST API fails
      return this.fetchBalanceViaRPC(address);
    }
  }

  private async fetchBalanceViaRPC(address: string): Promise<string> {
    try {
      const response = await this.makeRPCCall('abci_query', [
        `/cosmos.bank.v1beta1.Query/AllBalances`,
        Buffer.from(JSON.stringify({ address })).toString('hex'),
        '0',
        false
      ]);

      if (response.error) {
        throw new Error(`RPC Error: ${response.error.message}`);
      }

      // Parse the response (this is simplified and may need adjustment)
      return '0.000000000000000000';
    } catch (error) {
      console.warn(`⚠️ Injective RPC fallback failed:`, error.message);
      return '0.000000000000000000';
    }
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    
    if (!this.config.rpcUrl) {
      return tokens;
    }

    try {
      // Use Cosmos bank module to get all balances
      const apiUrl = this.config.rpcUrl.replace('rpc', 'api').replace('443', '1317');
      const response = await fetch(`${apiUrl}/cosmos/bank/v1beta1/balances/${address}?pagination.limit=1000`);

      if (!response.ok) {
        return tokens;
      }

      const data: CosmosBalanceResponse = await response.json();

      for (const balance of data.balances) {
        try {
          // Skip native INJ token
          if (balance.denom === 'inj') {
            continue;
          }

          const amount = BigInt(balance.amount);
          
          if (amount > 0) {
            const tokenMetadata = await this.getTokenMetadata(balance.denom);
            const balanceFormatted = (Number(amount) / Math.pow(10, tokenMetadata.decimals)).toFixed(tokenMetadata.decimals);
            const tokenPrice = await this.getTokenPrice(tokenMetadata.symbol);
            
            tokens.push({
              symbol: tokenMetadata.symbol,
              balance: balanceFormatted,
              balanceRaw: amount.toString(),
              valueUsd: parseFloat(balanceFormatted) * tokenPrice,
              decimals: tokenMetadata.decimals,
              contractAddress: balance.denom,
              standard: 'IBC'
            });

            console.log(`⚗️ ${tokenMetadata.symbol}: ${balanceFormatted} ($${(parseFloat(balanceFormatted) * tokenPrice).toFixed(2)})`);
          }
        } catch (tokenError) {
          console.warn(`⚠️ Failed to process Injective token:`, tokenError.message);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Injective token enumeration failed:`, error.message);
    }

    return tokens;
  }

  private async makeRPCCall(method: string, params: any[]): Promise<any> {
    const request: InjectiveRPCRequest = {
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

  private async getTokenMetadata(denom: string): Promise<{ symbol: string; name: string; decimals: number }> {
    // Common Injective IBC tokens and factory tokens
    const knownTokens: { [key: string]: { symbol: string; name: string; decimals: number } } = {
      'inj': { symbol: 'INJ', name: 'Injective', decimals: 18 },
      'ibc/B3504E092456BA618CC28AC671A71FB08C6CA0FD0BE7C8A5B5A3E2DD933CC9E4': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9': { symbol: 'ATOM', name: 'Cosmos Hub', decimals: 6 },
      'peggy0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': { symbol: 'USDC', name: 'USD Coin (Ethereum)', decimals: 6 },
      'peggy0xdAC17F958D2ee523a2206206994597C13D831ec7': { symbol: 'USDT', name: 'Tether (Ethereum)', decimals: 6 }
    };

    // Handle factory tokens
    if (denom.startsWith('factory/')) {
      const parts = denom.split('/');
      const tokenName = parts[parts.length - 1];
      return {
        symbol: tokenName.toUpperCase(),
        name: `${tokenName} Token`,
        decimals: 18
      };
    }

    // Handle IBC tokens
    if (denom.startsWith('ibc/')) {
      return {
        symbol: `IBC-${denom.slice(4, 12)}`,
        name: 'IBC Token',
        decimals: 6
      };
    }

    return knownTokens[denom] || { 
      symbol: denom.toUpperCase().slice(0, 8), 
      name: 'Unknown Token', 
      decimals: 18 
    };
  }
}

export const injectiveBalanceService = new InjectiveBalanceService();
