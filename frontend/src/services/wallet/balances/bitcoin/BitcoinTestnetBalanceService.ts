/**
 * Bitcoin Testnet Balance Service
 * Fetches real balances and UTXO data from Bitcoin testnet
 */

import { BaseChainBalanceService } from '../BaseChainBalanceService';
import type { BalanceServiceConfig, TokenBalance } from '../types';

// Bitcoin testnet address validation regex patterns
const testnetAddressPatterns = {
  p2pkh: /^[mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // Legacy testnet addresses (m... or n...)
  p2sh: /^2[a-km-zA-HJ-NP-Z1-9]{25,34}$/, // Script testnet addresses (2...)
  bech32: /^tb1[ac-hj-np-z02-9]{7,87}$/, // Native SegWit testnet (tb1...)
  taproot: /^tb1p[ac-hj-np-z02-9]{58}$/ // Taproot testnet (tb1p...)
};

interface UTXOResponse {
  txid: string;
  vout: number;
  value: number;
  confirmations: number;
}

export class BitcoinTestnetBalanceService extends BaseChainBalanceService {
  constructor() {
    const config: BalanceServiceConfig = {
      chainId: 1, // Bitcoin testnet identifier
      chainName: 'Bitcoin Testnet',
      name: 'Bitcoin Testnet', // Alias for chainName
      symbol: 'tBTC',
      decimals: 8,
      networkType: 'testnet',
      rpcUrl: import.meta.env.VITE_BITCOIN_TESTNET_RPC_URL,
      explorerUrl: import.meta.env.VITE_BITCOIN_TESTNET_EXPLORER_URL || 'https://blockstream.info/testnet',
      coingeckoId: 'bitcoin', // Use Bitcoin price for reference
      timeout: 20000,
      isEVM: false // Bitcoin is not EVM-compatible
    };
    super(config);
  }

  validateAddress(address: string): boolean {
    return Object.values(testnetAddressPatterns).some(pattern => pattern.test(address));
  }

  protected async fetchNativeBalance(address: string): Promise<string> {
    if (!this.config.rpcUrl) {
      throw new Error('Bitcoin Testnet RPC provider not configured');
    }

    try {
      // Use Blockstream Testnet API for balance fetching
      const apiUrl = this.getBlockstreamTestnetApiUrl();
      const response = await fetch(`${apiUrl}/api/address/${address}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Convert satoshis to BTC (divide by 100,000,000)
      const balanceSatoshis = data.chain_stats?.funded_txo_sum || 0;
      const spentSatoshis = data.chain_stats?.spent_txo_sum || 0;
      const currentBalanceSatoshis = balanceSatoshis - spentSatoshis;
      
      const balanceBTC = currentBalanceSatoshis / 100000000;
      return balanceBTC.toFixed(8);
    } catch (error) {
      console.warn(`⚠️ Blockstream Testnet API failed, trying RPC:`, error.message);
      return this.fetchBalanceViaRPC(address);
    }
  }

  private async fetchBalanceViaRPC(address: string): Promise<string> {
    if (!this.config.rpcUrl) {
      throw new Error('Bitcoin Testnet RPC not available');
    }

    try {
      // Use RPC for balance if available
      const response = await fetch(this.config.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'getbalance',
          method: 'getaddressbalance',
          params: { addresses: [address] }
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message}`);
      }

      const balanceSatoshis = data.result?.balance || 0;
      return (balanceSatoshis / 100000000).toFixed(8);
    } catch (error) {
      console.warn(`⚠️ Bitcoin Testnet RPC failed:`, error.message);
      return '0.00000000';
    }
  }

  protected async fetchTokenBalancesImpl(address: string): Promise<TokenBalance[]> {
    // Bitcoin testnet doesn't have tokens in the traditional sense
    // This could be extended to support Lightning Network testnet channels
    // For now, return empty array
    return [];
  }

  private getBlockstreamTestnetApiUrl(): string {
    // Use Blockstream Testnet API as backup when RPC is not available
    return 'https://blockstream.info/testnet';
  }

  /**
   * Fetch UTXO set for the testnet address
   */
  async fetchUTXOs(address: string): Promise<UTXOResponse[]> {
    if (!this.validateAddress(address)) {
      throw new Error('Invalid Bitcoin testnet address format');
    }

    try {
      const apiUrl = this.getBlockstreamTestnetApiUrl();
      const response = await fetch(`${apiUrl}/api/address/${address}/utxo`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const utxos = await response.json();
      return utxos.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value,
        confirmations: utxo.status?.confirmed ? 1 : 0
      }));
    } catch (error) {
      console.warn(`⚠️ Failed to fetch testnet UTXOs:`, error.message);
      return [];
    }
  }
}

export const bitcoinTestnetBalanceService = new BitcoinTestnetBalanceService();
