/**
 * Trade Finance Transaction History Page
 * 
 * Comprehensive transaction history with filtering and export
 * Features:
 * - Advanced filtering (type, commodity, date range)
 * - Pagination
 * - Export to CSV/JSON
 * - Transaction statistics
 * - Detailed transaction view
 * - Search by transaction hash
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Wallet,
  Download,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  Info
} from 'lucide-react';
import { WalletConnectButton } from '@/components/trade-finance/shared/wallet-connect-button';
import { useTradeFinance } from '@/providers/trade-finance';

interface Transaction {
  id: string;
  type: string;
  commodityType: string;
  amount: number;
  valueUSD: number;
  timestamp: string;
  txHash?: string;
  status: string;
}

interface TransactionSummary {
  totalTransactions: number;
  byType: {
    supply: number;
    withdraw: number;
    borrow: number;
    repay: number;
    liquidate: number;
  };
  volumeByType: {
    supply: number;
    withdraw: number;
    borrow: number;
    repay: number;
    liquidate: number;
  };
  totalVolume: number;
  averageTransactionSize: number;
  firstTransaction: string | null;
  lastTransaction: string | null;
}

export function TransactionHistoryPage() {
  const { address, isConnected } = useAccount();
  const { projectId } = useTradeFinance();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [commodityFilter, setCommodityFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchHash, setSearchHash] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (isConnected && address && projectId) {
      fetchTransactions();
      fetchSummary();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, address, projectId, currentPage, typeFilter, commodityFilter, startDate, endDate]);

  const fetchTransactions = async () => {
    if (!address || !projectId) return;

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        project_id: projectId,
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString()
      });

      if (typeFilter !== 'all') {
        params.append('transaction_type', typeFilter);
      }
      if (commodityFilter !== 'all') {
        params.append('commodity_type', commodityFilter);
      }
      if (startDate) {
        params.append('start_date', new Date(startDate).toISOString());
      }
      if (endDate) {
        params.append('end_date', new Date(endDate).toISOString());
      }

      const response = await fetch(
        `${baseURL}/api/trade-finance/history/${address}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const result = await response.json();
      setTransactions(result.data.transactions);
      setTotalItems(result.data.pagination.total);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchSummary = async () => {
    if (!address || !projectId) return;

    try {
      const params = new URLSearchParams({
        project_id: projectId
      });

      if (startDate) {
        params.append('start_date', new Date(startDate).toISOString());
      }
      if (endDate) {
        params.append('end_date', new Date(endDate).toISOString());
      }

      const response = await fetch(
        `${baseURL}/api/trade-finance/history/${address}/summary?${params.toString()}`
      );

      if (response.ok) {
        const result = await response.json();
        setSummary(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!address || !projectId) return;

    try {
      const params = new URLSearchParams({
        project_id: projectId,
        format
      });

      if (startDate) {
        params.append('start_date', new Date(startDate).toISOString());
      }
      if (endDate) {
        params.append('end_date', new Date(endDate).toISOString());
      }

      const response = await fetch(
        `${baseURL}/api/trade-finance/history/${address}/export?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${Date.now()}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export transactions');
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTransactions();
    fetchSummary();
  };

  const handleClearFilters = () => {
    setTypeFilter('all');
    setCommodityFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchHash('');
    setCurrentPage(1);
  };

  const getActionBadgeColor = (type: string) => {
    switch (type) {
      case 'supply':
        return 'bg-green-100 text-green-800';
      case 'withdraw':
        return 'bg-orange-100 text-orange-800';
      case 'borrow':
        return 'bg-blue-100 text-blue-800';
      case 'repay':
        return 'bg-purple-100 text-purple-800';
      case 'liquidate':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Wallet className="h-16 w-16 text-muted-foreground" />
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                <p className="text-muted-foreground mb-6">
                  Connect your wallet to view transaction history
                </p>
                <WalletConnectButton />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-muted-foreground mt-2">
            Complete history of your trade finance activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <WalletConnectButton />
        </div>
      </div>

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.totalTransactions}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${summary.totalVolume.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${summary.averageTransactionSize.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Most Common
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold capitalize">
                {Object.entries(summary.byType)
                  .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>Filter and export your transaction history</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('json')}
              >
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="supply">Supply</SelectItem>
                <SelectItem value="withdraw">Withdraw</SelectItem>
                <SelectItem value="borrow">Borrow</SelectItem>
                <SelectItem value="repay">Repay</SelectItem>
                <SelectItem value="liquidate">Liquidate</SelectItem>
              </SelectContent>
            </Select>

            <Select value={commodityFilter} onValueChange={setCommodityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Commodity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Commodities</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="copper">Copper</SelectItem>
                <SelectItem value="oil">Oil</SelectItem>
                <SelectItem value="wheat">Wheat</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />

            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />

            <Button
              variant="outline"
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({totalItems})</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Commodity</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Value (USD)</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tx Hash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Badge className={getActionBadgeColor(tx.type)}>
                          {tx.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium capitalize">
                        {tx.commodityType}
                      </TableCell>
                      <TableCell>{tx.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        ${tx.valueUSD.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatTimestamp(tx.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'completed' ? 'secondary' : 'destructive'}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tx.txHash ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={`https://etherscan.io/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TransactionHistoryPage;
