/**
 * NEAR Mainnet Balance Service
 * Fetches real balances and NEP-141 token data from NEAR mainnet
 */

import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

// NEAR account names can be implicit (64-char hex) or named accounts
const NEAR_IMPLICIT_ACCOUNT_REGEX = /^[a-f0-9]{64}$/;
const NEAR_NAMED_ACCOUNT_REGEX = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

interface NearRPCRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params: any;
}

interface NearAccount {
  amount: string;
  block_hash: string;
  block_height: number;
  code_hash: string;
  locked: string;
  storage_paid_at: number;
  storage_usage: number;
}

export class NearBalanceService extends BaseChainBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 0, // NEAR doesn't use chainId
      chainName: 'NEAR',
      name: 'NEAR',
      symbol: 'NEAR',
      decimals: 24,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_NEAR_RPC_URL,
      explorerUrl: 'https://explorer.near.org',
      coingeckoId: 'near',
      timeout: 15000,
      isEVM: false
    };
    super(config);
  }

  validateAddress(address: string): boolean {
    return NEAR_IMPLICIT_ACCOUNT_REGEX.test(address) || NEAR_NAMED_ACCOUNT_REGEX.test(address);
  }

  protected async fetchNativeBalance(address: string): Promise<string> {
    if (!this.config.rpcUrl) {
      throw new Error('NEAR RPC provider not configured');
    }

    try {
      const response = await this.makeRPCCall('query', {
        request_type: 'view_account',
        finality: 'final',
        account_id: address
      });

      if (response.error) {
        if (response.error.cause?.name === 'UNKNOWN_ACCOUNT') {
          return '0.000000000000000000000000';
        }
        throw new Error(`RPC Error: ${response.error.message}`);
      }

      const account: NearAccount = response.result;
      
      // Convert from yoctoNEAR to NEAR (1 NEAR = 10^24 yoctoNEAR)
      const yoctoNear = BigInt(account.amount);
      const nearBalance = Number(yoctoNear) / Math.pow(10, 24);
      return nearBalance.toFixed(24);
    } catch (error) {
      console.warn(`⚠️ NEAR balance fetch failed:`, error.message);
      throw error;
    }
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    
    if (!this.config.rpcUrl) {
      return tokens;
    }

    try {
      // Common NEAR NEP-141 tokens
      const tokenContracts = [
        { symbol: 'USDC', address: 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near', decimals: 6 },
        { symbol: 'USDT', address: 'dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near', decimals: 6 },
        { symbol: 'wBTC', address: '2260fac5e5542a773aa44fbcfedf7c193bc2c599.factory.bridge.near', decimals: 8 },
        { symbol: 'ETH', address: 'aurora', decimals: 18 },
        { symbol: 'wNEAR', address: 'wrap.near', decimals: 24 }
      ];

      for (const tokenConfig of tokenContracts) {
        try {
          const balance = await this.getTokenBalance(address, tokenConfig.address, tokenConfig.decimals);
          
          if (parseFloat(balance) > 0.000001) {
            const tokenPrice = await this.getTokenPrice(tokenConfig.symbol);
            const numericBalance = parseFloat(balance);
            
            tokens.push({
              symbol: tokenConfig.symbol,
              balance: balance,
              balanceRaw: (numericBalance * Math.pow(10, tokenConfig.decimals)).toString(),
              valueUsd: numericBalance * tokenPrice,
              decimals: tokenConfig.decimals,
              contractAddress: tokenConfig.address,
              standard: 'NEP-141'
            });

            console.log(`🌌 ${tokenConfig.symbol}: ${balance} ($${(numericBalance * tokenPrice).toFixed(2)})`);
          }
        } catch (tokenError) {
          console.warn(`⚠️ Failed to check NEAR token ${tokenConfig.symbol}:`, tokenError.message);
        }
      }
    } catch (error) {
      console.warn(`⚠️ NEAR token enumeration failed:`, error.message);
    }

    return tokens;
  }

  private async getTokenBalance(accountId: string, tokenContract: string, decimals: number): Promise<string> {
    try {
      const response = await this.makeRPCCall('query', {
        request_type: 'call_function',
        finality: 'final',
        account_id: tokenContract,
        method_name: 'ft_balance_of',
        args_base64: Buffer.from(JSON.stringify({ account_id: accountId })).toString('base64')
      });

      if (response.error) {
        return '0';
      }

      const resultBytes = Buffer.from(response.result.result);
      const balance = JSON.parse(resultBytes.toString());
      
      // Convert from token units to human readable
      const numericBalance = BigInt(balance) / BigInt(Math.pow(10, decimals));
      return numericBalance.toString();
    } catch (error) {
      return '0';
    }
  }

  private async makeRPCCall(method: string, params: any): Promise<any> {
    const request: NearRPCRequest = {
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
}

export const nearBalanceService = new NearBalanceService();
