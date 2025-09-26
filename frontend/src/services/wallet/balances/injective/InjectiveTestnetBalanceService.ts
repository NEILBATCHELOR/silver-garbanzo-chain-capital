/**
 * Injective Testnet Balance Service
 * Uses REST API for browser compatibility
 */

import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';
import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import { ChainRestBankApi } from '@injectivelabs/sdk-ts';

// Injective addresses use bech32 format with 'inj' prefix
// Length can vary: typically 38-42 characters after 'inj1'
const INJECTIVE_ADDRESS_REGEX = /^inj1[a-z0-9]{38,42}$/;

export class InjectiveTestnetBalanceService extends BaseChainBalanceService {
  private readonly bankApi: ChainRestBankApi;
  private readonly endpoints: ReturnType<typeof getNetworkEndpoints>;

  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 888, // Injective testnet chain ID  
      chainName: 'Injective Testnet',
      name: 'Injective Testnet',
      symbol: 'INJ',
      decimals: 18,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_INJECTIVE_TESTNET_RPC_URL || '',
      explorerUrl: 'https://testnet.explorer.injective.network',
      coingeckoId: 'injective-protocol',
      timeout: 25000,
      retryAttempts: 3,
      isEVM: false
    };
    
    super(config);
    
    // Use REST API for browser compatibility
    this.endpoints = getNetworkEndpoints(Network.Testnet);
    this.bankApi = new ChainRestBankApi(this.endpoints.rest);
    
    console.log(`🔧 Injective Testnet Service initialized with REST: ${this.endpoints.rest}`);
  }

  validateAddress(address: string): boolean {
    return INJECTIVE_ADDRESS_REGEX.test(address);
  }

  protected async fetchNativeBalance(address: string): Promise<string> {
    try {
      // Sanitize and validate address
      const sanitizedAddress = address.trim();
      
      if (!this.validateAddress(sanitizedAddress)) {
        console.warn(`⚠️ Invalid Injective testnet address format: ${sanitizedAddress}`);
        return '0.000000000000000000';
      }
      
      console.log(`🔍 Fetching testnet INJ balance for ${sanitizedAddress}`);

      const balanceResponse = await this.bankApi.fetchBalance(
        sanitizedAddress,
        'inj'
      );
      
      if (!balanceResponse || !balanceResponse.amount) {
        return '0.000000000000000000';
      }

      const wei = BigInt(balanceResponse.amount);
      const injAmount = Number(wei) / Math.pow(10, 18);
      return injAmount.toFixed(18);
      
    } catch (error) {
      // Comprehensive error handling - catch ALL errors and return zero balance
      if (error instanceof Error) {
        if (error.message.includes('decoding bech32') || error.message.includes('invalid bech32')) {
          console.warn(`⚠️ Invalid bech32 address format: ${address.trim()}`);
        } else {
          console.error(`❌ Injective testnet balance fetch failed:`, error.message);
        }
      } else {
        console.error(`❌ Injective testnet balance fetch failed:`, error);
      }
      return '0.000000000000000000';
    }
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    // Testnet token balances - simplified
    return [];
  }
}

export const injectiveTestnetBalanceService = new InjectiveTestnetBalanceService();
