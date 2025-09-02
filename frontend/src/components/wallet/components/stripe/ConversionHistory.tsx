// Conversion History Component
// Phase 3: Frontend Components

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  History, 
  Filter, 
  RefreshCw, 
  ExternalLink,
  AlertCircle,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { 
  conversionService,
  formatCurrencyAmount,
  formatTransactionDate 
} from '@/services/wallet/stripe';
import type { 
  ConversionTransaction, 
  ConversionType,
  TransactionStatus 
} from '@/services/wallet/stripe/types';

interface ConversionHistoryProps {
  userId: string;
  className?: string;
}

/**
 * ConversionHistory - Shows user's conversion transaction history
 */
export const ConversionHistory: React.FC<ConversionHistoryProps> = ({
  userId,
  className
}) => {
  const [transactions, setTransactions] = useState<ConversionTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [conversionTypeFilter, setConversionTypeFilter] = useState<ConversionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const loadTransactions = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    setError(null);

    try {
      const filters: any = {};
      
      if (conversionTypeFilter !== 'all') {
        filters.conversionType = conversionTypeFilter;
      }
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      const response = await conversionService.listUserTransactions(
        userId,
        filters,
        {
          page: currentPage,
          limit: itemsPerPage,
          sortBy: 'created_at',
          sortOrder: 'desc'
        }
      );
      
      if (response.success && response.data) {
        setTransactions(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        throw new Error(response.error || 'Failed to load transactions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadTransactions();
    }
  }, [userId, currentPage, conversionTypeFilter, statusFilter]);

  const refreshTransactions = () => {
    loadTransactions(true);
  };

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: TransactionStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
      case 'cancelled':
        return 'destructive';
      case 'pending':
      case 'processing':
        return 'secondary';
      case 'expired':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getConversionIcon = (type: ConversionType) => {
    return type === 'fiat_to_crypto' ? (
      <ArrowDown className="w-4 h-4 text-blue-500" />
    ) : (
      <ArrowUp className="w-4 h-4 text-green-500" />
    );
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        transaction.id.toLowerCase().includes(search) ||
        transaction.sourceCurrency.toLowerCase().includes(search) ||
        transaction.destinationCurrency.toLowerCase().includes(search) ||
        (transaction.transactionHash && transaction.transactionHash.toLowerCase().includes(search))
      );
    }
    return true;
  });

  if (loading && !refreshing) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading transaction history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => loadTransactions()} className="mt-4" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Conversion History
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshTransactions}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={conversionTypeFilter} onValueChange={(value) => setConversionTypeFilter(value as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="fiat_to_crypto">FIAT → Crypto</SelectItem>
                <SelectItem value="crypto_to_fiat">Crypto → FIAT</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transactions Table */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No transactions found</h3>
            <p className="text-muted-foreground">
              {transactions.length === 0 
                ? "You haven't made any conversions yet." 
                : "No transactions match your current filters."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    {/* Type */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getConversionIcon(transaction.conversionType)}
                        <span className="text-sm font-medium">
                          {transaction.conversionType === 'fiat_to_crypto' ? 'Buy' : 'Sell'}
                        </span>
                      </div>
                    </TableCell>
                    
                    {/* Amount */}
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {formatCurrencyAmount(transaction.sourceAmount, transaction.sourceCurrency)}
                        </div>
                        {transaction.destinationAmount && (
                          <div className="text-muted-foreground text-xs">
                            → {formatCurrencyAmount(transaction.destinationAmount, transaction.destinationCurrency)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Currencies */}
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{transaction.sourceCurrency}</Badge>
                        <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                        <Badge variant="outline">{transaction.destinationCurrency}</Badge>
                      </div>
                      {transaction.destinationNetwork && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {transaction.destinationNetwork}
                        </div>
                      )}
                    </TableCell>
                    
                    {/* Status */}
                    <TableCell>
                      <Badge variant={getStatusVariant(transaction.status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(transaction.status)}
                        {transaction.status}
                      </Badge>
                      {transaction.errorMessage && (
                        <div className="text-xs text-red-600 mt-1 max-w-32 truncate" title={transaction.errorMessage}>
                          {transaction.errorMessage}
                        </div>
                      )}
                    </TableCell>
                    
                    {/* Date */}
                    <TableCell>
                      <div className="text-sm">
                        {formatTransactionDate(transaction.createdAt)}
                      </div>
                    </TableCell>
                    
                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {transaction.transactionHash && (
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                        {transaction.stripePaymentIntentId && (
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversionHistory;
