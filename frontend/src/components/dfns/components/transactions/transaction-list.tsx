import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/utils/utils';

// Import DFNS types
import type { 
  DfnsTransfer,
  DfnsBroadcastTransaction,
  DfnsTransactionHistory,
  DfnsWalletHistoryEntry,
  WalletData
} from '@/types/dfns';

interface TransactionListProps {
  transfers: DfnsTransfer[];
  broadcasts: DfnsBroadcastTransaction[];
  history: DfnsTransactionHistory[];
  wallets: WalletData[];
  onTransactionUpdated: () => void;
  className?: string;
}

// Combined transaction type for unified display
interface CombinedTransaction {
  id: string;
  type: 'transfer' | 'broadcast' | 'history';
  status: string;
  direction?: 'incoming' | 'outgoing';
  amount?: string;
  asset?: string;
  fromAddress?: string;
  toAddress?: string;
  txHash?: string;
  network?: string;
  fee?: string;
  timestamp: string;
  walletId?: string;
  originalData: DfnsTransfer | DfnsBroadcastTransaction | DfnsTransactionHistory | DfnsWalletHistoryEntry;
}

/**
 * Enhanced Transaction List Component
 * Unified display of all DFNS transaction types with real integration
 */
export function TransactionList({ 
  transfers, 
  broadcasts, 
  history, 
  wallets,
  onTransactionUpdated,
  className 
}: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const { toast } = useToast();

  // Combine all transactions into unified format
  const combineTransactions = (): CombinedTransaction[] => {
    const combined: CombinedTransaction[] = [];

    // Add transfers
    transfers.forEach(transfer => {
      // Handle amount based on transfer type
      let amount: string | undefined;
      if (transfer.requestBody) {
        const requestBody = transfer.requestBody;
        if ('amount' in requestBody) {
          amount = requestBody.amount;
        }
      }

      combined.push({
        id: transfer.id || `transfer-${Math.random()}`,
        type: 'transfer',
        status: transfer.status,
        direction: 'outgoing', // Transfers are outgoing by default
        amount,
        asset: transfer.requestBody?.kind || 'Unknown',
        toAddress: transfer.requestBody?.to,
        txHash: transfer.txHash,
        fee: transfer.fee,
        timestamp: transfer.dateRequested || new Date().toISOString(),
        walletId: transfer.walletId,
        originalData: transfer
      });
    });

    // Add broadcast transactions
    broadcasts.forEach(broadcast => {
      combined.push({
        id: broadcast.id || `broadcast-${Math.random()}`,
        type: 'broadcast',
        status: broadcast.status,
        txHash: broadcast.txHash,
        timestamp: broadcast.dateRequested || new Date().toISOString(),
        walletId: broadcast.walletId,
        originalData: broadcast
      });
    });

    // Add transaction history
    history.forEach(historyResponse => {
      // historyResponse is DfnsGetWalletHistoryResponse, so we need to iterate through its history array
      historyResponse.history?.forEach(tx => {
        combined.push({
          id: tx.txHash || `history-${Math.random()}`,
          type: 'history',
          status: tx.status,
          direction: tx.direction?.toLowerCase() as 'incoming' | 'outgoing',
          amount: tx.amount,
          asset: tx.asset?.symbol,
          fromAddress: tx.fromAddress,
          toAddress: tx.toAddress,
          txHash: tx.txHash,
          fee: tx.fee,
          timestamp: tx.timestamp || new Date().toISOString(),
          walletId: historyResponse.walletId,
          originalData: tx
        });
      });
    });

    return combined.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  const allTransactions = combineTransactions();

  // Filter transactions
  const filteredTransactions = allTransactions.filter(tx => {
    const matchesSearch = tx.txHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tx.toAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tx.fromAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tx.asset?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || tx.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesType = filterType === 'all' || tx.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Get wallet name by ID
  const getWalletName = (walletId?: string): string => {
    if (!walletId) return 'Unknown Wallet';
    const wallet = wallets.find(w => w.id === walletId);
    return wallet?.name || wallet?.address?.slice(0, 10) + '...' || 'Unknown';
  };

  // Get network from wallet
  const getNetwork = (walletId?: string): string => {
    if (!walletId) return 'Unknown';
    const wallet = wallets.find(w => w.id === walletId);
    return wallet?.network || 'Unknown';
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
      case 'confirmed':
      case 'completed':
      case 'broadcasted':
        return (
          <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
      case 'failed':
      case 'cancelled':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  // Get transaction type badge
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'transfer':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Transfer</Badge>;
      case 'broadcast':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">Broadcast</Badge>;
      case 'history':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">History</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Get direction icon
  const getDirectionIcon = (direction?: string) => {
    switch (direction) {
      case 'incoming':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'outgoing':
        return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
      default:
        return <ArrowRightLeft className="h-4 w-4 text-gray-600" />;
    }
  };

  // Handle transaction actions
  const handleTransactionAction = (action: string, transaction: CombinedTransaction) => {
    switch (action) {
      case 'copy-hash':
        if (transaction.txHash) {
          navigator.clipboard.writeText(transaction.txHash);
          toast({
            title: "Copied",
            description: "Transaction hash copied to clipboard",
          });
        }
        break;
      
      case 'view-explorer':
        if (transaction.txHash) {
          const network = getNetwork(transaction.walletId);
          const explorerUrl = getExplorerUrl(network, transaction.txHash);
          if (explorerUrl) {
            window.open(explorerUrl, '_blank');
          } else {
            toast({
              title: "Explorer Not Available",
              description: "No explorer URL available for this network",
              variant: "destructive",
            });
          }
        }
        break;
      
      case 'retry':
        // TODO: Implement transaction retry
        toast({
          title: "Retry Transaction",
          description: "Transaction retry functionality will be implemented",
        });
        break;
      
      case 'details':
        // TODO: Open transaction details modal
        toast({
          title: "Transaction Details",
          description: "Opening detailed view for transaction",
        });
        break;
      
      default:
        console.log(`Unknown action: ${action}`);
    }
  };

  // Get explorer URL for transaction hash
  const getExplorerUrl = (network: string, txHash: string): string | null => {
    const explorers: Record<string, string> = {
      'Ethereum': `https://etherscan.io/tx/${txHash}`,
      'Polygon': `https://polygonscan.com/tx/${txHash}`,
      'Bitcoin': `https://blockstream.info/tx/${txHash}`,
      'Arbitrum': `https://arbiscan.io/tx/${txHash}`,
      'Base': `https://basescan.org/tx/${txHash}`,
      'Optimism': `https://optimistic.etherscan.io/tx/${txHash}`,
    };
    return explorers[network] || null;
  };

  // Format amount with asset
  const formatAmount = (amount?: string, asset?: string): string => {
    if (!amount) return 'N/A';
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return amount;
    
    const formatted = numAmount.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 6 
    });
    
    return asset ? `${formatted} ${asset}` : formatted;
  };

  if (allTransactions.length === 0) {
    return (
      <div className="text-center py-12">
        <ArrowRightLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No transactions found</h3>
        <p className="text-muted-foreground mb-6">
          No transaction history available. Create some transactions to see them here.
        </p>
        <Button variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4">
        <div>
          <h3 className="text-lg font-medium">Transaction History</h3>
          <p className="text-sm text-muted-foreground">
            {filteredTransactions.length} of {allTransactions.length} transactions
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by hash, address, or asset..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('confirmed')}>
                Confirmed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('pending')}>
                Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('failed')}>
                Failed
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setFilterType('all')}>
                All Types
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('transfer')}>
                Transfers
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('history')}>
                History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('broadcast')}>
                Broadcasts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Transactions Table */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No matching transactions</h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {getDirectionIcon(transaction.direction)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm">
                          {transaction.txHash ? (
                            <code className="text-xs bg-gray-100 px-1 rounded">
                              {transaction.txHash.slice(0, 10)}...{transaction.txHash.slice(-6)}
                            </code>
                          ) : (
                            'Pending Transaction'
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {transaction.direction === 'incoming' ? 'From' : 'To'}: {' '}
                          {transaction.direction === 'incoming' 
                            ? transaction.fromAddress?.slice(0, 10) + '...' 
                            : transaction.toAddress?.slice(0, 10) + '...'
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Wallet: {getWalletName(transaction.walletId)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getTypeBadge(transaction.type)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(transaction.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatAmount(transaction.amount, transaction.asset)}
                    </div>
                    {transaction.fee && (
                      <div className="text-xs text-muted-foreground">
                        Fee: {transaction.fee}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getNetwork(transaction.walletId)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatTimestamp(transaction.timestamp)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {transaction.txHash && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleTransactionAction('copy-hash', transaction)}
                              className="gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Copy hash
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleTransactionAction('view-explorer', transaction)}
                              className="gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View in explorer
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleTransactionAction('details', transaction)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View details
                        </DropdownMenuItem>
                        {(transaction.status === 'Failed' || transaction.status === 'Cancelled') && (
                          <DropdownMenuItem
                            onClick={() => handleTransactionAction('retry', transaction)}
                            className="gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Retry transaction
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}