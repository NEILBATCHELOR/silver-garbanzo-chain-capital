/**
 * Injective Mainnet Balance Service
 * Uses REST API for browser compatibility (gRPC doesn't work in browsers)
 * 
 * FIXES:
 * - Uses ChainRestBankApi instead of ChainGrpcBankApi (browser compatible)
 * - Proper error handling and fallbacks
 * - Correct chain ID and network detection
 */

import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';
import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import { ChainRestBankApi } from '@injectivelabs/sdk-ts';

// Injective addresses use bech32 format with 'inj' prefix
// Length can vary: typically 38-42 characters after 'inj1'
const INJECTIVE_ADDRESS_REGEX = /^inj1[a-z0-9]{38,42}$/;

export class InjectiveBalanceService extends BaseChainBalanceService {
  private readonly bankApi: ChainRestBankApi;
  private readonly endpoints: ReturnType<typeof getNetworkEndpoints>;

  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 'injective-1', // Injective mainnet Cosmos chain ID (different from testnet 'injective-888')
      chainName: 'Injective',
      name: 'Injective',
      symbol: 'INJ',
      decimals: 18,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_INJECTIVE_RPC_URL || '',
      explorerUrl: 'https://explorer.injective.network',
      coingeckoId: 'injective-protocol',
      timeout: 25000,
      retryAttempts: 3,
      isEVM: false
    };

    super(config);

    // Use official Injective public REST LCD endpoint
    // SDK defaults may be outdated, use official endpoint from docs.injective.network
    const restEndpoint = import.meta.env.VITE_INJECTIVE_REST_URL || 'https://sentry.lcd.injective.network:443';
    this.bankApi = new ChainRestBankApi(restEndpoint);

    // Store endpoints for reference
    this.endpoints = getNetworkEndpoints(Network.Mainnet);

    console.log(`🔧 Injective Mainnet Service initialized with REST: ${restEndpoint}`);
  }

  validateAddress(address: string): boolean {
    return INJECTIVE_ADDRESS_REGEX.test(address);
  }

  protected async fetchNativeBalance(address: string): Promise<string> {
    try {
      // Sanitize and validate address
      const sanitizedAddress = address.trim();

      if (!this.validateAddress(sanitizedAddress)) {
        console.warn(`⚠️ Invalid Injective address format: ${sanitizedAddress}`);
        return '0.000000000000000000';
      }

      console.log(`🔍 Fetching INJ balance for ${sanitizedAddress}`);

      // Use REST API's fetchBalance method with separate arguments
      const balanceResponse = await this.bankApi.fetchBalance(
        sanitizedAddress,
        'inj'
      );

      if (!balanceResponse || !balanceResponse.amount) {
        console.log(`💰 No INJ balance found for ${sanitizedAddress}`);
        return '0.000000000000000000';
      }

      // Convert from smallest unit to INJ (1 INJ = 10^18 wei)
      const wei = BigInt(balanceResponse.amount);
      const injAmount = Number(wei) / Math.pow(10, 18);
      const balanceFormatted = injAmount.toFixed(18);

      console.log(`💰 Injective balance: ${balanceFormatted} INJ`);
      return balanceFormatted;

    } catch (error) {
      // Comprehensive error handling - catch ALL errors and return zero balance
      if (error instanceof Error) {
        if (error.message.includes('decoding bech32') || error.message.includes('invalid bech32')) {
          console.warn(`⚠️ Invalid bech32 address format: ${address.trim()}`);
        } else if (error.message.includes('balance was not found') || error.message.includes('not found')) {
          // Normal case: address has no balance
          console.log(`💰 No INJ balance for ${address.trim()} (balance not found)`);
        } else {
          // Actual error
          console.error(`❌ Injective balance fetch failed:`, error.message);
        }
      } else {
        console.error(`❌ Injective balance fetch failed:`, error);
      }
      return '0.000000000000000000';
    }
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];

    try {
      // Fetch all balances for the address
      const balancesResponse = await this.bankApi.fetchBalances(address);

      for (const balance of balancesResponse.balances || []) {
        try {
          // Skip native INJ token
          if (balance.denom === 'inj') {
            continue;
          }

          const amount = BigInt(balance.amount);

          if (amount > 0n) {
            const tokenMetadata = this.getTokenMetadata(balance.denom);
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
          console.warn(`⚠️ Failed to process token ${balance.denom}:`, tokenError);
        }
      }
    } catch (error: any) {
      // Gracefully handle API failures
      // Return empty array instead of propagating error to prevent breaking UI
      const errorMessage = error?.message || String(error);
      console.warn(`⚠️ Token enumeration failed (non-critical):`, errorMessage);
      
      // Check if it's a network/connection error
      if (errorMessage.includes('fetch') || errorMessage.includes('request') || errorMessage.includes('HttpRequestException')) {
        console.info('💡 This is likely due to endpoint connectivity. Native balance will still be fetched.');
      }
    }

    return tokens;
  }

  private getTokenMetadata(denom: string): { symbol: string; name: string; decimals: number } {
    // Enhanced token metadata for Injective ecosystem
    const knownTokens: { [key: string]: { symbol: string; name: string; decimals: number } } = {
      'inj': { symbol: 'INJ', name: 'Injective', decimals: 18 },
      'ibc/B3504E092456BA618CC28AC671A71FB08C6CA0FD0BE7C8A5B5A3E2DD933CC9E4': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9': { symbol: 'ATOM', name: 'Cosmos Hub', decimals: 6 },
      'peggy0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': { symbol: 'USDC', name: 'USD Coin (Ethereum)', decimals: 6 },
      'peggy0xdAC17F958D2ee523a2206206994597C13D831ec7': { symbol: 'USDT', name: 'Tether', decimals: 6 },
      'peggy0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
    };

    if (denom.startsWith('factory/')) {
      const parts = denom.split('/');
      const tokenName = parts[parts.length - 1];
      return {
        symbol: tokenName.replace('u', '').toUpperCase(),
        name: `${tokenName} Token`,
        decimals: 18
      };
    }

    if (denom.startsWith('ibc/')) {
      const knownToken = knownTokens[denom];
      if (knownToken) return knownToken;

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
