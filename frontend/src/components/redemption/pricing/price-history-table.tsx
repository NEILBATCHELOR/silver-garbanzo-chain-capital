/**
 * PriceHistoryTable Component
 * 
 * Displays tabular view of historical price periods with:
 * - Sortable columns (date, open, high, low, close, volume)
 * - Pagination
 * - Export to CSV functionality
 * - Date range filtering
 * - Search capabilities
 * 
 * @priority Medium
 * @usage Admin reports, detailed analytics
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Search,
  Calendar
} from 'lucide-react';
import { usePriceHistory } from '@/infrastructure/redemption/pricing/hooks';
import { cn } from '@/utils/utils';

interface PriceHistoryTableProps {
  tokenId: string;
  defaultDays?: number;
  className?: string;
}

type SortField = 'date' | 'open' | 'high' | 'low' | 'close' | 'volume';
type SortDirection = 'asc' | 'desc';

export function PriceHistoryTable({
  tokenId,
  defaultDays = 30,
  className
}: PriceHistoryTableProps) {
  const [days, setDays] = useState(defaultDays);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // Calculate date range
  const endDate = new Date().toISOString();
  const startDate = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  const { history, loading, error, refresh } = usePriceHistory(
    tokenId,
    startDate,
    endDate
  );

  // Sorting and filtering logic
  const processedData = useMemo(() => {
    if (!history?.periods) return [];

    let filtered = history.periods;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((period) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          period.period.start.toLowerCase().includes(searchLower) ||
          period.ohlcv.open?.toString().includes(searchLower) ||
          period.ohlcv.close?.toString().includes(searchLower)
        );
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.period.start).getTime();
          bValue = new Date(b.period.start).getTime();
          break;
        case 'open':
          aValue = a.ohlcv.open || 0;
          bValue = b.ohlcv.open || 0;
          break;
        case 'high':
          aValue = a.ohlcv.high || 0;
          bValue = b.ohlcv.high || 0;
          break;
        case 'low':
          aValue = a.ohlcv.low || 0;
          bValue = b.ohlcv.low || 0;
          break;
        case 'close':
          aValue = a.ohlcv.close || 0;
          bValue = b.ohlcv.close || 0;
          break;
        case 'volume':
          aValue = Number(a.ohlcv.volume || 0);
          bValue = Number(b.ohlcv.volume || 0);
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [history, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / rowsPerPage);
  const paginatedData = processedData.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // Export to CSV
  const exportToCSV = () => {
    if (!history?.periods) return;

    const headers = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume'];
    const rows = processedData.map((period) => [
      new Date(period.period.start).toISOString(),
      period.ohlcv.open || '',
      period.ohlcv.high || '',
      period.ohlcv.low || '',
      period.ohlcv.close || '',
      period.ohlcv.volume || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-history-${tokenId}-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Render sort icon
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-2" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-2" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-2" />
    );
  };

  // Format helpers
  const formatPrice = (price: number | null) => {
    if (price === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertDescription>
          Failed to load price history: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Price History
            </CardTitle>
            <CardDescription>
              Historical 4-hour price periods
            </CardDescription>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters and Controls */}
        <div className="flex items-center gap-4 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search periods..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Date Range Selector */}
          <Select
            value={days.toString()}
            onValueChange={(value) => {
              setDays(parseInt(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button onClick={refresh} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    Date
                    <SortIcon field="date" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort('open')}
                    className="flex items-center ml-auto hover:text-foreground transition-colors"
                  >
                    Open
                    <SortIcon field="open" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort('high')}
                    className="flex items-center ml-auto hover:text-foreground transition-colors"
                  >
                    High
                    <SortIcon field="high" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort('low')}
                    className="flex items-center ml-auto hover:text-foreground transition-colors"
                  >
                    Low
                    <SortIcon field="low" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort('close')}
                    className="flex items-center ml-auto hover:text-foreground transition-colors"
                  >
                    Close
                    <SortIcon field="close" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort('volume')}
                    className="flex items-center ml-auto hover:text-foreground transition-colors"
                  >
                    Volume
                    <SortIcon field="volume" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No price data available
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((period, index) => {
                  const priceChange = (period.ohlcv.close || 0) - (period.ohlcv.open || 0);
                  const isPositive = priceChange >= 0;

                  return (
                    <TableRow key={index}>
                      <TableCell>{formatDate(period.period.start)}</TableCell>
                      <TableCell className="text-right">
                        {formatPrice(period.ohlcv.open)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(period.ohlcv.high)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(period.ohlcv.low)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium',
                          isPositive ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {formatPrice(period.ohlcv.close)}
                      </TableCell>
                      <TableCell className="text-right">
                        {period.ohlcv.volume
                          ? Number(period.ohlcv.volume).toLocaleString()
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * rowsPerPage + 1} to{' '}
              {Math.min(page * rowsPerPage, processedData.length)} of{' '}
              {processedData.length} periods
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="text-sm">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
