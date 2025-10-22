import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ExternalLink, 
  RefreshCw, 
  Loader2,
  Clock
} from "lucide-react";
import { useUser } from "@/hooks/auth/user/useUser";
import { useWallet } from "@/services/wallet/UnifiedWalletContext";
import { transactionMonitorService } from "@/services/wallet/TransactionMonitorService";
import type { WalletTransactionsTable } from "@/types/core/database";

// Type alias for backward compatibility
type WalletTransaction = WalletTransactionsTable;

interface RecentTransactionsProps {
  limit?: number;
  showFilters?: boolean;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ 
  limit = 10, 
  showFilters = false 
}) => {
  const { user } = useUser();
  const { wallets } = useWallet();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchTransactions();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchTransactions, 30000);
    
    return () => clearInterval(interval);
  }, [user, wallets, limit]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 DEBUG: RecentTransactions - Starting fetch...');
      console.log('🔍 DEBUG: User:', user?.id);
      console.log('🔍 DEBUG: Wallets count:', wallets.length);
      
      let txData: WalletTransaction[] = [];
      
      if (wallets.length > 0) {
        console.log('🔍 DEBUG: Fetching transactions for wallet addresses:', wallets.map(w => w.address));
        // Fetch transactions for all wallet addresses
        const addresses = wallets.map(w => w.address);
        const allTxs = await Promise.all(
          addresses.map(address => transactionMonitorService.getWalletTransactionHistory(address, limit))
        );
        // Flatten and deduplicate by transaction_hash
        txData = Array.from(
          new Map(
            allTxs.flat().map(tx => [tx.transaction_hash || tx.tx_hash, tx])
          ).values()
        );
        // Sort by created_at descending
        txData.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        // Limit to requested amount
        txData = txData.slice(0, limit);
        console.log('🔍 DEBUG: Wallet transactions found:', txData.length);
      } else {
        console.log('🔍 DEBUG: No wallets available');
      }
      
      console.log('🔍 DEBUG: Transaction data sample:', txData.slice(0, 2));
      
      setTransactions(txData);
      setLastRefresh(new Date());
      
      if (txData.length === 0) {
        console.log('⚠️ DEBUG: No transactions found - this may be normal for new wallets');
      }
      
    } catch (err) {
      console.error('🚨 DEBUG: Error fetching transactions:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        error: err
      });
      setError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchTransactions();
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const formatTransactionAmount = (value: number, symbol?: string | null): string => {
    const amount = (value / 1e18).toFixed(4);
    return `${amount} ${symbol || 'ETH'}`;
  };

  const getNetworkName = (chainId: string): string => {
    const networks: Record<string, string> = {
      '1': 'Ethereum',
      '137': 'Polygon',
      '43114': 'Avalanche',
      '42161': 'Arbitrum',
      '10': 'Optimism'
    };
    return networks[chainId] || `Chain ${chainId}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'confirmed':
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600">
            Confirmed
          </Badge>
        );
      case 'pending':
      case 'processing':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-600">
            Pending
          </Badge>
        );
      case 'failed':
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600">
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const getTransactionTypeIcon = (transaction: WalletTransaction) => {
    // Determine if this is a send or receive based on wallet addresses
    const userAddresses = wallets.map(w => w.address.toLowerCase());
    const isFromUser = userAddresses.includes(transaction.from_address.toLowerCase());
    
    if (isFromUser) {
      return <ArrowUpRight className="h-4 w-4 text-red-500" />;
    } else {
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    }
  };

  const openInExplorer = (txHash: string, chainId: string) => {
    const explorerUrls: Record<string, string> = {
      '1': 'https://etherscan.io/tx/',
      '137': 'https://polygonscan.com/tx/',
      '43114': 'https://snowtrace.io/tx/',
      '42161': 'https://arbiscan.io/tx/',
      '10': 'https://optimistic.etherscan.io/tx/'
    };
    
    const baseUrl = explorerUrls[chainId] || 'https://etherscan.io/tx/';
    window.open(`${baseUrl}${txHash}`, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>
              Latest blockchain transactions from your wallets
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {loading ? 'Refreshing...' : `Updated ${formatTimeAgo(lastRefresh.toISOString())}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-2">Error: {error}</p>
            <Button variant="outline" onClick={handleRefresh}>
              Try again
            </Button>
          </div>
        ) : loading && transactions.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Transaction History</h3>
            <p className="text-gray-500 mb-4">
              {user || wallets.length > 0 
                ? "No blockchain transactions found for your wallets yet. Create a wallet and make some transactions to see your history here." 
                : "Connect or create a wallet to see your transaction history."}
            </p>
            <div className="text-xs text-gray-400">
              <p>Searched: {user ? 'User wallets' : wallets.length > 0 ? `${wallets.length} connected wallets` : 'All recent transactions'}</p>
              <p>Last updated: {formatTimeAgo(lastRefresh.toISOString())}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>From/To</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionTypeIcon(transaction)}
                        <span className="text-sm font-medium">
                          {wallets.some(w => w.address.toLowerCase() === transaction.from_address.toLowerCase()) 
                            ? 'Send' 
                            : 'Receive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">From: {formatAddress(transaction.from_address)}</div>
                        <div className="text-muted-foreground">To: {formatAddress(transaction.to_address)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatTransactionAmount(
                          transaction.value, 
                          transaction.token_symbol
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {getNetworkName(transaction.chain_id)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(transaction.status)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatTimeAgo(transaction.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.tx_hash && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openInExplorer(transaction.tx_hash, transaction.chain_id)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
