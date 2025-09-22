/**
 * Stellar Balance Service
 * Fetches real balances and asset data from Stellar network
 */

import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

// Stellar address is a 56-character base32 string starting with G
const STELLAR_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;

interface StellarBalanceResponse {
  balances: Array<{
    balance: string;
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
    limit?: string;
  }>;
  sequence: string;
  subentry_count: number;
  last_modified_ledger: number;
}

export class StellarBalanceService extends BaseChainBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 0, // Stellar doesn't use chain IDs
      chainName: 'Stellar',
      name: 'Stellar',
      symbol: 'XLM',
      decimals: 7,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_STELLAR_RPC_URL || 'https://horizon.stellar.org',
      explorerUrl: 'https://stellar.expert/explorer/public',
      coingeckoId: 'stellar',
      timeout: 15000,
      isEVM: false
    };
    super(config);
  }

  validateAddress(address: string): boolean {
    return STELLAR_ADDRESS_REGEX.test(address);
  }

  protected async fetchNativeBalance(address: string): Promise<string> {
    if (!this.config.rpcUrl) {
      throw new Error('Stellar Horizon server not configured');
    }

    try {
      const response = await fetch(`${this.config.rpcUrl}/accounts/${address}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Account doesn't exist on network yet
          return '0';
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: StellarBalanceResponse = await response.json();
      
      // Find native XLM balance
      const nativeBalance = data.balances.find(balance => 
        balance.asset_type === 'native'
      );
      
      const balance = nativeBalance ? nativeBalance.balance : '0';
      return balance; // Already in XLM units
    } catch (error) {
      console.warn(`⚠️ Stellar balance fetch failed:`, error.message);
      throw error;
    }
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    
    if (!this.config.rpcUrl) {
      return tokens;
    }

    try {
      const response = await fetch(`${this.config.rpcUrl}/accounts/${address}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Account doesn't exist on network yet
          return tokens;
        }
        console.warn(`⚠️ Stellar token fetch failed: HTTP ${response.status}`);
        return tokens;
      }

      const data: StellarBalanceResponse = await response.json();
      
      // Process all non-native assets
      for (const balance of data.balances) {
        if (balance.asset_type !== 'native' && balance.asset_code && balance.asset_issuer) {
          const token: TokenBalance = {
            contractAddress: `${balance.asset_code}:${balance.asset_issuer}`,
            symbol: balance.asset_code,
            balance: balance.balance || '0',
            decimals: 7, // Stellar assets typically use 7 decimals
            valueUsd: 0, // Would need price data
            standard: 'other' as const,
            logoUrl: undefined
          };
          
          tokens.push(token);
        }
      }
      
      return tokens;
    } catch (error) {
      console.warn(`⚠️ Stellar token balances fetch failed:`, error.message);
      return tokens;
    }
  }

  getExplorerUrl(addressOrTx: string): string {
    // Determine if it's a transaction hash or address
    const isTransaction = addressOrTx.length === 64; // Stellar tx hashes are 64 chars
    const type = isTransaction ? 'tx' : 'account';
    return `${this.config.explorerUrl}/${type}/${addressOrTx}`;
  }
}
