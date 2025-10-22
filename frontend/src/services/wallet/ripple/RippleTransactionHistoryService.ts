/**
 * Ripple Transaction History Service
 * Fetches and parses XRP Ledger transaction history
 */

import { ChainType } from '../AddressUtils';
import type { Transaction } from '@/types/core/centralModels';

// Ripple-specific transaction filter
export interface RippleTransactionFilter {
  limit?: number;
  types?: Array<'send' | 'receive'>;
  status?: string[];
  fromDate?: Date;
  toDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

// Raw Ripple transaction from XRP Ledger
export interface RippleTransaction {
  Account: string;
  Amount: string | { currency: string; value: string; issuer: string };
  Destination: string;
  DestinationTag?: number;
  Fee: string;
  Flags: number;
  LastLedgerSequence?: number;
  Memos?: Array<{ Memo: { MemoData?: string; MemoFormat?: string; MemoType?: string } }>;
  Paths?: any[][];
  SendMax?: string | { currency: string; value: string; issuer: string };
  Sequence: number;
  SigningPubKey?: string;
  SourceTag?: number;
  TransactionType: string;
  TxnSignature?: string;
  hash: string;
  ledger_index?: number;
  meta?: any;
  validated?: boolean;
  date?: number;
}

export class RippleTransactionHistoryService {
  private rpcUrl: string;
  private networkType: 'mainnet' | 'testnet';
  
  constructor(networkType: 'mainnet' | 'testnet' = 'mainnet') {
    this.networkType = networkType;
    this.rpcUrl = networkType === 'mainnet'
      ? (import.meta.env.VITE_RIPPLE_RPC_URL || 'https://xrplcluster.com')
      : (import.meta.env.VITE_RIPPLE_TESTNET_RPC_URL || 'https://testnet.xrpl-labs.com');
  }
  
  /**
   * Fetch transaction history for a Ripple account
   */
  async fetchTransactionHistory(
    address: string,
    filter: RippleTransactionFilter = {}
  ): Promise<Transaction[]> {
    try {
      // Fetch account transactions from XRP Ledger
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_tx',
          params: [{
            account: address,
            ledger_index_min: -1,
            ledger_index_max: -1,
            limit: filter.limit || 100,
            forward: false
          }]
        })
      });
      
      const data = await response.json();
      
      if (data.result?.status !== 'success') {
        throw new Error(data.result?.error || 'Failed to fetch transactions');
      }
      
      const transactions: Transaction[] = [];
      
      for (const tx of data.result.transactions || []) {
        const parsed = this.parseRippleTransaction(tx, address);
        if (parsed) {
          transactions.push(parsed);
        }
      }
      
      return this.applyFilters(transactions, filter);
    } catch (error: any) {
      console.error('Error fetching Ripple transactions:', error);
      return [];
    }
  }
  
  /**
   * Parse a Ripple transaction into standard Transaction format
   */
  private parseRippleTransaction(
    txData: any,
    userAddress: string
  ): Transaction | null {
    const tx = txData.tx || txData;
    const meta = txData.meta || {};
    
    // Skip non-payment transactions for now
    if (tx.TransactionType !== 'Payment') {
      return null;
    }
    
    const isOutgoing = tx.Account.toLowerCase() === userAddress.toLowerCase();
    
    // Parse amount
    let amount: string;
    let symbol: string;
    let tokenAddress: string | undefined;
    
    if (typeof tx.Amount === 'string') {
      // XRP amount in drops
      amount = (parseInt(tx.Amount) / 1000000).toFixed(6);
      symbol = 'XRP';
    } else {
      // Issued currency
      amount = tx.Amount.value;
      symbol = tx.Amount.currency;
      tokenAddress = tx.Amount.issuer;
    }
    
    // Parse fee (always in drops)
    const gasFee = (parseInt(tx.Fee || '0') / 1000000).toFixed(6);
    
    // Get timestamp
    const timestamp = tx.date 
      ? new Date((tx.date + 946684800) * 1000).toISOString() // Ripple epoch starts at 2000-01-01
      : new Date().toISOString();
    
    // Determine status
    const status = meta.TransactionResult === 'tesSUCCESS' ? 'confirmed' : 'failed';
    
    // Create Transaction object matching centralModels interface
    return {
      id: `ripple-${tx.hash}`,
      hash: tx.hash,
      txHash: tx.hash,
      type: isOutgoing ? 'send' : 'receive',
      chainId: this.networkType === 'mainnet' ? 0 : 1,
      chainName: this.networkType === 'mainnet' ? 'Ripple' : 'Ripple Testnet',
      from: tx.Account,
      fromAddress: tx.Account,
      to: tx.Destination,
      toAddress: tx.Destination,
      amount,
      symbol,
      value: amount,
      usdValue: 0, // Would need price feed
      gasPrice: gasFee,
      gasFeeUsd: 0, // Would need price feed
      status: status as 'pending' | 'confirmed' | 'failed',
      blockNumber: tx.ledger_index,
      timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      walletId: '', // Not applicable for Ripple
      blockchain: this.networkType === 'mainnet' ? 'ripple' : 'ripple-testnet',
      metadata: {
        destinationTag: tx.DestinationTag,
        sourceTag: tx.SourceTag,
        memos: tx.Memos,
        tokenAddress
      }
    };
  }
  
  /**
   * Get transaction details by hash
   */
  async getTransactionByHash(hash: string): Promise<Transaction | null> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'tx',
          params: [{
            transaction: hash,
            binary: false
          }]
        })
      });
      
      const data = await response.json();
      
      if (data.result?.status !== 'success') {
        return null;
      }
      
      // Need an address to determine transaction direction
      // Use the Account field as default
      return this.parseRippleTransaction(data.result, data.result.Account);
    } catch (error: any) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }
  
  /**
   * Get account payment history (payments only)
   */
  async getPaymentHistory(
    address: string,
    currency?: string,
    limit: number = 50
  ): Promise<Transaction[]> {
    const filter: RippleTransactionFilter = {
      limit,
      types: ['send', 'receive']
    };
    
    const transactions = await this.fetchTransactionHistory(address, filter);
    
    // Filter by currency if specified
    if (currency) {
      return transactions.filter(tx => tx.symbol === currency);
    }
    
    return transactions;
  }
  
  /**
   * Get trust line changes for an account
   */
  async getTrustLineHistory(address: string): Promise<any[]> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_tx',
          params: [{
            account: address,
            ledger_index_min: -1,
            ledger_index_max: -1,
            limit: 100,
            forward: false
          }]
        })
      });
      
      const data = await response.json();
      
      if (data.result?.status !== 'success') {
        return [];
      }
      
      // Filter for TrustSet transactions
      return (data.result.transactions || [])
        .filter((tx: any) => tx.tx.TransactionType === 'TrustSet')
        .map((tx: any) => ({
          hash: tx.tx.hash,
          currency: tx.tx.LimitAmount?.currency,
          issuer: tx.tx.LimitAmount?.issuer,
          limit: tx.tx.LimitAmount?.value,
          timestamp: new Date((tx.tx.date + 946684800) * 1000),
          status: tx.meta.TransactionResult
        }));
    } catch (error: any) {
      console.error('Error fetching trust line history:', error);
      return [];
    }
  }
  
  /**
   * Get DEX trading history
   */
  async getTradingHistory(address: string): Promise<any[]> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_tx',
          params: [{
            account: address,
            ledger_index_min: -1,
            ledger_index_max: -1,
            limit: 100,
            forward: false
          }]
        })
      });
      
      const data = await response.json();
      
      if (data.result?.status !== 'success') {
        return [];
      }
      
      // Filter for OfferCreate and OfferCancel transactions
      return (data.result.transactions || [])
        .filter((tx: any) => 
          tx.tx.TransactionType === 'OfferCreate' || 
          tx.tx.TransactionType === 'OfferCancel'
        )
        .map((tx: any) => ({
          hash: tx.tx.hash,
          type: tx.tx.TransactionType,
          takerPays: tx.tx.TakerPays,
          takerGets: tx.tx.TakerGets,
          timestamp: new Date((tx.tx.date + 946684800) * 1000),
          status: tx.meta.TransactionResult
        }));
    } catch (error: any) {
      console.error('Error fetching trading history:', error);
      return [];
    }
  }
  
  /**
   * Apply filters to transaction list
   */
  private applyFilters(
    transactions: Transaction[],
    filter: RippleTransactionFilter
  ): Transaction[] {
    let filtered = transactions;
    
    if (filter.types && filter.types.length > 0) {
      filtered = filtered.filter(tx => filter.types!.includes(tx.type as 'send' | 'receive'));
    }
    
    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(tx => filter.status!.includes(tx.status));
    }
    
    if (filter.fromDate) {
      filtered = filtered.filter(tx => 
        tx.timestamp && new Date(tx.timestamp) >= filter.fromDate!
      );
    }
    
    if (filter.toDate) {
      filtered = filtered.filter(tx => 
        tx.timestamp && new Date(tx.timestamp) <= filter.toDate!
      );
    }
    
    if (filter.minAmount !== undefined) {
      filtered = filtered.filter(tx => 
        tx.amount && parseFloat(tx.amount) >= filter.minAmount!
      );
    }
    
    if (filter.maxAmount !== undefined) {
      filtered = filtered.filter(tx => 
        tx.amount && parseFloat(tx.amount) <= filter.maxAmount!
      );
    }
    
    return filtered;
  }
}

// Export singleton instances
export const rippleTransactionHistory = new RippleTransactionHistoryService('mainnet');
export const rippleTestnetTransactionHistory = new RippleTransactionHistoryService('testnet');

// Default export
export default rippleTransactionHistory;
