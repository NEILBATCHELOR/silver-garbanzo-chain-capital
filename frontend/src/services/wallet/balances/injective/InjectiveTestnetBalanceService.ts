/**
 * Injective Testnet Balance Service
 * Fetches real balances and IBC token data from Injective testnet
 */

import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

// Injective testnet addresses use bech32 format with 'inj' prefix
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

export class InjectiveTestnetBalanceService extends BaseChainBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 888, // Injective testnet chain ID
      chainName: 'Injective Testnet',
      name: 'Injective Testnet',
      symbol: 'INJ',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_INJECTIVE_TESTNET_RPC_URL,
      explorerUrl: 'https://testnet.explorer.injective.network',
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
      throw new Error('Injective Testnet RPC provider not configured');
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
      console.warn(`⚠️ Injective Testnet balance fetch failed:`, error.message);
      
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
      console.warn(`⚠️ Injective Testnet RPC fallback failed:`, error.message);
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
            // For testnet, tokens have no real market value
            const tokenPrice = 0;
            
            tokens.push({
              symbol: tokenMetadata.symbol,
              balance: balanceFormatted,
              balanceRaw: amount.toString(),
              valueUsd: parseFloat(balanceFormatted) * tokenPrice,
              decimals: tokenMetadata.decimals,
              contractAddress: balance.denom,
              standard: 'IBC'
            });

            console.log(`⚗️ ${tokenMetadata.symbol}: ${balanceFormatted} (testnet)`);
          }
        } catch (tokenError) {
          console.warn(`⚠️ Failed to process Injective testnet token:`, tokenError.message);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Injective testnet token enumeration failed:`, error.message);
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
    // Common Injective testnet tokens
    const knownTokens: { [key: string]: { symbol: string; name: string; decimals: number } } = {
      'inj': { symbol: 'INJ', name: 'Injective', decimals: 18 }
      // Add more testnet tokens as needed
    };

    // Handle factory tokens
    if (denom.startsWith('factory/')) {
      const parts = denom.split('/');
      const tokenName = parts[parts.length - 1];
      return {
        symbol: `TEST-${tokenName.toUpperCase()}`,
        name: `${tokenName} Testnet Token`,
        decimals: 18
      };
    }

    // Handle IBC tokens
    if (denom.startsWith('ibc/')) {
      return {
        symbol: `TEST-IBC-${denom.slice(4, 12)}`,
        name: 'Testnet IBC Token',
        decimals: 6
      };
    }

    return knownTokens[denom] || { 
      symbol: `TEST-${denom.toUpperCase().slice(0, 8)}`, 
      name: 'Testnet Token', 
      decimals: 18 
    };
  }
}

export const injectiveTestnetBalanceService = new InjectiveTestnetBalanceService();
