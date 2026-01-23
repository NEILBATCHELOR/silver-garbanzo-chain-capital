/**
 * Solana Transaction Search
 * Advanced search and filtering for token transactions
 * 
 * Features:
 * - Multi-criteria search
 * - Date range filtering
 * - Amount range filtering
 * - Status filtering
 * - Export results
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  Search, 
  Filter, 
  Download,
  Calendar,
  DollarSign,
  User
} from 'lucide-react';
import { 
  solanaTokenTransactionService,
  type SolanaTransferRecord 
} from '@/services/tokens/SolanaTokenTransactionService';

// ============================================================================
// TYPES
// ============================================================================

interface SearchFilters {
  fromAddress?: string;
  toAddress?: string;
  minAmount?: string;
  maxAmount?: string;
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'confirmed' | 'failed' | 'all';
  transactionHash?: string;
}

interface TransactionSearchProps {
  tokenId: string;
  tokenSymbol: string;
  decimals: number;
  projectId: string;
  network: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TransactionSearch({
  tokenId,
  tokenSymbol,
  decimals,
  projectId,
  network
}: TransactionSearchProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<SearchFilters>({
    status: 'all'
  });
  const [results, setResults] = useState<SolanaTransferRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async () => {
    try {
      setIsSearching(true);

      const searchParams: any = {
        token_id: tokenId,
        limit: 100
      };

      // Add filters
      if (filters.fromAddress) {
        searchParams.from_address = filters.fromAddress;
      }
      if (filters.toAddress) {
        searchParams.to_address = filters.toAddress;
      }
      if (filters.startDate) {
        searchParams.start_date = filters.startDate;
      }
      if (filters.endDate) {
        searchParams.end_date = filters.endDate;
      }
      if (filters.status && filters.status !== 'all') {
        searchParams.status = filters.status;
      }

      const data = await solanaTokenTransactionService.getTransactionHistory(searchParams);

      // Additional client-side filtering
      let filtered = data;

      if (filters.minAmount) {
        const minAmount = BigInt(parseFloat(filters.minAmount) * Math.pow(10, decimals));
        filtered = filtered.filter(tx => BigInt(tx.amount) >= minAmount);
      }

      if (filters.maxAmount) {
        const maxAmount = BigInt(parseFloat(filters.maxAmount) * Math.pow(10, decimals));
        filtered = filtered.filter(tx => BigInt(tx.amount) <= maxAmount);
      }

      if (filters.transactionHash) {
        filtered = filtered.filter(tx =>
          tx.transaction_hash.toLowerCase().includes(filters.transactionHash!.toLowerCase())
        );
      }

      setResults(filtered);

      toast({
        title: 'Search Complete',
        description: `Found ${filtered.length} transaction(s)`
      });
    } catch (error) {
      console.error('Error searching transactions:', error);
      toast({
        title: 'Search Failed',
        description: 'Failed to search transactions',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleExport = () => {
    if (results.length === 0) {
      toast({
        title: 'No Results',
        description: 'No transactions to export',
        variant: 'destructive'
      });
      return;
    }

    // Convert to CSV
    const headers = [
      'Transaction Hash',
      'From',
      'To',
      'Amount',
      'Status',
      'Timestamp'
    ];

    const rows = results.map(tx => [
      tx.transaction_hash,
      tx.from_address,
      tx.to_address,
      formatAmount(tx.amount, tx.decimals),
      tx.status,
      new Date(tx.timestamp).toISOString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tokenSymbol}_transactions_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Transactions exported successfully'
    });
  };

  const formatAmount = (amount: string, decimals: number): string => {
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toLocaleString();
  };

  const clearFilters = () => {
    setFilters({ status: 'all' });
    setResults([]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Transaction Search
            </CardTitle>
            <CardDescription>
              Search and filter {tokenSymbol} transactions
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
            {results.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Search by transaction hash..."
            value={filters.transactionHash || ''}
            onChange={(e) =>
              setFilters({ ...filters, transactionHash: e.target.value })
            }
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="grid grid-cols-2 gap-4">
              {/* Address Filters */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  From Address
                </Label>
                <Input
                  placeholder="Enter sender address..."
                  value={filters.fromAddress || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, fromAddress: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  To Address
                </Label>
                <Input
                  placeholder="Enter recipient address..."
                  value={filters.toAddress || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, toAddress: e.target.value })
                  }
                />
              </div>

              {/* Amount Range */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Min Amount
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minAmount || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, minAmount: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Max Amount
                </Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={filters.maxAmount || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, maxAmount: e.target.value })
                  }
                />
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End Date
                </Label>
                <Input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value: any) =>
                    setFilters({ ...filters, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex-1"
              >
                Clear Filters
              </Button>
              <Button onClick={handleSearch} className="flex-1" disabled={isSearching}>
                Apply Filters
              </Button>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Results</h3>
              <Badge variant="secondary">{results.length} found</Badge>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {results.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {tx.transaction_hash.slice(0, 16)}...
                      </code>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{shortenAddress(tx.from_address)}</span>
                        <span>→</span>
                        <span>{shortenAddress(tx.to_address)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-medium">
                        {formatAmount(tx.amount, tx.decimals)} {tokenSymbol}
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isSearching && (
          <div className="text-center p-6 text-muted-foreground">
            <p>Searching...</p>
          </div>
        )}

        {!isSearching && results.length === 0 && filters.transactionHash && (
          <div className="text-center p-6 text-muted-foreground">
            <p>No transactions found matching your criteria</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default TransactionSearch;
