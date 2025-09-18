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
import { useWallet } from "@/services/wallet/WalletContext";
import WalletTransactionService, { WalletTransaction } from "@/services/wallet/WalletTransactionService";

const transactionService = WalletTransactionService.getInstance();

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
      
      if (user) {
        console.log('🔍 DEBUG: Fetching transactions for user:', user.id);
        // Fetch transactions for user's wallets (both regular and guardian)
        txData = await transactionService.getTransactionsForUser(user.id, limit);
        console.log('🔍 DEBUG: User transactions found:', txData.length);
      } else if (wallets.length > 0) {
        console.log('🔍 DEBUG: Fetching transactions for wallet addresses:', wallets.map(w => w.address));
        // Fallback to wallet context addresses
        const addresses = wallets.map(w => w.address);
        txData = await transactionService.getTransactionsForWallets(addresses, limit);
        console.log('🔍 DEBUG: Wallet transactions found:', txData.length);
      } else {
        console.log('🔍 DEBUG: No user or wallets, fetching recent transactions across all wallets');
        // Show recent transactions across all wallets if no user/wallets
        txData = await transactionService.getRecentTransactions(limit);
        console.log('🔍 DEBUG: Recent transactions found:', txData.length);
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
    const isFromUser = userAddresses.includes(transaction.fromAddress.toLowerCase());
    
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
                          {wallets.some(w => w.address.toLowerCase() === transaction.fromAddress.toLowerCase()) 
                            ? 'Send' 
                            : 'Receive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">From: {formatAddress(transaction.fromAddress)}</div>
                        <div className="text-muted-foreground">To: {formatAddress(transaction.toAddress)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {transactionService.formatTransactionAmount(
                          transaction.value, 
                          transaction.tokenSymbol
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {transactionService.getNetworkName(transaction.chainId)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(transaction.status)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatTimeAgo(transaction.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.txHash && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openInExplorer(transaction.txHash, transaction.chainId)}
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
