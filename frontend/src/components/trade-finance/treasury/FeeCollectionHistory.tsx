/**
 * Fee Collection History Component
 * Displays historical fee collection data with filtering and pagination
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Download, Filter, ExternalLink } from 'lucide-react';
import { useFeeCollectionHistory } from '@/hooks/trade-finance';
import { formatEther, formatUnits } from 'viem';
import { cn } from '@/utils/utils';

interface FeeCollectionHistoryProps {
  className?: string;
}

const FEE_SOURCES = {
  FLASH_LOAN: 'Flash Loan',
  LIQUIDATION: 'Liquidation',
  INTEREST_SPREAD: 'Interest Spread',
  ORACLE_FEE: 'Oracle Fee',
  WITHDRAWAL: 'Withdrawal'
} as const;

export function FeeCollectionHistory({ className }: FeeCollectionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [feeSource, setFeeSource] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useFeeCollectionHistory({
    feeSource: feeSource === 'all' ? undefined : feeSource,
    limit,
    offset: (page - 1) * limit
  });

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Exporting fee collection data...');
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Failed to load fee collection history
          </p>
        </CardContent>
      </Card>
    );
  }

  const filteredData = data?.filter((item: any) => {
    const matchesSearch = searchTerm === '' || 
      item.token_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.collector_address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by token or collector address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={feeSource} onValueChange={setFeeSource}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {Object.entries(FEE_SOURCES).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={handleExport}>
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Fee Collection Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Fee Collections</CardTitle>
        </CardHeader>
        <CardContent>
          {!filteredData || filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No fee collections found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Collector</TableHead>
                    <TableHead>Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {new Date(item.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">
                          {item.token_address.slice(0, 6)}...{item.token_address.slice(-4)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {formatEther(BigInt(item.amount))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {FEE_SOURCES[item.fee_source as keyof typeof FEE_SOURCES] || item.fee_source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.collector_address ? (
                          <code className="text-xs">
                            {item.collector_address.slice(0, 6)}...{item.collector_address.slice(-4)}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.transaction_hash ? (
                          <a
                            href={`https://etherscan.io/tx/${item.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <span className="text-xs">View</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {filteredData && filteredData.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, filteredData.length)} of {filteredData.length} results
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * limit >= (filteredData?.length || 0)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
