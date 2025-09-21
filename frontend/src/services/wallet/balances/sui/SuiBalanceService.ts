/**
 * Sui Mainnet Balance Service
 * Fetches real balances and coin data from Sui mainnet
 */

import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

// Sui address is a 66-character hex string (0x + 64 hex chars) or shorter
const SUI_ADDRESS_REGEX = /^0x[a-fA-F0-9]{1,64}$/;

interface SuiRPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: any[];
}

interface SuiCoinBalance {
  coinType: string;
  totalBalance: string;
  coinObjectCount: number;
  lockedBalance?: {
    epochId?: number;
    number?: string;
  };
}

export class SuiBalanceService extends BaseChainBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 1, // Sui mainnet
      chainName: 'Sui',
      name: 'Sui',
      symbol: 'SUI',
      decimals: 9,
      networkType: 'mainnet',
      rpcUrl: import.meta.env.VITE_SUI_RPC_URL,
      explorerUrl: 'https://explorer.sui.io',
      coingeckoId: 'sui',
      timeout: 15000,
      isEVM: false
    };
    super(config);
  }

  validateAddress(address: string): boolean {
    return SUI_ADDRESS_REGEX.test(address);
  }

  protected async fetchNativeBalance(address: string): Promise<string> {
    if (!this.config.rpcUrl) {
      throw new Error('Sui RPC provider not configured');
    }

    try {
      // Normalize address (pad with zeros if needed)
      const normalizedAddress = this.normalizeAddress(address);
      
      const response = await this.makeRPCCall('suix_getBalance', [
        normalizedAddress,
        '0x2::sui::SUI' // Native SUI coin type
      ]);

      if (response.error) {
        throw new Error(`RPC Error: ${response.error.message}`);
      }

      const balance = BigInt(response.result.totalBalance);
      
      // Convert from MIST to SUI (1 SUI = 1,000,000,000 MIST)
      const suiBalance = Number(balance) / 1000000000;
      return suiBalance.toFixed(9);
    } catch (error) {
      console.warn(`⚠️ Sui balance fetch failed:`, error.message);
      throw error;
    }
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    
    if (!this.config.rpcUrl) {
      return tokens;
    }

    try {
      const normalizedAddress = this.normalizeAddress(address);
      
      // Get all coin balances for the address
      const response = await this.makeRPCCall('suix_getAllBalances', [normalizedAddress]);

      if (response.error) {
        console.warn(`⚠️ Sui coin fetch failed:`, response.error.message);
        return tokens;
      }

      const coinBalances: SuiCoinBalance[] = response.result || [];

      for (const coinBalance of coinBalances) {
        try {
          // Skip native SUI as it's handled in fetchNativeBalance
          if (coinBalance.coinType === '0x2::sui::SUI') {
            continue;
          }

          const balance = BigInt(coinBalance.totalBalance);
          
          if (balance > 0) {
            const tokenMetadata = await this.getTokenMetadata(coinBalance.coinType);
            const balanceFormatted = (Number(balance) / Math.pow(10, tokenMetadata.decimals)).toFixed(tokenMetadata.decimals);
            const tokenPrice = await this.getTokenPrice(tokenMetadata.symbol);
            
            tokens.push({
              symbol: tokenMetadata.symbol,
              balance: balanceFormatted,
              balanceRaw: balance.toString(),
              valueUsd: parseFloat(balanceFormatted) * tokenPrice,
              decimals: tokenMetadata.decimals,
              contractAddress: coinBalance.coinType,
              standard: 'Sui Coin'
            });

            console.log(`🌊 ${tokenMetadata.symbol}: ${balanceFormatted} ($${(parseFloat(balanceFormatted) * tokenPrice).toFixed(2)})`);
          }
        } catch (tokenError) {
          console.warn(`⚠️ Failed to process Sui coin:`, tokenError.message);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Sui coin enumeration failed:`, error.message);
    }

    return tokens;
  }

  private normalizeAddress(address: string): string {
    // Remove 0x prefix, pad with zeros to 64 characters, add 0x back
    const cleanAddress = address.replace('0x', '');
    const paddedAddress = cleanAddress.padStart(64, '0');
    return `0x${paddedAddress}`;
  }

  private async makeRPCCall(method: string, params: any[]): Promise<any> {
    const request: SuiRPCRequest = {
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

  private async getTokenMetadata(coinType: string): Promise<{ symbol: string; name: string; decimals: number }> {
    // Common Sui coins
    const knownCoins: { [key: string]: { symbol: string; name: string; decimals: number } } = {
      '0x2::sui::SUI': { symbol: 'SUI', name: 'Sui', decimals: 9 },
      '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN': { symbol: 'USDT', name: 'Tether', decimals: 6 }
    };

    // Try to extract symbol from coin type
    const coinTypeMatch = coinType.match(/::([^:]+)::([^:]+)$/);
    const extractedSymbol = coinTypeMatch ? coinTypeMatch[2] : 'UNKNOWN';

    return knownCoins[coinType] || { 
      symbol: extractedSymbol, 
      name: `${extractedSymbol} Token`, 
      decimals: 9 
    };
  }
}

export const suiBalanceService = new SuiBalanceService();
