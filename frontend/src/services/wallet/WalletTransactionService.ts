import { supabase } from '@/infrastructure/database/client';

/**
 * Transaction interface based on wallet_transactions table schema
 */
export interface WalletTransaction {
  id: string;
  chainId: string;
  fromAddress: string;
  toAddress: string;
  value: string;
  txHash: string;
  status: string;
  tokenSymbol: string | null;
  tokenAddress: string | null;
  confirmationCount: number | null;
  createdAt: string;
  updatedAt: string;
  gasLimit: string | null;
  gasPrice: string | null;
  nonce: number | null;
  data: any;
}

/**
 * Service for fetching wallet transactions
 */
class WalletTransactionService {
  private static instance: WalletTransactionService;

  private constructor() {}

  static getInstance(): WalletTransactionService {
    if (!WalletTransactionService.instance) {
      WalletTransactionService.instance = new WalletTransactionService();
    }
    return WalletTransactionService.instance;
  }

  /**
   * Get transactions for specific wallet addresses
   */
  async getTransactionsForWallets(
    walletAddresses: string[],
    limit: number = 10
  ): Promise<WalletTransaction[]> {
    try {
      if (!walletAddresses.length) {
        return [];
      }

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .or(
          walletAddresses
            .map(address => `from_address.eq.${address},to_address.eq.${address}`)
            .join(',')
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching wallet transactions:', error);
        return [];
      }

      return this.mapTransactions(data || []);
    } catch (error) {
      console.error('Error in getTransactionsForWallets:', error);
      return [];
    }
  }

  /**
   * Get transactions for a specific user's wallets
   */
  async getTransactionsForUser(
    userId: string,
    limit: number = 10
  ): Promise<WalletTransaction[]> {
    try {
      // Cast supabase to any to bypass type checking for missing table types
      const supabaseAny = supabase as any;
      
      // First get user's wallet addresses from wallets table
      const { data: wallets, error: walletsError } = await supabaseAny
        .from('wallets')
        .select('wallet_address')
        .eq('investor_id', userId);

      const walletAddresses: string[] = [];
      
      if (!walletsError && wallets) {
        walletAddresses.push(...wallets.map((w: any) => w.wallet_address));
      }

      // Also get guardian wallet addresses (wallet_addresses is JSONB)
      const { data: guardianWallets, error: guardianError } = await supabaseAny
        .from('guardian_wallets')
        .select('wallet_addresses')
        .eq('created_by', userId);

      if (!guardianError && guardianWallets) {
        guardianWallets.forEach((gw: any) => {
          if (gw.wallet_addresses && typeof gw.wallet_addresses === 'object') {
            // wallet_addresses is JSONB, extract addresses
            const addresses = Object.values(gw.wallet_addresses as Record<string, any>)
              .filter(addr => typeof addr === 'string');
            walletAddresses.push(...addresses as string[]);
          }
        });
      }

      return this.getTransactionsForWallets(walletAddresses, limit);
    } catch (error) {
      console.error('Error in getTransactionsForUser:', error);
      return [];
    }
  }

  /**
   * Get recent transactions across all wallets
   */
  async getRecentTransactions(limit: number = 10): Promise<WalletTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent transactions:', error);
        return [];
      }

      return this.mapTransactions(data || []);
    } catch (error) {
      console.error('Error in getRecentTransactions:', error);
      return [];
    }
  }

  /**
   * Map database records to WalletTransaction interface
   */
  private mapTransactions(dbTransactions: any[]): WalletTransaction[] {
    return dbTransactions.map(tx => ({
      id: tx.id,
      chainId: tx.chain_id || '',
      fromAddress: tx.from_address || '',
      toAddress: tx.to_address || '', 
      value: tx.value?.toString() || '0',
      txHash: tx.tx_hash || '',
      status: tx.status || 'pending',
      tokenSymbol: tx.token_symbol,
      tokenAddress: tx.token_address,
      confirmationCount: tx.confirmation_count,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at,
      gasLimit: tx.gas_limit?.toString(),
      gasPrice: tx.gas_price?.toString(),
      nonce: tx.nonce,
      data: tx.data
    }));
  }

  /**
   * Format transaction amount for display
   */
  formatTransactionAmount(value: string, tokenSymbol?: string | null): string {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '0';

    const symbol = tokenSymbol || 'ETH';
    
    if (numValue === 0) return `0 ${symbol}`;
    
    // Format based on value size
    if (numValue < 0.001) {
      return `${numValue.toExponential(2)} ${symbol}`;
    } else if (numValue < 1) {
      return `${numValue.toFixed(6)} ${symbol}`;
    } else {
      return `${numValue.toFixed(4)} ${symbol}`;
    }
  }

  /**
   * Get transaction type (send/receive) for a specific wallet
   */
  getTransactionType(
    transaction: WalletTransaction, 
    walletAddress: string
  ): 'send' | 'receive' | 'unknown' {
    if (transaction.fromAddress.toLowerCase() === walletAddress.toLowerCase()) {
      return 'send';
    } else if (transaction.toAddress.toLowerCase() === walletAddress.toLowerCase()) {
      return 'receive';
    }
    return 'unknown';
  }

  /**
   * Map chain ID to network name
   */
  getNetworkName(chainId: string): string {
    const chainMap: Record<string, string> = {
      '1': 'Ethereum',
      '137': 'Polygon',
      '43114': 'Avalanche',
      '42161': 'Arbitrum',
      '10': 'Optimism',
      '56': 'BSC',
      '250': 'Fantom',
      '25': 'Cronos'
    };
    
    return chainMap[chainId] || 'Unknown';
  }
}

export default WalletTransactionService;
