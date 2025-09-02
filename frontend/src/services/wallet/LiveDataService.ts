import { supabase } from '@/infrastructure/database/client';

/**
 * Network status interface
 */
export interface NetworkStatus {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  gasPrice: string;
  blockHeight: number;
  averageBlockTime: string;
}

/**
 * Live transaction interface
 */
export interface LiveTransaction {
  id: string;
  type: 'send' | 'receive';
  amount: string;
  token: string;
  from: string;
  to: string;
  network: string;
  timestamp: string;
  status: 'confirmed' | 'pending' | 'failed';
  hash?: string;
}

/**
 * Live data service for real-time blockchain information
 */
class LiveDataService {
  private static instance: LiveDataService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): LiveDataService {
    if (!LiveDataService.instance) {
      LiveDataService.instance = new LiveDataService();
    }
    return LiveDataService.instance;
  }

  /**
   * Get network status for supported networks
   */
  async getNetworkStatus(): Promise<NetworkStatus[]> {
    try {
      // Return mock network status data since network_status table doesn't exist
      // In production, this would be replaced with real blockchain network monitoring
      const mockNetworkData: NetworkStatus[] = [
        {
          id: 'ethereum',
          name: 'Ethereum',
          status: 'operational',
          gasPrice: '25 gwei',
          blockHeight: 18500000,
          averageBlockTime: '12s'
        },
        {
          id: 'polygon',
          name: 'Polygon',
          status: 'operational', 
          gasPrice: '30 gwei',
          blockHeight: 49000000,
          averageBlockTime: '2s'
        },
        {
          id: 'arbitrum',
          name: 'Arbitrum',
          status: 'operational',
          gasPrice: '0.1 gwei',
          blockHeight: 150000000,
          averageBlockTime: '1s'
        },
        {
          id: 'optimism',
          name: 'Optimism',
          status: 'operational',
          gasPrice: '0.001 gwei',
          blockHeight: 112000000,
          averageBlockTime: '2s'
        }
      ];

      return mockNetworkData;
    } catch (error) {
      console.error('Error generating network status:', error);
      // Return empty array instead of throwing error to prevent UI crashes
      return [];
    }
  }

  /**
   * Map database network status to typed status
   */
  private mapNetworkStatus(dbStatus: string): 'operational' | 'degraded' | 'outage' {
    switch (dbStatus?.toLowerCase()) {
      case 'operational':
      case 'active':
      case 'online':
        return 'operational';
      case 'degraded':
      case 'slow':
      case 'warning':
        return 'degraded';
      case 'outage':
      case 'offline':
      case 'down':
      case 'error':
        return 'outage';
      default:
        return 'operational';
    }
  }

  /**
   * Get live transactions with optional limit
   */
  async getLiveTransactions(limit: number = 10): Promise<LiveTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Map database records to LiveTransaction interface
      return (data || []).map((transaction) => this.mapToLiveTransaction(transaction));
    } catch (error) {
      console.error('Error fetching live transactions:', error);
      throw new Error('Failed to fetch live transactions');
    }
  }

  /**
   * Search transactions by query
   */
  async searchTransactions(query: string, limit: number = 10): Promise<LiveTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .or(`tx_hash.ilike.%${query}%,from_address.ilike.%${query}%,to_address.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((transaction) => this.mapToLiveTransaction(transaction));
    } catch (error) {
      console.error('Error searching transactions:', error);
      throw new Error('Failed to search transactions');
    }
  }

  /**
   * Get transactions by status
   */
  async getTransactionsByStatus(status: string, limit: number = 10): Promise<LiveTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((transaction) => this.mapToLiveTransaction(transaction));
    } catch (error) {
      console.error('Error fetching transactions by status:', error);
      throw new Error('Failed to fetch transactions by status');
    }
  }

  /**
   * Map database transaction to LiveTransaction interface
   */
  private mapToLiveTransaction(dbTransaction: any): LiveTransaction {
    // Determine transaction type based on from_address (0x000... indicates minting/receive)
    const isZeroAddress = dbTransaction.from_address === '0x0000000000000000000000000000000000000000';
    const type = isZeroAddress ? 'receive' : 'send';
    
    // Map chain_id to network name
    const networkName = this.mapChainIdToNetwork(dbTransaction.chain_id);
    
    return {
      id: dbTransaction.id,
      type,
      amount: this.formatTokenAmount(dbTransaction.value || '0'),
      token: dbTransaction.token_symbol || 'ETH',
      from: dbTransaction.from_address || '',
      to: dbTransaction.to_address || '',
      network: networkName,
      timestamp: dbTransaction.created_at,
      status: this.mapTransactionStatus(dbTransaction.status),
      hash: dbTransaction.tx_hash
    };
  }

  /**
   * Map database status to LiveTransaction status
   */
  private mapTransactionStatus(dbStatus: string): 'confirmed' | 'pending' | 'failed' {
    switch (dbStatus?.toLowerCase()) {
      case 'success':
      case 'confirmed':
      case 'completed':
        return 'confirmed';
      case 'pending':
      case 'processing':
        return 'pending';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Map chain_id to network name
   */
  private mapChainIdToNetwork(chainId: string | null): string {
    if (!chainId) return 'ethereum';
    
    const chainMap: Record<string, string> = {
      '1': 'ethereum',
      '137': 'polygon',
      '43114': 'avalanche',
      '42161': 'arbitrum',
      '10': 'optimism',
      '56': 'bsc',
      '250': 'fantom',
      '25': 'cronos'
    };
    
    return chainMap[chainId] || 'ethereum';
  }

  /**
   * Format token amount from database value
   */
  private formatTokenAmount(value: string | number): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Return the value as-is since these appear to be already properly formatted token amounts
    // Not wei amounts that need conversion
    return numValue.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
  }
}

// Export the class as default so components can call getInstance()
export default LiveDataService;