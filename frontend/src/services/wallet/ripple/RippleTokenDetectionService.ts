/**
 * Ripple Token Detection Service
 * Detects and manages issued currencies (IOUs) on XRP Ledger
 */

import { supabase } from '@/infrastructure/database/client';
import { priceFeedService } from '../PriceFeedService';
import type { TokenBalance } from '../balances/types';

export interface RippleToken {
  currency: string;
  issuer: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  logoUrl?: string;
  verified?: boolean;
}

export interface RippleTrustLine {
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

/**
 * Known Ripple token issuers and their metadata
 */
const KNOWN_ISSUERS: Record<string, { name: string; tokens: Record<string, RippleToken> }> = {
  // Bitstamp
  'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B': {
    name: 'Bitstamp',
    tokens: {
      'USD': {
        currency: 'USD',
        issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
        name: 'US Dollar (Bitstamp)',
        symbol: 'USD',
        decimals: 2,
        verified: true
      },
      'BTC': {
        currency: 'BTC',
        issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
        name: 'Bitcoin (Bitstamp)',
        symbol: 'BTC',
        decimals: 8,
        verified: true
      }
    }
  },
  // GateHub
  'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq': {
    name: 'GateHub',
    tokens: {
      'USD': {
        currency: 'USD',
        issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
        name: 'US Dollar (GateHub)',
        symbol: 'USD',
        decimals: 2,
        verified: true
      },
      'EUR': {
        currency: 'EUR',
        issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
        name: 'Euro (GateHub)',
        symbol: 'EUR',
        decimals: 2,
        verified: true
      }
    }
  }
};

export class RippleTokenDetectionService {
  private rpcUrl: string;
  private networkType: 'mainnet' | 'testnet';
  private tokenCache: Map<string, RippleToken> = new Map();
  
  constructor(networkType: 'mainnet' | 'testnet' = 'mainnet') {
    this.networkType = networkType;
    this.rpcUrl = networkType === 'mainnet'
      ? (import.meta.env.VITE_RIPPLE_RPC_URL || 'https://xrplcluster.com')
      : (import.meta.env.VITE_RIPPLE_TESTNET_RPC_URL || 'https://testnet.xrpl-labs.com');
    
    // Initialize cache with known tokens
    this.initializeKnownTokens();
  }
  
  private initializeKnownTokens(): void {
    for (const issuer of Object.keys(KNOWN_ISSUERS)) {
      for (const token of Object.values(KNOWN_ISSUERS[issuer].tokens)) {
        const key = `${token.currency}-${token.issuer}`;
        this.tokenCache.set(key, token);
      }
    }
  }
  
  /**
   * Detect all tokens (trust lines) for an account
   */
  async detectTokens(address: string): Promise<RippleToken[]> {
    try {
      // Get account lines (trust lines)
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_lines',
          params: [{
            account: address,
            ledger_index: 'current'
          }]
        })
      });
      
      const data = await response.json();
      
      if (data.result?.status !== 'success') {
        return [];
      }
      
      const tokens: RippleToken[] = [];
      const trustLines = data.result.lines || [];
      
      for (const line of trustLines) {
        const token = await this.enrichTokenData({
          currency: line.currency,
          issuer: line.account
        });
        
        if (token) {
          tokens.push(token);
        }
      }
      
      return tokens;
    } catch (error: any) {
      console.error('Error detecting Ripple tokens:', error);
      return [];
    }
  }
  
  /**
   * Get token balances for an account
   */
  async getTokenBalances(address: string): Promise<TokenBalance[]> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_lines',
          params: [{
            account: address,
            ledger_index: 'current'
          }]
        })
      });
      
      const data = await response.json();
      
      if (data.result?.status !== 'success') {
        return [];
      }
      
      const balances: TokenBalance[] = [];
      const trustLines = data.result.lines || [];
      
      for (const line of trustLines) {
        const balance = parseFloat(line.balance || '0');
        
        // Skip if no balance
        if (balance <= 0) continue;
        
        const token = await this.enrichTokenData({
          currency: line.currency,
          issuer: line.account
        });
        
        if (token) {
          // Calculate USD value from token price
          const valueUsd = await priceFeedService.calculateUsdValue(
            token.symbol || token.currency,
            parseFloat(balance.toString()),
            token.decimals || 15
          );
          
          balances.push({
            symbol: token.symbol || token.currency,
            balance: balance.toString(),
            valueUsd,
            decimals: token.decimals || 15,
            contractAddress: `${token.currency}-${token.issuer}`,
            standard: 'other',
            logoUrl: token.logoUrl,
            priceChange24h: 0
          });
        }
      }
      
      return balances;
    } catch (error: any) {
      console.error('Error getting token balances:', error);
      return [];
    }
  }
  
  /**
   * Enrich token data with metadata
   */
  private async enrichTokenData(basic: { 
    currency: string; 
    issuer: string 
  }): Promise<RippleToken | null> {
    const key = `${basic.currency}-${basic.issuer}`;
    
    // Check cache
    if (this.tokenCache.has(key)) {
      return this.tokenCache.get(key)!;
    }
    
    // Check known issuers
    const knownIssuer = KNOWN_ISSUERS[basic.issuer];
    if (knownIssuer?.tokens[basic.currency]) {
      const token = knownIssuer.tokens[basic.currency];
      this.tokenCache.set(key, token);
      return token;
    }
    
    // Check database for custom tokens
    const dbToken = await this.getTokenFromDatabase(basic.currency, basic.issuer);
    if (dbToken) {
      this.tokenCache.set(key, dbToken);
      return dbToken;
    }
    
    // Create basic token entry
    const token: RippleToken = {
      currency: basic.currency,
      issuer: basic.issuer,
      name: this.decodeCurrency(basic.currency),
      symbol: basic.currency.length === 3 ? basic.currency : undefined,
      decimals: 15, // Default for most IOUs
      verified: false
    };
    
    this.tokenCache.set(key, token);
    return token;
  }
  
  /**
   * Get token metadata from database
   */
  private async getTokenFromDatabase(
    currency: string,
    issuer: string
  ): Promise<RippleToken | null> {
    try {
      const { data, error } = await supabase
        .from('ripple_tokens')
        .select('*')
        .eq('currency', currency)
        .eq('issuer', issuer)
        .eq('network_type', this.networkType)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return {
        currency: data.currency,
        issuer: data.issuer,
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals,
        logoUrl: data.logo_url,
        verified: data.verified
      };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Save token metadata to database
   */
  async saveToken(token: RippleToken): Promise<void> {
    try {
      await supabase
        .from('ripple_tokens')
        .upsert({
          currency: token.currency,
          issuer: token.issuer,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          logo_url: token.logoUrl,
          verified: token.verified,
          network_type: this.networkType,
          created_at: new Date().toISOString()
        });
      
      // Update cache
      const key = `${token.currency}-${token.issuer}`;
      this.tokenCache.set(key, token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }
  
  /**
   * Get issuer information
   */
  async getIssuerInfo(issuerAddress: string): Promise<{
    name?: string;
    domain?: string;
    verified?: boolean;
    tokens?: RippleToken[];
  }> {
    // Check known issuers
    const known = KNOWN_ISSUERS[issuerAddress];
    if (known) {
      return {
        name: known.name,
        verified: true,
        tokens: Object.values(known.tokens)
      };
    }
    
    // Get from database
    try {
      const { data } = await supabase
        .from('ripple_issuers')
        .select('*')
        .eq('address', issuerAddress)
        .eq('network_type', this.networkType)
        .single();
      
      if (data) {
        return {
          name: data.name,
          domain: data.domain,
          verified: data.verified
        };
      }
    } catch (error) {
      console.error('Error getting issuer info:', error);
    }
    
    // Get account info from ledger
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_info',
          params: [{
            account: issuerAddress,
            ledger_index: 'current'
          }]
        })
      });
      
      const data = await response.json();
      
      if (data.result?.account_data?.Domain) {
        // Decode domain from hex
        const domain = Buffer.from(data.result.account_data.Domain, 'hex').toString();
        return { domain };
      }
    } catch (error) {
      console.error('Error fetching issuer account info:', error);
    }
    
    return {};
  }
  
  /**
   * Decode currency code
   */
  private decodeCurrency(currency: string): string {
    if (currency.length === 3) {
      return currency;
    }
    
    // Decode 40-character hex to ASCII
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
   * Validate trust line parameters
   */
  validateTrustLine(
    currency: string,
    issuer: string,
    limit: string
  ): { valid: boolean; error?: string } {
    // Validate currency
    if (!currency || currency.length === 0) {
      return { valid: false, error: 'Currency code is required' };
    }
    
    if (currency === 'XRP') {
      return { valid: false, error: 'XRP does not require trust lines' };
    }
    
    // Validate issuer
    if (!issuer || !issuer.startsWith('r')) {
      return { valid: false, error: 'Invalid issuer address' };
    }
    
    // Validate limit
    const limitNum = parseFloat(limit);
    if (isNaN(limitNum) || limitNum < 0) {
      return { valid: false, error: 'Invalid trust line limit' };
    }
    
    return { valid: true };
  }
}

// Export singleton instances
export const rippleTokenDetection = new RippleTokenDetectionService('mainnet');
export const rippleTestnetTokenDetection = new RippleTokenDetectionService('testnet');

// Default export
export default rippleTokenDetection;