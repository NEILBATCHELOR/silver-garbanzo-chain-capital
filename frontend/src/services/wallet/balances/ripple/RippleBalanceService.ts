/**
 * Ripple (XRP Ledger) Balance Service
 * Fetches real balances and token data from XRP Ledger
 * Supports XRP and issued currencies (IOUs)
 */

import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

// Ripple address formats
const RIPPLE_CLASSIC_REGEX = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/; // Classic address
const RIPPLE_X_ADDRESS_REGEX = /^[XT][1-9A-HJ-NP-Za-km-z]{45,47}$/; // X-Address format

interface RippleAccountInfo {
  Account: string;
  Balance: string; // XRP balance in drops
  Flags: number;
  LedgerEntryType: string;
  OwnerCount: number;
  PreviousTxnID: string;
  PreviousTxnLgrSeq: number;
  Sequence: number;
  index: string;
}

interface RippleTrustLine {
  account: string;
  balance: string;
  currency: string;
  limit: string;
  limit_peer: string;
  quality_in: number;
  quality_out: number;
  no_ripple?: boolean;
  no_ripple_peer?: boolean;
  authorized?: boolean;
  peer_authorized?: boolean;
  freeze?: boolean;
  freeze_peer?: boolean;
}

interface RippleAccountLinesResponse {
  account: string;
  lines: RippleTrustLine[];
  ledger_current_index?: number;
  ledger_index?: number;
  ledger_hash?: string;
}

interface RippleGatewayBalance {
  currency: string;
  value: string;
}

export class RippleBalanceService extends BaseChainBalanceService {
  private readonly DROPS_PER_XRP = 1000000;
  private readonly RESERVE_BASE = 10; // 10 XRP base reserve
  private readonly RESERVE_INCREMENT = 2; // 2 XRP per trust line

  constructor(networkType: 'mainnet' | 'testnet' = 'mainnet') {
    const config: BalanceServiceConfig = {
      chainId: networkType === 'mainnet' ? 0 : 1,
      chainName: networkType === 'mainnet' ? 'Ripple' : 'Ripple Testnet',
      name: networkType === 'mainnet' ? 'XRP Ledger' : 'XRP Ledger Testnet',
      symbol: 'XRP',
      decimals: 6,
      networkType,
      rpcUrl: networkType === 'mainnet' 
        ? import.meta.env.VITE_XRPL_MAINNET_RPC_URL
        : import.meta.env.VITE_XRPL_TESTNET_RPC_URL,
      explorerUrl: networkType === 'mainnet' 
        ? import.meta.env.VITE_XRPL_MAINNET_EXPLORER_URL
        : import.meta.env.VITE_XRPL_TESTNET_EXPLORER_URL,
      coingeckoId: 'ripple',
      timeout: 15000,
      isEVM: false
    };
    super(config);
    
    // Validate that RPC URL is configured
    if (!this.config.rpcUrl) {
      throw new Error(`XRPL RPC URL not configured for ${networkType}. Please set VITE_XRPL_${networkType.toUpperCase()}_RPC_URL in .env`);
    }
  }

  validateAddress(address: string): boolean {
    return RIPPLE_CLASSIC_REGEX.test(address) || RIPPLE_X_ADDRESS_REGEX.test(address);
  }

  /**
   * Parse X-Address to extract classic address and destination tag
   */
  private parseXAddress(xAddress: string): { classicAddress: string; tag?: number } {
    // In production, this would use the xrpl codec library
    // For now, return the address as-is
    return { classicAddress: xAddress };
  }

  /**
   * Get account info from XRP Ledger
   */
  private async getAccountInfo(address: string): Promise<RippleAccountInfo | null> {
    const { classicAddress } = this.parseXAddress(address);
    
    try {
      const response = await fetch(this.config.rpcUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_info',
          params: [{
            account: classicAddress,
            ledger_index: 'current',
            queue: true
          }]
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const data = await response.json();
      
      if (data.result?.status === 'success' && data.result?.account_data) {
        return data.result.account_data;
      }
      
      // Account not found (not funded)
      if (data.result?.error === 'actNotFound') {
        return null;
      }

      throw new Error(data.result?.error || 'Failed to get account info');
    } catch (error: any) {
      console.warn('Failed to fetch Ripple account info:', error);
      return null;
    }
  }

  /**
   * Get account trust lines (for issued currencies)
   */
  private async getAccountLines(address: string): Promise<RippleTrustLine[]> {
    const { classicAddress } = this.parseXAddress(address);
    
    try {
      const response = await fetch(this.config.rpcUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_lines',
          params: [{
            account: classicAddress,
            ledger_index: 'current'
          }]
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const data = await response.json();
      
      if (data.result?.status === 'success' && data.result?.lines) {
        return data.result.lines;
      }
      
      return [];
    } catch (error: any) {
      console.warn('Failed to fetch Ripple trust lines:', error);
      return [];
    }
  }

  /**
   * Get gateway balances (aggregated by currency)
   */
  private async getGatewayBalances(address: string): Promise<RippleGatewayBalance[]> {
    const { classicAddress } = this.parseXAddress(address);
    
    try {
      const response = await fetch(this.config.rpcUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'gateway_balances',
          params: [{
            account: classicAddress,
            ledger_index: 'current'
          }]
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const data = await response.json();
      
      if (data.result?.status === 'success' && data.result?.balances) {
        const balances: RippleGatewayBalance[] = [];
        
        // Process balances by currency
        Object.entries(data.result.balances).forEach(([currency, currencyBalances]: [string, any]) => {
          if (Array.isArray(currencyBalances)) {
            // Sum up balances from different issuers for the same currency
            const totalValue = currencyBalances.reduce((sum: number, balance: any) => {
              return sum + parseFloat(balance.value || '0');
            }, 0);
            
            if (totalValue > 0) {
              balances.push({
                currency,
                value: totalValue.toString()
              });
            }
          }
        });
        
        return balances;
      }
      
      return [];
    } catch (error: any) {
      console.warn('Failed to fetch Ripple gateway balances:', error);
      return [];
    }
  }

  protected async fetchNativeBalance(address: string): Promise<string> {
    if (!this.config.rpcUrl) {
      throw new Error('Ripple RPC provider not configured');
    }

    try {
      const accountInfo = await this.getAccountInfo(address);
      
      if (!accountInfo) {
        // Account not funded
        return '0';
      }

      // Balance is in drops (1 XRP = 1,000,000 drops)
      const drops = parseInt(accountInfo.Balance || '0');
      const xrp = drops / this.DROPS_PER_XRP;
      
      // Calculate reserved amount
      const ownerCount = accountInfo.OwnerCount || 0;
      const reservedXRP = this.RESERVE_BASE + (ownerCount * this.RESERVE_INCREMENT);
      
      // Available balance is total minus reserved
      const availableXRP = Math.max(0, xrp - reservedXRP);
      
      return availableXRP.toFixed(6);
    } catch (error: any) {
      console.warn(`⚠️ Ripple balance fetch failed:`, error.message);
      throw error;
    }
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    const tokens: TokenBalance[] = [];
    
    if (!this.config.rpcUrl) {
      return tokens;
    }

    try {
      // Get trust lines for issued currencies
      const trustLines = await this.getAccountLines(address);
      
      // Get aggregated gateway balances
      const gatewayBalances = await this.getGatewayBalances(address);
      
      // Process trust lines
      for (const line of trustLines) {
        const balance = parseFloat(line.balance || '0');
        
        // Skip if no balance
        if (balance <= 0) continue;
        
        // Get currency info
        const currencyCode = this.decodeCurrency(line.currency);
        
        tokens.push({
          symbol: currencyCode,
          contractAddress: line.account, // Issuer address
          decimals: this.getCurrencyDecimals(currencyCode),
          balance: balance.toFixed(6),
          balanceRaw: balance.toString(),
          valueUsd: 0, // Would need price feed
          priceChange24h: 0,
          logoUrl: this.getCurrencyLogo(currencyCode),
          standard: 'other'
        });
      }
      
      // Add gateway balances (if not already in trust lines)
      for (const gwBalance of gatewayBalances) {
        const currencyCode = this.decodeCurrency(gwBalance.currency);
        
        // Check if already added from trust lines
        const existingToken = tokens.find(t => t.symbol === currencyCode);
        if (!existingToken) {
          tokens.push({
            symbol: currencyCode,
            contractAddress: gwBalance.currency, // Currency code as identifier
            decimals: this.getCurrencyDecimals(currencyCode),
            balance: parseFloat(gwBalance.value).toFixed(6),
            balanceRaw: gwBalance.value,
            valueUsd: 0, // Would need price feed
            priceChange24h: 0,
            logoUrl: this.getCurrencyLogo(currencyCode),
            standard: 'other'
          });
        }
      }
      
      return tokens;
    } catch (error: any) {
      console.warn(`⚠️ Ripple token fetch failed:`, error.message);
      return tokens;
    }
  }

  /**
   * Decode currency code (handles both 3-letter codes and hex)
   */
  private decodeCurrency(currency: string): string {
    if (currency.length === 3) {
      return currency;
    }
    
    // Decode 40-character hex to ASCII (removing trailing zeros)
    if (currency.length === 40) {
      try {
        const hex = currency.replace(/0+$/, '');
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
          str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        return str.trim();
      } catch {
        return currency;
      }
    }
    
    return currency;
  }

  /**
   * Get friendly name for currency
   */
  private getCurrencyName(symbol: string): string {
    const knownCurrencies: Record<string, string> = {
      'USD': 'US Dollar',
      'EUR': 'Euro',
      'GBP': 'British Pound',
      'JPY': 'Japanese Yen',
      'CNY': 'Chinese Yuan',
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'USDT': 'Tether',
      'USDC': 'USD Coin',
      'XAU': 'Gold',
      'XAG': 'Silver',
    };
    
    return knownCurrencies[symbol] || symbol;
  }

  /**
   * Get decimals for currency (most are 15 by default)
   */
  private getCurrencyDecimals(symbol: string): number {
    const knownDecimals: Record<string, number> = {
      'BTC': 8,
      'ETH': 18,
      'USDT': 6,
      'USDC': 6,
    };
    
    return knownDecimals[symbol] || 15;
  }

  /**
   * Get logo URL for currency
   */
  private getCurrencyLogo(symbol: string): string | undefined {
    // Map to common token logos
    const logoMap: Record<string, string> = {
      'USD': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      'USDT': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
      'USDC': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      'BTC': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
      'ETH': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    };
    
    return logoMap[symbol];
  }
}

// Export singleton instances
export const rippleMainnetBalanceService = new RippleBalanceService('mainnet');
export const rippleTestnetBalanceService = new RippleBalanceService('testnet');

// Default export
export default rippleMainnetBalanceService;