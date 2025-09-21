/**
 * Aptos Testnet Balance Service
 * Fetches real balances and coin data from Aptos testnet
 */

import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

// Aptos address is a 66-character hex string (0x + 64 hex chars) or shorter
const APTOS_ADDRESS_REGEX = /^0x[a-fA-F0-9]{1,64}$/;

interface AptosResource {
  type: string;
  data: {
    coin: {
      value: string;
    };
    frozen: boolean;
  };
}

export class AptosTestnetBalanceService extends BaseChainBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 2, // Aptos testnet
      chainName: 'Aptos Testnet',
      name: 'Aptos Testnet', // Alias for chainName
      symbol: 'APT',
      decimals: 8,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_APTOS_TESTNET_RPC_URL,
      explorerUrl: 'https://explorer.aptoslabs.com/?network=testnet',
      coingeckoId: 'aptos',
      timeout: 15000,
      isEVM: false // Aptos is not EVM-compatible
    };
    super(config);
  }

  validateAddress(address: string): boolean {
    return APTOS_ADDRESS_REGEX.test(address);
  }

  protected async fetchNativeBalance(address: string): Promise<string> {
    if (!this.config.rpcUrl) {
      throw new Error('Aptos Testnet RPC provider not configured');
    }

    try {
      // Normalize address (remove leading zeros after 0x)
      const normalizedAddress = this.normalizeAddress(address);
      
      // Fetch APT coin balance
      const response = await fetch(
        `${this.config.rpcUrl}/v1/accounts/${normalizedAddress}/resource/0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`
      );

      if (!response.ok) {
        if (response.status === 404) {
          // Account doesn't exist or has no APT balance
          return '0.00000000';
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const resource: AptosResource = await response.json();
      const aptOctats = BigInt(resource.data.coin.value);
      
      // Convert from octats to APT (1 APT = 100,000,000 octats)
      const aptBalance = Number(aptOctats) / 100000000;
      return aptBalance.toFixed(8);
    } catch (error) {
      console.warn(`⚠️ Aptos Testnet balance fetch failed:`, error.message);
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
      
      // Get all resources for the account to find coin stores
      const response = await fetch(`${this.config.rpcUrl}/v1/accounts/${normalizedAddress}/resources`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return tokens; // Account doesn't exist
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const resources = await response.json();
      
      // Filter for coin store resources (excluding native APT)
      const coinStores = resources.filter((resource: any) => 
        resource.type.includes('::coin::CoinStore<') &&
        !resource.type.includes('0x1::aptos_coin::AptosCoin')
      );

      for (const coinStore of coinStores) {
        try {
          const coinType = this.extractCoinType(coinStore.type);
          const balance = BigInt(coinStore.data.coin.value);
          
          if (balance > 0) {
            const tokenMetadata = await this.getTokenMetadata(coinType);
            const balanceFormatted = (Number(balance) / Math.pow(10, tokenMetadata.decimals)).toFixed(tokenMetadata.decimals);
            // For testnet, tokens have no real market value
            const tokenPrice = 0;
            
            tokens.push({
              symbol: tokenMetadata.symbol,
              balance: balanceFormatted,
              balanceRaw: balance.toString(),
              valueUsd: parseFloat(balanceFormatted) * tokenPrice,
              decimals: tokenMetadata.decimals,
              contractAddress: coinType,
              standard: 'Aptos Coin'
            });

            console.log(`⚡ ${tokenMetadata.symbol}: ${balanceFormatted} (testnet)`);
          }
        } catch (tokenError) {
          console.warn(`⚠️ Failed to process Aptos testnet coin:`, tokenError.message);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Aptos testnet coin enumeration failed:`, error.message);
    }

    return tokens;
  }

  private normalizeAddress(address: string): string {
    // Remove 0x prefix, pad with zeros to 64 characters, add 0x back
    const cleanAddress = address.replace('0x', '');
    const paddedAddress = cleanAddress.padStart(64, '0');
    return `0x${paddedAddress}`;
  }

  private extractCoinType(resourceType: string): string {
    // Extract coin type from resource type like "0x1::coin::CoinStore<0x1234::coin::MyCoin>"
    const match = resourceType.match(/CoinStore<(.+)>/);
    return match ? match[1] : resourceType;
  }

  private async getTokenMetadata(coinType: string): Promise<{ symbol: string; name: string; decimals: number }> {
    // Common Aptos testnet test coins
    const knownCoins: { [key: string]: { symbol: string; name: string; decimals: number } } = {
      '0x1::aptos_coin::AptosCoin': { symbol: 'APT', name: 'Aptos Coin', decimals: 8 }
    };

    return knownCoins[coinType] || { 
      symbol: `TEST-${coinType.slice(2, 10)}`, 
      name: 'Testnet Coin', 
      decimals: 8 
    };
  }
}

export const aptosTestnetBalanceService = new AptosTestnetBalanceService();
